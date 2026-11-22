// First-order Taylor-model bounds of a chain of maps over a box, on Cesium
// IR: `src/transform/taylorBounds.ts`'s method, unchanged, with the route
// walk left to the caller. For a box with center c, F(c + δ) lies in
// F(c) + J(c)·δ + R, and only the second-order remainder R is bounded by an
// interval evaluation, of the Hessian program (or, past a kink, of J) over
// the box: whatever the interval's swell, it multiplies r², not r.
//
// The model is carried as a point c, a matrix L (the image of the box's half
// axes) and a per-axis remainder ρ, so the image is inside
// c + L·[−1, 1]³ + [−ρ, ρ]:
//   - an affine link: L' = A L, ρ' = |A| ρ;
//   - a map f, on the input's axis-aligned hull (half-extent s = |L|·1 + ρ
//     about its input point): L' = J(c) L, ρ' = |J(c)| ρ + ½ Σ |H|ₘₐₓ s s,
//     plus, for a ranged parameter p, ∂f/∂p over the hull and the range
//     times the range's half-width. A map with a kink has the mean-value
//     form instead: J's interval over the hull minus J(c), times s.
// A map with a step is refused. The same walk bounds ‖J‖, the oscillation
// of J and ‖D²F‖ over the box, for the chord error.
//
// A map is a program with a float3 input (the point) whose outputs' lanes,
// in order, are the three coordinates of its image: three floats, or one
// float3. Its other inputs are its float parameters.

import {
  derivativeName,
  hessianProgram,
  jacobianProgram,
  parameterProgram,
} from "./ad.ts";
import { Builder } from "./builder.ts";
import { evaluate } from "./evaluate.ts";
import { evaluateInterval, type Interval, type Range } from "./interval.ts";
import { kinks } from "./kinks.ts";
import { width, type Id, type Program, type Value } from "./types.ts";

/** A map's derivative programs, each with scalar outputs in a fixed order. */
export interface MapIr {
  readonly value: Program;
  /** The point's input. */
  readonly input: string;
  /** J, row-major: 9 outputs, `3 i + j` is ∂out_i/∂p_j. */
  readonly jacobian: Program;
  /** H: 27 outputs, `9 i + 3 j + k` is ∂²out_i/∂p_j∂p_k. Built on first use. */
  hessian(): Program;
  /** Along parameters: `3 n + i` is ∂out_i/∂names[n]. */
  parameters(names: readonly string[]): Program;
  /** Some output reads an op whose derivative may jump. */
  readonly kinked: boolean;
  /** Some output reads an op whose value may jump. */
  readonly discontinuous: boolean;
}

/** The output lanes of `p`, in order: [output name, lane or undefined]. */
function outputLanes(p: Program): [string, number | undefined][] {
  return p.outputs.flatMap((o) => {
    const n = width(p.eqns[o.id]!.type);
    return n === 1
      ? [[o.name, undefined] as [string, number | undefined]]
      : Array.from(
          { length: n },
          (_, l) => [o.name, l] as [string, number | undefined],
        );
  });
}

/** `derived`'s outputs, lane by lane, as scalar outputs named in `order`. */
function scalarOutputs(
  derived: Program,
  order: readonly [string, number | undefined][],
): Program {
  const b = Builder.from(derived);
  const out: Record<string, Id> = {};
  order.forEach(([name, lane], n) => {
    const o = derived.outputs.find((x) => x.name === name);
    if (!o) {
      throw new Error(`no output '${name}'`);
    }
    const t = derived.eqns[o.id]!.type;
    out[`e${n}`] =
      lane === undefined ? o.id : b.op(`math/extract${width(t)}`, [o.id], lane);
  });
  return b.program(out);
}

