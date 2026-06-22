"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import ProbabilisticRangeBar from "./ProbabilisticRangeBar";
import ROASBadge from "./ROASBadge";

const CHANNEL_COLORS: Record<string, string> = {
  google: "bg-blue-100 text-blue-800",
  meta: "bg-indigo-100 text-indigo-800",
  microsoft: "bg-cyan-100 text-cyan-800",
};

export default function ChannelBreakdownTable() {
  const { forecast } = useApp();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (!forecast) return null;

  const revMax = Math.max(...forecast.channel_breakdown.map((c) => c.revenue.p90)) * 1.05;

  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold text-gray-700">Channel Breakdown</h3>
      {forecast.channel_breakdown.map((ch) => {
        const isOpen = expanded[ch.channel];
        return (
          <div key={ch.channel} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors text-left"
              onClick={() => setExpanded((e) => ({ ...e, [ch.channel]: !isOpen }))}
            >
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${CHANNEL_COLORS[ch.channel] ?? "bg-gray-100 text-gray-700"}`}>
                {ch.channel}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-700">
                    ${(ch.revenue.p50 / 1000).toFixed(0)}K
                  </span>
                  <ROASBadge value={ch.roas.p50} size="sm" />
                  <span className="text-xs text-gray-400">β={ch.elasticity} · R²={ch.model_r2.toFixed(2)}</span>
                </div>
                <ProbabilisticRangeBar values={ch.revenue} max={revMax} className="max-w-sm" />
              </div>
              <span className="text-gray-400 text-sm">{isOpen ? "▲" : "▼"}</span>
            </button>

            {isOpen && ch.campaign_type_breakdown.length > 0 && (
              <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 space-y-3">
                <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Campaign Types</div>
                {ch.campaign_type_breakdown.map((ct) => (
                  <div key={ct.campaign_type} className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 w-28 truncate font-medium">{ct.campaign_type}</span>
                    <span className="text-xs text-gray-400 w-10">{(ct.revenue_share * 100).toFixed(0)}%</span>
                    <div className="flex-1">
                      <ProbabilisticRangeBar values={ct.revenue} max={revMax} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
