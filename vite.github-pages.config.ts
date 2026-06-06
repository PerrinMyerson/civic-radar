import react from "@vitejs/plugin-react";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: "/civic-radar/",
  publicDir: resolve(rootDir, "public"),
  root: "github-pages",
  build: {
    emptyOutDir: true,
    outDir: "../gh-pages-dist",
    rollupOptions: {
      input: {
        index: resolve(rootDir, "github-pages/index.html"),
        methodology: resolve(rootDir, "github-pages/methodology.html"),
        myCivicRadar: resolve(rootDir, "github-pages/my-civic-radar.html"),
      },
    },
  },
  plugins: [react()],
});
