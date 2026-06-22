"use client";

import { useApp } from "@/context/AppContext";
import type { HorizonDays } from "@/lib/types";

const OPTIONS: { value: HorizonDays; label: string }[] = [
  { value: 30, label: "30 Days" },
  { value: 60, label: "60 Days" },
  { value: 90, label: "90 Days" },
];

export default function HorizonSelector() {
  const { horizon, setHorizon } = useApp();

  return (
    <div>
      <div className="text-sm font-medium text-gray-700 mb-2">Forecast Horizon</div>
      <div className="flex gap-2">
        {OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setHorizon(value)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
              horizon === value
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
