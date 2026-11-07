// Kaelixo Progressive Web App Service Worker
const CACHE_NAME = "kaelixo-pwa-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Let network handle dynamic API and realtime requests normally
  if (event.request.method !== "GET" || event.request.url.includes("/api/") || event.request.url.includes("supabase.co")) {
    return;
  }
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
