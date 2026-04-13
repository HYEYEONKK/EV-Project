# Data — ABC Company 데이터 구조 & 재무 로직

## 원본 파일

| 파일 | 행수 | 기간 | 용도 |
|------|------|------|------|
| ABC_JE v2.xlsx | 134,784 | 2024-01 ~ 2025-09 | 전표 상세 |
| ABC_TB.xlsx | 83 | (스냅샷) | 시산표 잔액 |
| 매출장.xlsx | 29,999 | 2024-01 ~ 2025-12 | 매출 상세 |
| 사업계획.xlsx | 36 | 2025 전체 (월별) | 예산 |

---

## 컬럼 매핑 (한→영)

### ABC_JE v2.xlsx
| 한국어 | 영어 (DB 컬럼) | 비고 |
|--------|---------------|------|
| 날짜 | date | DATE |
| 표준분류번호 | je_number | YYYYMMDD-XXXX |
| 차대 | debit_credit | D=차변, C=대변 |
| 금액 | amount | 항상 양수 |
| 표시처 | department | 거래처/부서 |
| 비고 | description | |
| 계정코드 | account_code | TB join key |
| 회계분류(1~4) | classification1~4 | 계층형 |
| 부정계정분류 | cost_center | |
| 나부분류 | division | 7개 값 |
| 지점 | branch | 5개 값 |
| 유형 | entry_type | BS/PL/IT |

### 나부분류(division) 값
`유가증권, 현금, 자산, 외부보험자산, 투자, 신용보증, 금융기관`

### 지점(branch) 값
`점, 채, 구, 실, 신용보증`

### 상품종류(product_category) 값
`화장품, 세제용품, 식품군석, 세제, 위생용품, 의료용품, 반투명, 생활용품, 향수`

### 지역명(region) 16개
서울, 인천, 부산, 광주 등 16개 지역

---

## 재무제표 계산 로직

### Balance Sheet (BS)
```python
# entry_type='BS' 전표 net 증감 + TB 기초 잔액
assets = sum(amount WHERE debit_credit='D' AND BS계정)
      - sum(amount WHERE debit_credit='C' AND BS계정)
# classification1로 자산/부채/자본 분류
```

### Income Statement (PL)
```python
# entry_type='PL'
revenue = sum(amount WHERE debit_credit='C')  # 수익 = 대변
expenses = sum(amount WHERE debit_credit='D')  # 비용 = 차변
net_income = revenue - expenses
```

### Cash Flow (CF)
```python
# 나부분류='현금' 계정의 순증감
# config.CF_CLASSIFICATION_MAP으로 영업/투자/재무 분류
operating = ...
investing = ...
financing = ...
```

---

## 예실 매핑 (사업계획 ↔ JE)

```python
BUDGET_ITEM_JE_MAPPING = {
    '매출': {'entry_type': 'PL', 'side': 'credit'},
    '영업비용': {'entry_type': 'PL', 'side': 'debit'},
    '순이익현금화': {'entry_type': 'IT', 'division': '현금'},
}
```

---

## 주의사항

1. `amount`는 항상 양수, 부호는 `debit_credit`(D/C)으로 결정
2. `account_code`는 문자열로 저장 (숫자 앞자리 0 방지)
3. Korean text: openpyxl 엔진 사용, UTF-8 인코딩
4. IT(Internal Transfer) entries: PL과 유사하게 처리하되 별도 집계
5. TB는 BS 계정만 포함 (유형='BS')
