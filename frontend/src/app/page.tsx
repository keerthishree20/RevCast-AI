"use client";

import { useApp } from "@/context/AppContext";
import FileUploadZone from "@/components/upload/FileUploadZone";
import ValidationStatus from "@/components/upload/ValidationStatus";
import BudgetInputPanel from "@/components/budget/BudgetInputPanel";
import HorizonSelector from "@/components/budget/HorizonSelector";
import ForecastSummaryCard from "@/components/forecast/ForecastSummaryCard";
import ChannelBreakdownTable from "@/components/forecast/ChannelBreakdownTable";
import SeasonalityHeatmap from "@/components/forecast/SeasonalityHeatmap";
import CalibrationTimeMachine from "@/components/forecast/CalibrationTimeMachine";
import ModelComparisonPanel from "@/components/forecast/ModelComparisonPanel";
import DiminishingReturnsChart from "@/components/forecast/DiminishingReturnsChart";
import ChannelRadarChart from "@/components/forecast/ChannelRadarChart";
import RevenueWaterfall from "@/components/forecast/RevenueWaterfall";
import AutoInsights from "@/components/forecast/AutoInsights";
import SensitivityTable from "@/components/forecast/SensitivityTable";
import ScenarioComparisonChart from "@/components/simulate/ScenarioComparisonChart";
import ScenarioSlider from "@/components/simulate/ScenarioSlider";
import CausalSummaryPanel from "@/components/summary/CausalSummaryPanel";
import BudgetOptimizerPanel from "@/components/optimizer/BudgetOptimizerPanel";
import ExportReportButton from "@/components/export/ExportReportButton";

const STEPS = [
  { n: 1, label: "Upload",   desc: "5 CSV files"           },
  { n: 2, label: "Budget",   desc: "Channels & horizon"    },
  { n: 3, label: "Forecast", desc: "P10 / P50 / P90"       },
  { n: 4, label: "Optimize", desc: "Simulate & AI summary" },
] as const;

const PILLS = [
  "Probabilistic P10/P50/P90",
  "Google · Meta · Microsoft",
  "Budget Optimizer",
  "Gemini AI Summary",
];

