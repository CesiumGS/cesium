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
  readonly files?: Record<string, string | Uint8Array>;
}

// Binary inputs: a crate (USDC) writer and a zip (USDZ) writer, just enough
// for hostile files. Each builds its bytes from runs, so a few kilobytes can
// declare gigabytes, as a hostile file would.

const enc = new TextEncoder();

function concat(parts: readonly Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

function u64(n: number | bigint): Uint8Array {
  const out = new Uint8Array(8);
  new DataView(out.buffer).setBigUint64(0, BigInt(n), true);
  return out;
}

function u32(n: number): Uint8Array {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setUint32(0, n >>> 0, true);
  return out;
}

/** LZ4's run-length extension bytes for `n`. */
function extension(n: number): number[] {
  const out: number[] = [];
  let r = n;
  while (r >= 255) {
    out.push(255);
    r -= 255;
  }
  out.push(r);
  return out;
}

/**
 * TfFastCompression of `lits` followed by `zeros` zero bytes: one LZ4 block
 * of literals, then one match at offset 1 that repeats the last zero.
 */
function tfFast(lits: Uint8Array, zeros = 0): Uint8Array {
  const literal =
    zeros >= 5
      ? concat([lits, new Uint8Array(1)])
      : concat([lits, new Uint8Array(zeros)]);
  const match = zeros >= 5 ? zeros - 1 - 4 : -1;
  const head = [
    (Math.min(literal.length, 15) << 4) |
      (match >= 0 ? Math.min(match, 15) : 0),
    ...(literal.length >= 15 ? extension(literal.length - 15) : []),
  ];
  const tail =
    match >= 0 ? [1, 0, ...(match >= 15 ? extension(match - 15) : [])] : [];
  return concat([
    new Uint8Array([0]),
    new Uint8Array(head),
    literal,
    new Uint8Array(tail),
  ]);
}

/** Usd_IntegerCompression of `n` values that each add `step` to the last: every delta is the common one. */
function steadyInts(n: number, step: number, width: 4 | 8): Uint8Array {
  const common =
    width === 4 ? u32(step) : u64(BigInt.asUintN(64, BigInt(step)));
  const data = tfFast(common, Math.floor((n * 2 + 7) / 8));
  return concat([u64(data.length), data]);
}

/** Usd_IntegerCompression of a few explicit 32-bit values: every delta written out. */
function ints(values: readonly number[]): Uint8Array {
  const codes = new Uint8Array(Math.floor((values.length * 2 + 7) / 8));
  const deltas = new Uint8Array(values.length * 4);
  const view = new DataView(deltas.buffer);
  let prev = 0;
  values.forEach((v, i) => {
    codes[i >> 2]! |= 3 << ((i & 3) * 2);
    view.setInt32(i * 4, v - prev, true);
    prev = v;
  });
  const data = tfFast(concat([u32(0), codes, deltas]));
  return concat([u64(data.length), data]);
}

/** A crate file: its data region, then its sections, then the table of contents. */
function crateFile(
  data: Uint8Array,
  sections: readonly [string, (start: number) => Uint8Array][],
): Uint8Array {
  const header = concat([
    enc.encode("PXR-USDC"),
    new Uint8Array([0, 8, 0, 0, 0, 0, 0, 0]),
  ]);
  let at = header.length + 8 + data.length;
  const bodies: Uint8Array[] = [];
  const toc: Uint8Array[] = [u64(sections.length)];
  for (const [name, make] of sections) {
    const body = make(at);
    const label = new Uint8Array(16);
    label.set(enc.encode(name));
    toc.push(label, u64(at), u64(body.length));
    bodies.push(body);
    at += body.length;
  }
  return concat([header, u64(at), data, ...bodies, ...toc]);
}

/** A crate's specs, each with field set `set`, at paths 1 to n (unnamed, so `<path i>`). */
function specs(n: number, set: number): [string, () => Uint8Array] {
  return [
    "SPECS",
    () =>
      concat([
        u64(n),
        steadyInts(n, 1, 4),
        set === 0 ? steadyInts(n, 0, 4) : ints(Array(n).fill(set)),
        steadyInts(n, 0, 4),
      ]),
  ];
}

/** A zip with no compression: each entry has its own bytes, or aliases another entry's. */
function zipFile(
  entries: readonly { name: string; bytes?: Uint8Array; alias?: number }[],
): Uint8Array {
  const locals: Uint8Array[] = [];
  const offsets: number[] = [];
  const sizes: number[] = [];
  let at = 0;
  entries.forEach((e, i) => {
    if (e.alias !== undefined) {
      offsets.push(offsets[e.alias]!);
      sizes.push(sizes[e.alias]!);
      return;
    }
    const name = enc.encode(e.name);
    const head = new Uint8Array(30);
    const v = new DataView(head.buffer);
    v.setUint32(0, 0x04034b50, true);
    v.setUint32(18, e.bytes!.length, true);
    v.setUint32(22, e.bytes!.length, true);
    v.setUint16(26, name.length, true);
    locals.push(head, name, e.bytes!);
    offsets.push(at);
    sizes.push(e.bytes!.length);
    at += 30 + name.length + e.bytes!.length;
    void i;
  });
  const central: Uint8Array[] = [];
  let cdSize = 0;
  entries.forEach((e, i) => {
    const name = enc.encode(e.name);
    const head = new Uint8Array(46);
    const v = new DataView(head.buffer);
    v.setUint32(0, 0x02014b50, true);
    v.setUint32(20, sizes[i]!, true);
    v.setUint32(24, sizes[i]!, true);
    v.setUint16(28, name.length, true);
    v.setUint32(42, offsets[i]!, true);
    central.push(head, name);
    cdSize += 46 + name.length;
  });
  const end = new Uint8Array(22);
  const v = new DataView(end.buffer);
  v.setUint32(0, 0x06054b50, true);
  v.setUint16(8, entries.length, true);
  v.setUint16(10, entries.length, true);
  v.setUint32(12, cdSize, true);
  v.setUint32(16, at, true);
  return concat([...locals, ...central, end]);
}

/** A USDA layer's bytes. */
const usda = (text: string): Uint8Array => enc.encode(text);

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
  /** The review's crate input: specs with no fields, each at its own path. */
  crateEmptySpecs(rng, p) {
    const n = int(rng, 10_000, 3_000_000);
    const name = `${p}empty.usdc`;
    return {
      prims: "",
      subLayers: [`./${name}`],
      files: {
        [`h/${name}`]: crateFile(new Uint8Array(0), [
          ["FIELDSETS", () => concat([u64(1), ints([-1])])],
          specs(n, 0),
        ]),
      },
    };
  },
  /** The review's crate input: a token table that decompresses to megabytes of nulls. */
  crateBigTokens(rng, p) {
    const count = int(rng, 1, 3);
    const raw = int(rng, 1 << 20, 64 << 20);
    const comp = tfFast(new Uint8Array(0), raw);
    const name = `${p}tokens.usdc`;
    return {
      prims: "",
      subLayers: [`./${name}`],
      files: {
        [`h/${name}`]: crateFile(new Uint8Array(0), [
          [
            "TOKENS",
            () => concat([u64(count), u64(raw), u64(comp.length), comp]),
          ],
        ]),
      },
    };
  },
  /** The review's crate input: one compressed int64 array of millions of values, which fields can alias. */
  crateBigArray(rng, p) {
    const n = int(rng, 1_000_000, 80_000_000);
    const k = int(rng, 1, 1000);
    const data = concat([u64(n), steadyInts(n, 1, 8)]);
    const names = enc.encode(times(k, (i) => `f${i}\0`));
    const tokens = tfFast(names);
    const rep = new Uint8Array(8 * k);
    const view = new DataView(rep.buffer);
    for (let i = 0; i < k; i++) {
      // An array, compressed, of int64 (type 5), at offset 24.
      view.setUint32(i * 8, 24, true);
      view.setUint32(i * 8 + 4, 0x80000000 | 0x20000000 | (5 << 16), true);
    }
    const reps = tfFast(rep);
    const range = Array.from({ length: k }, (_, i) => i);
    const name = `${p}array.usdc`;
    return {
      prims: "",
      subLayers: [`./${name}`],
      files: {
        [`h/${name}`]: crateFile(data, [
          [
            "TOKENS",
            () =>
              concat([u64(k), u64(names.length), u64(tokens.length), tokens]),
          ],
          [
            "FIELDS",
            () => concat([u64(k), ints(range), u64(reps.length), reps]),
          ],
          ["FIELDSETS", () => concat([u64(k + 1), ints([...range, -1])])],
          specs(1, 0),
        ]),
      },
    };
  },
  /** The review's package input: entries that alias one large layer of whitespace. */
  usdzAliased(rng, p) {
    const k = int(rng, 2, 50);
    const size = int(rng, 1 << 20, 16 << 20);
    const spaces = new Uint8Array(size).fill(32);
    spaces.set(enc.encode("#usda 1.0\n"));
    const name = `${p}pkg.usdz`;
    return {
      prims: "",
      subLayers: [`./${name}`],
      files: {
        [`h/${name}`]: zipFile([
          {
            name: "root.usda",
            bytes: usda(
              `#usda 1.0\n(\n    subLayers = [${times(k, (i) => `${i ? ", " : ""}@./e${i}.usda@`)}]\n)\n`,
            ),
          },
          { name: "e.usda", bytes: spaces },
          ...Array.from({ length: k }, (_, i) => ({
            name: `e${i}.usda`,
            alias: 1,
          })),
        ]),
      },
    };
  },
  /** Many packages, each one file named many times, with a directory of thousands of entries. */
  usdzManyPackages(rng, p) {
    const entries = int(rng, 1000, 60000);
    const k = int(rng, 10, 999);
    const pkg = zipFile([
      { name: "root.usda", bytes: usda("#usda 1.0\n") },
      ...Array.from({ length: entries }, (_, i) => ({
        name: `x${i}`,
        alias: 0,
      })),
    ]);
    const files: Record<string, Uint8Array> = {};
    for (let i = 0; i < k; i++) {
      files[`h/${p}k${i}.usdz`] = pkg;
    }
    return {
      prims: `def Xform "${p}W" (\n    prepend references = [${times(k, (i) => `${i ? ", " : ""}@./${p}k${i}.usdz@`)}]\n)\n{\n}\n`,
      files,
    };
  },
  /** The review's facts input: label strings past 16,383 characters, which V8 hashes by length. */
  factsLongLabels(rng, p) {
    return labels(rng, p, 16_400, int(rng, 1000, 5000));
  },
  /** Labels the facts join and hash for every prim that inherits them. */
  factsLabels(rng, p) {
    return labels(rng, p, int(rng, 2000, 4000), int(rng, 20_000, 100_000));
  },
  /** Many label schemas with long taxonomies on one class: the facts join each label with each taxonomy, for every prim. */
  factsTaxonomies(rng, p) {
    // Property names are identifiers, which USDA reads up to 256 characters.
    const n = int(rng, 1000, 5000);
    const length = int(rng, 100, 230);
    const m = int(rng, 50, 1000);
    const tax = (i: number) =>
      `${"t".repeat(length - 4)}${String(i).padStart(4, "0")}`;
    const words = times(64, (i) => `${i ? ", " : ""}"w${i}"`);
    return {
      prims: `class "${p}C" (\n    prepend apiSchemas = [${times(n, (i) => `${i ? ", " : ""}"SemanticsLabelsAPI:${tax(i)}"`)}]\n)\n{\n${times(n, (i) => `    token[] semantics:labels:${tax(i)} = [${words}]\n`)}}\n${times(
        m,
        (i) => `def Xform "${p}P${i}" (\n    inherits = </${p}C>\n)\n{\n}\n`,
      )}`,
    };
  },
  /** The review's string input: one that never ends, in a layer of its own. */
  unterminatedString(rng, p) {
    const size = int(rng, 1 << 20, 16 << 20);
    const name = `${p}open.usda`;
    return {
      prims: "",
      subLayers: [`./${name}`],
      files: { [`h/${name}`]: `#usda 1.0\n(\n    doc = "${"a".repeat(size)}` },
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

/** A class with 64 labels of `length` characters, inherited by `m` prims. */
function labels(rng: Rng, p: string, length: number, m: number): Part {
  // One long shared prefix, so strings of one length only differ at the end.
  const label = (i: number) =>
    `${"a".repeat(length - 3)}${String(i).padStart(3, "0")}`;
  return {
    prims: `class "${p}C" (\n    prepend apiSchemas = ["SemanticsLabelsAPI:t"]\n)\n{\n    token[] semantics:labels:t = [${times(64, (i) => `${i ? ", " : ""}"${label(i)}"`)}]\n}\n${times(
      m,
      (i) => `def Xform "${p}P${i}" (\n    inherits = </${p}C>\n)\n{\n}\n`,
    )}`,
  };
}

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
    ) as Record<string, string | Uint8Array>,
    root: "h/root.usda",
  };
}

