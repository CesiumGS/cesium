// A route between two nodes of a transform graph: up from `from` to the
// lowest common ancestor through each edge's forward, down to `to` through
// each edge's inverse (a smooth node's declared inverse, or Newton with its
// Jacobian). Adjacent affine edges collapse into one float64 matrix. The
// CPU path is the truth the GPU compiler (a later task) is checked against.
import { identity, invertAffine, multiply } from "../math/mat4.ts";
import type {
  AffineEdge,
  Params,
  PlainEdge,
  SmoothSpec,
  TransformNode,
  ViewId,
} from "./graph.ts";

export interface RouteOptions {
  /** The view whose switch choices and parameter values the route follows. */
  view?: ViewId;
  /** The instant a time-varying affine edge is evaluated at (default 0). */
  seconds?: number;
}

/** One or more affine edges, composed into a single float64 matrix (column-major). */
export interface AffineStep {
  readonly kind: "affine";
  /** How many edges (or inverses of edges) it collapses. */
  readonly edges: number;
  readonly matrix: Float64Array;
}

/** One smooth edge, forward (up the tree) or its inverse (down it). */
export interface SmoothStep {
  readonly kind: "smooth";
  readonly node: TransformNode;
  readonly id: string;
  /** The step applies the node's inverse. */
  readonly inverse: boolean;
  /** The inverse is solved by Newton: the node declares none. */
  readonly newton: boolean;
}

export type RouteStep = AffineStep | SmoothStep;

/** One edge of a route as `Route.walk` visits it; the arrays are reused between visits. */
export interface EdgeVisit {
  readonly node: TransformNode;
  readonly kind: "affine" | "smooth";
  /** The route goes down through the edge: it is undone. */
  readonly down: boolean;
  readonly spec: SmoothSpec | undefined;
  /** The smooth edge's parameter values for the route's view. */
  readonly params: Params | undefined;
  /** An affine edge's 4×4 as applied (the inverse when `down`), column-major. */
  readonly matrix: Float64Array | undefined;
  /** The point before the edge, and after it. */
  readonly input: Float64Array;
  readonly output: Float64Array;
  /** The edge's own Jacobian at `input`, column-major: an affine edge's matrix part; a smooth edge's by its function's, else central differences (a down edge: the inverse of the function's at `output`). */
  readonly jacobian: Float64Array;
}

interface Raw {
  readonly node: TransformNode;
  readonly edge: PlainEdge;
  readonly down: boolean;
  readonly choice: number | undefined;
}

interface AffineRun extends AffineStep {
  readonly raws: readonly Raw[];
  readonly inverse: Float64Array;
}

interface SmoothRun extends SmoothStep {
  readonly spec: SmoothSpec;
  readonly down: boolean;
  params: Params;
}

type Run = AffineRun | SmoothRun;

const NEWTON = { tolerance: 1e-9, iterations: 32 };

/** The route taking points of `from` to points of `to`; throws across trees. */
export function routeBetween(
  from: TransformNode,
  to: TransformNode,
  options: RouteOptions = {},
): Route {
  return new Route(from, to, options);
}

export class Route {
  readonly from: TransformNode;
  readonly to: TransformNode;
  readonly view: ViewId | undefined;
  /** The node kinds and switch choices, without parameter values or matrices. */
  readonly shapeKey: string;
  private readonly runs: Run[];
  private readonly path: readonly TransformNode[];
  private readonly timeVarying: boolean;
  private seconds: number;
  private epoch = 0;
  private built = -1;
  private readonly cur = new Float64Array(3);
  private readonly next = new Float64Array(3);
  private readonly step = new Float64Array(9);
  private readonly total = new Float64Array(9);
  private readonly scratch = new Float64Array(16);

  constructor(
    from: TransformNode,
    to: TransformNode,
    options: RouteOptions = {},
  ) {
    if (from.graph !== to.graph) {
      throw new Error(
        `route: "${from.name}" and "${to.name}" are in two graphs`,
      );
    }
    this.from = from;
    this.to = to;
    this.view = options.view;
    this.seconds = options.seconds ?? 0;
    const { up, down } = pathBetween(from, to);
    this.path = [...up, ...down];
    const graph = from.graph;
    const raws: Raw[] = [
      ...up.map((node) => ({ node, down: false })),
      ...down.map((node) => ({ node, down: true })),
    ].map(({ node, down: isDown }) => {
      const { edge, choice } = graph.edgeFor(node, options.view);
      return { node, edge, down: isDown, choice };
    });
    this.timeVarying = raws.some((r) => r.edge.kind === "affine" && r.edge.at);
    this.runs = collapse(raws);
    this.shapeKey = shapeKeyOf(this.runs, raws);
  }

