// Scratch for T_k and dT_k, grown on demand so evaluation does not allocate.
let T = new Float64Array(16);
let dT = new Float64Array(16);

/**
 * Evaluate a SPICE type-2 Chebyshev record set at `t`.
 *
 * `records` is one segment's flat records, each
 * `[MID, RADIUS, c0..cn for x, c0..cn for y, c0..cn for z]` with
 * `recordSize = 2 + 3 * (n + 1)`. The record is
 * `floor((t - init) / intervalLength)` clamped to the first and last record, so
 * an exact boundary takes the later record (jplephem's rule) and times outside
 * the segment extrapolate the end records.
 *
 * Writes `[x, y, z, vx, vy, vz]` to `out`: position in the record's unit
 * (km for SPK), velocity per second (derivative scaled by `1 / RADIUS`).
 * A binary PCK record has the same layout with Euler angles in radians
 * as the three axes; the evaluation is identical.
 */
export function chebyshev(
  records: Float64Array,
  recordSize: number,
  init: number,
  intervalLength: number,
  t: number,
  out: Float64Array,
): Float64Array {
  const count = records.length / recordSize;
  let index = Math.floor((t - init) / intervalLength);
  index = Math.min(Math.max(index, 0), count - 1);
  const base = index * recordSize;
  const mid = records[base]!;
  const radius = records[base + 1]!;
  const n = (recordSize - 2) / 3; // coefficients per axis
  const x = (t - mid) / radius;

  // T_k(x) and dT_k/dx by recurrence; evaluated once for all three axes.
  if (T.length < n) {
    T = new Float64Array(n);
    dT = new Float64Array(n);
  }
  T[0] = 1;
  if (n > 1) {
    T[1] = x;
    dT[1] = 1;
  }
  for (let k = 2; k < n; k++) {
    T[k] = 2 * x * T[k - 1]! - T[k - 2]!;
    dT[k] = 2 * T[k - 1]! + 2 * x * dT[k - 1]! - dT[k - 2]!;
  }

  for (let axis = 0; axis < 3; axis++) {
    const c = base + 2 + axis * n;
    let p = 0;
    let v = 0;
    for (let k = 0; k < n; k++) {
      p += records[c + k]! * T[k]!;
      v += records[c + k]! * dT[k]!;
    }
    out[axis] = p;
    out[3 + axis] = v / radius;
  }
  return out;
}
