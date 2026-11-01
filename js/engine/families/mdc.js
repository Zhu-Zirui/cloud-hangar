/**
 * engine/families/mdc.js — 麦道三发宽体(DC-10 现代化型)
 * P13(2026-11-01)补注册:变体全部来自真实 GLB(上游 glTF2),参数化通道不覆盖;
 * tune 仅为占位(若误走参数化通道立即抛错暴露问题)。
 */
export const mdcFamily = {
  id: 'mdc',
  cn: '麦道 MD-11',
  variants: ['md11'],
};

export function tuneMdc() {
  throw new Error('mdc 无参数化通道(真实 GLB 全量覆盖)');
}
