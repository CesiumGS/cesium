// The frames explorer's stress-test catalog (plan R2): pure cases that take the
// frame tree, PROJ and (optionally) Orion's trajectory and return plain
// results. The page runs them in a worker (R13); test/data/framesExplorer.test.ts
// runs the same catalog in Node against the frames data store and asserts that
// every case passes, so the page can never show a pass the data test doesn't.
//
// Library names are imported from their modules, not src/index.ts, because the
// index can't load under vitest (it reaches the basis transcoder). Every name
// imported here is also exported by the index (ruling F7, checked by
// test/framesExplorerRunner.test.ts), so the example stays a user of the
// public API.
//
// Results are structured-clone plain data: no class instances and no
// functions. Accuracy statements are plain objects; instants are TDB seconds
// past J2000.
import {
  crsDefinition,
  resolveOperation,
  type CrsRef,
} from "../../src/engineering/crs.ts";
import {
  EngineeringFrame,
  designPoint,
  type SiteTransform,
} from "../../src/engineering/EngineeringFrame.ts";
import {
  Alignment,
  type AlignmentDefinition,
} from "../../src/engineering/alignment.ts";
import type { ProjApi } from "../../src/engineering/proj.ts";
import { frameTransform, type Frame } from "../../src/frames/Frame.ts";
import type { Frames } from "../../src/frames/frames.ts";
import { convertPoint, framePoint } from "../../src/frames/local.ts";
import { fromDegrees } from "../../src/math/ellipsoid.ts";
import type { AccuracyStatement } from "../../src/measure/accuracy.ts";
import { measure } from "../../src/measure/measure.ts";
import { EARTH, MOON, type Body } from "../../src/scene/Body.ts";
import { Instant } from "../../src/time/Instant.ts";
import { parseOem } from "../../src/trajectory/oem.ts";
import { Trajectory } from "../../src/trajectory/Trajectory.ts";

// ---------------------------------------------------------------------------
// The runner's types

/** Data a case may need beyond the frame tree. */
export type Need = "proj" | "geoid" | "orion";

/** The audiences the Verify tab filters by (R14). */
export type Lens =
  "civil" | "bim" | "gis" | "space" | "timing" | "offshore" | "av";

export const LENSES: readonly Lens[] = [
  "civil",
  "bim",
  "gis",
  "space",
  "timing",
  "offshore",
  "av",
];

/** The frames store's manifest.json, of which fingerprints read the grids' SHA-256 (ruling F4). */
export interface StoreManifest {
  readonly files: readonly { readonly file: string; readonly sha256: string }[];
}

/**
 * What a recorded-operation case fixes, to show that the browser and Node
 * agree (R12): the PROJ pipeline, its grids with their pinned SHA-256 values
 * and the body-fixed coordinates (metres) of the case's points.
 */
export interface Fingerprint {
  readonly pipeline: string;
  readonly grids: readonly { readonly name: string; readonly sha256: string }[];
  readonly coordinates: readonly number[];
}

/** One row of the Verify tab: plain data (R13). */
export interface StressResult {
  /** Unique across the catalog: the case's id, or the case's id and a suffix. */
  id: string;
  /** The `StressGroup.id` it belongs to. */
  group: string;
  /** What is checked and against what, in words. */
  title: string;
  /** The runner's verdict: the case's own, and every check below. */
  pass: boolean;
  /** The measured deviation from the expected value; passes when |value| <= tolerance. */
  value?: number;
  tolerance?: number;
  unit?: string;
  /** The source of the pattern (declared through `expectThrow`, no flags) the case expects an error to match (R7). */
  expectedError?: string;
  /** The message of what was thrown, expected or not. */
  error?: string;
  /** What the computation claims to know (R8), as plain objects. */
  accuracy?: AccuracyStatement;
  detail?: string;
  /** A size to show apart from pass or fail (R11). */
  effect?: { value: number; unit: string; label: string };
  fingerprint?: Fingerprint;
  /** Set when the run compared `fingerprint` against a recorded one (R12). */
  fingerprintCheck?: { match: boolean; difference?: string };
  /** For a skipped case: the data that couldn't be had. */
  missing?: readonly Need[];
  /** The instant the result is for, TDB seconds past J2000. */
  instant?: number;
}

export interface StressContext {
  readonly frames: Frames;
  /** PROJ, when the caller already has it; otherwise `loadProj` is called once, when a case needs it. */
  proj?: ProjApi;
  /** Orion's trajectory, when already loaded; otherwise `loadOrion` is called once, when a case needs it. */
  orion?: Trajectory;
  loadProj(): Promise<ProjApi>;
  loadOrion(): Promise<Trajectory>;
  /**
   * Makes GEOID18 available to `loadProj`'s PROJ (the browser fetches the
   * grid). Absent when PROJ already finds it (Node reads the grids beside
   * proj.db). The runner then checks that NAVD88 heights resolve through it.
   */
  loadGeoid?(): Promise<void>;
  /** The frames store's manifest, for the fingerprints' grid SHA-256 values. */
  readonly manifest?: StoreManifest;
}

export interface StressCase {
  readonly id: string;
  readonly group: string;
  readonly title: string;
  readonly needs: readonly Need[];
  run(ctx: StressContext): Promise<StressResult[]>;
}

/** A question card (R14). */
export interface StressGroup {
  readonly id: string;
  /** The group's short name, as the plan and the lens table call it. */
  readonly name: string;
  /** The card's title: the question the group answers, in plain language. */
  readonly question: string;
  readonly lenses: readonly Lens[];
  /** The answer line for the card, from the group's results. */
  headline(results: readonly StressResult[]): string | undefined;
  /** What "Show on globe" turns to. */
  readonly focus?: {
    readonly frames: readonly string[];
    readonly overlay?: string;
    readonly site?: string;
  };
  /** A virtual group's membership (Reproducibility); others hold their own cases' results. */
  readonly collects?: (result: StressResult) => boolean;
}

// ---------------------------------------------------------------------------
// Judging results

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** A number with `digits` significant figures, without trailing zeros. */
const fmt = (x: number, digits = 3): string =>
  Number.isFinite(x) ? String(Number(x.toPrecision(digits))) : String(x);

/** An effect's size for display, apart from any verdict (R11). */
export function formatEffect(effect: NonNullable<StressResult["effect"]>) {
  return `${fmt(effect.value, 7)} ${effect.unit}: ${effect.label}`;
}

/** A plain copy of an accuracy statement (R8, R13). */
function plainAccuracy(a: AccuracyStatement): AccuracyStatement {
  return {
    meters: a.meters,
    terms: a.terms.map((t) => ({
      source: t.source,
      meters: t.meters,
      note: t.note,
    })),
    warnings: [...a.warnings],
  };
}

type ResultBase = Pick<StressResult, "id" | "group" | "title">;

/** expectThrow's patterns by source, which the runner matches errors with (R7). */
const DECLARED_PATTERNS = new Map<string, RegExp>();

/**
 * Runs `fn` expecting it to throw an error whose message matches `pattern`
 * (R7). The runner judges the result: it passes only if something was thrown
 * and the message matches. The pattern is declared here, and the runner
 * matches with it (in the same module: the worker judges before results are
 * posted), so an `expectedError` that no expectThrow declared fails.
 */
