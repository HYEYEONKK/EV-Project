"use client";
import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFilterStore } from "@/lib/store/filterStore";
import { api } from "@/lib/api/client";
import ChartCard from "@/components/ui/ChartCard";
import SalesMonthlyChart from "@/components/charts/SalesMonthlyChart";
import SalesByCategoryChart from "@/components/charts/SalesByCategoryChart";
import SalesByRegionChart from "@/components/charts/SalesByRegionChart";
import SalesByVendorChart from "@/components/charts/SalesByVendorChart";
import { formatKRW } from "@/lib/utils/formatters";

// ─── hover 훅 ─────────────────────────────────────────────
function useCardHover() {
  const onEnter = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget as HTMLElement;
    el.style.transform = "translateY(-3px)";
    el.style.boxShadow = "0 8px 28px rgba(253,81,8,0.11)";
    el.style.borderColor = "rgba(253,81,8,0.25)";
  }, []);
  const onLeave = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget as HTMLElement;
    el.style.transform = "";
    el.style.boxShadow = "var(--shadow-card)";
    el.style.borderColor = "#DFE3E6";
  }, []);
  return { onMouseEnter: onEnter, onMouseLeave: onLeave };
}

interface SalesKpiCardProps {
  label: string;
  value: string;
  icon: string;  // CARD 폴더 아이콘 파일명
  loading?: boolean;
}

function SalesKpiCard({ label, value, icon, loading }: SalesKpiCardProps) {
  const hover = useCardHover();
  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-5 animate-pulse" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
        <div className="h-8 bg-gray-200 rounded w-3/4" />
      </div>
    );
  }
  return (
    <div className="bg-white rounded-lg border p-5"
      style={{
        borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)",
        transition: "transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease",
        cursor: "default",
      }}
      {...hover}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: "#FD5108", marginBottom: 6 }}>{label}</div>
          <div style={{ fontSize: 30, fontWeight: 700, color: "#000", letterSpacing: "-0.5px", lineHeight: 1.1 }}>
            {value}
          </div>
        </div>
        <img src={`/icons/${icon}`} alt={label} style={{ width: 60, height: 60, flexShrink: 0 }} />
      </div>
    </div>
  );
}

export default function SalesAnalysisPage() {
  const { dateFrom, dateTo, activeProductCategory, activeVendor, activeRegion, activeMonth } = useFilterStore();

  const { data: summary, isLoading } = useQuery({
    queryKey: ["sales-summary", dateFrom, dateTo, activeProductCategory, activeVendor, activeRegion, activeMonth],
    queryFn: () =>
      api.sales.summary({
        date_from: activeMonth ? `${activeMonth}-01` : dateFrom,
        date_to:   activeMonth ? `${activeMonth}-31` : dateTo,
        product_category: activeProductCategory ?? undefined,
        vendor:           activeVendor          ?? undefined,
        region:           activeRegion          ?? undefined,
      }),
  });
  const s = summary as any;

  return (
    <div className="space-y-5">
      {/* KPI */}
      <div className="grid grid-cols-4 gap-4">
        <SalesKpiCard label="총 매출액"    value={isLoading ? "-" : formatKRW(s?.total_revenue ?? 0)}                       icon="growth-economy.svg"    loading={isLoading} />
        <SalesKpiCard label="거래 건수"    value={isLoading ? "-" : `${(s?.transaction_count ?? 0).toLocaleString()}건`} icon="financial-invoice.svg" loading={isLoading} />
        <SalesKpiCard label="평균 거래금액" value={isLoading ? "-" : formatKRW(s?.avg_order_value ?? 0)}                  icon="wealth-dollar.svg"     loading={isLoading} />
        <SalesKpiCard label="총 판매수량"  value={isLoading ? "-" : `${(s?.total_quantity ?? 0).toLocaleString()}개`}    icon="inventory.svg"         loading={isLoading} />
      </div>

      {/* 제품군별 / 지역별 비율 */}
      <div className="grid grid-cols-2 gap-4">
        <ChartCard title="제품군별 매출 비중" subtitle="클릭하면 제품군으로 필터링됩니다">
          <SalesByCategoryChart />
        </ChartCard>
        <ChartCard title="지역별 매출 비중" subtitle="클릭하면 지역으로 필터링됩니다">
          <SalesByRegionChart />
        </ChartCard>
      </div>

      {/* 월별 매출 추이 */}
      <ChartCard title="월별 매출 추이" subtitle="클릭하면 해당 월로 필터링됩니다">
        <SalesMonthlyChart />
      </ChartCard>

      {/* 거래처별 Top 15 */}
      <ChartCard
        title="거래처별 매출 Top 15"
        subtitle={activeVendor ? `선택: ${activeVendor}` : "클릭하면 거래처로 필터링됩니다"}
      >
        <SalesByVendorChart />
      </ChartCard>
    </div>
  );
}
