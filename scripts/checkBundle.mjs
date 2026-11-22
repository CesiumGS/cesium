// Checks that a globe-only Viewer pays for no precise reference frames (plan
// 5a, Task 13; the plan's call 32 and ruling 6): it builds a page entry that
// only calls `Viewer.create` with the defaults, with Vite, into a temporary
// directory, prints its main chunk's size, and exits 1 when that chunk, or a
// chunk it imports statically, holds the IAU 2006/2000A X and Y series
// (xy06Table's first coefficients), the CIO locator s series (s06Table's
// first coefficients) or the DAF reader (its file-record id). The precise
// providers load by dynamic `import()`, so they belong in chunks of their
// own, reached only through it.
//
// The same first build checks the WebGL 2 tier: it must be a chunk loaded
// on demand, with nothing of it in what the WebGPU path loads with the page.
//
// A second build, of an app that styles 3D Tiles (a Viewer and a
// `FeatureStyle`), checks the same of the Slang compiler's modules
// (src/scene/slang.ts and its worker): styling compiles to WGSL in
// TypeScript, and only `CustomShader.fromSlang` imports them, dynamically,
// so they must sit in a lazy chunk. The check reads each chunk's modules,
// so it needs no marker in the code.
//
// Two more pages guard the packages' `sideEffects` (the package map's call):
// a page that uses only `@cesium/time`, and one that uses only
// `@cesium/frames`, must load none of core's renderer (its render, gpu,
// shaders, streaming, globe and webgl2 modules, the engine, the world and
// the view) with the page.
//
// A last page uses core's GPU device, a model and a function map, and
// guards core's side-effect modules, which its `sideEffects` lists: in a
// production build, the dispose polyfill (core/disposeShim.js) must be in
// what loads with the page, found by two of its error messages, string
// literals a minifier keeps; and the IR passes' installer
// (transform/irPasses.js) must be in some chunk, found as a call whose
// argument is the passes object (its keys, which a minifier keeps).
//
// Every page is built against the packages as they publish (CS-612): their
// `exports` without the `@cesium/source` condition, so the packages' dist/,
// which `npm run build` writes first. A wrong `sideEffects` shows here, as
// it would in an application.
//
//   node scripts/checkBundle.mjs [--keep]
//
// `--keep` leaves the build in the temporary directory and prints where.
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { build } from "vite";
import { basisTranscoderEsm } from "./build/basisTranscoderEsm.ts";
import { skyPackGuard } from "./build/vitePluginSkyPack.ts";
import { sp } from "../packages/frames/src/time/erfa/s06Table.ts";
import { xyp } from "../packages/frames/src/time/erfa/xy06Table.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const keep = process.argv.includes("--keep");

/**
 * The built file a package's entry publishes (its `exports` `default`), as
 * an absolute path: what an application's bundler resolves the name to.
 * `file` names a module inside the package's dist/ instead of an entry.
 */
