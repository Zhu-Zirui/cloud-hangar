/**
 * ui/cabin.js — 舱内漫游页(#/cabin/<variantId>?mode=cockpit|cabin)
 * P4:驾驶舱/客舱共用一页,按 mode 动态挂载 js/interior/ 对应场景;
 * 顶部 HUD 提供返回查看页、舱位切换、演示按钮、相机预设、夜航开关。
 * 宽体机标注"舱内以窄体布局示意";c919 驾驶舱标注"示意"。
 * 进入客舱漫游 → 写 cav3d.emDemo(P6 徽章自动点亮;应急演示已按用户要求移除)。
 */
import { loadVariant, VARIANT_ORDER } from '../engine/aircraft.js';
import { storeSet } from '../core/store.js';
import { checkAchievements } from './game.js';

const WIDE = new Set(['a332', 'a333', 'b788', 'b789', 'a359', 'b748']); // 宽体变体(舱内仍用窄体布局)

function toast(msg, type = '') {
  let wrap = document.querySelector('.toast-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'toast-wrap';
    document.body.appendChild(wrap);
  }
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => {
    el.classList.add('leaving');
    setTimeout(() => el.remove(), 320);
  }, 2600);
}

export function render(container, params) {
  const raw = params.segments[1] || '';
  const [variantId, query] = raw.split('?');
  const qs = new URLSearchParams(query || '');
  let mode = qs.get('mode') === 'cabin' ? 'cabin' : 'cockpit';
  let disposed = false;
  let interior = null;

  /* 未知变体:错误页 */
  if (!VARIANT_ORDER.includes(variantId)) {
    container.innerHTML = `
    <div class="container">
      <div class="viewer-error glass-card hud-frame">
        <h2>未找到机型</h2>
        <p>变体 ID <b style="font-family:var(--mono)">${variantId || '(空)'}</b> 不在图鉴中。</p>
        <a class="btn btn-primary" style="margin-top:18px" href="#/hangar">返回机库</a>
      </div>
    </div>`;
    return () => {};
  }

  /* 骨架 */
  container.innerHTML = `
  <div class="container cabin-wrap">
    <div class="cabin-main glass-card hud-frame">
      <div id="cb-3d"><div class="v-loading"><div class="ring"></div>舱内环境搭建中…</div></div>
      <div class="cb-topbar">
        <a class="btn btn-ghost btn-sm" href="#/aircraft/${variantId}">◀ 返回查看页</a>
        <div class="cb-title" id="cb-title">…</div>
        <div class="cb-tabs">
          <a class="cb-tab" id="tab-cockpit" href="#/cabin/${variantId}?mode=cockpit">驾驶舱</a>
          <a class="cb-tab" id="tab-cabin" href="#/cabin/${variantId}?mode=cabin">客舱</a>
        </div>
        <span class="cb-chip" id="cb-note" style="display:none"></span>
        <span class="spacer"></span>
        <div class="cb-actions" id="cb-actions"></div>
        <label class="switch cb-night"><input type="checkbox" id="cb-night-tg"><span class="slider"></span>夜航</label>
      </div>
      <div class="cb-presets" id="cb-presets"></div>
      <div class="cb-hint" id="cb-hint"></div>
    </div>
  </div>`;

  const stageEl = container.querySelector('#cb-3d');
  const actionsEl = container.querySelector('#cb-actions');
  const presetsEl = container.querySelector('#cb-presets');
  const hintEl = container.querySelector('#cb-hint');

  const HINTS = {
    cockpit: '<b>360°</b> 拖拽环视 · 滚轮缩放 · <b>油门杆可拖动</b> · 顶板按钮亮/暗 · 点击<b>后舱门</b>进入客舱',
    cabin: '拖拽转视角 · <b>WASD</b> 行走(走廊内) · 点击地面光圈跳转',
  };

  async function mount() {
    stageEl.innerHTML = '<div class="v-loading"><div class="ring"></div>场景生成中…</div>';
    if (interior) { interior.dispose(); interior = null; }

    /* 标题 / 备注 */
    let familyCn = variantId.toUpperCase();
    try {
      const info = await loadVariant(variantId);
      if (info) familyCn = info.familyCn + ' · ' + info.variant.cnName;
    } catch (err) { /* 标题降级为变体 ID */ }
    if (disposed) return;
    container.querySelector('#cb-title').textContent = `${familyCn} · ${mode === 'cockpit' ? '驾驶舱' : '客舱'}`;
    const noteEl = container.querySelector('#cb-note');
    if (mode === 'cockpit' && variantId === 'c919') {
      noteEl.textContent = 'C919 示意(以 A320 座舱为基准)'; noteEl.style.display = '';
    } else if (WIDE.has(variantId)) {
      noteEl.textContent = '舱内以窄体布局示意'; noteEl.style.display = '';
    } else noteEl.style.display = 'none';

    container.querySelector('#tab-cockpit').classList.toggle('on', mode === 'cockpit');
    container.querySelector('#tab-cabin').classList.toggle('on', mode === 'cabin');
    hintEl.innerHTML = HINTS[mode];

    /* 挂载对应场景 */
    const mod = mode === 'cockpit'
      ? await import('../interior/cockpit.js')
      : await import('../interior/cabin.js');
    if (disposed) return;
    interior = mod.createCabin ? mod.createCabin(stageEl, { variantId, onToast: toast })
      : mod.createCockpit(stageEl, {
        variantId, onToast: toast,
        onDoor: () => { location.hash = `#/cabin/${variantId}?mode=cabin`; }, // 后舱门 → 客舱
      });
    stageEl.querySelector('.v-loading')?.remove(); // 场景就绪,摘掉加载遮罩

    /* P6 打卡:进入客舱漫游(原应急演示成就改挂于此) */
    if (mode === 'cabin') {
      storeSet('emDemo', true);
      checkAchievements().catch(() => {});
    }

    buildActions();
    buildPresets();
  }

  /* HUD 动作按钮(按舱位不同) */
  function buildActions() {
    actionsEl.innerHTML = '';
    const mkBtn = (label, title, fn) => {
      const b = document.createElement('button');
      b.className = 'btn btn-ghost btn-sm';
      b.textContent = label; b.title = title || label;
      b.addEventListener('click', fn);
      actionsEl.appendChild(b);
      return b;
    };
    if (mode === 'cockpit') {
      mkBtn('起飞演示', '约 40 秒:TOGA→100节/V1/VR 抬轮→爬升收轮→3000ft 改平(含英文口令)', () => {
        if (!interior.isDemo()) interior.startDemo('takeoff');
      });
      mkBtn('降落演示', '1800ft 下滑→1000ft 放轮→50ft 拉平→接地减速(含英文口令)', () => {
        if (!interior.isDemo()) interior.startDemo('landing');
      });
    } else {
      mkBtn('行李架', '行李架舱门整体开/合', (e) => {
        const open = interior.toggleBins();
        e.currentTarget.classList.toggle('on', open);
      });
    }
  }

  /* 相机预设 chips */
  function buildPresets() {
    presetsEl.innerHTML = '';
    for (const [key, cn] of interior.presets) {
      const b = document.createElement('button');
      b.className = 'btn btn-ghost btn-xs';
      b.textContent = cn;
      b.addEventListener('click', () => interior.flyTo(key));
      presetsEl.appendChild(b);
    }
  }

  /* P6 打卡:夜航 → nightUsed(客舱漫游打卡在 mount 时写入) */
  const nightTg = container.querySelector('#cb-night-tg');
  nightTg.addEventListener('change', () => {
    if (!interior) return;
    interior.setNight(nightTg.checked);
    if (nightTg.checked) {
      storeSet('nightUsed', true);
      checkAchievements().catch(() => {});
    }
  });

  mount();

  return () => {
    disposed = true;
    if (interior) { interior.dispose(); interior = null; }
  };
}
