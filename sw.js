// ══════════════════════════════════════════════════════════
// sw.js — Lagerchemie PWA
// ══════════════════════════════════════════════════════════
// Strategie:
//   • Navigation / HTML  → NETWORK-FIRST: neue index.html kommt automatisch an,
//     KEIN SW-Bump mehr nötig für index.html-Änderungen. Offline → Cache-Fallback.
//   • Übrige GET-Requests → STALE-WHILE-REVALIDATE (schnell aus Cache, Update im Hintergrund).
//
// Bei jeder inhaltlichen SW-Änderung NUR die VERSION hochzählen.
// activate löscht dann automatisch alle alten Caches (auch die des Vorgänger-SW).
// ══════════════════════════════════════════════════════════

const VERSION  = 'v28';
const CACHE    = 'lagerchemie-' + VERSION;
const PRECACHE = ['./', './index.html'];

self.addEventListener('install', event => {
  // Baseline für Erst-Offline. Kein skipWaiting: das Update-Banner der App steuert den Wechsel.
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).catch(() => {}));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Banner-Button (applyUpdate) schickt SKIP_WAITING → wartenden SW aktivieren.
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

function istNavigation(req) {
  return req.mode === 'navigate' ||
    (req.method === 'GET' && (req.headers.get('accept') || '').includes('text/html'));
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return; // POST/PATCH/DELETE (Supabase) nie abfangen

  // ── HTML / Navigation: NETWORK-FIRST ──
  if (istNavigation(req)) {
    event.respondWith((async () => {
      try {
        const netRes = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put('./index.html', netRes.clone()); // Offline-Fallback frisch halten
        return netRes;
      } catch (e) {
        return (await caches.match(req)) ||
               (await caches.match('./index.html')) ||
               (await caches.match('./')) ||
               Response.error();
      }
    })());
    return;
  }

  // ── Sonstige GETs: STALE-WHILE-REVALIDATE ──
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    const netFetch = fetch(req).then(res => {
      if (res && res.status === 200) cache.put(req, res.clone());
      return res;
    }).catch(() => cached);
    return cached || netFetch;
  })());
});
