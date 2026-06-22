"""
Calibration backtest: proves the model's P10/P50/P90 claim instead of just asserting it.

For each channel, holds out the last `holdout_weeks` of historical data, refits the
elasticity model on everything before that, then bootstraps a single-week forecast
for each held-out week and checks whether the actual revenue fell inside the
predicted P10-P90 band. This is the same procedure used to calibrate the
heteroscedastic bootstrap floor in bootstrap.py — exposing it as an endpoint lets
the frontend show the proof rather than a static accuracy badge.
"""

from __future__ import annotations
import numpy as np
import pandas as pd

from core.seasonality import compute_monthly_indices, deseasonalize
from core.elasticity import fit_channel_model, _is_holiday
from core.bootstrap import bootstrap_period_revenue

CHANNELS = ["google", "meta", "microsoft"]


def run_calibration_backtest(session_data: dict, holdout_weeks: int = 8) -> dict:
    weekly_panels: dict[str, pd.DataFrame] = session_data["weekly_panels"]
    rng_seed = 42

    channel_results = []
    total_hits = 0
    total_count = 0
    total_ape = 0.0

    for ch in CHANNELS:
        weekly = weekly_panels[ch].sort_values("week_start").reset_index(drop=True)
        n = len(weekly)
        if n < holdout_weeks + 12:
            # Not enough history to hold out this many weeks and still fit a model
            continue

        train = weekly.iloc[: n - holdout_weeks].copy()
        test = weekly.iloc[n - holdout_weeks :].copy()

        monthly_idx = compute_monthly_indices(train)
        train_ds = deseasonalize(train, monthly_idx)
        model = fit_channel_model(ch, train_ds)
        last_train_week = train["week_start"].max()

        weeks_out = []
        ch_hits = 0
        ch_count = 0
        ch_ape = 0.0

        for _, row in test.iterrows():
            if row["spend"] < 100:
                continue
            s_factor = monthly_idx.get(row["week_start"].month, 1.0)
            weeks_ahead = max(1, round((row["week_start"] - last_train_week).days / 7))
            is_holiday = _is_holiday(row["week_start"])

            rng = np.random.default_rng(rng_seed)
            samples = bootstrap_period_revenue(
                model, row["spend"], 1, s_factor, 1000, rng,
                is_holiday_horizon=is_holiday, weeks_ahead=weeks_ahead,
            )
            p10, p50, p90 = (float(v) for v in np.percentile(samples, [10, 50, 90]))
            actual = float(row["revenue"])
            hit = p10 <= actual <= p90
            ape = abs(p50 - actual) / max(actual, 1.0)

            weeks_out.append({
                "week": row["week_start"].strftime("%Y-%m-%d"),
                "actual": round(actual, 2),
                "p10": round(p10, 2),
                "p50": round(p50, 2),
                "p90": round(p90, 2),
                "hit": bool(hit),
            })

            ch_hits += int(hit)
            ch_count += 1
            ch_ape += ape

        if ch_count == 0:
            continue

        channel_results.append({
            "channel": ch,
            "coverage_pct": round(100 * ch_hits / ch_count, 1),
            "mape_pct": round(100 * ch_ape / ch_count, 1),
            "weeks": weeks_out,
        })

        total_hits += ch_hits
        total_count += ch_count
        total_ape += ch_ape

    return {
        "holdout_weeks": holdout_weeks,
        "overall_coverage_pct": round(100 * total_hits / total_count, 1) if total_count else 0.0,
        "overall_mape_pct": round(100 * total_ape / total_count, 1) if total_count else 0.0,
        "hit_count": total_hits,
        "total_count": total_count,
        "channels": channel_results,
    }
