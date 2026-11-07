// Published values (R10): references.json read as printed, with half a unit
// in each value's last printed digit, and the path tolerances beside them.
import { ARCSECOND } from "../units.ts";
import { fromDegrees } from "../../../src/math/ellipsoid.ts";
import { EARTH } from "../../../src/scene/Body.ts";
import references from "../references.json";
import type { Citation } from "./groupInfo.ts";

interface Cited {
  readonly source: { readonly retrieved: string } & Record<string, unknown>;
}

const REFERENCE_ENTRIES = (
  references as unknown as { readonly entries: Record<string, unknown> }
).entries;

/** Citations made outside a run (while the catalog's cases are made), in order. */
let pending: string[] = [];
/** The runs collecting citations (`collectCitations`), innermost last. */
const collecting: Set<string>[] = [];

/**
 * A references.json entry, which must exist. Each call is recorded: while a
 * case is made, for `stressCase` to claim (`takeCitations`); while it runs,
 * for the runner (`collectCitations`). Either way its id becomes the case's
 * results' `source` (ruling F28).
 */
export function cited<T>(id: string): T & Cited {
  const entry = REFERENCE_ENTRIES[id];
  if (entry === undefined) {
    throw new Error(`references.json has no entry "${id}"`);
  }
  if (collecting.length === 0) {
    pending.push(id);
  } else {
    for (const ids of collecting) {
      ids.add(id);
    }
  }
  return entry as T & Cited;
}

/** The ids `cited` was called with outside a run since the last call, in order, once each. */
export function takeCitations(): string[] {
  const out = [...new Set(pending)];
  pending = [];
  return out;
}

/**
 * Runs `fn`, collecting the ids `cited` is called with until it settles.
 * The runner runs cases one at a time; two runs interleaved in one context
 * would each collect the other's citations too. The page queues its runs
 * (runQueue.ts), and "Try your own" collects its own (boundCrsChecks), so
 * nothing it cites outside a catalog run is left in `pending`.
 */
export async function collectCitations<T>(
  fn: () => Promise<T>,
): Promise<{ value: T; ids: string[] }> {
  const ids = new Set<string>();
  collecting.push(ids);
  try {
    const value = await fn();
    return { value, ids: [...ids] };
  } finally {
    collecting.splice(collecting.indexOf(ids), 1);
  }
}

/** The fields of a source that say where in the document the value is. */
const LOCATORS = [
  "pid",
  "record",
  "table",
  "tables",
  "section",
  "pages",
] as const;

/** A references.json entry as the inspector cites it (R10, F28). */
export function citation(id: string): Citation {
  const entry = REFERENCE_ENTRIES[id] as
    { kind?: string; source: Record<string, unknown> } | undefined;
  if (entry === undefined) {
    throw new Error(`references.json has no entry "${id}"`);
  }
  const s = entry.source;
  const text = (key: string): string | undefined =>
    typeof s[key] === "string" ? s[key] : undefined;
  const locator = LOCATORS.map((key) => {
    const value = text(key);
    return value === undefined
      ? undefined
      : key === "pid"
        ? `PID ${value}`
        : key === "pages"
          ? `pages ${value}`
          : value;
  })
    .filter((v): v is string => v !== undefined)
    .join(", ");
  const document = [text("document"), text("edition") ?? text("revision")]
    .filter((v): v is string => v !== undefined)
    .join(", ");
  return {
    reference: id,
    document,
    ...(text("publisher") !== undefined && { publisher: text("publisher")! }),
    ...(locator !== "" && { locator }),
    ...(text("url") !== undefined && { url: text("url")! }),
    retrieved: text("retrieved") ?? "",
    ...(entry.kind === "input" && { input: true }),
  };
}

/** A value as its source printed it, and half a unit in its last printed digit (R10's tolerance). */
export interface Printed {
  readonly value: number;
  readonly half: number;
}

const DIGITS = /^[+-]?\d+(?:\.\d+)?$/;

/**
 * A printed number: "1,905,441.053", "–11 169 055.58", "+4.5", "1.000 002".
 * Thousands separators and spaces are dropped, and a typographic minus is a
 * minus.
 */
export function printed(text: string): Printed {
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
export function sexagesimal(text: string, sign = 1): Printed {
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
export function printedStation(text: string): Printed {
  const [hundreds, rest] = text.split("+").map((s) => s.trim());
  const feet = printed(rest ?? "");
  return {
    value: printed(hundreds ?? "").value * 100 + feet.value,
    half: feet.half,
  };
}

export const DEGREE = Math.PI / 180;

export { ARCSECOND } from "../units.ts";

export const MILLIARCSECOND = ARCSECOND / 1000;

/** An ellipsoid from its EPSG record in references.json: a (m), f and e². */
export function ellipsoidOf(id: string) {
  const e = cited<{ semiMajorAxis: string; inverseFlattening: string }>(id);
  const a = printed(e.semiMajorAxis).value;
  const f = 1 / printed(e.inverseFlattening).value;
  return { a, f, e2: f * (2 - f) };
}

/** Radii of curvature: meridional M, prime vertical N and Gaussian sqrt(M N), m. */
export function radii(a: number, e2: number, latitudeDegrees: number) {
  const s = Math.sin(latitudeDegrees * DEGREE);
  const w = 1 - e2 * s * s;
  const N = a / Math.sqrt(w);
  const M = (a * (1 - e2)) / (w * Math.sqrt(w));
  return { M, N, gaussian: Math.sqrt(M * N) };
}

/** Body-fixed metres of a longitude, latitude (degrees) and height on the Earth's ellipsoid. */
export const onEarth = (lon: number, lat: number, h = 0): Float64Array =>
  EARTH.ellipsoid.cartographicToCartesian(
    fromDegrees(lon, lat, h),
    new Float64Array(3),
  );

/** The refined inverse's residual bound (RecordedOperation.inverse), m: the path's own tolerance. */
export const INVERSE_RESIDUAL = 1e-6;

/**
 * PROJ differentiates numerically for the scale factor (gridFactors): its
 * two scales of a conformal projection differ by about 1e-11, so 1e-10 is
 * the path's own tolerance for a factor.
 */
export const FACTOR_PATH = 1e-10;

/** The same for the convergence, radians (about 0.0002″). */
export const CONVERGENCE_PATH = 1e-9;

/**
 * PROJ's numerical latitude derivative (step ~1e-5), which gridFactors' h
 * comes from: test/data/factors.test.ts measured 2.2e-10 in Web Mercator's h
 * at 60°.
 */
export const NUMERICAL_LATITUDE_DERIVATIVE = 1e-9;

/** An angle from PROJ's iterative inverses, arcseconds (0.3 mm on the ground). */
export const ANGLE_PATH = 1e-5;

/** Alignment geometry is exact to float64 (alignment.ts): the path's own tolerance. */
export const ALIGNMENT_PATH = 1e-9;

/** π − Math.PI: the second part of π in two doubles. */
export const PI_REMAINDER = 1.2246467991473532e-16;

/** The Vertical profile and Distortion groups' tolerance (the plan's). */
export const HAND_FORMULA = 1e-9;

export interface NgsMark {
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
