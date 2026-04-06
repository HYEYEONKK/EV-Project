"use client";
import { useQuery } from "@tanstack/react-query";
import { useFilterStore } from "@/lib/store/filterStore";
import { api } from "@/lib/api/client";
import FinancialStatementTable from "@/components/tables/FinancialStatementTable";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { formatKRW } from "@/lib/utils/formatters";

export default function BsSummaryPage() {
  const { dateFrom, dateTo } = useFilterStore();

  const { data, isLoading } = useQuery({
    queryKey: ["balance-sheet", dateFrom, dateTo],
    queryFn: () => api.financialStatements.balanceSheet({ date_from: dateFrom, date_to: dateTo }),
  });

  if (isLoading) return <LoadingSpinner height={400} />;
  if (!data) return null;
  const bs = data as any;

  const totalEquity = bs.equity.total;
  const totalLiab   = bs.liabilities.total;
  const curAssets   = bs.assets.current.subtotal;
  const curLiab     = bs.liabilities.current.subtotal;
  const debtRatio   = totalEquity ? (totalLiab / totalEquity * 100) : 0;
  const curRatio    = curLiab     ? (curAssets / curLiab    * 100) : 0;

  const assetRows = [
    { label: "자산 합계",  amount: bs.assets.total, isTotal: true, indent: 0 },
    { label: "  유동자산", amount: bs.assets.current.subtotal, isSubtotal: true, indent: 1 },
    ...bs.assets.current.items.slice(0, 15).map((i: any) => ({ label: i.account, amount: i.amount, indent: 2 })),
    { label: "  비유동자산", amount: bs.assets.noncurrent.subtotal, isSubtotal: true, indent: 1 },
    ...bs.assets.noncurrent.items.slice(0, 10).map((i: any) => ({ label: i.account, amount: i.amount, indent: 2 })),
  ];

  const liabEquityRows = [
    { label: "부채 합계",  amount: bs.liabilities.total, isTotal: true, indent: 0 },
    { label: "  유동부채", amount: bs.liabilities.current.subtotal, isSubtotal: true, indent: 1 },
    ...bs.liabilities.current.items.slice(0, 10).map((i: any) => ({ label: i.account, amount: i.amount, indent: 2 })),
    { label: "  비유동부채", amount: bs.liabilities.noncurrent.subtotal, isSubtotal: true, indent: 1 },
    ...bs.liabilities.noncurrent.items.slice(0, 5).map((i: any) => ({ label: i.account, amount: i.amount, indent: 2 })),
    { label: "자본 합계",  amount: bs.equity.total, isTotal: true, indent: 0 },
  ];

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "총 자산",  value: formatKRW(bs.assets.total) },
          { label: "총 부채",  value: formatKRW(bs.liabilities.total) },
          { label: "자본 합계", value: formatKRW(bs.equity.total) },
          { label: "부채비율 / 유동비율", value: `${debtRatio.toFixed(1)}% / ${curRatio.toFixed(1)}%` },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-lg p-4 border" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
            <p className="text-xs font-medium" style={{ color: "#A1A8B3" }}>{item.label}</p>
            <p className="text-sm font-bold mt-1" style={{ color: "#000" }}>{item.value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-5">
        <FinancialStatementTable title="자산" rows={assetRows} periodLabel={`기준일: ${dateTo}`} />
        <FinancialStatementTable title="부채 및 자본" rows={liabEquityRows} periodLabel={`기준일: ${dateTo}`} />
      </div>
    </div>
  );
}
