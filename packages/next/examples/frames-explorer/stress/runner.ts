// The stress-test runner: result and case types, judging (R7, R12) and
// running with needs loaded once (R6, R13).
import { type CrsRef, resolveOperation } from "../../../src/engineering/crs.ts";
import type { ProjApi } from "../../../src/engineering/proj.ts";
import type { Frames } from "../../../src/frames/frames.ts";
import type { AccuracyStatement } from "../../../src/measure/accuracy.ts";
import { Trajectory } from "../../../src/trajectory/Trajectory.ts";
import {
  type Citation,
  type GroupInfo,
  type TraceStep,
  groupInfo,
} from "./groupInfo.ts";
import { citation, collectCitations } from "./references.ts";
import { ORION_OEM } from "./shared.ts";

export {
  LENSES,
  type Citation,
  type Comparison,
  type Lens,
  type TraceStep,
} from "./groupInfo.ts";

/**
 * Data a case may need: the frame tree (frame data), PROJ, GEOID18, the
 * Artemis II trajectory (which is placed in the frame tree, so it brings the
 * frame data with it), the country geoid grids from the PROJ-data catalog
 * (`CatalogGridSet` "geoids", Task 21) or EGM2008 (opt-in, `StressCase.optIn`).
 */
export type Need = "frames" | "proj" | "geoid" | "orion" | "grids" | "egm2008";

/**
 * The PROJ-data catalog's grids a run loads beyond GEOID18 (Task 21):
 * "geoids", the global geoids' country grids (about 19 MB), and "egm2008",
 * NGA's global grid (80.6 MB), which loads only when the user opts in.
 */
export type CatalogGridSet = "geoids" | "egm2008";

/**
 * A case read data it needs only optionally (`optionalNeeds`), and the data
 * didn't load: the case reports that part as missing instead of failing.
 */
export class NeedMissingError extends Error {
  override name = "NeedMissingError";
  readonly need: Need;
  constructor(need: Need, reason: string) {
    super(`${need}: ${reason}`);
    this.need = need;
  }
}

export const isNeedMissing = (error: unknown): error is NeedMissingError =>
  error instanceof NeedMissingError;

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
  /**
   * Shown, not judged: an effect with no verdict (R11), such as a method
   * difference or an uncertainty. The runner gives it pass true whatever the
   * case said, and the cards' pass counts leave it out. It may carry no
   * tolerance and no expected error.
   */
  displayOnly?: boolean;
  fingerprint?: Fingerprint;
  /**
   * A result of the user's own input (R18's "Try your own", through
   * boundCrsChecks): shown in its card and the report, but left out of the
   * pass counts, the data test and the fingerprints.
   */
  userInput?: boolean;
  /** Set when the run compared `fingerprint` against a recorded one (R12). */
  fingerprintCheck?: { match: boolean; difference?: string };
  /** For a skipped case: the data that couldn't be had. */
  missing?: readonly Need[];
  /**
   * A case that runs only when the user opts in (EGM2008, 80.6 MB): its row
   * says "not run: opt-in", is shown, not judged (`displayOnly`), and offers
   * a button that loads the need and runs the case.
   */
  optIn?: { need: "egm2008"; bytes: number };
  /** The instant the result is for, TDB seconds past J2000. */
  instant?: number;
  /**
   * F27: the accuracy that applies when the result states no position
   * accuracy ("exact arithmetic: a round trip", "published value ± half its
   * last digit"): the case's own, else its group's (`withDefaults`).
   */
  accuracyNote?: string;
  /**
   * F28: the computation from input to output (R16): the case's own, else
   * one built from the result's fields (`withDefaults`).
   */
  trace?: TraceStep[];
  /**
   * F28: where the value it is compared with (or its input, F6) comes from:
   * the references.json entry the case cites (R10).
   */
  source?: Citation;
}

/**
 * What the runner is given (R5, R6, F44): each item already in hand, or a
 * loader the runner calls once, when the first case that needs it runs. A
 * missing item skips only the cases that need it.
 */
