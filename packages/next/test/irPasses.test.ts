// Cesium IR's passes (CS-50) on vector programs, which the transform front
// end's scalar programs don't exercise: forward-mode AD, intervals and
// breakpoint splitting, the Taylor model, rates and hoisting, literals to
// uniforms, and kinks. The transform modules run on these passes (CS-53), so
// their own tests check them on the transforms' cases.
import { describe, expect, it } from "vitest";
import {
  differentiate,
  hessianProgram,
  jacobianProgram,
  jvp,
  parameterProgram,
} from "../src/ir/ad.ts";
import { Builder, shapeKey } from "../src/ir/builder.ts";
import { evaluate } from "../src/ir/evaluate.ts";
import {
  evaluateInterval,
  evaluateIntervalSplit,
  type Interval,
} from "../src/ir/interval.ts";
import { kinks } from "../src/ir/kinks.ts";
import {
  hoistUniforms,
  hoistedValues,
  literalsToUniforms,
  rates,
} from "../src/ir/rates.ts";
import { mapIr, taylorChain } from "../src/ir/taylor.ts";
import type { Id, Program, Value } from "../src/ir/types.ts";

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const lanes = (v: Value): number[] =>
  typeof v === "number" ? [v] : typeof v === "boolean" ? [v ? 1 : 0] : [...v];

/**
 * A vector program: q = normalize(cross(p, a)) · |p| + mix(p, a ⊙ p, t)
 * + (p · a) a, with p per vertex, a (float3) and t uniform.
 */
function vectorProgram(): Program {
  const b = new Builder();
  const p = b.input("p", "float3", "vertex");
  const a = b.input("a", "float3", "uniform");
  const t = b.input("t", "float", "uniform");
  const op = (name: string, ...args: Id[]) => b.op(name, args);
  const n = op("math/normalize", op("math/cross", p, a));
  const swirl = op("math/mul", n, b.splat(op("math/length", p), 3));
  const blend = op("math/mix", p, op("math/mul", a, p), b.splat(t, 3));
  const proj = op("math/mul", b.splat(op("math/dot", p, a), 3), a);
  return b.program({
    q: op("math/add", op("math/add", swirl, blend), proj),
    s: op("math/length", op("math/sub", p, a)),
  });
}

const A = [0.3, -0.8, 0.5];
const T = 0.35;

