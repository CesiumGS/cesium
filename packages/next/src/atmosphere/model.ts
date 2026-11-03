// A planet's atmosphere as participating media, spectrally: the parameters
// shared by the reference integrators (here on the CPU, reference.wgsl on
// the GPU) and the real-time model to come (plan §4.2). Lengths in meters,
// wavelengths in nanometers, positions relative to the planet's center.
//
// Earth's defaults are Bruneton's 2017 reference values: Rayleigh scattering
// ∝ λ⁻⁴ with an 8 km scale height, a thin aerosol layer (Ångström model,
// 1.2 km scale height, single-scattering albedo 0.9, Cornette–Shanks phase
// with g = 0.8), and ozone absorption (300 Dobson units in a layer from 10
// to 40 km peaking at 25 km).
import {
  CIE_1931,
  LAMBDA_MAX,
  LAMBDA_MIN,
  MAX_LUMINOUS_EFFICACY,
  OZONE_CROSS_SECTION,
  SOLAR_IRRADIANCE,
  XYZ_TO_LINEAR_SRGB,
} from "./spectra.ts";

export interface AtmosphereParameters {
  /** Radius of the ground (a sphere), m. */
  bottomRadius: number;
  /** Radius of the top of the atmosphere, m. */
  topRadius: number;
  /** Rayleigh scattering at sea level is `rayleigh · λ⁻⁴` (λ in µm), m⁻¹. */
  rayleigh: number;
  rayleighScaleHeight: number;
  /** Aerosol extinction at sea level is `mieBeta / mieScaleHeight · λ^−α`. */
  mieBeta: number;
  mieAngstromAlpha: number;
  mieScaleHeight: number;
  mieSingleScatteringAlbedo: number;
  /** Cornette–Shanks asymmetry. */
  miePhaseG: number;
  /** Total ozone column, Dobson units (0 for none). */
  ozoneDobson: number;
  /** Lambertian ground albedo. */
  groundAlbedo: number;
}

export const EARTH: Readonly<AtmosphereParameters> = {
  bottomRadius: 6_360_000,
  topRadius: 6_420_000,
  rayleigh: 1.24062e-6,
  rayleighScaleHeight: 8000,
  mieBeta: 5.328e-3,
  mieAngstromAlpha: 0,
  mieScaleHeight: 1200,
  mieSingleScatteringAlbedo: 0.9,
  miePhaseG: 0.8,
  ozoneDobson: 300,
  groundAlbedo: 0.1,
};

/**
 * The parameters with aerosols for a meteorological visibility (km): the
 * extinction at the ground at 550 nm is 3.912 / visibility (Koschmieder's
 * relation for a 2% contrast threshold), the air's Rayleigh share and the
 * rest aerosols (their profile and the other parameters kept). Bruneton's
 * Earth is about 220 km (aerosol optical depth 0.005, very clean air); a
 * clear day is 40 to 60 km (about 0.1), a hazy summer day 10 to 20 km. At
 * least the Rayleigh share: no fewer aerosols than none.
 */
export function withVisibility(
  p: Readonly<AtmosphereParameters>,
  kilometers: number,
  aerosol?: AerosolType,
): AtmosphereParameters {
  const a = aerosol ? AEROSOLS[aerosol] : undefined;
  const q: AtmosphereParameters = a
    ? {
        ...p,
        mieAngstromAlpha: a.angstrom,
        mieSingleScatteringAlbedo: a.singleScatteringAlbedo,
        miePhaseG: a.phaseG,
        mieScaleHeight: a.scaleHeight,
      }
    : { ...p };
  const extinction = 3.912 / (kilometers * 1000);
  const rayleigh550 = q.rayleigh * 0.55 ** -4;
  const aerosols =
    Math.max(extinction - rayleigh550, 0) * 0.55 ** q.mieAngstromAlpha;
  return { ...q, mieBeta: aerosols * q.mieScaleHeight };
}

/** Kinds of aerosols: what the haze is made of (`AEROSOLS`). */
export type AerosolType = "continental" | "urban" | "maritime" | "desert";

