/**
 * ui/airports.js — 机场图鉴占位(#/airports)
 * P5 阶段建设:中国机场分布示意地图 + 机场档案卡。
 */
export function render(container) {
  container.innerHTML = `
  <div class="container">
    <div class="placeholder-page glass-card hud-frame">
      <div class="ph-icon">
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M8 40 L8 22 L14 22 L14 40"/>
          <path d="M12 22 L12 10 L18 10 L18 40"/>
          <path d="M6 40 L34 40"/>
          <path d="M34 40 C34 32 38 28 42 26 L42 40"/>
        </svg>
      </div>
      <h2>机场图鉴</h2>
      <p>中国主要民用机场的分布示意与档案卡正在铺设跑道,对外开放即将到来。</p>
      <span class="ph-tag">建设中 · P5 阶段上线</span>
    </div>
  </div>`;
  return null;
}
