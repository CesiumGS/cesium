import { execSync } from "node:child_process";
import {
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vitest/config";
import { basisTranscoderEsm } from "./basisTranscoderEsm.ts";

// CesiumJS 1.x core math, used only as a test oracle for parity checks.
const oracle = fileURLToPath(new URL("../core/Source", import.meta.url));
// Built CesiumJS 1.x (`npm run build` at the repo root), for the parity
// harness. CESIUM_BUILD_DIR overrides it (benchmark snapshots of a commit
// use the main checkout's build).
const cesium1x =
  process.env.CESIUM_BUILD_DIR ??
  fileURLToPath(new URL("../../Build/CesiumUnminified", import.meta.url));

const contentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
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
          .filter((n) => /Z\.json$/.test(n))
          .sort()
          .reverse();
        const summaries = names.filter((n) => n.endsWith(".summary.json"));
        res.setHeader("Content-Type", "application/json");
        // The working tree's branch names its engines ("2.0@<branch>").
        let branch: string | undefined;
        try {
          branch = execSync("git rev-parse --abbrev-ref HEAD", {
            encoding: "utf8",
          }).trim();
        } catch {
          // Not a git checkout.
        }
        res.end(JSON.stringify({ directory: root, runs, summaries, branch }));
      });
      // Image checks (bench/suite/images.mjs): runs, and review decisions
      // from Dyno's Images tab (approve copies the image into baselines).
      const imagesDir = join(root, "images");
      server.middlewares.use(`${prefix}/images/index.json`, (_req, res) => {
        const names = existsSync(imagesDir)
          ? readdirSync(imagesDir).filter((n) => /Z\.json$/.test(n))
          : [];
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ runs: names.sort().reverse() }));
      });
      server.middlewares.use(`${prefix}/images/review`, (req, res, next) => {
        if (req.method !== "POST") {
          next();
          return;
        }
        let body = "";
        req.on("data", (chunk: Buffer) => {
          body += chunk;
        });
        req.on("end", () => {
          void (async () => {
            try {
              const { run, key, decision, note } = JSON.parse(body) as Record<
                string,
                string
              >;
              if (!/^[\w-]+Z\.json$/.test(run ?? "")) {
                throw new Error("bad run");
              }
              const file = join(imagesDir, run!);
              const data = JSON.parse(readFileSync(file, "utf8"));
              const row = data.checks.find(
                (r: { key: string }) => r.key === key,
              );
              if (!row) {
                throw new Error("no such check");
              }
              const by = (() => {
                try {
                  return execSync("git config user.name", {
                    encoding: "utf8",
                  }).trim();
                } catch {
                  return "dyno";
                }
              })();
              const at = new Date().toISOString();
              if (decision === "approve") {
                const { approve } = await import("./bench/suite/images.mjs");
                approve(
                  join(root, "baselines", data.rendererClass),
                  key!,
                  join(imagesDir, run!.replace(/\.json$/, ""), row.image),
                  {
                    approvedBy: by,
                    commit: data.commit,
                    reason: note || "approved in Dyno",
                  },
                );
                row.approved = true;
              }
              row.review = { decision, note: note ?? "", by, at };
              writeFileSync(file, JSON.stringify(data, null, 1));
              res.statusCode = 204;
              res.end();
            } catch (e) {
              res.statusCode = 400;
              res.end(String(e));
            }
          })();
        });
      });
      // Alert triage (status, owner, note per alert), saved from Dyno.
      server.middlewares.use(`${prefix}/triage.json`, (req, res, next) => {
        if (req.method !== "POST") {
          // Nothing triaged yet reads as no triage, not a missing file.
          if (!existsSync(join(root, "triage.json"))) {
            res.setHeader("Content-Type", "application/json");
            res.end("{}");
            return;
          }
          next();
          return;
        }
        let body = "";
        req.on("data", (chunk: Buffer) => {
          body += chunk;
          if (body.length > 4 << 20) {
            req.destroy();
          }
        });
        req.on("end", () => {
          try {
            const triage = JSON.parse(body) as unknown;
            if (
              !triage ||
              typeof triage !== "object" ||
              Array.isArray(triage)
            ) {
              throw new Error("triage must be an object");
            }
            mkdirSync(root, { recursive: true });
            writeFileSync(
              join(root, "triage.json"),
              JSON.stringify(triage, null, 1),
            );
            res.statusCode = 204;
            res.end();
          } catch (e) {
            res.statusCode = 400;
            res.end(String(e));
          }
        });
      });
    },
  };
}
const benchResults =
  process.env.BENCH_RESULTS ?? join(homedir(), ".cesium-bench", "results");