export interface DataContext {
  /** The frame tree, when the caller already has it; otherwise `loadFrames` is called once, when a case needs it. */
  readonly frames?: Frames;
  loadFrames?(): Promise<Frames>;
  /** PROJ, when the caller already has it; otherwise `loadProj` is called once, when a case needs it. */
  proj?: ProjApi;
  /** Orion's trajectory, when already loaded; otherwise `loadOrion` is called once, when a case needs it. */
  orion?: Trajectory;
  loadProj(): Promise<ProjApi>;
  loadOrion(): Promise<Trajectory>;
  /**
   * The store's NAIF DSN station SPK (`STATIONS_SPK`), its bytes, fetched
   * once when the dish scenario first asks for a station (Task 6b). Absent,
   * the scenario says the stations aren't in the store.
   */
  loadStations?(): Promise<ArrayBuffer>;
  /**
   * Makes GEOID18 available to `loadProj`'s PROJ (the browser fetches the
   * grid). Absent when PROJ already finds it (Node reads the grids beside
   * proj.db). The runner then checks that NAVD88 heights resolve through it.
   */
  loadGeoid?(): Promise<void>;
  /**
   * Loads a set of the PROJ-data catalog's grids into `loadProj`'s PROJ,
   * each verified against the catalog (the browser's `/proj-grids/`, Node's
   * store `grids/`; the global geoids, Task 21), reporting its bytes. It
   * rejects with `MissingDataError` for grids the store doesn't have (the
   * case is skipped), and with any other error for grids that fail their
   * check (the case fails). Absent, the cases that need it are skipped.
   */
  loadCatalogGrids?(set: CatalogGridSet): Promise<void>;
  /**
   * Whether the user opted in to an opt-in need (EGM2008's 80.6 MB: the
   * row's button). Absent, nothing is opted in, so "Run all" never fetches
   * it; Node's catalog test opts in.
   */
  optedIn?(need: "egm2008"): boolean;
  /** The frames store's manifest, for the fingerprints' grid SHA-256 values. */
  readonly manifest?: StoreManifest;
  /** Fetches the manifest, called once when a case with a need runs. */
  loadManifest?(): Promise<StoreManifest>;
}

/**
 * What a case gets. `frames` is there only for a case that declares the
 * "frames" need (or an Orion need); reading it otherwise throws, so an
 * undeclared use fails loudly, even where the data is loaded. It is
 * enumerable, so spreading the context reads it (and throws the same way
 * for a case without the need). Under an
 * optional need it throws `NeedMissingError` when the data didn't load.
 */
export interface StressContext extends DataContext {
  readonly frames: Frames;
}

export interface StressCase {
  readonly id: string;
  readonly group: string;
  readonly title: string;
  readonly needs: readonly Need[];
  /**
   * Needs the case uses where it can and reports as missing where it can't
   * (a bound CRS's accuracy row needs the frame data; its other checks
   * don't). The case runs either way.
   */
  readonly optionalNeeds?: readonly Need[];
  /**
   * A need the case loads only when the user opted in (`optedIn`), and its
   * size; otherwise it gives one "not run: opt-in" row, shown, not judged.
   */
  readonly optIn?: { readonly need: "egm2008"; readonly bytes: number };
  /**
   * The references.json entries the case cited while it was made
   * (`stressCase` claims them); the runner adds the ones it cites while it
   * runs, and the first becomes its results' `source`.
   */
  readonly cites?: readonly string[];
  run(ctx: StressContext): Promise<StressResult[]>;
}

/** A question card (R14): the group's plain data (groupInfo.ts) and its headline. */
export interface StressGroup extends GroupInfo {
  /** The answer line for the card, from the group's results. */
  headline(results: readonly StressResult[]): string | undefined;
  /** A virtual group's membership (Reproducibility); others hold their own cases' results. */
  readonly collects?: (result: StressResult) => boolean;
}

import { isMissing, messageOf } from "../errors.ts";
export { messageOf };

/** A number with `digits` significant figures, without trailing zeros. */
export const fmt = (x: number, digits = 3): string =>
  Number.isFinite(x)
    ? powersOfTen(String(Number(x.toPrecision(digits))))
    : String(x);

