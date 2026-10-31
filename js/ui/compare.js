/**
 * ui/compare.js — 机型对比页(#/compare)
 * 左右两列选变体,参数表并排 + 五项关键指标的相对条形图(以两者较大值为 100%)。
 * 数据走 engine/aircraft.loadAllVariants()(与机库卡片同源);本页不建 3D 场景。
 * 入口:机库 hero"机型对比"按钮、个人中心快捷入口、搜索面板可搜到本页路由由各页提供。
 */
import { loadAllVariants } from '../engine/aircraft.js';

/* 参与条形对比的数值指标(取两机较大值为满条) */
const BARS = [
  { key: 'length', label: '机身长', unit: 'm', fmt: (v) => v.toFixed(2) },
  { key: 'span', label: '翼展', unit: 'm', fmt: (v) => v.toFixed(2) },
  { key: 'range', label: '最大航程', unit: 'km', fmt: (v) => v.toLocaleString() },
  { key: 'mtow', label: 'MTOW', unit: 't', fmt: (v) => v.toFixed(1) },
  { key: 'seats', label: '两级座位', unit: '座', fmt: (v) => String(v) },
];

const ROWS = [
  { key: 'familyCn', label: '家族', fmt: (v) => v || '—' },
  { key: 'length', label: '机身长', fmt: (v) => `${v.toFixed(2)} m` },
  { key: 'span', label: '翼展', fmt: (v) => `${v.toFixed(2)} m` },
  { key: 'height', label: '高度', fmt: (v) => `${v.toFixed(2)} m` },
  { key: 'seats', label: '两级座位', fmt: (v) => `${v} 座` },
  { key: 'engines', label: '发动机', fmt: (v, x) => `${v} ×${x.engineCount}` },
  { key: 'cruise', label: '巡航', fmt: (v) => `${v}` },
  { key: 'range', label: '最大航程', fmt: (v) => `${v.toLocaleString()} km` },
  { key: 'mtow', label: 'MTOW', fmt: (v) => `${v.toFixed(1)} t` },
];

export function render(container) {
  container.innerHTML = `
  <div class="container">
    <section class="page-head">
      <h2 class="section-title">机型对比 <span class="sub">COMPARE · 参数并排对照</span></h2>
    </section>
    <div class="cmp-pick anim-fade-up">
      <select class="lv-select cmp-select" id="cmp-a" aria-label="机型 A"></select>
      <button class="btn btn-ghost btn-sm" id="cmp-swap" title="交换两机">⇄ 交换</button>
      <select class="lv-select cmp-select" id="cmp-b" aria-label="机型 B"></select>
    </div>
    <div id="cmp-body" class="anim-fade-up anim-delay-1"></div>
  </div>`;

  const selA = container.querySelector('#cmp-a');
  const selB = container.querySelector('#cmp-b');
  const body = container.querySelector('#cmp-body');
  let variants = [];
  let aId = null, bId = null;

  loadAllVariants().then((list) => {
    if (!list.length) throw new Error('机型数据为空');
    variants = list;
    const opt = (v) => `<option value="${v.id}">${v.cnName}(#${v.id.toUpperCase()})</option>`;
    selA.innerHTML = list.map(opt).join('');
    selB.innerHTML = list.map(opt).join('');
    /* 默认取前两款不同家族的机型,对比更有看点 */
    aId = list[0].id;
    bId = (list.find((v) => v.familyCn !== list[0].familyCn) || list[1] || list[0]).id;
    selA.value = aId;
    selB.value = bId;
    draw();
  }).catch((err) => {
    console.error('[compare] 机型数据加载失败:', err);
    body.innerHTML = `<div class="viewer-error glass-card">机型数据加载失败,请刷新重试。</div>`;
  });

  function getV(id) { return variants.find((v) => v.id === id); }

  function draw() {
    const A = getV(aId), B = getV(bId);
    if (!A || !B) return;

    const rows = ROWS.map((r) => `
      <tr>
        <td class="cmp-val">${r.fmt(A[r.key], A)}</td>
        <th>${r.label}</th>
        <td class="cmp-val">${r.fmt(B[r.key], B)}</td>
      </tr>`).join('');

    const bars = BARS.map((b) => {
      const va = Number(A[b.key]) || 0, vb = Number(B[b.key]) || 0;
      const max = Math.max(va, vb) || 1;
      const wa = (va / max) * 100, wb = (vb / max) * 100;
      return `
      <div class="cmp-bar-row">
        <div class="cmp-bar-line">
          <span class="cmp-bar-n">${b.fmt(va)}${b.unit}</span>
          <span class="cmp-bar"><i class="a" style="width:${wa}%"></i></span>
        </div>
        <span class="cmp-bar-label">${b.label}</span>
        <div class="cmp-bar-line">
          <span class="cmp-bar"><i class="b" style="width:${wb}%"></i></span>
          <span class="cmp-bar-n">${b.fmt(vb)}${b.unit}</span>
        </div>
      </div>`;
    }).join('');

    body.innerHTML = `
    <div class="cmp-table-wrap glass-card hud-frame">
      <table class="cmp-table">
        <thead><tr>
          <th class="cmp-head"><a href="#/aircraft/${A.id}">${A.cnName} <span class="sub">#${A.id.toUpperCase()}</span></a></th>
          <th></th>
          <th class="cmp-head"><a href="#/aircraft/${B.id}">${B.cnName} <span class="sub">#${B.id.toUpperCase()}</span></a></th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <section class="cmp-bars glass-card">
      <h3>关键指标对照 <span class="v-chip">条形以两机较大值为 100%</span></h3>
      ${bars}
    </section>`;
  }

  selA.addEventListener('change', () => { aId = selA.value; draw(); });
  selB.addEventListener('change', () => { bId = selB.value; draw(); });
  container.querySelector('#cmp-swap').addEventListener('click', () => {
    [aId, bId] = [bId, aId];
    selA.value = aId;
    selB.value = bId;
    draw();
  });

  return null;
}
