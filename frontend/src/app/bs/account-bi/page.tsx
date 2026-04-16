"use client";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFilterStore, BSBase } from "@/lib/store/filterStore";
import { api, BsDetailRow, BsEntry, BsVendorDeltaItem } from "@/lib/api/client";
import { formatKRW, formatPct, chartAxisFormatter } from "@/lib/utils/formatters";
import { downloadCsv } from "@/lib/utils/csvExport";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { AXIS_STYLE, GRID_STROKE, TOOLTIP_STYLE } from "@/lib/utils/chartColors";

/*
  BS 계정분석 (BI) — Power BI #12 완전 재현
  - 재무항목 PivotTable (기초/기말/증감 by 공시용계정)
  - 당기 전표 내역 Table
  - 거래처별 증감 BarChart
  - 계정별 잔액 추이 AreaChart
  - 상세계정 PivotTable
  - 슬라이서: 기준연월, 비교대상(연초/월초)
*/

const POS_COLOR = "#16C784";
const NEG_COLOR = "#FD5108";
const PANEL_CLS = "bg-white rounded-lg border overflow-hidden card-hover";
const PANEL_STYLE: React.CSSProperties = { borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" };

function BiTag() {
  return (
    <span style={{
      display: "inline-block", fontSize: 10, fontWeight: 700, color: "#fff",
      backgroundColor: "#FD5108", borderRadius: 4, padding: "2px 6px", marginLeft: 8,
      verticalAlign: "middle", letterSpacing: "0.5px",
    }}>BI</span>
  );
}

function ChartHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "#EEEFF1" }}>
      <span style={{ fontSize: 16, fontWeight: 600, color: "#1A1A2E" }}>{title}</span>
      {right}
    </div>
  );
}

function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      fontSize: 12, padding: "4px 12px", borderRadius: 16,
      border: active ? "1px solid #FD5108" : "1px solid #DFE3E6",
      backgroundColor: active ? "#FFF5ED" : "#fff",
      color: active ? "#FD5108" : "#6B7280",
      fontWeight: active ? 600 : 400, cursor: "pointer", whiteSpace: "nowrap",
    }}>
      {label}
    </button>
  );
}

const BRANCH_BADGE: Record<string, { bg: string; color: string }> = {
  "자산": { bg: "#FFF5ED", color: "#FD5108" },
  "부채": { bg: "#F0F0F5", color: "#6B7280" },
  "자본": { bg: "#EFF6FF", color: "#3B82F6" },
};

const fmtM = (v: string) => v.slice(2, 4) + "." + v.slice(5);

