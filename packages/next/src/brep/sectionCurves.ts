// Where a plane cuts a face's surface (plan §13.26, caps; the b-rep section in
// section.ts). Every curve is given in the plane's own coordinates (the cap
// plane's (u, v)), as a parameter range with exact point and tangent
// evaluation, and the (u, v) on the face's surface for the trim test. The
// closed forms: a plane cuts a plane in a line; a cylinder in an ellipse or a
// pair of lines; a sphere in a circle; a cone or a torus square to the plane
// in circles. Everything else (a cone or torus cut obliquely, Bézier
// patches) is marched on the surface's (u, v) grid, every crossing found
// exactly along a grid edge, then refined by Newton onto the surface as
// asked. Lengths are metres and angles are radians.
import { evaluatePatch } from "./bezier.ts";
import { frameOf } from "./bounds.ts";
import {
  periodicU,
  periodicV,
  surfaceUv,
  wrapAngle,
} from "./analyticQueries.ts";
import { evaluateSurface } from "./evaluate.ts";
import { SurfaceKind, type BrepForm } from "./form.ts";

export type V3 = [number, number, number];
export type P2 = [number, number];

const TAU = Math.PI * 2;

/** The plane being cut with: an origin on it, unit axes x and y in it, and z = x × y the cap's outward normal. */
export interface SectionPlane {
  readonly origin: V3;
  readonly x: V3;
  readonly y: V3;
  readonly z: V3;
}

const dot = (a: ArrayLike<number>, b: ArrayLike<number>): number =>
  a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
const cross = (a: ArrayLike<number>, b: ArrayLike<number>): V3 => [
  a[1]! * b[2]! - a[2]! * b[1]!,
  a[2]! * b[0]! - a[0]! * b[2]!,
  a[0]! * b[1]! - a[1]! * b[0]!,
];
const unit = (a: ArrayLike<number>): V3 => {
  const n = Math.hypot(a[0]!, a[1]!, a[2]!);
  return [a[0]! / n, a[1]! / n, a[2]! / n];
};

/** The plane through `point` with outward normal `normal` and a stable pair of axes. */
export function planeFrame(
  point: ArrayLike<number>,
  normal: ArrayLike<number>,
): SectionPlane {
  const z = unit(normal);
  const a =
    Math.abs(z[0]) < Math.abs(z[1]) && Math.abs(z[0]) < Math.abs(z[2])
      ? [1, 0, 0]
      : Math.abs(z[1]) < Math.abs(z[2])
        ? [0, 1, 0]
        : [0, 0, 1];
  const x = unit(cross(a, z));
  const y = cross(z, x);
  return { origin: [point[0]!, point[1]!, point[2]!], x, y, z };
}

/** A point of the plane, in its (u, v). */
export function toPlane(plane: SectionPlane, p: ArrayLike<number>): P2 {
  const d: V3 = [
    p[0]! - plane.origin[0],
    p[1]! - plane.origin[1],
    p[2]! - plane.origin[2],
  ];
  return [dot(d, plane.x), dot(d, plane.y)];
}

/** The plane's (u, v) as a point in space. */
export function fromPlane(plane: SectionPlane, p: ArrayLike<number>): V3 {
  return [
    plane.origin[0] + p[0]! * plane.x[0] + p[1]! * plane.y[0],
    plane.origin[1] + p[0]! * plane.x[1] + p[1]! * plane.y[1],
    plane.origin[2] + p[0]! * plane.x[2] + p[1]! * plane.y[2],
  ];
}

/** A direction in space, in the plane's (u, v). */
function dirToPlane(plane: SectionPlane, d: ArrayLike<number>): P2 {
  return [dot(d, plane.x), dot(d, plane.y)];
}

/** One curve where the plane meets a face's surface, in the plane's (u, v). */
export interface SectionCurve {
  readonly kind: "line" | "ellipse" | "marched";
  /** What a report says of how it was found. */
  readonly method: string;
  /** The parameter range; a closed curve repeats every `t1 − t0`. */
  readonly t0: number;
  readonly t1: number;
  readonly closed: boolean;
  point(t: number): P2;
  /** The unit tangent, in the direction of increasing t. */
  tangent(t: number): P2;
  /** The (u, v) on the face's surface, unwrapped into the face's domain; NaN when the point has none there. */
  uv(t: number): [number, number];
  /** Exactly a line: a point and a unit direction, t the distance along. */
  readonly line?: { readonly p: P2; readonly d: P2 };
  /** Exactly an ellipse: c + cos t·e1 + sin t·e2. */
  readonly ellipse?: { readonly c: P2; readonly e1: P2; readonly e2: P2 };
  /** Parameters a nearest-point search may start from. */
  starts(): number[];
}

