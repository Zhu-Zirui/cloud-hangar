/**
 * engine/fuselage.js — 机身放样(自建 BufferGeometry)
 *
 * 坐标系:机头 +Z,机尾 -Z,左舷 +X(u=0.75),右舷 -X(u=0.25),y=0 为机身轴线。
 * UV 契约见 materials.js 头注:u 圆周(0=顶),s 纵向(0=机头),贴图 flipY=false。
 * 站位 12-20 个:机鼻收尖下压 → 等直段 → 尾锥上收,半径/中心线由家族参数驱动。
 */
import * as THREE from 'three';

const TWO_PI = Math.PI * 2;

/* ---------- 半径 / 中心线曲线 ---------- */

/** 站位半径:机鼻段 sin^0.6 快起(钝头),中段等直,尾段收缩到尾端半径 */
export function radiusAt(s, p) {
  const { noseLen, tailLen, maxR, tailEndR } = p;
  if (s < noseLen) {
    const t = s / noseLen;
    return maxR * Math.pow(Math.sin(t * Math.PI / 2), 0.6);
  }
  const tailStart = 1 - tailLen;
  if (s > tailStart) {
    const t = (s - tailStart) / tailLen;
    // smoothstep 缓出,末段收细但不归零(尾锥末端由 APU 盖帽)
    return maxR * (1 - (1 - tailEndR) * Math.pow(t, 1.5));
  }
  return maxR;
}

/** 站位中心线高度:机鼻下压 + 尾锥上收 */
export function centerAt(s, p) {
  const { noseLen, tailLen, noseDroop, tailUpsweep } = p;
  let cy = 0;
  if (s < noseLen) cy -= noseDroop * Math.pow(1 - s / noseLen, 1.7);
  const tailStart = 1 - tailLen;
  if (s > tailStart) {
    const t = (s - tailStart) / tailLen;
    cy += tailUpsweep * Math.pow(t, 1.8);
  }
  return cy;
}

/**
 * 曲面采样器:任意 (u, s) → 位置/外法线。风挡、舷窗、舱门、皮托管等
 * 细节件都贴着机身表面放置,统一走本采样器,保证与放样面完全贴合。
 */
export function makeSurfaceSampler(p) {
  const pos = (u, s, inflate = 0) => {
    const r = radiusAt(s, p);
    const rx = r * p.widthScale + inflate;
    const ry = r * p.heightScale + inflate;
    const a = u * TWO_PI;
    return new THREE.Vector3(
      -rx * Math.sin(a),
      centerAt(s, p) + ry * Math.cos(a),
      p.len / 2 - s * p.len,
    );
  };
  const normal = (u, s) => {
    // 数值微分:dP/ds × dP/du 方向朝外(顶部验证为 +Y)
    const e = 0.002;
    const dS = pos(u, Math.min(s + e, 1)).sub(pos(u, Math.max(s - e, 0)));
    const dU = pos(Math.min(u + e, 1), s).sub(pos(Math.max(u - e, 0), s));
    return dS.cross(dU).normalize(); // 顶部验证为 +Y,朝外
  };
  return { pos, normal, radiusAt: (s) => radiusAt(s, p), centerAt: (s) => centerAt(s, p) };
}

/* ---------- 放样几何 ---------- */

/**
 * 在站位区间 [s0, s1] 上生成放样 BufferGeometry。
 * 站位分布:端点密、中段疏;noseDense 用于鼻尖加密。
 */
