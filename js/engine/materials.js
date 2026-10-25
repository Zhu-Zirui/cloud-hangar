/**
 * engine/materials.js — PBR 材质库 + 环境反射 + P1 素色涂装贴图
 *
 * 机身贴图 UV 契约(fuselage.js 按此生成,P2 涂装引擎按此绘制):
 *   uv.x = u 圆周角:0=正上方, 0.25=右舷(x=-r), 0.5=机腹, 0.75=左舷(x=+r)
 *   uv.y = s 纵向站:0=机头, 1=尾锥
 *   贴图 flipY=false → 画布 y=0 行 = 机头,画布 y 轴向下 = 指向机尾
 *   机腹灰 = 画布 x∈(0.25W,0.75W);横向通长色带 = 环绕机身的环带
 *   侧面前后方向文字:左舷(x≈0.75W) ctx.rotate(+π/2),右舷(x≈0.25W) ctx.rotate(-π/2)
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/* 环境贴图按 renderer 缓存(PMREM 生成成本高,每页面只做一次) */
const envCache = new WeakMap();

/** 取(或生成)当前 renderer 的 PMREM 环境反射贴图 */
export function getEnvMap(renderer) {
  if (!envCache.has(renderer)) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const rt = pmrem.fromScene(new RoomEnvironment(), 0.04);
    pmrem.dispose();
    envCache.set(renderer, rt.texture);
  }
  return envCache.get(renderer);
}

/* ---------- P1 素色涂装:白机身 + 灰机腹 + 深色舷窗带 ---------- */

/** 圆周角 u 的平滑阶梯(0→1 过渡带),用于机腹灰上下缘羽化 */
function bandEdge(x, center, soft) {
  const t = THREE.MathUtils.clamp((x - center) / soft, -1, 1);
  return 0.5 + 0.5 * t;
}

/**
 * 生成 P1 素色机身贴图(2048×1024)
 * @param {object} opts { winU: 舷窗带中心 u(默认 0.22), bandH: 带半宽 u }
 * @returns {THREE.CanvasTexture}
 */
