/**
 * engine/families/concorde.js — 协和号(Concorde)
 * P13(四):conc 真实 GLB(FGMEMBERS .ac 转换);tune 占位。
 */
export const concordeFamily = {
  id: 'concorde',
  cn: '协和号超音速客机',
  variants: ['conc'],
};

export function tuneConcorde() {
  throw new Error('concorde 无参数化通道(真实 GLB 全量覆盖)');
}
