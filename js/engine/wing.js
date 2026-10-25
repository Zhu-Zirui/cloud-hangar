/**
 * engine/wing.js — 机翼 / 尾翼 / 小翼 参数化构件
 *
 * 翼面 = 沿展向放样的六边形翼型截面(薄、后掠、梯形、上反)。
 * 活动面独立 mesh:缝翼(前缘 2-4 段)、襟翼(后缘内侧 1-2 段)、副翼(后缘外侧)、
 * 扰流板(上表面 4-6 片),均挂在枢轴组上,由 aircraft.js 驱动偏转。
 * 小翼型式库:blended 融合式 / forked 分叉式 / sharklet 鲨鳍 / raked 斜削式。
 * 翼面材质双面(左右翼经 scale.x=-1 镜像共享几何,shader 自动翻转背面法线)。
 */
import * as THREE from 'three';

/* 翼型轮廓(弦长分数, 厚度分数):LE(0,0) → 上表面 → TE → 下表面,闭环 */
const AF = [
  [0, 0], [0.12, 0.55], [0.32, 0.92], [0.6, 0.82], [1, 0.1],
  [0.66, -0.68], [0.34, -0.62], [0.12, -0.3],
];

/** 在给定的"前缘点序列"之间放样翼型实体(展向 loft) */
function loftAirfoil(stations) {
  const posArr = [], idx = [];
  const n = AF.length;
  stations.forEach((st, j) => {
    for (const [cf, yf] of AF) {
      posArr.push(
        st.o.x,
        st.o.y + yf * st.th,
        st.o.z - cf * st.c,
      );
    }
  });
  for (let j = 0; j < stations.length - 1; j++) {
    for (let i = 0; i < n; i++) {
      const k = (i + 1) % n;
      const a = j * n + i, b = j * n + k;
      const c = (j + 1) * n + k, d = (j + 1) * n + i;
      idx.push(a, b, c, a, c, d);
    }
  }
  // 根/梢端盖(质心扇形)
  for (const j of [0, stations.length - 1]) {
    let cx = 0, cy = 0, cz = 0;
    for (let i = 0; i < n; i++) {
      cx += posArr[(j * n + i) * 3]; cy += posArr[(j * n + i) * 3 + 1]; cz += posArr[(j * n + i) * 3 + 2];
    }
    const center = posArr.length / 3; // 追加质心顶点
    posArr.push(cx / n, cy / n, cz / n);
    for (let i = 0; i < n; i++) {
      const k = (i + 1) % n;
      if (j === 0) idx.push(center, j * n + k, j * n + i);
      else idx.push(center, j * n + i, j * n + k);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/** 在断面定义间线性插值:sections=[{t, c(弦长), le(前缘 z 偏移), th(半厚)}] */
function interp(sections, t, key) {
  for (let i = 0; i < sections.length - 1; i++) {
    const A = sections[i], B = sections[i + 1];
    if (t >= A.t && t <= B.t) {
      const f = (t - A.t) / (B.t - A.t || 1);
      return A[key] + (B[key] - A[key]) * f;
    }
  }
  return sections[sections.length - 1][key];
}

/* ---------- 小翼型式库 ---------- */

/**
 * 在翼梢前缘点构建小翼(局部:原点=翼梢前缘,+X 展向外,+Y 上,+Z 指 nose)
 * @param {string} type blended|forked|sharklet|raked
 * @param {number} c 翼梢弦长  @param {number} th 翼梢半厚  @param {number} h 特征高度
 */
function buildWingletMesh(type, c, th, mats) {
  const rel = { // 每型:高度系数 / 各阶段方向(x=外倾, y=竖直) / 弦长收缩 / 前缘后掠
    blended:  { h: 1.0,  dir: [[0.30, 0.95], [0.06, 1.0]],  taper: 0.42, sweep: 1.9 },
    sharklet: { h: 1.05, dir: [[0.34, 0.94], [-0.05, 1.0]], taper: 0.30, sweep: 2.5 },
    raked:    { h: 1.0,  dir: [[0.93, 0.32], [0.9, 0.36]],  taper: 0.10, sweep: 1.5 },
    forked:   { h: 0.95, dir: [[0.16, 0.99], [0.02, 1.0]],  taper: 0.40, sweep: 2.2 },
  }[type] || { h: 1, dir: [[0.3, 0.95], [0.06, 1]], taper: 0.42, sweep: 1.9 };
  const H = rel.h * (type === 'raked' ? c * 2.6 : Math.max(c * 1.6, 1.6)); // 斜削式横向伸展,其余竖直

  const stations = [];
  const steps = 7;
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const d0 = rel.dir[0], d1 = rel.dir[1];
    const dx = d0[0] + (d1[0] - d0[0]) * f;
    const dy = d0[1] + (d1[1] - d0[1]) * f;
    stations.push({
      o: new THREE.Vector3(dx * H * f, dy * H * f, -rel.sweep * H * f * f),
      c: c * (1 - (1 - rel.taper) * f),
      th: th * (1 - 0.55 * f),
    });
  }
  const mesh = new THREE.Mesh(loftAirfoil(stations), mats.wing);
  mesh.userData.partId = 'winglet';
  mesh.castShadow = true;

  if (type === 'forked') { // 分叉式:下翼尖帆(腹侧小鳍)
    const ventral = new THREE.Mesh(loftAirfoil([
      { o: new THREE.Vector3(0, 0, 0), c: c * 0.8, th: th },
      { o: new THREE.Vector3(0.1 * c, -0.42 * H, -0.5 * c), c: c * 0.4, th: th * 0.5 },
    ]), mats.wing);
    ventral.userData.partId = 'winglet';
    mesh.add(ventral);
  }
  return mesh;
}

/* ---------- 活动面 ---------- */

/** 后缘铰接面(襟翼/副翼):外组对齐后缘后掠角,内组绕展向轴偏转 */
function trailingSurface(t1, t2, W, mats, partId, chordFrac) {
  const half = W.halfSpan;
  const tm = (t1 + t2) / 2;
  const chord = interp(W.sections, tm, 'c');
  const x1 = t1 * half, x2 = t2 * half;
  const spanLen = Math.hypot(x2 - x1, interp(W.sections, t2, 'le') - interp(W.sections, t1, 'le'));
  const ym = W.rootY + Math.tan(THREE.MathUtils.degToRad(W.dihedral)) * tm * half;
  // 铰链位于该面自身前缘(主翼后缘再往前留出铰链高度)
  const zm = W.rootLE + interp(W.sections, tm, 'le') - chord * (1 - chordFrac) + chord * 0.015;
  // 后掠角:该段前缘方向绕 Y 轴角
  const sweepRad = Math.atan2(
    -(interp(W.sections, t2, 'le') - interp(W.sections, t1, 'le') + (interp(W.sections, t2, 'c') - interp(W.sections, t1, 'c'))),
    x2 - x1,
  );
  const outer = new THREE.Group();
  outer.position.set(tm * half, ym, zm);
  outer.rotation.y = sweepRad;
  const hinge = new THREE.Group();
  hinge.userData.partId = partId;
  const surf = new THREE.Mesh(
    new THREE.BoxGeometry(spanLen * 0.95, Math.max(0.05, chord * 0.055), chord * chordFrac),
    mats.wing,
  );
  surf.position.z = -chord * chordFrac / 2 + 0.02;
  surf.castShadow = true;
  hinge.add(surf);
  outer.add(hinge);
  return { outer, hinge };
}

/** 前缘缝翼段:可前下方滑出 */
function leadingSlat(t1, t2, W, mats) {
  const half = W.halfSpan;
  const tm = (t1 + t2) / 2;
  const chord = interp(W.sections, tm, 'c');
  const x1 = t1 * half, x2 = t2 * half;
  const spanLen = Math.hypot(x2 - x1, interp(W.sections, t2, 'le') - interp(W.sections, t1, 'le'));
  const ym = W.rootY + Math.tan(THREE.MathUtils.degToRad(W.dihedral)) * tm * half;
  const zm = W.rootLE + interp(W.sections, tm, 'le') - chord * 0.04;
  const pivot = new THREE.Group();
  pivot.position.set(tm * half, ym, zm);
  pivot.rotation.y = Math.atan2(-(interp(W.sections, t2, 'le') - interp(W.sections, t1, 'le')), x2 - x1);
  const slat = new THREE.Mesh(
    new THREE.BoxGeometry(spanLen * 0.94, Math.max(0.05, chord * 0.075), chord * 0.16),
    mats.wing,
  );
  slat.position.z = chord * 0.03;
  slat.userData.partId = 'slat';
  slat.castShadow = true;
  pivot.add(slat);
  pivot.userData.basePos = pivot.position.clone();
  pivot.userData.deployVec = new THREE.Vector3(0, -0.17, 0.55).multiplyScalar(chord); // 放下:前下方滑出
  return pivot;
}

/** 上表面扰流板片 */
function spoilerPlate(t, W, mats, i) {
  const chord = interp(W.sections, t, 'c');
  const y = W.rootY + Math.tan(THREE.MathUtils.degToRad(W.dihedral)) * t * W.halfSpan
    + interp(W.sections, t, 'th') * 0.92;
  const z = W.rootLE + interp(W.sections, t, 'le') - chord * (0.52 + 0.09 * (i % 3));
  const hinge = new THREE.Group();
  hinge.position.set(t * W.halfSpan, y, z);
  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(W.halfSpan * 0.075, 0.03, chord * 0.16), mats.wing,
  );
  plate.position.z = -chord * 0.08;
  plate.userData.partId = 'spoiler';
  hinge.add(plate);
  return hinge;
}

/* ---------- 单侧机翼 ---------- */

function buildOneWingSide(W, mats) {
  const side = new THREE.Group();
  const stations = [];
  const steps = 14;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = t * W.halfSpan;
    stations.push({
      o: new THREE.Vector3(
        x,
        W.rootY + Math.tan(THREE.MathUtils.degToRad(W.dihedral)) * x,
        W.rootLE + interp(W.sections, t, 'le'),
      ),
      c: interp(W.sections, t, 'c'),
      th: interp(W.sections, t, 'th'),
    });
  }
  const box = new THREE.Mesh(loftAirfoil(stations), mats.wing);
  box.userData.partId = 'wing_box';
  box.castShadow = true;
  side.add(box);

  // 小翼(翼梢前缘点)
  const tip = stations[stations.length - 1];
  const winglet = buildWingletMesh(W.winglet.type, tip.c, tip.th, mats);
  winglet.position.copy(tip.o);
  side.add(winglet);

  // 活动面:襟翼 ×2(后缘内侧)、缝翼 ×3(前缘)、副翼 ×1、扰流板 ×5
  const controls = { flaps: [], slats: [], spoilers: [] };
  for (const seg of [[0.05, 0.24], [0.24, 0.42]]) {
    const { outer, hinge } = trailingSurface(seg[0], seg[1], W, mats, 'flap', 0.3);
    side.add(outer); controls.flaps.push(hinge);
  }
  for (const seg of [[0.14, 0.36], [0.36, 0.58], [0.58, 0.78]]) {
    const slat = leadingSlat(seg[0], seg[1], W, mats);
    side.add(slat); controls.slats.push(slat);
  }
  const aileron = trailingSurface(0.66, 0.94, W, mats, 'aileron', 0.24);
  side.add(aileron.outer);
  for (let i = 0; i < 5; i++) {
    const sp = spoilerPlate(0.14 + i * 0.1, W, mats, i);
    side.add(sp); controls.spoilers.push(sp);
  }

  // 襟翼滑轨整流罩("独木舟"):后缘下侧 3 个长鼓包,真机标志性轮廓
  for (const t of [0.13, 0.27, 0.41]) {
    const chord = interp(W.sections, t, 'c');
    const x = t * W.halfSpan;
    const y = W.rootY + Math.tan(THREE.MathUtils.degToRad(W.dihedral)) * x
      - interp(W.sections, t, 'th') * 0.55;
    const z = W.rootLE + interp(W.sections, t, 'le') - chord * 0.52;
    const fair = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), mats.wing);
    fair.scale.set(chord * 0.09, chord * 0.075, chord * 0.42);
    fair.position.set(x, y, z);
    fair.userData.partId = 'flap';
    fair.castShadow = true;
    side.add(fair);
  }
  return { side, controls };
}

