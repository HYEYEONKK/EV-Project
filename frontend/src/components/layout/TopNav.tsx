"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFilterStore } from "@/lib/store/filterStore";
import { useState, useRef, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Home, BarChart2, Database, FileText, Layers, TrendingUp, LogOut, type LucideIcon } from "lucide-react";
import { useAuthStore } from "@/lib/store/authStore";

const SummaryFilterBar  = dynamic(() => import("@/components/ui/SummaryFilterBar"),  { ssr: false });
const DateRangeFilterBar = dynamic(() => import("@/components/ui/DateRangeFilterBar"), { ssr: false });
const ScenarioFilterBar  = dynamic(() => import("@/components/ui/ScenarioFilterBar"),  { ssr: false });
const MarketFilterBar    = dynamic(() => import("@/components/ui/MarketFilterBar"),    { ssr: false });

/* ─── Nav config ─── */
type NavLeaf = { href: string; label: string };
type NavSection = { id: string; label: string; Icon: LucideIcon; href?: string; children?: NavLeaf[] };

const NAV: NavSection[] = [
  { id: "summary", label: "Summary", Icon: Home, href: "/summary" },
  {
    id: "pnl", label: "손익분석", Icon: BarChart2,
    children: [
      { href: "/pnl/summary",  label: "PL 요약" },
      { href: "/pnl/trend",    label: "PL 추이분석" },
      { href: "/pnl/account",  label: "PL 계정분석" },
      { href: "/pnl/sales",    label: "매출분석" },
      { href: "/pnl/items",    label: "손익항목" },
      { href: "/period",       label: "기간별 분석" },
    ],
  },
  {
    id: "bs", label: "재무상태분석", Icon: Database,
    children: [
      { href: "/bs/summary", label: "BS 요약" },
      { href: "/bs/trend",   label: "BS 추이분석" },
      { href: "/bs/account", label: "BS 계정분석" },
    ],
  },
  {
    id: "voucher", label: "전표분석", Icon: FileText,
    children: [
      { href: "/voucher/list",   label: "전표분석내역" },
      { href: "/voucher/search", label: "전표검색" },
    ],
  },
  {
    id: "scenario", label: "시나리오분석", Icon: Layers,
    children: [
      ...Array.from({ length: 7 }, (_, i) => ({
        href: `/scenario/${i + 1}`,
        label: `시나리오 ${i + 1}`,
      })),
      { href: "/audit", label: "종합 감사 리포트" },
    ],
  },
  {
    id: "market", label: "금리 · 환율", Icon: TrendingUp,
    children: [
      { href: "/market/rate",     label: "금리" },
      { href: "/market/exchange", label: "환율" },
    ],
  },
];

/* ─── Helpers ─── */
function isSectionActive(section: NavSection, pathname: string) {
  if (section.href) return pathname === section.href || pathname.startsWith(section.href + "/");
  return section.children?.some((c) => pathname === c.href || pathname.startsWith(c.href + "/")) ?? false;
}
function sectionHref(section: NavSection) {
  return section.href ?? section.children?.[0].href ?? "/";
}

function CloseIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/* ─── Main component ─── */
export default function TopNav() {
  const pathname = usePathname();
  const {
    activeMonth, activeCostCategory, activeProductCategory, activeVendor, activeRegion,
    setCrossFilter, resetCrossFilters,
  } = useFilterStore();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  const handleGoInput = () => {
    window.location.href = "/input";
  };

  const [openId, setOpenId] = useState<string | null>(null);
  const [dropdownLeft, setDropdownLeft] = useState(0);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleNavMouseEnter = useCallback((e: React.MouseEvent, section: NavSection) => {
    if (!section.children) return;
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDropdownLeft(rect.left);
    setOpenId(section.id);
  }, []);

  const handleNavMouseLeave = useCallback(() => {
    hoverTimerRef.current = setTimeout(() => setOpenId(null), 150);
  }, []);

  const handleDropdownMouseEnter = useCallback(() => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
  }, []);

  const handleDropdownMouseLeave = useCallback(() => {
    hoverTimerRef.current = setTimeout(() => setOpenId(null), 150);
  }, []);

  useEffect(() => () => { if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current); }, []);

  /* ── /home 스크롤 감지: 히어로 영역 벗어나면 nav 불투명으로 전환 ── */
  const [homeScrolled, setHomeScrolled] = useState(false);
  useEffect(() => {
    if (pathname !== "/home") { setHomeScrolled(false); return; }
    const onScroll = () => setHomeScrolled(window.scrollY > window.innerHeight * 0.75);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  /* ── 아이콘 전용 모드: nav 섹션 영역이 넘칠 때 레이블 숨김 ── */
  const navSectionsRef = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const el = navSectionsRef.current;
    if (!el) return;
    const check = () => setCompact(el.scrollWidth > el.clientWidth + 2);
    const ro = new ResizeObserver(check);
    ro.observe(el);
    check();
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        !(e.target as HTMLElement).closest("[data-nav-btn]")
      ) setOpenId(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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
        className="fixed top-0 left-0 right-0 z-50 flex items-center"
        style={pathname === "/home" ? {
          height: 56,
          background: homeScrolled ? "#fff" : "transparent",
          borderBottom: homeScrolled ? "1px solid #e8e8e8" : "1px solid transparent",
          transition: "background 0.3s ease, border-color 0.3s ease",
        } : {
          height: 56,
          background: "#fff",
          borderBottom: "1px solid #e8e8e8",
        }}
      >
        {/* Logo */}
        <Link
          href="/home"
          className="flex items-center px-6 shrink-0"
          style={{ height: "100%", textDecoration: "none" }}
          onClick={(e) => { e.preventDefault(); window.location.href = "/home"; }}
        >
          <img
            src="/pwc-logo.svg"
            alt="PwC"
            style={{ height: 28, width: "auto", display: "block" }}
          />
          <span
            className="select-none"
            style={{ display: "inline-flex", alignItems: "baseline", gap: 0, whiteSpace: "nowrap", marginLeft: 14, fontFamily: "var(--font-plus-jakarta), sans-serif" }}
          >
            <span style={{ fontSize: 18, fontWeight: 700, color: "#2d2d2d", letterSpacing: "-0.3px" }}>Easy View</span>
            <span style={{ display: "inline-flex", alignItems: "center", marginLeft: 1, position: "relative", top: "-7px" }}>
              <svg width="11" height="11" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M47.062 8.01195C47.2809 7.40867 47.6803 6.88743 48.2059 6.51908C48.7314 6.15073 49.3577 5.95312 49.9995 5.95312C50.6412 5.95313 51.2675 6.15073 51.793 6.51908C52.3186 6.88743 52.718 7.40867 52.937 8.01195L55.9245 16.1745C58.2675 22.5734 61.9774 28.3845 66.7959 33.203C71.6144 38.0215 77.4255 41.7315 83.8245 44.0745L91.9807 47.062C92.584 47.2809 93.1052 47.6803 93.4736 48.2059C93.8419 48.7314 94.0395 49.3577 94.0395 49.9995C94.0395 50.6412 93.8419 51.2675 93.4736 51.793C93.1052 52.3186 92.584 52.718 91.9807 52.937L83.8245 55.9245C77.4255 58.2675 71.6144 61.9774 66.7959 66.7959C61.9774 71.6144 58.2675 77.4255 55.9245 83.8245L52.937 91.9807C52.718 92.584 52.3186 93.1052 51.793 93.4736C51.2675 93.8419 50.6412 94.0395 49.9995 94.0395C49.3577 94.0395 48.7314 93.8419 48.2059 93.4736C47.6803 93.1052 47.2809 92.584 47.062 91.9807L44.0745 83.8245C41.7315 77.4255 38.0215 71.6144 33.203 66.7959C28.3845 61.9774 22.5734 58.2675 16.1745 55.9245L8.01195 52.937C7.40867 52.718 6.88743 52.3186 6.51908 51.793C6.15073 51.2675 5.95313 50.6412 5.95312 49.9995C5.95312 49.3577 6.15073 48.7314 6.51908 48.2059C6.88743 47.6803 7.40867 47.2809 8.01195 47.062L16.1745 44.0745C22.5734 41.7315 28.3845 38.0215 33.203 33.203C38.0215 28.3845 41.7315 22.5734 44.0745 16.1745L47.062 8.01195Z" fill="#FD5108"/>
              </svg>
            </span>
          </span>
        </Link>

        {/* Nav sections */}
        <div ref={navSectionsRef} className="flex items-center flex-1 h-full overflow-x-auto px-2" style={{ scrollbarWidth: "none" }}>
          {NAV.map((section) => {
            const active = isSectionActive(section, pathname);
            const isOpen = openId === section.id;
            const hasChildren = !!section.children;
            const highlighted = active || isOpen;
            const { Icon } = section;
            return (
              <button
                key={section.id}
                data-nav-btn
                title={compact ? section.label : undefined}
                onClick={() => { window.location.href = sectionHref(section); }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "#FD5108";
                  handleNavMouseEnter(e, section);
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color = highlighted ? "#FD5108" : "#2d2d2d";
                  handleNavMouseLeave();
                }}
                className="relative flex items-center gap-1 h-full shrink-0"
                style={{
                  fontSize: 15,
                  fontWeight: active ? 700 : 500,
                  color: highlighted ? "#FD5108" : "#2d2d2d",
                  background: "none", border: "none", cursor: "pointer", whiteSpace: "nowrap",
                  padding: compact ? "0 10px" : "0 12px",
                  transition: "padding 0.2s",
                }}
              >
                <Icon size={compact ? 22 : 16} strokeWidth={1.75} style={{ flexShrink: 0 }} />
                {!compact && <span className="nav-label">{section.label}</span>}
                {!compact && hasChildren && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
                    style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s", flexShrink: 0, opacity: 0.5 }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                )}
                {highlighted && (
                  <span className="absolute left-0 right-0 h-0.5" style={{ backgroundColor: "#FD5108", bottom: 0 }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Right: cross-filter chips + user info */}
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

          {/* 홈(Input) 버튼 */}
          <button
            onClick={handleGoInput}
            title="Input Data"
            style={{
              display: "flex", alignItems: "center", gap: 5,
              background: "none", border: "1px solid #DFE3E6", cursor: "pointer",
              color: "#374151", fontSize: 13, fontWeight: 500,
              padding: "5px 12px", borderRadius: 6,
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "#FD5108";
              (e.currentTarget as HTMLElement).style.color = "#FD5108";
              (e.currentTarget as HTMLElement).style.backgroundColor = "#FFF5ED";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "#DFE3E6";
              (e.currentTarget as HTMLElement).style.color = "#374151";
              (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
            }}
          >
            <Home size={14} strokeWidth={2} />
            {!compact && <span>홈</span>}
          </button>

          {/* 구분선 */}
          {user && (
            <>
              <div style={{ width: 1, height: 18, backgroundColor: "#EEEFF1", marginLeft: 4 }} />
              {/* 사용자 아바타 + 이름 */}
              <div className="flex items-center gap-2">
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  backgroundColor: "#FFF5ED", border: "1px solid #FFAA72",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700, color: "#FD5108",
                  flexShrink: 0,
                }}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
                {!compact && (
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#374151", whiteSpace: "nowrap" }}>
                    {user.name}
                  </span>
                )}
              </div>
              {/* 로그아웃 버튼 */}
              <button
                onClick={handleLogout}
                title="로그아웃"
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  background: "none", border: "none", cursor: "pointer",
                  color: "#A1A8B3", fontSize: 13, padding: "4px 6px", borderRadius: 6,
                  transition: "color 0.15s, background-color 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "#FF4747";
                  (e.currentTarget as HTMLElement).style.backgroundColor = "#FFF5F5";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "#A1A8B3";
                  (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                }}
              >
                <LogOut size={15} strokeWidth={2} />
                {!compact && <span>로그아웃</span>}
              </button>
            </>
          )}
        </div>
      </nav>

      {/* ══════════ Hover Dropdown ══════════ */}
      {openId && NAV.find(s => s.id === openId)?.children && (
        <div
          ref={dropdownRef}
          className="fixed flex flex-col bg-white"
          onMouseEnter={handleDropdownMouseEnter}
          onMouseLeave={handleDropdownMouseLeave}
          style={{
            top: 62,
            left: dropdownLeft,
            minWidth: 176,
            border: "1px solid #e8e8e8",
            borderRadius: 10,
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            zIndex: 200,
            padding: "6px 0",
          }}
        >
          {NAV.find(s => s.id === openId)!.children!.map((child) => {
            const childActive = pathname === child.href || pathname.startsWith(child.href + "/");
            return (
              <div key={child.href} style={{ padding: "2px 6px" }}>
                <Link
                  href={child.href}
                  onClick={() => setOpenId(null)}
                  style={{
                    fontSize: 14,
                    fontWeight: childActive ? 600 : 400,
                    color: childActive ? "#FD5108" : "#2d2d2d",
                    backgroundColor: childActive ? "#FFF5ED" : "transparent",
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                    borderRadius: 6,
                    padding: "8px 12px",
                    display: "block",
                    letterSpacing: "-0.3px",
                  }}
                  onMouseEnter={(e) => { if (!childActive) (e.currentTarget as HTMLElement).style.backgroundColor = "#F2F3F5"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = childActive ? "#FFF5ED" : "transparent"; }}
                >
                  {child.label}
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════ Sub-tab bar (44px) ══════════ */}
      <div
        className="fixed left-0 right-0 z-40 bg-white flex items-center"
        style={{ top: 56, height: pathname === "/home" ? 0 : 44, borderBottom: pathname === "/home" ? "none" : "1px solid #EEEFF1" }}
      >
        {activeSection?.children ? (
          <>
            <div className="flex items-center gap-0.5 h-full px-4 overflow-x-auto flex-1" style={{ scrollbarWidth: "none" }}>
              {activeSection.children.map((child) => {
                const active = pathname === child.href || pathname.startsWith(child.href + "/");
                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    style={{
                      fontSize: 15,
                      fontWeight: active ? 700 : 400,
                      color: active ? "#1A1A2E" : "#6B7280",
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                      backgroundColor: "transparent",
                      padding: "0 14px",
                      display: "inline-flex",
                      alignItems: "center",
                      flexShrink: 0,
                      height: "100%",
                      borderBottom: active ? "2px solid #FD5108" : "2px solid transparent",
                      transition: "color 0.15s, border-color 0.15s",
                      boxSizing: "border-box",
                    }}
                    onMouseEnter={(e) => {
                      if (!active) (e.currentTarget as HTMLElement).style.color = "#1A1A2E";
                    }}
                    onMouseLeave={(e) => {
                      if (!active) (e.currentTarget as HTMLElement).style.color = "#6B7280";
                    }}
                  >
                    {child.label}
                  </Link>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center h-full shrink-0" style={{ paddingLeft: 20, paddingRight: 20, borderRight: "1px solid #EEEFF1" }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#000", whiteSpace: "nowrap" }}>
                {NAV.find((s) => isSectionActive(s, pathname))?.label ?? ""}
              </span>
            </div>
            <div className="flex-1" />
          </>
        )}

        {/* 우측 필터 */}
        {(activeSection?.children || pathname === "/summary") && (
          <div className="flex items-center h-full pr-6 pl-4 shrink-0">
            {pathname === "/summary" && <SummaryFilterBar />}
            {(pathname.startsWith("/pnl") || pathname.startsWith("/bs") || pathname.startsWith("/voucher")) && (
              <DateRangeFilterBar />
            )}
            {pathname.startsWith("/scenario") && (
              <ScenarioFilterBar n={pathname.split("/").pop() ?? "1"} />
            )}
            {pathname.startsWith("/market") && <MarketFilterBar />}
          </div>
        )}
      </div>

      {/* ══════════ Responsive CSS ══════════ */}
      <style>{`
        @media (max-width: 1399px) {
          .nav-label { display: none; }
        }
      `}</style>
    </>
  );
}
