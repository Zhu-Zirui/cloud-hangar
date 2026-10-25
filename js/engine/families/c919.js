/**
 * engine/families/c919.js — 中国商飞 C919
 * 特征:机鼻圆润略尖(介于 A320 与 737 之间的国产风格)、4 块风挡、
 * 后掠式翼梢小翼、LEAP-1C 短舱、垂尾后掠陡峭。单变体。
 * 页面知识卡另注:可选装国产长江 CJ-1000A 发动机(notes)。
 */
export const c919Family = {
  id: 'c919',
  cn: '中国商飞 C919',
  variants: ['c919'],
};

export function tuneC919(v) {
  const L = v.length;
  const engX = 0.31 * (v.span / 2);
  const engLE = 0.05 * L - 1.0;

  return {
    centerH: 3.1,
    fuselage: {
      len: L, maxR: 1.98, widthScale: 1.0, heightScale: 1.0,
      noseLen: 0.09, tailLen: 0.26, noseDroop: 0.24, tailUpsweep: 0.6,
      tailEndR: 0.1, radomeFrac: 0.058, stationSteps: 18,
      windshield: { perSide: 2, sCenter: 0.052, uCenter: 0.13, du: 0.048, w: 0.62, h: 0.58, rake: 16 },
      windows: { start: 0.135, end: 0.845, pitch: 0.58, uCenter: 0.215 },
      doors: { positions: [0.115, 0.5, 0.885], w: 0.86, h: 1.9 },
    },
    wing: {
      halfSpan: v.span / 2,
      rootLE: 0.05 * L,
      rootY: -1.35,
      dihedral: 5.5,
      sections: [
        { t: 0, c: 7.0, le: 0, th: 0.75 },
        { t: 0.3, c: 4.9, le: -1.0, th: 0.52 },
        { t: 1, c: 1.25, le: -7.8, th: 0.15 },
      ],
      winglet: { type: 'blended' },              // 后掠式翼梢小翼
    },
    fin: {
      rootZ: -0.37 * L, rootY: 1.45, height: 7.4,
      rootChord: 5.7, tipChord: 2.0, sweep: 35,
    },
    hstab: {
      rootZ: -0.46 * L, rootY: 0.4, halfSpan: 6.3,
      rootChord: 3.1, tipChord: 1.15, sweep: 33, dihedral: 5.5,
    },
    engines: [{
      fanD: 1.98, nacelleLen: 4.4,
      pos: { x: engX, y: -1.6, z: engLE + 2.1 },
      pylon: { topY: -1.35 + Math.tan(5.5 * Math.PI / 180) * engX - 0.45, topZ1: engLE + 0.2, topZ2: engLE - 4.0 },
    }],
    gear: {
      nose: { z: 0.345 * L, pivotY: -1.55, wheelR: 0.5 },
      mains: [{ x: 3.8, z: 0.03 * L, pivotY: -1.55, wheelR: 0.52, axles: 1 }],
    },
  };
}