/** A stage whose root layer holds one part. */
function caseOf(name: string, part: Part): HostileCase {
  const subLayers = part.subLayers ?? [];
  return {
    name,
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

/** One named shape alone, for the mutation checks. */
export function shapeCase(name: string, seed: number): HostileCase {
  return caseOf(`${name}, seed ${seed}`, SHAPES[name]!(seeded(seed), "x0"));
}

/** A random source that answers `values` in turn, for a shape at exact sizes. */
function fixed(...values: number[]): Rng {
  // int(rng, lo, hi) is lo + floor(rng() * (hi - lo + 1)): solve for each value in turn.
  let i = 0;
  return () => values[i++] ?? 0;
}

/**
 * The six inputs of the invariant review (CS-1153 A), at its sizes. Each
 * escaped "every input finishes within a stated time and heap" before.
 */
export function reviewCases(): HostileCase[] {
  const exact = (
    shape: string,
    ranges: readonly [number, number, number][],
  ): Part =>
    SHAPES[shape]!(
      fixed(...ranges.map(([v, lo, hi]) => (v - lo) / (hi - lo + 1))),
      "x0",
    );
  return [
    caseOf(
      "review 1: 25,000,000 crate specs with no fields (68 KB)",
      exact("crateEmptySpecs", [[25_000_000, 10_000, 3_000_000]]),
    ),
    caseOf(
      "review 2: 64 labels of 16,400 characters, inherited by 1,000 prims (1.1 MB)",
      labels(seeded(0), "x0", 16_400, 1000),
    ),
    caseOf(
      "review 3: 20 package entries aliasing a 60 MB layer of whitespace",
      exact("usdzAliased", [
        [20, 2, 50],
        [60 << 20, 1 << 20, 16 << 20],
      ]),
    ),
    caseOf(
      "review 4: a 60 MiB string that never ends",
      exact("unterminatedString", [[60 << 20, 1 << 20, 16 << 20]]),
    ),
    caseOf(
      "review 5: a crate token table of 64 MiB of nulls",
      exact("crateBigTokens", [
        [1, 1, 3],
        [64 << 20, 1 << 20, 64 << 20],
      ]),
    ),
    caseOf(
      "review 6: a crate int64 array of 79,000,000 values (71 KB)",
      exact("crateBigArray", [
        [79_000_000, 1_000_000, 80_000_000],
        [1, 1, 1000],
      ]),
    ),
  ];
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
  /** Loading, composing, building records and their facts, in milliseconds. */
  readonly ms: number;
  /** How much the V8 heap grew while reading, in MiB, before any collection: its high-water mark. */
  readonly peakHeapMb: number;
  /** ArrayBuffer memory allocated while reading and not yet freed, in MiB, before any collection. */
  readonly arrayBuffersMb: number;
  /** Heap and ArrayBuffer memory the result still holds after a collection, in MiB. */
  readonly keptMb: number;
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
  /** The worker's old-generation heap limit: a case whose peak needs more is killed. */
  readonly heapLimitMb: number;
  /** The work budget each case gets; the reader's own MAX_WORK when left out. */
  readonly budget?: number;
  /** Build the stage straight from every file, without loadLayers's caps. */
  readonly direct?: boolean;
}

// The worker: CommonJS, so it can be run from a string; it imports the
// reader's TypeScript with Node's own type stripping. One worker reads one
// case, so its heap figures are that case's alone.
const WORKER = `
const { parentPort, workerData } = require("node:worker_threads");
const v8 = require("node:v8");
const vm = require("node:vm");
v8.setFlagsFromString("--expose-gc");
// The flag is process-wide: a later worker already has gc as a global.
const collect = globalThis.gc ?? vm.runInNewContext("gc");
const MiB = 2 ** 20;
(async () => {
  const C = await import(workerData.compose);
  const R = await import(workerData.records);
  const F = await import(workerData.facts);
  const enc = new TextEncoder();
  parentPort.once("message", async (c) => {
    // The input isn't the reader's: it's made before the measures start.
    const files = new Map(Object.entries(c.files).map(([k, v]) => [k, typeof v === "string" ? enc.encode(v) : v]));
    collect();
    const h0 = v8.getHeapStatistics();
    const ab0 = process.memoryUsage().arrayBuffers;
    const t0 = performance.now();
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
    const h1 = v8.getHeapStatistics();
    const ab1 = process.memoryUsage().arrayBuffers;
    collect();
    const kept =
      v8.getHeapStatistics().used_heap_size - h0.used_heap_size +
      process.memoryUsage().arrayBuffers - ab0;
    const paths = [];
    const walk = (p) => { if (paths.length < 2000) paths.push(p.path); p.children.forEach(walk); };
    walk(prim);
    let prims = 0;
    const count = (p) => { prims++; p.children.forEach(count); };
    count(prim);
    parentPort.postMessage({
      name: c.name, ms, prims, paths,
      peakHeapMb: (h1.total_heap_size - h0.total_heap_size) / MiB,
      arrayBuffersMb: (ab1 - ab0) / MiB,
      keptMb: kept / MiB,
      errors: record.errors, stopped: stage.stopped, spent: budget.spent,
      counts: stage.counts, listed: stage.errorListed.size,
    });
  });
  parentPort.postMessage({ ready: true });
})();
`;

/**
 * Reads each case in a worker thread of its own: the reader's loader, its
 * composer, the records and their facts. A case that runs past the deadline
 * or the heap limit is killed, and the run rejects naming it: a test's own
 * timeout can't interrupt a synchronous loop.
 */
export async function readBounded(
  cases: readonly HostileCase[],
  bounds: Bounds,
): Promise<BoundedResult[]> {
  const url = (p: string) => new URL(p, import.meta.url).href;
  const out: BoundedResult[] = [];
  for (const c of cases) {
    out.push(await readOne(c, bounds, url));
  }
  return out;
}

async function readOne(
  c: HostileCase,
  bounds: Bounds,
  url: (p: string) => string,
): Promise<BoundedResult> {
  const worker = new Worker(WORKER, {
    eval: true,
    workerData: {
      compose: url("../spikes/usd-subset/compose.ts"),
      records: url("../spikes/usd-readers/subsetRecords.ts"),
      facts: url("../spikes/usd-readers/facts.ts"),
    },
    resourceLimits: { maxOldGenerationSizeMb: bounds.heapLimitMb },
  });
  const next = (what: string, ms: number): Promise<unknown> =>
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
        reject(new Error(`${what}: ${e.message}`));
      };
      const onExit = (code: number): void => {
        done();
        reject(new Error(`${what}: the worker exited (${code})`));
      };
      const timer = setTimeout(() => {
        done();
        reject(new Error(`${what}: ran past ${ms} ms`));
      }, ms);
      worker.on("message", onMessage);
      worker.on("error", onError);
      worker.on("exit", onExit);
    });
  try {
    await next(`${c.name}: starting the worker`, 30_000);
    const answer = next(c.name, bounds.deadlineMs);
    worker.postMessage({
      ...c,
      budget: bounds.budget,
      direct: bounds.direct ?? false,
    });
    return (await answer) as BoundedResult;
  } finally {
    await worker.terminate();
  }
}
