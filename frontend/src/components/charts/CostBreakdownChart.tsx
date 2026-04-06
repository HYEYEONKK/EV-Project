"use client";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { useFilterStore } from "@/lib/store/filterStore";
import { api } from "@/lib/api/client";
import { formatKRW } from "@/lib/utils/formatters";
import { PWC_CHART_COLORS } from "@/lib/utils/chartColors";
import { SkeletonChart } from "@/components/ui/LoadingSpinner";

export default function CostBreakdownChart() {
  const { dateFrom, dateTo, activeMonth, activeCostCategory, setCrossFilter } = useFilterStore();

  const { data, isLoading } = useQuery({
    queryKey: ["income-statement", dateFrom, dateTo, activeMonth],
    queryFn: () =>
      api.financialStatements.incomeStatement({
        date_from: activeMonth ? `${activeMonth}-01` : dateFrom,
        date_to: activeMonth ? `${activeMonth}-31` : dateTo,
      }),
  });

  if (isLoading) return <SkeletonChart height={260} />;
  if (!data) return null;

  const cogs = (data as any).cogs?.total ?? 0;
  const sga = (data as any).sga?.total ?? 0;
  const other = Math.abs((data as any).other?.total ?? 0);

  const pieData = [
    { name: "매출원가", value: cogs },
    { name: "판매비와관리비", value: sga },
    { name: "기타비용", value: other },
  ].filter((d) => d.value > 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0];
    const total = pieData.reduce((s, i) => s + i.value, 0);
    return (
      <div className="bg-white rounded-lg shadow-lg border p-3 text-xs" style={{ borderColor: "#E5E7EB" }}>
        <p className="font-semibold">{d.name}</p>
        <p>{formatKRW(d.value)}</p>
        <p style={{ color: "#6B7280" }}>{((d.value / total) * 100).toFixed(1)}%</p>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={pieData}
          cx="50%"
          cy="45%"
          outerRadius={90}
          innerRadius={50}
          dataKey="value"
          cursor="pointer"
          onClick={(entry) => setCrossFilter("activeCostCategory", entry.name ?? null)}
        >
          {pieData.map((entry, i) => (
            <Cell
              key={entry.name}
              fill={PWC_CHART_COLORS[i]}
              opacity={activeCostCategory && activeCostCategory !== entry.name ? 0.3 : 1}
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