function published(name, file) {
  const dir = join(root, "packages", name.replace(/^@cesium\//, ""));
  const manifest = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  const target = file ? `./dist/${file}` : manifest.exports?.["."]?.default;
  const path = target && join(dir, target);
  if (!path || !existsSync(path)) {
    console.error(
      `checkBundle: no ${path ?? name}; run \`npm run build\` first (the pages build against the packages' dist/)`,
    );
    process.exit(2);
  }
  return path;
}

/**
 * What must not be in the main chunk. A series is found by its first two
 * coefficients as consecutive numbers, whatever the minifier wrote them as
 * (`-0.016617` may print as `-.016617`, `94.0e-6` as `94e-6`).
 */
const SERIES = [
  { what: "the X and Y series (xy06Table.ts)", first: [xyp[0], xyp[1]] },
  { what: "the CIO locator s series (s06Table.ts)", first: [sp[0], sp[1]] },
];
/** The DAF reader's file-record id (src/ephemeris/daf.ts). */
const DAF_ID = "DAF/SPK";

/** Every numeric literal in `code`, in order, with a minus sign read as part of it. */
function numbersIn(code) {
  const out = [];
  const pattern = /(-?)(\d+\.?\d*(?:e[+-]?\d+)?|\.\d+(?:e[+-]?\d+)?)/gi;
  for (const match of code.matchAll(pattern)) {
    // A digit run inside a name (`a1`) or a hex literal is not a number.
    const before = code[match.index - 1] ?? "";
    if (/[\w$.]/.test(before)) {
      continue;
    }
    out.push(Number(match[1] + match[2]));
  }
  return out;
}

/** Whether `values` appear consecutively in `numbers`. */
function hasRun(numbers, values) {
  for (let i = 0; i + values.length <= numbers.length; i++) {
    if (values.every((v, k) => numbers[i + k] === v)) {
      return true;
    }
  }
  return false;
}

/** naga-wasm's modules, a dev dependency that no build may include. */
const NAGA_MODULES = /[\\/]naga-wasm[\\/]/;

/** The WebGL 2 tier's modules (core's webgl2/): loaded only by the engine's device choice. */
const WEBGL2_MODULES = /[\\/]core[\\/]dist[\\/]webgl2[\\/]/;

/** The Slang compiler's modules (a module id may carry a query). */
const SLANG_MODULES =
  /[\\/]core[\\/]dist[\\/]scene[\\/]slang(?:Worker)?\.js(?:\?|$)/;

/** Cesium IR's modules (core's ir/). */
const IR_MODULES = /[\\/]core[\\/]dist[\\/]ir[\\/]/;

/**
 * Core's renderer: what a time-only or frames-only page must not load. Its
 * folders, and the engine, the world and the view (scene/ also holds plain
 * definitions, such as Body, that frames reach).
 */
const RENDERER_MODULES =
  /[\\/]core[\\/]dist[\\/](?:(?:render|gpu|shaders|streaming|globe|webgl2)[\\/]|scene[\\/](?:Engine|World|View)\.js$)/;

/**
 * The dispose polyfill's markers (core's src/core/disposeShim.ts): string
 * literals in its code, which a minifier keeps.
 */
const DISPOSE_MARKERS = [
  "DisposableStack: already disposed",
  "An error was suppressed during disposal.",
];

/** The IR passes' module (core's src/transform/irPasses.ts), as dist/ has it. */
const IR_PASSES_MODULE = /[\\/]core[\\/]dist[\\/]transform[\\/]irPasses\.js$/;

/**
 * The IR passes' installer's marker: the `installIrPasses(passes)` call, as
 * a call whose argument is the passes object (its keys, which a minifier
 * keeps, in source order) or a name bound to it.
 */
function hasIrInstaller(code) {
  const object =
    /\{\s*compileRoute\b[^}]*\badJacobian\b[^}]*\bjacobian\b[^}]*\bparseTransform\b[^}]*\bTransformParseError\b[^}]*\}/;
  const bound = new RegExp(
    String.raw`(?:const|let|var)\s+([\w$]+)\s*=\s*` + object.source,
  ).exec(code);
  if (bound) {
    const name = bound[1].replace(/\$/g, "\\$");
    return new RegExp(String.raw`[\w$.]+\(\s*${name}\s*\)`).test(code);
  }
  return new RegExp(String.raw`[\w$.]+\(\s*` + object.source + String.raw`\s*\)`).test(code);
}

/**
 * What the side-effect page is missing (an empty list when nothing): the
 * dispose polyfill in what loads with the page, and the IR passes' installer
 * in a chunk of its own or with the page.
 */
function sideEffectsMissing(page) {
  const missing = [];
  const eagerCode = page.eager.map((c) => c.code).join("\n");
  const absent = DISPOSE_MARKERS.filter((m) => !eagerCode.includes(m));
  if (absent.length > 0) {
    missing.push(
      `no dispose polyfill (core's core/disposeShim.js: ${absent.map((m) => JSON.stringify(m)).join(", ")} missing) in what loads with the side-effect page`,
    );
  }
  const holders = [...page.eager, ...page.lazy].filter((c) =>
    Object.keys(c.modules).some((id) => IR_PASSES_MODULE.test(id)),
  );
  if (!holders.some((c) => hasIrInstaller(c.code))) {
    missing.push(
      `no IR passes' installer (core's transform/irPasses.js, installIrPasses(passes)) in ${holders.length > 0 ? holders.map((c) => c.fileName).join(", ") : "any chunk"} of the side-effect page`,
    );
  }
  if (missing.length === 0) {
    console.log(
      `checkBundle: the side-effect page keeps the dispose polyfill with the page and the IR passes' installer in ${holders.map((c) => c.fileName).join(", ")}`,
    );
  }
  return missing;
}

/**
 * Builds a page that runs `code` as its only entry (`name`) and returns
 * what loads with it (`eager`: the main chunk and the chunks it imports
 * statically, transitively) and what loads on demand (`lazy`).
 */
