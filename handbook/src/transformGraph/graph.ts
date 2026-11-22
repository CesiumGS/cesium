/**
 * The graph, its routes and what is asked of them: a node's edge to its parent
 * is affine or a differentiable function; a route carries a point up to the
 * lowest common ancestor through f, then down through f⁻¹ (Newton) to the
 * camera. Runs of affine edges collapse to one matrix.
 */
import { Jet, type JetVec } from "./ad.ts";

export type V2 = readonly [number, number];
/** Row-major 2 × 2. */
export type Mat2 = readonly [number, number, number, number];

/** x′ = a·x + b·y + e, y′ = c·x + d·y + f. */
export interface Mat {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

export const IDENTITY: Mat = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

/** `m2` after `m1`. */
export function compose(m2: Mat, m1: Mat): Mat {
  return {
    a: m2.a * m1.a + m2.b * m1.c,
    b: m2.a * m1.b + m2.b * m1.d,
    c: m2.c * m1.a + m2.d * m1.c,
    d: m2.c * m1.b + m2.d * m1.d,
    e: m2.a * m1.e + m2.b * m1.f + m2.e,
    f: m2.c * m1.e + m2.d * m1.f + m2.f,
  };
}

export function invert(m: Mat): Mat {
  const det = m.a * m.d - m.b * m.c;
  const a = m.d / det;
  const b = -m.b / det;
  const c = -m.c / det;
  const d = m.a / det;
  return { a, b, c, d, e: -(a * m.e + b * m.f), f: -(c * m.e + d * m.f) };
}

export const translate = (x: number, y: number): Mat => ({
  ...IDENTITY,
  e: x,
  f: y,
});
export const scaleBy = (sx: number, sy = sx): Mat => ({
  ...IDENTITY,
  a: sx,
  d: sy,
});
export const rotation = (rad: number): Mat => ({
  a: Math.cos(rad),
  b: -Math.sin(rad),
  c: Math.sin(rad),
  d: Math.cos(rad),
  e: 0,
  f: 0,
});

/** A non-linear map, written once over jets: local → parent. */
export interface FnDef {
  name: string;
  f(x: Jet, y: Jet): JetVec;
  /** Where the Newton solve for the inverse starts. */
  guess?(p: V2): V2;
  /** Whether a preimage is on the branch the map is invertible on. */
  domain?(q: V2): boolean;
}

export type Edge =
  | { kind: "affine"; label: string; m: Mat }
  | { kind: "fn"; label: string; fn: FnDef };

export interface GNode {
  id: string;
  label: string;
  parent?: string;
  /** The edge to the parent. */
  edge?: Edge;
}

export interface Step {
  node: string;
  dir: "up" | "down";
  edge: Edge;
  /** The node the step arrives at. */
  to: string;
}

const byId = (nodes: readonly GNode[]) => new Map(nodes.map((n) => [n.id, n]));

function ancestors(map: Map<string, GNode>, id: string): string[] {
  const out = [id];
  for (let n = map.get(id); n?.parent; n = map.get(n.parent)) {
    out.push(n.parent);
  }
  return out;
}

/** From `from` up to the lowest common ancestor, then down to `to`. */
export function pathBetween(
  nodes: readonly GNode[],
  from: string,
  to: string,
  override?: Record<string, Edge>,
): Step[] {
  const map = byId(nodes);
  const up = ancestors(map, from);
  const down = ancestors(map, to);
  const lca = up.find((id) => down.includes(id));
  if (lca === undefined) {
    throw new Error(`no common ancestor of ${from} and ${to}`);
  }
  const edgeOf = (id: string): Edge => {
    const e = override?.[id] ?? map.get(id)?.edge;
    if (!e) {
      throw new Error(`node ${id} has no edge`);
    }
    return e;
  };
  const steps: Step[] = [];
  for (const id of up.slice(0, up.indexOf(lca))) {
    steps.push({
      node: id,
      dir: "up",
      edge: edgeOf(id),
      to: map.get(id)!.parent!,
    });
  }
  const downIds = down.slice(0, down.indexOf(lca)).reverse();
  for (const id of downIds) {
    steps.push({ node: id, dir: "down", edge: edgeOf(id), to: id });
  }
  return steps;
}

/** A step ready to evaluate; runs of affine steps are one matrix. */
export type CStep =
  | { kind: "affine"; m: Mat; count: number; to: string; label: string }
  | {
      kind: "fn";
      fn: FnDef;
      dir: "up" | "down";
      to: string;
      label: string;
    };

export function compile(steps: readonly Step[], tail?: Mat): CStep[] {
  const out: CStep[] = [];
  const addAffine = (m: Mat, to: string, label: string) => {
    const last = out[out.length - 1];
    if (last?.kind === "affine") {
      out[out.length - 1] = {
        kind: "affine",
        m: compose(m, last.m),
        count: last.count + 1,
        to,
        label,
      };
    } else {
      out.push({ kind: "affine", m, count: 1, to, label });
    }
  };
  for (const s of steps) {
    if (s.edge.kind === "affine") {
      addAffine(
        s.dir === "up" ? s.edge.m : invert(s.edge.m),
        s.to,
        s.edge.label,
      );
    } else {
      out.push({
        kind: "fn",
        fn: s.edge.fn,
        dir: s.dir,
        to: s.to,
        label: s.edge.label,
      });
    }
  }
  if (tail) {
    addAffine(tail, "screen", "view");
  }
  return out;
}

export interface NewtonResult {
  q: V2;
  iters: number;
  /** False where f has no preimage of p, or Newton did not reach one. */
  ok: boolean;
}

/** Solves f(q) = p by damped Newton, J from the same jets as everything else. */
export function newtonInverse(fn: FnDef, p: V2): NewtonResult {
  let q: V2 = fn.guess ? fn.guess(p) : p;
  const tol = 1e-11 * (1 + Math.hypot(p[0], p[1]));
  let iters = 0;
  let rn = Infinity;
  for (; iters < 60; iters++) {
    const F = fn.f(Jet.s(q[0]), Jet.t(q[1]));
    const r0 = F[0].v - p[0];
    const r1 = F[1].v - p[1];
    rn = Math.hypot(r0, r1);
    if (rn <= tol) {
      break;
    }
    const det = F[0].ds * F[1].dt - F[0].dt * F[1].ds;
    const s0 = (F[1].dt * r0 - F[0].dt * r1) / det;
    const s1 = (-F[1].ds * r0 + F[0].ds * r1) / det;
    let damp = 1;
    let next: V2 = [q[0] - s0, q[1] - s1];
    for (let k = 0; k < 14; k++) {
      const G = fn.f(Jet.c(next[0]), Jet.c(next[1]));
      if (Math.hypot(G[0].v - p[0], G[1].v - p[1]) < rn) {
        break;
      }
      damp /= 2;
      next = [q[0] - damp * s0, q[1] - damp * s1];
    }
    q = next;
  }
  return {
    q,
    iters,
    ok: rn <= 1e-7 * (1 + Math.hypot(p[0], p[1])) && (fn.domain?.(q) ?? true),
  };
}

/** f⁻¹ over jets: the value by Newton, the derivatives by the implicit function theorem. */
function inverseJet(fn: FnDef, P: JetVec, iters: { max: number }): JetVec {
  const { q, iters: n, ok } = newtonInverse(fn, [P[0].v, P[1].v]);
  iters.max = Math.max(iters.max, n);
  if (!ok) {
    return [new Jet(NaN), new Jet(NaN)];
  }
  const F = fn.f(Jet.s(q[0]), Jet.t(q[1]));
  const det = F[0].ds * F[1].dt - F[0].dt * F[1].ds;
  const A = [F[1].dt / det, -F[0].dt / det, -F[1].ds / det, F[0].ds / det];
  const mulA = (u0: number, u1: number): V2 => [
    A[0]! * u0 + A[1]! * u1,
    A[2]! * u0 + A[3]! * u1,
  ];
  const Qs = mulA(P[0].ds, P[1].ds);
  const Qt = mulA(P[0].dt, P[1].dt);
  const hess = (i: 0 | 1, u: V2, w: V2) =>
    F[i].dss * u[0] * w[0] +
    F[i].dst * (u[0] * w[1] + u[1] * w[0]) +
    F[i].dtt * u[1] * w[1];
  const Qss = mulA(P[0].dss - hess(0, Qs, Qs), P[1].dss - hess(1, Qs, Qs));
  const Qst = mulA(P[0].dst - hess(0, Qs, Qt), P[1].dst - hess(1, Qs, Qt));
  const Qtt = mulA(P[0].dtt - hess(0, Qt, Qt), P[1].dtt - hess(1, Qt, Qt));
  return [
    new Jet(q[0], Qs[0], Qt[0], Qss[0], Qst[0], Qtt[0]),
    new Jet(q[1], Qs[1], Qt[1], Qss[1], Qst[1], Qtt[1]),
  ];
}

export interface Stage {
  /** The node the step arrives at (the last of a collapsed run). */
  node: string;
  label: string;
  nonlinear: boolean;
  p: V2;
  J: Mat2;
}

export interface Eval {
  p: V2;
  J: Mat2;
  /** Hessian of each output component: [∂²/∂s², ∂²/∂s∂t, ∂²/∂t²]. */
  H: readonly [V3, V3];
  newton: number;
  stages: Stage[];
}
type V3 = readonly [number, number, number];

export function evalRoute(steps: readonly CStep[], p: V2): Eval {
  let x = Jet.s(p[0]);
  let y = Jet.t(p[1]);
  const iters = { max: 0 };
  const stages: Stage[] = [];
  for (const s of steps) {
    if (s.kind === "affine") {
      const { a, b, c, d, e, f } = s.m;
      const nx = x.scale(a).add(y.scale(b)).add(e);
      const ny = x.scale(c).add(y.scale(d)).add(f);
      x = nx;
      y = ny;
    } else if (s.dir === "up") {
      [x, y] = s.fn.f(x, y);
    } else {
      [x, y] = inverseJet(s.fn, [x, y], iters);
    }
    stages.push({
      node: s.to,
      label: s.label,
      nonlinear: s.kind === "fn",
      p: [x.v, y.v],
      J: [x.ds, x.dt, y.ds, y.dt],
    });
  }
  return {
    p: [x.v, y.v],
    J: [x.ds, x.dt, y.ds, y.dt],
    H: [
      [x.dss, x.dst, x.dtt],
      [y.dss, y.dst, y.dtt],
    ],
    newton: iters.max,
    stages,
  };
}

export const det2 = (J: Mat2) => J[0] * J[3] - J[1] * J[2];

/** Singular values of a 2 × 2, largest first. */
export function singular(J: Mat2): V2 {
  const fro = J[0] * J[0] + J[1] * J[1] + J[2] * J[2] + J[3] * J[3];
  const d = det2(J);
  const disc = Math.sqrt(Math.max(0, fro * fro - 4 * d * d));
  return [
    Math.sqrt(Math.max(0, (fro + disc) / 2)),
    Math.sqrt(Math.max(0, (fro - disc) / 2)),
  ];
}

/** Cofactor of J applied to a vector: the way a normal transforms. */
export function cofactorApply(J: Mat2, n: V2): V2 {
  return [J[3] * n[0] - J[2] * n[1], -J[1] * n[0] + J[0] * n[1]];
}

export const applyJ = (J: Mat2, v: V2): V2 => [
  J[0] * v[0] + J[1] * v[1],
  J[2] * v[0] + J[3] * v[1],
];

/**
 * The part of H[d,d] that bends the image of the segment a → a + d: its
 * component across the image's tangent J·d, since only that moves the curve
 * off its chord. The chord error over the segment is about this over 8, the
 * L²·‖H‖/8 of the design.
 */
function bend(e: Eval, d: V2): number {
  const g0 =
    e.H[0][0] * d[0] * d[0] +
    2 * e.H[0][1] * d[0] * d[1] +
    e.H[0][2] * d[1] * d[1];
  const g1 =
    e.H[1][0] * d[0] * d[0] +
    2 * e.H[1][1] * d[0] * d[1] +
    e.H[1][2] * d[1] * d[1];
  const t = applyJ(e.J, d);
  const tl = Math.hypot(t[0], t[1]);
  return tl < 1e-300
    ? Math.hypot(g0, g1)
    : Math.abs(g0 * t[1] - g1 * t[0]) / tl;
}

export interface Line {
  pts: V2[];
  /** Whether each point was added by subdivision. */
  added: boolean[];
  /** Source segments, and the segments drawn. */
  segments: number;
  drawn: number;
  /** The worst chord error of the straight image, by the estimate and exact. */
  naive: number;
  estimate: number;
  newton: number;
}

const MAX_DEPTH = 8;
/** The larger of two, ignoring a value that is not a number. */
const worst = (a: number, b: number) =>
  Number.isFinite(b) ? Math.max(a, b) : a;

/** A polyline carried through a route, its segments subdivided where H says they bend. */
export function carryLine(
  steps: readonly CStep[],
  src: readonly V2[],
  tol: number,
  adapt = true,
  closed = false,
): Line {
  const pts: V2[] = [];
  const added: boolean[] = [];
  const evals = src.map((p) => evalRoute(steps, p));
  const n = closed ? src.length : src.length - 1;
  let naive = 0;
  let estimate = 0;
  let newton = 0;
  for (const e of evals) {
    newton = Math.max(newton, e.newton);
  }
  const rec = (a: V2, b: V2, ea: Eval, eb: Eval, depth: number): void => {
    const d: V2 = [b[0] - a[0], b[1] - a[1]];
    const m: V2 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const em = evalRoute(steps, m);
    newton = Math.max(newton, em.newton);
    const bound = Math.max(bend(ea, d), bend(em, d), bend(eb, d)) / 8;
    // The exact midpoint is already in hand, and guards a kink between the
    // samples H was taken at.
    const dev = Math.hypot(
      em.p[0] - (ea.p[0] + eb.p[0]) / 2,
      em.p[1] - (ea.p[1] + eb.p[1]) / 2,
    );
    if (depth === 0) {
      naive = worst(naive, dev);
      estimate = worst(estimate, bound);
    }
    if (Math.max(bound, dev) > tol && depth < MAX_DEPTH) {
      rec(a, m, ea, em, depth + 1);
      pts.push(em.p);
      added.push(true);
      rec(m, b, em, eb, depth + 1);
    }
  };
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % src.length;
    const ea = evals[i]!;
    const eb = evals[j]!;
    pts.push(ea.p);
    added.push(false);
    if (adapt) {
      rec(src[i]!, src[j]!, ea, eb, 0);
    } else {
      const m: V2 = [
        (src[i]![0] + src[j]![0]) / 2,
        (src[i]![1] + src[j]![1]) / 2,
      ];
      const em = evalRoute(steps, m);
      naive = worst(
        naive,
        Math.hypot(
          em.p[0] - (ea.p[0] + eb.p[0]) / 2,
          em.p[1] - (ea.p[1] + eb.p[1]) / 2,
        ),
      );
    }
  }
  if (!closed) {
    const last = evals[evals.length - 1]!;
    pts.push(last.p);
    added.push(false);
  }
  return {
    pts,
    added,
    segments: n,
    drawn: Math.max(0, pts.length - (closed ? 0 : 1)),
    naive,
    estimate,
    newton,
  };
}

export function length(pts: readonly V2[]): number {
  let s = 0;
  for (let i = 1; i < pts.length; i++) {
    s += Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]);
  }
  return s;
}
