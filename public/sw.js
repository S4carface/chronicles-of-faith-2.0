// Narrowly-scoped service worker: persistently caches ONLY the five local
// Home-critical images (cache-first, with background revalidation) so a
// returning player's Home reveal never depends on a fresh network fetch for
// this specific artwork. Every other request — navigation, JS/CSS bundles,
// API calls, auth, leaderboard data, any other image — is a complete
// passthrough (no respondWith at all), so this worker can never serve a
// stale app shell or stale API/auth response after a redeploy.
//
// Bump CACHE_VERSION whenever one of these files' *content* changes at the
// same path (cache-first would otherwise keep serving the old bytes until
// the background revalidation fetch below happens to complete first).

const CACHE_VERSION = "v2";
const CACHE_NAME = `home-critical-${CACHE_VERSION}`;

// Keep in sync with HOME_LOCAL_CRITICAL_IMAGES in src/lib/preloadHomeAssets.js.
const CRITICAL_PATHS = [
  "/images/home/home-crest.webp",
  "/images/home/home-trophy.webp",
  "/images/home/home-prayer.webp",
  "/images/home/genesis-horizon.webp",
  "/images/home/home-celestial.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CRITICAL_PATHS))
      .catch(() => {
        // A failed pre-cache (e.g. install while offline) must never block
        // activation — the fetch handler below still caches these assets
        // opportunistically the next time each one loads successfully.
      })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith("home-critical-") && name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Complete passthrough for anything that isn't an exact-match GET to one
  // of the five known local paths — no respondWith call at all, so the
  // browser handles it exactly as if this worker didn't exist.
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!CRITICAL_PATHS.includes(url.pathname)) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);

      const revalidate = fetch(request)
        .then((response) => {
          if (response && response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => null);

      if (cached) {
        // Serve the cache hit immediately; keep the revalidation fetch
        // alive via waitUntil so the cache still refreshes for next time
        // even though this response doesn't wait on it.
        event.waitUntil(revalidate);
        return cached;
      }

      const fresh = await revalidate;
      return fresh || Response.error();
    })
  );
});
