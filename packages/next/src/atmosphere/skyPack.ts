/**
 * The sky data pack: a folder of a manifest, a point file and a background
 * file. The engine knows nothing of where the data came from; the manifest
 * lists its sources, credits and whether it may be distributed. A pack
 * built on a developer's machine says `distributable: false`, and builds
 * refuse to emit it (scripts/vitePluginSkyPack.ts).
 *
 * No GPU types here: the format, its checks, and the read-out into a
 * `StarField` (atmosphere/stars.ts), which runs in a worker.
 *
 * Point file: a 32-byte header (`CSKYPTS1`, count u32, floats per star u32,
 * zeros), then little-endian float32, `STAR_FLOATS` per star, brightest
 * first. Background file: `CSKYBG01`, size u32, faces u32 (6), levels u32,
 * zeros, then half floats, rgba, by face and then by level. The faces are
 * the star map's (+x, −x, +y, −y, +z, −z, rows down the image), linear
 * sRGB, cd/m².
 */
import { STAR_FLOATS, type StarField } from "./stars.ts";

export const POINTS_MAGIC = "CSKYPTS1";
export const BACKGROUND_MAGIC = "CSKYBG01";
const HEADER_BYTES = 32;

/** The most stars a pack may hold. */
export const MAX_PACK_STARS = 4_000_000;
/** The largest background face, texels across. */
export const MAX_BACKGROUND_SIZE = 4096;

/** A pack that is wrong: the file and the field are in the message. */
export class SkyPackError extends Error {
  readonly file: string;
  readonly field: string;
  constructor(file: string, field: string, detail: string) {
    super(`sky pack ${file}, ${field}: ${detail}`);
    this.name = "SkyPackError";
    this.file = file;
    this.field = field;
  }
}

export interface SkyPackManifest {
  format: 1;
  name: string;
  /** False unless a person cleared it. */
  distributable: boolean;
  clearance?: { by: string; date: string; note: string };
  sources: ReadonlyArray<{
    name: string;
    url: string;
    credit: string;
    /** What its page says, with the date read. */
    terms: string;
  }>;
  /** Shown by the Viewer, as text. */
  credits: readonly string[];
  /** What is modelled rather than measured. */
  modelled: readonly string[];
  points: { file: string; count: number; floatsPerStar: 8 };
  background: {
    file: string;
    size: number;
    levels: number;
    /** cd/m². */
    meanLuminance: number;
    holdsFaintStars: boolean;
  };
  calibration?: Record<string, number>;
}

const MANIFEST = "manifest.json";

function record(value: unknown, file: string, field: string) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new SkyPackError(file, field, "expected an object");
  }
  return value as Record<string, unknown>;
}

function text(o: Record<string, unknown>, key: string, path: string): string {
  const v = o[key];
  if (typeof v !== "string") {
    throw new SkyPackError(MANIFEST, `${path}${key}`, "expected a string");
  }
  return v;
}

function strings(o: Record<string, unknown>, key: string): string[] {
  const v = o[key];
  if (!Array.isArray(v) || v.some((s) => typeof s !== "string")) {
    throw new SkyPackError(MANIFEST, key, "expected a list of strings");
  }
  return v as string[];
}

/** A file named in a manifest: a plain name, never a path. */
function fileName(o: Record<string, unknown>, path: string): string {
  const name = text(o, "file", path);
  if (!/^[A-Za-z0-9_][A-Za-z0-9_.-]*$/.test(name) || name.includes("..")) {
    throw new SkyPackError(
      MANIFEST,
      `${path}file`,
      "expected a plain file name",
    );
  }
  return name;
}

function count(
  o: Record<string, unknown>,
  key: string,
  path: string,
  max: number,
): number {
  const v = o[key];
  if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > max) {
    throw new SkyPackError(
      MANIFEST,
      `${path}${key}`,
      `expected a whole number from 0 to ${max}`,
    );
  }
  return v;
}

/**
 * Reads a manifest. A missing or non-boolean `distributable` reads as false
 * (a note is added to `notes`); anything else wrong throws a
 * `SkyPackError` naming the field.
 */
