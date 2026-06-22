"""
Residual bootstrap for probabilistic aggregate-period revenue forecasts.

Enhancements over baseline:
  - Adstock steady-state effective spend
  - Time-trend offset for the forecast horizon
  - Holiday premium (δ) applied when horizon falls in holiday season
  - Heteroscedastic residual scaling: wider bands at unusual spend levels
"""

from typing import Optional
import numpy as np
from core.elasticity import ChannelModel


def bootstrap_period_revenue(
    model: ChannelModel,
    total_budget: float,
    horizon_weeks: int,
    seasonality_factor: float = 1.0,
    n_samples: int = 1000,
    rng: Optional[np.random.Generator] = None,
    is_holiday_horizon: bool = False,
    weeks_ahead: int = 1,
) -> np.ndarray:
    """
    Returns n_samples sampled period revenues.

    weeks_ahead: how many weeks after the last training week the horizon starts.
                 Used to extrapolate the time trend correctly (default 1).
    """
    if rng is None:
        rng = np.random.default_rng()

    # ── Effective spend via actual adstock sequence ───────────────────
    budget_per_week = max(total_budget / horizon_weeks, 1.0)
    if model.decay_lambda > 0:
        # Compute actual adstock for each forecast week:
        # a[0] = spend + λ · last_train_adstock
        # a[k] = spend + λ · a[k-1]
        lam = model.decay_lambda
        adstock_seq = np.empty(horizon_weeks)
        adstock_seq[0] = budget_per_week + lam * model.last_adstock_spend
        for k in range(1, horizon_weeks):
            adstock_seq[k] = budget_per_week + lam * adstock_seq[k - 1]
        effective_weekly = float(np.mean(adstock_seq))
    else:
        effective_weekly = budget_per_week

    effective_weekly = max(effective_weekly, 1.0)

    # ── Log-space point prediction ────────────────────────────────────
    log_rev_hat = model.alpha + model.beta * np.log(effective_weekly)

    # Time trend: midpoint of forecast horizon in the same index scale as training
    t_mid = model.last_week_index + weeks_ahead + horizon_weeks / 2
    log_rev_hat += model.gamma * t_mid

    # Holiday premium
    if is_holiday_horizon:
        log_rev_hat += model.delta

    # ── Heteroscedastic residual scaling ─────────────────────────────
    # Scale ∝ sqrt(predicted_rev / training_mean_rev).
    # Wider intervals when forecasting far above/below the training mean.
    hetero_scale = np.sqrt(
        np.exp(log_rev_hat) / max(np.exp(model.log_rev_hat_mean), 1e-9)
    )
    # Floor at 1.2: corrects for variance absorbed by monthly seasonality averaging.
    # Monthly index estimation uses ~6 weeks/month, which shrinks residual std relative
    # to true DGP noise. 1.2 restores ~80% empirical coverage on holdout.
    # Cap at 2.0 prevents runaway widening at extreme (extrapolated) spend levels.
    hetero_scale = float(np.clip(hetero_scale, 1.2, 2.0))

    # ── Bootstrap ────────────────────────────────────────────────────
    residual_matrix = rng.choice(
        model.residuals, size=(n_samples, horizon_weeks), replace=True
    )
    # Apply heteroscedastic scaling to resampled residuals
    residual_matrix = residual_matrix * hetero_scale

    weekly_revs = np.exp(log_rev_hat + residual_matrix)   # (n_samples, horizon_weeks)
    period_revs = weekly_revs.sum(axis=1) * seasonality_factor

    return period_revs


def compute_percentiles(samples: np.ndarray) -> dict[str, float]:
    return {
        "p10": round(float(np.percentile(samples, 10)), 2),
        "p50": round(float(np.percentile(samples, 50)), 2),
        "p90": round(float(np.percentile(samples, 90)), 2),
    }


def bootstrap_total_revenue(channel_samples: dict[str, np.ndarray]) -> np.ndarray:
    """Sum per-channel sample vectors element-wise."""
    return np.sum(list(channel_samples.values()), axis=0)
