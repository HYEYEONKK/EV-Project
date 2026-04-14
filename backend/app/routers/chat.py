"""
AI 챗봇 라우터 — 자연어 질문 → 데이터 선택(RAG) → Azure OpenAI 응답
지원 질문 유형:
  1. 손익 분석 (매출/비용/이익 관련)
  2. 재무상태표 분석 (자산/부채/자본 관련)
  3. 이상 전표 탐지 (시나리오/감사 관련)
"""
import sqlite3
import httpx
from pathlib import Path
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/chat", tags=["Chat"])

from app.database import DB_PATH  # centralized DB path

# ─── LLM 설정 ────────────────────────────────────────────
LLM_API_KEY = "sk-7DGAHe0SoOJYgYMbLd4qWA"
LLM_MODEL   = "azure.gpt-5.4-nano"
LLM_URL     = "https://genai-sharedservice-americas.pwcinternal.com/v1/chat/completions"


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


# ─── 질문 유형 분류 ──────────────────────────────────────

QUERY_TYPES = {
    "pnl": ["매출", "수익", "비용", "이익", "손익", "영업이익", "당기순이익", "매출총이익", "원가", "판관비", "수익성"],
    "bs": ["자산", "부채", "자본", "현금", "재고", "채권", "채무", "유동성", "부채비율", "재무상태", "대차대조"],
    "scenario": ["이상", "중복", "주말", "고액", "감사", "부정", "탐지", "위험", "비정상", "전표 검토", "seldom", "저빈도"],
}


def classify_question(question: str) -> str:
    q = question.lower()
    scores = {qtype: sum(1 for kw in kws if kw in q) for qtype, kws in QUERY_TYPES.items()}
    best = max(scores, key=lambda k: scores[k])
    return best if scores[best] > 0 else "pnl"  # default: PL


# ─── RAG: 데이터 컨텍스트 생성 ──────────────────────────

def _fmt_krw(v: float) -> str:
    if v is None: return "없음"
    abs_v = abs(v)
    sign = "-" if v < 0 else ""
    if abs_v >= 1e12: return f"{sign}{abs_v/1e12:.1f}조원"
    if abs_v >= 1e8: return f"{sign}{abs_v/1e8:.1f}억원"
    if abs_v >= 1e4: return f"{sign}{abs_v/1e4:.0f}만원"
    return f"{sign}{abs_v:,.0f}원"


def get_pnl_context(question: str, date_from: str = "2024-01-01", date_to: str = "2025-12-31") -> str:
    conn = get_conn()
    try:
        # 계정별 당기 수익/비용 요약
        rows = conn.execute("""
            SELECT branch, classification1,
                   SUM(CASE WHEN debit_credit='C' THEN amount ELSE -amount END) as net
            FROM journal_entries
            WHERE entry_type='PL' AND date >= ? AND date <= ?
            GROUP BY branch, classification1
            ORDER BY branch, ABS(net) DESC
        """, (date_from, date_to)).fetchall()

        by_branch: dict[str, list] = {}
        for r in rows:
            key = r["branch"] or "기타"
            by_branch.setdefault(key, []).append((r["classification1"] or "기타", r["net"] or 0))

        lines = [f"## 손익계산서 요약 ({date_from} ~ {date_to})"]
        total_rev, total_exp = 0.0, 0.0
        for branch, items in by_branch.items():
            lines.append(f"\n### {branch}")
            for name, amt in items[:10]:  # top 10 per branch
                lines.append(f"  - {name}: {_fmt_krw(amt)}")
                if branch == "수익": total_rev += amt
                else: total_exp += abs(amt)

        lines.append(f"\n### 합계")
        lines.append(f"  - 총 수익: {_fmt_krw(total_rev)}")
        lines.append(f"  - 총 비용: {_fmt_krw(total_exp)}")
        lines.append(f"  - 영업이익(추정): {_fmt_krw(total_rev - total_exp)}")

        # 월별 추이 (최근 12개월)
        monthly = conn.execute("""
            SELECT strftime('%Y-%m', date) as month, branch,
                   SUM(CASE WHEN debit_credit='C' THEN amount ELSE -amount END) as net
            FROM journal_entries
            WHERE entry_type='PL' AND date >= ? AND date <= ?
            GROUP BY month, branch ORDER BY month
        """, (date_from, date_to)).fetchall()
        lines.append("\n### 월별 손익 추이")
        by_month: dict[str, dict] = {}
        for r in monthly:
            m = r["month"]
            by_month.setdefault(m, {})
            by_month[m][r["branch"] or "기타"] = r["net"] or 0
        for m, bdata in sorted(by_month.items()):
            rev = bdata.get("수익", 0)
            exp = sum(v for k, v in bdata.items() if k != "수익")
            lines.append(f"  - {m}: 수익 {_fmt_krw(rev)}, 비용 {_fmt_krw(abs(exp))}, 이익 {_fmt_krw(rev - abs(exp))}")

        return "\n".join(lines)
    finally:
        conn.close()


