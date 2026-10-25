/**
 * ui/hangar.js — 机库首页(#/hangar)
 * hero 区:文案 + 3D 场景(场景基座 + 占位验证机 + 1.8m 人形剪影立牌)
 * 机队区:12 个机型卡片栅格(读 data/aircraft/*.json,P1 迁移完成)
 */
import * as THREE from 'three';
import { createSceneBase } from '../scene.js';
import { loadAllVariants } from '../engine/aircraft.js';
import { getAllLiveries } from '../engine/livery.js';
import { storeGet } from '../core/store.js';

/* 机型卡片:数据来自 data/aircraft/*.json(仅真实模型变体,loadAllVariants 已过滤) */
const CARD_DESC = {
  b738: '波音 737NG 系列中坚,国内航线最常见的窄体机之一。',
  a20n: '空客窄体销量王牌,鲨鳍小翼与大直径发动机一眼可辨。',
  a21n: '窄体加长旗舰,国内干线和热点商务航线的主力机型。',
  a332: '中远程宽体双发,航程突出,长期服务洲际航线。',
  a333: 'A330 加长客运型,国内区域宽体与客改货市场的常客。',
  b788: '梦想客机首发型号,复合材料机身与超大舷窗是标志。',
  b789: '787 加长型,国内航司洲际航线的主力宽体之一。',
  a359: '空客新一代宽体,XWB 复合机翼与"墨镜"式风挡醒目。',
  b748: '珍宝巨机最新一代,国内当前以国航客机为主。',
};

/* 机型卡顶部:自绘民航客机俯视剪影(内联 SVG) */
const SILHOUETTE_SVG = `
<svg viewBox="0 0 96 72" fill="none" stroke="currentColor" stroke-width="1.6"
     stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">
  <path d="M48 3 C49.6 3 50.8 6.5 51 12 L51 38 L51.6 58 L49.6 67 L48 69 L46.4 67 L44.4 58 L45 38 L45 12 C45.2 6.5 46.4 3 48 3 Z"/>
  <path d="M45.6 31 L9 45 L9 49 L45.6 39 Z"/>
  <path d="M50.4 31 L87 45 L87 49 L50.4 39 Z"/>
  <path d="M46.4 57 L34 64 L34 66.5 L46.4 62.5 Z"/>
  <path d="M49.6 57 L62 64 L62 66.5 L49.6 62.5 Z"/>
  <rect x="19" y="36" width="6.5" height="9" rx="2.2"/>
  <rect x="70.5" y="36" width="6.5" height="9" rx="2.2"/>
</svg>`;

/* ---------- 占位验证机(P1 由 engine/ 参数化整机取代) ---------- */

/** 胶囊机身 + 板状平直翼 + 垂尾/平尾 + 简易起落架,浅灰材质 */
function buildPlaceholderPlane() {
  const g = new THREE.Group();
  const gray = new THREE.MeshStandardMaterial({ color: 0xd8dde3, roughness: 0.42, metalness: 0.22 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x39424d, roughness: 0.55, metalness: 0.35 });

  // 机身:胶囊(半径 1.85m,柱段 33m → 全长约 36.7m,近似 737 级),机头朝 +Z
  const fuselage = new THREE.Mesh(new THREE.CapsuleGeometry(1.85, 33, 10, 24), gray);
  fuselage.geometry.rotateX(Math.PI / 2);
  fuselage.position.y = 3.1;
  g.add(fuselage);

  // 机翼:板状平直翼(翼展 35m)
  const wing = new THREE.Mesh(new THREE.BoxGeometry(35, 0.38, 3.4), gray);
  wing.position.set(0, 2.7, 0.8);
  g.add(wing);

  // 平尾 + 垂尾
  const hstab = new THREE.Mesh(new THREE.BoxGeometry(12.6, 0.3, 2.2), gray);
  hstab.position.set(0, 3.7, -16.4);
  const vstab = new THREE.Mesh(new THREE.BoxGeometry(0.34, 6.4, 4.3), gray);
  vstab.position.set(0, 6.1, -16.6);
  g.add(hstab, vstab);

  // 发动机短舱(占位圆柱 ×2,含深色进气口环)
  const podGeo = new THREE.CylinderGeometry(1.0, 0.92, 3.1, 20);
  podGeo.rotateX(Math.PI / 2);
  const ringGeo = new THREE.CylinderGeometry(0.86, 0.86, 0.14, 20);
  ringGeo.rotateX(Math.PI / 2);
  for (const sx of [-5.4, 5.4]) {
    const pod = new THREE.Mesh(podGeo, gray);
    pod.position.set(sx, 2.1, 1.0);
    const ring = new THREE.Mesh(ringGeo, dark);
    ring.position.set(sx, 2.1, 2.58);
    g.add(pod, ring);
  }

  // 简易起落架:1 前支柱 + 2 主支柱,让占位机"落地"
  const strutGeo = new THREE.CylinderGeometry(0.11, 0.11, 2.05, 10);
  const wheelGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.3, 16);
  wheelGeo.rotateZ(Math.PI / 2); // 轮轴沿 X
  for (const [gx, gz] of [[0, 12.2], [-1.95, -1.6], [1.95, -1.6]]) {
    const strut = new THREE.Mesh(strutGeo, dark);
    strut.position.set(gx, 1.03, gz);
    const wheel = new THREE.Mesh(wheelGeo, dark);
    wheel.position.set(gx, 0.46, gz);
    g.add(strut, wheel);
  }

  // 机背红色防撞灯(闪烁,顺便验证动画循环)
  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xff4444, emissive: 0xff2020, emissiveIntensity: 2 }),
  );
  beacon.name = 'beacon';
  beacon.position.set(0, 5.0, -6);
  g.add(beacon);

  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

