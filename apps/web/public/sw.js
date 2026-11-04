/*
 * EcoMap's service worker: just enough for the app to install on a phone and
 * to open without a connection.
 *
 * - Pages: network first, so a deploy shows up straight away; the last page
 *   seen is the fallback when offline.
 * - /assets/: cache first. Vite puts a content hash in every file name, so a
 *   cached file never goes stale - a new build has new names.
 * - Everything else (the API, map tiles from other sites, uploaded photos)
 *   goes straight to the network. Places must be current, and tile providers
 *   do not allow bulk caching.
 */

const CACHE = 'ecomap-v1';
const SHELL = '/';
/* Old builds' files pile up otherwise; a build has well under this many. */
const MAX_ASSETS = 80;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstPage(request));
  } else if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirstAsset(request));
  }
});

async function networkFirstPage(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    /* Every route is the same single-page app, so one copy serves them all. */
    if (response.ok) await cache.put(SHELL, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(SHELL);
    if (cached) return cached;
    throw error;
  }
}

async function cacheFirstAsset(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
    await trim(cache);
  }
  return response;
}

/** Drops the oldest assets (keys come back in the order they were added). */
async function trim(cache) {
  const assets = (await cache.keys()).filter((key) =>
    new URL(key.url).pathname.startsWith('/assets/'),
  );
  await Promise.all(assets.slice(0, -MAX_ASSETS).map((key) => cache.delete(key)));
}
