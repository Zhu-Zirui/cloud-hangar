/**
 * interior/cabin.js — P4 检查点 2:客舱场景(A320 窄体布局,宽体机由界面标注"示意")
 * L1 门进入→前厨房/后走廊;头等 2-2 两排 + 经济 3-3 十一排(InstancedMesh);
 * 行李架开合、PSU 面板、氧气面罩/滑梯应急演示、夜航模式、舷窗机位看机翼云海。
 * 行走:地面热点点击跳转 + WASD 第一人称(碰撞限制走廊矩形,视线高 1.6m)。
 * 坐标约定:+Z 机头方向,地板 y=0,舱内宽 ±1.95m,纵向 -13.5(尾)~+13(前)。
 */
import * as THREE from 'three';
import { createSceneBase } from '../scene.js';

const damp = (a, b, r, dt) => a + (b - a) * (1 - Math.exp(-r * dt));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;

/* ---------------- 布局常量 ---------------- */
const AISLE = 0.27;          // 走廊半宽(碰撞盒 |x|≤AISLE)
const EYE = 1.6;             // 第一人称视线高度
const ECON_ROWS = 11, ECON_PITCH = 0.85, ECON_Z0 = 5.6;   // 经济舱 3-3
const F_ROWS = 2, F_PITCH = 1.0, F_Z0 = 8.2;              // 头等舱 2-2
const SEAT_COLS = [-1.6, -1.05, -0.5, 0.5, 1.05, 1.6];    // 经济舱列位
const F_COLS = [-1.25, -0.55, 0.55, 1.25];                // 头等舱列位

/* ---------------- 贴图工厂 ---------------- */
function windowTex(night) {
  const cv = document.createElement('canvas');
  cv.width = 128; cv.height = 192;
  const ctx = cv.getContext('2d');
  if (night) {
    const g = ctx.createLinearGradient(0, 0, 0, 192);
    g.addColorStop(0, '#02040d'); g.addColorStop(1, '#0a1730');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 192);
    for (let i = 0; i < 90; i++) { // 星空
      ctx.fillStyle = `rgba(255,255,255,${0.25 + Math.random() * 0.75})`;
      ctx.fillRect(Math.random() * 128, Math.random() * 130, 1.6, 1.6);
    }
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, 192);
    g.addColorStop(0, '#8ec9f2'); g.addColorStop(1, '#dcedf8');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 192);
    ctx.fillStyle = 'rgba(255,255,255,.75)'; // 一抹云
    ctx.beginPath(); ctx.ellipse(64, 150, 52, 14, 0, 0, Math.PI * 2); ctx.fill();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
