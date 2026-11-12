// eslint-disable-next-line n/no-extraneous-import -- a devDependency of the workspace root
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import {
  hessian,
  jacobian,
  jacobianProgram,
  hessianProgram,
  parameterDerivatives,
} from "../src/transform/ad.ts";
import { evaluate, type ParamValues } from "../src/transform/evaluate.ts";
import {
  evaluateInterval,
  type Interval,
  type ParamRange,
} from "../src/transform/interval.ts";
import { Ir } from "../src/transform/ir.ts";
import { parseTransform, TransformParseError } from "../src/transform/parse.ts";
import { toWgsl } from "../src/transform/wgsl.ts";
import * as samples from "./transformIrSamples.ts";

type V3 = [number, number, number];
type SampleFn = (p: V3, params: never, out: number[]) => readonly number[];

interface Case {
  name: keyof typeof samples;
  params: ParamValues;
  /** Position ranges per axis, as [lo, hi]. */
  domain: [[number, number], [number, number], [number, number]];
}

const CASES: Case[] = [
  {
    name: "exaggerationLift",
    params: { k: 3, ceiling: 500 },
    domain: [
      [-1000, 1000],
      [-1000, 1000],
      [-100, 900],
    ],
  },
  {
    name: "bump",
    params: { amp: 50, cx: 10, cy: -5, width: 80 },
    domain: [
      [-200, 200],
      [-200, 200],
      [0, 100],
    ],
  },
  {
    name: "twist",
    params: { rate: 0.01 },
    domain: [
      [-100, 100],
      [-100, 100],
      [-50, 50],
    ],
  },
  {
    name: "bend",
    params: { curvature: 0.02 },
    domain: [
      [-30, 30],
      [-30, 30],
      [-10, 10],
    ],
  },
  {
    name: "brownConrady",
    params: {
      k1: -0.2,
      k2: 0.05,
      k3: 0.01,
      p1: 0.001,
      p2: -0.002,
      fx: 800,
      fy: 790,
      cx: 320,
      cy: 240,
    },
    domain: [
      [-1, 1],
      [-1, 1],
      [2, 10],
    ],
  },
  {
    name: "corridor",
    params: { radius: 100, cx: 0, cy: 0, scale: 2 },
    domain: [
      [50, 150],
      [-60, 60],
      [-5, 5],
    ],
  },
  {
    name: "timeToDepth",
    params: { v0: 1800, g: 0.4 },
    domain: [
      [-10, 10],
      [-10, 10],
      [0.1, 3],
    ],
  },
  {
    name: "kepler",
    params: { e: 0.3 },
    domain: [
      [-1, 1],
      [-1, 1],
      [0, 3],
    ],
  },
  {
    name: "taper",
    params: { k: 0.01 },
    domain: [
      [-100, 100],
      [-100, 100],
      [-50, 50],
    ],
  },
  {
    name: "flatten",
    params: { h: 10, falloff: 100 },
    domain: [
      [-80, 80],
      [-80, 80],
      [-5, 40],
    ],
  },
  {
    name: "kitchenSink",
    params: { a: 0.7 },
    domain: [
      [-2, 2],
      [-1, 1],
      [-1, 1],
    ],
  },
];

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

function randomPoint(domain: Case["domain"], random: () => number): V3 {
  return domain.map(([lo, hi]) => lo + (hi - lo) * random()) as V3;
}

function call(fn: unknown, p: V3, params: ParamValues): number[] {
  return [...(fn as SampleFn)(p, params as never, [0, 0, 0])];
}

function expectClose(actual: number[], expected: number[], tol: number) {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((value, i) => {
    const want = expected[i]!;
    expect(Math.abs(value - want)).toBeLessThanOrEqual(
      tol * (1 + Math.abs(want)),
    );
  });
}

