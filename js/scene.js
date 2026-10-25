/**
 * scene.js — 3D 场景基座(后续所有 3D 页面共用)
 * 提供:渲染器 / 相机 + 轨道控制 / 程序化渐变天空 / Canvas 标线停机坪 /
 *       昼夜灯光(预留夜间模式接口)/ 动画循环 / 完整 dispose 释放
 * 全部视觉素材由代码运行时生成,无任何外部二进制资源。
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* 昼 / 夜两套氛围参数(夜间模式接口,P2 之后接入真实切换交互) */
const DAY = {
  skyZenith: 0x12407e, skyHorizon: 0xf3e9d6,   // 天顶深蓝 → 地平线暖白
  fog: 0xdde3ec, fogNear: 175, fogFar: 560,
  hemi: 0.75, sun: 1.75, sunColor: 0xfff2e0, ambient: 0.12, exposure: 1.05,
};
const NIGHT = {
  skyZenith: 0x020510, skyHorizon: 0x0e2038,
  fog: 0x0a1526, fogNear: 140, fogFar: 480,
  hemi: 0.12, sun: 0.22, sunColor: 0x93b4ff, ambient: 0.05, exposure: 0.92,
};

/* ---------- 程序化天空:大球体 + 顶点色渐变 ---------- */

/** 创建带 color 属性的天空球(BackSide,自内向外看) */
function createSkyMesh(radius = 430) {
  const geo = new THREE.SphereGeometry(radius, 32, 20);
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 3), 3));
  const mat = new THREE.MeshBasicMaterial({
    vertexColors: true, side: THREE.BackSide, fog: false, toneMapped: false,
  });
  return new THREE.Mesh(geo, mat);
}

/** 按天顶/地平线两色重绘天空球顶点色;y<0(地平线以下)渐暗 */
function paintSky(skyMesh, zenithHex, horizonHex) {
  const geo = skyMesh.geometry;
  const pos = geo.attributes.position;
  const col = geo.attributes.color;
  const radius = geo.parameters.radius;
  const zen = new THREE.Color(zenithHex);
  const hor = new THREE.Color(horizonHex);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const ny = pos.getY(i) / radius; // 归一化高度 -1..1
    const t = THREE.MathUtils.clamp(ny, 0, 1);
    c.copy(hor).lerp(zen, Math.pow(t, 0.55)); // 幂曲线:地平线附近过渡更宽
    if (ny < 0) c.multiplyScalar(1 + ny * 0.18);
    col.setXYZ(i, c.r, c.g, c.b);
  }
  col.needsUpdate = true;
}

/* ---------- 程序化停机坪:混凝土 + Canvas 标线 ---------- */

/**
 * 2048px 画布映射 300m×300m 停机坪(约 6.83px/m)。
 * 画布下方向 = 世界 +Z(机头方向),中心 = 世界原点。
 */