export async function expectThrow(
  base: ResultBase,
  pattern: RegExp,
  fn: () => unknown,
): Promise<StressResult> {
  if (pattern.flags !== "") {
    throw new RangeError(
      `expectThrow: /${pattern.source}/${pattern.flags}: patterns cross to the page as their source, so flags are not supported`,
    );
  }
  DECLARED_PATTERNS.set(pattern.source, pattern);
  try {
    await fn();
    return { ...base, pass: true, expectedError: pattern.source };
  } catch (error) {
    return {
      ...base,
      pass: true,
      expectedError: pattern.source,
      error: messageOf(error),
    };
  }
}

const COORDINATE_LIMIT = 1e-9;

/**
 * The difference between a recorded fingerprint and this run's, or undefined
 * when they agree: the pipeline and grids exactly, the coordinates within
 * 1e-9 m (R12).
 */
export function compareFingerprint(
  expected: Fingerprint,
  actual: Fingerprint,
): string | undefined {
  if (expected.pipeline !== actual.pipeline) {
    return `the pipeline differs: expected "${expected.pipeline}", got "${actual.pipeline}"`;
  }
  const grids = (f: Fingerprint) =>
    f.grids.map((g) => `${g.name} ${g.sha256}`).join(", ");
  if (grids(expected) !== grids(actual)) {
    return `the grids differ: expected [${grids(expected)}], got [${grids(actual)}]`;
  }
  if (expected.coordinates.length !== actual.coordinates.length) {
    return `the coordinate count differs: expected ${expected.coordinates.length}, got ${actual.coordinates.length}`;
  }
  let worst = 0;
  for (let i = 0; i < expected.coordinates.length; i++) {
    const d = Math.abs(expected.coordinates[i]! - actual.coordinates[i]!);
    worst = Number.isNaN(d) ? Infinity : Math.max(worst, d);
  }
  return worst > COORDINATE_LIMIT
    ? `the coordinates differ by up to ${fmt(worst)} m (limit ${COORDINATE_LIMIT} m)`
    : undefined;
}

/** The runner's verdict on a case's result: every check, not the case's word alone. */
function judge(
  result: StressResult,
  recorded: Readonly<Record<string, Fingerprint>> | undefined,
): StressResult {
  const reasons: string[] = [];
  let pass = result.pass === true;
  if (result.expectedError !== undefined) {
    if (result.error === undefined) {
      pass = false;
      reasons.push(
        `expected an error matching /${result.expectedError}/, but nothing was thrown`,
      );
    } else {
      // Only patterns the catalog declared through expectThrow: a result's
      // field is never compiled into a RegExp.
      const pattern = DECLARED_PATTERNS.get(result.expectedError);
      if (pattern === undefined) {
        pass = false;
        reasons.push(
          `the pattern /${result.expectedError}/ was not declared through expectThrow`,
        );
      } else if (!pattern.test(result.error)) {
        pass = false;
        reasons.push(
          `threw a different error than /${result.expectedError}/ expects`,
        );
      }
    }
  } else if (result.error !== undefined) {
    pass = false;
  }
  if (result.tolerance !== undefined) {
    const value = result.value;
    if (value === undefined || !Number.isFinite(value)) {
      pass = false;
      reasons.push("there is no finite value to compare with its tolerance");
    } else if (!(Math.abs(value) <= result.tolerance)) {
      pass = false;
      reasons.push(
        `${fmt(value)} is beyond its tolerance ${fmt(result.tolerance)}`,
      );
    }
  }
  let fingerprintCheck: StressResult["fingerprintCheck"];
  if (result.fingerprint !== undefined && recorded !== undefined) {
    const expected = recorded[result.id];
    const difference =
      expected === undefined
        ? "no recorded fingerprint (run the data test with FRAMES_EXPLORER_UPDATE=1)"
        : compareFingerprint(expected, result.fingerprint);
    fingerprintCheck =
      difference === undefined ? { match: true } : { match: false, difference };
    if (difference !== undefined) {
      pass = false;
      reasons.push(`fingerprint: ${difference}`);
    }
  }
  const detail = [result.detail, ...reasons]
    .filter((s) => s !== undefined && s !== "")
    .join("; ");
  return {
    ...result,
    pass,
    ...(detail !== "" && { detail }),
    ...(fingerprintCheck && { fingerprintCheck }),
  };
}

// ---------------------------------------------------------------------------
// Running

const GEOID = "us_noaa_g2018u0.tif";
/** NAD83(2011) / California zone 3 (ftUS) + NAVD88 height (ftUS). */
const CALIFORNIA: CrsRef = {
  format: "wkid",
  authority: "EPSG",
  wkid: 6420,
  vcsWkid: 6360,
};

type Loaded<T> = { value: T } | { error: string };

const settle = <T>(promise: Promise<T>): Promise<Loaded<T>> =>
  promise.then(
    (value) => ({ value }),
    (error: unknown) => ({ error: messageOf(error) }),
  );

/** Loads each need at most once per run. */
class Needs {
  private proj?: Promise<Loaded<ProjApi>>;
  private geoid?: Promise<Loaded<true>>;
  private orion?: Promise<Loaded<Trajectory>>;
  private readonly ctx: StressContext;

  constructor(ctx: StressContext) {
    this.ctx = ctx;
  }

  loadProj(): Promise<Loaded<ProjApi>> {
    const { ctx } = this;
    this.proj ??= settle(
      ctx.proj !== undefined ? Promise.resolve(ctx.proj) : ctx.loadProj(),
    );
    return this.proj;
  }

  loadGeoid(proj: ProjApi): Promise<Loaded<true>> {
    this.geoid ??= settle(
      (async () => {
        await this.ctx.loadGeoid?.();
        // NAVD88 heights resolve through GEOID18 only if PROJ has the grid.
        const operation = resolveOperation(proj, CALIFORNIA, "EPSG:4979");
        if (!operation.grids.includes(GEOID)) {
          throw new Error(
            `PROJ's NAVD88 operation reads ${operation.grids.join(", ") || "no grid"}, not ${GEOID}`,
          );
        }
        return true as const;
      })(),
    );
    return this.geoid;
  }

  loadOrion(): Promise<Loaded<Trajectory>> {
    const { ctx } = this;
    this.orion ??= settle(
      ctx.orion !== undefined ? Promise.resolve(ctx.orion) : ctx.loadOrion(),
    );
    return this.orion;
  }

