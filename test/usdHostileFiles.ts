// Hostile USD files for the subset reader (CS-913, CS-1097 A): a seeded
// generator of small inputs that name far more work than any real asset, in
// every shape the reader's loops have: fan-out, wide prims, deep stacks,
// long chains, long lists, list ops over long lists, and strings built to
// trouble each path parser. `readBounded` reads each one in a worker thread
// under a deadline and a heap limit. Test code only.

import { Worker } from "node:worker_threads";

/** One hostile stage: its files, by path, and the root layer. */
export interface HostileCase {
  readonly name: string;
  readonly files: Record<string, string | Uint8Array>;
  readonly root: string;
}

/** A small, seeded random source (mulberry32), so a failure names a case that can be made again. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rng = () => number;
const int = (rng: Rng, lo: number, hi: number): number =>
  lo + Math.floor(rng() * (hi - lo + 1));
const pick = <T>(rng: Rng, xs: readonly T[]): T =>
  xs[int(rng, 0, xs.length - 1)]!;
const times = (n: number, f: (i: number) => string): string =>
  Array.from({ length: n }, (_, i) => f(i)).join("");

/**
 * One shape's contribution to a stage: top-level prims (their names start
 * with the prefix it was given), sublayers of the root, and other files
 * (their paths start with the prefix too), so shapes combine without clashes.
 */
interface Part {
  readonly prims: string;
  readonly subLayers?: readonly string[];
  readonly files?: Record<string, string>;
}

