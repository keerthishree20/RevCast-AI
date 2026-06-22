"use client";

import { useState, useCallback, type DragEvent, type ChangeEvent } from "react";
import { useApp } from "@/context/AppContext";

const REQUIRED_FILES = [
  { key: "google",    label: "Google Ads",      hint: "google_ads.csv" },
  { key: "meta",      label: "Meta Ads",        hint: "meta_ads.csv" },
  { key: "microsoft", label: "Microsoft Ads",   hint: "microsoft_ads.csv" },
  { key: "ga4",       label: "GA4 Sessions",    hint: "ga4_sessions.csv" },
  { key: "shopify",   label: "Shopify Orders",  hint: "shopify_orders.csv" },
] as const;

type FileKey = typeof REQUIRED_FILES[number]["key"];

export default function FileUploadZone() {
  const { uploadFiles, loading, error, clearError } = useApp();
  const [files, setFiles] = useState<Partial<Record<FileKey, File>>>({});
  const [dragOver, setDragOver] = useState(false);

  const assignFile = useCallback((file: File) => {
    const name = file.name.toLowerCase();
    for (const { key, hint } of REQUIRED_FILES) {
      if (name.includes(key) || name === hint) {
        setFiles((f) => ({ ...f, [key]: file }));
        return;
      }
    }
    // Fallback: assign to first unfilled slot
    setFiles((prev) => {
      for (const { key } of REQUIRED_FILES) {
        if (!prev[key]) return { ...prev, [key]: file };
      }
      return prev;
    });
  }, []);

  const onDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    Array.from(e.dataTransfer.files).forEach(assignFile);
  }, [assignFile]);

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files ?? []).forEach(assignFile);
  };

  const allReady = REQUIRED_FILES.every(({ key }) => !!files[key]);

  const handleUpload = async () => {
    if (!allReady) return;
    clearError();
    await uploadFiles(files as Record<FileKey, File>);
  };

  return (
    <div className="space-y-6">
      <div
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${
          dragOver ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
        }`}
        onClick={() => document.getElementById("csv-input")?.click()}
      >
        <input
          id="csv-input"
          type="file"
          multiple
          accept=".csv"
          className="hidden"
          onChange={onInputChange}
        />
        <div className="text-4xl mb-3">📂</div>
        <p className="text-gray-600 font-medium">Drop all 5 CSV files here, or click to browse</p>
        <p className="text-xs text-gray-400 mt-1">google_ads · meta_ads · microsoft_ads · ga4_sessions · shopify_orders</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
        {REQUIRED_FILES.map(({ key, label, hint }) => {
          const file = files[key];
          return (
            <div
              key={key}
              className={`rounded-lg border p-3 text-center text-xs transition-colors ${
                file ? "border-green-300 bg-green-50" : "border-gray-200 bg-gray-50"
              }`}
            >
              <div className="text-lg mb-1">{file ? "✅" : "⬜"}</div>
              <div className="font-medium text-gray-700">{label}</div>
              <div className="text-gray-400 mt-0.5 truncate">{file ? file.name : hint}</div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={!allReady || loading}
        className="w-full py-3 px-6 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Uploading & Validating…" : "Upload & Validate"}
      </button>
    </div>
  );
}
