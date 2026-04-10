(function () {

// ─────────────────────────────────────────────────────────────────────────────
// Config — file:// 로 열 때도 Flask 절대 URL 사용
// ─────────────────────────────────────────────────────────────────────────────
const _SERVER = window.location.protocol === 'file:' ? 'http://localhost:5000' : '';
const API_BASE = _SERVER + '/api/bi';

// ─────────────────────────────────────────────────────────────────────────────
// 유저 아바타 & 드롭다운
// ─────────────────────────────────────────────────────────────────────────────
(function () {
  const raw     = sessionStorage.getItem('user') || '{}';
  const userObj = (() => { try { return JSON.parse(raw); } catch { return { email: raw }; } })();
  const email   = userObj.email || '';
  const name    = userObj.name  || email.split('@')[0];
  const initials = name.slice(0, 2).toUpperCase();

  const avatarInitials = document.querySelector('.avatar-initials');
  if (avatarInitials) avatarInitials.textContent = initials;

  const nameEl  = document.getElementById('dropdownName');
  const emailEl = document.getElementById('dropdownEmail');
  if (nameEl)  nameEl.textContent  = name;
  if (emailEl) emailEl.textContent = email;

  const btn      = document.getElementById('avatarBtn');
  const dropdown = document.getElementById('avatarDropdown');
  if (!btn || !dropdown) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('open');
  });

  document.addEventListener('click', () => {
    dropdown.classList.remove('open');
  });
})();

// ─────────────────────────────────────────────────────────────────────────────
// View 전환
// ─────────────────────────────────────────────────────────────────────────────
const params      = new URLSearchParams(window.location.search);
const fromProcess = params.get('from') === 'process';
const urlYear     = parseInt(params.get('year')  || '2025');
const urlMonth    = parseInt(params.get('month') || '9');

document.getElementById(fromProcess ? 'reportView' : 'listView').classList.remove('hidden');
if (!fromProcess) return;

// ─────────────────────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────────────────────
let selYear  = urlYear;
let selMonth = urlMonth;
document.getElementById('selYear').value  = selYear;
document.getElementById('selMonth').value = selMonth;

// ─────────────────────────────────────────────────────────────────────────────
// Formatters
// ─────────────────────────────────────────────────────────────────────────────
const fmt  = n => n == null ? '-' : Math.round(n).toLocaleString('ko-KR');
const fmtM = n => {
  if (n == null) return '-';
  const v = Math.round(n / 1_000_000);
  return v.toLocaleString('ko-KR') + 'M';
};
const fmtB = n => {
  if (n == null) return '-';
  const v = Math.round(n / 1_000_000_000 * 10) / 10;
  return v.toLocaleString('ko-KR') + 'B';
};
const pctStr = p => {
  if (p == null) return '-';
  return p >= 0 ? `△${Math.abs(p).toFixed(1)}%` : `▽${Math.abs(p).toFixed(1)}%`;
};
const pctCls = p => {
  if (p == null) return '';
  return p >= 0 ? 'up' : 'down';
};
const diffPct = (cur, prev) => {
  if (!prev) return null;
  return Math.round((cur - prev) / Math.abs(prev) * 1000) / 10;
};
const numCls = n => n == null ? '' : n >= 0 ? 'up' : 'down';

