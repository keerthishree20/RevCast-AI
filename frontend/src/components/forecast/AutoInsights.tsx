"use client";

import { useApp } from "@/context/AppContext";
import type { ChannelForecast, ForecastResponse } from "@/lib/types";

const CHANNEL_LABELS: Record<string, string> = {
  google: "Google",
  meta: "Meta",
  microsoft: "Microsoft",
};

interface Insight {
  icon: string;
  category: "opportunity" | "risk" | "info" | "success";
  text: string;
  priority: number;
}

function generateInsights(forecast: ForecastResponse): Insight[] {
  const insights: Insight[] = [];
  const channels = forecast.channel_breakdown;
  const total = forecast.forecast;
  const totalBudget = forecast.total_budget;

  // 1. Best elasticity channel
  const bestElasticity = channels.reduce((a, b) =>
    a.elasticity > b.elasticity ? a : b
  );
  const worstElasticity = channels.reduce((a, b) =>
    a.elasticity < b.elasticity ? a : b
  );
  insights.push({
    icon: "trending_up",
    category: "opportunity",
    text: `${CHANNEL_LABELS[bestElasticity.channel]} has the highest spend responsiveness (beta=${bestElasticity.elasticity}) — a 10% budget increase yields ~${(bestElasticity.elasticity * 10).toFixed(1)}% more revenue. Consider shifting budget here.`,
    priority: 10,
  });

  // 2. Widest uncertainty band
  const spreads = channels.map((c) => ({
    channel: c.channel,
    spread: c.revenue.p50 > 0 ? (c.revenue.p90 - c.revenue.p10) / c.revenue.p50 : 0,
  }));
  const widestSpread = spreads.reduce((a, b) => (a.spread > b.spread ? a : b));
  if (widestSpread.spread > 0.4) {
    insights.push({
      icon: "warning",
      category: "risk",
      text: `${CHANNEL_LABELS[widestSpread.channel]} shows the widest forecast uncertainty (P10-P90 spread: ${(widestSpread.spread * 100).toFixed(0)}% of P50). Revenue outcomes are hard to predict — consider stabilizing spend patterns.`,
      priority: 8,
    });
  }

  // 3. ROAS comparison
  const bestRoas = channels.reduce((a, b) =>
    a.roas.p50 > b.roas.p50 ? a : b
  );
  const worstRoas = channels.reduce((a, b) =>
    a.roas.p50 < b.roas.p50 ? a : b
  );
  if (bestRoas.roas.p50 > worstRoas.roas.p50 * 1.5) {
    insights.push({
      icon: "swap_horiz",
      category: "opportunity",
      text: `${CHANNEL_LABELS[bestRoas.channel]} delivers ${bestRoas.roas.p50.toFixed(2)}x ROAS vs ${CHANNEL_LABELS[worstRoas.channel]}'s ${worstRoas.roas.p50.toFixed(2)}x — a ${((bestRoas.roas.p50 / worstRoas.roas.p50 - 1) * 100).toFixed(0)}% efficiency gap. Budget reallocation could improve blended ROAS.`,
      priority: 9,
    });
  }

  // 4. Model fit quality
  const poorFit = channels.filter((c) => c.model_r2 < 0.7);
  if (poorFit.length > 0) {
    insights.push({
      icon: "analytics",
      category: "risk",
      text: `${poorFit.map((c) => CHANNEL_LABELS[c.channel]).join(" and ")} ${poorFit.length > 1 ? "have" : "has"} R² below 0.70 — the model explains less than 70% of revenue variance. Forecasts for ${poorFit.length > 1 ? "these channels" : "this channel"} carry higher structural uncertainty.`,
      priority: 7,
    });
  }

  const goodFit = channels.filter((c) => c.model_r2 >= 0.85);
  if (goodFit.length > 0) {
    insights.push({
      icon: "verified",
      category: "success",
      text: `${goodFit.map((c) => CHANNEL_LABELS[c.channel]).join(" and ")} ${goodFit.length > 1 ? "show" : "shows"} excellent model fit (R² > 0.85). Forecasts are well-calibrated and budget decisions can be made with confidence.`,
      priority: 5,
    });
  }

  // 5. Budget concentration risk
  const maxBudgetCh = channels.reduce((a, b) =>
    a.budget > b.budget ? a : b
  );
  const budgetShare = totalBudget > 0 ? (maxBudgetCh.budget / totalBudget) * 100 : 0;
  if (budgetShare > 60) {
    insights.push({
      icon: "pie_chart",
      category: "risk",
      text: `${(budgetShare).toFixed(0)}% of total budget is concentrated in ${CHANNEL_LABELS[maxBudgetCh.channel]}. High channel concentration increases risk — if ${CHANNEL_LABELS[maxBudgetCh.channel]} performance drops, there's limited diversification buffer.`,
      priority: 6,
    });
  }

  // 6. Overall portfolio ROAS
  const portfolioRoas = total.roas.p50;
  insights.push({
    icon: "account_balance",
    category: portfolioRoas >= 3.0 ? "success" : portfolioRoas >= 2.0 ? "info" : "risk",
    text: `Blended portfolio ROAS is ${portfolioRoas.toFixed(2)}x (P50). ${
      portfolioRoas >= 3.0
        ? "Strong returns — you have headroom to increase spend."
        : portfolioRoas >= 2.0
        ? "Healthy returns but approaching efficiency plateau."
        : "Below typical 2x threshold — consider spend optimization."
    }`,
    priority: 4,
  });

  // 7. Diminishing returns warning
  if (channels.every((c) => c.elasticity < 1.0)) {
    insights.push({
      icon: "show_chart",
      category: "info",
      text: `All channels have elasticity below 1.0, meaning you're in diminishing returns territory across the board. Each additional dollar of spend produces progressively less revenue — focus on allocation efficiency over raw spend increases.`,
      priority: 3,
    });
  }

  // 8. Anomaly count
  if (forecast.anomalies.length > 0) {
    const anomalyChannels = Array.from(new Set(forecast.anomalies.map((a) => a.channel)));
    insights.push({
      icon: "bolt",
      category: "info",
      text: `${forecast.anomalies.length} anomalous weeks detected across ${anomalyChannels.map((c) => CHANNEL_LABELS[c] ?? c).join(", ")}. These are weeks where actual revenue deviated significantly from the model's expectations — often holidays or campaign changes.`,
      priority: 2,
    });
  }

  // Sort by priority (higher first)
  return insights.sort((a, b) => b.priority - a.priority);
}

