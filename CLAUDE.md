# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

RevCast AI — probabilistic revenue forecasting and budget optimization for paid media (Google Ads, Meta Ads, Microsoft Ads). Upload weekly ad-spend/revenue CSVs, get P10/P50/P90 revenue and ROAS forecasts, simulate budget scenarios, run a budget optimizer, and generate an AI causal summary. FastAPI backend + Next.js 14 frontend.

## Commands

### Backend (FastAPI)

The backend depends on `fastapi`, `pandas`, `numpy`, `statsmodels`, `scipy`, `google-genai` (see `backend/requirements.txt`). There is no project-local venv — these packages are expected to already be importable by whichever Python interpreter you run with (this has been developed against an Anaconda Python 3.9 install where they were pre-installed).

```bash
cd backend
GEMINI_API_KEY=<key> python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

- `GEMINI_API_KEY` is required only for `/api/summary` (AI causal summary); other endpoints work without it.
- Health check: `GET /health` → `{"status": "ok"}`.
- No test suite exists in this repo.

### Frontend (Next.js 14)

```bash
cd frontend
npm install
npm run dev      # dev server, default port 3000 — pass -p <port> if 3000 is taken
npm run build
npm run lint
```

- `NEXT_PUBLIC_API_URL` (in `frontend/.env.local`) points the frontend at the backend; defaults to `http://localhost:8001` if unset (`frontend/src/lib/api.ts`).
- Backend CORS (`backend/main.py`) allows any `localhost`/`127.0.0.1` port via regex, so the frontend dev server can run on any port without backend changes.

### Synthetic test data

```bash
python data/generate_synthetic.py
```

Regenerates the 5 CSVs in `data/generated/` (18 months of synthetic Google/Meta/Microsoft ad data + GA4 sessions + Shopify orders) used for local development and demos, since no real dataset is wired in.

## Architecture

### Request flow and session state

The backend has **no database** — everything lives in an in-memory dict keyed by UUID (`backend/state/session.py`). The flow across endpoints is stateful and sequential:

1. `POST /api/ingest` (5 CSV files: google, meta, microsoft, ga4, shopify) → parses + weekly-aggregates each channel, creates a `session_id`, stores `weekly_panels` and `raw_dfs` in the session.
2. `POST /api/validate` — reads checks against the stored session data (non-blocking warnings, never blocks forecasting).
3. `POST /api/forecast` — runs the full pipeline (see below), stores the result back into the session as `last_forecast` / `last_budget_inputs` / `last_horizon_days`. **Required before `/api/simulate`, `/api/summary`, or `/api/optimize`** — they all read `last_forecast` (specifically `channel_models`) out of session state rather than refitting.
4. `POST /api/simulate` and `POST /api/optimize` reuse the fitted `ChannelModel`s from the last forecast to evaluate new budget scenarios without redoing the regression.
5. `POST /api/summary` sends the last forecast's numbers to Gemini for a causal narrative.

Since session state is process-local memory, restarting the backend invalidates all sessions — the frontend would need to re-ingest.

### Forecasting pipeline (`backend/core/`)

`forecast_engine.py:run_forecast()` orchestrates, per channel (google/meta/microsoft):

1. **Seasonality** (`seasonality.py`) — compute monthly revenue indices from weekly history, deseasonalize revenue by dividing out the month's index.
2. **Elasticity model** (`elasticity.py:fit_channel_model()`) — OLS fit of `log(revenue_deseas) = α + β·log(adstock_or_spend) + γ·t_centered + δ·is_holiday + ε`:
   - `β` (elasticity) is the headline number surfaced in the UI.
   - `γ` (time trend) is only kept if `|t-stat| ≥ 1.96`; otherwise zeroed. Trend `t` is mean-centered so forecasting into the future doesn't inherit training-period extrapolation bias.
   - Adstock decay `λ` is selected via leave-last-8-weeks-out CV, but only accepted if it improves RMSE by ≥10% over `λ=0` — otherwise no carryover is modeled. This is deliberately conservative; spurious adstock fits hurt out-of-sample calibration more than they help.
   - `δ` is a Nov 21–Dec 31 holiday dummy (`_is_holiday()`).
3. **Bootstrap** (`bootstrap.py:bootstrap_period_revenue()`) — draws residuals (with replacement) from the OLS fit to build P10/P50/P90 revenue distributions for a forecast horizon. Two corrections matter here:
   - **Heteroscedastic scaling floor of 1.2** (not 1.0): in-sample OLS residuals are narrower than true out-of-sample error because deseasonalizing-by-monthly-average absorbs noise variance into the seasonal index (especially with only ~6 weeks/month of training data). The 1.2 floor was empirically calibrated against an 8-week holdout backtest to hit ~80% empirical coverage; don't remove it without re-running that backtest.
   - The scale only ever **widens** intervals (clamped to `[1.2, 2.0]`), never narrows below the floor.
