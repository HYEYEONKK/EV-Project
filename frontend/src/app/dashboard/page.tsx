"use client";
import { useQuery } from "@tanstack/react-query";
import { useFilterStore } from "@/lib/store/filterStore";
import { api } from "@/lib/api/client";
import KpiCard from "@/components/ui/KpiCard";
import ChartCard from "@/components/ui/ChartCard";
import RevenueChart from "@/components/charts/RevenueChart";
import CostBreakdownChart from "@/components/charts/CostBreakdownChart";
import AccountTrendChart from "@/components/charts/AccountTrendChart";
import SalesByCategoryChart from "@/components/charts/SalesByCategoryChart";
import SalesByRegionChart from "@/components/charts/SalesByRegionChart";

export default function DashboardPage() {
  const { dateFrom, dateTo } = useFilterStore();

  const { data: salesSummary, isLoading: salesLoading } = useQuery({
    queryKey: ["sales-summary", dateFrom, dateTo],
    queryFn: () => api.sales.summary({ date_from: dateFrom, date_to: dateTo }),
  });

  const { data: plData, isLoading: plLoading } = useQuery({
    queryKey: ["income-statement", dateFrom, dateTo],
    queryFn: () =>
      api.financialStatements.incomeStatement({ date_from: dateFrom, date_to: dateTo }),
  });

  const { data: bsData, isLoading: bsLoading } = useQuery({
    queryKey: ["balance-sheet", dateFrom, dateTo],
    queryFn: () =>
      api.financialStatements.balanceSheet({ date_from: dateFrom, date_to: dateTo }),
  });

  const totalRevenue = (salesSummary as any)?.total_revenue ?? 0;
  const grossProfit = (plData as any)?.gross_profit ?? 0;
  const grossMargin = (plData as any)?.gross_margin_pct ?? 0;
  const totalAssets = (bsData as any)?.assets?.total ?? 0;
  const netIncome = (plData as any)?.net_income ?? 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          label="총 매출액"
          value={totalRevenue}
          loading={salesLoading}
          accent
        />
        <KpiCard
          label="매출총이익"
          value={grossProfit}
          delta={grossMargin}
          deltaLabel="GP Margin"
          loading={plLoading}
        />
        <KpiCard
          label="총 자산"
          value={totalAssets}
          loading={bsLoading}
        />
        <KpiCard
          label="당기순손익"
          value={netIncome}
          loading={plLoading}
        />
      </div>

      {/* Row 2: Revenue Chart + Cost Breakdown */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-8">
          <ChartCard
            title="월별 매출·비용 추이"
            subtitle="클릭하면 해당 월로 필터링됩니다"
          >
            <RevenueChart />
          </ChartCard>
        </div>
        <div className="col-span-4">
          <ChartCard
            title="비용 구조"
            subtitle="클릭하면 비용 항목으로 필터링됩니다"
          >
            <CostBreakdownChart />
          </ChartCard>
        </div>
      </div>

      {/* Row 3: Account Trend */}
      <ChartCard
        title="계정별 추이 분석"
        subtitle="계정을 선택해 월별 순증감을 확인하세요"
      >
        <AccountTrendChart />
      </ChartCard>

      {/* Row 4: Sales by Category + Region */}
      <div className="grid grid-cols-2 gap-4">
        <ChartCard
          title="제품군별 매출"
          subtitle="클릭하면 제품군으로 필터링됩니다"
        >
          <SalesByCategoryChart />
        </ChartCard>
        <ChartCard
          title="지역별 매출"
          subtitle="클릭하면 지역으로 필터링됩니다"
        >
          <SalesByRegionChart />
        </ChartCard>
      </div>
    </div>
  );
}
