/**
 * engine/families/a220.js — 原庞巴迪 C 系,2019 年归入空客产品线
 * P13(2026-11-01)补注册:变体全部来自真实 GLB(上游 glTF2),参数化通道不覆盖;
 * tune 仅为占位(若误走参数化通道立即抛错暴露问题)。
 */
export const a220Family = {
  id: 'a220',
  cn: '空客 A220 家族(原庞巴迪 C 系)',
  variants: ['a221', 'a223'],
};

export function tuneA220() {
  throw new Error('a220 无参数化通道(真实 GLB 全量覆盖)');
}
