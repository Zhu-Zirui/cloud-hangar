/**
 * ui/airports.js — 机场图鉴(P5)
 * 三个视图:列表(卡片栅格+搜索+拼音排序)/ 详情(#/airports/<iata>:数据表+程序化跑道布局 SVG+冷知识)/ 地图(SVG 中国轮廓打点)
 * 浏览打卡:cav3d.seenAirports(localStorage,经 core/store.js)
 */
import { storeGet, storeUpdate } from '../core/store.js';

const seenAirports = () => storeGet('seenAirports', []) || [];
function markSeen(iata) {
  storeUpdate('seenAirports', (arr) => (Array.isArray(arr) && arr.includes(iata) ? arr : [...(arr || []), iata]), []);
}

/* ---------- 数据加载(模块级缓存) ---------- */
let apPromise = null;
let livPromise = null;
function loadAirports() {
  if (!apPromise) apPromise = fetch('data/airports.json').then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); });
  return apPromise;
}
function loadLiveries() {
  if (!livPromise) livPromise = fetch('data/liveries.json').then((r) => r.ok ? r.json() : { airlines: {} }).catch(() => ({ airlines: {} }));
  return livPromise;
}

/** 航司色:liveries 里取 P2 同款色;取不到按 id 哈希出通用色 */
function airlineColor(liv, id) {
  const a = liv && liv.airlines && liv.airlines[id];
  if (a && a.color) return a.color;
  let h = 0; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `hsl(${h}, 45%, 42%)`;
}
function airlineLogo(liv, id) {
  const a = liv && liv.airlines && liv.airlines[id];
  return a && a.logo ? a.logo : null;
}

/* ---------- 入口 ---------- */

/* 分省视图的省级区域固定顺序(直辖市/省/自治区按习惯排序,港澳台殿后) */
const PROV_ORDER = [
  '北京', '天津', '河北', '山西', '内蒙古', '辽宁', '吉林', '黑龙江',
  '上海', '江苏', '浙江', '安徽', '福建', '江西', '山东', '河南',
  '湖北', '湖南', '广东', '广西', '海南', '重庆', '四川', '贵州',
  '云南', '西藏', '陕西', '甘肃', '青海', '宁夏', '新疆',
  '香港', '澳门', '台湾',
];

export function render(container, { segments = [] } = {}) {
  container.innerHTML = `<div class="container"><div class="placeholder-page glass-card hud-frame"><div class="ph-icon">✈</div><h2>机场图鉴</h2><p>跑道数据加载中…</p></div></div>`;
  Promise.all([loadAirports(), loadLiveries()])
    .then(([data, liv]) => {
      const list = data.airports || [];
      const sub = segments[1] ? decodeURIComponent(segments[1]).toUpperCase() : null;
      if (sub) renderDetail(container, list, liv, sub);
      else renderIndex(container, list, liv);
    })
    .catch((err) => {
      console.error('[airports] 数据加载失败:', err);
      container.innerHTML = `<div class="container"><div class="placeholder-page glass-card"><h2>机场数据加载失败</h2><p>${String(err && err.message || err)}</p><p><a class="pc-pill" href="#/airports">重试</a></p></div></div>`;
    });
  return null;
}

/* ============================================================
   视图一:列表 + 地图(模式切换,状态仅存内存)
   ============================================================ */
let mode = 'list';   // 'list' | 'map'
let query = '';

