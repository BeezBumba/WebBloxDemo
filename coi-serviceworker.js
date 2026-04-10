const CACHE_NAME = "rblx-cache-v1";

// List all the files you want to cache here
// Large files (rblx.wasm, rblx.data.*) are intentionally excluded to avoid
// exhausting iOS Cache API storage limits and causing install crashes on iPad.
const FILES_TO_CACHE = [
  "/",
  "/index.html",
  "/rblx.js",
  "/manifest.json",
  "/Roblox_Logo_2025.png"
];

// 1. Install event: Open cache and add all files
self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Pre-caching offline resources");
      return cache.addAll(FILES_TO_CACHE);
    })
  );
});

// 2. Activate event: Take control immediately
self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});

// Helper function to inject required Cross-Origin headers
function addHeaders(headers) {
  const h = new Headers(headers);
  if (!h.has("Cross-Origin-Opener-Policy"))
    h.set("Cross-Origin-Opener-Policy", "same-origin");
  if (!h.has("Cross-Origin-Embedder-Policy"))
    h.set("Cross-Origin-Embedder-Policy", "require-corp");
  if (!h.has("Cross-Origin-Resource-Policy"))
    h.set("Cross-Origin-Resource-Policy", "cross-origin");
  return h;
}

// 3. Fetch event: Cache-First, fallback to Network
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      // --- CACHE HIT ---
      if (cachedResponse) {
        // We found it in the cache, but we still need to attach the headers!
        const headers = addHeaders(cachedResponse.headers);
        return new Response(cachedResponse.body, {
          status: cachedResponse.status,
          statusText: cachedResponse.statusText,
          headers,
        });
      }

      // --- NETWORK FALLBACK ---
      // Not in cache — fetch from the network and store the result so subsequent
      // requests (and offline play after the first load) can be served from cache.
      return fetch(e.request)
        .then((networkResponse) => {
          // Only cache successful same-origin responses
          if (networkResponse.ok) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(e.request, responseToCache);
            });
          }
          const headers = addHeaders(networkResponse.headers);
          return new Response(networkResponse.body, {
            status: networkResponse.status,
            statusText: networkResponse.statusText,
            headers,
          });
        })
        .catch(() => {
          console.error("[Service Worker] Fetch failed and file not in cache:", e.request.url);
          // Optional: You could return a custom offline page here if you wanted to
        });
    })
  );
});
