const CACHE = "joita-farmassist-v6-ecd27bed345e";
const ENTRY = "/farmassist/assets/index-Bk2ZkSYs.js";
const ASSETS = ["/farmassist/assets/Advisory-Qd9lljLw.js","/farmassist/assets/CropDiary-BuXJQhhP.js","/farmassist/assets/FarmCalculators-D14Qpmpl.js","/farmassist/assets/FarmLedger-DcjZiIWh.js","/farmassist/assets/FarmPlot-D9qs8LEq.js","/farmassist/assets/FieldRecords-EpnSEeOq.js","/farmassist/assets/Market-CfLXA6uQ.js","/farmassist/assets/RecordRecovery-CO7qP-vF.js","/farmassist/assets/SalePlanner-CYZS6sq4.js","/farmassist/assets/SoundMonitor-DmCLHIWL.js","/farmassist/assets/farm-tools-CkWgd83X.js","/farmassist/assets/index-Bk2ZkSYs.js","/farmassist/assets/index-C8dHB11E.js","/farmassist/assets/index-mDwdWPgC.css","/farmassist/assets/plus-D7PkCtQ5.js","/farmassist/assets/rotate-ccw-BoDU5GnK.js","/farmassist/assets/semanticSearch-CAeQAA6f.js","/farmassist/assets/share-2-BzeaWkkN.js","/farmassist/assets/undo-2-C-rNQowI.js","/farmassist/assets/web-BTj6clqm.js","/farmassist/assets/web-Bl1lKX80.js","/farmassist/assets/web-Bz09rZ56.js","/farmassist/assets/web-NIjx1AiI.js","/farmassist/logo.png","/farmassist/manifest.webmanifest"];
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
