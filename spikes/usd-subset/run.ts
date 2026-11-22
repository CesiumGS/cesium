// Runs the subset reader in Node over SimReady sample assets and the
// spike's fixture, and writes out/report.json. Node 24 runs it as is:
//
//   node spikes/usd-subset/run.ts [data directory]
//
// The data directory defaults to ~/.cesium-bench/simready, outside the
// repository. Nothing read from it is written back into the repository:
// the report holds counts, names of prim types and schemas, labels and
// timings. Spike code for CS-833 and CS-843; not part of @cesium/next.

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { loadLayers, Stage, type AssetIo, type Prim } from "./compose.ts";
import { coverage } from "./coverage.ts";
import { EXPECTED, FIXTURE } from "./fixture.ts";

const RUNS = 7;

/**
 * Reads files under one folder only. Layers name other files by relative
 * paths, and a layer could name `../../` anything: those reads are refused.
 */
const folderIo = (folder: string): AssetIo => {
  const base = resolve(folder) + sep;
  const inside = (p: string): string | undefined => {
    const r = resolve(p);
    return r.startsWith(base) ? r : undefined;
  };
  return {
    read: (p) => {
      const r = inside(p);
      return Promise.resolve(
        r && existsSync(r) && statSync(r).isFile()
          ? new Uint8Array(readFileSync(r))
          : undefined,
      );
    },
    exists: (p) => {
      const r = inside(p);
      return Promise.resolve(r !== undefined && existsSync(r));
    },
  };
};

const memoryIo = (files: Record<string, string>): AssetIo => ({
  read: (p) =>
    Promise.resolve(
      files[p] === undefined ? undefined : new TextEncoder().encode(files[p]),
    ),
  exists: (p) => Promise.resolve(p in files),
});

function median(a: number[]): number {
  const s = [...a].sort((x, y) => x - y);
  return Math.round(s[s.length >> 1]! * 100) / 100;
}

async function open(root: string, io: AssetIo) {
  const t0 = performance.now();
  const layers = await loadLayers(root, io);
  const t1 = performance.now();
  const stage = new Stage(layers, root);
  const prim = stage.compose();
  const t2 = performance.now();
  return { layers, stage, prim, readMs: t1 - t0, composeMs: t2 - t1 };
}

function flat(p: Prim, out: Prim[] = []): Prim[] {
  if (p.path !== "/") {
    out.push(p);
  }
  for (const c of p.children) {
    flat(c, out);
  }
  return out;
}

/** The fixture's checks: each a name and whether it held. */
async function checkFixture(): Promise<Record<string, boolean>> {
  const { prim } = await open("fixture/root.usda", memoryIo(FIXTURE));
  const prims = flat(prim);
  const by = new Map(prims.map((p) => [p.path, p]));
  const body = by.get("/World/Cart/Body");
  const color = body?.props.get("primvars:displayColor")?.value;
  const colorNums =
    color &&
    typeof color === "object" &&
    "kind" in color &&
    color.kind === "array"
      ? Array.from(color.data as ArrayLike<number>)
      : color;
  return {
    "prims and their order":
      JSON.stringify(prims.map((p) => p.path)) ===
      JSON.stringify(EXPECTED.prims),
    "variant selection (red)":
      JSON.stringify(colorNums) === JSON.stringify(EXPECTED.bodyColor),
    "binding mapped through the reference":
      body?.props.get("material:binding")?.targets[0] === EXPECTED.bodyBinding,
    "payload's prim under the referenced prim": by.has(
      "/World/Cart/Wheel/Tire",
    ),
    "inherit from a sublayer's opinion":
      JSON.stringify(
        by.get("/World/Cart/Wheel")?.props.get("semantics:labels:class")?.value,
      ) === JSON.stringify(EXPECTED.wheelLabels),
    "local opinion over the reference":
      JSON.stringify(
        by.get("/World/Cart")?.props.get("semantics:labels:class")?.value,
      ) === JSON.stringify(EXPECTED.cartLabels),
  };
}

