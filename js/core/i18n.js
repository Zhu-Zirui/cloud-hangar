/**
 * core/i18n.js — 全站多语言(P10)
 * 架构:运行时 DOM 文本翻译。页面代码零侵入,渲染后的文本节点/常用属性
 * 按「语言包词典」整体替换;数据名称(机场/航司/部件/机型)走 names.js 映射表。
 * - 语言检测:navigator.languages → cav3d.lang 持久化;默认简体中文。
 * - zh-CN 为源语言(恒等),其余语言包按需动态 import(js/locales/<code>.js)。
 * - 阿拉伯语 RTL:html[dir=rtl],配合 main.css §I18N。
 * - MutationObserver 兜底覆盖晚插入节点(toast / 命令面板 / 成就弹窗)。
 * - 深度内容(百科正文/题库/法律文本/机场冷知识)暂仅中文,非中文语言下由
 *   contentNotice() 在相应页面顶部提示(main.js 注入)。
 */
import { storeGet, storeSet } from './store.js';

export const LANGS = [
  { code: 'zh-CN', name: '简体中文', dir: 'ltr' },
  { code: 'zh-TW', name: '繁體中文', dir: 'ltr' },
  { code: 'en', name: 'English', dir: 'ltr' },
  { code: 'fr', name: 'Français', dir: 'ltr' },
  { code: 'ru', name: 'Русский', dir: 'ltr' },
  { code: 'es', name: 'Español', dir: 'ltr' },
  { code: 'ar', name: 'العربية', dir: 'rtl' },
  { code: 'ja', name: '日本語', dir: 'ltr' },
  { code: 'ko', name: '한국어', dir: 'ltr' },
  { code: 'hi', name: 'हिन्दी', dir: 'ltr' },
];

const DEFAULT_TITLE = '云端机库 · 中国民航 3D 图鉴';
const CJK_RE = /[\u3400-\u9fff\uf900-\ufaff]/;

let lang = null;          // 当前 LANGS 项
let dict = null;          // 当前语言包 { ui, provinces, oems, meta, notice }
let nameMap = null;       // cn → 目标语名称(非 zh-CN 时)
let exact = null;         // zh → 译文(不含占位)
let patterns = null;      // 含 {} 的模式,按字面长度降序
let translating = false;  // 防观察器自触发
let chromeSnapshot = null;

/* ---------- 语言选择与语言包加载 ---------- */

/**
 * 首访默认语言优先级(用户 2026-10-31 指定:不看浏览器语言,一律走 IP):
 *   URL ?lang= 参数 > 已保存的手动选择 > IP 归属地主要语言 > 英语
 * IP 探测用 get.geojs.io 免费接口(1.2s 超时),国家码本机缓存 30 天;
 * 探测失败或国家不在映射表 → 英语。
 */

/** 国家/地区 → 本站语言(仅列主要通用语言属于 10 语种的国家;未列出的默认英语) */
const LANG_BY_COUNTRY = {
  zhCN: ['CN', 'SG'],
  'zh-TW': ['TW', 'HK', 'MO'],
  fr: ['FR', 'BE', 'LU', 'MC', 'SN', 'CI', 'ML', 'BF', 'NE', 'TG', 'BJ', 'CD', 'CG', 'GA', 'CM', 'HT'],
  ru: ['RU', 'BY', 'KZ', 'KG'],
  es: ['ES', 'MX', 'AR', 'CL', 'CO', 'PE', 'VE', 'EC', 'UY', 'PY', 'BO', 'CR', 'PA', 'GT', 'HN', 'SV', 'NI', 'DO', 'CU', 'PR', 'GQ'],
  ar: ['SA', 'AE', 'EG', 'QA', 'KW', 'BH', 'OM', 'JO', 'LB', 'IQ', 'SY', 'YE', 'LY', 'DZ', 'MA', 'TN', 'SD', 'PS', 'MR', 'KM', 'DJ'],
  ja: ['JP'],
  ko: ['KR', 'KP'],
  hi: ['IN'],
};

/** 纯函数,便于测试:ISO 3166-1 alpha-2 国家码 → 本站语言码或 null(=英语) */
export function langForCountry(cc) {
  const c = String(cc || '').toUpperCase();
  if (!c) return null;
  for (const [code, list] of Object.entries(LANG_BY_COUNTRY)) {
    if (list.includes(c)) return code === 'zhCN' ? 'zh-CN' : code;
  }
  return null;
}