/** What a face's surface needs to cut it. */
export interface FaceDomain {
  /** The (u, v) box of the face's outer loop: u0, u1, v0, v1. */
  readonly box: readonly [number, number, number, number];
}

/** How the plane meets a surface, for the report. */
export interface SectionStats {
  /** Marching grid cells with a crossing, or similar, per method. */
  marched: number;
  /** Surfaces the plane only touches or coincides with, skipped. */
  coincident: number;
}

/** The (u, v) of a point of the surface, wrapped into the face's domain. */
export function faceUv(
  form: BrepForm,
  surface: number,
  box: FaceDomain["box"],
  p: ArrayLike<number>,
): [number, number] {
  const kind = form.surfaceKind[surface] as SurfaceKind;
  const [u, v] = surfaceUv(form, surface, p);
  const eps = 1e-6 * Math.max(1, box[1] - box[0], box[3] - box[2]);
  let wu: number | undefined = u;
  let wv: number | undefined = v;
  if (periodicU(kind)) {
    wu = wrapAngle(u, box[0], box[1], eps);
  }
  if (periodicV(kind)) {
    wv = wrapAngle(v, box[2], box[3], eps);
  }
  return [wu ?? NaN, wv ?? NaN];
}

// --- the closed forms ------------------------------------------------------------

function makeLine(
  plane: SectionPlane,
  form: BrepForm,
  surface: number,
  box: FaceDomain["box"],
  p3: ArrayLike<number>,
  d3: ArrayLike<number>,
  t0: number,
  t1: number,
  method: string,
): SectionCurve {
  const p = toPlane(plane, p3);
  const d = dirToPlane(plane, d3);
  const length = Math.hypot(d[0], d[1]);
  d[0] /= length;
  d[1] /= length;
  return {
    kind: "line",
    method,
    t0,
    t1,
    closed: false,
    line: { p, d },
    point: (t) => [p[0] + t * d[0], p[1] + t * d[1]],
    tangent: () => d,
    uv: (t) =>
      faceUv(
        form,
        surface,
        box,
        fromPlane(plane, [p[0] + t * d[0], p[1] + t * d[1]]),
      ),
    starts: () => [t0, t1],
  };
}

function makeEllipse(
  plane: SectionPlane,
  form: BrepForm,
  surface: number,
  box: FaceDomain["box"],
  c: P2,
  e1: P2,
  e2: P2,
  method: string,
  uvOf?: (t: number) => [number, number],
): SectionCurve {
  const point = (t: number): P2 => [
    c[0] + Math.cos(t) * e1[0] + Math.sin(t) * e2[0],
    c[1] + Math.cos(t) * e1[1] + Math.sin(t) * e2[1],
  ];
  return {
    kind: "ellipse",
    method,
    t0: 0,
    t1: TAU,
    closed: true,
    ellipse: { c, e1, e2 },
    point,
    tangent: (t) => {
      const x = -Math.sin(t) * e1[0] + Math.cos(t) * e2[0];
      const y = -Math.sin(t) * e1[1] + Math.cos(t) * e2[1];
      const n = Math.hypot(x, y);
      return [x / n, y / n];
    },
    uv: uvOf ?? ((t) => faceUv(form, surface, box, fromPlane(plane, point(t)))),
    starts: () => Array.from({ length: 64 }, (_, i) => (i * TAU) / 64),
  };
}

const PARALLEL = 1e-9;

/**
 * The curves where the plane meets the surface's closed form, over the box
 * of (u, v) the face occupies; undefined when the surface has none
 * (a cone or torus cut obliquely, patches: marched).
 */
