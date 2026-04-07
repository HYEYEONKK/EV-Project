"use client";
import { useEffect } from "react";
import { useFilterStore } from "@/lib/store/filterStore";

const FS = 14;
const LS = "-0.3px";

/* 시나리오별 기본 금액 임계값 */
const SCENARIO_DEFAULTS: Record<string, { min: number | null; max: number | null; hasToggle: boolean }> = {
  "1": { min: 1_000_000,  max: 5_000_000_000,  hasToggle: false },
  "2": { min: 10_000_000, max: 1_000_000_000,  hasToggle: true  },
  "3": { min: null,       max: null,            hasToggle: false },
  "4": { min: 1_000_000,  max: 15_000_000_000, hasToggle: false },
  "5": { min: null,       max: null,            hasToggle: false },
  "6": { min: null,       max: null,            hasToggle: false },
  "7": { min: null,       max: null,            hasToggle: false },
};

function fmtNum(v: number) {
  return v.toLocaleString("ko-KR");
}

interface Props { n: string }

export default function ScenarioFilterBar({ n }: Props) {
  const {
    scenarioDateFrom, scenarioDateTo,
    scenarioMinAmount, scenarioMaxAmount, scenarioAllToggle,
    setScenarioDateRange, setScenarioAmounts, setScenarioAllToggle,
  } = useFilterStore();

  const def = SCENARIO_DEFAULTS[n] ?? SCENARIO_DEFAULTS["7"];

  /* 시나리오 전환 시 기본값 적용 */
  useEffect(() => {
    setScenarioAmounts(def.min, def.max);
    setScenarioAllToggle(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  return (
    <div className="flex items-center gap-3">
      {/* 날짜 범위 */}
      <input
        type="date"
        value={scenarioDateFrom}
        onChange={(e) => setScenarioDateRange(e.target.value, scenarioDateTo)}
        style={{ fontSize: FS, fontWeight: 400, letterSpacing: LS, border: "1px solid #DFE3E6", borderRadius: 6, padding: "3px 8px", color: "#374151", outline: "none" }}
      />
      <span style={{ fontSize: FS, letterSpacing: LS, color: "#A1A8B3" }}>~</span>
      <input
        type="date"
        value={scenarioDateTo}
        onChange={(e) => setScenarioDateRange(scenarioDateFrom, e.target.value)}
        style={{ fontSize: FS, fontWeight: 400, letterSpacing: LS, border: "1px solid #DFE3E6", borderRadius: 6, padding: "3px 8px", color: "#374151", outline: "none" }}
      />

      {/* 금액 임계값 (시나리오 1, 2, 4) */}
      {def.min !== null && (
        <>
          <div style={{ width: 1, height: 16, backgroundColor: "#DFE3E6" }} />
          <input
            type="number"
            value={scenarioMinAmount ?? def.min ?? ""}
            onChange={(e) => setScenarioAmounts(Number(e.target.value), scenarioMaxAmount)}
            style={{ fontSize: FS, fontWeight: 400, letterSpacing: LS, border: "1px solid #DFE3E6", borderRadius: 6, padding: "3px 8px", color: "#374151", outline: "none", width: 120, textAlign: "right" }}
          />
          <input
            type="number"
            value={scenarioMaxAmount ?? def.max ?? ""}
            onChange={(e) => setScenarioAmounts(scenarioMinAmount, Number(e.target.value))}
            style={{ fontSize: FS, fontWeight: 400, letterSpacing: LS, border: "1px solid #DFE3E6", borderRadius: 6, padding: "3px 8px", color: "#374151", outline: "none", width: 140, textAlign: "right" }}
          />
        </>
      )}

      {/* 모두 토글 (시나리오 2) */}
      {def.hasToggle && (
        <>
          <div style={{ width: 1, height: 16, backgroundColor: "#DFE3E6" }} />
          <button
            onClick={() => setScenarioAllToggle(!scenarioAllToggle)}
            style={{
              fontSize: FS,
              fontWeight: 400,
              letterSpacing: LS,
              padding: "3px 12px",
              borderRadius: 6,
              border: "1px solid #DFE3E6",
              backgroundColor: scenarioAllToggle ? "#000" : "#fff",
              color: scenarioAllToggle ? "#fff" : "#A1A8B3",
              cursor: "pointer",
              outline: "none",
              whiteSpace: "nowrap",
            }}
          >
            모두
          </button>
        </>
      )}
    </div>
  );
}
