"use client";

import { useState, useRef, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { exportForecastCSV, exportForecastPDF } from "@/lib/export";

export default function ExportReportButton() {
  const { forecast, simulation, summary, budget, horizon } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!forecast) return null;
  const reportData = { forecast, simulation, summary, budget, horizon };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
      >
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m-9 7h12a2 2 0 002-2V8a2 2 0 00-2-2h-4l-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Export Report
        <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden z-10">
          <button
            onClick={() => { exportForecastPDF(reportData); setOpen(false); }}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <span className="text-red-500 font-bold text-xs">PDF</span>
            Download PDF
          </button>
          <button
            onClick={() => { exportForecastCSV(reportData); setOpen(false); }}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 border-t border-gray-100"
          >
            <span className="text-green-600 font-bold text-xs">CSV</span>
            Download CSV
          </button>
        </div>
      )}
    </div>
  );
}
