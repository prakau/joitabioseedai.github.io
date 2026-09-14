import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/farmassist/",
  server: { proxy: { "/api": { target: "https://www.joitabioseedai.com", changeOrigin: true } } },
  build: {
    outDir: "../farmassist",
    emptyOutDir: true,
    sourcemap: false
  }
});
