"""
BI Engine — ABC 재무 분석 데이터 처리 모듈
- ABC_JE.xlsx (분개장, 134,784 rows, 2024-01 ~ 2025-09)
- ABC_TB.xlsx (시산표, 83 accounts, 기초잔액 as of 2024-01-01)

실제 계정 구조
──────────────
분류=수익, 공시용계정: 매출액 / 기타수익 / 금융수익
분류=비용, 공시용계정: 매출원가 / 제조원가 / 판매비와관리비 / 기타비용 / 금융비용 / 법인세비용

P&L 라인 정의 (IFRS 기능별 표시)
  매출액
  (-) 매출원가              → 매출총이익
  (-) 판매비와관리비         → 영업이익
  (+) 기타수익 + 금융수익
  (-) 기타비용 + 금융비용 + 제조원가 + 법인세비용
  = 당기순이익
"""

import pandas as pd
import numpy as np
from pathlib import Path
from functools import lru_cache

BASE_DIR = Path(__file__).parent                         # engine/
DATA_DIR = BASE_DIR.parent.parent / "Test data" / "ABC"  # EV 시스템/Test data/ABC
JE_FILE  = DATA_DIR / "ABC_JE.xlsx"
TB_FILE  = DATA_DIR / "ABC_TB.xlsx"

# ─────────────────────────────────────────────────────────────────────────────
# 계정 분류 상수
# ─────────────────────────────────────────────────────────────────────────────
REVENUE_ACCTS   = {'매출액', '기타수익', '금융수익'}
COGS_ACCT       = '매출원가'
SGA_ACCT        = '판매비와관리비'
MANUF_ACCT      = '제조원가'
OTHER_EXP_ACCT  = '기타비용'
FIN_EXP_ACCT    = '금융비용'
TAX_ACCT        = '법인세비용'

# ─────────────────────────────────────────────────────────────────────────────
# Data Loading
# ─────────────────────────────────────────────────────────────────────────────

_je_file = JE_FILE
_tb_file = TB_FILE


def set_data_paths(je_path, tb_path):
    """업로드된 파일 경로로 교체하고 캐시 초기화"""
    global _je_file, _tb_file
    _je_file = Path(je_path)
    _tb_file = Path(tb_path)
    load_data.cache_clear()


@lru_cache(maxsize=1)
def load_data():
    je = pd.read_excel(_je_file)
    je['일자']  = pd.to_datetime(je['일자'])
    je['연도']  = je['일자'].dt.year.astype(int)
    je['월']    = je['일자'].dt.month.astype(int)
    je['요일']  = je['일자'].dt.dayofweek   # 0=월 … 6=일

    tb = pd.read_excel(_tb_file)
    return je, tb


# ─────────────────────────────────────────────────────────────────────────────
# Helper
# ─────────────────────────────────────────────────────────────────────────────

def _net(df, credit_positive: bool) -> int:
    """
    credit_positive=True  → 대변 +, 차변 -  (수익·부채·자본)
    credit_positive=False → 차변 +, 대변 -  (비용·자산)
    """
    dr = int(df[df['차대'] == '차변']['금액'].sum())
    cr = int(df[df['차대'] == '대변']['금액'].sum())
    return (cr - dr) if credit_positive else (dr - cr)


def _filter_period(df, year: int, month: int, ytd: bool):
    df = df[df['연도'] == year]
    if ytd:
        df = df[df['월'] <= month]
    else:
        df = df[df['월'] == month]
    return df


def _pct(cur, prev):
    if not prev:
        return None
    return round((cur - prev) / abs(prev) * 100, 1)


# ─────────────────────────────────────────────────────────────────────────────
# P&L
# ─────────────────────────────────────────────────────────────────────────────

def _calc_pl_lines(pl_je: pd.DataFrame) -> dict:
    """공시용계정별 net 금액 계산"""
    lines = {}
    for acct, grp in pl_je.groupby('공시용계정'):
        분류 = grp['분류'].iloc[0]
        credit_pos = (분류 == '수익')
        lines[acct] = _net(grp, credit_pos)
    return lines


