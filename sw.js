/* ============================================================
   sw.js — Service Worker

   Strategie: stale-while-revalidate. Die App startet sofort aus
   dem Cache (auch offline) und aktualisiert sich im Hintergrund;
   die neue Fassung ist beim nächsten Öffnen aktiv.
   ============================================================ */

const VERSION = 'v1';
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
  './src/ui/widgets.js',
  './src/ui/modal.js',
  './src/ui/reactor.js',
  './src/ui/quickbar.js',
  './src/views/dashboard.js',
  './src/views/calendar.js',
  './src/views/todos.js',
  './src/views/finance.js',
  './src/views/debts.js',
  './src/views/bio.js',
  './src/views/settings.js',
  './src/integrations/whoop.js',
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

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // Proxy-Abrufe nie cachen

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req, { ignoreSearch: false });

    const network = fetch(req).then((res) => {
      if (res && res.ok && res.type === 'basic') cache.put(req, res.clone());
      return res;
    }).catch(() => null);

    if (cached) return cached;

    const fresh = await network;
    if (fresh) return fresh;

    // Offline und nicht im Cache: bei Navigationen die Startseite liefern.
    if (req.mode === 'navigate') {
      const shell = await cache.match('./index.html');
      if (shell) return shell;
    }
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  })());
});
