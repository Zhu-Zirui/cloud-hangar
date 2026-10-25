/**
 * ui/parts.js — P3 部件热点图鉴(点哪儿讲哪儿)
 *
 * 背景:P1 参数化引擎(userData.partId)已退役,现行 9 变体均为真实 GLB。
 * 本模块在 UI 层重建 partId 映射,不改动 engine/:
 *   1) NAME_RULES —— GLB 节点语义命名(aileron/flap/slat/engine/gear/beacon…)
 *      直接映射到 30 个 partId,覆盖除 b738 外的全部变体;
 *   2) 空间区域兜底 —— 未命名的网格(如 b738 的 Circle_xxx)按包围盒中心、
 *      点击命中点在"归一化机体坐标系"里做几何分类。
 * 坐标系约定(与 engine/gltfModel.normalizeAircraft 一致):
 *   原点在机身轴线中点,机鼻 +Z,翼展 X,地面 y=0,整机为真实米制。
 *
 * 交互:悬停高亮(自发光脉冲,不改贴图)→ 点击出知识卡;
 * 左侧分组清单点击 → 相机平滑飞至部件并高亮;打卡存 cav3d.exploredParts。
 */
import * as THREE from 'three';
import { storeGet, storeUpdate } from '../core/store.js';

/* ---------- 30 个部件:分组与锚点估算表(包络盒缺失时的兜底) ---------- */
/* EST:[x 半翼展系数, y 机高系数, z 半机长系数] → 锚点世界坐标 */
const EST = {
  nose_radome: [0, 0.20, 0.46],   windshield: [0, 0.33, 0.39],
  pitot: [0.13, 0.24, 0.38],      static_port: [-0.11, 0.22, 0.34],
  aoa_sensor: [0.12, 0.16, 0.40], fuselage: [0, 0.22, 0.06],
  cabin_window: [-0.07, 0.29, 0.22], door_l1: [-0.08, 0.21, 0.33],
  wing_root_fairing: [0, 0.11, 0.02], apu: [0, 0.21, -0.47],
  wing_box: [0.16, 0.21, 0.02],   slat: [0.42, 0.22, 0.06],
  flap: [0.28, 0.19, -0.05],      spoiler: [0.27, 0.27, -0.04],
  aileron: [0.70, 0.24, -0.09],   winglet: [0.97, 0.30, -0.06],
  engine_nacelle: [0.31, 0.09, 0.08], fan_blade: [0.31, 0.09, 0.12],
  thrust_reverser: [0.31, 0.09, 0.03], pylon: [0.31, 0.16, 0.07],
  vertical_stabilizer: [0, 0.74, -0.40], rudder: [0, 0.70, -0.45],
  horizontal_stabilizer: [0.17, 0.28, -0.42], elevator: [0.21, 0.27, -0.46],
  nose_gear: [0, 0.05, 0.30],     main_gear: [0.16, 0.06, -0.02],
  wheel_brake: [0.17, 0.03, -0.03],
  beacon_light: [0, 0.34, -0.03], strobe_light: [0.99, 0.28, -0.07],
  landing_light: [0.13, 0.17, 0.10],
};
export const ALL_PART_IDS = Object.keys(EST);
export const GROUP_ORDER = ['机头', '机身', '机翼', '动力装置', '尾翼', '起落架', '航行灯光'];
/* 体量过小、模型上点不到的部件:热点模式下用发光圆点标注 */
const MICRO_PARTS = ['pitot', 'static_port', 'aoa_sensor', 'beacon_light', 'strobe_light', 'landing_light', 'apu'];
/* 清单点击飞向部件时的相机距离(× 机长) */
const VIEW_DIST = { 机头: 0.34, 机身: 0.95, 机翼: 0.82, 动力装置: 0.36, 尾翼: 0.52, 起落架: 0.26, 航行灯光: 0.38 };