describe("forward-mode AD on a vector program", () => {
  const program = vectorProgram();
  const at = (p: number[], a = A, t = T) =>
    evaluate(program, { p, a, t }) as Record<string, Value>;
  const central = (
    f: (x: number) => Record<string, Value>,
    x: number,
    h: number,
  ) => {
    const up = f(x + h);
    const down = f(x - h);
    return Object.fromEntries(
      Object.keys(up).map((k) => [
        k,
        lanes(up[k]!).map((u, i) => (u - lanes(down[k]!)[i]!) / (2 * h)),
      ]),
    );
  };

  it("J's columns (vector outputs) match central differences", () => {
    const J = jacobianProgram(program, "p");
    expect(J.outputs.map((o) => o.name)).toEqual([
      "q/p.0",
      "s/p.0",
      "q/p.1",
      "s/p.1",
      "q/p.2",
      "s/p.2",
    ]);
    expect(J.eqns[J.outputs[0]!.id]!.type).toBe("float3");
    const random = rng(7);
    for (let k = 0; k < 20; k++) {
      const p = [0, 1, 2].map(() => 4 * random() - 2);
      const jv = evaluate(J, { p, a: A, t: T });
      for (let j = 0; j < 3; j++) {
        const d = central(
          (x) => at(p.map((y, i) => (i === j ? x : y))),
          p[j]!,
          1e-6,
        );
        for (const out of ["q", "s"]) {
          lanes(jv[`${out}/p.${j}`]!).forEach((v, i) => {
            expect(Math.abs(v - d[out]![i]!)).toBeLessThan(
              1e-6 * (1 + Math.abs(v)),
            );
          });
        }
      }
    }
  });

  it("H is J differentiated again: symmetric, and matches central differences of J", () => {
    const J = jacobianProgram(program, "p", ["q"]);
    const H = hessianProgram(program, "p", ["q"]);
    expect(H.outputs).toHaveLength(9);
    const random = rng(9);
    for (let k = 0; k < 10; k++) {
      const p = [0, 1, 2].map(() => 4 * random() - 2);
      const hv = evaluate(H, { p, a: A, t: T });
      for (let j = 0; j < 3; j++) {
        for (let m = 0; m < 3; m++) {
          expect(hv[`q/p.${j}/p.${m}`]).toEqual(hv[`q/p.${m}/p.${j}`]);
        }
        const dJ = central(
          (x) =>
            evaluate(J, {
              p: p.map((y, i) => (i === j ? x : y)),
              a: A,
              t: T,
            }),
          p[j]!,
          1e-5,
        );
        for (let m = 0; m < 3; m++) {
          lanes(hv[`q/p.${j}/p.${m}`]!).forEach((v, i) => {
            expect(Math.abs(v - dJ[`q/p.${m}`]![i]!)).toBeLessThan(
              1e-4 * (1 + Math.abs(v)),
            );
          });
        }
      }
    }
  });

  it("derivatives along a scalar and a vector parameter match central differences", () => {
    const P = parameterProgram(program, ["t", "a"]);
    expect(P.outputs.map((o) => o.name)).toEqual([
      "q/t",
      "s/t",
      "q/a.0",
      "s/a.0",
      "q/a.1",
      "s/a.1",
      "q/a.2",
      "s/a.2",
    ]);
    const p = [0.7, -1.1, 0.4];
    const pv = evaluate(P, { p, a: A, t: T });
    const dt = central((x) => at(p, A, x), T, 1e-6);
    lanes(pv["q/t"]!).forEach((v, i) =>
      expect(Math.abs(v - dt["q"]![i]!)).toBeLessThan(1e-7),
    );
    expect(pv["s/t"]).toEqual(0);
    for (let j = 0; j < 3; j++) {
      const d = central(
        (x) =>
          at(
            p,
            A.map((y, i) => (i === j ? x : y)),
          ),
        A[j]!,
        1e-6,
      );
      lanes(pv[`q/a.${j}`]!).forEach((v, i) =>
        expect(Math.abs(v - d["q"]![i]!)).toBeLessThan(1e-6),
      );
    }
  });

  it("a zero tangent is no equation", () => {
    const b = new Builder();
    const p = b.input("p", "float3", "vertex");
    const a = b.input("a", "float3", "uniform");
    const free = b.op("math/cross", [a, b.const([0, 0, 1])]);
    const x = b.op("math/extract3", [p], 0);
    const before = b.eqns.length;
    expect(jvp(b, [free], { input: "p", lane: 0 })).toEqual([null]);
    expect(b.eqns.length).toBe(before);
    // d(x · 2)/dp₀ is the constant 2: folded, no new op.
    const twice = b.op("math/mul", [x, b.const(2)]);
    const [t] = differentiate(b, [twice], { input: "p", lane: 0 });
    expect(b.eqns[t!]).toMatchObject({ op: "const", value: 2 });
    // Along lane 1 it's zero: one zero constant and no op.
    const [z] = differentiate(b, [twice], { input: "p", lane: 1 });
    expect(b.eqns[z!]).toMatchObject({ op: "const", value: 0 });
  });
});

const contains = (b: Interval, v: number) =>
  v >= b.lo - 1e-12 * (1 + Math.abs(v)) &&
  v <= b.hi + 1e-12 * (1 + Math.abs(v));

