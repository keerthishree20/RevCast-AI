"use client";

import { useApp } from "@/context/AppContext";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const CHANNEL_LABELS: Record<string, string> = {
  google: "Google",
  meta: "Meta",
  microsoft: "Microsoft",
};

function indexColor(idx: number): { bg: string; text: string } {
  if (idx >= 1.40) return { bg: "#14532d", text: "#dcfce7" };
  if (idx >= 1.20) return { bg: "#16a34a", text: "#f0fdf4" };
  if (idx >= 1.10) return { bg: "#4ade80", text: "#052e16" };
  if (idx >= 1.00) return { bg: "#bbf7d0", text: "#052e16" };
  if (idx >= 0.95) return { bg: "#f3f4f6", text: "#374151" };
  if (idx >= 0.88) return { bg: "#fef3c7", text: "#78350f" };
  if (idx >= 0.80) return { bg: "#fca5a5", text: "#450a0a" };
  return { bg: "#ef4444", text: "#fff" };
}

function indexLabel(idx: number): string {
  if (idx >= 1.20) return "Push";
  if (idx >= 1.05) return "↑";
  if (idx >= 0.95) return "–";
  if (idx >= 0.85) return "↓";
  return "Pull";
}

export default function SeasonalityHeatmap() {
  const { forecast } = useApp();
  if (!forecast) return null;

  const indices = forecast.seasonality_indices as Record<string, Record<string, number>>;
  const channels = Object.keys(indices).filter((ch) => ch in CHANNEL_LABELS);
  if (channels.length === 0) return null;

  const currentMonth = new Date().getMonth() + 1; // 1-indexed

  // Blended: unweighted average across channels per month
  const blended: number[] = Array.from({ length: 12 }, (_, i) => {
    const m = String(i + 1);
    const vals = channels.map((ch) => indices[ch][m] ?? 1.0);
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  });

  // Best 3 months to spend (by blended index)
  const ranked = blended
    .map((v, i) => ({ month: i + 1, idx: v }))
    .sort((a, b) => b.idx - a.idx);
  const topMonths = ranked.slice(0, 3).map((r) => MONTHS[r.month - 1]);
  const worstMonths = ranked.slice(-3).map((r) => MONTHS[r.month - 1]);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h3 className="text-base font-semibold text-gray-800">Seasonality Heatmap</h3>
          <p className="text-xs text-gray-400 mt-0.5">Monthly revenue indices derived from historical data — higher = more revenue per $ spent</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: "#16a34a" }} /> High</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: "#f3f4f6", border: "1px solid #e5e7eb" }} /> Neutral</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: "#fca5a5" }} /> Low</span>
        </div>
      </div>

      {/* Heatmap grid */}
      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-xs border-separate" style={{ borderSpacing: "3px" }}>
          <thead>
            <tr>
              <th className="text-left text-gray-400 font-normal w-20 pb-1" />
              {MONTHS.map((m, i) => (
                <th
                  key={m}
                  className={`text-center font-medium pb-1 ${i + 1 === currentMonth ? "text-blue-600" : "text-gray-400"}`}
                >
                  {m}
                  {i + 1 === currentMonth && <span className="block w-1 h-1 bg-blue-500 rounded-full mx-auto mt-0.5" />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {channels.map((ch) => (
              <tr key={ch}>
                <td className="text-gray-600 font-medium pr-2 py-0.5 whitespace-nowrap">{CHANNEL_LABELS[ch]}</td>
                {Array.from({ length: 12 }, (_, i) => {
                  const idx = indices[ch][String(i + 1)] ?? 1.0;
                  const { bg, text } = indexColor(idx);
                  const isCurrent = i + 1 === currentMonth;
                  return (
                    <td key={i} className="text-center">
                      <div
                        className={`rounded-md py-1.5 px-0.5 transition-transform hover:scale-105 cursor-default ${isCurrent ? "ring-2 ring-blue-400 ring-offset-1" : ""}`}
                        style={{ background: bg, color: text, minWidth: "40px" }}
                        title={`${CHANNEL_LABELS[ch]} ${MONTHS[i]}: ${idx.toFixed(2)}×`}
                      >
                        <div className="font-semibold">{idx.toFixed(2)}</div>
                        <div style={{ fontSize: "9px", opacity: 0.8 }}>{indexLabel(idx)}</div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* Blended row */}
            <tr>
              <td className="text-gray-500 font-semibold pr-2 py-0.5 pt-2 whitespace-nowrap border-t border-gray-100">Blended</td>
              {blended.map((idx, i) => {
                const { bg, text } = indexColor(idx);
                const isCurrent = i + 1 === currentMonth;
                return (
                  <td key={i} className="pt-2">
                    <div
                      className={`rounded-md py-1.5 px-0.5 transition-transform hover:scale-105 cursor-default ${isCurrent ? "ring-2 ring-blue-400 ring-offset-1" : ""}`}
                      style={{ background: bg, color: text, minWidth: "40px" }}
                      title={`Blended ${MONTHS[i]}: ${idx.toFixed(2)}×`}
                    >
                      <div className="font-semibold text-center">{idx.toFixed(2)}</div>
                      <div className="text-center" style={{ fontSize: "9px", opacity: 0.8 }}>{indexLabel(idx)}</div>
                    </div>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Insights strip */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-green-50 border border-green-100 px-4 py-3">
          <p className="text-xs font-semibold text-green-700 mb-1">Best months to push spend</p>
          <p className="text-sm font-bold text-green-800">{topMonths.join(" · ")}</p>
          <p className="text-xs text-green-600 mt-0.5">Demand is seasonally elevated — every $ goes further</p>
        </div>
        <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
          <p className="text-xs font-semibold text-amber-700 mb-1">Consider pulling back spend</p>
          <p className="text-sm font-bold text-amber-800">{worstMonths.join(" · ")}</p>
          <p className="text-xs text-amber-600 mt-0.5">Seasonal headwind — reallocate to higher-index months</p>
        </div>
      </div>
    </div>
  );
}
