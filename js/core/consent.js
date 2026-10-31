/**
 * core/consent.js — 首次访问同意横幅
 * 本站不使用 Cookie,仅用 localStorage 保存进度与偏好;横幅在首次访问时
 * 以底部悬浮条告知这一点并给出三份法律文档入口,点"知道了"记录 cav3d.consent。
 * 已记录同意(或用户主动关闭)后不再打扰。由 main.js 启动时调用 initConsentBanner()。
 */
import { storeGet, storeSet } from './store.js';

export function initConsentBanner() {
  if (storeGet('consent', null)) return; // 已同意/已知晓,不再打扰

  const bar = document.createElement('div');
  bar.className = 'consent-banner';
  bar.setAttribute('role', 'dialog');
  bar.setAttribute('aria-label', '数据使用告知');
  bar.innerHTML = `
    <p class="consent-text">
      <b>关于数据与 Cookie:</b>本站为非商业科普项目,不使用 Cookie、不采集个人数据,
      仅通过浏览器本地存储(localStorage)保存你的浏览进度、偏好与本机账号,数据不会离开你的设备。
      详见<a href="#/privacy">《隐私政策》</a>、<a href="#/cookies">《Cookie 说明》</a>与<a href="#/terms">《服务条款》</a>。
    </p>
    <div class="consent-actions">
      <button class="btn btn-primary btn-sm" type="button">知道了</button>
    </div>`;

  const dismiss = () => {
    storeSet('consent', { acceptedAt: Date.now() });
    bar.classList.add('leaving');
    setTimeout(() => bar.remove(), 350);
  };
  bar.querySelector('.consent-actions .btn').addEventListener('click', dismiss);

  document.body.appendChild(bar);
}
