"use client";
import { useFilterStore } from "@/lib/store/filterStore";

const FS = 14;
const LS = "-0.3px";

export default function DateRangeFilterBar() {
  const { dateFrom, dateTo, setDateRange } = useFilterStore();

  return (
    <div className="flex items-center gap-3">
      <span style={{ fontSize: FS, fontWeight: 400, letterSpacing: LS, color: "#A1A8B3", whiteSpace: "nowrap" }}>분석 기간</span>
      <div style={{ width: 1, height: 16, backgroundColor: "#DFE3E6", flexShrink: 0 }} />
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateRange(e.target.value, dateTo)}
          style={{
            fontSize: FS,
            fontWeight: 400,
            letterSpacing: LS,
            border: "1px solid #DFE3E6",
            borderRadius: 6,
            padding: "3px 8px",
            color: "#374151",
            outline: "none",
            backgroundColor: "#fff",
          }}
        />
        <span style={{ fontSize: FS, letterSpacing: LS, color: "#A1A8B3" }}>~</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateRange(dateFrom, e.target.value)}
          style={{
            fontSize: FS,
            fontWeight: 400,
            letterSpacing: LS,
            border: "1px solid #DFE3E6",
            borderRadius: 6,
            padding: "3px 8px",
            color: "#374151",
            outline: "none",
            backgroundColor: "#fff",
          }}
        />
      </div>
    </div>
  );
}
