/**
 * engine/families/embraer.js — ERJ-145 与 E 喷气系列
 * P13(2026-11-01)补注册:变体全部来自真实 GLB(上游 glTF2),参数化通道不覆盖;
 * tune 仅为占位(若误走参数化通道立即抛错暴露问题)。
 */
export const embraerFamily = {
  id: 'embraer',
  cn: '巴航工业喷气家族',
  variants: ['e145', 'e170', 'e175', 'e190'],
};

export function tuneEmbraer() {
  throw new Error('embraer 无参数化通道(真实 GLB 全量覆盖)');
}
