from fastapi import APIRouter, HTTPException

from core.llm_summary import generate_summary
from state import session as session_store
from api.models import SummaryRequest, SummaryResponse

router = APIRouter()


@router.post("/summary", response_model=SummaryResponse)
async def summary(req: SummaryRequest):
    try:
        data = session_store.require(req.session_id)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))

    forecast_result = data.get("last_forecast")
    if forecast_result is None:
        raise HTTPException(status_code=400, detail="Run /api/forecast before /api/summary.")

    simulation_results = data.get("last_simulate") or []

    try:
        result = generate_summary(data, forecast_result, simulation_results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM summary failed: {e}")

    return SummaryResponse(**result)
