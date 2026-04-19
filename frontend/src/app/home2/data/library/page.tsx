"use client";
import { useState, useRef } from "react";
import { Download, ChevronDown, Search, X, ChevronLeft, ChevronRight } from "lucide-react";

/* ── 자료실에 이미 있는 ERP 목록 (중복 체크용) ── */
const EXISTING_ERPS = [
  "sap", "sap b1", "sap hana", "unierp", "영림원", "smarta",
  "inspur", "浪潮", "kingdee", "金蝶", "yongyou", "用友",
  "bravo", "fao", "misa", "quickbooks",
  "oracle", "yayoi", "弥生会計",
  "datev", "1c", "obm enterprise", "contpaqi", "qad",
  "ms dynamics", "dynamics 365", "tally", "sage",
];

/* ── 자료 데이터 ── */
interface LibraryItem {
  country: string;
  title: string;
  description: string;
  fileUrl: string;
  date: string;
}

const ITEMS: LibraryItem[] = [
  { country: "한국", title: "SAP v2", description: "ERP 다운로드 상세설명(SAP)", fileUrl: "/downloads/erp/한국/[Worldwide Easy View](SAP)_v2.pdf", date: "2026.04.19" },
  { country: "한국", title: "SAP B1", description: "ERP 다운로드 상세설명(SAP Business One)", fileUrl: "/downloads/erp/한국/[Worldwide Easy View](SAP_B1).pdf", date: "2026.04.19" },
  { country: "한국", title: "SAP HANA v2", description: "ERP 다운로드 상세설명(SAP HANA)", fileUrl: "/downloads/erp/한국/[Worldwide Easy View](SAP_HANA)_v2.pdf", date: "2026.04.19" },
  { country: "한국", title: "UNIERP", description: "ERP 다운로드 상세설명(UNIERP)", fileUrl: "/downloads/erp/한국/[Worldwide Easy View](UNIERP).pdf", date: "2026.04.19" },
  { country: "한국", title: "영림원", description: "ERP 다운로드 상세설명(영림원)", fileUrl: "/downloads/erp/한국/[Worldwide Easy View](영림원).pdf", date: "2026.04.19" },
  { country: "한국", title: "SmartA", description: "더존 SmartA 데이터 추출 가이드", fileUrl: "/downloads/erp/한국/SmartA 데이터 내리기.pdf", date: "2026.04.19" },
  { country: "중국", title: "Inspur(浪潮)", description: "ERP 다운로드 상세설명(浪潮 Inspur)", fileUrl: "/downloads/erp/중국/[Worldwide Easy View](浪潮 Inspur).pdf", date: "2026.04.19" },
  { country: "중국", title: "Kingdee(金蝶)", description: "ERP 다운로드 상세설명(金蝶 Kingdee)", fileUrl: "/downloads/erp/중국/[Worldwide Easy View](金蝶 Kingdee).pdf", date: "2026.04.19" },
  { country: "중국", title: "Yongyou(用友)", description: "ERP 다운로드 상세설명 (用友 Yongyou) (ENG)", fileUrl: "/downloads/erp/중국/데이터요청서 - 用友 Yongyou) (ENG).pdf", date: "2026.04.19" },
  { country: "베트남", title: "Bravo", description: "ERP 다운로드 상세설명(Bravo)", fileUrl: "/downloads/erp/베트남/[Worldwide Easy View](Bravo).pdf", date: "2026.04.19" },
  { country: "베트남", title: "FAO", description: "ERP 다운로드 상세설명(FAO)", fileUrl: "/downloads/erp/베트남/[Worldwide Easy View](FAO).pdf", date: "2026.04.19" },
  { country: "베트남", title: "MISA", description: "ERP 다운로드 상세설명(MISA)", fileUrl: "/downloads/erp/베트남/[Worldwide Easy View](MISA).pdf", date: "2026.04.19" },
  { country: "미국", title: "QuickBooks", description: "ERP 다운로드 상세설명(QuickBooks)", fileUrl: "/downloads/erp/미국/[Worldwide Easy View](QuickBooks).pdf", date: "2026.04.19" },
  { country: "일본", title: "Oracle", description: "ERP 다운로드 상세설명(Oracle)", fileUrl: "/downloads/erp/일본/[Worldwide Easy View](Oracle).pdf", date: "2026.04.19" },
  { country: "일본", title: "Yayoi(弥生会計)", description: "ERP 다운로드 상세설명(弥生会計 Yayoi)", fileUrl: "/downloads/erp/일본/[Worldwide Easy View](弥生会計 Yayoi).pdf", date: "2026.04.19" },
  { country: "독일", title: "DATEV", description: "ERP 다운로드 상세설명(DATEV)", fileUrl: "/downloads/erp/독일/[Worldwide Easy View](DATEV).pdf", date: "2026.04.19" },
  { country: "러시아", title: "1C", description: "ERP 다운로드 상세설명(1C)", fileUrl: "/downloads/erp/러시아/[Worldwide Easy View](1C).pdf", date: "2026.04.19" },
  { country: "말레이시아", title: "OBM Enterprise", description: "ERP 다운로드 상세설명(OBM Enterprise)", fileUrl: "/downloads/erp/말레이시아/[Worldwide Easy View](OBM Enterprise).pdf", date: "2026.04.19" },
  { country: "멕시코", title: "CONTPAQi", description: "ERP 다운로드 상세설명(CONTPAQi)", fileUrl: "/downloads/erp/멕시코/[Worldwide Easy View](CONTPAQi).pdf", date: "2026.04.19" },
  { country: "멕시코", title: "QAD", description: "ERP 다운로드 상세설명(QAD)", fileUrl: "/downloads/erp/멕시코/[Worldwide Easy View](QAD).pdf", date: "2026.04.19" },
  { country: "유럽", title: "MS Dynamics 365", description: "ERP 다운로드 상세설명(MS Dynamics 365 Business Central)", fileUrl: "/downloads/erp/유럽/[Worldwide Easy View](MS Dynamics 365 Business Central).pdf", date: "2026.04.19" },
  { country: "인도", title: "Tally", description: "ERP 다운로드 상세설명(Tally)", fileUrl: "/downloads/erp/인도/[Worldwide Easy View](Tally)_KO.pdf", date: "2026.04.19" },
  { country: "프랑스", title: "SAGE", description: "ERP 다운로드 상세설명(SAGE)", fileUrl: "/downloads/erp/프랑스/[Worldwide Easy View](SAGE).pdf", date: "2026.04.19" },
];

