"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useApp } from "@/context/AppContext";

const CHANNEL_COLORS: Record<string, string> = {
  google: "#4285F4",
  meta: "#0866FF",
  microsoft: "#00A4EF",
};

const CHANNEL_LABELS: Record<string, string> = {
  google: "Google",
  meta: "Meta",
  microsoft: "Microsoft",
};

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export default function DiminishingReturnsChart() {
  const { forecast, budget } = useApp();
  const [activeChannel, setActiveChannel] = useState<string>("google");

  if (!forecast) return null;

  const channels = forecast.channel_breakdown;
  const ch = channels.find((c) => c.channel === activeChannel);
  if (!ch) return null;

  const beta = ch.elasticity;
  const currentSpend = ch.budget;
  const currentRev = ch.revenue.p50;

  // Recover alpha: log(rev) = alpha + beta * log(spend)
  const alpha = Math.log(currentRev) - beta * Math.log(currentSpend);

  // Generate curve data from 20% to 300% of current spend
  const points = 50;
  const minSpend = currentSpend * 0.2;
  const maxSpend = currentSpend * 3.0;
  const step = (maxSpend - minSpend) / points;

  const curveData = Array.from({ length: points + 1 }, (_, i) => {
    const spend = minSpend + step * i;
    const rev = Math.exp(alpha + beta * Math.log(spend));
    const marginalRoas = beta * rev / spend;
    return {
      spend: Math.round(spend),
      spendK: Math.round(spend / 1000),
      revenue: Math.round(rev),
      roas: rev / spend,
      marginalRoas,
    };
  });

  // Find the point where marginal ROAS drops below 1.0
  const breakEvenIdx = curveData.findIndex((d) => d.marginalRoas < 1.0);
  const sweetSpotSpend =
    breakEvenIdx > 0 ? curveData[breakEvenIdx - 1].spend : null;

  // Current point data for ReferenceDot
  const currentSpendK = Math.round(currentSpend / 1000);
  const currentRevK = Math.round(currentRev / 1000);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-5">
      <div>
        <h3 className="text-base font-semibold text-gray-800">
          Diminishing Returns Curve
        </h3>
        <p className="text-xs text-gray-400 mt-0.5">
          Revenue response to spend changes — powered by the fitted log-log
          elasticity model (beta = {beta})
        </p>
      </div>

      {/* Channel tabs */}
      <div className="flex gap-2">
        {channels.map((c) => (
          <button
            key={c.channel}
            onClick={() => setActiveChannel(c.channel)}
            className={`flex-1 rounded-lg border px-3 py-2 text-left transition-colors ${
              activeChannel === c.channel
                ? "border-blue-400 bg-blue-50"
                : "border-gray-200 hover:bg-gray-50"
            }`}
          >
            <div className="text-sm font-semibold text-gray-700">
              {CHANNEL_LABELS[c.channel] ?? c.channel}
            </div>
            <div className="text-xs text-gray-400">
              Beta: {c.elasticity} · ROAS: {c.roas.p50.toFixed(2)}x
            </div>
          </button>
        ))}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={curveData}
          margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="spendK"
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => `$${v}K`}
            label={{
              value: "Ad Spend",
              position: "insideBottom",
              offset: -2,
              fontSize: 11,
              fill: "#9ca3af",
            }}
          />
          <YAxis
            yAxisId="rev"
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
          />
          <YAxis
            yAxisId="roas"
            orientation="right"
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => `${v.toFixed(1)}x`}
            domain={[0, "auto"]}
          />
          <Tooltip
            formatter={(value, name) => {
              const v = Number(value);
              if (name === "Revenue") return [fmt(v), "Revenue"];
              if (name === "ROAS") return [`${v.toFixed(2)}x`, "ROAS"];
              if (name === "Marginal ROAS")
                return [`${v.toFixed(2)}x`, "Marginal ROAS"];
              return [String(v), String(name)];
            }}
            labelFormatter={(label) => `Spend: $${label}K`}
          />
          <Legend verticalAlign="top" height={28} />
          <Line
            yAxisId="rev"
            type="monotone"
            dataKey="revenue"
            stroke={CHANNEL_COLORS[activeChannel] ?? "#2563eb"}
            strokeWidth={2.5}
            dot={false}
            name="Revenue"
            isAnimationActive={false}
          />
          <Line
            yAxisId="roas"
            type="monotone"
            dataKey="roas"
            stroke="#f59e0b"
            strokeWidth={2}
            strokeDasharray="5 3"
            dot={false}
            name="ROAS"
            isAnimationActive={false}
          />
          <Line
            yAxisId="roas"
            type="monotone"
            dataKey="marginalRoas"
            stroke="#ef4444"
            strokeWidth={1.5}
            strokeDasharray="3 3"
            dot={false}
            name="Marginal ROAS"
            isAnimationActive={false}
          />
          {/* Current spend marker */}
          <ReferenceDot
            yAxisId="rev"
            x={currentSpendK}
            y={currentRev}
            r={7}
            fill={CHANNEL_COLORS[activeChannel] ?? "#2563eb"}
            stroke="white"
            strokeWidth={2}
            label={{
              value: "Current",
              position: "top",
              fontSize: 10,
              fill: "#374151",
            }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Insight strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">
          <p className="text-xs text-blue-400 mb-0.5">Current Spend</p>
          <p className="text-lg font-bold text-blue-700">{fmt(currentSpend)}</p>
          <p className="text-xs text-blue-400">
            Revenue: {fmt(currentRev)}
          </p>
        </div>
        <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
          <p className="text-xs text-gray-400 mb-0.5">Elasticity (Beta)</p>
          <p className="text-lg font-bold text-gray-800">{beta}</p>
          <p className="text-xs text-gray-400">
            {beta < 0.5
              ? "Low responsiveness"
              : beta < 0.8
              ? "Moderate responsiveness"
              : "High responsiveness"}
          </p>
        </div>
        <div className="rounded-xl bg-amber-50 border border-amber-100 p-3">
          <p className="text-xs text-amber-500 mb-0.5">Interpretation</p>
          <p className="text-sm font-semibold text-amber-800">
            +10% spend → +{(beta * 10).toFixed(1)}% revenue
          </p>
          <p className="text-xs text-amber-500">
            {beta < 1.0
              ? "Diminishing returns zone"
              : "Increasing returns — rare"}
          </p>
        </div>
      </div>
    </div>
  );
}