const SHAPES: Record<string, (rng: Rng, p: string) => Part> = {
  /** /L_i has `width` children that each reference /L_(i+1): width^levels prims. */
  fanOut(rng, p) {
    const levels = int(rng, 8, 40);
    const width = int(rng, 2, 4);
    return {
      prims: `${times(
        levels,
        (i) =>
          `def Xform "${p}L${i}"\n{\n${times(
            width,
            (w) =>
              `    def Xform "c${w}" (\n        prepend references = </${p}L${i + 1}>\n    )\n    {\n    }\n`,
          )}}\n`,
      )}def Xform "${p}L${levels}" {}\n`,
    };
  },
  wideChildren(rng, p) {
    const n = int(rng, 1000, 60000);
    return {
      prims: `def Xform "${p}W"\n{\n${times(n, (i) => `    def Scope "c${i}" {}\n`)}}\n`,
    };
  },
  wideProps(rng, p) {
    const n = int(rng, 1000, 50000);
    return {
      prims: `def Xform "${p}W"\n{\n${times(n, (i) => `    float a${i} = ${i}\n`)}}\n`,
    };
  },
  wideVariantSets(rng, p) {
    const n = int(rng, 1000, 60000);
    return {
      prims: `def Xform "${p}W" (\n    variants = {\n${times(n, (i) => `        string v${i} = "x"\n`)}    }\n    prepend variantSets = [${times(n, (i) => `${i ? ", " : ""}"v${i}"`)}]\n)\n{\n}\n`,
    };
  },
  /** The review's first input: one prim's many sites, each with a variant set to choose. */
  variantScan(rng, p) {
    const n = int(rng, 1000, 20000);
    return {
      prims: `def Xform "${p}R" (\n    prepend references = [${times(n, (i) => `${i ? ", " : ""}</${p}B${i}>`)}]\n)\n{\n}\n${times(
        n,
        (i) => `over "${p}B${i}" (\n    variantSets = "v"\n)\n{\n}\n`,
      )}`,
    };
  },
  /** The review's second input: properties times sites, through a class many prims inherit. */
  propsInherited(rng, p) {
    const k = int(rng, 100, 1000);
    const props = int(rng, 100, 5000);
    const m = int(rng, 20, 500);
    return {
      prims:
        `class "${p}C" (\n    prepend references = [${times(k, (i) => `${i ? ", " : ""}</${p}B${i}>`)}]\n)\n{\n}\n` +
        `over "${p}B0"\n{\n${times(props, (i) => `    float a${i} = 1\n`)}}\n${times(
          m,
          (i) => `def Xform "${p}P${i}" (\n    inherits = </${p}C>\n)\n{\n}\n`,
        )}`,
    };
  },
  /** A class with a large variant selection that many prims inherit: the variant index's loop. */
  classSelections(rng, p) {
    const d = int(rng, 1000, 100000);
    const m = int(rng, 100, 20000);
    return {
      prims: `class "${p}C" (\n    variants = {\n${times(d, (i) => `        string v${i} = "x"\n`)}    }\n)\n{\n}\n${times(
        m,
        (i) => `def Xform "${p}P${i}" (\n    inherits = </${p}C>\n)\n{\n}\n`,
      )}`,
    };
  },
  /** A class with many properties that many prims inherit: the property loop. */
  classProps(rng, p) {
    const props = int(rng, 1000, 20000);
    const m = int(rng, 100, 5000);
    return {
      prims: `class "${p}C"\n{\n${times(props, (i) => `    float a${i} = 1\n`)}}\n${times(
        m,
        (i) => `def Xform "${p}P${i}" (\n    inherits = </${p}C>\n)\n{\n}\n`,
      )}`,
    };
  },
  /** Many sites each with the same properties, under a class many prims inherit: specs per property. */
  sharedProps(rng, p) {
    const k = int(rng, 200, 800);
    const props = int(rng, 200, 800);
    const m = int(rng, 100, 2000);
    const body = times(props, (i) => `    float a${i} = 1\n`);
    return {
      prims: `class "${p}C" (\n    prepend references = [${times(k, (i) => `${i ? ", " : ""}</${p}B${i}>`)}]\n)\n{\n}\n${times(
        k,
        (i) => `over "${p}B${i}"\n{\n${body}}\n`,
      )}${times(
        m,
        (i) => `def Xform "${p}P${i}" (\n    inherits = </${p}C>\n)\n{\n}\n`,
      )}`,
    };
  },
  /** A long stack of empty sublayers under many prims with properties. */
  deepStack(rng, p) {
    const layers = int(rng, 10, 999);
    const m = int(rng, 100, 20000);
    const files: Record<string, string> = {};
    for (let i = 0; i < layers; i++) {
      files[`h/${p}s${i}.usda`] = "#usda 1.0\n";
    }
    return {
      subLayers: Object.keys(files).map((f) => `./${f.slice(2)}`),
      files,
      prims: times(
        m,
        (i) =>
          `def Xform "${p}P${i}"\n{\n    float a = 1\n    float b = 2\n    float c = 3\n    float d = 4\n    float e = 5\n}\n`,
      ),
    };
  },
  /** A chain of sublayers, each naming the next. */
  sublayerChain(rng, p) {
    const n = int(rng, 100, 3000);
    const files: Record<string, string> = {};
    for (let i = 0; i < n; i++) {
      files[`h/${p}c${i}.usda`] =
        i + 1 < n
          ? `#usda 1.0\n(\n    subLayers = [@./${p}c${i + 1}.usda@]\n)\n`
          : `#usda 1.0\ndef Scope "${p}Deep" {}\n`;
    }
    return { subLayers: [`./${p}c0.usda`], files, prims: "" };
  },
  /** One prim with a long list of internal references. */
  longList(rng, p) {
    const n = int(rng, 1000, 50000);
    return {
      prims: `def Xform "${p}R" (\n    prepend references = [${times(n, (i) => `${i ? ", " : ""}</${p}T${i % 97}>`)}]\n    prepend apiSchemas = [${times(n, (i) => `${i ? ", " : ""}"Api${i}"`)}]\n)\n{\n}\n${times(
        97,
        (i) => `def Scope "${p}T${i}" {}\n`,
      )}`,
    };
  },
  /** List ops over a long list in every layer of a stack. */
  listOpStack(rng, p) {
    const layers = int(rng, 2, 200);
    const n = int(rng, 100, 5000);
    const files: Record<string, string> = {};
    for (let i = 0; i < layers; i++) {
      const op = pick(rng, ["prepend", "append", "delete", "add"]);
      files[`h/${p}o${i}.usda`] =
        `#usda 1.0\nover "${p}X" (\n    ${op} apiSchemas = [${times(n, (j) => `${j ? ", " : ""}"A${(j * 7 + i) % (n + 13)}"`)}]\n)\n{\n}\n`;
    }
    return {
      subLayers: Object.keys(files).map((f) => `./${f.slice(2)}`),
      files,
      prims: `def Xform "${p}X" {}\n`,
    };
  },
  /** Targets whose paths open variant braces that never close: STRIP_VARIANTS's backtracking. */
  openBraces(rng, p) {
    const n = int(rng, 10000, 200000);
    const r = int(rng, 1, 50);
    const target = `</${"{".repeat(n)}>`;
    return {
      prims: `def Xform "${p}W"\n{\n${times(r, (i) => `    rel r${i} = ${target}\n`)}}\n`,
    };
  },
  /** Asset paths of repeated ".usdz[": the package pattern's backtracking. */
  usdzBrackets(rng, p) {
    const n = int(rng, 1000, 20000);
    const r = int(rng, 1, 50);
    const asset = `@${".usdz[".repeat(n)}@`;
    return {
      prims: times(
        r,
        (i) =>
          `def Xform "${p}U${i}" (\n    prepend references = ${asset}\n)\n{\n}\n`,
      ),
    };
  },
  /** Long names nested deep: paths that grow with the square of the input. */
  longNames(rng, p) {
    const len = int(rng, 1000, 8000);
    const depth = int(rng, 50, 1000);
    const name = (i: number) => `${p}${"n".repeat(len)}${i}`;
    return {
      prims:
        times(depth, (i) => `def Scope "${name(i)}"\n{\n`) +
        "}\n".repeat(depth),
    };
  },
  deepValues(rng, p) {
    const depth = int(rng, 10, 5000);
    return {
      prims: `def Xform "${p}W"\n{\n    custom float x = ${"[".repeat(depth)}1${"]".repeat(depth)}\n}\n`,
    };
  },
  deepPrims(rng, p) {
    const depth = int(rng, 300, 3000);
    return {
      prims: times(depth, () => `def Scope "${p}P"\n{\n`) + "}\n".repeat(depth),
    };
  },
  /** Assets that climb above the root, again and again. */
  climbing(rng, p) {
    const n = int(rng, 1000, 50000);
    return {
      prims: `def Xform "${p}W" (\n    prepend references = @${"../".repeat(n)}x.usda@\n)\n{\n}\n`,
    };
  },
  /** Arcs to many layers that don't exist: the layer cap and the error cap. */
  manyMissing(rng, p) {
    const n = int(rng, 100, 20000);
    return {
      prims: `def Xform "${p}W"\n{\n${times(n, (i) => `    def Xform "m${i}" (\n        prepend references = @./${p}missing${i}.usda@\n    )\n    {\n    }\n`)}}\n`,
    };
  },
  /** Arcs to layers whose names carry control characters and great length. */
  strangeAssets(rng, p) {
    const n = int(rng, 10, 2000);
    const len = int(rng, 100, 20000);
    const odd = String.fromCharCode(...Array.from({ length: 32 }, (_, i) => i));
    return {
      prims: times(
        n,
        (i) =>
          `def Xform "${p}S${i}" (\n    prepend references = @./${"z".repeat(len)}${odd.replace(/[@\n]/g, "")}${i}.usda@\n)\n{\n}\n`,
      ),
    };
  },
  /** A random graph of internal references: cycles, diamonds and chains. */
  arcGraph(rng, p) {
    const k = int(rng, 10, 2000);
    const r = int(rng, 1, 5);
    return {
      prims: times(
        k,
        (i) =>
          `def Xform "${p}G${i}" (\n    prepend references = [${times(r, (j) => `${j ? ", " : ""}</${p}G${int(rng, 0, k - 1)}>`)}]\n    inherits = </${p}G${int(rng, 0, k - 1)}>\n)\n{\n    def Scope "c${i % 3}" {}\n}\n`,
      ),
    };
  },
  /**
   * Many strings past V8's 16,383-character hashing limit, all of one
   * length: as list items, asset paths, prim names and dictionary keys.
   */
  longKeys(rng, p) {
    const n = int(rng, 20, 400);
    const len = int(rng, 16400, 20000);
    const long = (i: number) =>
      `${"k".repeat(len)}${String(i).padStart(5, "0")}`;
    const kind = pick(rng, ["list", "assets", "names", "keys"]);
    if (kind === "names") {
      return {
        prims: `def Xform "${p}W"\n{\n${times(n, (i) => `    def Scope "${long(i)}" {}\n`)}}\n`,
      };
    }
    if (kind === "keys") {
      return {
        prims: `def Xform "${p}W" (\n    customData = {\n${times(n, (i) => `        int ${long(i)} = 1\n`)}    }\n)\n{\n}\n`,
      };
    }
    return {
      prims: `def Xform "${p}W" (\n    prepend ${kind === "list" ? "apiSchemas" : "references"} = [${times(n, (i) => `${i ? ", " : ""}${kind === "list" ? `"${long(i)}"` : `@./${long(i)}.usda@`}`)}]\n)\n{\n}\n`,
    };
  },
  /** One long list of numbers: tokens by the million, which the tokenizer holds at once. */
  manyTokens(rng, p) {
    const n = int(rng, 1_000_000, 12_000_000);
    return {
      prims: `def Xform "${p}W"\n{\n    custom float[] x = [${"1,".repeat(n)}1]\n}\n`,
    };
  },
  /** Random USDA-ish text: tokens the tokenizer and parser must survive. */
  garbage(rng, p) {
    const words = [
      "def",
      "over",
      "class",
      "(",
      ")",
      "{",
      "}",
      "[",
      "]",
      "=",
      ",",
      `"${p}x"`,
      "@a.usda@",
      "</a>",
      "float",
      "rel",
      "1.5",
      "-inf",
      "prepend",
      "references",
      "variantSet",
      ";",
      ":",
    ];
    const n = int(rng, 1000, 100000);
    return { prims: times(n, () => `${pick(rng, words)} `) };
  },
};

