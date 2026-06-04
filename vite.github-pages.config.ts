import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/civic-radar/",
  root: "github-pages",
  build: {
    emptyOutDir: true,
    outDir: "../gh-pages-dist",
  },
  plugins: [react()],
});
