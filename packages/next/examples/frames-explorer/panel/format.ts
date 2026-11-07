// Numbers as the panel shows them (DESIGN.md, "Numbers"): units always,
// tabular figures, significant figures no finer than the comparison needs,
// and powers of ten written out rather than as `e` notation.

const SUPERSCRIPT: Record<string, string> = {
  "-": "⁻",
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
};

const formats = new Map<number, Intl.NumberFormat>();
/** `digits` significant figures, trailing zeros kept (they state the precision). */
function fixed(a: number, digits: number): string {
  let f = formats.get(digits);
  if (f === undefined) {
    f = new Intl.NumberFormat("en-US", {
      minimumSignificantDigits: digits,
      maximumSignificantDigits: digits,
    });
    formats.set(digits, f);
  }
  return f.format(a);
}

/** `x` to `digits` significant figures: plain between 0.001 and 1e6, else "3.4 × 10⁻⁹". */
export function sig(x: number, digits = 2): string {
  if (!Number.isFinite(x)) {
    return Number.isNaN(x) ? "not a number" : x > 0 ? "∞" : "−∞";
  }
  if (x === 0) {
    return "0";
  }
  const a = Math.abs(x);
  const minus = x < 0 ? "−" : "";
  if (a >= 1e-3 && a < 1e6) {
    return minus + fixed(a, digits);
  }
  const exponent = Math.floor(Math.log10(a));
  let mantissa = a / 10 ** exponent;
  let e = exponent;
  // 9.96e-5 to 2 figures is 1.0 × 10⁻⁴, not 10 × 10⁻⁵.
  if (Number(mantissa.toPrecision(digits)) >= 10) {
    mantissa /= 10;
    e += 1;
  }
  const power = String(e)
    .split("")
    .map((c) => SUPERSCRIPT[c] ?? c)
    .join("");
  return `${minus}${fixed(mantissa, digits)} × 10${power}`;
}

type Units = readonly (readonly [number, string])[];

const LENGTH_UNITS: Units = [
  [1e3, "km"],
  [1, "m"],
  [1e-3, "mm"],
  [1e-6, "µm"],
  [1e-9, "nm"],
];
const TIME_UNITS: Units = [
  [1, "s"],
  [1e-3, "ms"],
  [1e-6, "µs"],
  [1e-9, "ns"],
];

/** `x` (in the units' base) in the prefixed unit that reads best. */
function prefixed(x: number, units: Units, base: string, digits: number) {
  if (!Number.isFinite(x) || x === 0) {
    return `${sig(x, digits)} ${base}`;
  }
  const a = Math.abs(x);
  for (const [i, [scale, unit]] of units.entries()) {
    if (a >= scale) {
      // 0.9996 m to 2 figures is 1.0 m, not 1,000 mm.
      const up = units[i - 1];
      if (up && Number((a / scale).toPrecision(digits)) >= up[0] / scale) {
        return `${sig(x / up[0], digits)} ${up[1]}`;
      }
      return `${sig(x / scale, digits)} ${unit}`;
    }
  }
  return `${sig(x, digits)} ${base}`;
}

/**
 * A length in meters in the unit that reads best: 384,400 km, 2.0 m,
 * 31 mm, 3.4 nm; below a nanometre, meters with a power of ten.
 */
export function length(meters: number, digits = 2): string {
  if (Math.abs(meters) >= 1e6) {
    return `${Math.round(meters / 1e3).toLocaleString("en-US")} km`;
  }
  return prefixed(meters, LENGTH_UNITS, "m", digits);
}

/** A speed in m/s in the unit that reads best: 1.4 km/s, 0.42 mm/s (a length's prefixes, per second). */
export function speed(mps: number, digits = 2): string {
  return `${length(mps, digits)}/s`;
}

/** A duration in seconds: 2.0 s, 35 µs, 15 ns. */
export function seconds(s: number, digits = 2): string {
  return prefixed(s, TIME_UNITS, "s", digits);
}

/** A value with its unit: lengths through `length`, others as `sig` and the unit. */
export function quantity(
  value: number,
  unit: string | undefined,
  digits = 2,
): string {
  if (unit === "m") {
    return length(value, digits);
  }
  if (unit === "s") {
    return seconds(value, digits);
  }
  if (unit === undefined || unit === "") {
    return dimensionless(value, digits);
  }
  // Angle marks sit on the number.
  if (unit === "″" || unit === "°" || unit === "′") {
    return `${sig(value, digits)}${unit}`;
  }
  return `${sig(value, digits)} ${unit}`;
}

/**
 * A dimensionless value with a unit all the same (I12): a percent from 10⁻⁴
 * up ("2.0%"), parts per million from 10⁻⁷ ("4.7 ppm"), else a power of ten
 * marked as a ratio ("4.7 × 10⁻⁹ ratio").
 */
export function dimensionless(x: number, digits = 2): string {
  const a = Math.abs(x);
  if (a === 0) {
    return "0";
  }
  if (a >= 1e-4) {
    return `${sig(x * 100, digits)}%`;
  }
  if (a >= 1e-7) {
    return `${sig(x * 1e6, digits)} ppm`;
  }
  return `${sig(x, digits)} ratio`;
}

/** An angle in radians, with its length at a distance if one is given. */
export function radians(rad: number, digits = 2): string {
  return `${sig(rad, digits)} rad`;
}

/** Bytes as MB with one decimal (the status strip). */
export function megabytes(bytes: number): string {
  if (bytes < 1e5) {
    return `${Math.max(1, Math.round(bytes / 1e3))} kB`;
  }
  return `${(bytes / 1e6).toFixed(1)} MB`;
}

/** Milliseconds as "320 ms" or "4.2 s". */
export function duration(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`;
}

/** A count with its noun: "1 check", "225 checks". */
export function count(n: number, noun: string, plural = `${noun}s`): string {
  return `${n.toLocaleString("en-US")} ${n === 1 ? noun : plural}`;
}
