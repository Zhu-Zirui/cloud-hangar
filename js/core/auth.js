/**
 * core/auth.js — 本机账号系统(纯前端,无服务器)
 * 站点为 GitHub Pages 纯静态架构,无后端可依赖;本模块提供"本机账号":
 * 账号数据(用户名 + 盐 + SHA-256 哈希)只存在访客自己的浏览器 localStorage,
 * 不上传任何服务器;换设备/清浏览器数据即消失(个人中心有明确提示)。
 * 密码永不落盘明文:WebCrypto subtle.digest 加 16 字节随机盐;
 * crypto.subtle 仅在安全上下文可用(GitHub Pages https / 127.0.0.1 均满足)。
 * 存储键沿用 cav3d. 前缀,只经 core/store.js 读写。
 * 登录态变化派发 window 事件 `cav3d:authchange`(header 徽标、账号页据此刷新)。
 * 未来接真后端(Supabase Auth 等)时,仅需保持本文件导出签名不变,替换实现。
 */
import { storeGet, storeSet, storeUpdate } from './store.js';

const KEY_USERS = 'users';     // { username: { salt, hash, createdAt } }
const KEY_SESSION = 'session'; // { username, loginAt }

const NAME_RE = /^[\u4e00-\u9fa5A-Za-z0-9_]{2,20}$/; // 用户名:中英文/数字/下划线,2-20 字
const PASS_MIN = 6;

/* ---------- 密码哈希(WebCrypto SHA-256 + 随机盐) ---------- */

function randomSaltHex() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password, saltHex) {
  return sha256Hex(`${saltHex}:${password}`);
}

/* ---------- 校验 ---------- */

/** 注册/登录共用的输入预检;返回错误文案或 null */
export function validateUsername(name) {
  if (!NAME_RE.test(name || '')) return '用户名需 2-20 字,仅支持中英文、数字和下划线';
  return null;
}
export function validatePassword(pass) {
  if (!pass || pass.length < PASS_MIN) return `密码至少 ${PASS_MIN} 位`;
  return null;
}

/* ---------- 会话 ---------- */

/** 当前登录用户 { username, loginAt } 或 null */
export function getSession() {
  return storeGet(KEY_SESSION, null);
}

/** 全部本机账号表(内部用,导出供个人中心展示账号数等) */
export function getUsers() {
  return storeGet(KEY_USERS, {}) || {};
}

function setSession(username) {
  storeSet(KEY_SESSION, { username, loginAt: Date.now() });
  window.dispatchEvent(new CustomEvent('cav3d:authchange'));
}

/* ---------- 注册 / 登录 / 登出 ---------- */

/**
 * 注册;成功即自动登录。
 * @returns {Promise<{ok:true,username:string}|{ok:false,error:string}>}
 */
export async function register(username, password, confirm) {
  username = (username || '').trim();
  let err = validateUsername(username);
  if (err) return { ok: false, error: err };
  err = validatePassword(password);
  if (err) return { ok: false, error: err };
  if (password !== confirm) return { ok: false, error: '两次输入的密码不一致' };
  if (password.includes(username)) return { ok: false, error: '密码不能包含用户名' };

  const users = getUsers();
  if (users[username]) return { ok: false, error: '该用户名已被注册(本机)' };

  const salt = randomSaltHex();
  users[username] = { salt, hash: await hashPassword(password, salt), createdAt: Date.now() };
  storeSet(KEY_USERS, users);
  setSession(username);
  return { ok: true, username };
}

/** 登录;@returns 同 register */
export async function login(username, password) {
  username = (username || '').trim();
  if (!username || !password) return { ok: false, error: '请输入用户名和密码' };
  const user = getUsers()[username];
  if (!user) return { ok: false, error: '用户不存在,请先注册' };
  const hash = await hashPassword(password, user.salt);
  if (hash !== user.hash) return { ok: false, error: '密码错误' };
  setSession(username);
  return { ok: true, username };
}

/** 登出(不清除账号与进度数据) */
export function logout() {
  storeSet(KEY_SESSION, null);
  window.dispatchEvent(new CustomEvent('cav3d:authchange'));
}

/** 注销本机账号:仅删除该账号凭据;浏览进度等其余本地数据不受影响 */
export function deleteAccount(username) {
  const users = getUsers();
  delete users[username];
  storeSet(KEY_USERS, users);
  logout();
}