async function buildPage(work, name, code, logLevel = "error") {
  const entry = join(work, `${name}.js`);
  writeFileSync(entry, code);
  const outDir = join(work, `dist-${name}`);
  const result = await build({
    configFile: false,
    mode: "production",
    root,
    base: "./",
    publicDir: false,
    logLevel,
    // The packages as they publish: no @cesium/source condition, so each
    // name resolves to its dist/ (Vite's default conditions).
    plugins: [basisTranscoderEsm(), skyPackGuard()],
    build: {
      outDir,
      emptyOutDir: true,
      target: "es2023",
      assetsInlineLimit: 0,
      reportCompressedSize: false,
      rollupOptions: { input: { [name]: entry } },
    },
    worker: { format: "es", plugins: () => [basisTranscoderEsm()] },
  });
  const outputs = (Array.isArray(result) ? result : [result]).flatMap(
    (r) => r.output,
  );
  const main = outputs.find(
    (o) => o.type === "chunk" && o.isEntry && o.name === name,
  );
  if (!main) {
    throw new Error("checkBundle: the build has no main chunk");
  }
  const chunks = new Map(
    outputs.filter((o) => o.type === "chunk").map((c) => [c.fileName, c]),
  );
  const eager = [];
  for (const queue = [main.fileName]; queue.length > 0;) {
    const chunk = chunks.get(queue.pop());
    if (chunk && !eager.includes(chunk)) {
      eager.push(chunk);
      queue.push(...chunk.imports);
    }
  }
  const lazy = [];
  for (
    const queue = [...eager.flatMap((c) => c.dynamicImports)];
    queue.length > 0;
  ) {
    const chunk = chunks.get(queue.pop());
    if (chunk && !eager.includes(chunk) && !lazy.includes(chunk)) {
      lazy.push(chunk);
      queue.push(...chunk.imports, ...chunk.dynamicImports);
    }
  }
  return { main, eager, lazy, outDir };
}

