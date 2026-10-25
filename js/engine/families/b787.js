/**
 * engine/families/b787.js — 波音 787 梦想客机
 * 特征:流畅长机鼻低阻造型、4 块高后倾"海湾式"风挡、
 * 斜削式翼尖超临界机翼(无传统小翼)、Trent 1000 大短舱锯齿尾缘(示意平滑)。
 * 变体:b788(-8)/ b789(-9 加长)。
 */
export const b787Family = {
  id: 'b787',
  cn: '波音 787 家族',
  variants: ['b788', 'b789'],
};

export function tuneB787(v) {
  const L = v.length;
  const engX = 0.36 * (v.span / 2);
  const engLE = 0.02 * L - 3.0;

  return {
    centerH: 5.5,
    fuselage: {
      len: L, maxR: 2.89, widthScale: 1.0, heightScale: 1.0,
      noseLen: 0.082, tailLen: 0.24, noseDroop: 0.32, tailUpsweep: 1.0,
      tailEndR: 0.1, radomeFrac: 0.05, stationSteps: 18,
      windshield: { perSide: 2, sCenter: 0.05, uCenter: 0.135, du: 0.06, w: 0.8, h: 0.7, rake: 26 },
      windows: { start: 0.11, end: 0.86, pitch: 0.62, uCenter: 0.215 },
      doors: { positions: [0.1, 0.3, 0.68, 0.9], w: 1.08, h: 2.05 },
    },
    wing: {
      halfSpan: v.span / 2,
      rootLE: 0.02 * L,
      rootY: -2.15,
      dihedral: 6,
      sections: [
        { t: 0, c: 11.6, le: 0, th: 1.35 },
        { t: 0.38, c: 6.6, le: -3.2, th: 0.8 },
        { t: 1, c: 1.5, le: -18.6, th: 0.2 },
      ],
      winglet: { type: 'raked' },                // 斜削式翼尖
    },
    fin: {
      rootZ: -0.375 * L, rootY: 2.2, height: 9.2,
      rootChord: 8.0, tipChord: 2.8, sweep: 37,
    },
    hstab: {
      rootZ: -0.455 * L, rootY: 0.5, halfSpan: 9.7,
      rootChord: 4.7, tipChord: 1.7, sweep: 34, dihedral: 7,
    },
    engines: [{
      fanD: 2.85, nacelleLen: 6.0,
      pos: { x: engX, y: -3.3, z: engLE + 2.6 },
      pylon: { topY: -2.15 + Math.tan(6 * Math.PI / 180) * engX - 0.8, topZ1: engLE + 0.3, topZ2: engLE - 5.9 },
    }],
    gear: {
      nose: { z: 0.365 * L, pivotY: -2.4, wheelR: 0.62 },
      mains: [{ x: 5.6, z: 0.05 * L, pivotY: -3.3, wheelR: 0.66, axles: 2 }],
    },
  };
}
