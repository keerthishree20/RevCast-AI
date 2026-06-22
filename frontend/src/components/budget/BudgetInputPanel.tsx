"use client";

import { useApp } from "@/context/AppContext";

const CHANNELS = [
  { key: "google" as const, label: "Google Ads", color: "bg-blue-500" },
  { key: "meta" as const, label: "Meta Ads", color: "bg-indigo-500" },
  { key: "microsoft" as const, label: "Microsoft Ads", color: "bg-cyan-500" },
];

export default function BudgetInputPanel() {
  const { budget, setBudget } = useApp();

  const total = budget.google + budget.meta + budget.microsoft;

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-500 mb-2">
        Set your planned ad spend for the forecast period. Pre-filled from historical averages.
      </div>

      {CHANNELS.map(({ key, label, color }) => {
        const share = total > 0 ? ((budget[key] / total) * 100).toFixed(0) : "0";
        return (
          <div key={key}>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-gray-700 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${color}`} />
                {label}
              </span>
              <span className="text-gray-400">{share}% of total</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-gray-500 text-sm w-3">$</span>
              <input
                type="number"
                min={0}
                step={1000}
                value={budget[key]}
                onChange={(e) => setBudget({ ...budget, [key]: Math.max(0, Number(e.target.value)) })}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>
        );
      })}

      <div className="pt-3 border-t border-gray-100 flex justify-between text-sm font-semibold text-gray-700">
        <span>Total Budget</span>
        <span>${total.toLocaleString()}</span>
      </div>
    </div>
  );
}
