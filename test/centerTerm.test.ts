// CS-921: a compiled route's center term sums its parts as integers
// (packages/core/src/transform/centerTerm.ts). These tests emulate the
// shader's helpers in Node, with int32 and float32 arithmetic as the GPU
// does them, and hold them against exact answers: the limb product against
// BigInt, and each route case's center term against float64. The GPU's own
// answers are the Lab's (bench/irWgsl.ts and bench/irGlsl.ts).
import { describe, expect, it } from "vitest";
import {
  CENTER_PARTS_WGSL,
  CENTER_TERM_GLSL,
  CENTER_TERM_WGSL,
  centerTermBound,
  centerTermExact,
  fixParts,
  fromFixParts,
  type CenterInputs,
  type PartsAt,
} from "../packages/core/src/transform/centerTerm.ts";
import {
  centerInputsOf,
  INPUTS,
  inputsScaleOf,
} from "../packages/core/src/transform/routeReadback.ts";
import { splitDf64, splitVec3 } from "../packages/core/src/math/transforms.ts";
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
// WGSL's and GLSL ES's round(): to nearest, ties to even.
const roundEven = (x: number) => {
  const r = Math.round(x);
  return Math.abs(x % 1) === 0.5 && r % 2 !== 0 ? r - 1 : r;
};

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
      -(2 ** 30) + 0.877,
      2 ** 30 - 1.25,
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

  it("put a value past 2^30 units, or one that isn't finite, in the rest alone", () => {
    const out = new Float32Array(4);
    fixParts(3e9, out, 0);
    expect(Array.from(out)).toEqual([0, 0, 0, f(3e9)]);
    // 2^30 itself: past the exact range, so F(c) less the eye stays under 2^31.
    fixParts(-(2 ** 30), out, 0);
    expect(Array.from(out)).toEqual([0, 0, 0, -(2 ** 30)]);
    fixParts(Number.NaN, out, 0);
    expect(out[3]).toBeNaN();
  });
});

