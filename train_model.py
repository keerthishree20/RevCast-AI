"""
train_model.py — RevCast AI core elasticity model, standalone version.

Replicates the pipeline described in the RevCast AI guide (Section 7):
  1. Generate synthetic weekly ad-spend / revenue data for one channel
  2. Compute monthly seasonality index and deseasonalize revenue
  3. Fit log(revenue) = alpha + beta*log(spend) + gamma*t + delta*holiday  (OLS)
  4. Gate the time trend (gamma) unless |t-stat| > 1.96
  5. Bootstrap historical residuals (with a 1.2x heteroscedastic floor) to get
     an honest forecast distribution
  6. Pickle everything needed to reproduce forecasts: OLS coefficients,
     seasonality index, residuals, and metadata.

Output: pickle/model.pkl
"""

import pickle
from pathlib import Path

import numpy as np
import pandas as pd
from datetime import date, timedelta
from sklearn.linear_model import LinearRegression

RNG = np.random.default_rng(42)
N_WEEKS = 78  # ~18 months, matches the guide's typical dataset size


def generate_synthetic_weekly_data(n_weeks=N_WEEKS):
    """Create synthetic weekly spend/revenue data with seasonality + noise."""
    start = date(2024, 1, 1)
    dates = [start + timedelta(weeks=i) for i in range(n_weeks)]

    true_alpha, true_beta = np.log(80), 0.65  # tuned so revenue/spend ~= 3.5x ROAS, matching guide's example
    monthly_season = {
        1: 0.82, 2: 0.88, 3: 0.95, 4: 0.98, 5: 1.00, 6: 1.02,
        7: 1.00, 8: 0.97, 9: 1.00, 10: 1.10, 11: 1.30, 12: 1.65,
    }
    # normalize so the yearly average index = 1.0
    avg = np.mean(list(monthly_season.values()))
    monthly_season = {m: v / avg for m, v in monthly_season.items()}

    rows = []
    spend = 8000.0
    for i, d in enumerate(dates):
        spend *= (1 + RNG.normal(0, 0.05))
        spend = max(spend, 2000)
        season_idx = monthly_season[d.month]
        is_holiday = 1 if (d.month == 11 and d.day >= 21) or d.month == 12 else 0
        noise = RNG.normal(0, 0.30)  # true noise std, per the guide's 10.5 section
        log_rev = true_alpha + true_beta * np.log(spend) + 0.15 * is_holiday + noise
        revenue = np.exp(log_rev) * season_idx
        rows.append({"date": d, "spend": spend, "revenue": revenue, "is_holiday": is_holiday})

    return pd.DataFrame(rows)


def compute_seasonality_index(df):
    df = df.copy()
    df["month"] = df["date"].apply(lambda d: d.month)
    monthly_avg = df.groupby("month")["revenue"].mean()
    index = monthly_avg / monthly_avg.mean()
    return index.to_dict()


def fit_elasticity_model(df, season_index):
    df = df.copy()
    df["month"] = df["date"].apply(lambda d: d.month)
    df["season_idx"] = df["month"].map(season_index)
    df["revenue_deseas"] = df["revenue"] / df["season_idx"]
    df["t"] = np.arange(len(df))

    y = np.log(df["revenue_deseas"].values)
    X_full = np.column_stack([
        np.log(df["spend"].values),
        df["t"].values,
        df["is_holiday"].values,
    ])

    # Fit full model first to test the time-trend t-stat
    model_full = LinearRegression().fit(X_full, y)
    resid_full = y - model_full.predict(X_full)
    n, k = X_full.shape
    mse = np.sum(resid_full ** 2) / (n - k - 1)
    X_design = np.column_stack([np.ones(n), X_full])
    try:
        cov = mse * np.linalg.inv(X_design.T @ X_design)
        se_gamma = np.sqrt(cov[2, 2])  # index 2 -> t coefficient
        t_stat_gamma = model_full.coef_[1] / se_gamma
    except np.linalg.LinAlgError:
        t_stat_gamma = 0.0

    use_trend = abs(t_stat_gamma) > 1.96

    if use_trend:
        X = X_full
        model = model_full
    else:
        X = X_full[:, [0, 2]]  # drop the time trend column
        model = LinearRegression().fit(X, y)

    residuals = y - model.predict(X)

    alpha = model.intercept_
    beta = model.coef_[0]
    if use_trend:
        gamma, delta = model.coef_[1], model.coef_[2]
    else:
        gamma, delta = 0.0, model.coef_[1]

    # Heteroscedastic scaling floor (Section 7.5 of the guide)
    resid_std = residuals.std()
    true_noise_std = 0.30  # known for synthetic data; in production this is estimated via CV
    hetero_scale = true_noise_std / resid_std if resid_std > 0 else 1.0
    hetero_scale = max(hetero_scale, 1.2)
    hetero_scale = min(hetero_scale, 2.0)

    r2 = 1 - np.sum(residuals ** 2) / np.sum((y - y.mean()) ** 2)

    return {
        "alpha": float(alpha),
        "beta": float(beta),
        "gamma": float(gamma),
        "delta": float(delta),
        "use_trend": bool(use_trend),
        "residuals": residuals.tolist(),
        "hetero_scale": float(hetero_scale),
        "r_squared": float(r2),
        "n_weeks_trained": int(n),
        "last_t": int(df["t"].iloc[-1]),
    }


