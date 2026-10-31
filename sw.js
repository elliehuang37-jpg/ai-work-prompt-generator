// Bump the cache version whenever a deployed app-shell asset changes.
const scopeURL = new URL('./', self.location.href);
const CACHE_PREFIX = 'work-prompt-studio-' + encodeURIComponent(scopeURL.pathname) + '-';
const CACHE_NAME = CACHE_PREFIX + 'pwa-1';
const SHELL = [
  './', 'index.html', 'styles.css', 'avon-visual.css?v=1.1',
  'app.js?v=2.1', 'engine.js?v=2.1', 'quality.js?v=2.1',
  'department-rules.js', 'catalog.json?v=2.1', 'pwa.js?v=1',
  'pwa.css?v=1', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png',
  'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png',
  'assets/avon-logo.png', 'assets/avon-fragrance.png',
  'assets/avon-confidence.png', 'assets/avon-colour-pearls.png'
];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(SHELL.map(file => new Request(new URL(file, scopeURL), {cache: 'reload'})));
    } catch (error) {
      await caches.delete(CACHE_NAME);
      throw error;
    }
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    // Preserve other apps' caches when this origin hosts multiple GitHub Pages apps.
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== scopeURL.origin || !url.pathname.startsWith(scopeURL.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    if (request.mode === 'navigate') return (await cache.match(new URL('index.html', scopeURL).href)) || fetch(request);
    // Queries in the shell list match the app imports exactly; ignoreSearch also
    // lets the manifest's unversioned URLs work offline without duplicate entries.
    return (await cache.match(request, {ignoreSearch: true})) || fetch(request);
  })());
});
