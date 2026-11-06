/**
 * Interpolation of discrete states (position and velocity at epochs), shared
 * by SPK types 8, 9, 12 and 13 and CCSDS OEM data. The window rule and the two
 * methods follow SPICE (`spkr09`/`spkr13`, `LGRINT`, `HRMINT`). Results stay in
 * the input's units.
 */

/** The largest Hermite window, in states (degree 31). */
const MAX_HERMITE_WINDOW = 16;
// Hermite scratch, so `interpolate` allocates nothing per call: doubled nodes.
const hermiteNodes = new Float64Array(2 * MAX_HERMITE_WINDOW);
const hermiteColumn = new Float64Array(2 * MAX_HERMITE_WINDOW);
const hermiteNewton = new Float64Array(2 * MAX_HERMITE_WINDOW);

export type InterpolationMethod = "lagrange" | "hermite";

/**
 * The 0-based index of the first state of the `size`-state window used at `t`.
 * `low` is the last epoch strictly before `t`. An even window is
 * `low - size/2 + 1 ..`; an odd one is centered on the epoch nearest `t`
 * (ties go to the earlier epoch). The result is clamped to the data.
 */
export function windowStart(
  epochs: Float64Array,
  t: number,
  size: number,
): number {
  const count = epochs.length;
  if (!Number.isInteger(size) || size < 1 || size > count) {
    throw new Error(
      `interpolate: window of ${size} states does not fit ${count} epochs`,
    );
  }
  // Binary search: the last index with epochs[i] < t, or -1.
  let lo = -1;
  let hi = count - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (epochs[mid]! < t) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  const low = lo;
  let first: number;
  if (size % 2 === 0) {
    first = low - size / 2 + 1;
  } else {
    let near: number;
    if (low < 0) {
      near = 0;
    } else if (low >= count - 1) {
      near = count - 1;
    } else {
      near = t - epochs[low]! <= epochs[low + 1]! - t ? low : low + 1;
    }
    first = near - (size - 1) / 2;
  }
  return Math.min(Math.max(first, 0), count - size);
}

/**
 * The state at `t` from the `size` states starting at index `first`, written
 * to `out` (6 values: position, velocity).
 *
 * Lagrange interpolates each of the six components on its own. Hermite fits
 * one polynomial per axis through the positions and velocities, and returns its
 * value and derivative.
 */
export function interpolateState(
  method: InterpolationMethod,
  epochs: Float64Array,
  states: Float64Array,
  first: number,
  size: number,
  t: number,
  out: Float64Array,
): Float64Array {
  if (first < 0 || size < 1 || first + size > epochs.length) {
    throw new Error("interpolate: window lies outside the epochs");
  }
  // Work in time relative to the window's first epoch for conditioning.
  const origin = epochs[first]!;
  const x = t - origin;
  if (method === "lagrange") {
    for (let c = 0; c < 6; c++) {
      let sum = 0;
      for (let i = 0; i < size; i++) {
        const xi = epochs[first + i]! - origin;
        let weight = states[(first + i) * 6 + c]!;
        for (let j = 0; j < size; j++) {
          if (j !== i) {
            const xj = epochs[first + j]! - origin;
            weight *= (x - xj) / (xi - xj);
          }
        }
        sum += weight;
      }
      out[c] = sum;
    }
    return out;
  }

  // Hermite: Newton divided differences on doubled nodes.
  if (size > MAX_HERMITE_WINDOW) {
    throw new Error(
      `interpolate: a Hermite window of ${size} states exceeds the limit of ${MAX_HERMITE_WINDOW}`,
    );
  }
  const n = 2 * size;
  const nodes = hermiteNodes;
  for (let i = 0; i < size; i++) {
    nodes[2 * i] = nodes[2 * i + 1] = epochs[first + i]! - origin;
  }
  const column = hermiteColumn;
  const newton = hermiteNewton;
  for (let axis = 0; axis < 3; axis++) {
    for (let i = 0; i < size; i++) {
      column[2 * i] = column[2 * i + 1] = states[(first + i) * 6 + axis]!;
    }
    newton[0] = column[0]!;
    for (let order = 1; order < n; order++) {
      for (let k = n - 1; k >= order; k--) {
        const span = nodes[k]! - nodes[k - order]!;
        column[k] =
          // Order 1 across a repeated node is the stored derivative.
          span === 0
            ? states[(first + (k >> 1)) * 6 + 3 + axis]!
            : (column[k]! - column[k - 1]!) / span;
      }
      newton[order] = column[order]!;
    }
    // Horner evaluation of p and p'.
    let p = newton[n - 1]!;
    let dp = 0;
    for (let k = n - 2; k >= 0; k--) {
      dp = dp * (x - nodes[k]!) + p;
      p = p * (x - nodes[k]!) + newton[k]!;
    }
    out[axis] = p;
    out[3 + axis] = dp;
  }
  return out;
}
