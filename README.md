# RevCast AI

**Probabilistic Revenue Forecasting & Budget Optimization for Paid Media**

RevCast AI helps marketers forecast e-commerce revenue across Google Ads, Meta Ads, and Microsoft Ads using a log-log elasticity model with residual bootstrap — delivering P10/P50/P90 probabilistic ranges, not single-point guesses.

Upload your ad-channel CSVs, configure budgets, and get calibrated revenue forecasts, budget simulations, AI-powered causal summaries, and interactive analytics — all in a clean 4-step wizard.

![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js_14-000000?style=flat&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=flat&logo=python&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat&logo=tailwindcss&logoColor=white)

---

## Features

### Core Forecasting
- **Probabilistic P10/P50/P90 Forecasts** — Residual bootstrap (1000 draws) produces calibrated uncertainty ranges, not just point estimates
- **Per-Channel Elasticity Models** — Log-log OLS with seasonal deseasonalization, holiday dummies, time trend, and conservative adstock decay
- **83% Calibration Accuracy** — Verified via holdout backtest: 83% of actual revenue lands inside the predicted P10–P90 band

### Budget Intelligence
- **Budget Simulator** — 5 pre-built scenarios (0.5x–2.0x) showing how revenue and ROAS change with spend
- **Budget Optimizer** — SLSQP optimization finds the best channel allocation to maximize revenue or minimize cost, with efficient frontier visualization
- **What-If Sensitivity Analysis** — See exactly how +/-10–20% spend changes affect each channel's revenue

### Visualizations & Analytics
- **Revenue Attribution Waterfall** — How each ad channel contributes to total P50 forecast revenue
- **Channel Comparison Radar** — Spider chart comparing channels across 5 dimensions: elasticity, R², ROAS, revenue share, and precision
- **Diminishing Returns Curve** — Interactive per-channel spend-vs-revenue curve with ROAS and marginal ROAS overlays
- **Seasonality Heatmap** — Monthly revenue indices per channel with spend timing recommendations
- **Calibration Time Machine** — Interactive holdout backtest visualization with per-channel hit/miss dots

### AI & Insights
- **Gemini AI Causal Summary** — One-click AI analysis with risk factors, recommendations, and confidence scoring
- **Auto-Generated Insights** — Pure-math insight engine (no AI call) surfacing opportunities, risks, and model diagnostics
- **Anomaly Detection** — Z-score based flagging of weeks with unusual revenue, with automatic holiday labeling

### Export & Reporting
- **PDF Export** — Full forecast report with charts, channel breakdowns, and AI summary (jsPDF + autotable)
- **CSV Export** — Machine-readable data export for further analysis

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python, FastAPI, pandas, NumPy, statsmodels, SciPy |
| **Frontend** | Next.js 14, React 18, TypeScript, Tailwind CSS, Recharts |
| **AI** | Google Gemini (causal summary) |
| **Export** | jsPDF, jspdf-autotable |

---

## Quick Start

### Prerequisites
- Python 3.9+ with `pip`
- Node.js 18+
- (Optional) Gemini API key for AI summaries

### 1. Clone & Generate Sample Data

```bash
git clone https://github.com/keerthishree20/RevCast-AI.git
cd RevCast-AI
python data/generate_synthetic.py
```

This creates 5 CSVs in `data/generated/` — 18 months of synthetic ad data across Google, Meta, and Microsoft channels.

### 2. Start Backend

```bash
cd backend
pip install -r requirements.txt
GEMINI_API_KEY=<your-key> python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

> `GEMINI_API_KEY` is only needed for the AI summary endpoint. All other features work without it.

Verify: `curl http://localhost:8001/health` → `{"status": "ok"}`

### 3. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000** in your browser.

> If port 3000 is taken, use `npm run dev -- -p 3010`. CORS accepts any localhost port.

### 4. Use the App

1. **Upload** — Drop all 5 CSV files from `data/generated/` and click "Upload & Validate"
2. **Budget** — Adjust per-channel spend and forecast horizon (30/60/90 days), then "Run Forecast"
3. **Forecast** — Explore P10/P50/P90 forecasts, waterfall, radar chart, diminishing returns, sensitivity analysis, seasonality heatmap, auto-insights, and run the calibration backtest
4. **Optimize** — Simulate budget scenarios, run the optimizer, and generate an AI causal summary

---

## Project Structure

