/**
 * ui/viewer.js — 机型查看页占位(#/aircraft/<variantId>)
 * P1 阶段由 3D 查看器(涂装切换/动画开关/部件热点)取代本占位。
 */

function esc(s) {
  return String(s).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

export function render(container, params) {
  const variantId = params.segments[1] || '';
  container.innerHTML = `
  <div class="container">
    <div class="placeholder-page glass-card hud-frame">
      <div class="ph-icon">
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="24" cy="24" r="19"/>
          <path d="M24 14 L24 24 L31 31"/>
          <circle cx="24" cy="24" r="2.4" fill="currentColor" stroke="none"/>
        </svg>
      </div>
      <h2>机型查看页</h2>
      <p>3D 机型查看器正在总装中:360° 赏机、涂装切换、部件热点将在此呈现。${
        variantId ? `目标机型:<b>${esc(variantId)}</b>` : ''
      }</p>
      <span class="ph-tag">建设中 · P1 阶段上线</span>
    </div>
  </div>`;
  return null;
}
