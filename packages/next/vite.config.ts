import { createReadStream, existsSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
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

/**
 * Benchmark suite results (outside the repo: they carry machine details),
 * for the results page: `index.json` lists the runs, newest first.
 */
function serveBenchResults(prefix: string, root: string): Plugin {
  return {
    name: "serve-bench-results",
    configureServer(server) {
      server.middlewares.use(`${prefix}/index.json`, (_req, res) => {
        const names = existsSync(root) ? readdirSync(root) : [];
        const runs = names
          .filter((n) => n.endsWith(".json") && !n.endsWith(".summary.json"))
          .sort()
          .reverse();
        const summaries = names.filter((n) => n.endsWith(".summary.json"));
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ directory: root, runs, summaries }));
      });
    },
  };
}
const benchResults =
  process.env.BENCH_RESULTS ?? join(homedir(), ".cesium-bench", "results");

const slangWasm = process.env.SLANG_WASM_DIR;
// Sample models and tilesets checked into the 1.x repo, for parity tests.
const specsData = fileURLToPath(new URL("../../Specs/Data", import.meta.url));

export default defineConfig({
  server: { host: "127.0.0.1", port: 5190, strictPort: true },
  plugins: [
    serveDirectory("/cesium1x", cesium1x),
    serveDirectory("/specs-data", specsData),
    serveBenchResults("/bench-results", benchResults),
    serveDirectory("/bench-results", benchResults),
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
        globe: "parity/globe.html",
        heights: "parity/heights.html",
        imagery: "parity/imagery.html",
        lod: "parity/lod.html",
        precision: "spikes/precision.html",
        worker: "spikes/worker.html",
        indirect: "spikes/indirect.html",
        alloc: "bench/alloc.html",
        slang: "spikes/slang.html",
        baseline: "bench/baseline.html",
        hitch: "bench/hitch.html",
        instances: "bench/instances.html",
        suite: "bench/suite/suite.html",
        results: "bench/suite/results.html",
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
