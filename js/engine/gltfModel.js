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
  a320: 'a320',   // FlightAirMap glTF2 再导出版 A320ceo(P13 补注册;P7 时入库但为 glTF1 不可用)
  a321: 'a321',
  a332: 'a332',
  a333: 'a333',
  b788: 'b788',
  a359: 'a359',
  b748: 'b748',
  /* P13(二)2026-11-01:上游 glTF2 再导出版批量补注册(目录 78 款中可直接落地的全部机型) */
  a343: 'a343',   // FlightAirMap a340/glTF2/A343.glb
  a388: 'a388',   // a380/glTF2/A380.glb
  at42: 'at42',   // atr42/glTF2/AT45.glb(ATR 42-500 世代)
  at72: 'at72',   // atr72/glTF2/AT75.glb
  b744: 'b744',   // b744/glTF2/B747.glb
  b752: 'b752',   // b752/glTF2/B752.glb
  b763: 'b763',   // b767/glTF2/B763.glb
  a221: 'a221',   // bcs1/glTF2/BCS1.glb(原庞巴迪 CS100)
  a223: 'a223',   // bcs1/glTF2/BCS3.glb(CS300)
  e145: 'e145',   // e145/glTF2/E145.glb
  e170: 'e170',   // e190/glTF2/E170.glb
  e175: 'e175',   // e190/glTF2/E75L.glb
  e190: 'e190',   // e190/glTF2/E190.glb
  md11: 'md11',   // md11/glTF2/MD11.glb
  t134: 't134',   // t134/glTF2/T134.glb
};
/* 仍舍弃(上游无免费可分发真实模型,含 .ac 格式需转换器):b38m/c919/a35k 及
   目录其余约 50 款(737 系/777/A330neo/787-10/CRJ/Q400/福克/协和等)。 */

const cache = new Map(); // assetId → Promise<THREE.Group>(克隆模板)

/* 源模型机鼻朝向表(key = GLB 文件名主名,涂装变体如 b788-cz 共用主型号值)。
   实测方法:解包 GLB,按名字定位机鼻证据(鼻锥/前起舱门/皮托管)与机尾证据
   (方向舵/垂尾/APU 排气)比较 z。其余 9 变体机鼻 +Z → yaw 0;
   a20n/a320/a321 机鼻 +X → −90°(a320/a321 的"端均高度"启发式曾误判为 −X,
   2026-11-01 以页内世界坐标逐网格实测定案:试 +90° 后机鼻落 −Z,故取 −90°)。
   新增变体必须先实测后补表,勿再引入全局盲翻转。 */
const SOURCE_NOSE_YAW = {
  a20n: -Math.PI / 2, a320: -Math.PI / 2,
  /* P13(二)批量:页内 matrixWorld 命名网格证据实测(离线 trimesh 场景图变换方向
     易反,不可作为定案依据;a388/a223/e145/e170/e175/e190/md11/t134 均源机鼻 +Z) */
  b752: -Math.PI / 2,
};

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
  /* 缓存的是未归一化模板;每次发深克隆——模板一旦被 normalizeAircraft 原地改过
     scale/rotation,同 URL 二次加载(A→涂装B→切回A)就会在已缩放基础上再乘,
     即"换装双倍缩放"。clone(true) 共享几何/材质,显存不翻倍。 */
  const scene = (await loadGltfTemplate(assetId)).clone(true);
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
