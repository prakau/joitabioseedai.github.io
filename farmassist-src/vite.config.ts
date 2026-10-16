import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

function offlineTools() {
  return {
    name: "joitafa-offline-tools",
    generateBundle(_options: unknown, bundle: import("rollup").OutputBundle) {
      const files = Object.keys(bundle).filter(file => !file.endsWith(".map")).sort();
      const workerTemplate = readFileSync(new URL("./src/service-worker.js", import.meta.url), "utf8");
      const revision = createHash("sha256");
      revision.update(workerTemplate);
      for (const file of files) {
        const output = bundle[file];
        revision.update(file).update(output.type === "chunk" ? output.code : output.source);
      }
      for (const file of ["logo.png", "manifest.webmanifest"]) revision.update(readFileSync(new URL(`./public/${file}`, import.meta.url)));
      const assets = [...files.map(file => `/farmassist/${file}`), "/farmassist/logo.png", "/farmassist/manifest.webmanifest"];
      const entry = files.find(file => bundle[file].type === "chunk" && (bundle[file] as import("rollup").OutputChunk).isEntry);
      if (!entry) throw new Error("Offline build has no application entry");
      const source = workerTemplate
        .replace('"__JOITA_CACHE__"', JSON.stringify(`joita-farmassist-v6-${revision.digest("hex").slice(0, 12)}`))
        .replace('"__JOITA_ENTRY__"', JSON.stringify(`/farmassist/${entry}`))
        .replace("/* __JOITA_ASSETS__ */ []", JSON.stringify(assets));
      this.emitFile({ type: "asset", fileName: "sw.js", source });
    },
  } satisfies import("vite").Plugin;
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === "android" ? [] : [offlineTools()])],
  base: mode === "android" ? "/" : "/farmassist/",
  server: { proxy: { "/api": { target: "https://www.joitabioseedai.com", changeOrigin: true } } },
  build: {
    outDir: mode === "android" ? "dist-android" : "../farmassist",
    emptyOutDir: true,
    sourcemap: false
  }
}));
