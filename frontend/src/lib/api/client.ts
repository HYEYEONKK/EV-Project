const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001/api/v1";

/* ── Server wake-up state ── */
let _serverReady = false;
let _wakePromise: Promise<void> | null = null;

export function isServerReady() {
  return _serverReady;
}

/** Ping /health until the server responds (Render free tier cold start) */
export function wakeUpServer(): Promise<void> {
  if (_serverReady) return Promise.resolve();
  if (_wakePromise) return _wakePromise;

  const healthUrl = API_BASE.replace(/\/api\/v1$/, "/health");

  _wakePromise = (async () => {
    for (let i = 0; i < 40; i++) {
      try {
        const res = await fetch(healthUrl, { cache: "no-store" });
        if (res.ok) {
          _serverReady = true;
          return;
        }
      } catch {
        // server still waking up
      }
      await new Promise((r) => setTimeout(r, 5000));
    }
    // Give up after ~200s, let normal requests try anyway
    _serverReady = true;
  })();

  return _wakePromise;
}

export async function apiFetch<T>(
  path: string,
  params?: Record<string, unknown>
): Promise<T> {
  // Wait for server to be ready before making API calls
  await wakeUpServer();

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
    plKpiMonthly: (p?: Record<string, unknown>) =>
      apiFetch("/financial-statements/pl/kpi-monthly", p),
    plWaterfallMonthly: (p?: Record<string, unknown>) =>
      apiFetch("/financial-statements/pl/waterfall-monthly", p),
  },
  journalEntries: {
    monthlyTrend: (p?: Record<string, unknown>) =>
      apiFetch("/journal-entries/monthly-trend", p),
    dimensions: () => apiFetch<Dimensions>("/journal-entries/dimensions"),
    accountTrend: (p?: Record<string, unknown>) =>
      apiFetch("/journal-entries/account-trend", p),
    accounts: (p?: Record<string, unknown>) =>
      apiFetch("/journal-entries/accounts", p),
    // 전표분석 전용
    kpiSummary: (p?: Record<string, unknown>) =>
      apiFetch<JeKpiSummary>("/journal-entries/kpi-summary", p),
    dailyTrend: (p?: Record<string, unknown>) =>
      apiFetch<JeDailyTrend[]>("/journal-entries/daily-trend", p),
    byAccount: (p?: Record<string, unknown>) =>
      apiFetch<JeByGroup[]>("/journal-entries/by-account", p),
    byVendor: (p?: Record<string, unknown>) =>
      apiFetch<JeByGroup[]>("/journal-entries/by-vendor", p),
    list: (p?: Record<string, unknown>) =>
      apiFetch<JeEntry[]>("/journal-entries/list", p),
    search: (p?: Record<string, unknown>) =>
      apiFetch<JeSearchEntry[]>("/journal-entries/search", p),
    counterAccounts: (p?: Record<string, unknown>) =>
      apiFetch<JeCounterAccount[]>("/journal-entries/counter-accounts", p),
    counterEntries: (p?: Record<string, unknown>) =>
      apiFetch<JeEntry[]>("/journal-entries/counter-entries", p),
    voucherDimensions: (p?: Record<string, unknown>) =>
      apiFetch<JeVoucherDimensions>("/journal-entries/voucher-dimensions", p),
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
  plTrend: {
    monthlyByAccount: (p?: Record<string, unknown>) =>
      apiFetch<PlMonthlyAccount[]>("/financial-statements/pl/monthly-by-account", p),
    vendorDelta: (p?: Record<string, unknown>) =>
      apiFetch<PlVendorDelta[]>("/financial-statements/pl/vendor-delta", p),
    entries: (p?: Record<string, unknown>) =>
      apiFetch<PlEntry[]>("/financial-statements/pl/entries", p),
  },
  bsTrend: {
    monthly: (p?: Record<string, unknown>) =>
      apiFetch<BsMonthly[]>("/financial-statements/bs/monthly", p),
    accountDelta: (p?: Record<string, unknown>) =>
      apiFetch<BsAccountDelta[]>("/financial-statements/bs/account-delta", p),
  },
  bsSummary: {
    kpi: (p?: Record<string, unknown>) =>
      apiFetch<any>("/financial-statements/bs/kpi", p),
    ratiosMonthly: (p?: Record<string, unknown>) =>
      apiFetch<any[]>("/financial-statements/bs/ratios-monthly", p),
    activityMonthly: (p?: Record<string, unknown>) =>
      apiFetch<any>("/financial-statements/bs/activity-monthly", p),
  },
  bsBi: {
    dailyBalance: (p?: Record<string, unknown>) =>
      apiFetch<BsDailyBalance[]>("/financial-statements/bs/daily-balance", p),
    vendorComposition: (p?: Record<string, unknown>) =>
      apiFetch<BsVendorComposition[]>("/financial-statements/bs/vendor-composition", p),
    counterAccounts: (p?: Record<string, unknown>) =>
      apiFetch<BsCounterAccount[]>("/financial-statements/bs/counter-accounts", p),
    entries: (p?: Record<string, unknown>) =>
      apiFetch<BsEntry[]>("/financial-statements/bs/entries", p),
    detailTable: (p?: Record<string, unknown>) =>
      apiFetch<BsDetailRow[]>("/financial-statements/bs/detail-table", p),
    vendorDelta: (p?: Record<string, unknown>) =>
      apiFetch<BsVendorDeltaItem[]>("/financial-statements/bs/vendor-delta", p),
    accountsList: () =>
      apiFetch<BsAccountItem[]>("/financial-statements/bs/accounts-list"),
  },
  cashFlowBi: {
    comparison: (p?: Record<string, unknown>) =>
      apiFetch<CashFlowComparison>("/financial-statements/cash-flow/comparison", p),
  },
  scenarios: {
    summary: (scenarioId: number, p?: Record<string, unknown>) =>
      apiFetch<ScenarioMonthly[]>(`/scenarios/${scenarioId}/summary`, p),
    entries: (scenarioId: number, p?: Record<string, unknown>) =>
      apiFetch<ScenarioEntry[]>(`/scenarios/${scenarioId}/entries`, p),
  },
};

