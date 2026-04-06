"use client";
import { useQuery } from "@tanstack/react-query";
import { useFilterStore } from "@/lib/store/filterStore";
import { api } from "@/lib/api/client";
import KpiCard from "@/components/ui/KpiCard";
import ChartCard from "@/components/ui/ChartCard";
import RevenueChart from "@/components/charts/RevenueChart";
import CostBreakdownChart from "@/components/charts/CostBreakdownChart";
import { formatPctAbs } from "@/lib/utils/formatters";

export default function PlSummaryPage() {
  const { dateFrom, dateTo } = useFilterStore();

  const { data, isLoading } = useQuery({
    queryKey: ["income-statement", dateFrom, dateTo],
    queryFn: () => api.financialStatements.incomeStatement({ date_from: dateFrom, date_to: dateTo }),
  });
  const pl = data as any;

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="매출액"    value={pl?.revenue?.total    ?? 0} loading={isLoading} accent />
        <KpiCard label="매출총이익" value={pl?.gross_profit      ?? 0} delta={pl?.gross_margin_pct}    deltaLabel="GP Margin" loading={isLoading} />
        <KpiCard label="영업이익"   value={pl?.operating_income  ?? 0} delta={pl?.operating_margin_pct} deltaLabel="OP Margin" loading={isLoading} />
        <KpiCard label="당기순이익" value={pl?.net_income        ?? 0} delta={pl?.net_margin_pct}       deltaLabel="NP Margin" loading={isLoading} />
      </div>

      {/* Monthly trend + cost breakdown */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-8">
          <ChartCard title="월별 매출·비용 추이" subtitle="막대를 클릭하면 해당 월로 필터링됩니다">
            <RevenueChart />
          </ChartCard>
        </div>
        <div className="col-span-4">
          <ChartCard title="비용 구조" subtitle="클릭하면 비용 항목으로 필터링됩니다">
            <CostBreakdownChart />
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
