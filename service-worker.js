/*
 * Öz Grup Sigorta — Service Worker
 * Basit "app-shell" önbellekleme: sitenin kendi statik dosyalarını (index.html, manifest,
 * ikonlar) çevrimdışı erişim için önbelleğe alır. Firebase/Firestore istekleri ASLA
 * önbelleklenmez — buradaki amaç sadece kabuk arayüzünün açılabilmesidir.
 */
const CACHE_NAME = 'ozgrup-sigorta-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Sadece GET isteklerini ele al; Firebase/Firestore/Google API isteklerine hiç dokunma.
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isThirdParty = url.origin !== self.location.origin;
  if (isThirdParty) return; // Firestore, Firebase Auth, Google Fonts, Tailwind CDN vb. ağdan gelsin.

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req).then((res) => {
        if (res && res.status === 200) {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
