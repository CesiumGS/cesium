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
import {
  extname,
  join,
  normalize,
  resolve as resolvePath,
  sep,
} from "node:path";
import { fileURLToPath } from "node:url";
import basicSsl from "@vitejs/plugin-basic-ssl";
import { configDefaults, defineConfig, type Plugin } from "vitest/config";
import { basisTranscoderEsm } from "./basisTranscoderEsm.ts";
import { slangShaders } from "./scripts/vitePluginSlang.ts";
import { keepEnvSecretsOut } from "./scripts/vitePluginEnvSecrets.ts";
import { skyPackDevRoute, skyPackGuard } from "./scripts/vitePluginSkyPack.ts";
import { framesDataDirectory } from "./scripts/frameData.mjs";
import { framesDataExclusion, projGridsPlugin } from "./scripts/projGrids.mjs";
import { slangWasmDirectory } from "./scripts/slangTools.mjs";
import { smlibDirectory } from "./scripts/smlibTools.mjs";
import { occtDirectory } from "./scripts/occtTools.mjs";

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
  ".mjs": "text/javascript",
  ".json": "application/json",
  ".css": "text/css",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".wasm": "application/wasm",
  ".svg": "image/svg+xml",
  ".glb": "model/gltf-binary",
  ".tif": "image/tiff",
};

/**
 * Serves a local directory at `prefix` without copying it into the package:
 * the 1.x build for the parity harness, and optionally the Slang WASM build
 * (set SLANG_WASM_DIR) for the Slang spike. A path inside `root` that
 * `exclude` refuses (given as an absolute path) is a 404, as is a URL that
 * doesn't decode.
 */
