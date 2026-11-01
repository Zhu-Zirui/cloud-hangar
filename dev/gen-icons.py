# -*- coding: utf-8 -*-
"""
dev/gen-icons.py — PWA 图标与 OG 分享图生成(P12)
与 favicon 同源的飞机多边形(viewBox 32 直线段路径),高分辨率绘制后缩放抗锯齿。
产出 assets/icons/icon-192.png / icon-512.png / icon-maskable-512.png /
     apple-touch-icon.png(180) 与 assets/icons/og-image.png(1200x630)。
用法:python dev/gen-icons.py(仓库根目录执行;仅数据/素材变更时重跑)
"""
from PIL import Image, ImageDraw, ImageFont
import os

NAVY_TOP = (13, 26, 51)      # 渐变顶 #0d1a33
NAVY_BOT = (9, 15, 26)       # 渐变底 #0b1526
SKY = (56, 189, 248)         # 品牌天蓝 #38bdf8
WHITE = (240, 248, 255)

# favicon 的飞机路径(viewBox 32,纯直线段)
PLANE_32 = [(16, 5), (18, 14), (27, 18), (27, 20), (18, 18), (17.5, 24), (21, 26),
            (21, 27.5), (16, 26), (11, 27.5), (11, 26), (14.5, 24), (14, 18),
            (5, 20), (5, 18), (14, 14)]

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'icons')
os.makedirs(OUT, exist_ok=True)


def vgrad(size, top, bot):
    """垂直渐变底图"""
    img = Image.new('RGB', (size, size))
    px = img.load()
    for y in range(size):
        t = y / (size - 1)
        c = tuple(round(top[i] + (bot[i] - top[i]) * t) for i in range(3))
        for x in range(size):
            px[x, y] = c
    return img


def draw_glyph(img, size, plane_scale, ring, stroke_scale=1.0):
    """画品牌环 + 飞机;plane_scale=飞机占画面比例,ring=是否画外环"""
    d = ImageDraw.Draw(img)
    if ring:
        r = 15 / 32 * size
        cx = cy = size / 2
        d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=SKY + (140,), width=max(2, round(1.5 / 32 * size * stroke_scale)))
    pts = [(x / 32 * plane_scale * size + size * (1 - plane_scale) / 2,
            y / 32 * plane_scale * size + size * (1 - plane_scale) / 2) for x, y in PLANE_32]
    d.polygon(pts, fill=SKY)
    return img


def rounded_mask(size, radius):
    m = Image.new('L', (size, size), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return m


def make_icon(out_name, out_size, plane_scale, ring, maskable=False):
    hi = 1024
    img = vgrad(hi, NAVY_TOP, NAVY_BOT).convert('RGBA')
    draw_glyph(img, hi, plane_scale, ring)
    if maskable:
        # maskable:安全区内缩,背景满幅不透明(系统圆形裁切不切到飞机)
        img = draw_glyph(vgrad(hi, NAVY_TOP, NAVY_BOT).convert('RGBA'), hi, plane_scale, False)
    else:
        img.putalpha(rounded_mask(hi, round(hi * 0.19)))
    img = img.resize((out_size, out_size), Image.LANCZOS)
    img.save(os.path.join(OUT, out_name))
    print('OK', out_name, img.size)


def load_font(size, bold=False):
    cands = ['msyhbd.ttc' if bold else 'msyh.ttc',
             'simhei.ttf' if not bold else 'simhei.ttf',
             'arialbd.ttf']
    for f in cands:
        p = os.path.join(r'C:\Windows\Fonts', f)
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()


def make_og():
    W, H = 1200, 630
    img = vgrad(W, NAVY_TOP, NAVY_BOT).convert('RGBA')
    d = ImageDraw.Draw(img)
    # 右侧大飞机 + 外环装饰
    glyph = Image.new('RGBA', (560, 560), (0, 0, 0, 0))
    draw_glyph(glyph, 560, 0.82, True)
    img.alpha_composite(glyph, (W - 620, (H - 560) // 2))
    # 细网格点缀(航空图感):横向两条天蓝细线
    for y in (86, H - 86):
        d.line([(64, y), (W - 64, y)], fill=SKY + (60,), width=2)
    f1 = load_font(92, bold=True)
    f2 = load_font(44)
    f3 = load_font(34)
    d.text((72, 150), '云端机库', font=f1, fill=WHITE)
    d.text((74, 272), '中国民航 3D 图鉴', font=f2, fill=SKY)
    d.text((74, 386), '机型 3D · 涂装 · 机场 · 百科 · 答题', font=f3, fill=(190, 208, 227))
    d.text((74, 492), 'zhu-zirui.github.io/cloud-hangar', font=f3, fill=(140, 160, 184))
    img.convert('RGB').save(os.path.join(OUT, 'og-image.png'))
    print('OK og-image.png', (W, H))


make_icon('icon-192.png', 192, 0.72, True)
make_icon('icon-512.png', 512, 0.72, True)
make_icon('icon-maskable-512.png', 512, 0.56, False, maskable=True)
make_icon('apple-touch-icon.png', 180, 0.74, True, maskable=True)
make_og()
print('全部完成 →', OUT)
