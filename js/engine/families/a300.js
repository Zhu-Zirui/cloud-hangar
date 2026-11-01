/**
 * engine/families/a300.js — A300 — 空客的开山之作
 * P13(五):a306 真实 GLB(FGMEMBERS .ac 转换);tune 占位。
 */
export const a300Family = {
  id: 'a300',
  cn: '空客 A300 家族(世界首款双发宽体)',
  variants: ['a306'],
};

export function tuneA300() {
  throw new Error('a300 无参数化通道(真实 GLB 全量覆盖)');
}