def _pl_subtotals(lines: dict) -> dict:
    """P&L 소계 계산"""
    매출액     = lines.get('매출액', 0)
    기타수익   = lines.get('기타수익', 0)
    금융수익   = lines.get('금융수익', 0)
    매출원가   = lines.get('매출원가', 0)
    판관비     = lines.get('판매비와관리비', 0)
    제조원가   = lines.get('제조원가', 0)
    기타비용   = lines.get('기타비용', 0)
    금융비용   = lines.get('금융비용', 0)
    법인세     = lines.get('법인세비용', 0)

    총매출     = 매출액 + 기타수익 + 금융수익
    매출총이익 = 매출액 - 매출원가
    영업이익   = 매출총이익 - 판관비
    당기순이익 = 영업이익 + 기타수익 + 금융수익 - 기타비용 - 금융비용 - 제조원가 - 법인세

    return {
        'lines'         : lines,
        '총매출'         : 총매출,
        '매출액'         : 매출액,
        '기타수익'       : 기타수익,
        '금융수익'       : 금융수익,
        '매출원가'       : 매출원가,
        '매출총이익'     : 매출총이익,
        '판매비와관리비' : 판관비,
        '제조원가'       : 제조원가,
        '영업이익'       : 영업이익,
        '기타비용'       : 기타비용,
        '금융비용'       : 금융비용,
        '법인세비용'     : 법인세,
        '당기순이익'     : 당기순이익,
        'gross_margin'  : round(매출총이익 / 매출액 * 100, 1) if 매출액 else 0,
        'op_margin'     : round(영업이익   / 매출액 * 100, 1) if 매출액 else 0,
        'net_margin'    : round(당기순이익 / 매출액 * 100, 1) if 매출액 else 0,
    }


def get_pl(year: int, month: int, ytd: bool = True) -> dict:
    je, _ = load_data()
    pl_je = _filter_period(je[je['구분'] == 'PL'], year, month, ytd)
    lines = _calc_pl_lines(pl_je)
    return _pl_subtotals(lines)


def get_monthly_pl_trend() -> list:
    """2024~2025 전체 월별 P&L 요약"""
    je, _ = load_data()
    pl_je = je[(je['구분'] == 'PL') & (je['연도'].isin([2024, 2025]))]

    results = []
    for (yr, mo), grp in pl_je.groupby(['연도', '월']):
        lines = _calc_pl_lines(grp)
        sub   = _pl_subtotals(lines)
        results.append({
            'year'            : int(yr),
            'month'           : int(mo),
            'label'           : f"{int(yr)}-{int(mo):02d}",
            'revenue'         : sub['매출액'],
            'cogs'            : sub['매출원가'],
            'gross_profit'    : sub['매출총이익'],
            'sga'             : sub['판매비와관리비'],
            'operating_income': sub['영업이익'],
            'net_income'      : sub['당기순이익'],
        })
    return sorted(results, key=lambda x: (x['year'], x['month']))


# ─────────────────────────────────────────────────────────────────────────────
# B/S
# ─────────────────────────────────────────────────────────────────────────────