export const SHAPE_NAMES = Object.keys(SHAPES);

/**
 * A hostile stage from `seed`: one shape, or two or three combined in one
 * root layer.
 */
export function hostileCase(seed: number): HostileCase {
  const rng = seeded(seed);
  const count = rng() < 0.5 ? 1 : int(rng, 2, 3);
  const names = Array.from({ length: count }, () => pick(rng, SHAPE_NAMES));
  const parts = names.map((n, i) => SHAPES[n]!(rng, `x${i}`));
  const subLayers = parts.flatMap((x) => x.subLayers ?? []);
  const root = `#usda 1.0\n(\n    defaultPrim = "x0W"\n${
    subLayers.length
      ? `    subLayers = [${subLayers.map((s) => `@${s}@`).join(", ")}]\n`
      : ""
  })\n${parts.map((x) => x.prims).join("")}`;
  return {
    name: `seed ${seed}: ${names.join(" + ")}`,
    files: Object.assign(
      { "h/root.usda": root },
      ...parts.map((x) => x.files ?? {}),
    ) as Record<string, string>,
    root: "h/root.usda",
  };
}

/** One named shape alone, for the mutation checks. */
export function shapeCase(name: string, seed: number): HostileCase {
  const rng = seeded(seed);
  const part = SHAPES[name]!(rng, "x0");
  const subLayers = part.subLayers ?? [];
  return {
    name: `${name}, seed ${seed}`,
    files: {
      "h/root.usda": `#usda 1.0\n(\n    defaultPrim = "x0W"\n${
        subLayers.length
          ? `    subLayers = [${subLayers.map((s) => `@${s}@`).join(", ")}]\n`
          : ""
      })\n${part.prims}`,
      ...(part.files ?? {}),
    },
    root: "h/root.usda",
  };
}

