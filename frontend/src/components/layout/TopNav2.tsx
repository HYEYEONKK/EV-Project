"use client";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/lib/store/authStore";
import { LogIn, LogOut } from "lucide-react";

/* ── Section tabs ── */
const TABS = [
  { id: "data",      label: "데이터 설명",   href: "/home2" },
  { id: "dashboard", label: "대시보드 분석",  href: "/home2/dashboard" },
  { id: "admin",     label: "관리자",        href: "/home2/admin" },
];

function isTabActive(tab: typeof TABS[number], pathname: string) {
  if (tab.id === "data") return pathname === "/home2";
  return pathname === tab.href || pathname.startsWith(tab.href + "/");
}

export default function TopNav2() {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();


  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between"
      style={{
        height: 56,
        background: "#fff",
        borderBottom: "1px solid #e0e0e0",
        padding: "0 24px",
      }}
    >
      {/* ── Left: Logo ── */}
      <Link
        href="/home2"
        className="flex items-center shrink-0"
        style={{ height: "100%", textDecoration: "none", gap: 14 }}
      >
        <img
          src="/pwc-logo.svg"
          alt="PwC"
          style={{ height: 28, width: "auto", display: "block" }}
        />
        <span
          className="select-none"
          style={{ display: "inline-flex", alignItems: "baseline", gap: 0, whiteSpace: "nowrap", fontFamily: "var(--font-plus-jakarta), sans-serif" }}
        >
          <span style={{ fontSize: 18, fontWeight: 700, color: "#2d2d2d", letterSpacing: "-0.3px" }}>Easy View</span>
          <span style={{ display: "inline-flex", alignItems: "center", marginLeft: 1, position: "relative", top: "-7px" }}>
            <svg width="11" height="11" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M47.062 8.01195C47.2809 7.40867 47.6803 6.88743 48.2059 6.51908C48.7314 6.15073 49.3577 5.95312 49.9995 5.95312C50.6412 5.95313 51.2675 6.15073 51.793 6.51908C52.3186 6.88743 52.718 7.40867 52.937 8.01195L55.9245 16.1745C58.2675 22.5734 61.9774 28.3845 66.7959 33.203C71.6144 38.0215 77.4255 41.7315 83.8245 44.0745L91.9807 47.062C92.584 47.2809 93.1052 47.6803 93.4736 48.2059C93.8419 48.7314 94.0395 49.3577 94.0395 49.9995C94.0395 50.6412 93.8419 51.2675 93.4736 51.793C93.1052 52.3186 92.584 52.718 91.9807 52.937L83.8245 55.9245C77.4255 58.2675 71.6144 61.9774 66.7959 66.7959C61.9774 71.6144 58.2675 77.4255 55.9245 83.8245L52.937 91.9807C52.718 92.584 52.3186 93.1052 51.793 93.4736C51.2675 93.8419 50.6412 94.0395 49.9995 94.0395C49.3577 94.0395 48.7314 93.8419 48.2059 93.4736C47.6803 93.1052 47.2809 92.584 47.062 91.9807L44.0745 83.8245C41.7315 77.4255 38.0215 71.6144 33.203 66.7959C28.3845 61.9774 22.5734 58.2675 16.1745 55.9245L8.01195 52.937C7.40867 52.718 6.88743 52.3186 6.51908 51.793C6.15073 51.2675 5.95313 50.6412 5.95312 49.9995C5.95312 49.3577 6.15073 48.7314 6.51908 48.2059C6.88743 47.6803 7.40867 47.2809 8.01195 47.062L16.1745 44.0745C22.5734 41.7315 28.3845 38.0215 33.203 33.203C38.0215 28.3845 41.7315 22.5734 44.0745 16.1745L47.062 8.01195Z" fill="#FD5108"/>
            </svg>
          </span>
        </span>
      </Link>

      {/* ── Center-Right: Section tabs ── */}
      <div className="flex items-center h-full" style={{ gap: 0 }}>
        {TABS.map((tab) => {
          const active = isTabActive(tab, pathname);
          return (
            <Link
              key={tab.id}
              href={tab.href}
              style={{
                display: "flex",
                alignItems: "center",
                height: "100%",
                padding: "0 28px",
                fontSize: 15,
                fontWeight: active ? 700 : 500,
                color: active ? "#FD5108" : "#6B7280",
                textDecoration: "none",
                borderBottom: active ? "2.5px solid #FD5108" : "2.5px solid transparent",
                transition: "color 0.15s, border-color 0.15s",
                letterSpacing: "-0.2px",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.color = "#1A1A2E";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.color = "#6B7280";
                }
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* ── Far Right: Login/User ── */}
      <div className="flex items-center shrink-0" style={{ gap: 12 }}>
        {isAuthenticated && user ? (
          <>
            <span style={{ fontSize: 13, color: "#6B7280", fontWeight: 500 }}>
              {user.name}
            </span>
            <button
              onClick={logout}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                fontWeight: 600,
                color: "#6B7280",
                background: "none",
                border: "1px solid #DFE3E6",
                borderRadius: 6,
                padding: "6px 14px",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "#FD5108";
                (e.currentTarget as HTMLElement).style.color = "#FD5108";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "#DFE3E6";
                (e.currentTarget as HTMLElement).style.color = "#6B7280";
              }}
            >
              <LogOut size={14} />
              로그아웃
            </button>
          </>
        ) : (
          <Link
            href="/login"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              fontWeight: 600,
              color: "#6B7280",
              background: "none",
              border: "1px solid #DFE3E6",
              borderRadius: 6,
              padding: "6px 14px",
              textDecoration: "none",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "#FD5108";
              (e.currentTarget as HTMLElement).style.color = "#FD5108";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "#DFE3E6";
              (e.currentTarget as HTMLElement).style.color = "#6B7280";
            }}
          >
            <LogIn size={14} />
            로그인
          </Link>
        )}
      </div>
    </nav>
  );
}
