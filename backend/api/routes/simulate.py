from fastapi import APIRouter, HTTPException

from core.simulate import run_scenarios, build_default_scenarios
from state import session as session_store
from api.models import SimulateRequest, SimulateResponse, ScenarioResult, P10P50P90

router = APIRouter()


@router.post("/simulate", response_model=SimulateResponse)
async def simulate(req: SimulateRequest):
    try:
        data = session_store.require(req.session_id)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))

    forecast_result = data.get("last_forecast")
    if forecast_result is None:
        raise HTTPException(status_code=400, detail="Run /api/forecast before /api/simulate.")

    scenarios = (
        [s.model_dump() for s in req.scenarios]
        if req.scenarios
        else build_default_scenarios(req.base_budget)
    )

    try:
        results = run_scenarios(
            forecast_result=forecast_result,
            session_data=data,
            scenarios=scenarios,
            horizon_days=req.horizon_days,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {e}")

    session_store.update(req.session_id, {"last_simulate": results})

    return SimulateResponse(
        horizon_days=req.horizon_days,
        results=[
            ScenarioResult(
                label=r["label"],
                total_budget=r["total_budget"],
                revenue=P10P50P90(**r["revenue"]),
                roas=P10P50P90(**r["roas"]),
                marginal_roas=r.get("marginal_roas"),
            )
            for r in results
        ],
    )
