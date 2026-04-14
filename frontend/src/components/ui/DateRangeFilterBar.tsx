"use client";
import { useFilterStore } from "@/lib/store/filterStore";
import DatePicker from "@/components/ui/DatePicker";

const LS = "-0.3px";
const DATA_MIN = "2024-01-01";
const DATA_MAX = "2025-09-30";

export default function DateRangeFilterBar() {
  const { dateFrom, dateTo, setDateRange } = useFilterStore();

  return (
    <div className="flex items-center gap-3">
      <span style={{ fontSize: 14, fontWeight: 400, letterSpacing: LS, color: "#A1A8B3", whiteSpace: "nowrap" }}>분석 기간</span>
      <div style={{ width: 1, height: 16, backgroundColor: "#DFE3E6", flexShrink: 0 }} />
      <div className="flex items-center gap-2">
        <DatePicker
          value={dateFrom}
          onChange={(v) => setDateRange(v, dateTo)}
          minDate={DATA_MIN}
          maxDate={DATA_MAX}
        />
        <span style={{ fontSize: 14, letterSpacing: LS, color: "#A1A8B3" }}>~</span>
        <DatePicker
          value={dateTo}
          onChange={(v) => setDateRange(dateFrom, v)}
          minDate={DATA_MIN}
          maxDate={DATA_MAX}
        />
      </div>
    </div>
  );
}
