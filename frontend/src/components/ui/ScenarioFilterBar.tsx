"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useFilterStore } from "@/lib/store/filterStore";
import DatePicker from "@/components/ui/DatePicker";

const LS = "-0.3px";

const SCENARIO_DEFAULTS: Record<string, {
  min: number | null; max: number | null;
  sliderMax: number; step: number;
}> = {
  "1": { min: 1_000_000,  max: 5_000_000_000,  sliderMax: 10_000_000_000, step: 5_000_000  },
  "2": { min: 10_000_000, max: 1_000_000_000,  sliderMax:  5_000_000_000, step: 5_000_000  },
  "3": { min: null,       max: null,            sliderMax: 10_000_000_000, step: 5_000_000  },
  "4": { min: 1_000_000,  max: 15_000_000_000, sliderMax: 20_000_000_000, step: 10_000_000 },
  "5": { min: null,       max: null,            sliderMax: 10_000_000_000, step: 5_000_000  },
  "6": { min: null,       max: null,            sliderMax: 10_000_000_000, step: 5_000_000  },
  "7": { min: null,       max: null,            sliderMax: 10_000_000_000, step: 5_000_000  },
};

function fmtComma(v: number | null | undefined): string {
  if (v == null) return "";
  return v.toLocaleString("ko-KR");
}

interface Props { n: string }

