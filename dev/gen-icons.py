# -*- coding: utf-8 -*-
"""
dev/gen-icons.py — PWA 图标 / OG 分享图 / README 品牌图生成(P12 建立,P14 品牌改版重绘)
与 assets/logo.svg 同源的 AeroAtlas「AA 双翼编队」构图:
AeroAtlas 简称 AA = 中国民航 CAAC 的中间两个字母;每个字母 A 同时是一架三角翼飞机,
双机沿轨道弧编队爬升,外圈徽章环 = atlas/地球。
高分辨率绘制后缩放抗锯齿。
产出 assets/icons/icon-192.png / icon-512.png / icon-maskable-512.png /
     apple-touch-icon.png(180) / og-image.png(1200x630) 与 assets/logos/brand.png(1120x340)。
用法:python dev/gen-icons.py(仓库根目录执行;仅品牌素材变更时重跑)
"""
from PIL import Image, ImageDraw, ImageFont
import math
import os

NAVY_TOP = (13, 26, 51)      # 渐变顶 #0d1a33
NAVY_BOT = (9, 15, 26)       # 渐变底 #0b1526
SKY = (56, 189, 248)         # 品牌天蓝 #38bdf8
SKY_LIGHT = (125, 211, 252)  # #7dd3fc
WHITE = (240, 248, 255)

# assets/logo.svg 的「A=三角翼飞机」外轮廓(含底部机轮缺口,apex 在原点上方 13)
A_OUTER = [(0, -13), (9, 13), (3.4, 13), (0, 7.5), (-3.4, 13), (-9, 13)]
# 字腔三角(座舱),在实心 A 上挖 transparent 孔
A_HOLE = [(0, -5.2), (3.1, 2.6), (-3.1, 2.6)]

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'icons')
BRAND_OUT = os.path.join(ROOT, 'assets', 'logos')
os.makedirs(OUT, exist_ok=True)
os.makedirs(BRAND_OUT, exist_ok=True)


def vgrad(size, top, bot, w=None, h=None):
    """垂直渐变底图(可非正方形)"""
    w = w or size
    h = h or size
    img = Image.new('RGB', (w, h))
    px = img.load()
    for y in range(h):
        t = y / (h - 1)
        c = tuple(round(top[i] + (bot[i] - top[i]) * t) for i in range(3))
        for x in range(w):
            px[x, y] = c
    return img


def rot(pts, deg):
    """屏幕坐标旋转(正角=顺时针,与 SVG rotate 一致)"""
    a = math.radians(deg)
    ca, sa = math.cos(a), math.sin(a)
    return [(x * ca - y * sa, x * sa + y * ca) for x, y in pts]


def draw_glyph(img, size, scale, cx=None, cy=None):
    """在 img 上以 size 像素方形区域画 AeroAtlas「AA 双翼编队」图形,scale=占方形比例"""
    d = ImageDraw.Draw(img)
    s = size * scale
    ox = (cx if cx is not None else size / 2) - s / 2
    oy = (cy if cy is not None else size / 2) - s / 2

    def U(v):
        return v / 96 * s

    lw = lambda v: max(2, round(v / 96 * s))
    # 徽章环(atlas/地球;渐变近似:上半亮、下半标准色,分两段 arc)
    r_r = U(40)
    rbb = [ox + U(48) - r_r, oy + U(54) - r_r, ox + U(48) + r_r, oy + U(54) + r_r]
    d.arc(rbb, start=180, end=360, fill=SKY_LIGHT, width=lw(3.4))
    d.arc(rbb, start=0, end=180, fill=SKY, width=lw(3.4))
    # 轨道弧(150°→300°,顺时针,尾端引向长机)
    o_r = U(33)
    obb = [ox + U(48) - o_r, oy + U(54) - o_r, ox + U(48) + o_r, oy + U(54) + o_r]
    d.arc(obb, start=150, end=300, fill=SKY + (140,), width=lw(2.4))
    # 地球经纬(极淡)
    m_rx, m_ry = U(16), U(38)
    d.ellipse([ox + U(48) - m_rx, oy + U(54) - m_ry, ox + U(48) + m_rx, oy + U(54) + m_ry],
              outline=SKY + (60,), width=lw(1.2))
    # 纬线弦线(y=42/66,dy=±12,r=40 → 半宽 38.2)
    half = U(38.2)
    for yy in (42, 66):
        d.line([ox + U(48) - half, oy + U(yy), ox + U(48) + half, oy + U(yy)],
               fill=SKY + (60,), width=lw(1.2))

    def draw_a(tx, ty, sc):
        """画一架「A=三角翼飞机」:实心外轮廓 + 挖透明字腔"""
        pts = [(ox + U(tx + x * sc), oy + U(ty + y * sc)) for x, y in A_OUTER]
        d.polygon(pts, fill=SKY)
        hole = [(ox + U(tx + x * sc), oy + U(ty + y * sc)) for x, y in A_HOLE]
        d.polygon(hole, fill=(0, 0, 0, 0))  # 写入全透明像素 = 挖孔,露出底层渐变

    draw_a(37, 45, 0.85)   # 僚机(左后)
    draw_a(59, 36, 1.0)    # 长机(右前)
    return img


