// CS-921: a compiled route's center term sums its parts as integers
// (packages/core/src/transform/centerTerm.ts). These tests emulate the
// shader's helpers in Node, with int32 and float32 arithmetic as the GPU
// does them, and hold them against exact answers: the limb product against
// BigInt, and each route case's center term against float64. The GPU's own
// answers are the Lab's (bench/irWgsl.ts and bench/irGlsl.ts).
import { describe, expect, it } from "vitest";
import {
  CENTER_TERM_GLSL,
  CENTER_TERM_WGSL,
  fixParts,
  fromFixParts,
} from "../packages/core/src/transform/centerTerm.ts";
import { splitVec3 } from "../packages/core/src/math/transforms.ts";
import { routeCases } from "../packages/core/src/transforms/routeCases.ts";

const f = Math.fround;
const UNIT = 2 ** -24;

interface Sum {
  w: number;
  q: number;
  f: number;
}

// The WGSL helpers, statement for statement: `| 0` and Math.imul are int32,
// Math.fround float32.
const i32 = (x: number) => Math.trunc(x) | 0;
const whole = (v: ArrayLike<number>, at: number) =>
  (Math.imul(i32(v[at]!), 65536) + i32(v[at + 1]!)) | 0;
function diff(
  a: ArrayLike<number>,
  ai: number,
  b: ArrayLike<number>,
  bi: number,
): Sum {
  return {
    w: (whole(a, ai) - whole(b, bi)) | 0,
    q: (i32(a[ai + 2]!) - i32(b[bi + 2]!)) | 0,
    f: f(a[ai + 3]! - b[bi + 3]!),
  };
}
function wk(h: number, l: number, k: number): [number, number] {
  const kh = k >> 12;
  const kl = k & 4095;
  const a = Math.imul(h, kh);
  const b = Math.imul(h, kl);
  const c = Math.imul(l, kh);
  const d = Math.imul(l, kl);
  return [
    (Math.imul(a, 16) + (b >> 8) + (c >> 12) + (d >> 24)) | 0,
    (((b & 255) << 16) + ((c & 4095) << 12) + (d & 16777215)) | 0,
  ];
}
function addMul(
  s: Sum,
  p: ArrayLike<number>,
  pi: number,
  g: ArrayLike<number>,
  gi: number,
): Sum {
  const [ph, pl, pk] = [i32(p[pi]!), i32(p[pi + 1]!), i32(p[pi + 2]!)];
  const [gh, gl, gk] = [i32(g[gi]!), i32(g[gi + 1]!), i32(g[gi + 2]!)];
  const pw = (Math.imul(ph, 65536) + pl) | 0;
  const gw = (Math.imul(gh, 65536) + gl) | 0;
  const x = wk(ph, pl, gk);
  const y = wk(gh, gl, pk);
  const q = (s.q + x[1] + y[1]) | 0;
  const pf = f(f(pk * UNIT) + p[pi + 3]!);
  const gf = f(f(gk * UNIT) + g[gi + 3]!);
  const rests = f(
    f(f(f(pw) * g[gi + 3]!) + f(p[pi + 3]! * f(gw))) + f(pf * gf),
  );
  return {
    w: (s.w + Math.imul(pw, gw) + x[0] + y[0] + (q >> 24)) | 0,
    q: q & 16777215,
    f: f(s.f + rests),
  };
}
function value(s: Sum): number {
  const q = (s.q + 8388608) | 0;
  const fraction = ((q & 16777215) - 8388608) | 0;
  return f(f((s.w + (q >> 24)) | 0) + f(f(fraction * UNIT) + s.f));
}

describe("the center term's parts", () => {
  it("write each value exactly in four float32s, the whole units split at 16 bits", () => {
    const out = new Float32Array(4);
    for (const v of [
      0,
      0.25,
      -0.5,
      0.5,
      1.75,
      -1,
      -65536.3,
      6378137.123456789,
      -6356752.314245179,
      4.0e6 + 1 / 3,
      2 ** 24 + 0.7,
      -(2 ** 30) - 0.123,
      1e-9,
      -3e-12,
    ]) {
      fixParts(v, out, 0);
      expect(out[1]).toBeGreaterThanOrEqual(0);
      expect(out[1]).toBeLessThan(65536);
      expect(Math.abs(out[2]!)).toBeLessThanOrEqual(2 ** 23);
      expect(Math.abs(out[3]!)).toBeLessThanOrEqual(2 ** -25);
      // float32 keeps 24 bits of a rest under 2^-25: the value to about 2^-49.
      expect(Math.abs(fromFixParts(out) - v)).toBeLessThanOrEqual(
        2 ** -49 + Math.abs(v) * 2 ** -52,
      );
    }
  });

  it("put a value past 2^31 units, or one that isn't finite, in the rest alone", () => {
    const out = new Float32Array(4);
    fixParts(3e9, out, 0);
    expect(Array.from(out)).toEqual([0, 0, 0, f(3e9)]);
    fixParts(Number.NaN, out, 0);
    expect(out[3]).toBeNaN();
  });
});