const CATEGORY_STYLES: Record<string, { border: string; bg: string; icon: string; iconBg: string }> = {
  opportunity: {
    border: "border-emerald-200",
    bg: "bg-emerald-50",
    icon: "text-emerald-600",
    iconBg: "bg-emerald-100",
  },
  risk: {
    border: "border-amber-200",
    bg: "bg-amber-50",
    icon: "text-amber-600",
    iconBg: "bg-amber-100",
  },
  info: {
    border: "border-blue-200",
    bg: "bg-blue-50",
    icon: "text-blue-600",
    iconBg: "bg-blue-100",
  },
  success: {
    border: "border-green-200",
    bg: "bg-green-50",
    icon: "text-green-600",
    iconBg: "bg-green-100",
  },
};

const CATEGORY_ICONS: Record<string, string> = {
  opportunity: "↗",
  risk: "⚠",
  info: "ℹ",
  success: "✓",
};

export default function AutoInsights() {
  const { forecast } = useApp();
  if (!forecast) return null;

  const insights = generateInsights(forecast);
  if (insights.length === 0) return null;

  const opportunities = insights.filter((i) => i.category === "opportunity").length;
  const risks = insights.filter((i) => i.category === "risk").length;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-800">
            Auto-Generated Insights
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {insights.length} insights derived from your forecast data — no AI needed, pure math
          </p>
        </div>
        <div className="flex gap-2">
          {opportunities > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
              {opportunities} opportunit{opportunities === 1 ? "y" : "ies"}
            </span>
          )}
          {risks > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
              {risks} risk{risks === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2.5">
        {insights.map((insight, i) => {
          const style = CATEGORY_STYLES[insight.category];
          return (
            <div
              key={i}
              className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${style.border} ${style.bg}`}
            >
              <span
                className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${style.iconBg} ${style.icon}`}
              >
                {CATEGORY_ICONS[insight.category]}
              </span>
              <p className="text-sm text-gray-700 leading-relaxed">
                {insight.text}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
