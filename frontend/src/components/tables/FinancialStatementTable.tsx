"use client";
import { useState } from "react";
import { formatKRW, formatPct } from "@/lib/utils/formatters";
import { Download, ChevronDown, ChevronRight } from "lucide-react";

interface Row {
  label: string;
  amount: number;
  prevAmount?: number;
  isSubtotal?: boolean;
  isTotal?: boolean;
  indent?: number;
}

interface FinancialStatementTableProps {
  title: string;
  rows: Row[];
  periodLabel?: string;
}

export default function FinancialStatementTable({ title, rows, periodLabel }: FinancialStatementTableProps) {
  /* ── 접기/펼치기: indent=1 인 소계 행을 그룹 헤더로 취급 ── */
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  /* 각 행의 부모 인덱스 계산 */
  const parentOf: Record<number, number> = {};
  let currentParent = -1;
  rows.forEach((row, i) => {
    const indent = row.indent ?? 0;
    if (row.isSubtotal && indent === 1) {
      currentParent = i;
    } else if (indent >= 2 && currentParent !== -1) {
      parentOf[i] = currentParent;
    } else if (indent <= 1) {
      currentParent = -1;
    }
  });

  const isCollapsible = (i: number) => {
    const row = rows[i];
    return (row.isSubtotal && (row.indent ?? 0) === 1) &&
      rows.some((_, j) => parentOf[j] === i);
  };

  const isHidden = (i: number) => {
    const parent = parentOf[i];
    return parent !== undefined && collapsed.has(parent);
  };

  const toggle = (i: number) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const handleExport = () => {
    const csv = [
      ["항목", "금액", ...(rows[0]?.prevAmount !== undefined ? ["전기", "증감"] : [])],
      ...rows.map((r) => [
        r.label,
        r.amount,
        ...(r.prevAmount !== undefined ? [r.prevAmount, r.amount - r.prevAmount] : []),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}.csv`;
    a.click();
  };

  return (
    <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: "#DFE3E6" }}>
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#EEEFF1" }}>
        <div>
          <h3 className="text-base font-semibold" style={{ color: "#000" }}>{title}</h3>
          {periodLabel && <p className="text-xs mt-0.5" style={{ color: "#A1A8B3" }}>{periodLabel}</p>}
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors"
          style={{ backgroundColor: "#F5F7F8", color: "#6B7280", border: "1px solid #DFE3E6" }}
        >
          <Download size={12} />
          CSV
        </button>
      </div>

      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: "#F5F7F8" }}>
              <th className="text-left px-5 py-2.5 font-semibold" style={{ color: "#A1A8B3" }}>항목</th>
              <th className="text-right px-5 py-2.5 font-semibold" style={{ color: "#A1A8B3" }}>금액 (KRW)</th>
              {rows[0]?.prevAmount !== undefined && (
                <>
                  <th className="text-right px-5 py-2.5 font-semibold" style={{ color: "#A1A8B3" }}>전기</th>
                  <th className="text-right px-5 py-2.5 font-semibold" style={{ color: "#A1A8B3" }}>증감율</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              if (isHidden(i)) return null;

              const delta = row.prevAmount !== undefined ? row.amount - row.prevAmount : null;
              const deltaPct = delta !== null && row.prevAmount ? delta / Math.abs(row.prevAmount) * 100 : null;
              const collapsible = isCollapsible(i);
              const isCollapsed = collapsed.has(i);

              return (
                <tr
                  key={i}
                  className="border-t transition-colors hover:bg-gray-50"
                  style={{
                    borderColor: "#EEEFF1",
                    backgroundColor: row.isTotal ? "#FFF5ED" : row.isSubtotal ? "#F5F7F8" : undefined,
                    borderTopWidth: (row.isSubtotal || row.isTotal) ? 2 : 1,
                    borderTopColor: row.isTotal ? "#FD5108" : "#EEEFF1",
                    cursor: collapsible ? "pointer" : undefined,
                  }}
                  onClick={collapsible ? () => toggle(i) : undefined}
                >
                  <td className="px-5 py-2" style={{ paddingLeft: `${(row.indent ?? 0) * 16 + 20}px` }}>
                    <span className="flex items-center gap-1.5">
                      {collapsible && (
                        isCollapsed
                          ? <ChevronRight size={13} style={{ color: "#A1A8B3", flexShrink: 0 }} />
                          : <ChevronDown  size={13} style={{ color: "#A1A8B3", flexShrink: 0 }} />
                      )}
                      <span
                        style={{
                          fontWeight: row.isTotal ? 700 : row.isSubtotal ? 600 : 400,
                          color: row.isTotal ? "#FD5108" : "#000000",
                        }}
                      >
                        {row.label}
                      </span>
                    </span>
                  </td>
                  <td className="text-right px-5 py-2"
                    style={{ fontWeight: row.isTotal ? 700 : row.isSubtotal ? 600 : 400, fontVariantNumeric: "tabular-nums" }}>
                    {formatKRW(row.amount)}
                  </td>
                  {row.prevAmount !== undefined && (
                    <td className="text-right px-5 py-2" style={{ color: "#6B7280", fontVariantNumeric: "tabular-nums" }}>
                      {formatKRW(row.prevAmount)}
                    </td>
                  )}
                  {deltaPct !== null && (
                    <td className="text-right px-5 py-2 font-medium"
                      style={{ color: deltaPct > 0 ? "#16C784" : deltaPct < 0 ? "#FF4747" : "#9CA3AF", fontVariantNumeric: "tabular-nums" }}>
                      {formatPct(deltaPct)}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
