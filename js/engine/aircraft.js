/**
 * engine/aircraft.js — 总装器:buildAircraft(variantId) → THREE.Group + 动画控制
 * 流程:变体 ID → 家族模块 → data/aircraft/<family>.json 权威数据 → tune() 参数
 *      → 通用件(机身/机翼/尾翼/发动机/起落架/细节)组装 → 抬升到停放高度。
 * 动画:风扇转速 / 起落架收放 / 襟翼缝翼扰流板偏转 / 频闪·防撞灯 / 夜间舷窗发光。
 */
import * as THREE from 'three';
import { createAircraftMaterials } from './materials.js';
import { buildFuselage } from './fuselage.js';
import { buildWingAssembly, buildFinAssembly, buildHstabAssembly, buildWingFairing } from './wing.js';
import { buildEnginePod } from './enginePod.js';
import { buildNoseGear, buildMainGear } from './gear.js';
import { buildAntennas, buildNoseSensors, buildWingExitMarks, buildLights } from './details.js';
import { b737Family, tuneB737 } from './families/b737.js';
import { a320Family, tuneA320 } from './families/a320.js';
import { c919Family, tuneC919 } from './families/c919.js';
import { a330Family, tuneA330 } from './families/a330.js';
import { b787Family, tuneB787 } from './families/b787.js';
import { a350Family, tuneA350 } from './families/a350.js';
import { b747Family, tuneB747 } from './families/b747.js';

import { GLB_VARIANTS } from './gltfModel.js';

/* 家族注册表 */
const FAMILIES = [
  { meta: b737Family, tune: tuneB737 },
  { meta: a320Family, tune: tuneA320 },
  { meta: c919Family, tune: tuneC919 },
  { meta: a330Family, tune: tuneA330 },
  { meta: b787Family, tune: tuneB787 },
  { meta: a350Family, tune: tuneA350 },
  { meta: b747Family, tune: tuneB747 },
];

/** 展示变体顺序:以真实 GLB 模型为准(无真实模型的机型已舍弃,经用户批准) */
export const VARIANT_ORDER = Object.keys(GLB_VARIANTS);
const BY_VARIANT = new Map(FAMILIES.flatMap((f) => f.meta.variants.map((id) => [id, f])));

/* 机型 JSON 缓存(会话内 fetch 一次) */
const dataCache = new Map();
async function loadFamilyData(famId) {
  if (!dataCache.has(famId)) {
    const p = fetch(`data/aircraft/${famId}.json`).then((res) => {
      if (!res.ok) throw new Error(`机型数据加载失败:${famId}.json (HTTP ${res.status})`);
      return res.json();
    });
    dataCache.set(famId, p);
  }
  return dataCache.get(famId);
}

/** 取单个变体数据(viewer 信息栏) */
export async function loadVariant(variantId) {
  const fam = BY_VARIANT.get(variantId);
  if (!fam) return null;
  const data = await loadFamilyData(fam.meta.id);
  const variant = data.variants.find((v) => v.id === variantId) || null;
  return variant ? { variant, familyCn: data.familyCn } : null;
}

/** 全量 12 变体(机库卡片) */
export async function loadAllVariants() {
  const out = [];
  for (const id of VARIANT_ORDER) {
    const r = await loadVariant(id);
    if (r) out.push({ ...r.variant, familyCn: r.familyCn });
  }
  return out;
}

/**
 * 组装整机。
 * @param {string} variantId 变体 ID(如 b738)
 * @param {THREE.WebGLRenderer} renderer 环境反射用
 * @param {object} opts { textures:{fuselage} 外部贴图(P2 涂装) }
 * @returns {Promise<object>} { root, variant, familyCn, update, setters…, triCount, dispose }
 */