/** A map's passes: J, H and parameter derivatives, and its kinks. */
export function mapIr(value: Program, input = "p"): MapIr {
  const decl = value.inputs.find((i) => i.name === input);
  if (!decl || decl.type !== "float3") {
    throw new Error(`a map needs a float3 input '${input}'`);
  }
  const lanes = outputLanes(value);
  if (lanes.length !== 3) {
    throw new Error(`a map's outputs have 3 lanes, not ${lanes.length}`);
  }
  const at = (j: number) => ({ input, lane: j });
  const jacobian = scalarOutputs(
    jacobianProgram(value, input),
    lanes.flatMap(([name, lane]) =>
      [0, 1, 2].map(
        (j) =>
          [derivativeName(name, at(j)), lane] as [string, number | undefined],
      ),
    ),
  );
  let hessian: Program | undefined;
  const parameters = new Map<string, Program>();
  const k = kinks(value);
  return {
    value,
    input,
    jacobian,
    hessian: () =>
      (hessian ??= scalarOutputs(
        hessianProgram(value, input),
        lanes.flatMap(([name, lane]) =>
          [0, 1, 2].flatMap((j) =>
            [0, 1, 2].map(
              (m) =>
                [derivativeName(name, at(j), at(m)), lane] as [
                  string,
                  number | undefined,
                ],
            ),
          ),
        ),
      )),
    parameters(names) {
      const key = names.join(",");
      let found = parameters.get(key);
      if (!found) {
        found = scalarOutputs(
          parameterProgram(value, names),
          names.flatMap((n) =>
            lanes.map(
              ([name, lane]) =>
                [derivativeName(name, { input: n }), lane] as [
                  string,
                  number | undefined,
                ],
            ),
          ),
        );
        parameters.set(key, found);
      }
      return found;
    },
    kinked: Object.values(k).some((o) => o.kinks.length > 0),
    discontinuous: Object.values(k).some((o) => o.steps.length > 0),
  };
}

/** A scalar-output program's outputs, in order, in float64. */
export function evaluateScalars(
  p: Program,
  inputs: Readonly<Record<string, Value>>,
): number[] {
  const values = evaluate(p, inputs);
  return p.outputs.map((o) => values[o.name] as number);
}

/** A box: its center and either half axes (column-major 3×3) or a half-extent. */
export interface TaylorBox {
  readonly center: ArrayLike<number>;
  readonly halfAxes?: ArrayLike<number>;
  readonly halfExtent?: ArrayLike<number>;
}

/** A parameter's range: a value, `[lo, hi]` or an interval. */
export type ParamRange = number | readonly [number, number] | Interval;

/** One link of the chain, in the order a point goes through them. */
export type TaylorLink =
  | {
      readonly kind: "affine";
      /** The link's Jacobian, column-major 3×3. */
      readonly jacobian: ArrayLike<number>;
    }
  | {
      readonly kind: "map";
      /** For messages. */
      readonly name: string;
      readonly map: MapIr;
      /** The point the map is applied to (the image of the box's center so far). */
      readonly input: ArrayLike<number>;
      /** The parameters' values. */
      readonly params: Readonly<Record<string, number>>;
      /** Ranges some parameters may take, so the bound holds over them. */
      readonly ranges?: Readonly<Record<string, ParamRange>>;
    }
  | { readonly kind: "refuse"; readonly reason: string };

export interface TaylorOptions {
  /** Cells per axis the hull is cut into for the derivatives' intervals (default 1). */
  readonly cells?: number;
}

export interface TaylorChain {
  readonly ok: true;
  /** J(c)·(half axes), column-major. */
  readonly linear: Float64Array;
  readonly remainder: Float64Array;
  readonly halfExtent: Float64Array;
  /** A sphere about the center's image that holds the image: the farthest corner of L·[−1, 1]³, plus |ρ|. */
  readonly radius: number;
  readonly jacobianNorm: number;
  readonly oscillation: number;
  readonly hessianNorm: number;
  readonly continuous: boolean;
}

export interface TaylorRefusal {
  readonly ok: false;
  readonly reason: string;
}

const norm = (m: ArrayLike<number>): number => {
  let s = 0;
  for (let i = 0; i < m.length; i++) {
    s += m[i]! * m[i]!;
  }
  return Math.sqrt(s);
};

const reachOf = (i: Interval): number =>
  Math.max(Math.abs(i.lo), Math.abs(i.hi));

const toRange = (r: ParamRange): Range =>
  typeof r === "number"
    ? r
    : Array.isArray(r)
      ? { lo: r[0]!, hi: r[1]! }
      : (r as Interval);

