"""Tests for the log-log elasticity model fitting."""

import numpy as np
from core.seasonality import compute_monthly_indices, deseasonalize
from core.elasticity import fit_channel_model, _is_holiday, _apply_adstock


def test_elasticity_recovers_beta(synthetic_weekly_df):
    """The fitted beta should be within ±0.15 of the true value (0.73)."""
    indices = compute_monthly_indices(synthetic_weekly_df)
    df = deseasonalize(synthetic_weekly_df, indices)
    model = fit_channel_model("google", df)
    assert 0.45 < model.beta < 0.95, f"Beta {model.beta} should be near 0.73"


def test_r_squared_above_threshold(synthetic_weekly_df):
    indices = compute_monthly_indices(synthetic_weekly_df)
    df = deseasonalize(synthetic_weekly_df, indices)
    model = fit_channel_model("google", df)
    assert model.r_squared > 0.3, f"R² {model.r_squared} should be > 0.3 on synthetic data"


def test_residuals_have_correct_count(synthetic_weekly_df):
    indices = compute_monthly_indices(synthetic_weekly_df)
    df = deseasonalize(synthetic_weekly_df, indices)
    model = fit_channel_model("google", df)
    assert len(model.residuals) == model.n_obs


def test_residuals_are_centered(synthetic_weekly_df):
    indices = compute_monthly_indices(synthetic_weekly_df)
    df = deseasonalize(synthetic_weekly_df, indices)
    model = fit_channel_model("google", df)
    mean_resid = float(np.mean(model.residuals))
    assert abs(mean_resid) < 0.05, f"Mean residual {mean_resid} should be ~0"


def test_holiday_detection():
    import pandas as pd
    assert _is_holiday(pd.Timestamp("2025-12-01")) is True
    assert _is_holiday(pd.Timestamp("2025-11-24")) is True
    assert _is_holiday(pd.Timestamp("2025-11-20")) is False
    assert _is_holiday(pd.Timestamp("2025-06-15")) is False


def test_adstock_no_decay():
    spend = np.array([100.0, 200.0, 150.0])
    result = _apply_adstock(spend, 0.0)
    np.testing.assert_array_equal(result, spend)


def test_adstock_with_decay():
    spend = np.array([100.0, 100.0, 100.0])
    result = _apply_adstock(spend, 0.5)
    assert result[0] == 100.0
    assert result[1] == 100.0 + 0.5 * 100.0  # 150
    assert result[2] == 100.0 + 0.5 * 150.0  # 175


def test_conservative_adstock_selection(synthetic_weekly_df):
    """Synthetic data has no true carryover, so lambda should be 0."""
    indices = compute_monthly_indices(synthetic_weekly_df)
    df = deseasonalize(synthetic_weekly_df, indices)
    model = fit_channel_model("google", df)
    assert model.decay_lambda == 0.0, f"Lambda {model.decay_lambda} should be 0 (no carryover in DGP)"