describe("parse and evaluate", () => {
  for (const { name, params, domain } of CASES) {
    it(`${name}: the IR equals calling the function`, () => {
      const fn = samples[name];
      const program = parseTransform(fn);
      expect(program.outputs).toHaveLength(3);
      expect(program.params.length).toBeGreaterThan(0);
      const random = rng(7);
      for (let k = 0; k < 200; k++) {
        const p = randomPoint(domain, random);
        expectClose(evaluate(program, p, params), call(fn, p, params), 1e-11);
      }
    });
  }

  it("reads the same function in each accepted spelling", () => {
    const params = { k: 2, h0: 3 };
    const sources = [
      "(p, params) => [p[0], p[1], p[2] * params.k + params.h0]",
      "(p, params) => { const { k, h0 } = params; const [x, y, z] = p; return [x, y, z * k + h0]; }",
      "(p, { k, h0: shift }) => [p.x, p.y, p.z * k + shift]",
      "function (p, params, out) { out[0] = p[0]; out[1] = p[1]; out[2] = p[2] * params['k'] + params.h0; return out; }",
      "forward(p, params) { return [p[0], p[1], p[2] * params.k + params.h0] }",
      "([x, y, z], { k, h0 }) => [x, y, z * k + h0]",
      "(a,b)=>[a[0],a[1],a[2]*b.k+b.h0]",
    ];
    for (const source of sources) {
      const program = parseTransform(source);
      expect(evaluate(program, [1, 2, 3], params)).toEqual([1, 2, 9]);
      expect(program.params).toEqual(expect.arrayContaining(["k", "h0"]));
    }
  });

  it("accepts the forms minifiers produce", () => {
    const params = { a: 2, b: 5 };
    const cases: [string, V3, number[]][] = [
      // comma expressions with assignments, void 0, !0 / !1, ternaries, ?: and &&
      [
        "(p,t)=>{let r=p[0],o=p[1];return r*=t.a,o+=t.b,void 0,[r,o,p[2]]}",
        [1, 2, 3],
        [2, 7, 3],
      ],
      [
        "(p,t)=>[!0?p[0]:p[1],!1?p[0]:p[1],.5*p[2]+1e3]",
        [1, 2, 3],
        [1, 2, 1001.5],
      ],
      [
        "(p,t)=>[Math.pow(p[0],2),p[1]**t.a,p[2]**.5]",
        [1, 2, 3],
        [1, 4, Math.pow(3, 0.5)],
      ],
      ["(p,t)=>p[0]>0?[1,2,3]:[4,5,6]", [1, 2, 3], [1, 2, 3]],
      ["(p,t)=>p[0]>0?[1,2,3]:[4,5,6]", [-1, 2, 3], [4, 5, 6]],
      [
        "(p,t)=>{if(p[0]>0)return[1,2,3];return[p[0],p[1],p[2]]}",
        [-1, 2, 3],
        [-1, 2, 3],
      ],
      [
        "(p,t)=>{if(p[0]>0)return[1,2,3];return[p[0],p[1],p[2]]}",
        [1, 2, 3],
        [1, 2, 3],
      ],
      [
        "(p,t)=>{let r=0;p[0]>0&&(r=7),p[0]<=0&&(r=9);return[r,0,0]}",
        [1, 2, 3],
        [7, 0, 0],
      ],
      [
        "(p,t)=>{let r=0;p[0]>0&&(r=7),p[0]<=0&&(r=9);return[r,0,0]}",
        [-1, 2, 3],
        [9, 0, 0],
      ],
      [
        "(p,t,o,j)=>{if(j){j[0]=1}return[p[0],p[1],p[2]]}",
        [1, 2, 3],
        [1, 2, 3],
      ],
      [
        "(p,t)=>{var s=0;for(var i=0;i<3;++i)s+=i*p[0];return[s,0,0]}",
        [1, 2, 3],
        [3, 0, 0],
      ],
    ];
    for (const [source, point, want] of cases) {
      expect(evaluate(parseTransform(source), point, params), source).toEqual(
        want,
      );
    }
  });

  it("shares common subexpressions and folds constants", () => {
    const program = parseTransform(
      "(p, q) => { const s = Math.sin(p[0] * q.k); return [s * s + 2 * 3, s * s, s] }",
    );
    const ops = program.nodes.map((n) => n.op);
    expect(ops.filter((op) => op === "sin")).toHaveLength(1);
    expect(ops.filter((op) => op === "mul")).toHaveLength(2);
    expect(program.nodes.some((n) => n.op === "const" && n.value === 6)).toBe(
      true,
    );
  });

  it("builds vector helpers on the IR", () => {
    const ir = new Ir();
    const a = [ir.constant(1), ir.constant(2), ir.constant(3)] as const;
    const p = [ir.pos(0), ir.pos(1), ir.pos(2)] as const;
    const [cx, cy, cz] = ir.cross3(a, p);
    const dot = ir.dot3(a, p);
    const [nx, ny, nz] = ir.normalize3(p);
    const program = ir.program([cx, cy, cz, dot, ir.length3(p), nx, ny, nz]);
    const q = [0.5, -1.5, 2];
    const [x, y, z, d, len, ux, uy, uz] = evaluate(program, q);
    expect([x, y, z]).toEqual([
      2 * 2 - 3 * -1.5,
      3 * 0.5 - 1 * 2,
      1 * -1.5 - 2 * 0.5,
    ]);
    expect(d).toBeCloseTo(0.5 - 3 + 6, 12);
    expect(len).toBeCloseTo(Math.hypot(...q), 12);
    expect(Math.hypot(ux!, uy!, uz!)).toBeCloseTo(1, 12);
  });
});

