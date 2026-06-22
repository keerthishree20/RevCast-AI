---
name: run-revcast
description: Launch RevCast AI's backend (FastAPI) and frontend (Next.js) locally and drive it through a full upload-to-forecast flow to verify a change works. Use when asked to run, start, or verify this app.
---

# Running RevCast AI locally

Two services, started independently. Neither has a process manager — start them in the background and poll for health rather than sleeping a fixed amount.

## Backend (FastAPI, port 8001)

No project-local venv exists. Use the Anaconda Python install, which already has `fastapi`, `pandas`, `numpy`, `statsmodels`, `scipy`, `google-genai` installed:

```bash
cd backend
GEMINI_API_KEY=<key> /home/harikishan/anaconda3/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload > /tmp/uvicorn_revcast.log 2>&1 &
disown
timeout 30 bash -c 'until curl -sf http://localhost:8001/health >/dev/null; do sleep 1; done'
```

- **Always pass `--reload`** — without it, edits to `core/` or `api/` won't take effect until you manually kill and restart the process. This has bitten a verification pass before (changes to `elasticity.py`/`bootstrap.py` silently not applied).
- `GEMINI_API_KEY` is only needed for `POST /api/summary`; everything else works without it.
- If startup fails, check `/tmp/uvicorn_revcast.log` — most failures are either the port already in use or a missing package in the Anaconda env.

## Frontend (Next.js, default port 3000 — but check first)

**Gotcha: port 3000 may already be running a *different* project.** This user has multiple Next.js hackathon projects (e.g. `aerospace-inspection`) that also default to port 3000. Before assuming RevCast is on 3000:

```bash
curl -s http://localhost:3000 | grep -o '<title>[^<]*</title>'   # or just look at the page content
ps -ef | grep next-server   # readlink -f /proc/<pid>/cwd to see which project owns port 3000
```

If 3000 is taken by something else, start RevCast on a different port — don't kill another project's server without asking:

```bash
cd frontend
npm run dev -- -p 3010 > /tmp/next_revcast.log 2>&1 &
disown
timeout 30 bash -c 'until curl -sf http://localhost:3010 >/dev/null; do sleep 1; done'
```

CORS on the backend (`allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?"`) accepts any localhost port, so picking a different port needs no backend change.

## Driving it (no chromium-cli installed here)

`chromium-cli` is not available in this environment. Playwright is installed as a **global** node module instead — `npx playwright` doesn't resolve it, you have to `require()` it by absolute path:

```js
const { chromium } = require('/home/harikishan/.nvm/versions/node/v22.15.0/lib/node_modules/playwright');
```

(Confirm the exact path with `npm ls playwright -g` if the Node version differs.)

A representative end-to-end flow, since the app is a multi-step wizard with no auth:

1. `await page.goto('http://localhost:3010')`
2. Upload the 5 sample CSVs in one shot to the hidden multi-file input — **don't try to find 5 separate file inputs, there's only one**:
   ```js
   await page.locator('#csv-input').setInputFiles([
     '<repo>/data/generated/google_ads.csv',
     '<repo>/data/generated/meta_ads.csv',
     '<repo>/data/generated/microsoft_ads.csv',
     '<repo>/data/generated/ga4_sessions.csv',
     '<repo>/data/generated/shopify_orders.csv',
   ]);
   ```
3. Click **"Upload & Validate"** (don't skip this — files being attached to the input doesn't auto-advance the wizard; this button does).
4. Wait for `text=Run Forecast`, click it.
5. Wait for `text=Export Report` (or whatever the step-3 marker is) as proof the forecast pipeline completed.
6. Step 3 now renders 11 visualization components. Key ones to verify after forecast completes:
   - "Revenue Attribution Waterfall" — waterfall chart
   - "Channel Comparison Radar" — spider chart
   - "Diminishing Returns Curve" — per-channel spend-response chart with tabs
   - "What-If Sensitivity Analysis" — spend sensitivity table
   - "Auto-Generated Insights" — auto-generated insight bullets
   - "Seasonality Heatmap" — monthly index grid
   - "Calibration Time Machine" — click "Run Calibration Check" to trigger backtest, then verify per-channel charts
7. `page.on('console', ...)` + `page.on('pageerror', ...)` from the start, and check both are empty before declaring success — a blank/partial page can still return HTTP 200.

If sample data is stale or missing, regenerate it: `python data/generate_synthetic.py` from the repo root.

## Stopping

```bash
pkill -f 'uvicorn main:app.*8001'
pkill -f 'next dev.*3010'   # adjust port if you used a different one
```
