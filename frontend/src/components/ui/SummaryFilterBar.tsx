"use client";
import { useState, useRef, useEffect } from "react";
import { useFilterStore, AnalysisMode, BSBase } from "@/lib/store/filterStore";

const FS = 14; // 공통 폰트 크기
const LS = "-0.3px"; // letter-spacing

/* ── Available months ── */
const MONTHS: string[] = [];
for (let y = 2024; y <= 2026; y++) {
  for (let mo = 1; mo <= 12; mo++) {
    if (y === 2026 && mo > 3) break;
    MONTHS.push(`${y}-${String(mo).padStart(2, "0")}`);
  }
}
const YEARS = Array.from(new Set(MONTHS.map((m) => m.split("-")[0])));
const MONTHS_BY_YEAR: Record<string, string[]> = {};
MONTHS.forEach((m) => {
  const y = m.split("-")[0];
  if (!MONTHS_BY_YEAR[y]) MONTHS_BY_YEAR[y] = [];
  MONTHS_BY_YEAR[y].push(m);
});

/* ── YM Dropdown ── */
function YMDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [selYear, setSelYear] = useState(value.split("-")[0]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const [vy, vm] = value.split("-");
  const label = `${vy}년 ${String(Number(vm)).padStart(2, "0")}월`;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => { setSelYear(value.split("-")[0]); setOpen((v) => !v); }}
        className="flex items-center gap-2 rounded-md px-3 py-1 transition-colors"
        style={{ fontSize: FS, fontWeight: 400, letterSpacing: LS, border: "1px solid #DFE3E6", backgroundColor: open ? "#F5F7F8" : "#fff", color: "#374151", outline: "none", whiteSpace: "nowrap" }}
      >
        {label}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#A1A8B3" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s", flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 300, backgroundColor: "#fff", border: "1px solid #DFE3E6", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.10)", display: "flex" }}>
          <div style={{ borderRight: "1px solid #EEEFF1", padding: "8px 0", minWidth: 90 }}>
            {YEARS.map((y) => {
              const active = y === selYear;
              return (
                <button key={y} onClick={() => setSelYear(y)}
                  className="w-full text-left px-4 py-2 transition-colors"
                  style={{ fontSize: FS, backgroundColor: active ? "#FFF5ED" : "transparent", color: active ? "#FD5108" : "#374151", fontWeight: active ? 700 : 400, outline: "none" }}
                  onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = "#F5F7F8"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = active ? "#FFF5ED" : "transparent"; }}
                >{y}년</button>
              );
            })}
          </div>
          <div style={{ padding: "8px 0", minWidth: 80 }}>
            {(MONTHS_BY_YEAR[selYear] ?? []).map((m) => {
              const mo = m.split("-")[1];
              const active = m === value;
              return (
                <button key={m} onClick={() => { onChange(m); setOpen(false); }}
                  className="w-full text-left px-4 py-2 transition-colors"
                  style={{ fontSize: FS, backgroundColor: active ? "#FFF5ED" : "transparent", color: active ? "#FD5108" : "#374151", fontWeight: active ? 700 : 400, outline: "none" }}
                  onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = "#F5F7F8"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = active ? "#FFF5ED" : "transparent"; }}
                >{String(Number(mo)).padStart(2, "0")}월</button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Toggle Group ── */
function ToggleGroup<T extends string>({ options, value, onChange }: { options: T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex" style={{ border: "1px solid #DFE3E6", borderRadius: 6, overflow: "hidden" }}>
      {options.map((opt) => {
        const active = opt === value;
        return (
          <button key={opt} onClick={() => onChange(opt)}
            className="px-3 py-1 font-medium transition-colors"
            style={{ fontSize: FS, letterSpacing: LS, backgroundColor: active ? "#000" : "#fff", color: active ? "#fff" : "#A1A8B3", borderRight: "1px solid #DFE3E6", outline: "none" }}
          >{opt}</button>
        );
      })}
    </div>
  );
}

/* ── Main export ── */
export default function SummaryFilterBar() {
  const { summaryBaseYM, summaryMode, summaryBsBase, setSummaryBaseYM, setSummaryMode, setSummaryBsBase } = useFilterStore();

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2 shrink-0">
        <span style={{ fontSize: FS, fontWeight: 400, letterSpacing: LS, color: "#A1A8B3", whiteSpace: "nowrap" }}>기준 연월</span>
        <YMDropdown value={summaryBaseYM} onChange={setSummaryBaseYM} />
      </div>
      <div style={{ width: 1, height: 16, backgroundColor: "#DFE3E6", flexShrink: 0 }} />
      <div className="flex items-center gap-2 shrink-0">
        <span style={{ fontSize: FS, fontWeight: 400, letterSpacing: LS, color: "#A1A8B3", whiteSpace: "nowrap" }}>분석대상</span>
        <ToggleGroup<AnalysisMode> options={["전년누적", "전년동월", "전월비교"]} value={summaryMode} onChange={setSummaryMode} />
      </div>
      <div style={{ width: 1, height: 16, backgroundColor: "#DFE3E6", flexShrink: 0 }} />
      <div className="flex items-center gap-2 shrink-0">
        <span style={{ fontSize: FS, fontWeight: 400, letterSpacing: LS, color: "#A1A8B3", whiteSpace: "nowrap" }}>비교대상</span>
        <ToggleGroup<BSBase> options={["연초", "월초"]} value={summaryBsBase} onChange={setSummaryBsBase} />
      </div>
    </div>
  );
}