  /** The steps after affine runs collapse; read-only (matrices refresh with `revision`). */
  get steps(): readonly RouteStep[] {
    this.refresh();
    return this.runs;
  }

  /**
   * Goes up when anything on the route changed: a node's edge or parameters
   * (their `revision`), or the instant, for a route with a time-varying edge.
   */
  get revision(): number {
    let sum = this.epoch;
    for (const node of this.path) {
      sum += node.revision;
    }
    return sum;
  }

  /** Moves a time-varying route to `seconds`; a constant one ignores it. */
  at(seconds: number): this {
    if (seconds !== this.seconds) {
      this.seconds = seconds;
      if (this.timeVarying) {
        this.epoch++;
      }
    }
    return this;
  }

  /** `p` of `from` as a point of `to`, in float64. */
  forward(p: ArrayLike<number>, out = new Float64Array(3)): Float64Array {
    this.refresh();
    return this.apply(p, out, false, undefined);
  }

  /** `q` of `to` as a point of `from`: each step undone, last first. */
  inverse(q: ArrayLike<number>, out = new Float64Array(3)): Float64Array {
    this.refresh();
    return this.apply(q, out, true, undefined);
  }

  /**
   * The 3×3 Jacobian of `forward` at `p` (column-major), by the chain rule:
   * an affine step's matrix part, a smooth node's Jacobian (central
   * differences when its function writes none), a down step's inverse.
   */
  jacobian(p: ArrayLike<number>, out = new Float64Array(9)): Float64Array {
    this.refresh();
    this.apply(p, this.cur, false, out);
    return out;
  }

  /**
   * Carries `p` along the route one edge at a time (affine edges
   * individually, not collapsed), calling `visit` after each with the
   * point before and after it and the edge's own Jacobian at the point
   * before: what a quantity that changes edge by edge (accuracy) needs.
   * The arrays in a visit are reused: read them during the call.
   */
  walk(
    p: ArrayLike<number>,
    visit: (edge: EdgeVisit) => void,
    out = new Float64Array(3),
  ): Float64Array {
    this.refresh();
    let cur = Float64Array.from([p[0]!, p[1]!, p[2]!]);
    let next = new Float64Array(3);
    const jacobian = new Float64Array(9);
    const matrix = new Float64Array(16);
    const graph = this.from.graph;
    const emit = (
      node: TransformNode,
      kind: "affine" | "smooth",
      down: boolean,
      spec: SmoothSpec | undefined,
      params: Params | undefined,
    ) =>
      visit({
        node,
        kind,
        down,
        spec,
        params,
        matrix: kind === "affine" ? matrix : undefined,
        input: cur,
        output: next,
        jacobian,
      });
    for (const run of this.runs) {
      if (run.kind === "affine") {
        for (const { node, edge, down } of run.raws) {
          const a = edge as AffineEdge;
          if (a.at) {
            a.at(this.seconds, this.scratch);
          } else {
            this.scratch.set(a.matrix!);
          }
          if (down) {
            invertAffine(matrix, this.scratch);
          } else {
            matrix.set(this.scratch);
          }
          transformPoint(matrix, cur, next);
          linearPart(matrix, jacobian);
          emit(node, "affine", down, undefined, undefined);
          [cur, next] = [next, cur];
        }
        continue;
      }
      const params = graph.values(run.node, this.view);
      if (run.down) {
        solveInverse(run.spec, params, cur, next, run.node.name);
        smoothJacobian(run.spec, params, next, jacobian);
        invert3(jacobian, run.node.name);
      } else {
        smoothJacobian(run.spec, params, cur, jacobian, next);
      }
      emit(run.node, "smooth", run.down, run.spec, params);
      [cur, next] = [next, cur];
    }
    out.set(cur);
    return out;
  }

  private refresh(): void {
    const revision = this.revision;
    if (revision === this.built) {
      return;
    }
    const graph = this.from.graph;
    for (const run of this.runs) {
      if (run.kind === "affine") {
        this.compose(run);
      } else {
        run.params = graph.values(run.node, this.view);
      }
    }
    this.built = revision;
  }

  private compose(run: AffineRun): void {
    const m = run.matrix;
    identity(m);
    for (const { edge, down } of run.raws) {
      const a = edge as AffineEdge;
      if (a.at) {
        a.at(this.seconds, this.scratch);
      } else {
        this.scratch.set(a.matrix!);
      }
      if (down) {
        invertAffine(this.scratch, this.scratch);
      }
      multiply(m, this.scratch, m);
    }
    invertAffine(run.inverse, m);
  }

