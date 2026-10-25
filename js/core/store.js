/**
 * core/store.js — 用户进度统一存取(localStorage)
 * 总纲 §4:所有进度读写只经本模块,key 一律加前缀 `cav3d.`
 * 用法:import { storeGet, storeSet, storeUpdate } from './core/store.js'
 */

const PREFIX = 'cav3d.';

/** 读一个 key;不存在或 JSON 解析失败时返回 fallback */
export function storeGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[store] 读取失败:', key, err);
    return fallback;
  }
}

/** 整体写入一个 key(自动 JSON 序列化) */
export function storeSet(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn('[store] 写入失败:', key, err);
    return false;
  }
}

/**
 * 读-改-写:update(key, updater, fallback)
 * updater(旧值) 返回新值;key 不存在时旧值为 fallback。
 * 典型用途:向收集集合追加一个涂装 ID 等。
 */
export function storeUpdate(key, updater, fallback = null) {
  const next = updater(storeGet(key, fallback));
  storeSet(key, next);
  return next;
}
