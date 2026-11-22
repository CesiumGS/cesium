// CS-48: Cesium IR's core. Conformance cases for ±0, ±∞ and NaN follow the
// KHR_interactivity spec's per-op rules (main at a7963af6dc; every node the
// vocabulary uses was read in full for CS-543, 2026-11-15); where the spec
// states nothing for an input, the case is the stated formula applied in
// IEEE 754 (marked "formula"). Plus the builder and its guarantees.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import {
  Builder,
  OPS,
  applyValue,
  evaluate,
  print,
  shapeKey,
  typeOf,
  type Value,
} from "../packages/core/src/ir/index.ts";

const INF = Infinity;
type Case = [op: string, args: Value[], expected: Value];

const CASES: Case[] = [
  // abs: ±0 -> +0, ±∞ -> +∞, NaN -> NaN
  ["math/abs", [-0], 0],
  ["math/abs", [-INF], INF],
  ["math/abs", [NaN], NaN],
  // sign: ±0 unchanged, ±∞ -> ±1
  ["math/sign", [-0], -0],
  ["math/sign", [0], 0],
  ["math/sign", [-INF], -1],
  ["math/sign", [NaN], NaN],
  // trunc, floor, ceil, round: formula for ±0, unchanged for ±∞ ("If the
  // argument is infinity, it is returned unchanged"). round: "Half-way cases
  // MUST be rounded away from zero. Negative values greater than -0.5 MUST
  // be rounded to negative zero."
  ["math/trunc", [-0], -0],
  ["math/trunc", [INF], INF],
  ["math/floor", [-0], -0],
  ["math/floor", [-INF], -INF],
  ["math/floor", [NaN], NaN],
  ["math/ceil", [-0.5], -0],
  ["math/ceil", [INF], INF],
  ["math/round", [-0], -0],
  ["math/round", [2.5], 3],
  ["math/round", [-2.5], -3],
  ["math/round", [-0.4], -0],
  ["math/round", [-INF], -INF],
  ["math/round", [NaN], NaN],
  // fract: a - floor(a); ±∞ gives NaN (formula)
  ["math/fract", [-1.25], 0.75],
  ["math/fract", [INF], NaN],
  ["math/fract", [NaN], NaN],
  // neg: ±0 -> ∓0
  ["math/neg", [0], -0],
  ["math/neg", [-0], 0],
  ["math/neg", [INF], -INF],
  ["math/neg", [NaN], NaN],
  // min and max: -0 is less than +0
  ["math/min", [-0, 0], -0],
  ["math/min", [0, -0], -0],
  ["math/max", [-0, 0], 0],
  ["math/max", [0, -0], 0],
  ["math/min", [-INF, 1], -INF],
  ["math/max", [INF, 1], INF],
  ["math/min", [NaN, 1], NaN],
  ["math/max", [1, NaN], NaN],
  // clamp follows min and max; reversed bounds work
  ["math/clamp", [5, 3, 1], 3],
  ["math/clamp", [-INF, 0, 1], 0],
  ["math/clamp", [NaN, 0, 1], NaN],
  // saturate: -0 -> +0, ±∞ -> 1 or 0
  ["math/saturate", [-0], 0],
  ["math/saturate", [INF], 1],
  ["math/saturate", [-INF], 0],
  ["math/saturate", [NaN], NaN],
  // mix: (1 - c) a + c b, in that form (formula)
  ["math/mix", [1, 3, 0.5], 2],
  ["math/mix", [1, 3, NaN], NaN],
  ["math/mix", [1, 3, INF], NaN],
  // smoothStep: the ramp rises whichever edge is larger
  ["math/smoothStep", [0, 1, 0.5], 0.5],
  ["math/smoothStep", [1, 0, 0.25], 0.15625],
  ["math/smoothStep", [0, 1, INF], 1],
  ["math/smoothStep", [0, 1, NaN], NaN],
  // rem: truncated. The spec's formula a - (b · trunc(a / b)) is exactly
  // zero here; the sign is its tip's, "a % b", which keeps the dividend's.
  ["math/rem", [-0, 3], -0],
  ["math/rem", [-5, 3], -2],
  ["math/rem", [INF, 3], NaN],
  ["math/rem", [5, INF], 5],
  ["math/rem", [5, 0], NaN],
  ["math/rem", [NaN, 3], NaN],
  // sqrt
  ["math/sqrt", [-0], -0],
  ["math/sqrt", [INF], INF],
  ["math/sqrt", [-INF], NaN],
  ["math/sqrt", [NaN], NaN],
  // log
  ["math/log", [0], -INF],
  ["math/log", [-0], -INF],
  ["math/log", [INF], INF],
  ["math/log", [-INF], NaN],
  ["math/log", [NaN], NaN],
  // pow: NaN^±0 = 1; ±1^±∞ = NaN
  ["math/pow", [NaN, 0], 1],
  ["math/pow", [NaN, -0], 1],
  ["math/pow", [1, INF], NaN],
  ["math/pow", [-1, -INF], NaN],
  ["math/pow", [2, NaN], NaN],
  // "±1 ^ NaN are NaN" (IEEE 754's pow gives 1 for +1).
  ["math/pow", [1, NaN], NaN],
  ["math/pow", [2, 3], 8],
  // atan2: IEEE special cases
  ["math/atan2", [0, -0], Math.PI],
  ["math/atan2", [-0, -0], -Math.PI],
  ["math/atan2", [0, 0], 0],
  ["math/atan2", [NaN, 1], NaN],
  // exp, trigonometry, hyperbolics
  ["math/exp", [-INF], 0],
  ["math/exp", [NaN], NaN],
  ["math/sin", [-0], -0],
  ["math/sin", [INF], NaN],
  ["math/cos", [INF], NaN],
  ["math/tan", [-0], -0],
  ["math/asin", [2], NaN],
  ["math/acos", [2], NaN],
  ["math/atan", [INF], Math.PI / 2],
  ["math/atan", [-0], -0],
  ["math/sinh", [-0], -0],
  ["math/cosh", [-INF], INF],
  ["math/tanh", [INF], 1],
  ["math/cbrt", [-8], -2],
  ["math/cbrt", [-0], -0],
  ["math/log2", [8], 3],
  ["math/log2", [0], -INF],
  ["math/log10", [1000], 3],
  ["math/log10", [-1], NaN],
  // arithmetic
  ["math/add", [-0, -0], -0],
  ["math/add", [-0, 0], 0],
  ["math/add", [INF, -INF], NaN],
  ["math/sub", [0, 0], 0],
  ["math/sub", [-0, 0], -0],
  ["math/mul", [0, INF], NaN],
  ["math/mul", [-1, 0], -0],
  ["math/div", [1, -0], -INF],
  ["math/div", [0, 0], NaN],
  ["math/div", [INF, INF], NaN],
  // comparisons: NaN is false, -0 equals +0
  ["math/eq", [-0, 0], true],
  ["math/eq", [NaN, NaN], false],
  ["math/lt", [-0, 0], false],
  ["math/lt", [NaN, 1], false],
  ["math/le", [-0, 0], true],
  ["math/le", [NaN, NaN], false],
  ["math/gt", [INF, 1], true],
  ["math/gt", [NaN, 1], false],
  ["math/ge", [1, NaN], false],
  ["math/ge", [-INF, -INF], true],
  // booleans
  ["math/and", [true, false], false],
  ["math/or", [true, false], true],
  ["math/not", [false], true],
  // select
  ["math/select", [true, 1, 2], 1],
  ["math/select", [false, [1, 2], [3, 4]], [3, 4]],
  // vectors: length (an ∞ component wins over NaN), normalize, dot, cross
  ["math/length", [[0, -0]], 0],
  ["math/length", [[INF, NaN]], INF],
  ["math/length", [[NaN, 1]], NaN],
  ["math/length", [[3, 4]], 5],
  ["math/normalize", [[0, 0]], [0, 0]],
  ["math/normalize", [[INF, 1]], [0, 0]],
  ["math/normalize", [[NaN, 1]], [0, 0]],
  ["math/normalize", [[0, 2]], [0, 1]],
  [
    "math/dot",
    [
      [1, 2, 3],
      [4, 5, 6],
    ],
    32,
  ],
  [
    "math/dot",
    [
      [INF, 0],
      [0, 1],
    ],
    NaN,
  ],
  // "a_x * b_x + a_y * b_y": two -0 products sum to -0 (CS-543; the sum
  // began at +0 and gave +0).
  [
    "math/dot",
    [
      [-0, -0],
      [1, 1],
    ],
    -0,
  ],
  ["math/dot", [-1, 0], -0],
  [
    "math/cross",
    [
      [1, 0, 0],
      [0, 1, 0],
    ],
    [0, 0, 1],
  ],
  // combine and conversions
  ["math/combine2", [1, 2], [1, 2]],
  ["math/combine3", [1, -0, NaN], [1, -0, NaN]],
  ["math/combine4", [1, 2, 3, 4], [1, 2, 3, 4]],
  ["type/boolToFloat", [true], 1],
  ["type/intToFloat", [7], 7],
  // "This operation MUST NOT produce negative zero." (CS-543)
  ["type/intToFloat", [-0], 0],
];

