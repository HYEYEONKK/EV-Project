"use client";
import { useQuery } from "@tanstack/react-query";
import { useFilterStore } from "@/lib/store/filterStore";
import { api } from "@/lib/api/client";
import ChartCard from "@/components/ui/ChartCard";
import AccountTrendChart from "@/components/charts/AccountTrendChart";
import SortableTable from "@/components/ui/SortableTable";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export default function BsAccountPage() {
  const { dateFrom, dateTo } = useFilterStore();

  const { data, isLoading } = useQuery({
    queryKey: ["balance-sheet", dateFrom, dateTo],
    queryFn: () => api.financialStatements.balanceSheet({ date_from: dateFrom, date_to: dateTo }),
  });

  if (isLoading) return <LoadingSpinner height={400} />;
  if (!data) return (
    <div className="space-y-5">
      <ChartCard title="BS 계정분석" subtitle="계정을 선택해 잔액 추이 및 상대계정을 확인하세요">
        <AccountTrendChart />
      </ChartCard>
    </div>
  );

  const bs = data as any;

  const assetRows = [
    { label: "자산 합계",    amount: bs.assets.total, isTotal: true, indent: 0 },
    { label: "  유동자산",   amount: bs.assets.current.subtotal, isSubtotal: true, indent: 1 },
    ...bs.assets.current.items.slice(0, 15).map((i: any) => ({ label: i.account, amount: i.amount, indent: 2 })),
    { label: "  비유동자산", amount: bs.assets.noncurrent.subtotal, isSubtotal: true, indent: 1 },
    ...bs.assets.noncurrent.items.slice(0, 10).map((i: any) => ({ label: i.account, amount: i.amount, indent: 2 })),
  ];

  const liabEquityRows = [
    { label: "부채 합계",    amount: bs.liabilities.total, isTotal: true, indent: 0 },
    { label: "  유동부채",   amount: bs.liabilities.current.subtotal, isSubtotal: true, indent: 1 },
    ...bs.liabilities.current.items.slice(0, 10).map((i: any) => ({ label: i.account, amount: i.amount, indent: 2 })),
    { label: "  비유동부채", amount: bs.liabilities.noncurrent.subtotal, isSubtotal: true, indent: 1 },
    ...bs.liabilities.noncurrent.items.slice(0, 5).map((i: any) => ({ label: i.account, amount: i.amount, indent: 2 })),
    { label: "자본 합계",    amount: bs.equity.total, isTotal: true, indent: 0 },
  ];

  return (
    <div className="space-y-5">
      {/* 계정 추이 차트 */}
      <ChartCard title="BS 계정분석" subtitle="계정을 선택해 잔액 추이 및 상대계정을 확인하세요">
        <AccountTrendChart />
      </ChartCard>

      {/* BS 테이블 2열 */}
      <div className="grid grid-cols-2 gap-5">
        <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
          <div className="px-5 py-3 border-b" style={{ borderColor: "#EEEFF1" }}>
            <h3 className="text-base font-semibold" style={{ color: "#000" }}>자산</h3>
            <p className="text-xs mt-0.5" style={{ color: "#A1A8B3" }}>기준일: {dateTo}</p>
          </div>
          <div className="px-3 py-2">
            <SortableTable
              columns={[
                { key: "label",  label: "항목",       align: "left" },
                { key: "amount", label: "금액 (KRW)", align: "right" },
              ]}
              rows={assetRows.map((r) => [r.label, r.amount])}
              filename="BS계정분석"
              maxHeight={500}
            />
          </div>
        </div>
        <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
          <div className="px-5 py-3 border-b" style={{ borderColor: "#EEEFF1" }}>
            <h3 className="text-base font-semibold" style={{ color: "#000" }}>부채 및 자본</h3>
            <p className="text-xs mt-0.5" style={{ color: "#A1A8B3" }}>기준일: {dateTo}</p>
          </div>
          <div className="px-3 py-2">
            <SortableTable
              columns={[
                { key: "label",  label: "항목",       align: "left" },
                { key: "amount", label: "금액 (KRW)", align: "right" },
              ]}
              rows={liabEquityRows.map((r) => [r.label, r.amount])}
              filename="BS계정분석"
              maxHeight={500}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
