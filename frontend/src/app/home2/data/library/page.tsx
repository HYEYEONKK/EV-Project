"use client";
import { useState } from "react";
import { useAuthStore, useUserRole } from "@/lib/store/authStore";
import { HelpCircle, PencilLine, Trash2, Download, ChevronLeft, ChevronRight } from "lucide-react";

/* ── Mock data ── */
interface LibraryPost {
  id: number;
  category: string;
  title: string;
  author: string;
  views: number;
  createdAt: string;
  fileUrl?: string;
}

const MOCK_DATA: LibraryPost[] = [
  { id: 8, category: "자료", title: "2026년 1분기 재무 보고서 양식", author: "박희정", views: 245, createdAt: "2026.04.15.", fileUrl: "/downloads/sample.xlsx" },
  { id: 7, category: "공지", title: "EV 시스템 업데이트 안내 v2.3", author: "최욱", views: 189, createdAt: "2026.04.10." },
  { id: 6, category: "자료", title: "월별 매출 데이터 입력 가이드", author: "박희정", views: 312, createdAt: "2026.04.05.", fileUrl: "/downloads/sample.xlsx" },
  { id: 5, category: "업데이트", title: "시나리오 분석 기능 추가 안내", author: "김민수", views: 156, createdAt: "2026.03.28." },
  { id: 4, category: "자료", title: "전표 업로드 템플릿 (Excel)", author: "최욱", views: 478, createdAt: "2026.03.20.", fileUrl: "/downloads/sample.xlsx" },
  { id: 3, category: "공지", title: "시스템 점검에 따른 이용불가 사전 안내 (2026-03-15)", author: "박희정", views: 122, createdAt: "2026.03.10." },
  { id: 2, category: "업데이트", title: "대시보드 UI 개선 업데이트 안내", author: "김민수", views: 267, createdAt: "2026.02.25." },
  { id: 1, category: "공지", title: "Easy View+ 서비스 이용 안내", author: "최욱", views: 751, createdAt: "2026.01.15." },
];

const CATEGORIES = ["전체", "공지", "업데이트", "자료"];

