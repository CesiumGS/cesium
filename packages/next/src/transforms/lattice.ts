// Free-form deformation (Sederberg & Parry 1986): a lattice of control
// points on a parallelepiped (origin o, edge vectors e1, e2, e3) with
// degree (l, m, n) in each direction. A point's local coordinates
// (s, t, u) = M⁻¹ (p - o), M = [e1 e2 e3], index the trivariate Bernstein
// polynomial
//   q = Σ B_i^l(s) B_j^m(t) B_k^n(u) P_ijk.
// The control points start on the regular grid, where Bernstein linear
// precision gives q = p, and are parameters as displacements d_i_j_k_{x,y,z}
// from it, so q = p + Σ B_ijk d_ijk: the output is affine in every
// displacement. Outside the lattice the polynomial continues (Sederberg and
// Parry define it inside, s, t, u in [0, 1]). No closed-form inverse: a
// route solves by Newton with J = I + Σ d_ijk ⊗ ∇B_ijk.
import type { Params, SmoothEdge } from "../transform/graph.ts";
import {
  edgeOf,
  type ParamSpec,
  type TransformDescriptor,
} from "./descriptor.ts";

export type Degree = readonly [number, number, number];

function checkDegree(degree: Degree): void {
  if (!degree.every((n) => Number.isInteger(n) && n >= 1 && n <= 4)) {
    throw new RangeError(
      `lattice: the degree is ${degree.join("×")}; each is an integer from 1 to 4`,
    );
  }
}

/** The name of control point (i, j, k)'s displacement along an axis. */
export function displacementName(
  i: number,
  j: number,
  k: number,
  axis: "x" | "y" | "z",
): string {
  return `d_${i}_${j}_${k}_${axis}`;
}

const AXES = ["x", "y", "z"] as const;

function binomial(n: number, k: number): number {
  let c = 1;
  for (let i = 1; i <= k; i++) {
    c = (c * (n - k + i)) / i;
  }
  return c;
}

/** B_i^n(x) and its derivative, for i = 0..n. */
function bernstein(n: number, x: number, b: Float64Array, db: Float64Array) {
  for (let i = 0; i <= n; i++) {
    const c = binomial(n, i);
    b[i] = c * x ** i * (1 - x) ** (n - i);
    const left = i > 0 ? i * x ** (i - 1) * (1 - x) ** (n - i) : 0;
    const right = i < n ? (n - i) * x ** i * (1 - x) ** (n - i - 1) : 0;
    db[i] = c * (left - right);
  }
}

/** The text of B_i^n(x) for a local named `name`, with `(1 - x)` as `name1`. */
function bernsteinText(n: number, i: number, name: string): string {
  const factors: string[] = [];
  for (let a = 0; a < i; a++) {
    factors.push(name);
  }
  for (let a = 0; a < n - i; a++) {
    factors.push(`${name}1`);
  }
  const c = binomial(n, i);
  return [c === 1 ? undefined : String(c), ...factors]
    .filter((f): f is string => f !== undefined)
    .join(" * ")
    .replace(/^$/, "1");
}

