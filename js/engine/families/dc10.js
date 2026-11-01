/**
 * engine/families/dc10.js — DC-10 麦道三发宽体
 * P13(五):dc10 真实 GLB(FGMEMBERS .ac 转换);tune 占位。
 */
export const dc10Family = {
  id: 'dc10',
  cn: '麦道 DC-10 家族(三发宽体)',
  variants: ['dc10'],
};

export function tuneDc10() {
  throw new Error('dc10 无参数化通道(真实 GLB 全量覆盖)');
}
