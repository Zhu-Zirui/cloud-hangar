/**
 * engine/families/dhc.js — 德·哈维兰加拿大 冲 8(DHC-8)家族
 * P13(二):dh8d(Q400)真实 GLB(FR24 dae 转换);tune 占位。
 */
export const dhcFamily = {
  id: 'dhc',
  cn: '德·哈维兰 冲 8 家族',
  variants: ['dh8d'],
};

export function tuneDhc() {
  throw new Error('dhc 无参数化通道(真实 GLB 全量覆盖)');
}