const MAIN_COUNTRIES = ["한국", "중국", "베트남", "미국", "일본"];
const CATEGORIES = ["전체", ...MAIN_COUNTRIES, "기타"];

const COUNTRY_FLAGS: Record<string, string> = {
  "한국": "🇰🇷", "중국": "🇨🇳", "베트남": "🇻🇳", "미국": "🇺🇸", "일본": "🇯🇵",
  "독일": "🇩🇪", "러시아": "🇷🇺", "말레이시아": "🇲🇾", "멕시코": "🇲🇽",
  "유럽": "🇪🇺", "인도": "🇮🇳", "프랑스": "🇫🇷",
};

function getFilterCountry(item: LibraryItem): string {
  return MAIN_COUNTRIES.includes(item.country) ? item.country : "기타";
}

function isExistingErp(erp: string): boolean {
  const lower = erp.toLowerCase().trim();
  return EXISTING_ERPS.some((e) => lower.includes(e) || e.includes(lower));
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001/api/v1";

export default function LibraryPage() {
  const [category, setCategory] = useState("전체");
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  /* 문의 팝업 */
  const [showInquiry, setShowInquiry] = useState(false);
  const [form, setForm] = useState({ company: "", name: "", email: "", phone: "", erp: "", country: "", note: "" });
  const [submitting, setSubmitting] = useState(false);
  const erpRef = useRef<HTMLInputElement>(null);

  const filtered = ITEMS.filter((item) => {
    const matchCategory = category === "전체" || getFilterCountry(item) === category;
    const matchSearch = searchQuery.trim() === "" || item.title.toLowerCase().includes(searchQuery.toLowerCase()) || item.country.includes(searchQuery);
    return matchCategory && matchSearch;
  });

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const updateForm = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    // 필수값 체크
    if (!form.company || !form.name || !form.email || !form.phone || !form.erp || !form.country) {
      alert("필수 항목을 모두 입력해주세요.");
      return;
    }

    // 이미 자료실에 있는 ERP인지 체크
    if (isExistingErp(form.erp)) {
      alert("해당 데이터는 자료실에서 확인가능합니다.");
      erpRef.current?.focus();
      return;
    }

    setSubmitting(true);
    try {
      await fetch(`${API_BASE.replace("/v1", "")}/inquiry/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } catch { /* 네트워크 오류 무시 */ }
    setSubmitting(false);

    alert("제출 되었습니다.");
    setShowInquiry(false);
    setForm({ company: "", name: "", email: "", phone: "", erp: "", country: "", note: "" });
  };

  return (
    <section style={{ padding: "42px 32px 32px", display: "flex", flexDirection: "column", width: "100%", minHeight: "calc(100vh - 56px)" }}>
      {/* ── 제목 + 데이터 문의 버튼 ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1A1A2E", margin: 0 }}>자료실</h1>
        <button
          onClick={() => setShowInquiry(true)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "8px 20px", background: "#FD5108", color: "#fff",
            border: "none", borderRadius: 4, fontSize: 14, fontWeight: 500,
            cursor: "pointer", transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.85"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
        >
          데이터 문의
        </button>
      </div>
      <p style={{ fontSize: 15, color: "#6B7280", margin: 0, marginBottom: 28 }}>
        필요한 데이터가 보이지 않는다면 언제든 문의해 주세요
      </p>

      {/* ── 검색 바 ── */}
      <div style={{ display: "flex", alignItems: "stretch", justifyContent: "center", gap: 0, marginBottom: 28, height: 44, position: "relative" }}>
        <div style={{
          display: "flex", alignItems: "center", border: "1px solid #d0d0d0", borderRight: "none",
          borderRadius: "4px 0 0 4px", overflow: "visible", width: 500,
        }}>
          <div
            onClick={() => setShowDropdown(!showDropdown)}
            style={{
              display: "flex", alignItems: "center", gap: 4, padding: "0 14px", height: "100%",
              borderRight: "1px solid #d0d0d0", fontSize: 14, color: "#1A1A2E", whiteSpace: "nowrap",
              cursor: "pointer", position: "relative",
            }}
          >
            {category} <ChevronDown size={14} color="#FD5108" />
            {showDropdown && (
              <div style={{ position: "absolute", top: 43, left: -1, width: 160, background: "#fff", border: "1px solid #d0d0d0", borderRadius: 4, zIndex: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
                {CATEGORIES.map((cat) => (
                  <div
                    key={cat}
                    onClick={(e) => { e.stopPropagation(); setCategory(cat); setShowDropdown(false); setPage(1); }}
                    style={{ padding: "10px 14px", fontSize: 14, cursor: "pointer", color: cat === category ? "#fff" : "#1A1A2E", background: cat === category ? "#FD5108" : "transparent" }}
                    onMouseEnter={(e) => { if (cat !== category) (e.currentTarget as HTMLElement).style.background = "#F3F4F6"; }}
                    onMouseLeave={(e) => { if (cat !== category) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    {cat}
                  </div>
                ))}
              </div>
            )}
          </div>
          <input
            type="text" placeholder="검색어를 입력해주세요" value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            style={{ flex: 1, height: "100%", padding: "0 14px", border: "none", fontSize: 14, outline: "none", color: "#1A1A2E" }}
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(""); setPage(1); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", display: "flex", alignItems: "center", padding: "0 8px" }}
            >
              <X size={16} />
            </button>
          )}
        </div>
        <button style={{
          width: 44, height: "100%", background: "#FD5108", color: "#fff", border: "none",
          borderRadius: "0 4px 4px 0",
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0,
        }}>
          <Search size={18} />
        </button>
      </div>

      {/* ── 총 건수 + 상단 라인 ── */}
      <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 8, flexShrink: 0 }}>
        총 <span style={{ color: "#FD5108", fontWeight: 600 }}>{filtered.length}</span>건
      </div>
      <div style={{ borderTop: "2px solid #1A1A2E", marginBottom: 24, flexShrink: 0 }} />

      {/* ── 카드 리스트 (3열 그리드) ── */}
      <div style={{ padding: 4 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
          {paged.map((item, idx) => (
            <div
              key={item.title}
              onClick={() => setSelectedIdx(selectedIdx === idx ? null : idx)}
              style={{
                background: "#fff",
                border: "1px solid #E5E7EB",
                borderRadius: 8,
                padding: "24px 20px",
                display: "flex", flexDirection: "column", gap: 10,
                transition: "box-shadow 0.25s ease",
                cursor: "pointer",
                boxShadow: selectedIdx === idx ? "0 0 0 2px #FD5108" : "none",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 2px #FD5108, 0 4px 16px rgba(0,0,0,0.08)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = selectedIdx === idx ? "0 0 0 2px #FD5108" : "none"; }}
            >
              <span style={{ fontSize: 12, color: "#6B7280", fontWeight: 500 }}>{COUNTRY_FLAGS[item.country] || ""} {item.country}</span>
              <strong style={{ fontSize: 16, fontWeight: 600, color: "#1A1A2E", lineHeight: 1.4 }}>{item.title}</strong>
              <span style={{ fontSize: 13, color: "#9CA3AF" }}>{item.description}</span>
              <a href={item.fileUrl} download onClick={(e) => e.stopPropagation()} style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#FD5108", fontSize: 13, fontWeight: 500, textDecoration: "none", marginTop: 4 }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = "underline"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = "none"; }}
              >
                <Download size={16} />다운로드
              </a>
              <span style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{item.date}</span>
            </div>
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#9CA3AF", fontSize: 15 }}>검색 결과가 없습니다.</div>
      )}

      {/* ── 페이지네이션 (하단 고정) ── */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 4, paddingTop: 16, flexShrink: 0, height: 52 }}>
        {totalPages > 1 ? (
          <>
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              style={{ ...pgBtn, opacity: page === 1 ? 0.3 : 1, cursor: page === 1 ? "not-allowed" : "pointer" }}
            >
              <ChevronLeft size={18} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                style={{
                  ...pgBtn,
                  background: p === page ? "#FD5108" : "none",
                  color: p === page ? "#fff" : "#1A1A2E",
                  fontWeight: p === page ? 700 : 400,
                }}
              >
                {p}
              </button>
            ))}
            <button
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              style={{ ...pgBtn, opacity: page === totalPages ? 0.3 : 1, cursor: page === totalPages ? "not-allowed" : "pointer" }}
            >
              <ChevronRight size={18} />
            </button>
          </>
        ) : <span style={{ color: "#9CA3AF", fontSize: 13 }}>1</span>}
      </div>

      {/* ── 문의 팝업 ── */}
      {showInquiry && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowInquiry(false); }}
        >
          <div style={{ background: "#fff", borderRadius: 8, width: 520, maxHeight: "90vh", overflowY: "auto", padding: "32px 28px" }}>
            {/* 헤더 */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1A1A2E", margin: 0 }}>데이터 문의</h2>
              <button onClick={() => setShowInquiry(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280", display: "flex", padding: 4 }}>
                <X size={20} />
              </button>
            </div>

            {/* 폼 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <FormField label="회사명" required>
                <input type="text" value={form.company} onChange={(e) => updateForm("company", e.target.value)} placeholder="회사명을 입력하세요" style={inputStyle} />
              </FormField>
              <FormField label="담당자명" required>
                <input type="text" value={form.name} onChange={(e) => updateForm("name", e.target.value)} placeholder="담당자명을 입력하세요" style={inputStyle} />
              </FormField>
              <FormField label="이메일" required>
                <input type="email" value={form.email} onChange={(e) => updateForm("email", e.target.value)} placeholder="example@company.com" style={inputStyle} />
              </FormField>
              <FormField label="연락처" required>
                <input type="tel" value={form.phone} onChange={(e) => updateForm("phone", e.target.value)} placeholder="010-0000-0000" style={inputStyle} />
              </FormField>
              <FormField label="사용 중인 ERP" required>
                <input ref={erpRef} type="text" value={form.erp} onChange={(e) => updateForm("erp", e.target.value)} placeholder="사용 중인 ERP 시스템을 입력하세요" style={inputStyle} />
              </FormField>
              <FormField label="국가" required>
                <input type="text" value={form.country} onChange={(e) => updateForm("country", e.target.value)} placeholder="국가를 입력하세요" style={inputStyle} />
              </FormField>
              <FormField label="추가 요청사항">
                <textarea value={form.note} onChange={(e) => updateForm("note", e.target.value)} placeholder="추가 요청사항이 있다면 입력하세요" rows={3} style={{ ...inputStyle, resize: "vertical", minHeight: 80 }} />
              </FormField>
            </div>

            {/* 제출 버튼 */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                width: "100%", marginTop: 24, padding: "12px 0",
                background: "#FD5108", color: "#fff", border: "none", borderRadius: 4,
                fontSize: 15, fontWeight: 600, cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.6 : 1, transition: "opacity 0.15s",
              }}
            >
              {submitting ? "제출 중..." : "제출하기"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

/* ── 폼 필드 컴포넌트 ── */
function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1A1A2E", marginBottom: 6 }}>
        {label} {required && <span style={{ color: "#FD5108" }}>*</span>}
      </label>
      {children}
    </div>
  );
}

/* ── 입력 스타일 ── */
const pgBtn: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 6, border: "none",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontSize: 14, cursor: "pointer", background: "none", color: "#1A1A2E",
};

const inputStyle: React.CSSProperties = {
  width: "100%", height: 40, padding: "0 12px",
  border: "1px solid #E5E7EB", borderRadius: 4,
  fontSize: 14, color: "#1A1A2E", outline: "none",
  boxSizing: "border-box",
};
