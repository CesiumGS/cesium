/**
 * Stars as points (plan §4.2, the night sky): read out of a star map. 1.x's
 * Tycho map draws each star as one texel (5 arcminutes) whose value grows
 * with the star's brightness, compressed (Sirius about 240 of 255, a ninth
 * magnitude star about 16), over a faint 8-bit background (the Milky Way).
 * Drawn as a texture, a star was a texel magnified and filtered (soft at
 * any ordinary field of view), and the background's 8-bit steps showed as
 * contours at an open exposure.
 *
 * Bright stars are disks a few texels across, the rest single texels.
 * Here each star becomes a point: its direction (the centroid of its
 * texels), its color (theirs), and its brightness from its rank: sorted by
 * their light in the map (summed over 7 × 7 texels), brightest first, the n-th star takes the magnitude the sky has n stars
 * brighter than (Allen's whole-sky counts: 1 brighter than Sirius's −1.46,
 * about 4,800 than 6, 41,000 than 8). The map's compression drops out; only
 * its order counts. What is left, low-passed in float, is the background.
 */

import type { PointSpread } from "../scene/observer.ts";
import type { StarCells } from "./starCells.ts";

/** Per star: direction (ICRF, unit), illuminance (lux), color (luminance 1). */
export const STAR_FLOATS = 8;

/** The most a star's quad reaches, pixels (sky.slang `STAR_RADIUS_MAX`). */
export const STAR_RADIUS_MAX = 64;

/**
 * How far a star's quad reaches around it, device pixels: the rule sky.slang's
 * `starReach` holds. `brightest` is its largest channel, pre-exposed. The core's
 * 3.5 standard deviations are a distance past the last pixel's edge, so the half
 * pixel keeps 0.999 of its light wherever the star falls; a wing reaches as far
 * as it stays above 0.002 of white. At most `STAR_RADIUS_MAX`.
 */
export function starRadius(
  spread: PointSpread,
  brightest: number,
  pixelRatio: number,
): number {
  let radius = 3.5 * spread.core * pixelRatio + 0.5;
  if (spread.wing && spread.wing.share > 0) {
    const wing = spread.wing.sigma * pixelRatio;
    const peak = (brightest * spread.wing.share) / (2 * Math.PI * wing * wing);
    radius = Math.max(
      radius,
      wing * Math.sqrt(2 * Math.log(Math.max(peak / 0.002, 1))),
    );
  }
  return Math.min(radius, STAR_RADIUS_MAX);
}

export interface StarField {
  /** `STAR_FLOATS` per star, brightest first (by cell, with `cells`). */
  points: Float32Array;
  count: number;
  /**
   * The stars by sky cell (atmosphere/starCells.ts), as the worker sends them;
   * `points` is then in the same order. Sky builds them if they aren't here.
   */
  cells?: StarCells;
  /**
   * Glare's bright end: the brightest over the whole sky, brightest first, as points.
   * The worker sends them; Sky picks them if they aren't here.
   */
  glareStars?: Float32Array;
  /**
   * The rest of the sky: by face (+x, −x, +y, −y, +z, −z, as the map) and
   * then by level (the first `backgroundSize`² texels, each next half
   * across), linear sRGB rgba, cd/m².
   */
  backgroundLevels: Float32Array[][];
  backgroundSize: number;
  /** The background already holds the faint stars (a deep map). */
  holdsFaintStars: boolean;
  /** The background's mean luminance, cd/m²: 0 for today's map. */
  meanBackground: number;
}

/** At and above this vertical field of view, degrees, the background is its top level. */
const BACKGROUND_FULL_FOV = 30;

/**
 * The background's mip level at a view's `tanY`: 0 at 30° of vertical field of view
 * and wider, rising with `log2` as the field narrows, at most `levels − 1`. So a long
 * lens stays soft, and a zoom doesn't pop.
 */
export function backgroundLevel(tanY: number, levels: number): number {
  const fov = (2 * Math.atan(tanY) * 180) / Math.PI;
  const level = Math.log2(BACKGROUND_FULL_FOV / fov);
  return Math.min(Math.max(level, 0), Math.max(levels - 1, 0));
}

/** erf (sky.slang `erfApprox`: Winitzki's approximation, within 10⁻⁴). */
const erf = (x: number): number => {
  const x2 = x * x;
  return (
    Math.sign(x) *
    Math.sqrt(1 - Math.exp((-x2 * (1.2732395 + 0.147 * x2)) / (1 + 0.147 * x2)))
  );
};

/** The share of a star's light on its centered pixel, for a core of `sigma` pixels. */
export const starPeakShare = (sigma: number): number =>
  erf(0.5 / (Math.SQRT2 * sigma)) ** 2;

/**
 * The levels of a square rgba image under a box filter: each next level
 * half across (rounded down, at least 1), averaging the texels it covers.
 */
