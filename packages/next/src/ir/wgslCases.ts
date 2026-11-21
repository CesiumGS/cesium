// The WGSL emitter's test programs: one program per op over its edge cases,
// and one composite program with a uniform, a literal, an int and a bool.
// Node tests validate each program's WGSL with naga; the browser suite
// (`bench/irWgsl.ts`) validates it with Chrome and reads the GPU's answers
// back against the float64 evaluator.
//
// TOLERANCES. A GPU result agrees with the float64 result when
// |gpu - float64| <= abs + rel * |float64|. Inputs are float32 values, so
// the only difference is float32 arithmetic and the GPU's built-ins. Rows
// whose float64 result is NaN or infinite aren't compared (WebGPU lets a
// compiler assume neither occurs). Each tolerance below is the stated claim
// for the op over the rows listed; where WebGPU's specification allows more
// error than we claim (sin and cos: 2^-11 absolute), the claim is what the
// readback run held, with margin, and a GPU that breaks it fails the suite.

import { Builder } from "./builder.ts";
import type { Program, Type, Value } from "./types.ts";

export interface Tolerance {
  readonly abs: number;
  readonly rel: number;
}

export interface WgslCase {
  readonly name: string;
  readonly program: Program;
  /** Values of the non-uniform inputs, one object per row. */
  readonly rows: readonly Record<string, Value>[];
  /** Values of the uniform inputs. */
  readonly uniforms: Readonly<Record<string, Value>>;
  readonly tolerance: Tolerance;
  /** Why the rows and the tolerance are what they are. */
  readonly note: string;
}

// Float32 relative spacing is 2^-23 (1.2e-7) at worst. WGSL gives + - * / and
// sqrt 2.5 ULP, so 3e-7 relative. The absolute floor covers results that
// flush to zero or denormal.
const TINY = 1e-37;
const EXACT: Tolerance = { abs: 0, rel: 0 };
const ARITH: Tolerance = { abs: TINY, rel: 3e-7 };

const f = Math.fround;

/** Edge values shared by most ops: zeros, halves, ties, tiny, large. */
const GENERAL = [
  0, -0, 1, -1, 0.5, -0.5, 1.5, -1.5, 2.5, -2.5, 0.49999997, -0.49999997, 1e-7,
  -1e-7, 3.1415927, -3.1415927, 123.456, -123.456, 1e6, -1e6, 0.1, 7, -7.25,
  16777216,
].map(f);

const POSITIVE = [
  0, 1e-30, 1e-7, 0.1, 0.5, 1, 2, 3.1415927, 10, 123.456, 1e6, 1e30,
].map(f);
const UNIT = [-1, -0.999, -0.5, -1e-7, -0, 0, 1e-7, 0.5, 0.999, 1].map(f);
const SMALL = [
  -10, -3.1415927, -2, -1, -0.5, -1e-7, -0, 0, 1e-7, 0.5, 1, 2, 3.1415927, 10,
].map(f);
const ANGLE = [...SMALL, 25.5, -25.5, 50, -50, 100, -100].map(f);

/** A program of `op` over inputs `a`, `b`, `c` of type `t`. */
function opProgram(
  op: string,
  arity: number,
  t: Type,
  index?: number,
): Program {
  const b = new Builder();
  const ids = ["a", "b", "c"]
    .slice(0, arity)
    .map((n) => b.input(n, t, "vertex"));
  return b.program({ r: b.op(op, ids, index) });
}

type Row = Record<string, Value>;
const rows1 = (xs: readonly number[]): Row[] => xs.map((a) => ({ a }));
const pairs = (xs: readonly number[], ys: readonly number[]): Row[] =>
  xs.flatMap((a) => ys.map((b) => ({ a, b })));

function unary(
  op: string,
  xs: readonly number[],
  tolerance: Tolerance,
  note: string,
): WgslCase {
  return {
    name: op,
    program: opProgram(op, 1, "float"),
    rows: rows1(xs),
    uniforms: {},
    tolerance,
    note,
  };
}

function binary(
  op: string,
  xs: readonly number[],
  ys: readonly number[],
  tolerance: Tolerance,
  note: string,
): WgslCase {
  return {
    name: op,
    program: opProgram(op, 2, "float"),
    rows: pairs(xs, ys),
    uniforms: {},
    tolerance,
    note,
  };
}