describe("refusals", () => {
  const refused: [string, string, RegExp][] = [
    [
      "free variable",
      "(p, params) => {\n  return [p[0] * scale, p[1], p[2]];\n}",
      /free variable 'scale' at 2:18/i,
    ],
    [
      "call to a user function",
      "(p, params) => [helper(p[0]), p[1], p[2]]",
      /call to 'helper' at 1:\d+/i,
    ],
    [
      "call to a method",
      "(p, params) => [p[0].toFixed(2), p[1], p[2]]",
      /call to method '\.toFixed\(\)' at 1:\d+/i,
    ],
    [
      "object literal",
      "(p, params) => ({ x: p[0] })",
      /object literal at 1:\d+/i,
    ],
    [
      "object literal in a body",
      "(p, params) => {\n  const o = { a: 1 };\n  return [p[0], o.a, p[2]];\n}",
      /object literal at 2:13/i,
    ],
    ["this", "(p, params) => [this.x, p[1], p[2]]", /'this' at 1:\d+/],
    [
      "assignment to p",
      "(p, params) => { p[0] = 1; return [p[0], p[1], p[2]]; }",
      /assignment to parameter 'p' at 1:\d+/i,
    ],
    [
      "assignment to p itself",
      "(p, params) => { p = [1, 2, 3]; return p; }",
      /assignment to parameter 'p' at 1:\d+/i,
    ],
    [
      "assignment to params",
      "(p, params) => { params.k = 2; return [p[0], p[1], p[2]]; }",
      /assignment to parameter 'params' at 1:\d+/i,
    ],
    [
      "assignment to a const",
      "(p, params) => { const a = 1; a = 2; return [a, a, a]; }",
      /assignment to const 'a'/i,
    ],
    [
      "non-vec3 array",
      "(p, params) => [p[0], p[1]]",
      /array literal of 2 elements at 1:\d+/i,
    ],
    ["string", "(p, params) => ['a', p[1], p[2]]", /string literal at 1:\d+/i],
    [
      "remainder",
      "(p, params) => [p[0] % 2, p[1], p[2]]",
      /operator '%' at 1:\d+/i,
    ],
    [
      "while loop",
      "(p, params) => { while (true) {} }",
      /'while' statement at 1:\d+/i,
    ],
    [
      "non-constant loop bound",
      "(p, params) => { let s = 0; for (let i = 0; i < p[0]; i++) { s += i; } return [s, s, s]; }",
      /loop with a non-constant bound at 1:\d+/i,
    ],
    [
      "nested function",
      "(p, params) => { const f = (x) => x; return [p[0], p[1], p[2]]; }",
      /nested arrow function at 1:\d+/i,
    ],
    [
      "Math.random",
      "(p, params) => [Math.random(), p[1], p[2]]",
      /'Math\.random' at 1:\d+/i,
    ],
    [
      "logical operator on numbers",
      "(p, params) => [p[0] || 1, p[1], p[2]]",
      /'\|\|' on a number at 1:\d+/i,
    ],
    [
      "non-constant index",
      "(p, params) => [p[p[0]], p[1], p[2]]",
      /non-constant index at 1:\d+/i,
    ],
    [
      "missing return",
      "(p, params) => { const a = p[0]; }",
      /function without a return at 1:1/i,
    ],
    [
      "a path without a return",
      "(p, params) => { if (p[0] > 0) { return [1, 2, 3]; } }",
      /path without a return/i,
    ],
    [
      "assignment to a parameter's property inside a minified &&",
      "(p,t)=>(p[0]>0&&(t.a=0),[0,0,0])",
      /assignment to parameter 't' at 1:\d+/i,
    ],
    ["template literal", "(p, params) => `a`", /template literal at 1:16/i],
  ];
  for (const [name, source, message] of refused) {
    it(`refuses ${name}`, () => {
      let error: unknown;
      try {
        parseTransform(source);
      } catch (e) {
        error = e;
      }
      expect(error).toBeInstanceOf(TransformParseError);
      expect((error as Error).message).toMatch(message);
      expect(typeof (error as TransformParseError).line).toBe("number");
    });
  }

  it("reports the position in the message and the fields", () => {
    try {
      parseTransform("(p, params) =>\n  [p[0],\n   foo + 1,\n   p[2]]");
      expect.unreachable();
    } catch (e) {
      const error = e as TransformParseError;
      expect(error.line).toBe(3);
      expect(error.column).toBe(4);
      expect(error.message).toContain("3:4");
      expect(error.construct).toBe("free variable 'foo'");
    }
  });

  it("never evaluates the source", () => {
    // Parsing `globalThis.x = 1` must not run it.
    expect(() =>
      parseTransform("(p, params) => { globalThis.poked = 1; return p; }"),
    ).toThrow(/free variable 'globalThis'/);
    expect((globalThis as Record<string, unknown>).poked).toBeUndefined();
  });
});

