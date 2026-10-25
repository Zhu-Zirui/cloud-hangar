/**
 * ui/wiki.js — 民航百科占位(#/wiki)
 * P6 阶段建设:词条检索与知识卡片。
 */
export function render(container) {
  container.innerHTML = `
  <div class="container">
    <div class="placeholder-page glass-card hud-frame">
      <div class="ph-icon">
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M9 12 C9 9 11 7 14 7 L39 7 L39 38 L14 38 C11 38 9 40 9 43 Z"/>
          <path d="M9 43 C9 40 11 38 14 38"/>
          <path d="M16 15 L32 15 M16 21 L32 21 M16 27 L26 27"/>
        </svg>
      </div>
      <h2>民航百科</h2>
      <p>机型、航司、飞行原理与民航术语的词条库正在编撰,敬请期待。</p>
      <span class="ph-tag">建设中 · P6 阶段上线</span>
    </div>
  </div>`;
  return null;
}