/**
 * A crate file with its counts and sizes overwritten: each of the table of
 * contents' and sections' u64 fields, by turn, set to a huge or random value,
 * and some bytes flipped. Built from a real crate file from the setup store.
 */
export function mutatedCrate(bytes: Uint8Array, seed: number): HostileCase {
  const rng = seeded(seed);
  const out = bytes.slice();
  const view = new DataView(out.buffer);
  const toc = Number(view.getBigUint64(16, true));
  const sections = Number(view.getBigUint64(toc, true));
  const fields: number[] = [];
  for (let i = 0; i < sections; i++) {
    const at = toc + 8 + i * 32;
    const start = Number(view.getBigUint64(at + 16, true));
    fields.push(at + 16, at + 24, start, start + 8, start + 16);
  }
  const huge = [2n ** 40n, 2n ** 31n, 2n ** 53n, 0xffffffffn, 1n << 33n];
  for (let k = int(rng, 1, 3); k > 0; k--) {
    const at = pick(rng, fields);
    if (at + 8 <= out.length) {
      view.setBigUint64(
        at,
        rng() < 0.6 ? pick(rng, huge) : BigInt(int(rng, 0, 2 ** 30)),
        true,
      );
    }
  }
  for (let k = int(rng, 0, 20); k > 0; k--) {
    out[int(rng, 0, out.length - 1)] = int(rng, 0, 255);
  }
  return {
    name: `crate seed ${seed}`,
    files: { "h/root.usd": out },
    root: "h/root.usd",
  };
}

/** What reading one case cost, and what it gave. */
export interface BoundedResult {
  readonly name: string;
  /** Loading, composing and building records, in milliseconds. */
  readonly ms: number;
  /** Heap the result holds after a collection, in MiB: what reading left behind. */
  readonly heapMb: number;
  readonly prims: number;
  /** The first 2,000 prim paths. */
  readonly paths: readonly string[];
  readonly errors: readonly string[];
  readonly stopped: boolean;
  readonly spent: number;
  readonly counts: Record<string, unknown>;
  /** How many error messages the stage keeps. */
  readonly listed: number;
}

export interface Bounds {
  /** Each case is killed past this, and the run fails naming it. */
  readonly deadlineMs: number;
  /** The worker's heap limit: a case that needs more is killed. */
  readonly heapLimitMb: number;
  /** The work budget each case gets; the reader's own MAX_WORK when left out. */
  readonly budget?: number;
  /** Build the stage straight from every file, without loadLayers's caps. */
  readonly direct?: boolean;
}

