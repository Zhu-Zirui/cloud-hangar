/**
 * engine/families/b737.js — 波音 737 家族"性格"调参
 * 特征:机身偏瘦长、机鼻下压明显(737 起落架短的经典轮廓)、
 * 风挡 2+2 尖角舷窗、CFM56 小短舱前伸贴近地面、后掠 25° 机翼。
 * 变体:b738(融合式小翼)/ b38m(分叉式小翼,LEAP 大短舱)。
 */

/** 家族元信息 + 变体 ID(id 必须与 data/aircraft/b737.json 一致) */
export const b737Family = {
  id: 'b737',
  cn: '波音 737 家族',
  variants: ['b738', 'b38m'],
};

/**
 * 按变体数据(权威数据表)产出整机参数。
 * @param {object} v data/aircraft/b737.json 中的一个变体对象
 * @returns 完整参数包(aircraft.js 总装用)
 */
export function tuneB737(v) {
  const L = v.length;
  const isMax = v.id === 'b38m';
  const fanD = isMax ? 1.98 : 1.55;             // LEAP-1B 风扇 1.98m,CFM56-7B 1.55m
  const podR = fanD / 2 * 1.42;                 // 短舱外径(含整流罩)

  // 发动机站位:翼展 29% 处,短舱中心前伸至翼 LE 之前
  const engX = 0.29 * (v.span / 2);
  const engLE = 0.06 * L + (-1.1);              // rootLE + le(0.29)
  const engZ = engLE + 1.55;
  // 737 短舱离地极低是家族特征:CFM56 ~0.46m,MAX LEAP 更"贴地" ~0.25m
  const engY = (isMax ? 0.25 : 0.46) + podR - 3.05;
  const wingBotY = -1.15 + Math.tan(6 * Math.PI / 180) * engX - 0.5;

  return {
    centerH: 3.05,                              // 机身轴线离地高(轮子接地)
    fuselage: {
      len: L, maxR: 1.88, widthScale: 1.0, heightScale: 1.02,
      noseLen: 0.088, tailLen: 0.27, noseDroop: 0.34, tailUpsweep: 0.6,
      tailEndR: 0.1, radomeFrac: 0.055, stationSteps: 18,
      windshield: { perSide: 2, sCenter: 0.052, uCenter: 0.132, du: 0.05, w: 0.6, h: 0.56, rake: 20 },
      windows: { start: 0.135, end: 0.83, pitch: 0.58, uCenter: 0.215 },
      // 737-800:前/后客舱门 2 对 + 翼上应急出口 2 对,无中舱门
      doors: { positions: [0.115, 0.875], w: 0.86, h: 1.85, exits: [0.485] },
    },
    wing: {
      halfSpan: v.span / 2,
      rootLE: 0.06 * L,                         // 翼根前缘 z
      rootY: -1.15,
      dihedral: 6,
      sections: [
        { t: 0, c: 7.3, le: 0, th: 0.78 },      // 翼根(含机身内段)
        { t: 0.3, c: 5.0, le: -1.1, th: 0.55 }, // 内侧折点
        { t: 1, c: 1.3, le: -8.2, th: 0.16 },   // 翼梢(LE 后掠约 25°)
      ],
      winglet: { type: isMax ? 'forked' : 'blended' },
    },
    fin: {
      rootZ: -0.36 * L, rootY: 1.35, height: 8.0,
      rootChord: 5.4, tipChord: 2.1, sweep: 33,
      dorsal: { len: L * 0.062, rise: 0.62 },    // 737 家族大背鳍(剪影特征)
    },
    hstab: {
      rootZ: -0.455 * L, rootY: 0.35, halfSpan: 6.4,
      rootChord: 3.2, tipChord: 1.2, sweep: 30, dihedral: 7,
    },
    engines: [{
      fanD, nacelleLen: isMax ? 4.6 : 3.7,
      pos: { x: engX, y: engY, z: engZ },
      pylon: { topY: wingBotY, topZ1: engLE + 0.3, topZ2: engLE - 3.6 },
    }],
    gear: {
      nose: { z: 0.364 * L, pivotY: -1.5, wheelR: 0.46 },
      mains: [{ x: 2.9, z: 0.05 * L, pivotY: -1.4, wheelR: 0.55, axles: 1 }],
    },
  };
}