const GEO_CACHE_KEY = 'geo';
const GEO_TTL = 30 * 24 * 3600 * 1000; // 国家码缓存 30 天

async function geoCountry(timeoutMs = 1200) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch('https://get.geojs.io/v1/ip/country.json', { signal: ctl.signal });
    if (!res.ok) return null;
    const data = await res.json();
    return (data && data.country) || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** 同步检测:URL 参数 / 已保存的手动选择;都不命中返回 null(交给 IP 探测) */
function detectLangSync() {
  const param = new URLSearchParams(location.search).get('lang');
  if (param && LANGS.some((l) => l.code === param)) return { code: param, via: 'param' };
  const saved = storeGet('lang', null);
  if (saved && LANGS.some((l) => l.code === saved)) return { code: saved, via: 'saved' };
  return null;
}

async function detectLang() {
  const sync = detectLangSync();
  if (sync) return sync;
  // 浏览器语言不命中 → IP 归属地(缓存 30 天)→ 未映射/失败 → 英语
  const cached = storeGet(GEO_CACHE_KEY, null);
  let cc = cached && cached.cc && (Date.now() - (cached.ts || 0) < GEO_TTL) ? cached.cc : null;
  if (!cc) {
    cc = await geoCountry();
    if (cc) storeSet(GEO_CACHE_KEY, { cc, ts: Date.now() });
  }
  const mapped = langForCountry(cc);
  if (mapped) return { code: mapped, via: 'geo' };
  return { code: 'en', via: 'fallback-en' };
}

async function loadLocale(code) {
  if (code === 'zh-CN') {
    dict = { ui: {}, provinces: {}, oems: {}, meta: { title: DEFAULT_TITLE }, notice: '' };
    nameMap = null;
  } else {
    const mod = await import(`../locales/${code}.js`);
    dict = mod.default;
    const names = await import('../locales/names.js');
    nameMap = code === 'zh-TW' ? names.NAMES_TW : names.NAMES_EN;
  }
  exact = new Map();
  patterns = [];
  for (const [k, v] of Object.entries(dict.ui || {})) {
    if (k.includes('{}')) {
      const re = new RegExp('^' + k.split('{}').map(escapeRe).join('(.*?)') + '$');
      patterns.push({ re, v, w: k.replace(/\{\}/g, '').length });
    } else {
      exact.set(k, v);
    }
  }
  patterns.sort((a, b) => b.w - a.w);
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function getLang() {
  return lang ? lang.code : 'zh-CN';
}

export async function setLang(code) {
  const item = LANGS.find((l) => l.code === code);
  if (!item || (lang && lang.code === code)) return;
  lang = item;
  storeSet('lang', code);
  await loadLocale(code);
  document.documentElement.lang = code;
  document.documentElement.dir = item.dir;
  document.title = (dict.meta && dict.meta.title) || DEFAULT_TITLE;
  window.dispatchEvent(new CustomEvent('cav3d:langchange', { detail: { code } }));
}

/* ---------- 翻译核心 ---------- */

/** 代码级翻译:confirm()/动态拼接等拿不到 DOM 的场景。zh-CN 恒等返回。 */
export function t(zh) {
  if (!dict || lang.code === 'zh-CN') return zh;
  const out = trText(zh);
  return out === null ? zh : out;
}

/** 单条文本翻译;无可译内容返回 null */
function trText(raw) {
  const lead = raw.match(/^\s*/)[0];
  const trail = raw.match(/\s*$/)[0];
  const s = raw.trim().replace(/\s+/g, ' ');
  if (!s || !CJK_RE.test(s)) return null;
  if (nameMap && nameMap[s]) return lead + nameMap[s] + trail;
  const prov = dict.provinces && dict.provinces[s];
  if (prov) return lead + prov + trail;
  const oem = dict.oems && dict.oems[s];
  if (oem) return lead + oem + trail;
  const ex = exact.get(s);
  if (ex) return lead + ex + trail;
  for (const p of patterns) {
    const m = p.re.exec(s);
    if (m) {
      let out = p.v;
      for (let i = 1; i < m.length; i++) out = out.replace('{}', m[i]);
      return lead + out + trail;
    }
  }
  return null;
}

/** 翻译一个子树的文本节点与 title/placeholder/aria-label 属性 */
export function applyDOM(root) {
  if (!dict || lang.code === 'zh-CN' || !root) return;
  translating = true;
  try {
    if (root.nodeType === 3) {
      const out = trText(root.nodeValue);
      if (out) root.nodeValue = out;
      return;
    }
    if (root.nodeType !== 1) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      if (n.parentElement.closest('[data-i18n-skip],script,style')) continue;
      const out = trText(n.nodeValue);
      if (out) n.nodeValue = out;
    }
    root.querySelectorAll('[title],[placeholder],[aria-label]').forEach((el) => {
      if (el.closest('[data-i18n-skip]')) return;
      for (const a of ['title', 'placeholder', 'aria-label']) {
        const v = el.getAttribute(a);
        if (!v) continue;
        const out = trText(v);
        if (out) el.setAttribute(a, out);
      }
    });
  } finally {
    translating = false;
  }
}

