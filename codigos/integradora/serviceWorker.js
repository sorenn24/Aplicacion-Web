// serviceWorker.js — MediHom integradora
const CACHE_VERSION = "v1.0.0";
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;

// Páginas y archivos 
const PRECACHE_URLS = [
                     
  "/integradora/index.html",
  "/integradora/offline.html",

  "/integradora/home/home.css",
  "/integradora/home/home.js",
  "/integradora/home/logo.png",
  "/integradora/home/manifest.json",

  "/integradora/login/index.html",
  "/integradora/login/app.js",
  "/integradora/login/styles.css",

  "/integradora/dashboard/dashboard.html",
  "/integradora/dashboard/dashboard.js",
  "/integradora/dashboard/dashboard.css"
];

//  Endpoints de autenticación que no deben cachearse
const AUTH_BLOCKLIST = ["/api/auth/login", "/api/auth/register", "/api/auth/me"];

//  INSTALACIÓN
self.addEventListener("install", (event) => {
  console.log("[SW] Instalando service worker...");
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

//  ACTIVACIÓN
self.addEventListener("activate", (event) => {
  console.log("[SW] Activado, limpiando cachés viejas...");
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

//  ESTRATEGIAS DE RESPUESTA
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Solo GET
  if (req.method !== "GET") return;

  // No cachear endpoints de auth
  if (AUTH_BLOCKLIST.some((p) => url.pathname.startsWith(p))) return;

  // Navegación (HTML)
  if (req.mode === "navigate") {
    event.respondWith(networkFirst(req));
    return;
  }

  // Archivos estáticos locales
  if (url.origin === location.origin) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // Por defecto → red normal
  event.respondWith(fetch(req));
});

async function networkFirst(req) {
  try {
    const fresh = await fetch(req);
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(req, fresh.clone());
    return fresh;
  } catch {
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(req);
    return cached || (await cache.match("./offline.html"));
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(req);
  const fetchPromise = fetch(req)
    .then((res) => {
      if (res && res.status === 200) cache.put(req, res.clone());
      return res;
    })
    .catch(() => null);
  return cached || fetchPromise;
}
