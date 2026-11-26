// Aumente VERSION a cada publicação (junto com APP_VERSION em js/app.js).
const VERSION = 'bb-0.14.0';
const ASSETS = [
  './', './index.html', './manifest.webmanifest', './icons/icon.svg', './css/styles.css',
  './js/config.js', './js/icons.js', './js/store.js', './js/cloud.js', './js/pages.js', './js/desafios.js', './js/devocional.js', './js/calendario.js', './js/biblioteca.js', './js/comunidade.js', './js/embreve.js', './js/jogos-dados.js', './js/jogos.js', './js/membros.js', './js/app.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

// Rede primeiro (sempre a versão mais nova quando tem internet), cache quando está offline.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
  );
});
