"use client";
import { useState } from "react";
import { Download, ChevronDown, Search } from "lucide-react";

/* ── 자료 데이터 ── */
interface LibraryItem {
  country: string;
  title: string;
  description: string;
  fileUrl: string;
  date: string;
}

const ITEMS: LibraryItem[] = [
  // 한국
  { country: "한국", title: "SAP v2", description: "ERP 다운로드 상세설명(SAP)", fileUrl: "/downloads/erp/한국/[Worldwide Easy View](SAP)_v2.pdf", date: "2026.04.19" },
  { country: "한국", title: "SAP B1", description: "ERP 다운로드 상세설명(SAP Business One)", fileUrl: "/downloads/erp/한국/[Worldwide Easy View](SAP_B1).pdf", date: "2026.04.19" },
  { country: "한국", title: "SAP HANA v2", description: "ERP 다운로드 상세설명(SAP HANA)", fileUrl: "/downloads/erp/한국/[Worldwide Easy View](SAP_HANA)_v2.pdf", date: "2026.04.19" },
  { country: "한국", title: "UNIERP", description: "ERP 다운로드 상세설명(UNIERP)", fileUrl: "/downloads/erp/한국/[Worldwide Easy View](UNIERP).pdf", date: "2026.04.19" },
  { country: "한국", title: "영림원", description: "ERP 다운로드 상세설명(영림원)", fileUrl: "/downloads/erp/한국/[Worldwide Easy View](영림원).pdf", date: "2026.04.19" },
  { country: "한국", title: "SmartA", description: "더존 SmartA 데이터 추출 가이드", fileUrl: "/downloads/erp/한국/SmartA 데이터 내리기.pdf", date: "2026.04.19" },
  // 중국
  { country: "중국", title: "Inspur(浪潮)", description: "ERP 다운로드 상세설명(浪潮 Inspur)", fileUrl: "/downloads/erp/중국/[Worldwide Easy View](浪潮 Inspur).pdf", date: "2026.04.19" },
  { country: "중국", title: "Kingdee(金蝶)", description: "ERP 다운로드 상세설명(金蝶 Kingdee)", fileUrl: "/downloads/erp/중국/[Worldwide Easy View](金蝶 Kingdee).pdf", date: "2026.04.19" },
  { country: "중국", title: "Yongyou(用友)", description: "ERP 다운로드 상세설명 (用友 Yongyou) (ENG)", fileUrl: "/downloads/erp/중국/데이터요청서 - 用友 Yongyou) (ENG).pdf", date: "2026.04.19" },
  // 베트남
  { country: "베트남", title: "Bravo", description: "ERP 다운로드 상세설명(Bravo)", fileUrl: "/downloads/erp/베트남/[Worldwide Easy View](Bravo).pdf", date: "2026.04.19" },
  { country: "베트남", title: "FAO", description: "ERP 다운로드 상세설명(FAO)", fileUrl: "/downloads/erp/베트남/[Worldwide Easy View](FAO).pdf", date: "2026.04.19" },
  { country: "베트남", title: "MISA", description: "ERP 다운로드 상세설명(MISA)", fileUrl: "/downloads/erp/베트남/[Worldwide Easy View](MISA).pdf", date: "2026.04.19" },
  // 미국
  { country: "미국", title: "QuickBooks", description: "ERP 다운로드 상세설명(QuickBooks)", fileUrl: "/downloads/erp/미국/[Worldwide Easy View](QuickBooks).pdf", date: "2026.04.19" },
  // 일본
  { country: "일본", title: "Oracle", description: "ERP 다운로드 상세설명(Oracle)", fileUrl: "/downloads/erp/일본/[Worldwide Easy View](Oracle).pdf", date: "2026.04.19" },
  { country: "일본", title: "Yayoi(弥生会計)", description: "ERP 다운로드 상세설명(弥生会計 Yayoi)", fileUrl: "/downloads/erp/일본/[Worldwide Easy View](弥生会計 Yayoi).pdf", date: "2026.04.19" },
  // 기타
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
  "한국": "🇰🇷",
  "중국": "🇨🇳",
  "베트남": "🇻🇳",
  "미국": "🇺🇸",
  "일본": "🇯🇵",
  "독일": "🇩🇪",
  "러시아": "🇷🇺",
  "말레이시아": "🇲🇾",
  "멕시코": "🇲🇽",
  "유럽": "🇪🇺",
  "인도": "🇮🇳",
  "프랑스": "🇫🇷",
};

function getFilterCountry(item: LibraryItem): string {
  return MAIN_COUNTRIES.includes(item.country) ? item.country : "기타";
}

