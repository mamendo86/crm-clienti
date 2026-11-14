// Aumenta il numero a ogni rilascio di icone o manifest: forza i telefoni a
// scaricare i file nuovi invece di usare quelli in cache.
const CACHE_NAME = 'crm-clienti-v4';
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

// Tocco su una notifica "da esitare": porta in primo piano l'app (o la apre)
// e le chiede di aprire l'esito di quel ricontatto/appuntamento.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const chiave = event.notification.data && event.notification.data.esita;
  event.waitUntil((async () => {
    const finestre = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of finestre) {
      if ('focus' in c) {
        await c.focus();
        if (chiave) c.postMessage({ esita: chiave });
        return;
      }
    }
    const base = self.registration.scope;
    await self.clients.openWindow(base + (chiave ? '?esita=' + encodeURIComponent(chiave) : ''));
  })());
});