function psuTex(night) {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 64;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#22262c'; ctx.fillRect(0, 0, 512, 64);
  for (let i = 0; i < 8; i++) { // 8 组:阅读灯点 + 呼叫钮 + 喇叭孔
    const x = 22 + i * 62;
    ctx.fillStyle = night ? '#ffd98c' : '#4a5058'; // 阅读灯
    ctx.beginPath(); ctx.arc(x, 20, night ? 6 : 5, 0, Math.PI * 2); ctx.fill();
    if (night) { ctx.fillStyle = 'rgba(255,217,140,.35)'; ctx.beginPath(); ctx.arc(x, 20, 11, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = night ? '#ffb0b0' : '#3a4048'; // 呼叫
    ctx.beginPath(); ctx.arc(x + 18, 20, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#31363d';
    for (let h = 0; h < 5; h++) ctx.fillRect(x + 32 + h * 3, 16, 2, 8); // 喇叭孔
    ctx.fillStyle = '#3d434b'; ctx.fillRect(x - 10, 38, 36, 12); // 氧气舱盖(闭合)
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ================= 主工厂 ================= */
export function createCabin(container, opts = {}) {
  const { variantId = '', onToast = () => {}, onDemoDone = () => {} } = opts;
  const base = createSceneBase(container, {
    cameraPos: [-0.6, 1.6, 16.5], target: [-0.6, 1.55, 15],
    minDistance: 0.2, maxDistance: 2, maxPolar: 95 * Math.PI / 180,
  });
  base.controls.enabled = false; // 客舱用第一人称(自管视角),不用轨道控制
  base.controls.update = () => {}; // 停用 update:否则每帧按球坐标重写相机,与第一人称冲突
  /* 客舱悬于"空中":隐藏停机坪,只留天空穹顶 */
  base.scene.traverse((o) => { if (o.isMesh && o.geometry && o.geometry.parameters && o.geometry.parameters.width === 300) o.visible = false; });

  const mHull = new THREE.MeshStandardMaterial({ color: 0xdfe4ea, roughness: 0.85, side: THREE.BackSide });
  const mWall = new THREE.MeshStandardMaterial({ color: 0xe8ebee, roughness: 0.9, side: THREE.DoubleSide });
  const mPanel = new THREE.MeshStandardMaterial({ color: 0xcfd6dd, roughness: 0.8 });
  const mMetal = new THREE.MeshStandardMaterial({ color: 0xb9c1c9, roughness: 0.35, metalness: 0.7 });
  const mFloor = new THREE.MeshStandardMaterial({ color: 0x343a42, roughness: 0.95 });
  const mDark = new THREE.MeshStandardMaterial({ color: 0x23272d, roughness: 0.8 });
  const mMask = new THREE.MeshStandardMaterial({ color: 0xf2c832, roughness: 0.5, emissive: 0x44300a, emissiveIntensity: 0.4 });
  const add = (m, parent) => { (parent || base.scene).add(m); return m; };

  /* ---------- 舱体:椭圆截面内壁(BackSide 圆筒)+ 平地板 ----------
     圆筒轴向经 rotX(90°) 转到 +Z;局部 z 轴此时对应世界高度,
     故截面压扁用 scale.z(旋转作用于缩放之后,压的是局部 z = 世界 y)。 */
  const LEN = 27;
  const hull = new THREE.Mesh(new THREE.CylinderGeometry(1.95, 1.95, LEN, 28, 1, true), mHull);
  hull.rotation.x = Math.PI / 2;
  hull.scale.z = 0.86; // 截面压扁成客舱蛋形(半高 1.68m)
  hull.position.set(0, 1.15, 0); add(hull);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.12, LEN), mFloor);
  floor.position.set(0, -0.06, 0); add(floor);
  /* 侧壁下饰条(客舱窗下腰带) */
  for (const sx of [-1, 1]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, LEN), mPanel);
    strip.position.set(sx * 1.92, 0.95, 0); add(strip);
  }

  /* ---------- 舷窗列(InstancedMesh,昼/夜换贴图) ---------- */
  const winTexDay = windowTex(false), winTexNight = windowTex(true);
  const winGeo = new THREE.PlaneGeometry(0.26, 0.4);
  const winMat = new THREE.MeshBasicMaterial({ map: winTexDay, toneMapped: false });
  const winZs = [];
  for (let z = 9.6; z > -7.2; z -= 0.56) winZs.push(z);
  const windows = new THREE.InstancedMesh(winGeo, winMat, winZs.length * 2);
  {
    const d = new THREE.Object3D(); let i = 0;
    for (const z of winZs) for (const sx of [-1, 1]) {
      d.position.set(sx * 1.935, 1.28, z); d.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2;
      d.updateMatrix(); windows.setMatrixAt(i++, d.matrix);
    }
  }
  add(windows);

  /* ---------- 行李架:两侧长壳 + 可开合舱门 ---------- */
  const binFlaps = [];
  for (const sx of [-1, 1]) {
    const shell = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.38, LEN * 0.86), mPanel);
    shell.position.set(sx * 1.55, 1.9, 0); add(shell);
    const bayN = 6, bayL = (LEN * 0.86) / bayN;
    for (let i = 0; i < bayN; i++) { // 舱门:铰链在舱外侧上沿,向上外翻
      const pivot = new THREE.Group();
      pivot.position.set(sx * 1.85, 2.02, -LEN * 0.43 + bayL * (i + 0.5));
      const flap = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.03, bayL * 0.94), mWall);
      flap.position.set(-sx * 0.28, -0.1, 0); // 关门时平贴架底开口
      pivot.add(flap); add(pivot);
      binFlaps.push({ pivot, open: 0, target: 0, sx });
    }
  }

  /* ---------- PSU 面板条(阅读灯/呼叫/氧气舱盖,Canvas 贴图昼夜互换) ---------- */
  const psuTexDay = psuTex(false), psuTexNight = psuTex(true);
  const psuMat = new THREE.MeshBasicMaterial({ map: psuTexDay, toneMapped: false });
  for (let seg = 0; seg < 4; seg++) {
    const z = 7.6 - seg * 4.4;
    const p = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.2, 0.9), psuMat);
    p.position.set(0, 2.0, z); add(p);
    for (const sx of [-1, 1]) { // 斜面段(贴窗顶)
      const q = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 0.9), psuMat);
      q.position.set(sx * 1.5, 1.88, z); q.rotation.z = sx * 0.5; add(q);
    }
  }

  /* ---------- 座椅:四件套 InstancedMesh(坐垫/靠背/头枕/扶手),头等独立配色 ---------- */
  const seatDefs = [];
  for (let r = 0; r < F_ROWS; r++) for (const x of F_COLS)
    seatDefs.push({ x, z: F_Z0 - r * F_PITCH, f: true });
  for (let r = 0; r < ECON_ROWS; r++) for (const x of SEAT_COLS)
    seatDefs.push({ x, z: ECON_Z0 - r * ECON_PITCH, f: false });
  const nS = seatDefs.length;
  const mSeatC = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.88 });
  const parts = [
    { g: new THREE.BoxGeometry(0.46, 0.1, 0.44), off: [0, 0.5, 0.02] },              // 坐垫
    { g: new THREE.BoxGeometry(0.46, 0.66, 0.1), off: [0, 0.86, -0.2], tilt: 0.14 }, // 靠背
    { g: new THREE.BoxGeometry(0.3, 0.17, 0.08), off: [0, 1.26, -0.27], tilt: 0.14 },// 头枕
    { g: new THREE.BoxGeometry(0.055, 0.06, 0.4), off: [-0.24, 0.62, 0] },           // 扶手×2
    { g: new THREE.BoxGeometry(0.055, 0.06, 0.4), off: [0.24, 0.62, 0] },
    { g: new THREE.BoxGeometry(0.4, 0.34, 0.36), off: [0, 0.28, 0] },                // 底座
  ];
  const seatMeshes = parts.map((p) => {
    const im = new THREE.InstancedMesh(p.g, mSeatC, nS);
    im.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    add(im); return im;
  });
  {
    const d = new THREE.Object3D(); const col = new THREE.Color();
    seatDefs.forEach((s, i) => {
      col.set(s.f ? 0x6e2f3c : 0x2e4a68); // 头等酒红 / 经济深蓝(航司座椅常见色)
      parts.forEach((p, pi) => {
        d.position.set(s.x + p.off[0], p.off[1], s.z + p.off[2]);
        d.rotation.set(p.tilt || 0, 0, 0);
        d.updateMatrix();
        seatMeshes[pi].setMatrixAt(i, d.matrix);
        seatMeshes[pi].setColorAt(i, col);
      });
    });
    seatMeshes.forEach((im) => { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; });
  }
  /* 折叠小桌板(靠背背面薄板,示意) */
  const trayGeo = new THREE.BoxGeometry(0.4, 0.26, 0.02);
  const trayMat = new THREE.MeshStandardMaterial({ color: 0x9aa2ab, roughness: 0.6 });
  const trays = new THREE.InstancedMesh(trayGeo, trayMat, nS);
  {
    const d = new THREE.Object3D();
    seatDefs.forEach((s, i) => {
      d.position.set(s.x, 0.98, s.z - 0.27); d.rotation.set(0.14 + Math.PI, 0, 0);
      d.updateMatrix(); trays.setMatrixAt(i, d.matrix);
    });
  }
  add(trays);

  /* ---------- 隔板:前厨房/尾盥洗室/尾厨房 ---------- */
  function bulkhead(z, gapW) { // 中部开口隔板(两侧到 ±1.62,高 1.8,顶部留缝隙藏进椭圆)
    const w = 1.62 - gapW / 2;
    for (const sx of [-1, 1]) {
      const seg = new THREE.Mesh(new THREE.BoxGeometry(w, 1.8, 0.08), mWall);
      seg.position.set(sx * (gapW / 2 + w / 2), 1.05, z); add(seg);
    }
    const top = new THREE.Mesh(new THREE.BoxGeometry(gapW, 0.4, 0.08), mWall);
    top.position.set(0, 1.95, z); add(top);
  }
  bulkhead(10.4, 0.7);   // 前厨房隔板
  bulkhead(-11.2, 0.72); // 尾部隔板
  /* 前厨房:金属面板 + 餐车凹位 + 餐车 */
  for (let i = 0; i < 3; i++) {
    const cart = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.9, 0.5), mMetal);
    cart.position.set(-1.2 + i * 0.55, 0.45, 11.6); add(cart);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.04), mDark);
    handle.position.set(-1.2 + i * 0.55, 0.95, 11.32); add(handle);
  }
  const galleyTop = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.9, 0.6), mPanel);
  galleyTop.position.set(1.2, 1.5, 11.6); add(galleyTop);
  /* 后盥洗室:右后小间(门 + 洗手台示意) */
  const lavDoor = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.9, 0.06), mPanel);
  lavDoor.position.set(0.9, 0.95, -11.15); lavDoor.rotation.y = 0.9; add(lavDoor);
  const sink = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.4), mMetal);
  sink.position.set(1.4, 0.9, -12.3); add(sink);
  const lavMirror = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.5), new THREE.MeshStandardMaterial({ color: 0x8fb8d8, roughness: 0.1, metalness: 0.6 }));
  lavMirror.position.set(1.4, 1.6, -12.85); add(lavMirror); // 尾墙内侧,面向 +Z 舱内
  /* 尾厨房凹位 */
  const tailGalley = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.0, 0.5), mPanel);
  tailGalley.position.set(-0.6, 0.5, -12.6); add(tailGalley);

  /* ---------- 翼上应急出口门(两侧) + 开启手柄 ---------- */
  const exitDoors = [];
  for (const sx of [-1, 1]) {
    const g = new THREE.Group(); g.position.set(sx * 1.9, 1.15, -0.6); add(g);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.62, 0.52), mWall);
    g.add(door);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.3), new THREE.MeshStandardMaterial({ color: 0xd23b3b, roughness: 0.5 }));
    handle.position.set(-sx * 0.07, 0.18, 0); g.add(handle);
    exitDoors.push({ g, sx, open: 0 });
  }

  /* ---------- 地面热点(点击跳转) ---------- */
  const HOTSPOTS = [
    { key: 'door', cn: 'L1 舱门', x: 0, z: 11.8 },
    { key: 'first', cn: '头等舱', x: 0.35, z: 7.6 },
    { key: 'exit', cn: '中部应急门', x: 0.35, z: -0.4 },
    { key: 'lav', cn: '后盥洗室', x: 0.3, z: -9.6 },
    { key: 'galley', cn: '尾厨房', x: 0, z: -12.0 },
  ];
  const spotMeshes = [];
  const ringTexCv = document.createElement('canvas'); ringTexCv.width = ringTexCv.height = 128;
  {
    const c = ringTexCv.getContext('2d');
    c.strokeStyle = '#38bdf8'; c.lineWidth = 10;
    c.beginPath(); c.arc(64, 64, 48, 0, Math.PI * 2); c.stroke();
    c.fillStyle = 'rgba(56,189,248,.25)';
    c.beginPath(); c.arc(64, 64, 40, 0, Math.PI * 2); c.fill();
  }
  const ringTex = new THREE.CanvasTexture(ringTexCv);
  const ringMat = new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, depthWrite: false, toneMapped: false });
  for (const h of HOTSPOTS) {
    const ring = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.72), ringMat);
    ring.rotation.x = -Math.PI / 2; ring.position.set(h.x, 0.015, h.z);
    ring.userData.spot = h; add(ring); spotMeshes.push(ring);
  }

  /* ---------- 窗外:简化机翼 + 发动机短舱 + 云海 ---------- */
  const wingGrp = new THREE.Group(); add(wingGrp);
  {
    // 简化后掠翼:三截面薄板放样(每截面 4 点:前缘上/下、后缘上/下),双面材质
    const secs = [
      { z: 1.6, x: 2.0, chord: 4.6, y: -0.7 },
      { z: -0.6, x: 4.6, chord: 3.0, y: -0.35 },
      { z: -2.2, x: 8.6, chord: 1.3, y: 0.25 },
    ];
    const pos = [], idx = [];
    for (const s of secs) {
      pos.push(s.x, s.y + 0.06, s.z + s.chord / 2, s.x, s.y - 0.06, s.z + s.chord / 2,
        s.x, s.y + 0.06, s.z - s.chord / 2, s.x, s.y - 0.06, s.z - s.chord / 2);
    }
    for (let s = 0; s < secs.length - 1; s++) {
      const a = s * 4, b = a + 4; // 0 前上 1 前下 2 后上 3 后下
      for (const [p, q, r] of [[a, b, b + 2], [a, b + 2, a + 2],      // 上表面
        [a + 1, a + 3, b + 3], [a + 1, b + 3, b + 1],                // 下表面
        [a, a + 1, b + 1], [a, b + 1, b],                            // 前缘
        [a + 2, b + 2, b + 3], [a + 2, b + 3, a + 3]]) {             // 后缘
        idx.push(p, q, r);
      }
    }
    const wg = new THREE.BufferGeometry();
    wg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    wg.setIndex(idx); wg.computeVertexNormals();
    const wing = new THREE.Mesh(wg, new THREE.MeshStandardMaterial({ color: 0xdde3e9, roughness: 0.5, side: THREE.DoubleSide }));
    wingGrp.add(wing);
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.45, 2.0, 16), new THREE.MeshStandardMaterial({ color: 0xc6ccd3, roughness: 0.4 }));
    pod.rotation.x = Math.PI / 2; pod.position.set(3.6, -1.0, -0.4); wingGrp.add(pod); // 短舱
    const pyl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.9), new THREE.MeshStandardMaterial({ color: 0xc6ccd3 }));
    pyl.position.set(3.6, -0.62, -0.4); wingGrp.add(pyl);
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.7), new THREE.MeshStandardMaterial({ color: 0xdde3e9 }));
    tip.position.set(8.6, 0.7, -2.2); tip.rotation.z = 0.12; wingGrp.add(tip); // 翼梢小翼
  }
  /* 云海:大雾平面 + 漂移云球群 */
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.82 });
  const clouds = [];
  const cloudGeo = new THREE.SphereGeometry(1, 10, 8);
  for (let i = 0; i < 34; i++) {
    const m = new THREE.Mesh(cloudGeo, cloudMat);
    const r = 1.8 + Math.random() * 4.5;
    m.scale.set(r, r * 0.42, r);
    m.position.set(3 + Math.random() * 30, -6 + Math.random() * 9, -30 + Math.random() * 42);
    m.userData.v = 0.25 + Math.random() * 0.5;
    add(m); clouds.push(m);
  }
  const haze = new THREE.Mesh(new THREE.PlaneGeometry(600, 600),
    new THREE.MeshBasicMaterial({ color: 0xdfe9f2, transparent: true, opacity: 0.55, depthWrite: false }));
  haze.rotation.x = -Math.PI / 2; haze.position.y = -42; add(haze);

  /* ---------- 应急演示组:氧气面罩(中排 PSU)+ 充气滑梯(右应急门) ---------- */
  const oxy = new THREE.Group(); oxy.position.set(0, 2.02, 2.15); add(oxy); // 演示用 PSU(中排走道上方)
  const oxyCover = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.03, 0.2), mPanel);
  const coverPivot = new THREE.Group(); coverPivot.position.set(0, 0, -0.1); // 铰链在后缘
  oxyCover.position.set(0, 0, 0.1); coverPivot.add(oxyCover); oxy.add(coverPivot);
  const masks = [];
  for (let i = 0; i < 4; i++) {
    const g = new THREE.Group();
    const line = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.34, 4), mDark);
    line.position.y = -0.17; g.add(line);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), mMask);
    head.position.y = -0.36; g.add(head);
    const bag = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 8), mMask);
    bag.position.y = -0.45; bag.rotation.x = Math.PI; g.add(bag);
    g.position.set(-0.21 + i * 0.14, 0, 0);
    g.visible = false; oxy.add(g);
    masks.push({ g, t: 0 });
  }
  /* 滑梯:右应急门外,折叠 → 充气展开(scale + 弹性摆动) */
  const slide = new THREE.Group(); slide.position.set(2.1, 0.9, -0.6); add(slide);
  const slideBody = new THREE.Mesh(
    new THREE.BoxGeometry(1.15, 0.16, 3.1),
    new THREE.MeshStandardMaterial({ color: 0xe8a13c, roughness: 0.7 }),
  );
  slideBody.position.set(0.5, -0.55, -0.3); slideBody.rotation.x = 0.62; // 向外下倾
  slide.add(slideBody);
  const slideRail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 3.1), new THREE.MeshStandardMaterial({ color: 0xc9822a }));
  slideRail.position.set(0.5, -0.25, -0.3); slideRail.rotation.x = 0.62; slide.add(slideRail);
  slide.visible = false;

  /* ---------- 夜航模式:暖光点光源组 + 地面指引灯条 ---------- */
  const nightLights = [];
  for (const z of [8, 1.5, -5, -11]) {
    const p = new THREE.PointLight(0xffd9a8, 0, 7, 1.8);
    p.position.set(0, 2.05, z); add(p); nightLights.push(p);
  }
  const dayLights = [];
  for (const z of [8, 1.5, -5, -11]) {
    const p = new THREE.PointLight(0xeef4fa, 0.55, 8, 1.6);
    p.position.set(0, 2.0, z); add(p); dayLights.push(p);
  }
  const guideMat = new THREE.MeshBasicMaterial({ color: 0x7fe08a, toneMapped: false });
  const guides = [];
  for (const sx of [-1, 1]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, LEN * 0.9), guideMat);
    strip.position.set(sx * AISLE, 0.012, 0); strip.visible = false; add(strip); guides.push(strip);
  }

  /* ---------- 第一人称行走 + 视角 ----------
     相机 yaw 前向向量 = (-sin yaw, -cos yaw):yaw=0 面向 -Z(机尾),yaw=π 面向机头。 */
  const player = { x: -0.6, z: 16.5, yaw: 0, pitch: 0 }; // 从 L1 门外走入,朝机尾方向
  const keys = {};
  let look = null, walkTween = null, entry = { t: 0, on: true };
  function applyCam() {
    base.camera.position.set(player.x, EYE, player.z);
    base.camera.rotation.order = 'YXZ';
    base.camera.rotation.set(player.pitch, player.yaw, 0);
  }
  const onKeyDown = (e) => { keys[e.code] = true; };
  const onKeyUp = (e) => { keys[e.code] = false; };
  const onDown = (e) => {
    if (e.button !== 0) return;
    look = { x: e.clientX, y: e.clientY, yaw: player.yaw, pitch: player.pitch };
  };
  const onMove = (e) => {
    if (!look) return;
    player.yaw = look.yaw - (e.clientX - look.x) * 0.0042;
    player.pitch = clamp(look.pitch - (e.clientY - look.y) * 0.0042, -1.1, 1.1);
  };
  const onUp = () => { look = null; };
  /* 热点点击 */
  const ray = new THREE.Raycaster(); const ptr = new THREE.Vector2();
  const onClick = (e) => {
    if (Math.abs(e.clientX - (look ? look.x : e.clientX)) > 5) return;
    const r = base.renderer.domElement.getBoundingClientRect();
    ptr.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    ptr.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    ray.setFromCamera(ptr, base.camera);
    const hit = ray.intersectObjects(spotMeshes, false)[0];
    if (hit) {
      const h = hit.object.userData.spot;
      walkTo(h.x, h.z, Math.atan2(-(h.x - player.x), -(h.z - player.z)));
      onToast('前往:' + h.cn);
    }
  };
  function walkTo(x, z, yaw) {
    walkTween = { t: 0, d: 0.9, x0: player.x, z0: player.z, x1: x, z1: z, yaw0: player.yaw, yaw1: yaw };
  }
  const el = base.renderer.domElement;
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  el.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  el.addEventListener('click', onClick);

  /* ---------- 演示状态 ---------- */
  const demo = { kind: '', t: 0 };
  function startDemo(kind) {
    if (demo.kind) return;
    demo.kind = kind; demo.t = 0;
    if (kind === 'oxygen') {
      coverPivot.rotation.x = 0;
      masks.forEach((m) => { m.t = 0; m.g.visible = false; });
      flyTo('first', 1.1);
      onToast('客舱失压演示:氧气面罩舱盖打开,面罩垂落 — 请戴好再帮助他人');
    } else if (kind === 'slide') {
      const d = exitDoors[1]; // 右舷应急门
      d.g.rotation.y = 0; slide.visible = false;
      slide.scale.set(0.06, 0.06, 0.06);
      flyTo('exit', 1.1);
      onToast('应急门开启,滑梯充气中…(约 3 秒)');
    }
  }
  function resetDemos() {
    demo.kind = ''; demo.t = 0;
    coverPivot.rotation.x = 0;
    masks.forEach((m) => { m.t = 0; m.g.visible = false; });
    exitDoors.forEach((d) => { d.g.rotation.y = 0; });
    slide.visible = false;
  }
  function stepDemo(dt) {
    if (!demo.kind) return;
    demo.t += dt;
    if (demo.kind === 'oxygen') {
      coverPivot.rotation.x = damp(coverPivot.rotation.x, 1.9, 4, dt); // 舱盖翻开
      masks.forEach((m, i) => {
        const mt = demo.t - 0.5 - i * 0.15;
        if (mt <= 0) { m.g.visible = false; return; }
        m.g.visible = true; m.t = mt;
        const drop = Math.min(1, mt / 0.7);
        const bounce = drop < 1 ? 1 - Math.pow(1 - drop, 3) : 1 + Math.sin((mt - 0.7) * 9) * 0.12 * Math.exp(-(mt - 0.7) * 2.2);
        m.g.position.y = -0.34 * Math.max(0.0, bounce); // 面罩垂落(带弹性回摆)
        m.g.rotation.z = Math.sin(m.t * 5.5) * 0.35 * Math.exp(-m.t * 1.6); // 摆动
      });
      if (demo.t > 4.5) { onDemoDone('oxygen'); demo.kind = ''; }
    } else if (demo.kind === 'slide') {
      const d = exitDoors[1];
      d.g.rotation.y = damp(d.g.rotation.y, -2.1, 3.5, dt); // 舱门向内上开启
      if (demo.t > 0.8) {
        slide.visible = true;
        const inf = Math.min(1, (demo.t - 0.8) / 2.2);
        const wob = 1 + Math.sin(inf * Math.PI * 3) * 0.06 * (1 - inf);
        const s = 0.06 + (1 - 0.06) * (1 - Math.pow(1 - inf, 2.2)) * wob;
        slide.scale.set(s, s, s);
      }
      if (demo.t > 3.6) { onDemoDone('slide'); demo.kind = ''; onToast('滑梯充气完成'); }
    }
  }

  /* ---------- 行李架开合 ---------- */
  let binsTarget = 0;
  function toggleBins() {
    binsTarget = binsTarget ? 0 : 1;
    binFlaps.forEach((f) => { f.target = binsTarget; });
    onToast(binsTarget ? '行李架:打开' : '行李架:关闭');
    return !!binsTarget;
  }

  /* ---------- 相机预设(yaw 前向 = (-sin,-cos):0=朝机尾,π=朝机头) ---------- */
  const PRESETS = {
    door:   { x: 0, z: 11.4, yaw: 0.05, pitch: -0.06 },
    first:  { x: 0.35, z: 7.8, yaw: -0.08, pitch: 0.05 },
    exit:   { x: 0.55, z: -0.2, yaw: -1.35, pitch: 0.1 },  // 望向右舷应急门
    lav:    { x: 0.3, z: -9.8, yaw: -0.42, pitch: 0 },
    galley: { x: 0, z: -11.9, yaw: 0.04, pitch: 0.04 },
    window: { x: 1.12, z: 1.3, yaw: -0.98, pitch: -0.22 }, // 贴右窗看机翼云海
  };
  let camTween = null;
  function flyTo(key, dur = 1.0) {
    const p = PRESETS[key]; if (!p) return;
    let y0 = p.yaw, y1 = p.yaw;
    if (y1 - player.yaw > Math.PI) y0 += Math.PI * 2; else if (y1 - player.yaw < -Math.PI) y0 -= Math.PI * 2;
    camTween = { t: 0, d: dur, x0: player.x, z0: player.z, x1: p.x, z1: p.z,
      yaw0: player.yaw, yaw1: y1 + (y0 - p.yaw), pitch0: player.pitch, pitch1: p.pitch };
  }

  /* ---------- 主循环 ---------- */
  base.addTick((dt) => {
    /* 进入动线:L1 门走入 1.5s */
    if (entry.on) {
      entry.t += dt;
      const e = Math.min(1, entry.t / 1.5);
      const s = 1 - Math.pow(1 - e, 3);
      player.x = lerp(-0.6, 0.3, s); player.z = lerp(16.5, 10.0, s);
      player.yaw = 0; player.pitch = 0;
      if (e >= 1) { entry.on = false; onToast('欢迎登机 — 拖拽转视角 · WASD 行走 · 点击地面光圈跳转'); }
    }
    /* WASD 行走(限制在走廊矩形盒内;W 沿前向,A/D 平移) */
    if (!entry.on) {
      const mf = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
      const mr = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
      if (mf || mr) {
        if (walkTween || camTween) { walkTween = null; camTween = null; }
        const sin = Math.sin(player.yaw), cos = Math.cos(player.yaw);
        const sp = 1.9 * dt;
        const fx = -sin, fz = -cos;      // 前向
        const rx = cos, rz = -sin;       // 右向
        player.x = clamp(player.x + (rx * mr + fx * mf) * sp, -AISLE, AISLE);
        player.z = clamp(player.z + (rz * mr + fz * mf) * sp, -12.2, 12.2);
      }
    }
    /* 热点/预设运镜 tween */
    if (walkTween) {
      walkTween.t += dt;
      const e = Math.min(1, walkTween.t / walkTween.d);
      const s = 1 - Math.pow(1 - e, 3);
      player.x = lerp(walkTween.x0, walkTween.x1, s);
      player.z = lerp(walkTween.z0, walkTween.z1, s);
      player.yaw = lerp(walkTween.yaw0, walkTween.yaw1, s);
      if (e >= 1) walkTween = null;
    }
    if (camTween) {
      camTween.t += dt;
      const e = Math.min(1, camTween.t / camTween.d);
      const s = e < 0.5 ? 4 * e ** 3 : 1 - Math.pow(-2 * e + 2, 3) / 2;
      player.x = lerp(camTween.x0, camTween.x1, s);
      player.z = lerp(camTween.z0, camTween.z1, s);
      player.yaw = lerp(camTween.yaw0, camTween.yaw1, s);
      player.pitch = lerp(camTween.pitch0, camTween.pitch1, s);
      if (e >= 1) camTween = null;
    }
    /* 行李架开合动画 */
    for (const f of binFlaps) {
      f.open = damp(f.open, f.target, 5, dt);
      f.pivot.rotation.z = f.sx * f.open * 1.25;
    }
    stepDemo(dt);
    /* 云海漂移 */
    for (const c of clouds) {
      c.position.z += c.userData.v * dt;
      if (c.position.z > 16) c.position.z = -34;
    }
    /* 热点呼吸 */
    const pulse = 0.9 + Math.sin(performance.now() * 0.003) * 0.12;
    ringMat.opacity = pulse;
    applyCam();
  });

  /* ---------- 昼夜 ---------- */
  let night = false;
  function setNight(on) {
    night = !!on;
    winMat.map = night ? winTexNight : winTexDay;
    winMat.needsUpdate = true;
    psuMat.map = night ? psuTexNight : psuTexDay;
    psuMat.needsUpdate = true;
    dayLights.forEach((p) => { p.intensity = night ? 0.08 : 0.55; });
    nightLights.forEach((p) => { p.intensity = night ? 1.15 : 0; });
    guides.forEach((g) => { g.visible = night; });
    mHull.color.set(night ? 0x6b7078 : 0xdfe4ea);
    mWall.color.set(night ? 0x70767e : 0xe8ebee);
    mPanel.color.set(night ? 0x585f68 : 0xcfd6dd);
    base.setNight(on);
    onToast(night ? '夜航模式:客舱暖光 · 舷窗星空 · 地面指引灯' : '昼间模式');
  }

  return {
    setNight, isNight: () => night,
    flyTo, startDemo, resetDemos, toggleBins,
    isDemo: () => !!demo.kind,
    presets: [['door', '舱门口'], ['first', '头等舱'], ['exit', '应急门'], ['lav', '后盥洗室'], ['galley', '尾厨房'], ['window', '舷窗视角']],
    dispose: () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('click', onClick);
      winTexDay.dispose(); winTexNight.dispose(); psuTexDay.dispose(); psuTexNight.dispose();
      ringTex.dispose();
      base.dispose();
    },
  };
}