function createApronTexture() {
  const S = 2048;
  const WORLD = 300;
  const M = S / WORLD;
  const C = S / 2;
  const px = (x) => C + x * M; // 世界 x → 画布 x
  const py = (z) => C + z * M; // 世界 z → 画布 y(+z 朝画布下方)

  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const ctx = cv.getContext('2d');

  // 混凝土底色 + 骨料噪点
  ctx.fillStyle = '#a6abb2';
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 14000; i++) {
    const x = Math.random() * S;
    const y = Math.random() * S;
    ctx.fillStyle = Math.random() < 0.5
      ? `rgba(52,56,62,${0.03 + Math.random() * 0.05})`
      : `rgba(240,244,248,${0.02 + Math.random() * 0.04})`;
    ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }

  // 混凝土伸缩缝:每 15m 一格
  ctx.strokeStyle = 'rgba(58,62,68,0.4)';
  ctx.lineWidth = 2;
  for (let m = -WORLD / 2; m <= WORLD / 2; m += 15) {
    const p = C + m * M;
    ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, S); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(S, p); ctx.stroke();
  }

  // 滑行道边线(双黄)靠近 +Z 一侧
  ctx.strokeStyle = '#dcb13c';
  ctx.lineWidth = 0.35 * M;
  for (const z of [142, 143.6]) {
    ctx.beginPath(); ctx.moveTo(0, py(z)); ctx.lineTo(S, py(z)); ctx.stroke();
  }

  // 机位停机框(黄色实线,x±26m / z±26m)
  ctx.lineWidth = 0.32 * M;
  ctx.strokeRect(px(-26), py(-26), 52 * M, 52 * M);

  // 设备安全区(白色虚线框)
  ctx.strokeStyle = 'rgba(242,246,250,0.75)';
  ctx.lineWidth = 0.22 * M;
  ctx.setLineDash([1.4 * M, 1.1 * M]);
  ctx.strokeRect(px(-33), py(-31), 66 * M, 62 * M);
  ctx.setLineDash([]);

  // 引导线:中线黄色虚线,从画布底边引入至机头停止线
  ctx.strokeStyle = '#dcb13c';
  ctx.lineWidth = 0.45 * M;
  ctx.setLineDash([3 * M, 2 * M]);
  ctx.beginPath(); ctx.moveTo(px(0), S); ctx.lineTo(px(0), py(22)); ctx.stroke();
  ctx.setLineDash([]);

  // 停止杠(机头前方横线)+ 停止排灯(红色)
  ctx.lineWidth = 0.45 * M;
  ctx.beginPath(); ctx.moveTo(px(-5), py(21)); ctx.lineTo(px(5), py(21)); ctx.stroke();

  // 中线灯排(嵌入式绿灯,每 7.5m 一盏,自滑行道至停止线)
  const drawLight = (x, z, color, halo) => {
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(px(x), py(z), 0.75 * M, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(px(x), py(z), 0.42 * M, 0, Math.PI * 2); ctx.fill();
  };
  for (let z = 138; z >= 27; z -= 7.5) drawLight(0, z, '#3ddc84', 'rgba(61,220,132,0.28)');
  for (const x of [-4, -2, 0, 2, 4]) drawLight(x, 20.4, '#ff5252', 'rgba(255,82,82,0.3)');

  // 机位编号 "12"(白色大字,机头左侧,面向引导方向)
  ctx.fillStyle = 'rgba(245,248,252,0.88)';
  ctx.font = `bold ${Math.round(13 * M)}px ${'"PingFang SC","Microsoft YaHei",sans-serif'}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('12', px(-15), py(13));

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8; // createApronTexture 内先给默认值,渲染器就绪后再提升
  return tex;
}

/* ---------- 场景基座工厂 ---------- */

/**
 * 在 container 内创建完整 3D 场景。
 * @param {HTMLElement} container 画布容器(需有确定高度)
 * @param {object} options { cameraPos, target, fov, minDistance, maxDistance, maxPolar, night }
 * @returns 基座对象:{ scene, camera, renderer, controls, setNight, addTick, removeTick, dispose }
 */
export function createSceneBase(container, options = {}) {
  const opts = {
    cameraPos: [38, 11, 46],
    target: [0, 3.2, 0],
    fov: 40,
    minDistance: 10,
    maxDistance: 160,
    maxPolar: 87 * Math.PI / 180, // 限制俯仰角,防止翻到地面以下
    night: false,
    ...options,
  };

  /* 渲染器 */
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); // 像素比上限 2
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = DAY.exposure;
  container.appendChild(renderer.domElement);

  /* 相机 + 轨道控制 */
  const camera = new THREE.PerspectiveCamera(opts.fov, 1, 0.1, 1200);
  camera.position.set(...opts.cameraPos);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(...opts.target);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = opts.minDistance;
  controls.maxDistance = opts.maxDistance;
  controls.maxPolarAngle = opts.maxPolar;
  controls.update();

  /* 场景 + 雾(与地平线色融合,藏住地面边缘) */
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(DAY.fog, DAY.fogNear, DAY.fogFar);

  /* 天空 */
  const sky = createSkyMesh();
  paintSky(sky, DAY.skyZenith, DAY.skyHorizon);
  scene.add(sky);

  /* 停机坪地面:300m×300m,接收阴影 */
  const apronTex = createApronTexture();
  apronTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const apron = new THREE.Mesh(
    new THREE.PlaneGeometry(300, 300),
    new THREE.MeshStandardMaterial({ map: apronTex, roughness: 0.94, metalness: 0.0 }),
  );
  apron.rotation.x = -Math.PI / 2;
  apron.receiveShadow = true;
  scene.add(apron);

  /* 灯光:半球光 + 平行光(投影)+ 环境光 */
  const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x565b61, DAY.hemi);
  const sun = new THREE.DirectionalLight(DAY.sunColor, DAY.sun);
  sun.position.set(60, 80, 40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -75;
  sun.shadow.camera.right = 75;
  sun.shadow.camera.top = 75;
  sun.shadow.camera.bottom = -75;
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 280;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  const ambient = new THREE.AmbientLight(0xdfe8f5, DAY.ambient);
  scene.add(hemi, sun, ambient);

  /* 昼夜切换接口 */
  let isNight = opts.night;
  function setNight(on) {
    isNight = !!on;
    const pal = isNight ? NIGHT : DAY;
    paintSky(sky, pal.skyZenith, pal.skyHorizon);
    scene.fog.color.set(pal.fog);
    scene.fog.near = pal.fogNear;
    scene.fog.far = pal.fogFar;
    hemi.intensity = pal.hemi;
    sun.intensity = pal.sun;
    sun.color.set(pal.sunColor);
    ambient.intensity = pal.ambient;
    renderer.toneMappingExposure = pal.exposure;
  }
  if (isNight) setNight(true);

  /* 自适应尺寸:容器变化即重设相机宽高比与画布大小 */
  function resize() {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  /* 动画循环:先跑页面注册的 tick,再更新控制器并渲染 */
  const ticks = new Set();
  const clock = new THREE.Clock();
  let running = true;
  let rafId = 0;
  function frame() {
    if (!running) return;
    rafId = requestAnimationFrame(frame);
    const dt = clock.getDelta();
    for (const fn of ticks) fn(dt, clock.elapsedTime);
    controls.update();
    renderer.render(scene, camera);
  }
  rafId = requestAnimationFrame(frame);

  /* 完整释放:停循环 → 断开监听 → 遍历销毁几何/材质/贴图 → 释放渲染上下文 */
  function dispose() {
    running = false;
    cancelAnimationFrame(rafId);
    ro.disconnect();
    controls.dispose();
    scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      const mats = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : [];
      for (const m of mats) {
        for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap', 'alphaMap']) {
          if (m[key] && m[key].isTexture) m[key].dispose();
        }
        m.dispose();
      }
    });
    scene.clear();
    renderer.dispose();
    renderer.forceContextLoss();
    if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
  }

  return {
    scene, camera, renderer, controls,
    setNight, isNight: () => isNight,
    addTick: (fn) => ticks.add(fn),
    removeTick: (fn) => ticks.delete(fn),
    dispose,
  };
}
