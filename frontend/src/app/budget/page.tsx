"use client";
import ChartCard from "@/components/ui/ChartCard";
import BudgetVarianceChart from "@/components/charts/BudgetVarianceChart";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { formatKRW, formatPctAbs } from "@/lib/utils/formatters";

export default function BudgetPage() {
  const { data } = useQuery({
    queryKey: ["budget-variance-summary"],
    queryFn: () => api.budget.varianceMonthly(2025),
  });

  const rows = (data as any) ?? [];

  // Aggregate totals by item
  const totals: Record<string, { plan: number; actual: number }> = {};
  for (const r of rows) {
    if (!totals[r.item]) totals[r.item] = { plan: 0, actual: 0 };
    totals[r.item].plan += r.plan ?? 0;
    totals[r.item].actual += r.actual ?? 0;
  }

  const summaryItems = [
    { label: "매출액", key: "매출액" },
    { label: "매출원가", key: "매출원가" },
    { label: "판매비와관리비", key: "판매비와관리비" },
  ];

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {summaryItems.map(({ label, key }) => {
          const t = totals[key];
          if (!t) return (
            <div key={key} className="bg-white rounded-lg p-4 border" style={{ borderColor: "#E5E7EB", boxShadow: "var(--shadow-card)" }}>
              <p className="text-xs font-medium" style={{ color: "#6B7280" }}>{label} (2025 누계)</p>
              <p className="text-xl font-bold mt-1" style={{ color: "#111827" }}>—</p>
            </div>
          );
          const variance = t.actual - t.plan;
          const pct = t.plan !== 0 ? (t.actual / t.plan - 1) * 100 : 0;
          const positive = variance >= 0;
          return (
            <div key={key} className="bg-white rounded-lg p-4 border" style={{ borderColor: "#E5E7EB", boxShadow: "var(--shadow-card)" }}>
              <p className="text-xs font-medium" style={{ color: "#6B7280" }}>{label} (2025 누계)</p>
              <p className="text-lg font-bold mt-1" style={{ color: "#111827" }}>
                계획: {formatKRW(t.plan)}
              </p>
              <p className="text-sm mt-0.5" style={{ color: "#6B7280" }}>
                실적: {formatKRW(t.actual)}
              </p>
              <p className="text-sm font-semibold mt-1" style={{ color: positive ? "#059669" : "#DC2626" }}>
                {positive ? "+" : ""}{formatKRW(variance)} ({formatPctAbs(pct)})
              </p>
            </div>
          );
        })}
      </div>

      {/* Chart */}
      <ChartCard
        title="예실 비교 — 월별 추이"
        subtitle="항목 버튼을 클릭해 전환하세요 · 막대: 계획/실적, 선: 달성률(%)"
      >
        <BudgetVarianceChart />
      </ChartCard>
    </div>
  );
}
