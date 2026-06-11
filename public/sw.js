// NihonGo service worker — push notifications + offline app-shell cache.
const CACHE = 'nihongo-v1';

self.addEventListener('push', function(event) {
  const options = event.data ? event.data.json() : {};

  const notificationOptions = {
    body: options.body || 'Keep your pitch streak going 🔥',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [200, 100, 200],
    data: options.data || {},
    actions: options.actions || [],
    requireInteraction: options.requireInteraction || false,
    tag: options.tag || 'default',
    renotify: options.renotify || false
  };

  event.waitUntil(
    self.registration.showNotification(
      options.title || 'NihonGo',
      notificationOptions
    )
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(windowClients) {
        // 既に開いているウィンドウがあればフォーカス
        for (let client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // なければ新しいウィンドウを開く
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Service Worker のインストール
self.addEventListener('install', function(event) {
  self.skipWaiting();
});

// Service Worker のアクティベート — 古いキャッシュ掃除
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => clients.claim())
  );
});

// Offline app-shell cache. Strategy chosen to NEVER serve a stale app:
//   - /assets/* are content-hashed (immutable) → cache-first (fast, safe).
//   - static media (pitch-audio, images, fonts) → cache-first.
//   - HTML/navigation and everything else → network-first, cache only as the
//     offline fallback. So online users always get the latest deploy.
self.addEventListener('fetch', function(event) {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // don't touch cross-origin (Stripe/Supabase/GA)

  const immutable =
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/pitch-audio/') ||
    /\.(png|jpg|jpeg|svg|webp|woff2?|mp3)$/.test(url.pathname);

  if (immutable) {
    event.respondWith(
      caches.match(req).then((hit) =>
        hit || fetch(req).then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
          return res;
        }).catch(() => hit)
      )
    );
    return;
  }

  // network-first for HTML / API-less navigations
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && (req.mode === 'navigate' || url.pathname.endsWith('.html'))) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});

// メッセージ受信処理（アプリ内からの通知）
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, data } = event.data;
    
    self.registration.showNotification(title || 'NihonGo', {
      body: body || 'Keep your pitch streak going 🔥',
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      vibrate: [200, 100, 200],
      data: data || {},
      requireInteraction: false
    });
  }
});