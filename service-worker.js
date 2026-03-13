const CACHE_NAME = "oyoon-hr-cache-v2";

const APP_ASSETS = [
  "/",
  "/login",
  "/dashboard",
  "/css/style.css",
  "/config/supabase.js",
  "/js/auth.js",
  "/js/app.js",
  "/js/employees.js",
  "/js/drivers.js",
  "/js/attendance.js",
  "/js/payroll.js",
  "/js/reports.js",
  "/manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_ASSETS)).catch(() => Promise.resolve())
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => key !== CACHE_NAME ? caches.delete(key) : Promise.resolve())
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  if (event.request.url.includes("supabase")) return;

  if (event.request.destination === "document") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((networkResponse) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      });
    })
  );
});
