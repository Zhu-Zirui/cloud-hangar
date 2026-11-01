/**
 * engine/families/a380.js — 空客 A380 家族(全双层旗舰)
 * P13(2026-11-01)补注册:变体全部来自真实 GLB(上游 glTF2),参数化通道不覆盖;
 * tune 仅为占位(若误走参数化通道立即抛错暴露问题)。
 */
export const a380Family = {
  id: 'a380',
  cn: '空客 A380 家族',
  variants: ['a388'],
};

export function tuneA380() {
  throw new Error('a380 无参数化通道(真实 GLB 全量覆盖)');
}
