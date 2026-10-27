const CACHE = 'bvf-v0.5-3';
const FILES = ['./', 'index.html', 'style.css', 'manifest.webmanifest', 'js/audio.js', 'js/input.js', 'js/stage.js', 'js/fighters.js', 'js/game.js',
  'assets/mukira/atlas.png', 'assets/mukira/atlas.json', 'assets/jogador/atlas.png', 'assets/jogador/atlas.json', 'assets/lobo/atlas.png', 'assets/lobo/atlas.json', 'assets/lobo/atlas_p2.png', 'assets/go/atlas.png', 'assets/go/atlas.json', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-180.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const same = url.origin === location.origin;
  const put = res => { if (res.ok && same) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); } return res; };
  const netFirst = e.request.mode === 'navigate' || (same && /(\/|\.html|\.js|\.json|\.css|\.webmanifest)$/.test(url.pathname));
  if (netFirst) {
    e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(put).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
    return;
  }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request).then(put)).catch(() => caches.match('index.html')));
});
