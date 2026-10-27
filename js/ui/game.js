/**
 * ui/game.js — 成就中心(#/game 中心页,#/game/<slug> 按分类直接开局)
 * 答题闯关:随机抽 15 题成一局,即时判分 + 解析展开,答对 ≥12 晋级一级;
 * 等级链:见习学员→飞行学员→副驾驶→机长→五星机长(存 cav3d.pilotRank)。
 * 收集仪表盘:涂装/部件/机场/词条四条进度条;徽章墙 10 枚,新成就右上角 toast 3 秒。
 * 徽章引擎集中本模块:BADGES 数组 + checkAchievements()(导出,供 viewer/wiki/hangar 补检)。
 * 本模块不 import three,保持纯 DOM 轻量。
 */
import { storeGet, storeSet, storeUpdate } from '../core/store.js';

/* ---------- 常量 ---------- */

export const RANKS = ['见习学员', '飞行学员', '副驾驶', '机长', '五星机长'];

/* 答题分类 slug → quiz.json 的 category(null = 综合全库) */
const SLUG_CAT = {
  principle: '原理',
  systems: '系统与结构',
  'ops-nav': '运行与导航',
  safety: '安全',
  'history-airport': '历史与机场',
  all: null,
};

const ROUND_SIZE = 15;   // 每局题数
const PASS_N = 12;       // 晋级线
const RANK_MAX = 4;      // 五星机长

/* 部件总数为 30(parts.json,P3 验收);不 import parts.js 以免引入 three 依赖 */
const PARTS_TOTAL = 30;

/* ---------- 数据加载(模块级缓存) ---------- */

function loadJson(path) {
  return fetch(new URL(path, import.meta.url)).then((r) => r.json());
}
let quizCache = null;
const loadQuiz = () => (quizCache ??= loadJson('../../data/quiz.json'));

let totalsP = null;
/** 收集统计基数:变体/涂装数从 liveries.json 计算,机场/词条从各自数据文件,部件为常量 */
function getTotals() {
  if (!totalsP) {
    totalsP = Promise.all([
      loadJson('../../data/liveries.json'),
      loadJson('../../data/airports.json'),
      loadJson('../../data/wiki.json'),
    ]).then(([lv, ap, wk]) => ({
      variants: [...new Set(lv.liveries.map((l) => l.variant))].length,
      liveries: lv.liveries.length,
      airports: ap.airports.length,
      wiki: wk.length,
      parts: PARTS_TOTAL,
    }));
  }
  return totalsP;
}

/* ---------- 徽章引擎(集中定义,判定统一走 store) ---------- */

const BADGE_ICONS = {
  'first-flight': '<path d="M3 12 L21 4 L14 21 L11 13 Z"/><path d="M11 13 L21 4"/>',
  'all-variants': '<path d="M2 12 C6 6 18 6 22 12 C18 18 6 18 2 12 Z"/><circle cx="12" cy="12" r="3"/>',
  'livery-collector': '<circle cx="12" cy="12" r="9"/><circle cx="9" cy="9" r="1.4" class="f"/><circle cx="15" cy="9" r="1.4" class="f"/><circle cx="8.5" cy="14" r="1.4" class="f"/>',
  'parts-engineer': '<circle cx="12" cy="12" r="4"/><path d="M12 3 V7 M12 17 V21 M3 12 H7 M17 12 H21 M6 6 L9 9 M15 15 L18 18 M18 6 L15 9 M9 15 L6 18"/>',
  'airport-pro': '<path d="M7 21 L7 8 L17 8 L17 21"/><path d="M5 8 L12 3 L19 8"/><path d="M10 21 L10 16 L14 16 L14 21"/>',
  'wiki-master': '<path d="M4 6 C4 4 6 4 8 4 L20 4 L20 18 L8 18 C6 18 4 18 4 20 Z"/><path d="M8 8 L16 8 M8 12 L14 12"/>',
  'first-promo': '<path d="M12 3 L19 10 L15 10 L15 21 L9 21 L9 10 L5 10 Z"/>',
  'five-star': '<path d="M12 3 L14.5 9 L21 9.5 L16 13.5 L17.8 20 L12 16.4 L6.2 20 L8 13.5 L3 9.5 L9.5 9 Z"/>',
  'night-owl': '<path d="M20 13 A8 8 0 1 1 11 4 A6.5 6.5 0 0 0 20 13 Z"/>',
  'em-demo': '<path d="M9 4 H15 V9 H20 V15 H15 V20 H9 V15 H4 V9 H9 Z"/>',
};