/** `tg_splitParts`, statement for statement. */
function splitParts(hi: number, lo: number): number[] {
  const w = i32(Math.min(Math.max(hi, -(2 ** 30)), 2 ** 30));
  const k = roundEven(lo * 2 ** 24);
  if (Math.abs(hi) >= 2 ** 30) {
    return [0, 0, 0, f(hi + lo)];
  }
  return [w >> 16, w & 65535, k, f(lo - f(k * UNIT))];
}

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
      2 ** 30 - 40.5,
      -(2 ** 30) + 40.25,
    ]) {
      splitVec3(Float64Array.of(v, 0, 0), hi, 0, lo, 0);
      const parts = splitParts(hi[0]!, lo[0]!);
      expect(fromFixParts(parts)).toBe(hi[0]! + lo[0]!);
      // Past 2^24 the low holds up to half a float32 ulp of the high, 32
      // units under 2^30, so |k| reaches 2^29 there.
      expect(Math.abs(parts[2]!)).toBeLessThanOrEqual(2 ** 29);
    }
  });

  it("puts an eye at or past 2^30 units in the rest alone", () => {
    const hi = new Float32Array(1);
    const lo = new Float32Array(1);
    for (const v of [2 ** 30, -1.5e9 - 0.25, 3e9, -(2 ** 31) - 1000]) {
      splitVec3(Float64Array.of(v, 0, 0), hi, 0, lo, 0);
      expect(splitParts(hi[0]!, lo[0]!)).toEqual([0, 0, 0, f(hi[0]! + lo[0]!)]);
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
        [0, 1, 2].map((a) => {
          const inputs = centerInputsOf(c, i, k, a);
          const eye = c.eyes ? c.eyes[i]![a]! : u.eye[a]!;
          return {
            name: `${c.name}, row ${i}, axis ${a}`,
            inputs,
            map: u.image[a]! - eye,
            scale: inputsScaleOf(inputs, u.image[a]!, eye),
            inputsBound: c.inputs,
          };
        }),
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
    expect(INPUTS).toEqual({ abs: 1e-9, rel: 2 ** -51 });
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

  it("doesn't wrap with F(c) and the eye on either side of the origin past 2^30 units", () => {
    const sides = lanes.filter((l) => l.name.includes("either side"));
    expect(sides.length).toBe(6);
    for (const l of sides) {
      const t = centerTermExact(l.inputs);
      const got = emulate(l.inputs);
      expect(Math.abs(got - t), l.name).toBeLessThanOrEqual(
        centerTermBound(l.inputs, t),
      );
      // x and y are 3 × 10⁹ m, z 2 × 10⁹ m: float32's rounding, not 2³² units.
      expect(Math.abs(t)).toBeGreaterThan(1.9e9);
      expect(Math.abs(got - l.map), l.name).toBeLessThan(2 ** -23 * l.scale);
    }
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

/** `tgc_parts`' line that makes the whole units, as the WGSL has it, emulated. */
function wholeOf(wgsl: string): (w: number, tw: number) => number {
  const line = /let wi = (.+);/.exec(wgsl)?.[1];
  if (line === "i32(w) + i32(tw)") {
    return (w, tw) => (i32(w) + i32(tw)) | 0;
  }
  if (line === "i32(w + tw)") {
    // A float32 add: rounds once |w| passes 2^24.
    return (w, tw) => i32(f(w + tw));
  }
  throw new Error(`tgc_parts: an unknown form of the whole units: ${line}`);
}

/** The compute pass's `tgc_parts`, statement for statement, on a df64 value (hi, lo). */
function tgcParts(hi: number, lo: number, wgsl = CENTER_PARTS_WGSL): number[] {
  const w = roundEven(hi);
  const t = f(f(hi - w) + lo);
  const tw = roundEven(t);
  const rest = f(t - tw);
  const k = roundEven(f(rest * 2 ** 24));
  if (Math.abs(w) >= 2 ** 30) {
    return [0, 0, 0, f(hi + lo)];
  }
  const wi = wholeOf(wgsl)(w, tw);
  return [wi >> 16, wi & 65535, k, f(rest - f(k * UNIT))];
}

describe("the compute pass's parts (tgc_parts)", () => {
  // Past 2^24 a df64 value's low part holds whole units (up to half a
  // float32 ulp of the high: 2 m at 4.2 × 10⁷ m, 16 m at 3.8 × 10⁸ m).
  const values = [
    3e7 + 1.3,
    4.2164e7 + 1.7,
    3.84e8 + 13.4,
    -3.84e8 - 13.4,
    4.2e7 + 0.37,
    -(2 ** 29) - 11.75,
    6378137.123456789,
    -4441151.6187,
    12.5,
    0,
  ];

  it("keeps every whole unit of a df64 value past 2^24, as integers", () => {
    for (const v of values) {
      const [hi, lo] = splitDf64(v);
      const parts = tgcParts(hi, lo);
      expect(Math.abs(parts[2]!)).toBeLessThanOrEqual(2 ** 23);
      expect(Math.abs(parts[3]!)).toBeLessThanOrEqual(2 ** -25);
      // The only rounding left is the low part's add to the high's fraction, under 2⁻²⁵ units.
      expect(Math.abs(fromFixParts(parts) - (hi + lo)), `${v}`).toBeLessThan(
        2 ** -25,
      );
    }
  });

  it("would lose whole units to a float32 add of the whole parts", () => {
    const old = CENTER_PARTS_WGSL.replace(
      /let wi = .+;/,
      "let wi = i32(w + tw);",
    );
    const miss = (v: number) => {
      const [hi, lo] = splitDf64(v);
      return Math.abs(fromFixParts(tgcParts(hi, lo, old)) - (hi + lo));
    };
    // Rounded to nearest: 1 m, 2 m and 13 m off (CS-921's round-3 review).
    expect(miss(3e7 + 1.3)).toBeGreaterThan(0.6);
    expect(miss(4.2164e7 + 1.7)).toBeGreaterThan(1.6);
    expect(miss(3.84e8 + 13.4)).toBeGreaterThan(12);
  });

  it("puts a value past 2^30 units in the rest alone, as fixParts does", () => {
    const [hi, lo] = splitDf64(1.5e9 + 3.25);
    expect(tgcParts(hi, lo)).toEqual([0, 0, 0, f(hi + lo)]);
    const out = new Float32Array(4);
    fixParts(1.5e9 + 3.25, out, 0);
    expect(out[3]).toBe(f(1.5e9 + 3.25));
  });
});

// --- The end's float sum, in any order --------------------------------------

/** A seeded generator in [0, 1). */
function random(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

/** a·b + c rounded once to float32: a fused multiply-add of float32s. */
function fma32(a: number, b: number, c: number): number {
  const p = a * b; // exact: 24 + 24 bits
  const s = p + c;
  const bb = s - p;
  const e = p - (s - bb) + (c - bb); // s + e = p + c exactly (TwoSum)
  const r = f(s);
  if (e === 0 || s === r) {
    return r;
  }
  const d = s - r;
  // s halfway between two float32s: the rest decides the side.
  const other = s + d;
  if (f(other) === other && other !== r) {
    return Math.sign(e) === Math.sign(d) ? other : r;
  }
  return r;
}

interface Leaf {
  /** The leaf's value, or its product's factors (a product relaxed math may fuse into an add). */
  readonly v?: number;
  readonly mul?: readonly [number, number];
}

/**
 * The float32 sum the end makes (`tg_value` with `tg_diff`'s and
 * `tg_addMul`'s rests), in a random binary tree: products rounded alone, or
 * fused into the add above them (`fused`).
 */
function sumTree(leaves: readonly Leaf[], next: () => number, fused: boolean) {
  const pool = [...leaves];
  const valueOf = (l: Leaf) => l.v ?? f(l.mul![0] * l.mul![1]);
  while (pool.length > 1) {
    const i = Math.floor(next() * pool.length);
    const a = pool.splice(i, 1)[0]!;
    const j = Math.floor(next() * pool.length);
    const b = pool.splice(j, 1)[0]!;
    let v: number;
    if (fused && a.mul && next() < 0.8) {
      v = fma32(a.mul[0], a.mul[1], valueOf(b));
    } else if (fused && b.mul && next() < 0.8) {
      v = fma32(b.mul[0], b.mul[1], valueOf(a));
    } else {
      v = f(valueOf(a) + valueOf(b));
    }
    pool.push({ v });
  }
  return valueOf(pool[0]!);
}

/** The end's float leaves for one axis: f32(whole), the fraction, and the rests. */
function leavesOf(x: CenterInputs): Leaf[] {
  let s = diff(x.value.p, x.value.at, x.eye.p, x.eye.at);
  for (const [p, g] of x.terms) {
    s = addMul(s, p.p, p.at, g.p, g.at);
  }
  const q = (s.q + 8388608) | 0;
  const fraction = ((q & 16777215) - 8388608) | 0;
  const out: Leaf[] = [
    { v: f((s.w + (q >> 24)) | 0) },
    { v: fraction * UNIT },
    { v: x.value.p[x.value.at + 3]! },
    { v: -x.eye.p[x.eye.at + 3]! },
  ];
  for (const [p, g] of x.terms) {
    const pw = (Math.imul(i32(p.p[p.at]!), 65536) + i32(p.p[p.at + 1]!)) | 0;
    const gw = (Math.imul(i32(g.p[g.at]!), 65536) + i32(g.p[g.at + 1]!)) | 0;
    const pf = f(i32(p.p[p.at + 2]!) * UNIT + p.p[p.at + 3]!);
    const gf = f(i32(g.p[g.at + 2]!) * UNIT + g.p[g.at + 3]!);
    out.push(
      { mul: [f(pw), g.p[g.at + 3]!] },
      { mul: [p.p[p.at + 3]!, f(gw)] },
      { mul: [pf, gf] },
    );
  }
  return out;
}

describe("the end's float32 sum, in any order relaxed math may make", () => {
  // Worst-case parts, written directly (float64 can't hold a value near 2^30
  // to 2^-25): wholes near 2^30, fractions near ±1/2, rests ±2^-25.
  const next = random(921);
  const pick = (n: number) => Math.floor(next() * n);
  const sign = () => (next() < 0.5 ? -1 : 1);
  const parts = (whole: number, k: number, r: number): PartsAt => {
    const h = Math.floor(whole / 65536);
    return { p: Float32Array.of(h, whole - 65536 * h, k, r), at: 0 };
  };
  const fractionParts = () =>
    [
      sign() * (2 ** 23 - pick(4)),
      sign() * 2 ** -25 * (next() < 0.7 ? 1 : next()),
    ] as const;
  const big = () => sign() * (2 ** 30 - 1 - pick(4096));
  const cases: CenterInputs[] = [];
  while (cases.length < 3000) {
    const [ka, ra] = fractionParts();
    const [kb, rb] = fractionParts();
    const near = next() < 0.4;
    const wa = big();
    // The eye near the value (|T| small) or anywhere under 2^30.
    const wb = near ? wa + pick(5) - 2 : big();
    const terms: [PartsAt, PartsAt][] = [];
    for (let j = pick(4); j > 0; j--) {
      const [kp, rp] = fractionParts();
      const [kg, rg] = fractionParts();
      // A whole parameter near 2^30 times a derivative under 2, or both under 2^14.
      const large = next() < 0.5;
      const wp = large ? big() : sign() * pick(2 ** 14);
      const wg = large ? pick(3) - 1 : sign() * pick(2 ** 14);
      terms.push([parts(wp, kp, rp), parts(wg, kg, rg)]);
    }
    const x: CenterInputs = {
      value: parts(wa, ka, ra),
      eye: parts(wb, kb, rb),
      terms,
    };
    // The exact range: the term's whole units under 2^31.
    if (Math.abs(centerTermExact(x)) < 2 ** 31 - 2 ** 12) {
      cases.push(x);
    }
  }

  it("stays within the derived bound over random summation trees, with and without fused multiply-adds", () => {
    let worst = 0;
    for (const x of cases) {
      const t = centerTermExact(x);
      const bound = centerTermBound(x, t);
      const leaves = leavesOf(x);
      for (let tree = 0; tree < 16; tree++) {
        const fused = tree % 2 === 1;
        const err = Math.abs(sumTree(leaves, next, fused) - t);
        expect(err, `|T| ${t}, ${x.terms.length} terms`).toBeLessThanOrEqual(
          bound,
        );
        worst = Math.max(worst, err / bound);
      }
    }
    // The floor: the trees come within a fifth of the bound (0.226,
    // measured 2026-11-22), so a derivation 5 times too small would fail.
    expect(worst).toBeGreaterThan(0.2);
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