export function analyticSection(
  form: BrepForm,
  surface: number,
  box: FaceDomain["box"],
  plane: SectionPlane,
  stats: SectionStats,
): SectionCurve[] | undefined {
  const kind = form.surfaceKind[surface] as SurfaceKind;
  if (kind === SurfaceKind.Bezier) {
    return undefined;
  }
  const f = frameOf(form, surface);
  const r = form.surfaceParams[surface * 2]!;
  const p1 = form.surfaceParams[surface * 2 + 1]!;
  const N = plane.z;
  const nz = dot(N, f.z);
  const toAxis = (z: number): V3 => [
    f.origin[0] + z * f.z[0],
    f.origin[1] + z * f.z[1],
    f.origin[2] + z * f.z[2],
  ];
  /** The circle of radius ρ about `centre` in the plane. */
  const circle = (centre: V3, rho: number, method: string): SectionCurve =>
    makeEllipse(
      plane,
      form,
      surface,
      box,
      toPlane(plane, centre),
      [rho, 0],
      [0, rho],
      method,
    );
  switch (kind) {
    case SurfaceKind.Plane: {
      const d = cross(f.z, N);
      const dd = dot(d, d);
      if (dd < PARALLEL * PARALLEL) {
        stats.coincident++;
        return [];
      }
      const d1 = dot(f.z, f.origin);
      const d2 = dot(N, plane.origin);
      const a = cross(N, d);
      const b = cross(d, f.z);
      const p: V3 = [0, 1, 2].map((k) => (d1 * a[k]! + d2 * b[k]!) / dd) as V3;
      const dir = unit(d);
      // The face's box, as far as it reaches along the line.
      let lo = Infinity;
      let hi = -Infinity;
      for (const u of [box[0], box[1]]) {
        for (const v of [box[2], box[3]]) {
          const q: V3 = [
            f.origin[0] + u * f.x[0] + v * f.y[0],
            f.origin[1] + u * f.x[1] + v * f.y[1],
            f.origin[2] + u * f.x[2] + v * f.y[2],
          ];
          const t = dot([q[0] - p[0], q[1] - p[1], q[2] - p[2]], dir);
          lo = Math.min(lo, t);
          hi = Math.max(hi, t);
        }
      }
      const pad = 0.01 * (hi - lo) + 1e-6;
      return [
        makeLine(
          plane,
          form,
          surface,
          box,
          p,
          dir,
          lo - pad,
          hi + pad,
          "plane ∩ plane = line",
        ),
      ];
    }
    case SurfaceKind.Cylinder: {
      const c0: V3 = [f.origin[0], f.origin[1], f.origin[2]];
      const D = dot(N, [
        c0[0] - plane.origin[0],
        c0[1] - plane.origin[1],
        c0[2] - plane.origin[2],
      ]);
      if (Math.abs(nz) > PARALLEL) {
        // v(u) = −(D + r cos u N·x + r sin u N·y) / nz, so the section is an ellipse in u.
        const nx = dot(N, f.x);
        const ny = dot(N, f.y);
        const centre: V3 = [0, 1, 2].map(
          (k) => c0[k]! - (D / nz) * f.z[k]!,
        ) as V3;
        const e1: V3 = [0, 1, 2].map(
          (k) => r * (f.x[k]! - (nx / nz) * f.z[k]!),
        ) as V3;
        const e2: V3 = [0, 1, 2].map(
          (k) => r * (f.y[k]! - (ny / nz) * f.z[k]!),
        ) as V3;
        const c2 = toPlane(plane, centre);
        const a2 = dirToPlane(plane, e1);
        const b2 = dirToPlane(plane, e2);
        const uvOf = (t: number): [number, number] => {
          const v = -(D + r * Math.cos(t) * nx + r * Math.sin(t) * ny) / nz;
          let u = t;
          const eps = 1e-6 * Math.max(1, box[1] - box[0]);
          u = wrapAngle(u, box[0], box[1], eps) ?? NaN;
          return [u, v];
        };
        return [
          makeEllipse(
            plane,
            form,
            surface,
            box,
            c2,
            a2,
            b2,
            "plane ∩ cylinder = ellipse",
            uvOf,
          ),
        ];
      }
      // Parallel to the axis: lines where A cos u + B sin u = −D.
      const A = r * dot(N, f.x);
      const B = r * dot(N, f.y);
      const R0 = Math.hypot(A, B);
      const c = -D / R0;
      if (!(Math.abs(c) < 1 - 1e-12)) {
        stats.coincident += Math.abs(c) < 1 + 1e-12 ? 1 : 0;
        return [];
      }
      const phi = Math.atan2(B, A);
      const out: SectionCurve[] = [];
      const along = f.z;
      for (const u of [phi + Math.acos(c), phi - Math.acos(c)]) {
        const p: V3 = [0, 1, 2].map(
          (k) => c0[k]! + r * (Math.cos(u) * f.x[k]! + Math.sin(u) * f.y[k]!),
        ) as V3;
        // t is the distance along the axis from the point at v = 0.
        out.push(
          makeLine(
            plane,
            form,
            surface,
            box,
            p,
            along,
            box[2] - 1e-6 - 0.01 * (box[3] - box[2]),
            box[3] + 1e-6 + 0.01 * (box[3] - box[2]),
            "plane ∥ cylinder axis = two lines",
          ),
        );
      }
      return out;
    }
    case SurfaceKind.Sphere: {
      const h = dot(N, [
        f.origin[0] - plane.origin[0],
        f.origin[1] - plane.origin[1],
        f.origin[2] - plane.origin[2],
      ]);
      const rho2 = r * r - h * h;
      if (!(rho2 > 1e-18 * r * r)) {
        stats.coincident += rho2 > -1e-12 * r * r ? 1 : 0;
        return [];
      }
      const centre: V3 = [0, 1, 2].map((k) => f.origin[k]! - h * N[k]!) as V3;
      return [circle(centre, Math.sqrt(rho2), "plane ∩ sphere = circle")];
    }
    case SurfaceKind.Cone: {
      if (Math.abs(nz) < 1 - 1e-12) {
        return undefined;
      }
      // Square to the axis: the circle at height v = N·(origin − apex-frame origin) / nz.
      const v =
        dot(N, [
          plane.origin[0] - f.origin[0],
          plane.origin[1] - f.origin[1],
          plane.origin[2] - f.origin[2],
        ]) / nz;
      const rho = Math.abs(r + v * Math.tan(p1));
      if (!(rho > 1e-9)) {
        stats.coincident++;
        return [];
      }
      return [circle(toAxis(v), rho, "plane ⟂ cone axis = circle")];
    }
    case SurfaceKind.Torus: {
      if (Math.abs(nz) < 1 - 1e-12) {
        return undefined;
      }
      const h =
        dot(N, [
          plane.origin[0] - f.origin[0],
          plane.origin[1] - f.origin[1],
          plane.origin[2] - f.origin[2],
        ]) / nz;
      const k2 = p1 * p1 - h * h;
      if (!(k2 > 1e-18 * p1 * p1)) {
        stats.coincident += k2 > -1e-12 * p1 * p1 ? 1 : 0;
        return [];
      }
      const k = Math.sqrt(k2);
      return [
        circle(toAxis(h), Math.abs(r + k), "plane ⟂ torus axis = circle"),
        circle(toAxis(h), Math.abs(r - k), "plane ⟂ torus axis = circle"),
      ].filter((c) => c.ellipse!.e1[0] > 1e-9);
    }
    default:
      return undefined;
  }
}

