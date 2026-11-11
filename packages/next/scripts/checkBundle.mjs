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
// A second build, of an app that styles 3D Tiles (a Viewer and a
// `FeatureStyle`), checks the same of the Slang compiler's modules
// (src/scene/slang.ts and its worker): styling compiles to WGSL in
// TypeScript, and only `CustomShader.fromSlang` imports them, dynamically,
// so they must sit in a lazy chunk. The check reads each chunk's modules,
// so it needs no marker in the code.
//
//   node scripts/checkBundle.mjs [--keep]
//
// `--keep` leaves the build in the temporary directory and prints where.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { build } from "vite";
import { basisTranscoderEsm } from "../basisTranscoderEsm.ts";
import { skyPackGuard } from "./vitePluginSkyPack.ts";
import { sp } from "../src/time/erfa/s06Table.ts";
import { xyp } from "../src/time/erfa/xy06Table.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const keep = process.argv.includes("--keep");

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

/** The Slang compiler's modules (a module id may carry a `?worker&url` query). */
const SLANG_MODULES = /[\\/]src[\\/]scene[\\/]slang(?:Worker)?\.ts(?:\?|$)/;

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
    root,
    base: "./",
    publicDir: false,
    logLevel,
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
    `import { Viewer } from ${JSON.stringify(join(root, "widgets/index.ts"))};\n` +
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
    `import { Viewer } from ${JSON.stringify(join(root, "widgets/index.ts"))};\n` +
      `import { CustomShader, FeatureStyle } from ${JSON.stringify(join(root, "src/index.ts"))};\n` +
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
      `the Slang compiler (src/scene/slang.ts) in ${slangEager.map((c) => c.fileName).join(", ")}, in what an app that styles 3D Tiles loads with the page`,
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
  if (found.length > 0) {
    console.error(
      `checkBundle: what loads with the page holds ${found.join(", ")}; the precise providers and the Slang compiler must load by dynamic import()`,
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
