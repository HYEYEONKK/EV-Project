"use client";
import { formatKRW, formatPct } from "@/lib/utils/formatters";
import { Download } from "lucide-react";

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
    <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: "#E5E7EB" }}>
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#F3F4F6" }}>
        <div>
          <h3 className="text-sm font-semibold" style={{ color: "#111827" }}>{title}</h3>
          {periodLabel && <p className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>{periodLabel}</p>}
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors"
          style={{ backgroundColor: "#F9FAFB", color: "#6B7280", border: "1px solid #E5E7EB" }}
        >
          <Download size={12} />
          CSV
        </button>
      </div>

      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: "#F9FAFB" }}>
              <th className="text-left px-6 py-3 text-xs font-semibold" style={{ color: "#6B7280" }}>항목</th>
              <th className="text-right px-6 py-3 text-xs font-semibold" style={{ color: "#6B7280" }}>금액 (KRW)</th>
              {rows[0]?.prevAmount !== undefined && (
                <>
                  <th className="text-right px-6 py-3 text-xs font-semibold" style={{ color: "#6B7280" }}>전기</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold" style={{ color: "#6B7280" }}>증감율</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const delta = row.prevAmount !== undefined ? row.amount - row.prevAmount : null;
              const deltaPct = delta !== null && row.prevAmount ? delta / Math.abs(row.prevAmount) * 100 : null;
              return (
                <tr
                  key={i}
                  className="border-t transition-colors hover:bg-gray-50"
                  style={{
                    borderColor: "#EEEFF1",
                    backgroundColor: row.isTotal ? "#FFF5ED" : row.isSubtotal ? "#F5F7F8" : undefined,
                    borderTopWidth: (row.isSubtotal || row.isTotal) ? 2 : 1,
                    borderTopColor: row.isTotal ? "#FD5108" : "#EEEFF1",
                  }}
                >
                  <td className="px-6 py-2.5" style={{ paddingLeft: `${(row.indent ?? 0) * 16 + 24}px` }}>
                    <span
                      style={{
                        fontWeight: row.isTotal ? 700 : row.isSubtotal ? 600 : 400,
                        color: row.isTotal ? "#FD5108" : "#000000",
                      }}
                    >
                      {row.label}
                    </span>
                  </td>
                  <td className="text-right px-6 py-2.5 text-xs"
                    style={{ fontWeight: row.isTotal ? 700 : row.isSubtotal ? 600 : 400, fontVariantNumeric: "tabular-nums" }}>
                    {formatKRW(row.amount)}
                  </td>
                  {row.prevAmount !== undefined && (
                    <td className="text-right px-6 py-2.5 text-xs" style={{ color: "#6B7280", fontVariantNumeric: "tabular-nums" }}>
                      {formatKRW(row.prevAmount)}
                    </td>
                  )}
                  {deltaPct !== null && (
                    <td className="text-right px-6 py-2.5 text-xs font-medium"
                      style={{ color: deltaPct > 0 ? "#059669" : deltaPct < 0 ? "#DC2626" : "#9CA3AF", fontVariantNumeric: "tabular-nums" }}>
                      {deltaPct !== null ? formatPct(deltaPct) : "-"}
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
