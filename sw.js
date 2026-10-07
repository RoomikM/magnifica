// Кеш застосунку: після першого відкриття сторінка стартує без інтернету.
// Оновлення файлів з'являються з наступного відкриття. Щоб примусити, змініть версію нижче.
const V = 'magnifica-v5s';
const CORE = ['./', 'index.html', 'style.css', 'core.js', 'records.js', 'clients.js', 'money.js', 'settings.js', 'logs.js', 'extras.js', 'cabinet.js', 'report.js', 'main.js', 'store.js', 'firebase-config.js', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(V).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  // спершу мережа (щоб файли версій не змішувались), кеш — лише без інтернету
  e.respondWith(
    fetch(r, { cache: 'no-cache' })
      .then((res) => {
        if (res && res.ok) { const cp = res.clone(); caches.open(V).then((c) => c.put(r, cp)); }
        return res;
      })
      .catch(() => caches.match(r, { ignoreSearch: true }).then((hit) => hit || (r.mode === 'navigate' ? caches.match('index.html') : undefined)))
  );
});
