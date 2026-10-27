/**
 * interior/cockpit.js — P4 检查点 1:驾驶舱独立小场景(A320 风格玻璃座舱基准模板)
 * 自建封闭舱体防穿帮,不复用外部机身;窗外 = 基座天空 + 停机坪 + 程序化跑道。
 * 6 块 CanvasTexture 屏幕(PFD×2/ND×2/ECAM×2)由模拟状态 10Hz 重绘;
 * 油门杆可拖、顶板按钮可点亮、5 个相机预设平滑切换、起飞演示状态机(30-40s)。
 * 坐标约定:舱内局部系 原点=双座间地板,+Z 机头方向,机长 x=-0.55 / 副驾 x=+0.55。
 */
import * as THREE from 'three';
import { createSceneBase } from '../scene.js';

const C919 = { panel: 0x2b3138, trim: 0x3d5a75 }; // c919 变体面板配色微调(界面另标"示意")

/* ---------------- 通用小工具 ---------------- */
function box(w, h, d, mat) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); }
function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
/** 朝 target 平滑逼近(帧率无关) */
function damp(cur, tgt, rate, dt) { return lerp(cur, tgt, 1 - Math.exp(-rate * dt)); }

/* ---------------- 屏幕:CanvasTexture 工厂 ---------------- */
function makeScreen(w, h) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w / 1000, h / 1000),
    new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }), // 自发光 LCD 观感
  );
  return { cv, ctx: cv.getContext('2d'), tex, mesh, w, h };
}

/* ---- PFD:主飞行显示(姿态仪 + 速度带 + 高度带 + 升降率 + 航向带) ---- */
function drawPFD(s, ctx, w, h) {
  ctx.fillStyle = '#05070c'; ctx.fillRect(0, 0, w, h);
  const PPD = 5.2; // 姿态仪像素/度
  const cx = w * 0.44, cy = h * 0.46, aw = w * 0.5, ah = h * 0.8;

  /* 人工地平线:按 roll 旋转、按 pitch 平移的天空/地面 */
  ctx.save();
  ctx.beginPath(); ctx.rect(cx - aw / 2, cy - ah / 2, aw, ah); ctx.clip();
  ctx.translate(cx, cy); ctx.rotate(-s.roll * Math.PI / 180);
  const off = s.pitch * PPD;
  ctx.fillStyle = '#1470c4'; ctx.fillRect(-aw, -ah * 1.6 + off, aw * 2, ah * 1.6);
  ctx.fillStyle = '#7c4a1e'; ctx.fillRect(-aw, off, aw * 2, ah * 1.6);
  ctx.strokeStyle = '#f4f7fa'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-aw, off); ctx.lineTo(aw, off); ctx.stroke(); // 地平线
  // 俯仰梯度线:±5/10/15/20
  ctx.lineWidth = 2; ctx.font = '16px monospace'; ctx.fillStyle = '#e8eef4'; ctx.textAlign = 'center';
  for (const deg of [-20, -15, -10, -5, 5, 10, 15, 20]) {
    const y = off - deg * PPD, half = deg % 10 === 0 ? 46 : 24;
    ctx.strokeStyle = '#e8eef4';
    ctx.beginPath(); ctx.moveTo(-half, y); ctx.lineTo(half, y); ctx.stroke();
    if (deg % 10 === 0) { ctx.fillText(Math.abs(deg), half + 16, y + 5); ctx.fillText(Math.abs(deg), -half - 16, y + 5); }
  }
  ctx.restore();

  /* 坡度指示弧 + 游标 */
  ctx.strokeStyle = '#cfd8e2'; ctx.lineWidth = 2;
  for (const a of [-60, -45, -30, -20, -10, 0, 10, 20, 30, 45, 60]) {
    const rad = (-a - 90) * Math.PI / 180, r0 = ah / 2 + 2, r1 = a % 30 === 0 ? r0 - 14 : r0 - 8;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(rad) * r0, cy + Math.sin(rad) * r0);
    ctx.lineTo(cx + Math.cos(rad) * r1, cy + Math.sin(rad) * r1); ctx.stroke();
  }
  ctx.fillStyle = '#ffd24a';
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(-s.roll * Math.PI / 180);
  ctx.beginPath(); ctx.moveTo(0, -ah / 2 - 4); ctx.lineTo(-7, -ah / 2 - 16); ctx.lineTo(7, -ah / 2 - 16); ctx.fill();
  ctx.restore();

  /* 固定飞机符号(黄色) */
  ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 4;
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + dir * 14, cy); ctx.lineTo(cx + dir * 44, cy); ctx.lineTo(cx + dir * 44, cy + 10); ctx.stroke();
  }
  ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();

  /* 速度带(左)与高度带(右):滚动刻度 + 数值窗 */
  tape(s.spd, ctx, 0, 400, 10, 0.9, 0, 56, 'KT');
  tape(s.alt, ctx, 0, 5000, 100, 0.09, w - 92, w - 36, 'FT');
  /* 升降率(最右):竖条指针 */
  const vsx = w - 22, vsMid = cy, vsH = ah / 2;
  ctx.strokeStyle = '#39424e'; ctx.lineWidth = 1;
  ctx.strokeRect(vsx - 8, vsMid - vsH, 16, vsH * 2);
  ctx.fillStyle = '#101821'; ctx.fillRect(vsx - 8, vsMid - vsH, 16, vsH * 2);
  ctx.strokeStyle = '#9be870'; ctx.lineWidth = 5;
  const vy = clamp(s.vs / 4000, -1, 1) * vsH;
  ctx.beginPath(); ctx.moveTo(vsx, vsMid); ctx.lineTo(vsx, vsMid - vy); ctx.stroke();
  ctx.font = '14px monospace'; ctx.fillStyle = '#9be870'; ctx.textAlign = 'center';
  ctx.fillText(s.vs > 50 ? '+' + Math.round(s.vs / 10) * 10 : s.vs < -50 ? Math.round(s.vs / 10) * 10 : '0', vsx - 12, vsMid - vy - 6);

  /* 航向带(底部) */
  const hy = h - 26;
  ctx.fillStyle = '#0a0f16'; ctx.fillRect(0, hy - 20, w, 40);
  ctx.textAlign = 'center';
  for (let d = -60; d <= 60; d += 10) {
    const hd = ((Math.round(s.hdg / 10) * 10 + d) % 360 + 360) % 360;
    const x = cx + (d - (s.hdg - Math.round(s.hdg / 10) * 10)) * 3.4;
    if (x < 10 || x > w - 10) continue;
    ctx.strokeStyle = '#8a97a5'; ctx.beginPath(); ctx.moveTo(x, hy + 12); ctx.lineTo(x, hy + (hd % 30 === 0 ? 2 : 7)); ctx.stroke();
    if (hd % 30 === 0) { ctx.fillStyle = '#e8eef4'; ctx.font = '15px monospace'; ctx.fillText(hd === 0 ? '360' : String(hd).padStart(3, '0'), x, hy - 4); }
  }
  ctx.fillStyle = '#ffd24a';
  ctx.beginPath(); ctx.moveTo(cx, hy + 18); ctx.lineTo(cx - 6, hy + 16); ctx.lineTo(cx + 6, hy + 16); ctx.fill();
  ctx.fillStyle = '#0a0f16'; ctx.fillRect(cx - 24, hy - 18, 48, 18);
  ctx.strokeStyle = '#e8eef4'; ctx.strokeRect(cx - 24, hy - 18, 48, 18);
  ctx.fillStyle = '#e8eef4'; ctx.font = 'bold 16px monospace';
  ctx.fillText(String(Math.round(s.hdg) % 360).padStart(3, '0'), cx, hy - 4);
}

