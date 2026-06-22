"""Tests for seasonality index computation and deseasonalization."""

import numpy as np
import pandas as pd
from core.seasonality import compute_monthly_indices, deseasonalize, get_horizon_seasonality_factor


def test_monthly_indices_average_to_one(synthetic_weekly_df):
    indices = compute_monthly_indices(synthetic_weekly_df)
    assert len(indices) == 12
    mean_idx = np.mean(list(indices.values()))
    assert abs(mean_idx - 1.0) < 0.1, f"Mean index {mean_idx} should be ~1.0"


def test_december_index_highest(synthetic_weekly_df):
    indices = compute_monthly_indices(synthetic_weekly_df)
    dec_idx = indices[12]
    other_max = max(v for k, v in indices.items() if k != 12)
    assert dec_idx > other_max, "December should have the highest seasonality index"


def test_january_index_low(synthetic_weekly_df):
    indices = compute_monthly_indices(synthetic_weekly_df)
    assert indices[1] < 1.0, "January should be below-average seasonality"


def test_deseasonalize_preserves_shape(synthetic_weekly_df):
    indices = compute_monthly_indices(synthetic_weekly_df)
    result = deseasonalize(synthetic_weekly_df, indices)
    assert len(result) == len(synthetic_weekly_df)
    assert "revenue_deseas" in result.columns


def test_deseasonalize_reduces_variance(synthetic_weekly_df):
    indices = compute_monthly_indices(synthetic_weekly_df)
    result = deseasonalize(synthetic_weekly_df, indices)
    raw_cv = synthetic_weekly_df["revenue"].std() / synthetic_weekly_df["revenue"].mean()
    deseas_cv = result["revenue_deseas"].std() / result["revenue_deseas"].mean()
    assert deseas_cv < raw_cv, "Deseasonalized data should have lower coefficient of variation"
