"use client";
import ChartCard from "@/components/ui/ChartCard";
import RevenueChart from "@/components/charts/RevenueChart";

export default function PlTrendPage() {
  return (
    <div className="space-y-5">
      <ChartCard title="월별 손익 Trend" subtitle="당기/전기 매출·비용 월별 추이">
        <RevenueChart />
      </ChartCard>
    </div>
  );
}
