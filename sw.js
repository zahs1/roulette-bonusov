const CACHE = 'roulette-v1';
const URLS = [
  '/roulette-bonusov/',
  '/roulette-bonusov/index.html',
  '/roulette-bonusov/style.css',
  '/roulette-bonusov/script.js',
  '/roulette-bonusov/manifest.json',
  '/roulette-bonusov/icon.svg',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(URLS)).then(() => self.skipWaiting())
  );
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  if (e.request.url.includes('/roulette-bonusov/')) {
    e.respondWith(
      caches.match(e.request).then(r => r || fetch(e.request).then(res => { const clone = res.clone(); caches.open(CACHE).then(c => c.put(e.request, clone)); return res; }))
    );
  }
});