function renderIndex(container, list, liv) {
  container.innerHTML = `
  <div class="container">
    <header class="ap-head">
      <div>
        <h1 class="section-title">机场图鉴<span class="sub">AIRPORT DIRECTORY · ${list.length} 座 · 覆盖省级区域 ${new Set(list.map((a) => a.province).filter(Boolean)).size} 个</span></h1>
        <p class="ap-sub">中国主要民用机场(4C 级及以上为主,含港澳台)的跑道、航站楼与冷知识档案,按省份分组。</p>
      </div>
      <div class="ap-mode" role="tablist">
        <button class="v-chip btn-like ${mode === 'list' ? 'on' : ''}" data-m="list">列表模式</button>
        <button class="v-chip btn-like ${mode === 'map' ? 'on' : ''}" data-m="map">地图模式</button>
      </div>
    </header>
    ${mode === 'list' ? listHTML(list) : mapHTML(list)}  </div>`;

  container.querySelectorAll('.ap-mode button').forEach((b) => {
    b.addEventListener('click', () => { mode = b.dataset.m; renderIndex(container, list, liv); });
  });
  const input = container.querySelector('.ap-search input');
  if (input) {
    input.value = query;
    input.addEventListener('input', () => {
      query = input.value.trim();
      const grid = container.querySelector('.ap-grid-wrap');
      if (grid) grid.innerHTML = provGroupsHTML(filterAirports(list));
      bindCards(container);
    });
  }
  bindCards(container);
}

function filterAirports(list) {
  const q = query.toLowerCase();
  const arr = q
    ? list.filter((a) => [a.iata, a.cn, a.city, a.pinyin, a.province || '', a.en || ''].join(' ').toLowerCase().includes(q))
    : list.slice();
  return arr.sort((x, y) => String(x.pinyin || x.cn).localeCompare(String(y.pinyin || y.cn), 'zh') || x.cn.localeCompare(y.cn, 'zh'));
}

function listHTML(list) {
  const shown = filterAirports(list);
  return `
  <div class="ap-search glass-card">
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
    <input type="search" placeholder="按 IATA 代码 / 机场名 / 城市 / 省份搜索,如 PEK、高崎、西藏…" aria-label="搜索机场">
  </div>
  <div class="ap-grid-wrap">${provGroupsHTML(shown)}</div>`;
}

/** 按省份分组渲染(空组隐藏);无 province 字段的兜底归入"其他" */
function provGroupsHTML(list) {
  if (!list.length) return `<div class="placeholder-page glass-card"><h2>未找到匹配机场</h2><p>换个关键词试试,例如 IATA 代码、城市或省份。</p></div>`;
  const byProv = new Map();
  for (const a of list) {
    const key = a.province || '其他';
    if (!byProv.has(key)) byProv.set(key, []);
    byProv.get(key).push(a);
  }
  const keys = [...byProv.keys()].sort((p1, p2) => {
    const i1 = PROV_ORDER.indexOf(p1), i2 = PROV_ORDER.indexOf(p2);
    return (i1 < 0 ? 999 : i1) - (i2 < 0 ? 999 : i2);
  });
  return keys.map((prov) => `
  <section class="ap-prov">
    <h2 class="ap-prov-title">${prov}<span class="sub">${byProv.get(prov).length} 座</span></h2>
    <div class="ap-grid">${byProv.get(prov).map((a) => apCardHTML(a)).join('')}</div>
  </section>`).join('');
}

/** 详情路由键:优先 IATA;未获配三字码的机场(通航/在建)回退 ICAO 或中文名 */
function apId(a) { return a.iata || a.icao || encodeURIComponent(a.cn); }

function apCardHTML(a) {
  const isSeen = seenAirports().includes(apId(a));
  return `
    <a class="ap-card glass-card hud-frame ${isSeen ? 'seen' : ''}" href="#/airports/${apId(a)}">
      <div class="ap-card-top">
        <span class="ap-iata">${a.iata || a.icao || '—'}</span>
        <span class="ap-rw-badge">${a.runways.length} 跑道</span>
      </div>
      <h3>${a.cn}</h3>
      <p class="ap-city">${a.city} · ${a.icao}</p>
      <div class="ap-card-foot">
        <span>${a.opened} 通航</span>
        <span class="ap-seen">${isSeen ? '● 已浏览' : '○ 未浏览'}</span>
      </div>
    </a>`;
}

function bindCards(container) { /* 卡片为 <a> 纯跳转,无需额外绑定,占位便于扩展 */ }

/* ============================================================
   视图二:详情页
   ============================================================ */
