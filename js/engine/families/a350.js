/**
 * engine/families/a350.js — 空客 A350 XWB
 * 特征:"墨镜客机"黑色风挡面罩(6 块风挡 + 深色环绕带)、
 * 上翘曲率翼尖(斜削式)、Trent XWB 超大短舱、A350-1000 主起六轮小车。
 * 变体:a359(-900)/ a35k(-1000,国内暂未交付,页面标"前瞻示意")。
 */
export const a350Family = {
  id: 'a350',
  cn: '空客 A350 家族',
  variants: ['a359', 'a35k'],
};

export function tuneA350(v) {
  const L = v.length;
  const isK = v.id === 'a35k';
  const engX = 0.36 * (v.span / 2);
  const engLE = 0.02 * L - 3.4;

  return {
    centerH: 5.6,
    fuselage: {
      len: L, maxR: 2.98, widthScale: 1.0, heightScale: 1.0,
      noseLen: 0.08, tailLen: 0.245, noseDroop: 0.38, tailUpsweep: 1.05,
      tailEndR: 0.1, radomeFrac: 0.05, stationSteps: 18,
      // 墨镜式:3 块/侧 + 深色环绕面罩(buildWindshield 依据 surround 附加)
      windshield: {
        perSide: 3, sCenter: 0.052, uCenter: 0.15, du: 0.048,
        w: 0.52, h: 0.6, rake: 14, surround: true,
      },
      windows: { start: 0.11, end: 0.865, pitch: 0.62, uCenter: 0.215 },
      doors: { positions: [0.1, 0.3, 0.67, 0.9], w: 1.08, h: 2.05 },
    },
    wing: {
      halfSpan: v.span / 2,
      rootLE: 0.02 * L,
      rootY: -2.2,
      dihedral: 5.5,
      sections: [
        { t: 0, c: 13.0, le: 0, th: 1.5 },
        { t: 0.38, c: 7.4, le: -3.6, th: 0.85 },
        { t: 1, c: 1.4, le: -20.8, th: 0.2 },
      ],
      winglet: { type: 'raked' },                // 上翘曲率翼尖
    },
    fin: {
      rootZ: -0.375 * L, rootY: 2.25, height: 9.2,
      rootChord: 8.6, tipChord: 2.9, sweep: 38,
    },
    hstab: {
      rootZ: -0.45 * L, rootY: 0.5, halfSpan: 10.3,
      rootChord: 5.0, tipChord: 1.8, sweep: 35, dihedral: 6.5,
    },
    engines: [{
      fanD: 3.0, nacelleLen: 6.3,
      pos: { x: engX, y: -3.28, z: engLE + 2.7 },
      pylon: { topY: -2.2 + Math.tan(5.5 * Math.PI / 180) * engX - 0.85, topZ1: engLE + 0.3, topZ2: engLE - 6.2 },
    }],
    gear: {
      nose: { z: 0.365 * L, pivotY: -2.45, wheelR: 0.62 },
      // A350-1000:六轮小车(3 轴);-900 四轮(2 轴)
      mains: [{ x: 5.7, z: 0.045 * L, pivotY: -3.35, wheelR: isK ? 0.62 : 0.66, axles: isK ? 3 : 2 }],
    },
  };
}
