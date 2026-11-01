/**
 * engine/families/b717.js — 波音 717 — MD-95 的更名
 * P13(五):b712 真实 GLB(FGMEMBERS .ac 转换);tune 占位。
 */
export const b717Family = {
  id: 'b717',
  cn: '波音 717(MD-95)',
  variants: ['b712'],
};

export function tuneB717() {
  throw new Error('b717 无参数化通道(真实 GLB 全量覆盖)');
}
