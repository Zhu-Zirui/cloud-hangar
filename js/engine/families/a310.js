/**
 * engine/families/a310.js — A310 — A300 的缩短改进型
 * P13(五):a310 真实 GLB(FGMEMBERS .ac 转换);tune 占位。
 */
export const a310Family = {
  id: 'a310',
  cn: '空客 A310(A300 缩短型)',
  variants: ['a310'],
};

export function tuneA310() {
  throw new Error('a310 无参数化通道(真实 GLB 全量覆盖)');
}