describe("intervals on a vector program", () => {
  it("contain the sampled values, lane by lane", () => {
    const program = vectorProgram();
    const random = rng(11);
    for (const half of [0.01, 0.2, 1]) {
      for (let trial = 0; trial < 10; trial++) {
        const c = [0, 1, 2].map(() => 4 * random() - 2);
        const box = c.map((x) => ({ lo: x - half, hi: x + half }));
        const tRange = { lo: T - 0.05, hi: T + 0.05 };
        const bounds = evaluateInterval(program, {
          p: box,
          a: A.map((x) => ({ lo: x, hi: x })),
          t: tRange,
        });
        expect(bounds["q"]).toHaveLength(3);
        for (let k = 0; k < 50; k++) {
          const p = box.map((x) => x.lo + (x.hi - x.lo) * random());
          const t = tRange.lo + (tRange.hi - tRange.lo) * random();
          const v = evaluate(program, { p, a: A, t });
          for (const out of ["q", "s"]) {
            lanes(v[out]!).forEach((x, i) =>
              expect(contains(bounds[out]![i]!, x), `${out}[${i}]`).toBe(true),
            );
          }
        }
      }
    }
  });

  it("bounds booleans as [0, 0], [1, 1] or [0, 1]", () => {
    const b = new Builder();
    const p = b.input("p", "float2", "vertex");
    const x = b.op("math/extract2", [p], 0);
    const y = b.op("math/extract2", [p], 1);
    const both = b.op("math/and", [
      b.op("math/gt", [x, b.const(0)]),
      b.op("math/lt", [y, b.const(1)]),
    ]);
    const program = b.program({ both });
    const at = (x0: number, x1: number, y0: number, y1: number) =>
      evaluateInterval(program, {
        p: [
          { lo: x0, hi: x1 },
          { lo: y0, hi: y1 },
        ],
      })["both"]![0];
    expect(at(1, 2, 0, 0.5)).toEqual({ lo: 1, hi: 1 });
    expect(at(-2, -1, 0, 0.5)).toEqual({ lo: 0, hi: 0 });
    expect(at(-1, 1, 0, 0.5)).toEqual({ lo: 0, hi: 1 });
  });
});

/**
 * The spike's line-to-arc join (`spikes/core-ir/benchAlignment.ts`), without
 * tables (CS-56 adds them): a line from station 0 along +x to station 300,
 * then an arc of radius 500 to the left. p = (station, offset, height). The
 * element is picked by `station < 300`; its curvature, start and heading
 * follow, and the closed form is a line or an arc by `k == 0`, as the
 * spike's. The arc's form divides by the curvature, so an interval that
 * hulls the two elements' curvatures, [0, 1/500], isn't finite.
 */
function joinProgram(): Program {
  const b = new Builder();
  const p = b.input("p", "float3", "vertex");
  const op = (name: string, ...args: Id[]) => b.op(name, args);
  const k = (v: number) => b.const(v);
  const st = b.op("math/extract3", [p], 0);
  const off = b.op("math/extract3", [p], 1);
  const h = b.op("math/extract3", [p], 2);
  const onLine = op("math/lt", st, k(300));
  const pick = (line: number, arc: number) =>
    op("math/select", onLine, k(line), k(arc));
  const [s0, x0, y0, c0, n0, k0] = [
    pick(0, 300),
    pick(0, 300),
    pick(0, 0),
    pick(1, 1),
    pick(0, 0),
    pick(0, 1 / 500),
  ] as [Id, Id, Id, Id, Id, Id];
  const u = op("math/sub", st, s0);
  const a = op("math/mul", k0, u);
  const ca = op("math/cos", a);
  const sa = op("math/sin", a);
  const cm1 = op("math/sub", ca, k(1));
  const arcX = op(
    "math/add",
    x0,
    op(
      "math/div",
      op("math/add", op("math/mul", n0, cm1), op("math/mul", c0, sa)),
      k0,
    ),
  );
  const arcY = op(
    "math/sub",
    y0,
    op(
      "math/div",
      op("math/sub", op("math/mul", c0, cm1), op("math/mul", n0, sa)),
      k0,
    ),
  );
  const arcTx = op("math/sub", op("math/mul", c0, ca), op("math/mul", n0, sa));
  const arcTy = op("math/add", op("math/mul", n0, ca), op("math/mul", c0, sa));
  const isLine = op("math/eq", k0, k(0));
  const px = op(
    "math/select",
    isLine,
    op("math/add", x0, op("math/mul", u, c0)),
    arcX,
  );
  const py = op(
    "math/select",
    isLine,
    op("math/add", y0, op("math/mul", u, n0)),
    arcY,
  );
  const tx = op("math/select", isLine, c0, arcTx);
  const ty = op("math/select", isLine, n0, arcTy);
  return b.program({
    q: op(
      "math/combine3",
      op("math/sub", px, op("math/mul", off, ty)),
      op("math/add", py, op("math/mul", off, tx)),
      h,
    ),
  });
}