def _bs_closing(je, tb, year: int, month: int) -> dict:
    """특정 시점 B/S 계산"""
    cutoff = pd.Timestamp(year, month, 1) + pd.offsets.MonthEnd(0)
    bs_je  = je[(je['구분'] == 'BS') & (je['일자'] <= cutoff)]

    subtotals: dict = {}
    for _, row in tb.iterrows():
        code    = row['계정코드']
        opening = int(row['기초'])
        분류    = row['분류']
        합산    = row['합산계정']
        관리    = row['관리계정']
        공시    = row['공시용계정']

        acc_je   = bs_je[bs_je['계정코드'] == code]
        credit_p = (분류 != '자산')          # 부채·자본 → 대변 증가
        movement = _net(acc_je, credit_p)
        closing  = opening + movement

        if 합산 not in subtotals:
            subtotals[합산] = {'분류': 분류, 'total': 0, 'accounts': {}}
        subtotals[합산]['total']            += closing
        subtotals[합산]['accounts'][관리]    = closing

    total_assets     = sum(v['total'] for v in subtotals.values() if v['분류'] == '자산')
    total_liab       = sum(v['total'] for v in subtotals.values() if v['분류'] == '부채')
    total_equity_bs  = sum(v['total'] for v in subtotals.values() if v['분류'] == '자본')

    # 누적 당기순이익 → 자본에 포함
    pl_ytd    = je[(je['구분'] == 'PL') & (je['일자'] <= cutoff)]
    lines_ytd = _calc_pl_lines(pl_ytd)
    sub_ytd   = _pl_subtotals(lines_ytd)
    ni_ytd    = sub_ytd['당기순이익']

    total_equity = total_equity_bs + ni_ytd

    ca = subtotals.get('유동자산',  {}).get('total', 0)
    cl = subtotals.get('유동부채',  {}).get('total', 0)

    return {
        'as_of'          : f"{year}-{month:02d}",
        'subtotals'      : subtotals,
        'total_assets'   : total_assets,
        'total_liab'     : total_liab,
        'total_equity_bs': total_equity_bs,
        'net_income_ytd' : ni_ytd,
        'total_equity'   : total_equity,
        'debt_ratio'     : round(total_liab   / total_equity   * 100, 1) if total_equity   else 0,
        'current_ratio'  : round(ca / cl * 100, 1) if cl else 0,
    }


def get_bs(year: int, month: int) -> dict:
    je, tb = load_data()
    return _bs_closing(je, tb, year, month)


def get_bs_trend() -> list:
    je, tb = load_data()
    periods = [
        (2024,  3), (2024,  6), (2024,  9), (2024, 12),
        (2025,  3), (2025,  6), (2025,  9),
    ]
    results = []
    for year, month in periods:
        bs = _bs_closing(je, tb, year, month)
        results.append({
            'label'         : bs['as_of'],
            'total_assets'  : bs['total_assets'],
            'total_liab'    : bs['total_liab'],
            'total_equity'  : bs['total_equity'],
            'current_assets': bs['subtotals'].get('유동자산', {}).get('total', 0),
            'current_liab'  : bs['subtotals'].get('유동부채', {}).get('total', 0),
        })
    return results


# ─────────────────────────────────────────────────────────────────────────────
# Journal Statistics
# ─────────────────────────────────────────────────────────────────────────────

def get_journal_stats() -> dict:
    je, _ = load_data()

    monthly = (
        je.groupby(['연도', '월'])
        .agg(
            voucher_count=('전표식별번호', 'nunique'),
            entry_count=('RecordID', 'count'),
        )
        .reset_index()
        .rename(columns={'연도': '연도', '월': '월'})
    )

    return {
        'monthly'        : monthly.to_dict('records'),
        'total_vouchers' : int(je['전표식별번호'].nunique()),
        'total_entries'  : int(len(je)),
    }