describe("minifier safety", () => {
  const entry = fileURLToPath(
    new URL("./transformIrSamples.ts", import.meta.url),
  );
  for (const target of ["esnext", "es2015"]) {
    it(`parses the functions minified for ${target}`, async () => {
      const result = await build({
        entryPoints: [entry],
        bundle: true,
        minify: true,
        write: false,
        format: "iife",
        globalName: "Samples",
        target,
        logLevel: "silent",
      });
      const code = result.outputFiles[0]!.text;
      const minified = vm.runInNewContext(`${code};Samples`) as Record<
        string,
        (...args: never[]) => unknown
      >;
      for (const { name, params, domain } of CASES) {
        const fn = minified[name]!;
        const text = Function.prototype.toString.call(fn);
        expect(text.length).toBeLessThan(
          Function.prototype.toString.call(samples[name]).length,
        );
        if (target === "es2015" && name === "bump") {
          // Lowering ** hoists `var b = Math.pow` out of the function: not pure.
          expect(() => parseTransform(text)).toThrow(/call to '\w+'.*ES2016/);
          continue;
        }
        const program = parseTransform(text);
        const random = rng(11);
        for (let k = 0; k < 50; k++) {
          const p = randomPoint(domain, random);
          expectClose(
            evaluate(program, p, params),
            call(samples[name], p, params),
            1e-11,
          );
        }
      }
    });
  }
});

function central(
  f: (x: number) => number[],
  x: number,
  step: number,
): number[] {
  const hi = f(x + step);
  const lo = f(x - step);
  return hi.map((v, i) => (v - lo[i]!) / (2 * step));
}