function renderDetail(container, list, liv, iata) {
  const ap = list.find((x) => apId(x) === iata || x.cn === iata);
  markSeen(iata);
  if (!ap) {
    container.innerHTML = `<div class="container"><div class="placeholder-page glass-card"><h2>未收录机场 ${iata}</h2><p>当前图鉴共收录 ${list.length} 座机场。</p><p><a class="pc-pill" href="#/airports">返回列表</a></p></div></div>`;
    return;
  }
  const seenNow = seenAirports().includes(apId(ap));
  container.innerHTML = `
  <div class="container">
    <a class="ap-back" href="#/airports">← 返回机场图鉴</a>
    <header class="ap-hero glass-card hud-frame">
      <div class="ap-hero-iata">${ap.iata || ap.icao || '✈'}</div>
      <div class="ap-hero-main">
        <h2>${ap.cn}</h2>
        <p class="ap-hero-en">${ap.en || ''} · ${ap.icao} · ${ap.city}</p>
        <div class="hero-chips">
          <span class="chip">${ap.province ? `${ap.province} · ` : ''}${ap.city}</span>
          <span class="chip">${ap.opened} 年通航</span>
          <span class="chip">海拔 ${ap.elevationM} m${ap.approx ? '(约)' : ''}</span>
          <span class="chip">${ap.runways.length} 条跑道</span>
          ${seenNow ? '<span class="chip seen-chip">● 已浏览打卡</span>' : ''}
        </div>
      </div>
    </header>

    <section class="glass-card ap-diagram-card">
      <h3 class="section-title">跑道布局示意图<span class="sub">TAXIWAY / RUNWAY LAYOUT</span></h3>
      ${buildRunwayDiagram(ap)}
    </section>

    <div class="ap-detail-grid">
      <section class="glass-card ap-panel">
        <h3 class="section-title">基础数据<span class="sub">FACT SHEET</span></h3>
        <table class="ap-table"><tbody>
          <tr><th>四字码 ICAO</th><td>${ap.icao}</td></tr>
          <tr><th>三字码 IATA</th><td>${ap.iata || '—(暂未获配)'}</td></tr>
          <tr><th>通航年份</th><td>${ap.opened}</td></tr>
          <tr><th>海拔</th><td>${ap.elevationM} m${ap.approx ? '(约)' : ''}</td></tr>
          <tr><th>基地航司</th><td>${hubChips(liv, ap)}</td></tr>
        </tbody></table>
      </section>

      <section class="glass-card ap-panel">
        <h3 class="section-title">航站楼<span class="sub">TERMINALS</span></h3>
        <ul class="ap-terminals">${ap.terminals.map((t) => `
          <li><b>${t.name}</b>
            <span>${t.role}${t.approx ? '(年份约)' : ''} · ${t.opened} 年启用${t.note ? ` — ${t.note}` : ''}</span>
          </li>`).join('')}</ul>
      </section>

      <section class="glass-card ap-panel">
        <h3 class="section-title">跑道数据<span class="sub">RUNWAYS</span></h3>
        <table class="ap-table"><thead><tr><th>编号</th><th>长度</th><th>宽度</th></tr></thead><tbody>
          ${ap.runways.map((r) => `<tr><td class="mono">${r.id}</td><td>${r.length} m${r.approx ? '(约)' : ''}</td><td>${r.width} m${r.approx ? '(约)' : ''}</td></tr>`).join('')}
        </tbody></table>
      </section>

      <section class="glass-card ap-panel ap-facts">
        <h3 class="section-title">冷知识<span class="sub">TRIVIA</span></h3>
        ${ap.facts.map((f) => `<p class="pc-row"><b>★</b><span>${f}</span></p>`).join('')}
      </section>
    </div>
  </div>`;
}

function hubChips(liv, ap) {
  if (!ap.hubs || !ap.hubs.length) return '<span class="ap-dim">—</span>';
  return ap.hubs.map((h) => {
    const color = airlineColor(liv, h.id);
    const logo = airlineLogo(liv, h.id);
    return `<span class="ap-hub" title="${h.cn}">${logo ? `<img src="${logo}" alt="">` : ''}<i style="background:${color}"></i>${h.cn}</span>`;
  }).join(' ');
}

/* ============================================================
   程序化跑道布局图(逼真化:道面/接地带/中线/平行滑行道/机坪/航站楼/比例尺)
   ============================================================ */
