/**
 * core/favs.js — 收藏夹(localStorage)
 * 三类收藏:aircraft(机型变体)/ airport(机场路由键)/ wiki(词条路由键)。
 * 统一存 cav3d.favs = { aircraft: [{id,name}], airport: [...], wiki: [...] },
 * 收藏时顺手记录展示名,个人中心汇总时无需回查数据文件。
 * 兼容历史裸字符串 id(视为无名称)。星标按钮在 viewer / airports / wiki 详情页。
 */
import { storeGet, storeSet } from './store.js';

export const FAV_KINDS = ['aircraft', 'airport', 'wiki'];

function normalize(list) {
  return (Array.isArray(list) ? list : [])
    .map((it) => (typeof it === 'object' && it ? it : { id: String(it), name: '' }))
    .filter((it) => it.id != null && it.id !== '');
}

function getAll() {
  const raw = storeGet('favs', null);
  const base = { aircraft: [], airport: [], wiki: [] };
  if (!raw || typeof raw !== 'object') return base;
  for (const k of FAV_KINDS) base[k] = normalize(raw[k]);
  return base;
}

export function getFavs(kind) {
  return getAll()[kind] || [];
}

export function isFav(kind, id) {
  return getFavs(kind).some((it) => it.id === id);
}

/** 切换收藏状态;@returns {boolean} 切换后是否已收藏 */
export function toggleFav(kind, id, name = '') {
  const all = getAll();
  const list = all[kind] || [];
  const on = !list.some((it) => it.id === id);
  all[kind] = on ? [...list, { id, name }] : list.filter((it) => it.id !== id);
  storeSet('favs', all);
  return on;
}

/* ---------- 详情页星标 chips(三页共用) ---------- */

/** 渲染一枚星标 chip(class=chip,样式见 §FAV) */
export function favChipHTML(kind, id, name = '') {
  const on = isFav(kind, id);
  return `<span class="chip fav-chip ${on ? 'on' : ''}" data-fav-kind="${kind}" data-fav-id="${id}" data-fav-name="${name}"
    role="button" tabindex="0" aria-pressed="${on}" title="${on ? '点击取消收藏' : '点击收藏'}">${on ? '★ 已收藏' : '☆ 收藏'}</span>`;
}

/** 绑定容器内全部 .fav-chip(点击/回车切换,自更新文案) */
export function bindFavChips(root) {
  root.querySelectorAll('.fav-chip').forEach((el) => {
    const act = () => {
      const on = toggleFav(el.dataset.favKind, el.dataset.favId, el.dataset.favName || '');
      el.classList.toggle('on', on);
      el.setAttribute('aria-pressed', String(on));
      el.textContent = on ? '★ 已收藏' : '☆ 收藏';
    };
    el.addEventListener('click', act);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); }
    });
  });
}