function serveDirectory(
  prefix: string,
  root: string,
  { exclude }: { exclude?: (path: string) => boolean } = {},
): Plugin {
  // Absolute, without a trailing separator, so `base + sep` is the prefix of
  // everything inside it and of nothing beside it (`/a/frames-old`).
  const base = resolvePath(root);
  return {
    name: `serve-directory${prefix}`,
    configureServer(server) {
      server.middlewares.use(prefix, (req, res, next) => {
        let decoded: string;
        try {
          decoded = decodeURIComponent((req.url ?? "/").split("?")[0]!);
        } catch {
          res.statusCode = 404;
          res.end();
          return;
        }
        const path = normalize(join(base, decoded));
        if (exclude && path.startsWith(base + sep) && exclude(path)) {
          res.statusCode = 404;
          res.end();
          return;
        }
        if (
          !(path === base || path.startsWith(base + sep)) ||
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
        // The size, so a page can show a fetch's progress against its total
        // (the frames explorer's R9 bars), as a static host would.
        res.setHeader("Content-Length", statSync(path).size);
        createReadStream(path).pipe(res);
      });
    },
  };
}

/**
 * Released CesiumJS builds at `prefix/<version>/…` from the store outside
 * the repo (bench/suite/release.mjs): a version not there yet is fetched
 * from npm (`npm pack`, checked against the registry's integrity hash) the
 * first time a page asks for it, so a fresh machine needs no setup step for
 * Dyno's 1.x engines. `npm run setup` fetches the catalog's ahead of time.
 */
function serveReleases(prefix: string, root: string): Plugin {
  const fetched = new Set<string>();
  const serve = serveDirectory(prefix, root);
  // npm's recent stable releases, asked at most once an hour.
  let recent: { at: number; versions: string[] } | undefined;
  const recentReleases = async (): Promise<string[]> => {
    if (recent && Date.now() - recent.at < 3600_000) {
      return recent.versions;
    }
    const { execFile } = await import("node:child_process");
    const versions = await new Promise<string[]>((resolve) => {
      execFile(
        process.platform === "win32" ? "npm.cmd" : "npm",
        ["view", "cesium", "versions", "--json"],
        { timeout: 15_000, shell: process.platform === "win32" },
        (error, stdout) => {
          if (error) {
            resolve([]);
            return;
          }
          try {
            const all = JSON.parse(stdout) as string[];
            resolve(
              all
                .filter((v) => /^1\.\d+\.\d+$/.test(v))
                .slice(-RECENT_RELEASES),
            );
          } catch {
            resolve([]);
          }
        },
      );
    });
    recent = { at: Date.now(), versions };
    return versions;
  };
  return {
    name: "serve-releases",
    configureServer(server) {
      // The releases Dyno can offer: in the store, and npm's latest few
      // (fetched from npm on first use, below).
      server.middlewares.use(`${prefix}/index.json`, (_req, res) => {
        const installed = existsSync(root)
          ? readdirSync(root).filter(
              (v) =>
                /^\d+\.\d+\.\d+$/.test(v) &&
                existsSync(join(root, v, "release.json")),
            )
          : [];
        void recentReleases().then((versions) => {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ installed, recent: versions }));
        });
      });
      server.middlewares.use(prefix, (req, _res, next) => {
        const version = /^\/(\d+\.\d+\.\d+)\//.exec(req.url ?? "")?.[1];
        // Only a page loading the release fetches it: probes (HEAD, as the
        // first-run check sends) don't.
        if (
          req.method !== "GET" ||
          !version ||
          fetched.has(version) ||
          existsSync(join(root, version, "release.json"))
        ) {
          next();
          return;
        }
        fetched.add(version);
        import("./bench/suite/release.mjs")
          .then(({ ensureRelease }) =>
            ensureRelease(version, (line: string) =>
              server.config.logger.info(`[dyno] ${line}`),
            ),
          )
          .catch((error: unknown) =>
            server.config.logger.error(
              `[dyno] cesium@${version}: ${error instanceof Error ? error.message : String(error)}`,
            ),
          )
          .finally(() => next());
      });
      (serve.configureServer as (server: unknown) => void)(server);
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
/** npm's latest stable CesiumJS releases Dyno offers beside its own. */
const RECENT_RELEASES = 6;
const cesiumReleases =
  process.env.BENCH_CESIUM_DIR ?? join(homedir(), ".cesium-bench", "cesium");

// The Slang WebAssembly build (runtime Slang): SLANG_WASM_DIR, or the store
// `npm run setup` fills (scripts/slangTools.mjs).
const slangWasm = existsSync(join(slangWasmDirectory(), "slang-wasm.js"))
  ? slangWasmDirectory()
  : undefined;
// SMLib in WebAssembly (the b-rep examples' kernel): SMLIB_DIR, or the build
// `npm run setup` makes in its store (scripts/smlibTools.mjs).
const smlib = smlibDirectory();
// Open CASCADE in WebAssembly (the CSG sample's second kernel, LGPL 2.1):
// OCCT_DIR, or the build `npm run setup` fetches (scripts/occtTools.mjs).
// Served, never bundled.
const occt = occtDirectory();
// Sample models and tilesets checked into the 1.x repo, for parity tests.
const specsData = fileURLToPath(new URL("../../Specs/Data", import.meta.url));

// The frames data `npm run setup` fills (scripts/frameData.mjs), served at
// /frames-data/. The data-store tests (test/data) read it, so they only run
// when FRAMES_DATA is set (`npm run test:data`).
const framesData = existsSync(join(framesDataDirectory(), "manifest.json"))
  ? framesDataDirectory()
  : undefined;

// PROJ-data's catalog and grids in the store, served (and fetched from
// cdn.proj.org on first request, verified) only at /proj-grids/
// (scripts/projGrids.mjs); /frames-data/ doesn't serve them.
const projGrids = existsSync(
  join(framesDataDirectory(), "grids", "files.geojson"),
)
  ? join(framesDataDirectory(), "grids")
  : undefined;

// DEV_HTTPS=1 serves the dev server over HTTPS with a self-signed
// certificate made at startup, so a phone on the same network gets a secure
// context, which WebGPU needs (http to a LAN address isn't one). Accept the
// browser's warning once per address. Pair it with `--host 0.0.0.0`.
const devHttps = !["", "0"].includes(process.env.DEV_HTTPS ?? "");

const framesDataTests = !["", "0"].includes(process.env.FRAMES_DATA ?? "");

export default defineConfig({
  server: {
    host: "127.0.0.1",
    port: 5190,
    strictPort: true,
    // The handbook has its own server. Without this, every handbook build
    // reloads the pages open on this one, mid-example.
    watch: { ignored: ["**/handbook/**"] },
  },
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
      // The Slang playground's editor (examples/slang-playground).
      "codemirror",
      "@codemirror/state",
      "@codemirror/view",
      "@codemirror/language",
      "@codemirror/legacy-modes/mode/clike",
      "@codemirror/lint",
      "@codemirror/autocomplete",
      "@codemirror/commands",
      "@codemirror/theme-one-dark",
      "@lezer/highlight",
    ],
  },
  // Lower syntax Safari doesn't parse yet (`using` declarations), in dev
  // as in the build, so Dyno and the examples run on an iPhone too.
  oxc: { target: "es2023" },
  plugins: [
    ...(devHttps ? [basicSsl()] : []),
    basisTranscoderEsm(),
    slangShaders(),
    // The ion token in .env.local is the dev server's only (ionToken.ts).
    keepEnvSecretsOut(),
    // Sky data never ships uncleared (§13.29); the dev server offers the store's pack.
    skyPackGuard(),
    skyPackDevRoute(),
    serveDirectory("/cesium1x", cesium1x),
    serveDirectory("/specs-data", specsData),
    serveBenchResults("/bench-results", benchResults),
    serveDirectory("/bench-results", benchResults),
    serveReleases("/cesium-release", cesiumReleases),
    // 1.x built at git refs, in snapshot worktrees (<repo>/.bench/<sha>).
    serveDirectory(
      "/cesium-ref",
      fileURLToPath(new URL("../../.bench", import.meta.url)),
    ),
    ...(framesData
      ? [
          serveDirectory("/frames-data", framesData, {
            exclude: framesDataExclusion(framesData),
          }),
        ]
      : []),
    ...(projGrids ? [projGridsPlugin("/proj-grids", projGrids)] : []),
    ...(slangWasm ? [serveDirectory("/slang-wasm", slangWasm)] : []),
    ...(smlib ? [serveDirectory("/smlib", smlib)] : []),
    ...(occt ? [serveDirectory("/occt", occt)] : []),
  ],
  // Worker bundles take their own plugins (the Basis glue is decoded there).
  worker: { plugins: () => [basisTranscoderEsm(), skyPackGuard()] },
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
    // SKY_DATA=1 alone runs only the sky pack's data test.
    exclude: framesDataTests
      ? configDefaults.exclude
      : [
          ...configDefaults.exclude,
          process.env.SKY_DATA === "1"
            ? "test/data/!(skyPack).test.ts"
            : "test/data/**",
        ],
    environment: "node",
    // StrataKit's icons import their .svg files: inlined, Vite turns those
    // into URLs, so the frames explorer's panel parts render in Node
    // (test/framesExplorerMemoReads.test.ts).
    server: { deps: { inline: [/@stratakit\//] } },
  },
});
