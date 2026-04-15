// ══════════════════════════════════════════════════════════
// Service Worker – Lagerchemie App
// Version hier hochzählen bei jedem Deploy -> erzwingt Update
// ══════════════════════════════════════════════════════════
const CACHE = 'lagerchemie-v1';
const ASSETS = [
  './',
  './index.html'
];

// Installation: Assets cachen
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
});

// Aktivierung: alten Cache löschen
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: Network first, Cache als Fallback
// -> User bekommt immer die neueste Version wenn online
self.addEventListener('fetch', e => {
  if (!e.request.url.startsWith('http')) return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Neue Version im Cache speichern
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// Update-Befehl von der App empfangen
self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
