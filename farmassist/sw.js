const CACHE = "joita-farmassist-v6-85c8c2b9c7be";
const ENTRY = "/farmassist/assets/index-DFqYN-O7.js";
const ASSETS = ["/farmassist/assets/Advisory-XawR4Edl.js","/farmassist/assets/CropDiary-CqED8VOl.js","/farmassist/assets/CropSeasons-BD_KZiIx.js","/farmassist/assets/FarmCalculators-Civ12G0O.js","/farmassist/assets/FarmLedger-CWl1saVD.js","/farmassist/assets/FarmPlot-DPdAoDXi.js","/farmassist/assets/FieldRecords-MYgsf5hd.js","/farmassist/assets/Market-DwLG5Ej_.js","/farmassist/assets/RecordRecovery-2wObkqHy.js","/farmassist/assets/SalePlanner-DBfaZs9K.js","/farmassist/assets/SoundMonitor-CzG-fExj.js","/farmassist/assets/archive-8jQIiu2Q.js","/farmassist/assets/check-DJxhPsCE.js","/farmassist/assets/farm-tools-CkWgd83X.js","/farmassist/assets/index-BKHxs3Tz.css","/farmassist/assets/index-DFqYN-O7.js","/farmassist/assets/index-DrD2GViT.js","/farmassist/assets/plus-DaFexC4U.js","/farmassist/assets/rotate-ccw-CMAMAMJs.js","/farmassist/assets/semanticSearch-DrRJOnOj.js","/farmassist/assets/share-2-BqAbh4dH.js","/farmassist/assets/undo-2-DR56ig60.js","/farmassist/assets/web-C2Hf3MKb.js","/farmassist/assets/web-C2JbuPf7.js","/farmassist/assets/web-D2lWwWe8.js","/farmassist/assets/web-R8qwlv7i.js","/farmassist/logo.png","/farmassist/manifest.webmanifest"];
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
