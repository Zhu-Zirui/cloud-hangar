/**
 * engine/families/a320.js — 空客 A320 家族(含 C919 同级尺寸参照)
 * 特征:机鼻圆钝少下压(A320 经典"微笑鼻")、风挡大而立、
 * 鲨鳍小翼、LEAP-1A 大短舱前伸、机腹天线罩鼓包。
 * 变体:a20n / a21n(a321 机身加长,门位与舷窗列随之拉开)。
 */
export const a320Family = {
  id: 'a320',
  cn: '空客 A320 家族',
  variants: ['a20n', 'a21n'],
};

export function tuneA320(v) {
  const L = v.length;
  const is321 = v.id === 'a21n';
  const engX = 0.32 * (v.span / 2);
  const engLE = 0.045 * L - 0.9;                 // 翼 LE 在发动机站位(t≈0.32)

  return {
    centerH: 3.1,
    fuselage: {
      len: L, maxR: 1.98, widthScale: 1.0, heightScale: 1.0,
      noseLen: 0.095, tailLen: 0.26, noseDroop: 0.18, tailUpsweep: 0.62,
      tailEndR: 0.1, radomeFrac: 0.06, stationSteps: 18,
      windshield: { perSide: 2, sCenter: 0.055, uCenter: 0.128, du: 0.055, w: 0.68, h: 0.6, rake: 13 },
      windows: { start: 0.13, end: is321 ? 0.875 : 0.84, pitch: 0.55, uCenter: 0.215 },
      doors: { positions: [0.115, 0.5, 0.885], w: 0.86, h: 1.9 },
    },
    wing: {
      halfSpan: v.span / 2,
      rootLE: 0.045 * L,
      rootY: -1.35,
      dihedral: 5,
      sections: [
        { t: 0, c: 6.6, le: 0, th: 0.72 },
        { t: 0.3, c: 4.6, le: -0.9, th: 0.5 },
        { t: 1, c: 1.1, le: -7.6, th: 0.14 },
      ],
      winglet: { type: 'sharklet' },
    },
    fin: {
      rootZ: -0.365 * L, rootY: 1.45, height: 7.2,
      rootChord: 5.5, tipChord: 2.0, sweep: 33,
    },
    hstab: {
      rootZ: -0.46 * L, rootY: 0.4, halfSpan: 6.25,
      rootChord: 3.1, tipChord: 1.15, sweep: 31, dihedral: 5,
    },
    engines: [{
      fanD: 1.98, nacelleLen: 4.4,
      pos: { x: engX, y: -1.6, z: engLE + 2.1 },
      pylon: { topY: -1.35 + Math.tan(5 * Math.PI / 180) * engX - 0.45, topZ1: engLE + 0.2, topZ2: engLE - 3.9 },
    }],
    gear: {
      nose: { z: 0.343 * L, pivotY: -1.55, wheelR: 0.5 },
      mains: [{ x: 3.8, z: 0.03 * L, pivotY: -1.55, wheelR: 0.52, axles: 1 }],
    },
  };
}