/** 1.8m 人形剪影立牌:Canvas 画剪影,双面贴片,旁置对比比例 */
function buildHumanStandee() {
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 512;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#16222f';
  ctx.beginPath(); // 头
  ctx.arc(128, 58, 32, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); // 肩、身、双腿剪影(画布 512px 高 ↔ 2.1m,人形约 440px ↔ 1.8m)
  ctx.moveTo(72, 116);
  ctx.quadraticCurveTo(74, 96, 102, 92);
  ctx.quadraticCurveTo(128, 84, 154, 92);
  ctx.quadraticCurveTo(182, 96, 184, 116);
  ctx.lineTo(170, 300);
  ctx.lineTo(164, 460); ctx.lineTo(138, 460); ctx.lineTo(132, 320);
  ctx.lineTo(124, 320); ctx.lineTo(118, 460); ctx.lineTo(92, 460); ctx.lineTo(86, 300);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#7fd4ff';
  ctx.font = '600 44px Consolas, "SF Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('1.8 m', 128, 504);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const standee = new THREE.Mesh(
    new THREE.PlaneGeometry(1.05, 2.1),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide }),
  );
  standee.position.set(9, 1.05, 9); // 机头右侧
  return standee;
}

/** 机库内悬浮标签 Sprite(Canvas 文字) */
function buildLabelSprite(text) {
  const cv = document.createElement('canvas');
  cv.width = 640;
  cv.height = 150;
  const ctx = cv.getContext('2d');
  ctx.beginPath();
  ctx.roundRect(8, 8, 624, 134, 26);
  ctx.fillStyle = 'rgba(7,15,28,0.85)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(56,189,248,0.85)';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = '#eaf3fc';
  ctx.font = 'bold 56px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 320, 78);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sprite.renderOrder = 999;
  sprite.scale.set(11, 11 * 150 / 640, 1); // 保持画布宽高比
  return sprite;
}

/* ---------- 页面渲染 ---------- */