/**
 * Aerosol optical properties at 550 nm by type, after the OPAC climatology
 * (Hess, Koepke and Schult 1998), approximately: how their extinction falls
 * with wavelength (the Ångström exponent: fine particles scatter blue more,
 * a bluish haze; coarse dust and sea salt about evenly, a white one), how
 * much of it is scattering rather than absorption, and how strongly forward
 * it scatters (the Cornette–Shanks asymmetry), and how high they reach (the
 * scale height, m: sea salt stays in a shallow marine layer, dust is lofted
 * kilometers up, as in the Saharan air layer; typical values, not OPAC's).
 * Bruneton's reference Earth is gray (exponent 0), close to dust, with a
 * 1.2 km scale height.
 *
 * Seen from the ground the kinds differ most around the sun (the forward
 * scattering: maritime haze a bright white halo, continental a bluish one)
 * and in how dark the haze is (urban soot absorbs); seen from above, only
 * dust reaches high enough to change much.
 */
export const AEROSOLS: Readonly<
  Record<
    AerosolType,
    {
      name: string;
      angstrom: number;
      singleScatteringAlbedo: number;
      phaseG: number;
      scaleHeight: number;
    }
  >
> = {
  continental: {
    name: "Continental",
    angstrom: 1.3,
    singleScatteringAlbedo: 0.93,
    phaseG: 0.7,
    scaleHeight: 1200,
  },
  urban: {
    name: "Urban",
    angstrom: 1.4,
    singleScatteringAlbedo: 0.82,
    phaseG: 0.69,
    scaleHeight: 1000,
  },
  maritime: {
    name: "Maritime",
    angstrom: 0.4,
    singleScatteringAlbedo: 0.99,
    phaseG: 0.77,
    scaleHeight: 800,
  },
  desert: {
    name: "Desert dust",
    angstrom: 0.2,
    singleScatteringAlbedo: 0.92,
    phaseG: 0.73,
    scaleHeight: 3000,
  },
};

/** Meteorological visibility of a set of parameters, km (the inverse). */
export function visibilityOf(p: Readonly<AtmosphereParameters>): number {
  const c = coefficients(p, 550);
  return 3.912 / (c.rayleighScattering + c.mieExtinction) / 1000;
}

/** Molecules per m² in one Dobson unit. */
const DOBSON_UNIT = 2.687e20;
/** Height integral of the ozone profile (a tent from 10 to 40 km), m. */
const OZONE_PROFILE_INTEGRAL = 15_000;

/** Linear interpolation in a table sampled every `step` nm from 360 nm. */
function tableAt(table: Float64Array, step: number, lambda: number): number {
  const x = Math.min(
    Math.max((lambda - LAMBDA_MIN) / step, 0),
    table.length - 1,
  );
  const i = Math.min(Math.floor(x), table.length - 2);
  const u = x - i;
  return table[i]! * (1 - u) + table[i + 1]! * u;
}

/** Solar spectral irradiance outside the atmosphere, W·m⁻²·nm⁻¹. */
export const solarIrradiance = (lambda: number): number =>
  tableAt(SOLAR_IRRADIANCE, 10, lambda);

/** CIE 1931 x̄, ȳ, z̄ at `lambda`. */
export function colorMatching(lambda: number): [number, number, number] {
  const x = Math.min(Math.max((lambda - LAMBDA_MIN) / 5, 0), 93.999999);
  const i = Math.floor(x);
  const u = x - i;
  const at = (row: number, column: number) => CIE_1931[row * 4 + column]!;
  return [1, 2, 3].map((c) => at(i, c) * (1 - u) + at(i + 1, c) * u) as [
    number,
    number,
    number,
  ];
}

/** Scattering and extinction coefficients at sea level for one wavelength. */
export interface Coefficients {
  rayleighScattering: number;
  mieScattering: number;
  mieExtinction: number;
  /** Ozone absorption at the profile's peak (density 1). */
  ozoneAbsorption: number;
}

export function coefficients(
  p: AtmosphereParameters,
  lambda: number,
): Coefficients {
  const microns = lambda * 1e-3;
  const mie = (p.mieBeta / p.mieScaleHeight) * microns ** -p.mieAngstromAlpha;
  return {
    rayleighScattering: p.rayleigh * microns ** -4,
    mieScattering: mie * p.mieSingleScatteringAlbedo,
    mieExtinction: mie,
    ozoneAbsorption:
      ((p.ozoneDobson * DOBSON_UNIT) / OZONE_PROFILE_INTEGRAL) *
      tableAt(OZONE_CROSS_SECTION, 10, lambda),
  };
}

/** Relative densities (Rayleigh, aerosols, ozone) at height `h` (m). */
export function densities(
  p: AtmosphereParameters,
  h: number,
): [number, number, number] {
  const ozone =
    h < 25_000
      ? Math.min(Math.max(h / 15_000 - 2 / 3, 0), 1)
      : Math.min(Math.max(-h / 15_000 + 8 / 3, 0), 1);
  return [
    Math.exp(-h / p.rayleighScaleHeight),
    Math.exp(-h / p.mieScaleHeight),
    ozone,
  ];
}

