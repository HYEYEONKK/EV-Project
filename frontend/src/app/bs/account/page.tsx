"use client";
import ChartCard from "@/components/ui/ChartCard";
import AccountTrendChart from "@/components/charts/AccountTrendChart";

export default function BsAccountPage() {
  return (
    <div className="space-y-5">
      <ChartCard
        title="BS 계정분석"
        subtitle="계정을 선택해 일별 잔액 추이 및 상대계정을 확인하세요"
      >
        <AccountTrendChart />
      </ChartCard>
    </div>
  );
}
