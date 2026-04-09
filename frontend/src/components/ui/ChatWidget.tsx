"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useFilterStore } from "@/lib/store/filterStore";
import { chatAsk, ChatResponse } from "@/lib/api/client";
import Link from "next/link";

interface Message {
  role: "user" | "assistant";
  text: string;
  queryType?: string;
  suggestions?: string[];
  navLinks?: { label: string; href: string }[];
}

// 반말로, 최신 연도 반영
const EXAMPLE_QUESTIONS = [
  "2026년 주요 수익 항목과 매출 현황은?",
  "현재 유동비율과 부채비율은?",
  "주말에 기표된 이상 전표 현황을 알려줘.",
];

const SUGGESTIONS: Record<string, string[]> = {
  pnl:      ["이번 기간 영업이익률 트렌드는?", "매출원가 증가 원인을 분석해줘.", "전년 동기 대비 수익 변화는?"],
  bs:       ["유동비율과 부채비율 현황은?", "자산 구성 변화를 설명해줘.", "재고자산 증감 추이는?"],
  scenario: ["주말 전표 거래처별 현황은?", "고액 현금 전표 상세를 알려줘.", "이상 전표 추이를 월별로 보여줘."],
};

const NAV_LINKS: Record<string, { label: string; href: string }[]> = {
  pnl:      [{ label: "PL 추이분석",  href: "/pnl/trend"    }, { label: "PL 계정분석",  href: "/pnl/account"  }],
  bs:       [{ label: "BS 추이분석",  href: "/bs/trend"     }, { label: "BS 계정분석",  href: "/bs/account"   }],
  scenario: [{ label: "주말전표 탐지", href: "/scenario/7"   }, { label: "중복전표 탐지", href: "/scenario/1"   }],
};

// 모든 쿼리 유형 #FD5108 통일, radius & style 통일
const QUERY_TYPE_LABELS: Record<string, { label: string }> = {
  pnl:      { label: "손익 분석"  },
  bs:       { label: "재무상태표" },
  scenario: { label: "이상 탐지"  },
};

// 공통 뱃지/링크 스타일
const TAG_STYLE: React.CSSProperties = {
  fontSize: 12, fontWeight: 500,
  padding: "4px 10px", borderRadius: 8,
  background: "#FFF0E8",
  border: "1px solid rgba(253,81,8,0.2)",
  color: "#FD5108",
  boxShadow: "0 1px 3px rgba(253,81,8,0.08)",
  display: "inline-flex", alignItems: "center", gap: 3,
  textDecoration: "none",
};

// ── 인라인 마크다운 파싱 (**bold**, ~~strike~~, *italic*) ──
function InlineText({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  const re = /(\*\*(.+?)\*\*|~~(.+?)~~|\*(.+?)\*)/g;
  let last = 0, m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[0].startsWith("~~"))
      parts.push(<s key={m.index} style={{ color: "#A1A8B3" }}>{m[3]}</s>);
    else if (m[0].startsWith("**"))
      parts.push(<strong key={m.index} style={{ fontWeight: 700, color: "#1A1A2E" }}>{m[2]}</strong>);
    else
      parts.push(<em key={m.index}>{m[4]}</em>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

function stripEmoji(s: string): string {
  return s.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1FA00}-\u{1FAFF}]/gu, "")
          .replace(/  +/g, " ").trim();
}

// ── 구조화된 답변 렌더링 ────────────────────────────────────
function MessageContent({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div style={{ fontSize: 14, lineHeight: 1.7 }}>
      {lines.map((line, i) => {
        const tr = line.trim();
        if (!tr) return <div key={i} style={{ height: 5 }} />;
        if (line.startsWith("📊 "))
          return <div key={i} style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 6, color: "#1A1A2E" }}><InlineText text={stripEmoji(line)} /></div>;
        if (line.startsWith("▸ "))
          return <div key={i} style={{ fontWeight: 600, color: "#FD5108", marginTop: 10, marginBottom: 2, fontSize: 13.5 }}><InlineText text={line.slice(2)} /></div>;
        if (line.startsWith("### "))
          return <div key={i} style={{ fontWeight: 600, fontSize: 13.5, color: "#6B7280", marginTop: 8, marginBottom: 2 }}><InlineText text={line.slice(4)} /></div>;
        if (line.startsWith("## "))
          return <div key={i} style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 6 }}><InlineText text={line.slice(3)} /></div>;
        if (tr.startsWith("- "))
          return (
            <div key={i} style={{ display: "flex", gap: 6, paddingLeft: 4, color: "#374151" }}>
              <span style={{ color: "#A1A8B3", flexShrink: 0, marginTop: 1 }}>•</span>
              <span><InlineText text={tr.slice(2)} /></span>
            </div>
          );
        return <div key={i} style={{ color: "#374151" }}><InlineText text={stripEmoji(line)} /></div>;
      })}
    </div>
  );
}