// Released CesiumJS builds fetched by the suite (bench/suite/release.mjs).
const cesiumReleases =
  process.env.BENCH_CESIUM_DIR ?? join(homedir(), ".cesium-bench", "cesium");

const slangWasm = process.env.SLANG_WASM_DIR;
// Sample models and tilesets checked into the 1.x repo, for parity tests.
const specsData = fileURLToPath(new URL("../../Specs/Data", import.meta.url));

export default defineConfig({
  server: { host: "127.0.0.1", port: 5190, strictPort: true },
  // Every bare import, bundled at startup: a dependency discovered later
  // (say Dyno's React) re-bundles them all under a new hash, and a content
  // worker that already loaded keeps importing the old one (a 504 from the
  // dev server, so 2.0 never loads a tile until the page reloads).
  optimizeDeps: {
    include: [
      "meshoptimizer/decoder",
      "draco3d/draco_decoder_nodejs.js",
      "ktx-parse",
      "react",
      "react/jsx-runtime",
      "react-dom/client",
      "@tanstack/react-router",
      "@mui/material",
      "@stratakit/mui",
      "@stratakit/structures",
    ],
  },
  plugins: [
    basisTranscoderEsm(),
    serveDirectory("/cesium1x", cesium1x),
    serveDirectory("/specs-data", specsData),
    serveBenchResults("/bench-results", benchResults),
    serveDirectory("/bench-results", benchResults),
    serveDirectory("/cesium-release", cesiumReleases),
    // 1.x built at git refs, in snapshot worktrees (<repo>/.bench/<sha>).
    serveDirectory(
      "/cesium-ref",
      fileURLToPath(new URL("../../.bench", import.meta.url)),
    ),
    ...(slangWasm ? [serveDirectory("/slang-wasm", slangWasm)] : []),
  ],
  // Worker bundles take their own plugins (the Basis glue is decoded there).
  worker: { plugins: () => [basisTranscoderEsm()] },
  build: {
    // StrataKit icons are SVG sprites referenced by URL (#icon), never inlined.
    assetsInlineLimit: (file: string) =>
      file.endsWith(".svg") ? false : undefined,
    outDir: "dist",
    emptyOutDir: true,
    target: "es2023",
    rollupOptions: {
      input: {
        dyno: "index.html",
        demo: "demo/index.html",
        parity: "parity/index.html",
        models: "parity/models.html",
        tileset: "parity/tileset.html",
        selection: "parity/selection.html",
        globe: "parity/globe.html",
        heights: "parity/heights.html",
        imagery: "parity/imagery.html",
        lod: "parity/lod.html",
        precision: "spikes/precision.html",
        atmosphere: "spikes/atmosphere.html",
        ibl: "spikes/ibl.html",
        sky: "spikes/sky.html",
        worker: "spikes/worker.html",
        indirect: "spikes/indirect.html",
        alloc: "bench/alloc.html",
        slang: "spikes/slang.html",
        baseline: "bench/baseline.html",
        hitch: "bench/hitch.html",
        instances: "bench/instances.html",
        suite: "bench/suite/suite.html",
        flip: "bench/suite/flip.html",
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
