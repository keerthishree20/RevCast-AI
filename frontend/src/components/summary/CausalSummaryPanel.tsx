"use client";

import { useApp } from "@/context/AppContext";

const CONFIDENCE_COLORS = {
  high:   "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  low:    "bg-red-100 text-red-800",
};

export default function CausalSummaryPanel() {
  const { summary, generateSummary, loading, error } = useApp();

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-5">
      <div className="flex justify-between items-center">
        <h3 className="text-base font-semibold text-gray-800">AI Causal Summary</h3>
        <button
          onClick={generateSummary}
          disabled={loading}
          className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 disabled:opacity-40 transition-colors"
        >
          {loading ? "Generating…" : summary ? "Regenerate" : "Generate AI Summary"}
        </button>
      </div>

      {error && !summary && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>
      )}

      {!summary && !loading && (
        <div className="text-sm text-gray-400 text-center py-6">
          Click &quot;Generate AI Summary&quot; to get Claude&apos;s causal analysis of the forecast.
        </div>
      )}

      {loading && !summary && (
        <div className="text-sm text-gray-400 text-center py-6 animate-pulse">
          Claude is analyzing your forecast…
        </div>
      )}

      {summary && (
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CONFIDENCE_COLORS[summary.confidence]}`}>
              {summary.confidence.toUpperCase()} confidence
            </span>
            <span className="text-xs text-gray-400">via {summary.model_used}</span>
          </div>

          <div>
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Analysis</h4>
            <p className="text-sm text-gray-700 leading-relaxed">{summary.causal_summary}</p>
          </div>

          {summary.risk_factors.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Risk Factors</h4>
              <ul className="space-y-1.5">
                {summary.risk_factors.map((r, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-700">
                    <span className="text-orange-500 mt-0.5">⚠</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {summary.recommendations.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Recommendations</h4>
              <ul className="space-y-1.5">
                {summary.recommendations.map((r, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-700">
                    <span className="text-green-500 mt-0.5">→</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
