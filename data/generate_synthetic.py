"""
Synthetic data generator for the Revenue Forecasting prototype.

Generates 18 months of realistic ad channel data (Jan 2025 – Jun 2026) with:
- Log-log spend→revenue relationship (what the elasticity model will recover)
- Monthly seasonality
- Black Friday spike anomaly
- Cross-file revenue reconciliation so validation checks pass

Alpha values are calibrated so realistic ROAS ranges result:
  Google ~3.8x, Meta ~2.4x, Microsoft ~4.2x (at mid-range spend, average seasonality).
"""

import numpy as np
import pandas as pd
from pathlib import Path

np.random.seed(42)

OUTPUT_DIR = Path(__file__).parent / "generated"
OUTPUT_DIR.mkdir(exist_ok=True)

DATE_START = "2025-01-01"
DATE_END   = "2026-06-30"

MONTHLY_SEASONALITY = {
    1: 0.82, 2: 0.85, 3: 0.95, 4: 1.02, 5: 1.05, 6: 1.00,
    7: 0.95, 8: 0.97, 9: 1.05, 10: 1.10, 11: 1.45, 12: 1.65,
}

# Alpha values calibrated to target realistic ROAS at mid-range spend with average seasonality.
# Derivation: alpha = ln(target_revenue / effective_premium_multiplier) - beta * ln(mid_spend)
CHANNEL_PARAMS = {
    "google": {
        "alpha": 3.83,   # targets ~3.8x ROAS at $13k/week
        "beta": 0.73,
        "noise_std": 0.13,
        "spend_min": 8000,
        "spend_max": 18000,
        # shares must sum to 1.0; premiums are relative (weighted avg ≈ 1.0 after normalization)
        "campaign_types": {
            "Search":   {"share": 0.52, "rev_premium": 1.22, "campaigns": ["Brand Search", "Non-Brand Search"]},
            "Shopping": {"share": 0.28, "rev_premium": 0.94, "campaigns": ["Shopping - Core", "Shopping - Sale"]},
            "Display":  {"share": 0.12, "rev_premium": 0.47, "campaigns": ["Display Remarketing"]},
            "YouTube":  {"share": 0.08, "rev_premium": 0.56, "campaigns": ["YouTube Prospecting"]},
        },
        "avg_aov": 85.0,
        "cvr": 0.032,
        "ctr": 0.045,
    },
    "meta": {
        "alpha": 4.32,   # targets ~2.4x ROAS at $8.5k/week
        "beta": 0.61,
        "noise_std": 0.12,
        "spend_min": 5000,
        "spend_max": 12000,
        "campaign_types": {
            "Prospecting": {"share": 0.45, "rev_premium": 0.64, "campaigns": ["Cold Audience - Broad", "Interest Targeting"]},
            "Retargeting": {"share": 0.35, "rev_premium": 1.46, "campaigns": ["Retargeting - 7d", "Retargeting - 30d"]},
            "Lookalike":   {"share": 0.20, "rev_premium": 1.00, "campaigns": ["LAL - Purchasers 1%", "LAL - Site Visitors 2%"]},
        },
        "avg_aov": 80.0,
        "cvr": 0.018,
        "ctr": 0.012,
    },
    "microsoft": {
        "alpha": 3.95,   # targets ~4.2x ROAS at $3.5k/week
        "beta": 0.68,
        "noise_std": 0.11,
        "spend_min": 2000,
        "spend_max": 5000,
        "campaign_types": {
            "Search":   {"share": 0.70, "rev_premium": 1.08, "campaigns": ["Brand Search", "Non-Brand Search", "Competitor"]},
            "Shopping": {"share": 0.30, "rev_premium": 0.81, "campaigns": ["Shopping - All Products"]},
        },
        "avg_aov": 88.0,
        "cvr": 0.028,
        "ctr": 0.038,
    },
}

GA4_SOURCE_MEDIUM = {
    "google":    ("google", "cpc"),
    "meta":      ("facebook", "cpc"),
    "microsoft": ("bing", "cpc"),
}


def is_black_friday_week(date: pd.Timestamp) -> bool:
    return date.month == 11 and 22 <= date.day <= 28


def _normalize_premiums(campaign_types: dict) -> dict:
    """Ensure weighted sum of (share * rev_premium) = 1.0 so premiums don't inflate the channel total."""
    weighted_sum = sum(v["share"] * v["rev_premium"] for v in campaign_types.values())
    out = {}
    for ctype, params in campaign_types.items():
        out[ctype] = dict(params)
        out[ctype]["rev_premium"] = params["rev_premium"] / weighted_sum
    return out