// The worker: CommonJS, so it can be run from a string; it imports the
// reader's TypeScript with Node's own type stripping.
const WORKER = `
const { parentPort, workerData } = require("node:worker_threads");
const v8 = require("node:v8");
const vm = require("node:vm");
v8.setFlagsFromString("--expose-gc");
// The flag is process-wide: a later worker already has gc as a global.
const collect = globalThis.gc ?? vm.runInNewContext("gc");
(async () => {
  const C = await import(workerData.compose);
  const R = await import(workerData.records);
  const F = await import(workerData.facts);
  const enc = new TextEncoder();
  parentPort.on("message", async (c) => {
    collect();
    const h0 = v8.getHeapStatistics().used_heap_size;
    const t0 = performance.now();
    const files = new Map(Object.entries(c.files).map(([k, v]) => [k, typeof v === "string" ? enc.encode(v) : v]));
    const budget = new C.Budget(c.budget ?? C.MAX_WORK);
    let layers;
    if (c.direct) {
      layers = new Map();
      for (const [id, bytes] of files) {
        layers.set(id, { id, layer: C.parseLayer(bytes, budget), bytes: bytes.length, readMs: 0 });
      }
    } else {
      layers = await C.loadLayers(c.root, {
        read: (p) => Promise.resolve(files.get(p)),
        exists: (p) => Promise.resolve(files.has(p)),
      }, budget);
    }
    const stage = new C.Stage(layers, c.root, budget);
    const prim = stage.compose();
    const record = R.subsetRecords(stage, prim, [...stage.errors]);
    F.stageFacts(record);
    const ms = performance.now() - t0;
    collect();
    const heapMb = (v8.getHeapStatistics().used_heap_size - h0) / 2 ** 20;
    const paths = [];
    const walk = (p) => { if (paths.length < 2000) paths.push(p.path); p.children.forEach(walk); };
    walk(prim);
    let prims = 0;
    const count = (p) => { prims++; p.children.forEach(count); };
    count(prim);
    parentPort.postMessage({
      name: c.name, ms, heapMb, prims, paths,
      errors: [...stage.errors], stopped: stage.stopped, spent: budget.spent,
      counts: stage.counts, listed: stage.errorListed.size,
      keep: [stage, prim, record].length,
    });
  });
  parentPort.postMessage({ ready: true });
})();
`;

/**
 * Reads each case in one worker thread, in turn: the reader's loader, its
 * composer, the records and their facts. A case that runs past the deadline
 * or the heap limit is killed, and the run rejects naming it: a test's own
 * timeout can't interrupt a synchronous loop.
 */
export async function readBounded(
  cases: readonly HostileCase[],
  bounds: Bounds,
): Promise<BoundedResult[]> {
  const url = (p: string) => new URL(p, import.meta.url).href;
  const worker = new Worker(WORKER, {
    eval: true,
    workerData: {
      compose: url("../spikes/usd-subset/compose.ts"),
      records: url("../spikes/usd-readers/subsetRecords.ts"),
      facts: url("../spikes/usd-readers/facts.ts"),
    },
    resourceLimits: { maxOldGenerationSizeMb: bounds.heapLimitMb },
  });
  const next = (name: string, ms: number): Promise<unknown> =>
    new Promise((resolve, reject) => {
      const done = (): void => {
        clearTimeout(timer);
        worker.off("message", onMessage);
        worker.off("error", onError);
        worker.off("exit", onExit);
      };
      const onMessage = (m: unknown): void => {
        done();
        resolve(m);
      };
      const onError = (e: Error): void => {
        done();
        reject(new Error(`${name}: ${e.message}`));
      };
      const onExit = (code: number): void => {
        done();
        reject(new Error(`${name}: the worker exited (${code})`));
      };
      const timer = setTimeout(() => {
        done();
        reject(new Error(`${name}: ran past ${ms} ms`));
      }, ms);
      worker.on("message", onMessage);
      worker.on("error", onError);
      worker.on("exit", onExit);
    });
  try {
    await next("starting the worker", 30_000);
    const out: BoundedResult[] = [];
    for (const c of cases) {
      const answer = next(c.name, bounds.deadlineMs);
      worker.postMessage({
        ...c,
        budget: bounds.budget,
        direct: bounds.direct ?? false,
      });
      out.push((await answer) as BoundedResult);
    }
    return out;
  } finally {
    await worker.terminate();
  }
}
