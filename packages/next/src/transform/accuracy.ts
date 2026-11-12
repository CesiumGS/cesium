// Accuracy along a route (plan 2026-11-12, task 5): a point's covariance
// carried edge by edge, Σ_out = J Σ Jᵀ with J the chain's Jacobian (the IR's
// autodiff for a smooth edge that has IR, else its function's own or central
// differences), plus what each edge declares of itself: a smooth edge's
// `accuracy` (1σ, m) and, through a callback, an affine edge's (a reference
// frame's `FrameAccuracy`). Conventions are the frames composer's
// (frames/pointAccuracy.ts): a figure in metres is the 1σ of the position
// error's magnitude, so its covariance is σ²/3 in each axis and its trace
// σ²; the total is the root of the composed trace; independent terms add.
//
// Matrices here are row-major 3×3 (m²) unless a name says column-major (the
// route's Jacobians are).
import type { Params, SmoothSpec, TransformNode } from "./graph.ts";
import type { Route } from "./route.ts";
import { adJacobian } from "./stepIr.ts";

/** `A C Aᵀ` for row-major 3×3s, written to `out` (which may be `c`). */
export function congruence(
  a: ArrayLike<number>,
  c: ArrayLike<number>,
  out: Float64Array,
): Float64Array {
  const t = new Float64Array(9);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      t[i * 3 + j] =
        a[i * 3]! * c[j]! +
        a[i * 3 + 1]! * c[3 + j]! +
        a[i * 3 + 2]! * c[6 + j]!;
    }
  }
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      out[i * 3 + j] =
        t[i * 3]! * a[j * 3]! +
        t[i * 3 + 1]! * a[j * 3 + 1]! +
        t[i * 3 + 2]! * a[j * 3 + 2]!;
    }
  }
  return out;
}

/** The isotropic covariance of a 1σ magnitude in metres: σ²/3 in each axis. */
export function isotropic(meters: number): Float64Array {
  const k = (meters * meters) / 3;
  return Float64Array.of(k, 0, 0, 0, k, 0, 0, 0, k);
}

/** What an input's 1σ is: a magnitude in metres, a σ per axis, or a covariance (row-major 3×3, m²). */
export type SigmaIn = number | ArrayLike<number>;

function covarianceOf(sigma: SigmaIn): Float64Array {
  if (typeof sigma === "number") {
    return isotropic(sigma);
  }
  if (sigma.length === 3) {
    return Float64Array.of(
      sigma[0]! ** 2,
      0,
      0,
      0,
      sigma[1]! ** 2,
      0,
      0,
      0,
      sigma[2]! ** 2,
    );
  }
  if (sigma.length === 9) {
    return Float64Array.from(sigma);
  }
  throw new RangeError(
    "accuracy: a σ is a number, three per-axis σ or a 3×3 covariance",
  );
}

/** An edge as the accuracy callback sees it. */
export interface EdgeQuery {
  readonly node: TransformNode;
  readonly kind: "affine" | "smooth";
  /** The route goes down through the edge. */
  readonly down: boolean;
  /** An affine edge's 4×4 as applied, column-major. */
  readonly matrix: Float64Array | undefined;
  /** The point before the edge, and after it. */
  readonly input: Float64Array;
  readonly output: Float64Array;
}

/**
 * What an edge adds to the error at its output, in the axes of the output:
 * a 1σ magnitude in metres, a row-major covariance (m²), or undefined for
 * nothing. Asked of affine edges (a frame's stated accuracy) and, to
 * override `spec.accuracy`, of smooth ones.
 */
export type EdgeAccuracy = (
  edge: EdgeQuery,
) => number | ArrayLike<number> | undefined;

export interface AccuracyOptions {
  /** What affine edges add (`FrameGraph.accuracy`); none by default. */
  readonly affine?: EdgeAccuracy;
}

/** One part of the total, as it adds at the route's output. */
export interface AccuracyPart {
  /** The node whose edge it comes from, or "input". */
  readonly node: string;
  readonly kind: "input" | "smooth" | "affine";
  /** 1σ, m: the root of the trace of its covariance at the output. */
  readonly meters: number;
}

export interface RouteAccuracy {
  /** The root of the trace of `covariance`: the 1σ magnitude, m; Infinity when an edge's accuracy is unbounded (`unboundedBy`). */
  readonly meters: number;
  /** The first edge whose accuracy was given as non-finite (unstated): the total is then unbounded. */
  readonly unboundedBy?: string;
  /** Σ_out, row-major 3×3, m², in the route's output axes. */
  readonly covariance: Float64Array;
  /** What each part adds at the output, nearest the input first. */
  readonly parts: readonly AccuracyPart[];
  /** The route's Jacobian at the point, column-major (the chain of the edges'). */
  readonly jacobian: Float64Array;
  /** The point's image, float64. */
  readonly position: Float64Array;
}

const trace = (c: ArrayLike<number>): number => c[0]! + c[4]! + c[8]!;

