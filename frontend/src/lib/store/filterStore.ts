"use client";
import { create } from "zustand";

export type AnalysisMode = "전년누적" | "전년동월" | "전월비교";
export type BSBase = "연초" | "월초";

interface FilterState {
  // Global date filter
  dateFrom: string;
  dateTo: string;
  // Cross-filters (set by chart clicks)
  activeMonth: string | null;
  activeCostCategory: string | null;
  activeProductCategory: string | null;
  activeVendor: string | null;
  activeRegion: string | null;
  // Summary page filters
  summaryBaseYM: string;
  summaryMode: AnalysisMode;
  summaryBsBase: BSBase;
  // Scenario page filters
  scenarioDateFrom: string;
  scenarioDateTo: string;
  scenarioMinAmount: number | null;
  scenarioMaxAmount: number | null;
  scenarioAllToggle: boolean;
  // Market page filters
  marketRateYear: string;
  marketExchangeYear: string;
  marketExchangeCurrency: string;
  // Actions
  setDateRange: (from: string, to: string) => void;
  setScenarioDateRange: (from: string, to: string) => void;
  setScenarioAmounts: (min: number | null, max: number | null) => void;
  setScenarioAllToggle: (v: boolean) => void;
  setMarketRateYear: (v: string) => void;
  setMarketExchangeYear: (v: string) => void;
  setMarketExchangeCurrency: (v: string) => void;
  setCrossFilter: (
    key:
      | "activeMonth"
      | "activeCostCategory"
      | "activeProductCategory"
      | "activeVendor"
      | "activeRegion",
    value: string | null
  ) => void;
  setSummaryBaseYM: (v: string) => void;
  setSummaryMode: (v: AnalysisMode) => void;
  setSummaryBsBase: (v: BSBase) => void;
  resetCrossFilters: () => void;
  resetAll: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  dateFrom: "2024-01-01",
  dateTo: "2026-03-31",
  activeMonth: null,
  activeCostCategory: null,
  activeProductCategory: null,
  activeVendor: null,
  activeRegion: null,
  summaryBaseYM: "2026-03",
  summaryMode: "전월비교",
  summaryBsBase: "연초",
  scenarioDateFrom: "2024-01-01",
  scenarioDateTo: "2026-03-31",
  scenarioMinAmount: null,
  scenarioMaxAmount: null,
  scenarioAllToggle: false,
  marketRateYear: String(new Date().getFullYear() - 1),
  marketExchangeYear: String(new Date().getFullYear() - 1),
  marketExchangeCurrency: "USD",

  setDateRange: (from, to) => set({ dateFrom: from, dateTo: to }),
  setScenarioDateRange: (from, to) => set({ scenarioDateFrom: from, scenarioDateTo: to }),
  setScenarioAmounts: (min, max) => set({ scenarioMinAmount: min, scenarioMaxAmount: max }),
  setScenarioAllToggle: (v) => set({ scenarioAllToggle: v }),
  setMarketRateYear: (v) => set({ marketRateYear: v }),
  setMarketExchangeYear: (v) => set({ marketExchangeYear: v }),
  setMarketExchangeCurrency: (v) => set({ marketExchangeCurrency: v }),
  setCrossFilter: (key, value) =>
    set((state) => ({
      ...state,
      [key]: state[key] === value ? null : value,
    })),
  setSummaryBaseYM: (v) => set({ summaryBaseYM: v }),
  setSummaryMode: (v) => set({ summaryMode: v }),
  setSummaryBsBase: (v) => set({ summaryBsBase: v }),
  resetCrossFilters: () =>
    set({
      activeMonth: null,
      activeCostCategory: null,
      activeProductCategory: null,
      activeVendor: null,
      activeRegion: null,
    }),
  resetAll: () =>
    set({
      dateFrom: "2024-01-01",
      dateTo: "2026-03-31",
      activeMonth: null,
      activeCostCategory: null,
      activeProductCategory: null,
      activeVendor: null,
      activeRegion: null,
      summaryBaseYM: "2026-03",
      summaryMode: "전월비교",
      summaryBsBase: "연초",
    }),
}));
