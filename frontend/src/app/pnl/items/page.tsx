"use client";
import { useQuery } from "@tanstack/react-query";
import { useFilterStore } from "@/lib/store/filterStore";
import { api } from "@/lib/api/client";
import SortableTable from "@/components/ui/SortableTable";
import { downloadCsv } from "@/lib/utils/csvExport";
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
      {/* KPI 요약 */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "매출액",    value: formatKRW(pl.revenue.total) },
          { label: "매출총이익", value: `${formatKRW(pl.gross_profit)} (${formatPctAbs(pl.gross_margin_pct)})` },
          { label: "영업이익",   value: `${formatKRW(pl.operating_income)} (${formatPctAbs(pl.operating_margin_pct)})` },
          { label: "당기순손익", value: `${formatKRW(pl.net_income)} (${formatPctAbs(pl.net_margin_pct)})` },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-lg p-4 border" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
            <p className="text-sm font-medium" style={{ color: "#A1A8B3" }}>{item.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: "#000" }}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* 손익계산서 전체 항목 테이블 */}
      <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
        <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "#EEEFF1" }}>
          <div>
            <h3 className="text-base font-semibold" style={{ color: "#000" }}>손익계산서</h3>
            <p className="text-xs mt-0.5" style={{ color: "#A1A8B3" }}>{dateFrom} ~ {dateTo}</p>
          </div>
          <button onClick={() => downloadCsv(["항목","금액 (KRW)"], rows.map((r) => [r.label, r.amount]), "손익항목")}
            style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:12, fontWeight:500, color:"#A1A8B3", background:"none", border:"1px solid #DFE3E6", borderRadius:7, padding:"4px 10px", cursor:"pointer" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color="#FD5108"; (e.currentTarget as HTMLElement).style.borderColor="#FD5108"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color="#A1A8B3"; (e.currentTarget as HTMLElement).style.borderColor="#DFE3E6"; }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            CSV
          </button>
        </div>
        <div className="px-3 py-2">
          <SortableTable
            columns={[
              { key: "label",  label: "항목",       align: "left" },
              { key: "amount", label: "금액 (KRW)", align: "right" },
            ]}
            rows={rows.map((r) => [r.label, r.amount])}
            filename="손익항목"
            maxHeight={600}
            hideCsvButton
          />
        </div>
      </div>
    </div>
  );
}
