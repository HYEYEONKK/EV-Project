"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Upload, Folder, HelpCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

const MENU_ITEMS = [
  { label: "데이터 업로드", href: "/home2/data/upload", Icon: Upload },
  { label: "자료실", href: "/home2/data/library", Icon: Folder },
  { label: "FAQ", href: "/home2/data/faq", Icon: HelpCircle },
];

export default function Sidebar2() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      style={{
        position: "sticky",
        top: 56,
        height: "calc(100vh - 56px)",
        width: collapsed ? 64 : 250,
        minWidth: collapsed ? 64 : 250,
        background: "#fff",
        borderRight: "1px solid #e0e0e0",
        display: "flex",
        flexDirection: "column",
        padding: "16px 10px",
        transition: "width 0.3s ease, min-width 0.3s ease",
        zIndex: 40,
        overflow: "hidden",
      }}
    >
      {/* 메뉴 항목 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {MENU_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                height: 40,
                padding: collapsed ? "0 20px" : "0 12px",
                borderRadius: 6,
                textDecoration: "none",
                fontSize: 15,
                fontWeight: active ? 600 : 400,
                color: active ? "#FD5108" : "#1A1A2E",
                background: active ? "#F5F5F5" : "transparent",
                transition: "background 0.15s, color 0.15s",
                whiteSpace: "nowrap",
                overflow: "hidden",
              }}
              onMouseEnter={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.background = "#F5F5F5";
              }}
              onMouseLeave={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.background = "transparent";
              }}
            >
              <item.Icon size={20} style={{ flexShrink: 0 }} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </div>

      {/* 접기/펼치기 버튼 */}
      <div style={{ marginTop: "auto", marginBottom: 8, display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#6B7280",
            padding: 4,
            borderRadius: 4,
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#FD5108"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#6B7280"; }}
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>
    </aside>
  );
}