export default function LibraryPage() {
  const role = useUserRole();
  const isSamilAdmin = role === "samil_admin";

  const [category, setCategory] = useState("전체");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const filtered = category === "전체" ? MOCK_DATA : MOCK_DATA.filter((p) => p.category === category);
  const allSelected = filtered.length > 0 && filtered.every((p) => selectedIds.has(p.id));

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((p) => p.id)));
    }
  };

  return (
    <section style={{ padding: "42px 32px", display: "flex", flexDirection: "column", gap: 32, height: "calc(100vh - 56px)", minHeight: 500 }}>
      {/* ── 제목 ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1A1A2E", margin: 0 }}>자료실</h1>
        <button style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", display: "flex", padding: 0 }}>
          <HelpCircle size={20} />
        </button>
      </div>

      {/* ── 필터 + 액션 바 ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        {/* 카테고리 드롭다운 */}
        <div style={{ position: "relative" }}>
          <div
            onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
            style={{
              width: 250, height: 40, display: "flex", alignItems: "center",
              padding: "0 12px", border: "1px solid #E5E7EB", borderRadius: 4,
              cursor: "pointer", fontSize: 14, color: category === "전체" ? "#9CA3AF" : "#1A1A2E",
            }}
          >
            <span style={{ color: "#FD5108", marginRight: 4 }}>*</span>
            <span style={{ flex: 1 }}>{category === "전체" ? "카테고리를 선택해주세요." : category}</span>
            <ChevronLeft size={16} color="#6B7280" style={{ transform: showCategoryDropdown ? "rotate(90deg)" : "rotate(-90deg)", transition: "transform 0.2s" }} />
          </div>
          {showCategoryDropdown && (
            <div style={{
              position: "absolute", top: 44, left: 0, width: 250, background: "#fff",
              border: "1px solid #E5E7EB", borderRadius: 4, boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              zIndex: 10,
            }}>
              {CATEGORIES.map((cat) => (
                <div
                  key={cat}
                  onClick={() => { setCategory(cat); setShowCategoryDropdown(false); }}
                  style={{
                    padding: "10px 12px", fontSize: 14, cursor: "pointer",
                    color: cat === category ? "#FD5108" : "#1A1A2E",
                    background: cat === category ? "#FFF8F5" : "transparent",
                  }}
                  onMouseEnter={(e) => { if (cat !== category) (e.currentTarget as HTMLElement).style.background = "#F9FAFB"; }}
                  onMouseLeave={(e) => { if (cat !== category) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  {cat}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 액션 버튼 */}
        <div style={{ display: "flex", gap: 8 }}>
          {isSamilAdmin ? (
            <>
              <button
                onClick={() => alert("준비 중입니다.")}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
                  background: "#FD5108", color: "#fff", border: "none", borderRadius: 4,
                  fontSize: 14, fontWeight: 500, cursor: "pointer", transition: "opacity 0.15s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.85"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
              >
                <PencilLine size={18} />
                게시글 작성
              </button>
              <button
                disabled={selectedIds.size === 0}
                onClick={() => alert("삭제 기능 준비 중입니다.")}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
                  background: selectedIds.size === 0 ? "#9CA3AF" : "#6B7280", color: "#fff",
                  border: "none", borderRadius: 4, fontSize: 14, fontWeight: 500,
                  cursor: selectedIds.size === 0 ? "not-allowed" : "pointer",
                  opacity: selectedIds.size === 0 ? 0.3 : 1,
                }}
              >
                <Trash2 size={18} />
                삭제
              </button>
            </>
          ) : null}
        </div>
      </div>

      {/* ── 테이블 ── */}
      <div style={{ flex: 1, minHeight: 0, border: "1px solid #E5E7EB", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ overflowX: "hidden", overflowY: "auto", height: "100%" }}>
          <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse" }}>
            <colgroup>
              {isSamilAdmin && <col style={{ width: 40 }} />}
              <col style={{ width: 80 }} />
              <col style={{ width: 100 }} />
              <col />
              <col style={{ width: 100 }} />
              <col style={{ width: 80 }} />
              <col style={{ width: 110 }} />
              {!isSamilAdmin && <col style={{ width: 80 }} />}
            </colgroup>
            <thead>
              <tr>
                {isSamilAdmin && (
                  <th style={thStyle}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Checkbox checked={allSelected} onChange={toggleAll} />
                    </div>
                  </th>
                )}
                <th style={thStyle}>번호</th>
                <th style={thStyle}>구분</th>
                <th style={{ ...thStyle, textAlign: "left", paddingLeft: 16 }}>제목</th>
                <th style={thStyle}>작성자</th>
                <th style={thStyle}>조회수</th>
                <th style={thStyle}>작성일자</th>
                {!isSamilAdmin && <th style={thStyle}>다운로드</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((post, idx) => (
                <tr
                  key={post.id}
                  style={{ cursor: "pointer", transition: "background 0.1s" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#F9FAFB"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  {isSamilAdmin && (
                    <td style={tdStyle}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Checkbox checked={selectedIds.has(post.id)} onChange={() => toggleSelect(post.id)} />
                      </div>
                    </td>
                  )}
                  <td style={{ ...tdStyle, textAlign: "center" }}>{post.id}</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{post.category}</td>
                  <td style={{ ...tdStyle, textAlign: "left", paddingLeft: 16, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{post.title}</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{post.author}</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{post.views}</td>
                  <td style={{ ...tdStyle, textAlign: "center", borderRight: isSamilAdmin ? "none" : undefined }}>{post.createdAt}</td>
                  {!isSamilAdmin && (
                    <td style={{ ...tdStyle, textAlign: "center", borderRight: "none" }}>
                      {post.fileUrl ? (
                        <a
                          href={post.fileUrl}
                          download
                          onClick={(e) => e.stopPropagation()}
                          style={{ color: "#FD5108", display: "inline-flex", padding: 4 }}
                        >
                          <Download size={18} />
                        </a>
                      ) : (
                        <span style={{ color: "#D1D5DB" }}>
                          <Download size={18} />
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 페이지네이션 ── */}
      <div style={{ display: "flex", justifyContent: "center", paddingTop: 8, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button disabled style={{ ...pageBtn, opacity: 0.3, cursor: "not-allowed" }}>
            <ChevronLeft size={18} />
          </button>
          <button style={{ ...pageBtn, background: "#FD5108", color: "#fff", fontWeight: 600 }}>1</button>
          <button disabled style={{ ...pageBtn, opacity: 0.3, cursor: "not-allowed" }}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}

/* ── 체크박스 컴포넌트 ── */
function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      style={{
        width: 20, height: 20, borderRadius: 3,
        border: checked ? "2px solid #FD5108" : "1px solid #D1D5DB",
        background: checked ? "#FD5108" : "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", transition: "all 0.15s", flexShrink: 0,
      }}
    >
      {checked && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2.5 6L5 8.5L9.5 3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}

/* ── 스타일 상수 ── */
const thStyle: React.CSSProperties = {
  background: "#F9FAFB",
  borderBottom: "1px solid #E5E7EB",
  padding: "12px 8px",
  fontSize: 13,
  fontWeight: 600,
  color: "#6B7280",
  textAlign: "center",
  position: "sticky",
  top: 0,
};

const tdStyle: React.CSSProperties = {
  borderBottom: "1px solid #F3F4F6",
  padding: "10px 8px",
  fontSize: 14,
  color: "#1A1A2E",
};

const pageBtn: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 6,
  display: "flex", alignItems: "center", justifyContent: "center",
  background: "none", border: "none", cursor: "pointer",
  fontSize: 14,
};