const lanesOf = (v: Value): unknown[] => (typeof v === "object" ? [...v] : [v]);

describe("float64 conformance: ±0, ±∞ and NaN", () => {
  it.each(CASES)("%s %j", (op, args, expected) => {
    const got = applyValue(op, args);
    // Object.is tells -0 from +0 and equates NaN with itself.
    expect(
      lanesOf(got).every((x, i) => Object.is(x, lanesOf(expected)[i])),
    ).toBe(true);
    expect(lanesOf(got)).toHaveLength(lanesOf(expected).length);
  });

  it("extract takes the component", () => {
    expect(applyValue("math/extract3", [[7, 8, 9]], 2)).toBe(9);
  });

  it("every op in the vocabulary has a case", () => {
    const covered = new Set(CASES.map((c) => c[0]));
    const leaves = new Set(["const", "literal", "input"]);
    const missing = Object.keys(OPS).filter(
      (op) =>
        !covered.has(op) && !leaves.has(op) && !op.startsWith("math/extract"),
    );
    expect(missing).toEqual([]);
  });
});

describe("types", () => {
  it("refuses wrong operands, naming the op", () => {
    expect(() => typeOf("math/add", ["float", "float2"])).toThrow(/math\/add/);
    expect(() => typeOf("math/and", ["float", "bool"])).toThrow(/bools/);
    expect(() => typeOf("math/cross", ["float2", "float2"])).toThrow(/float3/);
    expect(() => typeOf("math/nope", [])).toThrow(/unknown op/);
    expect(() => typeOf("math/extract2", ["float2"], 2)).toThrow(/below 2/);
  });
});

