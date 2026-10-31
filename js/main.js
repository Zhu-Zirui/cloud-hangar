/**
 * main.js — 启动 + hash 路由
 * 路由表:#/hangar(默认) #/aircraft/<variantId> #/airports #/wiki #/game
 *         #/login #/register #/account(本机账号) #/terms #/privacy #/cookies(法律文档)
 * 页面模块约定:导出 render(container, params) → 返回清理函数或 null。
 * 切换路由时先调用上一页的清理函数(释放 3D 场景 RAF/监听器),再挂载新页。
 */

import { getSession } from './core/auth.js';
import { initConsentBanner } from './core/consent.js';
import { initSearchPalette } from './ui/search.js';

const app = document.getElementById('app');

/** 路由表:懒加载各页面模块 */
const ROUTES = {
  hangar:   { module: () => import('./ui/hangar.js'),   nav: 'hangar' },
  aircraft: { module: () => import('./ui/viewer.js'),    nav: 'hangar' },
  cabin:    { module: () => import('./ui/cabin.js'),     nav: 'hangar' },  // P4 舱内漫游
  airports: { module: () => import('./ui/airports.js'),  nav: 'airports' },
  wiki:     { module: () => import('./ui/wiki.js'),      nav: 'wiki' },
  game:     { module: () => import('./ui/game.js'),      nav: 'game' },
  compare:  { module: () => import('./ui/compare.js'),   nav: 'hangar' },  // 机型对比,归"机库"高亮
  login:    { module: () => import('./ui/auth.js'),      nav: '' },
  register: { module: () => import('./ui/auth.js'),      nav: '' },
  account:  { module: () => import('./ui/account.js'),   nav: '' },
  terms:    { module: () => import('./ui/legal.js'),     nav: '' },
  privacy:  { module: () => import('./ui/legal.js'),     nav: '' },
  cookies:  { module: () => import('./ui/legal.js'),     nav: '' },
};

let currentCleanup = null; // 当前页面的清理函数
let navToken = 0;          // 防止快速切换路由时旧异步导入覆盖新页面

/** 解析 location.hash → 路径段数组;非法或为空时落到 hangar */
function parseHash() {
  const raw = location.hash.replace(/^#/, '');
  if (!raw.startsWith('/')) return ['hangar'];
  const segments = raw.split('/').filter(Boolean);
  return segments.length ? segments : ['hangar'];
}

/** 根据路由名高亮顶部导航(aircraft 归属"机库"高亮) */
function setActiveNav(navName) {
  document.querySelectorAll('#main-nav a[data-route]').forEach((a) => {
    a.classList.toggle('active', a.dataset.route === navName);
  });
}

async function navigate() {
  const token = ++navToken;
  const segments = parseHash();
  const route = ROUTES[segments[0]] ? segments[0] : 'hangar';

  let mod;
  try {
    mod = await ROUTES[route].module();
  } catch (err) {
    console.error('[router] 页面模块加载失败:', route, err);
    return;
  }
  if (token !== navToken) return; // 已有更新的导航,丢弃本次结果

  if (typeof currentCleanup === 'function') {
    try { currentCleanup(); } catch (err) { console.warn('[router] 清理上一页失败:', err); }
  }
  currentCleanup = null;

  app.innerHTML = '';
  window.scrollTo(0, 0);

  const cleanup = mod.render(app, { segments, route });
  currentCleanup = typeof cleanup === 'function' ? cleanup : null;
  setActiveNav(ROUTES[route].nav);
}

window.addEventListener('hashchange', navigate);

/* ---------- header 账号徽标(登录入口 / 已登录头像) ---------- */

const headerAuth = document.getElementById('header-auth');

function renderHeaderAuth() {
  const session = getSession();
  if (!session) {
    headerAuth.innerHTML = '<a class="btn btn-ghost btn-sm header-auth-btn" href="#/login">登录 / 注册</a>';
    return;
  }
  headerAuth.innerHTML = `
    <a class="user-chip" href="#/account" title="个人中心">
      <span class="user-avatar" aria-hidden="true">${session.username.slice(0, 1)}</span>
      <span class="user-name">${session.username}</span>
    </a>`;
}

window.addEventListener('cav3d:authchange', renderHeaderAuth);

// 初始进入:无 hash 时静默替换为 #/hangar(不触发 hashchange,需手动渲染一次)
if (!location.hash) history.replaceState(null, '', '#/hangar');
renderHeaderAuth();
initConsentBanner();
initSearchPalette();
navigate();
