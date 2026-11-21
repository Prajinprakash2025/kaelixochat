// Kaelixo Progressive Web App Service Worker
const CACHE_NAME = "kaelixo-pwa-v2";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Purge any stale or corrupt caches to prevent Edge/Chrome PWA reload crash loops
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  // Let network handle non-GET, API, Supabase, audio/video streaming directly
  if (
    event.request.method !== "GET" ||
    event.request.url.includes("/api/") ||
    event.request.url.includes("supabase.co") ||
    event.request.url.includes("googlevideo.com") ||
    event.request.url.includes("youtube.com")
  ) {
    return;
  }

  // Robust network-first strategy that NEVER resolves undefined to respondWith
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        return response;
      })
      .catch(async () => {
        try {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          if (event.request.mode === "navigate") {
            const root = await caches.match("/");
            if (root) return root;
          }
        } catch {}
        // Fallback valid Response object so Chromium PWA never crashes with 'The parameter is not a valid Response object'
        return new Response("Offline", { status: 503, statusText: "Offline" });
      })
  );
});