// --- marching ---------------------------------------------------------------------

/** A surface in field coordinates (a, b) over a rectangle, and the plane's signed distance on it. */
export interface Field {
  readonly a0: number;
  readonly a1: number;
  readonly b0: number;
  readonly b1: number;
  eval(a: number, b: number): FieldSample;
  /** The surface's (u, v) at (a, b). */
  uv(a: number, b: number): [number, number];
}

export interface FieldSample {
  /** Signed distance to the plane: z · (p − origin). */
  readonly f: number;
  readonly fa: number;
  readonly fb: number;
  readonly p: V3;
  readonly pa: V3;
  readonly pb: V3;
}

/** An analytic surface over its face's box. */
export function analyticField(
  form: BrepForm,
  surface: number,
  box: FaceDomain["box"],
  plane: SectionPlane,
): Field {
  return {
    a0: box[0],
    a1: box[1],
    b0: box[2],
    b1: box[3],
    eval(a, b) {
      const s = evaluateSurface(form, surface, a, b);
      return sample(plane, s.position, s.du, s.dv);
    },
    uv: (a, b) => [a, b],
  };
}

/** One Bézier patch over its local (s, t). */
export function patchField(
  form: BrepForm,
  patch: number,
  plane: SectionPlane,
): Field {
  const d = form.patchDomain;
  const u0 = d[patch * 4]!;
  const u1 = d[patch * 4 + 1]!;
  const v0 = d[patch * 4 + 2]!;
  const v1 = d[patch * 4 + 3]!;
  return {
    a0: 0,
    a1: 1,
    b0: 0,
    b1: 1,
    eval(s, t) {
      const e = evaluatePatch(
        form.patchPoints,
        form.patchFirst[patch]!,
        form.patchDegree[patch * 2]!,
        form.patchDegree[patch * 2 + 1]!,
        s,
        t,
      );
      return sample(plane, e.position, e.du, e.dv);
    },
    uv: (s, t) => [u0 + s * (u1 - u0), v0 + t * (v1 - v0)],
  };
}