const work = mkdtempSync(join(tmpdir(), "cesium-next-bundle-"));
try {
  // What an app that shows the globe writes: a Viewer with the defaults.
  const { main, eager, lazy, outDir } = await buildPage(
    work,
    "globeOnlyViewer",
    `import { Viewer } from ${JSON.stringify(published("@cesium/ui"))};\n` +
      `void Viewer.create(document.body);\n`,
  );
  const kb = (code) => (Buffer.byteLength(code) / 1024).toFixed(1);
  const code = eager.map((c) => c.code).join("\n");
  console.log(
    `main chunk ${main.fileName}: ${kb(main.code)} KB (${(gzipSync(main.code).length / 1024).toFixed(1)} KB gzipped)`,
  );
  for (const chunk of eager.slice(1)) {
    console.log(`  imported with it: ${chunk.fileName}: ${kb(chunk.code)} KB`);
  }
  for (const chunk of lazy) {
    console.log(`  lazy chunk ${chunk.fileName}: ${kb(chunk.code)} KB`);
  }
  const numbers = numbersIn(code);
  const found = SERIES.filter(({ first }) => hasRun(numbers, first)).map(
    ({ what }) => what,
  );
  if (code.includes(DAF_ID)) {
    found.push(`the DAF reader ("${DAF_ID}", src/ephemeris/daf.ts)`);
  }
  if (keep) {
    console.log(`build kept in ${outDir}`);
  }
  // An app that styles 3D Tiles and could compile Slang shaders at run
  // time: the compiler must be a chunk of its own, loaded on demand.
  const styled = await buildPage(
    work,
    "styledViewer",
    `import { Viewer } from ${JSON.stringify(published("@cesium/ui"))};\n` +
      `import { CustomShader, FeatureStyle } from ${JSON.stringify(published("@cesium/core"))};\n` +
      `const style = new FeatureStyle({ show: "\${name} !== 'Main St'", color: "color('red')" });\n` +
      `void Viewer.create(document.body);\n` +
      `void CustomShader.fromSlang("", { label: String(style.properties) });\n`,
  );
  const slangIn = (chunks) =>
    chunks.filter((c) =>
      Object.keys(c.modules).some((id) => SLANG_MODULES.test(id)),
    );
  const slangEager = slangIn(styled.eager);
  const slangLazy = slangIn(styled.lazy);
  if (slangEager.length > 0) {
    found.push(
      `the Slang compiler (core's scene/slang.js) in ${slangEager.map((c) => c.fileName).join(", ")}, in what an app that styles 3D Tiles loads with the page`,
    );
  } else if (slangLazy.length === 0) {
    found.push(
      "no Slang compiler in any chunk of the styled build: this check can no longer tell where it is",
    );
  } else {
    console.log(
      `checkBundle: the Slang compiler is in ${slangLazy.map((c) => `${c.fileName} (${kb(c.code)} KB)`).join(", ")}, loaded on demand; not in the main chunk or its static imports of an app that styles 3D Tiles`,
    );
  }
  // Cesium IR (src/ir) and the transform passes built on it load when the first
  // curvilinear route or function map needs them (CS-794): a Viewer page has them
  // in a chunk of their own, not in what loads with the page.
  const irIn = (chunks) =>
    chunks.filter((c) =>
      Object.keys(c.modules).some((id) => IR_MODULES.test(id)),
    );
  const irEager = irIn(eager);
  const irLazy = irIn(lazy);
  if (irEager.length > 0) {
    found.push(
      `Cesium IR (src/ir) in ${irEager.map((c) => c.fileName).join(", ")}, in what a Viewer page loads with the page`,
    );
  } else if (irLazy.length === 0) {
    found.push(
      "no Cesium IR in any chunk of the Viewer build: this check can no longer tell where it is",
    );
  } else {
    console.log(
      `checkBundle: Cesium IR is in ${irLazy.map((c) => `${c.fileName} (${kb(c.code)} KB)`).join(", ")}, loaded on demand; not in the main chunk or its static imports of a Viewer page`,
    );
  }
  // A third build: a page that imports a synthetic sky pack that isn't
  // cleared must fail with the guard's message (scripts/vitePluginSkyPack.ts),
  // and the same page without it must build.
  const packDir = join(work, "synthetic-pack");
  mkdirSync(packDir);
  const magic = Buffer.alloc(64);
  magic.write("CSKYPTS1");
  writeFileSync(join(packDir, "points.bin"), magic);
  writeFileSync(
    join(packDir, "manifest.json"),
    JSON.stringify({
      format: 1,
      name: "synthetic",
      distributable: false,
      points: { file: "points.bin", count: 0, floatsPerStar: 8 },
      background: { file: "background.bin", size: 1, levels: 1 },
    }),
  );
  await buildPage(work, "noPackPage", "console.log(1);\n");
  let refused = "";
  try {
    await buildPage(
      work,
      "packPage",
      `import m from ${JSON.stringify(join(packDir, "manifest.json?url"))};\n` +
        `import p from ${JSON.stringify(join(packDir, "points.bin?url"))};\n` +
        `console.log(m, p);\n`,
      // This build is expected to fail: its error is checked below, so
      // vite's own "Build failed" line would only mislead.
      "silent",
    );
  } catch (error) {
    refused = String(error?.message ?? error);
  }
  if (refused.includes("sky pack") && refused.includes("not cleared")) {
    console.log(
      "checkBundle: a page importing an uncleared sky pack fails to build, and the same page without it builds",
    );
  } else {
    found.push(
      `no refusal of an uncleared sky pack (the build ${refused ? `failed with: ${refused.slice(0, 200)}` : "succeeded"})`,
    );
  }
  // Cesium IR's core (src/ir): a page that builds and evaluates a program
  // carries it in its main chunk, and the chunk holds nothing from outside
  // src/ir/ (the core has no dependency, not even a package).
  const ir = await buildPage(
    work,
    "irCore",
    // Not an entry of the package (src/ir/index.ts isn't built): its two
    // modules, as dist/ has them.
    `import { Builder } from ${JSON.stringify(published("@cesium/core", "ir/builder.js"))};\n` +
      `import { evaluate } from ${JSON.stringify(published("@cesium/core", "ir/evaluate.js"))};\n` +
      `const b = new Builder();\n` +
      `const x = b.input("x", "float", "feature");\n` +
      `document.title = String(evaluate(b.program({ y: b.op("math/sin", [x]) }), { x: 1 }).y);\n`,
  );
  const irModules = Object.keys(ir.main.modules).filter(
    (id) => !id.includes("\0"),
  );
  const irHere = irModules.filter((id) => IR_MODULES.test(id));
  // The page's own entry file sits in the work directory.
  const irOutside = irModules.filter(
    (id) => !IR_MODULES.test(id) && !id.endsWith("irCore.js"),
  );
  if (irHere.length === 0) {
    found.push("no Cesium IR core (src/ir) in the main chunk of its page");
  } else if (
    irOutside.length > 0 ||
    ir.eager.length > 1 ||
    ir.lazy.length > 0
  ) {
    found.push(
      `Cesium IR's core with a dependency (${irOutside.join(", ") || "another chunk"})`,
    );
  } else {
    console.log(
      `checkBundle: Cesium IR's core is in the main chunk (${irHere.length} modules, ${kb(ir.main.code)} KB), with no dependency`,
    );
  }
  // naga-wasm is a devDependency (the WGSL emitter's test validates with
  // it, CS-580): no chunk of any of these builds, eager or lazy, may hold a
  // module from it.
  const nagaIn = [
    { label: "the globe-only Viewer", chunks: [...eager, ...lazy] },
    { label: "the styled Viewer", chunks: [...styled.eager, ...styled.lazy] },
    { label: "the IR core page", chunks: [...ir.eager, ...ir.lazy] },
  ].filter(({ chunks }) =>
    chunks.some((c) =>
      Object.keys(c.modules).some((id) => NAGA_MODULES.test(id)),
    ),
  );
  if (nagaIn.length > 0) {
    found.push(
      `naga-wasm (a dev dependency) in ${nagaIn.map(({ label }) => label).join(", ")}`,
    );
  } else {
    console.log(
      "checkBundle: no naga-wasm module in any chunk of these builds",
    );
  }
  // The WebGL 2 tier (src/webgl2/): the engine's device choice loads it by
  // dynamic import(), only where WebGPU is missing or WebGL 2 is asked for,
  // so it is a chunk of its own and nothing of it is in what the WebGPU
  // path loads with the page.
  const webgl2In = (chunks) =>
    chunks.filter((c) =>
      Object.keys(c.modules).some((id) => WEBGL2_MODULES.test(id)),
    );
  const webgl2Eager = webgl2In(eager);
  const webgl2Lazy = webgl2In(lazy);
  if (webgl2Eager.length > 0) {
    found.push(
      `the WebGL 2 tier (src/webgl2/) in ${webgl2Eager.map((c) => c.fileName).join(", ")}, in what the WebGPU path loads with the page`,
    );
  } else if (webgl2Lazy.length === 0) {
    found.push(
      "no WebGL 2 tier in any chunk of the globe build: this check can no longer tell where it is",
    );
  } else {
    console.log(
      `checkBundle: the WebGL 2 tier is in ${webgl2Lazy.map((c) => `${c.fileName} (${kb(c.code)} KB)`).join(", ")}, loaded on demand; not in the main chunk or its static imports`,
    );
  }
  // A page that uses only @cesium/time, and one that uses only
  // @cesium/frames: both reach core (time and frames depend on it), and an
  // accurate `sideEffects` is what keeps its renderer out of the page.
  for (const [name, code] of [
    [
      "timeOnly",
      `import { Clock, Instant, sunPosition } from ${JSON.stringify(published("@cesium/time"))};\n` +
        `const clock = new Clock({ mode: "paused" });\n` +
        `console.log(clock, Instant, sunPosition);\n`,
    ],
    [
      "framesOnly",
      `import { createFrameCatalog } from ${JSON.stringify(published("@cesium/frames"))};\n` +
        `console.log(createFrameCatalog());\n`,
    ],
  ]) {
    const page = await buildPage(work, name, code);
    const renderer = page.eager.flatMap((c) =>
      Object.keys(c.modules).filter((id) => RENDERER_MODULES.test(id)),
    );
    if (renderer.length > 0) {
      found.push(
        `core's renderer in the ${name} page (${renderer
          .slice(0, 5)
          .map((id) => id.replace(/^.*[\\/]core[\\/]dist[\\/]/, "core/"))
          .join(", ")}${renderer.length > 5 ? `, and ${renderer.length - 5} more` : ""})`,
      );
    } else {
      const loads = page.eager.reduce(
        (n, c) => n + Buffer.byteLength(c.code),
        0,
      );
      console.log(
        `checkBundle: the ${name} page loads ${(loads / 1024).toFixed(1)} KB with it and none of core's renderer`,
      );
    }
  }
  // Core's side-effect modules (its `sideEffects` list): an application that
  // uses the GPU device, a model and a function map must keep the dispose
  // polyfill in what loads with the page, since the classes' `[Symbol.dispose]`
  // keys need it first, and the IR passes' installer in some chunk, since
  // `loadIr()` imports it only for what it installs.
  const effects = await buildPage(
    work,
    "sideEffectModules",
    `import { GpuDevice, ModelResource, fromFunction } from ${JSON.stringify(published("@cesium/core"))};\n` +
      `console.log(GpuDevice, ModelResource, fromFunction);\n`,
  );
  found.push(...sideEffectsMissing(effects));
  if (found.length > 0) {
    console.error(
      `checkBundle: ${found.length} problem(s), each in the named page's build (the precise providers, the Slang compiler, Cesium IR and the WebGL 2 tier load by dynamic import(); core's side-effect modules stay in its \`sideEffects\`):\n  - ${found.join("\n  - ")}`,
    );
    process.exitCode = 1;
  } else {
    console.log(
      "checkBundle: no X, Y or s series and no DAF reader in the main chunk or its static imports",
    );
  }
} finally {
  if (!keep) {
    rmSync(work, { recursive: true, force: true });
  }
}