function invert3(m: Float64Array): Float64Array {
  const [a, b, c, d, e, f, g, h, i] = m as unknown as number[];
  const det =
    a! * (e! * i! - f! * h!) -
    d! * (b! * i! - c! * h!) +
    g! * (b! * f! - c! * e!);
  if (!(Math.abs(det) > 0)) {
    throw new Error("accuracy: a smooth edge's Jacobian is singular");
  }
  const s = 1 / det;
  return Float64Array.of(
    (e! * i! - f! * h!) * s,
    (c! * h! - b! * i!) * s,
    (b! * f! - c! * e!) * s,
    (f! * g! - d! * i!) * s,
    (a! * i! - c! * g!) * s,
    (c! * d! - a! * f!) * s,
    (d! * h! - e! * g!) * s,
    (b! * g! - a! * h!) * s,
    (a! * e! - b! * d!) * s,
  );
}

/** The edge's Jacobian, column-major: the IR's autodiff where the spec has IR. */
function edgeJacobian(
  spec: SmoothSpec,
  params: Params,
  down: boolean,
  input: Float64Array,
  output: Float64Array,
  own: Float64Array,
): Float64Array {
  const at = down ? output : input;
  const ad = adJacobian(spec, at, params, new Float64Array(9));
  if (!ad) {
    return Float64Array.from(own);
  }
  return down ? invert3(ad) : ad;
}

/** Row-major from column-major. */
function transposed(m: ArrayLike<number>): Float64Array {
  return Float64Array.of(
    m[0]!,
    m[3]!,
    m[6]!,
    m[1]!,
    m[4]!,
    m[7]!,
    m[2]!,
    m[5]!,
    m[8]!,
  );
}

/** `a · b` for column-major 3×3s. */
function multiplyColumns(a: Float64Array, b: Float64Array): Float64Array {
  const out = new Float64Array(9);
  for (let c = 0; c < 3; c++) {
    for (let r = 0; r < 3; r++) {
      out[c * 3 + r] =
        a[r]! * b[c * 3]! +
        a[3 + r]! * b[c * 3 + 1]! +
        a[6 + r]! * b[c * 3 + 2]!;
    }
  }
  return out;
}

/**
 * The accuracy of `point` (of `route.from`, with 1σ `sigmaIn`) once it is
 * carried to `route.to`: Σ_out = J Σ Jᵀ for the chain's Jacobian J, plus each
 * edge's own figure carried through the edges after it. A smooth edge's
 * `accuracy` is a 1σ magnitude at its output, forward or undone; an affine
 * edge adds what `options.affine` says. Independent parts add.
 */
export function accuracyAlong(
  route: Route,
  point: ArrayLike<number>,
  sigmaIn: SigmaIn = 0,
  options: AccuracyOptions = {},
): RouteAccuracy {
  const covariances: Float64Array[] = [covarianceOf(sigmaIn)];
  const parts: Array<Omit<AccuracyPart, "meters">> = [
    { node: "input", kind: "input" },
  ];
  let unboundedBy: string | undefined;
  let chain: Float64Array = Float64Array.of(1, 0, 0, 0, 1, 0, 0, 0, 1);
  const position = route.walk(point, (edge) => {
    const j =
      edge.kind === "smooth"
        ? edgeJacobian(
            edge.spec!,
            edge.params!,
            edge.down,
            edge.input,
            edge.output,
            edge.jacobian,
          )
        : Float64Array.from(edge.jacobian);
    const a = transposed(j);
    for (const c of covariances) {
      congruence(a, c, c);
    }
    chain = multiplyColumns(j, chain);
    let figure: number | ArrayLike<number> | undefined;
    if (edge.kind === "smooth") {
      figure = edge.spec!.accuracy;
    }
    const query: EdgeQuery = {
      node: edge.node,
      kind: edge.kind,
      down: edge.down,
      matrix: edge.matrix,
      input: edge.input,
      output: edge.output,
    };
    if (edge.kind === "affine" || options.affine) {
      figure = options.affine?.(query) ?? figure;
    }
    if (figure !== undefined) {
      const c =
        typeof figure === "number" ? isotropic(figure) : covarianceOf(figure);
      if (!Number.isFinite(trace(c))) {
        unboundedBy ??= edge.node.name;
      } else if (trace(c) > 0) {
        covariances.push(c);
        parts.push({ node: edge.node.name, kind: edge.kind });
      }
    }
  });
  const covariance = new Float64Array(9);
  for (const c of covariances) {
    for (let i = 0; i < 9; i++) {
      covariance[i] = covariance[i]! + c[i]!;
    }
  }
  return {
    meters:
      unboundedBy === undefined
        ? Math.sqrt(Math.max(trace(covariance), 0))
        : Number.POSITIVE_INFINITY,
    covariance,
    parts: parts.map((part, i) => ({
      ...part,
      meters: Math.sqrt(Math.max(trace(covariances[i]!), 0)),
    })),
    ...(unboundedBy !== undefined && { unboundedBy }),
    jacobian: chain,
    position,
  };
}