const TRIPLES: Row[] = [
  [0.25, 0.75, 0.5],
  [-3, 5, 0],
  [-3, 5, 1],
  [2, -2, 0.3],
  [5, 1, 3],
  [5, 1, -2],
  [0, 1, 0.5],
  [1, 0, 0.5],
  [0.5, 0.5, 0.5],
  [-1e-7, 1e-7, 0.25],
  [0, 10, 1.5],
  [10, 0, 1.5],
  [-4.5, 3.5, 100],
].map(([a, b, c]) => ({ a: f(a!), b: f(b!), c: f(c!) }));

const V3: Row[] = [
  [
    [1, 2, 3],
    [4, -5, 6],
    [0.5, 0.25, 0.125],
  ],
  [
    [0, 0, 0],
    [1, 0, 0],
    [1, 1, 1],
  ],
  [
    [-1, 0, 1],
    [0, 1, 0],
    [0.1, 0.2, 0.3],
  ],
  [
    [3, 4, 0],
    [0, 0, 1],
    [2, 2, 2],
  ],
  [
    [1e-3, -1e-3, 1e-3],
    [1e3, 1e3, -1e3],
    [0, 0, 0],
  ],
  [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ],
].map(([a, b, c]) => ({
  a: a!.map(f),
  b: b!.map(f),
  c: c!.map(f),
}));

