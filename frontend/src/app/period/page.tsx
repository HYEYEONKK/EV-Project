"use client";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { formatKRW, formatPct, chartAxisFormatter } from "@/lib/utils/formatters";
import { AXIS_STYLE, GRID_STROKE } from "@/lib/utils/chartColors";
import DatePicker from "@/components/ui/DatePicker";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine, Cell,
} from "recharts";

/* ══════════════════════════════════════════
   PwC 컬러
══════════════════════════════════════════ */
const PERIOD_A_COLOR = "#FD5108";
const PERIOD_B_COLOR = "#A1A8B3";
const POS_COLOR      = "#16C784";
const NEG_COLOR      = "#FF4747";

/* ══════════════════════════════════════════
   섹션 헤더
══════════════════════════════════════════ */
function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span style={{ fontSize: 16, fontWeight: 600, color: "#1A1A2E", whiteSpace: "nowrap" }}>{title}</span>
      <div style={{
        flex: 1, height: 2, borderRadius: 2, position: "relative", overflow: "hidden",
        background: "linear-gradient(90deg, rgba(253,81,8,0.08) 0%, rgba(255,170,114,0.5) 28%, #FE7C39 62%, #FD5108 100%)",
      }} />
    </div>
  );
}

/* ══════════════════════════════════════════
   기간 레이블 배지
══════════════════════════════════════════ */
function PeriodBadge({ label, from, to, color }: { label: string; from: string; to: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full"
      style={{
        fontSize: 12, fontWeight: 600,
        backgroundColor: color === PERIOD_A_COLOR ? "#FFF5ED" : "#F5F7F8",
        color,
        border: `1px solid ${color === PERIOD_A_COLOR ? "#FFAA72" : "#DFE3E6"}`,
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: color, flexShrink: 0 }} />
      {label}: {from} ~ {to}
    </span>
  );
}

