"""
Log-log elasticity model with three live accuracy improvements:

  1. Holiday dummy   — explicit Nov/Dec coefficient instead of inflating residuals
  2. Time trend      — captures secular growth; gated on statistical significance (|t|>1.96)
  3. Adstock         — geometric spend carryover; selected via cross-validation with ≥10%
                       improvement threshold (disabled when DGP has no carryover)

Heteroscedastic bootstrap scaling lives in bootstrap.py (improvement #4).
Robust regression (RLM) intentionally NOT used: on datasets where holiday outliers
are genuinely in-distribution, Huber weighting degrades coverage. Use OLS.
"""

from dataclasses import dataclass
import numpy as np
import pandas as pd
import statsmodels.api as sm


@dataclass
class ChannelModel:
    channel: str
    alpha: float              # log-space intercept
    beta: float               # spend/adstock elasticity
    gamma: float              # time-trend coefficient (significant only; else 0.0)
    delta: float              # holiday-week premium (log-space)
    decay_lambda: float       # adstock decay rate (0.0 = no carryover)
    residuals: np.ndarray     # log-space OLS residuals (for bootstrap)
    log_rev_hat_mean: float   # mean fitted log-rev in training (for hetero scaling)
    r_squared: float
    n_obs: int
    spend_mean: float
    revenue_mean: float
    last_week_index: float    # centered t of last training obs (for trend extrapolation)
    last_adstock_spend: float # adstock value at training end (carryover into forecast)


# ── Holiday detection ────────────────────────────────────────────────────────

def _is_holiday(week_start: pd.Timestamp) -> bool:
    """Thanksgiving week through December."""
    m, d = week_start.month, week_start.day
    return m == 12 or (m == 11 and d >= 21)


# ── Adstock ──────────────────────────────────────────────────────────────────

def _apply_adstock(spend: np.ndarray, lam: float) -> np.ndarray:
    a = np.empty_like(spend, dtype=float)
    a[0] = spend[0]
    for t in range(1, len(spend)):
        a[t] = spend[t] + lam * a[t - 1]
    return a


def _select_lambda(df: pd.DataFrame) -> float:
    """
    Cross-validate adstock λ on last 8 weeks.
    Requires ≥10% RMSE improvement over λ=0 to accept any non-zero value.
    This prevents spurious carryover detection on datasets with no true adstock.
    """
    df = df.sort_values("week_start").reset_index(drop=True)
    n = len(df)
    if n < 16:
        return 0.0

    train_n = n - 8
    best_lam, best_rmse = 0.0, float("inf")

    for lam in (0.0, 0.2, 0.3, 0.4, 0.5, 0.6):
        ad = _apply_adstock(df["spend"].values, lam)
        mask_tr = ad[:train_n] >= 100
        if mask_tr.sum() < 8:
            continue
        log_ad = np.log(np.maximum(ad[:train_n][mask_tr], 1.0))
        log_rv = np.log(np.maximum(df["revenue_deseas"].values[:train_n][mask_tr], 1e-6))
        X = np.column_stack([np.ones(mask_tr.sum()), log_ad])
        try:
            coeffs, _, _, _ = np.linalg.lstsq(X, log_rv, rcond=None)
        except Exception:
            continue
        mask_val = ad[train_n:] >= 100
        if mask_val.sum() == 0:
            continue
        X_val = np.column_stack([np.ones(mask_val.sum()), np.log(np.maximum(ad[train_n:][mask_val], 1.0))])
        log_rv_val = np.log(np.maximum(df["revenue_deseas"].values[train_n:][mask_val], 1e-6))
        rmse = float(np.sqrt(np.mean((log_rv_val - X_val @ coeffs) ** 2)))
        # Require ≥10% improvement to prefer non-zero lambda
        if rmse < best_rmse * 0.90:
            best_rmse, best_lam = rmse, lam

    return best_lam


# ── Model fitting ────────────────────────────────────────────────────────────

def fit_channel_model(channel: str, weekly_df: pd.DataFrame) -> ChannelModel:
    """
    Fit: log(revenue_deseas) = α + β·log(adstock_or_spend) + γ·t + δ·is_holiday + ε
    via OLS. γ is zeroed out if not statistically significant (|t-stat| < 1.96).
    """
    df_full = weekly_df.sort_values("week_start").reset_index(drop=True)

    # ── 1. Select adstock λ (conservative: requires clear evidence of carryover) ──
    df_for_cv = df_full[df_full["spend"] >= 100].copy()
    if len(df_for_cv) < 8:
        raise ValueError(f"Channel {channel!r} needs ≥8 weeks with spend ≥ $100.")

    decay_lambda = _select_lambda(df_for_cv)
    adstock_full = _apply_adstock(df_full["spend"].values, decay_lambda)
    df_full["adstock"] = adstock_full

    df_fit = df_full[df_full["spend"] >= 100].reset_index(drop=True)
    n = len(df_fit)

    # ── 2. Design matrix ──────────────────────────────────────────────
    # Centered time trend: t ∈ [-(n-1)/2, +(n-1)/2]
    t_raw = np.arange(n, dtype=float)
    t_centered = t_raw - t_raw.mean()

    is_holiday = df_fit["week_start"].apply(_is_holiday).values.astype(float)
    log_x = np.log(np.maximum(df_fit["adstock"].values, 1.0))
    log_rev = np.log(df_fit["revenue_deseas"].clip(lower=1e-6).values)

    X = sm.add_constant(np.column_stack([log_x, t_centered, is_holiday]))

    # ── 3. OLS ───────────────────────────────────────────────────────
    ols = sm.OLS(log_rev, X).fit()

    alpha = float(ols.params[0])
    beta  = float(ols.params[1])
    # Gate time trend on significance: zero out if |t-stat| < 1.96
    gamma_raw = float(ols.params[2])
    gamma_tstat = float(ols.tvalues[2])
    gamma = gamma_raw if abs(gamma_tstat) >= 1.96 else 0.0
    delta = float(ols.params[3])

    log_rev_hat = ols.fittedvalues
    residuals = (log_rev - log_rev_hat).astype(float)

    return ChannelModel(
        channel=channel,
        alpha=alpha,
        beta=beta,
        gamma=gamma,
        delta=delta,
        decay_lambda=decay_lambda,
        residuals=residuals,
        log_rev_hat_mean=float(log_rev_hat.mean()),
        r_squared=float(ols.rsquared),
        n_obs=n,
        spend_mean=float(df_fit["spend"].mean()),
        revenue_mean=float(df_fit["revenue_deseas"].mean()),
        last_week_index=float(t_centered[-1]),
        last_adstock_spend=float(adstock_full[-1]),
    )