describe("breakpoint splitting", () => {
  const box = {
    p: [
      { lo: 280, hi: 330 },
      { lo: -20, hi: 20 },
      { lo: 0, hi: 5 },
    ],
  };

  it("the join's closed forms: the line, then the arc, continuous at 300 m", () => {
    const program = joinProgram();
    const q = (s: number, o = 0) =>
      evaluate(program, { p: [s, o, 0] })["q"] as number[];
    expect(q(100)).toEqual([100, 0, 0]);
    const end = q(300 + 500 * Math.PI);
    expect(end[0]).toBeCloseTo(300, 9);
    expect(end[1]).toBeCloseTo(1000, 9);
    const before = q(300 - 1e-9);
    const after = q(300);
    expect(Math.abs(after[0]! - before[0]!)).toBeLessThan(1e-8);
    expect(Math.abs(after[1]! - before[1]!)).toBeLessThan(1e-8);
  });

  it("over the line-to-arc join: finite bounds where the natural extension's are not, with no dense sample outside", () => {
    const program = joinProgram();
    const naive = evaluateInterval(program, box)["q"]!;
    expect(
      naive.some((x) => !Number.isFinite(x.lo) || !Number.isFinite(x.hi)),
    ).toBe(true);
    const split = evaluateIntervalSplit(program, box, { input: "p", lane: 0 });
    expect(split.cuts).toEqual([300]);
    expect(split.pieces).toBe(2);
    const bounds = split.bounds["q"]!;
    expect(
      bounds.every((x) => Number.isFinite(x.lo) && Number.isFinite(x.hi)),
    ).toBe(true);
    let outside = 0;
    let samples = 0;
    for (let s = 280; s <= 330; s += 0.05) {
      for (let o = -20; o <= 20; o += 2) {
        for (const h of [0, 2.5, 5]) {
          const q = evaluate(program, { p: [s, o, h] })["q"] as number[];
          samples++;
          for (let l = 0; l < 3; l++) {
            if (!contains(bounds[l]!, q[l]!)) {
              outside++;
            }
          }
        }
      }
    }
    expect(samples).toBeGreaterThan(60_000);
    expect(outside).toBe(0);
    // The bounds, m: x from 280 (the line's start) to 331.18 (the arc's
    // far end, 20 m out); y from -20 to 20.90 (the offsets, and the arc's
    // rise of 0.90 m over 30 m).
    expect(bounds[0]!.lo).toBe(280);
    expect(bounds[0]!.hi).toBeCloseTo(331.181, 3);
    expect(bounds[1]!.lo).toBe(-20);
    expect(bounds[1]!.hi).toBeCloseTo(20.8997, 4);
    expect(bounds[2]).toEqual({ lo: 0, hi: 5 });
  });

  it("leaves a place for other breakpoints (CS-56's tables)", () => {
    const program = joinProgram();
    const split = evaluateIntervalSplit(program, box, {
      input: "p",
      breakpoints: () => [310, 320],
    });
    expect(split.cuts).toEqual([300, 310, 320]);
    expect(split.pieces).toBe(4);
  });

  it("doesn't cut on a condition that also depends on another ranged lane", () => {
    const b = new Builder();
    const p = b.input("p", "float2", "vertex");
    const x = b.op("math/extract2", [p], 0);
    const y = b.op("math/extract2", [p], 1);
    const out = b.op("math/select", [
      b.op("math/lt", [b.op("math/add", [x, y]), b.const(0)]),
      b.const(-1),
      b.const(1),
    ]);
    const program = b.program({ out });
    const ranged = evaluateIntervalSplit(
      program,
      {
        p: [
          { lo: -1, hi: 1 },
          { lo: -1, hi: 1 },
        ],
      },
      { input: "p" },
    );
    expect(ranged.cuts).toEqual([]);
    expect(ranged.bounds["out"]).toEqual([{ lo: -1, hi: 1 }]);
    // With y a point, x alone decides it: cut at x = -y.
    const pointed = evaluateIntervalSplit(
      program,
      {
        p: [
          { lo: -1, hi: 1 },
          { lo: 0.25, hi: 0.25 },
        ],
      },
      { input: "p" },
    );
    expect(pointed.cuts).toEqual([-0.25]);
  });
});

