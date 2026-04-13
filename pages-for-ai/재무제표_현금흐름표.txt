"use client";
import { useQuery } from "@tanstack/react-query";
import { useFilterStore } from "@/lib/store/filterStore";
import { api } from "@/lib/api/client";
import FinancialStatementTable from "@/components/tables/FinancialStatementTable";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { formatKRW } from "@/lib/utils/formatters";

export default function CashFlowPage() {
  const { dateFrom, dateTo } = useFilterStore();

  const { data, isLoading } = useQuery({
    queryKey: ["cash-flow", dateFrom, dateTo],
    queryFn: () =>
      api.financialStatements.cashFlow({ date_from: dateFrom, date_to: dateTo }),
  });

  if (isLoading) return <LoadingSpinner height={400} />;
  if (!data) return null;
  const cf = data as any;

  const rows = [
    { label: "I. 영업활동 현금흐름", amount: cf.operating.total, isSubtotal: true, indent: 0 },
    ...cf.operating.items.slice(0, 15).map((i: any) => ({ label: i.account, amount: i.amount, indent: 1 })),
    { label: "II. 투자활동 현금흐름", amount: cf.investing.total, isSubtotal: true, indent: 0 },
    ...cf.investing.items.slice(0, 15).map((i: any) => ({ label: i.account, amount: i.amount, indent: 1 })),
    { label: "III. 재무활동 현금흐름", amount: cf.financing.total, isSubtotal: true, indent: 0 },
    ...cf.financing.items.slice(0, 15).map((i: any) => ({ label: i.account, amount: i.amount, indent: 1 })),
    { label: "현금 순증감", amount: cf.net_change, isTotal: true, indent: 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "영업활동", value: formatKRW(cf.operating.total), positive: cf.operating.total >= 0 },
          { label: "투자활동", value: formatKRW(cf.investing.total), positive: cf.investing.total >= 0 },
          { label: "재무활동", value: formatKRW(cf.financing.total), positive: cf.financing.total >= 0 },
          { label: "순 현금 변동", value: formatKRW(cf.net_change), positive: cf.net_change >= 0 },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-lg p-4 border" style={{ borderColor: "#E5E7EB", boxShadow: "var(--shadow-card)" }}>
            <p className="text-sm font-medium" style={{ color: "#A1A8B3" }}>{item.label}</p>
            <p className="text-3xl font-bold mt-1" style={{ color: item.positive ? "#16C784" : "#FF4747" }}>
              {item.value}
            </p>
          </div>
        ))}
      </div>
      <FinancialStatementTable
        title="현금흐름표"
        rows={rows}
        periodLabel={`${dateFrom} ~ ${dateTo}`}
      />
    </div>
  );
}