const DIA = { W: 900, H: 620, CX: 450, CY: 225 };

function runwayHeading(id) {
  const m = String(id).match(/^(\d{2})/);
  return m ? ((+m[1]) * 10) % 360 : 0;
}

/** 按“夹角 ≤30° 归簇”把跑道分为平行组 */
function clusterRunways(runways) {
  const items = runways.map((r) => ({ r, h: runwayHeading(r.id) })).sort((a, b) => a.h - b.h);
  const clusters = [];
  for (const it of items) {
    const last = clusters[clusters.length - 1];
    if (last) {
      const d = Math.abs(((it.h - last.heading + 540) % 360) - 180); // 0~180 环形差
      if (d <= 30) { last.runways.push(it.r); continue; }
    }
    clusters.push({ heading: it.h, runways: [it.r] });
  }
  return clusters;
}

function buildRunwayDiagram(ap) {
  const ppm = 280 / Math.max(...ap.runways.map((r) => r.length)); // 最长跑道占 280px,为航站楼区留出下部空间
  const WEX = 2.4;                                                // 道面宽放大系数(仅示意可读)
  const s = [];
  s.push(`<svg class="ap-diagram" viewBox="0 0 ${DIA.W} ${DIA.H}" role="img" aria-label="${ap.cn} 跑道布局示意图">`);
  s.push(`<defs>
    <linearGradient id="apGrass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1c2c1c"/><stop offset="1" stop-color="#182417"/>
    </linearGradient>
    <linearGradient id="apAsphalt" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#262d36"/><stop offset=".5" stop-color="#2d3540"/><stop offset="1" stop-color="#242b33"/>
    </linearGradient>
    <linearGradient id="apApron" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2a3340"/><stop offset="1" stop-color="#232c37"/>
    </linearGradient>
  </defs>`);

  // 场区草地 + 围界
  s.push(`<rect x="24" y="24" width="${DIA.W - 48}" height="${DIA.H - 48}" rx="18" fill="url(#apGrass)" stroke="rgba(234,243,252,.14)"/>`);
  s.push(`<rect x="36" y="36" width="${DIA.W - 72}" height="${DIA.H - 72}" rx="12" fill="none" stroke="rgba(234,243,252,.10)" stroke-dasharray="10 8"/>`);

  // 跑道(平行组排布:组间横向错开,组内平行线错开)
  const clusters = clusterRunways(ap.runways);
  clusters.forEach((cl, i) => {
    const dx = (i - (clusters.length - 1) / 2) * 155;
    cl.runways.forEach((r, j) => {
      const lat = (j - (cl.runways.length - 1) / 2) * 52;
      const rad = (cl.heading * Math.PI) / 180;
      const cx = DIA.CX + dx + lat * Math.cos(rad);
      const cy = DIA.CY + lat * Math.sin(rad);
      s.push(drawRunway(r, cl.heading, cx, cy, ppm, WEX));
    });
  });

  // 航站楼 + 机坪(置于场区南侧)
  s.push(drawTerminalZone(ap));

  // 指北针
  s.push(`<g transform="translate(${DIA.W - 62},66)" stroke="#8fb4d8" fill="#8fb4d8">
    <circle r="22" fill="none" stroke-width="1.4" opacity=".7"/>
    <path d="M0,-16 L5,8 L0,3 L-5,8 Z" stroke="none"/>
    <text y="38" text-anchor="middle" font-size="13" stroke="none" font-family="var(--mono)">N</text>
  </g>`);

  // 比例尺(500 m)
  const barPx = 500 * ppm;
  s.push(`<g transform="translate(56,${DIA.H - 64})" font-family="var(--mono)">
    <line x1="0" y1="0" x2="${barPx}" y2="0" stroke="#cfe3f5" stroke-width="2"/>
    <line x1="0" y1="-5" x2="0" y2="5" stroke="#cfe3f5" stroke-width="2"/>
    <line x1="${barPx}" y1="-5" x2="${barPx}" y2="5" stroke="#cfe3f5" stroke-width="2"/>
    <text x="${barPx / 2}" y="-8" text-anchor="middle" font-size="11" fill="#cfe3f5">500 m</text>
  </g>`);

  s.push(`<text x="${DIA.W - 56}" y="${DIA.H - 28}" text-anchor="end" font-size="11.5" fill="var(--ink-faint)">布局示意,非精确比例(道面宽度已放大以便阅读)</text>`);
  s.push(`</svg>`);
  return s.join('');
}

