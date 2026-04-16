"use client";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFilterStore } from "@/lib/store/filterStore";
import { api, BsDailyBalance, BsVendorComposition, BsCounterAccount, BsEntry } from "@/lib/api/client";
import { formatKRW, chartAxisFormatter } from "@/lib/utils/formatters";
import { downloadCsv } from "@/lib/utils/csvExport";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { AXIS_STYLE, GRID_STROKE, TOOLTIP_STYLE } from "@/lib/utils/chartColors";

/*
  BS 추이분석 (BI) — Power BI #11 완전 재현
  - 일별 잔액 추이 (AreaChart)
  - 거래처 구성 차변/대변 (Horizontal BarChart — Treemap 대안)
  - 상대계정 (PivotTable)
  - 전표 상세내역 (Table)
  - 슬라이서: 공시용계정, 기표Side, 거래처, 관리계정
*/

const POS_COLOR = "#C1292E";
const NEG_COLOR = "#1D6BB5";
const PANEL_CLS = "bg-white border overflow-hidden";
const PANEL_STYLE: React.CSSProperties = {
  borderColor: "#DFE3E6", borderRadius: 8,
  boxShadow: "0 4px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)",
  transition: "box-shadow 0.2s ease, transform 0.2s ease",
};

function BiTag() {
  return (
    <span style={{
      display: "inline-block", fontSize: 10, fontWeight: 700, color: "#fff",
      backgroundColor: "#FD5108", borderRadius: 4, padding: "2px 6px", marginLeft: 8,
      verticalAlign: "middle", letterSpacing: "0.5px",
    }}>BI</span>
  );
}

