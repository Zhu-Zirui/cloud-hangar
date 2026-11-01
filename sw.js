/**
 * sw.js — Service Worker(P12 PWA)
 * 策略(纯静态站,GitHub Pages 子路径 /cloud-hangar/ 下同样生效):
 *  - 导航请求(HTML):网络优先,离线回退缓存 → 更新永远可达;
 *  - JS/CSS/JSON/语言包:网络优先 + 缓存兜底(断网可离线浏览);
 *  - GLB/PNG/JPG 等大体积二进制(模型/LOGO/图标):缓存优先(基本不变,省流量);
 *  - jsdelivr 的 three 版本锁死,同样缓存优先 → 断网后 3D 仍可渲染。
 * 版本号 CACHE_VER:代码/预缓存清单变更时手动 +1;旧缓存在 activate 清除。
 */
const CACHE_VER = 'ch-p12-1';
const PRECACHE = [
  './',
  'index.html',
  'css/main.css',
  'manifest.webmanifest',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/icons/icon-maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_VER).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VER).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  // 版本锁死的 three CDN:路径含 three@0.160.0 / three-mesh-bvh@0.7.6 才缓存
  const cdnLocked = url.hostname === 'cdn.jsdelivr.net' && /three(-mesh-bvh)?@0\.(160\.0|7\.6)/.test(url.pathname);
  if (!sameOrigin && !cdnLocked) return; // 其他跨域(geojs 探测等)不拦截

  // 二进制资源:缓存优先(命中即回,未命中拉网并入库)
  const isBinary = /\.(glb|png|jpe?g|webp|svg|ico|woff2?)$/i.test(url.pathname);

  if (req.mode === 'navigate') {
    e.respondWith(networkFirst(req, 'pages'));
    return;
  }
  e.respondWith(isBinary ? cacheFirst(req, 'bin') : networkFirst(req, 'code'));
});

async function networkFirst(req, bucket) {
  const cache = await caches.open(`${CACHE_VER}-${bucket}`);
  try {
    const fresh = await fetch(req);
    if (fresh && (fresh.ok || fresh.type === 'opaque')) cache.put(req, fresh.clone());
    return fresh;
  } catch (err) {
    const hit = await cache.match(req, { ignoreSearch: req.mode === 'navigate' });
    if (hit) return hit;
    if (req.mode === 'navigate') {
      const shell = await cache.match('index.html') || await cache.match('./');
      if (shell) return shell;
    }
    throw err;
  }
}

async function cacheFirst(req, bucket) {
  const cache = await caches.open(`${CACHE_VER}-${bucket}`);
  const hit = await cache.match(req);
  if (hit) return hit;
  const fresh = await fetch(req);
  if (fresh && (fresh.ok || fresh.type === 'opaque')) cache.put(req, fresh.clone());
  return fresh;
}
