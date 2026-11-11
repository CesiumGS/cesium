// NURBS to rational Bézier, exactly (overall plan §13.33). Boehm knot
// insertion in homogeneous coordinates (Piegl and Tiller, "The NURBS Book",
// A5.1 for curves, applied in each direction for surfaces), up to full
// multiplicity at every interior knot. The de Boor evaluators are for tests
// and as a reference. Lengths are metres.

export interface NurbsSurface {
  readonly degreeU: number;
  readonly degreeV: number;
  readonly knotsU: Float64Array;
  readonly knotsV: Float64Array;
  readonly countU: number;
  readonly countV: number;
  /** 3 per control point, m, u fastest. */
  readonly points: Float64Array;
  /** Per control point; default all 1. */
  readonly weights?: Float64Array;
}

export interface NurbsCurve {
  readonly degree: number;
  readonly knots: Float64Array;
  readonly count: number;
  readonly dimension: 2 | 3;
  /** `dimension` per control point, m. */
  readonly points: Float64Array;
  /** Per control point; default all 1. */
  readonly weights?: Float64Array;
}

/** Homogeneous control points, each a Float64Array of `comps` numbers. */
type Points = Float64Array[];

/** Throws unless the knots are non-decreasing, clamped, and sized to the count. */
function checkKnots(
  what: string,
  degree: number,
  knots: Float64Array,
  count: number,
): void {
  if (!Number.isInteger(degree) || degree < 1) {
    throw new Error(`${what}: degree must be at least 1`);
  }
  if (count < degree + 1 || knots.length !== count + degree + 1) {
    throw new Error(
      `${what}: ${knots.length} knots do not fit ${count} points of degree ${degree}`,
    );
  }
  for (let i = 1; i < knots.length; i++) {
    if (knots[i]! < knots[i - 1]!) {
      throw new Error(`${what}: knots decrease`);
    }
  }
  const u0 = knots[degree]!;
  const u1 = knots[count]!;
  if (!(u1 > u0)) {
    throw new Error(`${what}: empty parameter range`);
  }
  for (let i = 0; i < degree; i++) {
    if (knots[i]! !== u0 || knots[count + 1 + i]! !== u1) {
      throw new Error(`${what}: knots are not clamped at the ends`);
    }
  }
}

/** Throws unless the coordinates and the weights have the lengths the count asks for. */
function checkSizes(
  what: string,
  pointsLength: number,
  expectedPoints: number,
  weights: Float64Array | undefined,
  expectedWeights: number,
): void {
  if (pointsLength !== expectedPoints) {
    throw new Error(
      `${what}: ${pointsLength} point values, expected ${expectedPoints}`,
    );
  }
  if (weights && weights.length !== expectedWeights) {
    throw new Error(
      `${what}: ${weights.length} weights, expected ${expectedWeights}`,
    );
  }
}

/** Inserts the knot value u once (Piegl and Tiller A5.1). The knot must lie in a span. */
function insertOnce(
  degree: number,
  knots: number[],
  points: Points,
  u: number,
): void {
  const n = points.length;
  let k = degree;
  while (k < n - 1 && u >= knots[k + 1]!) {
    k++;
  }
  let s = 0;
  for (const knot of knots) {
    if (knot === u) {
      s++;
    }
  }
  const comps = points[0]!.length;
  const out: Points = new Array<Float64Array>(n + 1);
  for (let i = 0; i <= k - degree; i++) {
    out[i] = points[i]!;
  }
  for (let i = k - degree + 1; i <= k - s; i++) {
    const alpha = (u - knots[i]!) / (knots[i + degree]! - knots[i]!);
    const q = new Float64Array(comps);
    for (let c = 0; c < comps; c++) {
      q[c] = alpha * points[i]![c]! + (1 - alpha) * points[i - 1]![c]!;
    }
    out[i] = q;
  }
  for (let i = k - s + 1; i <= n; i++) {
    out[i] = points[i - 1]!;
  }
  knots.splice(k + 1, 0, u);
  points.length = 0;
  for (const q of out) {
    points.push(q);
  }
}

/**
 * Raises every interior knot to multiplicity `degree`, in place. Returns the
 * breaks: each distinct knot value from the first parameter to the last,
 * with the index of the first control point of the segment that starts there.
 */
