// CS-900's dev server: Vite with the package's own config, plus the routes
// the USD reader harness (bench/usdReaders.html) needs, on a port of its
// own. Nothing in the shared Vite config changes.
//
//   node spikes/usd-readers/serve.mjs [--port 4102]
//
// Routes, all read-only:
//   /usd-readers/manifest.json   the samples, and each reader's files with
//                                their sizes and what they need of the page
//   /usd-readers/data/…          the SimReady samples in the setup store
//   /usd-readers/build/<reader>/ the readers' modules: the subset reader
//                                bundled here with esbuild; LightUSD's and
//                                OpenUSD's builds from the setup store
//
// Cross-origin isolation (COOP and COEP) goes on the harness page, its
// worker and the readers' files only, because OpenUSD's threads need
// SharedArrayBuffer. The readers' files are sent with no-store, so every
// run fetches and compiles them as a first visit would.

// esbuild and vite come from the repository root; spike tools only.
import { build } from "esbuild";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { extname, join, relative, resolve, sep } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { hostRequirements, shippedSizes } from "./host.ts";

const here = fileURLToPath(new URL(".", import.meta.url));
const pkg = resolve(here, "..", "..");
const at = process.argv.indexOf("--port");
const port = at > 0 ? Number(process.argv[at + 1]) : 4102;

const store =
  process.env.USD_READERS_STORE ??
  join(homedir(), ".cesium-bench", "usd-readers");
const data =
  process.env.SIMREADY_DIR ??
  join(homedir(), ".cesium-bench", "simready", "foundation-1abf3ae2");

/** The six samples: one root layer per asset, as CS-833 measured them. */
export const SAMPLES = [
  [
    "copper_brushed",
    "common_assets/materials/copper_brushed/simready_usd/copper_brushed.usda",
  ],
  [
    "alcohol_a01",
    "common_assets/props_general/alcohol_a01/simready_usd/sm_alcohol_a01_01.usd",
  ],
  [
    "apple_a01",
    "common_assets/props_general/apple_a01/simready_usd/sm_apple_a01_01.usd",
  ],
  [
    "industrialplasticpallet_a01",
    "common_assets/props_general/industrialplasticpallet_a01/simready_usd/industrialplasticpallet_a01.usd",
  ],
  [
    "obs_lamp_revolute_a01",
    "common_assets/props_general/obs_lamp_revolute_a01/simready_usd/sm_obs_lamp_revolute_a01_01.usda",
  ],
  [
    "traffic_cone_chn_red",
    "common_assets/props_general/traffic_cone_chn_red/simready_usd/sm_traffic_cone_chn_red_01.usd",
  ],
];

/** The files each reader ships, from the setup store, and where each came from. */
const READERS = {
  subset: {
    title: "TypeScript subset reader (CS-833's spike)",
    module: "/usd-readers/build/subset/reader.js",
    dir: null,
    files: ["reader.js"],
    source:
      "spikes/usd-subset, bundled with esbuild (minified ES module)",
  },
  lightusd: {
    title: "LightUSD 1.0.0, next module",
    module: "/usd-readers/build/lightusd/lightusd_next.js",
    dir: join(store, "lightusd-1.0.0", "src", "web", "js", "src", "lightusd"),
    files: ["lightusd_next.js", "lightusd_next.wasm"],
    source:
      "lighttransport/LightUSD v1.0.0, web/ built MinSizeRel with emsdk 7.0.0",
  },
  openusd: {
    title: "OpenUSD 26.11.1 (wasm32, threads)",
    module: "/usd-readers/build/openusd/openusd_reader.js",
    dir: join(store, "openusd-26.11.1", "harness"),
    files: ["openusd_reader.js", "openusd_reader.wasm"],
    source:
      "PixarAnimationStudios/OpenUSD v26.11.1, build_usd.py --build-target wasm, with CS-900's harness",
  },
};

/** The published LightUSD package's modules, to settle its README against its npm package. */
const PUBLISHED = {
  dir: join(store, "lightusd-1.0.0", "npm-tarball", "package"),
  files: [
    "lightusd_next.js",
    "lightusd_next.wasm",
    "lightusd.js",
    "lightusd.wasm",
  ],
};

/** The subset reader's module, bundled once at start. */
async function subsetBundle() {
  const result = await build({
    entryPoints: [join(here, "subsetEntry.ts")],
    bundle: true,
    minify: true,
    format: "esm",
    target: "es2023",
    write: false,
    logLevel: "warning",
  });
  return result.outputFiles[0].contents;
}

