/**
 * engine/livery.js — Canvas 涂装引擎(P2 实现,P1 仅留接口)
 * P2 契约:
 *   makeLiveryTextures(airlineDef, variantId) → { fuselage, tail } 两个 CanvasTexture
 *   机身贴图按 materials.js 头注的 UV 契约绘制(圆周 u / 纵向 s / flipY=false)。
 *   listLiveries(variantId) → 该变体可选涂装定义数组(P2 读 data/liveries.json)。
 */

/** P1:返回 null → 总装器回退到素色涂装 */
export function makeLiveryTextures(_airlineDef, _variantId) {
  return null;
}

/** P1:无涂装可选 */
export function listLiveries(_variantId) {
  return [];
}