def rounded_mask(size, radius):
    m = Image.new('L', (size, size), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return m


def make_icon(out_name, out_size, scale, maskable=False):
    hi = 1024
    if maskable:
        # maskable:图形整体缩小进安全区,背景满幅不透明(系统圆形裁切不裁到机身)
        img = draw_glyph(vgrad(hi, NAVY_TOP, NAVY_BOT).convert('RGBA'), hi, scale)
    else:
        img = vgrad(hi, NAVY_TOP, NAVY_BOT).convert('RGBA')
        draw_glyph(img, hi, scale)
        img.putalpha(rounded_mask(hi, round(hi * 0.19)))
    img = img.resize((out_size, out_size), Image.LANCZOS)
    img.save(os.path.join(OUT, out_name))
    print('OK', out_name, img.size)


def load_font(size, bold=False):
    cands = ['msyhbd.ttc' if bold else 'msyh.ttc', 'arialbd.ttf', 'simhei.ttf']
    for f in cands:
        p = os.path.join(r'C:\Windows\Fonts', f)
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()


def load_wordmark_font(size):
    """品牌字标:Bahnschrift(DIN 1451 系,Windows 自带,变量字重取 700)。
    仅本机渲染 PNG 输出,字体文件不入库;失败回退 Arial Bold。"""
    p = os.path.join(r'C:\Windows\Fonts', 'bahnschrift.ttf')
    try:
        f = ImageFont.truetype(p, size)
        try:
            f.set_variation_by_axes([700])
        except Exception:
            pass
        return f
    except Exception:
        return load_font(size, bold=True)


def make_og():
    W, H = 1200, 630
    img = vgrad(W, NAVY_TOP, NAVY_BOT).convert('RGBA')
    d = ImageDraw.Draw(img)
    glyph = Image.new('RGBA', (560, 560), (0, 0, 0, 0))
    draw_glyph(glyph, 560, 0.92)
    img.alpha_composite(glyph, (W - 620, (H - 560) // 2))
    for y in (86, H - 86):
        d.line([(64, y), (W - 64, y)], fill=SKY + (60,), width=2)
    f1 = load_wordmark_font(96)
    f2 = load_font(44)
    f3 = load_font(34)
    d.text((72, 150), 'AeroAtlas', font=f1, fill=WHITE)
    d.text((76, 282), '中国民航 3D 图鉴', font=f2, fill=SKY)
    d.text((76, 386), '机型 3D · 涂装 · 机场 · 百科 · 答题', font=f3, fill=(190, 208, 227))
    d.text((76, 492), 'zhu-zirui.github.io/cloud-hangar', font=f3, fill=(140, 160, 184))
    img.convert('RGB').save(os.path.join(OUT, 'og-image.png'))
    print('OK og-image.png', (W, H))


def make_brand():
    """README 用的横向品牌图:图形 + AeroAtlas 字标 + 中英文副题"""
    W, H = 1120, 340
    img = vgrad(H, NAVY_TOP, NAVY_BOT, w=W, h=H).convert('RGBA')
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([2, 2, W - 3, H - 3], radius=36, outline=SKY + (110,), width=2)
    glyph = Image.new('RGBA', (280, 280), (0, 0, 0, 0))
    draw_glyph(glyph, 280, 0.94)
    img.alpha_composite(glyph, (36, (H - 280) // 2))
    f1 = load_wordmark_font(104)
    f2 = load_font(32)
    d.text((350, 96), 'AeroAtlas', font=f1, fill=WHITE)
    d.text((356, 228), '中国民航 3D 图鉴 · China Civil Aviation 3D', font=f2, fill=SKY)
    img.convert('RGB').save(os.path.join(BRAND_OUT, 'brand.png'))
    print('OK brand.png', (W, H))


make_icon('icon-192.png', 192, 0.78)
make_icon('icon-512.png', 512, 0.78)
make_icon('icon-maskable-512.png', 512, 0.60, maskable=True)
make_icon('apple-touch-icon.png', 180, 0.80, maskable=True)
make_og()
make_brand()
print('全部完成 →', OUT)