export function boxLevels(base: Float32Array, size: number): Float32Array[] {
  const levels = [base];
  let n = size;
  let prev = base;
  while (n > 1) {
    const m = Math.max(1, n >> 1);
    const next = new Float32Array(m * m * 4);
    for (let y = 0; y < m; y++) {
      for (let x = 0; x < m; x++) {
        const x1 = Math.min(2 * x + 1, n - 1);
        const y1 = Math.min(2 * y + 1, n - 1);
        for (let c = 0; c < 4; c++) {
          next[(y * m + x) * 4 + c] =
            (prev[(2 * y * n + 2 * x) * 4 + c]! +
              prev[(2 * y * n + x1) * 4 + c]! +
              prev[(y1 * n + 2 * x) * 4 + c]! +
              prev[(y1 * n + x1) * 4 + c]!) /
            4;
        }
      }
    }
    levels.push(next);
    prev = next;
    n = m;
  }
  return levels;
}

/** One face of a star map: sRGB rgba8, square. */
export interface StarMapFace {
  data: Uint8ClampedArray;
  width: number;
}

/**
 * Whole-sky star counts, V: (magnitude, log10 of the number of stars
 * brighter). The first points are the brightest stars themselves (Sirius,
 * Canopus, Arcturus); then Allen's Astrophysical Quantities.
 */
const COUNTS: ReadonlyArray<readonly [number, number]> = [
  [-1.46, 0],
  [-0.74, Math.log10(2)],
  [-0.05, Math.log10(4)],
  [1, 1.18],
  [2, 1.68],
  [3, 2.23],
  [4, 2.72],
  [5, 3.2],
  [6, 3.68],
  [7, 4.15],
  [8, 4.62],
  [9, 5.08],
  [10, 5.53],
];

/** The magnitude of the `rank`-th brightest star of the sky (1: Sirius). */
export function magnitudeOfRank(rank: number): number {
  const n = Math.log10(Math.max(rank, 1));
  for (let i = 1; i < COUNTS.length; i++) {
    const [m1, n1] = COUNTS[i]!;
    if (n <= n1 || i === COUNTS.length - 1) {
      const [m0, n0] = COUNTS[i - 1]!;
      return m0 + ((m1 - m0) * (n - n0)) / (n1 - n0);
    }
  }
  return COUNTS[COUNTS.length - 1]![0];
}

/** A star of visual magnitude 0 outside the atmosphere, lux. */
export const MAGNITUDE_ZERO_ILLUMINANCE = 2.54e-6;

/**
 * The brightest of the background (the Milky Way's core) above the rest,
 * cd/m²: about twice the dark sky's own glow there.
 */
export const MILKY_WAY_LUMINANCE = 1.5e-4;

/**
 * A texel's direction on a face of 1.x's star map (`u`, `v` in [−1, 1]
 * across it, v down the image): WebGPU's cube layout with each face
 * upside down, as 1.x uploads its cube maps (`flipY`). Checked: Procyon,
 * Capella and α Centauri land where they are.
 */
export function cubeDirection(
  face: number,
  u: number,
  v: number,
): [number, number, number] {
  switch (face) {
    case 0:
      return [1, v, -u];
    case 1:
      return [-1, v, u];
    case 2:
      return [u, 1, -v];
    case 3:
      return [u, -1, v];
    case 4:
      return [u, v, 1];
    default:
      return [-u, v, -1];
  }
}

const SRGB_TO_LINEAR = Float32Array.from({ length: 256 }, (_, i) => {
  const c = i / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
});

/** Texels a star must stand above the background by (of 255). */
const DETECT = 12;
/** Background blocks, texels across. */
const BLOCK = 16;

/**
 * The stars and background of a star map (six faces, sRGB): see above.
 */
