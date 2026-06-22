import type {
  IngestResponse,
  ValidateResponse,
  ForecastResponse,
  SimulateResponse,
  SummaryResponse,
  OptimizeResponse,
  CalibrationResponse,
  BudgetInputs,
  HorizonDays,
} from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail));
  }
  return res.json();
}

export async function apiIngest(files: {
  google: File;
  meta: File;
  microsoft: File;
  ga4: File;
  shopify: File;
}): Promise<IngestResponse> {
  const form = new FormData();
  form.append("google", files.google);
  form.append("meta", files.meta);
  form.append("microsoft", files.microsoft);
  form.append("ga4", files.ga4);
  form.append("shopify", files.shopify);

  const res = await fetch(`${BASE}/api/ingest`, { method: "POST", body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail));
  }
  return res.json();
}

export function apiValidate(session_id: string): Promise<ValidateResponse> {
  return post("/api/validate", { session_id });
}

export function apiForecast(
  session_id: string,
  budget_inputs: BudgetInputs,
  horizon_days: HorizonDays,
): Promise<ForecastResponse> {
  return post("/api/forecast", { session_id, budget_inputs, horizon_days, n_bootstrap: 1000 });
}

export function apiSimulate(
  session_id: string,
  base_budget: BudgetInputs,
  horizon_days: HorizonDays,
): Promise<SimulateResponse> {
  return post("/api/simulate", { session_id, base_budget, horizon_days });
}

export function apiSummary(session_id: string): Promise<SummaryResponse> {
  return post("/api/summary", { session_id });
}

export function apiCalibration(
  session_id: string,
  holdout_weeks = 8,
): Promise<CalibrationResponse> {
  return post("/api/calibration", { session_id, holdout_weeks });
}

export function apiOptimize(
  session_id: string,
  mode: "minimize_cost" | "maximize_revenue",
  horizon_days: HorizonDays,
  params: { target_revenue?: number; total_budget?: number; min_spend_fraction?: number; max_spend_fraction?: number },
): Promise<OptimizeResponse> {
  return post("/api/optimize", { session_id, mode, horizon_days, ...params });
}
