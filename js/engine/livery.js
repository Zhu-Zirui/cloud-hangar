/**
 * engine/livery.js — 涂装数据模块(P2 定稿方案:真实涂装 GLB 整体切换)
 *
 * 定稿路线(经用户批准):涂装切换 = 换装整套真实贴图的 GLB 模型
 * (FlightGear/FGMEMBERS 生态的航司涂装,经 _tools/ac2glb.py 转换,GPL-2.0 同源),
 * 不再使用 P2 初稿的 Canvas 贴面/贴图重绘方案(该实现已移除)。
 * 中国航司贴图未覆盖的机型仅保留原厂涂装;著名国外航司涂装作补充。
 */
let liveryDataCache = null;
export function getAllLiveries() {
  if (!liveryDataCache) {
    liveryDataCache = fetch('data/liveries.json').then((res) => {
      if (!res.ok) throw new Error(`liveries.json HTTP ${res.status}`);
      return res.json();
    });
  }
  return liveryDataCache;
}

/** 该变体的涂装列表(含原厂入口,按 json 顺序) */
export function liveriesForVariant(all, variantId) {
  return all.liveries.filter((d) => d.variant === variantId);
}