def get_bs_context(question: str, date_from: str = "2024-01-01", date_to: str = "2025-12-31") -> str:
    conn = get_conn()
    try:
        # TB + JE 기말잔액
        tb = {r["account_code"]: dict(r) for r in
              conn.execute("SELECT account_code, balance, branch, division, classification1 FROM trial_balance").fetchall()}
        movements = {r["account_code"]: r["net"] or 0 for r in conn.execute("""
            SELECT account_code, SUM(CASE WHEN debit_credit='D' THEN amount ELSE -amount END) as net
            FROM journal_entries WHERE entry_type='BS' AND date >= ? AND date <= ?
            GROUP BY account_code
        """, (date_from, date_to)).fetchall()}

        by_branch: dict[str, float] = {}
        details: dict[str, list] = {}
        for ac, info in tb.items():
            branch = info.get("branch") or ""
            cls1 = info.get("classification1") or ""
            if not branch: continue
            bal = (info.get("balance") or 0) + movements.get(ac, 0)
            by_branch[branch] = by_branch.get(branch, 0) + bal
            details.setdefault(branch, []).append((cls1, bal))

        lines = [f"## 재무상태표 요약 ({date_from} ~ {date_to})"]
        for branch, total in sorted(by_branch.items()):
            lines.append(f"\n### {branch}: {_fmt_krw(total)}")
            for name, bal in sorted(details.get(branch, []), key=lambda x: abs(x[1]), reverse=True)[:8]:
                if name:
                    lines.append(f"  - {name}: {_fmt_krw(bal)}")

        # 주요 재무비율
        asset_total = sum(v for k, v in by_branch.items() if "자산" in k)
        liab_total = sum(v for k, v in by_branch.items() if "부채" in k)
        equity_total = sum(v for k, v in by_branch.items() if "자본" in k)
        cur_asset = by_branch.get("유동자산", 0)
        cur_liab = by_branch.get("유동부채", 0)
        lines.append("\n### 주요 재무비율")
        if cur_liab != 0:
            lines.append(f"  - 유동비율: {abs(cur_asset/cur_liab*100):.1f}%")
        if equity_total != 0:
            lines.append(f"  - 부채비율: {abs(liab_total/equity_total*100):.1f}%")
        lines.append(f"  - 총 자산: {_fmt_krw(abs(asset_total))}")
        lines.append(f"  - 총 부채: {_fmt_krw(abs(liab_total))}")
        lines.append(f"  - 자본 총계: {_fmt_krw(abs(equity_total))}")

        return "\n".join(lines)
    finally:
        conn.close()