  private apply(
    p: ArrayLike<number>,
    out: Float64Array,
    backwards: boolean,
    jacobian: Float64Array | undefined,
  ): Float64Array {
    let cur = this.cur;
    let next = this.next;
    cur[0] = p[0]!;
    cur[1] = p[1]!;
    cur[2] = p[2]!;
    if (jacobian) {
      identity3(jacobian);
    }
    const n = this.runs.length;
    for (let k = 0; k < n; k++) {
      const run = this.runs[backwards ? n - 1 - k : k]!;
      if (run.kind === "affine") {
        const m = backwards ? run.inverse : run.matrix;
        transformPoint(m, cur, next);
        if (jacobian) {
          linearPart(m, this.step);
          multiply3(jacobian, this.step, jacobian, this.total);
        }
      } else if (run.inverse !== backwards) {
        solveInverse(run.spec, run.params, cur, next, run.node.name);
        if (jacobian) {
          smoothJacobian(run.spec, run.params, next, this.step);
          invert3(this.step, run.node.name);
          multiply3(jacobian, this.step, jacobian, this.total);
        }
      } else if (jacobian) {
        smoothJacobian(run.spec, run.params, cur, this.step, next);
        multiply3(jacobian, this.step, jacobian, this.total);
      } else {
        run.spec.forward(cur, run.params, next);
      }
      [cur, next] = [next, cur];
    }
    out[0] = cur[0]!;
    out[1] = cur[1]!;
    out[2] = cur[2]!;
    return out;
  }
}

/** The nodes from `from` up to (not including) the lowest common ancestor, and down to `to` from just under it. */
function pathBetween(
  from: TransformNode,
  to: TransformNode,
): { up: TransformNode[]; down: TransformNode[] } {
  const up: TransformNode[] = [];
  const down: TransformNode[] = [];
  let a = from;
  let b = to;
  while (a.depth > b.depth) {
    up.push(a);
    a = a.parent!;
  }
  while (b.depth > a.depth) {
    down.push(b);
    b = b.parent!;
  }
  while (a !== b) {
    if (!a.parent || !b.parent) {
      throw new Error(
        `route: no common ancestor of "${from.name}" and "${to.name}"`,
      );
    }
    up.push(a);
    down.push(b);
    a = a.parent;
    b = b.parent;
  }
  return { up, down: down.reverse() };
}

function collapse(raws: readonly Raw[]): Run[] {
  const runs: Run[] = [];
  let pending: Raw[] = [];
  const flush = () => {
    if (pending.length > 0) {
      runs.push({
        kind: "affine",
        edges: pending.length,
        matrix: identity(new Float64Array(16)),
        inverse: identity(new Float64Array(16)),
        raws: pending,
      });
      pending = [];
    }
  };
  for (const raw of raws) {
    if (raw.edge.kind === "affine") {
      pending.push(raw);
      continue;
    }
    flush();
    const spec = raw.edge.spec;
    runs.push({
      kind: "smooth",
      node: raw.node,
      id: spec.id ?? raw.node.name,
      inverse: raw.down,
      newton: raw.down && !spec.inverse,
      spec,
      down: raw.down,
      params: spec.params,
    });
  }
  flush();
  return runs;
}

function shapeKeyOf(runs: readonly Run[], raws: readonly Raw[]): string {
  const steps = runs.map((run) =>
    run.kind === "affine"
      ? "M"
      : `${run.inverse ? "-" : "+"}${run.id}${run.newton ? "~" : ""}`,
  );
  const switches = raws
    .filter((r) => r.choice !== undefined)
    .map((r) => `${r.node.name}#${r.choice}`);
  return switches.length > 0
    ? `${steps.join(">")}|${switches.join(",")}`
    : steps.join(">");
}

function transformPoint(m: Float64Array, p: Float64Array, out: Float64Array) {
  const x = p[0]!;
  const y = p[1]!;
  const z = p[2]!;
  out[0] = m[0]! * x + m[4]! * y + m[8]! * z + m[12]!;
  out[1] = m[1]! * x + m[5]! * y + m[9]! * z + m[13]!;
  out[2] = m[2]! * x + m[6]! * y + m[10]! * z + m[14]!;
}

function linearPart(m: Float64Array, out: Float64Array) {
  for (let c = 0; c < 3; c++) {
    for (let r = 0; r < 3; r++) {
      out[c * 3 + r] = m[c * 4 + r]!;
    }
  }
}

function identity3(out: Float64Array) {
  out.fill(0);
  out[0] = out[4] = out[8] = 1;
}

