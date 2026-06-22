from fastapi import APIRouter, HTTPException

from core.calibration import run_calibration_backtest
from state import session as session_store
from api.models import CalibrationRequest, CalibrationResponse

router = APIRouter()


@router.post("/calibration", response_model=CalibrationResponse)
async def calibration(req: CalibrationRequest):
    try:
        data = session_store.require(req.session_id)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))

    try:
        result = run_calibration_backtest(data, req.holdout_weeks)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Calibration backtest failed: {e}")

    return CalibrationResponse(**result)
