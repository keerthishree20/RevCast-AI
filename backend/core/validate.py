"""Cross-file consistency checks. All checks are non-blocking (warnings don't prevent forecast)."""

from dataclasses import dataclass, field
import pandas as pd


@dataclass
class CheckResult:
    name: str
    passed: bool
    message: str
    detail: dict = field(default_factory=dict)


def run_validation(ingest_result) -> list[CheckResult]:
    results: list[CheckResult] = []
    raw = ingest_result.raw_dfs
    panels = ingest_result.weekly_panels
    ad_channels = ["google", "meta", "microsoft"]

    # 1. Date coverage
    date_ranges = {ch: (raw[ch]["date"].min(), raw[ch]["date"].max()) for ch in ad_channels}
    all_starts = [v[0] for v in date_ranges.values()]
    all_ends   = [v[1] for v in date_ranges.values()]
    covers_same = (max(all_starts) - min(all_starts)).days <= 7 and (max(all_ends) - min(all_ends)).days <= 7
    results.append(CheckResult(
        name="date_coverage",
        passed=covers_same,
        message="All ad-channel files cover the same date range." if covers_same
                else "Date ranges differ by more than 1 week across channels — check for missing data.",
        detail={ch: {"start": v[0].strftime("%Y-%m-%d"), "end": v[1].strftime("%Y-%m-%d")} for ch, v in date_ranges.items()},
    ))

    # 2. Non-negativity
    neg_issues = []
    for ch in ["google", "meta", "microsoft", "ga4", "shopify"]:
        df = raw[ch]
        num_cols = df.select_dtypes("number").columns
        neg_count = (df[num_cols] < 0).sum().sum()
        if neg_count > 0:
            neg_issues.append(f"{ch}: {neg_count} negative values")
    passed_neg = len(neg_issues) == 0
    results.append(CheckResult(
        name="non_negativity",
        passed=passed_neg,
        message="No negative values detected." if passed_neg else f"Negative values found: {'; '.join(neg_issues)}",
        detail={"issues": neg_issues},
    ))

    # 3. ROAS sanity
    roas_issues = []
    channel_roas = {}
    for ch in ad_channels:
        spend   = raw[ch]["spend"].sum()
        revenue = raw[ch]["revenue"].sum()
        roas    = revenue / spend if spend > 0 else 0.0
        channel_roas[ch] = round(roas, 2)
        if roas < 0.5 or roas > 20:
            roas_issues.append(f"{ch}: {roas:.2f}x (outside [0.5, 20])")
    passed_roas = len(roas_issues) == 0
    results.append(CheckResult(
        name="roas_sanity",
        passed=passed_roas,
        message="All channel ROAS values are within [0.5×, 20×]." if passed_roas
                else f"ROAS anomalies: {'; '.join(roas_issues)}",
        detail={"channel_roas": channel_roas},
    ))

    # 4. Revenue reconciliation (ads total vs Shopify total)
    ads_total     = sum(raw[ch]["revenue"].sum() for ch in ad_channels)
    shopify_total = raw["shopify"]["revenue"].sum()
    delta_pct     = abs(ads_total - shopify_total) / max(ads_total, 1) * 100
    passed_recon  = delta_pct <= 20
    results.append(CheckResult(
        name="revenue_reconciliation",
        passed=passed_recon,
        message=f"Shopify total is within {delta_pct:.1f}% of ad-platform sum." if passed_recon
                else f"Shopify revenue differs from ad-platform sum by {delta_pct:.1f}% (threshold: 20%).",
        detail={
            "ads_total":     round(float(ads_total), 2),
            "shopify_total": round(float(shopify_total), 2),
            "delta_pct":     round(float(delta_pct), 2),
        },
    ))

    # 5. Campaign name consistency (flag campaigns appearing in < 4 weeks)
    sparse_campaigns = []
    for ch in ad_channels:
        df = raw[ch].copy()
        df["week_start"] = df["date"] - pd.to_timedelta(df["date"].dt.dayofweek, unit="D")
        weeks_per_campaign = df.groupby("campaign")["week_start"].nunique()
        sparse = weeks_per_campaign[weeks_per_campaign < 4]
        for camp in sparse.index:
            sparse_campaigns.append(f"{ch}/{camp} ({sparse[camp]} weeks)")
    passed_camps = len(sparse_campaigns) == 0
    results.append(CheckResult(
        name="campaign_name_consistency",
        passed=passed_camps,
        message="All campaigns appear in at least 4 weeks." if passed_camps
                else f"{len(sparse_campaigns)} campaigns appear in fewer than 4 weeks (may be test flights).",
        detail={"sparse_campaigns": sparse_campaigns[:10]},
    ))

    return results
