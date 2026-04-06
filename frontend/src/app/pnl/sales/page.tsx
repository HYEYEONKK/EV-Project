"use client";
import { useQuery } from "@tanstack/react-query";
import { useFilterStore } from "@/lib/store/filterStore";
import { api } from "@/lib/api/client";
import KpiCard from "@/components/ui/KpiCard";
import ChartCard from "@/components/ui/ChartCard";
import SalesMonthlyChart from "@/components/charts/SalesMonthlyChart";
import SalesByCategoryChart from "@/components/charts/SalesByCategoryChart";
import SalesByRegionChart from "@/components/charts/SalesByRegionChart";
import SalesByVendorChart from "@/components/charts/SalesByVendorChart";

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
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="총 매출액"    value={s?.total_revenue       ?? 0} loading={isLoading} accent />
        <KpiCard label="거래 건수"    value={s?.transaction_count   ?? 0} format="number" loading={isLoading} />
        <KpiCard label="평균 거래금액" value={s?.avg_order_value     ?? 0} loading={isLoading} />
        <KpiCard label="총 판매수량"  value={s?.total_quantity       ?? 0} format="number" loading={isLoading} />
      </div>

      <ChartCard title="월별 매출 추이" subtitle="클릭하면 해당 월로 필터링됩니다">
        <SalesMonthlyChart />
      </ChartCard>

      <div className="grid grid-cols-2 gap-4">
        <ChartCard title="제품군별 매출" subtitle="클릭하면 제품군으로 필터링됩니다">
          <SalesByCategoryChart />
        </ChartCard>
        <ChartCard title="지역별 매출" subtitle="클릭하면 지역으로 필터링됩니다">
          <SalesByRegionChart />
        </ChartCard>
      </div>

      <ChartCard
        title="거래처별 매출 Top 15"
        subtitle={activeVendor ? `선택: ${activeVendor}` : "클릭하면 거래처로 필터링됩니다"}
      >
        <SalesByVendorChart />
      </ChartCard>

      {activeVendor && (
        <ChartCard title={`${activeVendor} — 제품군별 매출`} subtitle="선택된 거래처의 제품군 분석">
          <SalesByCategoryChart />
        </ChartCard>
      )}
    </div>
  );
}