/**
 * The reach (largest |value|) and deviation (largest |value − center|) of
 * each scalar output of `p` over `hull`, taken over `cells` per axis. A
 * non-finite interval makes Infinity.
 */
export function intervalReaches(
  p: Program,
  input: string,
  hull: { min: readonly number[]; max: readonly number[] },
  ranges: Readonly<Record<string, ParamRange>>,
  cells: number,
  center?: readonly number[],
): { reach: number[]; deviation: number[] } {
  const n = p.outputs.length;
  const reach = new Array<number>(n).fill(0);
  const deviation = new Array<number>(n).fill(0);
  const size = [0, 1, 2].map((a) => (hull.max[a]! - hull.min[a]!) / cells);
  const others: Record<string, Range> = {};
  for (const [name, r] of Object.entries(ranges)) {
    others[name] = toRange(r);
  }
  for (let i = 0; i < cells; i++) {
    for (let j = 0; j < cells; j++) {
      for (let k = 0; k < cells; k++) {
        const at = [i, j, k];
        const lanes = [0, 1, 2].map((a) => {
          const lo = hull.min[a]! + at[a]! * size[a]!;
          return { lo, hi: lo + size[a]! };
        });
        const bounds = evaluateInterval(p, { ...others, [input]: lanes });
        p.outputs.forEach((o, m) => {
          const value = bounds[o.name]![0]!;
          const finite = Number.isFinite(value.lo + value.hi);
          const r = finite ? reachOf(value) : Infinity;
          reach[m] = Math.max(reach[m]!, r);
          const d =
            center && finite
              ? Math.max(
                  Math.abs(value.lo - center[m]!),
                  Math.abs(value.hi - center[m]!),
                )
              : r;
          deviation[m] = Math.max(deviation[m]!, d);
        });
      }
    }
  }
  return { reach, deviation };
}

