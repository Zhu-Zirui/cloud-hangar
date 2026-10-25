/**
 * engine/details.js — 细节件与场景参照物
 * 细节件:机背天线 / 皮托管 / 静压孔 / 迎角传感器 / 翼上出口标线 / 航行·防撞·频闪灯组。
 * 参照物:1.8m 人形剪影立牌 / 客梯车 / 地面米数标尺(真实米数,比例自检用)。
 */
import * as THREE from 'three';
import { wingTopPoint } from './wing.js';

const Y_UP = new THREE.Vector3(0, 1, 0);

/* ---------- 机背/机腹天线 ---------- */

/** 叶片天线:立起的梯形薄片,沿机身 3-4 处 */
export function buildAntennas(F, sampler, mats) {
  const g = new THREE.Group();
  const spots = [
    { s: 0.3, u: 0 }, { s: 0.55, u: 0 }, { s: 0.78, u: 0 }, { s: 0.5, u: 0.5 },
  ];
  for (const sp of spots) {
    const P = sampler.pos(sp.u, sp.s);
    const n = sampler.normal(sp.u, sp.s);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.34, 0.42), mats.detail);
    blade.position.copy(P).addScaledVector(n, 0.17);
    blade.quaternion.setFromUnitVectors(Y_UP, n);
    g.add(blade);
  }
  return g;
}

/* ---------- 机头传感器(皮托管/静压孔/迎角) ---------- */

export function buildNoseSensors(F, sampler, mats) {
  const g = new THREE.Group();
  const sides = [0.2, 0.8];
  // 皮托管 ×2/侧:前伸小管
  for (const u of sides) {
    for (const ds of [0, 0.012]) {
      const P = sampler.pos(u, 0.045 + ds);
      const n = sampler.normal(u, 0.045 + ds);
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.4, 8), mats.metal);
      tube.rotation.x = Math.PI / 2;
      tube.position.copy(P).addScaledVector(n, 0.06).z += 0.16;
      tube.userData.partId = 'pitot';
      g.add(tube);
    }
    // 静压孔:小圆片
    const Pp = sampler.pos(u, 0.065);
    const nn = sampler.normal(u, 0.065);
    const port = new THREE.Mesh(new THREE.CircleGeometry(0.045, 10), mats.detail);
    port.position.copy(Pp).addScaledVector(nn, 0.012);
    port.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), nn);
    port.userData.partId = 'static_port';
    g.add(port);
    // 迎角传感器:小叶片
    const Pa = sampler.pos(u, 0.058);
    const na = sampler.normal(u, 0.058);
    const vane = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.02), mats.metal);
    vane.position.copy(Pa).addScaledVector(na, 0.1);
    vane.quaternion.setFromUnitVectors(Y_UP, na);
    vane.rotation.z += 0.5;
    vane.userData.partId = 'aoa_sensor';
    g.add(vane);
  }
  return g;
}

/* ---------- 翼上应急出口标线(窄体) ---------- */

export function buildWingExitMarks(W, mats) {
  const g = new THREE.Group();
  // 翼上应急出口标线:细长条 + 前端小三角,示意撤离路线
  for (const t of [0.42, 0.62]) {
    for (const side of [1, -1]) {
      const p = wingTopPoint(W, t);
      const mark = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.012, 0.14), mats.detail,
      );
      mark.position.set(p.x * side, p.y + 0.02, p.z);
      mark.scale.x = side;
      g.add(mark);
      const tri = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.012, 0.14), mats.detail,
      );
      tri.position.set((p.x - 0.43) * side, p.y + 0.02, p.z);
      tri.scale.x = side;
      g.add(tri);
    }
  }
  return g;
}

/* ---------- 灯光系统 ---------- */

/**
 * 航行灯(左红右绿,常亮) + 翼尖白色频闪 + 尾白灯 + 上下红色防撞 + 翼根着陆灯。
 * @returns { {group, strobes:[], beacons:[], landing:[]} } 材质引用驱动闪烁
 */
export function buildLights(F, W, mats) {
  const group = new THREE.Group();
  const strobes = [];
  const beacons = [];
  // 频闪独立材质(双闪节奏,与常亮尾白灯分开)
  const strobeMat = new THREE.MeshStandardMaterial({
    color: 0x707880, emissive: 0xcfe8ff, emissiveIntensity: 0.2,
  });

  // 翼尖:左红右绿 + 白色频闪条
  const tipF = 0.985;
  const tipX = tipF * W.halfSpan;
  const tipY = W.rootY + Math.tan(THREE.MathUtils.degToRad(W.dihedral)) * tipX;
  const tipZ = W.rootLE + (W.sections[W.sections.length - 1].le) + 0.15;
  for (const side of [1, -1]) {                  // +1 左舷(红)
    const nav = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 10, 8), side > 0 ? mats.lightRed : mats.lightGreen,
    );
    nav.position.set(side * tipX, tipY, tipZ);
    group.add(nav);
    const strobe = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.06, 0.34), strobeMat,
    );
    strobe.position.set(side * tipX, tipY, tipZ - 0.32);
    strobe.userData.partId = 'strobe_light';
    group.add(strobe);
    strobes.push(strobe);
  }

  // 尾白灯(常亮):尾锥末端
  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), mats.lightWhite);
  tail.position.set(0, F.tailUpsweep, -F.len / 2 - 0.06);
  group.add(tail);

  // 上下红色防撞灯(1Hz 闪烁)
  for (const pos of [
    samplerLikeTop(F, 0.4),
    samplerLikeBottom(F, 0.48),
  ]) {
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), mats.lightBeacon);
    beacon.position.copy(pos);
    beacon.userData.partId = 'beacon_light';
    group.add(beacon);
    beacons.push(beacon);
  }

  // 翼根着陆灯(每侧 1)
  const landing = [];
  for (const side of [1, -1]) {
    const p = wingTopPoint(W, 0.12);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.09, 0.07), mats.lightLanding);
    lamp.position.set(side * p.x, W.rootY + 0.1, p.z + 1.0);
    lamp.userData.partId = 'landing_light';
    group.add(lamp);
    landing.push(lamp);
  }
  return { group, strobes, beacons, landing, strobeMat };
}