export function wgslCases(): WgslCase[] {
  const cases: WgslCase[] = [];
  const add = (...c: WgslCase[]) => cases.push(...c);

  // Exact ops: float32 gives the float64 result bit for bit (sign of zero
  // aside, which compares equal).
  for (const op of [
    "abs",
    "sign",
    "trunc",
    "floor",
    "ceil",
    "round",
    "neg",
    "saturate",
  ]) {
    add(
      unary(
        `math/${op}`,
        GENERAL,
        EXACT,
        "exact on float32 inputs, including halves and 0.49999997 for round",
      ),
    );
  }
  add(
    unary(
      "math/fract",
      GENERAL,
      { abs: 6e-8, rel: 0 },
      "a - floor(a) rounds once in float32: 2^-24 absolute (a tiny negative a gives 1)",
    ),
  );
  add(
    unary("math/sqrt", POSITIVE, ARITH, "WGSL: 2.5 ULP"),
    unary(
      "math/cbrt",
      GENERAL,
      { abs: TINY, rel: 3e-6 },
      "sign(x) pow(|x|, 1/3): pow's error times 1/3, plus the rounded 1/3",
    ),
    unary(
      "math/exp",
      SMALL,
      { abs: TINY, rel: 1e-5 },
      "WGSL: 3 + 2|x| ULP, |x| <= 10",
    ),
    unary(
      "math/log",
      POSITIVE.filter((x) => x > 0),
      { abs: 1e-6, rel: 1e-6 },
      "WGSL: 2^-21 absolute near 1, 3 ULP elsewhere",
    ),
    unary(
      "math/log2",
      POSITIVE.filter((x) => x > 0),
      { abs: 1e-6, rel: 1e-6 },
      "as log",
    ),
    unary(
      "math/log10",
      POSITIVE.filter((x) => x > 0),
      { abs: 1e-6, rel: 2e-6 },
      "log(x) times a float32 constant: log's error plus one rounding",
    ),
    unary(
      "math/sin",
      ANGLE,
      { abs: 2e-5, rel: 0 },
      "|x| <= 100: argument reduction in float32 loses about |x| 2^-24",
    ),
    unary("math/cos", ANGLE, { abs: 2e-5, rel: 0 }, "as sin"),
    unary(
      "math/tan",
      [-1.4, -1, -0.5, -1e-7, 0, 1e-7, 0.5, 1, 1.4].map(f),
      { abs: 1e-6, rel: 1e-4 },
      "away from the poles",
    ),
    unary("math/asin", UNIT, { abs: 2e-6, rel: 0 }, "[-1, 1]"),
    unary("math/acos", UNIT, { abs: 2e-6, rel: 0 }, "[-1, 1]"),
    unary("math/atan", SMALL, { abs: 2e-6, rel: 0 }, "|x| <= 10"),
    unary("math/sinh", SMALL, { abs: TINY, rel: 1e-5 }, "|x| <= 10"),
    unary("math/cosh", SMALL, { abs: TINY, rel: 1e-5 }, "|x| <= 10"),
    unary("math/tanh", SMALL, { abs: 2e-6, rel: 0 }, "|x| <= 10"),
  );
  add(
    binary(
      "math/add",
      GENERAL.slice(0, 16),
      GENERAL.slice(0, 16),
      ARITH,
      "one rounding",
    ),
    binary(
      "math/sub",
      GENERAL.slice(0, 16),
      GENERAL.slice(0, 16),
      ARITH,
      "one rounding",
    ),
    binary(
      "math/mul",
      GENERAL.slice(0, 16),
      GENERAL.slice(0, 16),
      ARITH,
      "one rounding",
    ),
    binary(
      "math/div",
      GENERAL.slice(0, 16),
      GENERAL.slice(2, 16),
      ARITH,
      "WGSL: 2.5 ULP; no zero divisor (infinity isn't compared)",
    ),
    binary(
      "math/rem",
      [5.5, -5.5, 5, -5, 0.3, 100, 1234.5].map(f),
      [2, -2, 0.7, 3, 0.25].map(f),
      { abs: 2e-4, rel: 1e-6 },
      "truncated. x - y trunc(x / y) rounds x / y in float32, so the claim holds for |x / y| < 1e4 with x / y not within 1e-3 of an integer (otherwise the result is off by y); no such row is listed",
    ),
    binary(
      "math/min",
      GENERAL.slice(0, 16),
      GENERAL.slice(0, 16),
      EXACT,
      "exact; the sign of a zero tie compares equal",
    ),
    binary(
      "math/max",
      GENERAL.slice(0, 16),
      GENERAL.slice(0, 16),
      EXACT,
      "exact",
    ),
    binary(
      "math/atan2",
      SMALL.filter((y) => !Object.is(y, -0)),
      SMALL.filter((x) => x !== 0),
      { abs: 3e-6, rel: 0 },
      "|x| <= 10, x not zero; y = -0 is not a row: Metal's atan2(-0, x < 0) is +pi, and WGSL doesn't promise the sign of a zero",
    ),
    {
      name: "math/pow",
      program: opProgram("math/pow", 2, "float"),
      rows: [
        ...pairs(
          [0.5, 1, 2, 3.1415927, 10, 100].map(f),
          [-3, -1, -0.5, 0, 0.5, 1, 2, 3.7].map(f),
        ),
        ...pairs([-2, -3.5, -1].map(f), [0, 1, 2, 3, 4].map(f)),
      ],
      uniforms: {},
      tolerance: { abs: TINY, rel: 5e-5 },
      note: "exp2(y log2 x) amplifies log's error by |y log x| <= 20; negative bases with integer powers only",
    },
  );
  for (const [op, name] of [
    ["math/lt", "lt"],
    ["math/le", "le"],
    ["math/gt", "gt"],
    ["math/ge", "ge"],
    ["math/eq", "eq"],
  ] as const) {
    const b = new Builder();
    const x = b.input("a", "float", "vertex");
    const y = b.input("b", "float", "vertex");
    add({
      name: op,
      program: b.program({ r: b.op("type/boolToFloat", [b.op(op, [x, y])]) }),
      rows: pairs(GENERAL.slice(0, 12), GENERAL.slice(0, 12)),
      uniforms: {},
      tolerance: EXACT,
      note: `${name} of exact float32 values (through boolToFloat)`,
    });
  }
  {
    const b = new Builder();
    const x = b.input("a", "float", "vertex");
    const y = b.input("b", "float", "vertex");
    const p = b.op("math/gt", [x, b.const(0)]);
    const q = b.op("math/gt", [y, b.const(0)]);
    add({
      name: "math/and, or, not",
      program: b.program({
        r: b.op("math/combine3", [
          b.op("type/boolToFloat", [b.op("math/and", [p, q])]),
          b.op("type/boolToFloat", [b.op("math/or", [p, q])]),
          b.op("type/boolToFloat", [b.op("math/not", [p])]),
        ]),
      }),
      rows: pairs([-1, 0, 1].map(f), [-1, 0, 1].map(f)),
      uniforms: {},
      tolerance: EXACT,
      note: "all nine sign pairs",
    });
  }
  add(
    {
      name: "math/clamp",
      program: opProgram("math/clamp", 3, "float"),
      rows: TRIPLES,
      uniforms: {},
      tolerance: EXACT,
      note: "includes reversed bounds",
    },
    {
      name: "math/mix",
      program: opProgram("math/mix", 3, "float"),
      rows: TRIPLES,
      uniforms: {},
      tolerance: { abs: 4e-6, rel: 3e-7 },
      note: "(1 - t) a + t b: cancellation costs 2^-23 (|a| + |b|), values up to 10 and t up to 100",
    },
    {
      name: "math/smoothStep",
      program: opProgram("math/smoothStep", 3, "float"),
      rows: TRIPLES.filter((r) => r.a !== r.b),
      uniforms: {},
      tolerance: { abs: 2e-6, rel: 0 },
      note: "no equal edges; includes reversed edges",
    },
  );
  {
    const b = new Builder();
    const c = b.input("c", "float", "vertex");
    const x = b.input("a", "float", "vertex");
    const y = b.input("b", "float", "vertex");
    add({
      name: "math/select",
      program: b.program({
        r: b.op("math/select", [b.op("math/gt", [c, b.const(0)]), x, y]),
      }),
      rows: TRIPLES,
      uniforms: {},
      tolerance: EXACT,
      note: "WGSL takes (false, true, condition); the emitter reorders",
    });
  }
  add({
    name: "type/intToFloat, boolToFloat",
    program: (() => {
      const b = new Builder();
      const n = b.input("n", "int", "vertex");
      const flag = b.input("flag", "bool", "vertex");
      return b.program({
        r: b.op("math/combine2", [
          b.op("type/intToFloat", [n]),
          b.op("type/boolToFloat", [flag]),
        ]),
      });
    })(),
    rows: [
      { n: 0, flag: false },
      { n: 7, flag: true },
      { n: -12, flag: true },
      { n: 100000, flag: false },
    ],
    uniforms: {},
    tolerance: EXACT,
    note: "ints and bools reach the function through a float32 buffer",
  });

  // Vector ops.
  const vec = (
    op: string,
    arity: number,
    t: Type,
    rows: Row[],
    tol: Tolerance,
    note: string,
    index?: number,
  ): WgslCase => ({
    name: `${op}:${t}${index === undefined ? "" : `[${index}]`}`,
    program: opProgram(op, arity, t, index),
    rows,
    uniforms: {},
    tolerance: tol,
    note,
  });
  add(
    vec("math/add", 2, "float3", V3, ARITH, "componentwise"),
    vec("math/mul", 2, "float3", V3, ARITH, "componentwise"),
    vec("math/clamp", 3, "float3", V3, EXACT, "componentwise"),
    vec(
      "math/mix",
      3,
      "float3",
      V3,
      { abs: 4e-4, rel: 3e-7 },
      "componentwise, up to 1e3 in magnitude",
    ),
    vec(
      "math/sqrt",
      1,
      "float3",
      V3.map((r) => ({ a: (r.a as number[]).map(Math.abs) })),
      ARITH,
      "componentwise",
    ),
    vec(
      "math/length",
      1,
      "float3",
      V3,
      { abs: TINY, rel: 5e-7 },
      "sqrt of a float32 sum of squares",
    ),
    vec(
      "math/dot",
      2,
      "float3",
      V3,
      { abs: 1e-3, rel: 3e-7 },
      "cancellation in a sum of products of up to 1e3",
    ),
    vec(
      "math/cross",
      2,
      "float3",
      V3,
      { abs: 1e-3, rel: 3e-7 },
      "cancellation in a difference of products of up to 1e3",
    ),
    vec(
      "math/normalize",
      1,
      "float3",
      V3,
      { abs: 1e-6, rel: 1e-6 },
      "the zero vector gives zeros",
    ),
    vec("math/extract3", 1, "float3", V3, EXACT, "component 1", 1),
  );
  add({
    name: "math/normalize:float",
    program: opProgram("math/normalize", 1, "float"),
    rows: rows1([-5, -0, 0, 0.25, 1e-7, 1e6].map(f)),
    uniforms: {},
    tolerance: EXACT,
    note: "a scalar normalizes to its sign (zero to zero)",
  });
  add({
    name: "math/dot:float",
    program: opProgram("math/dot", 2, "float"),
    rows: pairs([-2, 0, 3.5].map(f), [-1, 0.5, 8].map(f)),
    uniforms: {},
    tolerance: ARITH,
    note: "a scalar dot is a product",
  });
  {
    const b = new Builder();
    const [x, y, z] = ["a", "b", "c"].map((n) =>
      b.input(n, "float", "vertex"),
    ) as [number, number, number];
    const w = b.input("w", "float4", "vertex");
    const v4 = b.op("math/combine4", [x, y, z, b.op("math/extract4", [w], 3)]);
    add({
      name: "math/combine4, extract4, combine2",
      program: b.program({
        r: b.op("math/combine2", [
          b.op("math/extract4", [w], 0),
          b.op("math/extract4", [w], 2),
        ]),
        s: v4,
      }),
      rows: TRIPLES.map((t, i) => ({ ...t, w: [i, -i, 0.5 * i, 1].map(f) })),
      uniforms: {},
      tolerance: EXACT,
      note: "builds and takes apart vec4",
    });
  }

  // The ops whose emitted form isn't one built-in call, on float3: a select
  // or a comparison inside them has to work on a vector as well as a scalar
  // (GLSL has no `&&` on a bvec, and its ternary takes a scalar condition).
  // Each takes its rows from the scalar case of the same name, three
  // consecutive rows to a vector, so the tolerance and the claim are the same.
  for (const name of [
    "math/pow",
    "math/sinh",
    "math/tanh",
    "math/cbrt",
    "math/round",
    "math/saturate",
    "math/rem",
    "math/smoothStep",
    "math/atan2",
    "math/log10",
  ]) {
    const scalar = cases.find((c) => c.name === name)!;
    const arity = Object.keys(scalar.rows[0]!).length;
    const names = ["a", "b", "c"].slice(0, arity);
    const n = Math.floor(scalar.rows.length / 3) * 3;
    add({
      name: `${name}:float3`,
      program: opProgram(name, arity, "float3"),
      rows: Array.from({ length: n / 3 }, (_, i) =>
        Object.fromEntries(
          names.map((x) => [
            x,
            [0, 1, 2].map((j) => scalar.rows[3 * i + j]![x] as number),
          ]),
        ),
      ),
      uniforms: {},
      tolerance: scalar.tolerance,
      note: `componentwise: the scalar case's rows, three to a vector. ${scalar.note}`,
    });
  }
  {
    const b = new Builder();
    const c = b.input("c", "float", "vertex");
    const x = b.input("a", "float3", "vertex");
    const y = b.input("b", "float3", "vertex");
    add({
      name: "math/select:float3",
      program: b.program({
        r: b.op("math/select", [b.op("math/gt", [c, b.const(0)]), x, y]),
      }),
      rows: TRIPLES.map((t) => ({
        c: t.c!,
        a: [t.a, t.b, t.c] as number[],
        b: [t.c, t.a, t.b] as number[],
      })),
      uniforms: {},
      tolerance: EXACT,
      note: "one scalar condition chooses a whole vector",
    });
  }

  // The composite: a uniform, a literal slot, an int and a bool, over
  // feature-rate floats.
  {
    const b = new Builder();
    const a = b.input("a", "float", "vertex");
    const u = b.input("u", "float2", "uniform");
    const n = b.input("n", "int", "feature");
    const flag = b.input("flag", "bool", "fragment");
    const gain = b.literal("gain", 2.5);
    const tint = b.literal("tint", [0.25, 0.5, 0.75]);
    const scaled = b.op("math/mul", [a, gain]);
    const mixed = b.op("math/mix", [
      scaled,
      b.op("math/extract2", [u], 1),
      b.op("math/extract2", [u], 0),
    ]);
    const out = b.op("math/select", [
      flag,
      mixed,
      b.op("type/intToFloat", [n]),
    ]);
    add({
      name: "composite",
      program: b.program({
        r: out,
        t: b.op("math/mul", [tint, b.splat(out, 3)]),
      }),
      rows: [
        { a: 1, n: 3, flag: true },
        { a: -2, n: 5, flag: false },
        { a: 0.5, n: -1, flag: true },
        { a: 10, n: 0, flag: false },
      ],
      uniforms: { u: [f(0.5), f(8)] },
      tolerance: { abs: 4e-6, rel: 5e-7 },
      note: "a uniform input, two literal slots, an int and a bool in one program",
    });
  }
  return cases;
}