function sample(
  plane: SectionPlane,
  p: ArrayLike<number>,
  pa: ArrayLike<number>,
  pb: ArrayLike<number>,
): FieldSample {
  const N = plane.z;
  return {
    f: dot(N, [
      p[0]! - plane.origin[0],
      p[1]! - plane.origin[1],
      p[2]! - plane.origin[2],
    ]),
    fa: dot(N, pa),
    fb: dot(N, pb),
    p: [p[0]!, p[1]!, p[2]!],
    pa: [pa[0]!, pa[1]!, pa[2]!],
    pb: [pb[0]!, pb[1]!, pb[2]!],
  };
}

/** A chain of exact points along the plane's crossing of a field: (a, b) per vertex. */
export interface Chain {
  readonly a: number[];
  readonly b: number[];
  readonly closed: boolean;
}

/** The root of the field along a grid edge between (a0, b0) with value f0 and (a1, b1) with f1, signs differing. */
function edgeRoot(
  field: Field,
  a0: number,
  b0: number,
  f0: number,
  a1: number,
  b1: number,
  f1: number,
): [number, number] {
  let lo = 0;
  let hi = 1;
  let flo = f0;
  let fhi = f1;
  let side = 0;
  let s = 0.5;
  for (let i = 0; i < 80; i++) {
    s = (lo * fhi - hi * flo) / (fhi - flo);
    if (!(s > lo && s < hi)) {
      s = (lo + hi) / 2;
    }
    const fs = field.eval(a0 + s * (a1 - a0), b0 + s * (b1 - b0)).f;
    if (fs === 0 || hi - lo < 1e-15) {
      break;
    }
    if (fs > 0 === flo > 0) {
      lo = s;
      flo = fs;
      if (side === -1) {
        fhi /= 2;
      }
      side = -1;
    } else {
      hi = s;
      fhi = fs;
      if (side === 1) {
        flo /= 2;
      }
      side = 1;
    }
    if (Math.abs(fs) < 1e-15) {
      break;
    }
  }
  return [a0 + s * (a1 - a0), b0 + s * (b1 - b0)];
}

/**
 * The chains where the field's plane distance changes sign, on an n × m grid
 * (marching squares: saddles resolved by the cell centre). Each vertex is an
 * exact root along a grid edge, so two patches that share a boundary agree on
 * where a chain meets it.
 */