/* 防撞灯简化定位(避免 details 依赖 sampler 实例的循环引用) */
function samplerLikeTop(F, s) {
  return new THREE.Vector3(0, F.maxR * F.heightScale + 0.1, F.len / 2 - s * F.len);
}
function samplerLikeBottom(F, s) {
  return new THREE.Vector3(0, -F.maxR * F.heightScale - 0.1, F.len / 2 - s * F.len);
}

/* ---------- 场景参照物 ---------- */

/** 1.8m 人形剪影立牌(Canvas 剪影,双面) */
export function buildHumanStandee() {
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = 512;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#16222f';
  ctx.beginPath();
  ctx.arc(128, 58, 32, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(72, 116);
  ctx.quadraticCurveTo(74, 96, 102, 92);
  ctx.quadraticCurveTo(128, 84, 154, 92);
  ctx.quadraticCurveTo(182, 96, 184, 116);
  ctx.lineTo(170, 300);
  ctx.lineTo(164, 460); ctx.lineTo(138, 460); ctx.lineTo(132, 320);
  ctx.lineTo(124, 320); ctx.lineTo(118, 460); ctx.lineTo(92, 460); ctx.lineTo(86, 300);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#7fd4ff';
  ctx.font = '600 44px Consolas, "SF Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('1.8 m', 128, 504);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const standee = new THREE.Mesh(
    new THREE.PlaneGeometry(1.05, 2.1),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide }),
  );
  standee.position.y = 1.05;
  return standee;
}

/** 客梯车(简单几何,停于机头旁对比比例) */
export function buildStairTruck() {
  const g = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: 0xc7cdd4, roughness: 0.5, metalness: 0.3 });
  const amber = new THREE.MeshStandardMaterial({ color: 0xd7a022, roughness: 0.5, metalness: 0.3 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x22262b, roughness: 0.8 });

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.55, 5.2), body);
  chassis.position.y = 0.85;
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.15, 1.3), body);
  cab.position.set(0, 1.65, 1.85);
  g.add(chassis, cab);

  // 前伸支腿
  for (const sx of [-0.8, 0.8]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.7, 0.16), dark);
    leg.position.set(sx, 0.35, 1.1);
    g.add(leg);
  }

  // 登机坡道:斜置平台 + 台阶条纹
  const slope = new THREE.Group();
  slope.position.set(0, 1.35, -0.9);
  slope.rotation.x = -0.62;                       // 后端落地
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 4.6), body);
  slope.add(ramp);
  for (let i = 0; i < 9; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.03, 0.09), amber);
    step.position.set(0, 0.06, -1.9 + i * 0.47);
    slope.add(step);
  }
  // 扶手
  for (const sx of [-0.62, 0.62]) {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 4.6, 8), body);
    rail.rotation.x = Math.PI / 2;
    rail.position.set(sx, 0.55, 0);
    slope.add(rail);
  }
  g.add(slope);

  // 车轮 ×4
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 14);
  wheelGeo.rotateZ(Math.PI / 2);
  for (const [wx, wz] of [[-0.95, 1.6], [0.95, 1.6], [-0.95, -1.2], [0.95, -1.2]]) {
    const wheel = new THREE.Mesh(wheelGeo, dark);
    wheel.position.set(wx, 0.42, wz);
    g.add(wheel);
  }

  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

/** 地面米数标尺(Canvas 刻度长条,平行机身摆放,真实米数) */
export function buildGroundRuler(lenM, spanM) {
  const cv = document.createElement('canvas');
  cv.width = 2048; cv.height = 96;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = 'rgba(10,20,34,0.0)';
  ctx.clearRect(0, 0, 2048, 96);
  const M = 2048 / (lenM + 6);
  const C = 2048 / 2;
  const px = (m) => C + m * M + (lenM / 2) * M;   // 机身坐标系 z(+前) → 画布 x
  // 主线
  ctx.strokeStyle = 'rgba(120,200,255,0.95)';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(px(-lenM / 2 - 2), 48); ctx.lineTo(px(lenM / 2 + 2), 48); ctx.stroke();
  // 刻度:每 5m 短线,每 10m 长线 + 数字
  ctx.font = 'bold 26px Consolas, monospace';
  ctx.fillStyle = 'rgba(160,220,255,0.95)';
  ctx.textAlign = 'center';
  for (let m = -Math.ceil(lenM / 10) * 10; m <= Math.ceil(lenM / 10) * 10; m += 5) {
    const x = px(-m);                              // 画布 x 反向:机头(+z)朝左还是右都成立,数字为准
    const long = m % 10 === 0;
    ctx.beginPath();
    ctx.moveTo(x, 48); ctx.lineTo(x, long ? 14 : 30);
    ctx.stroke();
    if (long) ctx.fillText(String(Math.abs(m)), x, 88);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(lenM + 6, (lenM + 6) * 96 / 2048),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
  );
  plane.rotation.x = -Math.PI / 2;
  plane.rotation.z = Math.PI / 2;                  // 长边沿机身 Z 轴
  plane.position.set(spanM / 2 + 3.5, 0.03, 0);
  plane.renderOrder = 1;
  return plane;
}
