// Кеш застосунку: після першого відкриття сторінка стартує без інтернету.
// Оновлення файлів з'являються з наступного відкриття. Щоб примусити, змініть версію нижче.
const V = 'magnifica-v6p';
const CORE = ['./', 'index.html', 'style.css', 'core.js', 'records.js', 'clients.js', 'money.js', 'settings.js', 'logs.js', 'extras.js', 'cabinet.js', 'report.js', 'main.js', 'store.js', 'firebase-config.js', 'push-config.js', 'push.js', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

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

// Push: сервер надсилає порожній сигнал, показуємо сповіщення про новий запис.
// Якщо застосунок відкритий і видимий, нічого не показуємо: звук і банер вже дає сама сторінка.
self.addEventListener('push', (e) => {
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      if (list.some((c) => c.visibilityState === 'visible')) return;
      return self.registration.showNotification('MAGNiFICA · Новий запис', {
        body: 'Вам створили новий запис. Відкрийте календар.',
        icon: 'icon-192.png',
        badge: 'icon-192.png',
        tag: 'magnifica-new',
        renotify: true,
        silent: false,
        vibrate: [200, 100, 200, 100, 300],
        data: { url: self.registration.scope }
      });
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || self.registration.scope;
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const w = list.find((c) => 'focus' in c);
      return w ? w.focus() : self.clients.openWindow(url);
    })
  );
});