export default function LibraryPage() {
  const [category, setCategory] = useState("전체");
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = ITEMS.filter((item) => {
    const matchCategory = category === "전체" || getFilterCountry(item) === category;
    const matchSearch = searchQuery.trim() === "" || item.title.toLowerCase().includes(searchQuery.toLowerCase()) || item.country.includes(searchQuery);
    return matchCategory && matchSearch;
  });

  return (
    <section style={{ padding: "42px 32px", display: "flex", flexDirection: "column", gap: 0, width: "100%" }}>
      {/* ── 제목 ── */}
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1A1A2E", margin: 0, marginBottom: 12 }}>
        자료실
      </h1>
      <p style={{ fontSize: 15, color: "#6B7280", margin: 0, marginBottom: 32, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span>필요한 데이터가 보이지 않는다면 언제든 문의해 주세요</span>
        <a
          href="mailto:support@pwc.com"
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "8px 20px", background: "#FD5108", color: "#fff",
            borderRadius: 4, fontSize: 14, fontWeight: 500, textDecoration: "none",
            transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.85"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
        >
          데이터 문의
        </a>
      </p>

      {/* ── 검색 바 ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32 }}>
        {/* 국가 드롭다운 */}
        <div style={{ position: "relative" }}>
          <div
            onClick={() => setShowDropdown(!showDropdown)}
            style={{
              width: 160, height: 44, display: "flex", alignItems: "center",
              padding: "0 14px", border: "1px solid #1A1A2E", borderRadius: 0,
              cursor: "pointer", fontSize: 14, fontWeight: 500, color: "#1A1A2E",
              background: "#fff",
            }}
          >
            <span style={{ flex: 1 }}>{category}</span>
            <ChevronDown size={16} />
          </div>
          {showDropdown && (
            <div style={{
              position: "absolute", top: 44, left: 0, width: 160, background: "#fff",
              border: "1px solid #d0d0d0", zIndex: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            }}>
              {CATEGORIES.map((cat) => (
                <div
                  key={cat}
                  onClick={() => { setCategory(cat); setShowDropdown(false); }}
                  style={{
                    padding: "10px 14px", fontSize: 14, cursor: "pointer",
                    color: cat === category ? "#fff" : "#1A1A2E",
                    background: cat === category ? "#4A90D9" : "transparent",
                  }}
                  onMouseEnter={(e) => { if (cat !== category) (e.currentTarget as HTMLElement).style.background = "#F3F4F6"; }}
                  onMouseLeave={(e) => { if (cat !== category) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  {cat}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 검색 입력 */}
        <input
          type="text"
          placeholder="검색어를 입력하세요"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: 1, height: 44, padding: "0 14px", border: "1px solid #d0d0d0",
            borderRadius: 0, fontSize: 14, outline: "none", color: "#1A1A2E",
          }}
        />

        {/* 검색 버튼 */}
        <button
          onClick={() => {}}
          style={{
            height: 44, padding: "0 24px", background: "#FD5108", color: "#fff",
            border: "none", borderRadius: 0, fontSize: 14, fontWeight: 500,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
          }}
        >
          <Search size={16} />
          검색
        </button>
      </div>

      {/* ── 카드 리스트 ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
        gap: 20,
      }}>
        {filtered.map((item, idx) => (
          <div
            key={idx}
            style={{
              background: "#fff",
              border: "1px solid #E5E7EB",
              borderRadius: 0,
              padding: "24px 20px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              transition: "box-shadow 0.15s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
          >
            {/* 국가 태그 */}
            <span style={{ fontSize: 12, color: "#4A90D9", fontWeight: 500 }}>
              {COUNTRY_FLAGS[item.country] || ""} {item.country}
            </span>

            {/* 제목 */}
            <strong style={{ fontSize: 16, fontWeight: 600, color: "#1A1A2E", lineHeight: 1.4 }}>
              {item.title}
            </strong>

            {/* 카테고리 설명 */}
            <span style={{ fontSize: 13, color: "#9CA3AF" }}>
              {item.description}
            </span>

            {/* 다운로드 버튼 */}
            <a
              href={item.fileUrl}
              download
              style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                color: "#FD5108", fontSize: 13, fontWeight: 500, textDecoration: "none",
                marginTop: 4,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = "underline"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = "none"; }}
            >
              <Download size={16} />
              다운로드
            </a>

            {/* 날짜 */}
            <span style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>
              {item.date}
            </span>
          </div>
        ))}
      </div>

      {/* 결과 없음 */}
      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#9CA3AF", fontSize: 15 }}>
          검색 결과가 없습니다.
        </div>
      )}
    </section>
  );
}
