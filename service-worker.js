/*
 * Öz Grup Sigorta — Service Worker (v2)
 *
 * ÖNEMLİ DEĞİŞİKLİK: Eski sürüm "cache-first" çalışıyordu — yani bir kere açılan sayfa
 * önbelleğe alınınca, siz GitHub'da index.html'i güncelleseniz bile kullanıcının
 * telefonu hep eski sürümü gösteriyordu (yaşanan "animasyon yok" sorununun sebebi buydu).
 *
 * Şimdi "network-first" çalışıyor: cihaz internete bağlıyken HER ZAMAN sunucudaki en güncel
 * dosya çekilir ve ekrana o basılır; önbellek sadece internet YOKSA (çevrimdışı) devreye girer.
 * Ayrıca CACHE_NAME değiştiği için eski önbellek otomatik silinip yerine yenisi konur.
 */
const CACHE_NAME = 'ozgrup-sigorta-v2';
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

  // NETWORK-FIRST: önce sunucudan en güncel dosyayı çekmeyi dene.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200) {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        }
        return res;
      })
      .catch(() => caches.match(req)) // sadece internet yoksa önbelleğe düş
  );
});
