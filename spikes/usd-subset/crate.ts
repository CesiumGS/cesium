// A reader for USDC, OpenUSD's binary "crate" layer format, version 0.4.0 and
// later. It reads the table of contents, tokens, strings, fields, field sets,
// paths and specs, then decodes the field values a subset reader needs:
// scalars, tokens, strings, asset paths, list ops, references, payloads,
// variant selections, and numeric and token arrays. Anything else (time
// samples, dictionaries' values, splines) is kept as `undecoded` by type name.
//
// Written from the format as OpenUSD's crateFile.cpp lays it out; there is no
// published specification. Spike code for CS-833 and CS-843; not part of
// @cesium/next.

import {
  Budget,
  MAX_FIELD_NAME,
  MAX_PATH,
  TOKEN,
  WorkLimit,
} from "./budget.ts";
import { decodeInts32, decodeInts64 } from "./intCoding.ts";
import { tfFastDecompress } from "./lz4.ts";
import type { Layer, ListOp, Spec, SpecType, Value } from "./layer.ts";

/** Crate value types by their numbers in OpenUSD's crateDataTypes.h. */
const TYPES: Record<number, string> = {
  1: "bool",
  2: "uchar",
  3: "int",
  4: "uint",
  5: "int64",
  6: "uint64",
  7: "half",
  8: "float",
  9: "double",
  10: "string",
  11: "token",
  12: "asset",
  13: "matrix2d",
  14: "matrix3d",
  15: "matrix4d",
  16: "quatd",
  17: "quatf",
  18: "quath",
  19: "double2",
  20: "float2",
  21: "half2",
  22: "int2",
  23: "double3",
  24: "float3",
  25: "half3",
  26: "int3",
  27: "double4",
  28: "float4",
  29: "half4",
  30: "int4",
  31: "dictionary",
  32: "tokenListOp",
  33: "stringListOp",
  34: "pathListOp",
  35: "referenceListOp",
  36: "intListOp",
  37: "int64ListOp",
  38: "uintListOp",
  39: "uint64ListOp",
  40: "pathVector",
  41: "tokenVector",
  42: "specifier",
  43: "permission",
  44: "variability",
  45: "variantSelectionMap",
  46: "timeSamples",
  47: "payload",
  48: "doubleVector",
  49: "layerOffsetVector",
  50: "stringVector",
  51: "valueBlock",
  52: "value",
  53: "unregisteredValue",
  54: "unregisteredValueListOp",
  55: "payloadListOp",
  56: "timecode",
  57: "pathExpression",
  58: "relocates",
  59: "spline",
};

/** Element shape of the numeric types: [bytes per component, components, kind]. */
const NUMERIC: Record<string, [1 | 2 | 4 | 8, number, "i" | "u" | "f"]> = {
  uchar: [1, 1, "u"],
  int: [4, 1, "i"],
  uint: [4, 1, "u"],
  int64: [8, 1, "i"],
  uint64: [8, 1, "u"],
  half: [2, 1, "f"],
  float: [4, 1, "f"],
  double: [8, 1, "f"],
  timecode: [8, 1, "f"],
  double2: [8, 2, "f"],
  float2: [4, 2, "f"],
  half2: [2, 2, "f"],
  int2: [4, 2, "i"],
  double3: [8, 3, "f"],
  float3: [4, 3, "f"],
  half3: [2, 3, "f"],
  int3: [4, 3, "i"],
  double4: [8, 4, "f"],
  float4: [4, 4, "f"],
  half4: [2, 4, "f"],
  int4: [4, 4, "i"],
  quatd: [8, 4, "f"],
  quatf: [4, 4, "f"],
  quath: [2, 4, "f"],
  matrix2d: [8, 4, "f"],
  matrix3d: [8, 9, "f"],
  matrix4d: [8, 16, "f"],
};

const SPEC_TYPES: Record<number, SpecType> = {
  1: "attribute",
  6: "prim",
  7: "pseudoRoot",
  8: "relationship",
  10: "variant",
  11: "variantSet",
};

const SPECIFIERS = ["def", "over", "class"];
const VARIABILITY = ["varying", "uniform"];

