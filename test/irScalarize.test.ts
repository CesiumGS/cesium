// Cesium IR's scalarize pass (CS-53): every equation a scalar, a vector input
// read lane by lane, the same values lane by lane, and an already-scalar
// program back unchanged.
import { describe, expect, it } from "vitest";
import { Builder } from "../packages/next/src/ir/builder.ts";
import { evaluate } from "../packages/next/src/ir/evaluate.ts";
import { scalarize } from "../packages/next/src/ir/scalarize.ts";
import {
  width,
  type Id,
  type Program,
  type Value,
} from "../packages/next/src/ir/types.ts";

/** q = cross(p, a) · |p| + mix(p, a ⊙ p, t) + select(p.x > 0, (p · a) a, -a), s = |p - a|. */
function vectorProgram(): Program {
  const b = new Builder();
  const p = b.input("p", "float3", "vertex");
  const a = b.input("a", "float3", "uniform");
  const t = b.input("t", "float", "uniform");
  const op = (name: string, ...args: Id[]) => b.op(name, args);
  const swirl = op(
    "math/mul",
    op("math/cross", p, a),
    b.splat(op("math/length", p), 3),
  );
  const blend = op("math/mix", p, op("math/mul", a, p), b.splat(t, 3));
  const side = op("math/gt", b.op("math/extract3", [p], 0), b.const(0));
  const proj = op(
    "math/select",
    side,
    op("math/mul", b.splat(op("math/dot", p, a), 3), a),
    op("math/neg", a),
  );
  const offset = op("math/add", b.const([0.5, -0, 2]), b.splat(t, 3));
  return b.program({
    q: op(
      "math/add",
      op("math/add", swirl, blend),
      op("math/add", proj, offset),
    ),
    s: op("math/length", op("math/sub", p, a)),
  });
}

const lanes = (v: Value): number[] =>
  typeof v === "number" ? [v] : typeof v === "boolean" ? [v ? 1 : 0] : [...v];

describe("scalarize", () => {
  it("leaves no vector equation but the vector inputs", () => {
    const s = scalarize(vectorProgram());
    for (const e of s.eqns) {
      if (width(e.type) > 1) {
        expect(e.op).toBe("input");
      }
    }
    expect(s.outputs.map((o) => o.name)).toEqual(["q.0", "q.1", "q.2", "s"]);
  });

  it("computes the same values, lane by lane", () => {
    const program = vectorProgram();
    const s = scalarize(program);
    for (const [p, a, t] of [
      [[0.3, -0.2, 0.7], [0.3, -0.8, 0.5], 0.35],
      [[-1.5, 2.5, -0.5], [1, 2, -3], -0.6],
      [[4, 0, -0], [0, 0, 1], 0],
    ] as const) {
      const want = evaluate(program, { p, a, t });
      const got = evaluate(s, { p, a, t });
      // The same float64 operations, but for length, which the evaluator
      // takes as Math.hypot and the lanes as the spec's square root of the
      // sum of squares.
      lanes(want["q"]!).forEach((x, i) =>
        expect(got[`q.${i}`]).toBeCloseTo(x, 12),
      );
      expect(got["s"]).toBeCloseTo(want["s"] as number, 12);
    }
  });

  it("keeps a vector op's lanes exact where no length is involved", () => {
    const b = new Builder();
    const p = b.input("p", "float3", "vertex");
    const a = b.input("a", "float3", "uniform");
    const op = (name: string, ...args: Id[]) => b.op(name, args);
    const program = b.program({
      c: op("math/cross", p, a),
      d: op("math/dot", p, a),
      m: op("math/mix", p, a, b.const([0.25, 0.5, 0.75])),
    });
    const s = scalarize(program);
    const inputs = { p: [0.1, -7.25, 3e5], a: [1 / 3, 2e-7, -9] };
    const want = evaluate(program, inputs);
    const got = evaluate(s, inputs);
    lanes(want["c"]!).forEach((x, i) => expect(got[`c.${i}`]).toBe(x));
    lanes(want["m"]!).forEach((x, i) => expect(got[`m.${i}`]).toBe(x));
    expect(got["d"]).toBe(want["d"]);
  });

  it("gives an already-scalar program back with the same equations and ids", () => {
    const b = new Builder();
    const p = b.input("p", "float3", "vertex");
    const k = b.input("k", "float", "uniform");
    const x = b.op("math/extract3", [p], 0);
    const z = b.op("math/extract3", [p], 2);
    const program = b.program({
      o0: b.op("math/mul", [x, k]),
      o1: b.op("math/select", [b.op("math/lt", [z, b.const(-0)]), x, z]),
      o2: b.op("type/boolToFloat", [b.op("math/ge", [x, b.const(0)])]),
    });
    expect(scalarize(program)).toEqual(program);
  });

  it("refuses normalize, which has no lane form yet", () => {
    const b = new Builder();
    const p = b.input("p", "float3", "vertex");
    const program = b.program({ n: b.op("math/normalize", [p]) });
    expect(() => scalarize(program)).toThrow(/normalize/);
  });
});
