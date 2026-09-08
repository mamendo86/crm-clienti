const CACHE_NAME = 'crm-clienti-v1';
const FILE_DA_CACHE = ['./index.html', './manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILE_DA_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((nomi) =>
      Promise.all(nomi.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // non intercettare le chiamate all'API Apps Script: devono sempre andare in rete
  if (event.request.url.includes('script.google.com')) return;

  event.respondWith(
    caches.match(event.request).then((risposta) => risposta || fetch(event.request))
  );
});