def get_top_counterparties(year: int, month: int, ytd: bool = True, top_n: int = 5) -> dict:
    je, _ = load_data()
    filtered = _filter_period(je, year, month, ytd)

    # 매출 상위
    rev = filtered[
        (filtered['분류'] == '수익') &
        (filtered['공시용계정'] == '매출액') &
        (filtered['차대'] == '대변') &
        filtered['거래처'].notna()
    ]
    top_sales = (
        rev.groupby('거래처')['금액'].sum()
        .nlargest(top_n).reset_index()
        .rename(columns={'금액': 'amount'})
        .to_dict('records')
    )

    # 매입 상위 (매출원가 차변)
    cogs = filtered[
        (filtered['공시용계정'] == '매출원가') &
        (filtered['차대'] == '차변') &
        filtered['거래처'].notna()
    ]
    top_purchase = (
        cogs.groupby('거래처')['금액'].sum()
        .nlargest(top_n).reset_index()
        .rename(columns={'금액': 'amount'})
        .to_dict('records')
    )
    if not top_purchase:
        # fallback: 판매비와관리비 지급처 상위
        sga = filtered[
            (filtered['공시용계정'] == '판매비와관리비') &
            (filtered['차대'] == '차변') &
            filtered['거래처'].notna()
        ]
        top_purchase = (
            sga.groupby('거래처')['금액'].sum()
            .nlargest(top_n).reset_index()
            .rename(columns={'금액': 'amount'})
            .to_dict('records')
        )

    return {'top_sales': top_sales, 'top_purchase': top_purchase}


# ─────────────────────────────────────────────────────────────────────────────
# Exception Analysis
# ─────────────────────────────────────────────────────────────────────────────

