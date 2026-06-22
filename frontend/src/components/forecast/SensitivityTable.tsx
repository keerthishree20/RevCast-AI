"use client";

import { useApp } from "@/context/AppContext";

const CHANNEL_LABELS: Record<string, string> = {
  google: "Google",
  meta: "Meta",
  microsoft: "Microsoft",
};

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

const SCENARIOS = [
  { label: "-20%", mult: 0.8 },
  { label: "-10%", mult: 0.9 },
  { label: "Current", mult: 1.0 },
  { label: "+10%", mult: 1.1 },
  { label: "+20%", mult: 1.2 },
];

export default function SensitivityTable() {
  const { forecast } = useApp();
  if (!forecast) return null;

  const channels = forecast.channel_breakdown;
  if (channels.length === 0) return null;

  // For each channel, compute approximate revenue at different spend levels
  // Using: rev = exp(alpha + beta * log(spend))
  // Where alpha = log(rev_p50) - beta * log(budget)
  const channelData = channels.map((ch) => {
    const beta = ch.elasticity;
    const alpha = Math.log(ch.revenue.p50) - beta * Math.log(ch.budget);

    const scenarios = SCENARIOS.map((s) => {
      const newSpend = ch.budget * s.mult;
      const newRev = Math.exp(alpha + beta * Math.log(newSpend));
      const revDelta = newRev - ch.revenue.p50;
      const revDeltaPct =
        ch.revenue.p50 > 0
          ? ((newRev - ch.revenue.p50) / ch.revenue.p50) * 100
          : 0;
      return {
        ...s,
        spend: newSpend,
        revenue: newRev,
        revDelta,
        revDeltaPct,
        roas: newRev / newSpend,
      };
    });

    return { channel: ch.channel, beta, scenarios };
  });

  // Total row
  const totalScenarios = SCENARIOS.map((s, si) => {
    const totalSpend = channelData.reduce(
      (sum, c) => sum + c.scenarios[si].spend,
      0
    );
    const totalRev = channelData.reduce(
      (sum, c) => sum + c.scenarios[si].revenue,
      0
    );
    const baseRev = forecast.forecast.revenue.p50;
    return {
      ...s,
      spend: totalSpend,
      revenue: totalRev,
      revDelta: totalRev - baseRev,
      revDeltaPct: baseRev > 0 ? ((totalRev - baseRev) / baseRev) * 100 : 0,
      roas: totalRev / totalSpend,
    };
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-5">
      <div>
        <h3 className="text-base font-semibold text-gray-800">
          What-If Sensitivity Analysis
        </h3>
        <p className="text-xs text-gray-400 mt-0.5">
          How revenue changes when spend moves +/-10–20% across all channels simultaneously
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left text-xs font-medium text-gray-400 py-2 pr-4">
                Channel
              </th>
              {SCENARIOS.map((s) => (
                <th
                  key={s.label}
                  className={`text-center text-xs font-medium py-2 px-2 ${
                    s.mult === 1.0
                      ? "text-blue-600 bg-blue-50 rounded-t-lg"
                      : "text-gray-400"
                  }`}
                >
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {channelData.map((cd) => (
              <tr key={cd.channel} className="border-b border-gray-50">
                <td className="py-3 pr-4">
                  <div className="text-sm font-medium text-gray-700 capitalize">
                    {CHANNEL_LABELS[cd.channel]}
                  </div>
                  <div className="text-xs text-gray-400">
                    Beta: {cd.beta}
                  </div>
                </td>
                {cd.scenarios.map((s) => (
                  <td key={s.label} className={`text-center py-3 px-2 ${s.mult === 1.0 ? "bg-blue-50" : ""}`}>
                    <div className="text-sm font-semibold text-gray-700">
                      {fmt(s.revenue)}
                    </div>
                    <div
                      className={`text-xs font-medium ${
                        s.revDeltaPct > 0
                          ? "text-green-600"
                          : s.revDeltaPct < 0
                          ? "text-red-500"
                          : "text-gray-400"
                      }`}
                    >
                      {s.mult === 1.0
                        ? "baseline"
                        : `${s.revDeltaPct > 0 ? "+" : ""}${s.revDeltaPct.toFixed(1)}%`}
                    </div>
                  </td>
                ))}
              </tr>
            ))}

            {/* Total row */}
            <tr className="border-t-2 border-gray-200">
              <td className="py-3 pr-4">
                <div className="text-sm font-bold text-gray-800">Total</div>
              </td>
              {totalScenarios.map((s) => (
                <td key={s.label} className={`text-center py-3 px-2 ${s.mult === 1.0 ? "bg-blue-50" : ""}`}>
                  <div className="text-sm font-bold text-gray-800">
                    {fmt(s.revenue)}
                  </div>
                  <div
                    className={`text-xs font-semibold ${
                      s.revDeltaPct > 0
                        ? "text-green-600"
                        : s.revDeltaPct < 0
                        ? "text-red-500"
                        : "text-gray-400"
                    }`}
                  >
                    {s.mult === 1.0
                      ? "baseline"
                      : `${s.revDeltaPct > 0 ? "+" : ""}${s.revDeltaPct.toFixed(1)}%`}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {s.roas.toFixed(2)}x ROAS
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Key takeaway */}
      {(() => {
        const plusTen = totalScenarios.find((s) => s.mult === 1.1);
        const minusTen = totalScenarios.find((s) => s.mult === 0.9);
        if (!plusTen || !minusTen) return null;
        return (
          <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
            <p className="text-xs text-gray-400 mb-1">Key Takeaway</p>
            <p className="text-sm text-gray-700">
              A <span className="font-semibold text-green-600">+10% spend increase</span> yields{" "}
              <span className="font-semibold text-green-600">
                +{plusTen.revDeltaPct.toFixed(1)}%
              </span>{" "}
              revenue ({fmt(plusTen.revDelta)}), while a{" "}
              <span className="font-semibold text-red-500">-10% cut</span> loses{" "}
              <span className="font-semibold text-red-500">
                {minusTen.revDeltaPct.toFixed(1)}%
              </span>{" "}
              ({fmt(Math.abs(minusTen.revDelta))}). The asymmetry reflects
              diminishing returns — cuts hurt less than increases help.
            </p>
          </div>
        );
      })()}
    </div>
  );
}
