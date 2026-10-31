/**
 * ui/search.js — 全站搜索命令面板(Ctrl+K / Cmd+K)
 * 覆盖三类内容:机型(engine/aircraft.loadAllVariants)/ 机场(airports.json)/ 词条(wiki.json)。
 * 索引懒构建:第一次打开面板才拉数据并缓存;纯前缀/包含匹配,得分排序取前 12。
 * 键盘:↑↓ 选择、Enter 跳转、Esc 关闭;点击条目同样跳转。
 * 由 main.js 启动时调用 initSearchPalette(),header 的 #header-search 按钮同开面板。
 */

let panel = null;        // 面板根元素(懒建)
let indexPromise = null; // 索引构建 Promise(缓存)

/* ---------- 索引 ---------- */

async function buildIndex() {
  const [aircraft, airports, wiki] = await Promise.all([
    import('../engine/aircraft.js').then((m) => m.loadAllVariants()),
    fetch(new URL('../../data/airports.json', import.meta.url)).then((r) => r.json()),
    fetch(new URL('../../data/wiki.json', import.meta.url)).then((r) => r.json()),
  ]);

  const items = [];
  for (const v of aircraft) {
    items.push({
      type: '机型', icon: '✈',
      title: v.cnName, sub: `${v.familyCn || ''} ${v.id.toUpperCase()} · ${v.length.toFixed(1)} m`,
      hay: `${v.cnName} ${v.id} ${v.familyCn || ''}`.toLowerCase(),
      href: `#/aircraft/${v.id}`, weight: 2,
    });
  }
  const apId = (a) => a.iata || a.icao || encodeURIComponent(a.cn);
  for (const a of airports.airports) {
    items.push({
      type: '机场', icon: '🏢',
      title: a.cn, sub: `${a.iata || a.icao} · ${a.city}${a.province ? ` · ${a.province}` : ''}`,
      hay: `${a.cn} ${a.en || ''} ${a.iata || ''} ${a.icao} ${a.city} ${a.province || ''}`.toLowerCase(),
      href: `#/airports/${apId(a)}`, weight: 1,
    });
  }
  for (const w of wiki) {
    items.push({
      type: '词条', icon: '📖',
      title: w.title, sub: `${w.category}${w.tags?.length ? ` · ${w.tags.join(' / ')}` : ''}`,
      hay: `${w.title} ${w.category} ${(w.tags || []).join(' ')}`.toLowerCase(),
      href: `#/wiki/${w.id}`, weight: 1,
    });
  }
  return items;
}

function getIndex() {
  if (!indexPromise) {
    indexPromise = buildIndex().catch((err) => {
      console.error('[search] 索引构建失败:', err);
      indexPromise = null; // 失败允许重试
      throw err;
    });
  }
  return indexPromise;
}

/* ---------- 匹配与排序 ---------- */

function search(items, query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored = [];
  for (const it of items) {
    let s = -1;
    const ti = it.title.toLowerCase();
    if (ti === q) s = 100;
    else if (ti.startsWith(q)) s = 60;
    else if (ti.includes(q)) s = 40;
    else if (it.hay.includes(q)) s = 15;
    if (s >= 0) scored.push({ it, score: s + it.weight });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, 12).map((x) => x.it);
}

/* ---------- 面板 DOM 与交互 ---------- */

function ensurePanel() {
  if (panel) return panel;
  panel = document.createElement('div');
  panel.className = 'cmdk-overlay';
  panel.hidden = true;
  panel.innerHTML = `
    <div class="cmdk glass-card hud-frame" role="dialog" aria-label="全站搜索">
      <div class="cmdk-input-row">
        <span class="cmdk-icon" aria-hidden="true">⌕</span>
        <input type="text" class="cmdk-input" placeholder="搜索机型 / 机场 / 词条…(支持 IATA、中英文)"
               aria-label="搜索关键词">
        <kbd class="cmdk-kbd">ESC</kbd>
      </div>
      <div class="cmdk-list" role="listbox"></div>
    </div>`;
  document.body.appendChild(panel);

  const input = panel.querySelector('.cmdk-input');
  const list = panel.querySelector('.cmdk-list');
  let results = [];
  let active = 0;

  const close = () => { panel.hidden = true; input.value = ''; };
  panel.addEventListener('click', (e) => { if (e.target === panel) close(); });

  const renderList = () => {
    if (!results.length) {
      list.innerHTML = `<div class="cmdk-empty">${input.value.trim() ? '没有匹配结果' : '输入关键词开始搜索'}</div>`;
      return;
    }
    list.innerHTML = results.map((it, i) => `
      <button class="cmdk-item ${i === active ? 'on' : ''}" role="option" data-href="${it.href}" aria-selected="${i === active}">
        <span class="cmdk-item-icon" aria-hidden="true">${it.icon}</span>
        <span class="cmdk-item-main"><b>${it.title}</b><span>${it.sub}</span></span>
        <span class="cmdk-item-type">${it.type}</span>
      </button>`).join('');
  };

  const go = (href) => { close(); location.hash = href; };

  list.addEventListener('click', (e) => {
    const btn = e.target.closest('.cmdk-item');
    if (btn) go(btn.dataset.href);
  });

  let searchSeq = 0;
  input.addEventListener('input', async () => {
    const seq = ++searchSeq;
    try {
      const items = await getIndex();
      if (seq !== searchSeq) return; // 已有更新的输入,丢弃
      results = search(items, input.value);
      active = 0;
      renderList();
    } catch { /* 索引失败已在 console 报告 */ }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { close(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(active + 1, results.length - 1); renderList(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(active - 1, 0); renderList(); }
    else if (e.key === 'Enter' && results[active]) { go(results[active].href); }
  });

  panel._open = () => {
    panel.hidden = false;
    input.focus();
    searchSeq++;
    getIndex().then((items) => {
      results = search(items, input.value);
      renderList();
    }).catch(() => {});
  };
  return panel;
}

/** main.js 启动时调用一次:注册全局快捷键与 header 按钮 */
export function initSearchPalette() {
  const closePanel = () => { if (panel) panel.hidden = true; };
  const openPanel = () => ensurePanel()._open();
  const toggle = () => (panel && !panel.hidden ? closePanel() : openPanel());

  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      toggle();
    }
  });
  const btn = document.getElementById('header-search');
  if (btn) btn.addEventListener('click', openPanel);
}