export default function ScenarioFilterBar({ n }: Props) {
  const {
    scenarioDateFrom, scenarioDateTo,
    scenarioMinAmount, scenarioMaxAmount,
    setScenarioDateRange, setScenarioAmounts,
  } = useFilterStore();

  const def = SCENARIO_DEFAULTS[n] ?? SCENARIO_DEFAULTS["7"];
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [dropPos, setDropPos] = useState<{ top: number; right: number } | null>(null);

  const minVal = scenarioMinAmount ?? def.min ?? 0;
  const maxVal = scenarioMaxAmount ?? def.max ?? def.sliderMax;

  const [minText, setMinText] = useState(fmtComma(minVal));
  const [maxText, setMaxText] = useState(fmtComma(maxVal));

  useEffect(() => {
    setScenarioAmounts(def.min, def.max);
    setMinText(fmtComma(def.min));
    setMaxText(fmtComma(def.max));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  useEffect(() => { setMinText(fmtComma(minVal)); }, [minVal]);
  useEffect(() => { setMaxText(fmtComma(maxVal)); }, [maxVal]);

  // 외부 클릭 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleText = (
    raw: string,
    setter: (s: string) => void,
    onNum: (v: number) => void
  ) => {
    const digits = raw.replace(/,/g, "").replace(/[^0-9]/g, "");
    setter(digits === "" ? "" : Number(digits).toLocaleString("ko-KR"));
    if (digits !== "") onNum(Number(digits));
  };

  const minPct = (minVal / def.sliderMax) * 100;
  const maxPct = (maxVal / def.sliderMax) * 100;

  const thumbBase: React.CSSProperties = {
    WebkitAppearance: "none" as any,
    appearance: "none" as any,
    position: "absolute",
    width: "100%",
    height: 4,
    background: "transparent",
    pointerEvents: "none",
    outline: "none",
    border: "none",
    margin: 0,
    padding: 0,
  };

  return (
    <div className="flex items-center gap-3">
      {/* 날짜 범위 */}
      <DatePicker
        value={scenarioDateFrom}
        onChange={(v) => setScenarioDateRange(v, scenarioDateTo)}
        minDate="2024-01-01" maxDate="2025-09-30"
      />
      <span style={{ fontSize: 14, letterSpacing: LS, color: "#A1A8B3" }}>~</span>
      <DatePicker
        value={scenarioDateTo}
        onChange={(v) => setScenarioDateRange(scenarioDateFrom, v)}
        minDate="2024-01-01" maxDate="2025-09-30"
      />

      {/* 금액 범위 드롭다운 (시나리오 1, 2, 4) */}
      {def.min !== null && (
        <>
          <div style={{ width: 1, height: 16, backgroundColor: "#DFE3E6" }} />
          <div ref={ref} style={{ position: "relative" }}>

            {/* 트리거 버튼 — DatePicker와 동일 스타일 */}
            <button
              ref={btnRef}
              onClick={() => {
                if (btnRef.current) {
                  const r = btnRef.current.getBoundingClientRect();
                  const dropW = 280;
                  const dropH = 200;
                  // 우측 정렬: 버튼 우측 엣지 기준, 뷰포트 밖으로 나가지 않게 클램핑
                  const rawRight = window.innerWidth - r.right;
                  const right = Math.max(8, Math.min(rawRight, window.innerWidth - dropW - 8));
                  // 아래/위 위치: 뷰포트 아래로 넘칠 경우 버튼 위에 표시
                  const top = r.bottom + 6 + dropH > window.innerHeight
                    ? r.top - dropH - 6
                    : r.bottom + 6;
                  setDropPos({ top, right });
                }
                setOpen(v => !v);
              }}
              className="flex items-center gap-1.5 rounded-md px-3 py-2 transition-colors"
              style={{
                fontSize: 13, letterSpacing: LS, fontWeight: 400, lineHeight: 1,
                border: "1px solid #DFE3E6",
                backgroundColor: open ? "#F5F7F8" : "#fff",
                color: "#374151", outline: "none", whiteSpace: "nowrap", cursor: "pointer",
              }}
            >
              {/* 원화 아이콘 */}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#A1A8B3"
                strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                style={{ flexShrink: 0 }}>
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              <span>{fmtComma(minVal)} ~ {fmtComma(maxVal)}</span>
            </button>

            {/* 드롭다운 패널 — position:fixed로 viewport 기준 정확히 배치 */}
            {open && dropPos && (
              <div style={{
                position: "fixed", top: dropPos.top, right: dropPos.right, zIndex: 9000,
                backgroundColor: "#fff", border: "1px solid #DFE3E6",
                borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                padding: "16px 18px", width: 280,
              }}>
                <style>{`
                  .sfb-range { -webkit-appearance: none; appearance: none;
                    position: absolute; width: 100%; height: 4px;
                    background: transparent; pointer-events: none;
                    outline: none; border: none; margin: 0; padding: 0; }
                  .sfb-range::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 16px; height: 16px; border-radius: 50%;
                    background: #FD5108; border: 2px solid #fff;
                    box-shadow: 0 1px 4px rgba(0,0,0,0.2);
                    cursor: pointer; pointer-events: all; }
                  .sfb-range::-moz-range-thumb {
                    width: 16px; height: 16px; border-radius: 50%;
                    background: #FD5108; border: 2px solid #fff;
                    box-shadow: 0 1px 4px rgba(0,0,0,0.2);
                    cursor: pointer; pointer-events: all; }
                  .sfb-range::-webkit-slider-runnable-track { background: transparent; }
                  .sfb-range::-moz-range-track { background: transparent; }
                `}</style>

                {/* 라벨 + 현재 범위 */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, fontSize: 12, letterSpacing: LS }}>
                  <span style={{ color: "#A1A8B3" }}>금액 범위</span>
                  <span style={{ color: "#FD5108", fontWeight: 600 }}>
                    {fmtComma(minVal)}원 ~ {fmtComma(maxVal)}원
                  </span>
                </div>

                {/* 슬라이더 */}
                <div style={{ position: "relative", height: 20, display: "flex", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ position: "absolute", left: 0, right: 0, height: 4, backgroundColor: "#EEEFF1", borderRadius: 2 }} />
                  <div style={{
                    position: "absolute", height: 4, borderRadius: 2,
                    left: `${minPct}%`, width: `${maxPct - minPct}%`,
                    backgroundColor: "#FD5108",
                  }} />
                  <input type="range" min={0} max={def.sliderMax} step={def.step} value={minVal}
                    className="sfb-range"
                    style={{ ...thumbBase, zIndex: minVal > def.sliderMax * 0.9 ? 5 : 3 }}
                    onChange={(e) => {
                      const v = Math.min(Number(e.target.value), maxVal - def.step);
                      setScenarioAmounts(v, maxVal);
                    }}
                  />
                  <input type="range" min={0} max={def.sliderMax} step={def.step} value={maxVal}
                    className="sfb-range"
                    style={{ ...thumbBase, zIndex: 4 }}
                    onChange={(e) => {
                      const v = Math.max(Number(e.target.value), minVal + def.step);
                      setScenarioAmounts(minVal, v);
                    }}
                  />
                </div>

                {/* 텍스트 입력 */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input type="text" value={minText}
                    onChange={(e) => handleText(e.target.value, setMinText, (v) => setScenarioAmounts(v, maxVal))}
                    style={{
                      flex: 1, fontSize: 12, letterSpacing: LS, textAlign: "right",
                      border: "1px solid #DFE3E6", borderRadius: 6,
                      padding: "4px 8px", outline: "none", color: "#374151",
                    }}
                  />
                  <span style={{ fontSize: 12, color: "#A1A8B3", flexShrink: 0 }}>~</span>
                  <input type="text" value={maxText}
                    onChange={(e) => handleText(e.target.value, setMaxText, (v) => setScenarioAmounts(minVal, v))}
                    style={{
                      flex: 1, fontSize: 12, letterSpacing: LS, textAlign: "right",
                      border: "1px solid #DFE3E6", borderRadius: 6,
                      padding: "4px 8px", outline: "none", color: "#374151",
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