/* ---------- 名称与提示 ---------- */

/** 数据名称查表(机场/航司/机型/部件渲染文本节点已由 applyDOM 覆盖,此函数供代码拼接用) */
export function pickName(zhName) {
  if (!nameMap || !zhName) return zhName;
  return nameMap[zhName] || zhName;
}

/** 深度内容语言提示(非简中语言,内容型页面顶部细条) */
export function contentNotice() {
  if (lang.code === 'zh-CN' || !dict.notice) return '';
  return `<div class="i18n-note" data-i18n-skip>${dict.notice}</div>`;
}

/* ---------- 启动:chrome 快照 / 切换器 / 观察器 ---------- */

function buildSwitcher() {
  const menu = document.getElementById('lang-menu');
  const btn = document.getElementById('lang-btn');
  if (!menu || !btn) return;
  menu.innerHTML = LANGS.map((l) =>
    `<button type="button" class="lang-item${l.code === lang.code ? ' on' : ''}" data-lang="${l.code}" role="option" aria-selected="${l.code === lang.code}">${l.name}</button>`
  ).join('');
  const cur = document.getElementById('lang-current');
  if (cur) cur.textContent = lang.name;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.hidden = !menu.hidden;
    btn.setAttribute('aria-expanded', String(!menu.hidden));
  });
  menu.addEventListener('click', (e) => {
    const item = e.target.closest('[data-lang]');
    if (!item) return;
    menu.hidden = true;
    setLang(item.dataset.lang);
  });
  document.addEventListener('click', () => { menu.hidden = true; });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') menu.hidden = true; });
}

function snapshotChrome() {
  if (chromeSnapshot) return;
  chromeSnapshot = {
    header: document.querySelector('.site-header')?.innerHTML || '',
    footer: document.querySelector('.site-footer')?.innerHTML || '',
  };
}

function restoreChrome() {
  if (!chromeSnapshot) return;
  translating = true;
  try {
    const h = document.querySelector('.site-header');
    const f = document.querySelector('.site-footer');
    if (h) h.innerHTML = chromeSnapshot.header;
    if (f) f.innerHTML = chromeSnapshot.footer;
  } finally {
    translating = false;
  }
  buildSwitcher();
  applyDOM(document.body);
}

/** 启动入口:main.js 首渲染前 await */
export async function initI18n() {
  const picked = await detectLang();
  if (picked.via === 'param') storeSet('lang', picked.code); // ?lang= 视为明确选择,持久化
  lang = LANGS.find((l) => l.code === picked.code) || LANGS[0];
  await loadLocale(lang.code);
  document.documentElement.lang = lang.code;
  document.documentElement.dir = lang.dir;
  document.title = (dict.meta && dict.meta.title) || DEFAULT_TITLE;
  snapshotChrome();
  buildSwitcher();
  if (lang.code !== 'zh-CN') applyDOM(document.body);

  // 晚插入节点(toast/命令面板/成就弹窗)兜底翻译
  const mo = new MutationObserver((muts) => {
    if (translating || lang.code === 'zh-CN') return;
    for (const m of muts) {
      for (const n of m.addedNodes) {
        if (n.nodeType === 1 && n.closest && n.closest('[data-i18n-skip]')) continue;
        queueMicrotask(() => applyDOM(n));
      }
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });

  // 语言切换:恢复 header/footer 原文后按新语言重译(页面主体由 main.js 重渲染)
  window.addEventListener('cav3d:langchange', restoreChrome);
}