function splitToBezier(
  degree: number,
  knots: number[],
  points: Points,
): { values: number[]; firsts: number[] } {
  const n = points.length;
  const u0 = knots[degree]!;
  const u1 = knots[n]!;
  const interior: number[] = [];
  for (const knot of knots) {
    if (knot > u0 && knot < u1 && interior[interior.length - 1] !== knot) {
      interior.push(knot);
    }
  }
  for (const u of interior) {
    let multiplicity = knots.filter((knot) => knot === u).length;
    while (multiplicity < degree) {
      insertOnce(degree, knots, points, u);
      multiplicity++;
    }
  }
  const values = [u0, ...interior, u1];
  const firsts: number[] = [];
  for (let b = 0; b < values.length - 1; b++) {
    // The last index of the break's value; the segment's points start at index − degree.
    firsts.push(knots.lastIndexOf(values[b]!) - degree);
  }
  return { values, firsts };
}

/** Homogeneous points from `dimension` coordinates and optional weights. */
function homogeneous(
  coords: Float64Array,
  weights: Float64Array | undefined,
  count: number,
  dimension: number,
): Points {
  const points: Points = [];
  for (let i = 0; i < count; i++) {
    const w = weights ? weights[i]! : 1;
    if (!(w > 0)) {
      throw new Error(`NURBS: weight ${i} is not positive`);
    }
    const p = new Float64Array(dimension + 1);
    for (let c = 0; c < dimension; c++) {
      p[c] = coords[i * dimension + c]! * w;
    }
    p[dimension] = w;
    points.push(p);
  }
  return points;
}

/**
 * The surface as rational Bézier patches, exactly, by knot insertion to full
 * multiplicity. Patches run u fastest. `domains` has 4 per patch (u0, u1, v0,
 * v1) and `points` has (degreeU + 1)(degreeV + 1) homogeneous points per
 * patch, 4 floats each, u fastest.
 */
export function nurbsSurfaceToPatches(surface: NurbsSurface): {
  degreeU: number;
  degreeV: number;
  domains: Float64Array;
  points: Float64Array;
} {
  const { degreeU, degreeV, countU, countV } = surface;
  for (const [axis, degree] of [
    ["u", degreeU],
    ["v", degreeV],
  ] as const) {
    if (!Number.isInteger(degree) || degree < 1 || degree > 7) {
      throw new Error(
        `nurbsSurfaceToPatches: degree ${degree} in ${axis} is not 1 to 7`,
      );
    }
  }
  checkSizes(
    "nurbsSurfaceToPatches",
    surface.points.length,
    countU * countV * 3,
    surface.weights,
    countU * countV,
  );
  checkKnots("nurbsSurfaceToPatches u", degreeU, surface.knotsU, countU);
  checkKnots("nurbsSurfaceToPatches v", degreeV, surface.knotsV, countV);
  const grid = homogeneous(surface.points, surface.weights, countU * countV, 3);

  // Along u, one row of control points at a time.
  let knotsU: number[] = [];
  let breaksU = { values: [] as number[], firsts: [] as number[] };
  const rows: Points[] = [];
  for (let j = 0; j < countV; j++) {
    const row = grid.slice(j * countU, (j + 1) * countU);
    const knots = Array.from(surface.knotsU);
    breaksU = splitToBezier(degreeU, knots, row);
    knotsU = knots;
    rows.push(row);
  }
  const newCountU = knotsU.length - degreeU - 1;

  // Along v, one column at a time.
  let breaksV = { values: [] as number[], firsts: [] as number[] };
  const columns: Points[] = [];
  for (let i = 0; i < newCountU; i++) {
    const column = rows.map((row) => row[i]!);
    const knots = Array.from(surface.knotsV);
    breaksV = splitToBezier(degreeV, knots, column);
    columns.push(column);
  }

  const spansU = breaksU.firsts.length;
  const spansV = breaksV.firsts.length;
  const perPatch = (degreeU + 1) * (degreeV + 1);
  const domains = new Float64Array(spansU * spansV * 4);
  const points = new Float64Array(spansU * spansV * perPatch * 4);
  for (let bj = 0; bj < spansV; bj++) {
    for (let bi = 0; bi < spansU; bi++) {
      const patch = bj * spansU + bi;
      domains.set(
        [
          breaksU.values[bi]!,
          breaksU.values[bi + 1]!,
          breaksV.values[bj]!,
          breaksV.values[bj + 1]!,
        ],
        patch * 4,
      );
      for (let j = 0; j <= degreeV; j++) {
        for (let i = 0; i <= degreeU; i++) {
          const p = columns[breaksU.firsts[bi]! + i]![breaksV.firsts[bj]! + j]!;
          points.set(p, (patch * perPatch + j * (degreeU + 1) + i) * 4);
        }
      }
    }
  }
  return { degreeU, degreeV, domains, points };
}

