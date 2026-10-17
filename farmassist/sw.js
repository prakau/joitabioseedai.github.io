const CACHE = "joita-farmassist-v6-0718747fe738";
const ENTRY = "/farmassist/assets/index-C1bPGNa3.js";
const ASSETS = ["/farmassist/assets/Advisory-BN9wKucd.js","/farmassist/assets/CropDiary-DuVLE7Lq.js","/farmassist/assets/FarmCalculators-C81yA6PU.js","/farmassist/assets/FarmLedger-BWNXyCTZ.js","/farmassist/assets/FarmPlot-C6OPTozO.js","/farmassist/assets/FieldRecords-DNri5d3x.js","/farmassist/assets/RecordRecovery-d9vgmLO_.js","/farmassist/assets/SalePlanner-uZG_-vGa.js","/farmassist/assets/SoundMonitor-B8jowlmn.js","/farmassist/assets/farm-tools-CkWgd83X.js","/farmassist/assets/index-C1bPGNa3.js","/farmassist/assets/index-DLt7aJLj.css","/farmassist/assets/index-DsMeoRDn.js","/farmassist/assets/plus-BX3whnJS.js","/farmassist/assets/rotate-ccw-CuYajfUZ.js","/farmassist/assets/semanticSearch-Vq80XX9n.js","/farmassist/assets/share-2-OJiKSqYe.js","/farmassist/assets/undo-2-Depxgmdk.js","/farmassist/assets/web-7sh2wr8D.js","/farmassist/assets/web-BUmAy9WL.js","/farmassist/assets/web-CeVkQ9DY.js","/farmassist/assets/web-Dpl87ghl.js","/farmassist/logo.png","/farmassist/manifest.webmanifest"];
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
