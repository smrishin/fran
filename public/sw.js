const CACHE_NAME = "fog-fire-offline-v1";
const APP_SHELL = [
  "/manifest.webmanifest",
  "/favicon-32.png",
  "/apple-touch-icon.png",
  "/icon-192.png",
  "/icon-512.png",
];

function isDashboardResponse(response, body) {
  return response.ok && body.includes('data-fog-fire-dashboard="true"');
}

async function cacheResponse(cache, request, response) {
  if (response.ok && response.type !== "opaque") await cache.put(request, response);
}

async function cacheDashboard() {
  const cache = await caches.open(CACHE_NAME);
  const response = await fetch(new Request("/", { credentials: "include", cache: "reload" }));
  const body = await response.clone().text();
  if (!isDashboardResponse(response, body)) return;

  await cache.put("/", response.clone());

  const assetPaths = [...body.matchAll(/(?:src|href)="([^"#]+)"/g)]
    .map((match) => new URL(match[1], self.location.origin))
    .filter((url) => url.origin === self.location.origin)
    .map((url) => url.pathname)
    .filter((path) => path !== "/" && !path.startsWith("/api/"));

  await Promise.all([...new Set([...APP_SHELL, ...assetPaths])].map(async (path) => {
    try {
      const asset = await fetch(new Request(path, { credentials: "include", cache: "reload" }));
      await cacheResponse(cache, path, asset);
    } catch {
      // A missing optional asset should not prevent the rest of the app caching.
    }
  }));

  try {
    const calendar = await fetch(new Request("/api/calendar", { credentials: "include", cache: "no-store" }));
    await cacheResponse(cache, "/api/calendar", calendar);
  } catch {
    // The dashboard remains useful offline even when no calendar was available.
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((name) => name.startsWith("fog-fire-offline-") && name !== CACHE_NAME).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "CACHE_APP") event.waitUntil(cacheDashboard());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (url.pathname === "/api/calendar") {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request);
        await cacheResponse(cache, "/api/calendar", response.clone());
        return response;
      } catch {
        return (await cache.match("/api/calendar")) ?? Response.json({
          configured: false,
          events: [],
          message: "Offline · no saved calendar available.",
        });
      }
    })());
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request);
        const body = await response.clone().text();
        if (isDashboardResponse(response, body)) await cache.put("/", response.clone());
        return response;
      } catch {
        return (await cache.match("/")) ?? Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    await cacheResponse(cache, request, response.clone());
    return response;
  })());
});