/* ---------- 节点命名 → partId(按序匹配,先具体后泛化) ---------- */
/* 匹配串 = 节点名小写并剔除非字母数字,如 "lhibslat_1" → "lhibslat1" */
const NAME_RULES = [
  [/apu/, 'apu'],
  [/revers|capa_rev/, 'thrust_reverser'],
  [/turbofan/, 'engine_nacelle'],                  // b748 turbofan_capa_* 壳体(须先于 fan 规则)
  [/fan|blade/, 'fan_blade'],
  [/nosecone|noseradio|^nose$/, 'nose_radome'],      // 须先于 engine 的 cone 规则
  [/pylon/, 'pylon'],
  [/nacelle|intake|casing|shroud|engine|enge|turbofan|exhaust|nozzle|core|cone/, 'engine_nacelle'],
  [/beacon/, 'beacon_light'],
  [/land|turnoff|lhlight|rhlight/, 'landing_light'],
  [/navlite|navlight|winglt|winglight|strobe|tlight|logolt/, 'strobe_light'],
  [/light/, 'beacon_light'],                          // 其余灯组兜底
  [/pitot|pilottube|probe/, 'pitot'],
  [/sensor/, 'aoa_sensor'],
  [/port/, 'static_port'],                            // a20n "Ports" 为静压孔组
  [/windshield|cockpitwindow|wiper|cockpitshell|cockpitframe/, 'windshield'],
  [/rudder/, 'rudder'],
  [/elevator|hstabflap/, 'elevator'],
  [/aileron/, 'aileron'],
  [/spoiler|speedbrake|^sb\d/, 'spoiler'],
  [/slat/, 'slat'],
  [/flap/, 'flap'],
  [/winglet|wingtip/, 'winglet'],
  [/wing/, 'wing_box'],
  [/vstab|fin|vertical/, 'vertical_stabilizer'],      // 须先于 stab
  [/stab/, 'horizontal_stabilizer'],
  [/nosegear|nlg|gearn|nosedoor|lgdoor/, 'nose_gear'],
  [/gear/, 'main_gear'],
  [/wheel|brake/, 'wheel_brake'],
  [/cockpitdoor|cargodoor|^cargo|lav/, 'fuselage'],   // 内部/货舱门不算客舱门
  [/door/, 'door_l1'],
  [/window/, 'cabin_window'],
  [/bodyfairing|belly/, 'wing_root_fairing'],
  [/fairing/, 'flap'],                                // 翼上其余 fairing 多为襟翼滑轨整流罩
  [/vortex/, 'wing_box'],
  [/fuselage|corpo|tailcone|tailsection|chrome|antenn|satcom|vhf|hemisphere|^sun$|^plane|effect|^line/, 'fuselage'],
];

function nameToPart(rawName) {
  if (!rawName) return null;
  const s = String(rawName).toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!s) return null;
  for (const [re, id] of NAME_RULES) if (re.test(s)) return id;
  return null;
}

/* ---------- 机体几何参数(按权威数据 + 家族经验站位) ---------- */
const FAMILY_GEO = {
  default: { eng: [{ x: 0.165, z: 0.085 }], engR: 0.105, engHL: 0.032 },
  b738: { R: 1.9, axisF: 0.25, eng: [{ x: 0.165, z: 0.085 }], engR: 0.078, engHL: 0.030 },
  a20n: { R: 2.0, axisF: 0.28 },
  a21n: { R: 2.0, axisF: 0.28 },
  a332: { eng: [{ x: 0.152, z: 0.080 }] },
  a333: { eng: [{ x: 0.152, z: 0.080 }] },
  b788: { axisF: 0.31, eng: [{ x: 0.172, z: 0.080 }], engHL: 0.026 },
  b789: { axisF: 0.31, eng: [{ x: 0.172, z: 0.080 }], engHL: 0.026 },
  b748: { axisF: 0.335, eng: [{ x: 0.155, z: 0.115 }, { x: 0.31, z: 0.135 }], engR: 0.085, engHL: 0.022 },
};