describe("a split position as the center term's parts (tg_splitParts)", () => {
  it("carries splitVec3's whole-meter high and its low exactly", () => {
    const hi = new Float32Array(1);
    const lo = new Float32Array(1);
    for (const v of [
      0,
      12.5,
      -40.25,
      6378137.123456789,
      -4441151.6187,
      2 ** 24 + 0.7,
      -(2 ** 29) - 0.3,
    ]) {
      splitVec3(Float64Array.of(v, 0, 0), hi, 0, lo, 0);
      // The WGSL, statement for statement.
      const w = i32(hi[0]!);
      const k = Math.round(lo[0]! * 2 ** 24);
      const parts = [w >> 16, w & 65535, k, f(lo[0]! - f(k * UNIT))];
      expect(fromFixParts(parts)).toBe(hi[0]! + lo[0]!);
    }
  });
});

describe("the center term's integer limbs (tg_wk)", () => {
  it("multiply whole units by 2^-24 units exactly, as whole units and 2^-24 units", () => {
    // Pseudo-random over the full ranges, and the ends of each.
    let seed = 12345;
    const next = () => (seed = (Math.imul(seed, 1103515245) + 12345) >>> 0);
    const cases: [number, number][] = [
      [2 ** 31 - 1, 2 ** 23],
      [-(2 ** 31), 2 ** 23],
      [-(2 ** 31), -(2 ** 23)],
      [-1, 1],
      [0, -(2 ** 23)],
    ];
    for (let i = 0; i < 2000; i++) {
      cases.push([next() | 0, (next() % (2 ** 24 + 1)) - 2 ** 23]);
    }
    for (const [w, k] of cases) {
      const [whole, q] = wk(w >> 16, w & 65535, k);
      expect(q).toBeGreaterThanOrEqual(0);
      expect(q).toBeLessThan(3 * 2 ** 24);
      // whole + q·2^-24 = w·k·2^-24, in exact integers: whole·2^24 + q = w·k.
      expect(BigInt(whole) * 2n ** 24n + BigInt(q)).toBe(BigInt(w) * BigInt(k));
    }
  });
});

describe("the center term, emulated in int32 and float32", () => {
  // Every route case's eye is its float64 image of the center, so the
  // answer is 0 in the output's units.
  const cases = routeCases();

  it("is within 2 × 10⁻⁸ units of float64 for every route case, separable routes included", () => {
    let worst = 0;
    let separable = 0;
    for (const c of cases) {
      for (const u of c.routes) {
        const { perDrawLayout: draw, uniformsLayout: view } = u.compiled;
        const keys = u.compiled.separableParams;
        separable += keys.length > 0 ? 1 : 0;
        for (let a = 0; a < 3; a++) {
          let s = diff(
            u.record,
            draw.fields.out! + 4 * a,
            u.uniforms,
            view.fields.eye! + 4 * a,
          );
          // The float64 sum of the parts the shader reads, which the CPU's rounding of F(c) and the eye leaves.
          let exact =
            fromFixParts(u.record, draw.fields.out! + 4 * a) -
            fromFixParts(u.uniforms, view.fields.eye! + 4 * a);
          for (const key of keys) {
            const p = view.fields[`paramParts:${key}`]!;
            const g = draw.fields[`outG:${key}`]! + 4 * a;
            s = addMul(s, u.uniforms, p, u.record, g);
            exact += fromFixParts(u.uniforms, p) * fromFixParts(u.record, g);
          }
          const got = value(s);
          worst = Math.max(worst, Math.abs(got));
          expect(Math.abs(got - exact), `${c.name}, axis ${a}`).toBeLessThan(
            2e-8,
          );
        }
      }
    }
    expect(separable).toBeGreaterThan(5);
    // Against 0, the CPU's float64 derivative G(c) adds its own: a
    // difference of two values as large as |F(c)|, times the parameter.
    expect(worst).toBeLessThan(1e-7);
  });

  it("keeps the low parts when the sum is far from 0: an eye 1 km away", () => {
    for (const c of cases.filter(
      (k) => k.routes[0]!.compiled.separableParams.length > 0,
    )) {
      const u = c.routes[0]!;
      const eye = [
        u.eye[0]! + 1000.123456789,
        u.eye[1]! - 250.5,
        u.eye[2]! + 3.25,
      ];
      const uniforms = u.compiled.fillUniforms(u.route, undefined, eye);
      const { perDrawLayout: draw, uniformsLayout: view } = u.compiled;
      for (let a = 0; a < 3; a++) {
        let s = diff(
          u.record,
          draw.fields.out! + 4 * a,
          uniforms,
          view.fields.eye! + 4 * a,
        );
        for (const key of u.compiled.separableParams) {
          s = addMul(
            s,
            uniforms,
            view.fields[`paramParts:${key}`]!,
            u.record,
            draw.fields[`outG:${key}`]! + 4 * a,
          );
        }
        const want = u.eye[a]! - eye[a]!;
        // float32 of a value up to 1 km: half an ulp is 3 × 10⁻⁵ m; the parts add under 10⁻⁷.
        expect(
          Math.abs(value(s) - want),
          `${c.name}, axis ${a}`,
        ).toBeLessThanOrEqual(Math.abs(want) * 2 ** -24 + 1e-7);
      }
    }
  });
});

describe("the center term's helpers", () => {
  it("are the same functions in WGSL and GLSL ES", () => {
    const names = (text: string) =>
      [...text.matchAll(/\b(tg_\w+)\(/g)].map((m) => m[1]).sort();
    expect(names(CENTER_TERM_GLSL)).toEqual(names(CENTER_TERM_WGSL));
  });

  it("have no loops", () => {
    for (const text of [CENTER_TERM_WGSL, CENTER_TERM_GLSL]) {
      expect(text).not.toMatch(/\b(for|while)\s*\(|\bloop\s*\{/);
    }
  });
});
