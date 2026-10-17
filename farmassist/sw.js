const CACHE = "joita-farmassist-v6-be0da4551003";
const ENTRY = "/farmassist/assets/index-7Dcd2c6p.js";
const ASSETS = ["/farmassist/assets/Advisory-DG3MFZKI.js","/farmassist/assets/CropDiary-DvPND29h.js","/farmassist/assets/FarmCalculators-DMd611HB.js","/farmassist/assets/FarmLedger-SnZ_YNP1.js","/farmassist/assets/FarmPlot-DXlHomSz.js","/farmassist/assets/FieldRecords-Bhr67ESJ.js","/farmassist/assets/RecordRecovery-Ce0uW1eQ.js","/farmassist/assets/SalePlanner-CRBcTNAZ.js","/farmassist/assets/SoundMonitor-B188oN-8.js","/farmassist/assets/farm-tools-CkWgd83X.js","/farmassist/assets/index-7Dcd2c6p.js","/farmassist/assets/index-DLt7aJLj.css","/farmassist/assets/index-WYrq1AYY.js","/farmassist/assets/plus-BsABwY0p.js","/farmassist/assets/rotate-ccw-nYD-g8FV.js","/farmassist/assets/semanticSearch-g51e3jGy.js","/farmassist/assets/share-2-Dgi9UW8X.js","/farmassist/assets/undo-2-D55B_v4K.js","/farmassist/assets/web-Bf2GCi3Q.js","/farmassist/assets/web-BjmwAD3r.js","/farmassist/assets/web-CmzGHNyK.js","/farmassist/assets/web-WoJyw40h.js","/farmassist/logo.png","/farmassist/manifest.webmanifest"];
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