export function parseManifest(
  json: unknown,
  notes: string[] = [],
): SkyPackManifest {
  const o = record(json, MANIFEST, "(root)");
  if (o.format !== 1) {
    throw new SkyPackError(MANIFEST, "format", "expected 1");
  }
  const name = text(o, "name", "");
  let distributable = false;
  if (typeof o.distributable === "boolean") {
    distributable = o.distributable;
  } else {
    notes.push(
      `${MANIFEST}, distributable: missing or not a boolean, read as false`,
    );
  }
  let clearance: SkyPackManifest["clearance"];
  if (o.clearance !== undefined) {
    const c = record(o.clearance, MANIFEST, "clearance");
    clearance = {
      by: text(c, "by", "clearance."),
      date: text(c, "date", "clearance."),
      note: text(c, "note", "clearance."),
    };
  }
  if (!Array.isArray(o.sources)) {
    throw new SkyPackError(MANIFEST, "sources", "expected a list");
  }
  const sources = o.sources.map((s, i) => {
    const p = `sources[${i}].`;
    const r = record(s, MANIFEST, p.slice(0, -1));
    return {
      name: text(r, "name", p),
      url: text(r, "url", p),
      credit: text(r, "credit", p),
      terms: text(r, "terms", p),
    };
  });
  const points = record(o.points, MANIFEST, "points");
  const starCount = count(points, "count", "points.", MAX_PACK_STARS);
  if (points.floatsPerStar !== STAR_FLOATS) {
    throw new SkyPackError(
      MANIFEST,
      "points.floatsPerStar",
      `expected ${STAR_FLOATS}`,
    );
  }
  const bg = record(o.background, MANIFEST, "background");
  const size = count(bg, "size", "background.", MAX_BACKGROUND_SIZE);
  if (size < 1 || (size & (size - 1)) !== 0) {
    throw new SkyPackError(
      MANIFEST,
      "background.size",
      `${size} is not a power of two up to ${MAX_BACKGROUND_SIZE}`,
    );
  }
  const maxLevels = Math.log2(size) + 1;
  const levels = count(bg, "levels", "background.", maxLevels);
  if (levels < 1) {
    throw new SkyPackError(
      MANIFEST,
      "background.levels",
      "expected at least 1",
    );
  }
  const mean = bg.meanLuminance;
  if (typeof mean !== "number" || !Number.isFinite(mean) || mean < 0) {
    throw new SkyPackError(
      MANIFEST,
      "background.meanLuminance",
      "expected a number of at least 0",
    );
  }
  if (typeof bg.holdsFaintStars !== "boolean") {
    throw new SkyPackError(
      MANIFEST,
      "background.holdsFaintStars",
      "expected a boolean",
    );
  }
  let calibration: Record<string, number> | undefined;
  if (o.calibration !== undefined) {
    const c = record(o.calibration, MANIFEST, "calibration");
    calibration = {};
    for (const [k, v] of Object.entries(c)) {
      if (typeof v !== "number" || !Number.isFinite(v)) {
        throw new SkyPackError(
          MANIFEST,
          `calibration.${k}`,
          "expected a number",
        );
      }
      calibration[k] = v;
    }
  }
  return {
    format: 1,
    name,
    distributable,
    ...(clearance ? { clearance } : {}),
    sources,
    credits: strings(o, "credits"),
    modelled: strings(o, "modelled"),
    points: {
      file: fileName(points, "points."),
      count: starCount,
      floatsPerStar: STAR_FLOATS,
    },
    background: {
      file: fileName(bg, "background."),
      size,
      levels,
      meanLuminance: mean,
      holdsFaintStars: bg.holdsFaintStars,
    },
    ...(calibration ? { calibration } : {}),
  };
}

function hasMagic(bytes: Uint8Array, magic: string): boolean {
  if (bytes.length < magic.length) {
    return false;
  }
  for (let i = 0; i < magic.length; i++) {
    if (bytes[i] !== magic.charCodeAt(i)) {
      return false;
    }
  }
  return true;
}

/** Whether `bytes` start as a pack's point file or background file. */
export function isPackBinary(bytes: Uint8Array): boolean {
  return hasMagic(bytes, POINTS_MAGIC) || hasMagic(bytes, BACKGROUND_MAGIC);
}

/** The stars of a point file: checked for its header, length and values. */
export function readPoints(
  bytes: ArrayBuffer,
  manifest: SkyPackManifest,
): Float32Array {
  const file = manifest.points.file;
  if (bytes.byteLength < HEADER_BYTES) {
    throw new SkyPackError(
      file,
      "header",
      "the file is shorter than its header",
    );
  }
  if (!hasMagic(new Uint8Array(bytes, 0, 8), POINTS_MAGIC)) {
    throw new SkyPackError(file, "magic", `expected ${POINTS_MAGIC}`);
  }
  const header = new DataView(bytes);
  const n = header.getUint32(8, true);
  if (n !== manifest.points.count) {
    throw new SkyPackError(
      file,
      "count",
      `the file holds ${n} stars, the manifest ${manifest.points.count}`,
    );
  }
  if (header.getUint32(12, true) !== STAR_FLOATS) {
    throw new SkyPackError(file, "floatsPerStar", `expected ${STAR_FLOATS}`);
  }
  const expected = HEADER_BYTES + n * STAR_FLOATS * 4;
  if (bytes.byteLength !== expected) {
    throw new SkyPackError(
      file,
      "length",
      `${bytes.byteLength} bytes, expected ${expected}`,
    );
  }
  // Copied out of the file's buffer: its offset isn't 4-aligned in a view
  // over a transferred body, and the header stays out of the points.
  const points = new Float32Array(n * STAR_FLOATS);
  const view = new DataView(bytes, HEADER_BYTES);
  for (let i = 0; i < points.length; i++) {
    const v = view.getFloat32(i * 4, true);
    if (!Number.isFinite(v)) {
      throw new SkyPackError(
        file,
        "points",
        `star ${Math.floor(i / STAR_FLOATS)} holds a value that is not finite`,
      );
    }
    points[i] = v;
  }
  return points;
}

