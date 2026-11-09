// Turning peaks into stars with magnitudes and colors, and merging them
// with a catalog's bright end.
import { MAGNITUDE_ZERO_ILLUMINANCE } from "../../src/atmosphere/stars.ts";

const LUM = [0.2126, 0.7152, 0.0722];

/** The unit direction of a right ascension and declination, degrees (ICRF). */
export function direction(ra, dec) {
  const r = (ra * Math.PI) / 180;
  const d = (dec * Math.PI) / 180;
  return [Math.cos(d) * Math.cos(r), Math.cos(d) * Math.sin(r), Math.sin(d)];
}

/**
 * Finds stars near a direction: a grid over the unit cube, cells as wide as
 * the search radius.
 */
export class DirectionIndex {
  /** @param {ReadonlyArray<readonly [number, number, number]>} dirs */
  constructor(dirs, radius) {
    this.dirs = dirs;
    this.cell = Math.max(radius, 1e-6);
    this.limit = Math.cos(radius);
    this.cells = new Map();
    dirs.forEach((d, i) => {
      const key = this.key(d[0], d[1], d[2]);
      const list = this.cells.get(key);
      if (list) {
        list.push(i);
      } else {
        this.cells.set(key, [i]);
      }
    });
  }

  key(x, y, z) {
    const c = this.cell;
    return `${Math.floor(x / c)},${Math.floor(y / c)},${Math.floor(z / c)}`;
  }

  /** The index of the nearest direction within the radius, or -1. */
  nearest(d) {
    const c = this.cell;
    const bx = Math.floor(d[0] / c);
    const by = Math.floor(d[1] / c);
    const bz = Math.floor(d[2] / c);
    let best = -1;
    let bestDot = this.limit;
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        for (let k = -1; k <= 1; k++) {
          for (const n of this.cells.get(`${bx + i},${by + j},${bz + k}`) ??
            []) {
            const o = this.dirs[n];
            const dot = o[0] * d[0] + o[1] * d[1] + o[2] * d[2];
            if (dot >= bestDot) {
              bestDot = dot;
              best = n;
            }
          }
        }
      }
    }
    return best;
  }
}

/**
 * Flux to magnitude from pairs, as the median magnitude in bins of log10
 * flux 0.1 wide (at least 3 pairs), made monotone, joined linearly. Below
 * the faintest bin the magnitude follows -2.5 log10 flux; above the
 * brightest it stays (the map clips there). `faintConstant` is flux times
 * 10^(0.4 m) in that faint range.
 *
 * @param {ReadonlyArray<{ flux: number, magnitude: number }>} pairs
 */
export function fitFluxCurve(pairs) {
  const logs = pairs.map((p) => Math.log10(p.flux));
  const lo = Math.floor(Math.min(...logs) * 10) / 10;
  const bins = new Map();
  pairs.forEach((p, i) => {
    const b = Math.floor((logs[i] - lo) * 10 + 1e-9);
    (bins.get(b) ?? bins.set(b, []).get(b)).push(p.magnitude);
  });
  const centers = [];
  const medians = [];
  for (const b of [...bins.keys()].sort((a, c) => a - c)) {
    const list = bins.get(b).sort((a, c) => a - c);
    if (list.length >= 3) {
      centers.push(lo + b / 10 + 0.05);
      medians.push(list[list.length >> 1]);
    }
  }
  if (centers.length < 2) {
    throw new Error("the calibration found too few matched stars");
  }
  for (let i = 1; i < medians.length; i++) {
    medians[i] = Math.min(medians[i], medians[i - 1]);
  }
  const c0 = medians[0] + 2.5 * centers[0];
  const curve = (flux) => {
    const l = Math.log10(Math.max(flux, 1e-9));
    if (l <= centers[0]) {
      return c0 - 2.5 * l;
    }
    const n = centers.length;
    if (l >= centers[n - 1]) {
      return medians[n - 1];
    }
    let i = 1;
    while (centers[i] < l) {
      i++;
    }
    const t = (l - centers[i - 1]) / (centers[i] - centers[i - 1]);
    return medians[i - 1] + t * (medians[i] - medians[i - 1]);
  };
  curve.faintConstant = 10 ** (0.4 * c0);
  return curve;
}

const wyman = (x, m, s1, s2) =>
  Math.exp(-0.5 * ((x - m) / (x < m ? s1 : s2)) ** 2);

/** CIE 1931 color matching functions (Wyman, Sloan and Shirley 2013), nm. */
function cmf(nm) {
  return [
    1.056 * wyman(nm, 599.8, 37.9, 31) +
      0.362 * wyman(nm, 442, 16, 26.7) -
      0.065 * wyman(nm, 501.1, 20.4, 26.2),
    0.821 * wyman(nm, 568.8, 46.9, 40.5) + 0.286 * wyman(nm, 530.9, 16.3, 31.1),
    1.217 * wyman(nm, 437, 11.8, 36) + 0.681 * wyman(nm, 459, 26, 13.8),
  ];
}

/** Linear sRGB of a blackbody at `T` kelvin, luminance 1. */
function blackbody(T) {
  const h = 6.626e-34;
  const c = 3e8;
  const k = 1.381e-23;
  let X = 0;
  let Y = 0;
  let Z = 0;
  for (let nm = 380; nm <= 780; nm += 5) {
    const l = nm * 1e-9;
    const s =
      1 / (l ** 5 * (Math.exp(Math.min((h * c) / (l * k * T), 500)) - 1));
    const [x, y, z] = cmf(nm);
    X += s * x;
    Y += s * y;
    Z += s * z;
  }
  const rgb = [
    3.2406 * X - 1.5372 * Y - 0.4986 * Z,
    -0.9689 * X + 1.8758 * Y + 0.0415 * Z,
    0.0557 * X - 0.204 * Y + 1.057 * Z,
  ].map((v) => Math.max(v, 0));
  const lum = rgb[0] * LUM[0] + rgb[1] * LUM[1] + rgb[2] * LUM[2];
  return rgb.map((v) => v / lum);
}

/**
 * The color of a star from its B-V (Ballesteros 2012's temperature, a
 * blackbody through the CIE functions): linear sRGB, luminance 1.
 */
export function starColor(bv) {
  const t = 4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62));
  return blackbody(Math.min(Math.max(t, 1500), 40000));
}

/** Luminance of a linear sRGB color. */
export function luminanceOf(c) {
  return c[0] * LUM[0] + c[1] * LUM[1] + c[2] * LUM[2];
}

/**
 * The catalog's stars at `split` or brighter, and the map's stars fainter
 * than it that match none of them within 2 arcminutes, brightest first.
 *
 * @param {Array<{dir: number[], mag: number, color: number[]}>} catalog
 * @param {Array<{dir: number[], mag: number, color: number[]}>} mapStars
 */
export function mergeHybrid(catalog, mapStars, split = 7) {
  const bright = catalog.filter((s) => s.mag <= split);
  const index = new DirectionIndex(
    bright.map((s) => s.dir),
    (2 / 60) * (Math.PI / 180),
  );
  const faint = mapStars.filter(
    (s) => s.mag > split && index.nearest(s.dir) < 0,
  );
  return [...bright, ...faint].sort((a, b) => a.mag - b.mag);
}

/** Illuminance of a star of magnitude `m`, lux. */
export function illuminanceOf(m) {
  return MAGNITUDE_ZERO_ILLUMINANCE * 10 ** (-0.4 * m);
}