export async function buildAircraft(variantId, renderer, opts = {}) {
  const fam = BY_VARIANT.get(variantId);
  if (!fam) throw new Error(`未知机型变体:${variantId}`);
  const data = await loadFamilyData(fam.meta.id);
  const variant = data.variants.find((v) => v.id === variantId);
  if (!variant) throw new Error(`家族 ${fam.meta.id} 中无变体 ${variantId}`);

  const mats = createAircraftMaterials(renderer, opts.textures || {});
  const P = fam.tune(variant);
  const root = new THREE.Group();
  root.name = `aircraft-${variantId}`;

  /* 机身(含风挡/舷窗/舱门/雷达罩/APU) */
  const { group: fusGroup, sampler } = buildFuselage(P.fuselage, mats);
  root.add(fusGroup);

  /* 机翼 + 翼身整流罩 */
  const wingAsm = buildWingAssembly(P.wing, mats);
  root.add(wingAsm.group);
  root.add(buildWingFairing({ ...P.wing, maxR: P.fuselage.maxR }, mats));

  /* 尾翼 */
  const fin = buildFinAssembly(P.fin, mats);
  const hstab = buildHstabAssembly(P.hstab, mats);
  root.add(fin.group, hstab.group);

  /* 发动机(清单 × 左右对称) */
  const fans = [];
  for (const e of P.engines) {
    for (const side of [1, -1]) {
      const { group, fan } = buildEnginePod({ ...e, pos: { ...e.pos, x: e.pos.x * side } }, mats);
      root.add(group);
      fans.push(fan);
    }
  }

  /* 起落架:前起 + 主起清单 × 左右 */
  const gears = [];
  const nose = buildNoseGear({ ...P.gear.nose, centerH: P.centerH }, mats);
  root.add(nose.pivot);
  gears.push({ kind: 'nose', pivot: nose.pivot, door: nose.door, baseY: nose.pivot.position.y });
  for (const m of P.gear.mains) {
    for (const side of [1, -1]) {
      const g = buildMainGear({ ...m, x: m.x * side, side, centerH: P.centerH }, mats);
      root.add(g.pivot);
      gears.push({ kind: 'main', side, pivot: g.pivot, door: g.door, baseY: g.pivot.position.y });
    }
  }

  /* 细节件:天线 / 传感器 / 翼上出口标线 / 灯组 */
  root.add(buildAntennas(P.fuselage, sampler, mats));
  root.add(buildNoseSensors(P.fuselage, sampler, mats));
  if (variant.engineCount === 2 && P.fuselage.maxR < 2.1) root.add(buildWingExitMarks(P.wing, mats));
  const lights = buildLights(P.fuselage, P.wing, mats);
  root.add(lights.group);

  /* 停放姿态:轮子接地、机身水平 */
  root.position.y = P.centerH;
  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });

  /* ---------- 动画状态机 ---------- */
  const st = {
    gearTarget: 1, gearT: 1,        // 1=放下(停放)
    flapTarget: 0, flapT: 0,
    fanOn: false, fanSpeed: 0,
    strobesOn: true, night: false,
  };

  function applyGear(t) {
    for (const g of gears) {
      if (g.kind === 'nose') {
        g.pivot.rotation.x = -1.72 * (1 - t);          // 向前收
        g.pivot.position.y = g.baseY + 0.42 * (1 - t); // 收起时上提藏入轮舱
      } else {
        g.pivot.rotation.z = -g.side * 1.6 * (1 - t);  // 向机身内侧收
        g.pivot.position.y = g.baseY + 0.32 * (1 - t);
      }
      g.door.rotation.x = -1.45 * t;                    // 放下=舱门开,收起=闭合
    }
  }

  function applyFlaps(t) {
    for (const h of wingAsm.controls.flaps) h.rotation.x = -0.62 * t;
    for (const s of wingAsm.controls.slats) {
      s.position.copy(s.userData.basePos).addScaledVector(s.userData.deployVec, t);
    }
    for (const sp of wingAsm.controls.spoilers) sp.rotation.x = 0.38 * t;
  }

  applyGear(st.gearT);
  applyFlaps(st.flapT);

  function update(dt, time) {
    // 起落架 / 襟翼平滑过渡
    st.gearT = THREE.MathUtils.damp(st.gearT, st.gearTarget, 3.2, dt);
    if (Math.abs(st.gearT - st.gearTarget) < 0.002) st.gearT = st.gearTarget;
    applyGear(st.gearT);
    st.flapT = THREE.MathUtils.damp(st.flapT, st.flapTarget, 3.0, dt);
    if (Math.abs(st.flapT - st.flapTarget) < 0.002) st.flapT = st.flapTarget;
    applyFlaps(st.flapT);
    // 风扇:转速渐变
    st.fanSpeed = THREE.MathUtils.damp(st.fanSpeed, st.fanOn ? 3.0 : 0, 1.6, dt);
    for (const f of fans) f.rotation.z -= st.fanSpeed * dt;
    // 频闪:双闪节奏(周期 1.4s:0.05s 亮 + 0.12~0.17s 复闪)
    const ph = (time % 1.4 + 1.4) % 1.4;
    const flash = ph < 0.05 || (ph > 0.12 && ph < 0.17);
    lights.strobeMat.emissiveIntensity = st.strobesOn ? (flash ? 6.5 : 0.18) : 0.05;
    // 防撞灯:约 1Hz
    mats.lightBeacon.emissiveIntensity = (time % 1.05) < 0.13 ? 4.2 : 0.25;
  }

  function setNight(on) {
    st.night = !!on;
    mats.cabinWindow.emissiveIntensity = st.night ? 1.4 : 0;
  }

  /** 三角形计数(InstancedMesh 按实例数放大) */
  function triCount() {
    let n = 0;
    root.traverse((o) => {
      if (!o.isMesh || !o.geometry) return;
      const g = o.geometry;
      const base = g.index ? g.index.count / 3 : (g.attributes.position ? g.attributes.position.count / 3 : 0);
      n += base * (o.isInstancedMesh ? o.count : 1);
    });
    return Math.round(n);
  }

  /** 释放几何与材质(换机型/离开页面时调用) */
  function dispose() {
    root.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    mats.dispose();
  }

  return {
    root, variant, familyCn: data.familyCn, params: P, mats,
    update, setNight, triCount, dispose,
    setGear: (down) => { st.gearTarget = down ? 1 : 0; },
    setFlaps: (down) => { st.flapTarget = down ? 1 : 0; },
    setFan: (on) => { st.fanOn = !!on; },
    setStrobes: (on) => { st.strobesOn = !!on; },
    isNight: () => st.night,
  };
}
