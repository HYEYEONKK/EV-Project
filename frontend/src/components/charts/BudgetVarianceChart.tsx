"use client";
import { useState } from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { formatKRW, chartAxisFormatter } from "@/lib/utils/formatters";
import { BUDGET_COLORS, AXIS_STYLE, GRID_STROKE, CHART_MARGIN } from "@/lib/utils/chartColors";
import { SkeletonChart } from "@/components/ui/LoadingSpinner";

type Item = "revenue" | "cogs" | "sga";

const ITEM_LABELS: Record<Item, string> = {
  revenue: "매출액",
  cogs: "매출원가",
  sga: "판관비",
};

export default function BudgetVarianceChart() {
  const [activeItem, setActiveItem] = useState<Item>("revenue");

  const { data, isLoading } = useQuery({
    queryKey: ["budget-variance"],
    queryFn: () => api.budget.varianceMonthly(2025),
  });

  if (isLoading) return <SkeletonChart height={260} />;
  if (!data) return null;

  const chartData = (data as any[]).map((d: any) => ({
    month: d.month,
    plan: d[activeItem]?.plan ?? 0,
    actual: d[activeItem]?.actual ?? 0,
    variance_pct: d[activeItem]?.variance_pct ?? 0,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const plan = payload.find((p: any) => p.name === "계획")?.value ?? 0;
    const actual = payload.find((p: any) => p.name === "실적")?.value ?? 0;
    const variance = actual - plan;
    return (
      <div className="bg-white rounded-lg shadow-lg border p-3 text-xs" style={{ borderColor: "#E5E7EB" }}>
        <p className="font-semibold mb-1">{label}</p>
        <p>계획: {formatKRW(plan)}</p>
        <p>실적: {formatKRW(actual)}</p>
        <p style={{ color: variance >= 0 ? "#16C784" : "#FF4747" }}>
          차이: {variance >= 0 ? "+" : ""}{formatKRW(variance)}
        </p>
      </div>
    );
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {(Object.keys(ITEM_LABELS) as Item[]).map((item) => (
          <button
            key={item}
            onClick={() => setActiveItem(item)}
            className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
            style={{
              backgroundColor: activeItem === item ? "#FD5108" : "#EEEFF1",
              color: activeItem === item ? "#fff" : "#A1A8B3",
            }}
          >
            {ITEM_LABELS[item]}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={chartData} margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
          <XAxis dataKey="month" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
          <YAxis yAxisId="left" tickFormatter={chartAxisFormatter} tick={AXIS_STYLE} tickLine={false} axisLine={false} />
          <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}%`} tick={AXIS_STYLE} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 11 }} />
          <Bar yAxisId="left" dataKey="plan" name="계획" fill={BUDGET_COLORS.plan} radius={[3, 3, 0, 0]} opacity={0.8} />
          <Bar yAxisId="left" dataKey="actual" name="실적" fill={BUDGET_COLORS.actual} radius={[3, 3, 0, 0]} />
          <Line yAxisId="right" dataKey="variance_pct" name="달성률(%)" stroke="#16C784" strokeWidth={2} dot={false} type="monotone" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