/** Every USD layer under a sample's simready_usd folder, relative to the data folder. */
function sampleFiles(root) {
  const top = join(
    data,
    root.slice(0, root.indexOf("simready_usd") + "simready_usd".length),
  );
  const out = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) {
        walk(p);
      } else if (/\.(usd|usda|usdc|usdz)$/.test(e.name)) {
        out.push(relative(data, p).split(sep).join("/"));
      }
    }
  };
  walk(top);
  return out.sort();
}

function readerFiles(id, bundle) {
  const r = READERS[id];
  if (!r.dir) {
    return { "reader.js": bundle };
  }
  const files = {};
  for (const f of r.files) {
    const p = join(r.dir, f);
    if (existsSync(p)) {
      files[f] = new Uint8Array(readFileSync(p));
    }
  }
  return files;
}

function manifest(bundle) {
  const readers = {};
  for (const [id, r] of Object.entries(READERS)) {
    const files = readerFiles(id, bundle);
    const built = r.files.every((f) => f in files);
    readers[id] = {
      title: r.title,
      module: r.module,
      source: r.source,
      built,
      ...(built
        ? { sizes: shippedSizes(files), host: hostRequirements(files) }
        : {}),
    };
  }
  const published = {};
  for (const f of PUBLISHED.files) {
    const p = join(PUBLISHED.dir, f);
    if (existsSync(p)) {
      published[f] = new Uint8Array(readFileSync(p));
    }
  }
  return {
    samples: SAMPLES.map(([id, root]) => ({
      id,
      root,
      files: sampleFiles(root),
    })),
    readers,
    publishedLightUsd: shippedSizes(published),
  };
}

const TYPES = {
  ".js": "text/javascript",
  ".wasm": "application/wasm",
  ".json": "application/json",
};

/** A file under `dir`, or undefined for anything outside it. */
function inside(dir, rel) {
  const base = resolve(dir) + sep;
  const p = resolve(dir, decodeURIComponent(rel));
  return p.startsWith(base) && existsSync(p) && statSync(p).isFile()
    ? p
    : undefined;
}

/**
 * Each file read once and kept: the samples and builds don't change while
 * the server runs, and only the files the routes allow are ever read
 * (about 100 MB in all).
 */
const fileCache = new Map();
const readOnce = (p) => {
  let bytes = fileCache.get(p);
  if (!bytes) {
    bytes = readFileSync(p);
    fileCache.set(p, bytes);
  }
  return bytes;
};

function routes(bundle) {
  let cached;
  return {
    name: "usd-readers-routes",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url ?? "/", "http://localhost");
        const path = url.pathname;
        const isolated =
          path.startsWith("/usd-readers/") ||
          path.startsWith("/bench/usdReaders");
        if (isolated) {
          res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
          res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
          res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
        }
        if (!path.startsWith("/usd-readers/")) {
          next();
          return;
        }
        const send = (body, type) => {
          res.setHeader("Content-Type", type);
          res.setHeader("Cache-Control", "no-store");
          res.end(body);
        };
        if (path === "/usd-readers/manifest.json") {
          cached ??= JSON.stringify(manifest(bundle));
          send(cached, TYPES[".json"]);
          return;
        }
        if (path === "/usd-readers/build/subset/reader.js") {
          send(bundle, TYPES[".js"]);
          return;
        }
        const m = path.match(
          /^\/usd-readers\/build\/(lightusd|openusd)\/([\w.-]+)$/,
        );
        if (m && READERS[m[1]].files.includes(m[2])) {
          const p = inside(READERS[m[1]].dir, m[2]);
          if (p) {
            send(readOnce(p), TYPES[extname(p)] ?? "application/octet-stream");
            return;
          }
        }
        if (path.startsWith("/usd-readers/data/")) {
          const p = inside(data, path.slice("/usd-readers/data/".length));
          if (p) {
            send(readOnce(p), "application/octet-stream");
            return;
          }
        }
        res.statusCode = 404;
        res.end();
      });
    },
  };
}

const bundle = await subsetBundle();
const server = await createServer({
  root: pkg,
  configFile: join(pkg, "vite.config.ts"),
  server: { host: "127.0.0.1", port, strictPort: true },
  plugins: [routes(bundle)],
});
await server.listen();
console.log(`usd readers: http://127.0.0.1:${port}/bench/usdReaders.html`);
