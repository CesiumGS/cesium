// Checks that a globe-only Viewer pays for no precise reference frames (plan
// 5a, Task 13; the plan's call 32 and ruling 6): it builds a page entry that
// only calls `Viewer.create` with the defaults, with Vite, into a temporary
// directory, prints its main chunk's size, and exits 1 when that chunk holds
// the IAU 2006/2000A X and Y series (xy06Table's first coefficients), the
// CIO locator s series (s06Table's first coefficients) or the DAF reader
// (its file-record id). The precise providers load by dynamic `import()`, so
// they belong in chunks of their own, never the main one.
//
//   node scripts/checkBundle.mjs [--keep]
//
// `--keep` leaves the build in the temporary directory and prints where.
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { build } from "vite";
import { basisTranscoderEsm } from "../basisTranscoderEsm.ts";
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

const work = mkdtempSync(join(tmpdir(), "cesium-next-bundle-"));
try {
  const entry = join(work, "globeOnlyViewer.js");
  // What an app that shows the globe writes: a Viewer with the defaults.
  writeFileSync(
    entry,
    `import { Viewer } from ${JSON.stringify(join(root, "widgets/index.ts"))};\n` +
      `void Viewer.create(document.body);\n`,
  );
  const outDir = join(work, "dist");
  const result = await build({
    configFile: false,
    root,
    base: "./",
    publicDir: false,
    logLevel: "error",
    plugins: [basisTranscoderEsm()],
    build: {
      outDir,
      emptyOutDir: true,
      target: "es2023",
      assetsInlineLimit: 0,
      reportCompressedSize: false,
      rollupOptions: { input: { globeOnlyViewer: entry } },
    },
    worker: { format: "es", plugins: () => [basisTranscoderEsm()] },
  });
  const outputs = (Array.isArray(result) ? result : [result]).flatMap(
    (r) => r.output,
  );
  const main = outputs.find(
    (o) => o.type === "chunk" && o.isEntry && o.name === "globeOnlyViewer",
  );
  if (!main) {
    throw new Error("checkBundle: the build has no main chunk");
  }
  const bytes = Buffer.byteLength(main.code);
  const gzip = gzipSync(main.code).length;
  const lazy = outputs.filter((o) => o.type === "chunk" && !o.isEntry);
  console.log(
    `main chunk ${main.fileName}: ${(bytes / 1024).toFixed(1)} KB (${(gzip / 1024).toFixed(1)} KB gzipped)`,
  );
  for (const chunk of lazy) {
    console.log(
      `  lazy chunk ${chunk.fileName}: ${(Buffer.byteLength(chunk.code) / 1024).toFixed(1)} KB`,
    );
  }
  const numbers = numbersIn(main.code);
  const found = SERIES.filter(({ first }) => hasRun(numbers, first)).map(
    ({ what }) => what,
  );
  if (main.code.includes(DAF_ID)) {
    found.push(`the DAF reader ("${DAF_ID}", src/ephemeris/daf.ts)`);
  }
  if (keep) {
    console.log(`build kept in ${outDir}`);
  }
  if (found.length > 0) {
    console.error(
      `checkBundle: a globe-only Viewer's main chunk holds ${found.join(", ")}; the precise providers must load by dynamic import()`,
    );
    process.exitCode = 1;
  } else {
    console.log(
      "checkBundle: no X, Y or s series and no DAF reader in the main chunk",
    );
  }
} finally {
  if (!keep) {
    rmSync(work, { recursive: true, force: true });
  }
}