/**
 * 机翼总成(左右对称)。
 * @param {object} W { halfSpan, rootLE, rootY, dihedral, sections, winglet:{type} }
 * @returns { {group, controls} } controls:{flaps,slats,spoilers} 枢轴组数组
 */
export function buildWingAssembly(W, mats) {
  const group = new THREE.Group();
  const st = buildOneWingSide(W, mats);
  const port = buildOneWingSide(W, mats);
  port.side.scale.x = -1; // 镜像共享几何(双面材质,法线自动翻)
  group.add(st.side, port.side);
  return {
    group,
    controls: {
      flaps: [...st.controls.flaps, ...port.controls.flaps],
      slats: [...st.controls.slats, ...port.controls.slats],
      spoilers: [...st.controls.spoilers, ...port.controls.spoilers],
    },
  };
}

/* ---------- 垂尾(复用翼型 loft,沿 +Y 展开) ---------- */

/**
 * @param {object} T { rootZ, rootY, height, rootChord, tipChord, sweep, dorsal:{len, rise?} }
 */
export function buildFinAssembly(T, mats) {
  const group = new THREE.Group();

  // 背鳍(dorsal fin):垂尾前缘根部向前的三角形楔,真机剪影的关键特征
  if (T.dorsal) {
    const dLen = T.dorsal.len;
    const dRise = T.dorsal.rise ?? 0.55;
    const zF = T.rootZ + dLen;                  // 背鳍前端
    const zR = T.rootZ;                         // 垂尾前缘根部
    const yB = T.rootY - 0.9;                   // 沉入机身,避免悬空缝
    const yT = T.rootY + dRise;
    const halfW0 = 0.16, halfW1 = T.rootChord * 0.07;
    const v = [
      -halfW0, yB, zF,  halfW0, yB, zF,         // 前端底
      -halfW1 * 1.2, yB, zR,  halfW1 * 1.2, yB, zR, // 后端底
      0, yT, zR,                                 // 顶脊(垂尾前缘处)
    ];
    const idx = [
      0, 1, 4,  1, 3, 4,  3, 2, 4,  2, 0, 4,     // 四面楔体
      0, 2, 3,  0, 3, 1,                         // 底面(藏于机身)
    ];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const dorsal = new THREE.Mesh(geo, mats.wing);
    dorsal.userData.partId = 'vertical_stabilizer';
    dorsal.castShadow = true;
    group.add(dorsal);
  }

  const stations = [];
  const steps = 8;
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    stations.push({
      o: new THREE.Vector3(0, T.rootY + f * T.height, T.rootZ - Math.tan(THREE.MathUtils.degToRad(T.sweep)) * f * T.height),
      c: T.rootChord + (T.tipChord - T.rootChord) * f,
      th: T.rootChord * 0.055 * (1 - 0.45 * f),
    });
  }
  const fin = new THREE.Mesh(loftAirfoil(stations), mats.wing);
  fin.userData.partId = 'vertical_stabilizer';
  fin.castShadow = true;
  group.add(fin);

  // 方向舵:后缘下 55%~95% 段,铰接
  const hinge = new THREE.Group();
  const fMid = 0.75;
  const cMid = T.rootChord + (T.tipChord - T.rootChord) * fMid;
  const yMid = T.rootY + fMid * T.height;
  const zMid = T.rootZ - Math.tan(THREE.MathUtils.degToRad(T.sweep)) * fMid * T.height - cMid * 0.82;
  hinge.position.set(0, yMid, zMid);
  const spanLen = 0.4 * T.height;
  const rud = new THREE.Mesh(
    new THREE.BoxGeometry(Math.max(0.06, cMid * 0.05), spanLen, cMid * 0.26), mats.wing,
  );
  rud.position.set(0, spanLen / 2 - cMid * 0.05, -cMid * 0.12);
  rud.userData.partId = 'rudder';
  rud.castShadow = true;
  hinge.add(rud);
  group.add(hinge);
  return { group, rudderHinge: hinge };
}

