const CACHE = "__JOITA_CACHE__";
const ENTRY = "__JOITA_ENTRY__";
const ASSETS = /* __JOITA_ASSETS__ */ [];
const ROOT = "/farmassist/";
const READY = `${ROOT}offline-ready`;

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(ROOT, { cache: "reload" });
      if (!response.ok || !(await response.clone().text()).includes(ENTRY)) throw new Error("App version changed during download");
      await cache.addAll(ASSETS.map(url => new Request(url, { cache: "reload" })));
      await cache.put(ROOT, response);
      await cache.put(READY, new Response("ready"));
      await self.skipWaiting();
    } catch (error) {
      await caches.delete(CACHE);
      throw error;
    }
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const older = (await caches.keys()).filter(key => key.startsWith("joita-farmassist-") && key !== CACHE);
    // Keep one previous build so already-open tabs can still load their tools.
    await Promise.all(older.slice(0, -1).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin || !url.pathname.startsWith(ROOT)) return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(async () =>
      (await (await caches.open(CACHE)).match(ROOT)) || Response.error()));
    return;
  }
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(event.request) || await caches.match(event.request);
    if (cached) return cached;
    return fetch(event.request);
  })());
});