export function marchField(field: Field, n: number, m: number): Chain[] {
  const da = (field.a1 - field.a0) / n;
  const db = (field.b1 - field.b0) / m;
  const values = new Float64Array((n + 1) * (m + 1));
  const at = (i: number, j: number) => j * (n + 1) + i;
  let positive = false;
  let negative = false;
  for (let j = 0; j <= m; j++) {
    for (let i = 0; i <= n; i++) {
      const f = field.eval(field.a0 + i * da, field.b0 + j * db).f;
      values[at(i, j)] = f;
      positive ||= f > 0;
      negative ||= f <= 0;
    }
  }
  if (!(positive && negative)) {
    return [];
  }
  const sign = (i: number, j: number) => values[at(i, j)]! > 0;
  // Nodes: a crossing per grid edge, keyed h(i, j) for (i,j)-(i+1,j) and v(i, j) for (i,j)-(i,j+1).
  const nodeKey = new Map<number, number>();
  const nodeA: number[] = [];
  const nodeB: number[] = [];
  const nodeOf = (horizontal: boolean, i: number, j: number): number => {
    const key = (j * (n + 1) + i) * 2 + (horizontal ? 0 : 1);
    let id = nodeKey.get(key);
    if (id === undefined) {
      const i1 = horizontal ? i + 1 : i;
      const j1 = horizontal ? j : j + 1;
      const [a, b] = edgeRoot(
        field,
        field.a0 + i * da,
        field.b0 + j * db,
        values[at(i, j)]!,
        field.a0 + i1 * da,
        field.b0 + j1 * db,
        values[at(i1, j1)]!,
      );
      id = nodeA.length;
      nodeA.push(a);
      nodeB.push(b);
      nodeKey.set(key, id);
    }
    return id;
  };
  const links: number[][] = [];
  const link = (x: number, y: number) => {
    (links[x] ??= []).push(y);
    (links[y] ??= []).push(x);
  };
  for (let j = 0; j < m; j++) {
    for (let i = 0; i < n; i++) {
      const s = [
        sign(i, j),
        sign(i + 1, j),
        sign(i + 1, j + 1),
        sign(i, j + 1),
      ];
      if (s[0] === s[1] && s[1] === s[2] && s[2] === s[3]) {
        continue;
      }
      // Edges in order: bottom, right, top, left.
      const edges = [
        () => nodeOf(true, i, j),
        () => nodeOf(false, i + 1, j),
        () => nodeOf(true, i, j + 1),
        () => nodeOf(false, i, j),
      ];
      const crossing: number[] = [];
      for (let k = 0; k < 4; k++) {
        if (s[k] !== s[(k + 1) % 4]) {
          crossing.push(k);
        }
      }
      if (crossing.length === 2) {
        link(edges[crossing[0]!]!(), edges[crossing[1]!]!());
      } else {
        const centre =
          (values[at(i, j)]! +
            values[at(i + 1, j)]! +
            values[at(i + 1, j + 1)]! +
            values[at(i, j + 1)]!) /
            4 >
          0;
        if (centre === s[0]) {
          link(edges[0]!(), edges[1]!());
          link(edges[2]!(), edges[3]!());
        } else {
          link(edges[3]!(), edges[0]!());
          link(edges[1]!(), edges[2]!());
        }
      }
    }
  }
  // Walk the paths from their ends, then the cycles.
  const used = new Uint8Array(nodeA.length);
  const chains: Chain[] = [];
  const walk = (start: number, closed: boolean) => {
    const a: number[] = [];
    const b: number[] = [];
    let current = start;
    for (;;) {
      used[current] = 1;
      a.push(nodeA[current]!);
      b.push(nodeB[current]!);
      const next = links[current]!.find((x) => !used[x]);
      if (next === undefined) {
        break;
      }
      current = next;
    }
    chains.push({ a, b, closed });
  };
  for (let k = 0; k < nodeA.length; k++) {
    if (!used[k] && (links[k]?.length ?? 0) === 1) {
      walk(k, false);
    }
  }
  for (let k = 0; k < nodeA.length; k++) {
    if (!used[k] && (links[k]?.length ?? 0) >= 2) {
      walk(k, true);
    }
  }
  return chains;
}

