/*
 * 高校数学 読解教材 — service worker.
 *
 * Base-path aware: this file is served from `<base>sw.js` (e.g.
 * `/math2b-textbook/sw.js` on GitHub Pages) and derives the deployed base from
 * `self.registration.scope`, so the same file works at `/` locally and under
 * any base path without hardcoded absolute URLs.
 *
 * Caching strategy
 *   - install:   precache a small app shell (start page, offline fallback,
 *                manifest, icons). Individual failures are tolerated so one
 *                stale asset can never block activation.
 *   - navigations: network-first; a successfully fetched page is cached so
 *                previously visited pages keep working offline. On network
 *                failure we serve the cached page, then offline.html.
 *   - same-origin static assets (CSS/JS/fonts/images/webmanifest):
 *                stale-while-revalidate — cached bytes answer immediately and
 *                the network refreshes the entry in the background.
 *   - activate:  delete old versioned caches, then take control of open pages.
 */

const VERSION = 'v1';
const CACHE_PREFIX = 'math2b';
const CACHE_NAME = `${CACHE_PREFIX}-${VERSION}`;

const SCOPE = self.registration.scope;
const scopeUrl = (path) => new URL(path, SCOPE).href;

const OFFLINE_URL = scopeUrl('offline.html');

const PRECACHE_URLS = [
  SCOPE,
  OFFLINE_URL,
  scopeUrl('manifest.webmanifest'),
  scopeUrl('icons/icon-192.png'),
  scopeUrl('icons/icon-512.png'),
  scopeUrl('icons/icon-maskable-512.png'),
  scopeUrl('icons/icon.svg'),
];

const STATIC_DESTINATIONS = new Set([
  'style',
  'script',
  'worker',
  'font',
  'image',
  'manifest',
]);

const STATIC_EXTENSION =
  /\.(?:css|js|mjs|json|webmanifest|woff2?|ttf|otf|eot|png|jpe?g|gif|webp|avif|svg|ico)$/i;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await Promise.allSettled(
        PRECACHE_URLS.map((url) => cache.add(new Request(url, { cache: 'reload' }))),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

/**
 * Navigations: network-first with a cached-page fallback, then offline.html.
 */
async function handleNavigation(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached =
      (await cache.match(request, { ignoreSearch: true })) ?? (await cache.match(OFFLINE_URL));
    return cached ?? Response.error();
  }
}

/**
 * Same-origin static assets: stale-while-revalidate. Cached bytes answer
 * immediately; the revalidation result replaces them for the next visit.
 */
async function handleStaticAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const update = fetch(request)
    .then((response) => {
      if (response.ok) {
        void cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => undefined);

  if (cached) {
    return cached;
  }
  return (await update) ?? Response.error();
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  const isStatic =
    STATIC_DESTINATIONS.has(request.destination) || STATIC_EXTENSION.test(url.pathname);
  if (isStatic && !url.pathname.endsWith('/sw.js')) {
    event.respondWith(handleStaticAsset(request));
  }
});
