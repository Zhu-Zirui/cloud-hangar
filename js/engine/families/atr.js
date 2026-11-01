/**
 * engine/families/atr.js — ATR 42/72 高翼双涡桨支线机
 * P13(2026-11-01)补注册:变体全部来自真实 GLB(上游 glTF2),参数化通道不覆盖;
 * tune 仅为占位(若误走参数化通道立即抛错暴露问题)。
 */
export const atrFamily = {
  id: 'atr',
  cn: 'ATR 支线涡桨家族',
  variants: ['at42', 'at72'],
};

export function tuneAtr() {
  throw new Error('atr 无参数化通道(真实 GLB 全量覆盖)');
}
