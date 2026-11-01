/**
 * engine/families/a340.js — 空客 A340 家族(四发远程宽体)
 * P13(2026-11-01)补注册:变体全部来自真实 GLB(上游 glTF2),参数化通道不覆盖;
 * tune 仅为占位(若误走参数化通道立即抛错暴露问题)。
 */
export const a340Family = {
  id: 'a340',
  cn: '空客 A340 家族',
  variants: ['a346', 'a343'],
};

export function tuneA340() {
  throw new Error('a340 无参数化通道(真实 GLB 全量覆盖)');
}
