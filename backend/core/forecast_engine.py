"""
Orchestrates the full probabilistic forecast pipeline:
  Ingest → Seasonality → Deseasonalize → OLS Fit → Bootstrap → Sub-segment Allocation → Anomaly Detection
"""

from __future__ import annotations
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Optional
import numpy as np
import pandas as pd

from core.seasonality import compute_monthly_indices, deseasonalize, get_horizon_seasonality_factor
from core.elasticity import fit_channel_model, ChannelModel
from core.bootstrap import bootstrap_period_revenue, bootstrap_total_revenue, compute_percentiles
from core.ingest import get_campaign_type_weekly


@dataclass
class ChannelForecast:
    channel: str
    budget: float
    revenue: dict          # {p10, p50, p90}
    roas: dict             # {p10, p50, p90}
    elasticity: float
    r_squared: float
    model_r2: float
    campaign_type_breakdown: list = field(default_factory=list)


@dataclass
class Anomaly:
    channel: str
    week: str
    z_score: float
    description: str


@dataclass
class ForecastResult:
    horizon_days: int
    total_budget: float
    forecast: dict               # {revenue: {p10,p50,p90}, roas: {p10,p50,p90}}
    channel_breakdown: list[ChannelForecast]
    campaign_type_breakdown: list
    seasonality_indices: dict
    anomalies: list[Anomaly]
    channel_models: dict         # channel → ChannelModel (kept for simulate reuse)
    horizon_start: str


def _compute_campaign_type_shares(raw_df: pd.DataFrame, lookback_weeks: int = 12) -> dict[str, float]:
    """Returns revenue share per campaign type using the last N weeks of data."""
    df = get_campaign_type_weekly(raw_df)
    if df.empty:
        return {}
    cutoff = df["week_start"].max() - pd.Timedelta(weeks=lookback_weeks)
    recent = df[df["week_start"] >= cutoff]
    if recent.empty:
        recent = df
    shares = recent.groupby("campaign_type")["revenue"].sum()
    total = shares.sum()
    if total == 0:
        return {}
    return {ct: float(rev / total) for ct, rev in shares.items()}


def _detect_anomalies(channel: str, weekly_df: pd.DataFrame, model: ChannelModel) -> list[Anomaly]:
    df = weekly_df[weekly_df["spend"] >= 100].copy()
    log_spend = np.log(df["spend"].values)
    log_rev_pred = model.alpha + model.beta * log_spend
    log_rev_actual = np.log(df["revenue_deseas"].clip(lower=1e-6).values)
    residuals = log_rev_actual - log_rev_pred
    z_scores = (residuals - residuals.mean()) / (residuals.std() + 1e-9)

    anomalies: list[Anomaly] = []
    for i, (_, row) in enumerate(df.iterrows()):
        z = z_scores[i]
        if abs(z) > 2.5:
            week_str = row["week_start"].strftime("%Y-%m-%d")
            month = row["week_start"].month
            if z > 0 and month in (11, 12):
                desc = f"Holiday season revenue spike — {z:.1f}σ above model trend"
            elif z > 0:
                desc = f"Unexplained revenue spike — {z:.1f}σ above model trend"
            else:
                desc = f"Revenue underperformance — {z:.1f}σ below model trend"
            anomalies.append(Anomaly(channel=channel, week=week_str, z_score=round(float(z), 2), description=desc))

    return anomalies


