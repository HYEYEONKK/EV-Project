"use client";
import { usePathname } from "next/navigation";
import { useState, useRef } from "react";
import Link from "next/link";
import { useAuthStore } from "@/lib/store/authStore";
import { LogIn, LogOut } from "lucide-react";

/* ── Section tabs with dropdown children ── */
const TABS = [
  {
    id: "data",
    label: "데이터 설명",
    href: "/home2",
    children: [
      { label: "데이터 업로드", href: "/home2/data/upload" },
      { label: "자료실", href: "/home2/data/library" },
      { label: "FAQ", href: "/home2/data/faq" },
    ],
  },
  {
    id: "dashboard",
    label: "대시보드 분석",
    href: "/home2/dashboard",
    children: [
      { label: "Summary", href: "/home2/dashboard" },
      { label: "손익분석", href: "/home2/dashboard" },
      { label: "재무상태분석", href: "/home2/dashboard" },
      { label: "전표분석", href: "/home2/dashboard" },
      { label: "시나리오 분석", href: "/home2/dashboard" },
    ],
  },
  {
    id: "admin",
    label: "관리자",
    href: "/home2/admin",
    children: [
      { label: "공지사항", href: "/home2/admin" },
      { label: "문의게시판", href: "/home2/admin" },
    ],
  },
];

