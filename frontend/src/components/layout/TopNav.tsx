"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useFilterStore } from "@/lib/store/filterStore";
import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";

const SummaryFilterBar  = dynamic(() => import("@/components/ui/SummaryFilterBar"),  { ssr: false });
const DateRangeFilterBar = dynamic(() => import("@/components/ui/DateRangeFilterBar"), { ssr: false });
const ScenarioFilterBar  = dynamic(() => import("@/components/ui/ScenarioFilterBar"),  { ssr: false });

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

/* ─── Inline SVG icons ─── */
function CloseIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
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
    activeMonth, activeCostCategory, activeProductCategory, activeVendor, activeRegion,
    setCrossFilter, resetCrossFilters,
  } = useFilterStore();

  const [openId, setOpenId] = useState<string | null>(null);
  const [dropdownLeft, setDropdownLeft] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        // Also check if the click was on a nav button (those handle their own toggle)
        const target = e.target as HTMLElement;
        if (!target.closest("[data-nav-btn]")) {
          setOpenId(null);
        }
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleNavClick(e: React.MouseEvent, section: NavSection) {
    if (!section.children) {
      setOpenId(null);
      window.location.href = sectionHref(section);
      return;
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDropdownLeft(rect.left);
    setOpenId((prev) => (prev === section.id ? null : section.id));
  }

  const activeSection = NAV.find((s) => isSectionActive(s, pathname));
  const openSection = NAV.find((s) => s.id === openId);

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
        className="fixed top-0 left-0 right-0 z-50 flex items-center bg-white"
        style={{ height: 56, borderBottom: "1px solid #e8e8e8" }}
      >
        {/* Logo */}
        <Link
          href="/summary"
          className="flex items-center px-6 shrink-0"
          style={{ height: "100%", textDecoration: "none" }}
        >
          <img
            src="/pwc-logo.svg"
            alt="PwC"
            style={{ height: 28, width: "auto", display: "block" }}
          />
          <span
            className="select-none"
            style={{ fontSize: 18, fontWeight: 700, color: "#2d2d2d", whiteSpace: "nowrap", marginLeft: 14, fontFamily: "var(--font-plus-jakarta), sans-serif" }}
          >
            Easy View
          </span>
        </Link>

        {/* Nav sections */}
        <div className="flex items-center flex-1 h-full overflow-x-auto px-2" style={{ scrollbarWidth: "none" }}>
          {NAV.map((section) => {
            const active = isSectionActive(section, pathname);
            const isOpen = openId === section.id;
            const hasChildren = !!section.children;
            return (
              <button
                key={section.id}
                data-nav-btn
                onClick={(e) => handleNavClick(e, section)}
                className="relative flex items-center gap-1.5 px-4 h-full transition-colors shrink-0"
                style={{
                  fontSize: 16,
                  fontWeight: active ? 600 : 400,
                  color: active || isOpen ? "#FD5108" : "#2d2d2d",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => { if (!active && !isOpen) (e.currentTarget as HTMLElement).style.color = "#FD5108"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = active || isOpen ? "#FD5108" : "#2d2d2d"; }}
              >
                <Image src={section.icon} width={15} height={15} alt={section.label}
                  style={{ filter: active || isOpen ? ICON_ORANGE : ICON_BLACK, opacity: active || isOpen ? 1 : 0.6, flexShrink: 0 }}
                />
                <span className="nav-label">{section.label}</span>
                {hasChildren && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
                    style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s", flexShrink: 0, opacity: 0.6 }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                )}
                {(active || isOpen) && (
                  <span className="absolute left-0 right-0 h-0.5" style={{ backgroundColor: "#FD5108", bottom: 0 }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Right: cross-filter chips */}
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
        </div>
      </nav>

      {/* ══════════ Dropdown (fixed, below clicked button) ══════════ */}
      {openSection?.children && (
        <div
          ref={dropdownRef}
          className="fixed flex flex-col bg-white"
          style={{
            top: 62,
            left: dropdownLeft,
            minWidth: 180,
            border: "1px solid #e8e8e8",
            borderRadius: 10,
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            zIndex: 200,
            padding: "6px 0",
          }}
        >
          {openSection.children.map((child) => {
            const childActive = pathname === child.href || pathname.startsWith(child.href + "/");
            return (
              <div key={child.href} style={{ padding: "2px 6px" }}>
                <Link
                  href={child.href}
                  onClick={() => setOpenId(null)}
                  className="flex items-center gap-2.5 transition-colors"
                  style={{
                    fontSize: 15,
                    fontWeight: childActive ? 600 : 400,
                    color: childActive ? "#FD5108" : "#2d2d2d",
                    backgroundColor: childActive ? "#FFF5ED" : "transparent",
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                    borderRadius: 6,
                    padding: "8px 12px",
                    display: "flex",
                  }}
                  onMouseEnter={(e) => {
                    if (!childActive) (e.currentTarget as HTMLElement).style.backgroundColor = "#F2F3F5";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = childActive ? "#FFF5ED" : "transparent";
                  }}
                >
                  {child.label}
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════ Sub-tab bar (48px) ══════════ */}
      <div
        className="fixed left-0 right-0 z-40 bg-white flex items-center gap-1"
        style={{ top: 56, height: 48, borderBottom: "1px solid #EEEFF1" }}
      >
        {activeSection?.children ? (
          <>
            {/* 섹션 타이틀 */}
            <div className="flex items-center h-full shrink-0" style={{ borderRight: "1px solid #EEEFF1", paddingLeft: 20, paddingRight: 20 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#000", whiteSpace: "nowrap" }}>
                {activeSection.label}
              </span>
            </div>
            {/* 서브탭 */}
            <div className="flex items-center gap-1 h-full px-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
              {activeSection.children.map((child) => {
                const active = pathname === child.href || pathname.startsWith(child.href + "/");
                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    className="relative flex items-center px-3 h-full transition-colors shrink-0"
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
                    <span>{child.label}</span>
                    {active && (
                      <span className="absolute left-0 right-0 h-0.5 rounded-full" style={{ backgroundColor: "#FD5108", bottom: 0 }} />
                    )}
                  </Link>
                );
              })}
            </div>
          </>
        ) : (
          /* Summary 등 단독 페이지: 좌측 타이틀 + 우측 필터 */
          <>
            <div className="flex items-center h-full shrink-0" style={{ paddingLeft: 20, paddingRight: 20, borderRight: "1px solid #EEEFF1" }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#000", whiteSpace: "nowrap" }}>
                {NAV.find((s) => isSectionActive(s, pathname))?.label ?? ""}
              </span>
            </div>
            <div className="flex-1" />
            {pathname === "/summary" && (
              <div className="flex items-center h-full pr-6 pl-4">
                <SummaryFilterBar />
              </div>
            )}
          </>
        )}

        {/* 섹션별 우측 필터 (서브탭 있는 섹션) */}
        {activeSection?.children && (
          <>
            <div className="flex-1" />
            <div className="flex items-center h-full pr-6 pl-4 shrink-0">
              {(pathname.startsWith("/pnl") || pathname.startsWith("/bs") || pathname.startsWith("/voucher")) && (
                <DateRangeFilterBar />
              )}
              {pathname.startsWith("/scenario") && (
                <ScenarioFilterBar n={pathname.split("/").pop() ?? "1"} />
              )}
            </div>
          </>
        )}
      </div>

      {/* ══════════ Responsive CSS ══════════ */}
      <style>{`
        @media (max-width: 1279px) {
          .nav-label { display: none; }
        }
      `}</style>
    </>
  );
}
