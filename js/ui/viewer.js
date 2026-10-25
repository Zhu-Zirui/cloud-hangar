/**
 * ui/viewer.js — 机型查看页(#/aircraft/<variantId>)
 * 左:3D 舞台(场景基座 + 真实 GLB 整机 + 人形剪影/客梯车/米数标尺参照物)
 * 右:涂装 / 参数卡 / 相机预设;底部上一架·下一架 + 涂装/部件图鉴(P3)/舱内(P4 预留)。
 * P3:部件热点图鉴层(parts.js)挂在本页,partId 映射见该模块头注释。
 */
import * as THREE from 'three';
import { createSceneBase } from '../scene.js';
import { buildAircraft, loadVariant, VARIANT_ORDER } from '../engine/aircraft.js';
import { GLB_VARIANTS, buildGltfAircraft, buildGltfAircraftUrl } from '../engine/gltfModel.js';
import { storeUpdate } from '../core/store.js';
import { buildHangarEnv, registerHangarBrand } from '../engine/hangarEnv.js';
import { buildHumanStandee, buildStairTruck, buildGroundRuler } from '../engine/details.js';
import { getAllLiveries, liveriesForVariant } from '../engine/livery.js';
import { createPartsLayer } from './parts.js';

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
  const variantId = (params.segments[1] || '').trim();
  let disposed = false;
  const cleanups = [];
  const run = (fn) => cleanups.push(fn);

  /* 未知变体:错误页 */
  if (!VARIANT_ORDER.includes(variantId)) {
    container.innerHTML = `
    <div class="container">
      <div class="viewer-error glass-card hud-frame">
        <h2>未找到机型</h2>
        <p>变体 ID <b style="font-family:var(--mono)">${variantId || '(空)'}</b> 不在图鉴中。<br>
          可用:${VARIANT_ORDER.join(' / ')}</p>
        <a class="btn btn-primary" style="margin-top:18px" href="#/hangar">返回机库</a>
      </div>
    </div>`;
    return () => cleanups.forEach((f) => f());
  }

  /* 骨架(加载中) */
  container.innerHTML = `
  <div class="container viewer-wrap">
    <div class="viewer-main glass-card hud-frame">
      <div id="v-3d"><div class="v-loading"><div class="ring"></div>整机总装中…</div></div>
    </div>
    <aside class="v-side">
      <div class="v-loading" style="position:static;padding:40px 0"><div class="ring"></div>加载机型数据…</div>
    </aside>
  </div>`;

  (async () => {
    let info;
    try {
      info = await loadVariant(variantId);
    } catch (err) {
      console.error('[viewer] 机型数据加载失败:', err);
      if (!disposed) toast('机型数据加载失败,请刷新重试', 'danger');
      return;
    }
    if (disposed || !info) return;
    const { variant: v, familyCn } = info;

    /* ---------- DOM ---------- */
    const idx = VARIANT_ORDER.indexOf(variantId);
    const prevId = VARIANT_ORDER[(idx - 1 + VARIANT_ORDER.length) % VARIANT_ORDER.length];
    const nextId = VARIANT_ORDER[(idx + 1) % VARIANT_ORDER.length];

    container.innerHTML = `
    <div class="container viewer-wrap">
      <div class="viewer-main glass-card hud-frame">
        <div id="v-3d"></div>
        <div class="v-topbar">
          <div class="v-title">
            <div class="t-en">${familyCn} · ${v.id.toUpperCase()}</div>
            <h2>${v.cnName}</h2>
          </div>
          <div class="v-chips">
            <span class="v-chip" id="v-tri" title="整机三角形数(预算 ≤15万)">△ --</span>
            <span class="v-chip btn-like" id="v-ruler" title="地面米数标尺(比例自检)">标尺</span>
          </div>
        </div>
        <div class="v-bottom">
          <a class="btn btn-ghost btn-sm" href="#/aircraft/${prevId}">◀ 上一架</a>
          <span class="v-chip">${idx + 1} / ${VARIANT_ORDER.length}</span>
          <a class="btn btn-ghost btn-sm" href="#/aircraft/${nextId}">下一架 ▶</a>
          <span class="spacer"></span>
          <div class="v-reserved">
            <button class="btn btn-ghost btn-sm" id="btn-livery" title="打开涂装面板">切换涂装</button>
            <button class="btn btn-ghost btn-sm" id="btn-parts" title="部件热点图鉴(建议在原厂涂装下使用)">部件图鉴</button>
            <button class="btn btn-ghost btn-sm" disabled title="P4 上线">进入舱内</button>
          </div>
        </div>
      </div>
      <aside class="v-side">
        <section class="v-card glass-card" id="livery-card">
          <h3>涂装 <span class="v-chip" id="lv-count">…</span></h3>
          <div class="lv-swatches" id="lv-swatches"></div>
          <select class="lv-select" id="lv-select" aria-label="选择涂装"></select>
          <p class="v-tip">涂装切换 = 整套真实贴图模型换装(FlightGear 系 GPL 素材经转换),切换不刷新页面。中国航司涂装覆盖不全的机型暂仅原厂涂装。</p>
        </section>
        <section class="v-card glass-card hud-frame">
          <h3>机型参数</h3>
          <table class="param-table">
            <tr><td>机身长</td><td>${v.length.toFixed(2)} m</td></tr>
            <tr><td>翼展</td><td>${v.span.toFixed(2)} m</td></tr>
            <tr><td>高度</td><td>${v.height.toFixed(2)} m</td></tr>
            <tr><td>发动机</td><td>${v.engines} ×${v.engineCount}</td></tr>
            <tr><td>两级座位</td><td>${v.seats}</td></tr>
            <tr><td>巡航</td><td>${v.cruise}</td></tr>
            <tr><td>航程</td><td>${v.range.toLocaleString()} km</td></tr>
            <tr><td>MTOW</td><td>${v.mtow.toFixed(1)} t</td></tr>
          </table>
          ${v.notes ? `<p class="v-note">※ ${v.notes}</p>` : ''}
        </section>
        <section class="v-card glass-card">
          <h3>展示开关</h3>
          <div class="anim-list">
            <label class="switch"><input type="checkbox" id="tg-night"><span class="slider"></span>夜间模式</label>
            <p class="v-tip" style="margin-top:8px">当前机型为真实 3D 模型,起落架/襟翼为停放姿态,无收放动画(免费模型未含动画数据)。</p>
          </div>
        </section>
        <section class="v-card glass-card">
          <h3>相机预设</h3>
          <div class="cam-grid">
            <button class="btn btn-ghost btn-sm" data-cam="side">侧视</button>
            <button class="btn btn-ghost btn-sm" data-cam="front">前视</button>
            <button class="btn btn-ghost btn-sm" data-cam="top">俯视</button>
            <button class="btn btn-ghost btn-sm" data-cam="engine">发动机</button>
            <button class="btn btn-ghost btn-sm" data-cam="gear">起落架</button>
            <button class="btn btn-ghost btn-sm" data-cam="tail">尾翼</button>
          </div>
        </section>
        <section class="v-card glass-card">
          <h3>操作提示</h3>
          <p class="v-tip"><b>拖拽</b>旋转 · <b>滚轮</b>缩放 · <b>右键</b>平移<br>
            地面<b>米数标尺</b>与 1.8m 人形/客梯车为真实比例参照(P3 部件热点将在此基础上加注)。</p>
        </section>
      </aside>
    </div>`;

    /* ---------- 3D 场景 ---------- */
    const stageEl = container.querySelector('#v-3d');
    const P0 = { centerH: 3 }; // 相机初始参考值,整机就位后校正
    const base = createSceneBase(stageEl, {
      cameraPos: [30, 8, 34],
      target: [0, 4, 0],
      minDistance: 5,
      maxDistance: 600,
    });
    run(() => base.dispose());

    /* 机库内景:默认按机型厂商挂波音/空客厂房品牌(P2 涂装切换时改为 hangar.setBrand(航司)) */
    const hangar = buildHangarEnv(base.scene, base.renderer);
    hangar.setBrand(variantId.startsWith('a') ? 'airbus' : 'boeing');
    run(() => hangar.dispose());

    /* P2 涂装库:航司品牌注册进机库环境(切换涂装时机库厂房品牌联动) */
    let LV_LIST = [], ALL_LV = { airlines: {} };
    try {
      ALL_LV = await getAllLiveries();
      for (const [key, a] of Object.entries(ALL_LV.airlines)) {
        registerHangarBrand({ key, factoryCn: a.cn, factoryEn: a.en, logoUrl: a.logo, primary: a.color, panelBg: '#f5f8fc' });
      }
      LV_LIST = liveriesForVariant(ALL_LV, variantId);
    } catch (err) { console.warn('[viewer] 涂装库加载失败:', err); }

    /* 双通道:有真实 GLB(铁律 §4 修订)走模型,否则参数化引擎 */
    let ac = null, P = null;
    if (GLB_VARIANTS[variantId]) {
      try {
        ac = await buildGltfAircraft(variantId, base.renderer, {
          length: v.length, span: v.span, height: v.height,
        });
      } catch (err) {
        console.warn('[viewer] GLB 通道失败,回退参数化引擎:', err);
      }
    }
    if (!ac) {
      ac = await buildAircraft(variantId, base.renderer);
      P = ac.params;
    }
    if (disposed) { ac.dispose(); return; }
    base.scene.add(ac.root);
    base.addTick((dt, t) => ac.update(dt, t));

    /* ---------- P2:涂装切换(真实涂装 GLB 整体换装) ---------- */
    const acRef = { ac };
    let partsLayer = null; // P3 部件热点层,相机通道就绪后创建
    base.addTick((dt, t) => acRef.ac.update(dt, t));
    const swWrap = container.querySelector('#lv-swatches');
    const lvSelect = container.querySelector('#lv-select');
    const lvCount = container.querySelector('#lv-count');
    let lvBusy = false;
    if (lvCount) lvCount.textContent = `${LV_LIST.length} 款`;
    for (const def of LV_LIST) {
      const opt = document.createElement('option');
      opt.value = def.id;
      opt.textContent = def.name;
      lvSelect.appendChild(opt);
      const b = document.createElement('button');
      b.className = 'lv-swatch';
      b.type = 'button';
      b.title = def.name;
      b.dataset.id = def.id;
      const meta = ALL_LV.airlines[def.airline] || {};
      b.style.setProperty('--lv', meta.color || '#5b6b7c');
      if (meta.logo) {
        const img = document.createElement('img');
        img.src = meta.logo; img.alt = '';
        b.appendChild(img);
      }
      b.addEventListener('click', () => applyLivery(def));
      swWrap.appendChild(b);
      if (def.model.endsWith('/' + variantId + '/' + variantId + '.glb')) b.classList.add('on');
    }
    async function applyLivery(def) {
      if (lvBusy || !def || def.model === acRef.model) return;
      lvBusy = true;
      swWrap.classList.add('busy');
      lvSelect.value = def.id;
      swWrap.querySelectorAll('.lv-swatch').forEach((el) => el.classList.toggle('on', el.dataset.id === def.id));
      try {
        base.scene.remove(acRef.ac.root);
        acRef.ac.dispose();
        acRef.ac = await buildGltfAircraftUrl(def.model, base.renderer, {
          length: v.length, span: v.span, height: v.height,
        });
        acRef.model = def.model;
        base.scene.add(acRef.ac.root);
        if (partsLayer) partsLayer.rebind();   // P3:换装后重建 partId 索引与热点圆点
        // 新模型起落架姿态不同,重校取景基线
        const bb2 = new THREE.Box3().setFromObject(acRef.ac.root);
        if (!bb2.isEmpty()) base.controls.target.y = bb2.getCenter(new THREE.Vector3()).y;
        if (window.__CH_DEBUG) window.__CH_DEBUG.root = acRef.ac.root;
        const tri = acRef.ac.triCount();
        const triEl = container.querySelector('#v-tri');
        if (triEl) triEl.textContent = `△ ${tri.toLocaleString()}`;
        hangar.setBrand(def.airline || (variantId.startsWith('a') ? 'airbus' : 'boeing'));
        storeUpdate('seenLiveries', (arr) => { const set = new Set(arr || []); set.add(def.id); return [...set]; }, []);
        toast(`涂装:${def.name}`);
      } catch (err) {
        console.error('[viewer] 涂装加载失败:', err);
        toast('涂装加载失败:' + err.message, 'danger');
      }
      swWrap.classList.remove('busy');
      lvBusy = false;
    }
    lvSelect.addEventListener('change', () => applyLivery(LV_LIST.find((d) => d.id === lvSelect.value)));
    const btnLivery = container.querySelector('#btn-livery');
    if (btnLivery) {
      btnLivery.addEventListener('click', () => {
        container.querySelector('#livery-card').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        swWrap.classList.remove('flash');
        void swWrap.offsetWidth;
        swWrap.classList.add('flash');
      });
    }

    /* ---------- 参照物与初始相机 ---------- */
    const L = v.length, SP = v.span;
    const bodyR = P ? P.fuselage.maxR : v.height * 0.13;
    const standee = buildHumanStandee();
    standee.position.set(bodyR + 4.2, 0, L * 0.3);
    base.scene.add(standee);

    const truck = buildStairTruck();
    truck.position.set(bodyR + 3.6, 0, L * (0.5 - 0.115));
    truck.rotation.y = -Math.PI / 2;
    base.scene.add(truck);

    const ruler = buildGroundRuler(L, SP);
    ruler.visible = false;
    base.scene.add(ruler);

    /* 初始相机按整机尺寸取景;取景基线 = 实际包围盒中心(FG/FR24 模型起落架姿态不同) */
    const _bb = new THREE.Box3().setFromObject(ac.root);
    const _bc = _bb.getCenter(new THREE.Vector3());
    const cH = _bb.isEmpty() ? v.height * 0.28 : _bc.y;
    const dCam = Math.max(L * 0.95, 16);
    base.camera.position.set(dCam * 0.72, cH + L * 0.18, dCam * 0.95);
    base.controls.target.set(0, cH * 0.8, 0);

    /* 三角形计数(换涂装时由 applyLivery 刷新) */
    const tri = ac.triCount();
    const triEl = container.querySelector('#v-tri');
    if (triEl) triEl.textContent = `△ ${tri.toLocaleString()}`;
    if (tri > 150000) toast(`三角形数超预算:${tri.toLocaleString()} > 150,000`, 'warn');

    /* ---------- 交互:展示开关 ---------- */
    const bind = (sel, fn) => {
      const el = container.querySelector(sel);
      if (!el) return;
      const h = () => fn(el.checked);
      el.addEventListener('change', h);
      run(() => el.removeEventListener('change', h));
    };
    bind('#tg-night', (on) => { acRef.ac.setNight(on); base.setNight(on); hangar.setNight(on); });

    const rulerBtn = container.querySelector('#v-ruler');
    const onRuler = () => {
      ruler.visible = !ruler.visible;
      rulerBtn.classList.toggle('on', ruler.visible);
    };
    rulerBtn.addEventListener('click', onRuler);
    run(() => rulerBtn.removeEventListener('click', onRuler));

    /* ---------- 交互:相机预设(平滑过渡) ---------- */
    const finH = P ? P.fin.height : v.height * 0.36;
    const engWX = P ? P.engines[0].pos.x : SP * 0.18;
    const engWY = P ? P.engines[0].pos.y + cH : cH - v.height * 0.22;
    const engWZ = P ? P.engines[0].pos.z : L * 0.1;
    const engFanD = P ? P.engines[0].fanD : v.height * 0.16;
    const mainGx = P ? P.gear.mains[0].x : SP * 0.16;
    const mainGz = P ? P.gear.mains[0].z : 0;
    const zTail = -L / 2;

    const PRESETS = {
      // 侧/前/俯视取远距(≈2 倍机长),压小透视畸变,观感接近三视图
      side:   { pos: [L * 2.0, cH + L * 0.05, L * 0.02], tgt: [0, cH * 0.95, 0] },
      front:  { pos: [L * 0.02, cH + L * 0.03, L + L * 1.1], tgt: [0, cH * 0.9, 0] },
      top:    { pos: [0.01, L * 1.6, 0.01], tgt: [0, 0, 0] },
      engine: { pos: [engWX + engFanD * 2.6, engWY + engFanD * 1.1, engWZ + engFanD * 4.2],
                tgt: [engWX, engWY, engWZ] },
      gear:   { pos: [mainGx + 7.5, 1.7, mainGz + 8.5], tgt: [mainGx * 0.7, 1.3, mainGz] },
      tail:   { pos: [-SP * 0.42, cH + finH * 0.7, zTail - dCam * 0.34],
                tgt: [0, cH + finH * 0.55, zTail + finH * 1.2] },
    };

    let tween = null;
    function flyTo(preset, dur = 0.9) {
      tween = {
        t: 0, d: dur,
        p0: base.camera.position.clone(), p1: new THREE.Vector3(...preset.pos),
        t0: base.controls.target.clone(), t1: new THREE.Vector3(...preset.tgt),
      };
    }
    base.addTick((dt) => {
      if (!tween) return;
      tween.t = Math.min(1, tween.t + dt / tween.d);
      const e = tween.t < 0.5 ? 4 * tween.t ** 3 : 1 - Math.pow(-2 * tween.t + 2, 3) / 2;
      base.camera.position.lerpVectors(tween.p0, tween.p1, e);
      base.controls.target.lerpVectors(tween.t0, tween.t1, e);
      if (tween.t >= 1) tween = null;
    });
    base.controls.addEventListener('start', () => { tween = null; });

    container.querySelectorAll('[data-cam]').forEach((btn) => {
      const h = () => flyTo(PRESETS[btn.dataset.cam]);
      btn.addEventListener('click', h);
      run(() => btn.removeEventListener('click', h));
    });

    /* ---------- P3:部件热点图鉴层 ---------- */
    partsLayer = createPartsLayer({
      base, acRef, dims: v, variantId,
      mountEl: container.querySelector('.viewer-main'),
      flyTo,
      onToast: toast,
    });
    run(() => partsLayer.dispose());
    const btnParts = container.querySelector('#btn-parts');
    const onParts = () => {
      const on = partsLayer.setActive(!partsLayer.active());
      btnParts.classList.toggle('on', on);
      if (on) toast('部件图鉴:悬停高亮部件,点击弹出知识卡');
    };
    btnParts.addEventListener('click', onParts);
    run(() => btnParts.removeEventListener('click', onParts));

    /* 调试通道(控制台可查几何上下文) */
    window.__CH_DEBUG = { root: ac.root, variantId, camera: base.camera, controls: base.controls, scene: base.scene };

    /* 换机型时释放整机资源 */
    run(() => acRef.ac.dispose());
  })().catch((err) => {
    console.error('[viewer] 初始化失败:', err);
    if (!disposed) toast('查看页初始化失败:' + err.message, 'danger');
  });

  return () => {
    disposed = true;
    cleanups.forEach((f) => { try { f(); } catch (e) { /* 忽略清理异常 */ } });
  };
}
