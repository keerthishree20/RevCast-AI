"""
Budget optimizer: solve the inverse forecast problem.

Two modes:
  minimize_cost    — given target P50 revenue, find minimum total budget and optimal allocation
  maximize_revenue — given total budget, find optimal channel allocation to maximize P50 revenue

Optimization uses a fast deterministic proxy (no bootstrap) for the objective; the final
P10/P50/P90 for the winning allocation uses the full bootstrap to stay consistent with /forecast.
"""

from __future__ import annotations

from datetime import date
from typing import Optional

import numpy as np
from scipy.optimize import minimize, OptimizeResult

from core.bootstrap import bootstrap_period_revenue, bootstrap_total_revenue, compute_percentiles
from core.elasticity import ChannelModel
from core.seasonality import get_horizon_seasonality_factor

CHANNELS = ["google", "meta", "microsoft"]


# ── Deterministic proxy (used inside optimizer iterations) ──────────────────


def _point_rev(model: ChannelModel, spend: float, horizon_weeks: int, s_factor: float) -> float:
    """
    Deterministic P50 proxy including adstock steady-state, trend, and holiday.
    Used inside the optimizer loop — no bootstrap, must be fast and differentiable.
    """
    bpw = max(spend / horizon_weeks, 1.0)
    # Adstock steady-state effective spend
    if model.decay_lambda > 0:
        effective = bpw / max(1.0 - model.decay_lambda, 0.01)
    else:
        effective = bpw
    effective = max(effective, 1.0)

    log_rev_hat = model.alpha + model.beta * np.log(effective)
    # Trend: use midpoint of a 1-step-ahead horizon
    t_mid = model.last_week_index + 1 + horizon_weeks / 2
    log_rev_hat += model.gamma * t_mid
    # Holiday not applied in optimizer (optimize for neutral season; user sees full output)
    return float(np.exp(log_rev_hat) * horizon_weeks * s_factor)


def _total_point_rev(
    x: np.ndarray,
    models: dict[str, ChannelModel],
    s_factors: dict[str, float],
    horizon_weeks: int,
) -> float:
    return sum(_point_rev(models[ch], float(x[i]), horizon_weeks, s_factors[ch]) for i, ch in enumerate(CHANNELS))


# ── Seasonality factors (reuse stored monthly indices from last forecast) ───


def compute_s_factors(seasonality_indices: dict, horizon_days: int) -> dict[str, float]:
    today = np.datetime64(date.today(), "D")
    import pandas as pd
    ts = pd.Timestamp(date.today())
    factors = {}
    for ch in CHANNELS:
        monthly_idx = {int(k): v for k, v in seasonality_indices[ch].items()}
        factors[ch] = get_horizon_seasonality_factor(ts, horizon_days, monthly_idx)
    return factors


# ── Per-channel spend bounds ────────────────────────────────────────────────


def _make_bounds(
    weekly_panels: dict,
    current_budget: dict[str, float],
    horizon_weeks: int,
    min_fraction: float,
    max_fraction: float,
) -> list[tuple[float, float]]:
    """
    Lower: max(1, min_fraction × current)
    Upper: min(max_fraction × current, 1.5 × observed_max_weekly × horizon_weeks)
    The upper cap prevents extrapolation far beyond the training data range.
    """
    bounds = []
    for ch in CHANNELS:
        max_obs_weekly = float(weekly_panels[ch]["spend"].max())
        cur = max(current_budget.get(ch, 1000.0), 100.0)
        lb = max(1.0, min_fraction * cur)
        ub_obs = max_obs_weekly * horizon_weeks * 1.5
        ub_cur = max_fraction * cur
        ub = min(ub_obs, ub_cur)
        bounds.append((lb, max(lb + 100.0, ub)))
    return bounds


# ── Bootstrap for final interval (called once after solving) ────────────────


def bootstrap_allocation(
    models: dict[str, ChannelModel],
    allocation: dict[str, float],
    s_factors: dict[str, float],
    horizon_weeks: int,
    n_samples: int = 1000,
) -> dict:
    rng = np.random.default_rng(seed=42)
    ch_samples = {
        ch: bootstrap_period_revenue(
            models[ch], allocation[ch], horizon_weeks, s_factors[ch], n_samples, rng
        )
        for ch in CHANNELS
    }
    total_samples = bootstrap_total_revenue(ch_samples)
    total_rev = compute_percentiles(total_samples)
    total_budget = sum(allocation.values())
    total_roas = {
        k: round(v / total_budget, 3) if total_budget > 0 else 0.0
        for k, v in total_rev.items()
    }
    return {"revenue": total_rev, "roas": total_roas}


# ── Core optimizers ──────────────────────────────────────────────────────────


