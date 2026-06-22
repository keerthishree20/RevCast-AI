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
import { apiOptimize } from "@/lib/api";
import type { OptimizeResponse } from "@/lib/types";

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

function pct(n: number, sign = true) {
  return `${sign && n > 0 ? "+" : ""}${n.toFixed(1)}%`;
}

export default function BudgetOptimizerPanel() {
  const { sessionId, forecast, budget, horizon } = useApp();
  const [mode, setMode] = useState<"minimize_cost" | "maximize_revenue">("maximize_revenue");
  const [targetRevenue, setTargetRevenue] = useState<string>("");
  const [totalBudget, setTotalBudget] = useState<string>("");
  const [result, setResult] = useState<OptimizeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!forecast || !sessionId) return null;

  const currentTotal = budget.google + budget.meta + budget.microsoft;
  const currentP50 = forecast.forecast.revenue.p50;

  // Sensible defaults: maximize with current budget, minimize with 120% of current P50
  const defaultTarget = Math.round(currentP50 * 1.2);
  const defaultBudget = currentTotal;

  async function run() {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const params =
        mode === "minimize_cost"
          ? { target_revenue: Number(targetRevenue) || defaultTarget }
          : { total_budget: Number(totalBudget) || defaultBudget };
      const res = await apiOptimize(sessionId, mode, horizon, params);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Optimization failed");
    } finally {
      setLoading(false);
    }
  }

  // Chart: mark current budget on frontier
  const frontierData = result?.efficient_frontier.map((pt) => ({
    budget: Math.round(pt.budget / 1000),
    revenue: Math.round(pt.revenue_p50 / 1000),
    roas: pt.roas,
  }));
  const currentBudgetK = Math.round(currentTotal / 1000);
  const optBudgetK = result ? Math.round(result.total_budget / 1000) : null;
  const optRevK = result ? Math.round(result.expected_revenue.p50 / 1000) : null;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-800">Budget Optimizer</h3>
          <p className="text-xs text-gray-400 mt-0.5">Uses fitted elasticity models to find the optimal channel allocation</p>
        </div>
        {/* Mode toggle */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
          <button
            onClick={() => { setMode("maximize_revenue"); setResult(null); }}
            className={`px-4 py-2 font-medium transition-colors ${mode === "maximize_revenue" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}
          >
            Maximize Revenue
          </button>
          <button
            onClick={() => { setMode("minimize_cost"); setResult(null); }}
            className={`px-4 py-2 font-medium transition-colors ${mode === "minimize_cost" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}
          >
            Minimize Cost
          </button>
        </div>
      </div>

      {/* Input area */}
      <div className="flex items-end gap-4">
        {mode === "maximize_revenue" ? (
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1.5">
              Total Budget to Allocate
            </label>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 border border-r-0 border-gray-200 rounded-l-lg px-3 py-2 bg-gray-50">$</span>
              <input
                type="number"
                value={totalBudget}
                onChange={(e) => setTotalBudget(e.target.value)}
                placeholder={String(defaultBudget)}
                className="flex-1 border border-gray-200 rounded-r-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Current: {fmt(currentTotal)} — enter a different amount to explore alternatives</p>
          </div>
        ) : (
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1.5">
              Revenue Target (P50)
            </label>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 border border-r-0 border-gray-200 rounded-l-lg px-3 py-2 bg-gray-50">$</span>
              <input
                type="number"
                value={targetRevenue}
                onChange={(e) => setTargetRevenue(e.target.value)}
                placeholder={String(defaultTarget)}
                className="flex-1 border border-gray-200 rounded-r-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Current P50 forecast: {fmt(currentP50)} — what revenue do you want to hit?</p>
          </div>
        )}
        <button
          onClick={run}
          disabled={loading}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          {loading ? "Optimizing…" : "Run Optimizer"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <>
          {/* Status banner */}
          <div className={`rounded-lg px-4 py-3 text-sm border ${result.feasible ? "bg-green-50 border-green-200 text-green-800" : "bg-amber-50 border-amber-200 text-amber-800"}`}>
            {result.feasible ? "✓" : "⚠"} {result.message}
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
              <p className="text-xs text-gray-400 mb-1">Optimal Budget</p>
              <p className="text-xl font-bold text-gray-800">{fmt(result.total_budget)}</p>
              <p className={`text-xs mt-0.5 font-medium ${result.vs_current.budget_delta_pct < 0 ? "text-green-600" : result.vs_current.budget_delta_pct > 0 ? "text-amber-600" : "text-gray-400"}`}>
                {result.vs_current.budget_delta_pct === 0 ? "Same as current" : pct(result.vs_current.budget_delta_pct) + " vs current"}
              </p>
            </div>
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
              <p className="text-xs text-blue-400 mb-1">Expected Revenue P50</p>
              <p className="text-xl font-bold text-blue-700">{fmt(result.expected_revenue.p50)}</p>
              <p className={`text-xs mt-0.5 font-medium ${result.vs_current.revenue_p50_delta_pct > 0 ? "text-green-600" : "text-red-500"}`}>
                {pct(result.vs_current.revenue_p50_delta_pct)} vs current P50
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
              <p className="text-xs text-gray-400 mb-1">Expected ROAS P50</p>
              <p className="text-xl font-bold text-gray-800">{result.expected_roas.p50.toFixed(2)}x</p>
              <p className="text-xs text-gray-400 mt-0.5">
                P10: {result.expected_roas.p10.toFixed(2)}x — P90: {result.expected_roas.p90.toFixed(2)}x
              </p>
            </div>
          </div>

          {/* Optimal allocation table */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Optimal Channel Allocation</h4>
            <div className="space-y-2">
              {(["google", "meta", "microsoft"] as const).map((ch) => {
                const spend = result.optimal_allocation[ch];
                const pctShare = result.total_budget > 0 ? (spend / result.total_budget) * 100 : 0;
                const currentSpend = budget[ch];
                const delta = spend - currentSpend;
                return (
                  <div key={ch} className="flex items-center gap-3">
                    <div className="w-20 text-xs font-medium text-gray-600">{CHANNEL_LABELS[ch]}</div>
                    <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pctShare}%`, backgroundColor: CHANNEL_COLORS[ch] }}
                      />
                    </div>
                    <div className="w-20 text-right text-sm font-semibold text-gray-700">{fmt(spend)}</div>
                    <div className="w-14 text-right text-xs text-gray-400">{pctShare.toFixed(0)}%</div>
                    <div className={`w-20 text-right text-xs font-medium ${delta > 0 ? "text-amber-600" : delta < 0 ? "text-green-600" : "text-gray-400"}`}>
                      {delta > 100 ? `+${fmt(delta)}` : delta < -100 ? fmt(delta) : "unchanged"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Efficient frontier chart */}
          {frontierData && frontierData.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-1">Efficient Frontier</h4>
              <p className="text-xs text-gray-400 mb-3">Maximum achievable revenue at each budget level</p>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={frontierData} margin={{ top: 10, right: 24, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="budget"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `$${v}K`}
                    label={{ value: "Budget", position: "insideBottom", offset: -2, fontSize: 11, fill: "#9ca3af" }}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `$${v}K`}
                  />
                  <Tooltip
                    formatter={(value, name) => {
                      const v = Number(value);
                      if (name === "Revenue P50") return [`$${v}K`, "Revenue P50"];
                      return [`$${v}K`, String(name)];
                    }}
                    labelFormatter={(label) => `Budget: $${label}K`}
                  />
                  <Legend verticalAlign="top" height={28} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue P50"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                  {/* Mark current budget */}
                  <ReferenceDot
                    x={currentBudgetK}
                    y={Math.round(currentP50 / 1000)}
                    r={6}
                    fill="#6b7280"
                    stroke="white"
                    strokeWidth={2}
                    label={{ value: "Current", position: "top", fontSize: 10, fill: "#6b7280" }}
                  />
                  {/* Mark optimal point */}
                  {optBudgetK !== null && optRevK !== null && (
                    <ReferenceDot
                      x={optBudgetK}
                      y={optRevK}
                      r={6}
                      fill="#16a34a"
                      stroke="white"
                      strokeWidth={2}
                      label={{ value: "Optimal", position: "top", fontSize: 10, fill: "#16a34a" }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}
