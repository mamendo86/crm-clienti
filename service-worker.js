const CACHE_NAME = 'crm-clienti-v1';
const ASSET_STATICI = ['./manifest.json', './icon.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(ASSET_STATICI.map((url) => cache.add(url).catch(() => {})))
    )
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
  const { request } = event;

  // Non intercettare le chiamate all'API Apps Script: devono sempre andare in rete.
  if (request.url.includes('script.google.com')) return;
  // Solo richieste GET passano dalla cache (POST/altri metodi vanno sempre in rete).
  if (request.method !== 'GET') return;

  const isNavigazione = request.mode === 'navigate'
    || request.url.endsWith('/index.html')
    || request.url.endsWith('/');

  if (isNavigazione) {
    // NETWORK-FIRST: ogni modifica pubblicata è visibile subito online;
    // offline, si ripiega sull'ultima versione salvata in cache.
    event.respondWith(
      fetch(request)
        .then((risposta) => {
          const copia = risposta.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copia));
          return risposta;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // CACHE-FIRST con aggiornamento in background (stale-while-revalidate)
  // per icone, manifest e altri asset statici.
  event.respondWith(
    caches.match(request).then((inCache) => {
      const aggiornamento = fetch(request)
        .then((risposta) => {
          caches.open(CACHE_NAME).then((cache) => cache.put(request, risposta.clone()));
          return risposta;
        })
        .catch(() => inCache);
      return inCache || aggiornamento;
    })
  );
});
