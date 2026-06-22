"""Google Gemini API integration for AI-assisted causal summaries."""

import json
import os

try:
    from google import genai
    from google.genai import types as genai_types
    HAS_GENAI = True
except ImportError:
    HAS_GENAI = False


def _build_prompt(ctx: dict) -> str:
    hist = ctx.get("historical", {})
    fc   = ctx.get("forecast", {})
    chs  = ctx.get("channels", [])
    sims = ctx.get("simulations", [])
    anoms = ctx.get("anomalies", [])

    ch_rows = "\n".join(
        f"  {c['channel']:12s} | budget=${c['budget']:>9,.0f} | P50 rev=${c['revenue']['p50']:>10,.0f} "
        f"| P50 ROAS={c['roas']['p50']:.2f}x | elasticity={c['elasticity']:.2f} | R²={c['r_squared']:.2f}"
        for c in chs
    )

    sim_rows = "\n".join(
        f"  {s['label']:8s} | total_budget=${s['total_budget']:>9,.0f} | P50 rev=${s['revenue']['p50']:>10,.0f} "
        f"| P50 ROAS={s['roas']['p50']:.2f}x | marginal_ROAS={s.get('marginal_roas') or 'N/A'}"
        for s in sims
    )

    anom_rows = "\n".join(
        f"  {a['channel']:12s} | week {a['week']} | z={a['z_score']:+.1f} | {a['description']}"
        for a in anoms[:8]
    ) or "  None detected"

    return f"""You are a senior e-commerce marketing analyst specializing in paid media performance.
Analyze the probabilistic revenue forecast below and return ONLY valid JSON — no markdown fences, no explanation.

## Historical Performance (trailing 12 weeks)
- Total spend: ${hist.get('spend', 0):,.0f}
- Total revenue: ${hist.get('revenue', 0):,.0f}
- Blended ROAS: {hist.get('roas', 0):.2f}x

## Forecast Inputs
- Horizon: {fc.get('horizon_days', 90)} days
- Total proposed budget: ${fc.get('total_budget', 0):,.0f}

## Blended Forecast
- Revenue P10/P50/P90: ${fc['revenue']['p10']:,.0f} / ${fc['revenue']['p50']:,.0f} / ${fc['revenue']['p90']:,.0f}
- ROAS   P10/P50/P90: {fc['roas']['p10']:.2f}x / {fc['roas']['p50']:.2f}x / {fc['roas']['p90']:.2f}x

## Channel-Level Model Outputs
{ch_rows}

## Budget Scenario Simulation
{sim_rows}

## Anomalies Detected in Historical Data
{anom_rows}

Return exactly this JSON structure (no extra keys):
{{
  "causal_summary": "2-4 sentences explaining key revenue drivers, grounded in the data above",
  "risk_factors": ["risk 1", "risk 2", "risk 3"],
  "recommendations": ["action 1", "action 2", "action 3"],
  "confidence": "high"
}}
confidence must be one of: low, medium, high — based on model R² values and data quality."""


def _compute_historical_kpis(session_data: dict) -> dict:
    import pandas as pd
    ad_channels = ["google", "meta", "microsoft"]
    total_spend = 0.0
    total_revenue = 0.0
    for ch in ad_channels:
        panel = session_data["weekly_panels"][ch]
        cutoff = panel["week_start"].max() - pd.Timedelta(weeks=12)
        recent = panel[panel["week_start"] >= cutoff]
        total_spend   += recent["spend"].sum()
        total_revenue += recent["revenue"].sum()
    return {
        "spend":   round(total_spend, 2),
        "revenue": round(total_revenue, 2),
        "roas":    round(total_revenue / total_spend, 3) if total_spend > 0 else 0.0,
    }


def generate_summary(session_data: dict, forecast_result, simulation_results: list) -> dict:
    if not HAS_GENAI:
        raise ValueError("google-genai package not installed. AI summaries are unavailable.")

    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not set in environment")

    client = genai.Client(api_key=api_key)

    hist_kpis = _compute_historical_kpis(session_data)

    fc_ctx = {
        "horizon_days":  forecast_result.horizon_days,
        "total_budget":  forecast_result.total_budget,
        "revenue":       forecast_result.forecast["revenue"],
        "roas":          forecast_result.forecast["roas"],
    }

    channels_ctx = [
        {
            "channel":    cf.channel,
            "budget":     cf.budget,
            "revenue":    cf.revenue,
            "roas":       cf.roas,
            "elasticity": cf.elasticity,
            "r_squared":  cf.r_squared,
        }
        for cf in forecast_result.channel_breakdown
    ]

    anomalies_ctx = [
        {"channel": a.channel, "week": a.week, "z_score": a.z_score, "description": a.description}
        for a in forecast_result.anomalies
    ]

    ctx = {
        "historical":  hist_kpis,
        "forecast":    fc_ctx,
        "channels":    channels_ctx,
        "simulations": simulation_results,
        "anomalies":   anomalies_ctx,
    }

    prompt = _build_prompt(ctx)

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=genai_types.GenerateContentConfig(
            temperature=0.3,
            response_mime_type="application/json",
        ),
    )

    raw_text = response.text.strip()

    # Strip markdown fences if present
    if raw_text.startswith("```"):
        raw_text = raw_text.split("```")[1]
        if raw_text.startswith("json"):
            raw_text = raw_text[4:]
        raw_text = raw_text.strip()

    try:
        parsed = json.loads(raw_text)
    except json.JSONDecodeError:
        parsed = {
            "causal_summary":  raw_text[:500],
            "risk_factors":    [],
            "recommendations": [],
            "confidence":      "low",
        }

    return {**parsed, "model_used": "gemini-2.5-flash"}
