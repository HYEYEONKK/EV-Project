"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useFilterStore } from "@/lib/store/filterStore";
import { useState } from "react";

/* ─── Nav config ─── */
type NavLeaf = { href: string; label: string; icon: string };
type NavSection = { id: string; label: string; icon: string; href?: string; children?: NavLeaf[] };

const NAV: NavSection[] = [
  { id: "summary", label: "Summary", icon: "/icons/home.svg", href: "/summary" },
  {
    id: "pnl", label: "손익분석", icon: "/icons/barchart.svg",
    children: [
      { href: "/pnl/summary",  label: "PL 요약",    icon: "/icons/barchart.svg" },
      { href: "/pnl/trend",    label: "PL 추이분석", icon: "/icons/linechart.svg" },
      { href: "/pnl/account",  label: "PL 계정분석", icon: "/icons/linechart.svg" },
      { href: "/pnl/sales",    label: "매출분석",    icon: "/icons/barchart.svg" },
      { href: "/pnl/items",    label: "손익항목",    icon: "/icons/table.svg" },
    ],
  },
  {
    id: "bs", label: "재무상태분석", icon: "/icons/balance.svg",
    children: [
      { href: "/bs/summary", label: "BS 요약",    icon: "/icons/balance.svg" },
      { href: "/bs/trend",   label: "BS 추이분석", icon: "/icons/linechart.svg" },
      { href: "/bs/account", label: "BS 계정분석", icon: "/icons/linechart.svg" },
    ],
  },
  {
    id: "voucher", label: "전표분석", icon: "/icons/report.svg",
    children: [
      { href: "/voucher/list",   label: "전표분석내역", icon: "/icons/report.svg" },
      { href: "/voucher/search", label: "전표검색",     icon: "/icons/report.svg" },
    ],
  },
  {
    id: "scenario", label: "시나리오분석", icon: "/icons/compare.svg",
    children: Array.from({ length: 7 }, (_, i) => ({
      href: `/scenario/${i + 1}`,
      label: `시나리오 ${i + 1}`,
      icon: "/icons/compare.svg",
    })),
  },
];

/* ─── CSS filter for orange icons ─── */
const ICON_ORANGE = "brightness(0) saturate(100%) invert(35%) sepia(96%) saturate(1000%) hue-rotate(3deg) brightness(103%)";
const ICON_BLACK  = "brightness(0)";
const ICON_GREY   = "brightness(0) opacity(0.4)";

/* ─── Inline SVG icons ─── */
function CloseIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
function FilterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="11" y1="18" x2="13" y2="18" />
    </svg>
  );
}

/* ─── Helpers ─── */
function isSectionActive(section: NavSection, pathname: string) {
  if (section.href) return pathname === section.href || pathname.startsWith(section.href + "/");
  return section.children?.some((c) => pathname === c.href || pathname.startsWith(c.href + "/")) ?? false;
}
function sectionHref(section: NavSection) {
  return section.href ?? section.children?.[0].href ?? "/";
}

