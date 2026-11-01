/**
 * engine/families/b767.js — 波音 767 双发宽体先驱
 * P13(2026-11-01)补注册:变体全部来自真实 GLB(上游 glTF2),参数化通道不覆盖;
 * tune 仅为占位(若误走参数化通道立即抛错暴露问题)。
 */
export const b767Family = {
  id: 'b767',
  cn: '波音 767 家族',
  variants: ['b764', 'b763'],
};

export function tuneB767() {
  throw new Error('b767 无参数化通道(真实 GLB 全量覆盖)');
}
