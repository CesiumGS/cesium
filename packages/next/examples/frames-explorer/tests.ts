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
  crsUnits,
  resolveOperation,
  type CrsRef,
} from "../../src/engineering/crs.ts";
import {
  EngineeringFrame,
  RigidPlacement,
  designPoint,
  type SiteTransform,
} from "../../src/engineering/EngineeringFrame.ts";
import { gridFactors } from "../../src/engineering/factors.ts";
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
import { surfaceDistance } from "../../src/measure/surface.ts";
import { EARTH, MOON, type Body } from "../../src/scene/Body.ts";
import { Instant } from "../../src/time/Instant.ts";
import { parseOem } from "../../src/trajectory/oem.ts";
import { Trajectory } from "../../src/trajectory/Trajectory.ts";
import signalFixture from "../../test/fixtures/frames/signal.json";
import references from "./references.json";

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
 * (R7). The result passes only if something was thrown and the message
 * matches, both as returned (for callers outside the runner) and as the
 * runner judges it again. The pattern is declared here, and the runner
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
    return {
      ...base,
      pass: false,
      expectedError: pattern.source,
      detail: `expected an error matching /${pattern.source}/, but nothing was thrown`,
    };
  } catch (error) {
    // Judged here too, so a result used outside the runner is never a false
    // pass; the runner judges it again from its fields.
    const message = messageOf(error);
    const matched = pattern.test(message);
    return {
      ...base,
      pass: matched,
      expectedError: pattern.source,
      error: message,
      ...(!matched && {
        detail: `threw a different error than /${pattern.source}/ expects`,
      }),
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
  // expectThrow already gives its reason in the detail; say it once.
  const detail = [
    ...new Set(
      [result.detail, ...reasons].filter(
        (s): s is string => s !== undefined && s !== "",
      ),
    ),
  ].join("; ");
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
/**
 * Frame-tree compositions: 1 mm per 1e9 m of translation, and 1e-12 in
 * rotation. Read per sample as PER_METER x the largest single translation in
 * the chains compared, plus ROTATION x the largest point they rotate (the
 * rotation's lever arm), so neither term is counted twice.
 */
const PER_METER = 1e-3 / 1e9;
const ROTATION = 1e-12;
const compositionTolerance = (
  translations: readonly number[],
  points: readonly number[],
): number =>
  PER_METER * Math.max(...translations) + ROTATION * Math.max(...points);
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
                compositionTolerance(
                  [translationOf(m(a, b)), translationOf(m(b, a))],
                  [norm(p), norm(there)],
                ),
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
                compositionTolerance(
                  [
                    translationOf(m(i, j)),
                    translationOf(m(i, c)),
                    translationOf(m(c, j)),
                  ],
                  [norm(p), norm(step)],
                ),
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
    const tolerance = compositionTolerance(
      [translationOf(toMe), translationOf(fromMe)],
      [norm(p.position), norm(inMe.position)],
    );
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
    const length = 10_000; // design ftUS, east along the site grid
    const m = measure(
      designPoint(frame, [2000, 1000, 25]),
      designPoint(frame, [2000 + length, 1000, 25]),
      instant,
      ctx.frames,
      { signal: false },
    );
    const d = m.design!;
    // From the known inputs, not the measurement's own design fields: the
    // only library number in the prediction is the combined factor.
    const predicted =
      (length * MEASUREMENT_SITE.scale * US_SURVEY_FOOT) /
      d.combinedFactor.mean;
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
// Published values (R10): references.json, read as printed.

interface Cited {
  readonly source: { readonly retrieved: string } & Record<string, unknown>;
}

const REFERENCE_ENTRIES = (
  references as unknown as { readonly entries: Record<string, unknown> }
).entries;

/** A references.json entry, which must exist. */
function cited<T>(id: string): T & Cited {
  const entry = REFERENCE_ENTRIES[id];
  if (entry === undefined) {
    throw new Error(`references.json has no entry "${id}"`);
  }
  return entry as T & Cited;
}

/** A value as its source printed it, and half a unit in its last printed digit (R10's tolerance). */
interface Printed {
  readonly value: number;
  readonly half: number;
}

const DIGITS = /^[+-]?\d+(?:\.\d+)?$/;

/**
 * A printed number: "1,905,441.053", "–11 169 055.58", "+4.5", "1.000 002".
 * Thousands separators and spaces are dropped, and a typographic minus is a
 * minus.
 */
function printed(text: string): Printed {
  const s = text.replace(/[−–]/g, "-").replace(/[\s,]/g, "");
  if (!DIGITS.test(s)) {
    throw new Error(`not a printed number: "${text}"`);
  }
  const point = s.indexOf(".");
  const decimals = point < 0 ? 0 : s.length - point - 1;
  return { value: Number(s), half: 0.5 * 10 ** -decimals };
}

/**
 * Degrees from a printed "d m s": "36 59 44.62514(N)", "-0 39 01.3",
 * `28°30'00.00"N`, "10° 00’ 00”". A hemisphere letter or sign gives the
 * sign; with neither, `sign` does. `half` is half a unit in the seconds'
 * last printed digit, in degrees.
 */
function sexagesimal(text: string, sign = 1): Printed {
  let t = text.replace(/[−–]/g, "-").trim();
  const hemisphere = /[NSEW]/.exec(t)?.[0];
  t = t.replace(/[NSEW()°'’"”]/g, " ").trim();
  let s = sign;
  if (t.startsWith("-")) {
    s = -1;
    t = t.slice(1);
  } else if (t.startsWith("+")) {
    t = t.slice(1);
  }
  if (hemisphere === "S" || hemisphere === "W") {
    s = -1;
  } else if (hemisphere === "N" || hemisphere === "E") {
    s = 1;
  }
  const parts = t.trim().split(/\s+/);
  if (parts.length !== 3) {
    throw new Error(`not a printed d m s angle: "${text}"`);
  }
  const [d, m, sec] = parts.map(printed) as [Printed, Printed, Printed];
  return {
    value: s * (d.value + m.value / 60 + sec.value / 3600),
    half: sec.half / 3600,
  };
}

/** A station as printed, "97 + 43.87", in feet. */
function printedStation(text: string): Printed {
  const [hundreds, rest] = text.split("+").map((s) => s.trim());
  const feet = printed(rest ?? "");
  return {
    value: printed(hundreds ?? "").value * 100 + feet.value,
    half: feet.half,
  };
}

const DEGREE = Math.PI / 180;
const ARCSECOND = Math.PI / 648_000;
const MILLIARCSECOND = ARCSECOND / 1000;

/** An ellipsoid from its EPSG record in references.json: a (m), f and e². */
function ellipsoidOf(id: string) {
  const e = cited<{ semiMajorAxis: string; inverseFlattening: string }>(id);
  const a = printed(e.semiMajorAxis).value;
  const f = 1 / printed(e.inverseFlattening).value;
  return { a, f, e2: f * (2 - f) };
}

/** Radii of curvature: meridional M, prime vertical N and Gaussian sqrt(M N), m. */
function radii(a: number, e2: number, latitudeDegrees: number) {
  const s = Math.sin(latitudeDegrees * DEGREE);
  const w = 1 - e2 * s * s;
  const N = a / Math.sqrt(w);
  const M = (a * (1 - e2)) / (w * Math.sqrt(w));
  return { M, N, gaussian: Math.sqrt(M * N) };
}

/**
 * Geographic to geocentric coordinates, written from IOGP 373-7-2 §4.1.1
 * (EPSG method 9602): X = (ν + h) cos φ cos λ, Y = (ν + h) cos φ sin λ,
 * Z = ((1 − e²) ν + h) sin φ, with ν = a / sqrt(1 − e² sin² φ).
 */
export function geodeticToGeocentric(
  longitudeDegrees: number,
  latitudeDegrees: number,
  height: number,
  a: number,
  f: number,
): [number, number, number] {
  const e2 = f * (2 - f);
  const phi = latitudeDegrees * DEGREE;
  const lambda = longitudeDegrees * DEGREE;
  const nu = a / Math.sqrt(1 - e2 * Math.sin(phi) ** 2);
  return [
    (nu + height) * Math.cos(phi) * Math.cos(lambda),
    (nu + height) * Math.cos(phi) * Math.sin(lambda),
    ((1 - e2) * nu + height) * Math.sin(phi),
  ];
}

/** Seven Helmert parameters in SI units: translations in metres, rotations in radians, the scale difference unitless. */
export interface HelmertParameters {
  readonly tx: number;
  readonly ty: number;
  readonly tz: number;
  readonly rx: number;
  readonly ry: number;
  readonly rz: number;
  readonly ds: number;
}

/** The two rotation conventions of IOGP 373-7-2 §4.2.1. */
export type RotationConvention = "position-vector" | "coordinate-frame";

export interface HelmertOptions {
  /** As the source states: position vector (EPSG 1033, 9606; 1053 with rates) or coordinate frame (1032, 9607; 1056 with rates). */
  readonly convention: RotationConvention;
  /** Rates of change per year, for a time-dependent transformation. */
  readonly rates?: HelmertParameters;
  /** The parameter reference epoch t0, decimal year. */
  readonly referenceEpoch?: number;
  /** The coordinate epoch t, decimal year. */
  readonly epoch?: number;
}

/**
 * The 7-parameter Helmert transformation of geocentric coordinates (metres),
 * written from the EPSG method definitions in IOGP 373-7-2 §4.2.3 and §4.2.5,
 * not from PROJ:
 *
 *   XT = M' · R' · XS + T',   M' = 1 + dS'
 *
 * with the small-angle rotation matrix R = [[1, −rZ, rY], [rZ, 1, −rX],
 * [−rY, rX, 1]] in the position vector convention; the coordinate frame
 * convention is the same with the rotations' signs reversed. For a
 * time-dependent transformation every parameter is first moved to the
 * coordinate epoch: p' = p + ṗ (t − t0).
 */
export function helmert(
  xyz: ArrayLike<number>,
  p: HelmertParameters,
  options: HelmertOptions,
): [number, number, number] {
  let q = p;
  if (options.rates !== undefined) {
    const { referenceEpoch, epoch } = options;
    if (referenceEpoch === undefined || epoch === undefined) {
      throw new Error(
        "helmert: a time-dependent transformation needs its reference epoch and the coordinate epoch",
      );
    }
    const dt = epoch - referenceEpoch;
    const r = options.rates;
    q = {
      tx: p.tx + r.tx * dt,
      ty: p.ty + r.ty * dt,
      tz: p.tz + r.tz * dt,
      rx: p.rx + r.rx * dt,
      ry: p.ry + r.ry * dt,
      rz: p.rz + r.rz * dt,
      ds: p.ds + r.ds * dt,
    };
  }
  const s = options.convention === "position-vector" ? 1 : -1;
  const rx = s * q.rx;
  const ry = s * q.ry;
  const rz = s * q.rz;
  const m = 1 + q.ds;
  const x = xyz[0]!;
  const y = xyz[1]!;
  const z = xyz[2]!;
  return [
    m * (x - rz * y + ry * z) + q.tx,
    m * (rz * x + y - rx * z) + q.ty,
    m * (-ry * x + rx * y + z) + q.tz,
  ];
}

/** EPSG's reversal (IOGP 373-7-2 §4.2.5): every parameter's sign reversed, the reference epoch kept. */
export function reversedHelmert(p: HelmertParameters): HelmertParameters {
  return {
    tx: -p.tx,
    ty: -p.ty,
    tz: -p.tz,
    rx: -p.rx,
    ry: -p.ry,
    rz: -p.rz,
    ds: -p.ds,
  };
}

const sub3 = (a: ArrayLike<number>, b: ArrayLike<number>): number[] => [
  a[0]! - b[0]!,
  a[1]! - b[1]!,
  a[2]! - b[2]!,
];
const dot3 = (a: ArrayLike<number>, b: ArrayLike<number>): number =>
  a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
const cross3 = (a: ArrayLike<number>, b: ArrayLike<number>): number[] => [
  a[1]! * b[2]! - a[2]! * b[1]!,
  a[2]! * b[0]! - a[0]! * b[2]!,
  a[0]! * b[1]! - a[1]! * b[0]!,
];
const scale3 = (a: ArrayLike<number>, k: number): number[] => [
  a[0]! * k,
  a[1]! * k,
  a[2]! * k,
];
/** The angle between two vectors, radians, accurate near 0. */
const angle3 = (a: ArrayLike<number>, b: ArrayLike<number>): number =>
  Math.atan2(norm(cross3(a, b)), dot3(a, b));
/** The rotation part of a column-major 4x4 applied to a vector. */
function rotate(m: ArrayLike<number>, v: ArrayLike<number>): number[] {
  return [
    m[0]! * v[0]! + m[4]! * v[1]! + m[8]! * v[2]!,
    m[1]! * v[0]! + m[5]! * v[1]! + m[9]! * v[2]!,
    m[2]! * v[0]! + m[6]! * v[1]! + m[10]! * v[2]!,
  ];
}

/** Body-fixed metres of a longitude, latitude (degrees) and height on the Earth's ellipsoid. */
const onEarth = (lon: number, lat: number, h = 0): Float64Array =>
  EARTH.ellipsoid.cartographicToCartesian(
    fromDegrees(lon, lat, h),
    new Float64Array(3),
  );

/** The refined inverse's residual bound (RecordedOperation.inverse), m: the path's own tolerance. */
const INVERSE_RESIDUAL = 1e-6;
/**
 * PROJ differentiates numerically for the scale factor (gridFactors): its
 * two scales of a conformal projection differ by about 1e-11, so 1e-10 is
 * the path's own tolerance for a factor.
 */
const FACTOR_PATH = 1e-10;
/** The same for the convergence, radians (about 0.0002″). */
const CONVERGENCE_PATH = 1e-9;
/**
 * PROJ's numerical latitude derivative (step ~1e-5), which gridFactors' h
 * comes from: test/data/factors.test.ts measured 2.2e-10 in Web Mercator's h
 * at 60°.
 */
const NUMERICAL_LATITUDE_DERIVATIVE = 1e-9;
/** An angle from PROJ's iterative inverses, arcseconds (0.3 mm on the ground). */
const ANGLE_PATH = 1e-5;
/** Alignment geometry is exact to float64 (alignment.ts): the path's own tolerance. */
const ALIGNMENT_PATH = 1e-9;
/** π − Math.PI: the second part of π in two doubles. */
const PI_REMAINDER = 1.2246467991473532e-16;
/** The Vertical profile and Distortion groups' tolerance (the plan's). */
const HAND_FORMULA = 1e-9;

// ---------------------------------------------------------------------------
// Reference values: NGS datasheets.

interface NgsMark {
  readonly designation: string;
  readonly latitude: string;
  readonly longitude: string;
  readonly ellipsoidHeight: string;
  readonly orthometricHeight: string;
  readonly orthometricHeightMethod: string;
  readonly geoidHeight: string;
  readonly spc: {
    readonly zone: string;
    readonly north: string;
    readonly east: string;
    readonly scaleFactor: string;
    readonly convergence: string;
    readonly elevationFactor: string;
    readonly combinedFactor: string;
  };
  readonly utm: {
    readonly zone: string;
    readonly north: string;
    readonly east: string;
  };
}

/** NAVD88 height (m): the compound CRS's vertical part, through GEOID18. */
const NAVD88_METRES = 5703;

/** The datasheet marks (PIDs) and the NAD83(2011) metre CRS of each one's SPCS 83 zone (EPSG registry names). */
const NGS_MARKS: readonly {
  readonly pid: string;
  readonly crs: number;
  readonly name: string;
}[] = [
  { pid: "GU2195", crs: 6419, name: "NAD83(2011) / California zone 3" },
  { pid: "AK7130", crs: 6437, name: "NAD83(2011) / Florida East" },
  { pid: "AA5394", crs: 6564, name: "NAD83(2011) / Pennsylvania South" },
  { pid: "KK1284", crs: 6427, name: "NAD83(2011) / Colorado Central" },
  { pid: "AJ3674", crs: 6404, name: "NAD83(2011) / Arizona Central" },
];

function ngsCase(mark: (typeof NGS_MARKS)[number]): StressCase {
  const m = cited<NgsMark>(`ngs-${mark.pid}`);
  const id = `reference-values.ngs-${mark.pid.toLowerCase()}`;
  const title = `NGS datasheet ${mark.pid} (${m.designation}, SPC ${m.spc.zone}) through EPSG:${mark.crs}+${NAVD88_METRES} with GEOID18: northing and easting, convergence, scale factor, combined factor and orthometric height match the datasheet at its printed precision`;
  return stressCase(
    id,
    "reference-values",
    title,
    ["proj", "geoid"],
    async (ctx, base) => {
      const frame = EngineeringFrame.create(
        { name: mark.name, body: EARTH, crs: epsg(mark.crs, NAVD88_METRES) },
        proj(ctx),
      );
      const lat = sexagesimal(m.latitude);
      const lon = sexagesimal(m.longitude);
      const h = printed(m.ellipsoidHeight);
      // The datasheet's position and ellipsoid height: design E, N (m) and the
      // NAVD88 height PROJ gives through GEOID18.
      const design = frame.fromBodyFixed(
        onEarth(lon.value, lat.value, h.value),
      );
      const factors = gridFactors(frame, design);
      const grs80 = ellipsoidOf("epsg-ellipsoid-grs80");
      const r = radii(grs80.a, grs80.e2, lat.value);
      // The position's own rounding (half of 0.00001″ in each angle) moves the
      // grid point by up to k (M δφ + N cos φ δλ).
      const inputRounding =
        factors.pointScale *
        (r.M * lat.half * DEGREE +
          r.N * Math.cos(lat.value * DEGREE) * lon.half * DEGREE);
      const north = printed(m.spc.north);
      const east = printed(m.spc.east);
      const convergence = sexagesimal(m.spc.convergence);
      const scaleFactor = printed(m.spc.scaleFactor);
      const combined = printed(m.spc.combinedFactor);
      const geoid = printed(m.geoidHeight);
      const published = printed(m.orthometricHeight);
      const sub = (suffix: string, words: string): ResultBase => ({
        ...base,
        id: `${base.id}.${suffix}`,
        title: `${mark.pid} (SPC ${m.spc.zone}): ${words}`,
      });
      const orthometric = h.value - geoid.value;
      return [
        {
          ...sub(
            "grid",
            `northing ${m.spc.north} m and easting ${m.spc.east} m from the datasheet's position, within half a unit of their last digit plus the position's own rounding`,
          ),
          pass: true,
          value: Math.max(
            Math.abs(design[1]! - north.value),
            Math.abs(design[0]! - east.value),
          ),
          tolerance:
            Math.max(north.half, east.half) + inputRounding + INVERSE_RESIDUAL,
          unit: "m",
          detail: `computed N ${design[1]!.toFixed(4)}, E ${design[0]!.toFixed(4)} m; the position's rounding allows ${fmt(inputRounding)} m; operation accuracy ${frame.operation.accuracy} m (a datum ensemble, not this check's path)`,
          fingerprint: fingerprintOf(ctx, frame, [design]),
        },
        {
          ...sub(
            "convergence",
            `convergence ${m.spc.convergence} (d m s), within 0.05″`,
          ),
          pass: true,
          value:
            Math.abs(factors.convergence - convergence.value * DEGREE) /
            ARCSECOND,
          tolerance: convergence.half * 3600 + CONVERGENCE_PATH / ARCSECOND,
          unit: "″",
          detail: `computed ${fmt(factors.convergence / DEGREE, 10)}°, published ${fmt(convergence.value, 10)}° (both from true north to grid north, positive east)`,
        },
        {
          ...sub(
            "scale-factor",
            `scale factor ${m.spc.scaleFactor}, within 5e-9`,
          ),
          pass: true,
          value: Math.abs(factors.pointScale - scaleFactor.value),
          tolerance: scaleFactor.half + FACTOR_PATH,
          detail: `computed ${factors.pointScale.toFixed(11)}`,
        },
        {
          ...sub(
            "combined-factor",
            `combined factor ${m.spc.combinedFactor} (elevation factor ${m.spc.elevationFactor} × scale factor) from gridFactors at the datasheet's ellipsoid height, within 5e-9`,
          ),
          pass: true,
          value: Math.abs(factors.combinedFactor - combined.value),
          tolerance: combined.half + FACTOR_PATH + h.half / r.gaussian,
          detail: `computed ${factors.combinedFactor.toFixed(11)} (elevation factor ${factors.elevationFactor.toFixed(11)} at h ${fmt(frame.toGeodetic(design).height, 7)} m)`,
        },
        {
          ...sub(
            "orthometric-height",
            `NAVD88 height from the ellipsoid height through GEOID18: h ${m.ellipsoidHeight} − N ${m.geoidHeight} = ${orthometric.toFixed(3)} m, within 1 mm`,
          ),
          pass: true,
          value: Math.abs(design[2]! - orthometric),
          tolerance: h.half + geoid.half + INVERSE_RESIDUAL,
          unit: "m",
          detail: `computed ${design[2]!.toFixed(4)} m; the datasheet's own NAVD 88 height is ${m.orthometricHeight} m (${m.orthometricHeightMethod}), ${fmt(published.value - orthometric, 3)} m from h − N: GEOID18's fit at this mark, not part of the check`,
        },
      ];
    },
  );
}

// ---------------------------------------------------------------------------
// Reference values: IOGP 373-7-2 worked examples, forward and inverse.

interface IogpExample {
  readonly crs: string;
  readonly forward: {
    readonly latitude: string;
    readonly longitude: string;
    readonly easting: string;
    readonly northing: string;
    readonly unit: string;
  };
  readonly reverse: {
    readonly easting: string;
    readonly northing: string;
    readonly latitude: string;
    readonly longitude: string;
  };
}

/** The projection methods the catalog uses, with the EPSG codes of the examples' CRSs and their geographic CRSs (EPSG registry names). */
const IOGP_EXAMPLES: readonly {
  readonly id: string;
  readonly method: string;
  readonly crs: number;
  readonly geographic: string;
}[] = [
  {
    id: "lambert-conic-conformal-2sp",
    method: "Lambert Conic Conformal (2SP)",
    crs: 32040,
    geographic: "EPSG:4267",
  },
  {
    id: "transverse-mercator",
    method: "Transverse Mercator",
    crs: 27700,
    geographic: "EPSG:4277",
  },
  {
    id: "polar-stereographic-b",
    method: "Polar Stereographic (variant B)",
    crs: 3032,
    geographic: "EPSG:4326",
  },
  {
    id: "pseudo-mercator",
    method: "Popular Visualisation Pseudo-Mercator",
    crs: 3857,
    geographic: "EPSG:4326",
  },
];

function iogpCase(
  example: (typeof IOGP_EXAMPLES)[number],
  direction: "forward" | "reverse",
): StressCase {
  const x = cited<IogpExample>(`iogp-${example.id}`);
  const id = `reference-values.iogp-${example.id}-${direction}`;
  const f = x.forward;
  const rv = x.reverse;
  const title =
    direction === "forward"
      ? `IOGP 373-7-2's ${example.method} example (${x.crs}, EPSG:${example.crs}), forward: ${f.latitude}, ${f.longitude} gives E ${f.easting}, N ${f.northing} ${f.unit}, within half a unit of the last digit`
      : `IOGP 373-7-2's ${example.method} example (${x.crs}, EPSG:${example.crs}), reverse: E ${rv.easting}, N ${rv.northing} gives ${rv.latitude}, ${rv.longitude}, within half a unit of the last digit`;
  return stressCase(
    id,
    "reference-values",
    title,
    ["proj"],
    async (ctx, base) => {
      // The conversion alone: from the projected CRS to its own geographic CRS.
      const op = resolveOperation(
        proj(ctx),
        epsg(example.crs),
        example.geographic,
      );
      const conversionOnly =
        op.grids.length === 0 && !/helmert|\bcart\b/.test(op.pipeline);
      if (direction === "forward") {
        const units = crsUnits(proj(ctx), epsg(example.crs));
        const easting = printed(f.easting);
        const northing = printed(f.northing);
        const en = op.inverse([
          sexagesimal(f.longitude).value,
          sexagesimal(f.latitude).value,
          0,
        ]);
        return [
          {
            ...base,
            pass: conversionOnly,
            value: Math.max(
              Math.abs(en[0]! - easting.value),
              Math.abs(en[1]! - northing.value),
            ),
            tolerance:
              Math.max(easting.half, northing.half) +
              INVERSE_RESIDUAL / units.metersPerUnit,
            unit: units.horizontalUnitName,
            detail: `computed E ${en[0]!.toFixed(4)}, N ${en[1]!.toFixed(4)}; pipeline ${op.pipeline}`,
          },
        ];
      }
      const back = op.forward([
        printed(rv.easting).value,
        printed(rv.northing).value,
        0,
      ]);
      const lat = sexagesimal(rv.latitude);
      const lon = sexagesimal(rv.longitude);
      return [
        {
          ...base,
          pass: conversionOnly,
          value:
            Math.max(
              Math.abs(back[1]! - lat.value),
              Math.abs(back[0]! - lon.value),
            ) * 3600,
          tolerance: Math.max(lat.half, lon.half) * 3600 + ANGLE_PATH,
          unit: "″",
          detail: `computed ${fmt(back[1]!, 12)}°, ${fmt(back[0]!, 12)}°; pipeline ${op.pipeline}`,
        },
      ];
    },
  );
}

// ---------------------------------------------------------------------------
// Reference values: a published clothoid example (WYDOT Survey Manual).

interface SpiralExample {
  readonly given: {
    readonly piStation: string;
    readonly LS: string;
    readonly delta: string;
    readonly D: string;
  };
  readonly tableRow: {
    readonly deltaS: string;
    readonly R: string;
    readonly X: string;
    readonly Y: string;
    readonly ST: string;
    readonly LT: string;
  };
  readonly stations: {
    readonly TS: string;
    readonly SC: string;
    readonly CS: string;
    readonly ST: string;
  };
}

const clothoidReferenceCase = stressCase(
  "reference-values.clothoid",
  "reference-values",
  "WYDOT Survey Manual's spiral example (LS 150 ft, D 10°, ∆ 35°, PI 100+00) as a tangent, clothoid, arc, clothoid, tangent alignment: the spiral angle, X and Y at the SC, the long and short tangents and the TS, SC, CS and ST stations match the published values",
  [],
  async (_ctx, base) => {
    const s = cited<SpiralExample>("wydot-spiral-example");
    const LS = printed(s.given.LS.replace("ft", "")).value;
    const D = printed(s.given.D.replace("°", "")).value;
    const delta = printed(s.given.delta.replace("°", "")).value;
    // The arc definition of the degree of curve (100 ft of arc subtends D),
    // which the manual's R = 5729.58 / D rounds.
    const R = 18_000 / (Math.PI * D);
    const deltaS = (D * LS) / 200; // degrees
    const LC = (100 * (delta - 2 * deltaS)) / D;
    const lead = 500;
    // Eastbound from the origin, curving left (positive radius).
    const road = new Alignment({
      name: "WYDOT spiral example",
      start: [0, 0],
      startAzimuth: Math.PI / 2,
      startStation: 0,
      horizontal: [
        { kind: "line", length: lead },
        { kind: "spiral", length: LS, startRadius: Infinity, endRadius: R },
        { kind: "arc", length: LC, radius: R },
        { kind: "spiral", length: LS, startRadius: R, endRadius: Infinity },
        { kind: "line", length: lead },
      ],
    });
    const at = (station: number) => road.pointAt(station);
    const dir = (station: number) => {
      const a = road.azimuthAt(station);
      return [Math.sin(a), Math.cos(a)];
    };
    const ts = at(lead);
    const sc = at(lead + LS);
    const t0 = dir(lead);
    const n0 = [-t0[1]!, t0[0]!]; // left normal
    const d = [sc[0]! - ts[0]!, sc[1]! - ts[1]!];
    const X = d[0]! * t0[0]! + d[1]! * t0[1]!;
    const Y = d[0]! * n0[0]! + d[1]! * n0[1]!;
    const thetaS = (road.azimuthAt(lead) - road.azimuthAt(lead + LS)) / DEGREE;
    // Lines p + s u and q + t v meet at p + s u, s = ((q − p) × v) / (u × v).
    const meet = (
      p: ArrayLike<number>,
      u: ArrayLike<number>,
      q: ArrayLike<number>,
      v: ArrayLike<number>,
    ) => {
      const cross = u[0]! * v[1]! - u[1]! * v[0]!;
      const s2 = ((q[0]! - p[0]!) * v[1]! - (q[1]! - p[1]!) * v[0]!) / cross;
      return [p[0]! + s2 * u[0]!, p[1]! + s2 * u[1]!];
    };
    // The spiral's PI (SPI): the back tangent meets the tangent at the SC.
    const spi = meet(ts, t0, sc, dir(lead + LS));
    const LT = Math.hypot(spi[0]! - ts[0]!, spi[1]! - ts[1]!);
    const ST = Math.hypot(sc[0]! - spi[0]!, sc[1]! - spi[1]!);
    // The main PI: the back tangent meets the forward tangent; TS = PI − Ts.
    const end = road.endStation;
    const pi = meet(at(0), dir(0), at(end), dir(end));
    const Ts = Math.hypot(pi[0]! - ts[0]!, pi[1]! - ts[1]!);
    const offset =
      printedStation(s.given.piStation.replace("+", " + ")).value - Ts - lead;
    const stations = {
      TS: offset + lead,
      SC: offset + lead + LS,
      CS: offset + lead + LS + LC,
      ST: offset + lead + 2 * LS + LC,
    };
    const row = s.tableRow;
    const pX = printed(row.X);
    const pY = printed(row.Y);
    const pLT = printed(row.LT);
    const pST = printed(row.ST);
    const pTheta = sexagesimal(row.deltaS);
    const keys = ["TS", "SC", "CS", "ST"] as const;
    const worstStation = Math.max(
      ...keys.map((k) =>
        Math.abs(stations[k] - printedStation(s.stations[k]).value),
      ),
    );
    const stationHalf = printedStation(s.stations.TS).half;
    const sub = (suffix: string, words: string): ResultBase => ({
      ...base,
      id: `${base.id}.${suffix}`,
      title: `WYDOT spiral example: ${words}`,
    });
    const ft = (v: number) => v.toFixed(4);
    return [
      {
        ...sub("spiral-angle", `spiral angle ∆S ${row.deltaS}, within 0.5″`),
        pass: true,
        value: Math.abs(thetaS - pTheta.value) * 3600,
        tolerance: pTheta.half * 3600 + ALIGNMENT_PATH,
        unit: "″",
        detail: `heading change over the spiral ${fmt(thetaS, 12)}°; R ${fmt(R, 10)} ft (the table prints ${row.R})`,
      },
      {
        ...sub(
          "x-y",
          `X ${row.X} ft and Y ${row.Y} ft at the SC, within 0.005 ft`,
        ),
        pass: true,
        value: Math.max(Math.abs(X - pX.value), Math.abs(Y - pY.value)),
        tolerance: Math.max(pX.half, pY.half) + ALIGNMENT_PATH,
        unit: "ft",
        detail: `X ${ft(X)}, Y ${ft(Y)} ft`,
      },
      {
        ...sub(
          "tangents",
          `long tangent ${row.LT} ft and short tangent ${row.ST} ft, within 0.005 ft`,
        ),
        pass: true,
        value: Math.max(Math.abs(LT - pLT.value), Math.abs(ST - pST.value)),
        tolerance: Math.max(pLT.half, pST.half) + ALIGNMENT_PATH,
        unit: "ft",
        detail: `LT ${ft(LT)}, ST ${ft(ST)} ft`,
      },
      {
        ...sub(
          "stations",
          `TS ${s.stations.TS}, SC ${s.stations.SC}, CS ${s.stations.CS} and ST ${s.stations.ST}, from the PI and the tangents' intersection, within 0.005 ft`,
        ),
        pass: true,
        value: worstStation,
        tolerance: stationHalf + ALIGNMENT_PATH,
        unit: "ft",
        detail: `Ts ${ft(Ts)} ft; TS ${ft(stations.TS)}, SC ${ft(stations.SC)}, CS ${ft(stations.CS)}, ST ${ft(stations.ST)}`,
      },
    ];
  },
);

// ---------------------------------------------------------------------------
// Vertical profile: a symmetric parabolic curve, arithmetic in the case.

const verticalCurveCase = stressCase(
  "vertical-profile.parabola",
  "vertical-profile",
  "A symmetric vertical curve, PVI 10+00.00 at elevation 100.000, g1 = +3%, g2 = −2%, L = 400: elevations, the high point and K match the hand arithmetic within 1e-9",
  [],
  async (_ctx, base) => {
    const pvi = 1000;
    const elevation = 100;
    const g1 = 0.03;
    const g2 = -0.02;
    const L = 400;
    const start = 500;
    const road = new Alignment({
      name: "Vertical curve",
      start: [0, 0],
      startAzimuth: Math.PI / 2,
      startStation: start,
      horizontal: [{ kind: "line", length: 1000 }],
      vertical: {
        startStation: start,
        startElevation: elevation - g1 * (pvi - start),
        segments: [
          { kind: "grade", length: pvi - L / 2 - start, grade: g1 },
          { kind: "parabola", length: L, startGrade: g1, endGrade: g2 },
          { kind: "grade", length: start + 1000 - (pvi + L / 2), grade: g2 },
        ],
      },
    });
    // By hand: BVC at 800 is 100 − 0.03·200 = 94.000; EVC at 1200 is
    // 100 − 0.02·200 = 96.000; within the curve y = 94 + g1·x + (g2 − g1)·x²/(2L)
    // x from the BVC: x = 50 → 95.34375, 100 → 96.375, 200 → 97.5, 300 → 97.375.
    const bvc = pvi - L / 2;
    const yBvc = elevation - (g1 * L) / 2;
    const hand = (x: number) => yBvc + g1 * x + ((g2 - g1) * x * x) / (2 * L);
    const points = [
      { station: bvc, y: 94 },
      { station: bvc + 50, y: 95.34375 },
      { station: bvc + 100, y: 96.375 },
      { station: bvc + 200, y: 97.5 },
      { station: bvc + 300, y: 97.375 },
      { station: pvi + L / 2, y: 96 },
    ];
    let worstElevation = 0;
    let arithmetic = 0;
    for (const p of points) {
      worstElevation = Math.max(
        worstElevation,
        Math.abs(road.elevationAt(p.station) - p.y),
      );
      // The written values against the formula: the arithmetic itself.
      arithmetic = Math.max(arithmetic, Math.abs(hand(p.station - bvc) - p.y));
    }
    // The high point: x = −g1·L/(g2 − g1) = 240 from the BVC, station
    // 10+40.00, elevation 94 + 7.2 − 3.6 = 97.6.
    const xHigh = (-g1 * L) / (g2 - g1);
    const high = bvc + xHigh;
    const yHigh = road.elevationAt(high);
    const isMaximum =
      road.elevationAt(high - 0.01) < yHigh &&
      road.elevationAt(high + 0.01) < yHigh;
    // K = L / |A|, A = g2 − g1 in percent: 400 / 5 = 80. From the profile, the
    // rate of change of grade r = (y(+h) − 2y + y(−h)) / h², and K = 1/(100 |r|).
    const step = 100;
    const r =
      (road.elevationAt(pvi + step) -
        2 * road.elevationAt(pvi) +
        road.elevationAt(pvi - step)) /
      (step * step);
    const K = 1 / (100 * Math.abs(r));
    const sub = (suffix: string, title: string): ResultBase => ({
      ...base,
      id: `${base.id}.${suffix}`,
      title,
    });
    return [
      {
        ...sub(
          "elevations",
          "Elevations at the BVC (8+00, 94.000), EVC (12+00, 96.000) and stations 8+50, 9+00, 10+00 and 11+00 (95.34375, 96.375, 97.5, 97.375) within 1e-9",
        ),
        pass: arithmetic < 1e-12,
        value: worstElevation,
        tolerance: HAND_FORMULA,
        unit: "ft",
        detail: points
          .map((p) => `${p.station}: ${road.elevationAt(p.station)}`)
          .join("; "),
      },
      {
        ...sub(
          "high-point",
          "The high point at x = −g1·L/(g2 − g1) = 240 from the BVC (station 10+40.00, elevation 97.6) is a maximum: 0.01 either side is lower",
        ),
        pass: isMaximum && xHigh === 240,
        value: Math.abs(yHigh - 97.6),
        tolerance: HAND_FORMULA,
        unit: "ft",
        detail: `elevation ${yHigh} at ${high}; ${road.elevationAt(high - 0.01)} and ${road.elevationAt(high + 0.01)} at ±0.01`,
      },
      {
        ...sub(
          "k",
          "K = L/|g2 − g1| = 400/5 = 80 (length per percent of grade change), from the profile's rate of change of grade, within 1e-9",
        ),
        pass: true,
        value: Math.abs(K - 80),
        tolerance: HAND_FORMULA,
        detail: `K ${K}`,
      },
    ];
  },
);

const gradeToGradeCase = stressCase(
  "vertical-profile.grade-to-grade",
  "vertical-profile",
  "Grade to grade with no curve: +3% to the PVI at 10+00.00 (elevation 100.000), then −2%: elevations at 7+50 (92.5), 10+00 (100) and 12+50 (95) within 1e-9",
  [],
  async (_ctx, base) => {
    const road = new Alignment({
      name: "Grade to grade",
      start: [0, 0],
      startAzimuth: 0,
      startStation: 500,
      horizontal: [{ kind: "line", length: 1000 }],
      vertical: {
        startStation: 500,
        startElevation: 85,
        segments: [
          { kind: "grade", length: 500, grade: 0.03 },
          { kind: "grade", length: 500, grade: -0.02 },
        ],
      },
    });
    const expected = [
      [750, 92.5],
      [1000, 100],
      [1250, 95],
    ] as const;
    const worst = Math.max(
      ...expected.map(([s, y]) => Math.abs(road.elevationAt(s) - y)),
    );
    return [
      {
        ...base,
        pass: true,
        value: worst,
        tolerance: HAND_FORMULA,
        unit: "ft",
        detail: expected
          .map(([s]) => `${s}: ${road.elevationAt(s)}`)
          .join("; "),
      },
    ];
  },
);

// ---------------------------------------------------------------------------
// Distortion

const webMercatorFrame = (ctx: StressContext) =>
  EngineeringFrame.create(
    { name: "WGS 84 / Pseudo-Mercator", body: EARTH, crs: epsg(3857) },
    proj(ctx),
  );

const webMercatorScaleCase = stressCase(
  "distortion.web-mercator-scale",
  "distortion",
  "EPSG:3857's parallel scale from gridFactors at latitudes 0°, 45°, 60° and 70° against the hand formula k = sqrt(1 − e² sin² φ) / cos φ within 1e-9, and against IOGP 373-7-2's printed k at its example point",
  ["proj"],
  async (ctx, base) => {
    const frame = webMercatorFrame(ctx);
    const wgs84 = ellipsoidOf("epsg-ellipsoid-wgs84");
    const results: StressResult[] = [];
    for (const latitude of [0, 45, 60, 70]) {
      const k = gridFactors(
        frame,
        frame.fromBodyFixed(onEarth(0, latitude)),
      ).pointScale;
      const phi = latitude * DEGREE;
      // IOGP 373-7-2 §3.2.1.2: k = a / (ν cos φ) = sqrt(1 − e² sin² φ) / cos φ.
      const hand = Math.sqrt(1 - wgs84.e2 * Math.sin(phi) ** 2) / Math.cos(phi);
      results.push({
        ...base,
        id: `${base.id}.k-${latitude}`,
        title: `EPSG:3857's parallel scale at ${latitude}° against sqrt(1 − e² sin² φ) / cos φ (WGS 84), within 1e-9`,
        pass: true,
        value: Math.abs(k - hand),
        tolerance: HAND_FORMULA,
        detail: `k ${k}, by hand ${hand}; the sphere's 1/cos φ is ${1 / Math.cos(phi)}`,
      });
    }
    const x = cited<{
      forward: { latitude: string; longitude: string };
      distortion: { h: string; k: string; omega: string };
    }>("iogp-pseudo-mercator");
    const lat = sexagesimal(x.forward.latitude);
    const atIogp = gridFactors(
      frame,
      frame.fromBodyFixed(
        onEarth(sexagesimal(x.forward.longitude).value, lat.value),
      ),
    );
    const kPrinted = printed(x.distortion.k);
    const hPrinted = printed(x.distortion.h);
    const omegaPrinted = sexagesimal(x.distortion.omega);
    results.push(
      {
        ...base,
        id: `${base.id}.k-iogp`,
        title: `EPSG:3857's parallel scale at ${x.forward.latitude} against IOGP 373-7-2's printed k = ${x.distortion.k}, within half a unit of its last digit`,
        pass: true,
        value: Math.abs(atIogp.pointScale - kPrinted.value),
        tolerance: kPrinted.half + FACTOR_PATH,
        detail: `k ${atIogp.pointScale}`,
      },
      {
        ...base,
        id: `${base.id}.h-iogp`,
        title: `EPSG:3857's meridional scale at ${x.forward.latitude} against IOGP 373-7-2's printed h = ${x.distortion.h}, within half a unit of its last digit`,
        pass: true,
        value: Math.abs(atIogp.meridionalScale - hPrinted.value),
        tolerance: hPrinted.half + NUMERICAL_LATITUDE_DERIVATIVE,
        detail: `h ${atIogp.meridionalScale}`,
      },
      {
        ...base,
        id: `${base.id}.omega-iogp`,
        title: `EPSG:3857's maximum angular distortion at ${x.forward.latitude} against IOGP 373-7-2's printed ω = ${x.distortion.omega}, within half a unit of its last digit`,
        pass: true,
        value:
          Math.abs(atIogp.angularDistortion / DEGREE - omegaPrinted.value) *
          3600,
        tolerance: omegaPrinted.half * 3600 + ANGLE_PATH,
        unit: "″",
        detail: `ω ${fmt((atIogp.angularDistortion / DEGREE) * 3600, 8)}″`,
      },
    );
    return results;
  },
);

const webMercatorLineCase = stressCase(
  "distortion.web-mercator-line",
  "distortion",
  "A 100 km east–west line at 60° measured on the EPSG:3857 grid against its true (geodesic) length: the overstatement matches a·∆λ − N cos φ ∆λ within 2%",
  ["proj"],
  async (ctx, base) => {
    const frame = webMercatorFrame(ctx);
    const wgs84 = ellipsoidOf("epsg-ellipsoid-wgs84");
    // A line east along the 60th parallel whose true length is about 100 km.
    const r60 = radii(wgs84.a, wgs84.e2, 60);
    const dLambda = 100_000 / (r60.N * Math.cos(60 * DEGREE)); // radians
    const a = onEarth(0, 60);
    const b = onEarth(dLambda / DEGREE, 60);
    const da = frame.fromBodyFixed(a);
    const db = frame.fromBodyFixed(b);
    const grid = Math.abs(db[0]! - da[0]!) * frame.units.metersPerUnit;
    const truth = surfaceDistance(EARTH.ellipsoid, a, b).distance;
    const effect = grid - truth;
    // By hand: the grid length is a·∆λ (E = a λ), the true one the parallel's
    // arc N cos φ ∆λ (a geodesic is shorter by about 3 m in 100 km).
    const handEffect =
      wgs84.a * dLambda - r60.N * Math.cos(60 * DEGREE) * dLambda;
    return [
      {
        ...base,
        pass: true,
        value: Math.abs(effect / handEffect - 1),
        tolerance: EFFECT,
        detail: `grid ${fmt(grid / 1000, 7)} km, true ${fmt(truth / 1000, 7)} km; by hand ${fmt(handEffect / 1000, 7)} km too long`,
        effect: {
          value: effect / 1000,
          unit: "km",
          label:
            "how much longer a 100 km line at 60° is on the Web Mercator grid",
        },
      },
    ];
  },
);

interface OcrsHandbook {
  readonly designTarget: { readonly text: string };
  readonly portlandZone: {
    readonly standardParallelAndGridOrigin: string;
    readonly centralMeridian: string;
    readonly scale: string;
  };
  readonly portlandTestPoints: {
    readonly points: readonly {
      readonly name: string;
      readonly latitude: string;
      readonly longitude: string;
      readonly northing: string;
      readonly easting: string;
    }[];
  };
}

/** The OCRS Portland zone (m) and Oregon North (SPCS 83, m), NAD83(2011): EPSG registry codes. */
const OCRS_PORTLAND = 6854;
const OREGON_NORTH = 6558;

/**
 * The point scale of a Lambert Conformal Conic projection, by hand from
 * Snyder (1987) eqs. (14-15), (15-9), (15-8) and (15-6): k = k0 m1 t^n /
 * (m t1^n), with n = sin φ1 for one standard parallel (scaled by k0).
 */
function lambertScale(
  e2: number,
  phi1: number,
  phi2: number,
  k0: number,
  phi: number,
): number {
  const e = Math.sqrt(e2);
  const m = (p: number) => Math.cos(p) / Math.sqrt(1 - e2 * Math.sin(p) ** 2);
  const t = (p: number) =>
    Math.tan(Math.PI / 4 - p / 2) /
    ((1 - e * Math.sin(p)) / (1 + e * Math.sin(p))) ** (e / 2);
  const n =
    phi1 === phi2
      ? Math.sin(phi1)
      : (Math.log(m(phi1)) - Math.log(m(phi2))) /
        (Math.log(t(phi1)) - Math.log(t(phi2)));
  return (k0 * m(phi1) * t(phi) ** n) / (m(phi) * t(phi1) ** n);
}

const lowDistortionCase = stressCase(
  "distortion.low-distortion",
  "distortion",
  "The Oregon Coordinate Reference System's Portland zone (EPSG:6854): the handbook's test points to five decimals, and at a point in the zone at its design height its distortion is within the handbook's ±10 ppm target and smaller than Oregon North state plane's",
  ["proj"],
  async (ctx, base) => {
    const P = proj(ctx);
    const hb = cited<OcrsHandbook>("ocrs-handbook");
    const ldp = EngineeringFrame.create(
      { name: "OCRS Portland zone", body: EARTH, crs: epsg(OCRS_PORTLAND) },
      P,
    );
    const spc = EngineeringFrame.create(
      { name: "Oregon North", body: EARTH, crs: epsg(OREGON_NORTH) },
      P,
    );
    const results: StressResult[] = [];
    // The handbook's software check: "your grid coordinates should match these
    // results exactly to five decimal places" (the inputs are exact).
    let worst = 0;
    let half = 0;
    const lines: string[] = [];
    for (const p of hb.portlandTestPoints.points) {
      const design = ldp.fromBodyFixed(
        onEarth(
          sexagesimal(p.longitude, -1).value,
          sexagesimal(p.latitude).value,
        ),
      );
      const n = printed(p.northing);
      const e = printed(p.easting);
      half = Math.max(half, n.half, e.half);
      worst = Math.max(
        worst,
        Math.abs(design[1]! - n.value),
        Math.abs(design[0]! - e.value),
      );
      lines.push(
        `${p.name} N ${design[1]!.toFixed(6)} E ${design[0]!.toFixed(6)}`,
      );
    }
    results.push({
      ...base,
      id: `${base.id}.test-points`,
      title:
        "The OCRS handbook's Portland zone test points (Appendix A): northings and easting to five decimal places",
      pass: true,
      value: worst,
      tolerance: half + INVERSE_RESIDUAL,
      unit: "m",
      detail: lines.join("; "),
    });

    // Portland1, at the zone's design height h0 = (k0 − 1) RG (handbook step 3).
    const grs80 = ellipsoidOf("epsg-ellipsoid-grs80");
    const point = hb.portlandTestPoints.points[0]!;
    const lat = sexagesimal(point.latitude).value;
    const lon = sexagesimal(point.longitude, -1).value;
    const rg = radii(grs80.a, grs80.e2, lat).gaussian;
    const k0 = printed(hb.portlandZone.scale).value;
    const h0 = (k0 - 1) * rg;
    const target = printed(
      /±(\d+) ppm/.exec(hb.designTarget.text)?.[1] ?? "NaN",
    ).value;
    const distortionOf = (frame: EngineeringFrame) => {
      const flat = frame.fromBodyFixed(onEarth(lon, lat, h0));
      return (gridFactors(frame, flat).combinedFactor - 1) * 1e6;
    };
    const ldpPpm = distortionOf(ldp);
    const spcPpm = distortionOf(spc);
    // By hand (handbook step 4): δ = k RG / (RG + h) − 1, with k from Snyder.
    const phi = lat * DEGREE;
    const ldpPhi =
      sexagesimal(hb.portlandZone.standardParallelAndGridOrigin).value * DEGREE;
    const elevation = rg / (rg + h0);
    const handLdp =
      (lambertScale(grs80.e2, ldpPhi, ldpPhi, k0, phi) * elevation - 1) * 1e6;
    const on = cited<{
      parameters: readonly (readonly [string, string, string])[];
    }>("epsg-oregon-north");
    // EPSG's sexagesimal DMS: 46.0 is 46°00', 44.2 is 44°20'.
    const dms = (name: string) => {
      const v = printed(
        on.parameters.find((q) => q[0] === name)?.[1] ?? "NaN",
      ).value;
      const d = Math.trunc(v);
      return (d + Math.round((v - d) * 100) / 60) * DEGREE;
    };
    const handSpc =
      (lambertScale(
        grs80.e2,
        dms("Latitude of 1st standard parallel"),
        dms("Latitude of 2nd standard parallel"),
        1,
        phi,
      ) *
        elevation -
        1) *
      1e6;
    results.push({
      ...base,
      id: `${base.id}.portland`,
      title: `OCRS Portland zone at ${point.name}, at the design height h0 = (k0 − 1)·RG: distortion within the handbook's ±${target} ppm target, matching δ = k·RG/(RG + h) − 1 by hand within 2%`,
      pass: Math.abs(ldpPpm) <= target,
      value: Math.abs(ldpPpm / handLdp - 1),
      tolerance: EFFECT,
      detail: `h0 ${fmt(h0, 5)} m; ${fmt(ldpPpm, 6)} ppm, by hand ${fmt(handLdp, 6)} ppm; target ±${target} ppm`,
      effect: {
        value: ldpPpm,
        unit: "ppm",
        label: "grid against ground in the OCRS Portland zone",
      },
    });
    results.push({
      ...base,
      id: `${base.id}.state-plane`,
      title: `Oregon North state plane (EPSG:6558) at the same point and height: its distortion, larger than the low-distortion zone's, matches δ by hand within 2%`,
      pass: Math.abs(ldpPpm) < Math.abs(spcPpm),
      value: Math.abs(spcPpm / handSpc - 1),
      tolerance: EFFECT,
      detail: `${fmt(spcPpm, 6)} ppm, by hand ${fmt(handSpc, 6)} ppm; the OCRS zone's ${fmt(ldpPpm, 6)} ppm`,
      effect: {
        value: spcPpm,
        unit: "ppm",
        label: "grid against ground on Oregon North state plane",
      },
    });
    return results;
  },
);

// ---------------------------------------------------------------------------
// Rigid placement budget (ruling F1: RigidPlacement against EngineeringFrame
// directly; Task 3's rigidVsExact wraps the same math).

const RIGID_SITES: readonly {
  readonly latitude: number;
  readonly longitude: number;
  readonly crs: number;
  readonly name: string;
}[] = [
  { latitude: 0, longitude: 3, crs: 32631, name: "WGS 84 / UTM zone 31N" },
  { latitude: 37, longitude: -123, crs: 32610, name: "WGS 84 / UTM zone 10N" },
  { latitude: 60, longitude: 9, crs: 32632, name: "WGS 84 / UTM zone 32N" },
  {
    latitude: 80,
    longitude: -45,
    crs: 3413,
    name: "WGS 84 / NSIDC Sea Ice Polar Stereographic North",
  },
];
const RIGID_TARGETS = [0.001, 0.01, 0.1]; // m
/** Each extent's separation and its curvature-formula extent (the plan's 10%). */
const RIGID_BUDGET = 0.1;

const rigidBudgetCase = stressCase(
  "rigid-placement-budget.extents",
  "rigid-placement-budget",
  "Ground-scaled site grids at latitudes 0°, 37°, 60° (UTM) and 80° (polar stereographic): how far from the origin rigid placement drifts 1 mm, 1 cm and 10 cm from the exact placement, against √(2Rε) with R the Gaussian mean radius, within 10%",
  ["proj"],
  async (ctx, base) => {
    const wgs84 = ellipsoidOf("epsg-ellipsoid-wgs84");
    const results: StressResult[] = [];
    for (const site of RIGID_SITES) {
      const plain = EngineeringFrame.create(
        { name: site.name, body: EARTH, crs: epsg(site.crs) },
        proj(ctx),
      );
      const origin = plain.fromBodyFixed(
        onEarth(site.longitude, site.latitude),
      );
      // Ground units: the site scale is the combined factor there (h = 0), so
      // a design metre is a metre on the ground, as rigid placement assumes.
      const scale = gridFactors(plain, origin).combinedFactor;
      const frame = EngineeringFrame.create(
        {
          name: `${site.name} site`,
          body: EARTH,
          crs: epsg(site.crs),
          site: { origin: [origin[0]!, origin[1]!, 0], rotation: 0, scale },
        },
        proj(ctx),
      );
      const rigid = RigidPlacement.at(frame, [0, 0, 0]);
      // East from the origin: along the central meridian's normal for UTM,
      // along the parallel for the polar stereographic (constant scale).
      const separation = (x: number) =>
        distance(rigid.toBodyFixed([x, 0, 0]), frame.toBodyFixed([x, 0, 0]));
      const R = radii(wgs84.a, wgs84.e2, site.latitude).gaussian;
      for (const target of RIGID_TARGETS) {
        let lo = 0;
        let hi = 10_000;
        for (let i = 0; i < 60; i++) {
          const mid = (lo + hi) / 2;
          if (separation(mid) < target) {
            lo = mid;
          } else {
            hi = mid;
          }
        }
        const extent = (lo + hi) / 2;
        const reached = separation(extent);
        const curvature = Math.sqrt(2 * R * target);
        const label =
          target >= 0.1
            ? `${target * 100} cm`
            : target >= 0.01
              ? "1 cm"
              : "1 mm";
        results.push({
          ...base,
          id: `${base.id}.lat-${site.latitude}-${label.replace(" ", "")}`,
          title: `Latitude ${site.latitude}° (${site.name}): the extent where rigid placement is off by ${label} is within 10% of √(2Rε) = ${fmt(curvature, 4)} m, and its separation within 10% of ${label}`,
          pass: Math.abs(reached / target - 1) <= RIGID_BUDGET,
          value: Math.abs(extent / curvature - 1),
          tolerance: RIGID_BUDGET,
          detail: `extent ${fmt(extent, 6)} m, separation there ${fmt(reached, 6)} m; R ${fmt(R, 7)} m; site scale ${fmt(scale, 10)}`,
          effect: {
            value: extent,
            unit: "m",
            label: `how far a rigidly placed site reaches before it is off by ${label} at ${site.latitude}°`,
          },
        });
      }
    }
    return results;
  },
);

// ---------------------------------------------------------------------------
// Coordinate epoch: NAD83(2011) against ITRF2014, and the hand-coded Helmert.

type EpsgParameter = readonly [string, string, string];

/** A Helmert transformation's parameters and rates from an EPSG record, in SI units. */
function epsgHelmert(parameters: readonly EpsgParameter[]) {
  const value = (name: string) => {
    const p = parameters.find((q) => q[0] === name);
    if (p === undefined) {
      throw new Error(`the EPSG record has no "${name}"`);
    }
    const unit: Record<string, number> = {
      metre: 1,
      "metres per year": 1,
      "milliarc-second": MILLIARCSECOND,
      "milliarc-seconds per year": MILLIARCSECOND,
      "parts per billion": 1e-9,
      "parts per billion per year": 1e-9,
      year: 1,
    };
    const factor = unit[p[2]];
    if (factor === undefined) {
      throw new Error(`unknown EPSG unit "${p[2]}"`);
    }
    return printed(p[1]).value * factor;
  };
  const set = (prefix: string): HelmertParameters => ({
    tx: value(`${prefix}X-axis translation`),
    ty: value(`${prefix}Y-axis translation`),
    tz: value(`${prefix}Z-axis translation`),
    rx: value(`${prefix}X-axis rotation`),
    ry: value(`${prefix}Y-axis rotation`),
    rz: value(`${prefix}Z-axis rotation`),
    ds: value(
      prefix === "" ? "Scale difference" : "Rate of change of scale difference",
    ),
  });
  return {
    parameters: set(""),
    rates: set("Rate of change of "),
    referenceEpoch: value("Parameter reference epoch"),
  };
}

/** IOGP's printed Helmert parameters ("+4.5 m", "–0.4254 msec", "+0.00971 ppm", "+1.42 mm/yr") in SI units. */
function iogpParameters(p: Record<string, string>): HelmertParameters {
  const value = (key: string) => {
    const [number, unit] = (p[key] ?? "").trim().split(/\s+/);
    const factor: Record<string, number> = {
      m: 1,
      mm: 1e-3,
      "mm/yr": 1e-3,
      sec: ARCSECOND,
      msec: MILLIARCSECOND,
      "msec/yr": MILLIARCSECOND,
      ppm: 1e-6,
      "ppm/yr": 1e-6,
    };
    const f = factor[unit ?? ""];
    if (f === undefined) {
      throw new Error(`unknown IOGP unit in "${p[key]}"`);
    }
    return printed(number ?? "").value * f;
  };
  return {
    tx: value("tX"),
    ty: value("tY"),
    tz: value("tZ"),
    rx: value("rX"),
    ry: value("rY"),
    rz: value("rZ"),
    ds: value("dS"),
  };
}

/** The plan's coordinate-epoch tolerance. */
const EPOCH_TOLERANCE = 1e-3; // m

const coordinateEpochCase = stressCase(
  "coordinate-epoch.nad83-itrf2014",
  "coordinate-epoch",
  "A California point in NAD83(2011) (NGS GU2195) against ITRF2014 at epochs 2010.0 and 2026.0: the library matches the hand-coded EPSG 8970 time-dependent Helmert within 1 mm, and the hand Helmert reproduces IOGP 373-7-2's worked examples",
  ["proj"],
  async (ctx, base) => {
    const results: StressResult[] = [];
    const xyzOf = (values: readonly string[]) => values.map((v) => printed(v));
    const worstOf = (a: ArrayLike<number>, b: readonly Printed[]) =>
      Math.max(...b.map((p, i) => Math.abs(a[i]! - p.value)));

    // 1. The helper against IOGP's position-vector example (WGS 72 to WGS 84).
    const pv = cited<{
      parameters: Record<string, string>;
      sourceXYZ: string[];
      targetXYZ: string[];
    }>("iogp-helmert-position-vector");
    const pvTarget = xyzOf(pv.targetXYZ);
    const pvOut = helmert(
      xyzOf(pv.sourceXYZ).map((p) => p.value),
      iogpParameters(pv.parameters),
      { convention: "position-vector" },
    );
    results.push({
      ...base,
      id: `${base.id}.helmert-iogp-position-vector`,
      title:
        "The hand-coded Helmert reproduces IOGP 373-7-2's position vector example (WGS 72 to WGS 84) within half a unit of its last digit plus its inputs' own rounding",
      pass: true,
      value: worstOf(pvOut, pvTarget),
      // The output's last digit and the inputs' (XT moves with XS one to one).
      tolerance:
        Math.max(...pvTarget.map((p) => p.half)) +
        Math.max(...xyzOf(pv.sourceXYZ).map((p) => p.half)) +
        1e-9,
      unit: "m",
      detail: `computed ${pvOut.map((v) => v.toFixed(4)).join(", ")}`,
    });

    // 2. Against IOGP's time-dependent coordinate frame example, both ways.
    const td = cited<{
      parameters: Record<string, string>;
      rates: Record<string, string>;
      referenceEpoch: string;
      epoch: string;
      sourceXYZ: string[];
      targetXYZ: string[];
    }>("iogp-helmert-time-dependent");
    const tdParameters = iogpParameters(td.parameters);
    const tdRates = iogpParameters(td.rates);
    const tdTime = {
      convention: "coordinate-frame" as const,
      referenceEpoch: printed(td.referenceEpoch).value,
      epoch: printed(td.epoch).value,
    };
    const tdSource = xyzOf(td.sourceXYZ);
    const tdTarget = xyzOf(td.targetXYZ);
    const forward = helmert(
      tdSource.map((p) => p.value),
      tdParameters,
      { ...tdTime, rates: tdRates },
    );
    const reverse = helmert(
      tdTarget.map((p) => p.value),
      reversedHelmert(tdParameters),
      {
        ...tdTime,
        rates: reversedHelmert(tdRates),
      },
    );
    results.push({
      ...base,
      id: `${base.id}.helmert-iogp-time-dependent`,
      title:
        "The hand-coded Helmert reproduces IOGP 373-7-2's time-dependent coordinate frame example (ITRF2008 to GDA94 at 2013.90) forward and reversed, within half a unit of its last digit plus its inputs' own rounding",
      pass: true,
      value: Math.max(worstOf(forward, tdTarget), worstOf(reverse, tdSource)),
      tolerance:
        Math.max(...tdTarget.map((p) => p.half)) +
        Math.max(...tdSource.map((p) => p.half)) +
        1e-9,
      unit: "m",
      detail: `forward ${forward.map((v) => v.toFixed(4)).join(", ")}; reverse ${reverse.map((v) => v.toFixed(4)).join(", ")}`,
    });

    // 3. The library against EPSG 8970, reversed (NAD83(2011) to ITRF2014).
    const record = cited<{ parameters: readonly EpsgParameter[] }>("epsg-8970");
    const h8970 = epsgHelmert(record.parameters);
    const grs80 = ellipsoidOf("epsg-ellipsoid-grs80");
    const mark = cited<NgsMark>("ngs-GU2195");
    const lat = sexagesimal(mark.latitude).value;
    const lon = sexagesimal(mark.longitude).value;
    const h = printed(mark.ellipsoidHeight).value;
    const nad83 = geodeticToGeocentric(lon, lat, h, grs80.a, grs80.f);
    const hand = (epoch: number) =>
      helmert(nad83, reversedHelmert(h8970.parameters), {
        convention: "coordinate-frame",
        rates: reversedHelmert(h8970.rates),
        referenceEpoch: h8970.referenceEpoch,
        epoch,
      });
    const library = (epoch?: number) => {
      const op = resolveOperation(
        proj(ctx),
        epoch === undefined
          ? { format: "wkid", authority: "EPSG", wkid: 6319 }
          : { format: "wkid", authority: "EPSG", wkid: 6319, epoch },
        "EPSG:7912",
      );
      const g = op.forward([lon, lat, h]);
      return {
        xyz: geodeticToGeocentric(g[0]!, g[1]!, g[2]!, grs80.a, grs80.f),
        op,
      };
    };
    const at2010 = library(2010);
    const at2026 = library(2026);
    const noEpoch = library();
    const hand2010 = hand(2010);
    const hand2026 = hand(2026);
    for (const [epoch, lib, byHand] of [
      [2010, at2010.xyz, hand2010],
      [2026, at2026.xyz, hand2026],
    ] as const) {
      results.push({
        ...base,
        id: `${base.id}.epoch-${epoch}`,
        title: `GU2195 in ITRF2014 at epoch ${epoch}.0: the library's NAD83(2011) to ITRF2014 against the hand-coded EPSG 8970 (reversed), within 1 mm`,
        pass: true,
        value: distance(lib, byHand),
        tolerance: EPOCH_TOLERANCE,
        unit: "m",
        detail: `library ${lib.map((v) => v.toFixed(4)).join(", ")}; hand ${byHand.map((v) => v.toFixed(4)).join(", ")}; operation accuracy ${at2026.op.accuracy ?? "not stated"} m`,
      });
    }
    const libraryMove = sub3(at2026.xyz, at2010.xyz);
    const handMove = sub3(hand2026, hand2010);
    results.push({
      ...base,
      id: `${base.id}.difference`,
      title:
        "GU2195's ITRF2014 position from 2010.0 to 2026.0: the library's difference against the hand Helmert's, within 1 mm",
      pass: true,
      value: distance(libraryMove, handMove),
      tolerance: EPOCH_TOLERANCE,
      unit: "m",
      detail: `library moves ${fmt(norm(libraryMove), 6)} m, hand ${fmt(norm(handMove), 6)} m`,
      effect: {
        value: norm(libraryMove) * 100,
        unit: "cm",
        label:
          "how far a NAD83(2011) point moves in ITRF2014 from 2010 to 2026",
      },
    });
    // PROJ's "no epoch": the rates do not apply, which by hand is t = t0.
    const missing = distance(noEpoch.xyz, at2026.xyz);
    const handMissing = norm(handMove);
    results.push({
      ...base,
      id: `${base.id}.no-epoch`,
      title:
        "The same point with no coordinate epoch (the rates do not apply) against epoch 2026.0: the error of leaving the epoch out matches the hand Helmert's 16-year move within 2%",
      pass: distance(noEpoch.xyz, at2010.xyz) < EPOCH_TOLERANCE,
      value: Math.abs(missing / handMissing - 1),
      tolerance: EFFECT,
      detail: `no epoch is ${fmt(distance(noEpoch.xyz, at2010.xyz), 3)} m from epoch 2010.0 (the parameter reference epoch)`,
      effect: {
        value: missing * 100,
        unit: "cm",
        label: "the error of giving no coordinate epoch, for a 2026 position",
      },
    });
    return results;
  },
);

// ---------------------------------------------------------------------------
// Axes and the antimeridian

const axesCase = stressCase(
  "axes-and-the-antimeridian.axes",
  "axes-and-the-antimeridian",
  "Axis order: GU2195's latitude and longitude given as EPSG:4326 in the documented longitude-first order land on its published UTM coordinates, and a northing-first CRS (EPSG:31467) still takes design E east and N north",
  ["proj"],
  async (ctx, base) => {
    const mark = cited<NgsMark>("ngs-GU2195");
    const lat = sexagesimal(mark.latitude).value;
    const lon = sexagesimal(mark.longitude).value;
    // RecordedOperation's documented order: longitude before latitude.
    const op = resolveOperation(proj(ctx), epsg(4326), "EPSG:6339");
    const utm = op.forward([lon, lat, 0]);
    const north = printed(mark.utm.north).value;
    const east = printed(mark.utm.east).value;
    // DHDN / 3-degree Gauss-Kruger zone 3, whose EPSG axis order is northing
    // first. A point on its central meridian (E = FE = 3 500 000): its
    // longitude is 9° up to the datum shift; 1 km steps east and north move
    // the longitude by 1000/(N cos φ) and the latitude by 1000/M, by hand.
    const gk = EngineeringFrame.create(
      {
        name: "DHDN / 3-degree Gauss-Kruger zone 3",
        body: EARTH,
        crs: epsg(31467),
      },
      proj(ctx),
    );
    const p0 = gk.toGeodetic([3_500_000, 5_540_000, 0]);
    const pe = gk.toGeodetic([3_501_000, 5_540_000, 0]);
    const pn = gk.toGeodetic([3_500_000, 5_541_000, 0]);
    const wgs84 = ellipsoidOf("epsg-ellipsoid-wgs84");
    const r = radii(wgs84.a, wgs84.e2, p0.latitude / DEGREE);
    const handLon = 1000 / (r.N * Math.cos(p0.latitude));
    const handLat = 1000 / r.M;
    const eastError = Math.abs((pe.longitude - p0.longitude) / handLon - 1);
    const northError = Math.abs((pn.latitude - p0.latitude) / handLat - 1);
    const onMeridian = Math.abs(p0.longitude / DEGREE - 9) < 0.01;
    return [
      {
        ...base,
        id: `${base.id}.epsg-4326`,
        title: `GU2195's ${mark.latitude} ${mark.longitude} as EPSG:4326, longitude first, to NAD83(2011) / UTM zone 10N: within 1 mm of its published N ${mark.utm.north}, E ${mark.utm.east}`,
        pass: true,
        value: Math.hypot(utm[0]! - east, utm[1]! - north),
        tolerance: 1e-3,
        unit: "m",
        detail: `computed E ${utm[0]!.toFixed(4)}, N ${utm[1]!.toFixed(4)}; pipeline ${op.pipeline}`,
      },
      {
        ...base,
        id: `${base.id}.northing-first`,
        title:
          "EPSG:31467 (northing first in EPSG): design (3 500 000, 5 540 000) lies on the 9° meridian, and 1 km steps in design E and N move east and north by the hand-computed angles, within 2%",
        pass:
          onMeridian && Math.abs(pe.latitude - p0.latitude) < 0.01 * handLat,
        value: Math.max(eastError, northError),
        tolerance: EFFECT,
        detail: `origin ${fmt(p0.longitude / DEGREE, 9)}°E ${fmt(p0.latitude / DEGREE, 9)}°N; east step ${fmt((pe.longitude - p0.longitude) / DEGREE, 7)}° (hand ${fmt(handLon / DEGREE, 7)}°), north step ${fmt((pn.latitude - p0.latitude) / DEGREE, 7)}° (hand ${fmt(handLat / DEGREE, 7)}°)`,
      },
    ];
  },
);

const antimeridianCase = stressCase(
  "axes-and-the-antimeridian.antimeridian",
  "axes-and-the-antimeridian",
  "UTM zones 1 and 60 at ±179.999°: points round-trip within 1e-4 m, a design line across 180° in zone 60 has continuous E, and two equator points either side of 180° are 2a sin(∆λ/2) apart within 1e-9 m",
  ["proj"],
  async (ctx, base) => {
    const results: StressResult[] = [];
    for (const zone of [1, 60]) {
      const frame = EngineeringFrame.create(
        {
          name: `WGS 84 / UTM zone ${zone}N`,
          body: EARTH,
          crs: epsg(32600 + zone),
        },
        proj(ctx),
      );
      const designs = [-179.999, 179.999].flatMap((lon) =>
        [0, 45].map((lat) => frame.fromBodyFixed(onEarth(lon, lat))),
      );
      results.push({
        ...base,
        id: `${base.id}.zone-${zone}`,
        title: `UTM zone ${zone}N: points at ±179.999° (latitudes 0° and 45°) round-trip within 1e-4 m`,
        pass: true,
        value: worstRoundTrip(frame, designs),
        tolerance: DESIGN_ROUND_TRIP,
        unit: "m",
        detail: designs.map((d) => `E ${d[0]!.toFixed(3)}`).join(", "),
      });
      if (zone === 60) {
        // Longitudes 179.97° to −179.97° (180.03°) in 0.01° steps, across 180°.
        const steps = Array.from({ length: 7 }, (_, i) => {
          const lon = 179.97 + 0.01 * i;
          return frame.fromBodyFixed(
            onEarth(lon > 180 ? lon - 360 : lon, 0),
          )[0]!;
        });
        const deltas = steps.slice(1).map((e, i) => e - steps[i]!);
        const mean = deltas.reduce((s, d) => s + d, 0) / deltas.length;
        const spread = Math.max(...deltas.map((d) => Math.abs(d / mean - 1)));
        results.push({
          ...base,
          id: `${base.id}.zone-60-line`,
          title:
            "A design line across 180° in UTM zone 60N (179.97° to −179.97° at the equator): E increases in equal steps, with no jump",
          pass: deltas.every((d) => d > 0),
          value: spread,
          tolerance: 0.01,
          detail: `E steps ${deltas.map((d) => d.toFixed(3)).join(", ")} m`,
        });
      }
    }
    const wgs84 = ellipsoidOf("epsg-ellipsoid-wgs84");
    const a = framePoint(ctx.frames.itrf, onEarth(179.999, 0));
    const b = framePoint(ctx.frames.itrf, onEarth(-179.999, 0));
    const instant = utc(ctx, MEASURED_AT);
    const m = measure(a, b, instant, ctx.frames, { signal: false });
    // ∆λ/2 = π − λ for the float64 longitude λ the points are made of (their
    // longitudes are ±λ), with π in two parts: Math.PI is π less
    // 1.2246467991473532e-16, which at a = 6378 km is 1.6e-9 m of chord. So
    // the input's own rounding (λ is 179.999° only to 2e-16 rad, 1.4e-9 m)
    // is not counted against the library.
    const lambda = fromDegrees(179.999, 0).longitude;
    const halfGap = Math.PI - lambda + PI_REMAINDER;
    const hand = 2 * wgs84.a * Math.sin(halfGap);
    results.push({
      ...base,
      id: `${base.id}.chord`,
      title:
        "Equator points at 179.999° and −179.999°: their measured straight-line distance is 2a sin(∆λ/2) for ∆λ = 0.002°, within 1e-9 m",
      pass: true,
      value: Math.abs(m.distance - hand),
      tolerance: SAME_DISTANCE,
      unit: "m",
      detail: `measured ${m.distance} m, by hand ${hand} m (∆λ/2 = ${halfGap} rad)`,
      instant: instant.tdb(),
    });
    return results;
  },
);

// ---------------------------------------------------------------------------
// Space: DSS-43 and Orion against plan 3's SPICE fixture, and effect sizes.

/** Plan 3's tolerances (test/data/lightTime.test.ts): c·∆lt for DSS-43, and the Doppler ratio. */
const SPICE_LIGHT_TIME = 0.5; // m
const DOPPLER_RATIO = 3e-8;
/** Instants near the flyby from the OEM: Orion hidden by the Moon from DSS-43, and clear hours earlier. */
const BEHIND_MOON = "2026-04-06T23:04:00";
const BEFORE_OCCULTATION = "2026-04-06T20:00:00";

interface Constants {
  readonly c: number;
  readonly gmSun: number;
  readonly lc: number;
}

function iersConstants(): Constants {
  const t = cited<{ c: string; GMsun: string; LC: string }>(
    "iers-numerical-standards",
  );
  // "1.32712442099 × 10^20 m3 s−2": mantissa × 10^exponent.
  const scientific = (text: string) => {
    const [mantissa, exponent] = text.split("×").map((s) => s.trim());
    const power = /10\^([−-]?\d+)/.exec(exponent ?? "")?.[1] ?? "0";
    return printed(mantissa ?? "").value * 10 ** printed(power).value;
  };
  return {
    c: printed(t.c.split(" ")[0] ?? "").value,
    gmSun: scientific(t.GMsun),
    lc: scientific(t.LC),
  };
}

/** DSS-43 at an instant: DSN 810-005 301's 2003.0 position moved by its site velocity, ITRF metres. */
function dss43(t: Instant): number[] {
  const s = cited<{
    xyz: string[];
    epoch: string;
    velocity: { xyz: string[] };
  }>("dsn-dss43");
  // Decimal year: J2000 (TDB 0) is 2000-01-01T12:00, 2000.0 + 0.5 day.
  const year = 2000 + (t.tdb() / 86_400 + 0.5) / 365.25;
  const dt = year - printed(s.epoch).value;
  return s.xyz.map(
    (x, i) => printed(x).value + printed(s.velocity.xyz[i] ?? "").value * dt,
  );
}

type SignalRow = (typeof signalFixture.rows)[number];

const signalCase = stressCase(
  "space.dss43-orion",
  "space",
  "DSS-43 to Orion: the downlink's light time against plan 3's SPICE fixture within 0.5 m, and its Doppler ratio against the first-order formula from SPICE's direction within 3e-8",
  ["orion"],
  async (ctx, base) => {
    const { c } = iersConstants();
    const o = orion(ctx);
    const f = ctx.frames;
    const target = framePoint(o.frame, [0, 0, 0]);
    let worstLight = 0;
    let worstDoppler = 0;
    const used: string[] = [];
    const gaps: string[] = [];
    for (const row of signalFixture.rows as readonly SignalRow[]) {
      const t = Instant.fromTdb(row.tdb);
      const station = framePoint(f.itrf, dss43(t));
      let m: ReturnType<typeof measure>;
      try {
        m = measure(station, target, t, f, { shapiro: [] });
      } catch (error) {
        // The OEM's own gaps, which plan 3's SPK fills (its gap-fill kernel).
        if (/outside its data/.test(messageOf(error))) {
          gaps.push(`${row.kind} ${row.tdb}`);
          continue;
        }
        throw error;
      }
      const leg = m.signal!.downlink;
      const lt = row.dss43.CN.lt;
      worstLight = Math.max(worstLight, Math.abs(leg.lightTime - lt) * c);
      // First-order Doppler by hand: ratio = 1 − n·(vO − vS)/c, n the unit
      // vector to Orion from SPICE (CN, ICRF axes), vO Orion's OEM velocity
      // at emission, vS the station's, both Earth-centred in ICRF axes.
      const n = scale3(row.dss43.CN.position, 1 / norm(row.dss43.CN.position));
      const emitted = Instant.fromTdb(row.tdb - lt);
      const state = o.state(emitted);
      const vO = rotate(
        frameTransform(o.reference, f.earthIcrf, emitted),
        state.subarray(3, 6),
      );
      const at = (dt: number) =>
        apply(
          frameTransform(f.itrf, f.earthIcrf, Instant.fromTdb(row.tdb + dt)),
          dss43(t),
        );
      const vS = sub3(at(0.5), at(-0.5));
      const ratio = 1 - dot3(n, sub3(vO, vS)) / c;
      worstDoppler = Math.max(worstDoppler, Math.abs(leg.dopplerRatio - ratio));
      used.push(`${row.kind}: c·∆lt ${fmt((leg.lightTime - lt) * c, 3)} m`);
    }
    const enough = used.length * 2 >= signalFixture.rows.length;
    const gapNote =
      gaps.length > 0
        ? `; ${gaps.length} rows fall in the OEM's gaps (plan 3 used its SPK gap fill): ${gaps.join(", ")}`
        : "";
    return [
      {
        ...base,
        id: `${base.id}.light-time`,
        title:
          "DSS-43 receiving from Orion: the light time against plan 3's SPICE fixture (spkpos CN, no Shapiro delay), c·∆lt within plan 3's 0.5 m",
        pass: enough,
        value: worstLight,
        tolerance: SPICE_LIGHT_TIME,
        unit: "m",
        detail: `${used.length} rows: ${used.join("; ")}${gapNote}; DSS-43 from DSN 810-005 301 Rev. P with its plate velocity`,
      },
      {
        ...base,
        id: `${base.id}.doppler`,
        title:
          "DSS-43 receiving from Orion: the Doppler ratio against 1 − n·(vO − vS)/c with SPICE's direction and the OEM's velocity, within plan 3's 3e-8",
        pass: enough,
        value: worstDoppler,
        tolerance: DOPPLER_RATIO,
        detail: `${used.length} rows${gapNote}`,
      },
    ];
  },
);

const lineOfSightCase = stressCase(
  "space.line-of-sight",
  "space",
  "Line of sight from DSS-43 to Orion near the flyby, behind the Moon at 23:04 UTC and clear at 20:00 UTC: each verdict agrees with hand geometry (the angle to Orion against the Moon's angular radius asin(1737.4 km / distance), and whether Orion is farther)",
  ["orion"],
  async (ctx, base) => {
    const { c } = iersConstants();
    const radius =
      printed(cited<{ radiusKm: string }>("naif-moon-radius").radiusKm).value *
      1000;
    const o = orion(ctx);
    const f = ctx.frames;
    const results: StressResult[] = [];
    for (const [iso, expectBlocked] of [
      [BEHIND_MOON, true],
      [BEFORE_OCCULTATION, false],
    ] as const) {
      const t = utc(ctx, iso);
      const stationItrf = dss43(t);
      const m = measure(
        framePoint(f.itrf, stationItrf),
        framePoint(o.frame, [0, 0, 0]),
        t,
        f,
      );
      const station = apply(
        frameTransform(f.itrf, f.earthIcrf, t),
        stationItrf,
      );
      // Positions at emission, Earth-centred ICRF axes (two light-time passes).
      const seen = (place: (at: Instant) => ArrayLike<number>) => {
        let p = place(t);
        for (let i = 0; i < 2; i++) {
          p = place(Instant.fromTdb(t.tdb() - distance(p, station) / c));
        }
        return sub3(p, station);
      };
      const moon = seen((at) =>
        frameTransform(f.moonIcrf, f.earthIcrf, at).subarray(12, 15),
      );
      const craft = seen((at) =>
        apply(
          frameTransform(o.reference, f.earthIcrf, at),
          o.state(at).subarray(0, 3),
        ),
      );
      const angle = angle3(moon, craft);
      const limb = Math.asin(radius / norm(moon));
      const blocked = angle < limb && norm(craft) > norm(moon);
      const clear = m.lineOfSight?.clear;
      results.push({
        ...base,
        id: `${base.id}.${expectBlocked ? "behind-moon" : "clear"}`,
        title: `DSS-43 to Orion at ${iso} UTC: ${expectBlocked ? "hidden by the Moon" : "clear"}, by the library and by hand geometry`,
        pass: clear === !blocked && blocked === expectBlocked,
        detail: `library: ${clear ? "clear" : `blocked by ${m.lineOfSight?.blockedBy?.name ?? "?"}`}; hand: Orion ${fmt(angle / DEGREE, 6)}° from the Moon's centre, limb ${fmt(limb / DEGREE, 6)}°, Orion ${fmt(norm(craft) / 1000, 7)} km away and the Moon ${fmt(norm(moon) / 1000, 7)} km`,
        instant: t.tdb(),
      });
    }
    return results;
  },
);

const spaceEffectsCase = stressCase(
  "space.effects",
  "space",
  "Effect sizes at the Moon: the EME2000 frame bias, the GCRF scale, MOON_ME against MOON_PA at the south pole, each against its published values composed by hand within 2%, and the Earth-orientation uncertainty (display only)",
  ["orion"],
  async (ctx, base) => {
    const f = ctx.frames;
    const t = utc(ctx, FLYBY);
    const { c, gmSun, lc } = iersConstants();
    const results: StressResult[] = [];
    const moonDistance = norm(
      frameTransform(f.moonIcrf, f.earthIcrf, t).subarray(12, 15),
    );

    // 1. The frame bias: a point at the Moon's distance on EARTH_ICRF's x axis,
    //    in EME2000. To first order the bias rotates by (−η0, ξ0, dα0) about
    //    the axes, so on the x axis it moves r·sqrt(ξ0² + dα0²) (IERS 2010).
    const bias = cited<{ xi0: string; eta0: string; dalpha0: string }>(
      "iers-frame-bias",
    );
    const first = (text: string) =>
      printed(text.split("±")[0]!.trim()).value * ARCSECOND;
    const xi0 = first(bias.xi0);
    const dalpha0 = first(bias.dalpha0);
    const onX = framePoint(f.earthIcrf, [moonDistance, 0, 0], t);
    const biased = distance(
      convertPoint(onX, f.eme2000).position,
      onX.position,
    );
    const handBias = moonDistance * Math.hypot(xi0, dalpha0);
    results.push({
      ...base,
      id: `${base.id}.frame-bias`,
      title:
        "The EME2000 frame bias at the Moon's distance: a point on EARTH_ICRF's x axis moves r·sqrt(ξ0² + dα0²) (IERS Conventions 2010), within 2%",
      pass: true,
      value: Math.abs(biased / handBias - 1),
      tolerance: EFFECT,
      detail: `${fmt(biased, 6)} m, by hand ${fmt(handBias, 6)} m at r ${fmt(moonDistance / 1000, 7)} km`,
      effect: {
        value: biased,
        unit: "m",
        label: "the EME2000 frame bias at the Moon's distance",
      },
      instant: t.tdb(),
    });

    // 2. The GCRF scale, eq. 11.19, at the Moon's distance perpendicular to
    //    the Earth's barycentric velocity V (so its V term vanishes):
    //    |∆r| = r (U/c² + LC), U = GM☉/r☉.
    const earthAt = (dt: number) =>
      frameTransform(
        f.earthIcrf,
        f.icrf,
        Instant.fromTdb(t.tdb() + dt),
      ).subarray(12, 15);
    const V = scale3(sub3(earthAt(1), earthAt(-1)), 0.5);
    const across = cross3(V, [0, 0, 1]);
    const p = scale3(across, moonDistance / norm(across));
    const inGcrf = framePoint(f.gcrf, p, t);
    const scaled = distance(convertPoint(inGcrf, f.earthIcrf).position, p);
    const sunDistance = norm(
      frameTransform(f.hcrs, f.earthIcrf, t).subarray(12, 15),
    );
    const handScale = moonDistance * (gmSun / (c * c * sunDistance) + lc);
    results.push({
      ...base,
      id: `${base.id}.gcrf-scale`,
      title:
        "The GCRF (TT-compatible) against EARTH_ICRF (TDB-compatible) at the Moon's distance: r·(GM☉/(c² r☉) + LC), eq. 11.19, within 2%",
      pass: true,
      value: Math.abs(scaled / handScale - 1),
      tolerance: EFFECT,
      detail: `${fmt(scaled, 6)} m, by hand ${fmt(handScale, 6)} m (r☉ ${fmt(sunDistance / 1e9, 7)} million km)`,
      effect: {
        value: scaled,
        unit: "m",
        label: "the GCRF's TT scale at the Moon's distance",
      },
      instant: t.tdb(),
    });

    // 3. MOON_ME against MOON_PA at the lunar south pole: the DE440 angles
    //    (67.8526″ about z, 78.6944″ about y, 0.2785″ about x) composed to
    //    first order; at the pole only the x and y rotations move the point.
    const me = cited<{ angles: string[]; axes: number[] }>(
      "naif-moon-me-de440",
    );
    const about = (axis: number) =>
      printed(me.angles[me.axes.indexOf(axis)] ?? "NaN").value * ARCSECOND;
    const radius =
      printed(cited<{ radiusKm: string }>("naif-moon-radius").radiusKm).value *
      1000;
    const pole = framePoint(f.moonPa, [0, 0, -radius], t);
    const moved = distance(
      convertPoint(pole, f.moonMe).position,
      pole.position,
    );
    const handPole = radius * Math.hypot(about(1), about(2));
    results.push({
      ...base,
      id: `${base.id}.moon-me-pa`,
      title:
        "MOON_ME against MOON_PA at the lunar south pole: R·sqrt(θx² + θy²) from the DE440 frame kernel's angles, within 2%",
      pass: true,
      value: Math.abs(moved / handPole - 1),
      tolerance: EFFECT,
      detail: `${fmt(moved, 6)} m, by hand ${fmt(handPole, 6)} m`,
      effect: {
        value: moved,
        unit: "m",
        label: "MOON_ME against MOON_PA at the lunar south pole",
      },
      instant: t.tdb(),
    });

    // 4. Earth orientation's uncertainty at the clock's instant (display only).
    const station = dss43(t);
    const m = measure(
      framePoint(f.itrf, station),
      framePoint(orion(ctx).frame, [0, 0, 0]),
      t,
      f,
      { signal: false },
    );
    const eop = m.accuracy.terms.find(
      (term) => term.source === "earthOrientation",
    );
    const meters = eop?.meters;
    results.push({
      ...base,
      id: `${base.id}.earth-orientation`,
      title:
        "Earth orientation's uncertainty at the flyby, at DSS-43 on the Earth's surface (display only)",
      pass: meters !== undefined,
      detail:
        eop === undefined
          ? "no Earth-orientation term"
          : `${fmt(meters ?? NaN, 4)} m: ${eop.note}`,
      effect: {
        value: meters ?? NaN,
        unit: "m",
        label: "Earth orientation's uncertainty at DSS-43",
      },
      instant: t.tdb(),
    });
    results.push({
      ...base,
      id: `${base.id}.earth-orientation-angle`,
      title:
        "Earth orientation's uncertainty at the flyby as an angle toward Orion (display only)",
      pass: meters !== undefined,
      detail: `${fmt(meters === undefined ? NaN : meters / norm(station) / ARCSECOND, 4)}″: the same uncertainty over DSS-43's ${fmt(norm(station) / 1000, 6)} km from the Earth's centre`,
      effect: {
        value: meters === undefined ? NaN : meters / norm(station) / ARCSECOND,
        unit: "″",
        label: "Earth orientation's uncertainty toward Orion",
      },
      instant: t.tdb(),
    });
    return results;
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
  ...NGS_MARKS.map(ngsCase),
  ...IOGP_EXAMPLES.filter((e) => e.id !== "transverse-mercator").map((e) =>
    iogpCase(e, "forward"),
  ),
  ...IOGP_EXAMPLES.map((e) => iogpCase(e, "reverse")),
  clothoidReferenceCase,
  verticalCurveCase,
  gradeToGradeCase,
  webMercatorScaleCase,
  webMercatorLineCase,
  lowDistortionCase,
  rigidBudgetCase,
  coordinateEpochCase,
  axesCase,
  antimeridianCase,
  signalCase,
  lineOfSightCase,
  spaceEffectsCase,
];

/**
 * Cases held out of the catalog: each fails against a published value, and
 * the task 1b report gives the numbers for a ruling. They are not loosened.
 * The data test runs them and expects them to fail, so a fix shows.
 *
 *  - reference-values.iogp-transverse-mercator-forward: IOGP prints
 *    E 577274.99, N 69740.50; the library gives 577274.9838, 69740.4923,
 *    7.7 mm off (half a unit is 5 mm). An independent Krüger series to n^6
 *    agrees with the library, and reproduces the Ordnance Survey's own
 *    example; the source's JHS figures appear rounded.
 */
export const HELD_CASES: readonly StressCase[] = [
  iogpCase(
    IOGP_EXAMPLES.find((e) => e.id === "transverse-mercator")!,
    "forward",
  ),
];
