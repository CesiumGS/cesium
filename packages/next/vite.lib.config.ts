// The library build (`npm run build:lib`): 2.0 as files a page can load
// with no build step of its own, from its server or another origin.
//
//   dist-lib/cesium-next.mjs   the ES module (shaders inlined)
//   dist-lib/assets/           the content worker, its chunks, and the
//                              Draco and Basis wasm, each found relative to
//                              the module that loads it (import.meta.url)
//   dist-lib/types/            type declarations (tsconfig.lib.json)
//   dist-lib/LICENSE.md        the license and third-party notices
//
// A page imports it as a module:
//
//   <script type="module">
//     import { Engine } from "https://host/cesium-next/cesium-next.mjs";
//   </script>
//
// Served from another origin, the files need CORS headers (npm CDNs send
// them); the worker starts through a same-origin blob (WorkerPool). Nothing
// generates code at runtime: a Content Security Policy needs only
// 'wasm-unsafe-eval', and only for the worker (basisTranscoderEsm.ts).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import { basisTranscoderEsm } from "./basisTranscoderEsm.ts";

/** The repository's license and third-party notices, beside the library. */
function licenses(): Plugin {
  return {
    name: "library-licenses",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "LICENSE.md",
        source: readFileSync(
          fileURLToPath(new URL("../../LICENSE.md", import.meta.url)),
          "utf8",
        ),
      });
    },
  };
}

export default defineConfig({
  // Asset URLs relative to the module that references them, not the page.
  base: "./",
  publicDir: false,
  plugins: [basisTranscoderEsm(), licenses()],
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
    // Worker bundles take their own plugins (the Basis glue is decoded there).
    plugins: () => [basisTranscoderEsm()],
    rollupOptions: {
      output: {
        entryFileNames: "assets/[name]-[hash].mjs",
        chunkFileNames: "assets/[name]-[hash].mjs",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
});