function sourceOf(degree: Degree): string {
  const [l, m, n] = degree;
  const lines = [
    "(p, params) => {",
    "  const { ox, oy, oz, e1x, e1y, e1z, e2x, e2y, e2z, e3x, e3y, e3z } = params;",
    "  const dx = p[0] - ox;",
    "  const dy = p[1] - oy;",
    "  const dz = p[2] - oz;",
    "  const c1x = e2y * e3z - e2z * e3y;",
    "  const c1y = e2z * e3x - e2x * e3z;",
    "  const c1z = e2x * e3y - e2y * e3x;",
    "  const det = e1x * c1x + e1y * c1y + e1z * c1z;",
    "  const s = (c1x * dx + c1y * dy + c1z * dz) / det;",
    "  const t = ((e3y * e1z - e3z * e1y) * dx + (e3z * e1x - e3x * e1z) * dy + (e3x * e1y - e3y * e1x) * dz) / det;",
    "  const u = ((e1y * e2z - e1z * e2y) * dx + (e1z * e2x - e1x * e2z) * dy + (e1x * e2y - e1y * e2x) * dz) / det;",
    "  const s1 = 1 - s;",
    "  const t1 = 1 - t;",
    "  const u1 = 1 - u;",
  ];
  const sums: Record<string, string[]> = { x: [], y: [], z: [] };
  for (let i = 0; i <= l; i++) {
    lines.push(`  const bs${i} = ${bernsteinText(l, i, "s")};`);
  }
  for (let j = 0; j <= m; j++) {
    lines.push(`  const bt${j} = ${bernsteinText(m, j, "t")};`);
  }
  for (let k = 0; k <= n; k++) {
    lines.push(`  const bu${k} = ${bernsteinText(n, k, "u")};`);
  }
  for (let i = 0; i <= l; i++) {
    for (let j = 0; j <= m; j++) {
      for (let k = 0; k <= n; k++) {
        lines.push(`  const w_${i}_${j}_${k} = bs${i} * bt${j} * bu${k};`);
        for (const axis of AXES) {
          sums[axis]!.push(
            `w_${i}_${j}_${k} * params.${displacementName(i, j, k, axis)}`,
          );
        }
      }
    }
  }
  lines.push(
    `  return [p[0] + ${sums.x!.join(" + ")}, p[1] + ${sums.y!.join(" + ")}, p[2] + ${sums.z!.join(" + ")}];`,
    "}",
  );
  return lines.join("\n");
}

const cache = new Map<string, TransformDescriptor>();

/** The descriptor of a lattice of this degree (cached: it is the shape). */
export function latticeDescriptor(degree: Degree): TransformDescriptor {
  checkDegree(degree);
  const id = `lattice${degree.join("")}`;
  const cached = cache.get(id);
  if (cached) {
    return cached;
  }
  const [l, m, n] = degree;
  const params: Record<string, ParamSpec> = {
    ox: { default: 0, description: "the lattice's origin, x" },
    oy: { default: 0, description: "the lattice's origin, y" },
    oz: { default: 0, description: "the lattice's origin, z" },
  };
  for (const edge of ["e1", "e2", "e3"]) {
    AXES.forEach((axis, a) => {
      params[`${edge}${axis}`] = {
        default: edge === `e${a + 1}` ? 1 : 0,
        description: `edge vector ${edge}, ${axis}`,
      };
    });
  }
  const separable: string[] = [];
  for (let i = 0; i <= l; i++) {
    for (let j = 0; j <= m; j++) {
      for (let k = 0; k <= n; k++) {
        for (const axis of AXES) {
          const name = displacementName(i, j, k, axis);
          params[name] = {
            default: 0,
            description: `control point (${i}, ${j}, ${k})'s displacement, ${axis}`,
          };
          separable.push(name);
        }
      }
    }
  }
  const bs = new Float64Array(l + 1);
  const dbs = new Float64Array(l + 1);
  const bt = new Float64Array(m + 1);
  const dbt = new Float64Array(m + 1);
  const bu = new Float64Array(n + 1);
  const dbu = new Float64Array(n + 1);
  const descriptor: TransformDescriptor = {
    id,
    params,
    forward(p, values, out, jacobian) {
      const v = values as Params;
      const e = [
        [v.e1x!, v.e1y!, v.e1z!],
        [v.e2x!, v.e2y!, v.e2z!],
        [v.e3x!, v.e3y!, v.e3z!],
      ] as const;
      const x = p[0]!;
      const y = p[1]!;
      const z = p[2]!;
      const d = [x - v.ox!, y - v.oy!, z - v.oz!];
      const cross = (a: readonly number[], b: readonly number[]) => [
        a[1]! * b[2]! - a[2]! * b[1]!,
        a[2]! * b[0]! - a[0]! * b[2]!,
        a[0]! * b[1]! - a[1]! * b[0]!,
      ];
      const c23 = cross(e[1], e[2]);
      const det = e[0][0] * c23[0]! + e[0][1] * c23[1]! + e[0][2] * c23[2]!;
      // ∇s, ∇t, ∇u: the rows of M⁻¹
      const dual = [c23, cross(e[2], e[0]), cross(e[0], e[1])].map((row) =>
        row.map((c) => c / det),
      );
      const st = dual.map(
        (row) => row[0]! * d[0]! + row[1]! * d[1]! + row[2]! * d[2]!,
      );
      bernstein(l, st[0]!, bs, dbs);
      bernstein(m, st[1]!, bt, dbt);
      bernstein(n, st[2]!, bu, dbu);
      const q = [x, y, z];
      const grad = [0, 1, 2].map(() => [0, 0, 0]); // grad[r][c]
      for (let i = 0; i <= l; i++) {
        for (let j = 0; j <= m; j++) {
          for (let k = 0; k <= n; k++) {
            const w = bs[i]! * bt[j]! * bu[k]!;
            const ds = dbs[i]! * bt[j]! * bu[k]!;
            const dt = bs[i]! * dbt[j]! * bu[k]!;
            const du = bs[i]! * bt[j]! * dbu[k]!;
            for (let r = 0; r < 3; r++) {
              const disp = v[displacementName(i, j, k, AXES[r]!)]!;
              q[r]! += w * disp;
              for (let c = 0; c < 3; c++) {
                grad[r]![c]! +=
                  disp *
                  (ds * dual[0]![c]! + dt * dual[1]![c]! + du * dual[2]![c]!);
              }
            }
          }
        }
      }
      out[0] = q[0]!;
      out[1] = q[1]!;
      out[2] = q[2]!;
      if (jacobian) {
        for (let c = 0; c < 3; c++) {
          for (let r = 0; r < 3; r++) {
            jacobian[c * 3 + r] = (r === c ? 1 : 0) + grad[r]![c]!;
          }
        }
      }
    },
    separable,
    source: sourceOf(degree),
    ...(degree.every((n) => n === 2) && { slang: "latticeParity" }),
  };
  cache.set(id, descriptor);
  return descriptor;
}