/** Extinction coefficient at height `h` for one wavelength, m⁻¹. */
export function extinction(
  p: AtmosphereParameters,
  c: Coefficients,
  h: number,
): number {
  const [r, m, o] = densities(p, h);
  return c.rayleighScattering * r + c.mieExtinction * m + c.ozoneAbsorption * o;
}

export const rayleighPhase = (mu: number): number =>
  (3 / (16 * Math.PI)) * (1 + mu * mu);

/** Cornette–Shanks, as Bruneton's reference uses. */
export function miePhase(g: number, mu: number): number {
  const k = ((3 / (8 * Math.PI)) * (1 - g * g)) / (2 + g * g);
  return (k * (1 + mu * mu)) / (1 + g * g - 2 * g * mu) ** 1.5;
}

type V3 = readonly [number, number, number];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/**
 * Distance along `d` (unit) from `x` to the sphere of radius `r` around the
 * center: the far intersection, or the near one with `near`; undefined on
 * a miss (or when both intersections are behind).
 */
export function sphereDistance(
  x: V3,
  d: V3,
  r: number,
  near = false,
): number | undefined {
  const b = dot(x, d);
  const c = dot(x, x) - r * r;
  const disc = b * b - c;
  if (disc < 0) {
    return undefined;
  }
  const s = Math.sqrt(disc);
  const t = near ? -b - s : -b + s;
  return t >= 0 ? t : undefined;
}

/**
 * Where a ray from `x` along `d` leaves the atmosphere or meets the ground:
 * its length and whether it ends on the ground.
 */
export function rayExtent(
  p: AtmosphereParameters,
  x: V3,
  d: V3,
): { length: number; ground: boolean } {
  const ground = sphereDistance(x, d, p.bottomRadius, true);
  if (ground !== undefined) {
    return { length: ground, ground: true };
  }
  return { length: sphereDistance(x, d, p.topRadius) ?? 0, ground: false };
}

/** Transmittance from `x` along `d` for `length` meters (midpoint rule). */
export function transmittance(
  p: AtmosphereParameters,
  c: Coefficients,
  x: V3,
  d: V3,
  length: number,
  steps = 500,
): number {
  const dt = length / steps;
  let depth = 0;
  for (let i = 0; i < steps; i++) {
    const t = (i + 0.5) * dt;
    const px = x[0] + d[0] * t;
    const py = x[1] + d[1] * t;
    const pz = x[2] + d[2] * t;
    const h = Math.sqrt(px * px + py * py + pz * pz) - p.bottomRadius;
    depth += extinction(p, c, h) * dt;
  }
  return Math.exp(-depth);
}

/** Transmittance from `x` toward the sun (0 where the ground is in the way). */
export function sunTransmittance(
  p: AtmosphereParameters,
  c: Coefficients,
  x: V3,
  sun: V3,
  steps = 300,
): number {
  const { length, ground } = rayExtent(p, x, sun);
  return ground ? 0 : transmittance(p, c, x, sun, length, steps);
}

/** Wavelengths for spectral integration on the CPU, every `step` nm. */
export function wavelengths(step = 5): number[] {
  const out: number[] = [];
  for (let l = LAMBDA_MIN; l <= LAMBDA_MAX; l += step) {
    out.push(l);
  }
  return out;
}

/**
 * A spectrum (W·m⁻²·sr⁻¹·nm⁻¹, or W·m⁻²·nm⁻¹) sampled at `lambdas` to
 * photometric linear sRGB: cd/m² (or lux), the trapezoid rule over λ.
 */
export function spectrumToRgb(
  lambdas: readonly number[],
  values: readonly number[],
): { rgb: [number, number, number]; y: number } {
  const xyz = [0, 0, 0];
  for (let i = 0; i < lambdas.length; i++) {
    const w =
      i === 0 || i === lambdas.length - 1
        ? (lambdas[1]! - lambdas[0]!) / 2
        : (lambdas[i + 1]! - lambdas[i - 1]!) / 2;
    const cmf = colorMatching(lambdas[i]!);
    for (let k = 0; k < 3; k++) {
      xyz[k]! += values[i]! * cmf[k]! * w;
    }
  }
  const m = XYZ_TO_LINEAR_SRGB;
  const rgb = [0, 1, 2].map(
    (r) =>
      MAX_LUMINOUS_EFFICACY *
      (m[r * 3]! * xyz[0]! + m[r * 3 + 1]! * xyz[1]! + m[r * 3 + 2]! * xyz[2]!),
  ) as [number, number, number];
  return { rgb, y: MAX_LUMINOUS_EFFICACY * xyz[1]! };
}

