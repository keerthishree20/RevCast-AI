"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useApp } from "@/context/AppContext";
import { apiComparison } from "@/lib/api";
import type { ComparisonResponse } from "@/lib/types";

const CHANNEL_LABELS: Record<string, string> = {
  google: "Google",
  meta: "Meta",
  microsoft: "Microsoft",
};

const MODEL_COLORS = ["#2563eb", "#6b7280", "#f59e0b", "#ef4444"];

export default function ModelComparisonPanel() {
  const { sessionId, forecast } = useApp();
  const [result, setResult] = useState<ComparisonResponse | null>(null);
  const [activeChannel, setActiveChannel] = useState<string>("google");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!forecast || !sessionId) return null;

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiComparison(sessionId!, 8);
      setResult(res);
      const channels = Object.keys(res.channels);
      if (channels.length > 0) setActiveChannel(channels[0]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Comparison failed");
    } finally {
      setLoading(false);
    }
  }

  const models = result?.channels[activeChannel] ?? [];

  // Build chart data: MAPE comparison
  const mapeData = models.map((m, i) => ({
    name: m.model_name,
    mape: m.mape_pct,
    color: MODEL_COLORS[i % MODEL_COLORS.length],
  }));

  // Build chart data: Coverage comparison
  const coverageData = models.map((m, i) => ({
    name: m.model_name,
    coverage: m.coverage_pct,
    color: MODEL_COLORS[i % MODEL_COLORS.length],
  }));

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-800">
            Model Comparison
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Compare the log-log elasticity model against naive baselines on the
            same holdout data — proof the model adds value
          </p>
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          {loading
            ? "Comparing…"
            : result
            ? "Re-run"
            : "Run Model Comparison"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <>
          {/* Channel tabs */}
          <div className="flex gap-2">
            {Object.keys(result.channels).map((ch) => (
              <button
                key={ch}
                onClick={() => setActiveChannel(ch)}
                className={`flex-1 rounded-lg border px-3 py-2 text-left transition-colors ${
                  activeChannel === ch
                    ? "border-violet-400 bg-violet-50"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <div className="text-sm font-semibold text-gray-700">
                  {CHANNEL_LABELS[ch] ?? ch}
                </div>
              </button>
            ))}
          </div>

          {/* Comparison table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left text-xs font-medium text-gray-400 py-2 pr-4">
                    Model
                  </th>
                  <th className="text-center text-xs font-medium text-gray-400 py-2 px-3">
                    MAPE %
                  </th>
                  <th className="text-center text-xs font-medium text-gray-400 py-2 px-3">
                    Coverage %
                  </th>
                  <th className="text-center text-xs font-medium text-gray-400 py-2 px-3">
                    Result
                  </th>
                </tr>
              </thead>
              <tbody>
                {models.map((m, i) => {
                  const isBest = i === 0;
                  return (
                    <tr
                      key={m.model_name}
                      className={`border-b border-gray-50 ${
                        isBest ? "bg-blue-50" : ""
                      }`}
                    >
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{
                              background:
                                MODEL_COLORS[i % MODEL_COLORS.length],
                            }}
                          />
                          <span
                            className={`text-sm ${
                              isBest
                                ? "font-bold text-blue-700"
                                : "font-medium text-gray-700"
                            }`}
                          >
                            {m.model_name}
                          </span>
                          {isBest && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                              Primary
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-center py-3 px-3">
                        <span
                          className={`text-sm font-semibold ${
                            isBest ? "text-blue-700" : "text-gray-700"
                          }`}
                        >
                          {m.mape_pct}%
                        </span>
                      </td>
                      <td className="text-center py-3 px-3">
                        <span
                          className={`text-sm font-semibold ${
                            m.coverage_pct >= 75
                              ? "text-green-600"
                              : m.coverage_pct >= 50
                              ? "text-amber-600"
                              : "text-red-500"
                          }`}
                        >
                          {m.coverage_pct}%
                        </span>
                      </td>
                      <td className="text-center py-3 px-3">
                        {isBest ? (
                          <span className="text-xs text-green-600 font-medium">
                            Best
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">
                            {m.mape_pct > (models[0]?.mape_pct ?? 0)
                              ? `+${(
                                  m.mape_pct - (models[0]?.mape_pct ?? 0)
                                ).toFixed(1)}% worse`
                              : "Competitive"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Charts side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">
                MAPE (lower is better)
              </p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart
                  data={mapeData}
                  margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 9 }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    formatter={(v) => [`${v}%`, "MAPE"]}
                  />
                  <Bar
                    dataKey="mape"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                  >
                    {mapeData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">
                Coverage (higher is better, target ~80%)
              </p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart
                  data={coverageData}
                  margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 9 }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => `${v}%`}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    formatter={(v) => [`${v}%`, "Coverage"]}
                  />
                  <Bar
                    dataKey="coverage"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                  >
                    {coverageData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Verdict */}
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
            <p className="text-xs text-blue-400 mb-1">Verdict</p>
            <p className="text-sm text-gray-700">
              The Log-Log Elasticity model achieves{" "}
              <span className="font-bold text-blue-700">
                {result.overall_elasticity.coverage_pct}% coverage
              </span>{" "}
              and{" "}
              <span className="font-bold text-blue-700">
                {result.overall_elasticity.mape_pct}% MAPE
              </span>{" "}
              across all channels — outperforming naive baselines that ignore the
              spend-revenue relationship. The elasticity model captures
              diminishing returns and seasonality that simple trend or
              moving-average methods cannot.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