function half(bits: number): number {
  const s = bits & 0x8000 ? -1 : 1;
  const e = (bits >> 10) & 0x1f;
  const f = bits & 0x3ff;
  if (e === 0) {
    return s * f * 2 ** -24;
  }
  if (e === 31) {
    return f ? NaN : s * Infinity;
  }
  return s * (1 + f / 1024) * 2 ** (e - 15);
}

class Cursor {
  readonly bytes: Uint8Array;
  readonly view: DataView;
  readonly budget: Budget;
  pos = 0;
  constructor(bytes: Uint8Array, budget: Budget) {
    this.bytes = bytes;
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    this.budget = budget;
  }
  /**
   * A count the file declares, checked before anything is allocated for it:
   * each item takes at least `width` bytes of what's left, so a larger count
   * is a lie.
   */
  fits(n: number, width: number): number {
    if (n * width > this.bytes.length - this.pos) {
      throw new Error(`usdc: ${n} items of ${width} bytes run past the end`);
    }
    return n;
  }
  /** A count of items that each make a value (a slot in an array, about 16 bytes): checked, then charged one unit each. */
  count(n: number, width: number): number {
    this.fits(n, width);
    this.budget.charge(1 + n);
    return n;
  }
  u8(): number {
    return this.view.getUint8(this.pos++);
  }
  u32(): number {
    const v = this.view.getUint32(this.pos, true);
    this.pos += 4;
    return v;
  }
  i32(): number {
    const v = this.view.getInt32(this.pos, true);
    this.pos += 4;
    return v;
  }
  u64(): number {
    const v = this.view.getBigUint64(this.pos, true);
    this.pos += 8;
    if (v > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new Error("usdc: size too large");
    }
    return Number(v);
  }
  f64(): number {
    const v = this.view.getFloat64(this.pos, true);
    this.pos += 8;
    return v;
  }
  take(n: number): Uint8Array {
    if (this.pos + n > this.bytes.length) {
      throw new Error("usdc: read past the end");
    }
    const out = this.bytes.subarray(this.pos, this.pos + n);
    this.pos += n;
    return out;
  }
  // Integer coding allocates its output and a working buffer of about 4.25
  // bytes a value (8.25 for 64 bits): both charged before either exists.
  compressedInts32(n: number): Int32Array {
    this.budget.bytes(n * 8.25 + 16);
    const size = this.u64();
    const src = this.take(size);
    return decodeInts32(src, n);
  }
  compressedInts64(n: number): Float64Array {
    this.budget.bytes(n * 16.25 + 16);
    const size = this.u64();
    const src = this.take(size);
    return decodeInts64(src, n);
  }
  /** TfFastCompression, charged for the bytes it declares before they're allocated. */
  decompress(src: Uint8Array, size: number): Uint8Array {
    this.budget.bytes(size);
    return tfFastDecompress(src, size);
  }
}

/** A 64-bit ValueRep, split in halves. */
interface Rep {
  readonly isArray: boolean;
  readonly isInlined: boolean;
  readonly isCompressed: boolean;
  readonly type: number;
  /** The low 48 bits: an inline value, or a file offset. */
  readonly payload: number;
  /** The low 32 bits alone, for inline values. */
  readonly lo: number;
}

function rep(view: DataView, at: number): Rep {
  const lo = view.getUint32(at, true);
  const hi = view.getUint32(at + 4, true);
  return {
    isArray: (hi & 0x80000000) !== 0,
    isInlined: (hi & 0x40000000) !== 0,
    isCompressed: (hi & 0x20000000) !== 0,
    type: (hi >>> 16) & 0xff,
    payload: (hi & 0xffff) * 2 ** 32 + lo,
    lo,
  };
}

export function isUsdc(bytes: Uint8Array): boolean {
  return new TextDecoder().decode(bytes.subarray(0, 8)) === "PXR-USDC";
}

