/**
 * engine/hangarEnv.js — 航空公司室内维修大机库场景(查看页默认环境)
 *
 * 全程序化生成:环氧地坪 + 标线 / 肋板墙 + 柱列门式刚架 / 后墙大门(门板+警示条)/
 * 天窗带 + 灯具阵(昼/夜两态)+ 夜间点光 / 品牌面板与柱幅(默认波音/空客厂房,带 LOGO)。
 * 墙体与屋面全部单面(法线朝内):外部与俯视相机穿透,形成剖面展示效果。
 *
 * 品牌 API(P2 涂装引擎接入点):
 *   registerHangarBrand(def) 注册航司品牌(logoUrl 指向 assets/logos/<航司>.png);
 *   env.setBrand(key) 切换 —— 品牌面板/柱幅/门楣色带随之更换。
 *   切换涂装时由涂装层调用 setBrand(<航司>);未注册航司的涂装回退 boeing/airbus 厂房。
 */
import * as THREE from 'three';

/* 内部尺寸(米):宽 120(X ±60)/ 深 156(Z ±78)/ 高 34。容纳 747-8(翼展 68.4)余量充足 */
const W = 120, D = 156, H = 34;
const DOOR_W = 72, DOOR_H = 24; // 后墙大门(x ±36)

/* 品牌注册表:P2 航司涂装上线后由 registerHangarBrand 追加 */
export const HANGAR_BRANDS = {
  boeing: {
    key: 'boeing',
    factoryCn: '波音 · 埃弗雷特总装厂',
    factoryEn: 'BOEING EVERETT FACTORY',
    logoUrl: 'assets/logos/boeing.png',
    primary: '#0033a1', panelBg: '#f5f8fc',
  },
  airbus: {
    key: 'airbus',
    factoryCn: '空中客车 · 图卢兹总装线',
    factoryEn: 'AIRBUS TOULOUSE FINAL ASSEMBLY LINE',
    logoUrl: 'assets/logos/airbus.png',
    primary: '#00205b', panelBg: '#f4f6fa',
  },
};

/** 注册自定义品牌(P2:航司涂装 → 机库品牌联动)。重复 key 覆盖。 */
export function registerHangarBrand(def) {
  HANGAR_BRANDS[def.key] = { ...HANGAR_BRANDS[def.key], ...def };
}

/* ---------- 贴图工厂(Canvas) ---------- */

/** 肋板墙板:竖向波纹 + 底部深色裙带(1024×512,Repeat 横向平铺) */
function makeWallTexture() {
  const cv = document.createElement('canvas');
  cv.width = 1024; cv.height = 512;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#c9ced6';
  ctx.fillRect(0, 0, 1024, 512);
  for (let x = 0; x < 1024; x += 64) {
    const g = ctx.createLinearGradient(x, 0, x + 64, 0);
    g.addColorStop(0, 'rgba(255,255,255,0.28)');
    g.addColorStop(0.5, 'rgba(0,0,0,0.02)');
    g.addColorStop(0.82, 'rgba(20,26,34,0.20)');
    g.addColorStop(1, 'rgba(255,255,255,0.10)');
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, 64, 512);
  }
  ctx.fillStyle = '#8f97a3';
  ctx.fillRect(0, 470, 1024, 42);
  ctx.fillStyle = 'rgba(30,36,44,0.35)';
  ctx.fillRect(0, 466, 1024, 4);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

/**
 * 机库地坪:浅灰环氧 + 伸缩缝 + 机位标线(2048² 映射 120×156m)。
 * 画布 y 向下 = 世界 +Z(机尾方向),原点居中;大门在 −Z(画布上方)。
 */