/**
 * A lattice over the parallelepiped at `origin` with edges `axes`
 * (default the unit cube), of `degree` (default 2×2×2). `displacements`
 * lists the control points' displacements from the regular grid, three
 * numbers each, with i the slowest index and k the fastest, or gives them
 * by `(i, j, k)`.
 */
export function lattice(options: {
  origin?: ArrayLike<number>;
  axes?: readonly [ArrayLike<number>, ArrayLike<number>, ArrayLike<number>];
  degree?: Degree;
  displacements?:
    | ArrayLike<number>
    | ((i: number, j: number, k: number) => ArrayLike<number>);
}): SmoothEdge {
  const degree = options.degree ?? [2, 2, 2];
  const descriptor = latticeDescriptor(degree);
  const [l, m, n] = degree;
  const values: Record<string, number> = {};
  const o = options.origin ?? [0, 0, 0];
  values.ox = o[0]!;
  values.oy = o[1]!;
  values.oz = o[2]!;
  options.axes?.forEach((edge, a) => {
    AXES.forEach((axis, c) => {
      values[`e${a + 1}${axis}`] = edge[c]!;
    });
  });
  const count = (l + 1) * (m + 1) * (n + 1);
  const given = options.displacements;
  if (typeof given !== "function" && given && given.length !== 3 * count) {
    throw new RangeError(
      `lattice: ${count} control points need ${3 * count} displacements, got ${given.length}`,
    );
  }
  if (given) {
    for (let i = 0; i <= l; i++) {
      for (let j = 0; j <= m; j++) {
        for (let k = 0; k <= n; k++) {
          const at =
            typeof given === "function"
              ? given(i, j, k)
              : Array.from(
                  { length: 3 },
                  (_, a) => given[3 * ((i * (m + 1) + j) * (n + 1) + k) + a]!,
                );
          AXES.forEach((axis, a) => {
            values[displacementName(i, j, k, axis)] = at[a]!;
          });
        }
      }
    }
  }
  return edgeOf(descriptor, values);
}
