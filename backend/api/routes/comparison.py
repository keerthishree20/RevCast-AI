"""Model comparison endpoint: run baseline models alongside the elasticity model."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from state import session
from core.baselines import run_all_baselines
from core.calibration import run_calibration_backtest

router = APIRouter()


class ComparisonRequest(BaseModel):
    session_id: str
    holdout_weeks: int = Field(8, ge=4, le=20)


@router.post("/comparison")
def comparison(req: ComparisonRequest):
    try:
        data = session.require(req.session_id)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))

    weekly_panels = data.get("weekly_panels", {})
    if not weekly_panels:
        raise HTTPException(status_code=400, detail="No data ingested yet.")

    # Run the elasticity model backtest
    cal = run_calibration_backtest(data, holdout_weeks=req.holdout_weeks)

    # Run baselines per channel
    baseline_results = {}
    for channel, df in weekly_panels.items():
        if channel in ("ga4", "shopify"):
            continue
        baseline_results[channel] = [
            {
                "model_name": b.model_name,
                "mape_pct": b.mape_pct,
                "rmse": b.rmse,
                "coverage_pct": b.coverage_pct,
                "predictions": b.predictions,
            }
            for b in run_all_baselines(df, holdout=req.holdout_weeks)
        ]

    # Build elasticity model summary per channel
    elasticity_per_channel = {}
    for ch_result in cal["channels"]:
        elasticity_per_channel[ch_result["channel"]] = {
            "model_name": "Log-Log Elasticity (RevCast)",
            "mape_pct": ch_result["mape_pct"],
            "rmse": 0,  # not computed in calibration endpoint
            "coverage_pct": ch_result["coverage_pct"],
            "predictions": [
                {
                    "week": w["week"],
                    "actual": w["actual"],
                    "predicted": w["p50"],
                    "p10": w["p10"],
                    "p90": w["p90"],
                    "hit": w["hit"],
                }
                for w in ch_result["weeks"]
            ],
        }

    # Merge: primary model first, then baselines
    comparison_data = {}
    for channel in baseline_results:
        comparison_data[channel] = [
            elasticity_per_channel.get(channel, {}),
            *baseline_results[channel],
        ]

    return {
        "holdout_weeks": req.holdout_weeks,
        "channels": comparison_data,
        "overall_elasticity": {
            "coverage_pct": cal["overall_coverage_pct"],
            "mape_pct": cal["overall_mape_pct"],
        },
    }
