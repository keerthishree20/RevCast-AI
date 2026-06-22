"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { useApp } from "@/context/AppContext";

const CHANNEL_COLORS: Record<string, string> = {
  google: "#4285F4",
  meta: "#0866FF",
  microsoft: "#00A4EF",
  total: "#16a34a",
};

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export default function RevenueWaterfall() {
  const { forecast } = useApp();
  if (!forecast) return null;

  const channels = forecast.channel_breakdown;
  if (channels.length === 0) return null;

  const totalP50 = forecast.forecast.revenue.p50;

  // Build waterfall data
  // Each bar: invisible base + visible segment
  let cumulative = 0;
  const waterfallData = channels.map((ch) => {
    const base = cumulative;
    const value = ch.revenue.p50;
    cumulative += value;
    const pct = totalP50 > 0 ? (value / totalP50) * 100 : 0;
    return {
      name: ch.channel.charAt(0).toUpperCase() + ch.channel.slice(1),
      channel: ch.channel,
      base,
      value,
      pct,
      isTotal: false,
    };
  });

  // Add total bar
  waterfallData.push({
    name: "Total",
    channel: "total",
    base: 0,
    value: totalP50,
    pct: 100,
    isTotal: true,
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-5">
      <div>
        <h3 className="text-base font-semibold text-gray-800">
          Revenue Attribution Waterfall
        </h3>
        <p className="text-xs text-gray-400 mt-0.5">
          How each ad channel contributes to the total P50 forecast revenue
        </p>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={waterfallData}
          margin={{ top: 20, right: 20, left: 10, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => fmt(v)}
          />
          <Tooltip
            formatter={(value, name) => {
              if (name === "base") return [null, null];
              return [fmt(Number(value)), "Revenue P50"];
            }}
            labelFormatter={(label) => String(label)}
            content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) return null;
              const item = payload.find((p) => p.dataKey === "value");
              if (!item) return null;
              const entry = item.payload;
              return (
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
                  <p className="font-semibold text-gray-700">{label}</p>
                  <p className="text-gray-500">Revenue: {fmt(entry.value)}</p>
                  <p className="text-gray-400">{entry.pct.toFixed(1)}% of total</p>
                </div>
              );
            }}
          />
          <ReferenceLine y={0} stroke="#e5e7eb" />
          {/* Invisible base */}
          <Bar dataKey="base" stackId="waterfall" fill="transparent" isAnimationActive={false} />
          {/* Visible segment */}
          <Bar dataKey="value" stackId="waterfall" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {waterfallData.map((entry) => (
              <Cell
                key={entry.channel}
                fill={CHANNEL_COLORS[entry.channel] ?? "#6b7280"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Channel contribution pills */}
      <div className="flex items-center justify-center gap-4 flex-wrap">
        {channels.map((ch) => {
          const share = totalP50 > 0 ? (ch.revenue.p50 / totalP50) * 100 : 0;
          return (
            <div
              key={ch.channel}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 text-xs"
            >
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: CHANNEL_COLORS[ch.channel] }}
              />
              <span className="font-medium text-gray-700 capitalize">
                {ch.channel}
              </span>
              <span className="text-gray-400">{fmt(ch.revenue.p50)}</span>
              <span className="font-semibold text-gray-600">
                {share.toFixed(0)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
