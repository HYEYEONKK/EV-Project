"use client";
import { useQuery } from "@tanstack/react-query";
import { useFilterStore } from "@/lib/store/filterStore";
import { api, ScenarioMonthly } from "@/lib/api/client";
import { formatKRW } from "@/lib/utils/formatters";

/* ─── Scenario metadata ─── */
const SCENARIOS = [
  { id: 1, name: "동일 금액 중복 전표",          risk: "정확한 금액 대신 반올림된 금액이 반복 기표되는 오류 가능성" },
  { id: 2, name: "현금지급 후 동일금액 부채인식", risk: "현금 집행 후 동일금액의 부채를 재인식하는 패턴" },
  { id: 3, name: "주말 현금 지급 전표",           risk: "주말에 별도 통제 없이 승인 없이 현금 전표 집행" },
  { id: 4, name: "고액 현금 전표",               risk: "임계금액 이상 현금 전표를 통한 비정상 거래 가능성" },
  { id: 5, name: "비용 인식과 동시에 현금지급",   risk: "중간 부채를 거치지 않고 발생주의 위배 가능성" },
  { id: 6, name: "Seldom Used 저빈도 거래처",     risk: "사용 빈도가 낮은 거래처를 통한 오류 또는 부정 가능성" },
  { id: 7, name: "주말/공휴일 기표 전표 전체",    risk: "승인 절차 없이 수동으로 입력된 비정상 조정 전표" },
];

/* ─── Section label ─── */
function SectionLabel({ title }: { title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
      <span style={{ fontSize: 16, fontWeight: 600, color: "#1A1A2E", whiteSpace: "nowrap" }}>{title}</span>
      <div style={{ flex: 1, height: 1, backgroundColor: "#EEEFF1" }} />
    </div>
  );
}

/* ─── Risk border color ─── */
function riskBorderColor(count: number): string {
  if (count === 0) return "#DFE3E6";
  if (count <= 5) return "#FFAA72";
  if (count <= 20) return "#FE7C39";
  return "#FD5108";
}

/* ─── Page ─── */
export default function AuditPage() {
  const { dateFrom, dateTo } = useFilterStore();
  const params = { date_from: dateFrom, date_to: dateTo };

  const queries = SCENARIOS.map((s) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useQuery({
      queryKey: ["audit-scenario", s.id, dateFrom, dateTo],
      queryFn: () => api.scenarios.summary(s.id, params),
    })
  );

  /* Aggregate per scenario */
  const scenarioStats = queries.map((q, i) => {
    const rows: ScenarioMonthly[] = (q.data as ScenarioMonthly[]) ?? [];
    const count = rows.reduce((acc, d) => acc + d.count, 0);
    const amount = rows.reduce((acc, d) => acc + d.amount, 0);
    return { ...SCENARIOS[i], count, amount, loading: q.isLoading };
  });

  const totalCount = scenarioStats.reduce((s, x) => s + x.count, 0);
  const totalAmount = scenarioStats.reduce((s, x) => s + x.amount, 0);
  const anomalyCount = scenarioStats.filter((x) => x.count > 0).length;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* ── 상단 KPI 3개 ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { label: "총 탐지 건수",      value: `${totalCount.toLocaleString("ko-KR")}건`, color: "#FD5108" },
          { label: "총 탐지 금액",      value: formatKRW(totalAmount),                    color: "#FE7C39" },
          { label: "이상 시나리오 수",  value: `${anomalyCount} / 7개`,                   color: anomalyCount > 0 ? "#FD5108" : "#A1A8B3" },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="card-hover"
            style={{
              background: "#fff",
              border: "1px solid #DFE3E6",
              borderRadius: 10,
              padding: 20,
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 500, color: "#A1A8B3", marginBottom: 6 }}>
              {kpi.label}
            </div>
            <div
              style={{
                fontSize: 30,
                fontWeight: 700,
                color: kpi.color,
                letterSpacing: "-0.5px",
                lineHeight: 1.1,
              }}
            >
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── 섹션 제목 ── */}
      <SectionLabel title="시나리오별 탐지 현황" />

      {/* ── 시나리오 카드 목록 ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
        {scenarioStats.map((s) => (
          <div
            key={s.id}
            className="card-hover"
            style={{
              background: "#fff",
              border: "1px solid #DFE3E6",
              borderRadius: 10,
              padding: 16,
              boxShadow: "var(--shadow-card)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            {/* 좌: 시나리오 정보 */}
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: riskBorderColor(s.count),
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 12,
                    background: "#FFF5ED",
                    color: "#FD5108",
                    borderRadius: 8,
                    padding: "2px 8px",
                    display: "inline-block",
                  }}
                >
                  시나리오 {s.id}
                </span>
              </div>
              <div
                style={{ fontSize: 14, fontWeight: 600, color: "#1A1A2E", marginTop: 4 }}
              >
                {s.name}
              </div>
              <div style={{ fontSize: 13, color: "#A1A8B3", marginTop: 4 }}>
                {s.risk}
              </div>
            </div>

            {/* 우: 수치 카드 */}
            <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
              {/* 건수 */}
              <div
                style={{
                  background: "#FFF5ED",
                  borderRadius: 8,
                  padding: "10px 16px",
                  textAlign: "center",
                  minWidth: 80,
                }}
              >
                <div style={{ fontSize: 13, color: "#A1A8B3", marginBottom: 4 }}>탐지 건수</div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: s.count > 0 ? "#FD5108" : "#A1A8B3",
                    letterSpacing: "-0.5px",
                  }}
                >
                  {s.loading ? "--" : s.count.toLocaleString("ko-KR")}
                </div>
              </div>

              {/* 금액 */}
              <div
                style={{
                  background: "#F5F7F8",
                  borderRadius: 8,
                  padding: "10px 16px",
                  textAlign: "center",
                  minWidth: 100,
                }}
              >
                <div style={{ fontSize: 13, color: "#A1A8B3", marginBottom: 4 }}>탐지 금액</div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: "#374151",
                    letterSpacing: "-0.5px",
                  }}
                >
                  {s.loading ? "--" : formatKRW(s.amount)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── 인쇄 버튼 ── */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
        <button
          onClick={() => window.print()}
          style={{
            background: "#FD5108",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "10px 24px",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            letterSpacing: "-0.3px",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "#e0480a";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "#FD5108";
          }}
        >
          리포트 인쇄
        </button>
      </div>
    </div>
  );
}
