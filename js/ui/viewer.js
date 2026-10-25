/**
 * ui/viewer.js — 机型查看页(#/aircraft/<variantId>)
 * 左:3D 舞台(场景基座 + 参数化整机 + 人形剪影/客梯车/米数标尺参照物)
 * 右:参数卡 / 动画开关 / 相机预设;底部上一架·下一架 + P2/P3/P4 预留按钮(置灰)。
 * 点击部件:console.log partId + toast 显示中文名(P3 热点系统的依赖验证)。
 */
import * as THREE from 'three';
import { createSceneBase } from '../scene.js';
import { buildAircraft, loadVariant, VARIANT_ORDER } from '../engine/aircraft.js';
import { buildHumanStandee, buildStairTruck, buildGroundRuler } from '../engine/details.js';

/* 部件命名表(P1 提示词 30 项)中文对照 */
const PART_NAMES = {
  nose_radome: '机鼻雷达罩', windshield: '驾驶舱风挡', pitot: '皮托管', static_port: '静压孔',
  aoa_sensor: '迎角传感器', cabin_window: '客舱舷窗', door_l1: '客舱舱门', fuselage: '机身',
  wing_root_fairing: '翼身整流罩', slat: '前缘缝翼', flap: '后缘襟翼', spoiler: '扰流板',
  aileron: '副翼', winglet: '翼梢小翼', wing_box: '机翼盒段', engine_nacelle: '发动机短舱',
  fan_blade: '风扇叶片', thrust_reverser: '反推装置', pylon: '发动机吊挂', apu: 'APU 排气口',
  vertical_stabilizer: '垂直尾翼', rudder: '方向舵', horizontal_stabilizer: '水平尾翼',
  elevator: '升降舵', nose_gear: '前起落架', main_gear: '主起落架', wheel_brake: '机轮刹车',
  beacon_light: '防撞灯', strobe_light: '频闪灯', landing_light: '着陆灯',
};

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
            <button class="btn btn-ghost btn-sm" disabled title="P2 上线">切换涂装</button>
            <button class="btn btn-ghost btn-sm" disabled title="P3 上线">部件图鉴</button>
            <button class="btn btn-ghost btn-sm" disabled title="P4 上线">进入舱内</button>
          </div>
        </div>
      </div>
      <aside class="v-side">
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
          <h3>动画开关</h3>
          <div class="anim-list">
            <label class="switch on-label"><input type="checkbox" id="tg-fan" checked><span class="slider"></span>风扇转动</label>
            <label class="switch on-label"><input type="checkbox" id="tg-gear" checked><span class="slider"></span>起落架放下</label>
            <label class="switch"><input type="checkbox" id="tg-flap"><span class="slider"></span>襟翼·缝翼放下</label>
            <label class="switch on-label"><input type="checkbox" id="tg-strobe" checked><span class="slider"></span>灯光频闪</label>
            <label class="switch"><input type="checkbox" id="tg-night"><span class="slider"></span>夜间模式</label>
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
            <b>点击机身部件</b>:控制台打印 <b>partId</b>,并显示部件中文名(P3 热点系统将复用)。</p>
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
      maxDistance: 260,
    });
    run(() => base.dispose());

    const ac = await buildAircraft(variantId, base.renderer);
    if (disposed) { ac.dispose(); return; }
    base.scene.add(ac.root);
    base.addTick((dt, t) => ac.update(dt, t));

    /* 参照物:人形剪影 / 客梯车 / 标尺(默认隐藏,可开关) */
    const L = v.length, SP = v.span;
    const standee = buildHumanStandee();
    standee.position.set(ac.params.fuselage.maxR + 4.2, 0, L * 0.3);
    base.scene.add(standee);

    const truck = buildStairTruck();
    truck.position.set(ac.params.fuselage.maxR + 3.6, 0, L * (0.5 - 0.115));
    truck.rotation.y = -Math.PI / 2;
    base.scene.add(truck);

    const ruler = buildGroundRuler(L, SP);
    ruler.visible = false;
    base.scene.add(ruler);

    /* 初始相机按整机尺寸取景 */
    const cH = ac.params.centerH;
    const d = Math.max(L * 0.72, 16);
    base.camera.position.set(d * 0.72, cH + L * 0.2, d * 0.95);
    base.controls.target.set(0, cH * 0.6, 0);

    /* 三角形计数 */
    const tri = ac.triCount();
    const triEl = container.querySelector('#v-tri');
    if (triEl) triEl.textContent = `△ ${tri.toLocaleString()}`;
    if (tri > 150000) toast(`三角形数超预算:${tri.toLocaleString()} > 150,000`, 'warn');

    /* ---------- 交互:动画开关 ---------- */
    const bind = (sel, fn) => {
      const el = container.querySelector(sel);
      if (!el) return;
      const h = () => fn(el.checked);
      el.addEventListener('change', h);
      run(() => el.removeEventListener('change', h));
    };
    bind('#tg-fan', (on) => ac.setFan(on));
    bind('#tg-gear', (on) => ac.setGear(on));
    bind('#tg-flap', (on) => ac.setFlaps(on));
    bind('#tg-strobe', (on) => ac.setStrobes(on));
    bind('#tg-night', (on) => { ac.setNight(on); base.setNight(on); });

    const rulerBtn = container.querySelector('#v-ruler');
    const onRuler = () => {
      ruler.visible = !ruler.visible;
      rulerBtn.classList.toggle('on', ruler.visible);
    };
    rulerBtn.addEventListener('click', onRuler);
    run(() => rulerBtn.removeEventListener('click', onRuler));

    /* ---------- 交互:相机预设(平滑过渡) ---------- */
    const finH = ac.params.fin.height;
    const eng = ac.params.engines[0];
    const engWX = eng.pos.x, engWY = eng.pos.y + cH, engWZ = eng.pos.z;
    const mainG = ac.params.gear.mains[0];
    const zTail = -L / 2;

    const PRESETS = {
      side:   { pos: [d * 0.62, cH + L * 0.1, L * 0.08], tgt: [0, cH * 0.72, 0] },
      front:  { pos: [L * 0.06, cH * 0.9, L / 2 + d * 0.6], tgt: [0, cH * 0.8, 0] },
      top:    { pos: [0.01, d * 1.25, 0.01], tgt: [0, 0, 0] },
      engine: { pos: [engWX + eng.fanD * 2.6, engWY + eng.fanD * 1.1, engWZ + eng.fanD * 4.2],
                tgt: [engWX, engWY, engWZ] },
      gear:   { pos: [mainG.x + 7.5, 1.7, mainG.z + 8.5], tgt: [mainG.x * 0.7, 1.3, mainG.z] },
      tail:   { pos: [-SP * 0.42, cH + finH * 0.7, zTail - d * 0.34],
                tgt: [0, cH + finH * 0.55, zTail + finH * 1.2] },
    };

    let tween = null;
    function flyTo(preset) {
      tween = {
        t: 0,
        p0: base.camera.position.clone(), p1: new THREE.Vector3(...preset.pos),
        t0: base.controls.target.clone(), t1: new THREE.Vector3(...preset.tgt),
      };
    }
    base.addTick((dt) => {
      if (!tween) return;
      tween.t = Math.min(1, tween.t + dt / 0.9);
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

    /* ---------- 交互:点击部件打印 partId ---------- */
    const ray = new THREE.Raycaster();
    const ptr = new THREE.Vector2();
    let downXY = null;
    const onDown = (ev) => { downXY = [ev.clientX, ev.clientY]; };
    const onUp = (ev) => {
      if (!downXY) return;
      const moved = Math.hypot(ev.clientX - downXY[0], ev.clientY - downXY[1]);
      downXY = null;
      if (moved > 6) return;                       // 拖拽不算点击
      const rect = base.renderer.domElement.getBoundingClientRect();
      ptr.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      ptr.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      ray.setFromCamera(ptr, base.camera);
      const meshes = [];
      ac.root.traverse((o) => { if ((o.isMesh || o.isInstancedMesh) && o.userData.partId) meshes.push(o); });
      const hit = ray.intersectObjects(meshes, false)[0];
      if (hit) {
        const id = hit.object.userData.partId;
        console.log('[viewer] partId =', id, '→', PART_NAMES[id] || id);
        toast(`部件:${PART_NAMES[id] || id}(${id})`);
      }
    };
    base.renderer.domElement.addEventListener('pointerdown', onDown);
    base.renderer.domElement.addEventListener('pointerup', onUp);
    run(() => {
      base.renderer.domElement.removeEventListener('pointerdown', onDown);
      base.renderer.domElement.removeEventListener('pointerup', onUp);
    });

    /* 换机型时释放整机资源 */
    run(() => ac.dispose());
  })().catch((err) => {
    console.error('[viewer] 初始化失败:', err);
    if (!disposed) toast('查看页初始化失败:' + err.message, 'danger');
  });

  return () => {
    disposed = true;
    cleanups.forEach((f) => { try { f(); } catch (e) { /* 忽略清理异常 */ } });
  };
}