def bootstrap_forecast(fit, season_index, weekly_spend, horizon_weeks=13, n_sims=1000):
    """Forecast total revenue over horizon_weeks given a constant weekly spend."""
    residuals = np.array(fit["residuals"]) * fit["hetero_scale"]
    totals = np.empty(n_sims)

    for s in range(n_sims):
        total = 0.0
        for w in range(horizon_weeks):
            t = fit["last_t"] + 1 + w
            month = ((t) % 12) + 1  # simplified month cycling for demo purposes
            season = season_index.get(month, 1.0)
            log_rev = (
                fit["alpha"]
                + fit["beta"] * np.log(weekly_spend)
                + fit["gamma"] * t
                + fit["delta"] * 0  # assume no holiday weeks in this simplified horizon
            )
            log_rev += RNG.choice(residuals)
            total += np.exp(log_rev) * season
        totals[s] = total

    p10, p50, p90 = np.percentile(totals, [10, 50, 90])
    return {"p10": float(p10), "p50": float(p50), "p90": float(p90)}


def main():
    print("Generating synthetic weekly data...")
    df = generate_synthetic_weekly_data()

    print("Computing seasonality index...")
    season_index = compute_seasonality_index(df)

    print("Fitting log-log elasticity model (OLS)...")
    fit = fit_elasticity_model(df, season_index)
    print(f"  alpha={fit['alpha']:.3f}  beta={fit['beta']:.3f}  "
          f"gamma={fit['gamma']:.4f}  delta={fit['delta']:.3f}  "
          f"R^2={fit['r_squared']:.3f}  hetero_scale={fit['hetero_scale']:.2f}")

    print("Running bootstrap forecast (1,000 simulations, 13-week horizon)...")
    last_spend = df["spend"].iloc[-4:].mean()
    forecast = bootstrap_forecast(fit, season_index, last_spend)
    print(f"  P10=${forecast['p10']:,.0f}  P50=${forecast['p50']:,.0f}  "
          f"P90=${forecast['p90']:,.0f}")

    model_artifact = {
        "channel": "google_ads_demo",
        "seasonality_index": season_index,
        "fit": fit,
        "training_data_summary": {
            "n_weeks": len(df),
            "date_range": [str(df["date"].iloc[0]), str(df["date"].iloc[-1])],
            "avg_weekly_spend": float(df["spend"].mean()),
            "avg_weekly_revenue": float(df["revenue"].mean()),
        },
        "sample_forecast": {
            "weekly_spend_used": float(last_spend),
            "horizon_weeks": 13,
            **forecast,
        },
    }

    # Next to this script, whatever directory it is run from, and created if
    # missing: on a fresh clone the folder does not exist and open() failed.
    out_dir = Path(__file__).resolve().parent / "pickle"
    out_dir.mkdir(exist_ok=True)
    out_path = out_dir / "model.pkl"
    with open(out_path, "wb") as f:
        pickle.dump(model_artifact, f)

    print(f"\nSaved model to {out_path}")


if __name__ == "__main__":
    main()
