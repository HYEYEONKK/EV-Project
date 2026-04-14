"use client";
import { useState, useRef, useEffect } from "react";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MONTHS_KR = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
const DEFAULT_YEARS = Array.from({ length: 11 }, (_, i) => 2020 + i);

function getCellDate(day: number, month: "prev"|"cur"|"next", viewYear: number, viewMonth: number): string {
  let y = viewYear, m = viewMonth;
  if (month === "prev") { m--; if (m < 0) { m = 11; y--; } }
  if (month === "next") { m++; if (m > 11) { m = 0; y++; } }
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (v: string) => void;
  minDate?: string; // YYYY-MM-DD
  maxDate?: string; // YYYY-MM-DD
}

export default function DatePicker({ value, onChange, minDate, maxDate }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"calendar" | "ym">("calendar");
  const [viewYear, setViewYear] = useState(() => parseInt(value.slice(0, 4)));
  const [viewMonth, setViewMonth] = useState(() => parseInt(value.slice(5, 7)) - 1);
  const [selYear, setSelYear] = useState(() => parseInt(value.slice(0, 4)));
  const ref = useRef<HTMLDivElement>(null);

  // Compute constrained year list
  const minY = minDate ? parseInt(minDate.slice(0, 4)) : null;
  const maxY = maxDate ? parseInt(maxDate.slice(0, 4)) : null;
  const minM = minDate ? parseInt(minDate.slice(5, 7)) - 1 : null; // 0-based
  const maxM = maxDate ? parseInt(maxDate.slice(5, 7)) - 1 : null; // 0-based

  const YEARS = (minY !== null && maxY !== null)
    ? Array.from({ length: maxY - minY + 1 }, (_, i) => minY + i)
    : DEFAULT_YEARS;

  // Is a month selectable in YM picker?
  const isMonthEnabled = (yr: number, mIdx: number): boolean => {
    if (minY !== null && minM !== null && (yr < minY || (yr === minY && mIdx < minM))) return false;
    if (maxY !== null && maxM !== null && (yr > maxY || (yr === maxY && mIdx > maxM))) return false;
    return true;
  };

  // Is a calendar date selectable?
  const isDateEnabled = (dateStr: string): boolean => {
    if (minDate && dateStr < minDate) return false;
    if (maxDate && dateStr > maxDate) return false;
    return true;
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setViewMode("calendar");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    setViewYear(parseInt(value.slice(0, 4)));
    setViewMonth(parseInt(value.slice(5, 7)) - 1);
    setSelYear(parseInt(value.slice(0, 4)));
  }, [value]);

  const [vy, vm, vd] = value.split("-");
  const label = `${vy}. ${vm}. ${vd}`;

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // Calendar cells
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();
  const cells: { day: number; month: "prev"|"cur"|"next" }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: daysInPrevMonth - i, month: "prev" });
  for (let i = 1; i <= daysInMonth; i++) cells.push({ day: i, month: "cur" });
  let nextDay = 1;
  while (cells.length < 42) cells.push({ day: nextDay++, month: "next" });

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const handleDay = (cell: { day: number; month: "prev"|"cur"|"next" }) => {
    const dateStr = getCellDate(cell.day, cell.month, viewYear, viewMonth);
    if (!isDateEnabled(dateStr)) return;
    onChange(dateStr);
    setOpen(false);
    setViewMode("calendar");
  };

  const handleMonthSelect = (mIdx: number) => {
    if (!isMonthEnabled(selYear, mIdx)) return;
    setViewYear(selYear);
    setViewMonth(mIdx);
    setViewMode("calendar");
  };

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      {/* Trigger */}
      <button
        onClick={() => { setOpen(v => !v); setViewMode("calendar"); }}
        className="flex items-center gap-1.5 rounded-md px-3 py-2 transition-colors"
        style={{
          fontSize: 13, letterSpacing: "-0.3px", fontWeight: 400,
          lineHeight: 1,
          border: "1px solid #DFE3E6",
          backgroundColor: open ? "#F5F7F8" : "#fff",
          color: "#374151", outline: "none", whiteSpace: "nowrap", cursor: "pointer",
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#A1A8B3" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
          style={{ display: "block", flexShrink: 0, position: "relative", top: 0 }}>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span style={{ display: "block", lineHeight: 1 }}>{label}</span>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 400,
          backgroundColor: "#fff", border: "1px solid #DFE3E6",
          borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          padding: "14px", width: viewMode === "ym" ? 240 : 252,
        }}>

          {/* ── YM Picker 뷰 ── */}
          {viewMode === "ym" && (
            <div style={{ display: "flex" }}>
              {/* 연도 목록 */}
              <div style={{ borderRight: "1px solid #EEEFF1", paddingRight: 8, marginRight: 8, minWidth: 80 }}>
                {YEARS.map(y => {
                  const active = y === selYear;
                  return (
                    <button key={y} onClick={() => setSelYear(y)}
                      className="w-full text-left"
                      style={{
                        fontSize: 13, padding: "6px 10px", borderRadius: 6, border: "none", cursor: "pointer",
                        backgroundColor: active ? "#FFF5ED" : "transparent",
                        color: active ? "#FD5108" : "#374151",
                        fontWeight: active ? 700 : 400, outline: "none", whiteSpace: "nowrap",
                      }}
                      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = "#F5F7F8"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = active ? "#FFF5ED" : "transparent"; }}
                    >{y}년</button>
                  );
                })}
              </div>
              {/* 월 목록 */}
              <div style={{ minWidth: 72 }}>
                {MONTHS_KR.map((mo, idx) => {
                  const isSelMonth = idx === viewMonth && selYear === viewYear;
                  const enabled = isMonthEnabled(selYear, idx);
                  return (
                    <button key={mo} onClick={() => handleMonthSelect(idx)}
                      className="w-full text-left"
                      disabled={!enabled}
                      style={{
                        fontSize: 13, padding: "6px 10px", borderRadius: 6, border: "none",
                        cursor: enabled ? "pointer" : "not-allowed",
                        backgroundColor: isSelMonth ? "#FFF5ED" : "transparent",
                        color: isSelMonth ? "#FD5108" : enabled ? "#374151" : "#D1D5DB",
                        fontWeight: isSelMonth ? 700 : 400, outline: "none",
                      }}
                      onMouseEnter={e => { if (!isSelMonth && enabled) (e.currentTarget as HTMLElement).style.backgroundColor = "#F5F7F8"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = isSelMonth ? "#FFF5ED" : "transparent"; }}
                    >{mo}</button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Calendar 뷰 ── */}
          {viewMode === "calendar" && (
            <>
              {/* 헤더 */}
              <div className="flex items-center justify-between mb-3">
                <button onClick={prevMonth} style={{ width: 28, height: 28, border: "1px solid #DFE3E6", borderRadius: 6, background: "#fff", cursor: "pointer", color: "#A1A8B3", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
                {/* 연/월 클릭 → YM 피커로 전환 */}
                <button
                  onClick={() => { setSelYear(viewYear); setViewMode("ym"); }}
                  style={{ fontSize: 13, fontWeight: 600, color: "#000", letterSpacing: "-0.3px", background: "none", border: "none", cursor: "pointer", padding: "2px 8px", borderRadius: 6 }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#F5F7F8")}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  {viewYear}년 {MONTHS_KR[viewMonth]}
                </button>
                <button onClick={nextMonth} style={{ width: 28, height: 28, border: "1px solid #DFE3E6", borderRadius: 6, background: "#fff", cursor: "pointer", color: "#A1A8B3", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
              </div>

              {/* 요일 헤더 */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 4 }}>
                {WEEKDAYS.map((w, i) => (
                  <div key={w} style={{ textAlign: "center", fontSize: 11, fontWeight: 500, color: i === 0 ? "#FD5108" : "#A1A8B3", padding: "3px 0" }}>{w}</div>
                ))}
              </div>

              {/* 날짜 그리드 */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
                {cells.map((cell, i) => {
                  const dateStr = getCellDate(cell.day, cell.month, viewYear, viewMonth);
                  const isSelected = dateStr === value;
                  const isToday = dateStr === todayStr;
                  const isCur = cell.month === "cur";
                  const isSun = i % 7 === 0;
                  const enabled = isDateEnabled(dateStr);
                  return (
                    <button key={i} onClick={() => handleDay(cell)}
                      disabled={!enabled}
                      style={{
                        textAlign: "center", fontSize: 12, padding: "6px 0",
                        borderRadius: 6, border: "none",
                        cursor: enabled ? "pointer" : "not-allowed",
                        backgroundColor: isSelected ? "#FD5108" : "transparent",
                        color: isSelected ? "#fff"
                          : !enabled ? "#E5E7EB"
                          : !isCur ? "#D1D5DB"
                          : isToday ? "#FD5108"
                          : isSun ? "#F87171"
                          : "#374151",
                        fontWeight: isSelected || isToday ? 600 : 400, outline: "none",
                      }}
                      onMouseEnter={e => { if (!isSelected && enabled) (e.currentTarget as HTMLElement).style.backgroundColor = "#F5F7F8"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = isSelected ? "#FD5108" : "transparent"; }}
                    >{cell.day}</button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
