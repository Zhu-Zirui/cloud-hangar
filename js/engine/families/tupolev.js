/**
 * engine/families/tupolev.js — 苏联短程双发喷气(发动机后置)
 * P13(2026-11-01)补注册:变体全部来自真实 GLB(上游 glTF2),参数化通道不覆盖;
 * tune 仅为占位(若误走参数化通道立即抛错暴露问题)。
 */
export const tupolevFamily = {
  id: 'tupolev',
  cn: '图波列夫 图-134 家族',
  variants: ['t134'],
};

export function tuneTupolev() {
  throw new Error('tupolev 无参数化通道(真实 GLB 全量覆盖)');
}
