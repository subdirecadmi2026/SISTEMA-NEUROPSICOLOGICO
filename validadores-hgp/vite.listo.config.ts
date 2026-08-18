import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  base: "./",
  build: {
    outDir: "dist-listo",
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
    modulePreload: false,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
