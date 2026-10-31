/**
 * ui/account.js — 个人中心(#/account)
 * 展示本机账号信息(用户名/注册时间)+ 站内进度仪表盘(等级/徽章/四条收集进度,
 * 数据口径与成就中心一致)+ 登出与注销入口。
 * 未登录时渲染引导卡而非报错。本页不 import three,保持纯 DOM 轻量。
 */
import { storeGet } from '../core/store.js';
import { getSession, logout, deleteAccount, getUsers } from '../core/auth.js';
import { RANKS } from './game.js';

/* 部件总数为 30(parts.json);与 game.js 同口径,不 import parts.js 以免引入 three 依赖 */
const PARTS_TOTAL = 30;

function loadJson(path) {
  return fetch(new URL(path, import.meta.url)).then((r) => r.json());
}

let totalsP = null;
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

const fmtDate = (ts) => new Date(ts).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });

export function render(container) {
  const session = getSession();

  /* 未登录:引导卡(不跳转,给用户明确入口) */
  if (!session) {
    container.innerHTML = `
    <div class="container">
      <section class="page-head"><h2 class="section-title">个人中心 <span class="sub">ACCOUNT</span></h2></section>
      <div class="auth-wrap anim-fade-up">
        <div class="auth-card glass-card hud-frame auth-guide">
          <p>你还没有登录。登录后可以在个人中心查看你的飞行等级、徽章与收集进度。</p>
          <p class="auth-note">本站为纯静态站点,账号仅保存在本机浏览器,无需邮箱手机,即注即用。</p>
          <div class="auth-actions">
            <a class="btn btn-primary" href="#/login">登录</a>
            <a class="btn btn-ghost" href="#/register">注册</a>
          </div>
        </div>
      </div>
    </div>`;
    return null;
  }

  const st = {
    pilotRank: storeGet('pilotRank', 0) || 0,
    badges: storeGet('badges', []) || [],
    seenLiveries: storeGet('seenLiveries', []) || [],
    exploredParts: storeGet('exploredParts', []) || [],
    seenAirports: storeGet('seenAirports', []) || [],
    readWiki: storeGet('readWiki', []) || [],
  };

  const user = getUsers()[session.username];
  const createdAt = user?.createdAt || session.loginAt;

  container.innerHTML = `
  <div class="container">
    <section class="page-head"><h2 class="section-title">个人中心 <span class="sub">ACCOUNT · ${session.username}</span></h2></section>

    <div class="acct-top">
      <div class="acct-id glass-card hud-frame anim-fade-up">
        <div class="acct-avatar" aria-hidden="true">${session.username.slice(0, 1)}</div>
        <div class="acct-id-info">
          <h3>${session.username}</h3>
          <p>本机账号 · 注册于 ${fmtDate(createdAt)}</p>
          <p>最近登录 ${fmtDate(session.loginAt)}</p>
        </div>
        <span class="v-chip">当前等级:${RANKS[st.pilotRank]}</span>
      </div>

      <div class="acct-quick glass-card anim-fade-up anim-delay-1">
        <h3>快捷入口</h3>
        <div class="auth-actions">
          <a class="btn btn-ghost" href="#/game">成就中心</a>
          <a class="btn btn-ghost" href="#/hangar">前往机库</a>
          <a class="btn btn-ghost" href="#/airports">机场图鉴</a>
        </div>
        <p class="auth-note">进度数据保存在本机浏览器,与账号绑定于同一设备;换设备或清除浏览器数据不会同步。</p>
      </div>
    </div>

    <section class="acct-stats anim-fade-up">
      <h2 class="section-title">我的进度 <span class="sub">PROGRESS</span></h2>
      <div class="acct-stat-grid" id="acct-stats">
        <div class="glass-card acct-stat"><b>—</b><span>飞行等级</span></div>
      </div>
    </section>

    <section class="acct-danger anim-fade-up">
      <h2 class="section-title">账号管理 <span class="sub">MANAGE</span></h2>
      <div class="glass-card acct-danger-card">
        <div class="acct-danger-row">
          <div><b>退出登录</b><span>清除本机会话,账号与进度保留。</span></div>
          <button class="btn btn-ghost" id="acct-logout">退出登录</button>
        </div>
        <div class="acct-danger-row">
          <div><b>注销本机账号</b><span>删除本机保存的该账号凭据;浏览进度等其他本地数据不受影响。</span></div>
          <button class="btn btn-ghost acct-danger-btn" id="acct-delete">注销账号</button>
        </div>
      </div>
    </section>
  </div>`;

  /* 进度九宫格(总数按真实数据文件计算) */
  getTotals().then((t) => {
    const stats = [
      { v: RANKS[st.pilotRank], s: '飞行等级' },
      { v: `${st.badges.length} / 10`, s: '徽章点亮' },
      { v: `${st.seenLiveries.length} / ${t.liveries}`, s: '涂装图鉴' },
      { v: `${t.variants}`, s: '机型在册' },
      { v: `${st.exploredParts.length} / ${t.parts}`, s: '部件探索' },
      { v: `${st.seenAirports.length} / ${t.airports}`, s: '机场图鉴' },
      { v: `${st.readWiki.length} / ${t.wiki}`, s: '词条阅读' },
    ];
    container.querySelector('#acct-stats').innerHTML = stats.map((it) => `
      <div class="glass-card acct-stat"><b>${it.v}</b><span>${it.s}</span></div>`).join('');
  }).catch((err) => console.error('[account] 进度统计加载失败:', err));

  /* 退出登录 */
  container.querySelector('#acct-logout').addEventListener('click', () => {
    logout();
    location.hash = '#/login';
  });

  /* 注销本机账号:二次确认 */
  const delBtn = container.querySelector('#acct-delete');
  delBtn.addEventListener('click', () => {
    if (delBtn.dataset.armed !== '1') {
      delBtn.dataset.armed = '1';
      delBtn.textContent = '再点一次确认注销';
      delBtn.classList.add('btn-primary');
      setTimeout(() => {
        if (delBtn.isConnected) { delBtn.dataset.armed = ''; delBtn.textContent = '注销账号'; delBtn.classList.remove('btn-primary'); }
      }, 4000);
      return;
    }
    deleteAccount(session.username);
    location.hash = '#/hangar';
  });

  return null;
}
