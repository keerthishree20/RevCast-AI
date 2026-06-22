"use client";

import { useApp } from "@/context/AppContext";
import ProbabilisticRangeBar from "./ProbabilisticRangeBar";

export default function ForecastSummaryCard() {
  const { forecast } = useApp();
  if (!forecast) return null;

  const { forecast: f, horizon_days, total_budget } = forecast;

  return (
    <div className="card overflow-hidden">
      {/* Gradient header */}
      <div className="gradient-brand px-6 py-5 text-white">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-blue-300 text-xs font-semibold uppercase tracking-widest mb-1">
              {horizon_days}-Day Revenue Forecast
            </p>
            <div className="text-4xl font-black tracking-tight">
              ${(f.revenue.p50 / 1000).toFixed(0)}
              <span className="text-2xl font-bold text-blue-300">K</span>
            </div>
            <p className="text-blue-200 text-sm mt-1">Expected P50 · Budget ${(total_budget / 1000).toFixed(0)}K</p>
          </div>
          <div className="text-right space-y-1">
            <Chip label={`P10: $${(f.revenue.p10 / 1000).toFixed(0)}K`} muted />
            <Chip label={`P50: $${(f.revenue.p50 / 1000).toFixed(0)}K`} />
            <Chip label={`P90: $${(f.revenue.p90 / 1000).toFixed(0)}K`} muted />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-5 space-y-4">
        <div>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Revenue Range</div>
          <ProbabilisticRangeBar values={f.revenue} />
        </div>
        <div>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">ROAS Range</div>
          <ProbabilisticRangeBar values={f.roas} prefix="" />
        </div>

        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-100">
          <Metric label="Conservative" sub="P10" value={`$${(f.revenue.p10 / 1000).toFixed(0)}K`} />
          <Metric label="Expected" sub="P50" value={`$${(f.revenue.p50 / 1000).toFixed(0)}K`} bold />
          <Metric label="Optimistic" sub="P90" value={`$${(f.revenue.p90 / 1000).toFixed(0)}K`} />
        </div>
      </div>
    </div>
  );
}

function Chip({ label, muted = false }: { label: string; muted?: boolean }) {
  return (
    <div className={`text-xs px-2 py-0.5 rounded-full text-right ${muted ? "text-blue-300/70" : "bg-white/20 text-white font-semibold"}`}>
      {label}
    </div>
  );
}

function Metric({ label, sub, value, bold = false }: { label: string; sub: string; value: string; bold?: boolean }) {
  return (
    <div className="text-center">
      <div className={`text-lg ${bold ? "font-black text-blue-700" : "font-semibold text-gray-700"}`}>{value}</div>
      <div className="text-xs font-semibold text-gray-500">{label}</div>
      <div className="text-xs text-gray-400">{sub}</div>
    </div>
  );
}
