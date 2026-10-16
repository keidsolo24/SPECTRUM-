const CACHE = 'aurora-glass-v2';
const SHELL = ['./', 'index.html', 'app.css?v=2', 'js/core.js?v=2', 'js/ui.js?v=2', 'js/screens.js?v=2', 'js/sheets.js?v=2', 'js/app.js?v=2', 'manifest.webmanifest', 'logo.svg', 'wall.jpg', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'tutorial-poster.jpg', "fonts/bricolage-grotesque-latin-700-normal.woff2","fonts/bricolage-grotesque-latin-800-normal.woff2","fonts/bricolage-grotesque-latin-ext-700-normal.woff2","fonts/bricolage-grotesque-latin-ext-800-normal.woff2","fonts/inter-latin-400-normal.woff2","fonts/inter-latin-500-normal.woff2","fonts/inter-latin-600-normal.woff2","fonts/inter-latin-700-normal.woff2","fonts/inter-latin-ext-400-normal.woff2","fonts/inter-latin-ext-500-normal.woff2","fonts/inter-latin-ext-600-normal.woff2","fonts/inter-latin-ext-700-normal.woff2"];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url); if (u.origin !== location.origin) return;
  if (u.pathname.endsWith('.mp4')) return; // let video stream with range requests
  if (r.mode === 'navigate') { e.respondWith(fetch(r).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put('index.html', cp)); return res; }).catch(() => caches.match('index.html'))); return; }
  e.respondWith(caches.match(r).then(hit => hit || fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); } return res; })));
});