def minimize_cost(
    models: dict[str, ChannelModel],
    s_factors: dict[str, float],
    weekly_panels: dict,
    current_budget: dict[str, float],
    target_revenue: float,
    horizon_weeks: int,
    min_fraction: float = 0.1,
    max_fraction: float = 3.0,
) -> dict:
    """Find minimum total budget that achieves target P50 revenue."""
    bounds = _make_bounds(weekly_panels, current_budget, horizon_weeks, min_fraction, max_fraction)
    x0 = np.array([max(current_budget.get(ch, 1000.0), bounds[i][0]) for i, ch in enumerate(CHANNELS)])
    x0 = np.clip(x0, [b[0] for b in bounds], [b[1] for b in bounds])

    def total_spend(x): return float(x.sum())
    def rev_slack(x): return _total_point_rev(x, models, s_factors, horizon_weeks) - target_revenue

    result: OptimizeResult = minimize(
        total_spend, x0,
        method="SLSQP",
        bounds=bounds,
        constraints=[{"type": "ineq", "fun": rev_slack}],
        options={"ftol": 1e-9, "maxiter": 600},
    )

    allocation = {ch: float(result.x[i]) for i, ch in enumerate(CHANNELS)}
    achieved_rev = _total_point_rev(result.x, models, s_factors, horizon_weeks)
    feasible = bool(result.success) and (achieved_rev >= target_revenue * 0.99)

    # If infeasible, compute max achievable at upper bounds
    max_rev = None
    if not feasible:
        upper = np.array([b[1] for b in bounds])
        max_rev = _total_point_rev(upper, models, s_factors, horizon_weeks)

    return {
        "allocation": allocation,
        "feasible": feasible,
        "proxy_revenue": achieved_rev,
        "max_achievable_proxy": max_rev,
    }


def maximize_revenue(
    models: dict[str, ChannelModel],
    s_factors: dict[str, float],
    weekly_panels: dict,
    current_budget: dict[str, float],
    total_budget: float,
    horizon_weeks: int,
    min_fraction: float = 0.1,
    max_fraction: float = 3.0,
) -> dict:
    """Find optimal allocation that maximizes P50 revenue for a fixed total budget."""
    bounds = _make_bounds(weekly_panels, current_budget, horizon_weeks, min_fraction, max_fraction)

    # Start from proportional current split scaled to total_budget
    cur_values = np.array([max(current_budget.get(ch, 1000.0), 1.0) for ch in CHANNELS])
    x0 = cur_values / cur_values.sum() * total_budget
    x0 = np.clip(x0, [b[0] for b in bounds], [b[1] for b in bounds])
    # Renormalize after clipping
    x0 = x0 / x0.sum() * total_budget

    def neg_total_rev(x): return -_total_point_rev(x, models, s_factors, horizon_weeks)
    def budget_slack(x): return total_budget - float(x.sum())

    result: OptimizeResult = minimize(
        neg_total_rev, x0,
        method="SLSQP",
        bounds=bounds,
        constraints=[{"type": "ineq", "fun": budget_slack}],
        options={"ftol": 1e-9, "maxiter": 600},
    )

    allocation = {ch: float(result.x[i]) for i, ch in enumerate(CHANNELS)}
    achieved_rev = _total_point_rev(result.x, models, s_factors, horizon_weeks)

    return {
        "allocation": allocation,
        "feasible": bool(result.success),
        "proxy_revenue": achieved_rev,
        "max_achievable_proxy": None,
    }


# ── Efficient frontier ───────────────────────────────────────────────────────


def compute_efficient_frontier(
    models: dict[str, ChannelModel],
    s_factors: dict[str, float],
    weekly_panels: dict,
    current_budget: dict[str, float],
    horizon_weeks: int,
    n_points: int = 10,
    min_fraction: float = 0.1,
    max_fraction: float = 3.0,
) -> list[dict]:
    """
    Sweep total budget from 0.4× to 2.2× current; at each point maximize revenue.
    Uses the fast proxy — no bootstrap. Suitable for a chart; not for precise P50 reporting.
    """
    current_total = max(sum(current_budget.get(ch, 0.0) for ch in CHANNELS), 1.0)
    budgets = np.linspace(current_total * 0.4, current_total * 2.2, n_points)

    frontier = []
    for b in budgets:
        res = maximize_revenue(
            models, s_factors, weekly_panels, current_budget,
            float(b), horizon_weeks, min_fraction, max_fraction,
        )
        frontier.append({
            "budget": round(float(b), 0),
            "revenue_p50": round(res["proxy_revenue"], 0),
            "roas": round(res["proxy_revenue"] / float(b), 3) if b > 0 else 0.0,
        })

    return frontier