export function makeBareFuselageTexture(opts = {}) {
  const W = 2048, H = 1024;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');

  // 底色:航空白
  ctx.fillStyle = '#f4f6f8';
  ctx.fillRect(0, 0, W, H);

  // 机腹灰(u 0.25→0.75 为下半机身),上下缘羽化
  const gradTop = ctx.createLinearGradient(0.24 * W, 0, 0.29 * W, 0);
  gradTop.addColorStop(0, '#f4f6f8');
  gradTop.addColorStop(1, '#aab3bd');
  ctx.fillStyle = gradTop;
  ctx.fillRect(0.24 * W, 0, 0.05 * W, H);
  ctx.fillStyle = '#aab3bd';
  ctx.fillRect(0.29 * W, 0, 0.42 * W, H);
  const gradBot = ctx.createLinearGradient(0.71 * W, 0, 0.76 * W, 0);
  gradBot.addColorStop(0, '#aab3bd');
  gradBot.addColorStop(1, '#f4f6f8');
  ctx.fillStyle = gradBot;
  ctx.fillRect(0.71 * W, 0, 0.05 * W, H);

  // 深色舷窗带(细 cheatline,置于舷窗列下方一点,舷窗本体落在白底上更醒目)
  const wu = opts.winU ?? 0.243;     // 带中心(右舷侧,略低于窗列 0.215)
  const bh = opts.bandH ?? 0.008;    // 带半宽(u 单位,细线)
  ctx.fillStyle = '#1d2630';
  ctx.fillRect((wu - bh) * W, 0, 2 * bh * W, H);              // 右舷
  ctx.fillRect((1 - wu - bh) * W, 0, 2 * bh * W, H);          // 左舷(镜像)

  // 细微机身对接缝线(每 1/8 纵向一条,极淡,增加质感)
  ctx.strokeStyle = 'rgba(120,130,142,0.20)';
  ctx.lineWidth = 1.5;
  for (let i = 1; i < 16; i++) {
    const y = (i / 16) * H;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = false;                  // UV 契约:画布顶行 = 机头
  tex.anisotropy = 8;
  return tex;
}

/**
 * 创建整机组材质包(共享实例,aircraft.js 统一 dispose)
 * @param {THREE.WebGLRenderer} renderer 用于环境反射
 * @param {object} tex { fuselage } 可选外部贴图(P2 涂装);缺省用素色
 */
export function createAircraftMaterials(renderer, tex = {}) {
  const envMap = getEnvMap(renderer);

  const fuselageTex = tex.fuselage || makeBareFuselageTexture();

  const mats = {
    fuselage: new THREE.MeshPhysicalMaterial({
      map: fuselageTex,
      metalness: 0.15, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.25,
      envMap, envMapIntensity: 0.9,
    }),
    // 翼面(机翼/尾翼/缝翼等):比机身略灰,双面(左右翼共用镜像几何)
    wing: new THREE.MeshPhysicalMaterial({
      color: 0xdde3ea, metalness: 0.2, roughness: 0.42, clearcoat: 0.5,
      envMap, envMapIntensity: 0.8, side: THREE.DoubleSide,
    }),
    // 翼身整流罩鼓包(随机腹灰)
    fairing: new THREE.MeshPhysicalMaterial({
      color: 0xaab3bd, metalness: 0.15, roughness: 0.4, clearcoat: 0.5,
      envMap, envMapIntensity: 0.8,
    }),
    // 雷达罩
    radome: new THREE.MeshPhysicalMaterial({
      color: 0x9aa3ad, metalness: 0.1, roughness: 0.5, clearcoat: 0.35,
      envMap, envMapIntensity: 0.7,
    }),
    // 风挡/客舱窗玻璃
    glass: new THREE.MeshPhysicalMaterial({
      color: 0x0a1219, metalness: 0.4, roughness: 0.12,
      clearcoat: 1.0, clearcoatRoughness: 0.06, envMap, envMapIntensity: 1.4,
    }),
    // 发动机短舱外壳(P2 可被航司着色)
    nacelle: new THREE.MeshPhysicalMaterial({
      color: 0xeef1f4, metalness: 0.2, roughness: 0.34, clearcoat: 0.55,
      envMap, envMapIntensity: 0.9,
    }),
    // 进气唇口(钛灰)
    lip: new THREE.MeshPhysicalMaterial({
      color: 0x5c6670, metalness: 0.85, roughness: 0.28,
      envMap, envMapIntensity: 1.2,
    }),
    // 短舱内涵/尾喷
    engineDark: new THREE.MeshStandardMaterial({
      color: 0x30363d, metalness: 0.7, roughness: 0.45, envMap, envMapIntensity: 0.8,
    }),
    fanBlade: new THREE.MeshStandardMaterial({
      color: 0x494f57, metalness: 0.9, roughness: 0.3, envMap, envMapIntensity: 1.1,
      side: THREE.DoubleSide,
    }),
    // 起落架支柱/轮轴
    metal: new THREE.MeshStandardMaterial({
      color: 0xb9c2cc, metalness: 0.9, roughness: 0.32, envMap, envMapIntensity: 1.0,
    }),
    // 轮胎
    tire: new THREE.MeshStandardMaterial({ color: 0x17191d, roughness: 0.95, metalness: 0 }),
    // 轮毂/刹车
    hub: new THREE.MeshStandardMaterial({
      color: 0x8d959e, metalness: 0.85, roughness: 0.4, envMap, envMapIntensity: 0.9,
    }),
    // 暗色细节(天线/皮托管/门框线等)
    detail: new THREE.MeshStandardMaterial({ color: 0x2a3138, roughness: 0.6, metalness: 0.5 }),
    // 客舱舷窗(InstancedMesh):夜间自发光
    cabinWindow: new THREE.MeshStandardMaterial({
      color: 0x11161c, roughness: 0.25, metalness: 0.3,
      emissive: 0xffe9b8, emissiveIntensity: 0, envMap, envMapIntensity: 0.6,
    }),
    // 灯光件(emissive 各色)
    lightRed: new THREE.MeshStandardMaterial({ color: 0x5a0f14, emissive: 0xff2430, emissiveIntensity: 2.2 }),
    lightGreen: new THREE.MeshStandardMaterial({ color: 0x0c3a1c, emissive: 0x22ff55, emissiveIntensity: 2.2 }),
    lightWhite: new THREE.MeshStandardMaterial({ color: 0x707880, emissive: 0xffffff, emissiveIntensity: 2.4 }),
    lightBeacon: new THREE.MeshStandardMaterial({ color: 0x5a0f14, emissive: 0xff2020, emissiveIntensity: 2.5 }),
    lightLanding: new THREE.MeshStandardMaterial({ color: 0x6a7078, emissive: 0xfff6d8, emissiveIntensity: 3 }),
  };

  /* dispose:释放贴图与材质(P2 换装时只换 map,不销毁材质) */
  mats.dispose = () => {
    for (const key of Object.keys(mats)) {
      const m = mats[key];
      if (m && m.isMaterial) {
        if (m.map && m.map.isTexture && !tex.fuselage) m.map.dispose();
        m.dispose();
      }
    }
    if (tex.fuselage && tex.fuselage.isTexture) tex.fuselage.dispose();
  };
  return mats;
}

/** 机身材质换贴图(P2 涂装切换用),旧贴图可选释放 */
export function applyFuselageTexture(mats, newTex, disposeOld = true) {
  const old = mats.fuselage.map;
  mats.fuselage.map = newTex;
  mats.fuselage.needsUpdate = true;
  if (disposeOld && old && old.isTexture) old.dispose();
}

/** 短舱着色(P2:航司定义的整流罩色) */
export function applyNacelleColor(mats, hex) {
  mats.nacelle.color.set(hex ?? 0xeef1f4);
}