/* ══════════════════════════════════════════
   KPI 비교 카드
══════════════════════════════════════════ */
function KpiCompareCard({
  label, colorA, valueA, valueB, colorB,
}: {
  label: string; colorA: string; valueA: number; valueB: number; colorB: string;
}) {
  const delta = valueA - valueB;
  const deltaPct = valueB !== 0 ? (delta / Math.abs(valueB)) * 100 : 0;
  const deltaColor = delta >= 0 ? POS_COLOR : NEG_COLOR;

  return (
    <div
      className="bg-white rounded-lg border overflow-hidden"
      style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}
    >
      {/* 카드 상단 레이블 */}
      <div className="px-5 pt-4 pb-3" style={{ borderBottom: "1px solid #EEEFF1" }}>
        <p style={{ fontSize: 14, fontWeight: 500, color: "#A1A8B3", marginBottom: 2 }}>{label}</p>
      </div>

      {/* A / B / 증감 */}
      <div className="grid grid-cols-3 divide-x" style={{ borderColor: "#EEEFF1" }}>
        {/* 기간 A */}
        <div className="px-4 py-3">
          <p style={{ fontSize: 12, fontWeight: 500, color: colorA, marginBottom: 4 }}>기간 A</p>
          <p style={{ fontSize: 30, fontWeight: 700, color: "#000", letterSpacing: "-0.5px", lineHeight: 1.2, fontVariantNumeric: "tabular-nums" }}>
            {formatKRW(valueA)}
          </p>
        </div>
        {/* 기간 B */}
        <div className="px-4 py-3">
          <p style={{ fontSize: 12, fontWeight: 500, color: colorB, marginBottom: 4 }}>기간 B</p>
          <p style={{ fontSize: 30, fontWeight: 700, color: "#374151", letterSpacing: "-0.5px", lineHeight: 1.2, fontVariantNumeric: "tabular-nums" }}>
            {formatKRW(valueB)}
          </p>
        </div>
        {/* 증감 */}
        <div className="px-4 py-3">
          <p style={{ fontSize: 12, fontWeight: 500, color: "#A1A8B3", marginBottom: 4 }}>증감 (A−B)</p>
          <p style={{ fontSize: 30, fontWeight: 700, color: deltaColor, letterSpacing: "-0.5px", lineHeight: 1.2, fontVariantNumeric: "tabular-nums" }}>
            {delta >= 0 ? "+" : ""}{formatKRW(delta)}
          </p>
          <p style={{ fontSize: 13, fontWeight: 400, color: deltaColor, marginTop: 2 }}>
            {deltaPct >= 0 ? "▲" : "▼"} {Math.abs(deltaPct).toFixed(1)}%
          </p>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   손익항목 비교 테이블
══════════════════════════════════════════ */
type PLData = {
  revenue?: { items: any[] };
  cogs?: { total: number };
  gross_profit?: number;
  gross_margin_pct?: number;
  sga?: { items: any[]; total?: number };
  operating_income?: number;
  operating_margin_pct?: number;
  other_income?: number;
  net_income?: number;
  net_margin_pct?: number;
};

function PlCompareTable({ plA, plB }: { plA: PLData | undefined; plB: PLData | undefined }) {
  const revenueA = plA?.revenue?.items?.reduce((s: number, i: any) => s + i.amount, 0) ?? 0;
  const revenueB = plB?.revenue?.items?.reduce((s: number, i: any) => s + i.amount, 0) ?? 0;
  const cogsA = plA?.cogs?.total ?? 0;
  const cogsB = plB?.cogs?.total ?? 0;
  const sgaA  = plA?.sga?.items?.reduce((s: number, i: any) => s + i.amount, 0) ?? (plA?.sga as any)?.total ?? 0;
  const sgaB  = plB?.sga?.items?.reduce((s: number, i: any) => s + i.amount, 0) ?? (plB?.sga as any)?.total ?? 0;
  const gpA   = plA?.gross_profit ?? 0;
  const gpB   = plB?.gross_profit ?? 0;
  const gpMrgA = plA?.gross_margin_pct ?? 0;
  const gpMrgB = plB?.gross_margin_pct ?? 0;
  const opA   = plA?.operating_income ?? 0;
  const opB   = plB?.operating_income ?? 0;
  const opMrgA = plA?.operating_margin_pct ?? 0;
  const opMrgB = plB?.operating_margin_pct ?? 0;
  const netA  = plA?.net_income ?? 0;
  const netB  = plB?.net_income ?? 0;
  const netMrgA = plA?.net_margin_pct ?? 0;
  const netMrgB = plB?.net_margin_pct ?? 0;

  const rows: {
    label: string;
    indent?: boolean;
    bold?: boolean;
    valA: number;
    valB: number;
    mrgA?: number;
    mrgB?: number;
  }[] = [
    { label: "매출액",          bold: true,  valA: revenueA, valB: revenueB },
    { label: "매출원가",         indent: true, valA: cogsA,    valB: cogsB    },
    { label: "매출총이익",       bold: true,  valA: gpA,      valB: gpB,      mrgA: gpMrgA,  mrgB: gpMrgB  },
    { label: "판매비와관리비",   indent: true, valA: sgaA,     valB: sgaB     },
    { label: "영업이익",         bold: true,  valA: opA,      valB: opB,      mrgA: opMrgA,  mrgB: opMrgB  },
    { label: "당기순이익",       bold: true,  valA: netA,     valB: netB,     mrgA: netMrgA, mrgB: netMrgB },
  ];

  return (
    <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ backgroundColor: "#F5F7F8" }}>
            <th className="text-left px-5 py-2.5 font-semibold" style={{ color: "#A1A8B3" }}>손익항목</th>
            <th className="text-right px-5 py-2.5 font-semibold" style={{ color: PERIOD_A_COLOR }}>기간 A</th>
            <th className="text-right px-5 py-2.5 font-semibold" style={{ color: PERIOD_B_COLOR }}>기간 B</th>
            <th className="text-right px-5 py-2.5 font-semibold" style={{ color: "#374151" }}>증감액</th>
            <th className="text-right px-5 py-2.5 font-semibold" style={{ color: "#374151" }}>증감률</th>
            <th className="text-right px-5 py-2.5 font-semibold" style={{ color: "#A1A8B3" }}>A 이익률</th>
            <th className="text-right px-5 py-2.5 font-semibold" style={{ color: "#A1A8B3" }}>B 이익률</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const delta = r.valA - r.valB;
            const deltaPct = r.valB !== 0 ? (delta / Math.abs(r.valB)) * 100 : 0;
            const deltaColor = delta >= 0 ? POS_COLOR : NEG_COLOR;
            return (
              <tr
                key={i}
                className="border-t"
                style={{ borderColor: "#EEEFF1", backgroundColor: r.bold ? "#FFF5ED" : undefined }}
              >
                <td
                  className="px-5 py-2"
                  style={{
                    fontWeight: r.bold ? 700 : 400,
                    paddingLeft: r.indent ? 28 : 20,
                    color: r.bold ? "#FD5108" : "#000",
                  }}
                >
                  {r.label}
                </td>
                <td className="text-right px-5 py-2" style={{ fontWeight: r.bold ? 700 : 400, fontVariantNumeric: "tabular-nums" }}>
                  {formatKRW(r.valA)}
                </td>
                <td className="text-right px-5 py-2" style={{ fontWeight: r.bold ? 700 : 400, fontVariantNumeric: "tabular-nums", color: "#374151" }}>
                  {formatKRW(r.valB)}
                </td>
                <td className="text-right px-5 py-2" style={{ fontWeight: r.bold ? 700 : 400, color: deltaColor, fontVariantNumeric: "tabular-nums" }}>
                  {delta >= 0 ? "+" : ""}{formatKRW(delta)}
                </td>
                <td className="text-right px-5 py-2" style={{ color: deltaColor, fontVariantNumeric: "tabular-nums" }}>
                  {deltaPct >= 0 ? "▲" : "▼"} {Math.abs(deltaPct).toFixed(1)}%
                </td>
                <td className="text-right px-5 py-2" style={{ color: "#A1A8B3", fontVariantNumeric: "tabular-nums" }}>
                  {r.mrgA !== undefined ? `${r.mrgA.toFixed(1)}%` : "—"}
                </td>
                <td className="text-right px-5 py-2" style={{ color: "#A1A8B3", fontVariantNumeric: "tabular-nums" }}>
                  {r.mrgB !== undefined ? `${r.mrgB.toFixed(1)}%` : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ══════════════════════════════════════════
   재무상태 비교 테이블
══════════════════════════════════════════ */
type BSData = {
  assets?: { total: number; current: { subtotal: number }; noncurrent: { subtotal: number } };
  liabilities?: { total: number; current: { subtotal: number }; noncurrent: { subtotal: number } };
  equity?: { total: number };
};

function BsCompareTable({ bsA, bsB }: { bsA: BSData | undefined; bsB: BSData | undefined }) {
  const rows: { label: string; bold?: boolean; indent?: boolean; valA: number; valB: number }[] = [
    { label: "자산 합계",   bold: true,  valA: bsA?.assets?.total      ?? 0, valB: bsB?.assets?.total      ?? 0 },
    { label: "유동자산",    indent: true, valA: bsA?.assets?.current?.subtotal    ?? 0, valB: bsB?.assets?.current?.subtotal    ?? 0 },
    { label: "비유동자산",  indent: true, valA: bsA?.assets?.noncurrent?.subtotal ?? 0, valB: bsB?.assets?.noncurrent?.subtotal ?? 0 },
    { label: "부채 합계",   bold: true,  valA: bsA?.liabilities?.total      ?? 0, valB: bsB?.liabilities?.total      ?? 0 },
    { label: "유동부채",    indent: true, valA: bsA?.liabilities?.current?.subtotal    ?? 0, valB: bsB?.liabilities?.current?.subtotal    ?? 0 },
    { label: "비유동부채",  indent: true, valA: bsA?.liabilities?.noncurrent?.subtotal ?? 0, valB: bsB?.liabilities?.noncurrent?.subtotal ?? 0 },
    { label: "자본 합계",   bold: true,  valA: bsA?.equity?.total ?? 0, valB: bsB?.equity?.total ?? 0 },
  ];

  return (
    <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ backgroundColor: "#F5F7F8" }}>
            <th className="text-left px-5 py-2.5 font-semibold" style={{ color: "#A1A8B3" }}>재무항목</th>
            <th className="text-right px-5 py-2.5 font-semibold" style={{ color: PERIOD_A_COLOR }}>기간 A</th>
            <th className="text-right px-5 py-2.5 font-semibold" style={{ color: PERIOD_B_COLOR }}>기간 B</th>
            <th className="text-right px-5 py-2.5 font-semibold" style={{ color: "#374151" }}>증감액</th>
            <th className="text-right px-5 py-2.5 font-semibold" style={{ color: "#374151" }}>증감률</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const delta = r.valA - r.valB;
            const deltaPct = r.valB !== 0 ? (delta / Math.abs(r.valB)) * 100 : 0;
            const deltaColor = delta >= 0 ? POS_COLOR : NEG_COLOR;
            return (
              <tr
                key={i}
                className="border-t"
                style={{ borderColor: "#EEEFF1", backgroundColor: r.bold ? "#FFF5ED" : undefined }}
              >
                <td
                  className="px-5 py-2"
                  style={{
                    fontWeight: r.bold ? 700 : 400,
                    paddingLeft: r.indent ? 28 : 20,
                    color: r.bold ? "#FD5108" : "#000",
                  }}
                >
                  {r.label}
                </td>
                <td className="text-right px-5 py-2" style={{ fontWeight: r.bold ? 700 : 400, fontVariantNumeric: "tabular-nums" }}>
                  {formatKRW(r.valA)}
                </td>
                <td className="text-right px-5 py-2" style={{ fontWeight: r.bold ? 700 : 400, fontVariantNumeric: "tabular-nums", color: "#374151" }}>
                  {formatKRW(r.valB)}
                </td>
                <td className="text-right px-5 py-2" style={{ fontWeight: r.bold ? 700 : 400, color: deltaColor, fontVariantNumeric: "tabular-nums" }}>
                  {delta >= 0 ? "+" : ""}{formatKRW(delta)}
                </td>
                <td className="text-right px-5 py-2" style={{ color: deltaColor, fontVariantNumeric: "tabular-nums" }}>
                  {deltaPct >= 0 ? "▲" : "▼"} {Math.abs(deltaPct).toFixed(1)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ══════════════════════════════════════════
   월별 추이 비교 차트
══════════════════════════════════════════ */
interface MonthlyChartProps {
  monthlyA: any[];
  monthlyB: any[];
  labelA: string;
  labelB: string;
}

function MonthlyCompareChart({ monthlyA, monthlyB, labelA, labelB }: MonthlyChartProps) {
  // A/B 기간 모두를 단일 배열로 정렬하여 offset 비교 가능하게 구성
  // X축은 "기간 내 N번째 월" 기준 (절대 월이 아닌 상대 월 인덱스)
  const maxLen = Math.max(monthlyA.length, monthlyB.length);

  const chartData = useMemo(() => {
    return Array.from({ length: maxLen }, (_, idx) => {
      const a = monthlyA[idx];
      const b = monthlyB[idx];
      return {
        idx: idx + 1,
        labelA: a ? String(a.month).slice(2, 4) + "." + String(a.month).slice(5) : "",
        labelB: b ? String(b.month).slice(2, 4) + "." + String(b.month).slice(5) : "",
        revenueA: a?.revenue ?? null,
        revenueB: b?.revenue ?? null,
        netA: a?.net_income ?? null,
        netB: b?.net_income ?? null,
      };
    });
  }, [monthlyA, monthlyB, maxLen]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const entry = chartData[Number(label) - 1];
    if (!entry) return null;
    return (
      <div style={{
        background: "#fff", border: "1px solid #DFE3E6", borderRadius: 8,
        padding: "10px 14px", fontSize: 12, boxShadow: "0 4px 16px #0000001A",
      }}>
        <div style={{ fontWeight: 600, marginBottom: 6, color: "#374151" }}>
          {entry.idx}번째 월 {entry.labelA && `(A: ${entry.labelA})`} {entry.labelB && `(B: ${entry.labelB})`}
        </div>
        {payload.map((p: any) => (
          <div key={p.dataKey} style={{ color: p.color, marginBottom: 2 }}>
            {p.name}: {formatKRW(p.value ?? 0)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
      <div className="px-5 py-3 border-b flex items-center gap-4" style={{ borderColor: "#EEEFF1" }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#000" }}>월별 매출액 / 순이익 추이 비교</span>
        <div className="flex items-center gap-4 ml-auto" style={{ fontSize: 13 }}>
          {[
            { color: PERIOD_A_COLOR, label: `${labelA} 매출`, dash: false },
            { color: PERIOD_B_COLOR, label: `${labelB} 매출`, dash: true  },
            { color: "#FE7C39",      label: `${labelA} 순이익`, dash: false },
            { color: "#B5BCC4",      label: `${labelB} 순이익`, dash: true  },
          ].map(({ color, label, dash }) => (
            <span key={label} className="flex items-center gap-1.5" style={{ color: "#A1A8B3" }}>
              <span style={{
                width: 20, height: 2, display: "inline-block", borderRadius: 1,
                background: dash
                  ? `repeating-linear-gradient(90deg,${color} 0,${color} 4px,transparent 4px,transparent 7px)`
                  : color,
              }} />
              {label}
            </span>
          ))}
        </div>
      </div>
      <div style={{ height: 280, padding: "12px 12px 8px 4px" }}>
        {maxLen === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#A1A8B3", fontSize: 13 }}>
            데이터 없음
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="idx" tick={{ ...AXIS_STYLE, fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis
                tickFormatter={chartAxisFormatter}
                tick={{ ...AXIS_STYLE, fontSize: 10 }}
                tickLine={false} axisLine={false} width={52}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="#EEEFF1" />
              {/* 매출액 */}
              <Bar dataKey="revenueA" name={`${labelA} 매출`} fill={PERIOD_A_COLOR} fillOpacity={0.8} radius={[2, 2, 0, 0]} />
              <Bar dataKey="revenueB" name={`${labelB} 매출`} fill={PERIOD_B_COLOR} fillOpacity={0.6} radius={[2, 2, 0, 0]} />
              {/* 순이익 라인 */}
              <Line type="monotone" dataKey="netA" name={`${labelA} 순이익`} stroke="#FE7C39" strokeWidth={2} dot={false} connectNulls />
              <Line type="monotone" dataKey="netB" name={`${labelB} 순이익`} stroke="#B5BCC4" strokeWidth={2} strokeDasharray="4 3" dot={false} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   계정별 증감 가로 바 차트
══════════════════════════════════════════ */
function AccountDeltaChart({ plA, plB }: { plA: PLData | undefined; plB: PLData | undefined }) {
  const items = useMemo(() => {
    const aItems = plA?.sga?.items ?? [];
    const bMap = new Map((plB?.sga?.items ?? []).map((i: any) => [i.account, i.amount ?? 0]));
    const result = aItems.map((i: any) => ({
      account: i.account,
      delta: (i.amount ?? 0) - (bMap.get(i.account) ?? 0),
    }));
    // 절댓값 내림차순, 상위 10개
    return result.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 10);
  }, [plA, plB]);

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-6 flex items-center justify-center"
        style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)", height: 200 }}>
        <p style={{ fontSize: 13, color: "#A1A8B3" }}>데이터 없음</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
      <div className="px-5 py-3 border-b" style={{ borderColor: "#EEEFF1" }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#000" }}>판관비 계정별 증감 (A − B, 상위 10개)</span>
      </div>
      <div style={{ height: Math.max(220, items.length * 32 + 40), padding: "12px 16px 8px 8px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            layout="vertical"
            data={items}
            margin={{ top: 4, right: 16, bottom: 4, left: 80 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={chartAxisFormatter}
              tick={{ ...AXIS_STYLE, fontSize: 10 }}
              tickLine={false} axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="account"
              tick={{ fontSize: 12, fill: "#374151" }}
              tickLine={false} axisLine={false}
              width={76}
            />
            <Tooltip
              formatter={(v: number) => [formatKRW(v), "증감액"]}
              contentStyle={{ border: "1px solid #DFE3E6", borderRadius: 8, fontSize: 12, boxShadow: "0 4px 16px #0000001A" }}
            />
            <ReferenceLine x={0} stroke="#EEEFF1" />
            <Bar dataKey="delta" radius={[0, 2, 2, 0]}>
              {items.map((entry, i) => (
                <Cell key={i} fill={entry.delta >= 0 ? PERIOD_A_COLOR : PERIOD_B_COLOR} />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   이익률 비교 게이지 카드
══════════════════════════════════════════ */
function MarginCompareCard({
  label, marginA, marginB,
}: {
  label: string; marginA: number; marginB: number;
}) {
  const delta = marginA - marginB;
  const deltaColor = delta >= 0 ? POS_COLOR : NEG_COLOR;
  return (
    <div className="bg-white rounded-lg border p-4" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
      <p style={{ fontSize: 14, fontWeight: 500, color: "#A1A8B3", marginBottom: 10 }}>{label}</p>
      <div className="flex items-end gap-3 mb-3">
        <p style={{ fontSize: 30, fontWeight: 700, color: PERIOD_A_COLOR, letterSpacing: "-0.5px", lineHeight: 1 }}>
          {marginA.toFixed(1)}%
        </p>
        <p style={{ fontSize: 18, fontWeight: 500, color: PERIOD_B_COLOR, marginBottom: 2 }}>
          vs {marginB.toFixed(1)}%
        </p>
        <p style={{ fontSize: 13, fontWeight: 500, color: deltaColor, marginBottom: 4 }}>
          {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%p
        </p>
      </div>
      {/* 듀얼 바 게이지 */}
      <div className="space-y-1.5">
        <div>
          <div className="flex justify-between mb-0.5" style={{ fontSize: 12, color: PERIOD_A_COLOR }}>
            <span>기간 A</span><span>{marginA.toFixed(1)}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#EEEFF1" }}>
            <div style={{ width: `${Math.min(Math.abs(marginA), 100)}%`, height: "100%", backgroundColor: PERIOD_A_COLOR, borderRadius: 999 }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between mb-0.5" style={{ fontSize: 12, color: PERIOD_B_COLOR }}>
            <span>기간 B</span><span>{marginB.toFixed(1)}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#EEEFF1" }}>
            <div style={{ width: `${Math.min(Math.abs(marginB), 100)}%`, height: "100%", backgroundColor: PERIOD_B_COLOR, borderRadius: 999 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   메인 페이지
══════════════════════════════════════════ */
export default function PeriodComparePage() {
  // 기간 A: 기본값 올해
  const [fromA, setFromA] = useState("2025-01-01");
  const [toA,   setToA  ] = useState("2025-12-31");
  // 기간 B: 기본값 전년
  const [fromB, setFromB] = useState("2024-01-01");
  const [toB,   setToB  ] = useState("2024-12-31");

  // API 호출
  const { data: plARaw, isLoading: plALoading } = useQuery({
    queryKey: ["period-pl-a", fromA, toA],
    queryFn: () => api.financialStatements.incomeStatement({ date_from: fromA, date_to: toA }),
  });
  const { data: plBRaw, isLoading: plBLoading } = useQuery({
    queryKey: ["period-pl-b", fromB, toB],
    queryFn: () => api.financialStatements.incomeStatement({ date_from: fromB, date_to: toB }),
  });
  const { data: bsARaw, isLoading: bsALoading } = useQuery({
    queryKey: ["period-bs-a", fromA, toA],
    queryFn: () => api.financialStatements.balanceSheet({ date_from: fromA, date_to: toA }),
  });
  const { data: bsBRaw, isLoading: bsBLoading } = useQuery({
    queryKey: ["period-bs-b", fromB, toB],
    queryFn: () => api.financialStatements.balanceSheet({ date_from: fromB, date_to: toB }),
  });
  const { data: monthlyARaw } = useQuery({
    queryKey: ["period-monthly-a", fromA, toA],
    queryFn: () => api.financialStatements.plKpiMonthly({ date_from: fromA, date_to: toA }),
  });
  const { data: monthlyBRaw } = useQuery({
    queryKey: ["period-monthly-b", fromB, toB],
    queryFn: () => api.financialStatements.plKpiMonthly({ date_from: fromB, date_to: toB }),
  });

  const plA = plARaw as PLData | undefined;
  const plB = plBRaw as PLData | undefined;
  const bsA = bsARaw as BSData | undefined;
  const bsB = bsBRaw as BSData | undefined;
  const monthlyA: any[] = (monthlyARaw as any)?.monthly ?? [];
  const monthlyB: any[] = (monthlyBRaw as any)?.monthly ?? [];

  const isLoading = plALoading || plBLoading || bsALoading || bsBLoading;

  // KPI 값 추출
  const revenueA  = plA?.revenue?.items?.reduce((s: number, i: any) => s + i.amount, 0) ?? 0;
  const revenueB  = plB?.revenue?.items?.reduce((s: number, i: any) => s + i.amount, 0) ?? 0;
  const gpA       = plA?.gross_profit ?? 0;
  const gpB       = plB?.gross_profit ?? 0;
  const opA       = plA?.operating_income ?? 0;
  const opB       = plB?.operating_income ?? 0;
  const netA      = plA?.net_income ?? 0;
  const netB      = plB?.net_income ?? 0;
  const gpMrgA    = plA?.gross_margin_pct ?? 0;
  const gpMrgB    = plB?.gross_margin_pct ?? 0;
  const opMrgA    = plA?.operating_margin_pct ?? 0;
  const opMrgB    = plB?.operating_margin_pct ?? 0;
  const netMrgA   = plA?.net_margin_pct ?? 0;
  const netMrgB   = plB?.net_margin_pct ?? 0;

  const labelA = `A (${fromA.slice(0,7)} ~ ${toA.slice(0,7)})`;
  const labelB = `B (${fromB.slice(0,7)} ~ ${toB.slice(0,7)})`;

  return (
    <div className="space-y-6">

      {/* ══ 필터 패널 ══ */}
      <div className="bg-white rounded-lg border p-5" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
        <div className="flex items-center gap-6 flex-wrap">
          {/* 기간 A */}
          <div className="flex items-center gap-3">
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ fontSize: 12, fontWeight: 700, backgroundColor: "#FFF5ED", color: PERIOD_A_COLOR, border: "1px solid #FFAA72", flexShrink: 0 }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: PERIOD_A_COLOR }} />
              기간 A
            </span>
            <DatePicker value={fromA} onChange={setFromA} />
            <span style={{ fontSize: 13, color: "#A1A8B3" }}>~</span>
            <DatePicker value={toA} onChange={setToA} />
          </div>

          <div style={{ width: 1, height: 32, backgroundColor: "#EEEFF1", flexShrink: 0 }} />

          {/* 기간 B */}
          <div className="flex items-center gap-3">
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ fontSize: 12, fontWeight: 700, backgroundColor: "#F5F7F8", color: PERIOD_B_COLOR, border: "1px solid #DFE3E6", flexShrink: 0 }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: PERIOD_B_COLOR }} />
              기간 B
            </span>
            <DatePicker value={fromB} onChange={setFromB} />
            <span style={{ fontSize: 13, color: "#A1A8B3" }}>~</span>
            <DatePicker value={toB} onChange={setToB} />
          </div>

          {/* 현재 선택 배지 */}
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <PeriodBadge label="A" from={fromA} to={toA} color={PERIOD_A_COLOR} />
            <PeriodBadge label="B" from={fromB} to={toB} color={PERIOD_B_COLOR} />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: "#A1A8B3", fontSize: 13 }}>
          데이터를 불러오는 중...
        </div>
      ) : (
        <>
          {/* ══ 1. KPI 비교 카드 4개 ══ */}
          <div>
            <SectionHeader title="핵심 손익 비교" />
            <div className="grid grid-cols-2 gap-4">
              <KpiCompareCard label="매출액"   colorA={PERIOD_A_COLOR} valueA={revenueA} valueB={revenueB} colorB={PERIOD_B_COLOR} />
              <KpiCompareCard label="매출총이익" colorA={PERIOD_A_COLOR} valueA={gpA}      valueB={gpB}      colorB={PERIOD_B_COLOR} />
              <KpiCompareCard label="영업이익"  colorA={PERIOD_A_COLOR} valueA={opA}      valueB={opB}      colorB={PERIOD_B_COLOR} />
              <KpiCompareCard label="당기순이익" colorA={PERIOD_A_COLOR} valueA={netA}     valueB={netB}     colorB={PERIOD_B_COLOR} />
            </div>
          </div>

          {/* ══ 2. 이익률 비교 ══ */}
          <div>
            <SectionHeader title="이익률 비교" />
            <div className="grid grid-cols-3 gap-4">
              <MarginCompareCard label="매출총이익률" marginA={gpMrgA}  marginB={gpMrgB}  />
              <MarginCompareCard label="영업이익률"   marginA={opMrgA}  marginB={opMrgB}  />
              <MarginCompareCard label="당기순이익률" marginA={netMrgA} marginB={netMrgB} />
            </div>
          </div>

          {/* ══ 3. 월별 추이 비교 차트 ══ */}
          <div>
            <SectionHeader title="월별 추이 비교" />
            <MonthlyCompareChart
              monthlyA={monthlyA}
              monthlyB={monthlyB}
              labelA="기간 A"
              labelB="기간 B"
            />
          </div>

          {/* ══ 4. 손익항목 비교 테이블 ══ */}
          <div>
            <SectionHeader title="손익항목 상세 비교" />
            <PlCompareTable plA={plA} plB={plB} />
          </div>

          {/* ══ 5. 판관비 계정별 증감 ══ */}
          <div>
            <SectionHeader title="판관비 계정별 증감" />
            <AccountDeltaChart plA={plA} plB={plB} />
          </div>

          {/* ══ 6. 재무상태 비교 테이블 ══ */}
          <div>
            <SectionHeader title="재무상태 비교" />
            <BsCompareTable bsA={bsA} bsB={bsB} />
          </div>

          {/* ══ 7. 재무비율 비교 ══ */}
          <div>
            <SectionHeader title="재무비율 비교" />
            <div className="grid grid-cols-2 gap-4">
              {/* 부채비율 */}
              {(() => {
                const equityA = bsA?.equity?.total ?? 1;
                const liabA   = bsA?.liabilities?.total ?? 0;
                const equityB = bsB?.equity?.total ?? 1;
                const liabB   = bsB?.liabilities?.total ?? 0;
                const debtA   = equityA ? liabA / equityA * 100 : 0;
                const debtB   = equityB ? liabB / equityB * 100 : 0;
                const curA    = (bsA?.liabilities?.current?.subtotal ?? 1)
                  ? (bsA?.assets?.current?.subtotal ?? 0) / (bsA?.liabilities?.current?.subtotal ?? 1) * 100
                  : 0;
                const curB    = (bsB?.liabilities?.current?.subtotal ?? 1)
                  ? (bsB?.assets?.current?.subtotal ?? 0) / (bsB?.liabilities?.current?.subtotal ?? 1) * 100
                  : 0;
                return (
                  <>
                    <div className="bg-white rounded-lg border p-5" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
                      <p style={{ fontSize: 14, fontWeight: 500, color: "#A1A8B3", marginBottom: 12 }}>부채비율</p>
                      <div className="flex items-end gap-3 mb-4">
                        <span style={{ fontSize: 30, fontWeight: 700, color: debtA < 100 ? POS_COLOR : NEG_COLOR, letterSpacing: "-0.5px" }}>
                          {debtA.toFixed(1)}%
                        </span>
                        <span style={{ fontSize: 16, fontWeight: 500, color: "#A1A8B3", marginBottom: 2 }}>
                          vs {debtB.toFixed(1)}%
                        </span>
                        <span style={{
                          fontSize: 13, fontWeight: 500, marginBottom: 4,
                          color: (debtA - debtB) <= 0 ? POS_COLOR : NEG_COLOR,
                        }}>
                          {(debtA - debtB) <= 0 ? "▼" : "▲"} {Math.abs(debtA - debtB).toFixed(1)}%p
                        </span>
                      </div>
                      <div className="space-y-2">
                        {[
                          { label: "기간 A", value: debtA, color: debtA < 100 ? POS_COLOR : NEG_COLOR },
                          { label: "기간 B", value: debtB, color: debtB < 100 ? POS_COLOR : NEG_COLOR },
                        ].map(({ label, value, color }) => (
                          <div key={label}>
                            <div className="flex justify-between mb-0.5" style={{ fontSize: 12, color }}>
                              <span>{label}</span><span>{value.toFixed(1)}%</span>
                            </div>
                            <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#EEEFF1" }}>
                              <div style={{ width: `${Math.min(value / 2, 100)}%`, height: "100%", backgroundColor: color, borderRadius: 999 }} />
                            </div>
                          </div>
                        ))}
                      </div>
                      <p style={{ fontSize: 12, color: "#A1A8B3", marginTop: 8 }}>
                        100% 미만이 양호 — 낮을수록 재무건전성 높음
                      </p>
                    </div>

                    <div className="bg-white rounded-lg border p-5" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
                      <p style={{ fontSize: 14, fontWeight: 500, color: "#A1A8B3", marginBottom: 12 }}>유동비율</p>
                      <div className="flex items-end gap-3 mb-4">
                        <span style={{ fontSize: 30, fontWeight: 700, color: curA > 100 ? POS_COLOR : NEG_COLOR, letterSpacing: "-0.5px" }}>
                          {curA.toFixed(1)}%
                        </span>
                        <span style={{ fontSize: 16, fontWeight: 500, color: "#A1A8B3", marginBottom: 2 }}>
                          vs {curB.toFixed(1)}%
                        </span>
                        <span style={{
                          fontSize: 13, fontWeight: 500, marginBottom: 4,
                          color: (curA - curB) >= 0 ? POS_COLOR : NEG_COLOR,
                        }}>
                          {(curA - curB) >= 0 ? "▲" : "▼"} {Math.abs(curA - curB).toFixed(1)}%p
                        </span>
                      </div>
                      <div className="space-y-2">
                        {[
                          { label: "기간 A", value: curA, color: curA > 100 ? POS_COLOR : NEG_COLOR },
                          { label: "기간 B", value: curB, color: curB > 100 ? POS_COLOR : NEG_COLOR },
                        ].map(({ label, value, color }) => (
                          <div key={label}>
                            <div className="flex justify-between mb-0.5" style={{ fontSize: 12, color }}>
                              <span>{label}</span><span>{value.toFixed(1)}%</span>
                            </div>
                            <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#EEEFF1" }}>
                              <div style={{ width: `${Math.min(value / 8, 100)}%`, height: "100%", backgroundColor: color, borderRadius: 999 }} />
                            </div>
                          </div>
                        ))}
                      </div>
                      <p style={{ fontSize: 12, color: "#A1A8B3", marginTop: 8 }}>
                        100% 이상이 양호 — 높을수록 단기 유동성 우수
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