describe("the Taylor model on a vector map", () => {
  /** A twist about z by rate·z, as one float3 output. */
  function twistMap(): Program {
    const b = new Builder();
    const p = b.input("p", "float3", "vertex");
    const rate = b.input("rate", "float", "uniform");
    const op = (name: string, ...args: Id[]) => b.op(name, args);
    const [x, y, z] = [0, 1, 2].map((i) => b.op("math/extract3", [p], i)) as [
      Id,
      Id,
      Id,
    ];
    const angle = op("math/mul", rate, z);
    const c = op("math/cos", angle);
    const s = op("math/sin", angle);
    return b.program({
      q: op(
        "math/combine3",
        op("math/sub", op("math/mul", c, x), op("math/mul", s, y)),
        op("math/add", op("math/mul", s, x), op("math/mul", c, y)),
        z,
      ),
    });
  }

  it("holds every sample of the box's image, through an affine link and the map", () => {
    const program = twistMap();
    const map = mapIr(program);
    expect(map.kinked).toBe(false);
    expect(map.discontinuous).toBe(false);
    const rate = 0.02;
    const scale = [2, 0, 0, 0, 2, 0, 0, 0, 1]; // column-major
    const center = [10, 5, 20];
    const half = [3, 3, 4];
    const mapped = [2 * center[0]!, 2 * center[1]!, center[2]!];
    const chain = taylorChain({ center, halfExtent: half }, [
      { kind: "affine", jacobian: scale },
      { kind: "map", name: "twist", map, input: mapped, params: { rate } },
    ]);
    expect(chain.ok).toBe(true);
    if (!chain.ok) {
      return;
    }
    const fc = evaluate(program, { p: mapped, rate })["q"] as number[];
    const random = rng(21);
    for (let k = 0; k < 500; k++) {
      const u = [0, 1, 2].map(() => 2 * random() - 1);
      const x = center.map((c, i) => c + u[i]! * half[i]!);
      const q = evaluate(program, { p: [2 * x[0]!, 2 * x[1]!, x[2]!], rate })[
        "q"
      ] as number[];
      for (let i = 0; i < 3; i++) {
        expect(Math.abs(q[i]! - fc[i]!)).toBeLessThanOrEqual(
          chain.halfExtent[i]! + 1e-9,
        );
      }
      expect(Math.hypot(...q.map((v, i) => v - fc[i]!))).toBeLessThanOrEqual(
        chain.radius + 1e-9,
      );
    }
    // The remainder is second order: small beside the linear part.
    expect(Math.max(...chain.remainder)).toBeLessThan(
      0.2 * Math.max(...chain.halfExtent),
    );
  });

  it("refuses a map with a step, and one whose derivatives are unbounded over the box", () => {
    const b = new Builder();
    const p = b.input("p", "float3", "vertex");
    const step = b.program({ q: b.op("math/floor", [p]) });
    const refused = taylorChain({ center: [0, 0, 0], halfExtent: [1, 1, 1] }, [
      {
        kind: "map",
        name: "floor",
        map: mapIr(step),
        input: [0, 0, 0],
        params: {},
      },
    ]);
    expect(refused).toMatchObject({ ok: false });
    const inv = b.program({ q: b.op("math/div", [b.const([1, 1, 1]), p]) });
    const unbounded = taylorChain(
      { center: [0, 0, 0], halfExtent: [1, 1, 1] },
      [
        {
          kind: "map",
          name: "inverse",
          map: mapIr(inv),
          input: [0, 0, 0],
          params: {},
        },
      ],
    );
    expect(unbounded).toMatchObject({ ok: false });
  });
});

