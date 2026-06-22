"""Shared fixtures for the test suite."""

import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

# Ensure backend package is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


@pytest.fixture
def rng():
    return np.random.default_rng(42)


@pytest.fixture
def synthetic_weekly_df():
    """78 weeks of synthetic weekly data for one channel (Google-like)."""
    rng = np.random.default_rng(42)
    n_weeks = 78
    start = pd.Timestamp("2025-01-06")
    weeks = pd.date_range(start, periods=n_weeks, freq="W-MON")

    alpha_true, beta_true, noise_std = 3.83, 0.73, 0.13
    seasonality = {
        1: 0.82, 2: 0.85, 3: 0.95, 4: 1.02, 5: 1.05, 6: 1.00,
        7: 0.95, 8: 0.97, 9: 1.05, 10: 1.10, 11: 1.45, 12: 1.65,
    }

    spends = rng.uniform(8000, 18000, n_weeks)
    revenues = []
    for i, w in enumerate(weeks):
        s_idx = seasonality[w.month]
        log_rev = alpha_true + beta_true * np.log(spends[i]) + rng.normal(0, noise_std)
        revenues.append(np.exp(log_rev) * s_idx)

    return pd.DataFrame({
        "week_start": weeks,
        "spend": spends,
        "revenue": revenues,
    })
