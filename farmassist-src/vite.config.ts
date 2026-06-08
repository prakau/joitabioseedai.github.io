import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/farmassist/",
  build: {
    outDir: "../farmassist",
    emptyOutDir: true,
    sourcemap: false
  }
});
