/**
 * engine/families/b757.js — 波音 757 窄体双发
 * P13(2026-11-01)补注册:变体全部来自真实 GLB(上游 glTF2),参数化通道不覆盖;
 * tune 仅为占位(若误走参数化通道立即抛错暴露问题)。
 */
export const b757Family = {
  id: 'b757',
  cn: '波音 757 家族',
  variants: ['b752'],
};

export function tuneB757() {
  throw new Error('b757 无参数化通道(真实 GLB 全量覆盖)');
}
