"use client";
import { useState } from "react";
import Link from "next/link";

/* ─────────────────────────────────────────────
   Input Data Page (PwC Design Guide)
───────────────────────────────────────────── */
export default function InputPage() {
  const [baseMonth, setBaseMonth] = useState("");
  const [closingMonth, setClosingMonth] = useState("");
  const [language, setLanguage] = useState("");
  const [company, setCompany] = useState("");
  const [extraOption, setExtraOption] = useState("");
  const [journalFile, setJournalFile] = useState<File | null>(null);
  const [trialFile, setTrialFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  /* Generate month options */
  const monthOptions = (() => {
    const opts: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
      opts.push({ value, label });
    }
    return opts;
  })();

  const handleProcess = async () => {
    if (!baseMonth) { alert("기준월을 선택해주세요."); return; }
    if (!closingMonth) { alert("결산월을 선택해주세요."); return; }
    if (!language) { alert("언어를 선택해주세요."); return; }
    if (!company) { alert("회사명을 선택해주세요."); return; }
    if (!journalFile) { alert("분개장 파일을 업로드해주세요."); return; }
    if (!trialFile) { alert("시산표 파일을 업로드해주세요."); return; }

    setLoading(true);

    const formData = new FormData();
    formData.append("journalFile", journalFile);
    formData.append("trialFile", trialFile);
    formData.append("baseMonth", baseMonth);
    formData.append("company", company);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
      const res = await fetch(`${API_URL}/api/v1/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `서버 오류 (${res.status})`);
      }

      const data = await res.json();
      console.log("Upload result:", data);

      // Open dashboard in new tab (use link click to avoid popup blocker)
      setLoading(false);
      const a = document.createElement("a");
      a.href = "/home";
      a.target = "_blank";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      setLoading(false);
      alert(`파일 업로드에 실패했습니다.\n백엔드 서버가 실행 중인지 확인해주세요.\n\n${err.message}`);
    }
  };

  const sidebarItems = [
    { href: "/", icon: <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />, tooltip: "Home" },
    { href: "/input", icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="16" y2="17" /></>, tooltip: "Input", active: true },
    { href: "/output", icon: <><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" /><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" /></>, tooltip: "Output" },
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
          width: 75, flexShrink: 0, backgroundColor: "#fff", borderRight: "1px solid #DFE3E6",
          position: "sticky", top: 56, height: "calc(100vh - 56px)",
        }}>
          <nav style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 16, gap: 4 }}>
            {sidebarItems.map((item, i) => (
              <Link key={i} href={item.href} style={{
                width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: 10, textDecoration: "none",
                color: item.active ? "#FD5108" : "#A1A8B3",
                backgroundColor: item.active ? "rgba(253, 81, 8, 0.08)" : "transparent",
                borderLeft: item.active ? "2px solid #FD5108" : "none",
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={22} height={22}>
                  {item.icon}
                </svg>
              </Link>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main style={{ flex: 1, padding: "40px 48px", display: "flex", flexDirection: "column", gap: 24, backgroundColor: "#F5F7F8", overflowY: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1A1A2E" }}>Input Data</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={handleProcess} style={{
                padding: "12px 48px", fontSize: 15, fontWeight: 600,
                color: "#fff", backgroundColor: loading ? "#B5BCC4" : "#FD5108",
                border: "none", borderRadius: 10, cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "inherit",
              }} disabled={loading}>
                {loading ? "처리 중..." : "가공하기"}
              </button>
            </div>
          </div>
          <p style={{ fontSize: 15, color: "#374151", lineHeight: 1.6 }}>
            아래 정보를 입력한 후 각 파일을 업로드하시면 경영 정보 보고서를 생성합니다. <span style={{ fontSize: 12, color: "#FD5108", marginLeft: 8 }}>* 필수 선택값</span>
          </p>

          {/* Options */}
          <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 2fr", gap: 14 }}>
              <select value={baseMonth} onChange={e => setBaseMonth(e.target.value)} style={requiredSelectStyle}>
                <option value="" disabled>기준월 *</option>
                {monthOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <select value={closingMonth} onChange={e => setClosingMonth(e.target.value)} style={requiredSelectStyle}>
                <option value="" disabled>결산월 *</option>
                {monthOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <select value={language} onChange={e => setLanguage(e.target.value)} style={requiredSelectStyle}>
                <option value="" disabled>언어 선택 *</option>
                <option value="ko">한국어</option>
                <option value="en">English</option>
              </select>
              <select value={company} onChange={e => setCompany(e.target.value)} style={requiredSelectStyle}>
                <option value="" disabled>회사명 선택 *</option>
                <option value="ABC">ABC</option>
                <option value="DEF">DEF</option>
                <option value="GHI">GHI</option>
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 2fr", gap: 14 }}>
              <select value={extraOption} onChange={e => setExtraOption(e.target.value)} style={selectStyle}>
                <option value="" disabled>추가 옵션 선택</option>
                <option value="manufacturing">제조원가 보여주기</option>
                <option value="cashflow">현금흐름표 보여주기</option>
                <option value="division">사업부 추가</option>
                <option value="bank">은행내역 추가</option>
              </select>
            </div>
          </section>

          {/* File Upload */}
          <section style={{ display: "flex", gap: 20, flex: 1, minHeight: 280 }}>
            <UploadBox label="분개장 파일을 업로드하시오" file={journalFile} onFile={setJournalFile} />
            <UploadBox label="시산표 파일을 업로드하시오" file={trialFile} onFile={setTrialFile} />
          </section>
        </main>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: "52px 72px", textAlign: "center", boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}>
            <div style={{
              width: 52, height: 52, border: "4px solid #EEEFF1", borderTopColor: "#FD5108",
              borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 28px",
            }} />
            <p style={{ fontSize: 16, fontWeight: 600, color: "#1A1A2E", marginBottom: 8 }}>파일을 처리하고 있습니다...</p>
            <p style={{ fontSize: 13, color: "#A1A8B3" }}>잠시만 기다려 주세요</p>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ── Shared styles ── */
const selectStyle: React.CSSProperties = {
  flex: 1, padding: "10px 32px 10px 14px", fontSize: 14,
  color: "#1A1A2E", backgroundColor: "#fff",
  border: "1px solid #DFE3E6", borderRadius: 6,
  appearance: "none" as const, cursor: "pointer", outline: "none",
  fontFamily: "inherit",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23A1A8B3' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 12px center",
};

const requiredSelectStyle: React.CSSProperties = {
  flex: 1, padding: "10px 32px 10px 14px", fontSize: 14,
  color: "#1A1A2E", backgroundColor: "#FFF5ED",
  border: "1px solid #FFCDA8", borderRadius: 6,
  appearance: "none" as const, cursor: "pointer", outline: "none",
  fontFamily: "inherit",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23A1A8B3' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 12px center",
};

/* ── Upload Box Component ── */
function UploadBox({ label, file, onFile }: { label: string; file: File | null; onFile: (f: File) => void }) {
  const [hover, setHover] = useState(false);
  const hasFile = !!file;

  const borderColor = hasFile ? "#16C784" : hover ? "#FD5108" : "#DFE3E6";
  const bgColor = hasFile ? "#F0FDF4" : hover ? "#FFF5ED" : "#fff";

  return (
    <div
      style={{
        flex: 1, border: `2px solid ${borderColor}`,
        borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", backgroundColor: bgColor,
        transition: "all 0.3s ease",
        position: "relative",
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".xlsx,.xls,.csv,.txt";
        input.onchange = (e) => {
          const f = (e.target as HTMLInputElement).files?.[0];
          if (f) onFile(f);
        };
        input.click();
      }}
      onDragOver={(e) => { e.preventDefault(); setHover(true); }}
      onDragLeave={() => setHover(false)}
      onDrop={(e) => {
        e.preventDefault();
        setHover(false);
        const f = e.dataTransfer.files[0];
        if (f) onFile(f);
      }}
    >
      {/* 업로드 완료 배지 */}
      {hasFile && (
        <div style={{
          position: "absolute", top: 16, right: 16,
          width: 28, height: 28, borderRadius: "50%",
          backgroundColor: "#16C784", display: "flex",
          alignItems: "center", justifyContent: "center",
          boxShadow: "0 2px 8px rgba(22,199,132,0.3)",
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" width={16} height={16}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: 24 }}>
        {hasFile ? (
          /* 파일 업로드 완료 상태 */
          <>
            <div style={{
              width: 52, height: 52, borderRadius: 12,
              backgroundColor: "#E8FFF3", display: "flex",
              alignItems: "center", justifyContent: "center",
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#16C784" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" width={28} height={28}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#1A1A2E" }}>
              {file.name}
            </span>
            <span style={{ fontSize: 12, color: "#16C784", fontWeight: 500 }}>
              업로드 완료 · {(file.size / 1024).toFixed(0)} KB
            </span>
            <span style={{ fontSize: 11, color: "#A1A8B3", marginTop: -4 }}>
              클릭하여 파일 변경
            </span>
          </>
        ) : (
          /* 기본 상태 */
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke={hover ? "#FD5108" : "#B5BCC4"} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" width={36} height={36}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span style={{ fontSize: 14, color: hover ? "#FD5108" : "#A1A8B3" }}>
              {label}
            </span>
            <span style={{ fontSize: 11, color: "#B5BCC4" }}>
              .xlsx, .xls, .csv, .txt 파일 지원
            </span>
          </>
        )}
      </div>
    </div>
  );
}
