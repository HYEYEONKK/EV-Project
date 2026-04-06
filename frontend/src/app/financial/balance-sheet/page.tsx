"use client";
import { useQuery } from "@tanstack/react-query";
import { useFilterStore } from "@/lib/store/filterStore";
import { api } from "@/lib/api/client";
import FinancialStatementTable from "@/components/tables/FinancialStatementTable";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { formatKRW } from "@/lib/utils/formatters";

export default function BalanceSheetPage() {
  const { dateFrom, dateTo } = useFilterStore();

  const { data, isLoading } = useQuery({
    queryKey: ["balance-sheet", dateFrom, dateTo],
    queryFn: () =>
      api.financialStatements.balanceSheet({ date_from: dateFrom, date_to: dateTo }),
  });

  if (isLoading) return <LoadingSpinner height={400} />;
  if (!data) return null;
  const bs = data as any;

  const assetRows = [
    { label: "자산", amount: bs.assets.total, isTotal: true, indent: 0 },
    { label: "  유동자산", amount: bs.assets.current.subtotal, isSubtotal: true, indent: 1 },
    ...bs.assets.current.items.slice(0, 15).map((i: any) => ({ label: i.account, amount: i.amount, indent: 2 })),
    { label: "  비유동자산", amount: bs.assets.noncurrent.subtotal, isSubtotal: true, indent: 1 },
    ...bs.assets.noncurrent.items.slice(0, 15).map((i: any) => ({ label: i.account, amount: i.amount, indent: 2 })),
  ];

  const liabEquityRows = [
    { label: "부채", amount: bs.liabilities.total, isTotal: true, indent: 0 },
    { label: "  유동부채", amount: bs.liabilities.current.subtotal, isSubtotal: true, indent: 1 },
    ...bs.liabilities.current.items.slice(0, 15).map((i: any) => ({ label: i.account, amount: i.amount, indent: 2 })),
    { label: "  비유동부채", amount: bs.liabilities.noncurrent.subtotal, isSubtotal: true, indent: 1 },
    ...bs.liabilities.noncurrent.items.slice(0, 15).map((i: any) => ({ label: i.account, amount: i.amount, indent: 2 })),
    { label: "자본 (자산 - 부채)", amount: bs.equity.total, isTotal: true, indent: 0 },
    { label: "부채 및 자본 합계", amount: bs.total_liabilities_equity, isTotal: true, indent: 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "총 자산", value: formatKRW(bs.assets.total) },
          { label: "총 부채", value: formatKRW(bs.liabilities.total) },
          { label: "자본 총계", value: formatKRW(bs.equity.total) },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-lg p-4 border" style={{ borderColor: "#E5E7EB", boxShadow: "var(--shadow-card)" }}>
            <p className="text-xs font-medium" style={{ color: "#6B7280" }}>{item.label}</p>
            <p className="text-xl font-bold mt-1" style={{ color: "#111827" }}>{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <FinancialStatementTable
          title="자산"
          rows={assetRows}
          periodLabel={`기준일: ${dateTo}`}
        />
        <FinancialStatementTable
          title="부채 및 자본"
          rows={liabEquityRows}
          periodLabel={`기준일: ${dateTo}`}
        />
      </div>
    </div>
  );
}
