// PwC brand colour palette — accent colours for charts and tables
export const PWC_CHART_COLORS = [
  "#FD5108", // Orange
  "#FE7C39", // Medium Orange
  "#FFAA72", // Light Orange
  "#A1A8B3", // Grey
  "#B5BCC4", // Medium Grey
  "#FFCDA8", // Custom tint orange
  "#CBD1D6", // Light Grey
  "#DFE3E6", // Custom tint grey
];

// Pastel rainbow palette for 5+ item multi-series comparisons
export const PASTEL_COLORS = [
  "#FFB3B3", // red pastel
  "#FFD9B3", // orange pastel
  "#FFFFB3", // yellow pastel
  "#B3FFB3", // green pastel
  "#B3D9FF", // blue pastel
  "#B3B3FF", // indigo pastel
  "#E0B3FF", // purple pastel
];

// Auto-select palette: PwC brand for ≤4 items, pastel for ≥5 items
export function getChartColor(index: number, total: number): string {
  if (total <= 4) return PWC_CHART_COLORS[index % PWC_CHART_COLORS.length];
  return PASTEL_COLORS[index % PASTEL_COLORS.length];
}

export const BUDGET_COLORS = {
  plan: "#A1A8B3",
  actual: "#FD5108",
  positive_variance: "#059669",
  negative_variance: "#DC2626",
};

export const CHART_MARGIN = { top: 8, right: 16, bottom: 8, left: 16 };
export const AXIS_STYLE = { fontSize: 11, fill: "#A1A8B3" };
export const GRID_STROKE = "#EEEFF1";