export default function BsAccountBiPage() {
  const { dateFrom, dateTo, bsAccountCompareBase, setBsAccountCompareBase } = useFilterStore();
  const params = { date_from: dateFrom, date_to: dateTo };

  // 선택된 계정
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);

  // 재무항목 테이블
  const { data: detailRows = [] } = useQuery({
    queryKey: ["bs-detail-table", dateFrom, dateTo, bsAccountCompareBase],
    queryFn: () => api.bsBi.detailTable({ ...params, compare_base: bsAccountCompareBase }),
  });

  // 거래처별 증감
  const { data: vendorDelta = [] } = useQuery({
    queryKey: ["bs-vendor-delta", dateFrom, dateTo, selectedAccount],
    queryFn: () => api.bsBi.vendorDelta({ ...params, account: selectedAccount }),
    enabled: !!selectedAccount,
  });

  // 전표 내역
  const { data: entries = [] } = useQuery({
    queryKey: ["bs-entries-acct", dateFrom, dateTo, selectedAccount],
    queryFn: () => api.bsBi.entries({ ...params, account: selectedAccount }),
    enabled: !!selectedAccount,
  });

  // 계정별 잔액 추이 (월별 데이터 재사용)
  const { data: monthlyRaw = [] } = useQuery({
    queryKey: ["bs-monthly", dateFrom, dateTo],
    queryFn: () => api.bsTrend.monthly(params),
  });

  // 월별 잔액 추이 차트 데이터
  const trendChartData = useMemo(() => {
    if (!selectedAccount) return [];
    // daily balance for selected account
    return [];
  }, [selectedAccount]);

  const { data: dailyBalance = [] } = useQuery({
    queryKey: ["bs-daily-balance-acct", dateFrom, dateTo, selectedAccount],
    queryFn: () => api.bsBi.dailyBalance({ ...params, account: selectedAccount }),
    enabled: !!selectedAccount,
  });

  const dailyChartData = useMemo(() =>
    (dailyBalance as any[]).map(d => ({ date: d.date.slice(5), balance: d.balance }))
  , [dailyBalance]);

  // 거래처 증감 차트 데이터
  const vendorChartData = useMemo(() =>
    (vendorDelta as BsVendorDeltaItem[]).slice(0, 15).map(d => ({
      vendor: d.vendor.length > 12 ? d.vendor.slice(0, 12) + "…" : d.vendor,
      amount: d.amount,
    }))
  , [vendorDelta]);

  // 자산/부채별 소계
  const { assetRows, liabRows } = useMemo(() => {
    const rows = detailRows as BsDetailRow[];
    return {
      assetRows: rows.filter(r => r.branch === "자산"),
      liabRows: rows.filter(r => r.branch === "부채"),
    };
  }, [detailRows]);

  const handleCsvDetail = () => {
    const headers = ["계정과목", "구분", "기초잔액", "기말잔액", "증감", "증감률"];
    const rows = (detailRows as BsDetailRow[]).map(d => [d.account, `${d.branch}/${d.division}`, d.opening, d.closing, d.delta, d.delta_pct + "%"]);
    downloadCsv(headers, rows, "BS_재무항목");
  };

  const handleCsvEntries = () => {
    const headers = ["일자", "전표번호", "계정", "거래처", "적요", "차변", "대변"];
    const rows = (entries as BsEntry[]).map(e => [e.date, e.je_number, e.account, e.vendor, e.memo, e.debit, e.credit]);
    downloadCsv(headers, rows, "BS_전표내역");
  };

  return (
    <div className="space-y-5">
      {/* 페이지 타이틀 */}
      <div className="flex items-center gap-2">
        <span style={{ fontSize: 20, fontWeight: 700, color: "#1A1A2E" }}>BS 계정분석</span>
        <BiTag />
        <span style={{ fontSize: 12, color: "#A1A8B3", marginLeft: 4 }}>Power BI 레이아웃</span>
      </div>

      {/* 슬라이서 바 */}
      <div className={PANEL_CLS} style={{ ...PANEL_STYLE, padding: "12px 16px" }}>
        <div className="flex items-center gap-4">
          <span style={{ fontSize: 13, fontWeight: 600, color: "#1A1A2E" }}>비교대상</span>
          <div className="flex gap-1">
            <FilterPill label="연초" active={bsAccountCompareBase === "연초"} onClick={() => setBsAccountCompareBase("연초")} />
            <FilterPill label="월초" active={bsAccountCompareBase === "월초"} onClick={() => setBsAccountCompareBase("월초")} />
          </div>
        </div>
      </div>

      {/* 재무항목 PivotTable — PBI pivotTable */}
      <div className={PANEL_CLS} style={PANEL_STYLE}>
        <ChartHeader title="재무항목" right={
          <button onClick={handleCsvDetail} style={{
            display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 500,
            color: "#A1A8B3", background: "none", border: "1px solid #DFE3E6", borderRadius: 7,
            padding: "4px 10px", cursor: "pointer",
          }}>CSV</button>
        } />
        <div style={{ overflowY: "auto", maxHeight: 480 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
              <tr style={{ backgroundColor: "#F5F7F8" }}>
                <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "#A1A8B3" }}>공시용계정</th>
                <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "#A1A8B3" }}>구분</th>
                <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600, color: "#A1A8B3" }}>기초(S)</th>
                <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600, color: "#A1A8B3" }}>기말</th>
                <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600, color: "#A1A8B3" }}>증감</th>
                <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600, color: "#A1A8B3" }}>증감률</th>
              </tr>
            </thead>
            <tbody>
              {(detailRows as BsDetailRow[]).map((d, i) => {
                const badge = BRANCH_BADGE[d.branch];
                const isSelected = selectedAccount === d.account;
                return (
                  <tr key={i}
                    onClick={() => setSelectedAccount(isSelected ? null : d.account)}
                    style={{
                      borderTop: "1px solid #EEEFF1", cursor: "pointer",
                      backgroundColor: isSelected ? "#FFF5ED" : undefined,
                    }}
                    onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = "#FAFBFC"; }}
                    onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = ""; }}>
                    <td style={{ padding: "7px 14px", color: "#1A1A2E", fontWeight: isSelected ? 600 : 500 }}>{d.account}</td>
                    <td style={{ padding: "7px 14px" }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 10, backgroundColor: badge?.bg ?? "#F0F0F5", color: badge?.color ?? "#6B7280" }}>
                        {d.division || d.branch}
                      </span>
                    </td>
                    <td style={{ padding: "7px 14px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{d.opening.toLocaleString("ko-KR")}</td>
                    <td style={{ padding: "7px 14px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{d.closing.toLocaleString("ko-KR")}</td>
                    <td style={{ padding: "7px 14px", textAlign: "right", color: d.delta >= 0 ? POS_COLOR : NEG_COLOR, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
                      {d.delta.toLocaleString("ko-KR")}
                    </td>
                    <td style={{ padding: "7px 14px", textAlign: "right", color: d.delta >= 0 ? POS_COLOR : NEG_COLOR, fontVariantNumeric: "tabular-nums" }}>
                      {formatPct(d.delta_pct)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedAccount && (
        <>
          {/* 계정별 잔액 추이 + 거래처별 증감 */}
          <div className="grid grid-cols-2 gap-4">
            {/* 잔액 추이 — PBI areaChart */}
            <div className={PANEL_CLS} style={PANEL_STYLE}>
              <ChartHeader title={`계정별 잔액 추이 — ${selectedAccount}`} />
              <div style={{ padding: "6px 8px 8px" }}>
                {dailyChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={dailyChartData} margin={{ top: 6, right: 16, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="gradAcctTrend" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#FD5108" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#FD5108" stopOpacity={0.03} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                      <XAxis dataKey="date" tick={AXIS_STYLE} tickLine={false} axisLine={false} interval={Math.max(1, Math.floor(dailyChartData.length / 12))} />
                      <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={72}
                        tickFormatter={v => formatKRW(v)} />
                      <Tooltip formatter={(v: any) => formatKRW(Number(v))} contentStyle={TOOLTIP_STYLE} />
                      <Area type="monotone" dataKey="balance" stroke="#FD5108" strokeWidth={1.5}
                        fill="url(#gradAcctTrend)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center", color: "#A1A8B3", fontSize: 13 }}>
                    데이터를 불러오는 중...
                  </div>
                )}
              </div>
            </div>

            {/* 거래처별 증감 — PBI clusteredBarChart */}
            <div className={PANEL_CLS} style={PANEL_STYLE}>
              <ChartHeader title="거래처별 증감" />
              {vendorChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={Math.max(240, vendorChartData.length * 26 + 40)}>
                  <BarChart data={vendorChartData} layout="vertical" margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
                    <XAxis type="number" tickFormatter={chartAxisFormatter} tick={AXIS_STYLE} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="vendor" tick={{ fontSize: 10, fill: "#A1A8B3" }} tickLine={false} axisLine={false} width={120} />
                    <Tooltip formatter={(v: any) => formatKRW(Number(v))} contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="amount" name="증감" radius={[0, 3, 3, 0]} barSize={10}>
                      {vendorChartData.map((d, i) => (
                        <Cell key={i} fill={d.amount >= 0 ? POS_COLOR : NEG_COLOR} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center", color: "#A1A8B3", fontSize: 13 }}>
                  데이터 없음
                </div>
              )}
            </div>
          </div>

          {/* 당기 전표 내역 — PBI tableEx */}
          <div className={PANEL_CLS} style={PANEL_STYLE}>
            <ChartHeader title={`당기 전표 내역 — ${selectedAccount}`} right={
              <button onClick={handleCsvEntries} style={{
                display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 500,
                color: "#A1A8B3", background: "none", border: "1px solid #DFE3E6", borderRadius: 7,
                padding: "4px 10px", cursor: "pointer",
              }}>CSV</button>
            } />
            <div style={{ overflowY: "auto", overflowX: "auto", maxHeight: 380 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                  <tr style={{ backgroundColor: "#F5F7F8" }}>
                    {["일자", "전표번호", "계정과목", "거래처", "적요", "차변", "대변"].map(h => (
                      <th key={h} style={{ padding: "8px 10px", fontWeight: 600, color: "#A1A8B3", textAlign: h === "차변" || h === "대변" ? "right" : "left", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(entries as BsEntry[]).length === 0 ? (
                    <tr><td colSpan={7} style={{ padding: 24, textAlign: "center", color: "#A1A8B3" }}>데이터 없음</td></tr>
                  ) : (entries as BsEntry[]).map((e, i) => (
                    <tr key={i} style={{ borderTop: "1px solid #EEEFF1" }}
                      onMouseEnter={ev => (ev.currentTarget as HTMLElement).style.backgroundColor = "#FAFBFC"}
                      onMouseLeave={ev => (ev.currentTarget as HTMLElement).style.backgroundColor = ""}>
                      <td style={{ padding: "6px 10px", whiteSpace: "nowrap" }}>{e.date}</td>
                      <td style={{ padding: "6px 10px", color: "#FD5108", fontWeight: 500 }}>{e.je_number}</td>
                      <td style={{ padding: "6px 10px" }}>{e.account}</td>
                      <td style={{ padding: "6px 10px" }}>{e.vendor}</td>
                      <td style={{ padding: "6px 10px", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.memo}</td>
                      <td style={{ padding: "6px 10px", textAlign: "right", color: e.debit > 0 ? POS_COLOR : "#374151", fontVariantNumeric: "tabular-nums" }}>
                        {e.debit > 0 ? e.debit.toLocaleString("ko-KR") : ""}
                      </td>
                      <td style={{ padding: "6px 10px", textAlign: "right", color: e.credit > 0 ? NEG_COLOR : "#374151", fontVariantNumeric: "tabular-nums" }}>
                        {e.credit > 0 ? e.credit.toLocaleString("ko-KR") : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
