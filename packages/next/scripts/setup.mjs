// One-time setup of a machine for @cesium/next (README "Setup"):
//  - the repository's 1.x build (`npm run build` at the repo root), which the
//    parity harness and Dyno's "this repository's 1.x" engine load;
//  - the CesiumJS releases the benchmark catalog runs by default, fetched
//    from npm into the store outside the repo (~/.cesium-bench/cesium, or
//    BENCH_CESIUM_DIR; bench/suite/release.mjs), which Dyno's 1.x engines
//    load. The dev server also fetches a missing release on first use;
//  - the Slang toolchain, pinned (scripts/slangTools.mjs): the native slangc
//    for build-time Slang (the spike's ports, scripts/slangShader.mjs) and
//    the WebAssembly build for runtime Slang (CustomShader.fromSlang, Dyno's
//    Slang playground);
//  - the design globe's generated tilesets and exact answers
//    (scripts/designTiles.mjs) into the frames store, after its data and
//    grids;
//  - SMLib in WebAssembly (scripts/smlibTools.mjs): the pinned usd-brep
//    commit and emsdk (about 750 MB), built into their own store, for the
//    b-rep examples and their kernel.
// Nothing here is committed: both live outside version control.
// Usage: npm run setup --workspace @cesium/next [-- --skip-build] [--frames-span[ =]2000-2050] [--grids[ =]portfolio,tests]
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { ensureRelease, releasesDirectory } from "../bench/suite/release.mjs";
import { ensureFrameData, parseGrids, parseSpan } from "./frameData.mjs";
import { moduleRunner } from "./designTiles/moduleRunner.mjs";
import { ensureSlangc, ensureSlangWasm } from "./slangTools.mjs";
import { ensureSmlib } from "./smlibTools.mjs";

// `--frames-span y0-y1` or `--frames-span=y0-y1`, checked before any work.
const spanArg = process.argv.findIndex(
  (a) => a === "--frames-span" || a.startsWith("--frames-span="),
);
const framesSpan = parseSpan(
  spanArg < 0
    ? "2000-2050"
    : process.argv[spanArg]?.includes("=")
      ? process.argv[spanArg].split("=")[1]
      : (process.argv[spanArg + 1] ?? ""),
);

// `--grids a,b` (sets of scripts/gridSets.mjs; `all` is every PROJ-data grid).
const gridsArg = process.argv.findIndex(
  (a) => a === "--grids" || a.startsWith("--grids="),
);
const gridSets = parseGrids(
  gridsArg < 0
    ? "portfolio,tests"
    : process.argv[gridsArg]?.includes("=")
      ? process.argv[gridsArg].split("=")[1]
      : (process.argv[gridsArg + 1] ?? ""),
);

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..", "..", "..");

if (!process.argv.includes("--skip-build")) {
  if (existsSync(join(repo, "Build", "CesiumUnminified", "Cesium.js"))) {
    console.log("1.x build: present (Build/CesiumUnminified)");
  } else {
    console.log("1.x build: building (npm run build at the repo root)…");
    execFileSync(
      process.platform === "win32" ? "npm.cmd" : "npm",
      ["run", "build"],
      {
        cwd: repo,
        stdio: "inherit",
        shell: process.platform === "win32",
      },
    );
  }
}

const catalog = JSON.parse(
  readFileSync(
    join(here, "..", "bench", "suite", "catalog", "public.json"),
    "utf8",
  ),
);
const releases = new Set();
const visit = (value) => {
  if (typeof value === "string" && /^\d+\.\d+\.\d+$/.test(value)) {
    releases.add(value);
  } else if (Array.isArray(value)) {
    value.forEach(visit);
  }
};
visit(catalog.engines?.default);
visit(catalog.engines?.baseline);
console.log(`releases: ${[...releases].join(", ")} → ${releasesDirectory()}`);
for (const version of releases) {
  const release = ensureRelease(version);
  console.log(`  cesium@${release.version}: ready (${release.integrity})`);
}

// The Slang toolchain: slangc (build time) and the WebAssembly build (runtime).
console.log(`slangc: ${await ensureSlangc()}`);
console.log(`slang-wasm: ${await ensureSlangWasm()}`);

// SMLib in WebAssembly.
console.log(`smlib: ${await ensureSmlib()}`);

// The frames data: ephemeris excerpts, leap seconds, Earth orientation, PROJ
// and its grids.
const { directory } = await ensureFrameData({
  span: framesSpan,
  grids: gridSets,
});

// The design globe's tiles and answers, from the frames data and grids above.
// Through Vite's module runner: the generator runs the library's TypeScript,
// some of which Node's type stripping can't load (parameter properties, and a
// CommonJS dependency's named exports).
const runner = await moduleRunner(join(here, ".."));
try {
  const generator = await runner.import(join(here, "designTiles.mjs"));
  const { proj, grids, frames } = await generator.designTilesInputs(directory);
  await generator.ensureDesignTiles(directory, proj, grids, frames);
} finally {
  await runner.close();
}