// ─── Chat API (POST) ───────────────────────────────────

export interface ChatRequest {
  question: string;
  date_from?: string;
  date_to?: string;
}

export interface ChatResponse {
  answer: string;
  query_type: string;
  context_summary: string;
}

// ─── Market Data ──────────────────────────────────────────
export const marketApi = {
  interestRates: (startYear?: string) =>
    apiFetch<any>("/market-data/interest-rates", startYear ? { start_year: startYear } : undefined),
  exchangeRate: (year?: string, currency?: string) =>
    apiFetch<any>("/market-data/exchange-rate", { year, currency }),
};

export async function chatAsk(req: ChatRequest): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Chat API ${res.status}`);
  return res.json();
}

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

export interface JeKpiSummary {
  je_count: number;
  debit_total: number;
  credit_total: number;
}

export interface JeDailyTrend {
  date: string;
  debit_total: number;
  credit_total: number;
  count: number;
}

export interface JeByGroup {
  account?: string;
  vendor?: string;
  credit_total: number;
  debit_total: number;
  count: number;
}

export interface JeEntry {
  date: string;
  je_number: string;
  account: string;
  vendor: string;
  vendor_translated: string;
  memo: string;
  memo_translated: string;
  debit: number;
  credit: number;
}

export interface JeSearchEntry {
  date: string;
  je_number: string;
  account: string;
  vendor: string;
  memo: string;
  debit: number;
  credit: number;
}

export interface JeCounterAccount {
  account: string;
  debit_total: number;
  credit_total: number;
  count: number;
}

export interface JeVoucherDimensions {
  accounts: string[];
  vendors: string[];
}

export interface SalesDimensions {
  vendors: string[];
  product_categories: string[];
  regions: string[];
  districts: string[];
}

// ─── PL Trend Types ────────────────────────────────────────

export interface PlMonthlyAccount {
  account: string;
  branch: string;
  current_total: number;
  prior_total: number;
  change_pct: number;
  monthly: { month: string; current: number; prior: number }[];
}

export interface PlVendorDelta {
  vendor: string;
  current: number;
  prior: number;
  delta: number;
}

export interface PlEntry {
  date: string;
  je_number: string;
  vendor: string;
  memo: string;
  debit: number;
  credit: number;
}

// ─── BS Trend Types ────────────────────────────────────────

export interface BsMonthly {
  month: string;
  branch: string;
  division: string;
  balance: number;
}

export interface BsAccountDelta {
  account: string;
  branch: string;
  division: string;
  opening: number;
  closing: number;
  delta: number;
}

// ─── BS BI Types ──────────────────────────────────────────

export interface BsDailyBalance {
  date: string;
  balance: number;
}

export interface BsVendorComposition {
  vendor: string;
  amount: number;
}

export interface BsCounterAccount {
  account: string;
  debit_total: number;
  credit_total: number;
  count: number;
}

export interface BsEntry {
  date: string;
  je_number: string;
  account: string;
  vendor: string;
  memo: string;
  debit: number;
  credit: number;
}

export interface BsDetailRow {
  account: string;
  branch: string;
  division: string;
  opening: number;
  closing: number;
  delta: number;
  delta_pct: number;
}

export interface BsVendorDeltaItem {
  vendor: string;
  amount: number;
}

export interface BsAccountItem {
  account: string;
  branch: string;
  division: string;
}

// ─── Cash Flow BI Types ──────────────────────────────────────

export interface CashFlowComparisonItem {
  account: string;
  current: number;
  prior: number;
}

export interface CashFlowComparisonSection {
  items: CashFlowComparisonItem[];
  current_total: number;
  prior_total: number;
}

export interface CashFlowComparison {
  operating: CashFlowComparisonSection;
  investing: CashFlowComparisonSection;
  financing: CashFlowComparisonSection;
  current_net_change: number;
  prior_net_change: number;
}

// ─── Scenario Types ────────────────────────────────────────

export interface ScenarioMonthly {
  month: string;
  count: number;
  amount: number;
}

export interface ScenarioEntry {
  date: string;
  je_number: string;
  account: string;
  vendor: string;
  memo: string;
  debit: number;
  credit: number;
}
