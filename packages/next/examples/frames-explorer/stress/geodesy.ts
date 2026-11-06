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