/** A marched chain as a curve: t counts vertices; between them the point is refined onto the surface. */
export function chainCurve(
  field: Field,
  chain: Chain,
  plane: SectionPlane,
  method: string,
): SectionCurve | undefined {
  const n = chain.a.length;
  if (n < 2) {
    return undefined;
  }
  const closed = chain.closed;
  const t1 = closed ? n : n - 1;
  const scale = Math.max(field.a1 - field.a0, field.b1 - field.b0);
  const vertexPoints: P2[] = chain.a.map((a, i) =>
    toPlane(plane, field.eval(a, chain.b[i]!).p),
  );
  /** The refined (a, b) at parameter t. */
  const locate = (t: number): [number, number] => {
    const wrapped = closed ? ((t % n) + n) % n : Math.min(Math.max(t, 0), t1);
    let i = Math.floor(wrapped);
    let f = wrapped - i;
    if (!closed && i >= n - 1) {
      i = n - 2;
      f = 1;
    }
    const j = closed ? (i + 1) % n : i + 1;
    if (f === 0) {
      return [chain.a[i]!, chain.b[i]!];
    }
    if (f === 1) {
      return [chain.a[j]!, chain.b[j]!];
    }
    let a = chain.a[i]! + f * (chain.a[j]! - chain.a[i]!);
    let b = chain.b[i]! + f * (chain.b[j]! - chain.b[i]!);
    for (let k = 0; k < 6; k++) {
      const e = field.eval(a, b);
      const g = e.fa * e.fa + e.fb * e.fb;
      if (!(g > 0) || Math.abs(e.f) < 1e-14 * (1 + scale)) {
        break;
      }
      a = Math.min(Math.max(a - (e.f * e.fa) / g, field.a0), field.a1);
      b = Math.min(Math.max(b - (e.f * e.fb) / g, field.b0), field.b1);
    }
    return [a, b];
  };
  const curve: SectionCurve = {
    kind: "marched",
    method,
    t0: 0,
    t1,
    closed,
    point(t) {
      const w = closed ? ((t % n) + n) % n : t;
      if (Number.isInteger(w) && w >= 0 && w < n) {
        return vertexPoints[w]!;
      }
      if (!closed && w === t1) {
        return vertexPoints[n - 1]!;
      }
      const [a, b] = locate(t);
      return toPlane(plane, field.eval(a, b).p);
    },
    tangent(t) {
      const [a, b] = locate(t);
      const e = field.eval(a, b);
      const d3: V3 = [0, 1, 2].map(
        (k) => -e.fb * e.pa[k]! + e.fa * e.pb[k]!,
      ) as V3;
      let d = dirToPlane(plane, d3);
      const length = Math.hypot(d[0], d[1]);
      if (!(length > 0)) {
        d = [1, 0];
      } else {
        d = [d[0] / length, d[1] / length];
      }
      // Along the chain: toward the next vertex.
      const here = Math.floor(
        closed ? ((t % n) + n) % n : Math.min(t, t1 - 1e-9),
      );
      const from = vertexPoints[here]!;
      const to =
        vertexPoints[closed ? (here + 1) % n : Math.min(here + 1, n - 1)]!;
      return (to[0] - from[0]) * d[0] + (to[1] - from[1]) * d[1] < 0
        ? [-d[0], -d[1]]
        : d;
    },
    uv(t) {
      const [a, b] = locate(t);
      return field.uv(a, b);
    },
    starts: () => {
      const out: number[] = [];
      for (let i = 0; i < n; i++) {
        out.push(i, i + 0.5);
      }
      return out.filter((t) => t <= t1);
    },
  };
  return curve;
}

/** The parameter (and distance) of the point of `curve` nearest `q`. */
export function nearestParameter(
  curve: SectionCurve,
  q: P2,
): { t: number; distance: number } {
  const span = curve.t1 - curve.t0;
  const at = (t: number) => curve.point(t);
  const d2 = (t: number) => {
    const p = at(t);
    return (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2;
  };
  if (curve.line) {
    const { p, d } = curve.line;
    const t = Math.min(
      Math.max((q[0] - p[0]) * d[0] + (q[1] - p[1]) * d[1], curve.t0),
      curve.t1,
    );
    return { t, distance: Math.sqrt(d2(t)) };
  }
  let best = curve.t0;
  let bestD = Infinity;
  for (const t of curve.starts()) {
    const d = d2(t);
    if (d < bestD) {
      bestD = d;
      best = t;
    }
  }
  // Bracket around the best start, then golden-section: robust for any curve.
  const step = curve.kind === "ellipse" ? span / 64 : 0.5;
  let lo = best - step;
  let hi = best + step;
  if (!curve.closed) {
    lo = Math.max(lo, curve.t0);
    hi = Math.min(hi, curve.t1);
  }
  const phi = (Math.sqrt(5) - 1) / 2;
  let x1 = hi - phi * (hi - lo);
  let x2 = lo + phi * (hi - lo);
  let f1 = d2(x1);
  let f2 = d2(x2);
  for (let i = 0; i < 80 && hi - lo > 1e-14 * Math.max(1, span); i++) {
    if (f1 < f2) {
      hi = x2;
      x2 = x1;
      f2 = f1;
      x1 = hi - phi * (hi - lo);
      f1 = d2(x1);
    } else {
      lo = x1;
      x1 = x2;
      f1 = f2;
      x2 = lo + phi * (hi - lo);
      f2 = d2(x2);
    }
  }
  const t = (lo + hi) / 2;
  const final = d2(t);
  return final <= bestD
    ? { t, distance: Math.sqrt(final) }
    : { t: best, distance: Math.sqrt(bestD) };
}
