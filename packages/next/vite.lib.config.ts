// The library build (`npm run build:lib`): 2.0 as files a page can load
// with no build step of its own, from its server or another origin.
//
//   dist-lib/cesium-next.mjs   the ES module (shaders inlined)
//   dist-lib/assets/           the content worker, its chunks, and the
//                              Draco and Basis wasm, each found relative to
//                              the module that loads it (import.meta.url)
//   dist-lib/types/            type declarations (tsconfig.lib.json)
//
// A page imports it as a module:
//
//   <script type="module">
//     import { Engine } from "https://host/cesium-next/cesium-next.mjs";
//   </script>
//
// Served from another origin, the files need CORS headers (npm CDNs send
// them); the worker starts through a same-origin blob (WorkerPool).
import { defineConfig } from "vite";

export default defineConfig({
  // Asset URLs relative to the module that references them, not the page.
  base: "./",
  publicDir: false,
  build: {
    outDir: "dist-lib",
    emptyOutDir: true,
    target: "es2023",
    // Wasm and images as files, not data: URLs in the bundle.
    assetsInlineLimit: 0,
    rollupOptions: {
      input: { "cesium-next": "src/index.ts" },
      // Keep the entry's exports (a library, not an app).
      preserveEntrySignatures: "strict",
      output: {
        entryFileNames: "[name].mjs",
        chunkFileNames: "assets/[name]-[hash].mjs",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
  worker: {
    format: "es",
    rollupOptions: {
      output: {
        entryFileNames: "assets/[name]-[hash].mjs",
        chunkFileNames: "assets/[name]-[hash].mjs",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
});
