// Hand-coded geodesy for the stress tests, written from the EPSG method
// definitions in IOGP 373-7-2, never from PROJ: geographic to geocentric
// coordinates and the 7-parameter Helmert transformation.
import { DEGREE } from "./references.ts";

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

/** The parameters moved to the coordinate epoch: p' = p + ṗ (t − t0), or p itself without rates. */
function atEpoch(
  p: HelmertParameters,
  options: HelmertOptions,
): HelmertParameters {
  if (options.rates === undefined) {
    return p;
  }
  const { referenceEpoch, epoch } = options;
  if (referenceEpoch === undefined || epoch === undefined) {
    throw new Error(
      "helmert: a time-dependent transformation needs its reference epoch and the coordinate epoch",
    );
  }
  const dt = epoch - referenceEpoch;
  const r = options.rates;
  return {
    tx: p.tx + r.tx * dt,
    ty: p.ty + r.ty * dt,
    tz: p.tz + r.tz * dt,
    rx: p.rx + r.rx * dt,
    ry: p.ry + r.ry * dt,
    rz: p.rz + r.rz * dt,
    ds: p.ds + r.ds * dt,
  };
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
  const q = atEpoch(p, options);
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

/**
 * EPSG's reversal (IOGP 373-7-2 §4.2.3, §4.2.5): every parameter's sign
 * reversed, the reference epoch kept. It is an approximation, as the EPSG
 * Dataset documents the methods as reversible "for practical purposes": the
 * forward formula with these parameters misses the exact inverse by about
 * |dS·T| + |r × T| (second-order terms in the parameters), about 1.5 cm for
 * OSGB36's 20 ppm scale and 700 m shift, and below 1e-6 m for NAD83(2011)
 * and ITRF2014. Use `inverseHelmert` for the exact inverse.
 */
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

/**
 * The exact inverse of `helmert` with the same parameters and options:
 * XS solves M' · R' · XS = XT − T' (IOGP 373-7-2 §4.2.3, "the exact reverse
 * of which is VS = [1/(1 + dS)] · R⁻¹ · (VT − T)"), with R' the same
 * small-angle matrix, inverted by its adjugate rather than transposed.
 */
export function inverseHelmert(
  xyz: ArrayLike<number>,
  p: HelmertParameters,
  options: HelmertOptions,
): [number, number, number] {
  const q = atEpoch(p, options);
  const s = options.convention === "position-vector" ? 1 : -1;
  const rx = s * q.rx;
  const ry = s * q.ry;
  const rz = s * q.rz;
  const m = 1 + q.ds;
  const v = [(xyz[0]! - q.tx) / m, (xyz[1]! - q.ty) / m, (xyz[2]! - q.tz) / m];
  // R = I + K = [[1, −c, b], [c, 1, −a], [−b, a, 1]] (a, b, c = rx, ry, rz)
  // has det(R) = 1 + a² + b² + c² and R⁻¹ = adj(R) / det(R), written as
  // I + E so that the large coordinates are only added to a small correction:
  //   E = [[−(b² + c²), c + ab, ac − b],
  //        [ab − c, −(a² + c²), a + bc],
  //        [ac + b, bc − a, −(a² + b²)]] / det(R).
  const a = rx;
  const b = ry;
  const c = rz;
  const det = 1 + a * a + b * b + c * c;
  const e = [
    [-(b * b + c * c), c + a * b, a * c - b],
    [a * b - c, -(a * a + c * c), a + b * c],
    [a * c + b, b * c - a, -(a * a + b * b)],
  ];
  const out = [0, 0, 0] as [number, number, number];
  for (let i = 0; i < 3; i++) {
    const row = e[i]!;
    out[i] =
      v[i]! + (row[0]! * v[0]! + row[1]! * v[1]! + row[2]! * v[2]!) / det;
  }
  return out;
}

/**
 * Geocentric to geographic coordinates (degrees, metres), the reverse of
 * `geodeticToGeocentric`, written from IOGP 373-7-2 §4.1.1 (EPSG method
 * 9602): Bowring's formula, φ = atan2(Z + ε b sin³ q, p − e² a cos³ q) with
 * q = atan2(Z a, p b) and ε = e² / (1 − e²), then refined by the fixed point
 * φ = atan2(Z + e² ν sin φ, p) until it stops moving (Bowring alone is good
 * to about 1e-10 rad at the Earth's surface), and h = p / cos φ − ν.
 */
export function geocentricToGeodetic(
  xyz: ArrayLike<number>,
  a: number,
  f: number,
): [number, number, number] {
  const x = xyz[0]!;
  const y = xyz[1]!;
  const z = xyz[2]!;
  const e2 = f * (2 - f);
  const b = a * (1 - f);
  const eps = e2 / (1 - e2);
  const p = Math.hypot(x, y);
  const q = Math.atan2(z * a, p * b);
  let phi = Math.atan2(
    z + eps * b * Math.sin(q) ** 3,
    p - e2 * a * Math.cos(q) ** 3,
  );
  for (let i = 0; i < 5; i++) {
    const nu = a / Math.sqrt(1 - e2 * Math.sin(phi) ** 2);
    const next = Math.atan2(z + e2 * nu * Math.sin(phi), p);
    const moved = Math.abs(next - phi);
    phi = next;
    if (moved < 1e-15) {
      break;
    }
  }
  const nu = a / Math.sqrt(1 - e2 * Math.sin(phi) ** 2);
  // Near the poles p / cos φ loses precision; |Z| / sin φ − (1 − e²) ν is
  // the same height there.
  const h =
    Math.abs(phi) < Math.PI / 4
      ? p / Math.cos(phi) - nu
      : z / Math.sin(phi) - (1 - e2) * nu;
  return [Math.atan2(y, x) / DEGREE, phi / DEGREE, h];
}
