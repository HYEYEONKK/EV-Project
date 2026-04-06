"use client";
import { create } from "zustand";

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
  // Actions
  setDateRange: (from: string, to: string) => void;
  setCrossFilter: (
    key:
      | "activeMonth"
      | "activeCostCategory"
      | "activeProductCategory"
      | "activeVendor"
      | "activeRegion",
    value: string | null
  ) => void;
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

  setDateRange: (from, to) => set({ dateFrom: from, dateTo: to }),
  setCrossFilter: (key, value) =>
    set((state) => ({
      ...state,
      [key]: state[key] === value ? null : value, // toggle
    })),
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
    }),
}));