/** 竖直滚动刻度带(速度/高度共用):x0..x1 为带区,lo~hi 量程 */
function tape(cur, ctx, lo, hi, step, pxPerUnit, x0, x1, unit) {
  const h = ctx.canvas.height, midY = h * 0.46;
  ctx.fillStyle = '#10161f'; ctx.fillRect(x0, midY - h * 0.4, x1 - x0, h * 0.8);
  ctx.strokeStyle = '#39424e'; ctx.strokeRect(x0, midY - h * 0.4, x1 - x0, h * 0.8);
  ctx.font = '15px monospace'; ctx.textAlign = 'right';
  const half = (h * 0.4) / pxPerUnit;
  for (let v = Math.ceil((cur - half) / step) * step; v <= cur + half; v += step) {
    if (v < lo || v > hi) continue;
    const y = midY - (v - cur) * pxPerUnit;
    ctx.strokeStyle = '#8a97a5';
    ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x1 - (v % (step * 5) === 0 ? 16 : 8), y); ctx.stroke();
    if (v % (step * 5) === 0) { ctx.fillStyle = '#cdd6df'; ctx.fillText(String(v), x1 - 20, y + 5); }
  }
  /* 当前值数值窗 */
  ctx.fillStyle = '#05070c'; ctx.fillRect(x0, midY - 15, x1 - x0, 30);
  ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 2; ctx.strokeRect(x0, midY - 15, x1 - x0, 30);
  ctx.fillStyle = '#eef4fa'; ctx.font = 'bold 21px monospace'; ctx.textAlign = 'center';
  ctx.fillText(String(Math.round(cur)), (x0 + x1) / 2, midY + 7);
  ctx.font = '12px monospace'; ctx.fillStyle = '#7d8896'; ctx.fillText(unit, (x0 + x1) / 2, midY + h * 0.4 + 14);
}

/* ---- ND:导航显示(罗盘玫瑰 + 航向指标 + 速度矢量) ---- */
function drawND(s, ctx, w, h) {
  ctx.fillStyle = '#070b12'; ctx.fillRect(0, 0, w, h);
  const cx = w / 2, cy = h * 0.55, R = Math.min(w, h) * 0.42;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(s.hdg * Math.PI / 180); // 玫瑰随航向转,航向指标恒向上
  for (let a = 0; a < 360; a += 5) {
    const rad = a * Math.PI / 180, major = a % 30 === 0;
    ctx.strokeStyle = major ? '#e6edf4' : '#71808f';
    ctx.lineWidth = major ? 5 : 2.5;
    ctx.beginPath();
    ctx.moveTo(Math.cos(rad) * R, Math.sin(rad) * R);
    ctx.lineTo(Math.cos(rad) * (R - (major ? 22 : 11)), Math.sin(rad) * (R - (major ? 22 : 11)));
    ctx.stroke();
    if (a % 30 === 0) {
      ctx.save(); ctx.translate(Math.cos(rad) * (R - 40), Math.sin(rad) * (R - 40)); ctx.rotate(-s.hdg * Math.PI / 180);
      ctx.fillStyle = '#f2f7fb'; ctx.font = 'bold 24px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const card = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' }[a];
      ctx.fillText(card || String(a / 10).padStart(2, '0'), 0, 0);
      ctx.restore();
    }
  }
  for (const rr of [0.5, 1]) { // 距离环
    ctx.strokeStyle = 'rgba(160,175,190,.55)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 0, R * rr, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();

  /* 固定航向指标(洋红)+ 地速矢量(绿虚线) */
  ctx.strokeStyle = '#ff5fd8'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - R + 26); ctx.stroke();
  ctx.setLineDash([12, 9]); ctx.strokeStyle = '#7fe08a'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - R * 0.72); ctx.stroke(); // 速度矢量线
  ctx.setLineDash([]);
  /* 飞机符号(加粗填充) */
  ctx.fillStyle = '#f2f7fb';
  ctx.fillRect(cx - 18, cy - 3, 36, 6);
  ctx.fillRect(cx - 3, cy - 12, 6, 26);
  ctx.fillRect(cx - 12, cy + 9, 24, 5);

  ctx.fillStyle = '#f2f7fb'; ctx.font = 'bold 26px monospace'; ctx.textAlign = 'left';
  ctx.fillText('GS ' + Math.round(s.spd) + ' KT', 14, 32);
  ctx.fillText('HDG ' + String(Math.round(s.hdg) % 360).padStart(3, '0'), 14, 62);
  ctx.fillStyle = '#7fd0ff'; ctx.font = 'bold 20px monospace';
  ctx.fillText('MAP  10 NM', 14, h - 16);
}

/* ---- ECAM:上屏 E/WD(发动机参数) 下屏 CRUISE 摘要 ---- */
function drawECAM(s, ctx, w, h, lower) {
  ctx.fillStyle = '#05070c'; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#2c3642'; ctx.strokeRect(6, 6, w - 12, h - 12);
  ctx.fillStyle = '#8fe0ff'; ctx.font = 'bold 22px monospace'; ctx.textAlign = 'left';
  if (!lower) {
    ctx.fillText('N1 %  EGT °C  FF KG/H', 20, 36);
    for (let e = 0; e < 2; e++) {
      const bx = 14 + e * (w / 2), by = 56;
      /* N1 圆弧表 */
      const n1 = s.n1 + (e ? 0.4 : -0.4), frac = clamp((n1 - 20) / 80, 0, 1);
      ctx.strokeStyle = '#223040'; ctx.lineWidth = 13;
      ctx.beginPath(); ctx.arc(bx + 46, by + 62, 42, Math.PI * 0.75, Math.PI * 2.25); ctx.stroke();
      ctx.strokeStyle = frac > 0.95 ? '#ff9c4a' : '#8fe0ff';
      ctx.beginPath(); ctx.arc(bx + 46, by + 62, 42, Math.PI * 0.75, Math.PI * (0.75 + 1.5 * frac)); ctx.stroke();
      ctx.fillStyle = '#eef4fa'; ctx.font = 'bold 24px monospace'; ctx.textAlign = 'center';
      ctx.fillText(n1.toFixed(1), bx + 46, by + 68);
      ctx.font = '14px monospace'; ctx.fillStyle = '#7d8896'; ctx.fillText('ENG ' + (e + 1), bx + 46, by + 98);
      /* EGT 竖条 + 数字 */
      const eg = clamp((s.egt - 300) / 700, 0, 1), ex = bx + 104;
      ctx.fillStyle = '#223040'; ctx.fillRect(ex, by + 12, 16, 104);
      ctx.fillStyle = s.egt > 850 ? '#ff9c4a' : '#8fe0ff';
      ctx.fillRect(ex, by + 116 - 104 * eg, 16, 104 * eg);
      ctx.fillStyle = '#eef4fa'; ctx.font = 'bold 15px monospace'; ctx.textAlign = 'left';
      ctx.fillText('EGT ' + Math.round(s.egt), ex + 24, by + 30);
      ctx.fillText('FF ' + Math.round(s.ff), ex + 24, by + 56);
    }
    if (s.demo && s.phaseMsg) { // 演示提示行(E/WD 备忘区)
      ctx.fillStyle = '#9be870'; ctx.font = 'bold 18px monospace';
      ctx.fillText('> ' + s.phaseMsg, 20, h - 20);
    }
    } else {
    ctx.fillText('CRUISE', 24, 40);
    const rows = [['GW', (62.8 + s.ff * 0.00002).toFixed(1) + ' T'], ['TAT', '+12 °C'], ['FL', Math.round(s.alt / 100)],
      ['MACH', (s.spd / 660).toFixed(2)], ['LDG', s.gearDown ? 'DOWN' : 'UP'], ['FLAPS', s.flaps ? '1+F' : 'UP']];
    rows.forEach((r, i) => {
      const x = 30 + (i % 3) * (w / 3), y = 92 + Math.floor(i / 3) * 66;
      ctx.fillStyle = '#7d8896'; ctx.font = '16px monospace'; ctx.fillText(r[0], x, y);
      ctx.fillStyle = '#eef4fa'; ctx.font = 'bold 24px monospace'; ctx.fillText(r[1], x, y + 30);
    });
    ctx.fillStyle = '#7d8896'; ctx.font = '15px monospace';
    ctx.fillText('CAB PRESS … SYS 1 · HYD G+Y OK · APU OFF', 30, h - 26);
  }
}

