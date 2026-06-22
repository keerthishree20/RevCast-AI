from fastapi import APIRouter, HTTPException

from core.optimizer import (
    compute_s_factors,
    minimize_cost,
    maximize_revenue,
    bootstrap_allocation,
    compute_efficient_frontier,
    CHANNELS,
)
from state import session as session_store
from api.models import OptimizeRequest, OptimizeResponse, FrontierPoint, P10P50P90

router = APIRouter()


@router.post("/optimize", response_model=OptimizeResponse)
async def optimize(req: OptimizeRequest):
    if req.horizon_days not in (30, 60, 90):
        raise HTTPException(status_code=422, detail="horizon_days must be 30, 60, or 90")
    if req.mode not in ("minimize_cost", "maximize_revenue"):
        raise HTTPException(status_code=422, detail="mode must be 'minimize_cost' or 'maximize_revenue'")
    if req.mode == "minimize_cost" and req.target_revenue is None:
        raise HTTPException(status_code=422, detail="target_revenue required for minimize_cost mode")
    if req.mode == "maximize_revenue" and req.total_budget is None:
        raise HTTPException(status_code=422, detail="total_budget required for maximize_revenue mode")

    try:
        data = session_store.require(req.session_id)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))

    last_forecast = data.get("last_forecast")
    if last_forecast is None:
        raise HTTPException(status_code=400, detail="Run /api/forecast first before optimizing")

    try:
        models = last_forecast.channel_models
        season_indices = last_forecast.seasonality_indices
        weekly_panels = data["weekly_panels"]
        current_budget = data.get("last_budget_inputs", {ch: 0.0 for ch in CHANNELS})
        horizon_weeks = max(1, round(req.horizon_days / 7))

        s_factors = compute_s_factors(season_indices, req.horizon_days)
        min_f = req.min_spend_fraction
        max_f = req.max_spend_fraction

        current_total = sum(current_budget.get(ch, 0.0) for ch in CHANNELS)
        current_rev_p50 = last_forecast.forecast["revenue"]["p50"]

        # ── Run optimization ────────────────────────────────────────────────
        if req.mode == "minimize_cost":
            opt = minimize_cost(
                models, s_factors, weekly_panels, current_budget,
                req.target_revenue, horizon_weeks, min_f, max_f,
            )
        else:
            opt = maximize_revenue(
                models, s_factors, weekly_panels, current_budget,
                req.total_budget, horizon_weeks, min_f, max_f,
            )

        allocation = opt["allocation"]
        feasible = opt["feasible"]

        if not feasible and req.mode == "minimize_cost":
            max_rev = opt.get("max_achievable_proxy") or 0.0
            message = (
                f"Target ${req.target_revenue:,.0f} is not achievable within spend limits. "
                f"Maximum achievable: ${max_rev:,.0f}. Lower your target or increase max_spend_fraction."
            )
        elif feasible:
            if req.mode == "minimize_cost":
                opt_total = sum(allocation.values())
                delta = opt_total - current_total
                if delta < -100:
                    message = (
                        f"Optimal budget saves ${abs(delta):,.0f} vs your current allocation "
                        f"while hitting the ${req.target_revenue:,.0f} revenue target."
                    )
                elif delta > 100:
                    message = (
                        f"Target requires ${delta:,.0f} more than current allocation. "
                        f"Optimal split minimizes the additional spend needed."
                    )
                else:
                    message = f"Current allocation is near-optimal for the ${req.target_revenue:,.0f} target."
            else:
                message = "Optimal channel allocation computed for the given budget."
        else:
            message = "Optimization did not fully converge — results are approximate."

        # ── Full bootstrap for final P10/P50/P90 ───────────────────────────
        bootstrap = bootstrap_allocation(models, allocation, s_factors, horizon_weeks)

        opt_total_budget = sum(allocation.values())

        # ── vs-current deltas ───────────────────────────────────────────────
        vs_current = {
            "budget_delta": round(opt_total_budget - current_total, 0),
            "budget_delta_pct": round((opt_total_budget / current_total - 1) * 100, 1) if current_total > 0 else 0.0,
            "revenue_p50_delta": round(bootstrap["revenue"]["p50"] - current_rev_p50, 0),
            "revenue_p50_delta_pct": round((bootstrap["revenue"]["p50"] / current_rev_p50 - 1) * 100, 1) if current_rev_p50 > 0 else 0.0,
        }

        # ── Efficient frontier ────────────────────────────────────────────────
        # Proxy and bootstrap P50 can diverge (proxy ≠ median of sum-of-lognormals).
        # Calibrate the frontier so the Optimal dot lands exactly on the curve.
        proxy_at_opt = opt["proxy_revenue"]
        bootstrap_p50 = bootstrap["revenue"]["p50"]
        calib = (bootstrap_p50 / proxy_at_opt) if proxy_at_opt > 0 else 1.0

        raw_frontier = compute_efficient_frontier(
            models, s_factors, weekly_panels, current_budget,
            horizon_weeks, n_points=12, min_fraction=min_f, max_fraction=max_f,
        )
        frontier = [
            FrontierPoint(
                budget=pt["budget"],
                revenue_p50=round(pt["revenue_p50"] * calib, 0),
                roas=round(pt["revenue_p50"] * calib / pt["budget"], 3) if pt["budget"] > 0 else 0.0,
            )
            for pt in raw_frontier
        ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Optimization failed: {e}")

    return OptimizeResponse(
        mode=req.mode,
        feasible=feasible,
        message=message,
        optimal_allocation={ch: round(allocation[ch], 2) for ch in CHANNELS},
        total_budget=round(opt_total_budget, 2),
        expected_revenue=P10P50P90(**bootstrap["revenue"]),
        expected_roas=P10P50P90(**bootstrap["roas"]),
        vs_current=vs_current,
        efficient_frontier=frontier,
    )
