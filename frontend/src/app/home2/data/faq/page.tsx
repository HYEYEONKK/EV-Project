"use client";
import { useState } from "react";
import { ChevronDown, Search } from "lucide-react";

/* ── FAQ 데이터 ── */
interface FaqItem {
  id: number;
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  { id: 8, question: "Easy View+에서 지원하는 ERP 시스템은 어떤 것이 있나요?", answer: "현재 SAP, SAP B1, SAP HANA, UNIERP, 영림원, SmartA 등 한국 주요 ERP와 Oracle, QuickBooks, DATEV, SAGE 등 해외 ERP를 지원하고 있으며, 지속적으로 확대하고 있습니다." },
  { id: 7, question: "데이터 업로드 시 어떤 파일 형식을 지원하나요?", answer: "Excel(.xlsx, .xls), CSV 파일을 지원합니다. 업로드 시 자료실에서 제공하는 데이터 요청서 양식에 맞춰 데이터를 준비해주시면 됩니다." },
  { id: 6, question: "업로드한 데이터는 어떻게 보호되나요?", answer: "모든 데이터는 암호화되어 전송 및 저장되며, PwC의 글로벌 정보보안 정책에 따라 엄격하게 관리됩니다. 권한이 부여된 담당자만 접근할 수 있습니다." },
  { id: 5, question: "대시보드 분석 결과를 다운로드할 수 있나요?", answer: "네, 대시보드의 각 분석 화면에서 PDF 또는 Excel 형식으로 리포트를 다운로드할 수 있습니다." },
  { id: 4, question: "여러 국가의 법인 데이터를 동시에 분석할 수 있나요?", answer: "네, Easy View+는 다국가 법인의 데이터를 통합하여 분석할 수 있도록 설계되어 있습니다. 각 국가별 ERP 데이터를 업로드하면 통합 대시보드에서 비교 분석이 가능합니다." },
  { id: 3, question: "계정 권한은 어떻게 관리되나요?", answer: "삼일 관리자가 관리자 페이지에서 사용자별 접근 권한을 설정할 수 있습니다. 회사 관리자와 담당자 역할을 구분하여 데이터 조회 및 다운로드 권한을 부여합니다." },
  { id: 2, question: "시나리오 분석 기능은 무엇인가요?", answer: "시나리오 분석은 이중지급, 분할지급, 비정상 계좌 등 7가지 이상 거래 패턴을 자동으로 탐지하여 감사 리스크를 사전에 식별하는 기능입니다." },
  { id: 1, question: "서비스 이용 중 문제가 발생하면 어떻게 하나요?", answer: "자료실 페이지의 '데이터 문의' 버튼을 통해 문의를 접수하시거나, kr_easyview@pwc.com으로 직접 이메일을 보내주시면 담당자가 확인 후 회신드리겠습니다." },
];

export default function FaqPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const filtered = searchQuery.trim() === ""
    ? FAQ_ITEMS
    : FAQ_ITEMS.filter((item) => item.question.toLowerCase().includes(searchQuery.toLowerCase()) || item.answer.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <section style={{ padding: "42px 32px", display: "flex", flexDirection: "column", gap: 0, width: "100%" }}>
      {/* ── 제목 ── */}
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1A1A2E", margin: 0, marginBottom: 32 }}>FAQ</h1>

      {/* ── 검색 바 ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: 32 }}>
        <div style={{
          display: "flex", alignItems: "center", border: "1px solid #d0d0d0", borderRadius: 0,
          overflow: "hidden", width: 500,
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 4, padding: "0 14px", height: 44,
            borderRight: "1px solid #d0d0d0", fontSize: 14, color: "#1A1A2E", whiteSpace: "nowrap",
          }}>
            제목검색 <ChevronDown size={14} color="#FD5108" />
          </div>
          <input
            type="text" placeholder="검색어를 입력해주세요" value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1, height: 44, padding: "0 14px", border: "none", fontSize: 14, outline: "none", color: "#1A1A2E" }}
          />
        </div>
        <button style={{
          width: 44, height: 44, background: "#FD5108", color: "#fff", border: "none",
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
        }}>
          <Search size={18} />
        </button>
      </div>

      {/* ── 총 건수 ── */}
      <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 8 }}>
        총 <span style={{ color: "#FD5108", fontWeight: 600 }}>{filtered.length}</span>건
      </div>

      {/* ── 리스트 ── */}
      <div style={{ borderTop: "2px solid #1A1A2E" }}>
        {filtered.map((item) => {
          const isSelected = selectedId === item.id;
          return (
            <div key={item.id}>
              <div
                onClick={() => setSelectedId(isSelected ? null : item.id)}
                style={{
                  display: "flex", alignItems: "center", padding: "16px 0",
                  borderBottom: "1px solid #F3F4F6", cursor: "pointer",
                  transition: "background 0.15s",
                  boxShadow: isSelected ? "inset 3px 0 0 #FD5108" : "none",
                  paddingLeft: isSelected ? 20 : 0,
                }}
                onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.boxShadow = "inset 3px 0 0 #FD5108"; (e.currentTarget as HTMLElement).style.paddingLeft = "20px"; }}
                onMouseLeave={(e) => { if (!isSelected) { (e.currentTarget as HTMLElement).style.boxShadow = "none"; (e.currentTarget as HTMLElement).style.paddingLeft = "0"; } }}
              >
                <span style={{ width: 60, textAlign: "center", fontSize: 14, color: "#9CA3AF", flexShrink: 0 }}>{item.id}</span>
                <span style={{ flex: 1, fontSize: 15, color: isSelected ? "#FD5108" : "#1A1A2E", fontWeight: isSelected ? 600 : 400, transition: "color 0.15s" }}>{item.question}</span>
              </div>
              {/* 답변 영역 */}
              {isSelected && (
                <div style={{
                  padding: "20px 24px 20px 84px", background: "#FAFAFA",
                  borderBottom: "1px solid #F3F4F6", fontSize: 14, color: "#555",
                  lineHeight: 1.7,
                }}>
                  {item.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 결과 없음 */}
      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#9CA3AF", fontSize: 15 }}>검색 결과가 없습니다.</div>
      )}
    </section>
  );
}
