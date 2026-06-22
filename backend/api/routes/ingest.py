from fastapi import APIRouter, UploadFile, File, HTTPException
import uuid

from core.ingest import run_ingest
from state import session as session_store
from api.models import IngestResponse, IngestSummary, ChannelTotals, ChannelWeeklyPreviewRow

router = APIRouter()


@router.post("/ingest", response_model=IngestResponse)
async def ingest(
    google:    UploadFile = File(..., description="google_ads.csv"),
    meta:      UploadFile = File(..., description="meta_ads.csv"),
    microsoft: UploadFile = File(..., description="microsoft_ads.csv"),
    ga4:       UploadFile = File(..., description="ga4_sessions.csv"),
    shopify:   UploadFile = File(..., description="shopify_orders.csv"),
):
    file_map: dict[str, bytes] = {}
    try:
        file_map["google"]    = await google.read()
        file_map["meta"]      = await meta.read()
        file_map["microsoft"] = await microsoft.read()
        file_map["ga4"]       = await ga4.read()
        file_map["shopify"]   = await shopify.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read uploaded files: {e}")

    try:
        result = run_ingest(file_map)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    session_id = str(uuid.uuid4())
    session_store.set(session_id, {
        "weekly_panels": result.weekly_panels,
        "raw_dfs":       result.raw_dfs,
        "ingest_result": result,
        "last_forecast": None,
        "last_simulate": None,
    })

    overall_spend   = sum(t["spend"]   for t in result.channel_totals.values())
    overall_revenue = sum(t["revenue"] for t in result.channel_totals.values())

    return IngestResponse(
        session_id=session_id,
        summary=IngestSummary(
            date_range_start=result.date_range[0],
            date_range_end=result.date_range[1],
            weeks_available=result.weeks_available,
            overall_spend=round(overall_spend, 2),
            overall_revenue=round(overall_revenue, 2),
            overall_roas=round(overall_revenue / overall_spend, 3) if overall_spend > 0 else 0.0,
            channel_totals={
                ch: ChannelTotals(**vals)
                for ch, vals in result.channel_totals.items()
            },
        ),
        weekly_data_preview={
            ch: [ChannelWeeklyPreviewRow(**row) for row in rows]
            for ch, rows in result.channel_weekly_preview.items()
        },
    )
