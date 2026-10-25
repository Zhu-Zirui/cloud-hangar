/**
 * engine/gear.js — 起落架(前起双轮 + 主起小车式,宽体多轮)
 * 每组起落架 = 顶部枢轴组(收放旋转)+ 支柱 + 小车梁 + 轮组 + 舱门板。
 * 收放:主起绕 Z 轴向机身内侧收(±~92°),前起绕 X 轴向前收;
 * 收起时舱门板转平盖住轮舱。停放姿态轮子接地、机身水平(由 centerH 保证)。
 * 机体坐标:机身轴线 y=0,地面 y=-centerH。
 */
import * as THREE from 'three';

/** 单个机轮:轮胎 + 双侧轮毂(刹车盘),轮轴沿 X */
function makeWheel(r, width, mats) {
  const g = new THREE.Group();
  const tireGeo = new THREE.CylinderGeometry(r, r, width, 18);
  tireGeo.rotateZ(Math.PI / 2);
  const tire = new THREE.Mesh(tireGeo, mats.tire);
  const hubGeo = new THREE.CylinderGeometry(r * 0.45, r * 0.45, width * 1.12, 14);
  hubGeo.rotateZ(Math.PI / 2);
  const hub = new THREE.Mesh(hubGeo, mats.hub);
  hub.userData.partId = 'wheel_brake';
  g.add(tire, hub);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

/**
 * 前起落架(双轮)。
 * @param {object} N { z, pivotY, wheelR, centerH }
 * @returns { {pivot, door} } pivot 顶部枢轴组(收放动画载体)
 */
export function buildNoseGear(N, mats) {
  const groundY = -N.centerH;
  const axleY = groundY + N.wheelR;
  const pivot = new THREE.Group();
  pivot.position.set(0, N.pivotY, N.z);
  pivot.userData.kind = 'nose';

  // 支柱(上段粗,下段略细)
  const strutLen = N.pivotY - axleY;
  const strut = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.085, strutLen, 12), mats.metal,
  );
  strut.position.y = -strutLen / 2;
  strut.userData.partId = 'nose_gear';
  strut.castShadow = true;
  pivot.add(strut);

  // 双轮
  for (const sx of [-1, 1]) {
    const wheel = makeWheel(N.wheelR, 0.2, mats);
    wheel.position.set(sx * 0.26, -strutLen, 0);
    pivot.add(wheel);
  }

  // 前着陆灯(支柱前缘)
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.06), mats.lightLanding);
  lamp.position.set(0, -strutLen * 0.55, 0.12);
  lamp.userData.partId = 'landing_light';
  pivot.add(lamp);

  // 舱门板(铰链在顶,收起时转平盖住轮舱)
  const door = new THREE.Group();
  door.position.set(0, 0.02, -0.15);
  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 0.04, 1.15), mats.fairing,
  );
  plate.position.set(0, 0, -0.6);
  plate.userData.partId = 'nose_gear';
  door.add(plate);
  pivot.add(door);

  return { pivot, door };
}

/**
 * 主起落架(小车式:axles 根轴 × 每轴 2 轮)。
 * @param {object} M { x, z, pivotY, wheelR, axles, centerH, side(+1 左舷/-1 右舷), body?(机身起落架) }
 */
export function buildMainGear(M, mats) {
  const groundY = -M.centerH;
  const axleY = groundY + M.wheelR;
  const pivot = new THREE.Group();
  pivot.position.set(M.x, M.pivotY, M.z);
  pivot.userData.kind = 'main';
  pivot.userData.side = M.side;

  const strutLen = M.pivotY - axleY - M.wheelR * 0.2;
  const strut = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.12, strutLen, 12), mats.metal,
  );
  strut.position.y = -strutLen / 2;
  strut.userData.partId = 'main_gear';
  strut.castShadow = true;
  pivot.add(strut);

  // 小车梁 + 轮组
  const axles = M.axles || 1;
  const spacing = M.wheelR * 2.35;
  const beamLen = spacing * (axles - 1) + M.wheelR * 1.4;
  if (axles > 1) {
    const beam = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.2, beamLen), mats.metal,
    );
    beam.position.y = -strutLen;
    beam.userData.partId = 'main_gear';
    beam.castShadow = true;
    pivot.add(beam);
  }
  for (let a = 0; a < axles; a++) {
    const az = -strutLen + (a - (axles - 1) / 2) * spacing;
    for (const sx of [-1, 1]) {
      const wheel = makeWheel(M.wheelR, M.wheelR * 0.62, mats);
      wheel.position.set(sx * (M.wheelR + 0.14), -strutLen, az);
      pivot.add(wheel);
    }
  }

  // 侧撑杆(斜向机翼/机身,装饰)
  const stay = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, strutLen * 1.15, 8), mats.metal,
  );
  stay.position.set(-M.side * 0.45, -strutLen * 0.45, 0.1);
  stay.rotation.z = -M.side * 0.42;
  stay.userData.partId = 'main_gear';
  pivot.add(stay);

  // 舱门板
  const door = new THREE.Group();
  door.position.set(0, 0.05, -0.3);
  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(1.05, 0.05, 1.5), mats.fairing,
  );
  plate.position.set(0, 0, -0.78);
  plate.userData.partId = 'main_gear';
  door.add(plate);
  pivot.add(door);

  return { pivot, door };
}