describe("autodiff", () => {
  for (const { name, params, domain } of CASES) {
    const program = parseTransform(samples[name]);

    it(`${name}: J and H match central differences`, () => {
      const random = rng(3);
      const jp = jacobianProgram(program);
      expect(jp.outputs).toHaveLength(9);
      expect(hessianProgram(program).outputs).toHaveLength(27);
      for (let k = 0; k < 25; k++) {
        const p = randomPoint(domain, random);
        const J = jacobian(program, p, params);
        const H = hessian(program, p, params);
        for (let j = 0; j < 3; j++) {
          const h = 1e-5 * (1 + Math.abs(p[j]!));
          const at = (x: number) => {
            const q = [...p];
            q[j] = x;
            return q;
          };
          const dF = central((x) => evaluate(program, at(x), params), p[j]!, h);
          const dJ = central((x) => jacobian(program, at(x), params), p[j]!, h);
          for (let i = 0; i < 3; i++) {
            expect(Math.abs(J[3 * i + j]! - dF[i]!)).toBeLessThan(
              1e-5 * (1 + Math.abs(J[3 * i + j]!)),
            );
            for (let m = 0; m < 3; m++) {
              // H[i][j][m] is d J[i][m] / d p_j
              expect(
                Math.abs(H[9 * i + 3 * j + m]! - dJ[3 * i + m]!),
              ).toBeLessThan(1e-4 * (1 + Math.abs(H[9 * i + 3 * j + m]!)));
            }
          }
        }
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
            for (let m = 0; m < 3; m++) {
              expect(H[9 * i + 3 * j + m]).toBe(H[9 * i + 3 * m + j]);
            }
          }
        }
      }
    });

    it(`${name}: derivatives along the parameters match central differences`, () => {
      const random = rng(5);
      const names = [...program.params];
      for (let k = 0; k < 10; k++) {
        const p = randomPoint(domain, random);
        const D = parameterDerivatives(program, names, p, params);
        names.forEach((param, n) => {
          const value = params[param]!;
          const h = 1e-6 * (1 + Math.abs(value));
          const d = central(
            (x) => evaluate(program, p, { ...params, [param]: x }),
            value,
            h,
          );
          for (let i = 0; i < 3; i++) {
            expect(Math.abs(D[3 * n + i]! - d[i]!)).toBeLessThan(
              1e-4 * (1 + Math.abs(D[3 * n + i]!)),
            );
          }
        });
      }
    });
  }

  it("differentiates composite ops by their definitions", () => {
    const ir = new Ir();
    const x = ir.pos(0);
    const t = ir.param("t");
    const out = [
      ir.op("clamp", ir.op("mul", x, t), ir.constant(-0.5), ir.constant(0.5)),
      ir.op("mix", x, ir.op("mul", x, x), t),
      ir.op("smoothstep", ir.constant(0), ir.constant(2), x),
    ];
    const program = ir.program(out);
    const params = { t: 0.3 };
    for (const px of [-1, 0.2, 0.9, 1.5]) {
      const J = jacobian(program, [px, 0, 0], params);
      const dF = central((v) => evaluate(program, [v, 0, 0], params), px, 1e-6);
      expect(Math.abs(J[0]! - dF[0]!)).toBeLessThan(1e-6);
      expect(Math.abs(J[3]! - dF[1]!)).toBeLessThan(1e-6);
      expect(Math.abs(J[6]! - dF[2]!)).toBeLessThan(1e-6);
    }
  });
});