/** `out = a · b` for column-major 3×3s, through `scratch`, so `out` may be `a` or `b`. */
function multiply3(
  out: Float64Array,
  a: Float64Array,
  b: Float64Array,
  scratch: Float64Array,
) {
  for (let c = 0; c < 3; c++) {
    for (let r = 0; r < 3; r++) {
      scratch[c * 3 + r] =
        a[r]! * b[c * 3]! +
        a[3 + r]! * b[c * 3 + 1]! +
        a[6 + r]! * b[c * 3 + 2]!;
    }
  }
  out.set(scratch);
}

/** Inverts a column-major 3×3 in place (cofactors). */
function invert3(m: Float64Array, name: string) {
  const [a, b, c, d, e, f, g, h, i] = m as unknown as number[];
  const det =
    a! * (e! * i! - f! * h!) -
    d! * (b! * i! - c! * h!) +
    g! * (b! * f! - c! * e!);
  if (!(Math.abs(det) > 0)) {
    throw new Error(`route: the Jacobian of "${name}" is singular`);
  }
  const s = 1 / det;
  m[0] = (e! * i! - f! * h!) * s;
  m[1] = (c! * h! - b! * i!) * s;
  m[2] = (b! * f! - c! * e!) * s;
  m[3] = (f! * g! - d! * i!) * s;
  m[4] = (a! * i! - c! * g!) * s;
  m[5] = (c! * d! - a! * f!) * s;
  m[6] = (d! * h! - e! * g!) * s;
  m[7] = (b! * g! - a! * h!) * s;
  m[8] = (a! * e! - b! * d!) * s;
}

const probe = new Float64Array(3);
const plus = new Float64Array(3);
const minus = new Float64Array(3);

/**
 * `spec.forward` at `p`, with its Jacobian in `jacobian` (and the value in
 * `value`): the function's own when it writes one, else central differences.
 */
function smoothJacobian(
  spec: SmoothSpec,
  params: Params,
  p: Float64Array,
  jacobian: Float64Array,
  value: Float64Array = probe,
): void {
  jacobian.fill(Number.NaN);
  spec.forward(p, params, value, jacobian);
  if (!jacobian.some(Number.isNaN)) {
    return;
  }
  const x = [p[0]!, p[1]!, p[2]!];
  for (let axis = 0; axis < 3; axis++) {
    const h = 6e-6 * Math.max(1, Math.abs(x[axis]!));
    const at = Float64Array.from(x);
    at[axis] = x[axis]! + h;
    spec.forward(at, params, plus);
    at[axis] = x[axis]! - h;
    spec.forward(at, params, minus);
    for (let r = 0; r < 3; r++) {
      jacobian[axis * 3 + r] = (plus[r]! - minus[r]!) / (2 * h);
    }
  }
}

/**
 * `q` in the parent back to the node: the spec's own inverse when it has
 * one, else Newton from `q` with the Jacobian (as `warpInverse` does in
 * camera/route.ts), to a metre-scale tolerance of 1e-9. Throws when it
 * doesn't converge.
 */
function solveInverse(
  spec: SmoothSpec,
  params: Params,
  q: Float64Array,
  out: Float64Array,
  name: string,
): void {
  if (spec.inverse) {
    spec.inverse(q, params, out);
    return;
  }
  const target = [q[0]!, q[1]!, q[2]!];
  const p = Float64Array.from(target);
  const f = new Float64Array(3);
  const j = new Float64Array(9);
  for (let k = 0; k < NEWTON.iterations; k++) {
    smoothJacobian(spec, params, p, j, f);
    const r = [f[0]! - target[0]!, f[1]! - target[1]!, f[2]! - target[2]!];
    invert3(j, name);
    // The step J⁻¹·r, with J⁻¹ now in `j`.
    const step = [
      j[0]! * r[0]! + j[3]! * r[1]! + j[6]! * r[2]!,
      j[1]! * r[0]! + j[4]! * r[1]! + j[7]! * r[2]!,
      j[2]! * r[0]! + j[5]! * r[1]! + j[8]! * r[2]!,
    ];
    p[0] = p[0]! - step[0]!;
    p[1] = p[1]! - step[1]!;
    p[2] = p[2]! - step[2]!;
    // A step below the rounding of `p` is as converged as float64 gets.
    const floor =
      64 * Number.EPSILON * Math.max(1, Math.hypot(p[0], p[1], p[2]));
    if (
      Math.hypot(r[0]!, r[1]!, r[2]!) <= NEWTON.tolerance ||
      Math.hypot(step[0]!, step[1]!, step[2]!) <= floor
    ) {
      out.set(p);
      return;
    }
  }
  throw new Error(`route: the inverse of "${name}" did not converge`);
}
