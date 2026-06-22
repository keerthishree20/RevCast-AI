"""CSV parsing and weekly aggregation for all five channel files."""

import io
import pandas as pd
from dataclasses import dataclass


REQUIRED_COLUMNS = {
    "google":    {"date", "campaign", "campaign_type", "spend", "revenue", "impressions", "clicks", "conversions"},
    "meta":      {"date", "campaign", "campaign_type", "spend", "revenue", "impressions", "clicks", "conversions"},
    "microsoft": {"date", "campaign", "campaign_type", "spend", "revenue", "impressions", "clicks", "conversions"},
    "ga4":       {"date", "source", "medium", "sessions", "engaged_sessions", "conversions", "revenue"},
    "shopify":   {"date", "channel", "orders", "aov", "revenue"},
}


@dataclass
class IngestResult:
    weekly_panels: dict        # channel → weekly aggregated DataFrame
    raw_dfs: dict              # channel → daily DataFrame (for validation)
    date_range: tuple[str, str]
    weeks_available: int
    channel_totals: dict       # channel → {spend, revenue, roas}
    channel_weekly_preview: dict  # channel → list of first-5-week dicts


def _parse_csv(file_bytes: bytes, channel: str) -> pd.DataFrame:
    df = pd.read_csv(io.BytesIO(file_bytes))
    df.columns = [c.strip().lower() for c in df.columns]
    required = REQUIRED_COLUMNS[channel]
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"CSV for '{channel}' is missing columns: {missing}")
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values("date").reset_index(drop=True)
    return df


def _weekly_aggregate_channel(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["week_start"] = df["date"] - pd.to_timedelta(df["date"].dt.dayofweek, unit="D")
    agg = df.groupby("week_start").agg(
        spend=("spend", "sum"),
        revenue=("revenue", "sum"),
        impressions=("impressions", "sum"),
        clicks=("clicks", "sum"),
        conversions=("conversions", "sum"),
    ).reset_index()
    agg = agg[agg["spend"] > 0].copy()
    agg = agg.sort_values("week_start").reset_index(drop=True)
    return agg


def _weekly_aggregate_channel_with_types(df: pd.DataFrame) -> pd.DataFrame:
    """Weekly aggregation preserving campaign_type breakdown for sub-segment allocation."""
    df = df.copy()
    df["week_start"] = df["date"] - pd.to_timedelta(df["date"].dt.dayofweek, unit="D")
    agg = df.groupby(["week_start", "campaign_type"]).agg(
        spend=("spend", "sum"),
        revenue=("revenue", "sum"),
    ).reset_index()
    return agg


def run_ingest(file_map: dict[str, bytes]) -> IngestResult:
    """
    file_map keys: 'google', 'meta', 'microsoft', 'ga4', 'shopify'
    Values: raw CSV bytes.
    """
    raw_dfs: dict = {}
    for channel, file_bytes in file_map.items():
        raw_dfs[channel] = _parse_csv(file_bytes, channel)

    ad_channels = ["google", "meta", "microsoft"]
    weekly_panels: dict = {}
    channel_totals: dict = {}

    for ch in ad_channels:
        df = raw_dfs[ch]
        weekly = _weekly_aggregate_channel(df)
        weekly_panels[ch] = weekly

        total_spend   = df["spend"].sum()
        total_revenue = df["revenue"].sum()
        channel_totals[ch] = {
            "spend":   round(float(total_spend), 2),
            "revenue": round(float(total_revenue), 2),
            "roas":    round(float(total_revenue / total_spend), 3) if total_spend > 0 else 0.0,
        }

    all_dates = pd.concat([raw_dfs[ch]["date"] for ch in ad_channels])
    date_min = all_dates.min().strftime("%Y-%m-%d")
    date_max = all_dates.max().strftime("%Y-%m-%d")

    weeks_available = max(len(weekly_panels[ch]) for ch in ad_channels)

    channel_weekly_preview: dict = {}
    for ch in ad_channels:
        preview_rows = weekly_panels[ch].head(5).copy()
        preview_rows["week_start"] = preview_rows["week_start"].dt.strftime("%Y-%m-%d")
        channel_weekly_preview[ch] = preview_rows[["week_start", "spend", "revenue"]].to_dict(orient="records")

    return IngestResult(
        weekly_panels=weekly_panels,
        raw_dfs=raw_dfs,
        date_range=(date_min, date_max),
        weeks_available=weeks_available,
        channel_totals=channel_totals,
        channel_weekly_preview=channel_weekly_preview,
    )


def get_campaign_type_weekly(raw_df: pd.DataFrame) -> pd.DataFrame:
    return _weekly_aggregate_channel_with_types(raw_df)