function buildGeo(dims, variantId) {
  const L = dims.length, SP = dims.span, H = dims.height;
  const o = { ...FAMILY_GEO.default, ...(FAMILY_GEO[variantId] || {}) };
  const R = o.R || H * 0.16;                  // 机身半径
  const axisY = H * (o.axisF ?? 0.30);        // 机身轴线高度
  const stations = o.eng.map((s) => ({
    x: s.x * SP, z: s.z * L,
    hl: (o.engHL ?? 0.032) * L,               // 短舱半长
    r: (o.engR ?? 0.105) * H,                 // 短舱半径
  }));
  return { L, SP, H, R, axisY, wingY: axisY - R * 0.12, stations, halfSpan: SP / 2 };
}

/**
 * 空间分类:归一化机体坐标系中的点 → partId。
 * 顺序:机鼻/风挡 → 发动机 → 起落架 → 垂尾/APU → 平尾 → 机翼 → 舱门/舷窗 → 机身。
 */
export function spatialResolve(geo, x, y, z) {
  const { L, SP, H, R, axisY, wingY, stations } = geo;
  const ax = Math.abs(x);
  if (z > L * 0.33 && z < L * 0.455 && y > axisY + R * 0.42) return 'windshield';
  if (z > L * 0.42) return 'nose_radome';
  for (const s of stations) {                  // 发动机站位的 generous 包围带
    if (ax > s.x - s.r * 2.3 && ax < s.x + s.r * 2.3 && z > s.z - s.hl * 1.8 && z < s.z + s.hl * 1.8
        && y > H * 0.02 && y < wingY + R * 0.1) {
      if (y > wingY - R * 0.35) return 'pylon';  // 短舱上方的吊挂区
      const dz = z - s.z;
      if (dz > s.hl * 0.55) return 'fan_blade';
      if (dz < -s.hl * 0.5) return 'thrust_reverser';
      return 'engine_nacelle';
    }
  }
  if (y < H * 0.13 && ax < SP * 0.15) {         // 起落架带(轮/支柱;737 翼件吊得低,须收紧)
    if (y < H * 0.05) return 'wheel_brake';
    return z > L * 0.24 ? 'nose_gear' : 'main_gear';
  }
  if (z < -L * 0.28 && y > H * 0.42) return z < -L * 0.415 ? 'rudder' : 'vertical_stabilizer';
  if (z < -L * 0.44 && ax < R * 1.3 && y < H * 0.42) return 'apu';
  if (z < -L * 0.28 && ax > R * 1.4 && y < H * 0.42) return z < -L * 0.41 ? 'elevator' : 'horizontal_stabilizer';
  if (ax > R * 1.25 && ax < SP * 0.47 && z > -L * 0.10 && z < L * 0.26
      && y > wingY - R * 0.95 && y < axisY + R * 1.5) {
    if (ax > SP * 0.44) return 'winglet';
    const t = Math.min(1, Math.max(0, (ax - R * 1.25) / (SP / 2 - R * 1.25)));
    const le = L * (0.17 - 0.20 * t);          // 前缘线(后掠)
    const te = L * (-0.04 - 0.08 * t);         // 后缘线
    if (z > le - L * 0.055) return 'slat';
    if (z < te + L * 0.055) return ax < SP * 0.30 ? 'flap' : 'aileron';
    if (y > wingY + R * 0.22 && ax < SP * 0.36) return 'spoiler';
    if (ax < SP * 0.17 && y < wingY - R * 0.05) return 'wing_root_fairing';
    return 'wing_box';
  }
  if (z > L * 0.29 && z < L * 0.38 && ax > R * 0.5 && y > axisY - R && y < axisY + R * 0.95) return 'door_l1';
  if (ax > R * 0.55 && z > -L * 0.02 && z < L * 0.40 && y > axisY - R * 0.05 && y < axisY + R * 0.85) return 'cabin_window';
  return 'fuselage';
}

/**
 * 建立整机 partId 索引(纯函数,供热点层与控制台自测复用)。
 * @returns {{partMeshes:Map<string,THREE.Object3D[]>, anchors:Map<string,THREE.Vector3>, meshCount:number, geo:object}}
 */
