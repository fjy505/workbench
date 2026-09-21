// 阳光大美妞的工作台 - Service Worker
// 离线缓存：首次加载后完整缓存应用，断网也能秒开

const CACHE_VERSION = 'v20';
const CACHE_NAME = 'meinv-workbench-' + CACHE_VERSION;
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg'
];

// 安装：预缓存所有核心资源
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting(); // 立即激活新版本
});

// 激活：清理旧缓存
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      }))
    )
  );
  self.clients.claim(); // 立即接管页面
});

// 请求拦截：
//  - 导航请求（打开页面）→ 网络优先，保证每次打开都是最新版本；断网才回退缓存
//  - 其他资源 → 缓存优先，保证离线可用与秒开
self.addEventListener('fetch', e => {
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(resp => {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(c => c.put('./index.html', clone)).catch(() => {});
        return resp;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        // 同源请求才缓存
        if (response.ok && e.request.url.startsWith(self.location.origin)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        // 断网且无缓存时，回退到缓存的首页
        return caches.match('./index.html');
      });
    })
  );
});
