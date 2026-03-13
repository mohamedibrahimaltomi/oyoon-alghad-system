const CACHE_NAME = "oyoon-option1-v1";
const APP_ASSETS = [
  "/",
  "/index.html",
  "/login.html",
  "/dashboard.html",
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
    caches.keys().then((keys) => Promise.all(keys.map((key) => key !== CACHE_NAME ? caches.delete(key) : Promise.resolve())))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(() => caches.match("/login.html"));
    })
  );
});
