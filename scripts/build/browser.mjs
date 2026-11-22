// The umbrella's browser build (CS-363's shape, CS-612): 2.0 as files a
// page can load with no build step of its own, from its server or another
// origin. Every package is bundled in, from source.
//
//   packages/cesium/dist/browser/cesium-next.mjs   the core's ES module (shaders inlined)
//   packages/cesium/dist/browser/cesium-next-{time,frames,crs,measure,ui}.mjs
//                                                  the other entry points (`@cesium/next/time`, ...)
//   packages/cesium/dist/browser/assets/           the content worker, its chunks, and the
//                                                  Draco and Basis wasm, each found relative to
//                                                  the module that loads it (import.meta.url)
//   packages/cesium/dist/browser/LICENSE.md        the license and third-party notices
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
//
// It has no declarations of its own: an application with a compiler uses
// the packages, whose declarations are in each package's dist/types.
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build, defaultClientConditions } from "vite";
import { basisTranscoderEsm } from "./basisTranscoderEsm.ts";
import { skyPackGuard } from "./vitePluginSkyPack.ts";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..", "..");
const umbrella = join(repo, "packages", "cesium");

/** The repository's license and third-party notices, beside the library. */
function licenses() {
  return {
    name: "library-licenses",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "LICENSE.md",
        source: readFileSync(join(repo, "LICENSE.md"), "utf8"),
      });
    },
  };
}

/** Output names for chunks, workers and assets. */
const ASSETS = {
  chunkFileNames: "assets/[name]-[hash].mjs",
  assetFileNames: "assets/[name]-[hash][extname]",
};

/**
 * The six entry points, by output name; what they share goes into chunks
 * under assets/, so a page loads only what its imports reach.
 */
export const BROWSER_ENTRIES = {
  "cesium-next": join(umbrella, "src/index.ts"),
  "cesium-next-time": join(umbrella, "src/time.ts"),
  // Not frames' index itself: see the file.
  "cesium-next-frames": join(here, "browserFrames.ts"),
  "cesium-next-crs": join(umbrella, "src/crs.ts"),
  "cesium-next-measure": join(umbrella, "src/measure.ts"),
  "cesium-next-ui": join(umbrella, "src/ui.ts"),
};

/**
 * Builds the browser bundle into `outDir` (packages/cesium/dist/browser by
 * default), emptying it first.
 * @param {{ outDir?: string, logLevel?: "info" | "warn" | "error" | "silent" }} [options]
 */
export async function buildBrowser(options = {}) {
  return build({
    configFile: false,
    root: umbrella,
    // Asset URLs relative to the module that references them, not the page.
    base: "./",
    publicDir: false,
    mode: "production",
    logLevel: options.logLevel ?? "warn",
    // 2.0's packages resolve to their sources (the @cesium/source export
    // condition, which a release strips), so nothing needs a build first.
    resolve: { conditions: ["@cesium/source", ...defaultClientConditions] },
    plugins: [basisTranscoderEsm(), skyPackGuard(), licenses()],
    build: {
      outDir: options.outDir ?? join(umbrella, "dist", "browser"),
      emptyOutDir: true,
      target: "es2023",
      // Wasm and images as files, not data: URLs in the bundle.
      assetsInlineLimit: 0,
      reportCompressedSize: false,
      rolldownOptions: {
        input: BROWSER_ENTRIES,
        // Keep the entries' exports (a library, not an app).
        preserveEntrySignatures: "strict",
        output: { entryFileNames: "[name].mjs", ...ASSETS },
      },
    },
    worker: {
      format: "es",
      // Worker bundles take their own plugins (the Basis glue is decoded there).
      plugins: () => [basisTranscoderEsm(), skyPackGuard()],
      rolldownOptions: {
        output: { entryFileNames: "assets/[name]-[hash].mjs", ...ASSETS },
      },
    },
  });
}
