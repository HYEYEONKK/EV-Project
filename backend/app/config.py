"""
EasyView — 재무 분류 설정
실제 데이터 기반으로 작성된 계층 맵
"""

# ─── Cash Flow 분류 맵 ──────────────────────────────────────
# division 기반으로 CF 3구분
CF_DIVISION_MAP: dict[str, str] = {
    "유동자산": "operating",
    "비유동자산": "investing",
    "유동부채": "operating",
    "비유동부채": "financing",
    "수익": "operating",
    "비용": "operating",
    "손익대체": "operating",
}

# ─── 예실 매핑 (사업계획 ↔ JE) ───────────────────────────────
# 사업계획 항목 → JE에서 조회할 조건
BUDGET_ITEM_MAPPING: dict[str, dict] = {
    "매출액": {
        "entry_type": "PL",
        "branch": "수익",
    },
    "매출원가": {
        "entry_type": "PL",
        "branch": "비용",
        "classification_suffix": "(제)",
    },
    "판매비와관리비": {
        "entry_type": "PL",
        "branch": "비용",
        "classification_suffix": "(판)",
    },
}

# ─── PL 항목 분류 (classification1 suffix 기반) ──────────────
# PL classification1의 suffix로 하위 분류 판별
PL_SUFFIX_MAP: dict[str, str] = {
    "(판)": "판매비와관리비",    # SG&A
    "(제)": "매출원가",          # COGS
    "(기타)": "기타손익",        # Non-operating
}

# ─── 필터 드롭다운 표시명 매핑 ───────────────────────────────
DIVISION_LABELS: dict[str, str] = {
    "유동자산": "유동자산",
    "비유동자산": "비유동자산",
    "유동부채": "유동부채",
    "비유동부채": "비유동부채",
    "수익": "수익",
    "비용": "비용",
    "손익대체": "손익대체",
}

BRANCH_LABELS: dict[str, str] = {
    "자산": "자산",
    "부채": "부채",
    "수익": "수익",
    "비용": "비용",
    "손익대체": "손익대체",
}