def get_exceptions() -> dict:
    je, _ = load_data()

    # ── Exc 1: 금액 상위 0.5% 대형 거래 ──────────────────────────────────────
    threshold = int(je['금액'].quantile(0.995))
    exc1 = (
        je[je['금액'] >= threshold]
        .sort_values('금액', ascending=False)
        .head(30)[['일자', '전표식별번호', '관리계정', '거래처', '금액', '차대']]
        .copy()
    )
    exc1['일자'] = exc1['일자'].dt.strftime('%Y-%m-%d')
    exc1['금액'] = exc1['금액'].astype(int)
    exc1 = exc1.fillna('기타').to_dict('records')

    # ── Exc 2: 주말 거래 ──────────────────────────────────────────────────────
    # 손익대체(제조원가 이체) 항목 제외하여 실질적 주말 거래만
    exc2 = (
        je[
            (je['요일'] >= 5) &
            (je['금액'].abs() >= 10_000) &
            (~je['관리계정'].isin(['손익대체', '재공품']))
        ]
        .sort_values('금액', ascending=False)
        .head(30)[['일자', '전표식별번호', '관리계정', '거래처', '금액', '차대']]
        .copy()
    )
    exc2['일자'] = exc2['일자'].dt.strftime('%Y-%m-%d')
    exc2['금액'] = exc2['금액'].astype(int)
    exc2 = exc2.fillna('기타').to_dict('records')

    # ── Exc 3: 동일 금액 반복 거래 ───────────────────────────────────────────
    exc3 = (
        je[je['금액'] > 0]
        .groupby(['거래처', '금액'])
        .agg(
            count=('전표식별번호', 'nunique'),
            last_voucher=('전표식별번호', 'last'),
            last_date=('일자', 'max'),
        )
        .reset_index()
    )
    exc3 = (
        exc3[exc3['count'] >= 3]
        .sort_values('count', ascending=False)
        .head(20)
    )
    exc3['last_date'] = exc3['last_date'].dt.strftime('%Y-%m-%d')
    exc3['금액'] = exc3['금액'].astype(int)
    exc3 = exc3.fillna('기타').to_dict('records')

    # ── Exc 4: 가수금·가지급금 미결 ──────────────────────────────────────────
    exc4_accounts = ['가수금', '가지급금']
    exc4 = (
        je[je['관리계정'].isin(exc4_accounts)]
        .sort_values('금액', ascending=False)
        .head(30)[['일자', '전표식별번호', '관리계정', '거래처', '금액', '차대']]
        .copy()
    )
    exc4['일자'] = exc4['일자'].dt.strftime('%Y-%m-%d')
    exc4['금액'] = exc4['금액'].astype(int)
    exc4 = exc4.fillna('기타').to_dict('records')

    # ── Exc 5: 장기 미결 전표 (180일 이상) ──────────────────────────────────
    last_date = je['일자'].max()
    exc5 = je[je['구분'] == 'BS'][
        ['일자', '전표식별번호', '관리계정', '거래처', '금액', '차대']
    ].copy()
    exc5['age_days'] = (last_date - exc5['일자']).dt.days
    exc5 = (
        exc5[exc5['age_days'] > 180]
        .sort_values('age_days', ascending=False)
        .head(30)
    )
    exc5['일자'] = exc5['일자'].dt.strftime('%Y-%m-%d')
    exc5['금액'] = exc5['금액'].astype(int)
    exc5 = exc5.fillna('기타').to_dict('records')

    # ── Exc 6: Seldom Used (전표 5건 이하) ───────────────────────────────────
    usage = (
        je.groupby('관리계정')
        .agg(
            count=('전표식별번호', 'count'),
            last_date=('일자', 'max'),
            last_voucher=('전표식별번호', 'last'),
            total_amount=('금액', 'sum'),
        )
        .reset_index()
    )
    exc6 = (
        usage[usage['count'] <= 5]
        .sort_values('count')
        .head(20)
    )
    exc6['last_date'] = exc6['last_date'].dt.strftime('%Y-%m-%d')
    exc6['total_amount'] = exc6['total_amount'].astype(int)
    exc6 = exc6.fillna('기타').to_dict('records')

    return {
        'exc1_large'      : exc1,
        'exc2_weekend'    : exc2,
        'exc3_repeat'     : exc3,
        'exc4_unmatched'  : exc4,
        'exc5_outstanding': exc5,
        'exc6_seldom'     : exc6,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Summary KPI
# ─────────────────────────────────────────────────────────────────────────────

def get_summary(year: int, month: int) -> dict:
    je, tb = load_data()

    pl_cur  = _pl_subtotals(_calc_pl_lines(
        _filter_period(je[je['구분'] == 'PL'], year, month, ytd=True)
    ))
    pl_prev = _pl_subtotals(_calc_pl_lines(
        _filter_period(je[je['구분'] == 'PL'], year - 1, month, ytd=True)
    ))
    bs_cur  = _bs_closing(je, tb, year, month)
    bs_prev = _bs_closing(je, tb, year - 1, 12)

    return {
        'period': f"{year}년 {month:02d}월 (YTD)",
        'pl': {
            'revenue'               : pl_cur ['매출액'],
            'revenue_prev'          : pl_prev['매출액'],
            'revenue_chg'           : _pct(pl_cur['매출액'], pl_prev['매출액']),
            'gross_profit'          : pl_cur ['매출총이익'],
            'gross_profit_prev'     : pl_prev['매출총이익'],
            'gross_profit_chg'      : _pct(pl_cur['매출총이익'], pl_prev['매출총이익']),
            'operating_income'      : pl_cur ['영업이익'],
            'operating_income_prev' : pl_prev['영업이익'],
            'operating_income_chg'  : _pct(pl_cur['영업이익'], pl_prev['영업이익']),
            'net_income'            : pl_cur ['당기순이익'],
            'net_income_prev'       : pl_prev['당기순이익'],
            'net_income_chg'        : _pct(pl_cur['당기순이익'], pl_prev['당기순이익']),
            'gross_margin'          : pl_cur ['gross_margin'],
            'op_margin'             : pl_cur ['op_margin'],
            'net_margin'            : pl_cur ['net_margin'],
        },
        'bs': {
            'total_assets'      : bs_cur ['total_assets'],
            'total_assets_prev' : bs_prev['total_assets'],
            'total_assets_chg'  : _pct(bs_cur['total_assets'], bs_prev['total_assets']),
            'total_liab'        : bs_cur ['total_liab'],
            'total_equity'      : bs_cur ['total_equity'],
            'debt_ratio'        : bs_cur ['debt_ratio'],
            'current_ratio'     : bs_cur ['current_ratio'],
        },
        'counterparties': get_top_counterparties(year, month, ytd=True, top_n=5),
    }