  /** The context for a case, or what is missing and why. */
  async meet(
    needs: readonly Need[],
  ): Promise<{ ctx: StressContext } | { missing: Need[]; reasons: string[] }> {
    const missing: Need[] = [];
    const reasons: string[] = [];
    let proj: ProjApi | undefined;
    let orion: Trajectory | undefined;
    if (needs.includes("proj") || needs.includes("geoid")) {
      const loaded = await this.loadProj();
      if ("error" in loaded) {
        if (needs.includes("proj")) {
          missing.push("proj");
        }
        if (needs.includes("geoid")) {
          missing.push("geoid");
        }
        reasons.push(
          `Needs PROJ, which did not load (${loaded.error}). Run \`npm run setup\` and restart the dev server.`,
        );
      } else {
        proj = loaded.value;
        if (needs.includes("geoid")) {
          const geoid = await this.loadGeoid(proj);
          if ("error" in geoid) {
            missing.push("geoid");
            reasons.push(
              `Needs GEOID18 (${GEOID}), which is not available (${geoid.error}). Run \`npm run setup\`.`,
            );
          }
        }
      }
    }
    if (needs.includes("orion")) {
      const loaded = await this.loadOrion();
      if ("error" in loaded) {
        missing.push("orion");
        reasons.push(
          `Needs the Artemis II trajectory (${ORION_OEM}), which did not load (${loaded.error}). Run \`npm run setup\`.`,
        );
      } else {
        orion = loaded.value;
      }
    }
    if (missing.length > 0) {
      return { missing, reasons };
    }
    const { ctx } = this;
    return {
      ctx: {
        frames: ctx.frames,
        proj: proj ?? ctx.proj,
        orion: orion ?? ctx.orion,
        loadProj: () => ctx.loadProj(),
        loadOrion: () => ctx.loadOrion(),
        ...(ctx.loadGeoid && { loadGeoid: () => ctx.loadGeoid!() }),
        ...(ctx.manifest && { manifest: ctx.manifest }),
      },
    };
  }
}

export interface RunOptions {
  /** Stops before the next case once aborted; the run resolves with what it has. */
  readonly signal?: AbortSignal;
  /** Called once per result, as it is judged. */
  readonly onResult?: (result: StressResult) => void;
  /** Only the cases with these ids. */
  readonly ids?: readonly string[];
  /** The cases to run (default `STRESS_CASES`). */
  readonly cases?: readonly StressCase[];
  /**
   * Recorded fingerprints by result id (fingerprints.json). When given, every
   * fingerprinted result is compared with its record, and a mismatch or a
   * missing record fails it (R12).
   */
  readonly fingerprints?: Readonly<Record<string, Fingerprint>>;
}

/**
 * Runs the catalog's cases in order and judges each result: the case's own
 * verdict, its value against its tolerance, its expected error (R7) and its
 * fingerprint (R12). A case whose needs can't be met gives one skipped result
 * (pass false, `missing`, and a `detail` saying what to do); a case that
 * throws gives a failed result with the error. It never rejects for a case.
 */