describe("intervals", () => {
  for (const { name, params, domain } of CASES) {
    it(`${name}: contain the sampled values`, () => {
      const program = parseTransform(samples[name]);
      const random = rng(13);
      for (const widthFraction of [0.005, 0.05, 0.3]) {
        for (let trial = 0; trial < 8; trial++) {
          const min: number[] = [];
          const max: number[] = [];
          domain.forEach(([lo, hi]) => {
            const half = (hi - lo) * widthFraction;
            const centre = lo + half + (hi - lo - 2 * half) * random();
            min.push(centre - half);
            max.push(centre + half);
          });
          const ranges: Record<string, ParamRange> = {};
          for (const [key, value] of Object.entries(params)) {
            const slack = Math.abs(value) * 0.02;
            ranges[key] = trial % 2 ? [value - slack, value + slack] : value;
          }
          const bounds = evaluateInterval(program, { min, max }, ranges);
          for (let k = 0; k < 40; k++) {
            const p = min.map((lo, i) => lo + (max[i]! - lo) * random());
            const sampled: Record<string, number> = {};
            for (const [key, range] of Object.entries(ranges)) {
              const [lo, hi] =
                typeof range === "number"
                  ? [range, range]
                  : (range as [number, number]);
              sampled[key] = lo + (hi - lo) * random();
            }
            evaluate(program, p, sampled).forEach((value, i) => {
              const { lo, hi } = bounds[i]!;
              const slack = 1e-9 * (1 + Math.abs(value));
              expect(value).toBeGreaterThanOrEqual(lo - slack);
              expect(value).toBeLessThanOrEqual(hi + slack);
            });
          }
        }
      }
    });
  }

  const one = (
    build: (ir: Ir, x: number) => number,
    lo: number,
    hi: number,
  ): Interval => {
    const ir = new Ir();
    const program = ir.program([build(ir, ir.pos(0))]);
    return evaluateInterval(program, { min: [lo, 0, 0], max: [hi, 0, 0] })[0]!;
  };

  it("is tight for monotone ops", () => {
    expect(one((ir, x) => ir.op("exp", x), 0, 1)).toEqual({
      lo: 1,
      hi: Math.E,
    });
    expect(one((ir, x) => ir.op("sqrt", x), 4, 9)).toEqual({ lo: 2, hi: 3 });
    expect(one((ir, x) => ir.op("atan", x), -1, 1)).toEqual({
      lo: -Math.PI / 4,
      hi: Math.PI / 4,
    });
    expect(one((ir, x) => ir.op("neg", ir.op("tanh", x)), 0, 2)).toEqual({
      lo: -Math.tanh(2),
      hi: -0,
    });
    expect(one((ir, x) => ir.op("div", ir.constant(1), x), 2, 4)).toEqual({
      lo: 0.25,
      hi: 0.5,
    });
    expect(one((ir, x) => ir.op("pow", x, ir.constant(3)), -2, 1)).toEqual({
      lo: -8,
      hi: 1,
    });
    expect(one((ir, x) => ir.op("pow", x, ir.constant(2)), -2, 1)).toEqual({
      lo: 0,
      hi: 4,
    });
  });

  it("finds the extrema of sin and cos by period checks", () => {
    const sin = (lo: number, hi: number) =>
      one((ir, x) => ir.op("sin", x), lo, hi);
    const cos = (lo: number, hi: number) =>
      one((ir, x) => ir.op("cos", x), lo, hi);
    expect(sin(0.1, 0.2)).toEqual({ lo: Math.sin(0.1), hi: Math.sin(0.2) });
    expect(sin(1, 2)).toEqual({ lo: Math.sin(1), hi: 1 });
    expect(sin(0, 7)).toEqual({ lo: -1, hi: 1 });
    expect(sin(4, 5)).toEqual({ lo: -1, hi: Math.sin(4) });
    expect(sin(100, 100.1).lo).toBeCloseTo(Math.sin(100), 12);
    expect(cos(3, 3.5)).toEqual({ lo: -1, hi: Math.cos(3.5) });
    expect(cos(-0.1, 0.2)).toEqual({ lo: Math.cos(0.2), hi: 1 });
    expect(cos(0, 10)).toEqual({ lo: -1, hi: 1 });
    expect(one((ir, x) => ir.op("tan", x), 1, 2)).toEqual({
      lo: -Infinity,
      hi: Infinity,
    });
    expect(one((ir, x) => ir.op("tan", x), 0, 1)).toEqual({
      lo: 0,
      hi: Math.tan(1),
    });
  });

  it("is conservative where it must be", () => {
    expect(one((ir, x) => ir.op("div", ir.constant(1), x), -1, 1)).toEqual({
      lo: -Infinity,
      hi: Infinity,
    });
    expect(one((ir, x) => ir.op("mul", x, x), -2, 3)).toEqual({
      lo: -6,
      hi: 9,
    });
    expect(one((ir, x) => ir.op("abs", x), -2, 3)).toEqual({ lo: 0, hi: 3 });
    const picked = one(
      (ir, x) =>
        ir.op(
          "select",
          ir.op("gt", x, ir.constant(0)),
          ir.constant(5),
          ir.constant(-1),
        ),
      -1,
      1,
    );
    expect(picked).toEqual({ lo: -1, hi: 5 });
    expect(
      one(
        (ir, x) =>
          ir.op(
            "select",
            ir.op("gt", x, ir.constant(0)),
            ir.constant(5),
            ir.constant(-1),
          ),
        1,
        2,
      ),
    ).toEqual({ lo: 5, hi: 5 });
  });

  it("bounds atan2 across quadrants and the branch cut", () => {
    const ir = new Ir();
    const program = ir.program([ir.op("atan2", ir.pos(1), ir.pos(0))]);
    const at = (x: [number, number], y: [number, number]) =>
      evaluateInterval(program, {
        min: [x[0], y[0], 0],
        max: [x[1], y[1], 0],
      })[0]!;
    const quarter = at([1, 2], [1, 2]);
    expect(quarter.lo).toBeCloseTo(Math.atan2(1, 2), 14);
    expect(quarter.hi).toBeCloseTo(Math.atan2(2, 1), 14);
    expect(at([-2, -1], [-1, 1])).toEqual({ lo: -Math.PI, hi: Math.PI });
    expect(at([-1, 1], [-1, 1])).toEqual({ lo: -Math.PI, hi: Math.PI });
  });
});

