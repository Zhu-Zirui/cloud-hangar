/**
 * engine/families/fokker.js — 福克 Fokker 100 家族
 * P13(四):f100 真实 GLB(FGMEMBERS .ac 转换);tune 占位。
 */
export const fokkerFamily = {
  id: 'fokker',
  cn: '福克 Fokker 100 家族',
  variants: ['f100'],
};

export function tuneFokker() {
  throw new Error('fokker 无参数化通道(真实 GLB 全量覆盖)');
}