export function extractStars(faces: readonly StarMapFace[]): StarField {
  interface Found {
    dir: [number, number, number];
    rank: number;
    color: [number, number, number];
  }
  const found: Found[] = [];
  const size = faces[0]!.width;
  const blocks = size / BLOCK;
  const backgroundLinear: Float32Array[] = [];
  for (let f = 0; f < 6; f++) {
    const { data, width } = faces[f]!;
    const value = new Uint8Array(width * width);
    for (let i = 0; i < width * width; i++) {
      value[i] = Math.max(data[i * 4]!, data[i * 4 + 1]!, data[i * 4 + 2]!);
    }
    // Stars: texels at least everything within 3 (ties to the first; a
    // bright star's disk, 4 or 5 texels across, counts once), standing
    // above the darkest of the ring 4 out by `DETECT`.
    for (let y = 4; y < width - 4; y++) {
      for (let x = 4; x < width - 4; x++) {
        const i = y * width + x;
        const v = value[i]!;
        if (v < DETECT) {
          continue;
        }
        let peak = true;
        for (let dy = -3; dy <= 3 && peak; dy++) {
          for (let dx = -3; dx <= 3; dx++) {
            if (dx === 0 && dy === 0) {
              continue;
            }
            const w = value[i + dy * width + dx]!;
            if (w > v || (w === v && (dy < 0 || (dy === 0 && dx < 0)))) {
              peak = false;
              break;
            }
          }
        }
        if (!peak) {
          continue;
        }
        let floor = 255;
        for (let k = -4; k <= 4; k++) {
          floor = Math.min(
            floor,
            value[i - 4 * width + k]!,
            value[i + 4 * width + k]!,
            value[i + k * width - 4]!,
            value[i + k * width + 4]!,
          );
        }
        if (v - floor < DETECT) {
          continue;
        }
        // Its light over 7 × 7 texels above the floor: centroid, color, and
        // how bright it is in the map's terms (its rank's key).
        const base = SRGB_TO_LINEAR[floor]!;
        let sx = 0;
        let sy = 0;
        let total = 0;
        const color: [number, number, number] = [0, 0, 0];
        for (let dy = -3; dy <= 3; dy++) {
          for (let dx = -3; dx <= 3; dx++) {
            const j = (i + dy * width + dx) * 4;
            const r = Math.max(SRGB_TO_LINEAR[data[j]!]! - base, 0);
            const g = Math.max(SRGB_TO_LINEAR[data[j + 1]!]! - base, 0);
            const b = Math.max(SRGB_TO_LINEAR[data[j + 2]!]! - base, 0);
            const w = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            sx += w * dx;
            sy += w * dy;
            total += w;
            color[0] += r;
            color[1] += g;
            color[2] += b;
          }
        }
        const cx = x + (total > 0 ? sx / total : 0);
        const cy = y + (total > 0 ? sy / total : 0);
        const d = cubeDirection(
          f,
          ((cx + 0.5) / width) * 2 - 1,
          ((cy + 0.5) / width) * 2 - 1,
        );
        const length = Math.hypot(d[0], d[1], d[2]);
        found.push({
          dir: [d[0] / length, d[1] / length, d[2] / length],
          rank: total,
          color,
        });
      }
    }
    // The background: each block's 40th percentile (stars are few), in
    // linear light.
    const grid = new Float32Array(blocks * blocks * 4);
    const channel = new Uint8Array(BLOCK * BLOCK);
    for (let by = 0; by < blocks; by++) {
      for (let bx = 0; bx < blocks; bx++) {
        for (let c = 0; c < 3; c++) {
          let n = 0;
          for (let y = 0; y < BLOCK; y++) {
            for (let x = 0; x < BLOCK; x++) {
              channel[n++] =
                data[((by * BLOCK + y) * width + bx * BLOCK + x) * 4 + c]!;
            }
          }
          channel.sort();
          grid[(by * blocks + bx) * 4 + c] =
            SRGB_TO_LINEAR[channel[Math.floor(BLOCK * BLOCK * 0.4)]!]!;
        }
        grid[(by * blocks + bx) * 4 + 3] = 1;
      }
    }
    backgroundLinear.push(grid);
  }
  // Brightness by rank.
  found.sort((a, b) => b.rank - a.rank);
  const points = new Float32Array(found.length * STAR_FLOATS);
  found.forEach((s, i) => {
    const o = i * STAR_FLOATS;
    points[o] = s.dir[0];
    points[o + 1] = s.dir[1];
    points[o + 2] = s.dir[2];
    points[o + 3] =
      MAGNITUDE_ZERO_ILLUMINANCE * 10 ** (-0.4 * magnitudeOfRank(i + 1));
    const y = 0.2126 * s.color[0] + 0.7152 * s.color[1] + 0.0722 * s.color[2];
    for (let c = 0; c < 3; c++) {
      points[o + 4 + c] = y > 0 ? s.color[c]! / y : 1;
    }
  });
  // The background above its floor (the map's darkest blocks: its noise,
  // not sky), scaled so the Milky Way's core is `MILKY_WAY_LUMINANCE`.
  const lum = (g: Float32Array, k: number) =>
    0.2126 * g[k]! + 0.7152 * g[k + 1]! + 0.0722 * g[k + 2]!;
  const levels: number[] = [];
  for (const g of backgroundLinear) {
    for (let k = 0; k < g.length; k += 4) {
      levels.push(lum(g, k));
    }
  }
  levels.sort((a, b) => a - b);
  const floor = levels[Math.floor(levels.length * 0.1)]!;
  const top = levels[Math.floor(levels.length * 0.999)]!;
  const scale = top > floor ? MILKY_WAY_LUMINANCE / (top - floor) : 0;
  const background = backgroundLinear.map((g) => {
    const out = new Float32Array(g.length);
    for (let k = 0; k < g.length; k += 4) {
      const l = lum(g, k);
      const above = Math.max(l - floor, 0) * scale;
      for (let c = 0; c < 3; c++) {
        out[k + c] = l > 0 ? (g[k + c]! / l) * above : 0;
      }
      out[k + 3] = 1;
    }
    return out;
  });
  return {
    points,
    count: found.length,
    backgroundLevels: background.map((face) => boxLevels(face, blocks)),
    backgroundSize: blocks,
    holdsFaintStars: false,
    meanBackground: 0,
  };
}
