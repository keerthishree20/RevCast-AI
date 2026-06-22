"""Pydantic request/response schemas for all API endpoints."""

from pydantic import BaseModel, Field
from typing import Optional


# ── Shared ──────────────────────────────────────────────────────────────────

class P10P50P90(BaseModel):
    p10: float
    p50: float
    p90: float


# ── /api/ingest ─────────────────────────────────────────────────────────────

class ChannelWeeklyPreviewRow(BaseModel):
    week_start: str
    spend: float
    revenue: float


class ChannelTotals(BaseModel):
    spend: float
    revenue: float
    roas: float


class IngestSummary(BaseModel):
    date_range_start: str
    date_range_end: str
    weeks_available: int
    overall_spend: float
    overall_revenue: float
    overall_roas: float
    channel_totals: dict[str, ChannelTotals]


class IngestResponse(BaseModel):
    session_id: str
    summary: IngestSummary
    weekly_data_preview: dict[str, list[ChannelWeeklyPreviewRow]]


# ── /api/validate ────────────────────────────────────────────────────────────

class ValidateRequest(BaseModel):
    session_id: str


class CheckResult(BaseModel):
    name: str
    passed: bool
    message: str
    detail: dict = Field(default_factory=dict)


class ValidateResponse(BaseModel):
    passed: bool
    checks: list[CheckResult]


# ── /api/forecast ────────────────────────────────────────────────────────────

class ForecastRequest(BaseModel):
    session_id: str
    budget_inputs: dict[str, float]
    horizon_days: int = Field(90, description="Must be 30, 60, or 90")
    n_bootstrap: int = Field(1000, ge=100, le=5000)


class CampaignTypeRow(BaseModel):
    channel: str
    campaign_type: str
    revenue_share: float
    revenue: P10P50P90


class ChannelBreakdownRow(BaseModel):
    channel: str
    budget: float
    revenue: P10P50P90
    roas: P10P50P90
    elasticity: float
    model_r2: float
    campaign_type_breakdown: list[dict]


class AnomalyRow(BaseModel):
    channel: str
    week: str
    z_score: float
    description: str


class ForecastResponse(BaseModel):
    session_id: str
    horizon_days: int
    total_budget: float
    forecast: dict
    channel_breakdown: list[ChannelBreakdownRow]
    campaign_type_breakdown: list[CampaignTypeRow]
    seasonality_indices: dict
    anomalies: list[AnomalyRow]


# ── /api/simulate ─────────────────────────────────────────────────────────────

class SimulateScenario(BaseModel):
    label: str
    budget: dict[str, float]


class SimulateRequest(BaseModel):
    session_id: str
    base_budget: dict[str, float]
    scenarios: Optional[list[SimulateScenario]] = None  # if None, use defaults
    horizon_days: int = 90


class ScenarioResult(BaseModel):
    label: str
    total_budget: float
    revenue: P10P50P90
    roas: P10P50P90
    marginal_roas: Optional[float]


class SimulateResponse(BaseModel):
    horizon_days: int
    results: list[ScenarioResult]


# ── /api/summary ──────────────────────────────────────────────────────────────

class SummaryRequest(BaseModel):
    session_id: str


class SummaryResponse(BaseModel):
    causal_summary: str
    risk_factors: list[str]
    recommendations: list[str]
    confidence: str
    model_used: str


# ── /api/optimize ─────────────────────────────────────────────────────────────

class OptimizeRequest(BaseModel):
    session_id: str
    mode: str = Field(..., description="'minimize_cost' or 'maximize_revenue'")
    horizon_days: int = Field(90, description="Must be 30, 60, or 90")
    target_revenue: Optional[float] = None   # required for minimize_cost
    total_budget: Optional[float] = None     # required for maximize_revenue
    min_spend_fraction: float = Field(0.1, ge=0.0, le=1.0)
    max_spend_fraction: float = Field(3.0, ge=1.0, le=10.0)


class FrontierPoint(BaseModel):
    budget: float
    revenue_p50: float
    roas: float


class OptimizeResponse(BaseModel):
    mode: str
    feasible: bool
    message: str
    optimal_allocation: dict[str, float]
    total_budget: float
    expected_revenue: P10P50P90
    expected_roas: P10P50P90
    vs_current: dict
    efficient_frontier: list[FrontierPoint]


# ── /api/calibration ──────────────────────────────────────────────────────────

class CalibrationRequest(BaseModel):
    session_id: str
    holdout_weeks: int = Field(8, ge=4, le=20)


class CalibrationWeekRow(BaseModel):
    week: str
    actual: float
    p10: float
    p50: float
    p90: float
    hit: bool


class CalibrationChannelResult(BaseModel):
    channel: str
    coverage_pct: float
    mape_pct: float
    weeks: list[CalibrationWeekRow]


class CalibrationResponse(BaseModel):
    holdout_weeks: int
    overall_coverage_pct: float
    overall_mape_pct: float
    hit_count: int
    total_count: int
    channels: list[CalibrationChannelResult]