function loftGeometry(p, s0, s1, segments = 44) {
  const stations = [];
  const steps = p.stationSteps || 16;
  for (let i = 0; i <= steps; i++) {
    // ease:两端密中间疏(弦长分布)
    const t = i / steps;
    const te = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    stations.push(s0 + (s1 - s0) * te);
  }
  const N = segments;
  const posArr = [];
  const uvArr = [];
  const idx = [];
  for (let k = 0; k < stations.length; k++) {
    const s = stations[k];
    const r = radiusAt(s, p);
    const rx = r * p.widthScale;
    const ry = r * p.heightScale;
    const cy = centerAt(s, p);
    const z = p.len / 2 - s * p.len;
    for (let i = 0; i < N; i++) {
      const u = i / N;
      const a = u * TWO_PI;
      posArr.push(-rx * Math.sin(a), cy + ry * Math.cos(a), z);
      uvArr.push(u, s);
    }
  }
  for (let k = 0; k < stations.length - 1; k++) {
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N;
      const a = k * N + i, b = k * N + j;
      const c = (k + 1) * N + j, d = (k + 1) * N + i;
      idx.push(a, d, c, a, c, b); // 外法线绕向(见模块头注推导)
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvArr, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/** 尾端盖帽(小圆盘,藏在 APU 排气口内) */
function tailCap(p) {
  const r = radiusAt(1, p) * Math.min(p.widthScale, p.heightScale);
  const geo = new THREE.CircleGeometry(r, 24);
  const cy = centerAt(1, p);
  const mesh = new THREE.Mesh(geo);
  mesh.position.set(0, cy, -p.len / 2 + 0.01);
  mesh.rotation.y = Math.PI; // 朝后
  return mesh;
}

/* ---------- 贴面小件工具 ---------- */

/** 在机身表面放置一块朝外的面片(风挡/舷窗/舱门共用) */
function placeOnSurface(mesh, sampler, u, s, inflate, rakeDeg = 0) {
  const P = sampler.pos(u, s, inflate);
  const n = sampler.normal(u, s);
  // 风挡后倾:法线向上前方偏转
  if (rakeDeg) {
    const rake = THREE.MathUtils.degToRad(rakeDeg);
    n.add(new THREE.Vector3(0, Math.sin(rake) * 0.85, Math.cos(rake) * 0.55)).normalize();
  }
  const up = new THREE.Vector3(0, 1, 0);
  // Matrix4.lookAt 的 z 轴 = eye - target;目标取 -n 才能让面片 +Z(正面)朝外
  const m = new THREE.Matrix4().lookAt(new THREE.Vector3(), n.clone().negate(), up);
  mesh.position.copy(P).addScaledVector(n, 0.025);
  mesh.quaternion.setFromRotationMatrix(m);
}

/* ---------- 舱门 ---------- */

/** 舱门轮廓贴图(圆角矩形描边,透明内芯)——每次构建现画,随整机一起 dispose */
function doorOutlineTexture() {
  const cv = document.createElement('canvas');
  cv.width = 128; cv.height = 256;
  const ctx = cv.getContext('2d');
  ctx.strokeStyle = 'rgba(26,33,40,0.9)';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.roundRect(9, 9, 110, 238, 18);
  ctx.stroke();
  // 门把手小横线
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(88, 130); ctx.lineTo(106, 130); ctx.stroke();
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** 按门位数生成舱门组(左右对称),partId 统一 door_l1 */
function buildDoors(p, sampler, mats) {
  const group = new THREE.Group();
  const w = p.doors.w, h = p.doors.h;
  const geo = new THREE.PlaneGeometry(w, h);
  const mat = new THREE.MeshBasicMaterial({
    map: doorOutlineTexture(), transparent: true, alphaTest: 0.25, depthWrite: false,
  });
  mat.polygonOffset = true; mat.polygonOffsetFactor = -2;
  const du = h / (TWO_PI * p.maxR);           // 门高对应的圆周角
  for (const s of p.doors.positions) {
    for (const uSide of [0.25 - 0.045 + du / 2, 0.75 + 0.045 - du / 2]) {
      // 门上缘贴近舷窗带:中心位于窗带下侧
      const door = new THREE.Mesh(geo, mat);
      placeOnSurface(door, sampler, uSide, s, 0, 0);
      door.userData.partId = 'door_l1';
      door.renderOrder = 2;
      group.add(door);
    }
  }
  return group;
}

/* ---------- 客舱舷窗列(InstancedMesh) ---------- */

function buildCabinWindows(p, sampler, mats) {
  const { start, end, pitch, uCenter } = p.windows;
  const sList = [];
  for (let s = start; s <= end; s += pitch / p.len) {
    // 舱门位置留空(门宽 + 余量)
    const nearDoor = p.doors.positions.some((ds) => Math.abs(ds - s) < (p.doors.w + 0.7) / p.len);
    if (!nearDoor) sList.push(s);
  }
  const geo = new THREE.PlaneGeometry(0.26, 0.38);
  const inst = new THREE.InstancedMesh(geo, mats.cabinWindow, sList.length * 2);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const scl = new THREE.Vector3(1, 1, 1);
  let n = 0;
  for (const side of [uCenter, 1 - uCenter]) {   // 右舷 / 左舷镜像
    for (const s of sList) {
      const P = sampler.pos(side, s, 0);
      const nrm = sampler.normal(side, s);
      // lookAt 目标取 -nrm:让窗面 +Z(正面)朝外(与 placeOnSurface 同约定)
      const m = new THREE.Matrix4().lookAt(new THREE.Vector3(), nrm.clone().negate(), new THREE.Vector3(0, 1, 0));
      q.setFromRotationMatrix(m);
      m4.compose(P.addScaledVector(nrm, 0.018), q, scl);
      inst.setMatrixAt(n++, m4);
    }
  }
  inst.instanceMatrix.needsUpdate = true;
  inst.userData.partId = 'cabin_window';
  return inst;
}

/* ---------- 驾驶舱风挡 ---------- */

function buildWindshield(p, sampler, mats) {
  const group = new THREE.Group();
  const { perSide, sCenter, uCenter, du, w, h, rake } = p.windshield;
  const geo = new THREE.PlaneGeometry(w, h);
  for (const sideSign of [1, -1]) {              // 1=右舷(u<0.5),-1=左舷
    for (let i = 0; i < perSide; i++) {
      const off = (i - (perSide - 1) / 2) * du;
      const u = sideSign === 1 ? uCenter + off : 1 - uCenter - off;
      const pane = new THREE.Mesh(geo, mats.glass);
      placeOnSurface(pane, sampler, u, sCenter, 0.04, rake);
      pane.userData.partId = 'windshield';
      group.add(pane);
    }
  }
  return group;
}

/* ---------- 747 上凸前机身(双层) ---------- */

function buildHump(p, mats) {
  const h = p.hump;
  const rAt = (s) => radiusAt(s, p);
  const topAt = (s) => centerAt(s, p) + rAt(s) * p.heightScale;
  const env = (s) => {
    if (s <= h.start || s >= h.end) return 0;
    const t = (s - h.start) / (h.end - h.start);
    return Math.pow(Math.sin(Math.PI * Math.min(Math.max((t - 0.18) / 0.82, 0), 1)), 0.85);
  };
  // 沿纵向放样半椭圆环带,底边沉入机身
  const stations = [];
  for (let i = 0; i <= 14; i++) stations.push(h.start + (h.end - h.start) * (i / 14));
  const pts = 14;
  const posArr = [], idx = [];
  for (let k = 0; k < stations.length; k++) {
    const s = stations[k];
    const e = env(s);
    const wHalf = h.width * rAt(s) * (0.35 + 0.65 * e);
    const hgt = h.height * e;
    const z = p.len / 2 - s * p.len;
    const yBase = topAt(s) - 0.25;
    for (let i = 0; i <= pts; i++) {
      const a = Math.PI * (i / pts);             // 0=左端,π=右端
      posArr.push(
        -wHalf * Math.cos(a),
        yBase + hgt * Math.sin(a),
        z,
      );
    }
  }
  for (let k = 0; k < stations.length - 1; k++) {
    for (let i = 0; i < pts; i++) {
      const a = k * (pts + 1) + i, b = a + 1;
      const c = (k + 1) * (pts + 1) + i + 1, d = (k + 1) * (pts + 1) + i;
      idx.push(a, d, c, a, c, b);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mats.fuselage.clone());
  mesh.material.map = null;                      // 上凸部分纯白,不采机身贴图
  mesh.material.color = new THREE.Color(0xf4f6f8);
  mesh.material.needsUpdate = true;
  mesh.userData.partId = 'fuselage';
  return mesh;
}

/* ---------- 总入口 ---------- */

/**
 * 构建机身总成。
 * @param {object} F 家族调参后的机身参数(见模块头)
 * @param {object} mats createAircraftMaterials() 的材质包
 * @returns { {group, sampler, humpMesh} }
 */
export function buildFuselage(F, mats) {
  const p = { ...F, maxR: F.maxR };
  const group = new THREE.Group();
  const sampler = makeSurfaceSampler(p);

  // 主机身(雷达罩分界线之后) + 雷达罩 + 分界环
  const main = new THREE.Mesh(loftGeometry(p, p.radomeFrac, 1, 44), mats.fuselage);
  main.userData.partId = 'fuselage';
  main.castShadow = true;
  group.add(main);

  const radome = new THREE.Mesh(loftGeometry(p, 0.001, p.radomeFrac, 36), mats.radome);
  radome.userData.partId = 'nose_radome';
  radome.castShadow = true;
  group.add(radome);

  const seamR = radiusAt(p.radomeFrac, p);
  const seam = new THREE.Mesh(
    new THREE.TorusGeometry(seamR * Math.min(p.widthScale, p.heightScale), 0.035, 6, 40),
    mats.detail,
  );
  seam.scale.set(p.widthScale, p.heightScale, 1);
  seam.position.set(0, centerAt(p.radomeFrac, p), p.len / 2 - p.radomeFrac * p.len);
  seam.userData.partId = 'nose_radome';
  group.add(seam);

  // 尾端盖 + APU 排气口
  const cap = tailCap(p);
  cap.material = mats.detail;
  cap.userData.partId = 'apu';
  group.add(cap);
  const endR = radiusAt(1, p);
  const apu = new THREE.Mesh(
    new THREE.CylinderGeometry(endR * 0.45, endR * 0.55, 0.5, 16, 1, true),
    mats.engineDark,
  );
  apu.rotation.x = Math.PI / 2;
  apu.position.set(0, centerAt(1, p), -p.len / 2 + 0.1);
  apu.userData.partId = 'apu';
  group.add(apu);

  // 舱门 / 舷窗 / 风挡
  group.add(buildDoors(p, sampler, mats));
  group.add(buildCabinWindows(p, sampler, mats));
  group.add(buildWindshield(p, sampler, mats));

  // 747 上凸前机身
  let humpMesh = null;
  if (p.hump) {
    humpMesh = buildHump(p, mats);
    group.add(humpMesh);
  }

  return { group, sampler, humpMesh };
}
