const CACHE = "joita-farmassist-v3";
const ROOT = "/farmassist/";
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const response = await fetch(ROOT, { cache: "reload" });
      if (!response.ok) throw new Error("App unavailable");
      const html = await response.clone().text();
      await cache.put(ROOT, response);
      const assets = [
        ...html.matchAll(
          /(?:src|href)=["'](\/farmassist\/assets\/[^"']+)["']/g,
        ),
      ].map((match) => match[1]);
      await cache.addAll([
        ...new Set([
          ...assets,
          `${ROOT}manifest.webmanifest`,
            `${ROOT}icon.svg`,
            `${ROOT}logo.png`,
        ]),
      ]);
      await self.skipWaiting();
    })(),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("joita-farmassist-") && key !== CACHE)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  // Never cache health, provider requests, or third-party data as app-shell HTML.
  if (
    event.request.method !== "GET" ||
    url.origin !== self.location.origin ||
    !url.pathname.startsWith(ROOT)
  )
    return;
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then(async (response) => {
          if (response.ok) {
            const cache = await caches.open(CACHE);
            await cache.put(ROOT, response.clone());
          }
          return response;
        })
        .catch(() => caches.match(ROOT)),
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ||
        fetch(event.request).then(async (response) => {
          if (response.ok && response.type === "basic") {
            const cache = await caches.open(CACHE);
            await cache.put(event.request, response.clone());
          }
          return response;
        }),
    ),
  );
});
