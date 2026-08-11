/* ============================================================
   sw.js — Service Worker

   Strategie: Netz zuerst, Cache als Rückfall.

   Vorher galt "Cache zuerst" — das war ein Fehlgriff: die App zeigte
   nach einer Aktualisierung noch tagelang den alten Stand, weil der
   Cache immer gewann. Jetzt wird online immer die aktuelle Fassung
   geholt; der Cache springt nur ein, wenn kein Netz da ist oder die
   Antwort zu lange dauert. Offline funktioniert damit unverändert.
   ============================================================ */

const VERSION = 'v6';
const NETWORK_TIMEOUT_MS = 3500;
const CACHE = `life-os-${VERSION}`;

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './styles/main.css',
  './src/main.js',
  './src/store.js',
  './src/util.js',
  './src/charts.js',
  './src/seed.js',
  './src/nav.js',
  './src/quickparse.js',
  './src/sync/merge.js',
  './src/sync/crypto.js',
  './src/sync/providers.js',
  './src/sync/engine.js',
  './src/ui/widgets.js',
  './src/ui/modal.js',
  './src/ui/reactor.js',
  './src/ui/quickbar.js',
  './src/ui/search.js',
  './src/ui/recurring-panel.js',
  './src/recurring.js',
  './src/build.js',
  './src/views/dashboard.js',
  './src/views/calendar.js',
  './src/views/todos.js',
  './src/views/finance.js',
  './src/views/debts.js',
  './src/views/bio.js',
  './src/views/settings.js',
  './src/integrations/whoop.js',
  './src/integrations/google.js',
  './src/integrations/connections.js',
  './src/ui/connections-panel.js',
  './src/integrations/garmin.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Einzeln ablegen: eine fehlende Datei darf die Installation nicht kippen.
    await Promise.all(ASSETS.map((url) => cache.add(url).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

/**
 * Nur der Programmcode gehört in den Cache. Datenabrufe — Abgleich,
 * Whoop-Proxy — dürfen niemals aus dem Cache kommen, sonst arbeitet die
 * App mit einem veralteten Stand und überschreibt frische Daten.
 */
function isAppAsset(req, url) {
  if (req.mode === 'navigate') return true;
  if (req.cache === 'no-store' || req.cache === 'reload') return false;
  return /\.(?:js|css|html|png|svg|webmanifest|ico|woff2?)$/i.test(url.pathname);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // fremde Hosts nie anfassen
  if (!isAppAsset(req, url)) return;                 // Daten immer frisch holen

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);

    // Zu langsames Netz soll den Start nicht blockieren — nach ein paar
    // Sekunden übernimmt der Cache.
    const timeout = new Promise((resolve) => setTimeout(() => resolve(null), NETWORK_TIMEOUT_MS));
    const network = fetch(req).then((res) => {
      if (res && res.ok && res.type === 'basic') cache.put(req, res.clone());
      return res;
    }).catch(() => null);

    const fresh = await Promise.race([network, timeout]);
    if (fresh) return fresh;

    const cached = await cache.match(req, { ignoreSearch: false });
    if (cached) return cached;

    // Weder Netz noch Cache: bei Navigationen die Startseite liefern.
    if (req.mode === 'navigate') {
      const shell = await cache.match('./index.html');
      if (shell) return shell;
    }
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  })());
});
