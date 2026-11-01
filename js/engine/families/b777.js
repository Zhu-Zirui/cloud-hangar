/**
 * engine/families/b777.js — 波音 777 宽体双发
 * P13(五):b77w 真实 GLB(FGMEMBERS .ac 转换);tune 占位。
 */
export const b777Family = {
  id: 'b777',
  cn: '波音 777 家族',
  variants: ['b77w'],
};

export function tuneB777() {
  throw new Error('b777 无参数化通道(真实 GLB 全量覆盖)');
}
