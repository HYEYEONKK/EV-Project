"use client";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { useFilterStore } from "@/lib/store/filterStore";
import { api } from "@/lib/api/client";
import { formatKRW } from "@/lib/utils/formatters";
import { PWC_CHART_COLORS } from "@/lib/utils/chartColors";
import { SkeletonChart } from "@/components/ui/LoadingSpinner";

const COLORS = PWC_CHART_COLORS;

const CustomContent = (props: any) => {
  const { x, y, width, height, name, value, depth, colors, root } = props;
  if (width < 30 || height < 20) return null;
  const idx = root?.children?.findIndex((c: any) => c.name === name) ?? 0;
  const color = depth === 1 ? COLORS[idx % COLORS.length] : `${COLORS[idx % COLORS.length]}CC`;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={color} stroke="#fff" strokeWidth={2} rx={4} />
      {width > 60 && height > 30 && (
        <text x={x + 6} y={y + 16} fill="#fff" fontSize={11} fontWeight={600}>
          {name}
        </text>
      )}
      {width > 60 && height > 45 && (
        <text x={x + 6} y={y + 30} fill="rgba(255,255,255,0.8)" fontSize={10}>
          {formatKRW(value)}
        </text>
      )}
    </g>
  );
};

export default function SalesByRegionChart() {
  const { dateFrom, dateTo, activeMonth, activeProductCategory, activeRegion, setCrossFilter } = useFilterStore();

  const { data, isLoading } = useQuery({
    queryKey: ["sales-region", dateFrom, dateTo, activeMonth, activeProductCategory],
    queryFn: () =>
      api.sales.byRegion({
        date_from: activeMonth ? `${activeMonth}-01` : dateFrom,
        date_to: activeMonth ? `${activeMonth}-31` : dateTo,
        product_category: activeProductCategory ?? undefined,
      }),
  });

  if (isLoading) return <SkeletonChart height={240} />;
  if (!data?.length) return <div className="text-sm text-gray-400 py-8 text-center">데이터 없음</div>;

  // Group by region
  const regionMap: Record<string, number> = {};
  data.forEach((d) => {
    regionMap[d.region] = (regionMap[d.region] ?? 0) + d.revenue;
  });
  const treeData = Object.entries(regionMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-white rounded-lg shadow-lg border p-3 text-xs" style={{ borderColor: "#E5E7EB" }}>
        <p className="font-semibold">{d.name}</p>
        <p>매출: {formatKRW(d.value)}</p>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={240}>
      <Treemap
        data={treeData}
        dataKey="value"
        content={<CustomContent />}
        onClick={(entry: any) => setCrossFilter("activeRegion", entry.name)}
      />
    </ResponsiveContainer>
  );
}
