"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type {
  IngestResponse,
  ValidateResponse,
  ForecastResponse,
  SimulateResponse,
  SummaryResponse,
  BudgetInputs,
  HorizonDays,
} from "@/lib/types";
import { apiIngest, apiValidate, apiForecast, apiSimulate, apiSummary } from "@/lib/api";

export type Step = 1 | 2 | 3 | 4;

interface AppState {
  step: Step;
  sessionId: string | null;
  ingest: IngestResponse | null;
  validation: ValidateResponse | null;
  forecast: ForecastResponse | null;
  simulation: SimulateResponse | null;
  summary: SummaryResponse | null;
  budget: BudgetInputs;
  horizon: HorizonDays;
  loading: boolean;
  error: string | null;
}

interface AppActions {
  uploadFiles: (files: {
    google: File; meta: File; microsoft: File; ga4: File; shopify: File;
  }) => Promise<void>;
  runForecast: () => Promise<void>;
  runSimulate: () => Promise<void>;
  generateSummary: () => Promise<void>;
  setBudget: (b: BudgetInputs) => void;
  setHorizon: (h: HorizonDays) => void;
  goToStep: (s: Step) => void;
  clearError: () => void;
}

const Ctx = createContext<(AppState & AppActions) | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    step: 1,
    sessionId: null,
    ingest: null,
    validation: null,
    forecast: null,
    simulation: null,
    summary: null,
    budget: { google: 95000, meta: 45000, microsoft: 18000 },
    horizon: 90,
    loading: false,
    error: null,
  });

  const set = useCallback((patch: Partial<AppState>) => {
    setState((s) => ({ ...s, ...patch }));
  }, []);

  const uploadFiles: AppActions["uploadFiles"] = useCallback(async (files) => {
    set({ loading: true, error: null });
    try {
      const ingest = await apiIngest(files);
      const validation = await apiValidate(ingest.session_id);
      // Pre-fill budget from last-period channel totals (12-week avg → weekly × 13)
      const ct = ingest.summary.channel_totals;
      const weeks = ingest.summary.weeks_available;
      const avgBudget = (ch: string) =>
        Math.round((ct[ch]?.spend ?? 0) / weeks * 13 / 1000) * 1000;
      set({
        sessionId: ingest.session_id,
        ingest,
        validation,
        budget: {
          google: avgBudget("google"),
          meta: avgBudget("meta"),
          microsoft: avgBudget("microsoft"),
        },
        step: 2,
        loading: false,
      });
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
    }
  }, [set]);

  const runForecast: AppActions["runForecast"] = useCallback(async () => {
    if (!state.sessionId) return;
    set({ loading: true, error: null });
    try {
      const forecast = await apiForecast(state.sessionId, state.budget, state.horizon);
      set({ forecast, step: 3, loading: false });
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
    }
  }, [state.sessionId, state.budget, state.horizon, set]);

  const runSimulate: AppActions["runSimulate"] = useCallback(async () => {
    if (!state.sessionId) return;
    set({ loading: true, error: null });
    try {
      const simulation = await apiSimulate(state.sessionId, state.budget, state.horizon);
      set({ simulation, step: 4, loading: false });
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
    }
  }, [state.sessionId, state.budget, state.horizon, set]);

  const generateSummary: AppActions["generateSummary"] = useCallback(async () => {
    if (!state.sessionId) return;
    set({ loading: true, error: null });
    try {
      const summary = await apiSummary(state.sessionId);
      set({ summary, loading: false });
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
    }
  }, [state.sessionId, set]);

  return (
    <Ctx.Provider value={{
      ...state,
      uploadFiles,
      runForecast,
      runSimulate,
      generateSummary,
      setBudget: (b) => set({ budget: b }),
      setHorizon: (h) => set({ horizon: h }),
      goToStep: (s) => set({ step: s }),
      clearError: () => set({ error: null }),
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