/**
 * The curve as rational Bézier segments, exactly. The degree must be 1 to 3.
 * `domains` has 2 per segment (t0, t1); `points` has degree + 1 homogeneous
 * points per segment, dimension + 1 floats each.
 */
export function nurbsCurveToSegments(curve: NurbsCurve): {
  degree: number;
  domains: Float64Array;
  points: Float64Array;
} {
  const { degree, count, dimension } = curve;
  if (!Number.isInteger(degree) || degree < 1 || degree > 3) {
    throw new Error(`nurbsCurveToSegments: degree ${degree} is not 1 to 3`);
  }
  checkSizes(
    "nurbsCurveToSegments",
    curve.points.length,
    count * dimension,
    curve.weights,
    count,
  );
  checkKnots("nurbsCurveToSegments", degree, curve.knots, count);
  const points = homogeneous(curve.points, curve.weights, count, dimension);
  const knots = Array.from(curve.knots);
  const breaks = splitToBezier(degree, knots, points);
  const segments = breaks.firsts.length;
  const comps = dimension + 1;
  const domains = new Float64Array(segments * 2);
  const out = new Float64Array(segments * (degree + 1) * comps);
  for (let s = 0; s < segments; s++) {
    domains[s * 2] = breaks.values[s]!;
    domains[s * 2 + 1] = breaks.values[s + 1]!;
    for (let i = 0; i <= degree; i++) {
      out.set(points[breaks.firsts[s]! + i]!, (s * (degree + 1) + i) * comps);
    }
  }
  return { degree, domains, points: out };
}

/** Euclidean coordinates and weights from homogeneous points. */
function euclidean(
  points: Points,
  dimension: number,
): { points: Float64Array; weights: Float64Array } {
  const coords = new Float64Array(points.length * dimension);
  const weights = new Float64Array(points.length);
  points.forEach((p, i) => {
    const w = p[dimension]!;
    weights[i] = w;
    for (let c = 0; c < dimension; c++) {
      coords[i * dimension + c] = p[c]! / w;
    }
  });
  return { points: coords, weights };
}

/**
 * The part of the curve over [t0, t1], exactly, as a curve of its own with
 * the same parameterization: knots at t0 and t1 are raised to the degree,
 * and the control points between are kept. t0 and t1 are clamped to the
 * curve's range, which must leave t0 < t1.
 */
export function trimNurbsCurve(
  curve: NurbsCurve,
  t0: number,
  t1: number,
): NurbsCurve {
  const { degree, count, dimension } = curve;
  checkSizes(
    "trimNurbsCurve",
    curve.points.length,
    count * dimension,
    curve.weights,
    count,
  );
  checkKnots("trimNurbsCurve", degree, curve.knots, count);
  const u0 = curve.knots[degree]!;
  const u1 = curve.knots[count]!;
  const a = Math.max(t0, u0);
  const b = Math.min(t1, u1);
  if (!(a < b)) {
    throw new Error(
      `trimNurbsCurve: [${t0}, ${t1}] leaves nothing of [${u0}, ${u1}]`,
    );
  }
  if (a === u0 && b === u1) {
    return curve;
  }
  const points = homogeneous(curve.points, curve.weights, count, dimension);
  const knots = Array.from(curve.knots);
  for (const t of [a, b]) {
    if (t === u0 || t === u1) {
      continue;
    }
    let multiplicity = knots.filter((knot) => knot === t).length;
    while (multiplicity < degree) {
      insertOnce(degree, knots, points, t);
      multiplicity++;
    }
  }
  // With t at multiplicity `degree` (or clamped), the curve passes through
  // the control point at lastIndexOf(t) − degree.
  const first = knots.lastIndexOf(a) - degree;
  const last = knots.indexOf(b) - 1;
  const inner = knots.filter((knot) => knot > a && knot < b);
  const kept = euclidean(points.slice(first, last + 1), dimension);
  return {
    degree,
    dimension,
    count: last - first + 1,
    knots: Float64Array.from([
      ...new Array<number>(degree + 1).fill(a),
      ...inner,
      ...new Array<number>(degree + 1).fill(b),
    ]),
    points: kept.points,
    weights: kept.weights,
  };
}

