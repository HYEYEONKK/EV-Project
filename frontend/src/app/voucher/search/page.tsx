"use client";
import { useState } from "react";

export default function VoucherSearchPage() {
  const [q, setQ] = useState("");

  return (
    <div className="space-y-5">
      {/* Search bar */}
      <div className="bg-white rounded-lg border p-5" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
        <h4 className="text-sm font-semibold mb-4" style={{ color: "#000" }}>전표검색</h4>
        <p className="text-xs mb-4" style={{ color: "#A1A8B3" }}>
          (Step1) 좌측 FILTER 기능을 활용하여 분석 대상 전표 필터링
        </p>
        <input
          type="text"
          placeholder="계정과목, 거래처, 적요 검색..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full px-4 py-2 text-sm rounded-md"
          style={{ border: "1px solid #DFE3E6", color: "#000", outline: "none" }}
        />
      </div>

      {/* Results table */}
      <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
        <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "#EEEFF1" }}>
          <h4 className="text-sm font-semibold" style={{ color: "#000" }}>검색 결과</h4>
          <span className="text-xs" style={{ color: "#A1A8B3" }}>전표 검색 API 연동 예정</span>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ backgroundColor: "#F5F7F8" }}>
                {["일자","전표번호","계정과목","거래처","거래처 번역","적요","적요 번역","차변","대변"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left font-semibold" style={{ color: "#A1A8B3", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-xs" style={{ color: "#A1A8B3" }}>
                  검색어를 입력하면 전표 내역이 표시됩니다
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
