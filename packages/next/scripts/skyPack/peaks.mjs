// Stars as points from an equirectangular luminance map (NASA's bright-star
// layer): local maxima, a centroid, a flux and a color each. The window of a
// maximum stretches in x with latitude, since a texel is narrower there.
// Findings from the star spike, written afresh.

/** A texel must stand above this to count as a peak. */
export const PEAK_THRESHOLD = 0.0035;
/** Texels brighter than this belong to a clipped disc, counted once. */
const SATURATED = 0.85;
/** Apertures, in rows: an ordinary star, and a clipped disc. */
const RADIUS = 3;
const RADIUS_SATURATED = 14;

/**
 * @typedef {{ ra: number, dec: number, flux: number, peak: number,
 *   color?: [number, number, number] }} Peak  Degrees; flux in map units
 *   weighted by cos(dec), over the star's aperture.
 */

/** The x of a right ascension in degrees, the map's convention (180° at x = 0). */
export function xOfRa(ra, width) {
  return (0.5 - ra / 360) * width - 0.5;
}

/** The y of a declination in degrees. */
export function yOfDec(dec, height) {
  return ((90 - dec) / 180) * height - 0.5;
}

/**
 * @param {Float32Array} luminance  width × height, rows from the north pole.
 * @param {number} width
 * @param {number} height
 * @param {[Float32Array, Float32Array, Float32Array]} [rgb]  for colors.
 * @returns {Peak[]}
 */
export function findPeaks(luminance, width, height, rgb) {
  const W = width;
  const H = height;
  const cosRow = new Float64Array(H);
  const halfWindow = new Int32Array(H);
  for (let y = 0; y < H; y++) {
    const dec = 90 - ((y + 0.5) / H) * 180;
    cosRow[y] = Math.max(Math.cos((dec * Math.PI) / 180), 0.02);
    const c = Math.cos((Math.min(Math.abs(dec), 88.5) * Math.PI) / 180);
    const wx = Math.max(3, Math.ceil(3 / c) | 1);
    halfWindow[y] = (wx - 1) >> 1;
  }
  // 1. Local maxima (ties all count; they are merged below).
  const mask = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    const hx = halfWindow[y];
    for (let x = 0; x < W; x++) {
      const v = luminance[y * W + x];
      if (!(v > PEAK_THRESHOLD)) {
        continue;
      }
      let top = true;
      for (let dy = -1; dy <= 1 && top; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= H) {
          continue;
        }
        for (let dx = -hx; dx <= hx; dx++) {
          if (luminance[yy * W + ((x + dx + W) % W)] > v) {
            top = false;
            break;
          }
        }
      }
      mask[y * W + x] = top ? 1 : 0;
    }
  }
  // 2. Connected groups of maxima (and of clipped texels), one star each.
  const groups = (test) => {
    const label = new Int32Array(W * H);
    const found = [];
    const stack = [];
    for (let s = 0; s < W * H; s++) {
      if (label[s] || !test(s)) {
        continue;
      }
      const id = found.length + 1;
      let sx = 0;
      let sy = 0;
      let n = 0;
      const x0 = s % W;
      label[s] = id;
      stack.push(s);
      while (stack.length) {
        const i = stack.pop();
        const y = (i / W) | 0;
        const x = i % W;
        // Unwrapped about the first texel, so a group on the seam centers.
        sx += x0 + ((x - x0 + W + (W >> 1)) % W) - (W >> 1);
        sy += y;
        n++;
        for (let dy = -1; dy <= 1; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= H) {
            continue;
          }
          for (let dx = -1; dx <= 1; dx++) {
            const j = yy * W + ((x + dx + W) % W);
            if (!label[j] && test(j)) {
              label[j] = id;
              stack.push(j);
            }
          }
        }
      }
      found.push([sx / n, sy / n]);
    }
    return { label, found };
  };
  const maxima = groups((i) => mask[i] === 1);
  const clipped = groups((i) => luminance[i] > SATURATED);
  // One peak per clipped disc (at its center), in place of the maxima in it.
  const peaks = [];
  for (const [cx, cy] of maxima.found) {
    const x = ((Math.round(cx) % W) + W) % W;
    const y = Math.round(cy);
    if (clipped.label[y * W + x] === 0) {
      peaks.push({ x, y, saturated: false });
    }
  }
  for (const [cx, cy] of clipped.found) {
    peaks.push({
      x: ((Math.round(cx) % W) + W) % W,
      y: Math.round(cy),
      saturated: true,
    });
  }
  // 3. Each pixel goes to the nearest peak whose aperture holds it.
  const owner = new Int32Array(W * H).fill(-1);
  const nearest = new Float32Array(W * H).fill(Infinity);
  const visit = (p, fn) => {
    const R = p.saturated ? RADIUS_SATURATED : RADIUS;
    for (let dy = -R; dy <= R; dy++) {
      const y = p.y + dy;
      if (y < 0 || y >= H) {
        continue;
      }
      const c = cosRow[y];
      const reach = Math.min(Math.ceil(R / c), W >> 1);
      for (let dx = -reach; dx <= reach; dx++) {
        const d2 = dy * dy + dx * dx * c * c;
        if (d2 <= R * R) {
          fn(y * W + ((p.x + dx + W) % W), dx, dy, d2, y);
        }
      }
    }
  };
  peaks.forEach((p, k) =>
    visit(p, (i, ...rest) => {
      const d2 = rest[2];
      if (d2 < nearest[i]) {
        nearest[i] = d2;
        owner[i] = k;
      }
    }),
  );
  const out = [];
  peaks.forEach((p, k) => {
    let flux = 0;
    let sx = 0;
    let sy = 0;
    const all = [0, 0, 0];
    const unclipped = [0, 0, 0];
    visit(p, (i, dx, dy, ...rest) => {
      const y = rest[1];
      const v = luminance[i];
      if (owner[i] !== k || !(v > 0)) {
        return;
      }
      const w = v * cosRow[y];
      flux += w;
      sx += w * dx;
      sy += w * dy;
      if (rgb) {
        const r = rgb[0][i];
        const g = rgb[1][i];
        const b = rgb[2][i];
        const un = Math.max(r, g, b) < 0.92;
        all[0] += r * cosRow[y];
        all[1] += g * cosRow[y];
        all[2] += b * cosRow[y];
        if (un) {
          unclipped[0] += r * cosRow[y];
          unclipped[1] += g * cosRow[y];
          unclipped[2] += b * cosRow[y];
        }
      }
    });
    if (!(flux > 0)) {
      return;
    }
    const fx = p.x + sx / flux;
    const fy = p.y + sy / flux;
    const peak = {
      ra: ((((0.5 - (fx + 0.5) / W) * 360) % 360) + 360) % 360,
      dec: 90 - ((fy + 0.5) / H) * 180,
      flux,
      peak: luminance[p.y * W + p.x],
    };
    if (rgb) {
      const sum = (a) => a[0] + a[1] + a[2];
      peak.color = sum(unclipped) > 0.02 * sum(all) ? unclipped : all;
    }
    out.push(peak);
  });
  return out;
}