// ── Bot 아바타 (키워줌) ───────────────────────────────────
function BotAvatar() {
  return (
    <div style={{
      width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
      background: "linear-gradient(135deg, #FD5108 0%, #FF8040 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 2px 8px rgba(208,74,2,0.3)",
    }}>
      <img src="/ai-agent.svg" width={22} height={22}
        style={{ filter: "brightness(0) invert(1)", pointerEvents: "none" }} alt="" />
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────
export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{
    role: "assistant",
    text: "안녕하세요, 저는 EVE입니다. 무엇을 도와드릴까요?",
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const { dateFrom, dateTo } = useFilterStore();

  // ── 드래그 가능한 버튼 위치 ──────────────────────────────
  const [btnPos, setBtnPos] = useState({ bottom: 28, right: 28 });
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, startBottom: 28, startRight: 28, moved: false });

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = {
      dragging: true,
      startX: e.clientX, startY: e.clientY,
      startBottom: btnPos.bottom, startRight: btnPos.right,
      moved: false,
    };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current.dragging) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragRef.current.moved = true;
      setBtnPos({
        right:  Math.max(8, dragRef.current.startRight  - dx),
        bottom: Math.max(8, dragRef.current.startBottom - dy),
      });
    };
    const onUp = () => {
      dragRef.current.dragging = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
      if (!dragRef.current.moved) setOpen(v => !v);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
  }, [btnPos]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 150); }, [open]);

  async function send(question: string) {
    if (!question.trim() || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: question }]);
    setLoading(true);
    try {
      const res: ChatResponse = await chatAsk({ question, date_from: dateFrom, date_to: dateTo });
      const qt = res.query_type;
      setMessages(prev => [...prev, {
        role: "assistant",
        text: res.answer,
        queryType: qt,
        suggestions: SUGGESTIONS[qt] ?? SUGGESTIONS.pnl,
        navLinks:    NAV_LINKS[qt],
      }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", text: "백엔드 연결에 실패했습니다. 서버 상태를 확인해주세요." }]);
    } finally {
      setLoading(false);
    }
  }

  const winBottom = btnPos.bottom + 64;
  const winRight  = btnPos.right;

  return (
    <>
      {/* ── 플로팅 버튼 (드래그 가능) ─────────────────────── */}
      <button
        onMouseDown={onMouseDown}
        aria-label="EVE AI 챗봇"
        title="드래그로 위치 변경"
        style={{
          position: "fixed", bottom: btnPos.bottom, right: btnPos.right,
          width: 52, height: 52, borderRadius: "50%",
          border: "none", cursor: "grab",
          background: "linear-gradient(135deg, #FD5108 0%, #FF7A38 60%, #FFAA72 100%)",
          boxShadow: "0 4px 20px rgba(208,74,2,0.5), 0 1px 4px rgba(0,0,0,0.15)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 9999, userSelect: "none",
          transition: "box-shadow 0.2s",
        }}
      >
        {open ? (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M14 4L4 14M4 4l10 10" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/>
          </svg>
        ) : (
          <img src="/ai-agent.svg" width={26} height={26}
            style={{ filter: "brightness(0) invert(1)", pointerEvents: "none" }} alt="" />
        )}
      </button>

      {/* ── 채팅 창 ──────────────────────────────────────── */}
      {open && (
        <div style={{
          position: "fixed", bottom: winBottom, right: winRight,
          width: 400, height: 590,
          borderRadius: 18,
          background: "#ffffff",
          border: "1px solid #E5E7EB",
          boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
          display: "flex", flexDirection: "column", overflow: "hidden",
          zIndex: 9998,
          animation: "eveSlideUp 0.22s cubic-bezier(0.34,1.56,0.64,1)",
        }}>

          {/* 헤더 */}
          <div style={{
            padding: "14px 18px",
            background: "#FD5108",
            display: "flex", alignItems: "center", gap: 12,
          }}>
            {/* 헤더 아이콘 */}
            <div style={{
              width: 42, height: 42, borderRadius: "50%",
              background: "rgba(255,255,255,0.22)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <img src="/ai-agent.svg" width={24} height={24}
                style={{ filter: "brightness(0) invert(1)" }} alt="EVE" />
            </div>
            <div>
              {/* EVE (크게) + Easy View Expert (살짝 작게) 같은 줄 */}
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontSize: 17, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" }}>EVE</span>
                <span style={{ fontSize: 12, fontWeight: 400, color: "rgba(255,255,255,0.82)", letterSpacing: "0.1px" }}>Easy View+ Expert</span>
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.62)", marginTop: 1, letterSpacing: "0.2px" }}>
                ABC Company
              </div>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: "#86efac", boxShadow: "0 0 6px #86efac" }} />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.65)" }}>온라인</span>
            </div>
          </div>

          {/* 메시지 영역 */}
          <div style={{
            flex: 1, overflowY: "auto", padding: "14px 14px 6px",
            display: "flex", flexDirection: "column", gap: 14,
            background: "#F9FAFB",
          }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {/* 말풍선 */}
                <div style={{
                  display: "flex", gap: 9,
                  flexDirection: msg.role === "user" ? "row-reverse" : "row",
                  alignItems: "flex-end",
                }}>
                  {msg.role === "assistant" && <BotAvatar />}
                  <div style={{
                    maxWidth: "80%", display: "flex", flexDirection: "column", gap: 4,
                    alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                  }}>
                    <div style={{
                      padding: "10px 14px",
                      borderRadius: msg.role === "user" ? "18px 4px 18px 18px" : "18px 18px 18px 4px",
                      ...(msg.role === "user" ? {
                        background: "linear-gradient(135deg, #FD5108, #FF8040)",
                        color: "#fff", fontSize: 14, lineHeight: 1.65,
                        whiteSpace: "pre-wrap", wordBreak: "keep-all",
                        boxShadow: "0 3px 12px rgba(208,74,2,0.28)",
                      } : {
                        background: "#fff", color: "#1A1A2E",
                        border: "1px solid #EAECF0",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)",
                      }),
                    }}>
                      {msg.role === "assistant"
                        ? <MessageContent text={msg.text} />
                        : msg.text}
                    </div>
                    {/* 쿼리 유형 뱃지 — navLinks와 동일 스타일 */}
                    {msg.queryType && QUERY_TYPE_LABELS[msg.queryType] && (
                      <span style={{ ...TAG_STYLE, cursor: "default" }}>
                        {QUERY_TYPE_LABELS[msg.queryType].label}
                      </span>
                    )}
                  </div>
                </div>

                {/* 바로가기 링크 + 관련 질문 */}
                {msg.role === "assistant" && msg.navLinks && (
                  <div style={{ paddingLeft: 47, display: "flex", flexDirection: "column", gap: 6 }}>
                    {/* 바로가기 — 뱃지와 동일 스타일 */}
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                      {msg.navLinks.map((link, j) => (
                        <Link key={j} href={link.href} onClick={() => setOpen(false)}
                          style={TAG_STYLE}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                            <path d="M5 12h14M12 5l7 7-7 7"/>
                          </svg>
                          {link.label}
                        </Link>
                      ))}
                    </div>
                    {/* 관련 질문 */}
                    {msg.suggestions && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ fontSize: 11, color: "#B0B7C3", fontWeight: 500 }}>관련 질문</div>
                        {msg.suggestions.map((q, j) => (
                          <button key={j} onClick={() => send(q)} style={{
                            textAlign: "left", padding: "7px 11px",
                            borderRadius: 9, border: "1px solid #DFE3E6",
                            background: "#fff", color: "#374151",
                            fontSize: 13, cursor: "pointer", lineHeight: 1.45,
                            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                          }}>
                            {q}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* 로딩 도트 */}
            {loading && (
              <div style={{ display: "flex", gap: 9, alignItems: "flex-end" }}>
                <BotAvatar />
                <div style={{
                  background: "#fff", border: "1px solid #EAECF0",
                  borderRadius: "4px 18px 18px 18px", padding: "12px 16px",
                  display: "flex", gap: 6, alignItems: "center",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
                }}>
                  {[0,1,2].map(j => (
                    <div key={j} style={{
                      width: 7, height: 7, borderRadius: "50%",
                      background: "linear-gradient(135deg, #FD5108, #FF8040)",
                      opacity: 0.6,
                      animation: `eveDot 1.3s ${j * 0.18}s ease-in-out infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}

            {/* 초기 추천 질문 — 채팅 텍스트(14px)보다 살짝 작은 13.5px, 인사말과 동일 색상/웨이트 */}
            {messages.length === 1 && !loading && (
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ fontSize: 11, color: "#B0B7C3", fontWeight: 500, letterSpacing: "0.3px" }}>추천 질문</div>
                {EXAMPLE_QUESTIONS.map((q, i) => (
                  <button key={i} onClick={() => send(q)} style={{
                    textAlign: "left", padding: "10px 14px",
                    borderRadius: 10, border: "1px solid #DFE3E6",
                    background: "#fff", color: "#374151",
                    fontSize: 13.5, fontWeight: 400,
                    cursor: "pointer", lineHeight: 1.55,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  }}>
                    {q}
                  </button>
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* 입력창 */}
          <div style={{
            padding: "10px 12px", borderTop: "1px solid #F0F0F0",
            background: "#ffffff",
            display: "flex", gap: 8, alignItems: "center",
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
              placeholder="무엇이든 물어보세요..."
              disabled={loading}
              style={{
                flex: 1, background: "#F5F7F8",
                border: "1px solid #DFE3E6", borderRadius: 12,
                padding: "10px 14px", fontSize: 14, color: "#1A1A2E", outline: "none",
              }}
            />
            <button
              onClick={() => send(input)}
              disabled={loading || !input.trim()}
              style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                border: "none",
                cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                background: input.trim() && !loading
                  ? "linear-gradient(135deg, #FD5108, #FF8040)" : "#DFE3E6",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s",
                boxShadow: input.trim() && !loading ? "0 2px 10px rgba(208,74,2,0.35)" : "none",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"
                  stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes eveDot {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40%            { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes eveSlideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
      `}</style>
    </>
  );
}
