"""Tests for the residual bootstrap and probabilistic forecasting."""

import numpy as np
from core.seasonality import compute_monthly_indices, deseasonalize
from core.elasticity import fit_channel_model
from core.bootstrap import bootstrap_period_revenue, compute_percentiles, bootstrap_total_revenue


def _fit_model(synthetic_weekly_df):
    indices = compute_monthly_indices(synthetic_weekly_df)
    df = deseasonalize(synthetic_weekly_df, indices)
    return fit_channel_model("google", df)


def test_bootstrap_returns_correct_shape(synthetic_weekly_df):
    model = _fit_model(synthetic_weekly_df)
    samples = bootstrap_period_revenue(model, total_budget=150000, horizon_weeks=13, n_samples=500)
    assert samples.shape == (500,)


def test_p10_lt_p50_lt_p90(synthetic_weekly_df):
    model = _fit_model(synthetic_weekly_df)
    samples = bootstrap_period_revenue(model, total_budget=150000, horizon_weeks=13, n_samples=1000)
    pcts = compute_percentiles(samples)
    assert pcts["p10"] < pcts["p50"] < pcts["p90"], f"P10 < P50 < P90 violated: {pcts}"


def test_higher_budget_higher_revenue(synthetic_weekly_df):
    model = _fit_model(synthetic_weekly_df)
    rng = np.random.default_rng(42)
    low = compute_percentiles(bootstrap_period_revenue(model, 50000, 13, rng=rng))
    high = compute_percentiles(bootstrap_period_revenue(model, 200000, 13, rng=rng))
    assert high["p50"] > low["p50"], "Higher budget should yield higher P50 revenue"


def test_seasonality_factor_scales_output(synthetic_weekly_df):
    model = _fit_model(synthetic_weekly_df)
    rng1 = np.random.default_rng(99)
    rng2 = np.random.default_rng(99)
    base = compute_percentiles(bootstrap_period_revenue(model, 150000, 13, seasonality_factor=1.0, rng=rng1))
    boosted = compute_percentiles(bootstrap_period_revenue(model, 150000, 13, seasonality_factor=1.5, rng=rng2))
    ratio = boosted["p50"] / base["p50"]
    assert 1.3 < ratio < 1.7, f"1.5x seasonality should scale P50 by ~1.5x, got {ratio:.2f}"


def test_all_revenues_positive(synthetic_weekly_df):
    model = _fit_model(synthetic_weekly_df)
    samples = bootstrap_period_revenue(model, total_budget=150000, horizon_weeks=13, n_samples=1000)
    assert np.all(samples > 0), "All bootstrapped revenues should be positive"


def test_bootstrap_total_revenue():
    ch1 = np.array([100.0, 200.0, 300.0])
    ch2 = np.array([50.0, 60.0, 70.0])
    total = bootstrap_total_revenue({"a": ch1, "b": ch2})
    np.testing.assert_array_equal(total, [150.0, 260.0, 370.0])


def test_holdout_coverage(synthetic_weekly_df):
    """
    The core calibration test: hold out last 8 weeks, refit, forecast
    single-week P10-P90 bands, check ~80% coverage.
    """
    indices = compute_monthly_indices(synthetic_weekly_df)
    df = deseasonalize(synthetic_weekly_df, indices)
    df = df.sort_values("week_start").reset_index(drop=True)

    holdout = 8
    train_df = df.iloc[:-holdout].copy()
    test_df = df.iloc[-holdout:].copy()

    model = fit_channel_model("google", train_df)

    hits = 0
    for _, row in test_df.iterrows():
        actual = row["revenue"]
        month = row["week_start"].month
        s_factor = indices.get(month, 1.0)
        samples = bootstrap_period_revenue(
            model, total_budget=row["spend"], horizon_weeks=1,
            seasonality_factor=s_factor, n_samples=1000,
        )
        pcts = compute_percentiles(samples)
        if pcts["p10"] <= actual <= pcts["p90"]:
            hits += 1

    coverage = hits / holdout
    assert coverage >= 0.625, f"Coverage {coverage:.0%} is too low (need ≥62.5%)"