def run_forecast(
    session_data: dict,
    budget_inputs: dict[str, float],
    horizon_days: int,
    n_bootstrap: int = 1000,
    horizon_start: Optional[date] = None,
) -> ForecastResult:
    if horizon_start is None:
        horizon_start = date.today()

    horizon_weeks = max(1, round(horizon_days / 7))
    ad_channels = ["google", "meta", "microsoft"]

    weekly_panels: dict[str, pd.DataFrame] = session_data["weekly_panels"]
    raw_dfs: dict[str, pd.DataFrame] = session_data["raw_dfs"]

    rng = np.random.default_rng(seed=42)

    channel_models: dict[str, ChannelModel] = {}
    season_indices_all: dict = {}
    deseason_panels: dict = {}

    # Step 1: Seasonality + OLS fit per channel
    for ch in ad_channels:
        panel = weekly_panels[ch].copy()
        monthly_idx = compute_monthly_indices(panel)
        season_indices_all[ch] = {str(k): round(v, 4) for k, v in monthly_idx.items()}
        panel_ds = deseasonalize(panel, monthly_idx)
        deseason_panels[ch] = panel_ds
        channel_models[ch] = fit_channel_model(ch, panel_ds)

    # Step 2: Bootstrap per channel
    channel_sample_map: dict[str, np.ndarray] = {}
    channel_forecasts: list[ChannelForecast] = []

    for ch in ad_channels:
        budget = budget_inputs.get(ch, 0.0)
        model  = channel_models[ch]
        panel  = weekly_panels[ch]

        monthly_idx = {int(k): v for k, v in season_indices_all[ch].items()}
        s_factor = get_horizon_seasonality_factor(
            pd.Timestamp(horizon_start), horizon_days, monthly_idx
        )

        # Detect if the forecast horizon falls in holiday season
        horizon_months = pd.date_range(
            start=pd.Timestamp(horizon_start), periods=horizon_days, freq="D"
        ).month
        is_holiday_horizon = bool(any(m in (11, 12) for m in horizon_months))

        # Weeks between last training week and horizon start
        last_train_week = weekly_panels[ch]["week_start"].max()
        weeks_ahead = max(1, round((pd.Timestamp(horizon_start) - last_train_week).days / 7))

        samples = bootstrap_period_revenue(
            model, budget, horizon_weeks, s_factor, n_bootstrap, rng,
            is_holiday_horizon=is_holiday_horizon,
            weeks_ahead=weeks_ahead,
        )
        channel_sample_map[ch] = samples

        rev_pcts = compute_percentiles(samples)
        roas_pcts = {
            "p10": round(rev_pcts["p10"] / budget, 3) if budget > 0 else 0.0,
            "p50": round(rev_pcts["p50"] / budget, 3) if budget > 0 else 0.0,
            "p90": round(rev_pcts["p90"] / budget, 3) if budget > 0 else 0.0,
        }

        # Sub-segment allocation
        ct_shares = _compute_campaign_type_shares(raw_dfs[ch])
        ct_breakdown = []
        for ct, share in sorted(ct_shares.items(), key=lambda x: -x[1]):
            ct_breakdown.append({
                "campaign_type":  ct,
                "revenue_share":  round(share, 4),
                "revenue": {k: round(v * share, 2) for k, v in rev_pcts.items()},
            })

        anomalies_ch = _detect_anomalies(ch, deseason_panels[ch], model)

        channel_forecasts.append(ChannelForecast(
            channel=ch,
            budget=budget,
            revenue=rev_pcts,
            roas=roas_pcts,
            elasticity=round(model.beta, 4),
            r_squared=round(model.r_squared, 4),
            model_r2=round(model.r_squared, 4),
            campaign_type_breakdown=ct_breakdown,
        ))

    # Step 3: Blended totals
    total_samples = bootstrap_total_revenue(channel_sample_map)
    total_budget  = sum(budget_inputs.get(ch, 0.0) for ch in ad_channels)
    total_rev_pcts = compute_percentiles(total_samples)
    total_roas_pcts = {
        "p10": round(total_rev_pcts["p10"] / total_budget, 3) if total_budget > 0 else 0.0,
        "p50": round(total_rev_pcts["p50"] / total_budget, 3) if total_budget > 0 else 0.0,
        "p90": round(total_rev_pcts["p90"] / total_budget, 3) if total_budget > 0 else 0.0,
    }

    # Step 4: Cross-channel campaign type breakdown
    campaign_type_breakdown: list = []
    for cf in channel_forecasts:
        for ct_row in cf.campaign_type_breakdown:
            campaign_type_breakdown.append({
                "channel": cf.channel,
                **ct_row,
            })

    # Step 5: Anomalies (collected above per channel)
    all_anomalies: list[Anomaly] = []
    for ch in ad_channels:
        model = channel_models[ch]
        all_anomalies.extend(_detect_anomalies(ch, deseason_panels[ch], model))

    return ForecastResult(
        horizon_days=horizon_days,
        total_budget=total_budget,
        forecast={
            "revenue": total_rev_pcts,
            "roas":    total_roas_pcts,
        },
        channel_breakdown=channel_forecasts,
        campaign_type_breakdown=campaign_type_breakdown,
        seasonality_indices=season_indices_all,
        anomalies=all_anomalies,
        channel_models=channel_models,
        horizon_start=horizon_start.isoformat() if hasattr(horizon_start, "isoformat") else str(horizon_start),
    )
