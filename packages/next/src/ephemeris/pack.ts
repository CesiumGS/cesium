import type { Type2Segment } from "./spk.ts";

/** One excerpted type-2 segment inside a pack. */
export interface PackSegment {
  name: string;
  /** NAIF id of the target body (SPK) or body-frame class (PCK). */
  target: number;
  /** NAIF id of the center body; 0 for orientation segments. */
  center: number;
  frame: "ICRF" | "MOON_PA";
  /** "position" records are km; "euler" records are radians. */
  kind: "position" | "euler";
  /** Requested span clipped to the source segment, TDB s past J2000. */
  start: number;
  end: number;
  /** TDB s past J2000 at the start of the first copied record. */
  init: number;
  intervalLength: number;
  recordSize: number;
  count: number;
  /** Offset of the first record, in doubles, into `readPack(...).data`. */
  offset: number;
}

/**
 * Provenance of a pack. The records are a derived excerpt of a NAIF kernel, so
 * the manifest names the source file, its SHA-256, the span excerpted and what
 * the pack is derived from.
 */
export interface PackManifest {
  format: "cesium-chebyshev-pack/1";
  /** NAIF source file name, e.g. "de440.bsp". */
  source: string;
  sourceSha256: string;
  /** Excerpted span, ISO 8601 `[from, to]`. */
  span: [string, string];
  /** Statement that the pack is derived from the source (naming it). */
  derivedFrom: string;
  segments: PackSegment[];
}

export interface PackSegmentInput {
  segment: Type2Segment;
  name: string;
  frame: PackSegment["frame"];
  kind: PackSegment["kind"];
  /** Requested span, TDB s past J2000. */
  start: number;
  end: number;
}

const MAGIC = "CPK1";
const FORMAT = "cesium-chebyshev-pack/1";
const HEADER = 8;

/**
 * Write a pack: "CPK1", u32 little-endian manifest byte length, the manifest
 * JSON (UTF-8), zero padding to an 8-byte boundary, then little-endian float64
 * records. Only the records overlapping each `[start, end]` are copied, with
 * the source's record boundaries (a boundary instant includes the later
 * record, matching `chebyshev`).
 */
export function writePack(
  manifest: Omit<PackManifest, "segments">,
  segments: PackSegmentInput[],
): Uint8Array {
  const chunks: Float64Array[] = [];
  const packed: PackSegment[] = [];
  let offset = 0;
  for (const { segment: s, name, frame, kind, start, end } of segments) {
    if (end < s.start || start > s.end) {
      throw new Error(`pack: segment "${name}" does not overlap [start, end]`);
    }
    const clamp = (i: number): number => Math.min(Math.max(i, 0), s.count - 1);
    const first = clamp(Math.floor((start - s.init) / s.intervalLength));
    const last = clamp(Math.floor((end - s.init) / s.intervalLength));
    const count = last - first + 1;
    const records = s.coefficients();
    chunks.push(records.slice(first * s.recordSize, (last + 1) * s.recordSize));
    packed.push({
      name,
      target: s.target,
      center: s.center,
      frame,
      kind,
      start: Math.max(start, s.start),
      end: Math.min(end, s.end),
      init: s.init + first * s.intervalLength,
      intervalLength: s.intervalLength,
      recordSize: s.recordSize,
      count,
      offset,
    });
    offset += count * s.recordSize;
  }

  const json = new TextEncoder().encode(
    JSON.stringify({ ...manifest, segments: packed }),
  );
  const dataStart = Math.ceil((HEADER + json.length) / 8) * 8;
  const out = new Uint8Array(dataStart + offset * 8);
  const view = new DataView(out.buffer);
  for (let i = 0; i < MAGIC.length; i++) {
    out[i] = MAGIC.charCodeAt(i);
  }
  view.setUint32(4, json.length, true);
  out.set(json, HEADER);
  let at = dataStart;
  for (const chunk of chunks) {
    for (let i = 0; i < chunk.length; i++, at += 8) {
      view.setFloat64(at, chunk[i]!, true);
    }
  }
  return out;
}

const isCount = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= 0;

/** Throws `pack: bad segment "<name>": <why>` unless `s` lies inside `available` doubles. */
function checkSegment(s: PackSegment, available: number): void {
  const bad = (why: string): never => {
    throw new Error(`pack: bad segment "${String(s?.name)}": ${why}`);
  };
  if (typeof s !== "object" || s === null) {
    bad("not an object");
  }
  if (!isCount(s.offset)) {
    bad(`offset ${s.offset} is not a non-negative integer`);
  }
  if (!isCount(s.count)) {
    bad(`count ${s.count} is not a non-negative integer`);
  }
  if (
    !isCount(s.recordSize) ||
    s.recordSize < 5 ||
    (s.recordSize - 2) % 3 !== 0
  ) {
    bad(`recordSize ${s.recordSize} is not 2 + 3 * (coefficients per axis)`);
  }
  if (!(s.intervalLength > 0) || !Number.isFinite(s.intervalLength)) {
    bad(`intervalLength ${s.intervalLength} is not positive`);
  }
  if (!(s.start <= s.end)) {
    bad(`start ${s.start} is after end ${s.end}`);
  }
  if (s.offset + s.count * s.recordSize > available) {
    bad("its records run past the end of the pack (truncated?)");
  }
}

/**
 * Read a pack. `data` is a `Float64Array` view onto `bytes`, not a copy, and
 * segment `offset`s index into it. The records start at an 8-byte boundary
 * counted from the first byte of the file, so the view is aligned when `bytes`
 * holds the file from its first byte (an `ArrayBuffer` always does). The
 * records are little-endian and viewed in host order, so a little-endian host
 * is assumed.
 */
export function readPack(bytes: ArrayBuffer): {
  manifest: PackManifest;
  data: Float64Array;
} {
  const raw = new Uint8Array(bytes);
  if (
    raw.length < HEADER ||
    String.fromCharCode(raw[0]!, raw[1]!, raw[2]!, raw[3]!) !== MAGIC
  ) {
    throw new Error("pack: not a Chebyshev pack");
  }
  const length = new DataView(bytes).getUint32(4, true);
  if (HEADER + length > raw.length) {
    throw new Error("pack: truncated");
  }
  const manifest = JSON.parse(
    new TextDecoder().decode(raw.subarray(HEADER, HEADER + length)),
  ) as PackManifest;
  if (manifest.format !== FORMAT) {
    throw new Error(`pack: unsupported format "${String(manifest.format)}"`);
  }
  if (!Array.isArray(manifest.segments)) {
    throw new Error('pack: bad manifest: "segments" is not an array');
  }
  const dataStart = Math.ceil((HEADER + length) / 8) * 8;
  const available = Math.floor(Math.max(0, raw.length - dataStart) / 8);
  let doubles = 0;
  for (const s of manifest.segments) {
    checkSegment(s, available);
    doubles = Math.max(doubles, s.offset + s.count * s.recordSize);
  }
  if (dataStart + doubles * 8 > raw.length) {
    throw new Error("pack: truncated");
  }
  return { manifest, data: new Float64Array(bytes, dataStart, doubles) };
}