export default function Home() {
  const { step, goToStep, runForecast, runSimulate, loading, error, forecast } = useApp();

  return (
    <div className="min-h-screen flex flex-col">

      {/* ── Hero banner ───────────────────────────────────────────────── */}
      <header className="gradient-brand text-white px-6 py-10 shadow-xl">
        <div className="max-w-5xl mx-auto">

          {/* Top row */}
          <div className="flex items-center justify-end mb-6">
            <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-3 py-1 text-xs font-medium text-blue-100">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
              83% Calibration Accuracy
            </div>
          </div>

          {/* Title */}
          <div className="flex items-end gap-3 mb-2">
            <h1 className="text-4xl font-black tracking-tight">RevCast</h1>
            <span className="text-4xl font-black text-blue-400">AI</span>
          </div>
          <p className="text-lg text-blue-100 font-light mb-6">
            Probabilistic Revenue Forecasting &amp; Budget Optimization for Paid Media
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2">
            {PILLS.map((p) => (
              <span
                key={p}
                className="bg-white/10 border border-white/20 text-blue-100 text-xs font-medium px-3 py-1 rounded-full"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* ── Main content ──────────────────────────────────────────────── */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">

        {/* Step navigator */}
        <div className="flex items-center mb-8">
          {STEPS.map(({ n, label, desc }, i) => (
            <div key={n} className="flex items-center flex-1 last:flex-none">
              <button
                onClick={() => step > n && goToStep(n)}
                disabled={step <= n}
                className="flex items-center gap-3 group"
              >
                {/* Circle */}
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all duration-200 ${
                  step === n
                    ? "gradient-btn-primary text-white shadow-lg shadow-blue-200 scale-110"
                    : step > n
                    ? "bg-green-500 text-white"
                    : "bg-gray-100 text-gray-400"
                }`}>
                  {step > n ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : n}
                </div>
                {/* Labels */}
                <div className="hidden sm:block text-left">
                  <div className={`text-sm font-semibold leading-tight ${step === n ? "text-blue-700" : step > n ? "text-green-700" : "text-gray-400"}`}>
                    {label}
                  </div>
                  <div className="text-xs text-gray-400">{desc}</div>
                </div>
              </button>
              {/* Connector */}
              {i < STEPS.length - 1 && (
                <div className={`flex-1 mx-3 h-0.5 transition-colors duration-300 ${step > n ? "bg-green-400" : "bg-gray-200"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-5 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700 flex items-start gap-3">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            {error}
          </div>
        )}

        {/* ── Step 1: Upload ── */}
        {step === 1 && (
          <Card
            title="Upload Your Ad Channel Data"
            subtitle="Drop all 5 CSV files — Google Ads, Meta Ads, Microsoft Ads, GA4 Sessions, Shopify Orders"
            icon="📂"
          >
            <FileUploadZone />
          </Card>
        )}

        {/* ── Step 2: Budget ── */}
        {step === 2 && (
          <div className="space-y-4">
            <ValidationStatus />
            <Card
              title="Configure Budget & Forecast Horizon"
              subtitle="Set your planned spend per channel and how far ahead to forecast"
              icon="💰"
            >
              <div className="space-y-6">
                <HorizonSelector />
                <BudgetInputPanel />
                <PrimaryButton onClick={runForecast} loading={loading} loadingText="Running Forecast…">
                  Run Forecast &rarr;
                </PrimaryButton>
              </div>
            </Card>
          </div>
        )}

        {/* ── Step 3: Forecast results ── */}
        {step === 3 && forecast && (
          <div className="space-y-5">
            <div className="flex justify-end">
              <ExportReportButton />
            </div>
            <ForecastSummaryCard />
            <ChannelBreakdownTable />
            <RevenueWaterfall />
            <ChannelRadarChart />
            <DiminishingReturnsChart />
            <SensitivityTable />
            <SeasonalityHeatmap />
            <AutoInsights />
            <CalibrationTimeMachine />
            <ModelComparisonPanel />
            {forecast.anomalies.length > 0 && (
              <Card
                title={`${forecast.anomalies.length} Anomalies Detected`}
                subtitle="Weeks where revenue deviated significantly from the model's predictions"
                icon="⚠️"
              >
                <div className="space-y-2">
                  {forecast.anomalies.map((a, i) => (
                    <div key={i} className="text-sm text-gray-700 flex gap-3 py-1 border-b border-gray-50 last:border-0">
                      <span className="capitalize font-semibold text-gray-500 w-20">{a.channel}</span>
                      <span className="text-gray-400 w-24 font-mono text-xs pt-0.5">{a.week}</span>
                      <span className="text-gray-600">{a.description}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
            <SimulateButton onClick={runSimulate} loading={loading} />
          </div>
        )}

        {/* ── Step 4: Simulate + Optimize + AI ── */}
        {step === 4 && (
          <div className="space-y-5">
            <div className="flex justify-end">
              <ExportReportButton />
            </div>
            <ForecastSummaryCard />
            <ScenarioComparisonChart />
            <div className="card p-6">
              <ScenarioSlider />
            </div>
            <BudgetOptimizerPanel />
            <CausalSummaryPanel />
          </div>
        )}
      </main>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 bg-white mt-8 py-4 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-xs text-gray-400">
          <span className="font-semibold text-gray-500">RevCast AI</span>
          <span>&copy; {new Date().getFullYear()} All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}

// ── Shared UI pieces ────────────────────────────────────────────────────────

function Card({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-6">
      {(title || icon) && (
        <div className="flex items-start gap-3 mb-5">
          {icon && <span className="text-xl mt-0.5">{icon}</span>}
          <div>
            <h2 className="text-base font-bold text-gray-800">{title}</h2>
            {subtitle && <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}

function PrimaryButton({
  onClick,
  loading,
  loadingText,
  children,
}: {
  onClick: () => void;
  loading: boolean;
  loadingText: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full py-3.5 rounded-xl font-bold text-white text-sm gradient-btn-primary hover:opacity-90 disabled:opacity-40 transition-opacity shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
    >
      {loading ? (
        <>
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          {loadingText}
        </>
      ) : children}
    </button>
  );
}

function SimulateButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full py-3.5 rounded-xl font-bold text-white text-sm gradient-btn-simulate hover:opacity-90 disabled:opacity-40 transition-opacity shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
    >
      {loading ? (
        <>
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Running Scenarios…
        </>
      ) : (
        <>
          Simulate Budget Scenarios
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </>
      )}
    </button>
  );
}
