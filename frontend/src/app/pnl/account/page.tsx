"use client";
import { useQuery } from "@tanstack/react-query";
import { useFilterStore } from "@/lib/store/filterStore";
import { api } from "@/lib/api/client";
import ChartCard from "@/components/ui/ChartCard";
import AccountTrendChart from "@/components/charts/AccountTrendChart";
import SortableTable from "@/components/ui/SortableTable";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { formatKRW, formatPctAbs } from "@/lib/utils/formatters";

export default function PlAccountPage() {
  const { dateFrom, dateTo } = useFilterStore();

  const { data, isLoading } = useQuery({
    queryKey: ["income-statement", dateFrom, dateTo],
    queryFn: () => api.financialStatements.incomeStatement({ date_from: dateFrom, date_to: dateTo }),
  });

  if (isLoading) return <LoadingSpinner height={400} />;
  if (!data) return (
    <div className="space-y-5">
      <ChartCard title="PL 계정분석" subtitle="계정을 선택해 추이 및 거래처별 당기 비중을 확인하세요">
        <AccountTrendChart />
      </ChartCard>
    </div>
  );

  const pl = data as any;

  const rows = [
    { label: "I. 매출액", amount: pl.revenue.total, isSubtotal: true, indent: 0 },
    ...pl.revenue.items.slice(0, 10).map((i: any) => ({ label: i.account, amount: i.amount, indent: 1 })),
    { label: "II. 매출원가", amount: -pl.cogs.total, isSubtotal: true, indent: 0 },
    ...pl.cogs.items.slice(0, 10).map((i: any) => ({ label: i.account, amount: -i.amount, indent: 1 })),
    { label: "III. 매출총이익", amount: pl.gross_profit, isSubtotal: true, indent: 0 },
    { label: "IV. 판매비와관리비", amount: -pl.sga.total, isSubtotal: true, indent: 0 },
    ...pl.sga.items.slice(0, 20).map((i: any) => ({ label: i.account, amount: -i.amount, indent: 1 })),
    { label: "V. 영업이익", amount: pl.operating_income, isTotal: true, indent: 0 },
    { label: "VI. 기타손익", amount: pl.other.total, isSubtotal: true, indent: 0 },
    ...pl.other.items.slice(0, 10).map((i: any) => ({ label: i.account, amount: i.amount, indent: 1 })),
    { label: "VII. 당기순손익", amount: pl.net_income, isTotal: true, indent: 0 },
  ];

  return (
    <div className="space-y-5">
      {/* 계정별 추이 차트 */}
      <ChartCard title="PL 계정분석" subtitle="계정을 선택해 당기/전기 추이를 확인하세요">
        <AccountTrendChart />
      </ChartCard>

      {/* 손익계산서 계정분석 테이블 */}
      <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
        <div className="px-5 py-3 border-b" style={{ borderColor: "#EEEFF1" }}>
          <h3 className="text-base font-semibold" style={{ color: "#000" }}>손익계산서 계정분석</h3>
          <p className="text-xs mt-0.5" style={{ color: "#A1A8B3" }}>{dateFrom} ~ {dateTo}</p>
        </div>
        <div className="px-3 py-2">
          <SortableTable
            columns={[
              { key: "label",  label: "항목",       align: "left" },
              { key: "amount", label: "금액 (KRW)", align: "right" },
            ]}
            rows={rows.map((r) => [r.label, r.amount])}
            filename="PL계정분석"
            maxHeight={600}
          />
        </div>
      </div>
    </div>
  );
}
