/**
 * engine/fuselage.js — 机身放样(自建 BufferGeometry)
 *
 * 坐标系:机头 +Z,机尾 -Z,左舷 +X(u=0.75),右舷 -X(u=0.25),y=0 为机身轴线。
 * UV 契约见 materials.js 头注:u 圆周(0=顶),s 纵向(0=机头),贴图 flipY=false。
 *
 * 逼真性要点(参照真实三视图):
 * - 截面为超椭圆(n≈2.2):冠部/侧腹饱满、下腹平缓,机鼻段渐变为圆;
 * - 机鼻 sin^0.6 钝头 + 下压,尾锥上收,尾端收细;
 * - 舱门分主门与翼上出口两级尺寸;A350 类"墨镜"风挡带深色环绕面罩。
 */
import * as THREE from 'three';

const TWO_PI = Math.PI * 2;

/* ---------- 半径 / 中心线曲线 ---------- */

/** 站位半径:机鼻段 sin^0.6 快起(钝头),中段等直,尾段 smoothstep 收细 */
export function radiusAt(s, p) {
  const { noseLen, tailLen, maxR, tailEndR } = p;
  if (s < noseLen) {
    const t = s / noseLen;
    return maxR * Math.pow(Math.sin(t * Math.PI / 2), 0.6);
  }
  const tailStart = 1 - tailLen;
  if (s > tailStart) {
    const t = (s - tailStart) / tailLen;
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
 * 超椭圆截面系数:|cosθ|^(2/n) / |sinθ|^(2/n),n=2 为圆,n→4 趋矩形。
 * 机鼻段从圆(nose)渐变到机身形状。
 */
function sectionExp(s, p) {
  const n0 = 2.0;
  const n1 = p.shapeN || 2.2;
  if (s <= 0.02) return n0;
  const t = THREE.MathUtils.clamp(s / (p.noseLen || 0.09), 0, 1);
  return n0 + (n1 - n0) * Math.pow(t, 0.8);
}

/** 截面点(圆周角 u → 世界坐标),inflate 沿截面外扩(米) */
function sectionPoint(p, u, s, inflate = 0) {
  const r = radiusAt(s, p);
  const rx = r * p.widthScale + inflate;
  const ry = r * p.heightScale + inflate;
  const n = sectionExp(s, p);
  const e = 2 / n;
  const a = u * TWO_PI;
  const sinA = Math.sin(a), cosA = Math.cos(a);
  return new THREE.Vector3(
    -rx * Math.sign(sinA) * Math.pow(Math.abs(sinA), e),
    centerAt(s, p) + ry * Math.sign(cosA) * Math.pow(Math.abs(cosA), e),
    p.len / 2 - s * p.len,
  );
}

/** 曲面采样器:位置/外法线(数值微分,供细节件贴面) */
export function makeSurfaceSampler(p) {
  const pos = (u, s, inflate = 0) => sectionPoint(p, u, s, inflate);
  const normal = (u, s) => {
    const e = 0.0025;
    const dS = pos(u, Math.min(s + e, 1)).sub(pos(u, Math.max(s - e, 0)));
    const dU = pos(u === 0 ? 0.5 : (u >= 0.5 ? u - e : u + e), s).sub(pos(u, s));
    return dS.cross(dU).normalize(); // 顶部验证为 +Y,朝外
  };
  return { pos, normal, radiusAt: (s) => radiusAt(s, p), centerAt: (s) => centerAt(s, p) };
}

/* ---------- 放样几何 ---------- */

function loftGeometry(p, s0, s1, segments = 44) {
  const stations = [];
  const steps = p.stationSteps || 18;
  for (let i = 0; i <= steps; i++) {
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
    const z = p.len / 2 - s * p.len;
    for (let i = 0; i < N; i++) {
      const u = i / N;
      const P = sectionPoint(p, u, s);
      posArr.push(P.x, P.y, z);
      uvArr.push(u, s);
    }
  }
  for (let k = 0; k < stations.length - 1; k++) {
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N;
      const a = k * N + i, b = k * N + j;
      const c = (k + 1) * N + j, d = (k + 1) * N + i;
      idx.push(a, d, c, a, c, b);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvArr, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/* ---------- 贴面小件工具 ---------- */

/**
 * 在机身表面放置一块朝外的面片。
 * Matrix4.lookAt 的 z 轴 = eye - target,目标取 -n 才能让面片 +Z(正面)朝外。
 */
function placeOnSurface(mesh, sampler, u, s, inflate, rakeDeg = 0) {
  const P = sampler.pos(u, s, inflate);
  const n = sampler.normal(u, s);
  if (rakeDeg) {
    const rake = THREE.MathUtils.degToRad(rakeDeg);
    n.add(new THREE.Vector3(0, Math.sin(rake) * 0.85, Math.cos(rake) * 0.55)).normalize();
  }
  const m = new THREE.Matrix4().lookAt(new THREE.Vector3(), n.clone().negate(), new THREE.Vector3(0, 1, 0));
  mesh.position.copy(P).addScaledVector(n, 0.025);
  mesh.quaternion.setFromRotationMatrix(m);
}

/* ---------- 舱门 / 翼上出口 ---------- */

/** 门框轮廓贴图(圆角矩形描边+把手线),round 随门高比缩放 */
function doorOutlineTexture(w, h, hatch) {
  const cv = document.createElement('canvas');
  cv.width = 128; cv.height = 256;
  const ctx = cv.getContext('2d');
  ctx.strokeStyle = hatch ? 'rgba(26,33,40,0.75)' : 'rgba(26,33,40,0.9)';
  ctx.lineWidth = hatch ? 6 : 7;
  ctx.beginPath();
  ctx.roundRect(9, 9, 110, 238, hatch ? 26 : 18);
  ctx.stroke();
  if (!hatch) {
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(88, 130); ctx.lineTo(106, 130); ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** 主门 + 翼上出口(左右对称);partId 统一 door_l1 */
function buildDoors(p, sampler) {
  const group = new THREE.Group();
  const du = p.doors.h / (TWO_PI * p.maxR);
  const addRow = (list, w, h, hatch) => {
    const geo = new THREE.PlaneGeometry(w, h);
    const mat = new THREE.MeshBasicMaterial({
      map: doorOutlineTexture(w, h, hatch), transparent: true, alphaTest: 0.25, depthWrite: false,
    });
    mat.polygonOffset = true; mat.polygonOffsetFactor = -2;
    for (const s of list) {
      for (const uSide of [0.25 + du / 2, 0.75 - du / 2]) {
        const door = new THREE.Mesh(geo, mat);
        placeOnSurface(door, sampler, uSide, s, 0, 0);
        door.userData.partId = 'door_l1';
        door.renderOrder = 2;
        group.add(door);
      }
    }
  };
  addRow(p.doors.positions, p.doors.w, p.doors.h, false);
  if (p.doors.exits) addRow(p.doors.exits, p.doors.w * 0.62, p.doors.h * 0.62, true);
  return group;
}

/* ---------- 客舱舷窗列(InstancedMesh) ---------- */

function buildCabinWindows(p, sampler, mats) {
  const { start, end, pitch, uCenter } = p.windows;
  const sList = [];
  for (let s = start; s <= end; s += pitch / p.len) {
    const nearDoor = [...p.doors.positions, ...(p.doors.exits || [])]
      .some((ds) => Math.abs(ds - s) < (p.doors.w + 0.7) / p.len);
    if (!nearDoor) sList.push(s);
  }
  const geo = new THREE.PlaneGeometry(0.28, 0.4);
  const inst = new THREE.InstancedMesh(geo, mats.cabinWindow, sList.length * 2);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const scl = new THREE.Vector3(1, 1, 1);
  let n = 0;
  for (const side of [uCenter, 1 - uCenter]) {
    for (const s of sList) {
      const P = sampler.pos(side, s, 0);
      const nrm = sampler.normal(side, s);
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
  const { perSide, sCenter, uCenter, du, w, h, rake, surround, inflate } = p.windshield;
  const lift = inflate ?? 0.05;

  // 墨镜式深色环绕面罩(先铺底,窗片再叠上面)
  if (surround) {
    for (const sideSign of [1, -1]) {
      const spanU = du * (perSide + 1.4);
      const mask = new THREE.Mesh(
        new THREE.PlaneGeometry(spanU * TWO_PI * p.maxR * 0.82, h * 1.75), mats.glass,
      );
      const u = sideSign === 1 ? uCenter : 1 - uCenter;
      placeOnSurface(mask, sampler, u, sCenter - 0.004, lift - 0.018, rake * 0.7);
      mask.userData.partId = 'windshield';
      group.add(mask);
    }
  }
  const geo = new THREE.PlaneGeometry(w, h);
  for (const sideSign of [1, -1]) {
    for (let i = 0; i < perSide; i++) {
      const off = (i - (perSide - 1) / 2) * du;
      const u = sideSign === 1 ? uCenter + off : 1 - uCenter - off;
      const pane = new THREE.Mesh(geo, mats.glass);
      placeOnSurface(pane, sampler, u, sCenter, lift, rake);
      pane.userData.partId = 'windshield';
      group.add(pane);
    }
  }
  return group;
}

/* ---------- 747 上凸前机身(双层) ---------- */

function buildHump(p, mats) {
  const h = p.hump;
  const env = (s) => {
    if (s <= h.start || s >= h.end) return 0;
    const t = (s - h.start) / (h.end - h.start);
    return Math.pow(Math.sin(Math.PI * THREE.MathUtils.clamp((t - 0.16) / 0.84, 0, 1)), 0.85);
  };
  const stations = [];
  for (let i = 0; i <= 16; i++) stations.push(h.start + (h.end - h.start) * (i / 16));
  const pts = 16;
  const posArr = [], idx = [];
  for (let k = 0; k < stations.length; k++) {
    const s = stations[k];
    const e = env(s);
    const r = radiusAt(s, p);
    const wHalf = h.width * r * (0.3 + 0.7 * e);
    const hgt = h.height * e;
    const z = p.len / 2 - s * p.len;
    const yBase = centerAt(s, p) + r * p.heightScale - 0.3;
    for (let i = 0; i <= pts; i++) {
      const a = Math.PI * (i / pts);
      posArr.push(-wHalf * Math.cos(a), yBase + hgt * Math.sin(a), z);
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
  mesh.material.map = null;
  mesh.material.color = new THREE.Color(0xf4f6f8);
  mesh.material.needsUpdate = true;
  mesh.userData.partId = 'fuselage';
  return mesh;
}

/* ---------- 总入口 ---------- */

/**
 * 构建机身总成。
 * @param {object} F 家族调参后的机身参数
 * @returns { {group, sampler, humpMesh} }
 */
export function buildFuselage(F, mats) {
  const p = { ...F };
  const group = new THREE.Group();
  const sampler = makeSurfaceSampler(p);

  // 主机身(雷达罩分界线之后)+ 雷达罩 + 分界环
  const main = new THREE.Mesh(loftGeometry(p, p.radomeFrac, 1, 48), mats.fuselage);
  main.userData.partId = 'fuselage';
  main.castShadow = true;
  group.add(main);

  const radome = new THREE.Mesh(loftGeometry(p, 0.001, p.radomeFrac, 36), mats.radome);
  radome.userData.partId = 'nose_radome';
  radome.castShadow = true;
  group.add(radome);

  const seamR = radiusAt(p.radomeFrac, p);
  const seam = new THREE.Mesh(
    new THREE.TorusGeometry(seamR * p.widthScale, 0.04, 6, 44), mats.detail,
  );
  seam.scale.set(1, p.heightScale / p.widthScale, 1);
  seam.position.set(0, centerAt(p.radomeFrac, p), p.len / 2 - p.radomeFrac * p.len);
  seam.userData.partId = 'nose_radome';
  group.add(seam);

  // 尾端盖 + APU 排气口
  const endR = radiusAt(1, p);
  const cap = new THREE.Mesh(
    new THREE.CircleGeometry(endR * 0.9, 20), mats.detail,
  );
  cap.position.set(0, centerAt(1, p), -p.len / 2 + 0.01);
  cap.rotation.y = Math.PI;
  cap.userData.partId = 'apu';
  group.add(cap);
  const apu = new THREE.Mesh(
    new THREE.CylinderGeometry(endR * 0.42, endR * 0.55, 0.55, 16, 1, true),
    mats.engineDark,
  );
  apu.rotation.x = Math.PI / 2;
  apu.position.set(0, centerAt(1, p), -p.len / 2 + 0.12);
  apu.userData.partId = 'apu';
  group.add(apu);

  // 舱门 / 舷窗 / 风挡
  group.add(buildDoors(p, sampler));
  group.add(buildCabinWindows(p, sampler, mats));
  group.add(buildWindshield(p, sampler, mats));

  let humpMesh = null;
  if (p.hump) {
    humpMesh = buildHump(p, mats);
    group.add(humpMesh);
  }

  return { group, sampler, humpMesh };
}
