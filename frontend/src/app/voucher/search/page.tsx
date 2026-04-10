"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFilterStore } from "@/lib/store/filterStore";
import { api } from "@/lib/api/client";
import { formatKRW } from "@/lib/utils/formatters";
import { downloadCsv } from "@/lib/utils/csvExport";
import { Search } from "lucide-react";
import CustomSelect from "@/components/ui/CustomSelect";
import SortableTable from "@/components/ui/SortableTable";

const SEARCH_COLS = ["일자","전표번호","계정과목","거래처","적요","차변","대변"];
const COUNTER_COLS = ["계정과목","차변","대변"];
const DETAIL_COLS = ["일자","전표번호","계정과목","거래처","거래처 번역","적요","적요 번역","차변","대변"];

export default function VoucherSearchPage() {
  const { dateFrom, dateTo } = useFilterStore();
  const [account, setAccount] = useState("모두");
  const [vendor, setVendor] = useState("모두");
  const [keyword, setKeyword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [selectedCounter, setSelectedCounter] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 드롭다운 변경 시 자동 검색
  useEffect(() => {
    setSubmitted(true);
    setSelectedCounter(null);
  }, [account, vendor]);

  // 키워드 입력 시 500ms 디바운스 자동 검색
  const handleKeywordChange = (v: string) => {
    setKeyword(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSubmitted(true);
      setSelectedCounter(null);
    }, 500);
  };

  const params = { date_from: dateFrom, date_to: dateTo };

  // 드롭다운 옵션
  const { data: dims } = useQuery({
    queryKey: ["je-voucher-dims", dateFrom, dateTo],
    queryFn: () => api.journalEntries.voucherDimensions(params),
  });

  // 전표검색 결과
  const { data: searchResults = [], isLoading: searching } = useQuery({
    queryKey: ["je-search", account, vendor, keyword, dateFrom, dateTo],
    queryFn: () => api.journalEntries.search({
      ...params,
      account: account !== "모두" ? account : undefined,
      vendor: vendor !== "모두" ? vendor : undefined,
      keyword: keyword || undefined,
    }),
    enabled: submitted,
  });

  // 전표번호 목록 (상대계정 조회용)
  const jeNumbers = useMemo(
    () => [...new Set((searchResults as any[]).map((r: any) => r.je_number))],
    [searchResults]
  );

  // 상대계정 집계
  const { data: counterAccounts = [] } = useQuery({
    queryKey: ["je-counter-accounts", jeNumbers, account],
    queryFn: () => api.journalEntries.counterAccounts({
      je_numbers: jeNumbers,
      exclude_account: account !== "모두" ? account : undefined,
    }),
    enabled: jeNumbers.length > 0,
  });

  // 상대계정 요약 (선택된 계정의 전표 집계)
  const counterSummary = useMemo(() => {
    if (!selectedCounter) return [];
    return (counterAccounts as any[]).filter((c: any) => c.account === selectedCounter);
  }, [counterAccounts, selectedCounter]);

  // 상대계정 전표 상세
  const { data: counterEntries = [], isLoading: loadingDetail } = useQuery({
    queryKey: ["je-counter-entries", jeNumbers, selectedCounter],
    queryFn: () => api.journalEntries.counterEntries({
      je_numbers: jeNumbers,
      account: selectedCounter ?? undefined,
    }),
    enabled: jeNumbers.length > 0 && selectedCounter !== null,
  });

  // KPI badges
  const debitTotal = (searchResults as any[]).reduce((s: number, r: any) => s + (r.debit ?? 0), 0);
  const creditTotal = (searchResults as any[]).reduce((s: number, r: any) => s + (r.credit ?? 0), 0);

  return (
    <div className="space-y-5">
      {/* 필터 바 */}
      <div className="rounded-lg p-4"
        style={{
          border: "1px solid #DFE3E6",
          backgroundColor: "#F5F7F8",
        }}>
        <p className="text-xs mb-3" style={{ color: "#A1A8B3" }}>
          ① 좌측 필터 조건을 설정하여 분석 대상 전표를 필터링하고, 검색어를 입력하여 검색하세요.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          {/* 계정과목 */}
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 13, letterSpacing: "-0.3px", color: "#A1A8B3", whiteSpace: "nowrap" }}>계정과목</span>
            <CustomSelect
              value={account}
              onChange={(v) => setAccount(String(v))}
              options={["모두", ...((dims as any)?.accounts ?? [])]}
              fontSize={13}
            />
          </div>

          {/* 거래처 */}
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 13, letterSpacing: "-0.3px", color: "#A1A8B3", whiteSpace: "nowrap" }}>거래처</span>
            <CustomSelect
              value={vendor}
              onChange={(v) => setVendor(String(v))}
              options={["모두", ...((dims as any)?.vendors ?? [])]}
              fontSize={13}
            />
          </div>

          {/* 적요 검색 */}
          <div className="flex items-center gap-2 flex-1" style={{ minWidth: 220 }}>
            <div className="relative flex-1">
              <Search size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "#A1A8B3" }} />
              <input
                type="text" value={keyword}
                onChange={(e) => handleKeywordChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { if (debounceRef.current) clearTimeout(debounceRef.current); setSubmitted(true); setSelectedCounter(null); } }}
                placeholder="계정과목, 거래처, 적요 검색..."
                style={{ width: "100%", fontSize: 13, border: "1px solid #C6CDD6", borderRadius: 6, padding: "4px 10px 4px 28px", color: "#374151", outline: "none", backgroundColor: "#ECEEF2", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.06)" }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#FD5108"; e.currentTarget.style.boxShadow = "0 0 0 2px rgba(253,81,8,0.12)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#C6CDD6"; e.currentTarget.style.boxShadow = "inset 0 1px 2px rgba(0,0,0,0.06)"; }}
              />
            </div>
            <button
              onClick={() => { setSubmitted(true); setSelectedCounter(null); }}
              style={{ fontSize: 13, padding: "4px 16px", backgroundColor: "#FD5108", color: "#fff", borderRadius: 6, border: "none", cursor: "pointer", whiteSpace: "nowrap" }}>
              검색
            </button>
          </div>

          {/* Badges */}
          {submitted && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ backgroundColor: "#F5F7F8", color: "#374151" }}>
                차변 {formatKRW(debitTotal)}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ backgroundColor: "#FFE8D4", color: "#FD5108" }}>
                대변 {formatKRW(creditTotal)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 2-col: 검색결과 + 상대계정 */}
      <div className="grid grid-cols-12 gap-4">
        {/* 전표검색 결과 */}
        <div className="col-span-8 bg-white rounded-lg border overflow-hidden"
          style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
          <div className="px-5 py-3 border-b flex items-center justify-between"
            style={{ borderColor: "#EEEFF1" }}>
            <div className="flex items-center gap-2">
              <h4 className="text-base font-semibold" style={{ color: "#000" }}>전표검색</h4>
              {submitted && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: "#F5F7F8", color: "#374151" }}>
                  {(searchResults as any[]).length}건
                </span>
              )}
            </div>
            <button onClick={() => downloadCsv(["일자","전표번호","계정과목","거래처","적요","차변","대변"],
              (searchResults as any[]).map((e) => [e.date, e.je_number, e.account, e.vendor, e.memo||"-", e.debit||"-", e.credit||"-"]),
              "전표검색결과")}
              style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:12, fontWeight:500, color:"#A1A8B3", background:"none", border:"1px solid #DFE3E6", borderRadius:7, padding:"4px 10px", cursor:"pointer" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color="#FD5108"; (e.currentTarget as HTMLElement).style.borderColor="#FD5108"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color="#A1A8B3"; (e.currentTarget as HTMLElement).style.borderColor="#DFE3E6"; }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              CSV
            </button>
          </div>
          <div className="px-3 py-2">
            <SortableTable
              columns={[
                { key: "date",      label: "일자",    align: "left" },
                { key: "je_number", label: "전표번호", align: "left" },
                { key: "account",   label: "계정과목", align: "left" },
                { key: "vendor",    label: "거래처",   align: "left" },
                { key: "memo",      label: "적요",     align: "left" },
                { key: "debit",     label: "차변",     align: "right" },
                { key: "credit",    label: "대변",     align: "right" },
              ]}
              rows={!submitted ? [] : (searchResults as any[]).map((e) => [
                e.date,
                e.je_number,
                e.account,
                e.vendor,
                e.memo || "-",
                e.debit > 0 ? e.debit : "-",
                e.credit > 0 ? e.credit : "-",
              ])}
              filename="전표검색결과"
              maxHeight={400}
              loading={searching}
              emptyText={!submitted ? "필터를 설정하고 검색 버튼을 클릭하세요" : "검색 결과가 없습니다"}
              hideCsvButton
            />
          </div>
        </div>

        {/* 상대계정 선택 + 상대계정 요약 */}
        <div className="col-span-4 flex flex-col gap-4">
          {/* 상대계정 선택 */}
          <div className="bg-white rounded-lg border overflow-hidden flex-1"
            style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
            <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: "#EEEFF1" }}>
              <h4 className="text-base font-semibold" style={{ color: "#000" }}>상대계정 선택</h4>
              <span className="text-xs" style={{ color: "#A1A8B3" }}>② 상대계정을 선택하여 조합 전표 확인</span>
            </div>
            <div className="overflow-auto" style={{ maxHeight: 200 }}>
              <table className="w-full text-xs">
                <thead style={{ position: "sticky", top: 0 }}>
                  <tr style={{ backgroundColor: "#F5F7F8" }}>
                    {COUNTER_COLS.map((h) => (
                      <th key={h} className={`px-4 py-2.5 font-semibold ${h !== "계정과목" ? "text-right" : "text-left"}`}
                        style={{ color: "#A1A8B3", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(counterAccounts as any[]).length === 0 ? (
                    <tr><td colSpan={3} className="px-4 py-6 text-center text-xs" style={{ color: "#A1A8B3" }}>검색 후 표시됩니다</td></tr>
                  ) : (counterAccounts as any[]).map((c: any, i) => {
                    const active = selectedCounter === c.account;
                    return (
                      <tr key={i} onClick={() => setSelectedCounter(active ? null : c.account)}
                        className="border-b cursor-pointer"
                        style={{ borderColor: "#F5F7F8", backgroundColor: active ? "#FFF5ED" : "", transition: "background 0.1s" }}
                        onMouseEnter={(ev) => { if (!active) ev.currentTarget.style.backgroundColor = "#FAFBFC"; }}
                        onMouseLeave={(ev) => { ev.currentTarget.style.backgroundColor = active ? "#FFF5ED" : ""; }}>
                        <td className="px-4 py-2" style={{ color: active ? "#FD5108" : "#374151", fontWeight: active ? 600 : 400 }}>{c.account}</td>
                        <td className="px-4 py-2 text-right" style={{ color: "#374151", whiteSpace: "nowrap" }}>{c.debit_total > 0 ? formatKRW(c.debit_total) : "-"}</td>
                        <td className="px-4 py-2 text-right" style={{ color: "#374151", whiteSpace: "nowrap" }}>{c.credit_total > 0 ? formatKRW(c.credit_total) : "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 상대계정 요약 */}
          <div className="bg-white rounded-lg border overflow-hidden flex-1"
            style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
            <div className="px-5 py-3 border-b" style={{ borderColor: "#EEEFF1" }}>
              <h4 className="text-base font-semibold" style={{ color: "#000" }}>상대계정 요약</h4>
            </div>
            <div className="overflow-auto" style={{ maxHeight: 200 }}>
              <table className="w-full text-xs">
                <thead style={{ position: "sticky", top: 0 }}>
                  <tr style={{ backgroundColor: "#F5F7F8" }}>
                    {COUNTER_COLS.map((h) => (
                      <th key={h} className={`px-4 py-2.5 font-semibold ${h !== "계정과목" ? "text-right" : "text-left"}`}
                        style={{ color: "#A1A8B3", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(counterSummary as any[]).length === 0 ? (
                    <tr><td colSpan={3} className="px-4 py-6 text-center text-xs" style={{ color: "#A1A8B3" }}>상대계정을 선택하세요</td></tr>
                  ) : (counterSummary as any[]).map((c: any, i) => (
                    <tr key={i} className="border-b" style={{ borderColor: "#F5F7F8" }}>
                      <td className="px-4 py-2 font-semibold" style={{ color: "#FD5108" }}>{c.account}</td>
                      <td className="px-4 py-2 text-right" style={{ color: "#374151", whiteSpace: "nowrap" }}>{c.debit_total > 0 ? formatKRW(c.debit_total) : "-"}</td>
                      <td className="px-4 py-2 text-right" style={{ color: "#374151", whiteSpace: "nowrap" }}>{c.credit_total > 0 ? formatKRW(c.credit_total) : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* 상대계정 전표 내역 */}
      <div className="bg-white rounded-lg border overflow-hidden"
        style={{ borderColor: "#DFE3E6", boxShadow: "var(--shadow-card)" }}>
        <div className="px-5 py-3 border-b flex items-center justify-between"
          style={{ borderColor: "#EEEFF1" }}>
          <div className="flex items-center gap-2">
            <h4 className="text-base font-semibold" style={{ color: "#000" }}>상대계정 전표 내역</h4>
            {selectedCounter ? (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: "#FFE8D4", color: "#FD5108" }}>
                {selectedCounter}
              </span>
            ) : (
              <span className="text-xs" style={{ color: "#A1A8B3" }}>상대계정을 선택하면 조합 전표가 표시됩니다</span>
            )}
          </div>
          <button onClick={() => downloadCsv(["일자","전표번호","계정과목","거래처","거래처 번역","적요","적요 번역","차변","대변"],
            (counterEntries as any[]).map((e) => [e.date,e.je_number,e.account,e.vendor,e.vendor_translated||"-",e.memo||"-",e.memo_translated||"-",e.debit||"-",e.credit||"-"]),
            "상대계정전표내역")}
            style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:12, fontWeight:500, color:"#A1A8B3", background:"none", border:"1px solid #DFE3E6", borderRadius:7, padding:"4px 10px", cursor:"pointer" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color="#FD5108"; (e.currentTarget as HTMLElement).style.borderColor="#FD5108"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color="#A1A8B3"; (e.currentTarget as HTMLElement).style.borderColor="#DFE3E6"; }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            CSV
          </button>
        </div>
        <div className="px-3 py-2">
          <SortableTable
            columns={[
              { key: "date",             label: "일자",       align: "left" },
              { key: "je_number",        label: "전표번호",   align: "left" },
              { key: "account",          label: "계정과목",   align: "left" },
              { key: "vendor",           label: "거래처",     align: "left" },
              { key: "vendor_translated",label: "거래처 번역", align: "left" },
              { key: "memo",             label: "적요",       align: "left" },
              { key: "memo_translated",  label: "적요 번역",  align: "left" },
              { key: "debit",            label: "차변",       align: "right" },
              { key: "credit",           label: "대변",       align: "right" },
            ]}
            rows={!selectedCounter ? [] : (counterEntries as any[]).map((e) => [
              e.date,
              e.je_number,
              e.account,
              e.vendor,
              e.vendor_translated || "-",
              e.memo || "-",
              e.memo_translated || "-",
              e.debit > 0 ? e.debit : "-",
              e.credit > 0 ? e.credit : "-",
            ])}
            filename="상대계정전표내역"
            maxHeight={400}
            loading={loadingDetail}
            emptyText={!selectedCounter ? "상대계정을 선택하면 조합 전표가 표시됩니다" : "데이터가 없습니다"}
            hideCsvButton
          />
        </div>
      </div>
    </div>
  );
}