/** 单条跑道:土面/道肩/道面/中线/边线/跑道号/接地带/平行滑行道 */
function drawRunway(r, heading, cx, cy, ppm, WEX) {
  const L = r.length * ppm;
  const W = Math.max(18, r.width * ppm * WEX);
  const parts = [];
  const rot = (x, y) => `transform="rotate(${heading} ${x} ${y})"`;
  // 以“竖直跑道”为本地坐标系绘制,再整体按航向旋转(0°=朝北)
  parts.push(`<g ${rot(cx, cy)}>`);
  const x = cx, yTop = cy - L / 2;
  // 道肩
  parts.push(`<rect x="${x - W / 2 - 8}" y="${yTop - 10}" width="${W + 16}" height="${L + 20}" fill="#3a4149" opacity=".85"/>`);
  // 道面
  parts.push(`<rect x="${x - W / 2}" y="${yTop}" width="${W}" height="${L}" fill="url(#apAsphalt)"/>`);
  // 边线
  parts.push(`<line x1="${x - W / 2 + 2.5}" y1="${yTop + 4}" x2="${x - W / 2 + 2.5}" y2="${yTop + L - 4}" stroke="#e9eef4" stroke-width="1.4" opacity=".9"/>`);
  parts.push(`<line x1="${x + W / 2 - 2.5}" y1="${yTop + 4}" x2="${x + W / 2 - 2.5}" y2="${yTop + L - 4}" stroke="#e9eef4" stroke-width="1.4" opacity=".9"/>`);
  // 中线(虚线)
  parts.push(`<line x1="${x}" y1="${yTop + 26}" x2="${x}" y2="${yTop + L - 26}" stroke="#e9eef4" stroke-width="1.6" stroke-dasharray="16 12" opacity=".95"/>`);
  // 两端跑道号 + 跑道入口标线(琴键)
  const [d1, d2] = String(r.id).split('/');
  const fs = Math.min(11, Math.max(8, W * 0.62));
  // 跑道号在斜跑道上保持屏幕正立(组内反向旋转抵消航向)
  const up = (yy, d) => `<text x="${x}" y="${yy}" text-anchor="middle" font-size="${fs}" fill="#eef4fa" font-family="var(--mono)" font-weight="600" transform="rotate(${-heading} ${x} ${yy})">${d || ''}</text>`;
  parts.push(up(yTop + 18, d1));
  parts.push(up(yTop + L - 9, d2));
  [yTop, yTop + L].forEach((yEnd, k) => {
    const dir = k === 0 ? 1 : -1;
    // 琴键:入口横杠
    const bw = Math.max(1.2, (W - 14) / 15), bh = 4.5, bars = 8;
    for (let b = 0; b < bars; b++) {
      const bx = x - (bars * bw * 2 - bw) / 2 + b * bw * 2;
      parts.push(`<rect x="${bx}" y="${yEnd + dir * 26 - bh / 2}" width="${bw}" height="${bh}" fill="#e9eef4" opacity=".85"/>`);
    }
    if (W >= 24) {
      // 接地带标线(两组)+ 瞄准点(仅道面较宽的示意可读时绘制)
      [58, 84].forEach((off) => {
        parts.push(`<rect x="${x - W / 2 + 5}" y="${yEnd + dir * off - 2}" width="${W * 0.24}" height="3" fill="#e9eef4" opacity=".6"/>`);
        parts.push(`<rect x="${x + W / 2 - 5 - W * 0.24}" y="${yEnd + dir * off - 2}" width="${W * 0.24}" height="3" fill="#e9eef4" opacity=".6"/>`);
      });
      parts.push(`<rect x="${x - W / 2 + 7}" y="${yEnd + dir * 118 - 2.5}" width="${W * 0.28}" height="5" fill="#e9eef4" opacity=".8"/>`);
      parts.push(`<rect x="${x + W / 2 - 7 - W * 0.28}" y="${yEnd + dir * 118 - 2.5}" width="${W * 0.28}" height="5" fill="#e9eef4" opacity=".8"/>`);
    }
  });
  // 平行滑行道(黄色中心线)+ 联络道
  const tx = W / 2 + 18;
  [x - tx, x + tx].forEach((txx) => {
    parts.push(`<line x1="${txx}" y1="${yTop + 40}" x2="${txx}" y2="${yTop + L - 40}" stroke="#e6c34a" stroke-width="1.6" opacity=".85"/>`);
    [yTop + 40, yTop + L / 2, yTop + L - 40].forEach((yy) => {
      parts.push(`<line x1="${x + (txx < x ? -W / 2 : W / 2)}" y1="${yy}" x2="${txx}" y2="${yy}" stroke="#e6c34a" stroke-width="1.3" opacity=".55"/>`);
    });
  });
  parts.push(`</g>`);
  return parts.join('');
}

