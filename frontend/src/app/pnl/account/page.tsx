"use client";
import ChartCard from "@/components/ui/ChartCard";
import AccountTrendChart from "@/components/charts/AccountTrendChart";
import SalesByVendorChart from "@/components/charts/SalesByVendorChart";

export default function PlAccountPage() {
  return (
    <div className="space-y-5">
      <ChartCard
        title="PL 계정분석"
        subtitle="계정을 선택해 추이 및 거래처별 당기 비중을 확인하세요"
      >
        <AccountTrendChart />
      </ChartCard>
      <div className="grid grid-cols-2 gap-4">
        <ChartCard title="상위 10개 거래처 당기 비중" subtitle="손익 계정 기준">
          <SalesByVendorChart />
        </ChartCard>
      </div>
    </div>
  );
}
