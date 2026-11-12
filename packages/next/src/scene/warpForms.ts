// Warps that are closed forms of the position, and so can be fitted (or
// drawn) on the GPU: the CPU reference of each in float64, and the words the
// fit kernel reads (shaders/warpFitGpu.slang; scene/warpFitGpu.ts is the
// host). A form maps a point of its frame (body-fixed metres, for the
// ellipsoidal ones) to a displaced point; `formDisplacement` is the
// displacement function `fitLattice` takes, so the CPU fit of a form is the
// reference and fallback of its GPU fit. Arbitrary JavaScript
// (`warpFromFunction`) is not a form and stays on the CPU.
//
// - `heightLift`: heights above an ellipsoid go to `base + factor (h - base)
//   + offset`: the vertical exaggeration and the constant lift of
//   georeference/heightWarps.ts, with the height reference an ellipsoid or sphere.
// - `heightBump`: a Gaussian lift along the normal about a point, a warp
//   whose shape (centre, amplitude, width) an application moves every frame.
// - `scaleAbout`: `p' = c + S (p - c)`, S diagonal, in the form's axes.
// - `transverseMercator`: body-fixed metres to (easting, northing, ellipsoidal
//   height), Karney's 6th-order series (the one PROJ's `etmerc` uses), a UTM
//   zone or any central meridian: the map a design view in a projected CRS
//   needs. Within about 10 degrees of the central meridian.
//
// The Jacobian is not here: a fit's lattice gives it, as for any warp.

/** A radius triple (x, y, z), m: an ellipsoid; all equal is a sphere. */
export type Radii = readonly [number, number, number];

/** WGS84's radii, m. */
export const WGS84_RADII: Radii = [6378137, 6378137, 6356752.314245179];

export interface HeightLiftForm {
  readonly kind: "heightLift";
  /** The reference ellipsoid (default WGS84). */
  readonly radii?: Radii;
  /** What heights are multiplied by (1: unchanged). */
  readonly factor: number;
  /** The height that stays put when `factor` changes, m (default 0). */
  readonly baseHeight?: number;
  /** A constant lift added after, m (default 0). */
  readonly offset?: number;
}

export interface HeightBumpForm {
  readonly kind: "heightBump";
  readonly radii?: Radii;
  /** The bump's centre, body-fixed metres. */
  readonly center: ArrayLike<number>;
  /** Its height at the centre, m (negative digs). */
  readonly amplitude: number;
  /** The Gaussian's standard deviation, m, by straight-line distance from the centre. */
  readonly sigma: number;
}

export interface ScaleAboutForm {
  readonly kind: "scaleAbout";
  readonly center: ArrayLike<number>;
  /** The factor along each axis. */
  readonly factors: readonly [number, number, number];
}

export interface TransverseMercatorForm {
  readonly kind: "transverseMercator";
  /** The ellipsoid of revolution (x and y radii equal; default WGS84). */
  readonly radii?: Radii;
  /** The central meridian, degrees. */
  readonly centralMeridian: number;
  /** The scale on it (default 0.9996, UTM's). */
  readonly scaleFactor?: number;
  /** Default 500000. */
  readonly falseEasting?: number;
  /** Default 0 (UTM north; 10000000 south). */
  readonly falseNorthing?: number;
}

export type GpuWarpForm =
  HeightLiftForm | HeightBumpForm | ScaleAboutForm | TransverseMercatorForm;

/** The kinds, as the kernel numbers them (`FORM_*` in warpFitGpu.slang). */
export const FORM_KINDS = {
  heightLift: 0,
  heightBump: 1,
  scaleAbout: 2,
  transverseMercator: 3,
} as const;

/** df64 slots in a form's words (two floats each, 32 of them). */
export const FORM_SLOTS = 32;

/** A UTM zone's form: zone 1 to 60, north or south. */
export function utmForm(
  zone: number,
  hemisphere: "north" | "south" = "north",
  radii: Radii = WGS84_RADII,
): TransverseMercatorForm {
  if (!Number.isInteger(zone) || zone < 1 || zone > 60) {
    throw new RangeError(`utmForm: zone is ${zone}; it is 1 to 60`);
  }
  return {
    kind: "transverseMercator",
    radii,
    centralMeridian: (zone - 1) * 6 - 177,
    scaleFactor: 0.9996,
    falseEasting: 500000,
    falseNorthing: hemisphere === "north" ? 0 : 10000000,
  };
}

function radiiOf(form: { readonly radii?: Radii }): Radii {
  return form.radii ?? WGS84_RADII;
}

/**
 * p's foot on the ellipsoid and its height `h` above it, with the unit
 * normal `n` there, in float64: Newton's method on the multiplier of
 * `p = foot + L diag(1/r²) foot`, as georeference/heightWarps.ts does.
 */