export default function TopNav2() {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnterTab = (id: string) => {
    if (leaveTimer.current) { clearTimeout(leaveTimer.current); leaveTimer.current = null; }
    setHoveredTab(id);
  };
  const handleMouseLeave = () => {
    leaveTimer.current = setTimeout(() => setHoveredTab(null), 120);
  };

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          height: 56,
          background: "#fff",
          borderBottom: "1px solid #e0e0e0",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
        }}
      >
        {/* ── Left: Logo ── */}
        <Link
          href="/home2"
          className="flex items-center shrink-0"
          style={{ height: "100%", textDecoration: "none", gap: 14 }}
        >
          <img src="/pwc-logo.svg" alt="PwC" style={{ height: 28, width: "auto", display: "block" }} />
          <span className="select-none" style={{ display: "inline-flex", alignItems: "baseline", whiteSpace: "nowrap", fontFamily: "var(--font-plus-jakarta), sans-serif" }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: "#2d2d2d", letterSpacing: "-0.3px" }}>Easy View</span>
            <span style={{ display: "inline-flex", alignItems: "center", marginLeft: 1, position: "relative", top: "-7px" }}>
              <svg width="11" height="11" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M47.062 8.01195C47.2809 7.40867 47.6803 6.88743 48.2059 6.51908C48.7314 6.15073 49.3577 5.95312 49.9995 5.95312C50.6412 5.95313 51.2675 6.15073 51.793 6.51908C52.3186 6.88743 52.718 7.40867 52.937 8.01195L55.9245 16.1745C58.2675 22.5734 61.9774 28.3845 66.7959 33.203C71.6144 38.0215 77.4255 41.7315 83.8245 44.0745L91.9807 47.062C92.584 47.2809 93.1052 47.6803 93.4736 48.2059C93.8419 48.7314 94.0395 49.3577 94.0395 49.9995C94.0395 50.6412 93.8419 51.2675 93.4736 51.793C93.1052 52.3186 92.584 52.718 91.9807 52.937L83.8245 55.9245C77.4255 58.2675 71.6144 61.9774 66.7959 66.7959C61.9774 71.6144 58.2675 77.4255 55.9245 83.8245L52.937 91.9807C52.718 92.584 52.3186 93.1052 51.793 93.4736C51.2675 93.8419 50.6412 94.0395 49.9995 94.0395C49.3577 94.0395 48.7314 93.8419 48.2059 93.4736C47.6803 93.1052 47.2809 92.584 47.062 91.9807L44.0745 83.8245C41.7315 77.4255 38.0215 71.6144 33.203 66.7959C28.3845 61.9774 22.5734 58.2675 16.1745 55.9245L8.01195 52.937C7.40867 52.718 6.88743 52.3186 6.51908 51.793C6.15073 51.2675 5.95313 50.6412 5.95312 49.9995C5.95312 49.3577 6.15073 48.7314 6.51908 48.2059C6.88743 47.6803 7.40867 47.2809 8.01195 47.062L16.1745 44.0745C22.5734 41.7315 28.3845 38.0215 33.203 33.203C38.0215 28.3845 41.7315 22.5734 44.0745 16.1745L47.062 8.01195Z" fill="#FD5108"/>
              </svg>
            </span>
          </span>
        </Link>

        {/* ── 가운데 빈공간 ── */}
        <div style={{ flex: 1 }} />

        {/* ── Center-Right: Section tabs ── */}
        {TABS.map((tab) => {
          const isHovered = hoveredTab === tab.id;
          const active = tab.id === "data"
            ? pathname.startsWith("/home2/data/")
            : pathname === tab.href || pathname.startsWith(tab.href + "/");
          const highlight = isHovered || active;
          return (
            <div
              key={tab.id}
              className="h-full"
              style={{ display: "flex", alignItems: "center" }}
              onMouseEnter={() => handleMouseEnterTab(tab.id)}
              onMouseLeave={handleMouseLeave}
            >
              <Link
                href={tab.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  height: "100%",
                  padding: "0 44px",
                  fontSize: 15,
                  fontWeight: 600,
                  color: highlight ? "#FD5108" : "#1A1A2E",
                  textDecoration: "none",
                  transition: "color 0.15s",
                  letterSpacing: "-0.2px",
                }}
              >
                <span style={{
                  borderBottom: highlight ? "2px solid #FD5108" : "2px solid transparent",
                  paddingBottom: 4,
                  transition: "border-color 0.15s",
                }}>
                  {tab.label}
                </span>
              </Link>
            </div>
          );
        })}

        {/* ── 가운데~오른쪽 빈공간 ── */}
        <div style={{ flex: 1 }} />

        {/* ── Far Right: Login/User ── */}
        <div className="flex items-center shrink-0" style={{ gap: 12 }}>
          {isAuthenticated && user ? (
            <>
              <span style={{ fontSize: 13, color: "#6B7280", fontWeight: 500 }}>{user.name}</span>
              <button
                onClick={logout}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  fontSize: 13, fontWeight: 600, color: "#6B7280",
                  background: "none", border: "1px solid #DFE3E6", borderRadius: 6,
                  padding: "6px 14px", cursor: "pointer", transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#FD5108"; (e.currentTarget as HTMLElement).style.color = "#FD5108"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#DFE3E6"; (e.currentTarget as HTMLElement).style.color = "#6B7280"; }}
              >
                <LogOut size={14} />
                로그아웃
              </button>
            </>
          ) : (
            <Link
              href="/login"
              style={{
                display: "flex", alignItems: "center", gap: 6,
                fontSize: 13, fontWeight: 600, color: "#6B7280",
                background: "none", border: "1px solid #DFE3E6", borderRadius: 6,
                padding: "6px 14px", textDecoration: "none", transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#FD5108"; (e.currentTarget as HTMLElement).style.color = "#FD5108"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#DFE3E6"; (e.currentTarget as HTMLElement).style.color = "#6B7280"; }}
            >
              <LogIn size={14} />
              로그인
            </Link>
          )}
        </div>
      </nav>

      {/* ── Dropdown panel ── */}
      {hoveredTab && (
        <div
          className="fixed left-0 right-0 z-40"
          style={{
            top: 56,
            background: "#fff",
            borderBottom: "1px solid #e0e0e0",
            boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
          }}
          onMouseEnter={() => handleMouseEnterTab(hoveredTab)}
          onMouseLeave={handleMouseLeave}
        >
          {/* nav와 완전히 동일한 레이아웃 구조 */}
          <div style={{ display: "flex", alignItems: "flex-start", padding: "0 24px" }}>
            {/* 로고 영역과 동일한 너비 확보 */}
            <div className="shrink-0" style={{ width: 180 }} />
            <div style={{ flex: 1 }} />

            {/* 각 탭과 동일한 padding으로 정렬 */}
            {TABS.map((t) => {
              const isActiveColumn = t.id === hoveredTab;
              return (
                <div
                  key={t.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 10,
                    padding: "20px 44px",
                  }}
                >
                  {t.children.map((child, idx) => (
                    <Link
                      key={child.label}
                      href={child.href}
                      style={{
                        fontSize: 14,
                        color: isActiveColumn && idx === 0 ? "#FD5108" : "#1A1A2E",
                        fontWeight: 400,
                        textDecoration: "none",
                        transition: "color 0.15s",
                        whiteSpace: "nowrap",
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#FD5108"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = isActiveColumn && idx === 0 ? "#FD5108" : "#1A1A2E"; }}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              );
            })}

            <div style={{ flex: 1 }} />
            {/* 로그인 영역과 동일한 너비 확보 */}
            <div className="shrink-0" style={{ width: 100 }} />
          </div>
        </div>
      )}
    </>
  );
}
