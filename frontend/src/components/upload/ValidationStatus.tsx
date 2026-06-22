"use client";

import { useApp } from "@/context/AppContext";

export default function ValidationStatus() {
  const { ingest, validation } = useApp();
  if (!ingest || !validation) return null;

  const s = ingest.summary;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Date Range" value={`${s.date_range_start} → ${s.date_range_end}`} />
        <Stat label="Weeks" value={s.weeks_available.toString()} />
        <Stat label="Total Spend" value={`$${(s.overall_spend / 1000).toFixed(0)}K`} />
        <Stat label="Blended ROAS" value={`${s.overall_roas.toFixed(2)}x`} highlight />
      </div>

      <div className="space-y-2">
        {validation.checks.map((c) => (
          <div
            key={c.name}
            className={`flex items-start gap-3 p-3 rounded-lg text-sm ${
              c.passed ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
            }`}
          >
            <span className="text-base mt-0.5">{c.passed ? "✅" : "❌"}</span>
            <div>
              <span className="font-medium capitalize">{c.name.replace(/_/g, " ")}</span>
              <span className="text-gray-600 ml-2">{c.message}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`font-semibold text-sm ${highlight ? "text-blue-700" : "text-gray-800"}`}>{value}</div>
    </div>
  );
}