/** 航站楼区:机坪 + 廊桥齿 + 航站楼块 + 停机位小飞机剪影 + 联络滑行道 */
function drawTerminalZone(ap) {
  const parts = [];
  const zoneY = 470;
  const names = ap.terminals.map((t) => (t.name.length > 8 ? t.name.slice(0, 8) : t.name));
  const n = Math.max(1, names.length);
  const bw = 128, bh = 34, gap = 26;
  const totalW = n * bw + (n - 1) * gap;
  const x0 = (DIA.W - totalW) / 2;
  // 联络滑行道(跑道区 → 机坪)
  parts.push(`<line x1="${DIA.CX - 150}" y1="${zoneY - 78}" x2="${DIA.CX - 150}" y2="${zoneY}" stroke="#e6c34a" stroke-width="1.6" opacity=".7"/>`);
  parts.push(`<line x1="${DIA.CX + 150}" y1="${zoneY - 78}" x2="${DIA.CX + 150}" y2="${zoneY}" stroke="#e6c34a" stroke-width="1.6" opacity=".7"/>`);
  // 机坪
  parts.push(`<rect x="${x0 - 60}" y="${zoneY - 26}" width="${totalW + 120}" height="${bh + 46}" rx="6" fill="url(#apApron)" stroke="rgba(234,243,252,.12)"/>`);
  // 廊桥齿(近机位)
  for (let px = x0 - 34; px < x0 + totalW + 34; px += 34) {
    parts.push(`<line x1="${px}" y1="${zoneY - 26}" x2="${px}" y2="${zoneY - 12}" stroke="#7f97ad" stroke-width="2.4" opacity=".8"/>`);
  }
  // 停放的飞机剪影
  [x0 - 30, x0 + totalW / 2, x0 + totalW + 30].forEach((ax) => {
    parts.push(`<g transform="translate(${ax},${zoneY - 1}) scale(.85)" fill="none" stroke="#cfe0f0" stroke-width="1.6" opacity=".9">
      <path d="M0,-9 L2.6,-2.6 L13,1.5 L13,3.4 L2.6,2.4 L1.6,8.5 L4.6,10.6 L4.6,12 L0,11 L-4.6,12 L-4.6,10.6 L-1.6,8.5 L-2.6,2.4 L-13,3.4 L-13,1.5 L-2.6,-2.6 Z"/>
    </g>`);
  });
  // 航站楼块
  names.forEach((nm, i) => {
    const bx = x0 + i * (bw + gap);
    parts.push(`<g>
      <rect x="${bx}" y="${zoneY + 14}" width="${bw}" height="${bh}" rx="7" fill="#0e1622" stroke="rgba(56,189,248,.45)"/>
      <rect x="${bx}" y="${zoneY + 14}" width="${bw}" height="5" rx="3" fill="rgba(56,189,248,.5)"/>
      <text x="${bx + bw / 2}" y="${zoneY + 36}" text-anchor="middle" font-size="14" fill="#eaf3fc" font-family="var(--font)">${nm}</text>
    </g>`);
  });
  return parts.join('');
}

