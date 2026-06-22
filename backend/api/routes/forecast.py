from fastapi import APIRouter, HTTPException

from core.forecast_engine import run_forecast
from state import session as session_store
from api.models import (
    ForecastRequest, ForecastResponse,
    ChannelBreakdownRow, CampaignTypeRow, AnomalyRow,
    P10P50P90,
)

router = APIRouter()


@router.post("/forecast", response_model=ForecastResponse)
async def forecast(req: ForecastRequest):
    if req.horizon_days not in (30, 60, 90):
        raise HTTPException(status_code=422, detail="horizon_days must be 30, 60, or 90")

    try:
        data = session_store.require(req.session_id)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))

    try:
        result = run_forecast(
            session_data=data,
            budget_inputs=req.budget_inputs,
            horizon_days=req.horizon_days,
            n_bootstrap=req.n_bootstrap,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forecast failed: {e}")

    # Store result for /simulate and /summary to reuse
    session_store.update(req.session_id, {
        "last_forecast":       result,
        "last_budget_inputs":  req.budget_inputs,
        "last_horizon_days":   req.horizon_days,
    })

    channel_rows = [
        ChannelBreakdownRow(
            channel=cf.channel,
            budget=cf.budget,
            revenue=P10P50P90(**cf.revenue),
            roas=P10P50P90(**cf.roas),
            elasticity=cf.elasticity,
            model_r2=cf.model_r2,
            campaign_type_breakdown=cf.campaign_type_breakdown,
        )
        for cf in result.channel_breakdown
    ]

    ct_rows = [
        CampaignTypeRow(
            channel=ct["channel"],
            campaign_type=ct["campaign_type"],
            revenue_share=ct["revenue_share"],
            revenue=P10P50P90(**ct["revenue"]),
        )
        for ct in result.campaign_type_breakdown
    ]

    anomaly_rows = [
        AnomalyRow(
            channel=a.channel,
            week=a.week,
            z_score=a.z_score,
            description=a.description,
        )
        for a in result.anomalies
    ]

    return ForecastResponse(
        session_id=req.session_id,
        horizon_days=result.horizon_days,
        total_budget=result.total_budget,
        forecast=result.forecast,
        channel_breakdown=channel_rows,
        campaign_type_breakdown=ct_rows,
        seasonality_indices=result.seasonality_indices,
        anomalies=anomaly_rows,
    )
