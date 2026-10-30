import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vitest/config";

// CesiumJS 1.x core math, used only as a test oracle for parity checks.
const oracle = fileURLToPath(new URL("../core/Source", import.meta.url));
// Built CesiumJS 1.x (`npm run build` at the repo root), for the parity
// harness. CESIUM_BUILD_DIR overrides it (benchmark snapshots of a commit
// use the main checkout's build).
const cesium1x =
  process.env.CESIUM_BUILD_DIR ??
  fileURLToPath(new URL("../../Build/CesiumUnminified", import.meta.url));

const contentTypes: Record<string, string> = {
  ".js": "text/javascript",
  ".json": "application/json",
  ".css": "text/css",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".wasm": "application/wasm",
  ".svg": "image/svg+xml",
};

/**
 * Serves a local directory at `prefix` without copying it into the package:
 * the 1.x build for the parity harness, and optionally the Slang WASM build
 * (set SLANG_WASM_DIR) for the Slang spike.
 */
function serveDirectory(prefix: string, root: string): Plugin {
  const base = normalize(root);
  return {
    name: `serve-directory${prefix}`,
    configureServer(server) {
      server.middlewares.use(prefix, (req, res, next) => {
        const path = normalize(
          join(base, decodeURIComponent((req.url ?? "/").split("?")[0]!)),
        );
        if (
          !path.startsWith(base) ||
          !existsSync(path) ||
          statSync(path).isDirectory()
        ) {
          next();
          return;
        }
        res.setHeader(
          "Content-Type",
          contentTypes[extname(path)] ?? "application/octet-stream",
        );
        createReadStream(path).pipe(res);
      });
    },
  };
}

const slangWasm = process.env.SLANG_WASM_DIR;
// Sample models and tilesets checked into the 1.x repo, for parity tests.
const specsData = fileURLToPath(new URL("../../Specs/Data", import.meta.url));

export default defineConfig({
  server: { host: "127.0.0.1", port: 5190, strictPort: true },
  plugins: [
    serveDirectory("/cesium1x", cesium1x),
    serveDirectory("/specs-data", specsData),
    ...(slangWasm ? [serveDirectory("/slang-wasm", slangWasm)] : []),
  ],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2023",
    rollupOptions: {
      input: {
        demo: "demo/index.html",
        viewer: "viewer/index.html",
        parity: "parity/index.html",
        models: "parity/models.html",
        tileset: "parity/tileset.html",
        selection: "parity/selection.html",
        lod: "parity/lod.html",
        precision: "spikes/precision.html",
        worker: "spikes/worker.html",
        indirect: "spikes/indirect.html",
        alloc: "bench/alloc.html",
        slang: "spikes/slang.html",
        baseline: "bench/baseline.html",
      },
    },
  },
  resolve: {
    alias: {
      "cesium-oracle": oracle,
      // 1.x scene code (tile bounding volumes), also only for parity tests.
      "cesium-engine-oracle": fileURLToPath(
        new URL("../engine/Source", import.meta.url),
      ),
    },
  },
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
  },
});