/* ============================================================
   视图三:地图模式(SVG 简化中国轮廓,含台湾岛与南海诸岛示意)
   ============================================================ */
/** 简化投影:等经纬 + 中纬度横向压缩 */
function toXY(lng, lat) { return [Math.round((lng - 73) * 8.7), Math.round((53.6 - lat) * 10.8)]; }
function poly(pts) { return pts.map((p) => toXY(p[0], p[1]).join(',')).join(' '); }

// 主大陆轮廓(粗折线,顺时针,自东北角起)
const CHINA_MAIN = [
  [134.3, 48.4], [131.0, 45.0], [130.6, 42.4], [124.4, 39.9], [121.2, 38.9], [120.9, 40.0],
  [121.5, 39.5], [122.0, 39.2], [121.2, 40.9], [119.5, 39.9], [117.8, 39.0], [118.9, 38.1],
  [119.2, 37.1], [120.7, 37.9], [122.5, 37.4], [120.5, 36.1], [119.3, 34.7], [120.9, 33.0],
  [121.9, 31.2], [121.9, 29.9], [120.2, 27.9], [119.6, 25.9], [118.1, 24.4], [116.7, 23.3],
  [113.9, 22.5], [110.4, 21.2], [109.1, 21.5], [108.5, 21.6], [105.3, 23.0], [102.1, 22.4],
  [100.1, 21.2], [97.8, 23.9], [96.4, 29.4], [91.5, 27.5], [88.8, 27.9], [85.0, 28.6],
  [81.3, 30.4], [78.9, 32.5], [78.2, 35.5], [75.0, 36.9], [73.9, 39.5], [75.0, 40.5],
  [76.5, 41.0], [80.3, 42.9], [82.5, 45.2], [83.0, 47.2], [85.5, 48.3], [87.3, 49.1],
  [90.1, 47.7], [91.0, 45.2], [96.4, 42.8], [105.0, 41.8], [110.0, 42.7], [111.9, 45.1],
  [117.4, 46.6], [119.9, 46.7], [117.8, 49.5], [111.0, 50.0], [105.0, 51.8], [119.5, 53.5],
  [126.5, 53.3], [130.7, 48.9],
];
const TAIWAN = [[121.8, 25.3], [122.0, 24.7], [121.3, 22.8], [120.7, 21.9], [120.2, 22.6], [120.1, 23.6], [121.0, 25.1]];
const HAINAN = [[108.7, 19.9], [110.6, 20.0], [111.0, 19.6], [110.4, 18.6], [109.2, 18.3], [108.6, 19.3]];
// 南海诸岛示意(九段线简化弧 + 主要群岛点)
const U_LINE = [
  [108.0, 19.5], [107.5, 17.5], [107.8, 15.5], [108.2, 13.5], [109.0, 11.5], [110.0, 9.5],
  [110.8, 7.5], [112.3, 6.0], [114.0, 5.5], [115.8, 6.5], [117.5, 7.5], [118.0, 9.5],
  [118.8, 11.5], [119.2, 13.5], [119.8, 15.5], [120.3, 17.8], [121.0, 20.0], [121.5, 21.5],
];
const SEA_POINTS = [[112.3, 16.8, '西沙群岛'], [117.7, 15.1, '黄岩岛'], [111.7, 12.3, '中沙群岛'], [114.3, 10.2, '南沙群岛'], [110.4, 8.5, '南沙群岛'], [115.5, 6.5, '曾母暗沙']];

function insetXY(lng, lat) { return [Math.round(398 + (lng - 106) * 8.4), Math.round(548 - (lat - 2) * 6.9)]; }