/** The same curve run backwards, over the same parameter range. */
export function reverseNurbsCurve(curve: NurbsCurve): NurbsCurve {
  const { degree, count, dimension } = curve;
  checkSizes(
    "reverseNurbsCurve",
    curve.points.length,
    count * dimension,
    curve.weights,
    count,
  );
  checkKnots("reverseNurbsCurve", degree, curve.knots, count);
  const n = curve.knots.length;
  const sum = curve.knots[0]! + curve.knots[n - 1]!;
  const knots = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    knots[i] = sum - curve.knots[n - 1 - i]!;
  }
  const points = new Float64Array(count * dimension);
  for (let i = 0; i < count; i++) {
    for (let c = 0; c < dimension; c++) {
      points[i * dimension + c] =
        curve.points[(count - 1 - i) * dimension + c]!;
    }
  }
  const weights = curve.weights
    ? Float64Array.from(curve.weights).reverse()
    : undefined;
  return { degree, dimension, count, knots, points, weights };
}

/** The last span with knots[k] ≤ u < knots[k + 1], or the last non-empty span at the end. */
function findSpan(
  degree: number,
  knots: Float64Array,
  count: number,
  u: number,
): number {
  if (u >= knots[count]!) {
    let k = count - 1;
    while (k > degree && knots[k]! >= knots[k + 1]!) {
      k--;
    }
    return k;
  }
  let k = degree;
  while (k < count - 1 && u >= knots[k + 1]!) {
    k++;
  }
  return k;
}

/** De Boor's algorithm on `degree + 1` points (indices span − degree to span) of `comps` numbers. */
function deBoor(
  degree: number,
  knots: Float64Array,
  span: number,
  d: Float64Array[],
  u: number,
): Float64Array {
  for (let r = 1; r <= degree; r++) {
    for (let j = degree; j >= r; j--) {
      const i = span - degree + j;
      const alpha = (u - knots[i]!) / (knots[i + degree - r + 1]! - knots[i]!);
      const a = d[j - 1]!;
      const b = d[j]!;
      const q = new Float64Array(a.length);
      for (let c = 0; c < a.length; c++) {
        q[c] = (1 - alpha) * a[c]! + alpha * b[c]!;
      }
      d[j] = q;
    }
  }
  return d[degree]!;
}

/** De Boor's algorithm, for tests and the reference: a NURBS surface point, m. */
export function evaluateNurbsSurface(
  surface: NurbsSurface,
  u: number,
  v: number,
): Float64Array {
  const { degreeU, degreeV, countU, countV } = surface;
  const grid = homogeneous(surface.points, surface.weights, countU * countV, 3);
  const spanU = findSpan(degreeU, surface.knotsU, countU, u);
  const spanV = findSpan(degreeV, surface.knotsV, countV, v);
  const column: Float64Array[] = [];
  for (let j = spanV - degreeV; j <= spanV; j++) {
    const row = grid.slice(
      j * countU + spanU - degreeU,
      j * countU + spanU + 1,
    );
    column.push(deBoor(degreeU, surface.knotsU, spanU, row, u));
  }
  const h = deBoor(degreeV, surface.knotsV, spanV, column, v);
  return new Float64Array([h[0]! / h[3]!, h[1]! / h[3]!, h[2]! / h[3]!]);
}

/** De Boor's algorithm, for tests and the reference: a NURBS curve point, m. */
export function evaluateNurbsCurve(curve: NurbsCurve, t: number): Float64Array {
  const { degree, count, dimension } = curve;
  const points = homogeneous(curve.points, curve.weights, count, dimension);
  const span = findSpan(degree, curve.knots, count, t);
  const h = deBoor(
    degree,
    curve.knots,
    span,
    points.slice(span - degree, span + 1),
    t,
  );
  const out = new Float64Array(dimension);
  for (let c = 0; c < dimension; c++) {
    out[c] = h[c]! / h[dimension]!;
  }
  return out;
}