/* ---------- 平尾(左右 + 升降舵) ---------- */

/**
 * @param {object} H { rootZ, rootY, halfSpan, rootChord, tipChord, sweep, dihedral }
 */
export function buildHstabAssembly(H, mats) {
  const group = new THREE.Group();
  const elevators = [];
  for (const sideSign of [1, -1]) {
    const side = new THREE.Group();
    const stations = [];
    for (let i = 0; i <= 6; i++) {
      const f = i / 6;
      const x = f * H.halfSpan;
      stations.push({
        o: new THREE.Vector3(
          x,
          H.rootY + Math.tan(THREE.MathUtils.degToRad(H.dihedral)) * x,
          H.rootZ - Math.tan(THREE.MathUtils.degToRad(H.sweep)) * f * H.halfSpan,
        ),
        c: H.rootChord + (H.tipChord - H.rootChord) * f,
        th: H.rootChord * 0.05 * (1 - 0.4 * f),
      });
    }
    const stab = new THREE.Mesh(loftAirfoil(stations), mats.wing);
    stab.userData.partId = 'horizontal_stabilizer';
    stab.castShadow = true;
    side.add(stab);
    // 升降舵(后缘中段)
    const cMid = H.rootChord + (H.tipChord - H.rootChord) * 0.55;
    const xMid = 0.55 * H.halfSpan;
    const hinge = new THREE.Group();
    hinge.position.set(
      xMid,
      H.rootY + Math.tan(THREE.MathUtils.degToRad(H.dihedral)) * xMid,
      H.rootZ - Math.tan(THREE.MathUtils.degToRad(H.sweep)) * xMid - cMid * 0.8,
    );
    const elev = new THREE.Mesh(
      new THREE.BoxGeometry(0.62 * H.halfSpan, Math.max(0.04, cMid * 0.045), cMid * 0.24), mats.wing,
    );
    elev.position.z = -cMid * 0.1;
    elev.userData.partId = 'elevator';
    hinge.add(elev);
    side.add(hinge);
    elevators.push(hinge);
    side.scale.x = sideSign;
    group.add(side);
  }
  return { group, elevators };
}

/* ---------- 翼身整流罩 ---------- */

/** 翼面上表面采样点(翼上出口标线等细节件定位用) */
export function wingTopPoint(W, t) {
  const x = t * W.halfSpan;
  return new THREE.Vector3(
    x,
    W.rootY + Math.tan(THREE.MathUtils.degToRad(W.dihedral)) * x + interp(W.sections, t, 'th') * 0.92,
    W.rootLE + interp(W.sections, t, 'le') - interp(W.sections, t, 'c') * 0.42,
  );
}


/** 翼根融合鼓包:压扁椭球贴机腹,随机型大小缩放 */
export function buildWingFairing(F, mats) {
  const geo = new THREE.SphereGeometry(1, 24, 16);
  const mesh = new THREE.Mesh(geo, mats.fairing);
  const rootChord = F.sections[0].c;
  mesh.scale.set(F.maxR * 0.85, F.maxR * 0.6, rootChord * 0.58);
  mesh.position.set(0, -F.maxR * 0.42, F.rootLE - rootChord * 0.45);
  mesh.userData.partId = 'wing_root_fairing';
  mesh.castShadow = true;
  return mesh;
}
