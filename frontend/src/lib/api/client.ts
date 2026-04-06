const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export async function apiFetch<T>(
  path: string,
  params?: Record<string, unknown>
): Promise<T> {
  const url = new URL(`${API_BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        if (Array.isArray(v)) {
          v.forEach((item) => {
            if (item !== undefined && item !== null && item !== "")
              url.searchParams.append(k, String(item));
          });
        } else {
          url.searchParams.set(k, String(v));
        }
      }
    });
  }
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json();
}

// ─── Typed API functions ───────────────────────────────────

export const api = {
  financialStatements: {
    balanceSheet: (p?: Record<string, unknown>) =>
      apiFetch("/financial-statements/balance-sheet", p),
    incomeStatement: (p?: Record<string, unknown>) =>
      apiFetch("/financial-statements/income-statement", p),
    incomeStatementMonthly: (p?: Record<string, unknown>) =>
      apiFetch<MonthlyPL[]>("/financial-statements/income-statement/monthly", p),
    cashFlow: (p?: Record<string, unknown>) =>
      apiFetch("/financial-statements/cash-flow", p),
  },
  journalEntries: {
    monthlyTrend: (p?: Record<string, unknown>) =>
      apiFetch("/journal-entries/monthly-trend", p),
    dimensions: () => apiFetch<Dimensions>("/journal-entries/dimensions"),
    accountTrend: (p?: Record<string, unknown>) =>
      apiFetch("/journal-entries/account-trend", p),
    accounts: (p?: Record<string, unknown>) =>
      apiFetch("/journal-entries/accounts", p),
  },
  sales: {
    summary: (p?: Record<string, unknown>) =>
      apiFetch<SalesSummary>("/sales/summary", p),
    monthlyTrend: (p?: Record<string, unknown>) =>
      apiFetch<MonthlySales[]>("/sales/monthly-trend", p),
    byCategory: (p?: Record<string, unknown>) =>
      apiFetch<SalesByCategory[]>("/sales/by-category", p),
    byRegion: (p?: Record<string, unknown>) =>
      apiFetch<SalesByRegion[]>("/sales/by-region", p),
    byVendor: (p?: Record<string, unknown>) =>
      apiFetch<SalesByVendor[]>("/sales/by-vendor", p),
    dimensions: () => apiFetch<SalesDimensions>("/sales/dimensions"),
  },
  budget: {
    varianceMonthly: (year?: number) =>
      apiFetch("/budget/variance/monthly", year ? { year } : undefined),
  },
};

// ─── Types ────────────────────────────────────────────────

export interface MonthlyPL {
  month: string;
  revenue: number;
  expense: number;
  gross_profit: number;
  cumulative_revenue: number;
}

export interface MonthlySales {
  month: string;
  revenue: number;
  transactions: number;
  quantity: number;
  cumulative_revenue: number;
}

export interface SalesSummary {
  total_revenue: number;
  transaction_count: number;
  avg_order_value: number;
  total_quantity: number;
}

export interface SalesByCategory {
  category: string;
  revenue: number;
  transactions: number;
  quantity: number;
  share: number;
}

export interface SalesByRegion {
  region: string;
  district: string;
  revenue: number;
  transactions: number;
}

export interface SalesByVendor {
  vendor: string;
  revenue: number;
  transactions: number;
  quantity: number;
}

export interface Dimensions {
  divisions: string[];
  branches: string[];
  entry_types: string[];
  date_range: { min_date: string; max_date: string };
}

export interface SalesDimensions {
  vendors: string[];
  product_categories: string[];
  regions: string[];
  districts: string[];
}
