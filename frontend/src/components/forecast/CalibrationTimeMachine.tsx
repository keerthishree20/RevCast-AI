"use client";

import { useState } from "react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useApp } from "@/context/AppContext";
import { apiCalibration } from "@/lib/api";
import type { CalibrationResponse } from "@/lib/types";

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

function HitDot(props: any) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return null;
  const hit = payload.hit;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={5}
      fill={hit ? "#16a34a" : "#dc2626"}
      stroke="white"
      strokeWidth={1.5}
    />
  );
}

export default function CalibrationTimeMachine() {
  const { sessionId, forecast } = useApp();
  const [result, setResult] = useState<CalibrationResponse | null>(null);
  const [activeChannel, setActiveChannel] = useState<string>("google");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!forecast || !sessionId) return null;

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiCalibration(sessionId!, 8);
      setResult(res);
      if (res.channels.length > 0) setActiveChannel(res.channels[0].channel);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Calibration backtest failed");
    } finally {
      setLoading(false);
    }
  }

  const channelResult = result?.channels.find((c) => c.channel === activeChannel);
  const chartData = channelResult?.weeks.map((w) => ({
    week: w.week.slice(5), // MM-DD
    p10: w.p10,
    band: w.p90 - w.p10,
    p50: w.p50,
    actual: w.actual,
    hit: w.hit,
  }));

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-800">Calibration Time Machine</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Holds out the last 8 weeks per channel, refits the model on everything before, and checks
            whether the actual revenue landed inside the predicted P10–P90 band — proof, not just a badge.
          </p>
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          {loading ? "Backtesting…" : result ? "Re-run" : "Run Calibration Check"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <>
          {/* Overall stat row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
              <p className="text-xs text-gray-400 mb-1">Overall Coverage</p>
              <p className="text-xl font-bold text-gray-800">{result.overall_coverage_pct}%</p>
              <p className="text-xs text-gray-400 mt-0.5">{result.hit_count}/{result.total_count} holdout weeks inside band</p>
            </div>
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
              <p className="text-xs text-blue-400 mb-1">Mean Absolute % Error</p>
              <p className="text-xl font-bold text-blue-700">{result.overall_mape_pct}%</p>
              <p className="text-xs text-blue-400 mt-0.5">P50 vs actual, across all holdout weeks</p>
            </div>
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
              <p className="text-xs text-gray-400 mb-1">Holdout Window</p>
              <p className="text-xl font-bold text-gray-800">{result.holdout_weeks} weeks</p>
              <p className="text-xs text-gray-400 mt-0.5">Most recent weeks, excluded from training</p>
            </div>
          </div>

          {/* Channel tabs */}
          <div className="flex gap-2">
            {result.channels.map((c) => (
              <button
                key={c.channel}
                onClick={() => setActiveChannel(c.channel)}
                className={`flex-1 rounded-lg border px-3 py-2 text-left transition-colors ${
                  activeChannel === c.channel ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <div className="text-sm font-semibold text-gray-700">{CHANNEL_LABELS[c.channel] ?? c.channel}</div>
                <div className="text-xs text-gray-400">{c.coverage_pct}% coverage · {c.mape_pct}% MAPE</div>
              </button>
            ))}
          </div>

          {/* Chart */}
          {chartData && chartData.length > 0 && (
            <div>
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => fmt(v)} />
                  <Tooltip
                    formatter={(value, name) => {
                      const v = Number(value);
                      if (name === "p50") return [fmt(v), "Predicted P50"];
                      if (name === "actual") return [fmt(v), "Actual"];
                      return [fmt(v), String(name)];
                    }}
                    labelFormatter={(label) => `Week of ${label}`}
                  />
                  <Area type="monotone" dataKey="p10" stackId="band" stroke="none" fill="transparent" isAnimationActive={false} />
                  <Area
                    type="monotone"
                    dataKey="band"
                    stackId="band"
                    stroke="none"
                    fill="#bfdbfe"
                    fillOpacity={0.6}
                    name="P10–P90 band"
                    isAnimationActive={false}
                  />
                  <Line type="monotone" dataKey="p50" stroke="#2563eb" strokeWidth={2} dot={false} name="p50" isAnimationActive={false} />
                  <Line type="monotone" dataKey="actual" stroke="none" dot={<HitDot />} activeDot={false} isAnimationActive={false} name="actual" />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-center gap-5 mt-2 text-xs text-gray-400">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-600 inline-block" /> Actual inside P10–P90</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-600 inline-block" /> Actual outside band (miss)</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-2.5 rounded bg-blue-200 inline-block" /> Predicted P10–P90 range</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
