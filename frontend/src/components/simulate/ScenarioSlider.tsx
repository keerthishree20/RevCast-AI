"use client";

import { useApp } from "@/context/AppContext";
import ROASBadge from "@/components/forecast/ROASBadge";

export default function ScenarioSlider() {
  const { simulation } = useApp();
  if (!simulation) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-base font-semibold text-gray-700 mb-3">Scenario Comparison</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 uppercase tracking-wide">
              <th className="text-left py-2 pr-4">Scenario</th>
              <th className="text-right py-2 px-3">Budget</th>
              <th className="text-right py-2 px-3">P10 Rev</th>
              <th className="text-right py-2 px-3">P50 Rev</th>
              <th className="text-right py-2 px-3">P90 Rev</th>
              <th className="text-right py-2 px-3">ROAS P50</th>
              <th className="text-right py-2 pl-3">Marginal ROAS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {simulation.results.map((r) => (
              <tr key={r.label} className={r.label === "Base" ? "bg-blue-50" : ""}>
                <td className="py-2.5 pr-4 font-medium text-gray-700">{r.label}</td>
                <td className="py-2.5 px-3 text-right text-gray-600">${(r.total_budget / 1000).toFixed(0)}K</td>
                <td className="py-2.5 px-3 text-right text-gray-500">${(r.revenue.p10 / 1000).toFixed(0)}K</td>
                <td className="py-2.5 px-3 text-right font-semibold text-gray-800">${(r.revenue.p50 / 1000).toFixed(0)}K</td>
                <td className="py-2.5 px-3 text-right text-gray-500">${(r.revenue.p90 / 1000).toFixed(0)}K</td>
                <td className="py-2.5 px-3 text-right">
                  <ROASBadge value={r.roas.p50} size="sm" />
                </td>
                <td className="py-2.5 pl-3 text-right text-gray-500">
                  {r.marginal_roas != null ? `${r.marginal_roas.toFixed(2)}x` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
