"use client";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatKRW } from "@/lib/utils/formatters";

interface KpiCardProps {
  label: string;
  value: number;
  delta?: number | null;
  deltaLabel?: string;
  format?: "krw" | "number" | "pct";
  loading?: boolean;
  accent?: boolean;
}

export default function KpiCard({
  label,
  value,
  delta,
  deltaLabel,
  format = "krw",
  loading = false,
  accent = false,
}: KpiCardProps) {
  const fmt = (v: number) => {
    if (format === "krw") return formatKRW(v);
    if (format === "pct") return `${v.toFixed(1)}%`;
    return v.toLocaleString("ko-KR");
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 animate-pulse" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
        <div className="h-8 bg-gray-200 rounded w-3/4 mb-2" />
        <div className="h-3 bg-gray-200 rounded w-1/3" />
      </div>
    );
  }

  const isPositive = delta !== null && delta !== undefined && delta > 0;
  const isNegative = delta !== null && delta !== undefined && delta < 0;

  return (
    <div
      className="bg-white rounded-lg p-6 border transition-shadow hover:shadow-card-hover"
      style={{
        boxShadow: "var(--shadow-card)",
        borderColor: "#DFE3E6",
      }}
    >
      <p className="text-sm font-medium" style={{ color: "#A1A8B3" }}>{label}</p>
      <p className="text-2xl font-bold mt-1" style={{ color: "#000000" }}>
        {fmt(value)}
      </p>
      {delta !== null && delta !== undefined && (
        <div className="flex items-center gap-1 mt-2">
          {isPositive ? (
            <TrendingUp size={13} style={{ color: "#16C784" }} />
          ) : isNegative ? (
            <TrendingDown size={13} style={{ color: "#FF4747" }} />
          ) : (
            <Minus size={13} style={{ color: "#9CA3AF" }} />
          )}
          <span
            className="text-xs font-medium"
            style={{ color: isPositive ? "#16C784" : isNegative ? "#FF4747" : "#9CA3AF" }}
          >
            {isPositive ? "+" : ""}
            {delta.toFixed(1)}%
          </span>
          {deltaLabel && (
            <span className="text-xs" style={{ color: "#9CA3AF" }}>
              {deltaLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