const SUPERSCRIPT: Readonly<Record<string, string>> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "-": "⁻",
};

/**
 * JavaScript's e-notation written out, as DESIGN.md asks ("3.4 × 10⁻⁹",
 * never "3.4e-9"; Task 9, I13): "1e-8" is "10⁻⁸", "-2.5e+21" "−2.5 × 10²¹".
 * Anything else is left as it is.
 */
export function powersOfTen(text: string): string {
  const m = /^(-?)(\d+(?:\.\d+)?)e([+-]?\d+)$/.exec(text);
  if (!m) {
    return text;
  }
  const power = `10${m[3]!
    .replace("+", "")
    .split("")
    .map((c) => SUPERSCRIPT[c] ?? c)
    .join("")}`;
  const sign = m[1] ? "−" : "";
  return m[2] === "1" ? `${sign}${power}` : `${sign}${m[2]} × ${power}`;
}

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
    ...(a.warningCodes && { warningCodes: [...a.warningCodes] }),
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

/**
 * How many units in the last place two coordinates may differ by (rulings
 * F34, F36): 16 ULP of the point's magnitude, about 1.5e-8 m at the Earth's
 * radius. The worst browser-against-Node difference seen was 3.75 ULP, so 16
 * leaves room for another browser or PROJ build; real pipeline or grid drift
 * shows at millimetres and more, far above it.
 */
const COORDINATE_ULPS = 16;

/** One unit in the last place of |x| as a double (0 for 0). */
function ulp(x: number): number {
  const a = Math.abs(x);
  return a === 0 || !Number.isFinite(a)
    ? 0
    : 2 ** (Math.floor(Math.log2(a)) - 52);
}

/**
 * The difference between a recorded fingerprint and this run's, or undefined
 * when they agree (R12): the pipeline and grids exactly, and each coordinate
 * within 16 ULP of its point's magnitude (rulings F34a, F36). The magnitude is
 * the largest |coordinate| of the point's expected or actual triple, so a
 * component near 0 is held to the point's precision, not to a sub-picometre
 * one of its own. WebAssembly PROJ (musl libm) and native PROJ differ in the
 * last bits; a flat 1e-9 m is about 1 ULP at the Earth's radius, which no two
 * builds can promise.
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
  const e = expected.coordinates;
  const a = actual.coordinates;
  if (e.length !== a.length) {
    return `the coordinate count differs: expected ${e.length}, got ${a.length}`;
  }
  // The worst difference as a share of its limit, and that difference.
  let worstRatio = 0;
  let worst = 0;
  for (let p = 0; p < e.length; p += 3) {
    const end = Math.min(p + 3, e.length);
    let magnitude = 0;
    for (let i = p; i < end; i++) {
      magnitude = Math.max(magnitude, Math.abs(e[i]!), Math.abs(a[i]!));
    }
    const limit = COORDINATE_ULPS * ulp(magnitude);
    for (let i = p; i < end; i++) {
      const d = Math.abs(e[i]! - a[i]!);
      const ratio = Number.isNaN(d)
        ? Infinity
        : d === 0
          ? 0
          : limit === 0
            ? Infinity
            : d / limit;
      if (ratio > worstRatio) {
        worstRatio = ratio;
        worst = Number.isNaN(d) ? NaN : d;
      }
    }
  }
  return worstRatio > 1
    ? `the coordinates differ by up to ${fmt(worst)} m, ${fmt(worstRatio)}× the limit of ${COORDINATE_ULPS} ULP of the point's magnitude`
    : undefined;
}

/**
 * The runner's verdict on a result: every check, not the case's word alone
 * (its value against its tolerance, its expected error, R7, and its
 * fingerprint against `recorded`, R12, when given). Exported so a result made
 * outside the runner (R18's boundCrsChecks) is judged the same way.
 */