/** `A·B` for column-major 3×3s. */
function multiply(a: ArrayLike<number>, b: ArrayLike<number>): Float64Array {
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

/** |A| ρ for a column-major 3×3. */
const absTimes = (a: ArrayLike<number>, rho: ArrayLike<number>): number[] =>
  [0, 1, 2].map(
    (i) =>
      Math.abs(a[i]!) * rho[0]! +
      Math.abs(a[3 + i]!) * rho[1]! +
      Math.abs(a[6 + i]!) * rho[2]!,
  );

/** The Taylor model of the chain `links` over `box`, or why it can't be made. */
export function taylorChain(
  box: TaylorBox,
  links: readonly TaylorLink[],
  options: TaylorOptions = {},
): TaylorChain | TaylorRefusal {
  let linear: Float64Array;
  if (box.halfAxes) {
    linear = Float64Array.from(box.halfAxes);
  } else if (box.halfExtent) {
    const h = box.halfExtent;
    linear = Float64Array.of(h[0]!, 0, 0, 0, h[1]!, 0, 0, 0, h[2]!);
  } else {
    throw new RangeError("taylorBounds: a box has halfAxes or halfExtent");
  }
  const rho = new Float64Array(3);
  let jacobianNorm = 1;
  let oscillation = 0;
  let hessianNorm = 0;
  let continuous = true;
  const cells = options.cells ?? 1;

  for (const link of links) {
    if (link.kind === "refuse") {
      return { ok: false, reason: link.reason };
    }
    if (link.kind === "affine") {
      const a = link.jacobian;
      linear = multiply(a, linear);
      rho.set(absTimes(a, rho));
      const f = norm(a);
      jacobianNorm *= f;
      oscillation *= f;
      hessianNorm *= f;
      continue;
    }
    const { name, map } = link;
    if (map.discontinuous) {
      return {
        ok: false,
        reason: `"${name}" has a step (floor, ceil or fract): no derivative bound holds`,
      };
    }
    const held = link.params;
    const ranges: Record<string, ParamRange> = { ...held };
    const widths: Array<[string, number]> = [];
    for (const [p, range] of Object.entries(link.ranges ?? {})) {
      if (!(p in held)) {
        throw new Error(`taylorBounds: "${name}" has no parameter "${p}"`);
      }
      const [lo, hi] =
        typeof range === "number"
          ? [range, range]
          : Array.isArray(range)
            ? [range[0]!, range[1]!]
            : [(range as Interval).lo, (range as Interval).hi];
      ranges[p] = [lo, hi];
      const half = Math.max(Math.abs(hi - held[p]!), Math.abs(held[p]! - lo));
      if (half > 0) {
        widths.push([p, half]);
      }
    }
    const input = link.input;
    const s = [0, 0, 0];
    for (let j = 0; j < 3; j++) {
      s[j] =
        Math.abs(linear[j]!) +
        Math.abs(linear[3 + j]!) +
        Math.abs(linear[6 + j]!) +
        rho[j]!;
    }
    const hull = {
      min: [0, 1, 2].map((j) => input[j]! - s[j]!),
      max: [0, 1, 2].map((j) => input[j]! + s[j]!),
    };
    // J(c), row-major as the program has it, and column-major.
    const centerJ = evaluateScalars(map.jacobian, {
      ...held,
      [map.input]: [input[0]!, input[1]!, input[2]!],
    });
    const j = Float64Array.from(
      { length: 9 },
      (_, k) => centerJ[3 * (k % 3) + Math.floor(k / 3)]!,
    );
    const jOver = intervalReaches(
      map.jacobian,
      map.input,
      hull,
      ranges,
      cells,
      centerJ,
    );
    const hOver = intervalReaches(
      map.hessian(),
      map.input,
      hull,
      ranges,
      cells,
    );
    if (
      jOver.reach.some((x) => !Number.isFinite(x)) ||
      hOver.reach.some((x) => !Number.isFinite(x))
    ) {
      return {
        ok: false,
        reason: `"${name}": its derivatives are not bounded over the box (a division or root through zero)`,
      };
    }
    const jReach = jOver.reach;
    const jWidth = jOver.deviation;
    const hMax = hOver.reach;
    const step = new Float64Array(3);
    for (let i = 0; i < 3; i++) {
      let second = 0;
      if (map.kinked) {
        for (let k = 0; k < 3; k++) {
          second += jWidth[3 * i + k]! * s[k]!;
        }
      } else {
        for (let a = 0; a < 3; a++) {
          for (let b = 0; b < 3; b++) {
            second += 0.5 * hMax[9 * i + 3 * a + b]! * s[a]! * s[b]!;
          }
        }
      }
      step[i] = second;
    }
    if (widths.length > 0) {
      const dp = intervalReaches(
        map.parameters(widths.map(([p]) => p)),
        map.input,
        hull,
        ranges,
        cells,
      ).reach;
      widths.forEach(([, half], n) => {
        for (let i = 0; i < 3; i++) {
          step[i] = step[i]! + half * dp[3 * n + i]!;
        }
      });
    }
    const carried = absTimes(j, rho);
    rho.set(carried.map((x, i) => x + step[i]!));
    linear = multiply(j, linear);
    const jf = norm(jReach);
    const wf = norm(jWidth);
    const mf = norm(hMax);
    // D²(f∘g) = f''(g')² + f'g''; osc(J_f∘g · J_g) ≤ W_f·‖J_g‖ + ‖J_f‖·W_g.
    hessianNorm = mf * jacobianNorm * jacobianNorm + jf * hessianNorm;
    oscillation = wf * jacobianNorm + jf * oscillation;
    jacobianNorm *= jf;
    continuous &&= !map.kinked;
  }
  let reachCorner = 0;
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        reachCorner = Math.max(
          reachCorner,
          Math.hypot(
            sx * linear[0]! + sy * linear[3]! + sz * linear[6]!,
            sx * linear[1]! + sy * linear[4]! + sz * linear[7]!,
            sx * linear[2]! + sy * linear[5]! + sz * linear[8]!,
          ),
        );
      }
    }
  }
  const halfExtent = Float64Array.from(
    [0, 1, 2],
    (i) =>
      Math.abs(linear[i]!) +
      Math.abs(linear[3 + i]!) +
      Math.abs(linear[6 + i]!) +
      rho[i]!,
  );
  return {
    ok: true,
    linear,
    remainder: rho,
    halfExtent,
    radius: reachCorner + Math.hypot(rho[0]!, rho[1]!, rho[2]!),
    jacobianNorm,
    oscillation,
    hessianNorm,
    continuous,
  };
}