const BADGES = [
  { id: 'first-flight',     name: '首航',         desc: '首次进入任一机型页',   test: (t, s) => s.seenVariants.length >= 1 },
  { id: 'all-variants',     name: '全机型鉴赏家', desc: '',                     test: (t, s) => s.seenVariants.length >= t.variants, dyn: (t) => `${t.variants} 机型全看过` },
  { id: 'livery-collector', name: '涂装收藏家',   desc: '',                     test: (t, s) => s.seenLiveries.length >= t.liveries, dyn: (t) => `点亮 ${t.liveries} 款涂装` },
  { id: 'parts-engineer',   name: '部件工程师',   desc: '',                     test: (t, s) => s.exploredParts.length >= t.parts,   dyn: (t) => `部件探索 ${t.parts}/${t.parts}` },
  { id: 'airport-pro',      name: '机场通',       desc: '',                     test: (t, s) => s.seenAirports.length >= t.airports, dyn: (t) => `机场图鉴 ${t.airports}/${t.airports}` },
  { id: 'wiki-master',      name: '百科全书',     desc: '',                     test: (t, s) => s.readWiki.length >= Math.min(30, t.wiki), dyn: (t) => `词条阅读 ${Math.min(30, t.wiki)}+` },
  { id: 'first-promo',      name: '初出茅庐',     desc: '通过第 1 次晋级考试',  test: (t, s) => s.pilotRank >= 1 },
  { id: 'five-star',        name: '五星机长',     desc: '答题等级满级',         test: (t, s) => s.pilotRank >= RANK_MAX },
  { id: 'night-owl',        name: '夜航体验',     desc: '触发任一夜航模式',     test: (t, s) => !!s.nightUsed },
  { id: 'em-demo',          name: '云端乘客',     desc: '进入任一机型客舱漫游', test: (t, s) => !!s.emDemo },
];

function collectState() {
  return {
    seenVariants: storeGet('seenVariants', []) || [],
    seenLiveries: storeGet('seenLiveries', []) || [],
    exploredParts: storeGet('exploredParts', []) || [],
    seenAirports: storeGet('seenAirports', []) || [],
    readWiki: storeGet('readWiki', []) || [],
    pilotRank: storeGet('pilotRank', 0) || 0,
    nightUsed: !!storeGet('nightUsed', false),
    emDemo: !!storeGet('emDemo', false),
  };
}

/** 成就 toast(右上角 3 秒) */
function showToast(msg) {
  let wrap = document.querySelector('.toast-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'toast-wrap';
    document.body.appendChild(wrap);
  }
  const el = document.createElement('div');
  el.className = 'toast achieve';
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => { el.classList.add('leaving'); setTimeout(() => el.remove(), 320); }, 3000);
}

/**
 * 全量补检成就:达成即写入 cav3d.badges 并逐枚 toast。
 * 导出供 viewer(进机型页/夜航/换装)、wiki(读词条)、hangar(加载补检)调用。
 * @returns {Promise<string[]>} 本次新达成的徽章 id
 */
export async function checkAchievements() {
  const totals = await getTotals();
  const st = collectState();
  const earned = new Set(storeGet('badges', []) || []);
  const fresh = [];
  for (const b of BADGES) {
    if (earned.has(b.id)) continue;
    try { if (b.test(totals, st)) fresh.push(b.id); } catch { /* 单枚判定异常不阻断其余 */ }
  }
  if (fresh.length) {
    storeUpdate('badges', (arr) => [...new Set([...(arr || []), ...fresh])], []);
    for (const id of fresh) showToast(`成就达成:${BADGES.find((b) => b.id === id).name}`);
  }
  return fresh;
}

/* ---------- 页面 ---------- */

