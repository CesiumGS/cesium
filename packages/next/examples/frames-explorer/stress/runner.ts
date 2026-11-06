// The stress-test runner: result and case types, judging (R7, R12) and
// running with needs loaded once (R6, R13).
import { type CrsRef, resolveOperation } from "../../../src/engineering/crs.ts";
import type { ProjApi } from "../../../src/engineering/proj.ts";
import type { Frames } from "../../../src/frames/frames.ts";
import type { AccuracyStatement } from "../../../src/measure/accuracy.ts";
import { Trajectory } from "../../../src/trajectory/Trajectory.ts";
import { ORION_OEM } from "./shared.ts";

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

export const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** A number with `digits` significant figures, without trailing zeros. */
export const fmt = (x: number, digits = 3): string =>
  Number.isFinite(x) ? String(Number(x.toPrecision(digits))) : String(x);

/** An effect's size for display, apart from any verdict (R11). */
export function formatEffect(effect: NonNullable<StressResult["effect"]>) {
  return `${fmt(effect.value, 7)} ${effect.unit}: ${effect.label}`;
}

/** A plain copy of an accuracy statement (R8, R13). */
export function plainAccuracy(a: AccuracyStatement): AccuracyStatement {
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

export type ResultBase = Pick<StressResult, "id" | "group" | "title">;

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

export const GEOID = "us_noaa_g2018u0.tif";

/** NAD83(2011) / California zone 3 (ftUS) + NAVD88 height (ftUS). */
export const CALIFORNIA: CrsRef = {
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
  /** The cases to run (runStress's default: the catalog, `STRESS_CASES`). */
  readonly cases?: readonly StressCase[];
  /**
   * Recorded fingerprints by result id (fingerprints.json). When given, every
   * fingerprinted result is compared with its record, and a mismatch or a
   * missing record fails it (R12).
   */
  readonly fingerprints?: Readonly<Record<string, Fingerprint>>;
}

/**
 * Runs `cases` in order and judges each result: the case's own
 * verdict, its value against its tolerance, its expected error (R7) and its
 * fingerprint (R12). A case whose needs can't be met gives one skipped result
 * (pass false, `missing`, and a `detail` saying what to do); a case that
 * throws gives a failed result with the error. It never rejects for a case.
 */
export async function runCases(
  ctx: StressContext,
  cases: readonly StressCase[],
  options: RunOptions = {},
): Promise<StressResult[]> {
  const { signal, onResult, ids, fingerprints } = options;
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