export function ellipsoidFoot(
  radii: Radii,
  p: ArrayLike<number>,
  n: Float64Array,
): number {
  const os = radii.map((r) => 1 / (r * r));
  const x2 = [0, 1, 2].map((i) => p[i]! * p[i]! * os[i]!);
  const rho = Math.sqrt(x2[0]! + x2[1]! + x2[2]!);
  let lambda = (rho - 1) / ((os[0]! + os[1]! + os[2]!) / 3);
  for (let i = 0; i < 30; i++) {
    let f = -1;
    let den = 0;
    for (let a = 0; a < 3; a++) {
      const m = 1 / (1 + lambda * os[a]!);
      f += x2[a]! * m * m;
      den += x2[a]! * m * m * m * os[a]!;
    }
    const correction = f / (2 * den);
    lambda += correction;
    if (!(Math.abs(correction) > 4 * Number.EPSILON * Math.abs(lambda))) {
      break;
    }
  }
  let norm = 0;
  for (let a = 0; a < 3; a++) {
    n[a] = (p[a]! / (1 + lambda * os[a]!)) * os[a]!;
    norm += n[a]! * n[a]!;
  }
  norm = Math.sqrt(norm);
  n[0] = n[0]! / norm;
  n[1] = n[1]! / norm;
  n[2] = n[2]! / norm;
  return lambda * norm;
}

/** Krueger's alpha series for a transverse Mercator on an ellipsoid of third flattening n (Karney 2011, eq. 35), and A / a. */
export function transverseMercatorSeries(n: number): {
  alpha: number[];
  a: number;
} {
  const n2 = n * n;
  const n3 = n2 * n;
  const n4 = n2 * n2;
  const n5 = n4 * n;
  const n6 = n3 * n3;
  return {
    a: (1 + n2 / 4 + n4 / 64 + n6 / 256) / (1 + n),
    alpha: [
      n / 2 -
        (2 * n2) / 3 +
        (5 * n3) / 16 +
        (41 * n4) / 180 -
        (127 * n5) / 288 +
        (7891 * n6) / 37800,
      (13 * n2) / 48 -
        (3 * n3) / 5 +
        (557 * n4) / 1440 +
        (281 * n5) / 630 -
        (1983433 * n6) / 1935360,
      (61 * n3) / 240 -
        (103 * n4) / 140 +
        (15061 * n5) / 26880 +
        (167603 * n6) / 181440,
      (49561 * n4) / 161280 - (179 * n5) / 168 + (6601661 * n6) / 7257600,
      (34729 * n5) / 80640 - (3418889 * n6) / 1995840,
      (212378941 * n6) / 319334400,
    ],
  };
}

interface TransverseMercatorConstants {
  e: number;
  kA: number;
  alpha: number[];
  lambda0: number;
}

function tmConstants(
  form: TransverseMercatorForm,
): TransverseMercatorConstants {
  const [a, , b] = radiiOf(form);
  const radii = radiiOf(form);
  if (Math.abs(radii[0] - radii[1]) > 1e-6) {
    throw new RangeError(
      "transverseMercator: the ellipsoid must be one of revolution (x and y radii equal)",
    );
  }
  const f = 1 - b / a;
  const n = f / (2 - f);
  const series = transverseMercatorSeries(n);
  return {
    e: Math.sqrt(f * (2 - f)),
    kA: (form.scaleFactor ?? 0.9996) * a * series.a,
    alpha: series.alpha,
    lambda0: (form.centralMeridian * Math.PI) / 180,
  };
}

const footNormal = new Float64Array(3);

/**
 * The form at world point `p`, written to `out` (3): the displaced point
 * (`transverseMercator`: easting, northing and ellipsoidal height). The
 * reference, in float64, of what the GPU computes.
 */
export function formForward(
  form: GpuWarpForm,
  p: ArrayLike<number>,
  out: Float64Array,
): Float64Array {
  switch (form.kind) {
    case "scaleAbout": {
      for (let a = 0; a < 3; a++) {
        out[a] = form.center[a]! + form.factors[a]! * (p[a]! - form.center[a]!);
      }
      return out;
    }
    case "heightLift": {
      const h = ellipsoidFoot(radiiOf(form), p, footNormal);
      const base = form.baseHeight ?? 0;
      const lift = (form.factor - 1) * (h - base) + (form.offset ?? 0);
      for (let a = 0; a < 3; a++) {
        out[a] = p[a]! + lift * footNormal[a]!;
      }
      return out;
    }
    case "heightBump": {
      ellipsoidFoot(radiiOf(form), p, footNormal);
      const dx = p[0]! - form.center[0]!;
      const dy = p[1]! - form.center[1]!;
      const dz = p[2]! - form.center[2]!;
      const r2 = dx * dx + dy * dy + dz * dz;
      const lift =
        form.amplitude * Math.exp(-r2 / (2 * form.sigma * form.sigma));
      for (let a = 0; a < 3; a++) {
        out[a] = p[a]! + lift * footNormal[a]!;
      }
      return out;
    }
    case "transverseMercator": {
      const { e, kA, alpha, lambda0 } = tmConstants(form);
      const h = ellipsoidFoot(radiiOf(form), p, footNormal);
      const phi = Math.atan2(
        footNormal[2]!,
        Math.hypot(footNormal[0]!, footNormal[1]!),
      );
      const lambda = Math.atan2(footNormal[1]!, footNormal[0]!);
      const L = lambda - lambda0;
      const tau = Math.tan(phi);
      const sigma = Math.sinh(e * Math.atanh(e * Math.sin(phi)));
      const tauPrime =
        tau * Math.sqrt(1 + sigma * sigma) - sigma * Math.sqrt(1 + tau * tau);
      const xi0 = Math.atan2(tauPrime, Math.cos(L));
      const eta0 = Math.asinh(Math.sin(L) / Math.hypot(tauPrime, Math.cos(L)));
      let xi = xi0;
      let eta = eta0;
      for (let j = 1; j <= 6; j++) {
        xi += alpha[j - 1]! * Math.sin(2 * j * xi0) * Math.cosh(2 * j * eta0);
        eta += alpha[j - 1]! * Math.cos(2 * j * xi0) * Math.sinh(2 * j * eta0);
      }
      out[0] = (form.falseEasting ?? 500000) + kA * eta;
      out[1] = (form.falseNorthing ?? 0) + kA * xi;
      out[2] = h;
      return out;
    }
  }
}