/** A half-precision float's bits as a number; NaN for infinity and NaN. */
function halfToFloat(bits: number): number {
  const exponent = (bits >> 10) & 0x1f;
  const mantissa = bits & 0x3ff;
  if (exponent === 31) {
    return Number.NaN;
  }
  const sign = bits & 0x8000 ? -1 : 1;
  if (exponent === 0) {
    return sign * mantissa * 2 ** -24;
  }
  return sign * (1 + mantissa / 1024) * 2 ** (exponent - 15);
}

/** Texels of one background level, by the level's size. */
function levelSize(size: number, level: number): number {
  return Math.max(1, size >> level);
}

/** The bytes a background file of this size and level count holds. */
export function backgroundBytes(size: number, levels: number): number {
  let texels = 0;
  for (let l = 0; l < levels; l++) {
    texels += levelSize(size, l) ** 2;
  }
  return HEADER_BYTES + 6 * texels * 4 * 2;
}

/** The background: by face, then by level, rgba float32 (from half floats). */
export function readBackground(
  bytes: ArrayBuffer,
  manifest: SkyPackManifest,
): Float32Array[][] {
  const file = manifest.background.file;
  const { size, levels } = manifest.background;
  if (bytes.byteLength < HEADER_BYTES) {
    throw new SkyPackError(
      file,
      "header",
      "the file is shorter than its header",
    );
  }
  if (!hasMagic(new Uint8Array(bytes, 0, 8), BACKGROUND_MAGIC)) {
    throw new SkyPackError(file, "magic", `expected ${BACKGROUND_MAGIC}`);
  }
  const header = new DataView(bytes);
  if (
    header.getUint32(8, true) !== size ||
    header.getUint32(12, true) !== 6 ||
    header.getUint32(16, true) !== levels
  ) {
    throw new SkyPackError(
      file,
      "header",
      "size, faces or levels differ from the manifest's",
    );
  }
  const expected = backgroundBytes(size, levels);
  if (bytes.byteLength !== expected) {
    throw new SkyPackError(
      file,
      "length",
      `${bytes.byteLength} bytes, expected ${expected}`,
    );
  }
  const data = new DataView(bytes);
  let at = HEADER_BYTES;
  const faces: Float32Array[][] = [];
  for (let f = 0; f < 6; f++) {
    const face: Float32Array[] = [];
    for (let l = 0; l < levels; l++) {
      const n = levelSize(size, l) ** 2 * 4;
      const level = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const v = halfToFloat(data.getUint16(at, true));
        if (!Number.isFinite(v)) {
          throw new SkyPackError(
            file,
            "texels",
            `face ${f} level ${l} holds a value that is not finite at ${i}`,
          );
        }
        level[i] = v;
        at += 2;
      }
      face.push(level);
    }
    faces.push(face);
  }
  return faces;
}

/** What `loadSkyPack` gives: the manifest, its notes and the field. */
export interface LoadedSkyPack {
  manifest: SkyPackManifest;
  /** What was read leniently (a missing `distributable`). */
  notes: string[];
  field: StarField;
}

/**
 * Reads a pack from its manifest's URL (or its folder's, ending in a slash).
 * A failed fetch or a bad file throws a `SkyPackError` naming the file.
 */
export async function loadSkyPack(
  url: string,
  fetcher: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<LoadedSkyPack> {
  const manifestUrl = url.endsWith("/") ? `${url}${MANIFEST}` : url;
  const get = async (target: string, file: string): Promise<Response> => {
    let response: Response;
    try {
      response = await fetcher(target, signal ? { signal } : undefined);
    } catch (error) {
      if (signal?.aborted) {
        throw error;
      }
      throw new SkyPackError(file, "fetch", "the request failed");
    }
    if (!response.ok) {
      throw new SkyPackError(file, "fetch", `status ${response.status}`);
    }
    return response;
  };
  let json: unknown;
  try {
    json = await (await get(manifestUrl, MANIFEST)).json();
  } catch (error) {
    if (error instanceof SkyPackError || signal?.aborted) {
      throw error;
    }
    throw new SkyPackError(MANIFEST, "(root)", "not valid JSON");
  }
  const notes: string[] = [];
  const manifest = parseManifest(json, notes);
  const beside = (file: string) => new URL(file, manifestUrl).href;
  const [pointBytes, backgroundBytes_] = await Promise.all([
    get(beside(manifest.points.file), manifest.points.file).then((r) =>
      r.arrayBuffer(),
    ),
    get(beside(manifest.background.file), manifest.background.file).then((r) =>
      r.arrayBuffer(),
    ),
  ]);
  const points = readPoints(pointBytes, manifest);
  const backgroundLevels = readBackground(backgroundBytes_, manifest);
  return {
    manifest,
    notes,
    field: {
      points,
      count: manifest.points.count,
      backgroundLevels,
      backgroundSize: manifest.background.size,
      holdsFaintStars: manifest.background.holdsFaintStars,
      meanBackground: manifest.background.meanLuminance,
    },
  };
}
