"use client";

import type { P10P50P90 } from "@/lib/types";

interface Props {
  values: P10P50P90;
  min?: number;
  max?: number;
  prefix?: string;
  className?: string;
}

function fmt(n: number, prefix = "$") {
  if (n >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${prefix}${(n / 1_000).toFixed(0)}K`;
  return `${prefix}${n.toFixed(2)}`;
}

export default function ProbabilisticRangeBar({ values, min, max, prefix = "$", className = "" }: Props) {
  const lo = min ?? values.p10 * 0.85;
  const hi = max ?? values.p90 * 1.05;
  const range = hi - lo || 1;

  const leftPct = ((values.p10 - lo) / range) * 100;
  const widthPct = ((values.p90 - values.p10) / range) * 100;
  const dotPct = ((values.p50 - lo) / range) * 100;

  return (
    <div className={`w-full ${className}`}>
      <div className="relative h-3 bg-gray-100 rounded-full">
        {/* P10-P90 band */}
        <div
          className="absolute h-full bg-blue-200 rounded-full"
          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
        />
        {/* P50 dot */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-600 rounded-full border-2 border-white shadow"
          style={{ left: `calc(${dotPct}% - 6px)` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>{fmt(values.p10, prefix)} <span className="text-gray-400">P10</span></span>
        <span className="font-semibold text-gray-800">{fmt(values.p50, prefix)} <span className="text-gray-400">P50</span></span>
        <span>{fmt(values.p90, prefix)} <span className="text-gray-400">P90</span></span>
      </div>
    </div>
  );
}
