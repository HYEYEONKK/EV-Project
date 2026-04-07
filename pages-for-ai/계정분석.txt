"use client";
import ChartCard from "@/components/ui/ChartCard";
import AccountTrendChart from "@/components/charts/AccountTrendChart";

export default function AccountsPage() {
  return (
    <div className="space-y-6">
      <ChartCard
        title="계정별 월별 추이"
        subtitle="버튼을 눌러 계정을 선택하세요 · 최대 5개 동시 비교"
      >
        <AccountTrendChart />
      </ChartCard>
    </div>
  );
}
