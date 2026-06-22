"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  Tooltip,
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

export default function ChannelRadarChart() {
  const { forecast } = useApp();
  if (!forecast) return null;

  const channels = forecast.channel_breakdown;
  if (channels.length === 0) return null;

  const maxElasticity = Math.max(...channels.map((c) => c.elasticity), 0.01);
  const maxRoas = Math.max(...channels.map((c) => c.roas.p50), 0.01);
  const totalRevenue = channels.reduce((s, c) => s + c.revenue.p50, 0);
  const maxEfficiency = Math.max(
    ...channels.map((c) => c.revenue.p50 / (c.budget || 1)),
    0.01
  );

  // Confidence = 1 - (p90-p10)/p50 — lower spread = higher confidence
  const spreads = channels.map((c) =>
    c.revenue.p50 > 0
      ? (c.revenue.p90 - c.revenue.p10) / c.revenue.p50
      : 1
  );
  const maxSpread = Math.max(...spreads, 0.01);

  const dimensions = [
    "Elasticity",
    "Model Fit (R²)",
    "ROAS",
    "Revenue Share",
    "Precision",
  ];

  const data = dimensions.map((dim, i) => {
    const entry: Record<string, string | number> = { dimension: dim };
    channels.forEach((ch) => {
      let val = 0;
      switch (i) {
        case 0: // Elasticity
          val = (ch.elasticity / maxElasticity) * 100;
          break;
        case 1: // R²
          val = ch.model_r2 * 100;
          break;
        case 2: // ROAS
          val = (ch.roas.p50 / maxRoas) * 100;
          break;
        case 3: // Revenue share
          val = totalRevenue > 0
            ? (ch.revenue.p50 / totalRevenue) * 100
            : 0;
          break;
        case 4: {
          // Precision (inverse of spread)
          const spread =
            ch.revenue.p50 > 0
              ? (ch.revenue.p90 - ch.revenue.p10) / ch.revenue.p50
              : 1;
          val = ((1 - spread / maxSpread) * 0.8 + 0.2) * 100;
          break;
        }
      }
      entry[ch.channel] = Math.round(Math.min(val, 100));
    });
    return entry;
  });

  // Summary cards: find best in each dimension
  const bestElasticity = channels.reduce((a, b) =>
    a.elasticity > b.elasticity ? a : b
  );
  const bestRoas = channels.reduce((a, b) =>
    a.roas.p50 > b.roas.p50 ? a : b
  );
  const bestFit = channels.reduce((a, b) =>
    a.model_r2 > b.model_r2 ? a : b
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-5">
      <div>
        <h3 className="text-base font-semibold text-gray-800">
          Channel Comparison Radar
        </h3>
        <p className="text-xs text-gray-400 mt-0.5">
          Multi-dimensional comparison across 5 performance metrics — larger
          area = stronger channel
        </p>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{ fontSize: 11, fill: "#6b7280" }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fontSize: 9, fill: "#9ca3af" }}
            tickCount={5}
          />
          <Tooltip
            formatter={(value, name) => [
              `${value}/100`,
              CHANNEL_LABELS[String(name)] ?? name,
            ]}
          />
          <Legend
            verticalAlign="bottom"
            formatter={(value) => CHANNEL_LABELS[value] ?? value}
          />
          {channels.map((ch) => (
            <Radar
              key={ch.channel}
              name={ch.channel}
              dataKey={ch.channel}
              stroke={CHANNEL_COLORS[ch.channel] ?? "#6b7280"}
              fill={CHANNEL_COLORS[ch.channel] ?? "#6b7280"}
              fillOpacity={0.15}
              strokeWidth={2}
              isAnimationActive={false}
            />
          ))}
        </RadarChart>
      </ResponsiveContainer>

      {/* Quick wins */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">
          <p className="text-xs text-blue-400 mb-0.5">Highest Elasticity</p>
          <p className="text-sm font-bold text-blue-700">
            {CHANNEL_LABELS[bestElasticity.channel]}
          </p>
          <p className="text-xs text-blue-400">
            Beta: {bestElasticity.elasticity}
          </p>
        </div>
        <div className="rounded-xl bg-green-50 border border-green-100 p-3">
          <p className="text-xs text-green-500 mb-0.5">Best ROAS</p>
          <p className="text-sm font-bold text-green-700">
            {CHANNEL_LABELS[bestRoas.channel]}
          </p>
          <p className="text-xs text-green-500">
            {bestRoas.roas.p50.toFixed(2)}x
          </p>
        </div>
        <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
          <p className="text-xs text-gray-400 mb-0.5">Best Model Fit</p>
          <p className="text-sm font-bold text-gray-800">
            {CHANNEL_LABELS[bestFit.channel]}
          </p>
          <p className="text-xs text-gray-400">
            R² = {bestFit.model_r2.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}