/**
 * The displacement function of a form in a draw's model coordinates, the
 * model origin at `origin` in the form's frame (the draw's translation):
 * `D(m) = form(origin + m) - (origin + m)`. What `fitLattice` and
 * `fitLatticeAt` take, so a form's CPU fit is available beside its GPU one.
 */
export function formDisplacement(
  form: GpuWarpForm,
  origin: ArrayLike<number>,
): (m: Float64Array, out: Float64Array) => void {
  const p = new Float64Array(3);
  const q = new Float64Array(3);
  return (m, out) => {
    p[0] = origin[0]! + m[0]!;
    p[1] = origin[1]! + m[1]!;
    p[2] = origin[2]! + m[2]!;
    formForward(form, p, q);
    out[0] = q[0]! - p[0]!;
    out[1] = q[1]! - p[1]!;
    out[2] = q[2]! - p[2]!;
  };
}

/**
 * The most a form can move a point at heights within `heights` (m above the
 * ellipsoid), where that is stated by the form alone (the lift and the
 * bump); undefined for a form whose displacement depends on where it acts
 * (a projection moves a tile by its distance to the map, a scale about a
 * point by its distance from it): a caller states a bound for those.
 */
export function formMaxDisplacement(
  form: GpuWarpForm,
  heights: readonly [number, number],
): number | undefined {
  if (form.kind === "heightLift") {
    const base = form.baseHeight ?? 0;
    const at = (h: number) =>
      Math.abs((form.factor - 1) * (h - base) + (form.offset ?? 0));
    return Math.max(at(heights[0]), at(heights[1]));
  }
  if (form.kind === "heightBump") {
    return Math.abs(form.amplitude);
  }
  return undefined;
}

const pair = new Float32Array(2);

/**
 * `x` as a double-float: `hi` its float32 rounding and `lo` the float32
 * rounding of what is left, so `hi + lo` is `x` to about 2⁻⁴⁸. Not the
 * whole-meter split of math/transforms.ts (`splitHigh`), which positions
 * the cull's exact sums rely on: the fit kernels' df64 arithmetic takes any
 * normalized pair.
 */
export function splitDf64(x: number): readonly [number, number] {
  pair[0] = x;
  pair[1] = x - pair[0];
  return [pair[0], pair[1]];
}

/**
 * The form as the kernel's uniform words: `FORM_SLOTS` df64 numbers, each
 * (hi, lo) as float32s (`FitParams.w`), in the order warpFitGpu.slang's
 * forms read. 64 floats.
 */
export function formWords(
  form: GpuWarpForm,
  out: Float32Array = new Float32Array(2 * FORM_SLOTS),
): Float32Array {
  out.fill(0);
  const put = (slot: number, x: number) => {
    const [hi, lo] = splitDf64(x);
    out[2 * slot] = hi;
    out[2 * slot + 1] = lo;
  };
  if (form.kind === "scaleAbout") {
    for (let a = 0; a < 3; a++) {
      put(a, form.center[a]!);
      put(3 + a, form.factors[a]! - 1);
    }
    return out;
  }
  const radii = radiiOf(form);
  for (let a = 0; a < 3; a++) {
    put(a, 1 / (radii[a]! * radii[a]!));
  }
  switch (form.kind) {
    case "heightLift":
      put(3, form.factor - 1);
      put(4, form.baseHeight ?? 0);
      put(5, form.offset ?? 0);
      break;
    case "heightBump":
      for (let a = 0; a < 3; a++) {
        put(3 + a, form.center[a]!);
      }
      put(6, form.amplitude);
      put(7, 1 / (2 * form.sigma * form.sigma));
      break;
    case "transverseMercator": {
      const { e, kA, alpha, lambda0 } = tmConstants(form);
      put(3, e);
      alpha.forEach((a, j) => put(4 + j, a));
      put(10, kA);
      put(11, Math.cos(lambda0));
      put(12, Math.sin(lambda0));
      put(13, form.falseEasting ?? 500000);
      put(14, form.falseNorthing ?? 0);
      break;
    }
  }
  return out;
}