export function classifyAll(root, dims, variantId) {
  const geo = buildGeo(dims, variantId);
  root.updateMatrixWorld(true);   // 深层级 GLB(b738 含根四元数节点)必须先刷新世界矩阵,否则逐网格包围盒失真
  const partMeshes = new Map(ALL_PART_IDS.map((id) => [id, []]));
  const partBoxes = new Map();
  let meshCount = 0;

  root.traverse((o) => {                        // 收集网格并按名字/空间归类
    if (!o.isMesh || !o.geometry) return;
    meshCount++;
    const box = new THREE.Box3().setFromObject(o);
    const c = box.getCenter(new THREE.Vector3());
    const sz = new THREE.Vector3();
    box.getSize(sz);
    // 名字链:自身 + 上溯两级父节点(部分 GLB 有命名父组)
    let id = nameToPart(o.name);
    for (let p = o.parent, i = 0; !id && p && i < 2 && p !== root; p = p.parent, i++) id = nameToPart(p.name);
    // 无名高瘦叶片 = 垂尾兜底(b738 的垂尾网格因 P1 转换 bug 落在机头区,空间规则接不住)
    if (!id && sz.y > geo.H * 0.3 && sz.x < Math.max(1.3, geo.SP * 0.03) && sz.y > sz.x * 3 && sz.z < geo.L * 0.4) {
      id = 'vertical_stabilizer';
    }
    if (!id) id = spatialResolve(geo, c.x, c.y, c.z);
    else if (id === 'wing_box' && Math.abs(c.x) > geo.SP * 0.45) id = 'winglet'; // 命名归入机翼的翼尖段 → 小翼
    partMeshes.get(id).push(o);
    const ub = partBoxes.get(id) || new THREE.Box3();
    partBoxes.set(id, ub.union(box));
  });

  // 锚点:优先取该部件网格的包络盒中心,否则用估算表
  const anchors = new Map();
  for (const id of ALL_PART_IDS) {
    const b = partBoxes.get(id);
    if (b && !b.isEmpty()) anchors.set(id, b.getCenter(new THREE.Vector3()));
    else {
      const [fx, fy, fz] = EST[id];
      anchors.set(id, new THREE.Vector3(fx * geo.halfSpan, fy * geo.H, fz * geo.L / 2));
    }
  }
  // 无网格归属的大部件:把"包含其锚点"的网格借为高亮集(如 b738 的缝翼/扰流板)
  for (const id of ALL_PART_IDS) {
    if (partMeshes.get(id).length || MICRO_PARTS.includes(id)) continue;
    const a = anchors.get(id);
    const probe = new THREE.Box3().setFromCenterAndSize(a, new THREE.Vector3(geo.L * 0.1, geo.H * 0.1, geo.L * 0.1));
    root.traverse((o) => {
      if (!o.isMesh || !o.geometry) return;
      if (probe.intersectsBox(new THREE.Box3().setFromObject(o))) partMeshes.get(id).push(o);
    });
  }
  return { partMeshes, anchors, meshCount, geo };
}

/* ---------- 知识卡数据(模块级缓存) ---------- */
let partsDataPromise = null;
function loadPartsData() {
  if (!partsDataPromise) partsDataPromise = fetch('data/parts.json').then((r) => r.json());
  return partsDataPromise;
}

/* ---------- 热点图层 ---------- */
/**
 * @param {object} ctx
 *   base     场景基座(camera/controls/renderer/addTick)
 *   acRef    { ac } 当前整机(涂装换装后会整体替换 ac)
 *   dims     变体权威尺寸 { length, span, height }
 *   variantId 变体 ID
 *   mountEl  查看页主卡容器(面板挂载点)
 *   flyTo    (preset, dur) 相机飞行通道(与相机预设共用 tween)
 *   onToast  (msg) 提示气泡
 */
