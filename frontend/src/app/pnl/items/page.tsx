"use client";
import { useQuery } from "@tanstack/react-query";
import { useFilterStore } from "@/lib/store/filterStore";
import { api } from "@/lib/api/client";
import FinancialStatementTable from "@/components/tables/FinancialStatementTable";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { formatKRW, formatPctAbs } from "@/lib/utils/formatters";

export default function PlItemsPage() {
  const { dateFrom, dateTo } = useFilterStore();

  const { data, isLoading } = useQuery({
    queryKey: ["income-statement", dateFrom, dateTo],
    queryFn: () => api.financialStatements.incomeStatement({ date_from: dateFrom, date_to: dateTo }),
  });

  if (isLoading) return <LoadingSpinner height={400} />;
  if (!data) return null;
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
      {/* Summary KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "매출액",    value: formatKRW(pl.revenue.total) },
          { label: "매출총이익", value: `${formatKRW(pl.gross_profit)} (${formatPctAbs(pl.gross_margin_pct)})` },
          { label: "영업이익",   value: `${formatKRW(pl.operating_income)} (${formatPctAbs(pl.operating_margin_pct)})` },
          { label: "당기순손익", value: `${formatKRW(pl.net_income)} (${formatPctAbs(pl.net_margin_pct)})` },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-lg p-4 border" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
            <p className="text-xs font-medium" style={{ color: "#A1A8B3" }}>{item.label}</p>
            <p className="text-sm font-bold mt-1" style={{ color: "#000" }}>{item.value}</p>
          </div>
        ))}
      </div>
      <FinancialStatementTable title="손익계산서" rows={rows} periodLabel={`${dateFrom} ~ ${dateTo}`} />
    </div>
  );
}
