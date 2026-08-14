/* ============================================================
   sw.js — Service Worker für Fol Prizren

   Strategie wie beim Life-Planner: Netz zuerst, Cache als
   Rückfall. So kommen Aktualisierungen sofort an, und ohne
   Empfang läuft die App trotzdem vollständig weiter.

   Der Geltungsbereich ist bewusst nur dieser Unterordner —
   die App im Hauptverzeichnis bleibt davon unberührt.
   ============================================================ */

const VERSION = 'v1';
const CACHE = `fol-prizren-${VERSION}`;
const NETWORK_TIMEOUT_MS = 3500;

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './styles/app.css',
  './src/main.js',
  './src/state.js',
  './src/util.js',
  './src/audio.js',
  './src/speech.js',
  './src/ui/kit.js',
  './src/data/lexicon.js',
  './src/data/course.js',
  './src/data/grammar.js',
  './src/data/badges.js',
  './src/engine/srs.js',
  './src/engine/exercises.js',
  './src/views/path.js',
  './src/views/lesson.js',
  './src/views/practice.js',
  './src/views/dict.js',
  './src/views/notes.js',
  './src/views/profile.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn('[sw] Vorrat unvollständig:', err)),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith('fol-prizren-') && k !== CACHE)
          .map((k) => caches.delete(k)),
      ))
      .then(() => self.clients.claim()),
  );
});

function fromNetwork(request) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Zeitüberschreitung')), NETWORK_TIMEOUT_MS);
    fetch(request).then(
      (response) => { clearTimeout(timer); resolve(response); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    fromNetwork(request)
      .then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const hit = await caches.match(request);
        if (hit) return hit;
        // Navigation ohne Treffer: die Startseite aus dem Vorrat liefern.
        if (request.mode === 'navigate') {
          const shell = await caches.match('./index.html');
          if (shell) return shell;
        }
        return new Response('Offline und nichts im Zwischenspeicher.', {
          status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }),
  );
});