/** Top-level layers of each sample's simready_usd folder: what a host would open. */
function findRoots(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string): void => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.name.startsWith(".")) {
        continue;
      }
      const p = join(d, e.name);
      if (e.isDirectory()) {
        if (e.name === "simready_usd") {
          for (const f of readdirSync(p)) {
            if (/\.(usd|usda|usdc|usdz)$/.test(f)) {
              out.push(join(p, f));
            }
          }
        } else {
          walk(p);
        }
      }
    }
  };
  if (existsSync(dir)) {
    walk(dir);
  }
  return out.sort();
}

const dataDir = process.argv[2] ?? join(homedir(), ".cesium-bench", "simready");
const diskIo = folderIo(dataDir);
const here = fileURLToPath(new URL("./", import.meta.url));

const fixture = await checkFixture();
const assets = [];
for (const root of findRoots(dataDir)) {
  const reads: number[] = [];
  const composes: number[] = [];
  let last: Awaited<ReturnType<typeof open>> | undefined;
  for (let i = 0; i < RUNS; i++) {
    last = await open(root, diskIo);
    reads.push(last.readMs);
    composes.push(last.composeMs);
  }
  const { layers, stage, prim } = last!;
  const files = [...layers.values()].map((l) => ({
    file: relative(dataDir, l.id),
    format: l.layer?.format ?? "unread",
    version: l.layer?.version,
    bytes: l.bytes,
    error: l.error,
    undecoded: l.layer ? Object.fromEntries(l.layer.undecoded) : {},
  }));
  assets.push({
    asset: relative(dataDir, root),
    layers: files.length,
    bytes: files.reduce((s, f) => s + f.bytes, 0),
    errors: files.filter((f) => f.error).map((f) => `${f.file}: ${f.error}`),
    readMsMedian: median(reads),
    composeMsMedian: median(composes),
    coverage: await coverage(stage, prim, diskIo),
    files,
  });
}

const report = {
  spike: "usd-subset (CS-833, CS-843)",
  date: new Date().toISOString(),
  node: process.version,
  runs: RUNS,
  dataDir: dataDir.startsWith(homedir())
    ? `~${dataDir.slice(homedir().length)}`
    : "(given)",
  fixture,
  assets,
};
mkdirSync(join(here, "out"), { recursive: true });
writeFileSync(
  join(here, "out", "report.json"),
  JSON.stringify(report, null, 2),
);

console.log(
  "fixture:",
  Object.entries(fixture)
    .map(([k, v]) => `${v ? "ok" : "FAIL"} ${k}`)
    .join("; "),
);
for (const a of assets) {
  const c = a.coverage;
  console.log(
    `${a.asset}\n  ${a.layers} layers, ${a.bytes} B, read ${a.readMsMedian} ms, compose ${a.composeMsMedian} ms, errors ${a.errors.length}` +
      `\n  units: up ${c.stage.upAxis}, ${c.stage.metersPerUnit} m/unit, ${c.stage.kilogramsPerUnit} kg/unit, default prim ${c.stage.defaultPrim} (${c.stage.defaultPrimKind})` +
      `\n  arcs: ${JSON.stringify(c.counts)}` +
      `\n  prims ${c.prims}: ${JSON.stringify(c.typeNames)}` +
      `\n  semantics: labels API on ${c.semantics.labelsApi} ${JSON.stringify(c.semantics.labelsApiTaxonomies)}; older API on ${c.semantics.legacyApi} ${JSON.stringify(c.semantics.legacyTypes)}` +
      `\n  materials: ${JSON.stringify(c.materials)}` +
      `\n  geometry: ${JSON.stringify(c.geometry)}` +
      `\n  physics: ${JSON.stringify(c.physics)}; time-sampled ${c.timeSampled}`,
  );
  for (const e of a.errors) {
    console.log(`  error: ${e}`);
  }
}
