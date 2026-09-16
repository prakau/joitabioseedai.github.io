import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === "android" ? "/" : "/farmassist/",
  server: { proxy: { "/api": { target: "https://www.joitabioseedai.com", changeOrigin: true } } },
  build: {
    outDir: mode === "android" ? "dist-android" : "../farmassist",
    emptyOutDir: true,
    sourcemap: false
  }
}));