export function judgeResult(
  result: StressResult,
  recorded?: Readonly<Record<string, Fingerprint>>,
): StressResult {
  const reasons: string[] = [];
  let pass = result.displayOnly === true || result.pass === true;
  if (
    result.displayOnly === true &&
    (result.tolerance !== undefined || result.expectedError !== undefined)
  ) {
    pass = false;
    reasons.push(
      "a display-only result carries a tolerance or an expected error",
    );
  }
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

/** A number as copied: full precision, with its unit. */
const exact = (value: number, unit: string | undefined): string =>
  unit === undefined || unit === "" ? String(value) : `${value} ${unit}`;

/**
 * The trace a result shows when its case wrote none (F28, R16): what was
 * checked, the recorded operation and its grids, what the case computed,
 * then what came out against what was expected. Built from the result's own
 * fields only, so it never states more than the result does.
 */
export function defaultTrace(result: StressResult): TraceStep[] {
  const steps: TraceStep[] = [
    { kind: "input", label: "What is checked", value: result.title },
  ];
  const f = result.fingerprint;
  if (f !== undefined) {
    steps.push({
      kind: "step",
      label: "PROJ operation, as recorded",
      value: f.pipeline,
      code: true,
    });
    if (f.grids.length > 0) {
      steps.push({
        kind: "step",
        label: "Grids",
        value: f.grids.map((g) => `${g.name} sha256 ${g.sha256}`).join("\n"),
        code: true,
      });
    }
  }
  if (result.detail !== undefined && result.detail !== "") {
    steps.push({ kind: "step", label: "Computed", value: result.detail });
  }
  if (result.expectedError !== undefined) {
    steps.push({
      kind: "output",
      label: "Thrown",
      value: result.error ?? "nothing was thrown",
    });
    steps.push({
      kind: "expected",
      label: "Expected error",
      value: `/${result.expectedError}/`,
      code: true,
    });
    return steps;
  }
  if (result.error !== undefined) {
    steps.push({ kind: "output", label: "Threw", value: result.error });
  }
  if (result.effect !== undefined) {
    steps.push({
      kind: "output",
      label: result.effect.label,
      value: exact(result.effect.value, result.effect.unit),
    });
  }
  if (result.value !== undefined) {
    steps.push({
      kind: "output",
      label: "Deviation from the expected value",
      value: exact(result.value, result.unit),
    });
  }
  if (result.tolerance !== undefined) {
    steps.push({
      kind: "expected",
      label: "Tolerance",
      value: `|deviation| ≤ ${exact(result.tolerance, result.unit)}`,
    });
  }
  return steps;
}

/** references.json entries that are constants a case computes with (an ellipsoid's), not values it is compared with. */
const CONSTANTS = "epsg-ellipsoid-";

/**
 * Fills what the inspector needs and the case left out (rulings F27, F28):
 * the group's accuracy note when the result states no position accuracy,
 * its case's citation as its source when the case cites just one, and a
 * trace from its fields.
 */
export function withDefaults(
  result: StressResult,
  cites: readonly string[] = [],
): StressResult {
  // The case's one citation is its results' source. A case citing more than
  // one entry names each result's own (F28): a default would cite one
  // example for another's value. An ellipsoid's constants count only alone.
  const values = cites.filter((id) => !id.startsWith(CONSTANTS));
  const primary = values.length > 0 ? values : cites.slice(0, 1);
  const note =
    result.accuracy === undefined && result.accuracyNote === undefined
      ? groupInfo(result.group)?.accuracyNote
      : undefined;
  return {
    ...result,
    ...(note !== undefined && { accuracyNote: note }),
    ...(result.source === undefined &&
      primary.length === 1 && { source: citation(primary[0]!) }),
    ...(result.trace === undefined && { trace: defaultTrace(result) }),
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
export class Needs {
  private frames?: Promise<Loaded<Frames>>;
  private manifest?: Promise<Loaded<StoreManifest | undefined>>;
  private proj?: Promise<Loaded<ProjApi>>;
  private geoid?: Promise<Loaded<true>>;
  private orion?: Promise<Loaded<Trajectory>>;
  private readonly catalog = new Map<
    CatalogGridSet,
    Promise<{ ok: true } | { error: string; missing: boolean }>
  >();
  private readonly ctx: DataContext;

  constructor(ctx: DataContext) {
    this.ctx = ctx;
  }

  loadFrames(): Promise<Loaded<Frames>> {
    const { ctx } = this;
    this.frames ??= settle(
      ctx.frames !== undefined
        ? Promise.resolve(ctx.frames)
        : ctx.loadFrames !== undefined
          ? ctx.loadFrames()
          : Promise.reject(new Error("no frame data was given")),
    );
    return this.frames;
  }

  loadManifest(): Promise<Loaded<StoreManifest | undefined>> {
    const { ctx } = this;
    this.manifest ??= settle(
      ctx.manifest !== undefined
        ? Promise.resolve(ctx.manifest)
        : (ctx.loadManifest?.() ?? Promise.resolve(undefined)),
    );
    return this.manifest;
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

  /**
   * A set of catalog grids, loaded once per run: whether the store lacks
   * them (`MissingDataError`, or no loader) or they failed their check.
   */
  loadCatalogGrids(
    set: CatalogGridSet,
  ): Promise<{ ok: true } | { error: string; missing: boolean }> {
    const { ctx } = this;
    let loading = this.catalog.get(set);
    if (loading === undefined) {
      loading =
        ctx.loadCatalogGrids === undefined
          ? Promise.resolve({
              error: "this run has no PROJ-data catalog",
              missing: true,
            })
          : ctx.loadCatalogGrids(set).then(
              () => ({ ok: true as const }),
              (error: unknown) => ({
                error: messageOf(error),
                missing: isMissing(error),
              }),
            );
      this.catalog.set(set, loading);
    }
    return loading;
  }

  /**
   * The context for a case, or what is missing and why. `optional` needs are
   * loaded where they can be; the case reads them or gets `NeedMissingError`.
   * Catalog grids that fail their check (not missing: present and wrong)
   * fail the case instead (`failed`).
   */
  async meet(
    needs: readonly Need[],
    optional: readonly Need[] = [],
  ): Promise<
    | { ctx: StressContext }
    | { missing: Need[]; reasons: string[] }
    | { failed: string }
  > {
    const missing: Need[] = [];
    const reasons: string[] = [];
    let proj: ProjApi | undefined;
    let orion: Trajectory | undefined;
    // Orion's trajectory is placed in the frame tree: it needs the frames.
    const needsFrames = needs.includes("frames") || needs.includes("orion");
    const readsFrames = needsFrames || optional.includes("frames");
    let frames: Frames | undefined;
    let framesError = "";
    if (readsFrames) {
      const loaded = await this.loadFrames();
      if ("error" in loaded) {
        framesError = loaded.error;
        if (needsFrames) {
          missing.push("frames");
          reasons.push(
            `Needs the frame data, which did not load (${loaded.error}). Run \`npm run setup\` and restart the dev server.`,
          );
        }
      } else {
        frames = loaded.value;
      }
    }
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
    // The catalog's grids, into the PROJ just loaded: the country geoids,
    // and EGM2008 (only once opted in: runCases checks).
    for (const [need, set, what] of [
      ["grids", "geoids", "the country geoid grids"],
      ["egm2008", "egm2008", "EGM2008 (us_nga_egm08_25.tif)"],
    ] as const) {
      if (!needs.includes(need) || proj === undefined) {
        continue;
      }
      const loaded = await this.loadCatalogGrids(set);
      if ("error" in loaded) {
        if (!loaded.missing) {
          return {
            failed: `${what} failed to load: ${loaded.error}`,
          };
        }
        missing.push(need);
        reasons.push(
          `Needs ${what} from the PROJ-data catalog, which ${loaded.error === "this run has no PROJ-data catalog" ? "this run doesn't have" : `aren't in the store (${loaded.error})`}. Run \`npm run setup -- --grids portfolio,tests\` and restart the dev server.`,
        );
      }
    }
    if (needs.includes("orion")) {
      if (frames === undefined) {
        // Not fetched: it couldn't be placed without the frame data.
        missing.push("orion");
      } else {
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
    }
    if (missing.length > 0) {
      return { missing, reasons };
    }
    const { ctx } = this;
    const manifest =
      needs.length > 0 || optional.length > 0
        ? await this.loadManifest()
        : undefined;
    const ctxFor: DataContext = {
      proj: proj ?? ctx.proj,
      orion: orion ?? ctx.orion,
      loadProj: () => ctx.loadProj(),
      loadOrion: () => ctx.loadOrion(),
      ...(ctx.loadGeoid && { loadGeoid: () => ctx.loadGeoid!() }),
      ...(ctx.loadStations && { loadStations: () => ctx.loadStations!() }),
      ...(ctx.loadCatalogGrids && {
        loadCatalogGrids: (set: CatalogGridSet) => ctx.loadCatalogGrids!(set),
      }),
      ...(ctx.optedIn && { optedIn: (need: "egm2008") => ctx.optedIn!(need) }),
      ...(manifest !== undefined &&
        "value" in manifest &&
        manifest.value !== undefined && { manifest: manifest.value }),
    };
    // The frames, only for a case that said it reads them (F44).
    return {
      ctx: Object.defineProperty(ctxFor, "frames", {
        enumerable: true,
        get(): Frames {
          if (!readsFrames) {
            throw new Error(
              'this case reads the frame tree without declaring the "frames" need',
            );
          }
          if (frames === undefined) {
            throw new NeedMissingError("frames", framesError);
          }
          return frames;
        },
      }) as StressContext,
    };
  }
}

export interface RunOptions {
  /** Stops before the next case once aborted; the run resolves with what it has. */
  readonly signal?: AbortSignal;
  /** Called once per result, as it is judged. */
  readonly onResult?: (result: StressResult) => void;
  /**
   * Only the cases with these ids, in the groups with these ids (a card's
   * "Run this group"), or making the results with these ids (the
   * Reproducibility card's).
   */
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
/** Whether `ids` asks for case `c`: by its id, its group, or a result it makes (`<case id>.<part>`). */
function asked(ids: ReadonlySet<string>, c: StressCase): boolean {
  if (ids.has(c.id) || ids.has(c.group)) {
    return true;
  }
  for (const id of ids) {
    if (id.startsWith(`${c.id}.`)) {
      return true;
    }
  }
  return false;
}

export async function runCases(
  ctx: DataContext,
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
    if (wanted !== undefined && !asked(wanted, c)) {
      continue;
    }
    if (c.optIn !== undefined && ctx.optedIn?.(c.optIn.need) !== true) {
      // Opt-in data (EGM2008's 80.6 MB) isn't fetched by a run: one row
      // says so, shown, not judged, with the button that runs it.
      const produced: StressResult = {
        id: c.id,
        group: c.group,
        title: c.title,
        pass: true,
        displayOnly: true,
        optIn: { need: c.optIn.need, bytes: c.optIn.bytes },
        detail: `Not run: opt-in, ${fmt(c.optIn.bytes / 1e6)} MB. Its grid loads only when you ask: use the row's Run button.`,
        accuracyNote: "none: not run",
      };
      const judged = withDefaults(
        judgeResult(produced, fingerprints),
        c.cites ?? [],
      );
      results.push(judged);
      onResult?.(judged);
      continue;
    }
    const met = await needs.meet(
      c.optIn === undefined ? c.needs : [...c.needs, c.optIn.need],
      c.optionalNeeds,
    );
    if (signal?.aborted) {
      break;
    }
    let produced: StressResult[];
    let cites: readonly string[] = c.cites ?? [];
    if ("failed" in met) {
      produced = [
        {
          id: c.id,
          group: c.group,
          title: c.title,
          pass: false,
          error: met.failed,
        },
      ];
    } else if ("missing" in met) {
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
        const ran = await collectCitations(() => c.run(met.ctx));
        produced = ran.value;
        cites = [...new Set([...cites, ...ran.ids])];
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
      const judged = withDefaults(judgeResult(raw, fingerprints), cites);
      results.push(judged);
      onResult?.(judged);
    }
  }
  return results;
}