function makeFloorTexture() {
  const S = 2048, MX = S / W, MZ = S / D, CX = S / 2, CZ = S / 2;
  const px = (x) => CX + x * MX, py = (z) => CZ + z * MZ;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#b4b9c0';
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = Math.random() < 0.5
      ? `rgba(70,76,84,${0.02 + Math.random() * 0.04})`
      : `rgba(244,247,250,${0.02 + Math.random() * 0.04})`;
    ctx.fillRect(Math.random() * S, Math.random() * S, 1 + Math.random() * 3, 1 + Math.random() * 3);
  }
  // 伸缩缝:12m 网格
  ctx.strokeStyle = 'rgba(62,68,76,0.35)';
  ctx.lineWidth = 2;
  for (let x = -W / 2; x <= W / 2; x += 12) { ctx.beginPath(); ctx.moveTo(px(x), 0); ctx.lineTo(px(x), S); ctx.stroke(); }
  for (let z = -D / 2; z <= D / 2; z += 12) { ctx.beginPath(); ctx.moveTo(0, py(z)); ctx.lineTo(S, py(z)); ctx.stroke(); }
  // 机位框(黄)+ 设备安全区(白虚线)
  ctx.strokeStyle = '#d8ad3a';
  ctx.lineWidth = 5;
  ctx.strokeRect(px(-26), py(-30), 52 * MX, 60 * MZ);
  ctx.strokeStyle = 'rgba(246,249,252,0.8)';
  ctx.lineWidth = 3;
  ctx.setLineDash([16, 12]);
  ctx.strokeRect(px(-33), py(-36), 66 * MX, 72 * MZ);
  ctx.setLineDash([]);
  // 牵引中线(黄虚线,−Z 朝大门)+ 停止杠
  ctx.strokeStyle = '#d8ad3a';
  ctx.lineWidth = 6;
  ctx.setLineDash([28, 20]);
  ctx.beginPath(); ctx.moveTo(px(0), py(-30)); ctx.lineTo(px(0), py(-70)); ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(px(-5), py(-30)); ctx.lineTo(px(5), py(-30)); ctx.stroke();
  // 大门内侧人字警示带(z −75..−71)
  ctx.strokeStyle = '#c8a72e';
  ctx.lineWidth = 10;
  for (let x = -DOOR_W / 2; x < DOOR_W / 2; x += 5) {
    ctx.beginPath(); ctx.moveTo(px(x), py(-71)); ctx.lineTo(px(x + 2.6), py(-75)); ctx.stroke();
  }
  // 工位编号
  ctx.fillStyle = 'rgba(248,250,253,0.9)';
  ctx.font = `bold ${Math.round(26 * MX)}px "Microsoft YaHei",sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('01', px(-16), py(-38));
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** 大门底部警示条(黄黑斜纹,512×64) */
function makeHazardTexture() {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 64;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#d8ad3a';
  ctx.fillRect(0, 0, 512, 64);
  ctx.fillStyle = '#23262b';
  for (let x = -64; x < 576; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 64); ctx.lineTo(x + 32, 0); ctx.lineTo(x + 64, 0); ctx.lineTo(x + 32, 64);
    ctx.closePath(); ctx.fill();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.repeat.set(18, 1);
  return tex;
}

/** 把透明底 LOGO 重绘为纯白剪影(深色柱幅上用) */
function whitenImage(img) {
  const cv = document.createElement('canvas');
  cv.width = img.width; cv.height = img.height;
  const ctx = cv.getContext('2d');
  ctx.drawImage(img, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, cv.width, cv.height);
  return cv;
}

/* ---------- 品牌面板 / 柱幅绘制 ---------- */

/** 后墙大面板:浅底 + 品牌色描边 + LOGO + 中英文厂名(2048×512 → 26×6.5m) */
function drawBrandPanel(ctx, brand, logoImg) {
  const Wc = ctx.canvas.width, Hc = ctx.canvas.height;
  ctx.clearRect(0, 0, Wc, Hc);
  ctx.fillStyle = brand.panelBg;
  ctx.fillRect(0, 0, Wc, Hc);
  const g = ctx.createLinearGradient(0, 0, 0, Hc);
  g.addColorStop(0, 'rgba(255,255,255,0.5)');
  g.addColorStop(1, 'rgba(20,30,48,0.10)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, Wc, Hc);
  ctx.strokeStyle = brand.primary;
  ctx.lineWidth = 14;
  ctx.strokeRect(24, 24, Wc - 48, Hc - 48);
  if (logoImg) {
    const maxW = Wc * 0.62, maxH = Hc * 0.52;
    const r = Math.min(maxW / logoImg.width, maxH / logoImg.height);
    const lw = logoImg.width * r, lh = logoImg.height * r;
    ctx.drawImage(logoImg, (Wc - lw) / 2, Hc * 0.13 + (maxH - lh) / 2, lw, lh);
  } else {
    // LOGO 加载失败的兜底:品牌字标文字
    ctx.fillStyle = brand.primary;
    ctx.font = `900 ${Math.round(Hc * 0.34)}px Arial,sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(brand.key.toUpperCase(), Wc / 2, Hc * 0.36);
  }
  ctx.fillStyle = brand.primary;
  ctx.font = `bold ${Math.round(Hc * 0.135)}px "Microsoft YaHei",sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(brand.factoryCn, Wc / 2, Hc * 0.78);
  ctx.fillStyle = 'rgba(52,60,72,0.75)';
  ctx.font = `500 ${Math.round(Hc * 0.072)}px Arial,sans-serif`;
  ctx.fillText(brand.factoryEn, Wc / 2, Hc * 0.905);
}

/** 柱幅:品牌色底 + 白色 LOGO 剪影 + 竖排厂名(512×2048 → 3.4×13.6m) */
function drawBanner(ctx, brand, whiteLogo) {
  const Wc = ctx.canvas.width, Hc = ctx.canvas.height;
  const g = ctx.createLinearGradient(0, 0, 0, Hc);
  g.addColorStop(0, brand.primary);
  g.addColorStop(1, '#0c1424');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, Wc, Hc);
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fillRect(0, Hc - 90, Wc, 90);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillRect(0, 0, Wc, 26);
  if (whiteLogo) {
    const r = Math.min(Wc * 0.8 / whiteLogo.width, 320 / whiteLogo.height);
    ctx.drawImage(whiteLogo, (Wc - whiteLogo.width * r) / 2, 210, whiteLogo.width * r, whiteLogo.height * r);
  }
  const chars = [...brand.factoryCn.split('·')[0].replace(/\s/g, '')];
  ctx.font = 'bold 150px "Microsoft YaHei",sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.94)';
  const startY = Hc * 0.42, step = 200;
  chars.slice(0, 8).forEach((ch, i) => ctx.fillText(ch, Wc / 2, startY + i * step));
}

/* ---------- 环境构建 ---------- */

/**
 * 构建机库内景并加入 scene。
 * @returns {object} { group, setNight(on), setBrand(key), dispose() }
 */
export function buildHangarEnv(scene, renderer) {
  const group = new THREE.Group();
  group.name = 'hangarEnv';
  const disposables = { textures: [], materials: [] };
  const mat = (opts) => {
    const m = new THREE.MeshStandardMaterial(opts);
    disposables.materials.push(m);
    return m;
  };
  const tex = (t) => { disposables.textures.push(t); return t; };

  const wallTex = tex(makeWallTexture());
  const wallMat = mat({ map: wallTex, roughness: 0.92, metalness: 0.05 });
  const steelMat = mat({ color: 0x3b434e, roughness: 0.55, metalness: 0.6 });
  const darkMat = mat({ color: 0x272c33, roughness: 0.95, metalness: 0.1 });

  const plane = (w, h, material) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);

  /* 地坪 */
  const floorTex = tex(makeFloorTexture());
  floorTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const floor = plane(W, D, mat({ map: floorTex, roughness: 0.5, metalness: 0.06 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.02;
  floor.receiveShadow = true;
  group.add(floor);

  /* 墙体(单面,法线朝内)与屋面 */
  wallTex.repeat.set(6, 2);
  const sideL = plane(D, H, wallMat);
  sideL.rotation.y = Math.PI / 2;
  sideL.position.set(-W / 2, H / 2, 0);
  const sideR = sideL.clone();
  sideR.rotation.y = -Math.PI / 2;
  sideR.position.x = W / 2;
  const frontWall = plane(W, H, wallMat);
  frontWall.rotation.y = Math.PI;
  frontWall.position.set(0, H / 2, D / 2);
  group.add(sideL, sideR, frontWall);

  // 后墙三段(留出门洞)
  wallTex.repeat.set(5, 2);
  const segSide = plane((W - DOOR_W) / 2, H, wallMat);
  const segL = segSide.clone(), segR = segSide.clone();
  segL.position.set(-(DOOR_W + (W - DOOR_W) / 2) / 2, H / 2, -D / 2);
  segR.position.set((DOOR_W + (W - DOOR_W) / 2) / 2, H / 2, -D / 2);
  const segTop = plane(DOOR_W, H - DOOR_H, wallMat);
  segTop.position.set(0, DOOR_H + (H - DOOR_H) / 2, -D / 2);
  group.add(segL, segR, segTop);

  const roof = plane(W, D, darkMat);
  roof.rotation.x = Math.PI / 2; // 法线朝下,俯视穿透
  roof.position.y = H;
  group.add(roof);

  /* 门式刚架柱列 + 屋面檩条(InstancedMesh) */
  const colGeo = new THREE.BoxGeometry(0.9, H, 0.9);
  const beamGeo = new THREE.BoxGeometry(W, 1.2, 0.6);
  const purlinGeo = new THREE.BoxGeometry(W - 2, 0.35, 0.45);
  const frameZ = [];
  for (let z = -72; z <= 72; z += 12) frameZ.push(z);
  const cols = new THREE.InstancedMesh(colGeo, steelMat, frameZ.length * 2);
  const beams = new THREE.InstancedMesh(beamGeo, steelMat, frameZ.length);
  const purlins = new THREE.InstancedMesh(purlinGeo, steelMat, 11);
  const m4 = new THREE.Matrix4();
  frameZ.forEach((z, i) => {
    m4.makeTranslation(-W / 2 + 0.9, H / 2, z); cols.setMatrixAt(i * 2, m4);
    m4.makeTranslation(W / 2 - 0.9, H / 2, z); cols.setMatrixAt(i * 2 + 1, m4);
    m4.makeTranslation(0, H - 0.7, z); beams.setMatrixAt(i, m4);
  });
  for (let i = 0; i < 11; i++) { m4.makeTranslation(0, H - 0.25, -66 + i * 13.2); purlins.setMatrixAt(i, m4); }
  group.add(cols, beams, purlins);

  /* 大门(横置门板)+ 底部警示条 */
  const slatGeo = new THREE.BoxGeometry(DOOR_W + 0.6, 2.0, 0.5);
  const slatMat = mat({ color: 0x9aa4b0, roughness: 0.5, metalness: 0.65 });
  const slats = new THREE.InstancedMesh(slatGeo, slatMat, 11);
  for (let i = 0; i < 11; i++) { m4.makeTranslation(0, 1.15 + i * 2.15, -D / 2 + 0.6); slats.setMatrixAt(i, m4); }
  const hazard = plane(DOOR_W, 1.1, mat({ map: tex(makeHazardTexture()), roughness: 0.85 }));
  hazard.position.set(0, 0.57, -D / 2 + 0.88);
  group.add(slats, hazard);

  /* 天窗带(昼)+ 灯具阵 */
  const skyTexGlow = mat({
    color: 0x0c0f14, emissive: 0xdfeaff, emissiveIntensity: 1.3, roughness: 0.4,
  });
  for (const x of [-28, 28]) {
    const strip = plane(8, D - 12, skyTexGlow);
    strip.rotation.x = Math.PI / 2;
    strip.position.set(x, H - 0.4, 0);
    group.add(strip);
  }
  const lampMat = mat({ color: 0xffffff, emissive: 0xf2f6ff, emissiveIntensity: 0.35, roughness: 0.6 });
  const lampGeo = new THREE.BoxGeometry(8, 0.25, 1.4);
  const lamps = new THREE.InstancedMesh(lampGeo, lampMat, 20);
  let li = 0;
  for (const x of [-20, 20]) for (let z = -67.5; z <= 67.5; z += 15) {
    m4.makeTranslation(x, H - 4, z); lamps.setMatrixAt(li++, m4);
  }
  group.add(lamps);

  /* 夜间点光(不投影,6 盏) */
  const pointLights = [];
  for (const z of [-45, 0, 45]) for (const x of [-20, 20]) {
    const p = new THREE.PointLight(0xe8f0ff, 0, 110, 2);
    p.position.set(x, H - 6, z);
    pointLights.push(p);
    group.add(p);
  }

  /* ---------- 品牌件:门楣色带 / 大面板 / 柱幅 ---------- */
  const bandMat = mat({ color: 0x0033a1, roughness: 0.6, metalness: 0.1 });
  const band = plane(W - 2, 2.4, bandMat);
  band.position.set(0, DOOR_H + 1.6, -D / 2 + 0.12);
  group.add(band);

  const panelCv = document.createElement('canvas');
  panelCv.width = 2048; panelCv.height = 512;
  const panelTex = tex(new THREE.CanvasTexture(panelCv));
  panelTex.colorSpace = THREE.SRGBColorSpace;
  panelTex.anisotropy = 8;
  const panelMat = mat({ map: panelTex, roughness: 0.55, metalness: 0.05 });
  const panel = plane(26, 6.5, panelMat);
  panel.position.set(0, DOOR_H + 6.2, -D / 2 + 0.14);
  group.add(panel);

  // 4 根柱幅共用一张贴图
  const bannerCv = document.createElement('canvas');
  bannerCv.width = 512; bannerCv.height = 2048;
  const bannerTex = tex(new THREE.CanvasTexture(bannerCv));
  bannerTex.colorSpace = THREE.SRGBColorSpace;
  bannerTex.anisotropy = 8;
  const bannerMat = mat({ map: bannerTex, roughness: 0.75, metalness: 0.0 });
  for (const [x, z] of [[-W / 2 + 1.4, 52], [W / 2 - 1.4, 52], [-W / 2 + 1.4, 68], [W / 2 - 1.4, 68]]) {
    const b = plane(3.4, 13.6, bannerMat);
    b.position.set(x, 8.6, z);
    b.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;
    group.add(b);
  }

  /* ---------- 品牌切换 ---------- */
  const imgCache = new Map(); // url → Promise<Image>
  const loadImage = (url) => {
    if (!imgCache.has(url)) {
      imgCache.set(url, new Promise((res, rej) => {
        const im = new Image();
        im.onload = () => res(im);
        im.onerror = () => rej(new Error(`LOGO 加载失败:${url}`));
        im.src = url;
      }));
    }
    return imgCache.get(url);
  };

  let disposed = false;
  let currentBrand = HANGAR_BRANDS.boeing;
  async function setBrand(key) {
    const brand = HANGAR_BRANDS[key] || HANGAR_BRANDS.boeing;
    currentBrand = brand;
    bandMat.color.set(brand.primary);
    let logo = null, white = null;
    try {
      logo = await loadImage(brand.logoUrl);
      if (disposed) return;
      white = whitenImage(logo);
    } catch (err) {
      console.warn('[hangarEnv]', err.message, '— 用文字兜底');
    }
    drawBrandPanel(panelCv.getContext('2d'), brand, logo);
    panelTex.needsUpdate = true;
    drawBanner(bannerCv.getContext('2d'), brand, white);
    bannerTex.needsUpdate = true;
  }

  /* ---------- 昼夜 ---------- */
  function setNight(on) {
    const night = !!on;
    lampMat.emissiveIntensity = night ? 2.0 : 0.35;
    skyTexGlow.emissiveIntensity = night ? 0.07 : 1.3;
    pointLights.forEach((p) => { p.intensity = night ? 1600 : 0; });
    bandMat.emissive.set(currentBrand.primary);
    bandMat.emissiveIntensity = night ? 0.5 : 0;
  }

  /* 初始品牌:默认波音(查看页会按机型厂商 setBrand 覆盖) */
  setBrand('boeing');

  scene.add(group);
  return {
    group,
    setNight,
    setBrand,
    dispose() {
      disposed = true;
      scene.remove(group);
      disposables.textures.forEach((t) => t.dispose());
      disposables.materials.forEach((m) => m.dispose());
      group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    },
  };
}
