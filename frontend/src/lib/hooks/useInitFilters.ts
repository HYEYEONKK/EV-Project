"use client";
import { useEffect, useRef } from "react";
import { useFilterStore } from "@/lib/store/filterStore";
import { api } from "@/lib/api/client";

/**
 * 앱 시작 시 백엔드에서 실제 데이터 범위를 가져와 필터 스토어에 반영합니다.
 * Providers 내부에서 1회만 실행됩니다.
 */
export function useInitFilters() {
  const called = useRef(false);
  const setDateRange = useFilterStore((s) => s.setDateRange);
  const setScenarioDateRange = useFilterStore((s) => s.setScenarioDateRange);
  const setSummaryBaseYM = useFilterStore((s) => s.setSummaryBaseYM);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    api.journalEntries
      .dimensions()
      .then((dims) => {
        const minDate = dims.date_range.min_date; // e.g. "2024-01-01"
        const maxDate = dims.date_range.max_date; // e.g. "2025-09-30"

        // Global date filters
        setDateRange(minDate, maxDate);
        setScenarioDateRange(minDate, maxDate);

        // Summary base YM = last month with data
        const ym = maxDate.slice(0, 7); // "2025-09"
        setSummaryBaseYM(ym);
      })
      .catch(() => {
        // API 연결 실패 시 기본값 유지
      });
  }, [setDateRange, setScenarioDateRange, setSummaryBaseYM]);
}
