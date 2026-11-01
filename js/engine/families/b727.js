/**
 * engine/families/b727.js — 波音 727 三发经典
 * P13(五):b722 真实 GLB(FGMEMBERS .ac 转换);tune 占位。
 */
export const b727Family = {
  id: 'b727',
  cn: '波音 727 家族(三发尾置)',
  variants: ['b722'],
};

export function tuneB727() {
  throw new Error('b727 无参数化通道(真实 GLB 全量覆盖)');
}
