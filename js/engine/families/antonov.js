/**
 * engine/families/antonov.js — 安-24 苏联支线涡桨
 * P13(五):a24r 真实 GLB(FGMEMBERS .ac 转换);tune 占位。
 */
export const antonovFamily = {
  id: 'antonov',
  cn: '安东诺夫 安-24 家族',
  variants: ['a24r'],
};

export function tuneAntonov() {
  throw new Error('antonov 无参数化通道(真实 GLB 全量覆盖)');
}
