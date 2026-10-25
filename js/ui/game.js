/**
 * ui/game.js — 成就/答题/收集占位(#/game)
 * P6 阶段建设:答题晋级、涂装收集图鉴与成就系统。
 */
export function render(container) {
  container.innerHTML = `
  <div class="container">
    <div class="placeholder-page glass-card hud-frame">
      <div class="ph-icon">
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M15 8 L33 8 L33 20 C33 28 29 33 24 36 C19 33 15 28 15 20 Z"/>
          <path d="M33 12 L39 12 L39 16 C39 21 36 23 33 23"/>
          <path d="M15 12 L9 12 L9 16 C9 21 12 23 15 23"/>
          <path d="M24 14 L24 30 M18 22 L30 22"/>
        </svg>
      </div>
      <h2>成就中心</h2>
      <p>答题晋级、涂装收集图鉴与成就徽章正在铸造中,收集之旅即将开启。</p>
      <span class="ph-tag">建设中 · P6 阶段上线</span>
    </div>
  </div>`;
  return null;
}
