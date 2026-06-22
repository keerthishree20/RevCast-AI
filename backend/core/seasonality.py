"""Monthly seasonality index computation and deseasonalization."""

import pandas as pd
import numpy as np


def compute_monthly_indices(weekly_df: pd.DataFrame) -> dict[int, float]:
    """
    Compute 12 monthly seasonality indices from a weekly spend/revenue DataFrame.
    Indices normalize so their mean = 1.0; month is keyed by integer 1–12.
    """
    df = weekly_df.copy()
    df["month"] = df["week_start"].dt.month
    monthly_means = df.groupby("month")["revenue"].mean()

    grand_mean = monthly_means.mean()
    if grand_mean == 0:
        return {m: 1.0 for m in range(1, 13)}

    indices: dict[int, float] = {}
    for month in range(1, 13):
        if month in monthly_means.index:
            indices[month] = float(monthly_means[month] / grand_mean)
        else:
            indices[month] = 1.0

    return indices


def deseasonalize(weekly_df: pd.DataFrame, monthly_indices: dict[int, float]) -> pd.DataFrame:
    """Add a revenue_deseas column by dividing revenue by its month's index."""
    df = weekly_df.copy()
    df["month"] = df["week_start"].dt.month
    df["season_idx"] = df["month"].map(monthly_indices).fillna(1.0)
    df["revenue_deseas"] = df["revenue"] / df["season_idx"].replace(0, 1.0)
    return df


def get_horizon_seasonality_factor(
    horizon_start: pd.Timestamp,
    horizon_days: int,
    monthly_indices: dict[int, float],
) -> float:
    """
    Compute the weighted average seasonality factor across the forecast horizon.
    Weights each calendar month by the number of days it contributes to the horizon.
    """
    date_range = pd.date_range(start=horizon_start, periods=horizon_days, freq="D")
    month_counts = pd.Series(date_range.month).value_counts()
    total_days = month_counts.sum()

    weighted = sum(
        monthly_indices.get(int(m), 1.0) * count
        for m, count in month_counts.items()
    )
    return float(weighted / total_days) if total_days > 0 else 1.0
