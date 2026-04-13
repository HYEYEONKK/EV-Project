"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFilterStore } from "@/lib/store/filterStore";
import { api } from "@/lib/api/client";
import ChartCard from "@/components/ui/ChartCard";
import AccountTrendChart from "@/components/charts/AccountTrendChart";
import SortableTable from "@/components/ui/SortableTable";
import DatePicker from "@/components/ui/DatePicker";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { downloadCsv } from "@/lib/utils/csvExport";

// 인라인 CSV 버튼
function CsvBtn({ label, rows, filename }: { label: string; rows: (string|number|null)[][]; filename: string }) {
  return (
    <button onClick={() => downloadCsv([label, "금액 (KRW)"], rows, filename)}
      style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:12, fontWeight:500, color:"#A1A8B3", background:"none", border:"1px solid #DFE3E6", borderRadius:7, padding:"4px 10px", cursor:"pointer" }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color="#FD5108"; (e.currentTarget as HTMLElement).style.borderColor="#FD5108"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color="#A1A8B3"; (e.currentTarget as HTMLElement).style.borderColor="#DFE3E6"; }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      CSV
    </button>
  );
}

// BS 항목 카드
function BsItemCard({ title, subtitle, rows, filename }: {
  title: string; subtitle?: string; rows: (string|number|null)[][]; filename: string;
}) {
  return (
    <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
      <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "#EEEFF1" }}>
        <div>
          <h3 className="text-base font-semibold" style={{ color: "#000" }}>{title}</h3>
          {subtitle && <p className="text-xs mt-0.5" style={{ color: "#A1A8B3" }}>{subtitle}</p>}
        </div>
        <CsvBtn label="항목" rows={rows} filename={filename} />
      </div>
      <div className="px-3 py-2">
        <SortableTable
          columns={[
            { key: "label",  label: "항목",       align: "left" },
            { key: "amount", label: "금액 (KRW)", align: "right" },
          ]}
          rows={rows}
          filename={filename}
          maxHeight={420}
          hideCsvButton
        />
      </div>
    </div>
  );
}

export default function BsAccountPage() {
  const { dateFrom, dateTo } = useFilterStore();
  const [refDate, setRefDate] = useState(dateTo);

  const { data, isLoading } = useQuery({
    queryKey: ["balance-sheet", dateFrom, refDate],
    queryFn: () => api.financialStatements.balanceSheet({ date_from: dateFrom, date_to: refDate }),
  });

  const bs = data as any;

  const assetRows: (string|number|null)[][] = bs ? [
    ["자산 합계",    bs.assets.total],
    ["  유동자산",   bs.assets.current.subtotal],
    ...bs.assets.current.items.map((i: any) => [`    ${i.account}`, i.amount]),
    ["  비유동자산", bs.assets.noncurrent.subtotal],
    ...bs.assets.noncurrent.items.map((i: any) => [`    ${i.account}`, i.amount]),
  ] : [];

  const liabRows: (string|number|null)[][] = bs ? [
    ["부채 합계",    bs.liabilities.total],
    ["  유동부채",   bs.liabilities.current.subtotal],
    ...bs.liabilities.current.items.map((i: any) => [`    ${i.account}`, i.amount]),
    ["  비유동부채", bs.liabilities.noncurrent.subtotal],
    ...bs.liabilities.noncurrent.items.map((i: any) => [`    ${i.account}`, i.amount]),
  ] : [];

  const equityRows: (string|number|null)[][] = bs ? [
    ["자본 합계",    bs.equity.total],
    ...(bs.equity.items ?? []).map((i: any) => [`    ${i.account}`, i.amount]),
  ] : [];

  return (
    <div className="space-y-5">
      {/* 계정 추이 차트 */}
      <ChartCard title="BS 계정분석" subtitle="계정을 선택해 잔액 추이 및 상대계정을 확인하세요">
        <AccountTrendChart />
      </ChartCard>

      {/* 기준일 선택 */}
      <div className="flex items-center gap-3">
        <span style={{ fontSize: 13, color: "#A1A8B3" }}>기준일</span>
        <DatePicker value={refDate} onChange={setRefDate} minDate="2024-01-01" maxDate="2026-03-31" />
        {isLoading && <span style={{ fontSize: 12, color: "#A1A8B3" }}>불러오는 중...</span>}
      </div>

      {/* BS 테이블 3열: 자산 / 부채 / 자본 */}
      {bs ? (
        <div className="grid grid-cols-3 gap-4">
          <BsItemCard title="자산" subtitle={`기준일: ${refDate}`} rows={assetRows} filename="BS_자산" />
          <BsItemCard title="부채" subtitle={`기준일: ${refDate}`} rows={liabRows} filename="BS_부채" />
          <BsItemCard title="자본" subtitle={`기준일: ${refDate}`} rows={equityRows} filename="BS_자본" />
        </div>
      ) : isLoading ? (
        <LoadingSpinner height={300} />
      ) : null}
    </div>
  );
}