/* ---------------- 顶板(OVERHEAD)标签纹理 ---------------- */
function overheadLabelTex(rows, cols, labels) {
  const W = 760, H = 560, cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#2c3138'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#c9d4df'; ctx.font = 'bold 17px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const cw = W / cols, ch = (H - 60) / rows;
  labels.forEach((t, i) => {
    const r = Math.floor(i / cols), c = i % cols;
    ctx.fillText(t, cw * c + cw / 2, 40 + ch * r + ch / 2);
  });
  ctx.fillStyle = '#8fa0b0'; ctx.font = 'bold 20px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillText('OVERHEAD · 灯光/燃油/液压/空调/电源/防冰/APU/氧气', W / 2, 22);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ---------------- 跑道纹理(简化:道面 + 中线虚线 + 边线) ---------------- */
function runwayTex() {
  const cv = document.createElement('canvas');
  cv.width = 128; cv.height = 1024;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#3c4046'; ctx.fillRect(0, 0, 128, 1024);
  ctx.fillStyle = '#e8ecef';
  ctx.fillRect(4, 0, 3, 1024); ctx.fillRect(121, 0, 3, 1024); // 边线
  for (let y = 0; y < 1024; y += 128) ctx.fillRect(62, y, 4, 70); // 中线虚线
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(1, 24);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
function runwayThresholdTex() {
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = 256;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#3c4046'; ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = '#e8ecef';
  for (let i = 0; i < 8; i++) ctx.fillRect(14 + i * 30, 20, 16, 90); // 入口琴键
  ctx.font = 'bold 64px monospace'; ctx.textAlign = 'center';
  ctx.save(); ctx.translate(128, 200); ctx.scale(1.6, 1); ctx.fillText('36', 0, 0); ctx.restore();
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ================= 主工厂 ================= */
export function createCockpit(container, opts = {}) {
  const { variantId = '', onToast = () => {}, onDoor = () => {} } = opts;
  const c919 = variantId === 'c919';
  const base = createSceneBase(container, {
    fov: 55,
    cameraPos: [0.55, 4.46, -0.1], target: [0, 4.4, 1.5],
    minDistance: 0.15, maxDistance: 3.2, maxPolar: Math.PI, // 全向自由观察(可钻到舱底)
  });
  base.controls.target.set(0, 4.4, 1.5);
  base.scene.fog.near = 420; base.scene.fog.far = 3000; // 雾推远:风挡外跑道可见

  /* 材质 */
  const mShell = new THREE.MeshStandardMaterial({ color: 0x262a30, roughness: 0.9, metalness: 0.08, side: THREE.DoubleSide });
  const mPanel = new THREE.MeshStandardMaterial({ color: c919 ? C919.panel : 0x31363d, roughness: 0.72, metalness: 0.15 });
  const mDark = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.85 });
  const mMetal = new THREE.MeshStandardMaterial({ color: 0x9aa2ab, roughness: 0.35, metalness: 0.8 });
  const mLever = new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: 0.6 });
  const mKnob = new THREE.MeshStandardMaterial({ color: 0xb8452e, roughness: 0.5 });
  const mGlass = new THREE.MeshPhysicalMaterial({ color: 0xbfd8ee, transparent: true, opacity: 0.13, roughness: 0.06, metalness: 0, side: THREE.DoubleSide, depthWrite: false });
  const mSeat = new THREE.MeshStandardMaterial({ color: 0x2d3a4d, roughness: 0.85 });
  const mSeatSide = new THREE.MeshStandardMaterial({ color: 0x1d2632, roughness: 0.9 });

  const G = new THREE.Group();
  G.position.set(0, 3.2, 0); // 舱体抬到驾驶舱眼高 ≈4.45m(贴近地面停放姿态)
  base.scene.add(G);

  /* ---------- 舱体:封闭六面 + 风挡 ---------- */
  const add = (m) => { G.add(m); return m; };
  const floor = box(3.4, 0.1, 3.2, new THREE.MeshStandardMaterial({ color: 0x1a1e24, roughness: 0.95 }));
  floor.position.set(0, -0.05, -0.1); add(floor);
  const ceil = box(3.4, 0.1, 3.2, mShell); ceil.position.set(0, 2.16, -0.1); add(ceil);
  for (const sx of [-1, 1]) {
    const wall = box(0.1, 2.2, 3.2, mShell); wall.position.set(sx * 1.7, 1.05, -0.1); add(wall);
    const win = box(0.06, 0.6, 0.62, mGlass); // 侧窗玻璃
    win.position.set(sx * 1.68, 1.5, 0.45); add(win);
  }
  /* 后隔板 + 中央舱门(点击进入客舱,走道连通) */
  for (const sx of [-1, 1]) {
    const seg = box(1.38, 2.2, 0.1, mShell); seg.position.set(sx * 1.01, 1.05, -1.62); add(seg);
  }
  const doorTop = box(0.64, 0.4, 0.1, mShell); doorTop.position.set(0, 1.95, -1.62); add(doorTop);
  const doorPanel = box(0.66, 1.76, 0.07, new THREE.MeshStandardMaterial({ color: 0x3a4048, roughness: 0.75 }));
  doorPanel.position.set(0, 0.89, -1.62); doorPanel.userData.isDoor = true; add(doorPanel);
  const doorHandle = box(0.05, 0.16, 0.03, mMetal); doorHandle.position.set(0.24, 0.95, -1.57); add(doorHandle);
  const doorSign = box(0.3, 0.1, 0.02, mDark); doorSign.position.set(0, 1.72, -1.57); add(doorSign);
  /* 风挡 3 面:前大块 + 两侧斜(下沿 1.2 = 仪表板上沿,眼高 1.26 起全宽视野) */
  const ws = [
    { w: 1.7, h: 0.85, x: 0, y: 1.60, z: 1.36, ry: 0 },
    { w: 0.62, h: 0.72, x: -1.0, y: 1.50, z: 1.2, ry: 0.62 },
    { w: 0.62, h: 0.72, x: 1.0, y: 1.50, z: 1.2, ry: -0.62 },
  ];
  for (const p of ws) {
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.h), mGlass);
    pane.position.set(p.x, p.y, p.z); pane.rotation.set(-0.3, p.ry, 0); add(pane);
  }
  for (const px of [-0.4, 0.4]) { // 中央风挡分隔柱
    const post = box(0.07, 0.9, 0.1, mPanel); post.position.set(px, 1.56, 1.34); post.rotation.x = -0.3; add(post);
  }
  /* 风挡雨刷 + 侧窗大块化 */
  for (const px of [-0.55, 0.55]) {
    const wiper = box(0.015, 0.5, 0.015, mDark); wiper.position.set(px, 1.32, 1.3); wiper.rotation.x = 0.4; wiper.rotation.z = px > 0 ? -0.25 : 0.25; add(wiper);
  }

  /* ---------- 主仪表板 + 遮光罩 + 6 屏 ---------- */
  // 仪表板顶(1.26)压到视线(1.26≈眼高4.46)之下,风挡下沿(1.2)起开阔视野
  const dash = box(2.5, 0.44, 0.12, mPanel); dash.position.set(0, 0.96, 1.18); dash.rotation.x = -0.12; add(dash);
  const kick = box(3.2, 0.9, 0.1, mDark); kick.position.set(0, 0.45, 1.22); add(kick); // 前挡板:封住仪表板下方视线
  const glare = box(2.6, 0.1, 0.42, mDark); glare.position.set(0, 1.06, 1.2); glare.rotation.x = 0.2; add(glare); // 遮光罩(压低:机长位可越过它看到 ~100m 外地面/跑道)
  const fcu = box(1.1, 0.13, 0.12, mPanel); // FCU 自动飞行面板条(中央)
  fcu.position.set(0, 1.10, 1.15); fcu.rotation.x = -0.25; add(fcu);
  for (const sx of [-1, 1]) for (let i = 0; i < 2; i++) { // FCU 旋钮:真机只在中央窗两侧,不摊满全宽
    const k = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.03, 12), i ? mMetal : mKnob);
    k.rotation.x = Math.PI / 2; k.position.set(sx * (0.4 + i * 0.1), 1.14, 1.17); add(k);
  }
  /* 屏位:机长 PFD/ND、中央 ECAM 上/下、副驾 ND/PFD(与真机镜像对称一致)。
     屏幕/标签面均需朝向驾驶员(-Z 侧):用 Group 旋转 y=π 翻面,纹理左右才不镜像。 */
  const SCREENS = {};
  const mk = (key, maker, x, y, z) => {
    const sc = maker();
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = Math.PI; // 翻面朝驾驶员(-Z),Canvas 文字不镜像
    sc.mesh.rotation.x = -0.12;
    g.add(sc.mesh);
    const fr = box((sc.w + 45) / 1000, (sc.h + 45) / 1000, 0.02, mDark); // 屏框(sc.w 是像素,必须换算成米!)
    fr.position.z = -0.016; fr.rotation.x = -0.12;
    g.add(fr);
    add(g);
    SCREENS[key] = sc;
  };
  const PFDm = () => makeScreen(380, 380), NDm = () => makeScreen(380, 380), ECm = () => makeScreen(400, 250);
  mk('pfdL', PFDm, 0.86, 0.98, 1.075);
  mk('ndL', NDm, 0.44, 0.98, 1.085);
  mk('ecamU', ECm, -0.06, 1.12, 1.09);
  mk('ecamL', ECm, -0.06, 0.84, 1.10);
  mk('ndR', NDm, -0.44, 0.98, 1.085);
  mk('pfdR', PFDm, -0.86, 0.98, 1.075);
  /* 两侧备用仪表小圆盘 */
  for (const sx of [-1, 1]) {
    const stby = new THREE.Mesh(new THREE.CircleGeometry(0.07, 20), new THREE.MeshBasicMaterial({ color: 0x24303c, side: THREE.DoubleSide }));
    stby.position.set(sx * 1.12, 0.98, 1.05); stby.rotation.x = -0.12; add(stby);
  }

  /* ---------- 顶板 OVERHEAD:标签底板 + 8×6 按钮阵列 ---------- */
  const OH_ROWS = 6, OH_COLS = 8;
  const ohPanel = box(1.62, 0.62, 0.06, mPanel);
  ohPanel.position.set(0, 2.02, 0.62); ohPanel.rotation.x = -0.62; add(ohPanel);
  const ohTex = overheadLabelTex(OH_ROWS, OH_COLS, ['灯光', '燃油', '液压', '空调', '电源', '防冰', 'APU', '氧气',
    '航行灯', '左泵', '1 发', '组件1', 'GEN1', '机翼', '主启', '机组',
    '着陆灯', '右泵', '2 发', '组件2', 'GEN2', '发动', '备启', '乘客',
    '频闪', '传输', 'APU泵', '再循环', 'APU发', '窗加', 'DC备', '服务',
    '转弯', '交输', '燃油泵', 'pack流', '汇流条', '探头', 'BAT1', '水废',
    '滑行灯', '配平', '备用泵', '增压', '静态', '风挡', 'BAT2', '呼叫']);
  const ohFace = new THREE.Mesh(new THREE.PlaneGeometry(1.56, 0.56),
    new THREE.MeshBasicMaterial({ map: ohTex, toneMapped: false, side: THREE.DoubleSide }));
  ohFace.rotation.order = 'YXZ';
  ohFace.rotation.y = Math.PI;       // 翻面朝下方的驾驶员
  ohFace.rotation.x = 0.62;          // 顶板俯仰角
  // 面板盒厚 0.06 且倾斜:标签面须沿法线放到盒前 0.045(半厚 0.03)处,否则埋进盒体
  ohFace.position.set(0, 2.02 - 0.581 * 0.045, 0.62 - 0.814 * 0.045); add(ohFace);
  const ohButtons = [];
  const cw = 1.56 / OH_COLS, ch = 0.56 / OH_ROWS;
  for (let r = 0; r < OH_ROWS; r++) for (let c = 0; c < OH_COLS; c++) {
    const b = box(cw * 0.52, ch * 0.42, 0.03, new THREE.MeshStandardMaterial({
      color: 0x3a4048, roughness: 0.6,
      emissive: 0xffc94a, emissiveIntensity: 0,
    }));
    // 与标签同一投影:局部 y 偏移 → (0, cos, -sin) 方向;按钮沿法线再凸出 0.03
    const dy = 0.28 - ch * (r + 0.5);
    const bx = -0.78 + cw * (c + 0.5);
    b.position.set(bx, 2.015 + dy * Math.cos(0.62) - 0.58 * 0.032, 0.622 - dy * Math.sin(0.62) - 0.81 * 0.032);
    b.rotation.order = 'YXZ'; b.rotation.y = Math.PI; b.rotation.x = 0.62;
    b.userData.ohIndex = r * OH_COLS + c; add(b); ohButtons.push(b);
  }
  // 初始点亮若干按钮(观感更真)
  [0, 2, 5, 9, 12, 18, 22, 25, 27, 34, 38, 41, 45].forEach((i) => { ohButtons[i].material.emissiveIntensity = 0.85; });

  /* ---------- 中央操纵台:油门×2(可拖) + 襟翼/起落架手柄 + 配平轮 ---------- */
  const ped = box(0.62, 0.62, 1.15, mPanel); ped.position.set(0, 0.31, 0.42); add(ped);
  const quadTop = box(0.6, 0.05, 0.6, mDark); quadTop.position.set(0, 0.63, 0.62); quadTop.rotation.x = 0.18; add(quadTop);
  /* 油门杆×2:杆身 + 操纵头,拖动改变 rotation.x(前推 = 加油门) */
  const throttles = [];
  for (const sx of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(sx * 0.11, 0.64, 0.72); pivot.rotation.x = 0.5; add(pivot);
    const rod = box(0.035, 0.3, 0.045, mLever); rod.position.y = 0.15; pivot.add(rod);
    const head = box(0.11, 0.055, 0.075, new THREE.MeshStandardMaterial({ color: 0x23262b, roughness: 0.4 }));
    head.position.y = 0.31; pivot.add(head);
    pivot.userData.isThrottle = sx; throttles.push(pivot);
  }
  /* FCU 数字窗:SPD/HDG/ALT 三窗口(canvas,随模拟联动) */
  const fcuCv = document.createElement('canvas'); fcuCv.width = 512; fcuCv.height = 96;
  const fcuCtx = fcuCv.getContext('2d');
  const fcuTex = new THREE.CanvasTexture(fcuCv); fcuTex.colorSpace = THREE.SRGBColorSpace;
  const fcuScr = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.115),
    new THREE.MeshBasicMaterial({ map: fcuTex, toneMapped: false }));
  fcuScr.rotation.order = 'YXZ'; fcuScr.rotation.y = Math.PI; fcuScr.rotation.x = -0.25;
  fcuScr.position.set(0, 1.07, 1.072); add(fcuScr); // 前于面板盒前脸,防共面
  function drawFCU() {
    const c = fcuCtx;
    c.fillStyle = '#0a0d12'; c.fillRect(0, 0, 512, 96);
    const win = (x, v) => {
      c.fillStyle = '#05070c'; c.fillRect(x, 22, 130, 52);
      c.strokeStyle = '#3a4652'; c.strokeRect(x, 22, 130, 52);
      c.fillStyle = '#7fe08a'; c.font = 'bold 34px monospace'; c.textAlign = 'center';
      c.fillText(v, x + 65, 60);
    };
    win(20, Math.round(S.spd));
    win(191, String(Math.round(S.hdg) % 360).padStart(3, '0'));
    win(362, Math.round(S.alt));
    fcuTex.needsUpdate = true;
  }

  /* 油门刻度盘(IDLE/CL/FLX/TOGA) */
  const quadLblCv = document.createElement('canvas'); quadLblCv.width = 256; quadLblCv.height = 128;
  const qlc = quadLblCv.getContext('2d');
  qlc.fillStyle = '#14161a'; qlc.fillRect(0, 0, 256, 128);
  qlc.fillStyle = '#c9d4df'; qlc.font = 'bold 22px "PingFang SC","Microsoft YaHei",sans-serif'; qlc.textAlign = 'center';
  ['IDLE', 'CL', 'FLX', 'TOGA'].forEach((t, i) => qlc.fillText(t, 34 + i * 62, 96));
  qlc.strokeStyle = '#5b6673'; for (let i = 0; i < 4; i++) { qlc.beginPath(); qlc.moveTo(34 + i * 62, 78); qlc.lineTo(34 + i * 62, 62); qlc.stroke(); }
  const quadLblTex = new THREE.CanvasTexture(quadLblCv); quadLblTex.colorSpace = THREE.SRGBColorSpace;
  const quadLbl = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.26), new THREE.MeshBasicMaterial({ map: quadLblTex, toneMapped: false }));
  quadLbl.rotation.order = 'YXZ';
  quadLbl.rotation.y = Math.PI;            // 从上方俯视时文字左右方向与驾驶员一致
  quadLbl.rotation.x = -Math.PI / 2 + 0.18;
  quadLbl.position.set(0, 0.66, 0.42); add(quadLbl);
  /* 襟翼手柄(槽内滑块) */
  const flapSlot = box(0.05, 0.02, 0.4, mDark); flapSlot.position.set(0.21, 0.64, 0.15); add(flapSlot);
  const flapLever = box(0.04, 0.1, 0.07, new THREE.MeshStandardMaterial({ color: 0xd9dee3, roughness: 0.4 }));
  flapLever.position.set(0.21, 0.68, 0.05); add(flapLever);
  /* 起落架手柄(带红色警示罩,演示收轮时扳起) */
  const gearPivot = new THREE.Group(); gearPivot.position.set(-0.2, 0.64, 0.12); add(gearPivot);
  const gearLeverM = box(0.035, 0.12, 0.045, mLever); gearLeverM.position.y = 0.06; gearPivot.add(gearLeverM);
  const gearKnob = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 10), mKnob);
  gearKnob.position.y = 0.13; gearPivot.add(gearKnob);
  /* 配平轮 */
  const trim = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.03, 20), mMetal);
  trim.rotation.z = Math.PI / 2; trim.position.set(0, 0.5, -0.05); add(trim);
  for (let i = 0; i < 10; i++) { // 配平轮辐条
    const sp = box(0.014, 0.17, 0.02, mDark);
    sp.position.set(0, 0.5, -0.05); sp.rotation.x = i * Math.PI / 5; sp.translateY(0); add(sp);
  }
  /* 基座后段:RMP 电台面板 ×2 + ATC/TCAS 面板(canvas 贴图 + 旋钮) */
  const pedRear = box(0.58, 0.44, 0.4, mPanel); pedRear.position.set(0, 0.22, -0.44); add(pedRear);
  const pedTop = box(0.56, 0.04, 0.38, mDark); pedTop.position.set(0, 0.45, -0.44); pedTop.rotation.x = 0.16; add(pedTop);
  {
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 200;
    const c = cv.getContext('2d');
    c.fillStyle = '#191d22'; c.fillRect(0, 0, 512, 200);
    const panel = (x, title) => {
      c.strokeStyle = '#3a4652'; c.strokeRect(x, 14, 150, 172);
      c.fillStyle = '#9fb4c8'; c.font = 'bold 17px monospace'; c.textAlign = 'center';
      c.fillText(title, x + 75, 38);
      c.fillStyle = '#05070c'; c.fillRect(x + 15, 52, 120, 34); // 频率窗
      c.strokeStyle = '#3a4652'; c.strokeRect(x + 15, 52, 120, 34);
      c.fillStyle = '#7fe08a'; c.font = 'bold 24px monospace';
      c.fillText(title.startsWith('RMP') ? '121.500' : '4063', x + 75, 76);
      for (let r = 0; r < 2; r++) for (let k = 0; k < 3; k++) { // 旋钮
        c.fillStyle = '#2e3338'; c.beginPath(); c.arc(x + 34 + k * 41, 116 + r * 42, 13, 0, Math.PI * 2); c.fill();
        c.strokeStyle = '#78838e'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(x + 34 + k * 41, 116 + r * 42); c.lineTo(x + 34 + k * 41 + 8, 106 + r * 42); c.stroke();
      }
    };
    panel(10, 'RMP 1'); panel(181, 'RMP 2'); panel(352, 'ATC');
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.2),
      new THREE.MeshBasicMaterial({ map: t, toneMapped: false }));
    face.rotation.order = 'YXZ'; face.rotation.y = Math.PI; face.rotation.x = 0.16 - Math.PI / 2;
    face.position.set(0, 0.473, -0.44); add(face);
  }
  /* ECAM 控制板(下屏正下方小面板) */
  {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 96;
    const c = cv.getContext('2d');
    c.fillStyle = '#191d22'; c.fillRect(0, 0, 256, 96);
    c.strokeStyle = '#3a4652'; c.strokeRect(4, 4, 248, 88);
    c.fillStyle = '#9fb4c8'; c.font = 'bold 15px monospace'; c.textAlign = 'center';
    c.fillText('ECAM CP', 128, 24);
    c.fillStyle = '#2e3338';
    for (let i = 0; i < 6; i++) c.fillRect(22 + i * 38, 40, 26, 18); // 功能键
    c.fillStyle = '#d9dee3'; c.font = '10px monospace';
    ['ENG', 'BLEED', 'HYD', 'ELEC', 'STS', 'CLR'].forEach((s, i) => c.fillText(s, 35 + i * 38, 53));
    c.fillStyle = '#2e3338'; c.fillRect(84, 68, 88, 16); // All/Recall
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
    const cp = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.11),
      new THREE.MeshBasicMaterial({ map: t, toneMapped: false }));
    cp.rotation.order = 'YXZ'; cp.rotation.y = Math.PI; cp.rotation.x = -0.12 - Math.PI / 2;
    cp.position.set(-0.06, 0.66, 1.135); add(cp);
  }
  /* 侧杆底座 + 遮阳板 */
  for (const sx of [-1, 1]) {
    const baseB = box(0.17, 0.07, 0.2, mDark); baseB.position.set(sx * 0.92, 0.715, 0.72); add(baseB);
    const visor = box(0.52, 0.018, 0.24, mDark); // 遮阳板(风挡上沿)
    visor.position.set(sx * 0.44, 2.08, 1.16); visor.rotation.x = -0.42; add(visor);
  }

  /* ---------- 侧杆 / 脚蹬 / 双座 ---------- */
  for (const sx of [-1, 1]) { // 侧杆:机长左侧、副驾右侧
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, 0.16, 10), mDark);
    stick.position.set(sx * 0.92, 0.82, 0.72); stick.rotation.z = sx * 0.15; add(stick);
    const grip = box(0.05, 0.09, 0.045, mDark); grip.position.set(sx * 0.925, 0.92, 0.7); grip.rotation.z = sx * 0.15; add(grip);
  }
  for (const sx of [-1, 1]) { // 脚蹬示意
    for (const fz of [0.98, 1.1]) {
      const pd = box(0.09, 0.1, 0.02, mDark); pd.position.set(sx * 0.3, 0.12, fz); pd.rotation.x = -0.5; add(pd);
    }
  }
  const mkSeat = (sx) => {
    const g = new THREE.Group();
    const cush = box(0.5, 0.1, 0.46, mSeat); cush.position.y = 0.52; g.add(cush);
    const back = box(0.5, 0.72, 0.1, mSeat); back.position.set(0, 0.9, -0.24); back.rotation.x = 0.12; g.add(back);
    const head = box(0.32, 0.2, 0.09, mSeatSide); head.position.set(0, 1.34, -0.3); g.add(head);
    for (const ax of [-1, 1]) {
      const arm = box(0.06, 0.05, 0.4, mSeatSide); arm.position.set(ax * 0.27, 0.64, -0.02); g.add(arm);
    }
    const baseB = box(0.44, 0.36, 0.4, mSeatSide); baseB.position.y = 0.28; g.add(baseB);
    g.position.set(sx * 0.56, 0, -0.28); g.rotation.y = 0; add(g);
    return g;
  };
  mkSeat(-1); mkSeat(1);

  /* ---------- 窗外:跑道(阈值段 + 中线虚线段) ----------
     整组挂 rwyGrp:随 S.alt 整体下沉/抬起,起飞"地面远去"、降落"地面迎面"。 */
  const rwyGrp = new THREE.Group(); base.scene.add(rwyGrp);
  base.scene.traverse((o) => { // 基座自带的停机坪是静态的,不随高度动 → 隐藏,地面统一归 rwyGrp
    if (o.isMesh && o.geometry && o.geometry.parameters && o.geometry.parameters.width === 300) o.visible = false;
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400),
    new THREE.MeshStandardMaterial({ color: 0x3e4638, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; rwyGrp.add(ground);
  const rDashTex = runwayTex();
  const rDash = new THREE.Mesh(new THREE.PlaneGeometry(45, 1700),
    new THREE.MeshStandardMaterial({ map: rDashTex, roughness: 0.95 }));
  rDash.rotation.x = -Math.PI / 2; rDash.position.set(0, 0.09, 130 + 850); rwyGrp.add(rDash);
  const rThr = new THREE.Mesh(new THREE.PlaneGeometry(45, 60),
    new THREE.MeshStandardMaterial({ map: runwayThresholdTex(), roughness: 0.95 }));
  // 默认 XYZ 欧拉序:先绕 z 面内翻 π(跑道号转正),再绕 x 放平——法线保持朝上
  rThr.rotation.x = -Math.PI / 2; rThr.rotation.z = Math.PI;
  rThr.position.set(0, 0.08, 100); rwyGrp.add(rThr);
  /* 云团(挂 rwyGrp,随高度一起沉/升):悬在空中,爬升时掠过,进近时迎面升起 */
  {
    const cMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 });
    const cGeo = new THREE.SphereGeometry(1, 10, 8);
    for (let i = 0; i < 16; i++) {
      const m = new THREE.Mesh(cGeo, cMat);
      const r = 6 + Math.random() * 12;
      m.scale.set(r, r * 0.42, r);
      m.position.set((Math.random() < 0.5 ? -1 : 1) * (20 + Math.random() * 60), 7 + Math.random() * 9, 150 + Math.random() * 560);
      rwyGrp.add(m);
    }
  }

  /* ---------- 模拟状态(自由 + 演示共用) ---------- */
  const S = {
    thr: 0, n1: 22, egt: 368, ff: 520,
    spd: 0, alt: 0, vs: 0, hdg: 358.4, pitch: 0, roll: 0,
    gearDown: true, flaps: 0,
    demo: false, kind: 'takeoff', phase: '', phaseT: 0, phaseMsg: '', ts: 0,
    called: null, // 降落高度门限呼叫去重
  };
  /* 标准英文飞行口令(Web Speech API,零音频资源) */
  function speak(text) {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US'; u.rate = 1.08;
      const en = speechSynthesis.getVoices().find((v) => v.lang && v.lang.startsWith('en'));
      if (en) u.voice = en;
      speechSynthesis.speak(u);
    } catch (err) { /* 语音不可用时静默跳过 */ }
  }
  const THR_MAX_FWD = -0.62, THR_IDLE = 0.62; // 油门杆姿态角范围
  function setThrottleVisual(v) {
    throttles.forEach((p) => { p.rotation.x = lerp(THR_IDLE, THR_MAX_FWD, v); });
  }
  setThrottleVisual(0);

  /* ---------- 演示状态机:推油门→滑跑→抬轮→爬升→收轮→3000ft 改平→复位 ---------- */
  function startDemo(kind = 'takeoff') {
    if (S.demo) return;
    S.kind = kind; S.called = {}; S.demo = true; S.phaseT = 0; S.roll = 0;
    if (kind === 'takeoff') {
      S.forceVs = false;
      Object.assign(S, { phase: 'spool', phaseMsg: '推油门 TOGA', spd: 0, alt: 0, vs: 0, pitch: 0, flaps: 1 });
      flapLever.position.z = 0.14;
      speak('Cabin crew, prepare for take off');
      onToast('起飞演示:TOGA → 100 节/V1/VR 抬轮 → 正爬升收轮 → 3000ft 改平');
    } else {
      S.forceVs = true; // 下滑/拉平的下沉率由进近阶段直控(常规公式只算爬升)
      Object.assign(S, { phase: 'approach', phaseMsg: '进近 1800FT 建立下滑', spd: 160, alt: 1800, vs: -1200, pitch: -1.5, thr: 0.35, gearDown: false, flaps: 1 });
      gearPivot.rotation.x = -1.9;
      speak('Cabin crew, prepare for landing');
      onToast('降落演示:1800ft 下滑 → 1000ft 放轮 → 50ft 拉平 → 接地减速');
    }
    flyTo('captain', 1.2);
  }
  function endDemo() {
    S.demo = false; S.phase = ''; S.phaseMsg = ''; S.forceVs = false;
    Object.assign(S, { thr: 0, spd: 0, alt: 0, vs: 0, pitch: 0, gearDown: true, flaps: 0 });
    gearPivot.rotation.x = 0; flapLever.position.z = 0.05;
    setThrottleVisual(0);
    onToast('演示结束,座舱已复位');
  }
  const callOnce = (key, alt, text) => { // 降落高度门限呼叫(只报一次)
    if (S.alt <= alt && !S.called[key]) { S.called[key] = 1; speak(text); }
  };
  const spdOnce = (key, spd, text) => { // 滑跑/减速速度呼叫(只报一次)
    if (S.spd >= spd && !S.called[key]) { S.called[key] = 1; speak(text); }
  };
  const TAKEOFF = { // 口令按 A320 标准:THRUST SET → 100KT → V1 → ROTATE → POSITIVE CLIMB → GEAR UP
    spool: { d: 3, enter() { S.phaseMsg = '推油门 TOGA'; },
      step(dt) { S.thr = damp(S.thr, 1, 1.4, dt); if (S.phaseT > 2.2 && !S.called.ts) { S.called.ts = 1; speak('Thrust set'); } },
      next: () => 'roll' },
    roll: { enter() { S.phaseMsg = '加速滑跑 · 100 节 V1'; },
      step(dt) {
        S.thr = 1;
        spdOnce('k100', 98, 'One hundred knots');
        spdOnce('v1', 148, 'V one');
      },
      next: () => (S.spd >= 150 ? 'rotate' : null) }, // VR 150
    rotate: { d: 3, enter() { S.phaseMsg = 'VR 抬前轮 +15°'; speak('Rotate'); },
      step(dt) { S.pitch = damp(S.pitch, 15, 1.6, dt); S.thr = 1; }, next: () => 'climb' },
    climb: { enter() { S.phaseMsg = '初始爬升 → 收轮'; speak('Positive climb'); },
      step(dt) {
        S.pitch = damp(S.pitch, 15, 2, dt);
        S.thr = damp(S.thr, 0.94, 1, dt);
        if (S.alt > 120 && S.gearDown) { S.gearDown = false; S.phaseMsg = '起落架手柄 UP · 收轮'; speak('Gear up'); }
        gearPivot.rotation.x = damp(gearPivot.rotation.x, S.gearDown ? 0 : -1.9, 3, dt);
        if (S.alt > 1000 && !S.called.k1) { S.called.k1 = 1; speak('One thousand'); }
      },
      next: () => (S.alt >= 3000 ? 'level' : null) },
    level: { d: 5, enter() { S.phaseMsg = '3000FT 改平'; speak('Level off, three thousand feet'); },
      step(dt) { S.pitch = damp(S.pitch, 2.5, 1.4, dt); S.thr = damp(S.thr, 0.7, 0.9, dt); S.vs = damp(S.vs, 0, 2.2, dt); },
      next: () => 'done' },
  };
  const LANDING = {
    approach: { enter() { S.phaseMsg = '下滑 · 1000FT 放轮'; speak('Flaps one'); },
      step(dt) {
        S.pitch = damp(S.pitch, -2, 1.2, dt);
        S.thr = damp(S.thr, 0.32, 1, dt);
        S.vs = damp(S.vs, S.alt > 500 ? -1200 : -800, 1.2, dt); // 下沉率直控(3° 下滑道)
        if (S.alt < 1000 && !S.called.k1) { S.called.k1 = 1; speak('One thousand'); S.phaseMsg = '放轮 · Landing check'; }
        if (S.alt < 1000 && !S.gearDown) { S.gearDown = true; speak('Landing gear down'); }
        if (S.alt < 900 && S.flaps !== 2) { S.flaps = 2; flapLever.position.z = 0.42; speak('Flaps full'); }
        gearPivot.rotation.x = damp(gearPivot.rotation.x, S.gearDown ? 0 : -1.9, 2.4, dt);
        callOnce('a500', 500, 'Five hundred');
        callOnce('a400', 400, 'Four hundred');
        callOnce('a300', 300, 'Three hundred');
        callOnce('a200', 200, 'Two hundred');
        callOnce('a100', 100, 'One hundred');
      },
      next: () => (S.alt <= 60 ? 'flare' : null) },
    flare: { enter() { S.phaseMsg = '50FT 拉平 · Retard'; speak('Fifty. Retard'); },
      step(dt) {
        S.pitch = damp(S.pitch, 2.5, 1.3, dt);
        S.thr = damp(S.thr, 0.06, 2, dt);
        S.vs = damp(S.vs, -360, 2.2, dt); // 拉平:下沉率收小到接地量级
      },
      next: () => (S.alt <= 1.2 ? 'rollout' : null) },
    rollout: { d: 5, enter() { S.phaseMsg = '接地 · 反推 · 减速'; speak('Reverse green, spoilers up'); },
      step(dt) {
        S.pitch = damp(S.pitch, 0, 2.5, dt);
        S.vs = 0; S.alt = 0;
        S.spd = damp(S.spd, 26, 0.55, dt); // 反推+刹车减速
        spdOnce('r70', 68, 'Seventy');
        spdOnce('r50', 48, 'Fifty');
        spdOnce('r30', 28, 'Thirty');
      },
      next: () => 'done' },
  };
  /* 物理积分(每 tick 调用,dt 已含演示时间倍率) */
  function simStep(dt) {
    S.n1 = damp(S.n1, 22 + S.thr * 78, 1.8, dt);
    S.egt = damp(S.egt, 368 + (S.n1 - 22) * 4.6, 0.8, dt);
    S.ff = damp(S.ff, 520 + (S.n1 - 22) * 68, 1, dt);
    const airborne = S.alt > 1 || S.vs > 10 || S.pitch > 3; // 抬轮即视为离地(避免 vs 死锁)
    if (airborne) {
      if (!S.forceVs) S.vs = damp(S.vs, Math.max(0, (S.pitch - 2)) * 340, 1.6, dt); // 爬升率由俯仰推出(进近/拉平时由阶段直控)
      S.alt = clamp(S.alt + S.vs * dt / 60, 0, 5000);
      const tgt = 140 + S.pitch * 4 + S.alt * 0.004;
      S.spd = Math.min(S.spd, Math.max(150, tgt + 20)); // 离地瞬间钳掉地面积速虚高
      S.spd = damp(S.spd, tgt, 1.2, dt);
    } else {
      const accel = Math.pow(Math.max(0, S.n1 - 22) / 78, 1.3) * 11 - 0.35;
      S.spd = Math.max(0, S.spd + accel * dt);
      S.vs = 0; S.alt = 0;
      if (S.spd > 152 && S.demo) S.pitch = Math.max(S.pitch, 0); // 达 VR 待 rotate 相接管
    }
    S.hdg = (S.hdg + dt * 0.4) % 360;
    if (S.demo) {
      S.ts += dt;
      const PH = S.kind === 'takeoff' ? TAKEOFF : LANDING;
      const ph = PH[S.phase];
      if (ph) {
        if (!ph._entered) { ph._entered = true; ph.enter && ph.enter(); }
        ph.step && ph.step(dt);
        S.phaseT += dt;
        const nx = ph.next && ph.next();
        // 有 d 的阶段按时长转移;无 d 的阶段(滑跑/爬升/进近/拉平)由 next() 按速度/高度门控
        if (ph.d ? S.phaseT >= ph.d : nx) {
          S.phaseT = 0; delete ph._entered;
          S.phase = ph.d ? (nx || 'done') : nx;
          if (S.phase === 'done') { endDemo(); }
          else if (PH[S.phase]) { PH[S.phase].enter && PH[S.phase].enter(); }
        }
      } else endDemo();
    }
  }

  /* ---------- 屏幕重绘(10Hz) ---------- */
  let redrawAcc = 1;
  function redrawScreens() {
    drawPFD(S, SCREENS.pfdL.ctx, SCREENS.pfdL.w, SCREENS.pfdL.h);
    drawPFD(S, SCREENS.pfdR.ctx, SCREENS.pfdR.w, SCREENS.pfdR.h);
    drawND(S, SCREENS.ndL.ctx, SCREENS.ndL.w, SCREENS.ndL.h);
    drawND(S, SCREENS.ndR.ctx, SCREENS.ndR.w, SCREENS.ndR.h);
    drawECAM(S, SCREENS.ecamU.ctx, SCREENS.ecamU.w, SCREENS.ecamU.h, false);
    drawECAM(S, SCREENS.ecamL.ctx, SCREENS.ecamL.w, SCREENS.ecamL.h, true);
    for (const k in SCREENS) SCREENS[k].tex.needsUpdate = true;
  }

  /* ---------- 相机预设 + 平滑切换 ---------- */
  const PRESETS = {
    captain:  { pos: [0.55, 4.46, -0.18], tgt: [0.05, 4.42, 1.7] },
    fo:       { pos: [-0.55, 4.46, -0.18], tgt: [-0.05, 4.42, 1.7] },
    rear:     { pos: [0, 4.82, -1.1], tgt: [0, 4.28, 1.2] },
    overhead: { pos: [-0.3, 4.6, -0.5], tgt: [0, 5.2, 0.6] },
    pedestal: { pos: [0.12, 4.88, -0.6], tgt: [0, 3.98, 0.5] },
    door:     { pos: [0, 4.4, -0.7], tgt: [0, 4.15, -1.62] },
  };
  let tween = null;
  function flyTo(key, dur = 0.9) {
    const p = PRESETS[key]; if (!p) return;
    tween = { t: 0, d: dur, p0: base.camera.position.clone(), p1: new THREE.Vector3(...p.pos),
      t0: base.controls.target.clone(), t1: new THREE.Vector3(...p.tgt) };
  }
  base.addTick((dt) => {
    if (!tween) return;
    tween.t = Math.min(1, tween.t + dt / tween.d);
    const e = tween.t < 0.5 ? 4 * tween.t ** 3 : 1 - Math.pow(-2 * tween.t + 2, 3) / 2;
    base.camera.position.lerpVectors(tween.p0, tween.p1, e);
    base.controls.target.lerpVectors(tween.t0, tween.t1, e);
    if (tween.t >= 1) tween = null;
  });
  base.controls.addEventListener('start', () => { tween = null; });

  /* ---------- 交互:油门拖动 + 顶板点击(raycaster 共用) ---------- */
  const ray = new THREE.Raycaster();
  const ptr = new THREE.Vector2();
  let dragging = null, dragY0 = 0, dragThr0 = 0;
  function setPtr(e) {
    const r = base.renderer.domElement.getBoundingClientRect();
    ptr.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    ptr.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    ray.setFromCamera(ptr, base.camera);
  }
  let doorFly = 0; // 舱门点击后运镜计时(>0 走向门口)
  const onDown = (e) => {
    setPtr(e);
    const throttleHit = ray.intersectObjects(throttles, true);
    if (throttleHit.length && !S.demo) {
      dragging = 'thr'; dragY0 = e.clientY; dragThr0 = S.thr;
      base.controls.enabled = false;
      return;
    }
    const doorHit = ray.intersectObjects([doorPanel], false); // 后舱门:点击进入客舱
    if (doorHit.length && !S.demo) {
      flyTo('door', 1.1); doorFly = 0.001;
      onToast('开启后舱门,前往客舱…');
      return;
    }
    const ohHit = ray.intersectObjects(ohButtons, false); // 顶板按钮:点击亮/暗
    if (ohHit.length) {
      const m = ohHit[0].object.material;
      m.emissiveIntensity = m.emissiveIntensity > 0.2 ? 0 : 0.85;
    }
  };
  const onMove = (e) => {
    if (dragging !== 'thr') return;
    S.thr = clamp(dragThr0 + (dragY0 - e.clientY) / 130, 0, 1); // 上拖 = 前推加油门
    setThrottleVisual(S.thr);
  };
  const onUp = () => {
    if (dragging === 'thr') { dragging = null; base.controls.enabled = true; }
  };
  const el = base.renderer.domElement;
  el.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);

  /* ---------- 主循环:物理 + 屏幕重绘 + 滑跑震感 + 演示运镜 ---------- */
  const camBase = new THREE.Vector3();
  let demoShake = 0;
  base.addTick((dt) => {
    // 演示时间倍率:滑跑/爬升 1.7,进近 2.4(1200fpm 下滑 87s 压到 ~36s),拉平 1.7 — 全程压进 40s 上下
    const scale = !S.demo ? 1
      : S.phase === 'approach' ? 2.4
      : (S.phase === 'roll' || S.phase === 'climb' || S.phase === 'flare') ? 1.7 : 1;
    simStep(dt * scale);
    redrawAcc += dt;
    if (redrawAcc >= 0.1) { redrawAcc = 0; redrawScreens(); drawFCU(); } // 10Hz 重绘 6 屏 + FCU
    /* 滑跑震感 + 演示俯仰运镜:机长位跟随机头姿态 */
    if (S.demo) {
      const p = PRESETS.captain;
      if (!tween && base.camera.position.distanceTo(new THREE.Vector3(...p.pos)) < 0.05) {
        if (camBase.lengthSq() === 0) camBase.copy(base.camera.position);
        const shake = S.alt < 5 && S.spd > 20 ? (S.spd / 150) * 0.006 : 0;
        demoShake = damp(demoShake, shake, 4, dt);
        base.camera.position.set(
          camBase.x + (Math.random() - 0.5) * demoShake,
          camBase.y + (Math.random() - 0.5) * demoShake,
          camBase.z);
        const look = new THREE.Vector3(0, 4.32 + Math.tan((S.pitch * 0.8) * Math.PI / 180) * 1.4, 1.5);
        base.camera.lookAt(look);
        base.controls.target.lerp(look, 0.2);
      }
    } else { camBase.set(0, 0, 0); demoShake = 0; }
    /* 滑跑时跑道虚线滚动(速度感);地面整体随高度升降(起飞下沉/降落迎面抬起) */
    rDashTex.offset.y -= (S.spd * 0.5144 * dt) / 71;
    if (rDashTex.offset.y < -1) rDashTex.offset.y += 1;
    rwyGrp.position.y = S.alt * 0.0022 - 0.007;
    /* 舱门运镜:走到门口后交棒路由切客舱 */
    if (doorFly > 0) {
      doorFly += dt;
      if (doorFly > 1.15) { doorFly = 0; onDoor(); }
    }
  });

  /* ---------- 夜间模式:舱内调暗、屏幕更亮(屏幕为 Basic 材质天然更醒目) ---------- */
  let night = false;
  const cabinLight = new THREE.PointLight(0xfff1dd, 1.1, 6, 1.6);
  cabinLight.position.set(0, 2.0, 0.3); G.add(cabinLight);
  const panelLight = new THREE.PointLight(0x9fc4ff, 0.5, 3, 2);
  panelLight.position.set(0, 1.5, 1.0); G.add(panelLight);
  function setNight(on) {
    night = !!on;
    cabinLight.intensity = night ? 0.28 : 1.1;
    cabinLight.color.set(night ? 0xffd9a8 : 0xfff1dd);
    panelLight.intensity = night ? 0.9 : 0.5;
    base.setNight(on);
  }

  window.__CH_COCKPIT = { S, SCREENS }; // 调试通道(模拟状态/屏幕画布)
  return {
    setNight, isNight: () => night,
    flyTo, startDemo, isDemo: () => S.demo,
    presets: [['captain', '机长位'], ['fo', '副驾位'], ['rear', '中央后视'], ['overhead', '顶板特写'], ['pedestal', '操纵台特写'], ['door', '后舱门']],
    dispose: () => {
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      rDashTex.dispose();
      ohTex.dispose(); quadLblTex.dispose();
      base.dispose();
    },
  };
}
