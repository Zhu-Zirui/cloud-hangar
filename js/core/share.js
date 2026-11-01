/**
 * core/share.js — 分享卡片生成(P12)
 * 纯 canvas 绘制(1200×675),供机型查看页等复用:
 *  - drawShareCard({ title, subtitle, params, url, accent }) → HTMLCanvasElement
 *  - downloadCanvas(canvas, filename) → PNG 下载
 *  - copyText(text) → 剪贴板(clipboard API 优先,execCommand 兜底)
 * 卡片为位图,文案固定中文(与 og-image 同风格);站点 UI 文案走 i18n。
 */

const CARD_W = 1200, CARD_H = 675;
const NAVY_TOP = '#0d1a33', NAVY_BOT = '#0b1526';
const SKY = '#38bdf8';

/** 品牌风格分享卡片:title 主标题(机型名)、subtitle 副题、params [[k,v]...] 2×N、url 底部链接 */
export function drawShareCard({ title, subtitle, params = [], url = '', accent = SKY }) {
  const cv = document.createElement('canvas');
  cv.width = CARD_W; cv.height = CARD_H;
  const d = cv.getContext('2d');

  const bg = d.createLinearGradient(0, 0, 0, CARD_H);
  bg.addColorStop(0, NAVY_TOP); bg.addColorStop(1, NAVY_BOT);
  d.fillStyle = bg; d.fillRect(0, 0, CARD_W, CARD_H);

  // 上下装饰线 + 左侧品牌色竖条
  d.strokeStyle = 'rgba(56,189,248,0.28)'; d.lineWidth = 2;
  d.beginPath(); d.moveTo(64, 76); d.lineTo(CARD_W - 64, 76); d.stroke();
  d.beginPath(); d.moveTo(64, CARD_H - 76); d.lineTo(CARD_W - 64, CARD_H - 76); d.stroke();
  d.fillStyle = accent; d.fillRect(64, 142, 10, 158);

  const en = '"Segoe UI", Arial, sans-serif';
  const cn = '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", ' + en;

  d.textBaseline = 'alphabetic';
  d.fillStyle = '#f0f8ff';
  d.font = '700 84px ' + cn;
  d.fillText(title, 104, 228);
  d.fillStyle = accent;
  d.font = '600 44px ' + cn;
  d.fillText(subtitle, 106, 296);

  // 参数:3 列 × 2 行,值按键实际宽度对齐
  params.forEach(([k, v], i) => {
    const col = i % 3, row = (i / 3) | 0;
    const x = 104 + col * 352, y = 408 + row * 70;
    d.font = '400 30px ' + cn;
    d.fillStyle = 'rgba(190,208,227,0.85)';
    d.fillText(String(k), x, y);
    d.fillStyle = '#f0f8ff';
    d.font = '600 30px ' + cn;
    d.fillText(String(v), x + d.measureText(String(k)).width + 18, y);
  });

  d.fillStyle = '#8ca0b8';
  d.font = '400 28px ' + cn;
  d.fillText('AeroAtlas · 中国民航 3D 图鉴', 104, CARD_H - 138);
  d.fillStyle = accent;
  d.font = '600 30px ' + en;
  d.fillText(url, 104, CARD_H - 86);
  return cv;
}

/** canvas → PNG 下载 */
export function downloadCanvas(canvas, filename) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error('toBlob 失败')); return; }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      resolve();
    }, 'image/png');
  });
}

/** 复制文本(https/localhost 下走 clipboard API,否则 execCommand 兜底) */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
    return ok;
  }
}
