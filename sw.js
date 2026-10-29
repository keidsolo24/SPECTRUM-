const CACHE = 'aurora-glass-v151';
const SHELL = ['./', 'index.html', 'app.css?v=151', 'js/core.js?v=151', 'js/ui.js?v=151', 'js/screens.js?v=151', 'js/sheets.js?v=151', 'js/push.js?v=151', 'js/app.js?v=151', 'manifest.webmanifest', 'logo.svg', 'wall.jpg', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'tutorial-poster.jpg', "fonts/bricolage-grotesque-latin-700-normal.woff2","fonts/bricolage-grotesque-latin-800-normal.woff2","fonts/bricolage-grotesque-latin-ext-700-normal.woff2","fonts/bricolage-grotesque-latin-ext-800-normal.woff2","fonts/inter-latin-400-normal.woff2","fonts/inter-latin-500-normal.woff2","fonts/inter-latin-600-normal.woff2","fonts/inter-latin-700-normal.woff2","fonts/inter-latin-ext-400-normal.woff2","fonts/inter-latin-ext-500-normal.woff2","fonts/inter-latin-ext-600-normal.woff2","fonts/inter-latin-ext-700-normal.woff2"];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url); if (u.origin !== location.origin) return;
  if (u.pathname.endsWith('.mp4')) return; // let video stream with range requests
  if (r.mode === 'navigate') { e.respondWith(fetch(r).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put('index.html', cp)); return res; }).catch(() => caches.match('index.html'))); return; }
  e.respondWith(caches.match(r).then(hit => hit || fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); } return res; })));
});

/* ---- notifications ---- */
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (_) { d = { title: e.data ? e.data.text() : 'Aurora' }; }
  const title = d.title || 'Aurora';
  e.waitUntil(self.registration.showNotification(title, { body: d.body || '', icon: 'icon-192.png', badge: 'icon-192.png', tag: d.tag || d.k || undefined, data: { url: d.url || './' }, renotify: !!d.tag, timestamp: d.at || Date.now() }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    for (const c of cs) { if ('focus' in c) { c.postMessage({ type: 'open', url }); return c.focus(); } }
    return self.clients.openWindow ? self.clients.openWindow(url) : null;
  }));
});
