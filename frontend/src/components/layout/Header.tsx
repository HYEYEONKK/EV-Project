"use client";
import { usePathname } from "next/navigation";
import { useFilterStore } from "@/lib/store/filterStore";
import { useState } from "react";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "대시보드",
  "/financial/balance-sheet": "재무상태표",
  "/financial/income-statement": "손익계산서",
  "/financial/cash-flow": "현금흐름표",
  "/sales": "매출 분석",
  "/budget": "예실 비교",
  "/accounts": "계정 추이",
};

function CloseIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}
function FilterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
    </svg>
  );
}

export default function Header() {
  const pathname = usePathname();
  const title = PAGE_TITLES[pathname] ?? "Easyview";
  const {
    dateFrom,
    dateTo,
    setDateRange,
    activeMonth,
    activeCostCategory,
    activeProductCategory,
    activeVendor,
    activeRegion,
    setCrossFilter,
    resetCrossFilters,
  } = useFilterStore();

  const [showFilter, setShowFilter] = useState(false);

  const activeFilters = [
    activeMonth && { key: "activeMonth" as const, label: `월: ${activeMonth}` },
    activeCostCategory && { key: "activeCostCategory" as const, label: `비용: ${activeCostCategory}` },
    activeProductCategory && { key: "activeProductCategory" as const, label: `제품: ${activeProductCategory}` },
    activeVendor && { key: "activeVendor" as const, label: `거래처: ${activeVendor}` },
    activeRegion && { key: "activeRegion" as const, label: `지역: ${activeRegion}` },
  ].filter(Boolean) as { key: Parameters<typeof setCrossFilter>[0]; label: string }[];

  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between px-6 bg-white"
      style={{ height: 60, borderBottom: "1px solid #DFE3E6" }}
    >
      <h1 className="text-base font-semibold" style={{ color: "#000000" }}>{title}</h1>

      <div className="flex items-center gap-2">
        {/* Active cross-filter chips */}
        {activeFilters.map((f) => (
          <span
            key={f.key}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{
              backgroundColor: "#FFE8D4",
              color: "#FD5108",
              border: "1px solid #FFAA72",
            }}
          >
            {f.label}
            <button
              onClick={() => setCrossFilter(f.key, null)}
              className="hover:opacity-60 ml-0.5"
            >
              <CloseIcon />
            </button>
          </span>
        ))}

        {activeFilters.length > 0 && (
          <button
            onClick={resetCrossFilters}
            className="text-xs hover:underline"
            style={{ color: "#A1A8B3" }}
          >
            전체 해제
          </button>
        )}

        {/* Date filter toggle */}
        <button
          onClick={() => setShowFilter(!showFilter)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors"
          style={{
            backgroundColor: showFilter ? "#FFE8D4" : "#F5F7F8",
            color: showFilter ? "#FD5108" : "#A1A8B3",
            border: `1px solid ${showFilter ? "#FFAA72" : "#DFE3E6"}`,
          }}
        >
          <FilterIcon />
          <span>필터</span>
        </button>

        {/* Date range inputs */}
        {showFilter && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateRange(e.target.value, dateTo)}
              className="px-2 py-1 text-sm rounded-md"
              style={{ border: "1px solid #DFE3E6", color: "#000" }}
            />
            <span className="text-sm" style={{ color: "#A1A8B3" }}>~</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateRange(dateFrom, e.target.value)}
              className="px-2 py-1 text-sm rounded-md"
              style={{ border: "1px solid #DFE3E6", color: "#000" }}
            />
          </div>
        )}
      </div>
    </header>
  );
}
