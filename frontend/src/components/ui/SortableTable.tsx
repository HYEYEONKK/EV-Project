"use client";
import { useState, useMemo } from "react";
import { downloadCsv } from "@/lib/utils/csvExport";

export type SortDir = "asc" | "desc";

export interface ColDef {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  /** 숫자 정렬 여부 (기본: label에 숫자 유무로 판단) */
  numeric?: boolean;
}

interface Props {
  columns: ColDef[];
  /** rows: 각 행은 ColDef.key 순서에 맞는 값 배열 */
  rows: (string | number | null | undefined)[][];
  /** CSV 다운로드 시 파일명 (확장자 제외) */
  filename?: string;
  maxHeight?: number;
  loading?: boolean;
  emptyText?: string;
}

/* ─── Sort icon ─── */
function SortIcon({ col, active, dir }: { col: string; active: boolean; dir: SortDir }) {
  return (
    <span
      style={{
        display: "inline-flex",
        flexDirection: "column",
        gap: 1,
        marginLeft: 5,
        verticalAlign: "middle",
        opacity: active ? 1 : 0.3,
      }}
    >
      <svg width="8" height="5" viewBox="0 0 8 5" fill="none">
        <path d="M4 0L7.5 5H0.5L4 0Z" fill={active && dir === "asc" ? "#FD5108" : "#A1A8B3"} />
      </svg>
      <svg width="8" height="5" viewBox="0 0 8 5" fill="none">
        <path d="M4 5L0.5 0H7.5L4 5Z" fill={active && dir === "desc" ? "#FD5108" : "#A1A8B3"} />
      </svg>
    </span>
  );
}

export default function SortableTable({
  columns,
  rows,
  filename = "export",
  maxHeight = 400,
  loading = false,
  emptyText = "데이터가 없습니다.",
}: Props) {
  const [sortColIdx, setSortColIdx] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const handleHeaderClick = (idx: number) => {
    if (sortColIdx === idx) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColIdx(idx);
      setSortDir("asc");
    }
  };

  const sortedRows = useMemo(() => {
    if (sortColIdx === null) return rows;
    return [...rows].sort((a, b) => {
      const av = a[sortColIdx];
      const bv = b[sortColIdx];
      const isNum = typeof av === "number" || typeof bv === "number" ||
        (!isNaN(Number(av)) && av !== null && av !== "" && av !== "—") ||
        (!isNaN(Number(bv)) && bv !== null && bv !== "" && bv !== "—");
      let cmp: number;
      if (isNum) {
        const an = av === "—" || av === null || av === "" ? -Infinity : Number(av);
        const bn = bv === "—" || bv === null || bv === "" ? -Infinity : Number(bv);
        cmp = an - bn;
      } else {
        cmp = String(av ?? "").localeCompare(String(bv ?? ""), "ko");
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, sortColIdx, sortDir]);

  const handleDownload = () => {
    downloadCsv(columns.map((c) => c.label), sortedRows, filename);
  };

  return (
    <div>
      {/* Download button */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
        <button
          onClick={handleDownload}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            fontWeight: 500,
            color: "#A1A8B3",
            background: "none",
            border: "1px solid #DFE3E6",
            borderRadius: 7,
            padding: "5px 12px",
            cursor: "pointer",
            transition: "color .15s, border-color .15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = "#FD5108";
            (e.currentTarget as HTMLElement).style.borderColor = "#FD5108";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = "#A1A8B3";
            (e.currentTarget as HTMLElement).style.borderColor = "#DFE3E6";
          }}
        >
          {/* CSV icon */}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          CSV 다운로드
        </button>
      </div>

      {/* Table */}
      <div style={{ overflowY: "auto", overflowX: "auto", maxHeight }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
            <tr style={{ backgroundColor: "#F5F7F8" }}>
              {columns.map((col, idx) => (
                <th
                  key={col.key}
                  onClick={() => handleHeaderClick(idx)}
                  style={{
                    textAlign: col.align ?? (idx === 0 ? "left" : "right"),
                    padding: "10px 20px",
                    fontWeight: 600,
                    fontSize: 13,
                    color: sortColIdx === idx ? "#FD5108" : "#A1A8B3",
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                    userSelect: "none",
                    transition: "color .15s",
                  }}
                  onMouseEnter={(e) => {
                    if (sortColIdx !== idx)
                      (e.currentTarget as HTMLElement).style.color = "#1A1A2E";
                  }}
                  onMouseLeave={(e) => {
                    if (sortColIdx !== idx)
                      (e.currentTarget as HTMLElement).style.color = "#A1A8B3";
                  }}
                >
                  {col.label}
                  <SortIcon
                    col={col.key}
                    active={sortColIdx === idx}
                    dir={sortColIdx === idx ? sortDir : "asc"}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: 24, textAlign: "center", color: "#A1A8B3", fontSize: 13 }}>
                  불러오는 중...
                </td>
              </tr>
            ) : sortedRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: 24, textAlign: "center", color: "#A1A8B3", fontSize: 13 }}>
                  {emptyText}
                </td>
              </tr>
            ) : (
              sortedRows.map((row, i) => (
                <tr
                  key={i}
                  style={{ borderTop: "1px solid #EEEFF1" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "#FAFBFC")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "")}
                >
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      style={{
                        textAlign: columns[j]?.align ?? (j === 0 ? "left" : "right"),
                        padding: "8px 20px",
                        color: "#1A1A2E",
                        fontVariantNumeric: "tabular-nums",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {cell ?? "—"}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
