// The library build (`npm run build:lib`): 2.0 as files a page can load
// with no build step of its own, from its server or another origin.
//
//   dist-lib/cesium-next.mjs   the core's ES module (shaders inlined)
//   dist-lib/cesium-next-{time,frames,proj,measure,widgets}.mjs
//                              the other entry points (`@cesium/next/time`, ...)
//   dist-lib/assets/           the content worker, its chunks, and the
//                              Draco and Basis wasm, each found relative to
//                              the module that loads it (import.meta.url)
//   dist-lib/types/            type declarations (tsconfig.lib.json)
//   dist-lib/LICENSE.md        the license and third-party notices
//   dist-lib/package.json      the folder as the package `@cesium/next`: each
//                              entry point's module and declarations by name
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
import { skyPackGuard } from "./scripts/vitePluginSkyPack.ts";

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

/**
 * `dist-lib/package.json`: the library as the package `@cesium/next`, so its
 * entry points resolve by name for a bundler, for Node and for TypeScript
 * (the emitted declarations of the widgets import `@cesium/next`, `/time` and
 * `/frames` by name). Each export maps to its module and its declarations.
 */
function libraryPackage(): Plugin {
  return {
    name: "library-package",
    generateBundle() {
      const source = JSON.parse(
        readFileSync(
          fileURLToPath(new URL("./package.json", import.meta.url)),
          "utf8",
        ),
      ) as {
        version: string;
        license: string;
        exports: Record<string, string>;
      };
      const exports: Record<string, { types: string; import: string }> = {};
      for (const [key, path] of Object.entries(source.exports)) {
        exports[key] = {
          types: `./types/${path.replace(/^\.\/(src\/)?/, "").replace(/\.ts$/, ".d.ts")}`,
          import: `./cesium-next${key === "." ? "" : `-${key.slice(2)}`}.mjs`,
        };
      }
      this.emitFile({
        type: "asset",
        fileName: "package.json",
        source: `${JSON.stringify(
          {
            name: "@cesium/next",
            version: source.version,
            license: source.license,
            type: "module",
            exports,
          },
          null,
          2,
        )}\n`,
      });
    },
  };
}

export default defineConfig({
  // Asset URLs relative to the module that references them, not the page.
  base: "./",
  publicDir: false,
  plugins: [basisTranscoderEsm(), skyPackGuard(), licenses(), libraryPackage()],
  build: {
    outDir: "dist-lib",
    emptyOutDir: true,
    target: "es2023",
    // Wasm and images as files, not data: URLs in the bundle.
    assetsInlineLimit: 0,
    rollupOptions: {
      // The six entry points; what they share goes into chunks under
      // assets/, so a page loads only what its imports reach.
      input: {
        "cesium-next": "src/index.ts",
        "cesium-next-time": "src/time/index.ts",
        // Not `src/frames/index.ts` itself: see the file.
        "cesium-next-frames": "scripts/libEntries/frames.ts",
        "cesium-next-proj": "src/proj/index.ts",
        "cesium-next-measure": "src/measure/index.ts",
        "cesium-next-widgets": "widgets/index.ts",
      },
      // Keep the entries' exports (a library, not an app).
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
    plugins: () => [basisTranscoderEsm(), skyPackGuard()],
    rollupOptions: {
      output: {
        entryFileNames: "assets/[name]-[hash].mjs",
        chunkFileNames: "assets/[name]-[hash].mjs",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
});
