# RevCast AI — Complete Guide (Zero to Advanced)

> **Live Demo:** [https://revcast-frontend.onrender.com](https://revcast-frontend.onrender.com) | **GitHub:** [https://github.com/keerthishree20/RevCast-AI](https://github.com/keerthishree20/RevCast-AI)

A comprehensive guide to understanding every concept, feature, and technical decision in RevCast AI. Written so anyone — from a business student to a senior data scientist — can follow along.

---

## Table of Contents

1. [What is RevCast AI?](#1-what-is-revcast-ai)
2. [Who is This For?](#2-who-is-this-for)
3. [Core Concepts (No Code)](#3-core-concepts-no-code)
4. [Setting Up From Scratch](#4-setting-up-from-scratch)
5. [Using the App — Step by Step](#5-using-the-app--step-by-step)
6. [Understanding the Data](#6-understanding-the-data)
7. [How the Forecasting Engine Works](#7-how-the-forecasting-engine-works)
8. [Understanding Every Feature](#8-understanding-every-feature)
9. [Architecture Deep Dive](#9-architecture-deep-dive)
10. [Advanced Topics](#10-advanced-topics)
11. [Troubleshooting](#11-troubleshooting)
12. [Deployment](#12-deployment)
13. [Glossary](#13-glossary)

---

## 1. What is RevCast AI?

RevCast AI is a **revenue forecasting tool for paid advertising**. If you're spending money on Google Ads, Meta (Facebook/Instagram) Ads, and Microsoft Ads to sell products online, RevCast AI answers the most important questions:

- **"If I spend $X next quarter, how much revenue will I make?"** — with honest uncertainty ranges, not a single guess
- **"Which channel gives me the best bang for my buck?"** — elasticity analysis
- **"Should I spend more or less?"** — diminishing returns visualization
- **"What's the optimal way to split my budget?"** — mathematical optimization
- **"Can I trust these predictions?"** — calibration backtest with proof

### Why Not Just Use a Spreadsheet?

A spreadsheet gives you one number: "you'll make $500K." But reality doesn't work that way. RevCast AI gives you three numbers:

| Scenario | Revenue | Meaning |
|----------|---------|---------|
| **P10** (Conservative) | $450K | 90% chance you'll beat this |
| **P50** (Expected) | $500K | Equally likely to be above or below |
| **P90** (Optimistic) | $560K | Only 10% chance you'll beat this |

This is called **probabilistic forecasting**, and it's how real financial planning works. A single number creates false confidence; a range creates honest planning.

---

## 2. Who is This For?

| Role | What You'll Get |
|------|----------------|
| **Marketing Manager** | Revenue forecasts for budget planning, channel allocation recommendations |
| **Data Analyst** | Elasticity models, statistical diagnostics, calibration metrics |
| **Business Student** | Learn how ad spend translates to revenue using real statistical methods |
| **Data Scientist** | Full pipeline: OLS, bootstrap, optimization, backtesting |
| **Hackathon Judge** | A working prototype with 15+ features and verified calibration |

---

## 3. Core Concepts (No Code)

Before touching the app, let's understand the ideas behind it.

### 3.1 Ad Spend and Revenue

When you run online ads, you **spend money** (on clicks, impressions) and **earn revenue** (from purchases). The ratio is called **ROAS (Return On Ad Spend)**:

```
ROAS = Revenue / Spend

Example: You spend $10,000 on Google Ads and earn $35,000 in sales.
ROAS = $35,000 / $10,000 = 3.5x
```

A ROAS of 3.5x means every $1 you spend generates $3.50 in revenue.

### 3.2 Elasticity — The Heart of the Model

**Elasticity** answers: "If I increase spend by 1%, how much does revenue increase?"

```
Elasticity = 0.65 means:
  +1% spend → +0.65% revenue
  +10% spend → +6.5% revenue
  +100% spend → +65% revenue (NOT +100%!)
```

This is why we call it **diminishing returns**. When elasticity is less than 1.0 (which it almost always is for ads), doubling your spend does NOT double your revenue. You get more, but not proportionally more.

### 3.3 Why Log-Log?

The relationship between ad spend and revenue follows a **power law**, not a straight line. In math:

```
Revenue = A × Spend^β

Where:
  A = base revenue factor (depends on brand, product, market)
  β = elasticity (typically 0.5 – 0.85 for paid media)
```

Taking the logarithm of both sides makes this a straight line:

```
log(Revenue) = log(A) + β × log(Spend)
      ↓              ↓         ↓
      y    =    intercept + slope × x
```

Now we can use **ordinary least squares (OLS) regression** — the simplest, most well-understood statistical method — to find the best values of A and β from historical data.

### 3.4 Seasonality

Revenue isn't constant throughout the year. November and December (Black Friday, Christmas) see massive spikes. January is usually slow. RevCast AI computes a **monthly seasonality index** for each channel:

```
Index > 1.0 → Above-average revenue month (e.g., December: 1.65)
Index = 1.0 → Average month
Index < 1.0 → Below-average month (e.g., January: 0.82)
```

The model **removes seasonality before fitting** (so the elasticity model sees the "true" spend-revenue relationship), then **adds it back** when forecasting (so forecasts for December reflect the holiday boost).

### 3.5 Bootstrap — Making Predictions Honest

The OLS regression gives us a point estimate: "Revenue will be $500K." But how confident are we? That's where the **bootstrap** comes in.

Think of it like this:

1. The model fits a line through historical data. But the data points don't sit exactly on the line — they scatter around it. These scatters are called **residuals**.
2. To forecast, we take our best-guess revenue and randomly add past residuals back in. We do this **1,000 times**.
3. From those 1,000 simulated outcomes, we take the 10th percentile (P10), 50th percentile (P50), and 90th percentile (P90).

```
1,000 simulated revenue outcomes, sorted:
  Position 100  → P10 (conservative)
  Position 500  → P50 (expected)
  Position 900  → P90 (optimistic)
```

This gives us an honest uncertainty range. If the model is well-calibrated, about 80% of actual outcomes should fall between P10 and P90.

### 3.6 Calibration — Can We Trust It?

Anyone can build a model. The question is: **does it actually work?**

RevCast AI answers this with a **holdout backtest**:

1. Take the last 8 weeks of real data and hide them from the model
2. Fit the model on everything before those 8 weeks
3. Forecast each of the 8 weeks one at a time
4. Check: did the actual revenue fall inside the predicted P10–P90 band?

If 80% of actuals land inside the band, the model is **well-calibrated** (our target). RevCast AI achieves **83.3%** — meaning the uncertainty ranges are honest.

---

## 4. Setting Up From Scratch

### What You Need

| Tool | Version | Why |
|------|---------|-----|
| **Python** | 3.9+ | Backend language |
| **Node.js** | 18+ | Frontend runtime |
| **Git** | Any | Clone the repo |
| **Browser** | Chrome/Firefox/Edge | Use the app |
| **Gemini API Key** | Optional | Only for AI summaries |

### Step-by-Step Setup

#### 1. Clone the Repository

```bash
git clone https://github.com/keerthishree20/RevCast-AI.git
cd RevCast-AI
```

#### 2. Generate Sample Data

The app uses 5 CSV files. Since no real dataset is included, generate synthetic data that mimics real ad platform exports:

```bash
python data/generate_synthetic.py
```

This creates 5 files in `data/generated/`:
- `google_ads.csv` — 18 months of Google Ads data
- `meta_ads.csv` — 18 months of Meta Ads data
- `microsoft_ads.csv` — 18 months of Microsoft Ads data
- `ga4_sessions.csv` — Google Analytics session data
- `shopify_orders.csv` — E-commerce order data

#### 3. Start the Backend

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

Verify it's running:
```bash
curl http://localhost:8001/health
# Should return: {"status": "ok"}
```

**Note:** The `--reload` flag is important — it auto-restarts the server when you edit code. Without it, changes don't take effect until you manually restart.

**Note:** If you want AI summaries, set the Gemini API key:
```bash
GEMINI_API_KEY=your-key-here python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

#### 4. Start the Frontend

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000** in your browser.

> If port 3000 is taken, use `npm run dev -- -p 3010`. The backend accepts any localhost port.

---

## 5. Using the App — Step by Step

The app is a **4-step wizard**. You must complete each step in order.

### Step 1: Upload Data

![Upload Page](docs/screenshots/01_upload.png)

1. Click the upload zone (or drag-and-drop)
2. Select all 5 CSV files at once
3. The app auto-detects which file is which by filename (e.g., a file containing "google" maps to Google Ads)
4. All 5 slots must show green checkmarks before you can proceed
5. Click **"Upload & Validate"**

**What happens behind the scenes:**
- CSVs are parsed and aggregated into weekly data
- 5 validation checks run (date coverage, non-negativity, ROAS sanity, revenue reconciliation, campaign consistency)
- Validation is non-blocking — warnings are shown but don't prevent forecasting

### Step 2: Configure Budget

![Budget Config](docs/screenshots/02_budget.png)

1. **Per-channel budgets** are pre-filled based on your historical average spend (last 12 weeks, projected to 13 weeks). Adjust as needed.
2. **Forecast horizon** — choose 30, 60, or 90 days
3. Click **"Run Forecast"**

**What happens behind the scenes:**
- The full forecasting pipeline runs (seasonality → deseasonalization → OLS fit → bootstrap → sub-segment allocation → anomaly detection)
- Takes 2–5 seconds depending on data size
- Results are stored in the session for use by simulation and optimization

### Step 3: Explore Forecast Results

This is the richest step — 11 visualization components. Scroll down to see all of them.

![Forecast Summary](docs/screenshots/04_forecast_summary.png)

**Forecast Summary Card** — Top-level P10/P50/P90 revenue and ROAS ranges with visual confidence bands.

![Revenue Waterfall](docs/screenshots/06_revenue_waterfall.png)

**Revenue Waterfall** — Stacked contribution of each channel to total revenue.

![Channel Radar](docs/screenshots/07_channel_radar.png)

**Channel Radar** — Multi-dimensional comparison of all channels.

![Diminishing Returns](docs/screenshots/08_diminishing_returns.png)

**Diminishing Returns Curve** — See exactly where your spend hits the point of diminishing returns.

![Sensitivity Table](docs/screenshots/09_sensitivity_table.png)

**Sensitivity Analysis** — What happens if you change spend by +/-10–20%.

![Seasonality Heatmap](docs/screenshots/10_seasonality_heatmap.png)

**Seasonality Heatmap** — When to push vs pull back spend.

![Auto Insights](docs/screenshots/11_auto_insights.png)

**Auto-Insights** — Smart, data-driven recommendations generated instantly (no AI call).

![Calibration](docs/screenshots/12_calibration.png)

**Calibration Time Machine** — Click "Run Calibration Check" to prove the model works.

At the bottom of Step 3, click **"Simulate Budget Scenarios"** to proceed.

### Step 4: Simulate & Optimize

![Scenario Chart](docs/screenshots/14_scenario_chart.png)

**Budget Simulation** — 5 scenarios from 0.5x to 2.0x current budget, showing the revenue-ROAS tradeoff.

![Optimizer](docs/screenshots/15_optimizer.png)

**Budget Optimizer** — Two modes:
- **Maximize Revenue** — "I have $X to spend, how should I split it?"
- **Minimize Cost** — "I want $Y revenue, what's the cheapest way to get there?"

**AI Summary** — Click "Generate AI Summary" for a Gemini-powered causal analysis (requires API key).

**Export** — Click "Export Report" to download PDF or CSV.

---

## 6. Understanding the Data

### The 5 CSV Files

RevCast AI needs 5 data sources to build a complete picture:

#### 1. Google Ads (`google_ads.csv`)
```csv
date,campaign,campaign_type,spend,impressions,clicks,conversions,revenue
2025-01-06,Brand Search,Search,1245.50,45230,2034,65,5534.25
```

- **campaign_type**: Search, Shopping, Display, YouTube
- Each row is one campaign on one day
- Revenue = actual sales attributed to this ad

#### 2. Meta Ads (`meta_ads.csv`)
Same format. Campaign types: Prospecting, Retargeting, Lookalike.

#### 3. Microsoft Ads (`microsoft_ads.csv`)
Same format. Campaign types: Search, Shopping.

#### 4. GA4 Sessions (`ga4_sessions.csv`)
```csv
date,source,medium,sessions,engaged_sessions,conversions,revenue
2025-01-06,google,cpc,1250,980,32,2720.00
```
Google Analytics data — used for validation (cross-referencing ad revenue with site analytics).

#### 5. Shopify Orders (`shopify_orders.csv`)
```csv
date,channel,orders,aov,revenue
2025-01-06,google,28,85.50,2394.00
```
E-commerce order data — used for revenue reconciliation (does ad-reported revenue match actual orders?).

### How Data Gets Processed

```
Daily CSV rows
    → Group by ISO week (Monday start)
    → Sum spend, revenue, conversions per week
    → Drop zero-spend weeks
    → Result: ~78 weekly data points per channel (18 months)
```

The model works on **weekly** data because:
- Daily data is too noisy (one bad day skews everything)
- Monthly data gives too few data points (~18 months = 18 points — not enough for reliable regression)
- Weekly is the sweet spot: enough smoothing, enough data points

---

## 7. How the Forecasting Engine Works

This is the technical heart of RevCast AI. We'll go from simple to complex.

### 7.1 The Pipeline

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Raw CSVs   │ ──► │  Weekly Agg  │ ──► │   Seasonality   │
│  (5 files)  │     │  (per channel)│     │  Index (12 mo)  │
└─────────────┘     └──────────────┘     └────────┬────────┘
                                                   │
                                          Deseasonalize
                                                   │
                                                   ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  P10/P50/P90│ ◄── │  Bootstrap   │ ◄── │   OLS Fit       │
│  Forecast   │     │  (1000 draws)│     │  log-log model  │
└─────────────┘     └──────────────┘     └─────────────────┘
```

### 7.2 Step 1: Seasonality Removal

**Why:** If we fit the model directly on raw revenue, November/December data (Black Friday, Christmas) would distort the spend-revenue relationship. The model might think "more spend = more revenue" when really it was just the holiday effect.

**How:**

1. Compute the average revenue for each month across all available years
2. Normalize so the average of all 12 monthly values = 1.0
3. Divide each week's revenue by its month's index

```
Example:
  December index = 1.65 (65% above average)
  Raw revenue in a December week: $82,500
  Deseasonalized revenue: $82,500 / 1.65 = $50,000

Now the model sees the "true" spend-revenue relationship
without the holiday distortion.
```

### 7.3 Step 2: Log-Log OLS Regression

The model fitted per channel:

```
log(revenue_deseas) = α + β·log(spend) + γ·t + δ·holiday + ε
```

| Parameter | Name | What it captures |
|-----------|------|-----------------|
| **α** (alpha) | Intercept | Base revenue level |
| **β** (beta) | Elasticity | How responsive revenue is to spend changes |
| **γ** (gamma) | Time trend | Is revenue growing or shrinking over time? |
| **δ** (delta) | Holiday premium | Extra revenue during Nov 21–Dec 31 |
| **ε** (epsilon) | Residual | Unexplained noise |

**Important safeguards:**

1. **Time trend is gated:** γ is only kept if its t-statistic exceeds 1.96 (95% confidence). Otherwise it's set to 0. Why? A weak trend that looks like growth in-sample becomes dangerous extrapolation when forecasting into the future.

2. **Adstock is conservative:** Some ad spend has a "carryover" effect — a dollar spent this week still generates some revenue next week. This is modeled as:
   ```
   adstock[t] = spend[t] + λ × adstock[t-1]
   ```
   Where λ (lambda) is the decay rate. But λ is only accepted if it improves out-of-sample RMSE by ≥10%. Otherwise λ=0 (no carryover). Why? On noisy data, the optimizer will happily find a λ that fits training data but makes forecasts worse.

### 7.4 Step 3: Residual Bootstrap

After OLS fitting, we have:
- A formula to predict revenue from spend
- A set of **residuals** (how much each historical week deviated from the prediction)

To forecast:

```python
for each of 1,000 simulations:
    for each week in the forecast horizon:
        # Start with the model's prediction
        log_rev = α + β × log(spend_per_week) + γ × t + δ × holiday

        # Add a random historical residual
        random_residual = randomly_pick_one(historical_residuals)
        log_rev += random_residual

        # Convert back from log-space
        weekly_revenue = exp(log_rev)

    total_period_revenue = sum of all weekly revenues

# After 1,000 simulations:
P10 = 10th percentile of all total_period_revenues
P50 = 50th percentile (median)
P90 = 90th percentile
```

### 7.5 The Heteroscedastic Floor (Why 1.2?)

This is the most subtle technical decision in the entire app.

**The problem:** In-sample OLS residuals are *too narrow*. When we deseasonalize by dividing by monthly averages, the averaging process absorbs some of the true variance. The residuals look small, so the bootstrap draws small random errors, producing confidence intervals that are too tight.

**Measured:** In-sample residual std = 0.128, but true noise std in the data-generating process = 0.30. That's a 2.3x gap.

**The fix:** Scale up residuals by a **heteroscedastic factor** before bootstrapping, with a floor of 1.2:

```python
hetero_scale = max(hetero_scale, 1.2)  # Never below 1.2
hetero_scale = min(hetero_scale, 2.0)  # Cap at 2.0
```

**How 1.2 was chosen:** We ran a holdout backtest with different floor values:

| Floor | Coverage (target: ~80%) |
|-------|------------------------|
| 1.0 | 75% — intervals too tight |
| 1.1 | 79% — close but under |
| **1.2** | **83%** — right on target |
| 1.3 | 88% — intervals too wide |
| 1.5 | 92% — way too conservative |

1.2 hits the sweet spot. This is empirical calibration, not theory.

### 7.6 Step 4: Sub-Segment Allocation

For campaign-type breakdowns (e.g., Google Search vs Google Shopping):

```
Channel P50 revenue = $580K
Google Search revenue share (last 12 weeks) = 52%
Google Search P50 forecast = $580K × 0.52 = $301.6K
```

We DON'T fit separate regressions per campaign type because:
- Splitting the data leaves too few points per segment (~78 weeks ÷ 4 types = ~20 per type)
- With 20 data points, regression results are unreliable
- Revenue share from recent history is a simpler, more robust estimator

### 7.7 Step 5: Anomaly Detection

For each historical week:

```python
residual = actual_log_revenue - predicted_log_revenue
z_score = residual / std(all_residuals)

if abs(z_score) > 2.5:
    flag as anomaly
    if month is November or December:
        label as "holiday spike"
```

---

## 8. Understanding Every Feature

### 8.1 Forecast Summary Card
**What:** The headline numbers — total P10/P50/P90 revenue and ROAS for the chosen horizon.

**How to read it:** P50 is your "best guess." The P10–P90 range is the 80% confidence interval. If P10 and P90 are close together, the forecast is precise. If they're far apart, there's high uncertainty.

### 8.2 Channel Breakdown Table
**What:** Per-channel revenue, ROAS, elasticity (β), and model fit (R²). Expandable to show campaign types.

**Key metrics:**
- **β (elasticity)**: Higher = more responsive to spend changes. Google at 0.65 means 10% more spend → 6.5% more revenue.
- **R²**: How well the model fits. 0.85 = explains 85% of revenue variation. Below 0.70 = be cautious.

### 8.3 Revenue Attribution Waterfall
**What:** Visual breakdown of how total revenue is composed: Google contributes $580K, Meta adds $227K, Microsoft adds $182K = $989K total.

**Why it matters:** Instantly see which channel drives the most revenue. The biggest bar isn't necessarily the best investment — check the ROAS and elasticity too.

### 8.4 Channel Comparison Radar
**What:** Spider chart comparing all 3 channels across 5 dimensions.

**Dimensions:**
- **Elasticity** — How responsive to spend changes
- **Model Fit (R²)** — How predictable the channel is
- **ROAS** — Revenue per dollar spent
- **Revenue Share** — What % of total revenue it generates
- **Precision** — How narrow the forecast uncertainty is

**How to read it:** A channel with a large, balanced polygon is strong across the board. A lopsided shape suggests it excels in some areas but has weaknesses in others.

### 8.5 Diminishing Returns Curve
**What:** For each channel, shows how revenue increases as you increase spend — and where the curve starts to flatten.

**Key lines:**
- **Blue (Revenue)** — The actual revenue curve. Notice it bends — that's diminishing returns.
- **Orange dashed (ROAS)** — Revenue per dollar. Always decreasing as you spend more.
- **Red dashed (Marginal ROAS)** — Revenue from the *last* dollar spent. When this drops below 1.0, you're losing money on incremental spend.

**The insight:** Your current spend is marked with a blue dot. If the curve is still steep at that point, there's room to grow. If it's flat, you're near the efficiency ceiling.

### 8.6 What-If Sensitivity Analysis
**What:** A table showing what happens if you change ALL channel budgets by -20%, -10%, +10%, or +20%.

**Key insight:** Notice the asymmetry — a +10% increase might give +6.2% revenue, but a -10% cut only loses -6.3%. This is because the elasticity curve bends. The takeaway: cuts hurt slightly more than increases help.

### 8.7 Seasonality Heatmap
**What:** A color-coded grid showing revenue indices for each month and channel.

**How to read it:**
- **Dark green** (1.40+) — Push spend hard, demand is peaking
- **Light green** (1.00–1.20) — Slightly above average, good time to spend
- **Gray** (0.95–1.00) — Average
- **Amber/Red** (below 0.90) — Pull back spend, demand is low

**The "Push" and "Pull" labels** tell you when to increase or decrease spend.

### 8.8 Auto-Generated Insights
**What:** Smart, prioritized recommendations computed purely from the forecast data (no AI/LLM call).

**Categories:**
- **Green (Opportunity)** — "Google has the highest elasticity — consider shifting budget here"
- **Amber (Risk)** — "Meta shows the widest uncertainty band"
- **Blue (Info)** — "All channels are in diminishing returns territory"
- **Green (Success)** — "Model fit is excellent (R² > 0.85)"

These insights come from deterministic rules analyzing the forecast response — they're instant and reproducible.

### 8.9 Calibration Time Machine
**What:** Interactive proof that the model works. Holds out the last 8 weeks per channel, refits on everything before, and checks predictions.

**How to read the chart:**
- **Blue shaded area** — Predicted P10–P90 range
- **Blue line** — Predicted P50 (median)
- **Green dots** — Actual revenue landed INSIDE the band (hit!)
- **Red dots** — Actual revenue fell OUTSIDE the band (miss)

**Target:** ~80% of dots should be green. RevCast AI achieves 83.3% (20 out of 24 weeks).

### 8.10 Budget Scenario Simulation
**What:** 5 pre-built scenarios comparing what happens at 0.5x, 0.75x, 1.0x, 1.5x, and 2.0x your current budget.

**Key insight:** Watch how the P10–P90 band widens as budget increases. Higher spend = more revenue but also more uncertainty. The ROAS line (dashed, right axis) always decreases — that's diminishing returns in action.

### 8.11 Budget Optimizer
**What:** Mathematical optimization that finds the best channel allocation.

**Two modes:**
1. **Maximize Revenue:** "I have $328K — split it optimally across Google/Meta/Microsoft to get the most revenue"
2. **Minimize Cost:** "I want $1.2M revenue — what's the cheapest way to achieve it?"

**The Efficient Frontier chart** shows the maximum achievable revenue at each budget level. The curve bends because of diminishing returns. Your current position and the optimal position are marked.

### 8.12 AI Causal Summary
**What:** A Gemini-powered narrative analysis of the forecast, with risk factors and recommendations.

**What it receives:** Historical KPIs, channel elasticities, R² values, P10/P50/P90 forecasts, simulation scenarios, and anomalies.

**What it returns:** A causal narrative explaining *why* the forecast looks the way it does, specific risk factors, actionable recommendations, and a confidence rating.

### 8.13 Export (PDF/CSV)
**What:** Download a report of everything currently displayed.

**PDF includes:** Forecast summary, channel breakdowns, simulation results, AI summary. Uses jsPDF with a special `sanitizeForPdf()` function that replaces Unicode characters (like σ) with ASCII equivalents — jsPDF's built-in fonts only support Latin-1.

---

## 9. Architecture Deep Dive

### 9.1 Overview

```
┌─────────────────┐     HTTP/JSON      ┌──────────────────┐
│  Next.js 14     │ ◄───────────────► │  FastAPI          │
│  (React 18)     │     Port 3000      │  (Python)         │
│  TypeScript     │                    │  Port 8001        │
│  Tailwind CSS   │                    │  SQLite (users)   │
│  Recharts       │                    │  In-memory (data) │
└─────────────────┘                    └──────────────────┘
```

### 9.2 Backend — Hybrid Storage

The backend uses two storage layers:
- **SQLite database** (`state/database.py`) — persistent storage for user accounts (survives restarts)
- **In-memory sessions** (`state/session.py`) — fast storage for uploaded data and fitted models (lost on restart)

This hybrid approach keeps the forecasting pipeline fast (no database I/O for large DataFrames) while persisting user accounts properly.

### 9.2.1 Authentication Flow

```
Register → PBKDF2 hash password → Store in SQLite → Return JWT token
Login    → Verify password hash → Return JWT token
Frontend → Store token in localStorage → Send with future requests
```

JWT tokens use HMAC-SHA256 signing with a configurable secret key and 24-hour expiry.

### 9.3 Session State Flow

```
POST /api/ingest     → Creates session, stores parsed weekly data
POST /api/validate   → Reads session data, returns check results
POST /api/forecast   → Runs pipeline, stores fitted models in session
POST /api/simulate   → Reuses fitted models (no re-fitting)
POST /api/optimize   → Reuses fitted models (no re-fitting)
POST /api/calibration→ Reads raw data, fits separate holdout models
POST /api/summary    → Reads forecast results, calls Gemini API
```

**Critical:** `/api/forecast` must be called before `/api/simulate`, `/api/optimize`, or `/api/summary`. They all read the fitted channel models from the session.

### 9.4 Frontend — Single React Context

All shared state lives in `AppContext.tsx`:

```
AppContext
├── step (1-4, current wizard step)
├── sessionId (UUID from backend)
├── ingest (upload response)
├── validation (check results)
├── forecast (P10/P50/P90 + channel breakdowns)
├── simulation (5 scenario results)
├── summary (AI analysis)
├── budget ({google, meta, microsoft})
├── horizon (30 | 60 | 90)
├── loading (boolean)
└── error (string | null)
```

Components read from context and render visualizations. API calls are wrapped in typed functions in `api.ts`.

### 9.5 CORS Configuration

The backend allows any `localhost` port via regex:

```python
allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?"
```

This means you can run the frontend on any port without backend changes.

---

## 10. Advanced Topics

### 10.1 Why OLS and Not Machine Learning?

RevCast AI deliberately uses **Ordinary Least Squares (OLS)** instead of random forests, neural networks, or other ML methods. Here's why:

1. **Interpretability:** OLS gives you a single equation: `Revenue = A × Spend^β`. You can explain to a CMO what β=0.65 means. Try explaining a random forest's feature importance to a non-technical stakeholder.

2. **Small data:** With ~78 weekly data points per channel, complex ML models overfit. OLS has 4 parameters. A random forest with 100 trees has thousands of effective parameters — it will memorize the training data.

3. **Confidence intervals:** Bootstrap + OLS residuals gives honest uncertainty ranges. ML models typically only produce point estimates (though there are Bayesian approaches).

4. **Debuggability:** When the forecast looks wrong, you can inspect α, β, γ, δ and understand exactly why. With a black-box model, you can only shrug.

### 10.2 Why Not Robust Regression (RLM)?

Early versions used Huber-weighted robust regression (RLM) to downweight outliers. It was removed because:

- Holiday weeks (Black Friday, Christmas) are **genuine in-distribution data**, not outliers
- RLM downweighted them, effectively ignoring the holiday effect
- This made the holiday dummy (δ) unreliable
- Coverage dropped because the model couldn't predict holiday periods correctly

OLS with an explicit holiday dummy handles this better.

### 10.3 The Optimizer's Two-Step Approach

The budget optimizer doesn't bootstrap inside its optimization loop (that would be too slow). Instead:

1. **Fast proxy:** Optimize using a deterministic point-estimate formula
2. **Full bootstrap:** After finding the optimal allocation, run the real bootstrap to get honest P10/P50/P90

This is a common pattern in computational finance: use a fast approximation for search, then validate the winner with the expensive method.

### 10.4 Adstock Cross-Validation

Adstock decay (λ) is selected by:

1. Hold out the last 8 weeks of data
2. Fit with λ = 0.0, 0.1, 0.2, ..., 0.9
3. Pick the λ with the lowest holdout RMSE
4. **BUT** only accept it if RMSE improves by ≥10% over λ=0

The 10% threshold exists because:
- The synthetic data has no carryover (λ=0 is the true value)
- Without the threshold, the CV might select λ=0.1 or 0.2 just from noise
- A wrong λ hurts forecasts more than it helps — it inflates residuals and widens intervals

### 10.5 Extending to Real Data

To use RevCast AI with real data:

1. **Export CSVs** from your ad platforms (Google Ads, Meta Business Manager, Microsoft Advertising)
2. **Map columns** to match the expected schema (date, campaign, campaign_type, spend, impressions, clicks, conversions, revenue)
3. **Export GA4** data from Google Analytics
4. **Export Shopify** data from your store admin

**Minimum data needed:** ~6 months (26 weeks) per channel. More is better — 12–18 months captures seasonal patterns.

**Watch out for:**
- Zero-spend weeks (the model drops them automatically)
- Currency mismatches between platforms
- Attribution window differences (Google uses 30-day, Meta uses 7-day by default)
- Campaign restructures (if you renamed campaigns mid-period, the data might show artificial discontinuities)

---

## 11. Troubleshooting

### Backend won't start

**"ModuleNotFoundError: No module named 'fastapi'"**
→ Install dependencies: `pip install -r requirements.txt`

**"Address already in use"**
→ Another process is on port 8001. Kill it: `pkill -f 'uvicorn.*8001'` or use a different port.

### Frontend shows "Failed to fetch" errors

→ Backend isn't running, or it's on a different port. Check that `http://localhost:8001/health` returns OK.

### Upload button stays disabled

→ Not all 5 files were recognized. Filenames must contain: "google", "meta", "microsoft", "ga4", "shopify". Rename your files if needed.

### Forecast takes too long

→ The bootstrap runs 1,000 simulations per channel. On slow hardware, this might take 10–15 seconds. This is normal.

### AI Summary fails

→ `GEMINI_API_KEY` environment variable isn't set or is invalid. This only affects the AI summary — all other features work without it.

### Calibration shows low coverage

→ If coverage is below 70%, the model might be underfitting. Check R² values — if they're below 0.5, the data might not have a strong spend-revenue relationship.

### PDF export shows garbled characters

→ The `sanitizeForPdf()` function handles common Unicode → ASCII replacements. If you see mojibake, a new Unicode character needs to be added to the sanitization map in `frontend/src/lib/export.ts`.

---

## 12. Deployment

### 12.1 Local Development (All Commands)

| Task | Command |
|------|---------|
| Generate sample data | `python data/generate_synthetic.py` |
| Start backend | `cd backend && pip install -r requirements.txt && python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload` |
| Start frontend | `cd frontend && npm install && npm run dev` |
| Start frontend (custom port) | `cd frontend && npm run dev -- -p 3010` |
| Run tests | `cd backend && python -m pytest tests/ -v` |
| Build frontend for production | `cd frontend && npm run build && npm start` |
| Health check | `curl http://localhost:8001/health` |
| Stop backend | `pkill -f 'uvicorn main:app'` |
| Stop frontend | `pkill -f 'next dev'` |

### 12.2 Docker

```bash
# Start both services
docker-compose up --build

# Backend: http://localhost:8001
# Frontend: http://localhost:3000

# Stop
docker-compose down
```

### 12.3 Deploy to Render.com (Cloud)

RevCast AI is deployed live at:
- **Frontend:** https://revcast-frontend.onrender.com
- **Backend API:** https://revcast-api.onrender.com

To deploy your own copy:

1. **Fork** the repo on GitHub
2. Go to [render.com](https://render.com) → sign in with GitHub
3. Click **"New"** → **"Blueprint"**
4. Select your forked repo
5. Render reads `render.yaml` and creates 2 services automatically
6. Click **"Apply"** — builds take ~5 minutes

**What `render.yaml` configures:**

```yaml
services:
  - revcast-api (Python, FastAPI)
    - Installs requirements.txt
    - Runs: uvicorn main:app --host 0.0.0.0 --port $PORT
    - Health check: /health
    - Env: GEMINI_API_KEY, JWT_SECRET, CORS_ORIGINS

  - revcast-frontend (Node.js, Next.js)
    - Runs: npm install && npm run build
    - Starts: npm start
    - Env: NEXT_PUBLIC_API_URL → points to backend
```

**After deployment — update these env vars on the Render dashboard:**

| Service | Variable | Set to |
|---------|----------|--------|
| Backend | `CORS_ORIGINS` | Your frontend URL (e.g., `https://revcast-frontend.onrender.com`) |
| Frontend | `NEXT_PUBLIC_API_URL` | Your backend URL (e.g., `https://revcast-api.onrender.com`) |
| Backend | `GEMINI_API_KEY` | Your Google Gemini key (optional — only for AI summaries) |

### 12.4 Deploy Frontend to Vercel (Alternative)

If you prefer Vercel for the frontend:

1. Go to [vercel.com](https://vercel.com) → import your GitHub repo
2. Set root directory to `frontend`
3. Add env var: `NEXT_PUBLIC_API_URL` = your Render backend URL
4. Deploy — Vercel auto-detects Next.js

The repo includes `frontend/vercel.json` for this purpose.

### 12.5 Free Tier Limitations

On Render's free tier:
- Services **sleep after 15 minutes** of inactivity
- First request after sleep takes **~50 seconds** (cold start)
- SQLite database resets on redeploy (users need to re-register)
- Upgrade to paid ($7/month per service) for always-on + persistent disk

---

## 13. Glossary

| Term | Definition |
|------|-----------|
| **ROAS** | Return On Ad Spend. Revenue ÷ Spend. A ROAS of 3x means $3 revenue per $1 spent. |
| **P10 / P50 / P90** | Percentiles of the forecast distribution. P50 = median (expected). P10 = conservative (90% chance of beating). P90 = optimistic (10% chance of beating). |
| **Elasticity (β)** | How much revenue changes when spend changes by 1%. Values below 1.0 indicate diminishing returns. |
| **OLS** | Ordinary Least Squares — the standard method for fitting a regression line to data. |
| **Bootstrap** | A statistical technique: resample historical errors randomly to build a distribution of possible outcomes. |
| **Deseasonalization** | Removing the seasonal pattern from data so the model sees the underlying trend. |
| **Adstock** | The carryover effect of advertising — spend this week still generates some revenue next week. |
| **R²** | R-squared — what fraction of revenue variation the model explains. 1.0 = perfect, 0.0 = useless. |
| **Residual** | The difference between what the model predicted and what actually happened. |
| **Holdout backtest** | Testing the model by hiding the most recent data, fitting on the rest, and checking predictions. |
| **Heteroscedastic** | When the spread of errors varies (e.g., larger at higher spend levels). |
| **SLSQP** | Sequential Least Squares Programming — a mathematical optimization algorithm used for the budget optimizer. |
| **Efficient frontier** | A curve showing the maximum achievable revenue at each budget level. |
| **Marginal ROAS** | The revenue generated by the *last* dollar of spend. Different from average ROAS. |
| **Z-score** | How many standard deviations a value is from the mean. |z| > 2.5 is flagged as an anomaly. |
| **Log-log model** | A regression where both X and Y are log-transformed. Makes power-law relationships linear. |
| **Seasonality index** | A multiplier showing how much a month deviates from average. 1.65 = 65% above average. |
| **Campaign type** | A category of ad campaign (e.g., Search, Shopping, Display, Retargeting). |
| **Horizon** | How far into the future the forecast extends (30, 60, or 90 days). |
| **Session** | An in-memory object storing all data and models for one user's upload-to-forecast flow. |

---

*This guide is part of the [RevCast AI](https://github.com/keerthishree20/RevCast-AI) project by KeerthiShree TS.*
