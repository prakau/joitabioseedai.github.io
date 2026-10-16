const CACHE = "joita-farmassist-v6-75c6e9dbcc5b";
const ENTRY = "/farmassist/assets/index-BsOjYa2E.js";
const ASSETS = ["/farmassist/assets/Advisory-6BrcXogp.js","/farmassist/assets/CropDiary-BHVa_uJ-.js","/farmassist/assets/FarmCalculators-CmifD07f.js","/farmassist/assets/FarmLedger-CRX01-J9.js","/farmassist/assets/FarmPlot-CET-oxUR.js","/farmassist/assets/FieldRecords-Coxz-rUQ.js","/farmassist/assets/RecordRecovery-BTuqoDhJ.js","/farmassist/assets/SalePlanner-CmTLR5AL.js","/farmassist/assets/SoundMonitor-D2oHCIfC.js","/farmassist/assets/farm-tools-CkWgd83X.js","/farmassist/assets/index-BsOjYa2E.js","/farmassist/assets/index-DnJ9JUZn.css","/farmassist/assets/plus-F4y7nKh3.js","/farmassist/assets/rotate-ccw-CK3W3aXA.js","/farmassist/assets/semanticSearch-CEVJGkD1.js","/farmassist/assets/share-2-Bb2DzBuv.js","/farmassist/assets/square-Ck8ox23C.js","/farmassist/assets/undo-2-DFjH1F_o.js","/farmassist/assets/web-DZNgXx73.js","/farmassist/assets/web-DrtRNvGX.js","/farmassist/assets/web-DwNwS0oN.js","/farmassist/assets/web-F8Ak82Sx.js","/farmassist/logo.png","/farmassist/manifest.webmanifest"];
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