export function createPartsLayer(ctx) {
  const { base, acRef, dims, variantId, mountEl, flyTo, onToast } = ctx;
  let active = false;
  let index = null;                 // classifyAll 结果
  let cardData = null;              // parts.json
  let hoverPart = null;             // 当前高亮部件
  const savedMats = new Map();      // material → 原始 emissive 状态

  /* 挂载容器保证有定位上下文 */
  if (getComputedStyle(mountEl).position === 'static') mountEl.style.position = 'relative';

  /* ----- DOM:左侧分组清单 / 右侧知识卡 / 悬停提示 ----- */
  const panel = document.createElement('aside');
  panel.className = 'parts-panel glass-card';
  panel.innerHTML = `<div class="pp-head">部件图鉴 <span class="pp-count"></span></div>
    <div class="pp-body"></div>
    <div class="pp-tip2">悬停高亮 · 点击出卡</div>`;
  const card = document.createElement('article');
  card.className = 'part-card glass-card hud-frame';
  const tip = document.createElement('div');
  card.style.display = 'none';
  mountEl.append(panel, card, tip);

  function renderPanel() {
    if (!cardData) return;
    const explored = new Set(storeGet('exploredParts', []) || []);
    const body = panel.querySelector('.pp-body');
    body.innerHTML = GROUP_ORDER.map((g) => {
      const items = cardData.parts.filter((p) => p.group === g);
      return `<div class="pg-group${g === '机头' ? ' open' : ''}">
        <button class="pg-head" type="button">${g}<span>${items.length}</span></button>
        <div class="pg-list">${items.map((p) => `
          <button class="pg-item${explored.has(p.partId) ? ' done' : ''}" data-part="${p.partId}" type="button">
            <i></i>${p.name}</button>`).join('')}</div>
      </div>`;
    }).join('');
    panel.querySelector('.pp-count').textContent = `${explored.size}/30`;
    body.querySelectorAll('.pg-head').forEach((h) => {
      h.addEventListener('click', () => h.parentElement.classList.toggle('open'));
    });
    body.querySelectorAll('.pg-item').forEach((b) => {
      b.addEventListener('click', () => focusPart(b.dataset.part));
    });
  }

  function renderCard(p) {
    const explored = new Set(storeGet('exploredParts', []) || []);
    card.innerHTML = `
      <header>
        <div><h4>${p.name}</h4><span class="pc-en">${p.en} · ${p.group}</span></div>
        <button class="pc-close" type="button" title="关闭">✕</button>
      </header>
      <div class="pc-row pc-where"><b>位置</b><p>${p.where}</p></div>
      <div class="pc-row"><b>原理</b><p>${p.principle}</p></div>
      <div class="pc-row pc-fact"><b>冷知识</b><p>${p.fact}</p></div>
      <div class="pc-links"><b>相关部件</b>
        ${p.links.map((l) => {
          const t = cardData.parts.find((x) => x.partId === l);
          return `<button class="pc-pill" data-part="${l}" type="button">${t ? t.name : l}</button>`;
        }).join('')}</div>
      <div class="pc-meta">${explored.has(p.partId) ? '✓ 已打卡' : '新发现'} · <code>${p.partId}</code></div>`;
    card.style.display = '';
    card.querySelector('.pc-close').addEventListener('click', () => { card.style.display = 'none'; setHighlight(null); });
    card.querySelectorAll('.pc-pill').forEach((b) => b.addEventListener('click', () => focusPart(b.dataset.part)));
  }

  function openCard(partId) {                  // 查看知识卡即打卡
    const p = cardData && cardData.parts.find((x) => x.partId === partId);
    if (!p) return;
    renderCard(p);
    storeUpdate('exploredParts', (arr) => { const s = new Set(arr || []); s.add(partId); return [...s]; }, []);
    renderPanel();
  }

  /* ----- 高亮:自发光脉冲(仅改 emissive,可完整还原,不触贴图) ----- */
  function setHighlight(partId, fallbackMesh) {
    for (const [m, st] of savedMats) { m.emissive.setHex(st.e); m.emissiveIntensity = st.i; }
    savedMats.clear();
    hoverPart = partId;
    if (!partId || !index) return;
    const set = new Set(index.partMeshes.get(partId) || []);
    if (fallbackMesh) set.add(fallbackMesh);
    for (const o of set) {
      for (const m of (Array.isArray(o.material) ? o.material : [o.material])) {
        if (!m || !('emissive' in m) || savedMats.has(m)) continue;
        savedMats.set(m, { e: m.emissive.getHex(), i: m.emissiveIntensity });
        m.emissive.setHex(0x38bdf8);
      }
    }
  }
  base.addTick((_dt, t) => {                   // 脉冲节律 ~1.1Hz
    if (!active || !hoverPart) return;
    const v = 0.42 + 0.34 * (0.5 + 0.5 * Math.sin(t * 7));
    for (const [m] of savedMats) m.emissiveIntensity = v;
  });

  /* ----- 热点圆点(微小部件的可见抓手) ----- */
  const markerGroup = new THREE.Group();
  markerGroup.visible = false;
  base.scene.add(markerGroup);
  const markerMat = (() => {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const g = cv.getContext('2d');
    const rg = g.createRadialGradient(32, 32, 2, 32, 32, 30);
    rg.addColorStop(0, 'rgba(255,255,255,.95)');
    rg.addColorStop(0.25, 'rgba(56,189,248,.9)');
    rg.addColorStop(1, 'rgba(56,189,248,0)');
    g.fillStyle = rg;
    g.beginPath(); g.arc(32, 32, 30, 0, Math.PI * 2); g.fill();
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  })();

  function rebuildMarkers() {
    for (const s of [...markerGroup.children]) markerGroup.remove(s);
    if (!index) return;
    const size = Math.min(Math.max(index.geo.L * 0.022, 0.42), 1.05);
    for (const id of MICRO_PARTS) {
      const a = index.anchors.get(id);
      if (!a) continue;
      const sp = new THREE.Sprite(markerMat);
      sp.position.copy(a);
      sp.scale.setScalar(size);
      sp.userData.partId = id;
      sp.renderOrder = 60;
      markerGroup.add(sp);
    }
  }

  /* ----- 索引重建(整机就位/换装后调用) ----- */
  function rebuildIndex() {
    setHighlight(null);
    index = acRef.ac ? classifyAll(acRef.ac.root, dims, variantId) : null;
    rebuildMarkers();
  }

  /* ----- 拾取:网格按名字链/空间,圆点直接带 partId ----- */
  const ray = new THREE.Raycaster();
  const ptr = new THREE.Vector2();
  let downXY = null;
  let listCache = [];

  function pick(ev) {
    if (!index || !active) return null;
    const rect = base.renderer.domElement.getBoundingClientRect();
    ptr.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    ptr.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    ray.setFromCamera(ptr, base.camera);
    const hits = ray.intersectObjects([...listCache, ...markerGroup.children], false);
    return hits[0] || null;
  }
  function resolveHit(hit) {
    if (hit.object.userData.partId) return hit.object.userData.partId;      // 圆点
    for (let o = hit.object, i = 0; o && i < 3; o = o.parent, i++) {       // 名字链
      const id = nameToPart(o.name);
      if (id) return id;
    }
    const p = hit.point;                                                    // 空间兜底
    return spatialResolve(index.geo, p.x, p.y, p.z);
  }

  const onMove = (ev) => {
    if (!active) return;
    const hit = pick(ev);
    const id = hit ? resolveHit(hit) : null;
    setHighlight(id, hit && !hit.object.userData.partId ? hit.object : null);
    base.renderer.domElement.style.cursor = id ? 'pointer' : '';
    if (id && cardData) {
      const p = cardData.parts.find((x) => x.partId === id);
      tip.className = 'parts-tip';
      tip.textContent = p ? `${p.name} · ${p.group}` : id;
      const r = mountEl.getBoundingClientRect();
      tip.style.left = `${ev.clientX - r.left + 14}px`;
      tip.style.top = `${ev.clientY - r.top + 10}px`;
    } else tip.className = 'parts-tip hide';
  };
  const onLeave = () => { tip.className = 'parts-tip hide'; base.renderer.domElement.style.cursor = ''; setHighlight(null); };
  const onDown = (ev) => { downXY = [ev.clientX, ev.clientY]; };
  const onUp = (ev) => {
    if (!active || !downXY) return;
    const moved = Math.hypot(ev.clientX - downXY[0], ev.clientY - downXY[1]);
    downXY = null;
    if (moved > 7) return;                   // 拖拽旋转不算点击
    const hit = pick(ev);
    if (!hit) return;
    const id = resolveHit(hit);
    if (!id) return;
    openCard(id);
    flyToPart(id);
  };
  base.renderer.domElement.addEventListener('pointermove', onMove);
  base.renderer.domElement.addEventListener('pointerleave', onLeave);
  base.renderer.domElement.addEventListener('pointerdown', onDown);
  base.renderer.domElement.addEventListener('pointerup', onUp);

  /* ----- 相机飞行 + 2 秒驻留高亮 ----- */
  let hlTimer = null;
  function flyToPart(partId) {
    if (!index) return;
    const a = index.anchors.get(partId);
    if (!a) return;
    const { L, H } = index.geo;
    const bb = new THREE.Box3().setFromObject(acRef.ac.root);
    const center = bb.getCenter(new THREE.Vector3());
    const dir = a.clone().sub(center);
    dir.y += H * 0.1;
    if (dir.lengthSq() < 1) dir.set(0.6, 0.25, 0.75);
    dir.normalize();
    if (Math.abs(dir.y) > 0.92) dir.y = 0.4; // 避免正俯/仰视
    const group = cardData ? (cardData.parts.find((p) => p.partId === partId) || {}).group : '机身';
    const dist = Math.max((VIEW_DIST[group] ?? 0.5) * L, 5);
    const pos = a.clone().addScaledVector(dir, dist);
    pos.y = Math.max(pos.y, 1.4);
    flyTo({ pos: pos.toArray(), tgt: a.toArray() }, 0.55);
    setHighlight(partId);                    // 清单/胶囊跳转:驻留 2s
    clearTimeout(hlTimer);
    hlTimer = setTimeout(() => { if (hoverPart === partId) setHighlight(null); }, 2000);
  }
  function focusPart(partId) { openCard(partId); flyToPart(partId); }

  /* ----- 开关 ----- */
  function setActive(on) {
    active = on && !!index;
    if (active) {
      renderPanel();
      panel.classList.add('on');
    } else {
      panel.classList.remove('on');
      card.style.display = 'none';
      tip.className = 'parts-tip hide';
      setHighlight(null);
      base.renderer.domElement.style.cursor = '';
    }
    markerGroup.visible = active;
    return active;
  }

  /* ----- 数据就绪与生命周期 ----- */
  loadPartsData().then((d) => {
    cardData = d;
    if (active) renderPanel();
  }).catch((err) => { console.error('[parts] 知识卡数据加载失败:', err); onToast && onToast('部件知识卡加载失败', 'danger'); });

  rebuildIndex();
  /* 网格拾取清单:只列真实网格(圆点单算),每次换装后刷新 */
  const refreshList = () => {
    listCache = [];
    if (acRef.ac) acRef.ac.root.traverse((o) => { if (o.isMesh && o.geometry) listCache.push(o); });
  };
  refreshList();
  const _rebuild = rebuildIndex;
  rebuildIndex = () => { _rebuild(); refreshList(); };

  function dispose() {
    clearTimeout(hlTimer);
    setHighlight(null);
    base.renderer.domElement.removeEventListener('pointermove', onMove);
    base.renderer.domElement.removeEventListener('pointerleave', onLeave);
    base.renderer.domElement.removeEventListener('pointerdown', onDown);
    base.renderer.domElement.removeEventListener('pointerup', onUp);
    base.scene.remove(markerGroup);
    markerMat.map.dispose();
    markerMat.dispose();
    panel.remove();
    card.remove();
    tip.remove();
  }

  return {
    active: () => active,
    setActive,
    rebind: () => rebuildIndex(),           // 涂装换装后由 viewer 调用
    dispose,
  };
}
