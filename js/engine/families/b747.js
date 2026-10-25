/**
 * engine/families/b747.js — 波音 747 家族(珍宝客机)
 * 特征(相对其他家族最独特):
 * - 上凸双层前机身(hump):机鼻后驾驶舱层上凸,一直延伸到翼前缘后;
 * - 部分货机型短凸(SUD),747-8 客机为全长上凸;
 * - 四发(机翼每侧 2 台,内发在翼根 25%、外发在 55% 半展长处);
 * - 主起 4 组 16 轮(2 组机翼 + 2 组机身中央),垂尾高瘦;
 * - 翼根大整流罩鼓包(机腹中央明显的"肚皮")。
 * 变体:b748(747-8 洲际客机)。
 */
export const b747Family = {
  id: 'b747',
  cn: '波音 747 家族',
  variants: ['b748'],
};

export function tuneB747(v) {
  const L = v.length;
  const engXInner = 0.25 * (v.span / 2);
  const engXOuter = 0.57 * (v.span / 2);
  const leInner = 0.022 * L - 4.4;
  const leOuter = leInner - 12.6;

  return {
    centerH: 6.4,
    fuselage: {
      len: L, maxR: 3.25, widthScale: 1.0, heightScale: 1.0,
      noseLen: 0.055, tailLen: 0.235, noseDroop: 0.62, tailUpsweep: 1.35,
      tailEndR: 0.1, radomeFrac: 0.04, stationSteps: 20,
      // 上凸双层前机身:机鼻后到 0.28 处(翼前缘之后)
      hump: { start: 0.045, end: 0.3, width: 0.82, height: 1.9 },
      windshield: { perSide: 3, sCenter: 0.043, uCenter: 0.152, du: 0.05, w: 0.56, h: 0.58, rake: 12, inflate: 1.55 },
      windows: { start: 0.075, end: 0.875, pitch: 0.64, uCenter: 0.215 },
      doors: { positions: [0.085, 0.27, 0.6, 0.895], w: 1.08, h: 2.05 },
    },
    wing: {
      halfSpan: v.span / 2,
      rootLE: 0.022 * L,
      rootY: -2.6,
      dihedral: 7,
      sections: [
        { t: 0, c: 16.6, le: 0, th: 1.9 },
        { t: 0.32, c: 10.5, le: -4.6, th: 1.15 },
        { t: 1, c: 3.1, le: -23.4, th: 0.34 },
      ],
      winglet: { type: 'raked' },                // 747-8 斜削式翼尖
    },
    fin: {
      rootZ: -0.385 * L, rootY: 2.5, height: 11.4,
      rootChord: 11.0, tipChord: 3.8, sweep: 40,
      dorsal: { len: L * 0.03, rise: 0.5 },
    },
    hstab: {
      rootZ: -0.46 * L, rootY: 0.9, halfSpan: 11.1,
      rootChord: 6.6, tipChord: 2.4, sweep: 37, dihedral: 7,
    },
    engines: [
      {
        fanD: 2.67, nacelleLen: 5.9,
        pos: { x: engXInner, y: -4.05, z: leInner + 2.2 },
        pylon: { topY: -2.6 + Math.tan(7 * Math.PI / 180) * engXInner - 0.95, topZ1: leInner + 0.2, topZ2: leInner - 5.6 },
      },
      {
        fanD: 2.67, nacelleLen: 5.9,
        pos: { x: engXOuter, y: -2.7, z: leOuter + 2.0 },
        pylon: { topY: -2.6 + Math.tan(7 * Math.PI / 180) * engXOuter - 0.8, topZ1: leOuter + 0.2, topZ2: leOuter - 5.4 },
      },
    ],
    gear: {
      nose: { z: 0.35 * L, pivotY: -2.7, wheelR: 0.62 },
      // 4 组主起:2 组翼下四轮小车 + 2 组机身四轮小车
      mains: [
        { x: 5.6, z: -0.012 * L, pivotY: -4.0, wheelR: 0.66, axles: 2 },
        { x: 1.7, z: -0.035 * L, pivotY: -4.0, wheelR: 0.66, axles: 2 },
      ],
    },
  };
}
