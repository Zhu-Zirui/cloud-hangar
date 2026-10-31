/**
 * ui/compare.js — 机型对比页(#/compare)
 * 数据源 data/aircraft-catalog.json(78 款,12 厂商:波音/空客/巴航工业/ATR/德哈维兰/
 * 中国商飞/麦道/图波列夫/安东诺夫/伊柳申/苏霍伊/其他经典)。
 * 左右下拉(按厂商 optgroup)+ 12 行参数并排表 + 5 项指标双向条形(较大值=100%)。
 * 选中机型若 id 在真实 GLB 变体表内,标题可跳 3D 查看页;approx 条目显示"含约值"提示。
 */
import { GLB_VARIANTS } from '../engine/gltfModel.js';

const REAL_IDS = new Set(Object.keys(GLB_VARIANTS));

/* 参与条形对比的数值指标 */
const BARS = [
  { key: 'length', label: '机身长', unit: 'm', fmt: (v) => v.toFixed(2) },
  { key: 'span', label: '翼展', unit: 'm', fmt: (v) => v.toFixed(2) },
  { key: 'range', label: '最大航程', unit: 'km', fmt: (v) => v.toLocaleString() },
  { key: 'mtow', label: 'MTOW', unit: 't', fmt: (v) => v.toFixed(1) },
  { key: 'seats', label: '两级座位', unit: '座', fmt: (v) => String(v) },
];

const ROWS = [
  { key: 'oem', label: '厂商' },
  { key: 'family', label: '家族' },
  { key: 'first', label: '首飞', fmt: (v) => `${v} 年` },
  { key: 'status', label: '状态' },
  { key: 'length', label: '机身长', fmt: (v) => `${v.toFixed(2)} m` },
  { key: 'span', label: '翼展', fmt: (v) => `${v.toFixed(2)} m` },
  { key: 'height', label: '高度', fmt: (v) => `${v.toFixed(2)} m` },
  { key: 'seats', label: '两级座位', fmt: (v) => `${v} 座` },
  { key: 'engines', label: '发动机', fmt: (v, x) => `${v} ×${x.engineCount}` },
  { key: 'cruise', label: '巡航' },
  { key: 'range', label: '最大航程', fmt: (v) => `${v.toLocaleString()} km` },
  { key: 'mtow', label: 'MTOW', fmt: (v) => `${v.toFixed(1)} t` },
];

export function render(container) {
  container.innerHTML = `
  <div class="container">
    <section class="page-head">
      <h2 class="section-title">机型对比 <span class="sub">COMPARE · <span id="cmp-count">…</span></span></h2>
    </section>
    <div class="cmp-pick anim-fade-up">
      <select class="lv-select cmp-select" id="cmp-a" aria-label="机型 A"></select>
      <button class="btn btn-ghost btn-sm" id="cmp-swap" title="交换两机">⇄ 交换</button>
      <select class="lv-select cmp-select" id="cmp-b" aria-label="机型 B"></select>
    </div>
    <div id="cmp-body" class="anim-fade-up anim-delay-1"></div>
    <p class="cmp-note">数据为公开资料整理的参考值(个别标"约"),客座数取典型两级布局,以厂商官方规格为准。</p>
  </div>`;

  const selA = container.querySelector('#cmp-a');
  const selB = container.querySelector('#cmp-b');
  const body = container.querySelector('#cmp-body');
  let list = [];
  let aId = null, bId = null;

  fetch(new URL('../../data/aircraft-catalog.json', import.meta.url))
    .then((r) => r.json())
    .then((catalog) => {
      list = catalog.aircraft;
      container.querySelector('#cmp-count').textContent = `${list.length} 款机型 · ${new Set(list.map((x) => x.oem)).size} 个厂商`;

      /* 按厂商分组下拉 */
      const groups = [];
      for (const a of list) {
        let g = groups.find((x) => x.oem === a.oem);
        if (!g) { g = { oem: a.oem, items: [] }; groups.push(g); }
        g.items.push(a);
      }
      const opt = (a) => `<option value="${a.id}">${a.cn}${a.approx ? '(约)' : ''}</option>`;
      const groupsHtml = groups.map((g) => `<optgroup label="${g.oem}">${g.items.map(opt).join('')}</optgroup>`).join('');
      selA.innerHTML = groupsHtml;
      selB.innerHTML = groupsHtml;

      /* 默认:波音 737-800 vs 空客 A320neo */
      aId = list.find((x) => x.id === 'b738')?.id || list[0].id;
      bId = list.find((x) => x.id === 'a20n')?.id || list[1].id;
      selA.value = aId;
      selB.value = bId;
      draw();
    })
    .catch((err) => {
      console.error('[compare] 机型目录加载失败:', err);
      body.innerHTML = `<div class="viewer-error glass-card">机型数据加载失败,请刷新重试。</div>`;
    });

  function getV(id) { return list.find((x) => x.id === id); }

  function headHtml(v) {
    const name = REAL_IDS.has(v.id)
      ? `<a href="#/aircraft/${v.id}" title="进入 3D 查看页">${v.cn}</a>`
      : v.cn;
    return `${name} <span class="sub">#${v.model}</span>${v.approx ? ' <i class="cmp-approx">约</i>' : ''}`;
  }

  function draw() {
    const A = getV(aId), B = getV(bId);
    if (!A || !B) return;

    const rows = ROWS.map((r) => `
      <tr>
        <td class="cmp-val">${r.fmt ? r.fmt(A[r.key], A) : (A[r.key] ?? '—')}</td>
        <th>${r.label}</th>
        <td class="cmp-val">${r.fmt ? r.fmt(B[r.key], B) : (B[r.key] ?? '—')}</td>
      </tr>`).join('');

    const bars = BARS.map((b) => {
      const va = Number(A[b.key]) || 0, vb = Number(B[b.key]) || 0;
      const max = Math.max(va, vb) || 1;
      return `
      <div class="cmp-bar-row">
        <div class="cmp-bar-line">
          <span class="cmp-bar-n">${b.fmt(va)}${b.unit}</span>
          <span class="cmp-bar"><i class="a" style="width:${(va / max) * 100}%"></i></span>
        </div>
        <span class="cmp-bar-label">${b.label}</span>
        <div class="cmp-bar-line">
          <span class="cmp-bar"><i class="b" style="width:${(vb / max) * 100}%"></i></span>
          <span class="cmp-bar-n">${b.fmt(vb)}${b.unit}</span>
        </div>
      </div>`;
    }).join('');

    body.innerHTML = `
    <div class="cmp-table-wrap glass-card hud-frame">
      <table class="cmp-table">
        <thead><tr>
          <th class="cmp-head">${headHtml(A)}</th>
          <th></th>
          <th class="cmp-head">${headHtml(B)}</th>
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
