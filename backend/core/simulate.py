"""Budget scenario simulation using pre-fitted channel models."""

import numpy as np
import pandas as pd

from core.bootstrap import bootstrap_period_revenue, bootstrap_total_revenue, compute_percentiles
from core.seasonality import get_horizon_seasonality_factor
from core.forecast_engine import ForecastResult


def run_scenarios(
    forecast_result: ForecastResult,
    session_data: dict,
    scenarios: list[dict],
    horizon_days: int,
    n_bootstrap: int = 1000,
) -> list[dict]:
    """
    Each scenario is {label: str, budget: {google, meta, microsoft}}.
    Returns list of scenario result dicts with revenue/roas P10/P50/P90 and marginal_roas.
    """
    horizon_weeks = max(1, round(horizon_days / 7))
    ad_channels = ["google", "meta", "microsoft"]
    channel_models = forecast_result.channel_models
    season_indices_all = forecast_result.seasonality_indices

    rng = np.random.default_rng(seed=99)

    results: list[dict] = []
    prev_p50_rev = None
    prev_total_budget = None

    for scenario in scenarios:
        budget_map = scenario["budget"]
        total_budget = sum(budget_map.get(ch, 0.0) for ch in ad_channels)

        channel_sample_map: dict[str, np.ndarray] = {}
        for ch in ad_channels:
            budget = budget_map.get(ch, 0.0)
            model  = channel_models[ch]
            monthly_idx = {int(k): v for k, v in season_indices_all[ch].items()}
            s_factor = get_horizon_seasonality_factor(
                pd.Timestamp(forecast_result.horizon_start), horizon_days, monthly_idx
            )
            channel_sample_map[ch] = bootstrap_period_revenue(
                model, budget, horizon_weeks, s_factor, n_bootstrap, rng
            )

        total_samples = bootstrap_total_revenue(channel_sample_map)
        rev_pcts = compute_percentiles(total_samples)
        roas_pcts = {
            "p10": round(rev_pcts["p10"] / total_budget, 3) if total_budget > 0 else 0.0,
            "p50": round(rev_pcts["p50"] / total_budget, 3) if total_budget > 0 else 0.0,
            "p90": round(rev_pcts["p90"] / total_budget, 3) if total_budget > 0 else 0.0,
        }

        marginal_roas = None
        if prev_p50_rev is not None and prev_total_budget is not None:
            budget_delta = total_budget - prev_total_budget
            if budget_delta > 0:
                marginal_roas = round((rev_pcts["p50"] - prev_p50_rev) / budget_delta, 3)

        results.append({
            "label":         scenario["label"],
            "total_budget":  round(total_budget, 2),
            "revenue":       rev_pcts,
            "roas":          roas_pcts,
            "marginal_roas": marginal_roas,
        })

        prev_p50_rev      = rev_pcts["p50"]
        prev_total_budget = total_budget

    return results


def build_default_scenarios(base_budget: dict[str, float]) -> list[dict]:
    """Generate 5 standard budget multiplier scenarios around the base."""
    multipliers = [
        ("−50%",  0.50),
        ("−25%",  0.75),
        ("Base",  1.00),
        ("+25%",  1.25),
        ("+50%",  1.50),
    ]
    scenarios = []
    for label, mult in multipliers:
        scenarios.append({
            "label":  label,
            "budget": {ch: round(v * mult, 2) for ch, v in base_budget.items()},
        })
    return scenarios
