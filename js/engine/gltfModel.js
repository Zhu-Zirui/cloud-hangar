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

/** 有真实 GLB(glTF2)的变体 → 资产 ID(与 data/aircraft 的 variantId 对应) */
export const GLB_VARIANTS = {
  a20n: 'a20n',   // FlightAirMap glTF2 A320(ceo 世代,鲨鳍差异见 CREDITS)
  a21n: 'a21n',   // 同上
  a332: 'a332',
  a333: 'a333',
  a359: 'a359',   // A350(A350.glb)
  b748: 'b748',
  b788: 'b788',
  // b738/b789:FR24 的 glb 是 glTF1(r160 不认),待由 dae 源转换
  // b38m / c919 / a35k:免费模型未找到,参数化引擎
};

const cache = new Map(); // assetId → Promise<THREE.Group>(克隆模板)

/** 加载 GLB(缓存原始模板,调用方 clone) */
export function loadGltfTemplate(assetId) {
  if (!cache.has(assetId)) {
    const p = new Promise((resolve, reject) => {
      new GLTFLoader().load(
        `assets/models/${assetId}/${assetId}.glb`,
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
 * FR24 模型朝向惯例不一致,用包围盒与最长轴自动判定,再按运行时校准表修正。
 * @param {THREE.Group} scene gltf.scene
 * @param {object} dims { length, span, height } 权威数据表米数
 * @returns {THREE.Group} 归一化后的根组(y=0 为地面,机身轴线 ≈ dims.axisY)
 */
export function normalizeAircraft(scene, dims) {
  const root = new THREE.Group();
  const inner = scene; // 直接操作原场景(每个变体只加载一份,viewer 一次一机)

  // 1) 包围盒
  const box = new THREE.Box3().setFromObject(inner);
  const size = new THREE.Vector3();
  box.getSize(size);
  const center = new THREE.Vector3();
  box.getCenter(center);

  // 2) 最长轴视为纵轴,重定向到 +Z(机头方向按校准表,FR24 模型机鼻朝 -Z)
  let sizeZ = size.z, sizeX = size.x, sizeY = size.y;
  if (size.x >= size.z) { // 纵轴在 X:转 90°
    inner.rotation.y = Math.PI / 2;
    [sizeZ, sizeX] = [sizeX, sizeZ];
  }
  // FR24 机型机鼻朝 -Z(gltf z-up 风格已在导出时处理),运行时以 747 实测校准
  inner.rotation.y += Math.PI;

  // 3) 等比缩放到真实长度
  const scale = dims.length / sizeZ;
  inner.scale.multiplyScalar(scale);
  sizeZ *= scale; sizeX *= scale; sizeY *= scale;

  // 4) 重新计算包围盒:水平居中(z/x),底面(机轮)贴 y=0 —— 模型自带起落架
  const box2 = new THREE.Box3().setFromObject(inner);
  const c2 = new THREE.Vector3();
  box2.getCenter(c2);
  inner.position.set(-c2.x, -box2.min.y, -c2.z);

  root.add(inner);
  root.userData.dims = { ...dims, actual: { x: sizeX, y: sizeY, z: sizeZ }, scale };
  return root;
}

/**
 * 真实模型通道:返回与 buildAircraft 兼容的接口。
 * 动画:GLB 自带动画则播放(风扇/舵面),否则静态;开关面板仅夜间模式生效。
 */
export async function buildGltfAircraft(variantId, renderer, dims) {
  const assetId = GLB_VARIANTS[variantId];
  if (!assetId) throw new Error(`变体 ${variantId} 无真实模型通道`);
  const scene = await loadGltfTemplate(assetId);
  const root = normalizeAircraft(scene, dims);

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