describe("the builder", () => {
  it("hash-conses equal equations, commutative operands included", () => {
    const b = new Builder();
    const x = b.input("x", "float", "feature");
    const y = b.input("y", "float", "feature");
    expect(b.op("math/add", [x, y])).toBe(b.op("math/add", [y, x]));
    expect(b.input("x", "float", "feature")).toBe(x);
    expect(() => b.input("x", "float", "vertex")).toThrow(/twice/);
  });

  it("folds const operands, and only const", () => {
    const b = new Builder();
    const sum = b.op("math/add", [b.const(1), b.const(2)]);
    expect(b.constOf(sum)).toBe(3);
    const l = b.literal("a", 1);
    const kept = b.op("math/add", [l, b.const(2)]);
    expect(b.constOf(kept)).toBeUndefined();
    expect(b.eqns[kept]!.op).toBe("math/add");
    // A fold that leaves the finite numbers stays an equation.
    const inf = b.op("math/div", [b.const(1), b.const(0)]);
    expect(b.eqns[inf]!.op).toBe("math/div");
  });

  it("never merges two literal slots, even of one value", () => {
    const b = new Builder();
    const a = b.literal("a", 5);
    const c = b.literal("c", 5);
    expect(a).not.toBe(c);
    expect(b.literal("a", 5)).toBe(a);
    expect(() => b.literal("a", 6)).toThrow(/two values/);
  });

  it("simplifies, soundly", () => {
    const b = new Builder();
    const x = b.input("x", "float", "feature");
    expect(b.op("math/add", [x, b.const(0)])).toBe(x);
    expect(b.op("math/sub", [x, b.const(0)])).toBe(x);
    // x - (-0) is -0 - (-0) = +0 for x = -0: not rewritten (CS-543).
    expect(b.eqns[b.op("math/sub", [x, b.const(-0)])]!.op).toBe("math/sub");
    expect(b.op("math/mul", [x, b.const(1)])).toBe(x);
    expect(b.op("math/div", [x, b.const(1)])).toBe(x);
    const nn = b.op("math/neg", [b.op("math/neg", [x])]);
    expect(nn).toBe(x);
    // x * 0 is NaN for infinite x: not rewritten.
    expect(b.eqns[b.op("math/mul", [x, b.const(0)])]!.op).toBe("math/mul");
    const y = b.input("y", "float", "feature");
    const v = b.op("math/combine2", [x, y]);
    expect(b.op("math/extract2", [v], 1)).toBe(y);
    expect(b.op("math/select", [b.const(true), x, y])).toBe(x);
    const cond = b.op("math/lt", [x, y]);
    expect(b.op("math/select", [cond, x, x])).toBe(x);
  });

  it("drops dead equations and lists the rest", () => {
    const b = new Builder();
    const x = b.input("x", "float", "uniform");
    b.op("math/sin", [x]);
    const out = b.op("math/cos", [x]);
    const p = b.program({ out });
    expect(p.eqns.map((e) => e.op)).toEqual(["input", "math/cos"]);
    expect(print(p)).toContain("v1:float = math/cos v0");
    expect(evaluate(p, { x: 0 }).out).toBe(1);
  });

  it("rejects operands that aren't equations", () => {
    const b = new Builder();
    expect(() => b.op("math/abs", [3])).toThrow(RangeError);
  });

  it("the shape key ignores literal values, not slots or structure", () => {
    const make = (slot: string, value: number, op = "math/add") => {
      const b = new Builder();
      const x = b.input("x", "float", "feature");
      return b.program({ out: b.op(op, [x, b.literal(slot, value)]) });
    };
    expect(shapeKey(make("a", 1))).toBe(shapeKey(make("a", 2)));
    expect(shapeKey(make("a", 1))).not.toBe(shapeKey(make("b", 1)));
    expect(shapeKey(make("a", 1))).not.toBe(shapeKey(make("a", 1, "math/mul")));
  });
});

