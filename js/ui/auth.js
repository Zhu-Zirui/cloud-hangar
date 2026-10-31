/**
 * ui/auth.js — 登录 / 注册页(#/login、#/register)
 * 账号为本机账号(core/auth.js):凭据只存访客浏览器,不上服务器,
 * 页面文案对用户明确说明这一点,并要求注册时勾选同意三份法律文档。
 * 依赖 header 的登录入口(main.js 渲染)与本页路由;登录成功跳 #/account。
 */
import { register, login } from '../core/auth.js';

const LEGAL_LINKS = `
  <a href="#/terms" target="_self">《服务条款》</a>、<a href="#/privacy" target="_self">《隐私政策》</a>与<a href="#/cookies" target="_self">《Cookie 说明》</a>`;

export function render(container, params) {
  const mode = params?.segments?.[0] === 'register' ? 'register' : 'login';
  const isReg = mode === 'register';

  container.innerHTML = `
  <div class="container">
    <section class="page-head">
      <h2 class="section-title">${isReg ? '注册机组成员' : '登录'}
        <span class="sub">${isReg ? 'SIGN UP · 创建本机账号' : 'SIGN IN · 本机账号登录'}</span>
      </h2>
    </section>
    <div class="auth-wrap anim-fade-up">
      <form class="auth-card glass-card hud-frame" id="auth-form" novalidate>
        <div class="auth-tabs" role="tablist">
          <a href="#/login" class="auth-tab ${!isReg ? 'on' : ''}">登录</a>
          <a href="#/register" class="auth-tab ${isReg ? 'on' : ''}">注册</a>
        </div>
        <p class="auth-note">${isReg
          ? '本站为纯静态站点,无服务器账号:注册信息(用户名 + 加盐哈希后的密码)只保存在你当前浏览器的本地存储中,不会上传,换设备或清除浏览器数据后需重新注册。'
          : '账号数据仅存于本机浏览器。未注册?<a href="#/register">点此创建账号</a>。'}</p>

        <label class="auth-field">
          <span>用户名</span>
          <input type="text" id="auth-name" name="username" autocomplete="username"
                 maxlength="20" placeholder="2-20 字,中英文 / 数字 / 下划线" required>
        </label>
        <label class="auth-field">
          <span>密码</span>
          <input type="password" id="auth-pass" name="password" autocomplete="${isReg ? 'new-password' : 'current-password'}"
                 placeholder="至少 6 位" required>
        </label>
        ${isReg ? `
        <label class="auth-field">
          <span>确认密码</span>
          <input type="password" id="auth-pass2" name="password2" autocomplete="new-password"
                 placeholder="再输入一遍" required>
        </label>
        <label class="auth-agree">
          <input type="checkbox" id="auth-agree" required>
          <span>我已阅读并同意${LEGAL_LINKS},知悉本站仅使用浏览器本地存储保存进度与账号,不采集个人数据。</span>
        </label>` : ''}

        <div class="auth-error" id="auth-error" hidden></div>
        <button type="submit" class="btn btn-primary auth-submit">${isReg ? '创建账号并登录' : '登录'}</button>
      </form>
    </div>
  </div>`;

  const form = container.querySelector('#auth-form');
  const errEl = container.querySelector('#auth-error');
  const nameEl = container.querySelector('#auth-name');
  const passEl = container.querySelector('#auth-pass');
  const pass2El = container.querySelector('#auth-pass2');
  const agreeEl = container.querySelector('#auth-agree');

  function fail(msg) {
    errEl.textContent = msg;
    errEl.hidden = false;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errEl.hidden = true;

    if (isReg && !agreeEl.checked) return fail('请先阅读并勾选同意服务条款与隐私政策');
    if (nameEl.value !== nameEl.value.trim()) return fail('用户名首尾不能有空格');

    const res = isReg
      ? await register(nameEl.value, passEl.value, pass2El ? pass2El.value : '')
      : await login(nameEl.value, passEl.value);

    if (!res.ok) return fail(res.error);

    /* 登录/注册成功:轻提示 + 跳个人中心 */
    const wrap = document.createElement('div');
    wrap.className = 'toast-wrap';
    wrap.innerHTML = `<div class="toast achieve">${isReg ? `欢迎加入,机长 ${res.username}!` : `欢迎回来,${res.username}!`}</div>`;
    document.body.appendChild(wrap);
    setTimeout(() => wrap.remove(), 3200);
    location.hash = '#/account';
  });
}