describe("rates and constant hoisting", () => {
  /** out = normalize(a) · (k·2) + p per feature, with a uniform and k a literal. */
  function rated(): Program {
    const b = new Builder();
    const p = b.input("p", "float3", "feature");
    const a = b.input("a", "float3", "uniform");
    const k = b.literal("k", [1, 2, 3]);
    const scaled = b.op("math/mul", [
      b.op("math/normalize", [a]),
      b.op("math/mul", [k, b.const([2, 2, 2])]),
    ]);
    return b.program({
      out: b.op("math/add", [scaled, p]),
      dir: b.op("math/normalize", [a]),
    });
  }

  it("an equation's rate is the highest of its operands'", () => {
    const program = rated();
    const r = rates(program);
    program.eqns.forEach((e, id) => {
      if (e.op === "math/add") {
        expect(r[id]).toBe("feature");
      }
      if (e.op === "math/normalize" || e.op === "literal" || e.op === "const") {
        expect(r[id]).toBe("uniform");
      }
    });
  });

  it("hoists uniform-rate equations to uniforms, evaluated on the CPU in float64", () => {
    const program = rated();
    const h = hoistUniforms(program);
    // normalize(a) · (k · 2) feeds a feature-rate add; normalize(a) is an output.
    expect(h.names).toHaveLength(2);
    expect(h.program.eqns.filter((e) => e.op === "math/normalize")).toEqual([]);
    expect(h.program.eqns.some((e) => e.op === "literal")).toBe(false);
    const a = [3, 0, 4];
    const values = hoistedValues(h, { a });
    for (const p of [
      [1, 2, 3],
      [-5, 0.5, 9],
    ]) {
      expect(evaluate(h.program, { p, a, ...values })).toEqual(
        evaluate(program, { p, a }),
      );
    }
  });
});

describe("literals to uniforms", () => {
  const make = (v: number[]) => {
    const b = new Builder();
    const p = b.input("p", "float3", "vertex");
    return b.program({
      q: b.op("math/mul", [p, b.literal("scale", v)]),
    });
  };

  it("every literal slot becomes a uniform input: the program, its values by slot and the shape key", () => {
    const u = literalsToUniforms(make([1, 2, 3]));
    expect(u.values).toEqual({ scale: [1, 2, 3] });
    expect(u.program.inputs.at(-1)).toEqual({
      name: "scale",
      type: "float3",
      rate: "uniform",
    });
    expect(u.program.eqns.some((e) => e.op === "literal")).toBe(false);
    expect(evaluate(u.program, { p: [1, 1, 1], ...u.values })).toEqual({
      q: [1, 2, 3],
    });
    const other = literalsToUniforms(make([4, 5, 6]));
    expect(other.shapeKey).toBe(u.shapeKey);
    expect(shapeKey(other.program)).toBe(shapeKey(u.program));
  });

  it("refuses a slot named as an input", () => {
    const b = new Builder();
    const p = b.input("p", "float", "vertex");
    const program = b.program({ q: b.op("math/add", [p, b.literal("p", 1)]) });
    expect(() => literalsToUniforms(program)).toThrow(/input's name/);
  });
});

describe("kinks per output", () => {
  it("reports the ops whose derivative or value jumps, per output", () => {
    const b = new Builder();
    const p = b.input("p", "float3", "vertex");
    const kinked = b.op("math/min", [p, b.const([1, 1, 1])]);
    const stepped = b.op("math/floor", [p]);
    const smooth = b.op("math/mul", [p, p]);
    const program = b.program({ kinked, stepped, smooth });
    const k = kinks(program);
    expect(k["kinked"]!.kinks).toHaveLength(1);
    expect(k["kinked"]!.steps).toEqual([]);
    expect(k["stepped"]!.steps).toHaveLength(1);
    expect(k["smooth"]).toEqual({ kinks: [], steps: [] });
  });
});