4. **Sub-segment allocation** — campaign-type revenue shares come from the last 12 weeks of raw data, not a separate regression (too few points per campaign type to fit reliably).
5. **Anomaly detection** — z-scores of in-sample residuals, flagged at `|z| > 2.5`, auto-labeled as holiday spikes if in Nov/Dec.

If you touch the elasticity model or bootstrap, re-run a holdout backtest (hold out the last 8 weeks per channel, refit, check P10–P90 coverage on the held-out actuals) before trusting the change — this is how the current λ-threshold and hetero-floor values were chosen, and small changes here can silently blow up or shrink calibration.

### Budget optimizer (`backend/core/optimizer.py`)

Uses `scipy.optimize.minimize` (SLSQP) against a **fast deterministic point-estimate proxy** (`_point_rev()`), not the full bootstrap — bootstrapping inside an optimizer loop would be too slow. Two modes:
- `minimize_cost`: minimize total spend subject to a target P50 revenue constraint.
- `maximize_revenue`: maximize revenue proxy subject to a total budget constraint.

After the optimizer converges, the winning allocation is run back through the *real* bootstrap (`bootstrap_allocation()`) so the reported P10/P50/P90 stays consistent with what `/api/forecast` would report for the same allocation. The efficient frontier (`compute_efficient_frontier()`) sweeps budget from 0.4×–2.2× current and is calibrated by a `bootstrap_p50 / proxy_revenue` factor so the optimal point visually lands on the frontier curve.

### Frontend state (`frontend/src/context/AppContext.tsx`)

Single React context drives a 4-step wizard (`frontend/src/app/page.tsx`): Upload → Budget → Forecast → Optimize. `AppContext` holds `sessionId`, `forecast`, `simulation`, `summary`, `budget`, `horizon` and exposes the actions that call the typed API wrappers in `frontend/src/lib/api.ts`. The Budget Optimizer panel (`components/optimizer/BudgetOptimizerPanel.tsx`) keeps its own optimizer result in local component state rather than `AppContext` — it's not part of the shared wizard state.

Report export (`frontend/src/lib/export.ts`) builds CSV/PDF client-side from whatever's currently in `AppContext` (forecast + simulation + summary). PDF text must go through `sanitizeForPdf()` before being passed to jsPDF — jsPDF's built-in fonts only support WinAnsi/Latin-1, so unsanitized Unicode (e.g. `σ` in anomaly descriptions) renders as mojibake.

### Frontend analytics components (`frontend/src/components/forecast/`)

Step 3 (Forecast results) renders 11 visualization components. The notable ones beyond the basic summary/breakdown:

- **RevenueWaterfall** — Recharts stacked BarChart with invisible base segments to create a waterfall effect. Shows each channel's P50 contribution to total revenue.
- **ChannelRadarChart** — Recharts RadarChart comparing channels across 5 normalized dimensions (Elasticity, R², ROAS, Revenue Share, Precision). Precision = inverse of (P90-P10)/P50 spread.
- **DiminishingReturnsChart** — Recovers `alpha` from `alpha = log(rev_p50) - beta * log(budget)`, then plots `rev = exp(alpha + beta * log(spend))` across 0.2x–3.0x current spend. Dual Y-axis with revenue (left) and ROAS + marginal ROAS (right). Per-channel tabs.
- **SensitivityTable** — Computes approximate revenue at -20%/-10%/current/+10%/+20% spend using the same recovered alpha+beta. No backend call needed — pure frontend math from the elasticity model.
- **AutoInsights** — Stateless insight engine that analyzes the `ForecastResponse` and generates prioritized, categorized bullet points (opportunity/risk/info/success). Insights include: best elasticity channel, widest uncertainty band, ROAS gaps, model fit warnings, budget concentration risk, diminishing returns advisory, anomaly counts. No AI call — pure deterministic logic.
- **CalibrationTimeMachine** — Calls `POST /api/calibration` which holds out the last N weeks per channel, refits the model on everything before, bootstraps single-week forecasts, and returns per-week hit/miss data. Frontend renders a ComposedChart with P10-P90 band (stacked Area), P50 prediction (Line), and actual revenue dots (Line with custom `HitDot` component: green=hit, red=miss). All chart elements use `isAnimationActive={false}` to prevent Recharts clip-path animation artifacts in screenshots.
- **SeasonalityHeatmap** — Pure HTML table grid (not Recharts) showing monthly revenue indices per channel + blended row. Color-coded from red (low) to green (high) with actionable labels ("Push"/"Pull").