describe("the import boundary", () => {
  it("src/ir imports nothing outside itself", () => {
    const dir = join(import.meta.dirname, "../packages/core/src/ir");
    const files = readdirSync(dir).filter((f) => f.endsWith(".ts"));
    expect(files.length).toBeGreaterThan(0);
    const bad: string[] = [];
    for (const f of files) {
      const source = ts.createSourceFile(
        f,
        readFileSync(join(dir, f), "utf8"),
        ts.ScriptTarget.Latest,
      );
      const check = (spec: string) => {
        if (!/^\.\/[\w]+\.ts$/.test(spec)) {
          bad.push(`${f}: ${spec}`);
        }
      };
      const visit = (n: ts.Node): void => {
        if (
          (ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) &&
          n.moduleSpecifier &&
          ts.isStringLiteral(n.moduleSpecifier)
        ) {
          check(n.moduleSpecifier.text);
        } else if (
          ts.isCallExpression(n) &&
          n.expression.kind === ts.SyntaxKind.ImportKeyword &&
          n.arguments[0] &&
          ts.isStringLiteralLike(n.arguments[0])
        ) {
          check(n.arguments[0].text);
        } else if (
          ts.isImportTypeNode(n) &&
          ts.isLiteralTypeNode(n.argument) &&
          ts.isStringLiteral(n.argument.literal)
        ) {
          check(n.argument.literal.text);
        }
        ts.forEachChild(n, visit);
      };
      visit(source);
    }
    expect(bad).toEqual([]);
  });
});