export function render(container) {
  container.innerHTML = `
  <div class="container">
    <section class="hero">
      <div class="hero-copy glass-card anim-fade-up">
        <div class="hero-en">CLOUD HANGAR · CHINA CIVIL AVIATION 3D</div>
        <h1>云端机库</h1>
        <p class="hero-desc">高精度参数化还原中国各航司主力客机与国产 C919:
          360° 赏机、切换真实涂装、点选部件学知识——你的私人民航图鉴机库。</p>
        <div class="hero-chips">
          <span class="chip">360° 赏机</span><span class="chip">涂装切换</span>
          <span class="chip">部件知识</span><span class="chip">机场图鉴</span>
        </div>
        <div class="hero-actions">
          <button class="btn btn-primary" id="btn-goto-fleet">浏览机队 ↓</button>
          <a class="btn btn-ghost" href="#/wiki">了解项目</a>
        </div>
      </div>
      <div class="hero-stage glass-card hud-frame anim-fade-up anim-delay-1">
        <div class="stage-3d" id="hero-3d"></div>
        <div class="stage-flag">PLACEHOLDER · 占位机,P1 替换</div>
        <div class="stage-hint">
          <span>拖拽 旋转</span><span>滚轮 缩放</span><span>右键 平移</span>
        </div>
      </div>
    </section>

    <section id="fleet">
      <h2 class="section-title">机队图鉴
        <span class="sub">FLEET · 12 VARIANTS · 点击卡片进入机库</span>
      </h2>
      <div class="grid grid-cards" id="fleet-cards">
        <div class="v-loading" style="grid-column:1/-1;position:static;padding:40px 0"><div class="ring"></div>加载机型数据…</div>
      </div>
    </section>
  </div>`;

  /* 机队卡片:异步读全量变体 JSON;涂装角标读 liveries.json(可切换涂装数) */
  let disposed = false;
  Promise.all([loadAllVariants(), getAllLiveries().catch(() => ({ liveries: [] }))]).then(([variants, lv]) => {
    if (disposed) return;
    const wrap = container.querySelector('#fleet-cards');
    if (!wrap) return;
    const lvCount = {};
    for (const l of lv.liveries) lvCount[l.variant] = (lvCount[l.variant] || 0) + 1;
    const exploredN = (storeGet('exploredParts', []) || []).length;   // P3 部件打卡进度
    wrap.innerHTML = variants.map((v, i) => `
      <article class="ac-card glass-card anim-fade-up anim-delay-${(i % 3) + 1}">
        <div class="collect-badge" title="涂装收集进度(P6 启用)"><span class="dot"></span>收集 --</div>
        <div class="livery-badge" title="该机型可选涂装数量(含原厂)">涂装 ×${(lvCount[v.id] || 0) + 1}</div>
        <div class="parts-badge" title="部件图鉴探索进度(共 30 项)">部件 ${exploredN}/30</div>
        <div class="ac-family">${v.familyCn}</div>
        <h3>${v.cnName.replace(/^空客 |^波音 |^中国商飞 /, '')}</h3>
        <div class="ac-art">${SILHOUETTE_SVG}</div>
        <p class="ac-desc">${CARD_DESC[v.id] || ''}</p>
        <a class="btn btn-ghost btn-sm" href="#/aircraft/${v.id}">进入机库 →</a>
      </article>`).join('');
  }).catch((err) => console.error('[hangar] 机型数据加载失败:', err));

  /* 3D 场景:基座 + 占位验证机 + 剪影立牌 + 悬浮标签 */
  const stageEl = container.querySelector('#hero-3d');
  const base = createSceneBase(stageEl, {
    cameraPos: [40, 12, 48],
    target: [0, 3.5, 0],
    minDistance: 12,
    maxDistance: 150,
  });
  base.scene.add(buildPlaceholderPlane());
  base.scene.add(buildHumanStandee());
  const label = buildLabelSprite('占位验证机 · P1 替换');
  label.position.set(0, 11, 0);
  base.scene.add(label);

  // 防撞灯闪烁(验证动画循环通、tick 可用)
  const beacon = base.scene.getObjectByName('beacon');
  base.addTick((_dt, t) => {
    beacon.material.emissiveIntensity = Math.sin(t * 4.2) > 0.55 ? 3.4 : 0.3;
  });

  // 无人操作时缓慢自转展示,用户接管即停
  base.controls.autoRotate = true;
  base.controls.autoRotateSpeed = 0.55;
  base.controls.addEventListener('start', () => { base.controls.autoRotate = false; });

  // "浏览机队"平滑滚动
  const btn = container.querySelector('#btn-goto-fleet');
  const fleet = container.querySelector('#fleet');
  const onGoFleet = () => fleet.scrollIntoView({ behavior: 'smooth' });
  btn.addEventListener('click', onGoFleet);

  // 清理:移除 DOM 监听 + 完整释放 3D 场景(防内存泄漏)
  return () => {
    disposed = true;
    btn.removeEventListener('click', onGoFleet);
    base.dispose();
  };
}