export function render(container, params) {
  const slug = (params?.segments?.[1] || '').trim();
  const autoSlug = Object.prototype.hasOwnProperty.call(SLUG_CAT, slug) ? slug : null;

  container.innerHTML = `
  <div class="container">
    <section class="page-head">
      <h2 class="section-title">成就中心
        <span class="sub">GAME · 答题闯关 / 收集仪表盘 / 徽章墙</span>
      </h2>
    </section>
    <div id="g-hub"></div>
    <div id="g-quiz"></div>
  </div>`;

  const hubEl = container.querySelector('#g-hub');
  const quizEl = container.querySelector('#g-quiz');
  let disposed = false;

  /* ---- 中心页(仪表盘 + 等级 + 徽章墙 + 开局入口) ---- */
  Promise.all([getTotals(), loadQuiz()]).then(([totals]) => {
    if (disposed) return;
    renderHub(hubEl, totals);
    /* 从百科"去答题(本分类)"等入口带 slug 进入:直接开局 */
    if (autoSlug) startRound(autoSlug);
    /* 全量补检(部件/机场等在别处打卡、页内刷新不掉的徽章在此触发 toast) */
    checkAchievements().catch(() => {});
  }).catch((err) => {
    console.error('[game] 数据加载失败:', err);
    hubEl.innerHTML = `<div class="viewer-error glass-card">成就中心数据加载失败,请刷新重试。</div>`;
  });

  /* ---- 答题闯关 ---- */
  let round = null; // { pool, idx, correct, wrong[], cat }

  function startRound(slugKey) {
    loadQuiz().then((quiz) => {
      const cat = SLUG_CAT[slugKey] ?? null;
      const pool = shuffle(quiz.filter((q) => !cat || q.category === cat)).slice(0, ROUND_SIZE);
      if (!pool.length) { showToast('该分类暂无题目', 'warn'); return; }
      round = { pool, idx: 0, correct: 0, wrong: [], cat };
      renderQuestion();
      quizEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }).catch((err) => console.error('[game] 题库加载失败:', err));
  }

  function renderQuestion() {
    const q = round.pool[round.idx];
    quizEl.innerHTML = `
    <section class="g-quiz glass-card hud-frame anim-fade-up">
      <div class="g-quiz-top">
        <span class="v-chip">${round.cat ? `分类闯关 · ${round.cat}` : '综合闯关'}</span>
        <span class="v-chip">第 ${round.idx + 1} / ${round.pool.length} 题</span>
        <span class="v-chip">答对 ${round.correct}</span>
        <span class="spacer"></span>
        <button class="btn btn-ghost btn-sm" id="g-quit">退出本局</button>
      </div>
      <div class="g-qbar"><i style="width:${(round.idx / round.pool.length) * 100}%"></i></div>
      <h3 class="g-q">${q.q}</h3>
      <div class="g-opts" id="g-opts">
        ${q.options.map((o, i) => `<button class="g-opt" type="button" data-i="${i}">${String.fromCharCode(65 + i)}. ${o}</button>`).join('')}
      </div>
      <div class="g-explain" id="g-explain" hidden>
        <div class="g-explain-verdict" id="g-verdict"></div>
        <p>${q.explain}</p>
        <button class="btn btn-primary" id="g-next">${round.idx + 1 >= round.pool.length ? '查看成绩 →' : '下一题 →'}</button>
      </div>
    </section>`;

    quizEl.querySelector('#g-quit').addEventListener('click', () => { round = null; quizEl.innerHTML = ''; });
    const optsEl = quizEl.querySelector('#g-opts');
    const explainEl = quizEl.querySelector('#g-explain');
    const verdictEl = quizEl.querySelector('#g-verdict');

    optsEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.g-opt');
      if (!btn || optsEl.dataset.locked) return;
      optsEl.dataset.locked = '1';
      const pick = Number(btn.dataset.i);
      const ok = pick === q.answer;
      if (ok) round.correct++; else round.wrong.push(q);
      optsEl.querySelectorAll('.g-opt').forEach((b) => {
        const i = Number(b.dataset.i);
        if (i === q.answer) b.classList.add('right');
        else if (i === pick) b.classList.add('wrong');
        b.disabled = true;
      });
      verdictEl.textContent = ok ? `✓ 答对了` : `✗ 答错了,正确答案:${String.fromCharCode(65 + q.answer)}`;
      verdictEl.classList.add(ok ? 'ok' : 'no');
      explainEl.hidden = false;
    });
    quizEl.querySelector('#g-next').addEventListener('click', () => {
      round.idx++;
      if (round.idx >= round.pool.length) renderResult();
      else renderQuestion();
    });
  }

  function renderResult() {
    const n = round.pool.length;
    const passed = round.correct >= PASS_N;
    const prevRank = storeGet('pilotRank', 0) || 0;
    let promoted = null;
    if (passed && prevRank < RANK_MAX) {
      storeSet('pilotRank', prevRank + 1);
      promoted = prevRank + 1;
    }
    checkAchievements().catch(() => {}); // 初出茅庐 / 五星机长

    const wrongHtml = round.wrong.length ? `
      <h4>错题回顾(${round.wrong.length})</h4>
      ${round.wrong.map((q) => `
        <div class="g-wrong">
          <p class="g-wrong-q">${q.q}</p>
          <p class="g-wrong-a">正确答案:${String.fromCharCode(65 + q.answer)}. ${q.options[q.answer]}</p>
          <p class="g-wrong-e">${q.explain}</p>
        </div>`).join('')}`
      : '<h4>全对,一题未失,漂亮!</h4>';

    quizEl.innerHTML = `
    <section class="g-quiz glass-card hud-frame anim-fade-up">
      <div class="g-score ${passed ? 'pass' : 'fail'}">
        <div class="g-score-n">${round.correct}<span> / ${n}</span></div>
        <div class="g-score-verdict">${passed ? '考核通过' : '未达晋级线'} · ${passed && promoted !== null ? `晋升「${RANKS[promoted]}」` : passed ? `保持「${RANKS[prevRank]}」` : '答对 ≥12 题即可晋级,再战一局'}</div>
        ${promoted !== null ? `<div class="g-promote">等级提升:${RANKS[prevRank]} → ${RANKS[promoted]}</div>` : ''}
      </div>
      <div class="g-review">${wrongHtml}</div>
      <div class="g-detail-foot">
        <button class="btn btn-ghost btn-sm" id="g-again">再来一局</button>
        <button class="btn btn-primary" id="g-back">返回成就中心</button>
      </div>
    </section>`;

    quizEl.querySelector('#g-again').addEventListener('click', () => startRound(round.cat ? Object.keys(SLUG_CAT).find((k) => SLUG_CAT[k] === round.cat) : 'all'));
    quizEl.querySelector('#g-back').addEventListener('click', () => {
      round = null; quizEl.innerHTML = '';
      getTotals().then((t) => { if (!disposed) renderHub(hubEl, t); });
    });
  }

  /* ---- 中心页渲染(等级卡 / 仪表盘 / 徽章墙 / 开局入口) ---- */
  function renderHub(hub, totals) {
    const st = collectState();
    const rank = st.pilotRank;
    const stars = rank === RANK_MAX ? 5 : rank;

    /* 四条收集进度(总数按真实数据文件计算) */
    const bars = [
      { label: '涂装图鉴', v: st.seenLiveries.length, max: totals.liveries, href: '#/hangar' },
      { label: '部件探索', v: st.exploredParts.length, max: totals.parts, href: '#/hangar' },
      { label: '机场图鉴', v: st.seenAirports.length, max: totals.airports, href: '#/airports' },
      { label: '词条阅读', v: st.readWiki.length, max: totals.wiki, href: '#/wiki' },
    ];

    const earned = new Set(storeGet('badges', []) || []);
    const badgeTiles = BADGES.map((b) => {
      const on = earned.has(b.id);
      const desc = b.dyn ? b.dyn(totals) : b.desc;
      return `
      <div class="g-badge ${on ? 'on' : ''}" title="${desc}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${BADGE_ICONS[b.id]}</svg>
        <b>${b.name}</b>
        <span>${desc}</span>
        ${on ? '<i class="g-badge-flag">已达成</i>' : '<i class="g-badge-flag dim">未达成</i>'}
      </div>`;
    }).join('');

    hub.innerHTML = `
    <div class="g-top">
      <div class="g-rank glass-card hud-frame anim-fade-up">
        <div class="g-rank-label">当前等级</div>
        <div class="g-rank-name">${RANKS[rank]}</div>
        <div class="g-rank-stars">${'★'.repeat(stars) || '—'}${'<i>★</i>'.repeat(5 - stars)}</div>
        <p class="g-rank-tip">${rank < RANK_MAX
          ? `任意一局答对 ≥${PASS_N} 题,即晋升「${RANKS[rank + 1]}」`
          : '已达最高等级,传奇机长!'}</p>
      </div>
      <div class="g-dash glass-card anim-fade-up anim-delay-1">
        <h3>收集仪表盘</h3>
        ${bars.map((b) => `
          <a class="g-bar-row" href="${b.href}">
            <span class="g-bar-label">${b.label}</span>
            <span class="g-bar"><i style="width:${Math.min(100, (b.v / b.max) * 100)}%"></i></span>
            <span class="g-bar-n">${b.v}/${b.max}</span>
          </a>`).join('')}
      </div>
    </div>

    <section class="g-start glass-card anim-fade-up">
      <h3>答题闯关 <span class="v-chip">每局 ${ROUND_SIZE} 题 · 答对 ≥${PASS_N} 晋级</span></h3>
      <div class="g-cat-row">
        <button class="btn btn-primary" data-slug="all">综合闯关</button>
        ${Object.entries(SLUG_CAT).filter(([k]) => k !== 'all').map(([k, c]) => `
          <button class="btn btn-ghost" data-slug="${k}">${c}</button>`).join('')}
      </div>
    </section>

    <section class="g-badges anim-fade-up">
      <h2 class="section-title">徽章墙 <span class="sub">BADGES · ${earned.size} / ${BADGES.length} 已点亮</span></h2>
      <div class="g-badge-wall">${badgeTiles}</div>
    </section>`;

    hub.querySelectorAll('[data-slug]').forEach((btn) => {
      btn.addEventListener('click', () => startRound(btn.dataset.slug));
    });
  }

  return () => { disposed = true; };
}

/* ---------- 工具 ---------- */

/** Fisher-Yates 洗牌(返回新数组) */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
