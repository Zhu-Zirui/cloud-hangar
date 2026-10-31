/**
 * ui/wiki.js — 民航百科(#/wiki 列表,#/wiki/<id> 词条详情)
 * 六分类侧栏 + 搜索 + 词条卡片;详情页含正文/标签/参见胶囊/"去答题(本分类)"。
 * 阅读即打卡:进词条详情写 cav3d.readWiki,并触发成就补检(徽章 toast)。
 */
import { storeUpdate, storeGet } from '../core/store.js';
import { favChipHTML, bindFavChips } from '../core/favs.js';
import { checkAchievements } from './game.js';

/* wiki 六分类 → 答题分类 slug(game 页路由 #/game/<slug>;"旅客与旅行"并入综合) */
export const CAT_SLUGS = {
  '飞行原理': 'principle',
  '结构与系统': 'systems',
  '导航与运行': 'ops-nav',
  '飞行安全': 'safety',
  '历史与国产民机': 'history-airport',
  '旅客与旅行': 'all',
};
const CAT_ORDER = Object.keys(CAT_SLUGS);

/* 模块级缓存:整个会话只 fetch 一次 */
let dataCache = null;
function loadWiki() {
  if (!dataCache) {
    dataCache = fetch(new URL('../../data/wiki.json', import.meta.url))
      .then((r) => r.json());
  }
  return dataCache;
}

export function render(container, params) {
  const entryId = (params?.segments?.[1] || '').trim();
  if (entryId) return renderDetail(container, entryId);
  return renderList(container);
}

/* ---------- 列表页 ---------- */

function renderList(container) {
  container.innerHTML = `
  <div class="container">
    <section class="page-head">
      <h2 class="section-title">民航百科
        <span class="sub">WIKI · 40 词条 · 涵盖原理 / 系统 / 运行 / 安全 / 历史 / 旅行</span>
      </h2>
    </section>
    <div class="w-layout">
      <aside class="w-side glass-card">
        <div class="w-cats" id="w-cats"></div>
        <div class="w-progress" id="w-progress"></div>
      </aside>
      <div class="w-main">
        <div class="w-toolbar glass-card">
          <input type="search" id="w-search" class="w-search" placeholder="搜索词条 / 标签 / 正文…" autocomplete="off">
          <span class="v-chip" id="w-count"></span>
        </div>
        <div class="w-grid" id="w-grid">
          <div class="v-loading" style="grid-column:1/-1;position:static;padding:40px 0"><div class="ring"></div>加载词条…</div>
        </div>
      </div>
    </div>
  </div>`;

  let state = { cat: '全部', kw: '' };
  let entries = [];

  const catsEl = container.querySelector('#w-cats');
  const gridEl = container.querySelector('#w-grid');
  const countEl = container.querySelector('#w-count');
  const searchEl = container.querySelector('#w-search');
  const progEl = container.querySelector('#w-progress');

  catsEl.innerHTML = ['全部', ...CAT_ORDER].map((c) => `
    <button class="w-cat" type="button" data-cat="${c}">${c}
      <span class="w-cat-n" data-n="${c}"></span>
    </button>`).join('');

  catsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.w-cat');
    if (!btn) return;
    state.cat = btn.dataset.cat;
    catsEl.querySelectorAll('.w-cat').forEach((b) => b.classList.toggle('on', b === btn));
    applyFilter();
  });

  const onSearch = () => { state.kw = searchEl.value.trim().toLowerCase(); applyFilter(); };
  searchEl.addEventListener('input', onSearch);

  function applyFilter() {
    const kw = state.kw;
    const list = entries.filter((x) => {
      if (state.cat !== '全部' && x.category !== state.cat) return false;
      if (!kw) return true;
      return (x.title + x.tags.join('') + x.body).toLowerCase().includes(kw);
    });
    countEl.textContent = `${list.length} / ${entries.length}`;
    if (!list.length) {
      gridEl.innerHTML = `<div class="w-empty glass-card">没有匹配的词条,换个关键词试试。</div>`;
      return;
    }
    gridEl.innerHTML = list.map((x) => `
      <a class="w-card glass-card anim-fade-up" href="#/wiki/${x.id}">
        <div class="w-card-cat">${x.category}</div>
        <h3>${x.title}</h3>
        <p>${x.body.split('\n')[0].slice(0, 64)}…</p>
        <div class="w-card-tags">${x.tags.map((t) => `<span>${t}</span>`).join('')}</div>
        ${storeGet('readWiki', []).includes(x.id) ? '<span class="w-read-flag" title="已读">✓ 已读</span>' : ''}
      </a>`).join('');
  }

  loadWiki().then((data) => {
    entries = data;
    catsEl.querySelectorAll('.w-cat-n').forEach((el) => {
      const c = el.dataset.n;
      el.textContent = c === '全部' ? data.length : data.filter((x) => x.category === c).length;
    });
    const read = storeGet('readWiki', []).length;
    progEl.innerHTML = `
      <div class="w-progress-bar"><i style="width:${(read / data.length) * 100}%"></i></div>
      <div class="w-progress-txt">已读 ${read} / ${data.length} 词条</div>`;
    applyFilter();
  }).catch((err) => {
    console.error('[wiki] 词条加载失败:', err);
    gridEl.innerHTML = `<div class="w-empty glass-card">词条加载失败,请刷新重试。</div>`;
  });

  return () => { /* 纯 DOM,无定时器/监听器需显式清理(input 监听随节点销毁) */ };
}