export function readUsdc(bytes: Uint8Array, budget = new Budget()): Layer {
  if (!isUsdc(bytes)) {
    throw new Error("usdc: not a crate file");
  }
  const c = new Cursor(bytes, budget);
  const [major, minor, patch] = [bytes[8]!, bytes[9]!, bytes[10]!];
  const version = `${major}.${minor}.${patch}`;
  if (major === 0 && minor < 4) {
    throw new Error(`usdc: version ${version} is older than 0.4.0, refused`);
  }
  const atLeast = (mi: number) => major > 0 || minor >= mi;
  c.pos = 16;
  const tocOffset = c.u64();

  // Table of contents.
  c.pos = tocOffset;
  const sectionCount = c.fits(c.u64(), 32);
  const sections = new Map<string, { start: number; size: number }>();
  for (let i = 0; i < sectionCount; i++) {
    budget.keep();
    const nameBytes = c.take(16);
    const end = nameBytes.indexOf(0);
    const name = new TextDecoder().decode(
      nameBytes.subarray(0, end < 0 ? 16 : end),
    );
    const start = c.u64();
    const size = c.u64();
    sections.set(name, { start, size });
  }
  const seek = (name: string): boolean => {
    const s = sections.get(name);
    if (!s) {
      return false;
    }
    c.pos = s.start;
    return true;
  };

  // Tokens: one compressed run of null-terminated strings.
  const tokens: string[] = [];
  if (seek("TOKENS")) {
    const count = c.u64();
    const rawSize = c.u64();
    const compSize = c.u64();
    const raw = c.decompress(c.take(compSize), rawSize);
    // Each token ends in a null byte, so the bytes bound the count.
    if (count > raw.length) {
      throw new Error(`usdc: ${count} tokens in ${raw.length} bytes`);
    }
    // The text, charged before it's decoded; then each token as it's cut,
    // without split(), which would make every part however few are named.
    budget.chars(raw.length);
    const text = new TextDecoder().decode(raw);
    let at = 0;
    for (let i = 0; i < count; i++) {
      const end = at <= text.length ? text.indexOf("\0", at) : -1;
      const stop = end < 0 ? text.length : end;
      budget.charge(TOKEN);
      budget.chars(Math.max(0, stop - at));
      tokens.push(at < text.length ? text.slice(at, stop) : "");
      at = stop + 1;
    }
  }
  const token = (i: number): string => tokens[i] ?? `<token ${i}>`;

  const strings: number[] = [];
  if (seek("STRINGS")) {
    const count = c.count(c.u64(), 4);
    for (let i = 0; i < count; i++) {
      strings.push(c.u32());
    }
  }
  const string = (i: number): string => token(strings[i] ?? -1);

  // Fields: a token for the name and a ValueRep each.
  let fieldNames: Int32Array = new Int32Array(0);
  let fieldReps: Uint8Array = new Uint8Array(0);
  if (seek("FIELDS")) {
    const count = c.u64();
    fieldNames = c.compressedInts32(count);
    const repsSize = c.u64();
    fieldReps = c.decompress(c.take(repsSize), count * 8);
  }
  const repsView = new DataView(
    fieldReps.buffer,
    fieldReps.byteOffset,
    fieldReps.byteLength,
  );

  let fieldSets: Int32Array = new Int32Array(0);
  if (seek("FIELDSETS")) {
    const count = c.u64();
    fieldSets = c.compressedInts32(count);
  }

  // Paths: a tree coded as path indexes, element tokens (negative for
  // properties) and jumps to siblings.
  const paths: string[] = [];
  if (seek("PATHS")) {
    const total = c.u64();
    const n = c.u64();
    const index = c.compressedInts32(n);
    const element = c.compressedInts32(n);
    const jumps = c.compressedInts32(n);
    // Sparse: nothing is allocated for the total until entries fill it.
    paths.length = total;
    // Each run of siblings, on an explicit stack: a hostile file can nest
    // deeper than the call stack, and its jumps can revisit entries, which
    // the budget bounds.
    const runs: [number, string | undefined][] = [];
    const build = (start: number, parent: string | undefined): void => {
      let cur = start;
      let hasChild: boolean;
      let hasSibling: boolean;
      do {
        // The entry, and the run it may push: about 32 bytes.
        budget.charge(2);
        const here = cur++;
        let path: string;
        if (parent === undefined) {
          path = "/";
        } else {
          const t = element[here]!;
          const name = token(Math.abs(t));
          // The path string, charged before it's built.
          budget.chars(parent.length + name.length + 1);
          if (t < 0) {
            path = `${parent}.${name}`;
          } else if (name.startsWith("{") || parent.endsWith("}")) {
            path = parent + name;
          } else {
            path = parent === "/" ? `/${name}` : `${parent}/${name}`;
          }
        }
        if (path.length > MAX_PATH) {
          throw new Error(`usdc: a path longer than ${MAX_PATH} characters`);
        }
        paths[index[here]!] = path;
        const jump = jumps[here]!;
        hasChild = jump > 0 || jump === -1;
        hasSibling = jump >= 0;
        if (hasChild) {
          if (hasSibling) {
            runs.push([here + jump, parent]);
          }
          parent = path;
        }
      } while (hasChild || hasSibling);
    };
    if (n > 0) {
      runs.push([0, undefined]);
    }
    // Last in, first out, as the recursion visited them; every path's slot is set by its own entry.
    while (runs.length) {
      const [start, parent] = runs.pop()!;
      build(start, parent);
    }
  }

  // Values.
  const undecoded = new Map<string, number>();
  const skip = (type: string): Value => {
    undecoded.set(type, (undecoded.get(type) ?? 0) + 1);
    return { kind: "undecoded", type };
  };

  const at = (offset: number): Cursor => {
    const r = new Cursor(bytes, budget);
    r.pos = offset;
    return r;
  };
  const vecOf = <T>(r: Cursor, read: () => T): T[] => {
    const n = r.count(r.u64(), 1);
    const out: T[] = [];
    for (let i = 0; i < n; i++) {
      out.push(read());
    }
    return out;
  };
  const listOp = (r: Cursor, item: () => Value): ListOp => {
    const h = r.u8();
    const read = () => vecOf(r, item);
    const op: { -readonly [K in keyof ListOp]: ListOp[K] } = { kind: "listOp" };
    if (h & 1) {
      op.explicit = [];
    }
    if (h & 2) {
      op.explicit = read();
    }
    if (h & 4) {
      op.added = read();
    }
    if (h & 32) {
      op.prepended = read();
    }
    if (h & 64) {
      op.appended = read();
    }
    if (h & 8) {
      op.deleted = read();
    }
    if (h & 16) {
      op.ordered = read();
    }
    return op;
  };
  const skipDictionary = (r: Cursor): void => {
    // Each entry is a key and a relative offset to its ValueRep. The subset
    // reader keeps no dictionary values, so it only steps over them.
    const n = r.count(r.u64(), 12);
    for (let i = 0; i < n; i++) {
      r.u32();
      r.pos += 8;
    }
  };
  const reference = (r: Cursor, withCustomData: boolean): Value => {
    const asset = string(r.u32());
    const primPath = paths[r.u32()] ?? "";
    r.f64();
    r.f64(); // The layer offset: offset and scale.
    if (withCustomData) {
      skipDictionary(r);
    }
    budget.keep();
    return { kind: "arc", asset, primPath };
  };
  const payloadArc = (r: Cursor): Value => {
    const asset = string(r.u32());
    const primPath = paths[r.u32()] ?? "";
    if (atLeast(8)) {
      r.f64();
      r.f64();
    }
    budget.keep();
    return { kind: "arc", asset, primPath };
  };

  const numeric = (r: Cursor, type: string, count: number): Value => {
    const shape = NUMERIC[type]!;
    const [width, tuple, k] = shape;
    // Checked against the bytes left, then charged by the typed array's own
    // bytes (4 a value for half and float, 8 for double and 64-bit), before
    // it is allocated.
    const n = r.fits(count * tuple, width);
    budget.bytes(n * (width === 8 ? 8 : 4));
    const v = r.view;
    if (k === "f" && width !== 8) {
      const out = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        out[i] =
          width === 4
            ? v.getFloat32(r.pos + i * 4, true)
            : half(v.getUint16(r.pos + i * 2, true));
      }
      r.pos += n * width;
      return { kind: "array", type, tuple, data: out };
    }
    if (k === "f") {
      const out = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        out[i] = v.getFloat64(r.pos + i * 8, true);
      }
      r.pos += n * 8;
      return { kind: "array", type, tuple, data: out };
    }
    if (width === 8) {
      const out = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        out[i] = Number(v.getBigInt64(r.pos + i * 8, true));
      }
      r.pos += n * 8;
      return { kind: "array", type, tuple, data: out };
    }
    const out = k === "u" ? new Uint32Array(n) : new Int32Array(n);
    for (let i = 0; i < n; i++) {
      out[i] =
        width === 4
          ? k === "u"
            ? v.getUint32(r.pos + i * 4, true)
            : v.getInt32(r.pos + i * 4, true)
          : v.getUint8(r.pos + i);
    }
    r.pos += n * width;
    return { kind: "array", type, tuple, data: out };
  };

  const compressedArray = (r: Cursor, type: string, count: number): Value => {
    const shape = NUMERIC[type]!;
    const [width, tuple, k] = shape;
    if (tuple !== 1) {
      return skip(`${type}[] (compressed)`);
    }
    if (k !== "f") {
      const ints =
        width === 8 ? r.compressedInts64(count) : r.compressedInts32(count);
      if (k === "u" && width === 4) {
        budget.bytes(count * 4);
      }
      const data = k === "u" && width === 4 ? Uint32Array.from(ints) : ints;
      return { kind: "array", type, tuple, data };
    }
    const code = String.fromCharCode(r.u8());
    if (code === "i") {
      budget.bytes(count * 8);
      return {
        kind: "array",
        type,
        tuple,
        data: Float64Array.from(r.compressedInts32(count)),
      };
    }
    if (code === "t") {
      const lutSize = r.u32();
      const lut = numeric(r, type, lutSize);
      const idx = r.compressedInts32(count);
      const src = (lut as { data: ArrayLike<number> }).data;
      budget.bytes(count * 8);
      const out = new Float64Array(count);
      for (let i = 0; i < count; i++) {
        out[i] = src[idx[i]!] ?? NaN;
      }
      return { kind: "array", type, tuple, data: out };
    }
    return skip(`${type}[] (code ${code})`);
  };

  const inline = (rp: Rep, type: string): Value => {
    const lo = rp.lo;
    switch (type) {
      case "bool":
        return lo !== 0;
      case "uchar":
      case "uint":
        return lo >>> 0;
      case "int":
      case "int64":
        return lo | 0;
      case "uint64":
        return lo >>> 0;
      case "half":
        return half(lo & 0xffff);
      case "float":
      case "double":
      case "timecode": {
        const f = new DataView(new ArrayBuffer(4));
        f.setUint32(0, lo, true);
        return f.getFloat32(0, true);
      }
      case "token":
      case "asset":
        return token(lo);
      case "string":
        return string(lo);
      case "specifier":
        return SPECIFIERS[lo] ?? `specifier ${lo}`;
      case "variability":
        return VARIABILITY[lo] ?? `variability ${lo}`;
      case "permission":
        return lo === 0 ? "public" : "private";
      case "valueBlock":
        return null;
      default: {
        const shape = NUMERIC[type];
        if (shape) {
          // Vectors inline as int8 components; matrices as their int8 diagonal.
          const b = new Int8Array(new Uint32Array([lo]).buffer);
          if (type.startsWith("matrix")) {
            const dim = Math.round(Math.sqrt(shape[1]));
            const m: number[] = [];
            for (let i = 0; i < dim; i++) {
              for (let j = 0; j < dim; j++) {
                m.push(i === j ? b[i]! : 0);
              }
            }
            return m;
          }
          return Array.from(b.subarray(0, shape[1]));
        }
        return skip(`${type} (inline)`);
      }
    }
  };

  const value = (rp: Rep): Value => {
    const type = TYPES[rp.type] ?? `type ${rp.type}`;
    if (rp.isInlined && !rp.isArray) {
      return inline(rp, type);
    }
    if (rp.isArray && rp.payload === 0) {
      return {
        kind: "array",
        type,
        tuple: NUMERIC[type]?.[1] ?? 1,
        data: new Float64Array(0),
      };
    }
    const r = at(rp.payload);
    if (rp.isArray) {
      const count = atLeast(7) ? r.u64() : r.u32();
      if (
        type === "token" ||
        type === "asset" ||
        type === "string" ||
        type === "bool"
      ) {
        r.count(count, type === "bool" ? 1 : 4);
      }
      if (type === "token" || type === "asset") {
        const out: string[] = [];
        for (let i = 0; i < count; i++) {
          out.push(token(r.u32()));
        }
        return out;
      }
      if (type === "string") {
        const out: string[] = [];
        for (let i = 0; i < count; i++) {
          out.push(string(r.u32()));
        }
        return out;
      }
      if (type === "bool") {
        const out: boolean[] = [];
        for (let i = 0; i < count; i++) {
          out.push(r.u8() !== 0);
        }
        return out;
      }
      if (!NUMERIC[type]) {
        return skip(`${type}[]`);
      }
      if (rp.isCompressed) {
        return compressedArray(r, type, count);
      }
      return numeric(r, type, count);
    }
    switch (type) {
      case "tokenListOp":
        return listOp(r, () => token(r.u32()));
      case "stringListOp":
        return listOp(r, () => string(r.u32()));
      case "pathListOp":
        return listOp(r, () => paths[r.u32()] ?? "");
      case "referenceListOp":
        return listOp(r, () => reference(r, true));
      case "payloadListOp":
        return listOp(r, () => payloadArc(r));
      case "payload":
        return payloadArc(r);
      case "intListOp":
      case "uintListOp":
        return listOp(r, () => r.i32());
      case "tokenVector":
        return vecOf(r, () => token(r.u32()));
      case "stringVector":
        return vecOf(r, () => string(r.u32()));
      case "pathVector":
        return vecOf(r, () => paths[r.u32()] ?? "");
      case "doubleVector":
        return vecOf(r, () => r.f64());
      case "variantSelectionMap": {
        const out: Record<string, Value> = {};
        const n = r.count(r.u64(), 8);
        for (let i = 0; i < n; i++) {
          budget.keep();
          const k = string(r.u32());
          const v = string(r.u32());
          // A key past MAX_PATH names no variant set; V8 would hash it by length.
          if (k.length <= MAX_PATH) {
            out[k] = v;
          }
        }
        return out;
      }
      default: {
        const shape = NUMERIC[type];
        if (shape) {
          const arr = numeric(r, type, 1) as { data: ArrayLike<number> };
          return shape[1] === 1 ? (arr.data[0] ?? NaN) : Array.from(arr.data);
        }
        return skip(type);
      }
    }
  };

  // Specs: a path, a field set and a type each.
  const specs = new Map<string, Spec>();
  if (seek("SPECS")) {
    const n = c.u64();
    const specPaths = c.compressedInts32(n);
    const specSets = c.compressedInts32(n);
    const specTypes = c.compressedInts32(n);
    for (let i = 0; i < n; i++) {
      // Each spec is kept with its map, whatever fields it has: charged per
      // spec, not only per field, or a file of empty specs would cost nothing.
      // A spec is an object and a map: two kept objects.
      budget.keep(2);
      const path = paths[specPaths[i]!] ?? `<path ${specPaths[i]}>`;
      const fields = new Map<string, Value>();
      for (
        let f = specSets[i]!;
        f < fieldSets.length && fieldSets[f]! !== -1;
        f++
      ) {
        budget.keep();
        const fi = fieldSets[f]!;
        const name = token(fieldNames[fi]!);
        if (name.length > MAX_FIELD_NAME) {
          skip("field with a long name");
          continue;
        }
        try {
          fields.set(name, value(rep(repsView, fi * 8)));
        } catch (e) {
          // Out of budget: stop reading, not one field.
          if (e instanceof WorkLimit) {
            throw e;
          }
          fields.set(
            name,
            skip(`error: ${e instanceof Error ? e.message : String(e)}`),
          );
        }
      }
      specs.set(path, { type: SPEC_TYPES[specTypes[i]!] ?? "other", fields });
    }
  }
  return { format: "usdc", version, specs, undecoded };
}
