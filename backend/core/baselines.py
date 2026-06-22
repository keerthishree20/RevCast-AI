"""
Baseline models for comparison against the log-log elasticity model.

Provides naive and ARIMA baselines so the evaluation chapter can
demonstrate that the primary model outperforms simpler alternatives.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from dataclasses import dataclass


@dataclass
class BaselineResult:
    model_name: str
    mape_pct: float
    rmse: float
    coverage_pct: float
    predictions: list[dict]


def naive_last_value(weekly_df: pd.DataFrame, holdout: int = 8) -> BaselineResult:
    """Predict each holdout week = last training week's revenue."""
    df = weekly_df.sort_values("week_start").reset_index(drop=True)
    train = df.iloc[:-holdout]
    test = df.iloc[-holdout:]

    last_val = float(train["revenue"].iloc[-1])
    preds = []
    errors = []
    hits = 0

    std_train = float(train["revenue"].std())

    for _, row in test.iterrows():
        actual = float(row["revenue"])
        p10 = last_val - 1.28 * std_train
        p90 = last_val + 1.28 * std_train
        hit = p10 <= actual <= p90
        if hit:
            hits += 1
        errors.append(abs(actual - last_val) / max(actual, 1))
        preds.append({
            "week": str(row["week_start"].date()),
            "actual": round(actual, 2),
            "predicted": round(last_val, 2),
            "p10": round(p10, 2),
            "p90": round(p90, 2),
            "hit": hit,
        })

    residuals = [(r["actual"] - r["predicted"]) for r in preds]
    rmse = float(np.sqrt(np.mean(np.array(residuals) ** 2)))

    return BaselineResult(
        model_name="Naive (Last Value)",
        mape_pct=round(float(np.mean(errors)) * 100, 1),
        rmse=round(rmse, 2),
        coverage_pct=round(hits / holdout * 100, 1),
        predictions=preds,
    )


def naive_moving_average(weekly_df: pd.DataFrame, holdout: int = 8, window: int = 4) -> BaselineResult:
    """Predict each holdout week = mean of last `window` training weeks."""
    df = weekly_df.sort_values("week_start").reset_index(drop=True)
    train = df.iloc[:-holdout]
    test = df.iloc[-holdout:]

    ma_val = float(train["revenue"].iloc[-window:].mean())
    std_train = float(train["revenue"].iloc[-window:].std())

    preds = []
    errors = []
    hits = 0

    for _, row in test.iterrows():
        actual = float(row["revenue"])
        p10 = ma_val - 1.28 * std_train
        p90 = ma_val + 1.28 * std_train
        hit = p10 <= actual <= p90
        if hit:
            hits += 1
        errors.append(abs(actual - ma_val) / max(actual, 1))
        preds.append({
            "week": str(row["week_start"].date()),
            "actual": round(actual, 2),
            "predicted": round(ma_val, 2),
            "p10": round(p10, 2),
            "p90": round(p90, 2),
            "hit": hit,
        })

    residuals = [(r["actual"] - r["predicted"]) for r in preds]
    rmse = float(np.sqrt(np.mean(np.array(residuals) ** 2)))

    return BaselineResult(
        model_name=f"Moving Average ({window}w)",
        mape_pct=round(float(np.mean(errors)) * 100, 1),
        rmse=round(rmse, 2),
        coverage_pct=round(hits / holdout * 100, 1),
        predictions=preds,
    )


def linear_trend(weekly_df: pd.DataFrame, holdout: int = 8) -> BaselineResult:
    """Simple linear trend: revenue = a + b*t."""
    df = weekly_df.sort_values("week_start").reset_index(drop=True)
    train = df.iloc[:-holdout]
    test = df.iloc[-holdout:]

    n_train = len(train)
    t_train = np.arange(n_train, dtype=float)
    y_train = train["revenue"].values

    coeffs = np.polyfit(t_train, y_train, 1)
    slope, intercept = coeffs

    residuals_train = y_train - (intercept + slope * t_train)
    std_resid = float(np.std(residuals_train))

    preds = []
    errors = []
    hits = 0

    for i, (_, row) in enumerate(test.iterrows()):
        t = n_train + i
        pred = intercept + slope * t
        actual = float(row["revenue"])
        p10 = pred - 1.28 * std_resid
        p90 = pred + 1.28 * std_resid
        hit = p10 <= actual <= p90
        if hit:
            hits += 1
        errors.append(abs(actual - pred) / max(actual, 1))
        preds.append({
            "week": str(row["week_start"].date()),
            "actual": round(actual, 2),
            "predicted": round(float(pred), 2),
            "p10": round(float(p10), 2),
            "p90": round(float(p90), 2),
            "hit": hit,
        })

    rmse_val = float(np.sqrt(np.mean(np.array([r["actual"] - r["predicted"] for r in preds]) ** 2)))

    return BaselineResult(
        model_name="Linear Trend",
        mape_pct=round(float(np.mean(errors)) * 100, 1),
        rmse=round(rmse_val, 2),
        coverage_pct=round(hits / holdout * 100, 1),
        predictions=preds,
    )


def run_all_baselines(weekly_df: pd.DataFrame, holdout: int = 8) -> list[BaselineResult]:
    return [
        naive_last_value(weekly_df, holdout),
        naive_moving_average(weekly_df, holdout, window=4),
        linear_trend(weekly_df, holdout),
    ]
