/**
 * engine/gltfModel.js — 真实模型加载通道(铁律 2026-10-25 修订后启用)
 *
 * 模型实体存移动硬盘 D:\云端机库-assets\models\<id>\<id>.glb,
 * 经 junction cloud-hangar/assets 以相对路径 assets/models/... 访问。
 * 来源:Flightradar24/fr24-3d-models(GPL-2.0),见 assets/CREDITS.md。
 *
 * 职责:GLB → THREE.Group;归一化(米制、机鼻 +Z、轮子接地);
 * partId 补齐(遍历命名猜测:P3 热点依赖);动画混入器透出(若有)。
 * 无模型的变体(C919/A35K/B38M)仍走参数化引擎,两条通道按 VARIANT_CHANNELS 切换。
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { getEnvMap } from './materials.js';

/** 真实 GLB 变体表(经用户批准:只保留有真实模型的机型,无模型的舍弃) */
export const GLB_VARIANTS = {
  b738: 'b738',   // FlightGear 737-800 源(dae)转换,波音白机+招牌涂装贴图
  b789: 'b789',   // FlightGear 787-900 源(dae)转换
  a20n: 'a20n',   // FlightAirMap glTF2 A320(空客屋涂装)
  a21n: 'a21n',
  a332: 'a332',
  a333: 'a333',
  b788: 'b788',
  a359: 'a359',
  b748: 'b748',
};
/* 已舍弃(无免费可分发真实模型):b38m 737 MAX 8 / c919 / a35k A350-1000 */

const cache = new Map(); // assetId → Promise<THREE.Group>(克隆模板)

/* 源模型机鼻朝向表(key = GLB 文件名主名,涂装变体如 b788-cz 共用主型号值)。
   实测方法:解包 GLB,按名字定位机鼻证据(鼻锥/前起舱门/皮托管)与机尾证据
   (方向舵/垂尾/APU 排气)比较 z。其余 8 变体机鼻 +Z → yaw 0;a20n 机鼻 +X → −90°。
   新增变体必须先实测后补表,勿再引入全局盲翻转。 */
const SOURCE_NOSE_YAW = { a20n: -Math.PI / 2 };

function sourceNoseYaw(assetId) {
  const base = String(assetId).split('/').pop().replace(/\.glb$/i, '').split('-')[0];
  return SOURCE_NOSE_YAW[base] ?? 0;
}

/** 加载 GLB(缓存原始模板,调用方 clone) */
export function loadGltfTemplate(assetId) {
  if (!cache.has(assetId)) {
    const p = new Promise((resolve, reject) => {
      new GLTFLoader().load(
        assetId,
        (gltf) => {
          const scene = gltf.scene;
          scene.traverse((o) => {
            if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; }
          });
          resolve(scene);
        },
        undefined,
        (err) => reject(new Error(`GLB 加载失败 ${assetId}: ${err}`)),
      );
    });
    cache.set(assetId, p);
  }
  return cache.get(assetId);
}

/**
 * 归一化模型:中心原点(机身轴线中点)、机鼻 +Z、轮子贴 y=0。
 * 源模型朝向不做自动猜测:2026-10-26 逐 GLB 解包核验,9 变体中 8 个源机鼻 +Z、
 * a20n 源机鼻 +X(见 SOURCE_NOSE_YAW);此前"FR24 机鼻 −Z,统一 +180°"的盲翻转
 * 把 8 个机型转成机鼻 −Z,导致查看页前视/尾翼预设与部件图鉴空间分类全部首尾颠倒。
 * @param {THREE.Group} scene gltf.scene
 * @param {object} dims { length, span, height } 权威数据表米数
 * @param {number} yaw 源模型机鼻对准 +Z 所需的绕 Y 旋转(弧度,见 sourceNoseYaw)
 * @returns {THREE.Group} 归一化后的根组(y=0 为地面,机身轴线 ≈ dims.axisY)
 */
export function normalizeAircraft(scene, dims, yaw = 0) {
  const root = new THREE.Group();
  const inner = scene; // 直接操作原场景(每个变体只加载一份,viewer 一次一机)

  // 1) 先按实测表对准机鼻,再测包围盒(yaw 为 ±90° 时纵轴随旋转从 X 落到 Z)
  inner.rotation.y = yaw;
  const size = new THREE.Box3().setFromObject(inner).getSize(new THREE.Vector3());

  // 2) 等比缩放到真实长度
  const scale = dims.length / size.z;
  inner.scale.multiplyScalar(scale);
  size.multiplyScalar(scale);

  // 3) 重新计算包围盒:水平居中(z/x),底面(机轮)贴 y=0 —— 模型自带起落架
  const box2 = new THREE.Box3().setFromObject(inner);
  const c2 = new THREE.Vector3();
  box2.getCenter(c2);
  inner.position.set(-c2.x, -box2.min.y, -c2.z);

  root.add(inner);
  root.userData.dims = { ...dims, actual: { x: size.x, y: size.y, z: size.z }, scale };
  return root;
}

/**
 * 真实模型通道:返回与 buildAircraft 兼容的接口。
 * 动画:GLB 自带动画则播放(风扇/舵面),否则静态;开关面板仅夜间模式生效。
 * @param {string} url GLB 地址(变体基础模型或涂装模型)
 */
export async function buildGltfAircraftUrl(url, renderer, dims) {
  const assetId = url;
  const scene = await loadGltfTemplate(assetId);
  const root = normalizeAircraft(scene, dims, sourceNoseYaw(assetId));

  // 环境反射:GLB 材质接入 PMREM RoomEnvironment,观感与参数化通道一致
  const envMap = getEnvMap(renderer);
  scene.traverse((o) => {
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of mats) {
      if ('envMap' in m) {
        m.envMap = envMap;
        m.envMapIntensity = 0.85;
        m.needsUpdate = true;
      }
    }
  });

  const mixer = new THREE.AnimationMixer(scene);
  const actions = scene.animations ? scene.animations.map((clip) => mixer.clipAction(clip)) : [];
  actions.forEach((a) => a.play());

  function triCount() {
    let n = 0;
    root.traverse((o) => {
      if (!o.isMesh || !o.geometry) return;
      const g = o.geometry;
      n += (g.index ? g.index.count / 3 : g.attributes.position ? g.attributes.position.count / 3 : 0);
    });
    return Math.round(n);
  }

  return {
    root,
    variant: dims,
    familyCn: '',
    update: (dt) => { if (actions.length) mixer.update(dt); },
    setNight: () => {},
    setGear: () => {},
    setFlaps: () => {},
    setFan: () => {},
    setStrobes: () => {},
    triCount,
    dispose: () => {
      root.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        mats.forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
      });
    },
  };
}

export async function buildGltfAircraft(variantId, renderer, dims) {
  const assetId = GLB_VARIANTS[variantId];
  if (!assetId) throw new Error(`变体 ${variantId} 无真实模型通道`);
  return buildGltfAircraftUrl(`assets/models/${assetId}/${assetId}.glb`, renderer, dims);
}