/** Illuminance from the sun outside the atmosphere, lux. */
export function solarIlluminanceOutside(): number {
  const lambdas = wavelengths(5);
  return spectrumToRgb(lambdas, lambdas.map(solarIrradiance)).y;
}

/**
 * Illuminance from the sun at `x` on a surface facing it (direct normal),
 * through the atmosphere: lux and its linear sRGB color.
 */
export function directSunIlluminance(
  p: AtmosphereParameters,
  x: V3,
  sun: V3,
): { rgb: [number, number, number]; y: number } {
  const lambdas = wavelengths(5);
  return spectrumToRgb(
    lambdas,
    lambdas.map(
      (l) =>
        solarIrradiance(l) * sunTransmittance(p, coefficients(p, l), x, sun),
    ),
  );
}

/**
 * Single-scattered radiance reaching `x` from direction `-d` (looking along
 * `d`), excluding the sun's disk and the ground's reflection: the
 * deterministic reference for reference.wgsl with one scattering event.
 * cd/m² in linear sRGB.
 */
export function singleScattering(
  p: AtmosphereParameters,
  x: V3,
  d: V3,
  sun: V3,
  { steps = 400, sunSteps = 120, lambdaStep = 10 } = {},
): { rgb: [number, number, number]; y: number } {
  const { length } = rayExtent(p, x, d);
  const mu = dot(d, sun);
  const lambdas = wavelengths(lambdaStep);
  const values = lambdas.map((l) => {
    const c = coefficients(p, l);
    const phaseR = rayleighPhase(mu);
    const phaseM = miePhase(p.miePhaseG, mu);
    const dt = length / steps;
    let depth = 0;
    let sum = 0;
    for (let i = 0; i < steps; i++) {
      const t = (i + 0.5) * dt;
      const q: V3 = [x[0] + d[0] * t, x[1] + d[1] * t, x[2] + d[2] * t];
      const h = Math.sqrt(dot(q, q)) - p.bottomRadius;
      const sigma = extinction(p, c, h);
      // Transmittance to the segment's middle, then through half of it.
      const viewT = Math.exp(-(depth + sigma * dt * 0.5));
      depth += sigma * dt;
      const [r, m] = densities(p, h);
      const scattering =
        c.rayleighScattering * r * phaseR + c.mieScattering * m * phaseM;
      sum += viewT * scattering * sunTransmittance(p, c, q, sun, sunSteps) * dt;
    }
    return solarIrradiance(l) * sum;
  });
  return spectrumToRgb(lambdas, values);
}

/**
 * The wavelengths real-time models compute at: the centers of 8 bands of
 * 50 nm over 380-780 nm (two groups of four, one per RGBA table), and each
 * band's weights to linear sRGB in photometric units (cd/m² per
 * W·m⁻²·sr⁻¹·nm⁻¹ at its center): ∫ solar × (CIE → sRGB) over the band ×
 * 683 / solar at the center, so a radiance shaped like the sun's spectrum
 * within a band converts exactly. Three wavelengths (Bruneton's real-time
 * default) were 20-40% off near sunset and in twilight, where long,
 * reddened paths reshape the spectrum; eight are within 0.5% of the full
 * spectral luminance there (r40).
 */
export function spectralBands(count = 8): {
  centers: number[];
  /** rgb weights per band, row by row. */
  weights: Array<[number, number, number]>;
} {
  const lo = 380;
  const hi = 780;
  const width = (hi - lo) / count;
  const m = XYZ_TO_LINEAR_SRGB;
  const centers: number[] = [];
  const weights: Array<[number, number, number]> = [];
  for (let i = 0; i < count; i++) {
    const center = lo + (i + 0.5) * width;
    const w: [number, number, number] = [0, 0, 0];
    for (let l = lo + i * width + 0.5; l < lo + (i + 1) * width; l += 1) {
      const [x, y, z] = colorMatching(l);
      const solar = solarIrradiance(l);
      for (let c = 0; c < 3; c++) {
        w[c]! +=
          solar * (m[c * 3]! * x + m[c * 3 + 1]! * y + m[c * 3 + 2]! * z);
      }
    }
    const scale = MAX_LUMINOUS_EFFICACY / solarIrradiance(center);
    centers.push(center);
    weights.push(w.map((v) => v * scale) as [number, number, number]);
  }
  return { centers, weights };
}