/* ---------- 详情页 ---------- */

function renderDetail(container, entryId) {
  container.innerHTML = `
  <div class="container">
    <div class="v-loading" style="padding:60px 0;position:static"><div class="ring"></div>翻开词条…</div>
  </div>`;

  loadWiki().then((data) => {
    const entry = data.find((x) => x.id === entryId);
    if (!entry) {
      container.innerHTML = `
      <div class="container">
        <div class="viewer-error glass-card hud-frame">
          <h2>词条不存在</h2>
          <p>没有找到词条 <b style="font-family:var(--mono)">${entryId}</b>。</p>
          <a class="btn btn-primary" style="margin-top:18px" href="#/wiki">返回百科</a>
        </div>
      </div>`;
      return;
    }

    /* 阅读即打卡 + 成就补检 */
    const readArr = storeGet('readWiki', []) || [];
    if (!readArr.includes(entry.id)) {
      storeUpdate('readWiki', (arr) => [...new Set([...(arr || []), entry.id])], []);
      checkAchievements().catch(() => {});
    }

    const paras = entry.body.split('\n').map((p) => `<p>${p}</p>`).join('');
    const seeAlso = (entry.seeAlso || [])
      .map((id) => data.find((x) => x.id === id))
      .filter(Boolean);
    const slug = CAT_SLUGS[entry.category] || 'all';
    const catCount = data.filter((x) => x.category === entry.category).length;
    const idx = data.indexOf(entry) + 1;

    container.innerHTML = `
    <div class="container w-detail-wrap">
      <article class="w-detail glass-card hud-frame anim-fade-up">
        <div class="w-detail-top">
          <span class="w-card-cat">${entry.category}</span>
          <span class="v-chip">${idx} / ${data.length} · 本分类 ${catCount} 条</span>
          ${favChipHTML('wiki', entry.id, entry.title)}
        </div>
        <h2>${entry.title}</h2>
        <div class="w-detail-tags">${entry.tags.map((t) => `<span class="w-tag">${t}</span>`).join('')}</div>
        ${entry.optionalSvg ? `<div class="w-figure">${entry.optionalSvg}<span class="w-figure-cap">示意图(简化,非比例)</span></div>` : ''}
        <div class="w-body">${paras}</div>
        <div class="w-also">
          <span class="w-also-label">参见</span>
          ${seeAlso.map((x) => `<a class="w-also-chip" href="#/wiki/${x.id}">${x.title}</a>`).join('')}
        </div>
        <div class="w-detail-foot">
          <a class="btn btn-ghost btn-sm" href="#/wiki">← 返回百科</a>
          <a class="btn btn-primary" href="#/game/${slug}">去答题(本分类)→</a>
        </div>
      </article>
    </div>`;
    bindFavChips(container);
  }).catch((err) => {
    console.error('[wiki] 词条加载失败:', err);
    container.innerHTML = `
    <div class="container">
      <div class="viewer-error glass-card hud-frame">
        <h2>词条加载失败</h2><p>请检查网络后刷新重试。</p>
        <a class="btn btn-primary" style="margin-top:18px" href="#/wiki">返回百科</a>
      </div>
    </div>`;
  });

  return null;
}
