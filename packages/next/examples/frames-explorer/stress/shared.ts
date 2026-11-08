// Helpers the stress-test groups share: tolerances, fingerprints (R12),
// vector arithmetic and the context's data.
import { EngineeringFrame } from "../../../src/engineering/EngineeringFrame.ts";
import type {
  CrsRef,
  RecordedOperation,
} from "../../../src/engineering/crs.ts";
import type { ProjApi } from "../../../src/engineering/proj.ts";
import { Instant } from "../../../src/time/Instant.ts";
import { Trajectory } from "../../../src/trajectory/Trajectory.ts";
import { takeCitations } from "./references.ts";
import type {
  Fingerprint,
  Need,
  ResultBase,
  StoreManifest,
  StressCase,
  StressContext,
  StressResult,
} from "./runner.ts";

// The OEM's name and its Trajectory: one definition, which the page also
// loads to place Orion's dot itself (orionTrack.ts).
export { ORION_OEM, orionFromOem } from "../orionTrack.ts";

/** NAIF's DSN station SPK in the frames store (ITRF93 positions with plate motion; Task 6b). */
export const STATIONS_SPK = "earthstns_itrf93_260814.bsp";

export const DESIGN_ROUND_TRIP = 1e-4;

// m (Global Constraints)
export const ALIGNMENT_RECOVERY = 1e-9;

// design units
export const GRID_TO_GROUND = 0.01;

// m
export const SAME_DISTANCE = 1e-9;

// m
/**
 * Frame-tree compositions: 1 mm per 1e9 m of translation, and 1e-12 in
 * rotation. Read per sample as PER_METER x the largest single translation in
 * the chains compared, plus ROTATION x the largest point they rotate (the
 * rotation's lever arm), so neither term is counted twice.
 */
const PER_METER = 1e-3 / 1e9;

export const ROTATION = 1e-12;

export const compositionTolerance = (
  translations: readonly number[],
  points: readonly number[],
): number =>
  PER_METER * Math.max(...translations) + ROTATION * Math.max(...points);

/** A few float64 ulps of TT near 5e8 s (1.2e-7 s each). */
export const TT_STEP = 1e-6;

/**
 * Lengths from the same place in two frames that differ only in the axes'
 * foot: the ratio is the foot definitions' (the scale factor is the same at
 * both lines, which are about 2.0 mm apart at their far ends: 2 ppm of the
 * 3280.84 ft, about 1 km, line).
 */
export const UNIT_RATIO = 1e-9;

/** Effect sizes against their hand formula (R11). */
export const EFFECT = 0.02;

export const US_SURVEY_FOOT = 1200 / 3937;

export const INTERNATIONAL_FOOT = 0.3048;

/**
 * A grid's SHA-256 as setup's manifest records it: PROJ's own base first
 * (`proj/`, GEOID18), then the PROJ-data catalog's grids (`grids/`, Task 21).
 */
function gridSha256(manifest: StoreManifest | undefined, grid: string) {
  const sha256 = (file: string) =>
    manifest?.files.find((f) => f.file === file)?.sha256;
  return (
    sha256(`proj/${grid}`) ?? sha256(`grids/${grid}`) ?? "not in the manifest"
  );
}

export function fingerprintOf(
  ctx: StressContext,
  frame: EngineeringFrame,
  designs: readonly ArrayLike<number>[],
): Fingerprint {
  return {
    pipeline: frame.operation.pipeline,
    grids: frame.operation.grids.map((name) => ({
      name,
      sha256: gridSha256(ctx.manifest, name),
    })),
    coordinates: designs.flatMap((d) => Array.from(frame.toBodyFixed(d))),
  };
}

/**
 * A fingerprint (R12) for a recorded operation used without an engineering
 * frame: its pipeline and grids, and the case's results in metres (projected
 * coordinates, or geocentric ones for geographic results).
 */
export function operationFingerprint(
  ctx: StressContext,
  operation: RecordedOperation,
  coordinates: readonly ArrayLike<number>[],
): Fingerprint {
  return {
    pipeline: operation.pipeline,
    grids: operation.grids.map((name) => ({
      name,
      sha256: gridSha256(ctx.manifest, name),
    })),
    coordinates: coordinates.flatMap((c) => Array.from(c)),
  };
}

export const norm = (v: ArrayLike<number>): number =>
  Math.hypot(v[0]!, v[1]!, v[2]!);

export const distance = (a: ArrayLike<number>, b: ArrayLike<number>): number =>
  Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);

/** Metres between two design points of a frame (horizontal and height units apart). */
function designMeters(
  frame: EngineeringFrame,
  a: ArrayLike<number>,
  b: ArrayLike<number>,
): number {
  return Math.hypot(
    (a[0]! - b[0]!) * frame.units.metersPerUnit,
    (a[1]! - b[1]!) * frame.units.metersPerUnit,
    ((a[2] ?? 0) - (b[2] ?? 0)) * frame.metersPerHeightUnit,
  );
}