describe("wgsl", () => {
  const structure = (text: string, name: string, returns: string) => {
    expect(text).toMatch(
      new RegExp(
        `fn ${name}\\(p: vec3<f32>(, params: \\w+)?\\) -> ${returns} \\{`,
      ),
    );
    expect(text.trimEnd().endsWith("}")).toBe(true);
    expect(text.split("{").length).toBe(text.split("}").length);
    expect(text.split("(").length).toBe(text.split(")").length);
    expect(text).not.toMatch(/NaN|Infinity|undefined/);
    const defined = new Set<string>();
    for (const line of text.split("\n")) {
      const lets = /^ {2}let (v\d+) = (.*);$/.exec(line);
      const body = lets ? lets[2]! : line;
      for (const use of body.match(/(?<![.\w])v\d+\b(?!:)/g) ?? []) {
        expect(defined.has(use), `${use} used before its let`).toBe(true);
      }
      if (lets) {
        defined.add(lets[1]!);
      }
    }
    expect(text).toMatch(/\n {2}return /);
  };

  for (const { name } of CASES) {
    it(`${name}: emits a well-formed function, and for J and H`, () => {
      const program = parseTransform(samples[name]);
      const text = toWgsl(program, { name });
      structure(text, name, "vec3<f32>");
      expect(text).toContain(
        `struct ${name[0]!.toUpperCase()}${name.slice(1)}Params {`,
      );
      for (const param of program.params) {
        expect(text).toContain(`  ${param}: f32,`);
        expect(text).toContain(`params.${param}`);
      }
      structure(
        toWgsl(jacobianProgram(program), { name: "jac" }),
        "jac",
        "mat3x3<f32>",
      );
      structure(
        toWgsl(hessianProgram(program), { name: "hess" }),
        "hess",
        "array<f32, 27>",
      );
    });
  }

  it("emits constant integer powers as products and logic as selects", () => {
    const program = parseTransform(
      "(p, q) => [p[0] ** 2, p[1] ** -1, p[0] > q.a && p[1] <= 1 ? Math.pow(p[2], 1.5) : -2.5]",
    );
    const text = toWgsl(program);
    expect(text).not.toContain("pow(v");
    expect(text).toContain("pow(");
    expect(text).toContain("select(");
    expect(text).toContain("(-2.5)");
    expect(text).toContain(
      "fn transformPoint(p: vec3<f32>, params: TransformPointParams)",
    );
    structure(text, "transformPoint", "vec3<f32>");
  });

  it("omits the params struct when the program reads none", () => {
    const text = toWgsl(parseTransform("(p) => [p[1], p[0], p[2] * 2]"));
    expect(text).not.toContain("struct");
    expect(text).toContain("fn transformPoint(p: vec3<f32>) -> vec3<f32> {");
    expect(text).toContain("return vec3<f32>(p.y, p.x, v");
  });

  it("maps awkward parameter names to WGSL fields", () => {
    const text = toWgsl(parseTransform("(p, q) => [q.$a, q.filter, q['9x']]"));
    expect(text).toContain("f__a: f32,");
    expect(text).toContain("filter_: f32,");
    expect(text).toContain("f_9x: f32,");
  });
});
