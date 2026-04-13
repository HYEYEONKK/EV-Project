"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

// PwC icon file references (from /public/icons/)
const NAV = [
  { href: "/dashboard", label: "대시보드", icon: "/icons/home.svg" },
  {
    label: "재무제표",
    icon: "/icons/table.svg",
    children: [
      { href: "/financial/balance-sheet", label: "재무상태표", icon: "/icons/balance.svg" },
      { href: "/financial/income-statement", label: "손익계산서", icon: "/icons/report.svg" },
      { href: "/financial/cash-flow", label: "현금흐름표", icon: "/icons/cashflow.svg" },
    ],
  },
  { href: "/sales", label: "매출 분석", icon: "/icons/barchart.svg" },
  { href: "/budget", label: "예실 비교", icon: "/icons/compare.svg" },
  { href: "/accounts", label: "계정 추이", icon: "/icons/linechart.svg" },
  { href: "/market", label: "금리/환율", icon: "/icons/market.svg" },
];

// CSS filter to render black PwC SVGs as white on dark sidebar
const ICON_WHITE = "brightness(0) invert(1)";
// CSS filter for active orange icon
const ICON_ORANGE = "brightness(0) saturate(100%) invert(35%) sepia(96%) saturate(1000%) hue-rotate(3deg) brightness(103%)";

// Chevron expand/collapse icons (inline SVG, no dependency)
function ChevronDown({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
function ChevronRight({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
// Panel toggle icons
function PanelClose({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><polyline points="16 8 12 12 16 16"/>
    </svg>
  );
}
function PanelOpen({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><polyline points="12 8 16 12 12 16"/>
    </svg>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(["재무제표"]);

  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored) setCollapsed(stored === "true");
  }, []);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebar-collapsed", String(next));
    // Sync main content margin
    const el = document.getElementById("main-content");
    if (el) el.style.marginLeft = next ? "64px" : "240px";
  };

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) =>
      prev.includes(label) ? prev.filter((g) => g !== label) : [...prev, label]
    );
  };

  const isActive = (href: string) => pathname === href;
  const isGroupActive = (children: { href: string }[]) =>
    children.some((c) => pathname === c.href);

  const width = collapsed ? 64 : 240;

  return (
    <aside
      className="fixed left-0 top-0 h-screen flex flex-col transition-all duration-300 z-50"
      style={{ width, backgroundColor: "#1A1A2E" }}
    >
      {/* Logo */}
      <div
        className="flex items-center border-b"
        style={{
          height: 60,
          minHeight: 60,
          borderColor: "rgba(255,255,255,0.08)",
          padding: collapsed ? "0 18px" : "0 20px",
        }}
      >
        {collapsed ? (
          /* Just the PwC chevron when collapsed */
          <svg width="28" height="18" viewBox="0 0 177 38" xmlns="http://www.w3.org/2000/svg">
            <path d="M77.2505 37.2904 0 37.2904 11.2495 18.6452 88.5 18.6452 77.2505 37.2904Z" fill="#FD5108"/>
            <path d="M177 0 99.7495 0 88.5 18.6452 165.75 18.6452 177 0Z" fill="#FD5108"/>
          </svg>
        ) : (
          <div className="flex items-center gap-2.5">
            <svg width="30" height="20" viewBox="0 0 177 38" xmlns="http://www.w3.org/2000/svg">
              <path d="M77.2505 37.2904 0 37.2904 11.2495 18.6452 88.5 18.6452 77.2505 37.2904Z" fill="#FD5108"/>
              <path d="M177 0 99.7495 0 88.5 18.6452 165.75 18.6452 177 0Z" fill="#FD5108"/>
            </svg>
            <span className="text-white font-semibold text-base tracking-tight select-none">
              Easyview
            </span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
        {NAV.map((item) => {
          if ("children" in item) {
            const expanded = expandedGroups.includes(item.label);
            const active = isGroupActive(item.children!);
            return (
              <div key={item.label}>
                <button
                  onClick={() => toggleGroup(item.label)}
                  className="w-full flex items-center gap-3 py-2.5 text-sm transition-colors"
                  style={{
                    padding: collapsed ? "10px 18px" : "10px 20px",
                    color: active ? "#fff" : "rgba(255,255,255,0.65)",
                    backgroundColor: active ? "rgba(253,81,8,0.12)" : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.05)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = active ? "rgba(253,81,8,0.12)" : "transparent";
                  }}
                >
                  <Image
                    src={item.icon}
                    width={18}
                    height={18}
                    alt={item.label}
                    style={{ filter: ICON_WHITE, opacity: active ? 1 : 0.65, flexShrink: 0 }}
                  />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      <span style={{ color: "rgba(255,255,255,0.4)" }}>
                        {expanded ? <ChevronDown /> : <ChevronRight />}
                      </span>
                    </>
                  )}
                </button>
                {!collapsed && expanded && (
                  <div>
                    {item.children!.map((child) => {
                      const childActive = isActive(child.href);
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className="flex items-center gap-3 text-sm transition-colors"
                          style={{
                            padding: "8px 20px 8px 44px",
                            color: childActive ? "#fff" : "rgba(255,255,255,0.55)",
                            backgroundColor: childActive ? "rgba(253,81,8,0.15)" : "transparent",
                            borderLeft: childActive ? "2px solid #FD5108" : "2px solid transparent",
                          }}
                          onMouseEnter={(e) => {
                            if (!childActive) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.05)";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.backgroundColor = childActive ? "rgba(253,81,8,0.15)" : "transparent";
                          }}
                        >
                          <Image
                            src={child.icon}
                            width={15}
                            height={15}
                            alt={child.label}
                            style={{ filter: childActive ? ICON_ORANGE : ICON_WHITE, opacity: childActive ? 1 : 0.55, flexShrink: 0 }}
                          />
                          <span>{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const active = isActive(item.href!);
          return (
            <Link
              key={item.href}
              href={item.href!}
              className="flex items-center gap-3 text-sm transition-colors"
              style={{
                padding: collapsed ? "10px 18px" : "10px 20px",
                color: active ? "#fff" : "rgba(255,255,255,0.65)",
                backgroundColor: active ? "rgba(253,81,8,0.15)" : "transparent",
                borderLeft: active ? "2px solid #FD5108" : "2px solid transparent",
              }}
              onMouseEnter={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.05)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = active ? "rgba(253,81,8,0.15)" : "transparent";
              }}
            >
              <Image
                src={item.icon}
                width={18}
                height={18}
                alt={item.label}
                style={{ filter: active ? ICON_ORANGE : ICON_WHITE, opacity: active ? 1 : 0.65, flexShrink: 0 }}
              />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={toggleCollapse}
        className="flex items-center gap-2 text-sm transition-colors"
        style={{
          padding: collapsed ? "12px 18px" : "12px 20px",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          color: "rgba(255,255,255,0.35)",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.7)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.35)"; }}
      >
        {collapsed ? <PanelOpen /> : <><PanelClose /><span>접기</span></>}
      </button>
    </aside>
  );
}
