/**
 * engine/enginePod.js — 发动机短舱 + 风扇 + 吊挂
 * 短舱 = 旋成体放样(LatheGeometry):进气唇口钛灰环 → 最大腹鼓 → 收敛尾段;
 * 内涵 = 导气管 + 风扇盘(整流锥 + InstancedMesh 18-22 片宽弦叶片,绕轴旋转动画);
 * 尾部 = 反推段环缝纹(细环槽)+ 尾喷锥;吊挂 pylon = 连接机翼的四棱台。
 */
import * as THREE from 'three';

/** 短舱旋成体母线(半径, 轴向):唇口→腹鼓→收敛 */
function nacelleProfile(R, L) {
  const pts = [
    new THREE.Vector2(R * 0.955, L / 2),          // 唇口(前端)
    new THREE.Vector2(R * 1.0, L / 2 - L * 0.06),
    new THREE.Vector2(R * 1.02, L / 2 - L * 0.3), // 最大直径
    new THREE.Vector2(R * 0.9, L / 2 - L * 0.62),
    new THREE.Vector2(R * 0.72, L / 2 - L * 0.85),
    new THREE.Vector2(R * 0.55, -L / 2 + L * 0.08),
  ];
  return pts;
}

/**
 * 构建一台发动机短舱总成(含风扇/尾喷/吊挂)。
 * @param {object} E {
 *   fanD, nacelleLen, pos:{x,y,z}(短舱中心,机体坐标),
 *   pylon:{ topY, topZ1, topZ2 }(吊挂上缘:机翼下表面矩形 z 区间)
 * }
 * @returns { {group, fan} } fan 为旋转动画用的风扇组
 */
export function buildEnginePod(E, mats) {
  const R = E.fanD / 2 * 1.08;      // 短舱最大半径略大于风扇
  const L = E.nacelleLen;
  const group = new THREE.Group();
  group.position.set(E.pos.x, E.pos.y, E.pos.z);

  /* 短舱外壳(旋成体,轴先沿 Y 再转到 Z) */
  const nacGeo = new THREE.LatheGeometry(nacelleProfile(R, L), 30);
  nacGeo.rotateX(Math.PI / 2);
  const nac = new THREE.Mesh(nacGeo, mats.nacelle);
  nac.userData.partId = 'engine_nacelle';
  nac.castShadow = true;
  group.add(nac);

  /* 进气唇口钛灰环 */
  const lip = new THREE.Mesh(
    new THREE.TorusGeometry(R * 0.94, R * 0.07, 8, 30), mats.lip,
  );
  lip.position.z = L / 2 - 0.02;
  lip.userData.partId = 'engine_nacelle';
  group.add(lip);

  /* 进气道内衬(深色筒) */
  const duct = new THREE.Mesh(
    new THREE.CylinderGeometry(R * 0.86, R * 0.8, L * 0.52, 24, 1, true),
    mats.engineDark,
  );
  duct.material = mats.engineDark;
  duct.rotation.x = Math.PI / 2;
  duct.position.z = L / 2 - L * 0.27;
  group.add(duct);

  /* 风扇:整流锥 + InstancedMesh 叶片 */
  const fan = new THREE.Group();
  fan.position.z = L / 2 - L * 0.16;
  const spinner = new THREE.Mesh(
    new THREE.ConeGeometry(R * 0.22, R * 0.42, 16), mats.hub,
  );
  spinner.rotation.x = Math.PI / 2; // 锥尖朝 +Z(前)
  spinner.position.z = R * 0.18;
  fan.add(spinner);

  const bladeCount = 20;
  const bladeGeo = new THREE.BoxGeometry(R * 0.24, R * 0.82, R * 0.035);
  bladeGeo.translate(0, R * 0.45, 0);            // 叶根从轮毂半径起
  const blades = new THREE.InstancedMesh(bladeGeo, mats.fanBlade, bladeCount);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const qz = new THREE.Quaternion();
  const qy = new THREE.Quaternion();
  const pitch = 0.62;                            // 桨距角(rad)
  for (let i = 0; i < bladeCount; i++) {
    qz.setFromAxisAngle(new THREE.Vector3(0, 0, 1), (i / bladeCount) * Math.PI * 2);
    qy.setFromAxisAngle(new THREE.Vector3(0, 1, 0), pitch);
    q.copy(qz).multiply(qy);
    m4.compose(new THREE.Vector3(0, 0, 0), q, new THREE.Vector3(1, 1, 1));
    blades.setMatrixAt(i, m4);
  }
  blades.instanceMatrix.needsUpdate = true;
  blades.userData.partId = 'fan_blade';
  fan.add(blades);
  group.add(fan);

  /* 反推段:灰色环带 + 细环缝纹 */
  const revLen = L * 0.24;
  const rev = new THREE.Mesh(
    new THREE.CylinderGeometry(R * 0.87, R * 0.7, revLen, 24, 1, true),
    mats.hub,
  );
  rev.rotation.x = Math.PI / 2;
  rev.position.z = -L / 2 + L * 0.16;
  rev.userData.partId = 'thrust_reverser';
  group.add(rev);
  for (let i = 0; i < 3; i++) {                  // 环缝示意
    const groove = new THREE.Mesh(
      new THREE.TorusGeometry(R * (0.86 - i * 0.05), R * 0.012, 6, 24), mats.detail,
    );
    groove.position.z = -L / 2 + L * 0.08 + i * revLen * 0.3;
    groove.userData.partId = 'thrust_reverser';
    group.add(groove);
  }

  /* 尾喷锥 */
  const plug = new THREE.Mesh(
    new THREE.ConeGeometry(R * 0.3, L * 0.2, 16), mats.engineDark,
  );
  plug.rotation.x = -Math.PI / 2;
  plug.position.z = -L / 2 - L * 0.06;
  plug.userData.partId = 'thrust_reverser';
  group.add(plug);

  /* 吊挂:短舱顶 → 机翼下表面的四棱台 */
  if (E.pylon) {
    const p = E.pylon;
    const y0 = E.pos.y + R * 0.86;               // 短舱顶部
    const zb0 = E.pos.z + L * 0.18;              // 下缘 z 区间(挂短舱前部)
    const zb1 = E.pos.z - L * 0.28;
    const w = Math.max(0.32, R * 0.42);
    const v = [];
    // 底面矩形(短舱顶) / 顶面矩形(机翼下表面)
    v.push(-w / 2, y0, zb0, w / 2, y0, zb0, w / 2, y0, zb1, -w / 2, y0, zb1);
    v.push(-w * 0.8, p.topY, p.topZ1, w * 0.8, p.topY, p.topZ1, w * 0.8, p.topY, p.topZ2, -w * 0.8, p.topY, p.topZ2);
    const idx = [
      0, 1, 5, 0, 5, 4,       // 左
      1, 2, 6, 1, 6, 5,       // 后
      2, 3, 7, 2, 7, 6,       // 右
      3, 0, 4, 3, 4, 7,       // 前
      4, 5, 6, 4, 6, 7,       // 顶
      3, 2, 1, 3, 1, 0,       // 底
    ];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const pylon = new THREE.Mesh(geo, mats.wing);
    pylon.userData.partId = 'pylon';
    pylon.castShadow = true;
    group.add(pylon);
  }

  return { group, fan };
}