def get_scenario_context(question: str, date_from: str = "2024-01-01", date_to: str = "2025-12-31") -> str:
    conn = get_conn()
    try:
        lines = [f"## 이상 전표 탐지 결과 ({date_from} ~ {date_to})"]

        # 시나리오 1: 동일금액 중복
        dup = conn.execute("""
            SELECT COUNT(*) as cnt, SUM(amount) as total FROM journal_entries
            WHERE date >= ? AND date <= ?
            AND (date, amount) IN (
                SELECT date, amount FROM journal_entries WHERE date >= ? AND date <= ?
                GROUP BY date, amount HAVING COUNT(DISTINCT je_number) > 1
            )
        """, (date_from, date_to, date_from, date_to)).fetchone()
        lines.append(f"\n### 시나리오 1: 동일금액 중복 전표")
        lines.append(f"  - 탐지 건수: {dup['cnt']:,}건, 금액: {_fmt_krw(dup['total'] or 0)}")

        # 시나리오 3: 주말 현금 지급
        wknd = conn.execute("""
            SELECT COUNT(*) as cnt, SUM(amount) as total FROM journal_entries
            WHERE date >= ? AND date <= ?
            AND strftime('%w', date) IN ('0','6')
            AND debit_credit='C' AND (classification1 LIKE '%현금%' OR classification1 LIKE '%보통예금%')
        """, (date_from, date_to)).fetchone()
        lines.append(f"\n### 시나리오 3: 주말 현금 지급")
        lines.append(f"  - 탐지 건수: {wknd['cnt']:,}건, 금액: {_fmt_krw(wknd['total'] or 0)}")

        # 시나리오 4: 고액 현금 전표
        large = conn.execute("""
            SELECT COUNT(*) as cnt, SUM(amount) as total FROM journal_entries
            WHERE date >= ? AND date <= ?
            AND amount > 1000000000
            AND (classification1 LIKE '%현금%' OR classification1 LIKE '%보통예금%')
        """, (date_from, date_to)).fetchone()
        lines.append(f"\n### 시나리오 4: 고액 현금 전표 (10억 이상)")
        lines.append(f"  - 탐지 건수: {large['cnt']:,}건, 금액: {_fmt_krw(large['total'] or 0)}")

        # 시나리오 6: 저빈도 거래처
        seldom = conn.execute("""
            SELECT COUNT(*) as cnt FROM journal_entries
            WHERE date >= ? AND date <= ?
            AND department IN (
                SELECT department FROM journal_entries
                WHERE date >= ? AND date <= ? AND department IS NOT NULL AND department != ''
                GROUP BY department HAVING COUNT(DISTINCT je_number) <= 3
            )
        """, (date_from, date_to, date_from, date_to)).fetchone()
        lines.append(f"\n### 시나리오 6: 저빈도 거래처 전표")
        lines.append(f"  - 탐지 건수: {seldom['cnt']:,}건")

        # 시나리오 7: 주말 전체
        wknd_all = conn.execute("""
            SELECT COUNT(*) as cnt, SUM(amount) as total FROM journal_entries
            WHERE date >= ? AND date <= ?
            AND strftime('%w', date) IN ('0','6')
        """, (date_from, date_to)).fetchone()
        lines.append(f"\n### 시나리오 7: 주말 기표 전표 (전체)")
        lines.append(f"  - 탐지 건수: {wknd_all['cnt']:,}건, 금액: {_fmt_krw(wknd_all['total'] or 0)}")

        # 상위 위험 거래처
        top_risk = conn.execute("""
            SELECT department, COUNT(DISTINCT je_number) as jcnt, SUM(amount) as total
            FROM journal_entries
            WHERE date >= ? AND date <= ?
            AND strftime('%w', date) IN ('0','6')
            AND department IS NOT NULL AND department != ''
            GROUP BY department ORDER BY total DESC LIMIT 5
        """, (date_from, date_to)).fetchall()
        if top_risk:
            lines.append("\n### 주말 기표 상위 거래처")
            for r in top_risk:
                lines.append(f"  - {r['department']}: {r['jcnt']}건, {_fmt_krw(r['total'])}")

        return "\n".join(lines)
    finally:
        conn.close()