/* ─── Main component ─── */
export default function TopNav() {
  const pathname = usePathname();
  const {
    dateFrom, dateTo, setDateRange,
    activeMonth, activeCostCategory, activeProductCategory, activeVendor, activeRegion,
    setCrossFilter, resetCrossFilters,
  } = useFilterStore();
  const [showFilter, setShowFilter] = useState(false);

  const activeSection = NAV.find((s) => isSectionActive(s, pathname));

  const activeFilters = [
    activeMonth          && { key: "activeMonth"          as const, label: `월: ${activeMonth}` },
    activeCostCategory   && { key: "activeCostCategory"   as const, label: `비용: ${activeCostCategory}` },
    activeProductCategory && { key: "activeProductCategory" as const, label: `제품: ${activeProductCategory}` },
    activeVendor         && { key: "activeVendor"         as const, label: `거래처: ${activeVendor}` },
    activeRegion         && { key: "activeRegion"         as const, label: `지역: ${activeRegion}` },
  ].filter(Boolean) as { key: Parameters<typeof setCrossFilter>[0]; label: string }[];

  return (
    <>
      {/* ══════════ Top nav bar (56px) ══════════ */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 bg-white flex items-center"
        style={{ height: 56, borderBottom: "1px solid #DFE3E6" }}
      >
        {/* Logo */}
        <Link
          href="/summary"
          className="flex items-center gap-0 px-5 shrink-0"
          style={{ borderRight: "1px solid #DFE3E6", height: "100%", textDecoration: "none" }}
        >
          {/* PwC wordmark — scaled to fit 56px nav height */}
          <img
            src="/pwc-logo.svg"
            alt="PwC"
            style={{ height: 22, width: "auto", display: "block" }}
          />
          {/* Divider */}
          <span style={{ width: 1, height: 18, backgroundColor: "#DFE3E6", margin: "0 12px", flexShrink: 0 }} />
          {/* Product name */}
          <span
            className="select-none"
            style={{ fontSize: 14, fontWeight: 600, color: "#000000", letterSpacing: "0.01em", whiteSpace: "nowrap" }}
          >
            Easy View
          </span>
        </Link>

        {/* Nav sections */}
        <div className="flex items-center gap-0.5 px-3 flex-1 h-full overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {NAV.map((section) => {
            const active = isSectionActive(section, pathname);
            return (
              <Link
                key={section.id}
                href={sectionHref(section)}
                className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors shrink-0"
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: active ? "#FD5108" : "#000000",
                  backgroundColor: active ? "#FFF5ED" : "transparent",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = "#F5F7F8"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = active ? "#FFF5ED" : "transparent"; }}
              >
                <Image
                  src={section.icon}
                  width={15}
                  height={15}
                  alt={section.label}
                  style={{ filter: active ? ICON_ORANGE : ICON_BLACK, opacity: active ? 1 : 0.7, flexShrink: 0 }}
                />
                {/* Label hidden when screen is narrow */}
                <span className="nav-label">{section.label}</span>
                {/* Active underline */}
                {active && (
                  <span className="absolute left-0 right-0 h-0.5 rounded-full" style={{ backgroundColor: "#FD5108", bottom: -1 }} />
                )}
              </Link>
            );
          })}
        </div>

        {/* Right: cross-filter chips + date filter */}
        <div className="flex items-center gap-2 px-4 shrink-0">
          {activeFilters.map((f) => (
            <span
              key={f.key}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
              style={{ backgroundColor: "#FFE8D4", color: "#FD5108", border: "1px solid #FFAA72" }}
            >
              {f.label}
              <button onClick={() => setCrossFilter(f.key, null)} className="hover:opacity-60 ml-0.5">
                <CloseIcon />
              </button>
            </span>
          ))}
          {activeFilters.length > 0 && (
            <button onClick={resetCrossFilters} className="text-xs hover:underline" style={{ color: "#A1A8B3" }}>
              전체 해제
            </button>
          )}

          <button
            onClick={() => setShowFilter((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors"
            style={{
              backgroundColor: showFilter ? "#FFE8D4" : "#F5F7F8",
              color: showFilter ? "#FD5108" : "#A1A8B3",
              border: `1px solid ${showFilter ? "#FFAA72" : "#DFE3E6"}`,
            }}
          >
            <FilterIcon />
            <span>기간</span>
          </button>

          {showFilter && (
            <div className="flex items-center gap-2">
              <input
                type="date" value={dateFrom}
                onChange={(e) => setDateRange(e.target.value, dateTo)}
                className="px-2 py-1 text-xs rounded-md"
                style={{ border: "1px solid #DFE3E6", color: "#000" }}
              />
              <span className="text-xs" style={{ color: "#A1A8B3" }}>~</span>
              <input
                type="date" value={dateTo}
                onChange={(e) => setDateRange(dateFrom, e.target.value)}
                className="px-2 py-1 text-xs rounded-md"
                style={{ border: "1px solid #DFE3E6", color: "#000" }}
              />
            </div>
          )}
        </div>
      </nav>

      {/* ══════════ Sub-tab bar (40px) ══════════ */}
      <div
        className="fixed left-0 right-0 z-40 bg-white flex items-center px-4 gap-1"
        style={{ top: 56, height: 40, borderBottom: "1px solid #EEEFF1" }}
      >
        {activeSection?.children ? (
          activeSection.children.map((child) => {
            const active = pathname === child.href || pathname.startsWith(child.href + "/");
            return (
              <Link
                key={child.href}
                href={child.href}
                className="relative flex items-center gap-1.5 px-3 h-full transition-colors shrink-0"
                style={{
                  fontSize: 14,
                  fontWeight: active ? 600 : 400,
                  color: active ? "#FD5108" : "#A1A8B3",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.color = "#000"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = active ? "#FD5108" : "#A1A8B3"; }}
              >
                <Image
                  src={child.icon}
                  width={14}
                  height={14}
                  alt={child.label}
                  className="subtab-icon"
                  style={{ filter: active ? ICON_ORANGE : ICON_GREY, flexShrink: 0 }}
                />
                <span className="subtab-label">{child.label}</span>
                {active && (
                  <span className="absolute left-0 right-0 h-0.5 rounded-full" style={{ backgroundColor: "#FD5108", bottom: 0 }} />
                )}
              </Link>
            );
          })
        ) : (
          /* Summary (no children): show just the current page label */
          <span className="text-sm font-semibold" style={{ color: "#000" }}>
            {NAV.find((s) => isSectionActive(s, pathname))?.label ?? ""}
          </span>
        )}
      </div>

      {/* ══════════ Responsive CSS ══════════ */}
      <style>{`
        /* Hide text labels when viewport is narrow (e.g. zoomed) */
        @media (max-width: 1279px) {
          .nav-label { display: none; }
        }
        @media (max-width: 1100px) {
          .subtab-label { display: none; }
          .subtab-icon  { display: none; }
        }
      `}</style>
    </>
  );
}