// ─────────────────────────────────────────────────────────────────────────────
// API
// ─────────────────────────────────────────────────────────────────────────────
async function api(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// Chart registry
// ─────────────────────────────────────────────────────────────────────────────
const charts = {};
const destroy = id => { if (charts[id]) { charts[id].destroy(); delete charts[id]; } };

const C_ORANGE  = '#FF9F00';
const C_OBG     = 'rgba(255,159,0,0.15)';
const C_GRAY    = '#bdbdbd';
const C_GREEN   = '#43A047';
const C_GBG     = 'rgba(67,160,71,0.18)';
const C_BLUE    = '#42A5F5';
const C_BBG     = 'rgba(66,165,245,0.15)';
const C_RED     = '#ef5350';
const C_RBG     = 'rgba(239,83,80,0.10)';

const xAxis = () => ({ grid: { display: false }, ticks: { font: { size: 11 } } });
const yAxisB = () => ({
  grid: { color: '#f0f0f0' },
  ticks: {
    font: { size: 11 },
    callback: v => {
      const b = v / 1_000_000_000;
      return (Math.round(b * 10) / 10).toLocaleString('ko-KR') + 'B';
    },
  },
});
const yAxisCnt = () => ({
  grid: { color: '#f0f0f0' },
  ticks: { font: { size: 11 }, callback: v => v.toLocaleString('ko-KR') + '건' },
});

const barCommon = {
  responsive: true,
  plugins: { legend: { display: true, position: 'top', labels: { font: { size: 11 }, boxWidth: 12 } } },
  scales: { x: xAxis(), y: yAxisB() },
};
const lineCommon = {
  responsive: true,
  plugins: { legend: { display: true, position: 'top', labels: { font: { size: 11 }, boxWidth: 12 } } },
  scales: { x: xAxis(), y: yAxisB() },
};

function makeBar(id, datasets, labels) {
  destroy(id);
  charts[id] = new Chart(document.getElementById(id), {
    type: 'bar', data: { labels, datasets }, options: barCommon,
  });
}
function makeLine(id, datasets, labels) {
  destroy(id);
  charts[id] = new Chart(document.getElementById(id), {
    type: 'line', data: { labels, datasets }, options: lineCommon,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Summary Tab ──────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
function renderSummary(summary) {
  const pl = summary.pl;
  const bs = summary.bs;

  // KPI Cards (5개)
  const kpis = [
    { label: '매출액',    cur: pl.revenue,          prev: pl.revenue_prev,          chg: pl.revenue_chg },
    { label: '매출총이익', cur: pl.gross_profit,     prev: pl.gross_profit_prev,     chg: pl.gross_profit_chg },
    { label: '영업이익',  cur: pl.operating_income, prev: pl.operating_income_prev, chg: pl.operating_income_chg },
    { label: '당기순이익', cur: pl.net_income,       prev: pl.net_income_prev,       chg: pl.net_income_chg },
    { label: '총자산',    cur: bs.total_assets,     prev: bs.total_assets_prev,     chg: bs.total_assets_chg },
  ];
  document.getElementById('kpiGrid').innerHTML = kpis.map(k => `
    <div class="kpi-card">
      <span class="kpi-label">${k.label}</span>
      <span class="kpi-value">${fmtM(k.cur)}</span>
      <div class="kpi-compare">
        <span class="kpi-prev">전기 ${fmtM(k.prev)}</span>
        <span class="kpi-change ${pctCls(k.chg)}">${pctStr(k.chg)}</span>
      </div>
    </div>`).join('');

  // Top counterparties
  const cp = summary.counterparties || {};
  const salesRows    = (cp.top_sales    || []).map(r =>
    `<tr><td>${r['거래처']||'-'}</td><td class="num">${fmtM(r.amount)}</td></tr>`).join('');
  const purchaseRows = (cp.top_purchase || []).map(r =>
    `<tr><td>${r['거래처']||'-'}</td><td class="num">${fmtM(r.amount)}</td></tr>`).join('');

  document.getElementById('topSalesBody').innerHTML    = salesRows    || '<tr><td colspan="2">데이터 없음</td></tr>';
  document.getElementById('topPurchaseBody').innerHTML = purchaseRows || '<tr><td colspan="2">데이터 없음</td></tr>';

  // 재무비율
  document.getElementById('ratioBody').innerHTML = `
    <tr><td>매출총이익률</td><td class="num">${pl.gross_margin}%</td></tr>
    <tr><td>영업이익률</td><td class="num">${pl.op_margin}%</td></tr>
    <tr><td>순이익률</td><td class="num ${pl.net_margin < 0 ? 'down' : ''}">${pl.net_margin}%</td></tr>
    <tr><td>부채비율</td><td class="num">${bs.debt_ratio}%</td></tr>
    <tr><td>유동비율</td><td class="num">${bs.current_ratio}%</td></tr>`;

  // P&L 요약 테이블
  const rows = [
    { label: '매출액',    cur: pl.revenue,          prev: pl.revenue_prev },
    { label: '매출원가',  cur: null,                prev: null,           note: '(P&L 상세 탭 참조)' },
    { label: '매출총이익', cur: pl.gross_profit,    prev: pl.gross_profit_prev,     hl: true },
    { label: '판매비와관리비', cur: null,           prev: null,           note: '(P&L 상세 탭 참조)' },
    { label: '영업이익',  cur: pl.operating_income, prev: pl.operating_income_prev, hl: true },
    { label: '기타수익 / 금융수익', cur: null,      prev: null,           note: '(P&L 상세 탭 참조)' },
    { label: '제조원가 / 기타비용 / 법인세', cur: null, prev: null,       note: '(P&L 상세 탭 참조)' },
    { label: '당기순이익', cur: pl.net_income,      prev: pl.net_income_prev,       hl: true },
  ];
  document.getElementById('plSummaryBody').innerHTML = rows.map(r => {
    if (r.cur == null) return `<tr><td>${r.label}</td><td colspan="4" class="num" style="color:#bbb">${r.note||''}</td></tr>`;
    const chg = r.cur - r.prev;
    const p   = diffPct(r.cur, r.prev);
    return `<tr class="${r.hl ? 'highlight' : ''}">
      <td>${r.label}</td>
      <td class="num">${fmtM(r.cur)}</td>
      <td class="num">${fmtM(r.prev)}</td>
      <td class="num ${numCls(chg)}">${fmtM(chg)}</td>
      <td class="num ${pctCls(p)}">${pctStr(p)}</td>
    </tr>`;
  }).join('');
}

// ─────────────────────────────────────────────────────────────────────────────
// ── P&L Trend ────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
function renderPLTrend(trend) {
  const cur  = trend.filter(d => d.year === selYear);
  const prev = trend.filter(d => d.year === selYear - 1);
  const prevMap = Object.fromEntries(prev.map(d => [d.month, d]));

  const labels   = cur.map(d => `${d.month}월`);
  const rev25    = cur.map(d => d.revenue);
  const rev24    = cur.map(d => (prevMap[d.month] || {}).revenue || 0);
  const cogs     = cur.map(d => d.cogs);
  const gross    = cur.map(d => d.gross_profit);
  const op       = cur.map(d => d.operating_income);

  document.getElementById('plTrendDesc').textContent =
    `월별 손익 추이 (${selYear}년 1월 ~ ${selMonth}월)`;

  makeBar('chartRevenue', [
    { label: String(selYear),   data: rev25, backgroundColor: C_OBG,              borderColor: C_ORANGE, borderWidth: 2, borderRadius: 4 },
    { label: String(selYear-1), data: rev24, backgroundColor: 'rgba(180,180,180,0.2)', borderColor: C_GRAY, borderWidth: 2, borderRadius: 4 },
  ], labels);

  makeBar('chartCost', [
    { label: '매출원가', data: cogs, backgroundColor: 'rgba(180,180,180,0.3)', borderColor: C_GRAY, borderWidth: 2, borderRadius: 4 },
  ], labels);

  makeBar('chartGross', [
    { label: '매출총이익', data: gross, backgroundColor: C_GBG, borderColor: C_GREEN, borderWidth: 2, borderRadius: 4 },
  ], labels);

  makeBar('chartOp', [
    { label: '영업이익', data: op, backgroundColor: C_BBG, borderColor: C_BLUE, borderWidth: 2, borderRadius: 4 },
  ], labels);
}

// ─────────────────────────────────────────────────────────────────────────────
// ── P&L Detail ───────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
function renderPLDetail(pl, plPrev) {
  const L = pl;
  const P = plPrev || {};

  document.getElementById('plDetailDesc').textContent =
    `${selYear}년 ${selMonth}월 YTD · 당기 vs 전기 동기`;

  // P&L 라인 정의 (표시 순서)
  const structure = [
    { section: '수 익' },
    { key: '매출액',         isRev: true },
    { key: '기타수익',       isRev: true },
    { key: '금융수익',       isRev: true },
    { section: '원 가' },
    { key: '매출원가',       isExp: true },
    { subtotal: '매출총이익', cur: L['매출총이익'], prev: P['매출총이익'] },
    { section: '판매비와관리비' },
    { key: '판매비와관리비',  isExp: true },
    { subtotal: '영업이익',   cur: L['영업이익'],   prev: P['영업이익'] },
    { section: '영업외 항목' },
    { key: '기타수익',       skip: true },  // 위에서 이미 처리
    { key: '기타비용',       isExp: true },
    { key: '금융비용',       isExp: true },
    { key: '제조원가',       isExp: true },
    { section: '법인세' },
    { key: '법인세비용',     isExp: true },
    { subtotal: '당기순이익', cur: L['당기순이익'], prev: P['당기순이익'] },
  ];

  // 간결하게 직접 구성
  const items = [
    { section: '수 익' },
    { label: '매출액',           cur: L['매출액'],          prev: P['매출액'] },
    { label: '기타수익',         cur: L['기타수익'],        prev: P['기타수익'], indent: true },
    { label: '금융수익',         cur: L['금융수익'],        prev: P['금융수익'], indent: true },
    { section: '원 가' },
    { label: '매출원가',         cur: L['매출원가'],        prev: P['매출원가'] },
    { hl: true, label: '매출총이익', cur: L['매출총이익'], prev: P['매출총이익'] },
    { section: '판매비와관리비' },
    { label: '판매비와관리비',   cur: L['판매비와관리비'], prev: P['판매비와관리비'] },
    { hl: true, label: '영업이익',   cur: L['영업이익'],   prev: P['영업이익'] },
    { section: '영업외 수익' },
    { label: '기타수익',         cur: L['기타수익'],        prev: P['기타수익'], indent: true },
    { label: '금융수익',         cur: L['금융수익'],        prev: P['금융수익'], indent: true },
    { section: '영업외 비용 / 기타 원가' },
    { label: '제조원가',         cur: L['제조원가'],        prev: P['제조원가'], indent: true },
    { label: '기타비용',         cur: L['기타비용'],        prev: P['기타비용'], indent: true },
    { label: '금융비용',         cur: L['금융비용'],        prev: P['금융비용'], indent: true },
    { section: '법인세' },
    { label: '법인세비용',       cur: L['법인세비용'],      prev: P['법인세비용'] },
    { hl: true, label: '당기순이익', cur: L['당기순이익'], prev: P['당기순이익'] },
  ];

  document.getElementById('plDetailBody').innerHTML = items.map(r => {
    if (r.section) return `<tr class="row-section"><td colspan="5">${r.section}</td></tr>`;
    const chg  = (r.cur || 0) - (r.prev || 0);
    const p    = diffPct(r.cur, r.prev);
    const hCls = r.hl ? 'highlight' : '';
    const tCls = r.indent ? 'indent' : '';
    return `<tr class="${hCls}">
      <td class="${tCls}">${r.label}</td>
      <td class="num">${fmt(r.cur)}</td>
      <td class="num">${fmt(r.prev)}</td>
      <td class="num ${numCls(chg)}">${fmt(chg)}</td>
      <td class="num ${pctCls(p)}">${pctStr(p)}</td>
    </tr>`;
  }).join('');
}

// ─────────────────────────────────────────────────────────────────────────────
// ── B/S Summary ──────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
function renderBSSummary(bs, bsPrev) {
  document.getElementById('bsDesc').textContent =
    `${selYear}년 ${selMonth}월 말 기준 재무상태표`;

  const kpis = [
    { label: '총자산', cur: bs.total_assets, prev: bsPrev.total_assets },
    { label: '총부채', cur: bs.total_liab,   prev: bsPrev.total_liab },
    { label: '자본',   cur: bs.total_equity, prev: bsPrev.total_equity },
  ];
  document.getElementById('bsKpiGrid').innerHTML = kpis.map(k => {
    const p = diffPct(k.cur, k.prev);
    return `<div class="kpi-card">
      <span class="kpi-label">${k.label}</span>
      <span class="kpi-value">${fmtM(k.cur)}</span>
      <div class="kpi-compare">
        <span class="kpi-prev">전기 ${fmtM(k.prev)}</span>
        <span class="kpi-change ${pctCls(p)}">${pctStr(p)}</span>
      </div>
    </div>`;
  }).join('');
}

// ─────────────────────────────────────────────────────────────────────────────
// ── B/S Charts ───────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
function renderBSCharts(bsTrend) {
  const labels = bsTrend.map(d => d.label);
  const assets = bsTrend.map(d => d.total_assets);
  const liab   = bsTrend.map(d => d.total_liab);
  const equity = bsTrend.map(d => d.total_equity);

  makeLine('chartAssets', [
    { label: '자산', data: assets, borderColor: C_ORANGE, backgroundColor: C_OBG, borderWidth: 2, fill: true, tension: 0.3, pointRadius: 4, pointBackgroundColor: C_ORANGE },
  ], labels);

  makeLine('chartLiab', [
    { label: '부채', data: liab,   borderColor: C_RED,  backgroundColor: C_RBG, borderWidth: 2, fill: true, tension: 0.3, pointRadius: 4, pointBackgroundColor: C_RED },
    { label: '자본', data: equity, borderColor: C_BLUE, backgroundColor: C_BBG, borderWidth: 2, fill: true, tension: 0.3, pointRadius: 4, pointBackgroundColor: C_BLUE },
  ], labels);
}

// ─────────────────────────────────────────────────────────────────────────────
// ── B/S Detail ───────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
function renderBSDetail(bs, bsPrev) {
  document.getElementById('bsDetailDesc').textContent =
    `${selYear}년 ${selMonth}월 말 기준 재무상태표 상세`;

  const subs     = bs.subtotals     || {};
  const subsPrev = bsPrev ? (bsPrev.subtotals || {}) : {};

  const order = ['유동자산', '비유동자산', '유동부채', '비유동부채', '자본'];
  const secOf = { '유동자산': '자산', '비유동자산': '자산', '유동부채': '부채', '비유동부채': '부채', '자본': '자본' };
  let lastSec = '';
  const rows = [];

  for (const g of order) {
    const grp  = subs[g];
    if (!grp) continue;
    const sec = secOf[g];
    if (sec !== lastSec) { rows.push({ section: sec }); lastSec = sec; }

    const cp   = subsPrev[g] || {};
    const cur  = grp.total;
    const prev = cp.total || 0;
    rows.push({ label: g, sub: true, cur, prev, chg: cur - prev });

    for (const [acct, val] of Object.entries(grp.accounts || {})) {
      const vPrev = cp.accounts ? (cp.accounts[acct] || 0) : 0;
      rows.push({ label: acct, cur: val, prev: vPrev, chg: val - vPrev, indent: true });
    }
  }

  // 자본 추가 (당기순이익 YTD)
  rows.push({ label: '당기순이익 (누적 YTD)', cur: bs.net_income_ytd, prev: bsPrev ? bsPrev.net_income_ytd : 0, chg: bs.net_income_ytd - (bsPrev ? bsPrev.net_income_ytd : 0), indent: true });
  rows.push({ label: '자본 합계 (순자산)',    sub: true, cur: bs.total_equity, prev: bsPrev ? bsPrev.total_equity : 0, chg: bs.total_equity - (bsPrev ? bsPrev.total_equity : 0) });

  document.getElementById('bsDetailBody').innerHTML = rows.map(r => {
    if (r.section) return `<tr class="row-section"><td colspan="4">${r.section}</td></tr>`;
    const trCls = r.sub ? 'row-sub' : '';
    const tdCls = r.indent ? 'indent' : '';
    const cCls  = numCls(r.chg);
    return `<tr class="${trCls}">
      <td class="${tdCls}">${r.label}</td>
      <td class="num">${fmt(r.cur)}</td>
      <td class="num">${fmt(r.prev)}</td>
      <td class="num ${cCls}">${fmt(r.chg)}</td>
    </tr>`;
  }).join('');
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Journal ──────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
function renderJournal(jData) {
  document.getElementById('journalDesc').textContent =
    `전체 전표수: ${(jData.total_vouchers||0).toLocaleString('ko-KR')}건 · ` +
    `전체 라인수: ${(jData.total_entries||0).toLocaleString('ko-KR')}건`;

  const monthly = (jData.monthly || []).filter(d => d['연도'] === selYear);
  const labels  = monthly.map(d => `${d['월']}월`);
  const counts  = monthly.map(d => d['voucher_count']);

  destroy('chartJournal');
  charts['chartJournal'] = new Chart(document.getElementById('chartJournal'), {
    type: 'bar',
    data: { labels, datasets: [{ label: '전표 건수', data: counts, backgroundColor: C_OBG, borderColor: C_ORANGE, borderWidth: 2, borderRadius: 4 }] },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { x: xAxis(), y: yAxisCnt() },
    },
  });

  // 월별 집계 테이블
  document.getElementById('journalBody').innerHTML = monthly.map(d =>
    `<tr>
      <td>${d['연도']}-${String(d['월']).padStart(2,'0')}</td>
      <td>월별 집계</td>
      <td>전체</td>
      <td>-</td>
      <td class="num">${d['voucher_count'].toLocaleString('ko-KR')}건</td>
      <td>-</td>
    </tr>`
  ).join('') || '<tr class="loading-row"><td colspan="6">데이터 없음</td></tr>';
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Exceptions ───────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
function renderExceptions(exc) {
  const col6 = (rows, cols) => rows.length
    ? rows.map(r => `<tr>${cols.map(c => `<td class="${c.cls||''}">${c.fn ? c.fn(r) : (r[c.key]||'-')}</td>`).join('')}</tr>`).join('')
    : `<tr><td colspan="${cols.length}" style="color:#aaa;text-align:center">해당 없음</td></tr>`;

  // exc1
  document.getElementById('exc1Body').innerHTML = col6(exc.exc1_large||[], [
    { key: '일자' }, { key: '전표식별번호' }, { key: '관리계정' }, { key: '거래처' },
    { key: '금액', cls: 'num', fn: r => fmt(r['금액']) }, { key: '차대' },
  ]);

  // exc2
  document.getElementById('exc2Body').innerHTML = col6(exc.exc2_weekend||[], [
    { key: '일자' }, { key: '전표식별번호' }, { key: '관리계정' }, { key: '거래처' },
    { key: '금액', cls: 'num', fn: r => fmt(r['금액']) }, { key: '차대' },
  ]);

  // exc3
  document.getElementById('exc3Body').innerHTML = col6(exc.exc3_repeat||[], [
    { key: '거래처' },
    { key: '금액',   cls: 'num', fn: r => fmt(r['금액']) },
    { key: 'count', cls: 'num' },
    { key: 'last_voucher' },
    { key: 'last_date' },
  ]);

  // exc4
  document.getElementById('exc4Body').innerHTML = col6(exc.exc4_unmatched||[], [
    { key: '일자' }, { key: '전표식별번호' }, { key: '관리계정' }, { key: '거래처' },
    { key: '금액', cls: 'num', fn: r => fmt(r['금액']) }, { key: '차대' },
  ]);

  // exc5
  document.getElementById('exc5Body').innerHTML = col6(exc.exc5_outstanding||[], [
    { key: '일자' }, { key: '전표식별번호' }, { key: '관리계정' }, { key: '거래처' },
    { key: '금액', cls: 'num', fn: r => fmt(r['금액']) }, { key: '차대' },
    { key: 'age_days', cls: 'num', fn: r => (r['age_days']||0) + '일' },
  ]);

  // exc6
  document.getElementById('exc6Body').innerHTML = col6(exc.exc6_seldom||[], [
    { key: '관리계정' },
    { key: 'count', cls: 'num' },
    { key: 'last_date' },
    { key: 'last_voucher' },
    { key: 'total_amount', cls: 'num', fn: r => fmt(r['total_amount']) },
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Main Load ────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
async function loadAll() {
  document.getElementById('reportMeta').textContent = '데이터 로딩 중…';

  try {
    const [summary, plTrend, bsTrend, pl, plPrev, bs, bsPrev, journal, exc] = await Promise.all([
      api(`${API_BASE}/summary?year=${selYear}&month=${selMonth}`),
      api(`${API_BASE}/pl/trend`),
      api(`${API_BASE}/bs/trend`),
      api(`${API_BASE}/pl?year=${selYear}&month=${selMonth}&ytd=true`),
      api(`${API_BASE}/pl?year=${selYear-1}&month=${selMonth}&ytd=true`),
      api(`${API_BASE}/bs?year=${selYear}&month=${selMonth}`),
      api(`${API_BASE}/bs?year=${selYear-1}&month=12`),
      api(`${API_BASE}/journal`),
      api(`${API_BASE}/exceptions`),
    ]);

    document.getElementById('reportMeta').textContent =
      `ABC Company · ${selYear}년 ${selMonth}월 YTD · 전기 동기 대비`;

    renderSummary(summary);
    renderPLTrend(plTrend);
    renderPLDetail(pl, plPrev);
    renderBSSummary(bs, bsPrev);
    renderBSCharts(bsTrend);
    renderBSDetail(bs, bsPrev);
    renderJournal(journal);
    renderExceptions(exc);

  } catch (err) {
    document.getElementById('reportMeta').innerHTML =
      `<span style="color:#c62828">⚠ Flask 서버 연결 실패 — 터미널에서 <code>python app.py</code> 실행 후 새로고침</span>`;
    console.error(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 탭 전환
// ─────────────────────────────────────────────────────────────────────────────
document.querySelectorAll('.rtab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.rtab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.rtab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

document.querySelectorAll('.etab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.etab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.etab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('etab-' + btn.dataset.etab).classList.add('active');
  });
});

// 조회 버튼
document.getElementById('btnRefresh').addEventListener('click', () => {
  selYear  = parseInt(document.getElementById('selYear').value);
  selMonth = parseInt(document.getElementById('selMonth').value);
  loadAll();
});

loadAll();

})();