```
RevCast-AI/
├── backend/
│   ├── main.py                  # FastAPI app + CORS
│   ├── requirements.txt
│   ├── .env.example
│   ├── api/
│   │   ├── models.py            # Pydantic request/response schemas
│   │   └── routes/
│   │       ├── ingest.py        # POST /api/ingest (CSV upload)
│   │       ├── validate.py      # POST /api/validate
│   │       ├── forecast.py      # POST /api/forecast
│   │       ├── simulate.py      # POST /api/simulate
│   │       ├── optimize.py      # POST /api/optimize
│   │       ├── calibration.py   # POST /api/calibration
│   │       └── summary.py       # POST /api/summary (Gemini AI)
│   ├── core/
│   │   ├── ingest.py            # CSV parsing + weekly aggregation
│   │   ├── validate.py          # Data quality checks
│   │   ├── seasonality.py       # Monthly index computation
│   │   ├── elasticity.py        # Log-log OLS per channel
│   │   ├── bootstrap.py         # Residual bootstrap → P10/P50/P90
│   │   ├── forecast_engine.py   # Pipeline orchestrator
│   │   ├── simulate.py          # Budget scenario sweeps
│   │   ├── optimizer.py         # SLSQP budget optimization
│   │   ├── calibration.py       # Holdout backtest engine
│   │   └── llm_summary.py       # Gemini integration
│   └── state/
│       └── session.py           # In-memory session store
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── page.tsx         # 4-step wizard shell
│       │   └── globals.css
│       ├── components/
│       │   ├── upload/          # FileUploadZone, ValidationStatus
│       │   ├── budget/          # BudgetInputPanel, HorizonSelector
│       │   ├── forecast/        # 11 visualization components
│       │   ├── simulate/        # ScenarioSlider, ScenarioComparisonChart
│       │   ├── optimizer/       # BudgetOptimizerPanel
│       │   ├── summary/         # CausalSummaryPanel
│       │   └── export/          # ExportReportButton
│       ├── context/
│       │   └── AppContext.tsx    # Global state management
│       └── lib/
│           ├── api.ts           # Typed API wrappers
│           ├── types.ts         # Shared TypeScript interfaces
│           └── export.ts        # PDF/CSV generation
└── data/
    └── generate_synthetic.py    # Synthetic data generator
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/api/ingest` | Upload 5 CSVs (multipart/form-data) |
| `POST` | `/api/validate` | Run data quality checks |
| `POST` | `/api/forecast` | Run forecast pipeline (P10/P50/P90) |
| `POST` | `/api/simulate` | Budget scenario simulation |
| `POST` | `/api/optimize` | Budget allocation optimizer |
| `POST` | `/api/calibration` | Holdout backtest |
| `POST` | `/api/summary` | Gemini AI causal summary |

---

## How the Forecasting Works

```
CSV Upload → Weekly Aggregation → Seasonal Deseasonalization
    → Log-Log OLS (per channel)
        → Adstock CV (conservative λ selection)
        → Holiday dummy + time trend
    → Residual Bootstrap (1000 draws)
        → Heteroscedastic scaling (floor=1.2)
    → P10 / P50 / P90 Revenue & ROAS
```

**Key design decisions:**
- **Heteroscedastic floor of 1.2**: In-sample residuals are 2.3x narrower than true noise because monthly seasonal averaging absorbs variance. Floor calibrated via 8-week holdout to hit ~80% coverage.
- **Conservative adstock**: Lambda only accepted if it improves RMSE by ≥10% — spurious adstock fits hurt OOS calibration.
- **Time trend gating**: Trend coefficient zeroed unless `|t-stat| ≥ 1.96` to prevent extrapolation drift.

---

## CSV Format

The app expects 5 CSV files:

**Google/Meta/Microsoft Ads:**
```
date, campaign, campaign_type, spend, impressions, clicks, conversions, revenue
```

**GA4 Sessions:**
```
date, source, medium, sessions, engaged_sessions, conversions, revenue
```

**Shopify Orders:**
```
date, channel, orders, aov, revenue
```

Use `python data/generate_synthetic.py` to create sample files matching these schemas.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Only for AI summary | Google Gemini API key |
| `NEXT_PUBLIC_API_URL` | No | Backend URL (defaults to `http://localhost:8001`) |

---

## Built With

Developed by **KeerthiShree TS** for the AIgnition 3.0 Hackathon.

---

## License

This project is for educational and demonstration purposes.
