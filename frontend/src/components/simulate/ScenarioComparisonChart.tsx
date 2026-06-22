"use client";

import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useApp } from "@/context/AppContext";

export default function ScenarioComparisonChart() {
  const { simulation } = useApp();
  if (!simulation) return null;

  const data = simulation.results.map((r) => ({
    label: r.label,
    budget: Math.round(r.total_budget / 1000),
    p10: Math.round(r.revenue.p10 / 1000),
    p50: Math.round(r.revenue.p50 / 1000),
    p90: Math.round(r.revenue.p90 / 1000),
    roas: r.roas.p50,
  }));

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      <h3 className="text-base font-semibold text-gray-700 mb-4">Budget vs Revenue (P10/P50/P90)</h3>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis
            yAxisId="rev"
            orientation="left"
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => `$${v}K`}
          />
          <YAxis
            yAxisId="roas"
            orientation="right"
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => `${v}x`}
            domain={["auto", "auto"]}
          />
          <Tooltip
            formatter={(value, name) => {
              const v = Number(value);
              if (name === "roas") return [`${v.toFixed(2)}x`, "P50 ROAS"];
              return [`$${v}K`, String(name).toUpperCase()];
            }}
          />
          <Legend />
          {/* P10-P90 band via area trick: stacked area p10 transparent + (p90-p10) blue */}
          <Area
            yAxisId="rev"
            type="monotone"
            dataKey="p10"
            stackId="band"
            stroke="none"
            fill="transparent"
            legendType="none"
          />
          <Area
            yAxisId="rev"
            type="monotone"
            dataKey="p90"
            stackId="band"
            stroke="none"
            fill="#bfdbfe"
            fillOpacity={0.6}
            name="P90"
          />
          <Line
            yAxisId="rev"
            type="monotone"
            dataKey="p50"
            stroke="#2563eb"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "#2563eb" }}
            name="P50"
          />
          <Line
            yAxisId="roas"
            type="monotone"
            dataKey="roas"
            stroke="#f59e0b"
            strokeWidth={2}
            strokeDasharray="5 3"
            dot={{ r: 3, fill: "#f59e0b" }}
            name="roas"
          />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="text-xs text-gray-400 mt-2 text-center">Shaded area = P10–P90 uncertainty band · Dashed = P50 ROAS (right axis)</p>
    </div>
  );
}