function mapHTML(list) {
  const [tx, ty] = [0, 0]; // viewBox 原点即投影原点
  return `
  <div class="ap-map-wrap glass-card">
    <svg class="ap-map" viewBox="0 0 560 570" role="img" aria-label="中国机场分布示意图">
      <defs>
        <radialGradient id="apLand" cx=".5" cy=".4" r=".8">
          <stop offset="0" stop-color="rgba(56,189,248,.10)"/><stop offset="1" stop-color="rgba(56,189,248,.03)"/>
        </radialGradient>
      </defs>
      <polygon points="${poly(CHINA_MAIN)}" fill="url(#apLand)" stroke="#3a6a94" stroke-width="1.6" stroke-linejoin="round"/>
      <polygon points="${poly(HAINAN)}" fill="url(#apLand)" stroke="#3a6a94" stroke-width="1.4"/>
      <polygon points="${poly(TAIWAN)}" fill="url(#apLand)" stroke="#3a6a94" stroke-width="1.4"/>
      <text x="${toXY(121.0, 24.0)[0] + 12}" y="${toXY(121.0, 24.0)[1] + 4}" font-size="12" fill="#7fd4ff">台湾岛</text>
      <text x="${toXY(109.9, 19.1)[0] - 22}" y="${toXY(109.9, 19.1)[1] + 18}" font-size="12" fill="#7fd4ff">海南岛</text>
      <!-- 南海诸岛示意框 -->
      <g>
        <rect x="392" y="392" width="152" height="164" rx="8" fill="rgba(15,30,53,.55)" stroke="#3a6a94" stroke-width="1.2"/>
        <g stroke="#5f8db8" stroke-width="2" opacity=".85">
          ${U_LINE.reduce((out, p, i) => {
            if (i % 2) return out;
            const a = insetXY(p[0], p[1]), b = insetXY(U_LINE[i + 1][0], U_LINE[i + 1][1]);
            return out + `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke-dasharray="8 6"/>`;
          }, '')}
        </g>
        ${SEA_POINTS.map((p) => { const [x, y] = insetXY(p[0], p[1]); return `<circle cx="${x}" cy="${y}" r="2.6" fill="#38bdf8" opacity=".9"/>`; }).join('')}
        <text x="468" y="412" text-anchor="middle" font-size="12.5" fill="#9fc4e8">南海诸岛</text>
        <text x="468" y="548" text-anchor="middle" font-size="10" fill="#6b7f99">(示意)</text>
      </g>
      <!-- 机场打点(近距离双场自动错位标注) -->
      ${(() => {
        const placed = [];
        return list.map((a) => {
          const [x, y] = toXY(a.coord[0], a.coord[1]);
          const clash = placed.some((p) => Math.abs(p[0] - x) < 16 && Math.abs(p[1] - y) < 12);
          placed.push([x, y]);
          const lx = clash ? x - 9 : x + 10, ly = clash ? y + 15 : y + 4, anchor = clash ? 'end' : 'start';
          return `<g class="ap-dot" tabindex="0" data-iata="${apId(a)}" role="link" aria-label="${a.cn}">
          <title>${a.cn} · ${a.iata || a.icao || ''}(点击查看详情)</title>
          <circle cx="${x}" cy="${y}" r="9" fill="rgba(56,189,248,.18)"/>
          <circle class="ap-dot-core" cx="${x}" cy="${y}" r="4" fill="#38bdf8" stroke="#0b1526" stroke-width="1.4"/>
          <text x="${lx}" y="${ly}" text-anchor="${anchor}" font-size="10.5" fill="#cfe3f5" font-family="var(--mono)">${a.iata || a.icao}</text>
        </g>`;
        }).join('');
      })()}
      <text x="${20 + tx}" y="566" font-size="11" fill="#6b7f99">示意图,仅作分布参考(海岸线与境界线为简化折线,不含全部岛屿)</text>
    </svg>
  </div>`;
}

/* 地图交互:点击 / 回车跳详情(事件委托挂容器) */
document.addEventListener('click', (e) => {
  const dot = e.target && e.target.closest && e.target.closest('.ap-dot');
  if (dot && dot.dataset.iata) location.hash = `#/airports/${dot.dataset.iata}`;
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  const dot = e.target && e.target.closest && e.target.closest('.ap-dot');
  if (dot && dot.dataset.iata) location.hash = `#/airports/${dot.dataset.iata}`;
});
