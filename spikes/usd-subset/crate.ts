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
  pos = 0;
  constructor(bytes: Uint8Array) {
    this.bytes = bytes;
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
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
  compressedInts32(n: number): Int32Array {
    const size = this.u64();
    return decodeInts32(this.take(size), n);
  }
  compressedInts64(n: number): Float64Array {
    const size = this.u64();
    return decodeInts64(this.take(size), n);
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

export function readUsdc(bytes: Uint8Array): Layer {
  if (!isUsdc(bytes)) {
    throw new Error("usdc: not a crate file");
  }
  const c = new Cursor(bytes);
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
  const sectionCount = c.u64();
  const sections = new Map<string, { start: number; size: number }>();
  for (let i = 0; i < sectionCount; i++) {
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
    const raw = tfFastDecompress(c.take(compSize), rawSize);
    const text = new TextDecoder().decode(raw);
    const parts = text.split("\0");
    for (let i = 0; i < count; i++) {
      tokens.push(parts[i] ?? "");
    }
  }
  const token = (i: number): string => tokens[i] ?? `<token ${i}>`;

  const strings: number[] = [];
  if (seek("STRINGS")) {
    const count = c.u64();
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
    fieldReps = tfFastDecompress(c.take(repsSize), count * 8);
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
    paths.length = total;
    const n = c.u64();
    const index = c.compressedInts32(n);
    const element = c.compressedInts32(n);
    const jumps = c.compressedInts32(n);
    const build = (start: number, parent: string | undefined): void => {
      let cur = start;
      let hasChild: boolean;
      let hasSibling: boolean;
      do {
        const here = cur++;
        let path: string;
        if (parent === undefined) {
          path = "/";
        } else {
          const t = element[here]!;
          const name = token(Math.abs(t));
          if (t < 0) {
            path = `${parent}.${name}`;
          } else if (name.startsWith("{") || parent.endsWith("}")) {
            path = parent + name;
          } else {
            path = parent === "/" ? `/${name}` : `${parent}/${name}`;
          }
        }
        paths[index[here]!] = path;
        const jump = jumps[here]!;
        hasChild = jump > 0 || jump === -1;
        hasSibling = jump >= 0;
        if (hasChild) {
          if (hasSibling) {
            build(here + jump, parent);
          }
          parent = path;
        }
      } while (hasChild || hasSibling);
    };
    if (n > 0) {
      build(0, undefined);
    }
  }

  // Values.
  const undecoded = new Map<string, number>();
  const skip = (type: string): Value => {
    undecoded.set(type, (undecoded.get(type) ?? 0) + 1);
    return { kind: "undecoded", type };
  };

  const at = (offset: number): Cursor => {
    const r = new Cursor(bytes);
    r.pos = offset;
    return r;
  };
  const vecOf = <T>(r: Cursor, read: () => T): T[] => {
    const n = r.u64();
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
    const n = r.u64();
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
    return { kind: "arc", asset, primPath };
  };
  const payloadArc = (r: Cursor): Value => {
    const asset = string(r.u32());
    const primPath = paths[r.u32()] ?? "";
    if (atLeast(8)) {
      r.f64();
      r.f64();
    }
    return { kind: "arc", asset, primPath };
  };

  const numeric = (r: Cursor, type: string, count: number): Value => {
    const shape = NUMERIC[type]!;
    const [width, tuple, k] = shape;
    const n = count * tuple;
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
      const data = k === "u" && width === 4 ? Uint32Array.from(ints) : ints;
      return { kind: "array", type, tuple, data };
    }
    const code = String.fromCharCode(r.u8());
    if (code === "i") {
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
        const n = r.u64();
        for (let i = 0; i < n; i++) {
          const k = string(r.u32());
          out[k] = string(r.u32());
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
      const path = paths[specPaths[i]!] ?? `<path ${specPaths[i]}>`;
      const fields = new Map<string, Value>();
      for (
        let f = specSets[i]!;
        f < fieldSets.length && fieldSets[f]! !== -1;
        f++
      ) {
        const fi = fieldSets[f]!;
        const name = token(fieldNames[fi]!);
        try {
          fields.set(name, value(rep(repsView, fi * 8)));
        } catch (e) {
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