/** The worst design round trip (design to body-fixed and back) of `designs`, metres. */
export function worstRoundTrip(
  frame: EngineeringFrame,
  designs: readonly ArrayLike<number>[],
): number {
  let worst = 0;
  for (const d of designs) {
    const back = frame.fromBodyFixed(frame.toBodyFixed(d));
    worst = Math.max(worst, designMeters(frame, d, back));
  }
  return worst;
}

export const proj = (ctx: StressContext): ProjApi => {
  if (ctx.proj === undefined) {
    throw new Error("the runner did not provide PROJ");
  }
  return ctx.proj;
};

export const orion = (ctx: StressContext): Trajectory => {
  if (ctx.orion === undefined) {
    throw new Error("the runner did not provide Orion's trajectory");
  }
  return ctx.orion;
};

/** A seeded generator in [0, 1) (mulberry32), so the frame-tree points repeat. */
export function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** p' = M p for a column-major 4x4. */
export function apply(
  m: ArrayLike<number>,
  p: ArrayLike<number>,
): Float64Array {
  const x = p[0]!,
    y = p[1]!,
    z = p[2]!;
  return Float64Array.of(
    m[0]! * x + m[4]! * y + m[8]! * z + m[12]!,
    m[1]! * x + m[5]! * y + m[9]! * z + m[13]!,
    m[2]! * x + m[6]! * y + m[10]! * z + m[14]!,
  );
}

export const translationOf = (m: ArrayLike<number>): number =>
  Math.hypot(m[12]!, m[13]!, m[14]!);

/** The largest difference between the 3x3 blocks of (b · a) and c (column-major 4x4s). */
export function rotationDifference(
  b: ArrayLike<number>,
  a: ArrayLike<number>,
  c: ArrayLike<number> | "identity",
): number {
  let worst = 0;
  for (let col = 0; col < 3; col++) {
    for (let row = 0; row < 3; row++) {
      let s = 0;
      for (let k = 0; k < 3; k++) {
        s += b[k * 4 + row]! * a[col * 4 + k]!;
      }
      const expected =
        c === "identity" ? (row === col ? 1 : 0) : c[col * 4 + row]!;
      worst = Math.max(worst, Math.abs(s - expected));
    }
  }
  return worst;
}

export const utc = (ctx: StressContext, iso: string): Instant =>
  Instant.fromIso(iso, "UTC", ctx.frames.data.leapSeconds);

/**
 * A case. It claims the references.json entries cited since the last case
 * was made (`takeCitations`): the ones its maker read for it.
 */
export const stressCase = (
  id: string,
  groupId: string,
  title: string,
  needs: readonly Need[],
  run: (ctx: StressContext, base: ResultBase) => Promise<StressResult[]>,
): StressCase => {
  const cites = takeCitations();
  return {
    id,
    group: groupId,
    title,
    needs,
    ...(cites.length > 0 && { cites }),
    run: (ctx) => run(ctx, { id, group: groupId, title }),
  };
};

export const epsg = (wkid: number, vcsWkid?: number): CrsRef =>
  vcsWkid === undefined
    ? { format: "wkid", authority: "EPSG", wkid }
    : { format: "wkid", authority: "EPSG", wkid, vcsWkid };

export const SITE_ORIGIN: readonly [number, number, number] = [
  6_000_000, 2_100_000, 0,
];

export { FLYBY, MEASURED_AT } from "./epochs.ts";

export const sub3 = (a: ArrayLike<number>, b: ArrayLike<number>): number[] => [
  a[0]! - b[0]!,
  a[1]! - b[1]!,
  a[2]! - b[2]!,
];

export const dot3 = (a: ArrayLike<number>, b: ArrayLike<number>): number =>
  a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;

export const cross3 = (
  a: ArrayLike<number>,
  b: ArrayLike<number>,
): number[] => [
  a[1]! * b[2]! - a[2]! * b[1]!,
  a[2]! * b[0]! - a[0]! * b[2]!,
  a[0]! * b[1]! - a[1]! * b[0]!,
];

export const scale3 = (a: ArrayLike<number>, k: number): number[] => [
  a[0]! * k,
  a[1]! * k,
  a[2]! * k,
];

/** The angle between two vectors, radians, accurate near 0. */
export const angle3 = (a: ArrayLike<number>, b: ArrayLike<number>): number =>
  Math.atan2(norm(cross3(a, b)), dot3(a, b));

/** The rotation part of a column-major 4x4 applied to a vector. */
export function rotate(m: ArrayLike<number>, v: ArrayLike<number>): number[] {
  return [
    m[0]! * v[0]! + m[4]! * v[1]! + m[8]! * v[2]!,
    m[1]! * v[0]! + m[5]! * v[1]! + m[9]! * v[2]!,
    m[2]! * v[0]! + m[6]! * v[1]! + m[10]! * v[2]!,
  ];
}