def generate_channel(channel: str, params: dict, daily_dates: pd.DatetimeIndex) -> pd.DataFrame:
    rows = []
    campaign_types = _normalize_premiums(params["campaign_types"])
    weekly_starts = pd.date_range(start=daily_dates[0], end=daily_dates[-1], freq="W-MON")

    for week_start in weekly_starts:
        bf = is_black_friday_week(week_start)
        month = week_start.month
        season_idx = MONTHLY_SEASONALITY[month]

        base_spend = np.random.uniform(params["spend_min"], params["spend_max"])
        if bf:
            base_spend *= 1.5

        log_rev = params["alpha"] + params["beta"] * np.log(base_spend) + np.random.normal(0, params["noise_std"])
        total_weekly_revenue = np.exp(log_rev) * season_idx
        if bf:
            # Extra Black Friday revenue lift beyond what the spend increase predicts
            total_weekly_revenue *= (2.2 / (1.5 ** params["beta"]))

        # Generate daily fractions that sum to 1 across the week
        # Use actual available days (last week may be partial)
        days_in_week = []
        for day_offset in range(7):
            day = week_start + pd.Timedelta(days=day_offset)
            if day <= daily_dates[-1]:
                days_in_week.append(day)
        n_days = len(days_in_week)
        daily_fracs = np.random.dirichlet(np.ones(n_days))

        for ctype, ct_params in campaign_types.items():
            ct_revenue = total_weekly_revenue * ct_params["share"] * ct_params["rev_premium"]
            ct_spend   = base_spend * ct_params["share"]

            for campaign in ct_params["campaigns"]:
                n_camps = len(ct_params["campaigns"])
                camp_rev   = ct_revenue / n_camps
                camp_spend = ct_spend / n_camps

                avg_aov = params["avg_aov"] * np.random.uniform(0.92, 1.08)
                total_conversions = camp_rev / avg_aov
                total_clicks      = total_conversions / params["cvr"] * np.random.uniform(0.90, 1.10)
                total_impressions = total_clicks / params["ctr"] * np.random.uniform(0.92, 1.08)

                for i, day in enumerate(days_in_week):
                    frac = daily_fracs[i]
                    rows.append({
                        "date":          day.strftime("%Y-%m-%d"),
                        "campaign":      campaign,
                        "campaign_type": ctype,
                        "spend":         round(camp_spend * frac, 2),
                        "impressions":   max(0, int(total_impressions * frac)),
                        "clicks":        max(0, int(total_clicks * frac)),
                        "conversions":   round(max(0.0, total_conversions * frac), 3),
                        "revenue":       round(max(0.0, camp_rev * frac), 2),
                    })

    return pd.DataFrame(rows)


def generate_ga4(channel_dfs: dict, daily_dates: pd.DatetimeIndex) -> pd.DataFrame:
    rows = []
    for channel, df in channel_dfs.items():
        source, medium = GA4_SOURCE_MEDIUM[channel]
        daily_agg = df.groupby("date")[["clicks", "revenue"]].sum().reset_index()
        for _, row in daily_agg.iterrows():
            revenue = row["revenue"] * np.random.uniform(0.93, 0.97)
            avg_aov = CHANNEL_PARAMS[channel]["avg_aov"]
            conversions = revenue / avg_aov
            sessions = max(0, int(row["clicks"] * 1.35 * np.random.uniform(0.9, 1.1)))
            rows.append({
                "date":             row["date"],
                "source":           source,
                "medium":           medium,
                "sessions":         sessions,
                "engaged_sessions": int(sessions * np.random.uniform(0.55, 0.70)),
                "conversions":      round(conversions, 3),
                "revenue":          round(revenue, 2),
            })
    return pd.DataFrame(rows).sort_values("date").reset_index(drop=True)


def generate_shopify(channel_dfs: dict, daily_dates: pd.DatetimeIndex) -> pd.DataFrame:
    rows = []
    channel_labels = {"google": "Google Ads", "meta": "Meta Ads", "microsoft": "Microsoft Ads"}
    for channel, df in channel_dfs.items():
        daily_agg = df.groupby("date")["revenue"].sum().reset_index()
        for _, row in daily_agg.iterrows():
            revenue = row["revenue"] * np.random.uniform(0.93, 1.07)
            avg_aov = CHANNEL_PARAMS[channel]["avg_aov"] * np.random.uniform(0.92, 1.08)
            orders  = max(0, int(revenue / avg_aov))
            if orders == 0:
                continue
            rows.append({
                "date":    row["date"],
                "channel": channel_labels[channel],
                "orders":  orders,
                "aov":     round(avg_aov, 2),
                "revenue": round(revenue, 2),
            })
    return pd.DataFrame(rows).sort_values("date").reset_index(drop=True)


def main():
    daily_dates = pd.date_range(start=DATE_START, end=DATE_END, freq="D")

    print("Generating channel data...")
    channel_dfs: dict = {}
    for channel, params in CHANNEL_PARAMS.items():
        df = generate_channel(channel, params, daily_dates)
        channel_dfs[channel] = df
        out = OUTPUT_DIR / f"{channel}_ads.csv"
        df.to_csv(out, index=False)
        total_spend   = df["spend"].sum()
        total_revenue = df["revenue"].sum()
        roas = total_revenue / total_spend if total_spend > 0 else 0
        print(f"  {channel:12s}: {len(df):5d} rows | spend=${total_spend:>10,.0f} | revenue=${total_revenue:>11,.0f} | ROAS={roas:.2f}x")

    print("Generating GA4 sessions...")
    ga4_df = generate_ga4(channel_dfs, daily_dates)
    ga4_df.to_csv(OUTPUT_DIR / "ga4_sessions.csv", index=False)
    print(f"  {'ga4':12s}: {len(ga4_df):5d} rows | revenue=${ga4_df['revenue'].sum():>11,.0f}")

    print("Generating Shopify orders...")
    shopify_df = generate_shopify(channel_dfs, daily_dates)
    shopify_df.to_csv(OUTPUT_DIR / "shopify_orders.csv", index=False)
    print(f"  {'shopify':12s}: {len(shopify_df):5d} rows | revenue=${shopify_df['revenue'].sum():>11,.0f}")

    print(f"\nAll CSVs written to {OUTPUT_DIR}/")


if __name__ == "__main__":
    main()