CONTEXT_GETTERS = {
    "pnl": get_pnl_context,
    "bs": get_bs_context,
    "scenario": get_scenario_context,
}

# ─── LLM 호출 ────────────────────────────────────────────

async def call_llm(question: str, context: str, query_type: str) -> str:
    type_labels = {"pnl": "손익 분석", "bs": "재무상태표 분석", "scenario": "이상 전표 탐지"}

    system_prompt = f"""당신은 PwC의 재무 분석 AI 어시스턴트입니다.
아래 제공된 ABC Company의 실제 재무 데이터를 기반으로 분석 유형 '{type_labels.get(query_type, query_type)}'에 대해 정확하고 구조적으로 답변하세요.

규칙:
- 제공된 데이터만을 근거로 답변하세요
- 금액은 억원/조원 단위로 표현하세요
- 한국어로 답변하세요
- 숫자를 언급할 때는 항상 맥락을 함께 제공하세요
- 주요 인사이트와 주의사항을 강조하세요
- 답변은 300자 이내로 간결하게 작성하세요"""

    user_prompt = f"""다음 데이터를 참고하여 질문에 답변해주세요.

[데이터]
{context}

[질문]
{question}"""

    payload = {
        "model": LLM_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "max_tokens": 800,
        "temperature": 0.3,
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                LLM_URL,
                headers={
                    "Authorization": f"Bearer {LLM_API_KEY}",
                    "api-key": LLM_API_KEY,
                    "x-api-key": LLM_API_KEY,
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]
    except Exception:
        return None  # fallback으로 처리


# ─── Fallback: 컨텍스트 데이터 직접 포맷 ────────────────

def format_context_as_answer(question: str, context: str, query_type: str) -> str:
    """LLM 없이 컨텍스트 데이터를 구조화된 답변으로 변환"""
    lines = [l for l in context.split("\n") if l.strip()]
    type_labels = {"pnl": "손익 분석", "bs": "재무상태표", "scenario": "이상 전표 탐지"}
    label = type_labels.get(query_type, "재무 데이터")

    # 헤더 추출
    header = next((l.lstrip("# ").strip() for l in lines if l.startswith("#")), label)
    # 섹션별 핵심 항목 추출 (### 하위 bullet)
    result_lines = [f"📊 {header}\n"]
    current_section = None
    item_count = 0
    for line in lines:
        if line.startswith("### "):
            current_section = line.lstrip("# ").strip()
            result_lines.append(f"\n▸ {current_section}")
            item_count = 0
        elif line.strip().startswith("- ") and current_section and item_count < 5:
            result_lines.append(f"  {line.strip()}")
            item_count += 1

    return "\n".join(result_lines)


# ─── 요청/응답 스키마 ────────────────────────────────────

class ChatRequest(BaseModel):
    question: str
    date_from: str = "2024-01-01"
    date_to: str = "2026-03-31"


class ChatResponse(BaseModel):
    answer: str
    query_type: str
    context_summary: str


# ─── 엔드포인트 ──────────────────────────────────────────

@router.post("", response_model=ChatResponse)
async def chat(req: ChatRequest):
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="질문을 입력해주세요.")

    query_type = classify_question(req.question)
    context_fn = CONTEXT_GETTERS[query_type]
    context = context_fn(req.question, req.date_from, req.date_to)

    # context 요약 (첫 5줄)
    ctx_lines = [l for l in context.split("\n") if l.strip()]
    context_summary = " | ".join(ctx_lines[:5])

    # LLM 호출 → 실패 시 DB 데이터 직접 포맷으로 fallback
    answer = await call_llm(req.question, context, query_type)
    if not answer:
        answer = format_context_as_answer(req.question, context, query_type)

    return ChatResponse(answer=answer, query_type=query_type, context_summary=context_summary)
