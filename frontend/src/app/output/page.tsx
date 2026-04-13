"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";

/* ─────────────────────────────────────────────
   Output Page — report card list
   Clicking any card → /home (main dashboard)
───────────────────────────────────────────── */
export default function OutputPage() {
  const router = useRouter();

  const goHome = () => router.push("/home");

  const sidebarItems = [
    { href: "/", icon: <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />, tooltip: "Home" },
    { href: "/input", icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="16" y2="17" /></>, tooltip: "Input" },
    { href: "/output", icon: <><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" /><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" /></>, tooltip: "Output", active: true },
  ];

  const reports = [
    { company: "ABC", period: "2025년 9월", date: "2025-10-05" },
    { company: "ABC", period: "2025년 6월", date: "2025-07-10" },
    { company: "ABC", period: "2024년 12월", date: "2025-01-15" },
  ];

  return (
    <div style={{ fontFamily: "'Pretendard Variable', 'Pretendard', sans-serif", color: "#1A1A2E", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px", height: 56, borderBottom: "1px solid #DFE3E6",
        backgroundColor: "#fff", position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src="/pwc-logo.svg" alt="PwC" style={{ height: 28 }} />
          <span style={{ fontSize: 14, fontWeight: 400, color: "#1A1A2E", paddingLeft: 12, borderLeft: "1px solid #DFE3E6" }}>
            Worldwide Easy View
          </span>
        </div>
      </header>

      <div style={{ display: "flex", flex: 1 }}>
        {/* Sidebar */}
        <aside style={{
          width: 75, flexShrink: 0, backgroundColor: "#1A1A2E",
          position: "sticky", top: 56, height: "calc(100vh - 56px)",
        }}>
          <nav style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 16, gap: 4 }}>
            {sidebarItems.map((item, i) => (
              <Link key={i} href={item.href} style={{
                width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: 10, textDecoration: "none",
                color: item.active ? "#FD5108" : "#B5BCC4",
                backgroundColor: item.active ? "rgba(253, 81, 8, 0.08)" : "transparent",
                borderLeft: item.active ? "2px solid #FD5108" : "2px solid transparent",
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={22} height={22}>
                  {item.icon}
                </svg>
              </Link>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main style={{ flex: 1, padding: "40px 48px", display: "flex", flexDirection: "column", gap: 32, backgroundColor: "#F5F7F8", overflowY: "auto" }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1A1A2E" }}>Output</h1>

          {/* Recent Reports */}
          <ReportSection title="최근에 조회한 보고서" reports={reports} onCardClick={goHome} />
          <ReportSection title="내가 생성한 보고서" reports={reports} onCardClick={goHome} />
          <ReportSection title="접근 권한이 있는 보고서" reports={reports.slice(0, 2)} onCardClick={goHome} />
        </main>
      </div>
    </div>
  );
}

/* ── Report Section ── */
function ReportSection({ title, reports, onCardClick }: {
  title: string;
  reports: { company: string; period: string; date: string }[];
  onCardClick: () => void;
}) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <h2 style={{ fontSize: 17, fontWeight: 600, color: "#1A1A2E" }}>{title}</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
        {reports.map((r, i) => (
          <ReportCard key={i} {...r} onClick={onCardClick} />
        ))}
      </div>
    </section>
  );
}

/* ── Report Card ── */
function ReportCard({ company, period, date, onClick }: {
  company: string; period: string; date: string; onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        border: "1.5px solid #DFE3E6", borderRadius: 10,
        padding: "20px 16px 16px", display: "flex", flexDirection: "column",
        gap: 12, cursor: "pointer", backgroundColor: "#fff",
        transition: "border-color 0.2s, box-shadow 0.2s",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "#FD5108";
        (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 12px rgba(253,81,8,0.12)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "#DFE3E6";
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      <div style={{
        width: 40, height: 40, background: "#FFF5ED", borderRadius: 8,
        display: "flex", alignItems: "center", justifyContent: "center", color: "#FD5108",
      }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" width={20} height={20}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="8" y1="13" x2="16" y2="13" />
          <line x1="8" y1="17" x2="16" y2="17" />
        </svg>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#1A1A2E" }}>{company}</span>
        <span style={{ fontSize: 13, color: "#374151" }}>{period}</span>
        <span style={{ fontSize: 12, color: "#A1A8B3" }}>{date}</span>
      </div>
    </div>
  );
}