function ChartHeader({ title }: { title: string }) {
  return (
    <div className="px-5 py-3 border-b" style={{ borderColor: "#EEEFF1" }}>
      <span style={{ fontSize: 16, fontWeight: 600, color: "#1A1D23" }}>{title}</span>
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

// 거래처 구성 수평바 (Treemap 대안)
function VendorBar({ title, data, color }: { title: string; data: BsVendorComposition[]; color: string }) {
  const chartData = data.slice(0, 15).map(d => ({
    vendor: d.vendor.length > 14 ? d.vendor.slice(0, 14) + "…" : d.vendor,
    amount: d.amount,
  }));
  const total = data.reduce((s, d) => s + d.amount, 0);

  return (
    <div className={PANEL_CLS} style={PANEL_STYLE}>
      <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "#EEEFF1" }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: "#1A1D23" }}>{title}</span>
        <span style={{ fontSize: 12, color: "#7A8290" }}>합계: {formatKRW(total)}</span>
      </div>
      {chartData.length === 0 ? (
        <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "#7A8290", fontSize: 13 }}>
          계정을 선택하세요
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 26 + 40)}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
            <XAxis type="number" tickFormatter={chartAxisFormatter} tick={AXIS_STYLE} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="vendor" tick={{ fontSize: 11, fill: "#7A8290" }} tickLine={false} axisLine={false} width={120} />
            <Tooltip formatter={(v: any) => formatKRW(Number(v))} contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey="amount" name="금액" radius={[0, 3, 3, 0]} barSize={10} fill={color} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default function BsTrendBiPage() {
  const { dateFrom, dateTo, bsTrendAccount, bsTrendDebitCredit, bsTrendVendor,
    setBsTrendAccount, setBsTrendDebitCredit, setBsTrendVendor } = useFilterStore();
  const params = { date_from: dateFrom, date_to: dateTo };

  // 계정 목록 (슬라이서용)
  const { data: accountsList = [] } = useQuery({
    queryKey: ["bs-accounts-list"],
    queryFn: () => api.bsBi.accountsList(),
  });

  // 일별 잔액 추이
  const { data: dailyBalance = [] } = useQuery({
    queryKey: ["bs-daily-balance", dateFrom, dateTo, bsTrendAccount],
    queryFn: () => api.bsBi.dailyBalance({ ...params, account: bsTrendAccount }),
    enabled: !!bsTrendAccount,
  });

  // 거래처 구성 (차변)
  const { data: vendorDebit = [] } = useQuery({
    queryKey: ["bs-vendor-debit", dateFrom, dateTo, bsTrendAccount],
    queryFn: () => api.bsBi.vendorComposition({ ...params, account: bsTrendAccount, debit_credit: "D" }),
    enabled: !!bsTrendAccount,
  });

  // 거래처 구성 (대변)
  const { data: vendorCredit = [] } = useQuery({
    queryKey: ["bs-vendor-credit", dateFrom, dateTo, bsTrendAccount],
    queryFn: () => api.bsBi.vendorComposition({ ...params, account: bsTrendAccount, debit_credit: "C" }),
    enabled: !!bsTrendAccount,
  });

  // 상대계정
  const { data: counterAccounts = [] } = useQuery({
    queryKey: ["bs-counter-accounts", dateFrom, dateTo, bsTrendAccount],
    queryFn: () => api.bsBi.counterAccounts({ ...params, account: bsTrendAccount }),
    enabled: !!bsTrendAccount,
  });

  // 전표 상세내역
  const { data: entries = [] } = useQuery({
    queryKey: ["bs-entries", dateFrom, dateTo, bsTrendAccount, bsTrendDebitCredit, bsTrendVendor],
    queryFn: () => api.bsBi.entries({
      ...params, account: bsTrendAccount,
      debit_credit: bsTrendDebitCredit, vendor: bsTrendVendor,
    }),
    enabled: !!bsTrendAccount,
  });

  // 일별 차트 데이터
  const dailyChartData = useMemo(() =>
    (dailyBalance as BsDailyBalance[]).map(d => ({
      date: d.date.slice(5),  // MM-DD
      balance: d.balance,
    }))
  , [dailyBalance]);

  const dailyXTick = useMemo(() => {
    return function XTick({ x, y, payload, index }: any) {
      if (index % Math.max(1, Math.floor(dailyChartData.length / 12)) !== 0) return <g />;
      return <text x={x} y={y + 10} textAnchor="middle" fill="#7A8290" fontSize={11}>{payload.value}</text>;
    };
  }, [dailyChartData.length]);

  // 고유 거래처 목록 (슬라이서)
  const vendorList = useMemo(() => {
    const all = [...vendorDebit, ...vendorCredit];
    return [...new Set(all.map(d => d.vendor))].slice(0, 30);
  }, [vendorDebit, vendorCredit]);

  const handleCsvEntries = () => {
    const headers = ["일자", "전표번호", "계정", "거래처", "적요", "차변", "대변"];
    const rows = (entries as BsEntry[]).map(e => [e.date, e.je_number, e.account, e.vendor, e.memo, e.debit, e.credit]);
    downloadCsv(headers, rows, "BS_전표내역");
  };

  return (
    <div className="space-y-8">
      {/* 페이지 타이틀 */}
      <div className="flex items-center gap-2">
        <span style={{ fontSize: 20, fontWeight: 700, color: "#1A1D23" }}>BS 추이분석</span>
        <BiTag />
        <span style={{ fontSize: 12, color: "#7A8290", marginLeft: 4 }}>Power BI 레이아웃</span>
      </div>

      {/* 슬라이서 바 */}
      <div className={PANEL_CLS} style={{ ...PANEL_STYLE, padding: "12px 16px" }}>
        <div className="flex flex-wrap gap-3 items-center">
          {/* 공시용계정 선택 */}
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 13, fontWeight: 600, color: "#1A1D23", whiteSpace: "nowrap" }}>공시용계정</span>
            <select
              value={bsTrendAccount ?? ""}
              onChange={e => setBsTrendAccount(e.target.value || null)}
              style={{
                fontSize: 12, padding: "4px 8px", borderRadius: 6, border: "1px solid #DFE3E6",
                color: "#4A5056", minWidth: 160, backgroundColor: "#fff",
              }}
            >
              <option value="">전체 (선택하세요)</option>
              {(accountsList as any[]).map(a => (
                <option key={a.account} value={a.account}>{a.account} ({a.branch})</option>
              ))}
            </select>
          </div>

          {/* 기표 Side */}
          <div style={{ width: 1, height: 20, backgroundColor: "#EEEFF1" }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#1A1D23" }}>기표 Side</span>
          <div className="flex gap-1">
            <FilterPill label="전체" active={!bsTrendDebitCredit} onClick={() => setBsTrendDebitCredit(null)} />
            <FilterPill label="차변(D)" active={bsTrendDebitCredit === "D"} onClick={() => setBsTrendDebitCredit(bsTrendDebitCredit === "D" ? null : "D")} />
            <FilterPill label="대변(C)" active={bsTrendDebitCredit === "C"} onClick={() => setBsTrendDebitCredit(bsTrendDebitCredit === "C" ? null : "C")} />
          </div>

          {/* 거래처 */}
          {vendorList.length > 0 && (
            <>
              <div style={{ width: 1, height: 20, backgroundColor: "#EEEFF1" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#1A1D23" }}>거래처</span>
              <select
                value={bsTrendVendor ?? ""}
                onChange={e => setBsTrendVendor(e.target.value || null)}
                style={{
                  fontSize: 12, padding: "4px 8px", borderRadius: 6, border: "1px solid #DFE3E6",
                  color: "#4A5056", minWidth: 140,
                }}
              >
                <option value="">전체</option>
                {vendorList.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </>
          )}
        </div>
      </div>

      {!bsTrendAccount ? (
        <div className={PANEL_CLS} style={{ ...PANEL_STYLE, padding: "60px 0", textAlign: "center" }}>
          <div style={{ fontSize: 14, color: "#7A8290" }}>공시용계정을 선택하면 상세 분석이 표시됩니다</div>
        </div>
      ) : (
        <>
          {/* 일별 잔액 추이 — PBI areaChart */}
          <div className={PANEL_CLS} style={PANEL_STYLE}>
            <ChartHeader title={`일별 잔액 추이 — ${bsTrendAccount}`} />
            <div style={{ padding: "12px 24px 24px" }}>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={dailyChartData} margin={{ top: 6, right: 16, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="gradDaily" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#E04A00" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#E04A00" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                  <XAxis dataKey="date" tick={dailyXTick} tickLine={false} axisLine={false} interval={0} />
                  <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={72}
                    tickFormatter={v => formatKRW(v)} />
                  <Tooltip formatter={(v: any) => formatKRW(Number(v))} contentStyle={TOOLTIP_STYLE} />
                  <Area type="monotone" dataKey="balance" stroke="#E04A00" strokeWidth={1.5}
                    fill="url(#gradDaily)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 거래처 구성 (차변/대변) — PBI treemap → BarChart 대안 */}
          <div className="grid grid-cols-2 gap-4">
            <VendorBar title="거래처 구성 (차변)" data={vendorDebit as BsVendorComposition[]} color="#E04A00" />
            <VendorBar title="거래처 구성 (대변)" data={vendorCredit as BsVendorComposition[]} color="#54565A" />
          </div>

          {/* 상대계정 — PBI pivotTable */}
          <div className={PANEL_CLS} style={PANEL_STYLE}>
            <ChartHeader title="상대계정" />
            <div style={{ overflowY: "auto", maxHeight: 360 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                  <tr style={{ backgroundColor: "#F5F7F8" }}>
                    <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "#7A8290" }}>상대계정</th>
                    <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600, color: "#7A8290" }}>차변 합계</th>
                    <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600, color: "#7A8290" }}>대변 합계</th>
                    <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600, color: "#7A8290" }}>건수</th>
                  </tr>
                </thead>
                <tbody>
                  {(counterAccounts as BsCounterAccount[]).length === 0 ? (
                    <tr><td colSpan={4} style={{ padding: 24, textAlign: "center", color: "#7A8290" }}>데이터 없음</td></tr>
                  ) : (counterAccounts as BsCounterAccount[]).map((ca, i) => (
                    <tr key={i} style={{ borderTop: "1px solid #EEEFF1" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "#FFE8D4"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = ""}>
                      <td style={{ padding: "7px 14px", color: "#1A1D23", fontWeight: 500 }}>{ca.account}</td>
                      <td style={{ padding: "7px 14px", textAlign: "right", fontVariantNumeric: "tabular-nums", fontFeatureSettings: "'tnum' 1, 'zero' 1" }}>{ca.debit_total.toLocaleString("ko-KR")}</td>
                      <td style={{ padding: "7px 14px", textAlign: "right", fontVariantNumeric: "tabular-nums", fontFeatureSettings: "'tnum' 1, 'zero' 1" }}>{ca.credit_total.toLocaleString("ko-KR")}</td>
                      <td style={{ padding: "7px 14px", textAlign: "right", color: "#6B7280" }}>{ca.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 전표 상세내역 — PBI tableEx */}
          <div className={PANEL_CLS} style={PANEL_STYLE}>
            <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "#EEEFF1" }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: "#1A1D23" }}>전표 상세내역</span>
              <button onClick={handleCsvEntries}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 500,
                  color: "#7A8290", background: "none", border: "1px solid #DFE3E6", borderRadius: 7,
                  padding: "4px 10px", cursor: "pointer",
                }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                CSV
              </button>
            </div>
            <div style={{ overflowY: "auto", overflowX: "auto", maxHeight: 420 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                  <tr style={{ backgroundColor: "#F5F7F8" }}>
                    {["일자", "전표번호", "계정과목", "거래처", "적요", "차변", "대변"].map(h => (
                      <th key={h} style={{ padding: "8px 10px", fontWeight: 600, color: "#7A8290", textAlign: h === "차변" || h === "대변" ? "right" : "left", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(entries as BsEntry[]).length === 0 ? (
                    <tr><td colSpan={7} style={{ padding: 24, textAlign: "center", color: "#7A8290" }}>데이터 없음</td></tr>
                  ) : (entries as BsEntry[]).map((e, i) => (
                    <tr key={i} style={{ borderTop: "1px solid #EEEFF1" }}
                      onMouseEnter={ev => (ev.currentTarget as HTMLElement).style.backgroundColor = "#FFE8D4"}
                      onMouseLeave={ev => (ev.currentTarget as HTMLElement).style.backgroundColor = ""}>
                      <td style={{ padding: "6px 10px", whiteSpace: "nowrap" }}>{e.date}</td>
                      <td style={{ padding: "6px 10px", color: "#FD5108", fontWeight: 500 }}>{e.je_number}</td>
                      <td style={{ padding: "6px 10px" }}>{e.account}</td>
                      <td style={{ padding: "6px 10px" }}>{e.vendor}</td>
                      <td style={{ padding: "6px 10px", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.memo}</td>
                      <td style={{ padding: "6px 10px", textAlign: "right", color: e.debit > 0 ? POS_COLOR : "#374151", fontVariantNumeric: "tabular-nums", fontFeatureSettings: "'tnum' 1, 'zero' 1" }}>
                        {e.debit > 0 ? e.debit.toLocaleString("ko-KR") : ""}
                      </td>
                      <td style={{ padding: "6px 10px", textAlign: "right", color: e.credit > 0 ? NEG_COLOR : "#374151", fontVariantNumeric: "tabular-nums", fontFeatureSettings: "'tnum' 1, 'zero' 1" }}>
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