export async function runStress(
  ctx: StressContext,
  options: RunOptions = {},
): Promise<StressResult[]> {
  const { signal, onResult, ids, cases = STRESS_CASES, fingerprints } = options;
  const wanted = ids === undefined ? undefined : new Set(ids);
  const needs = new Needs(ctx);
  const results: StressResult[] = [];
  for (const c of cases) {
    if (signal?.aborted) {
      break;
    }
    if (wanted !== undefined && !wanted.has(c.id)) {
      continue;
    }
    const met = await needs.meet(c.needs);
    if (signal?.aborted) {
      break;
    }
    let produced: StressResult[];
    if ("missing" in met) {
      produced = [
        {
          id: c.id,
          group: c.group,
          title: c.title,
          pass: false,
          missing: met.missing,
          detail: met.reasons.join(" "),
        },
      ];
    } else {
      try {
        produced = await c.run(met.ctx);
      } catch (error) {
        produced = [
          {
            id: c.id,
            group: c.group,
            title: c.title,
            pass: false,
            error: messageOf(error),
          },
        ];
      }
    }
    for (const raw of produced) {
      const judged = judge(raw, fingerprints);
      results.push(judged);
      onResult?.(judged);
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Groups (R14)

/** "n of m pass", then the first effect, else the worst value against its tolerance. */
function standardHeadline(results: readonly StressResult[]) {
  if (results.length === 0) {
    return undefined;
  }
  const passed = results.filter((r) => r.pass).length;
  const count = `${passed} of ${results.length} pass`;
  const effect = results.find((r) => r.effect !== undefined)?.effect;
  if (effect !== undefined) {
    return `${count}; ${formatEffect(effect)}`;
  }
  let worst: StressResult | undefined;
  let ratio = -1;
  for (const r of results) {
    if (r.value !== undefined && r.tolerance !== undefined && r.tolerance > 0) {
      const q = Math.abs(r.value) / r.tolerance;
      if (q > ratio) {
        ratio = q;
        worst = r;
      }
    }
  }
  return worst === undefined
    ? count
    : `${count}; worst ${fmt(worst.value!)} ${worst.unit ?? ""} against ${fmt(worst.tolerance!)}`.trimEnd();
}

function reproducibilityHeadline(results: readonly StressResult[]) {
  if (results.length === 0) {
    return undefined;
  }
  const compared = results.filter((r) => r.fingerprintCheck !== undefined);
  if (compared.length === 0) {
    return `${results.length} fingerprinted results, not compared`;
  }
  const matched = compared.filter((r) => r.fingerprintCheck!.match).length;
  return `${matched} of ${compared.length} fingerprints match Node's`;
}

const group = (
  id: string,
  name: string,
  question: string,
  lenses: readonly Lens[],
  extra: Partial<Pick<StressGroup, "focus" | "collects" | "headline">> = {},
): StressGroup => ({
  id,
  name,
  question,
  lenses,
  headline: standardHeadline,
  ...extra,
});

const EARTH_FRAMES = ["ICRF", "GCRF", "ITRF"];
const ALL_FRAMES = [
  "ICRF",
  "HCRS",
  "GCRF",
  "EARTH_ICRF",
  "EME2000",
  "ITRF",
  "MOON_ICRF",
  "MOON_ME",
  "MOON_PA",
];

/**
 * Every question card, in the order the Verify tab lists them. The groups
 * marked "1b" and "1c" get their cases from later tasks.
 */
export const STRESS_GROUPS: readonly StressGroup[] = [
  group(
    "projections",
    "Projections",
    "Do design coordinates survive the trip to the globe and back?",
    ["gis", "offshore"],
    { focus: { frames: ["ITRF"], overlay: "designGrid" } },
  ),
  group(
    "units",
    "Units",
    "Does the library tell US survey feet from international feet?",
    ["civil", "bim"],
    { focus: { frames: ["ITRF"], site: "california" } },
  ),
  group(
    "site-grids",
    "Site grids",
    "Do rotated and scaled site grids land where they should?",
    ["civil", "bim"],
    { focus: { frames: ["ITRF"], overlay: "designGrid", site: "california" } },
  ),
  group(
    "recorded-operations",
    "Recorded operations",
    "Is the datum operation fixed, with its grids accounted for?",
    ["bim", "offshore"],
    { focus: { frames: ["ITRF"], site: "california" } },
  ),
  group(
    "frame-tree",
    "Frame tree",
    "Do the frames agree with each other however you go between them?",
    ["space"],
    { focus: { frames: ALL_FRAMES } },
  ),
  group(
    "time",
    "Time",
    "Is time continuous through leap seconds, and honest at the tables' ends?",
    ["space", "timing"],
    { focus: { frames: EARTH_FRAMES } },
  ),
  group(
    "trajectory",
    "Trajectory",
    "Is Orion's path used only where there is data?",
    ["space"],
    {
      focus: {
        frames: ["EME2000", "MOON_ME"],
        overlay: "trajectoryPath",
      },
    },
  ),
  group(
    "measurement",
    "Measurement",
    "Do design measurements agree with distances on the ground?",
    ["civil"],
    { focus: { frames: ["ITRF"], overlay: "designGrid", site: "california" } },
  ),
  // 1b: the new groups.
  group(
    "reference-values",
    "Reference values",
    "Do results match published survey and geodesy values?",
    ["civil"],
  ),
  group(
    "vertical-profile",
    "Vertical profile",
    "Are vertical curves computed as the design manuals do?",
    ["civil"],
  ),
  group(
    "distortion",
    "Distortion",
    "How much does a projection stretch distances?",
    ["civil", "gis"],
  ),
  group(
    "rigid-placement-budget",
    "Rigid placement budget",
    "How big can a site be before rigid placement is off?",
    ["civil", "bim"],
  ),
  group(
    "coordinate-epoch",
    "Coordinate epoch",
    "How far do coordinates move between epochs?",
    ["gis", "av"],
  ),
  group(
    "axes-and-the-antimeridian",
    "Axes and the antimeridian",
    "Are axis order and the 180° meridian handled?",
    ["gis"],
  ),
  group(
    "space",
    "Space",
    "Do light time, Doppler and line of sight match the references?",
    ["space"],
  ),
  // 1c: the industry groups.
  group(
    "operation-candidates",
    "Operation candidates",
    "Which datum operation was chosen, and what were the alternatives?",
    ["gis", "offshore"],
  ),
  group(
    "ifc-map-conversion",
    "IFC map conversion",
    "Does an IFC map conversion place the model correctly?",
    ["bim"],
  ),
  group(
    "plate-motion",
    "Plate motion",
    "How fast does a map go stale as the plates move?",
    ["av"],
  ),
  group(
    "below-the-ellipsoid",
    "Below the ellipsoid",
    "Do scale factors and sight lines work below the ellipsoid?",
    ["civil"],
  ),
  group(
    "heights-and-wgs84",
    "Heights and WGS84",
    "Which height, and which WGS84, is this?",
    ["civil", "gis", "av"],
  ),
  group(
    "bound-crss",
    "Bound CRSs",
    "Are exported CRSs with TOWGS84 placed by their own parameters?",
    ["bim", "gis", "offshore"],
  ),
  group(
    "time-scales",
    "Time scales",
    "Are the GPS, TAI, TT and UTC offsets exact?",
    ["timing"],
  ),
  group(
    "lunar-time",
    "Lunar time",
    "How much faster does a clock on the Moon tick?",
    ["space", "timing"],
  ),
  // Virtual: every fingerprinted result, whatever its own group.
  group(
    "reproducibility",
    "Reproducibility",
    "Does the same file land the same in browser and Node?",
    ["bim", "offshore"],
    {
      collects: (r) => r.fingerprint !== undefined,
      headline: reproducibilityHeadline,
    },
  ),
];

/** The results a group's card shows. */
export function groupResults(
  g: StressGroup,
  results: readonly StressResult[],
): StressResult[] {
  return results.filter(g.collects ?? ((r) => r.group === g.id));
}

// ---------------------------------------------------------------------------
// Shared helpers

/** The Artemis II OEM's file name in the frames store. */
export const ORION_OEM = "EM2_FODNAVBET_revF_PUBLIC.oem";

/**
 * Orion from the Artemis II OEM, with the settings the library's data tests
 * use: Hermite degree 11 (NAIF's conversion; the OEM names none) and
 * covariance in m² (the file's actual unit).
 */
export function orionFromOem(text: string, frames: Frames): Trajectory {
  return Trajectory.fromOem(parseOem(text, frames.data.leapSeconds), frames, {
    name: "orion",
    accuracy: "precise",
    interpolation: { method: "hermite", degree: 11 },
    covarianceUnits: "m",
  });
}

const DESIGN_ROUND_TRIP = 1e-4; // m (Global Constraints)
const ALIGNMENT_RECOVERY = 1e-9; // design units
const GRID_TO_GROUND = 0.01; // m
const SAME_DISTANCE = 1e-9; // m
/** Frame-tree compositions: 1 mm per 1e9 m of translation, and 1e-12 in rotation. */
const PER_METER = 1e-3 / 1e9;
const ROTATION = 1e-12;
/** A few float64 ulps of TT near 5e8 s (1.2e-7 s each). */
const TT_STEP = 1e-6;
/**
 * Lengths from the same place in two frames that differ only in the axes'
 * foot: the ratio is the foot definitions' (the scale factor is the same at
 * both lines, which are 6.6 mm apart at their far ends).
 */
const UNIT_RATIO = 1e-9;
/** Effect sizes against their hand formula (R11). */
const EFFECT = 0.02;

const US_SURVEY_FOOT = 1200 / 3937;
const INTERNATIONAL_FOOT = 0.3048;

function gridSha256(manifest: StoreManifest | undefined, grid: string) {
  return (
    manifest?.files.find((f) => f.file === `proj/${grid}`)?.sha256 ??
    "not in the manifest"
  );
}

function fingerprintOf(
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

const norm = (v: ArrayLike<number>): number => Math.hypot(v[0]!, v[1]!, v[2]!);
const distance = (a: ArrayLike<number>, b: ArrayLike<number>): number =>
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
function worstRoundTrip(
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

const proj = (ctx: StressContext): ProjApi => {
  if (ctx.proj === undefined) {
    throw new Error("the runner did not provide PROJ");
  }
  return ctx.proj;
};

const orion = (ctx: StressContext): Trajectory => {
  if (ctx.orion === undefined) {
    throw new Error("the runner did not provide Orion's trajectory");
  }
  return ctx.orion;
};

/** A seeded generator in [0, 1) (mulberry32), so the frame-tree points repeat. */
function random(seed: number): () => number {
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
function apply(m: ArrayLike<number>, p: ArrayLike<number>): Float64Array {
  const x = p[0]!,
    y = p[1]!,
    z = p[2]!;
  return Float64Array.of(
    m[0]! * x + m[4]! * y + m[8]! * z + m[12]!,
    m[1]! * x + m[5]! * y + m[9]! * z + m[13]!,
    m[2]! * x + m[6]! * y + m[10]! * z + m[14]!,
  );
}

const translationOf = (m: ArrayLike<number>): number =>
  Math.hypot(m[12]!, m[13]!, m[14]!);

/** The largest difference between the 3x3 blocks of (b · a) and c (column-major 4x4s). */
function rotationDifference(
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

const utc = (ctx: StressContext, iso: string): Instant =>
  Instant.fromIso(iso, "UTC", ctx.frames.data.leapSeconds);

const stressCase = (
  id: string,
  groupId: string,
  title: string,
  needs: readonly Need[],
  run: (ctx: StressContext, base: ResultBase) => Promise<StressResult[]>,
): StressCase => ({
  id,
  group: groupId,
  title,
  needs,
  run: (ctx) => run(ctx, { id, group: groupId, title }),
});

// ---------------------------------------------------------------------------
// Projections: design round trips on 17 CRSs (Global Constraints: 1e-4 m).

interface ProjectionSet {
  readonly crs: CrsRef;
  readonly name: string;
  readonly body: Body;
  /** The projection's natural origin (or the pole), degrees. */
  readonly origin: readonly [number, number];
  /** A point at the zone's edge, degrees. */
  readonly edge: readonly [number, number];
  readonly needs: readonly Need[];
}

const epsg = (wkid: number, vcsWkid?: number): CrsRef =>
  vcsWkid === undefined
    ? { format: "wkid", authority: "EPSG", wkid }
    : { format: "wkid", authority: "EPSG", wkid, vcsWkid };

const utmSet = (zone: number, south = false): ProjectionSet => {
  const centralMeridian = -183 + 6 * zone;
  return {
    crs: epsg((south ? 32700 : 32600) + zone),
    name: `WGS 84 / UTM zone ${zone}${south ? "S" : "N"}`,
    body: EARTH,
    origin: [centralMeridian, 0],
    // The zone's edge at the equator, where it is widest.
    edge: [centralMeridian + 3, 0],
    needs: ["proj"],
  };
};

const PROJECTION_SETS: readonly ProjectionSet[] = [
  ...Array.from({ length: 10 }, (_, i) => utmSet(10 + i)),
  utmSet(32),
  utmSet(33, true),
  {
    crs: CALIFORNIA,
    name: "NAD83(2011) / California zone 3 (ftUS) + NAVD88 height (ftUS), with GEOID18",
    body: EARTH,
    origin: [-120.5, 36.5],
    // The zone's north-east corner.
    edge: [-117.83, 38.71],
    needs: ["proj", "geoid"],
  },
  {
    crs: epsg(2223),
    name: "NAD83 / Arizona Central (ft)",
    body: EARTH,
    origin: [-111.916666666667, 31],
    edge: [-113.35, 34],
    needs: ["proj"],
  },
  {
    crs: epsg(3413),
    name: "WGS 84 / NSIDC Sea Ice Polar Stereographic North",
    body: EARTH,
    origin: [-45, 90],
    edge: [0, 60],
    needs: ["proj"],
  },
  {
    crs: epsg(3031),
    name: "WGS 84 / Antarctic Polar Stereographic",
    body: EARTH,
    origin: [0, -90],
    edge: [0, -60],
    needs: ["proj"],
  },
  {
    crs: { format: "wkid", authority: "IAU_2015", wkid: 30135 },
    name: "Moon (2015) - Sphere / Ocentric / South Polar",
    body: MOON,
    origin: [0, -90],
    edge: [90, -60],
    needs: ["proj"],
  },
];

function projectionCase(set: ProjectionSet): StressCase {
  const code = crsDefinition(set.crs);
  const id = `projections.${code.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const title = `${code} (${set.name}): the origin, a 50 km line, a point 100 km off the central meridian and one at the zone's edge round-trip through the body-fixed frame within 1e-4 m`;
  return stressCase(id, "projections", title, set.needs, async (ctx, base) => {
    const frame = EngineeringFrame.create(
      { name: set.name, body: set.body, crs: set.crs },
      proj(ctx),
    );
    const designOf = (lonLat: readonly [number, number]) =>
      frame.fromBodyFixed(
        set.body.ellipsoid.cartographicToCartesian(
          fromDegrees(lonLat[0], lonLat[1], 0),
          new Float64Array(3),
        ),
      );
    const origin = designOf(set.origin);
    const unit = frame.units.metersPerUnit;
    const designs: Float64Array[] = [origin];
    // 50 km along grid north, in eleven points.
    for (let i = 1; i <= 10; i++) {
      designs.push(
        Float64Array.of(origin[0]!, origin[1]! + (i * 5000) / unit, origin[2]!),
      );
    }
    designs.push(
      Float64Array.of(origin[0]! + 100_000 / unit, origin[1]!, origin[2]!),
    );
    designs.push(designOf(set.edge));
    const worst = worstRoundTrip(frame, designs);
    return [
      {
        ...base,
        pass: true,
        value: worst,
        tolerance: DESIGN_ROUND_TRIP,
        unit: "m",
        detail: `${designs.length} points; operation accuracy ${frame.operation.accuracy === undefined ? "not stated" : `${frame.operation.accuracy} m`}`,
        fingerprint: fingerprintOf(ctx, frame, designs),
      },
    ];
  });
}

// ---------------------------------------------------------------------------
// Units: EPSG:6420 against its international-foot copy (plan 4a, Task 3).

const unitsCase = stressCase(
  "units.foot",
  "units",
  "EPSG:6420 read in US survey feet and in international feet: lengths differ by the ratio of the two foot definitions",
  ["proj"],
  async (ctx, base) => {
    const P = proj(ctx);
    const wkt = P.proj_as_wkt(P.proj_create("EPSG:6420"), P.PJ_WKT2_2019);
    // Only the coordinate system's axes change unit; the conversion keeps
    // its parameters in ftUS, so the map is the same.
    const cs = wkt.indexOf("CS[");
    const international =
      wkt.slice(0, cs) +
      wkt
        .slice(cs)
        .replaceAll(
          'LENGTHUNIT["US survey foot",0.304800609601219]',
          'LENGTHUNIT["foot",0.3048]',
        );
    if (international === wkt) {
      throw new Error("EPSG:6420's WKT2 has no US survey foot axes to change");
    }
    const usFrame = EngineeringFrame.create(
      { name: "ftUS", body: EARTH, crs: epsg(6420) },
      P,
    );
    const ftFrame = EngineeringFrame.create(
      { name: "ft", body: EARTH, crs: { format: "wkt2", wkt2: international } },
      P,
    );
    const unitsRight =
      Math.abs(usFrame.units.metersPerUnit - US_SURVEY_FOOT) < 1e-15 &&
      ftFrame.units.metersPerUnit === INTERNATIONAL_FOOT;
    const units = `units from PROJ: ${usFrame.units.horizontalUnitName} ${usFrame.units.metersPerUnit} m, ${ftFrame.units.horizontalUnitName} ${ftFrame.units.metersPerUnit} m`;
    const expected = US_SURVEY_FOOT / INTERNATIONAL_FOOT;
    const length = (
      frame: EngineeringFrame,
      from: readonly number[],
      to: readonly number[],
    ) => distance(frame.toBodyFixed(to), frame.toBodyFixed(from));

    // 1. The same place: the zone's false origin, in each frame's numbers (the
    //    false easting and northing are metres, so the international-foot
    //    numbers are larger by the ratio). 3280.84 of each frame's feet east
    //    from it: the lengths differ by the ratio alone, since both lines lie
    //    where the scale factor is the same.
    const usOrigin = [6_561_666.667, 1_640_416.667, 0];
    const ftOrigin = usOrigin.map((v) => v * expected);
    const east = (o: readonly number[]) => [o[0]! + 3280.84, o[1]!, 0];
    const placed =
      length(usFrame, usOrigin, east(usOrigin)) /
      length(ftFrame, ftOrigin, east(ftOrigin));

    // 2. The same numbers (plan 4a's check): they name places about 4 m apart,
    //    so the ratio also carries the scale factor's change between them.
    const sameNumbers =
      length(usFrame, usOrigin, east(usOrigin)) /
      length(ftFrame, usOrigin, east(usOrigin));
    // The hand formula: (1200/3937) / 0.3048 - 1, in ppm.
    const handPpm = (expected - 1) * 1e6;
    const libraryPpm = (sameNumbers - 1) * 1e6;
    return [
      {
        ...base,
        id: `${base.id}.same-place`,
        title:
          "3280.84 feet east from the same place in EPSG:6420 (US survey feet) and its international-foot copy: the lengths differ by the foot definitions' ratio, (1200/3937)/0.3048, within 1e-9",
        pass: unitsRight,
        value: Math.abs(placed / expected - 1),
        tolerance: UNIT_RATIO,
        detail: `${units}; ratio of lengths ${placed}, of the foot definitions ${expected}`,
      },
      {
        ...base,
        id: `${base.id}.same-numbers`,
        title:
          "The same numbers in EPSG:6420 and its international-foot copy: a 1 km line is longer by 2 ppm in US survey feet, against the hand formula (1200/3937)/0.3048 − 1, within 2%",
        pass: unitsRight,
        value: Math.abs(libraryPpm / handPpm - 1),
        tolerance: EFFECT,
        detail: `${units}; ${fmt(libraryPpm, 7)} ppm against ${fmt(handPpm, 7)} ppm by hand (the places differ by about 4 m, which moves the scale factor by a few parts in 1e9)`,
        effect: {
          value: libraryPpm,
          unit: "ppm",
          label:
            "reading US survey feet as international feet (about 2 mm per km)",
        },
      },
    ];
  },
);

// ---------------------------------------------------------------------------
// Site grids: rotations and scales on California zone 3.

const SITE_ORIGIN: readonly [number, number, number] = [
  6_000_000, 2_100_000, 0,
];
const SITE_DESIGNS: readonly (readonly number[])[] = [
  [0, 0, 0],
  [1000, 800, 35],
  [-5000, 12_000, 100],
  [30_000, -20_000, 0],
];

const siteGridsCase = stressCase(
  "site-grids.round-trip",
  "site-grids",
  "Site grids on California zone 3, rotated 0°, 12.5°, 90° and −135° and scaled 1, 1.0000375 and 0.99996: each lands at the site formula's grid point and round-trips within 1e-4 m",
  ["proj", "geoid"],
  async (ctx, base) => {
    const results: StressResult[] = [];
    for (const degrees of [0, 12.5, 90, -135]) {
      for (const scale of [1, 1.0000375, 0.99996]) {
        const rotation = (degrees * Math.PI) / 180;
        const site: SiteTransform = { origin: SITE_ORIGIN, rotation, scale };
        const frame = EngineeringFrame.create(
          { name: "Site", body: EARTH, crs: CALIFORNIA, site },
          proj(ctx),
        );
        // The documented site formula, written out: [E, N] = [E0, N0] +
        // s R(θ) [e, n] with θ counterclockwise from grid east; U = U0 + u.
        let formula = 0;
        for (const [e, n, u] of SITE_DESIGNS) {
          const E =
            SITE_ORIGIN[0] +
            scale * (Math.cos(rotation) * e! - Math.sin(rotation) * n!);
          const N =
            SITE_ORIGIN[1] +
            scale * (Math.sin(rotation) * e! + Math.cos(rotation) * n!);
          const p = frame.projected([e!, n!, u!]);
          formula = Math.max(
            formula,
            Math.hypot(p[0]! - E, p[1]! - N, p[2]! - (SITE_ORIGIN[2] + u!)),
          );
        }
        const worst = worstRoundTrip(frame, SITE_DESIGNS);
        const formulaRight = formula * frame.units.metersPerUnit < 1e-9;
        results.push({
          ...base,
          id: `${base.id}.rotation-${degrees}.scale-${scale}`,
          title: `Site grid rotated ${degrees}° and scaled ${scale}: lands at the site formula's grid point (within 1e-9 m) and round-trips within 1e-4 m`,
          pass: formulaRight,
          value: worst,
          tolerance: DESIGN_ROUND_TRIP,
          unit: "m",
          detail: `site formula off by ${fmt(formula * frame.units.metersPerUnit)} m`,
        });
      }
    }
    return results;
  },
);

// ---------------------------------------------------------------------------
// Recorded operations

const MEASURED_AT = "2026-03-01T00:00:00";

const geoidGridCase = stressCase(
  "recorded-operations.geoid",
  "recorded-operations",
  "EPSG:6420+6360 records its operation once, with the GEOID18 grid us_noaa_g2018u0.tif in its pipeline",
  ["proj", "geoid"],
  async (ctx, base) => {
    const frame = EngineeringFrame.create(
      { name: "California zone 3", body: EARTH, crs: CALIFORNIA },
      proj(ctx),
    );
    const op = frame.operation;
    const designs = [
      [6_561_666.667, 1_640_416.667, 0],
      [6_000_000, 2_100_000, 100],
      [6_600_000, 2_300_000, 1000],
    ];
    const instant = utc(ctx, MEASURED_AT);
    const m = measure(
      designPoint(frame, designs[0]!),
      designPoint(frame, designs[1]!),
      instant,
      ctx.frames,
      { signal: false },
    );
    return [
      {
        ...base,
        pass:
          op.grids.includes(GEOID) &&
          op.pipeline.includes(`+grids=${GEOID}`) &&
          !op.ballpark,
        detail: `pipeline ${op.pipeline}; accuracy ${op.accuracy} m`,
        accuracy: plainAccuracy(m.accuracy),
        fingerprint: fingerprintOf(ctx, frame, designs),
        instant: instant.tdb(),
      },
    ];
  },
);

const missingGridCase = stressCase(
  "recorded-operations.missing-grid",
  "recorded-operations",
  "EPSG:22617+9245 (NAD83(CSRS)v6 / UTM 17N + CGVD2013a(2010) height) needs ca_nrc_CGG2013an83.tif, which is never loaded: creating the frame throws, naming that grid",
  ["proj"],
  async (ctx, base) => [
    await expectThrow(base, /missing: .*ca_nrc_CGG2013an83\.tif/, () =>
      EngineeringFrame.create(
        { name: "Ontario", body: EARTH, crs: epsg(22617, 9245) },
        proj(ctx),
      ),
    ),
  ],
);

// ---------------------------------------------------------------------------
// Frame tree: round trips and compositions over eight frames, five instants.

const TREE_INSTANTS = [
  "2026-01-15T00:00:00",
  "2026-03-20T12:00:00",
  "2026-06-21T06:00:00",
  "2026-09-22T18:00:00",
  "2026-12-21T03:00:00",
];

const frameTreeCase = stressCase(
  "frame-tree.compositions",
  "frame-tree",
  "Seeded points through A → B → A, and A → C → B against A → B, over every pair of ITRF, GCRF, EARTH_ICRF, EME2000, HCRS, MOON_ICRF, MOON_ME and MOON_PA at five instants in 2026: within 1 mm per 1e9 m and 1e-12 in rotation",
  [],
  async (ctx, base) => {
    const f = ctx.frames;
    const tree: Frame[] = [
      f.itrf,
      f.gcrf,
      f.earthIcrf,
      f.eme2000,
      f.hcrs,
      f.moonIcrf,
      f.moonMe,
      f.moonPa,
    ];
    const n = tree.length;
    const instants = TREE_INSTANTS.map((iso) => utc(ctx, iso));
    // matrices[t][i * n + j] maps frame i to frame j.
    const matrices = instants.map((t) => {
      const out: Float64Array[] = [];
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          out.push(frameTransform(tree[i]!, tree[j]!, t));
        }
      }
      return out;
    });
    const results: StressResult[] = [];
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const next = random(1 + i * n + j);
        let ratio = -1;
        let worstValue = 0;
        let worstTolerance = 0;
        let worstRotation = 0;
        let samples = 0;
        const consider = (deviation: number, tolerance: number) => {
          samples++;
          if (deviation / tolerance > ratio) {
            ratio = deviation / tolerance;
            worstValue = deviation;
            worstTolerance = tolerance;
          }
        };
        for (const M of matrices) {
          const m = (a: number, b: number) => M[a * n + b]!;
          for (let k = 0; k < 4; k++) {
            // 1 m to 1e9 m in a random direction.
            const r = 10 ** (9 * next());
            const z = 2 * next() - 1;
            const phi = 2 * Math.PI * next();
            const s = Math.sqrt(1 - z * z);
            const p = Float64Array.of(
              r * s * Math.cos(phi),
              r * s * Math.sin(phi),
              r * z,
            );
            for (const [a, b] of [
              [i, j],
              [j, i],
            ] as const) {
              const there = apply(m(a, b), p);
              const back = apply(m(b, a), there);
              consider(
                distance(back, p),
                PER_METER *
                  (translationOf(m(a, b)) +
                    norm(p) +
                    translationOf(m(b, a)) +
                    norm(there)),
              );
              worstRotation = Math.max(
                worstRotation,
                rotationDifference(m(b, a), m(a, b), "identity"),
              );
            }
            const direct = apply(m(i, j), p);
            for (let c = 0; c < n; c++) {
              if (c === i || c === j) {
                continue;
              }
              const step = apply(m(i, c), p);
              const via = apply(m(c, j), step);
              consider(
                distance(via, direct),
                PER_METER *
                  (translationOf(m(i, j)) +
                    norm(p) +
                    translationOf(m(i, c)) +
                    norm(p) +
                    translationOf(m(c, j)) +
                    norm(step)),
              );
              worstRotation = Math.max(
                worstRotation,
                rotationDifference(m(c, j), m(i, c), m(i, j)),
              );
            }
          }
        }
        const a = tree[i]!.name;
        const b = tree[j]!.name;
        results.push({
          ...base,
          id: `${base.id}.${a}-${b}`.toLowerCase().replaceAll("_", "-"),
          title: `${a} and ${b}: round trips, and compositions through the six other frames, agree within 1 mm per 1e9 m and 1e-12 in rotation`,
          pass: worstRotation <= ROTATION,
          value: worstValue,
          tolerance: worstTolerance,
          unit: "m",
          detail: `${samples} samples; the worst against its own tolerance shown; rotation ${fmt(worstRotation)} (limit ${ROTATION})`,
        });
      }
    }
    return results;
  },
);

// ---------------------------------------------------------------------------
// Time

const leapSecondCase = stressCase(
  "time.leap-second",
  "time",
  "Instant.fromIso across the leap second 2016-12-31T23:59:60: monotonic in 0.5 s steps, with TT advancing 2 s over the one UTC second",
  [],
  async (ctx, base) => {
    const labels = [
      "2016-12-31T23:59:59.0",
      "2016-12-31T23:59:59.5",
      "2016-12-31T23:59:60.0",
      "2016-12-31T23:59:60.5",
      "2017-01-01T00:00:00.0",
      "2017-01-01T00:00:00.5",
    ];
    const tt = labels.map((label) => utc(ctx, label).tt);
    let steps = 0;
    let monotonic = true;
    for (let i = 1; i < tt.length; i++) {
      monotonic &&= tt[i]! > tt[i - 1]!;
      steps = Math.max(steps, Math.abs(tt[i]! - tt[i - 1]! - 0.5));
    }
    const across = tt[4]! - tt[0]!;
    return [
      {
        ...base,
        id: `${base.id}.monotonic`,
        title:
          "UTC labels every 0.5 s from 23:59:59 through 23:59:60.5 to 00:00:00.5 give TT strictly increasing in 0.5 s steps",
        pass: monotonic,
        value: steps,
        tolerance: TT_STEP,
        unit: "s",
        detail: `TT − TT₀: ${tt.map((t) => fmt(t - tt[0]!, 6)).join(", ")} s`,
        instant: utc(ctx, labels[2]!).tdb(),
      },
      {
        ...base,
        id: `${base.id}.two-seconds`,
        title:
          "From 2016-12-31T23:59:59 to 2017-01-01T00:00:00 UTC, one labelled second, TT advances 2 s",
        pass: true,
        value: Math.abs(across - 2),
        tolerance: TT_STEP,
        unit: "s",
        detail: `TT advanced ${across} s`,
        instant: utc(ctx, labels[2]!).tdb(),
      },
    ];
  },
);

/** DSS-43's site (Canberra), ITRF metres, rounded: any Earth-fixed point does. */
const CANBERRA = [-4_460_894.9, 2_682_361.5, -3_674_748.2];

const eopEndCase = stressCase(
  "time.eop-end",
  "time",
  "An Earth-fixed measurement 60 days past the EOP table's predictions throws, giving the table's dates",
  [],
  async (ctx, base) => {
    const { eop, leapSeconds } = ctx.frames.data;
    const instant = Instant.fromUtc(eop.last + 60 * 86_400_000, leapSeconds);
    const result = await expectThrow(
      base,
      /ITRF: the EOP table covers .* and its predictions end there/,
      () =>
        measure(
          framePoint(ctx.frames.itrf, CANBERRA),
          framePoint(ctx.frames.gcrf, [7_000_000, 0, 0]),
          instant,
          ctx.frames,
        ),
    );
    return [{ ...result, instant: instant.tdb() }];
  },
);

const leapExpiryCase = stressCase(
  "time.leap-expiry",
  "time",
  "A measurement 30 days past the leap-second table's expiry carries the warning that a leap second may have been missed",
  [],
  async (ctx, base) => {
    const { leapSeconds } = ctx.frames.data;
    const instant = Instant.fromUtc(
      leapSeconds.expires + 30 * 86_400_000,
      leapSeconds,
    );
    // Two GCRF points: no Earth orientation, which ends before the expiry.
    const m = measure(
      framePoint(ctx.frames.gcrf, [7_000_000, 0, 0]),
      framePoint(ctx.frames.gcrf, [0, 42_164_000, 0]),
      instant,
      ctx.frames,
      { signal: false },
    );
    const warned = m.accuracy.warnings.some((w) =>
      /leap-second table has expired/.test(w),
    );
    return [
      {
        ...base,
        pass: warned,
        detail: `table expires ${new Date(leapSeconds.expires).toISOString().slice(0, 10)}; warnings: ${m.accuracy.warnings.join(" | ") || "none"}`,
        accuracy: plainAccuracy(m.accuracy),
        instant: instant.tdb(),
      },
    ];
  },
);

// ---------------------------------------------------------------------------
// Trajectory

const FLYBY = "2026-04-06T23:00:00";

const orionGapCase = stressCase(
  "trajectory.gap",
  "trajectory",
  "Orion's state at 2026-04-02T22:49:30 UTC, in a gap between the OEM's segments, throws and names the covered spans",
  ["orion"],
  async (ctx, base) => {
    const instant = utc(ctx, "2026-04-02T22:49:30");
    const result = await expectThrow(
      base,
      /outside its data \(covered: \d{4}-.+ to \d{4}-.+; \d{4}-.+ to \d{4}-/,
      () => orion(ctx).state(instant),
    );
    return [{ ...result, instant: instant.tdb() }];
  },
);

const orionMoonCase = stressCase(
  "trajectory.moon-me",
  "trajectory",
  "Orion at the lunar flyby (2026-04-06T23:00 UTC) in MOON_ME: its distance from the Moon's centre is kept, and it round-trips within 1 mm per 1e9 m",
  ["orion"],
  async (ctx, base) => {
    const o = orion(ctx);
    const f = ctx.frames;
    const instant = utc(ctx, FLYBY);
    const state = o.state(instant);
    const p = framePoint(o.reference, state.subarray(0, 3), instant);
    const inMe = convertPoint(p, f.moonMe);
    const back = convertPoint(inMe, o.reference);
    const toMe = frameTransform(o.reference, f.moonMe, instant);
    const fromMe = frameTransform(f.moonMe, o.reference, instant);
    // The Moon's centre in Orion's reference frame: a rigid rotation about it
    // keeps the distance.
    const moonCentre = frameTransform(
      f.moonIcrf,
      o.reference,
      instant,
    ).subarray(12, 15);
    const fromCentre = distance(p.position, moonCentre);
    const kept = Math.abs(norm(inMe.position) - fromCentre);
    const tolerance =
      PER_METER *
      (translationOf(toMe) +
        norm(p.position) +
        translationOf(fromMe) +
        norm(inMe.position));
    const accuracy = plainAccuracy(
      measure(
        framePoint(f.moonMe, [0, 0, 0]),
        framePoint(o.frame, [0, 0, 0]),
        instant,
        f,
        { signal: false },
      ).accuracy,
    );
    return [
      {
        ...base,
        id: `${base.id}.distance`,
        title:
          "Orion at the lunar flyby, converted to MOON_ME, keeps its distance from the Moon's centre (within 1 mm per 1e9 m)",
        pass: true,
        value: kept,
        tolerance,
        unit: "m",
        detail: `${fmt(fromCentre / 1000, 7)} km from the Moon's centre`,
        accuracy,
        instant: instant.tdb(),
      },
      {
        ...base,
        id: `${base.id}.round-trip`,
        title:
          "Orion at the lunar flyby round-trips through MOON_ME back to its reference frame within 1 mm per 1e9 m",
        pass: true,
        value: distance(back.position, p.position),
        tolerance,
        unit: "m",
        detail: `reference ${o.reference.name}`,
        accuracy,
        instant: instant.tdb(),
      },
    ];
  },
);

// ---------------------------------------------------------------------------
// Measurement

const MEASUREMENT_SITE: SiteTransform = {
  origin: SITE_ORIGIN,
  rotation: (12.5 * Math.PI) / 180,
  scale: 1.0000375,
};

const gridToGroundCase = stressCase(
  "measurement.grid-to-ground",
  "measurement",
  "A 10,000 ftUS design line on California zone 3 (site scale 1.0000375): design distance × site scale × metres per foot ÷ mean combined factor is the true distance, within 0.01 m",
  ["proj", "geoid"],
  async (ctx, base) => {
    const frame = EngineeringFrame.create(
      {
        name: "California zone 3 site",
        body: EARTH,
        crs: CALIFORNIA,
        site: MEASUREMENT_SITE,
      },
      proj(ctx),
    );
    const instant = utc(ctx, MEASURED_AT);
    const m = measure(
      designPoint(frame, [2000, 1000, 25]),
      designPoint(frame, [12_000, 1000, 25]),
      instant,
      ctx.frames,
      { signal: false },
    );
    const d = m.design!;
    const predicted =
      (d.distance * d.siteScale * d.metersPerUnit) / d.combinedFactor.mean;
    return [
      {
        ...base,
        pass: true,
        value: Math.abs(m.distance - predicted),
        tolerance: GRID_TO_GROUND,
        unit: "m",
        detail: `design ${d.distance} ${d.unitName}; true ${m.distance} m; predicted ${predicted} m; combined factor ${d.combinedFactor.mean}`,
        accuracy: plainAccuracy(m.accuracy),
        instant: instant.tdb(),
      },
    ];
  },
);

// A tangent, a clothoid in, a left arc of radius 800, a clothoid out and a
// tangent, eastbound from (1000, 1000), stations 0 to 2000.
const CLOTHOID_ROAD: AlignmentDefinition = {
  name: "Clothoid road",
  start: [1000, 1000],
  startAzimuth: Math.PI / 2,
  startStation: 0,
  horizontal: [
    { kind: "line", length: 500 },
    { kind: "spiral", length: 300, startRadius: Infinity, endRadius: 800 },
    { kind: "arc", length: 400, radius: 800 },
    { kind: "spiral", length: 300, startRadius: 800, endRadius: Infinity },
    { kind: "line", length: 500 },
  ],
};

const clothoidCase = stressCase(
  "measurement.clothoid",
  "measurement",
  "Points at stations and offsets along a clothoid alignment (tangent, spiral, arc, spiral, tangent) give back their station and offset within 1e-9 design units",
  [],
  async (_ctx, base) => {
    const road = new Alignment(CLOTHOID_ROAD);
    let worst = 0;
    let count = 0;
    for (const station of [100, 520, 650, 790, 1000, 1210, 1350, 1480, 1900]) {
      for (const offset of [-25, 0, 15]) {
        const point = road.pointAt(station, offset);
        const found = road.stationOffset(point);
        worst = Math.max(
          worst,
          Math.abs(found.station - station),
          Math.abs(found.offset - offset),
        );
        count++;
      }
    }
    return [
      {
        ...base,
        pass: true,
        value: worst,
        tolerance: ALIGNMENT_RECOVERY,
        unit: "design units",
        detail: `${count} points, every element`,
      },
    ];
  },
);

const designVsItrfCase = stressCase(
  "measurement.design-vs-itrf",
  "measurement",
  "A design point measured to another point gives the same distance as the design point fixed in ITRF, within 1e-9 m",
  ["proj", "geoid"],
  async (ctx, base) => {
    const frame = EngineeringFrame.create(
      {
        name: "California zone 3 site",
        body: EARTH,
        crs: CALIFORNIA,
        site: MEASUREMENT_SITE,
      },
      proj(ctx),
    );
    const instant = utc(ctx, MEASURED_AT);
    const a = designPoint(frame, [2000, 1000, 25]);
    const other = framePoint(
      ctx.frames.itrf,
      frame.toBodyFixed([9000, -4000, 400]),
    );
    const fromDesign = measure(a, other, instant, ctx.frames, {
      signal: false,
    });
    const fromItrf = measure(
      framePoint(ctx.frames.itrf, frame.toBodyFixed(a.design)),
      other,
      instant,
      ctx.frames,
      { signal: false },
    );
    return [
      {
        ...base,
        pass: true,
        value: Math.abs(fromDesign.distance - fromItrf.distance),
        tolerance: SAME_DISTANCE,
        unit: "m",
        detail: `${fromDesign.distance} m from the design point, ${fromItrf.distance} m from its ITRF position`,
        accuracy: plainAccuracy(fromDesign.accuracy),
        instant: instant.tdb(),
      },
    ];
  },
);

// ---------------------------------------------------------------------------
// The catalog

export const STRESS_CASES: readonly StressCase[] = [
  ...PROJECTION_SETS.map(projectionCase),
  unitsCase,
  siteGridsCase,
  geoidGridCase,
  missingGridCase,
  frameTreeCase,
  leapSecondCase,
  eopEndCase,
  leapExpiryCase,
  orionGapCase,
  orionMoonCase,
  gridToGroundCase,
  clothoidCase,
  designVsItrfCase,
];
