/**
 * engine/families/a330.js — 空客 A330 家族
 * 特征:宽体双发,机鼻长而钝、风挡宽大、机翼翼尖帆(类鲨鳍)、
 * Trent 700 中型短舱,主起四轮小车式双轴。
 * 变体:a332(-200 中远程)/ a333(-300 加长)。
 */
export const a330Family = {
  id: 'a330',
  cn: '空客 A330 家族',
  variants: ['a332', 'a333'],
};

export function tuneA330(v) {
  const L = v.length;
  const engX = 0.35 * (v.span / 2);
  const engLE = 0.03 * L - 2.2;

  return {
    centerH: 5.45,
    fuselage: {
      len: L, maxR: 2.82, widthScale: 1.0, heightScale: 1.0,
      noseLen: 0.075, tailLen: 0.25, noseDroop: 0.5, tailUpsweep: 1.0,
      tailEndR: 0.1, radomeFrac: 0.05, stationSteps: 18,
      windshield: { perSide: 2, sCenter: 0.048, uCenter: 0.132, du: 0.055, w: 0.78, h: 0.66, rake: 15 },
      windows: { start: 0.115, end: 0.855, pitch: 0.62, uCenter: 0.215 },
      doors: { positions: [0.1, 0.31, 0.69, 0.9], w: 1.08, h: 2.05 },
    },
    wing: {
      halfSpan: v.span / 2,
      rootLE: 0.03 * L,
      rootY: -2.1,
      dihedral: 5.5,
      sections: [
        { t: 0, c: 12.0, le: 0, th: 1.4 },
        { t: 0.35, c: 7.3, le: -2.2, th: 0.85 },
        { t: 1, c: 2.5, le: -16.8, th: 0.26 },
      ],
      winglet: { type: 'sharklet' },             // 翼尖帆(类)
    },
    fin: {
      rootZ: -0.38 * L, rootY: 2.1, height: 9.8,
      rootChord: 8.2, tipChord: 3.0, sweep: 36,
    },
    hstab: {
      rootZ: -0.46 * L, rootY: 0.6, halfSpan: 9.6,
      rootChord: 4.8, tipChord: 1.8, sweep: 33, dihedral: 6,
    },
    engines: [{
      fanD: 2.47, nacelleLen: 5.6,
      pos: { x: engX, y: -3.37, z: engLE + 2.4 },
      pylon: { topY: -2.1 + Math.tan(5.5 * Math.PI / 180) * engX - 0.8, topZ1: engLE + 0.3, topZ2: engLE - 6.2 },
    }],
    gear: {
      nose: { z: 0.36 * L, pivotY: -2.3, wheelR: 0.62 },
      mains: [{ x: 5.2, z: 0.06 * L, pivotY: -3.1, wheelR: 0.66, axles: 2 }],
    },
  };
}
