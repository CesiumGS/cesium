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
  centerTermBound,
  centerTermExact,
  fixParts,
  fromFixParts,
  type CenterInputs,
} from "../packages/core/src/transform/centerTerm.ts";
import {
  centerInputsOf,
  INPUTS,
} from "../packages/core/src/transform/routeReadback.ts";
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

/** The WGSL's center term for one axis, emulated. */
function emulate(x: CenterInputs): number {
  let s = diff(x.value.p, x.value.at, x.eye.p, x.eye.at);
  for (const [p, g] of x.terms) {
    s = addMul(s, p.p, p.at, g.p, g.at);
  }
  return value(s);
}

describe("the center term, emulated in int32 and float32", () => {
  // Every route case, the eye-away cases and the float32 one past 2^31 m
  // included, at every row and axis.
  const cases = routeCases();
  const lanes = cases.flatMap((c) =>
    c.rows.flatMap((_, i) =>
      c.routes.flatMap((u, k) =>
        [0, 1, 2].map((a) => ({
          name: `${c.name}, row ${i}, axis ${a}`,
          inputs: centerInputsOf(c, i, k, a),
          map: u.image[a]! - (c.eyes ? c.eyes[i]![a]! : u.eye[a]!),
          scale:
            Math.abs(u.image[a]!) +
            Math.abs(c.eyes ? c.eyes[i]![a]! : u.eye[a]!),
          inputsBound: c.inputs,
        })),
      ),
    ),
  );

  it("is within the derived bound of its parts' exact value everywhere", () => {
    let worst = 0;
    let away = 0;
    for (const l of lanes) {
      const t = centerTermExact(l.inputs);
      const bound = centerTermBound(l.inputs, t);
      const err = Math.abs(emulate(l.inputs) - t);
      expect(err, l.name).toBeLessThanOrEqual(bound);
      worst = Math.max(worst, err / bound);
      away += Math.abs(t) > 1 ? 1 : 0;
    }
    expect(away).toBeGreaterThan(100);
    expect(worst).toBeGreaterThan(0);
  });

  it("reads parts whose exact value is the float64 map's, to the inputs bound", () => {
    for (const l of lanes) {
      const t = centerTermExact(l.inputs);
      expect(Math.abs(t - l.map), l.name).toBeLessThanOrEqual(
        l.inputsBound.abs + l.inputsBound.rel * l.scale,
      );
    }
    expect(INPUTS).toEqual({ abs: 1e-7, rel: 0 });
  });

  it("falls back to float32 past 2^31 units, and the bound still holds against the parts", () => {
    const far = lanes.filter((l) => l.name.includes("past 2^31"));
    expect(far.length).toBe(6);
    // x (6 × 10⁹ m) and z (−2.6 × 10⁹ m) are float32 in the rest; y isn't.
    const rests = far.map((l) => l.inputs.value.p[l.inputs.value.at + 3]!);
    expect(Math.abs(rests[0]!)).toBeGreaterThan(2 ** 31);
    expect(Math.abs(rests[1]!)).toBeLessThan(1);
    expect(Math.abs(rests[2]!)).toBeGreaterThan(2 ** 31);
    let cost = 0;
    for (const l of far) {
      const t = centerTermExact(l.inputs);
      expect(Math.abs(emulate(l.inputs) - t)).toBeLessThanOrEqual(
        centerTermBound(l.inputs, t),
      );
      cost = Math.max(cost, Math.abs(t - l.map));
    }
    // The float32 parts miss the map by up to 2⁻²⁴ of the values (about 360 m each at 6 × 10⁹ m).
    expect(cost).toBeGreaterThan(1);
  });

  it("states the bound's figures at the Earth's surface", () => {
    const parts = (v: number) => {
      const out = new Float32Array(4);
      fixParts(v, out, 0);
      return { p: out, at: 0 };
    };
    const zero = parts(0);
    // No separable parameter, the eye at the image: a few float32 rests.
    const none: CenterInputs = {
      value: parts(4441151.6187),
      eye: parts(4441151.6187),
      terms: [],
    };
    expect(centerTermBound(none, 0)).toBeLessThan(1e-13);
    // Flatten's 150 m, an integer: 10⁻¹¹ m.
    const flat: CenterInputs = {
      value: zero,
      eye: zero,
      terms: [[parts(150), parts(-0.8123456789)]],
    };
    expect(centerTermBound(flat, 0)).toBeLessThan(2e-11);
    // A parameter and a derivative under 10⁴ m with fractions: 5.4 × 10⁻⁷ m.
    const worst = 0.5 - 2 ** -25;
    const frac: CenterInputs = {
      value: zero,
      eye: zero,
      terms: [[parts(9999 + worst), parts(9999 + worst)]],
    };
    expect(centerTermBound(frac, 0)).toBeGreaterThan(5e-7);
    expect(centerTermBound(frac, 0)).toBeLessThan(5.5e-7);
    // The eye d away, one parameter: about 5.4 × 10⁻⁷·d.
    for (const d of [10, 1e3, 1e5, 1e6]) {
      const b = centerTermBound(flat, d);
      expect(b / d).toBeGreaterThan(5.3e-7);
      expect(b / d).toBeLessThan(6.3e-7);
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
