export interface P10P50P90 {
  p10: number;
  p50: number;
  p90: number;
}

export interface ChannelTotals {
  spend: number;
  revenue: number;
  roas: number;
  weeks: number;
}

export interface IngestSummary {
  date_range_start: string;
  date_range_end: string;
  weeks_available: number;
  overall_spend: number;
  overall_revenue: number;
  overall_roas: number;
  channel_totals: Record<string, ChannelTotals>;
}

export interface IngestResponse {
  session_id: string;
  summary: IngestSummary;
}

export interface ValidationCheck {
  name: string;
  passed: boolean;
  message: string;
  detail?: unknown;
}

export interface ValidateResponse {
  passed: boolean;
  checks: ValidationCheck[];
}

export interface CampaignTypeRow {
  campaign_type: string;
  revenue_share: number;
  revenue: P10P50P90;
}

export interface ChannelForecast {
  channel: string;
  budget: number;
  revenue: P10P50P90;
  roas: P10P50P90;
  elasticity: number;
  model_r2: number;
  campaign_type_breakdown: CampaignTypeRow[];
}

export interface Anomaly {
  channel: string;
  week: string;
  z_score: number;
  description: string;
}

export interface ForecastResponse {
  horizon_days: number;
  total_budget: number;
  forecast: {
    revenue: P10P50P90;
    roas: P10P50P90;
  };
  channel_breakdown: ChannelForecast[];
  campaign_type_breakdown: unknown[];
  seasonality_indices: Record<string, Record<string, number>>;
  anomalies: Anomaly[];
}

export interface ScenarioResult {
  label: string;
  total_budget: number;
  revenue: P10P50P90;
  roas: P10P50P90;
  marginal_roas: number | null;
}

export interface SimulateResponse {
  horizon_days: number;
  results: ScenarioResult[];
}

export interface SummaryResponse {
  causal_summary: string;
  risk_factors: string[];
  recommendations: string[];
  confidence: "low" | "medium" | "high";
  model_used: string;
}

export type BudgetInputs = { google: number; meta: number; microsoft: number };
export type HorizonDays = 30 | 60 | 90;

export interface FrontierPoint {
  budget: number;
  revenue_p50: number;
  roas: number;
}

export interface OptimizeResponse {
  mode: string;
  feasible: boolean;
  message: string;
  optimal_allocation: { google: number; meta: number; microsoft: number };
  total_budget: number;
  expected_revenue: P10P50P90;
  expected_roas: P10P50P90;
  vs_current: {
    budget_delta: number;
    budget_delta_pct: number;
    revenue_p50_delta: number;
    revenue_p50_delta_pct: number;
  };
  efficient_frontier: FrontierPoint[];
}

export interface CalibrationWeekRow {
  week: string;
  actual: number;
  p10: number;
  p50: number;
  p90: number;
  hit: boolean;
}

export interface CalibrationChannelResult {
  channel: string;
  coverage_pct: number;
  mape_pct: number;
  weeks: CalibrationWeekRow[];
}

export interface CalibrationResponse {
  holdout_weeks: number;
  overall_coverage_pct: number;
  overall_mape_pct: number;
  hit_count: number;
  total_count: number;
  channels: CalibrationChannelResult[];
}
