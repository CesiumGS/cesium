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
  centerTermWide,
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
  /** The same sum in float32 alone, and whether an integer sum or product wrapped. */
  v: number;
  wide: boolean;
}

// The WGSL helpers, statement for statement: `| 0` and Math.imul are int32,
// Math.fround float32.
const i32 = (x: number) => Math.trunc(x) | 0;
// WGSL's and GLSL ES's round(): to nearest, ties to even.
const roundEven = (x: number) => {
  const r = Math.round(x);
  return Math.abs(x % 1) === 0.5 && r % 2 !== 0 ? r - 1 : r;
};
const clamp = (x: number, r: number) => Math.min(Math.max(x, -r), r);
const wraps = (a: number, b: number, s: number) => ((a ^ s) & (b ^ s)) < 0;
const notFinite = (x: number) => !Number.isFinite(x);

/**
 * `tg_diff`'s test for a wrapped difference, as the WGSL has it: the sign
 * test, or none (the mutation that shows the sign test is needed).
 */
function diffTestOf(
  wgsl: string,
): (aw: number, bw: number, w: number) => boolean {
  const line = /fn tg_diff[^]*?let wide = (.+);/.exec(wgsl)?.[1];
  if (line === "((aw ^ bw) & (aw ^ w)) < 0") {
    return (aw, bw, w) => ((aw ^ bw) & (aw ^ w)) < 0;
  }
  if (line === "false") {
    return () => false;
  }
  throw new Error(`tg_diff: an unknown test for a wrap: ${line}`);
}

type Env = Readonly<Record<string, number | boolean>>;

/** The `||` terms of a wide test, as the shader text has them. */
function wideTermsOf(text: string, fn: "tg_addMul" | "tg_value"): string[] {
  const pattern =
    fn === "tg_addMul"
      ? /tg_addMul\([^]*?(?:let|bool) wide = (.+);/
      : /tg_value\([^]*?return (?:select\(exact, s\.v, (.+)\)|(.+) \? s\.v : exact);/;
  const m = pattern.exec(text);
  const line = m?.[1] ?? m?.[2];
  if (!line) {
    throw new Error(`${fn}: no wide test`);
  }
  return line.split(" || ");
}

/**
 * `tg_addMul`'s or `tg_value`'s wide test, as the WGSL has it, emulated
 * term by term over the shader's names: a term deleted from the shader is
 * deleted here too.
 */
function wideTestOf(
  wgsl: string,
  fn: "tg_addMul" | "tg_value",
): (env: Env) => boolean {
  const tests = wideTermsOf(wgsl, fn).map((term): ((env: Env) => boolean) => {
    if (term === "abs(f32(pw) * f32(gw)) >= 2147483136.0") {
      return (e) =>
        Math.abs(f(f(e.pw as number) * f(e.gw as number))) >= 2147483136;
    }
    if (term === "s.wide") {
      return (e) => e["s.wide"] as boolean;
    }
    const m = /^tg_wraps\(([\w.]+), ([\w.]+), ([\w.]+)\)$/.exec(term);
    if (m) {
      const [a, b, sum] = [m[1]!, m[2]!, m[3]!];
      for (const name of [a, b, sum]) {
        if (!(name in WIDE_NAMES[fn])) {
          throw new Error(`${fn}: an unknown name in its wide test: ${name}`);
        }
      }
      return (e) => wraps(e[a] as number, e[b] as number, e[sum] as number);
    }
    throw new Error(`${fn}: an unknown term in its wide test: ${term}`);
  });
  return (env) => tests.some((t) => t(env));
}

/** The names each wide test may read. */
const WIDE_NAMES = {
  tg_addMul: {
    "s.w": 0,
    pg: 0,
    w0: 0,
    w1: 0,
    w2: 0,
    w3: 0,
    "x.x": 0,
    "y.x": 0,
    c: 0,
  },
  tg_value: { "s.w": 0, c: 0, w: 0 },
} as const;

const whole = (v: ArrayLike<number>, at: number) =>
  (Math.imul(i32(v[at]!), 65536) + i32(v[at + 1]!)) | 0;
/** `tg_float`: a value's parts as one float32. */
const float = (v: ArrayLike<number>, at: number) =>
  f(f(whole(v, at)) + f(f(v[at + 2]! * UNIT) + v[at + 3]!));
function diff(
  a: ArrayLike<number>,
  ai: number,
  b: ArrayLike<number>,
  bi: number,
  wgsl = CENTER_TERM_WGSL,
): Sum {
  const aw = whole(a, ai);
  const bw = whole(b, bi);
  const w = (aw - bw) | 0;
  return {
    w,
    q: (i32(a[ai + 2]!) - i32(b[bi + 2]!)) | 0,
    f: f(a[ai + 3]! - b[bi + 3]!),
    v: f(float(a, ai) - float(b, bi)),
    wide: diffTestOf(wgsl)(aw, bw, w),
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
  wgsl = CENTER_TERM_WGSL,
): Sum {
  const [ph, pl, pk] = [i32(p[pi]!), i32(p[pi + 1]!), i32(p[pi + 2]!)];
  const [gh, gl, gk] = [i32(g[gi]!), i32(g[gi + 1]!), i32(g[gi + 2]!)];
  const pw = (Math.imul(ph, 65536) + pl) | 0;
  const gw = (Math.imul(gh, 65536) + gl) | 0;
  const x = wk(ph, pl, gk);
  const y = wk(gh, gl, pk);
  const q = (s.q + x[1] + y[1]) | 0;
  const c = q >> 24;
  const pf = f(f(pk * UNIT) + p[pi + 3]!);
  const gf = f(f(gk * UNIT) + g[gi + 3]!);
  const pg = Math.imul(pw, gw);
  const w0 = (s.w + pg) | 0;
  const w1 = (w0 + x[0]) | 0;
  const w2 = (w1 + y[0]) | 0;
  const w3 = (w2 + c) | 0;
  const wide = wideTestOf(
    wgsl,
    "tg_addMul",
  )({
    pw,
    gw,
    "s.w": s.w,
    pg,
    w0,
    w1,
    w2,
    w3,
    "x.x": x[0],
    "y.x": y[0],
    c,
  });
  const rests = f(
    f(f(f(pw) * g[gi + 3]!) + f(p[pi + 3]! * f(gw))) + f(pf * gf),
  );
  return {
    w: w3,
    q: q & 16777215,
    f: f(s.f + rests),
    v: f(s.v + f(float(p, pi) * float(g, gi))),
    wide: s.wide || wide,
  };
}
/** Whether `tg_value` takes the float32 sum, as the WGSL has its test. */
function valueWide(s: Sum, wgsl = CENTER_TERM_WGSL): boolean {
  const c = ((s.q + 8388608) | 0) >> 24;
  const w = (s.w + c) | 0;
  return wideTestOf(wgsl, "tg_value")({ "s.wide": s.wide, "s.w": s.w, c, w });
}
function value(s: Sum, wgsl = CENTER_TERM_WGSL): number {
  const q = (s.q + 8388608) | 0;
  const fraction = ((q & 16777215) - 8388608) | 0;
  const c = q >> 24;
  const exact = f(f((s.w + c) | 0) + f(f(fraction * UNIT) + s.f));
  return valueWide(s, wgsl) ? s.v : exact;
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

  it("put a value whose whole units leave int32's range, or one that isn't finite, in the rest alone", () => {
    const out = new Float32Array(4);
    fixParts(3e9, out, 0);
    expect(Array.from(out)).toEqual([0, 0, 0, f(3e9)]);
    // 2^31 itself, and under -2^31: outside int32's range.
    fixParts(2 ** 31, out, 0);
    expect(Array.from(out)).toEqual([0, 0, 0, 2 ** 31]);
    fixParts(-(2 ** 31) - 1, out, 0);
    expect(Array.from(out)).toEqual([0, 0, 0, -(2 ** 31)]);
    // -2^31 is an int32: exact.
    fixParts(-(2 ** 31), out, 0);
    expect(Array.from(out)).toEqual([-32768, 0, 0, 0]);
    for (const v of [Number.NaN, Infinity, -Infinity]) {
      fixParts(v, out, 0);
      expect(Array.from(out.subarray(0, 3))).toEqual([0, 0, 0]);
      expect(
        Object.is(out[3], v) || (Number.isNaN(v) && Number.isNaN(out[3])),
      ).toBe(true);
    }
  });
});

/** `tg_splitParts`, statement for statement. */
function splitParts(hi: number, lo: number): number[] {
  const hc = clamp(hi, 2 ** 30);
  const lw = roundEven(lo);
  const rest = f(lo - lw);
  const k = roundEven(f(rest * 2 ** 24));
  const a = i32(hc);
  const b = (i32(clamp(f(hi - hc), 2 ** 30)) + i32(clamp(lw, 2 ** 24))) | 0;
  const w = (a + b) | 0;
  const wide =
    wraps(a, b, w) ||
    Math.abs(hi) > 2 ** 31 ||
    Math.abs(lo) > 2 ** 24 ||
    notFinite(hi) ||
    notFinite(lo);
  if (wide) {
    return [0, 0, 0, f(hi + lo)];
  }
  return [w >> 16, w & 65535, k, f(rest - f(k * UNIT))];
}

/** A value's parts as `fixParts` writes them. */
function cpuParts(v: number): number[] {
  const out = new Float32Array(4);
  fixParts(v, out, 0);
  return Array.from(out);
}

/** A value as `splitVec3` splits it, then as `tg_splitParts` reads it. */
function eyeParts(v: number): number[] {
  const hi = new Float32Array(1);
  const lo = new Float32Array(1);
  splitVec3(Float64Array.of(v, 0, 0), hi, 0, lo, 0);
  return splitParts(hi[0]!, lo[0]!);
}

/** Whether a value's parts are the fallback: its float32 alone. */
const fellBack = (parts: readonly number[]) =>
  parts[0] === 0 && parts[1] === 0 && parts[2] === 0 && Math.abs(parts[3]!) > 1;

describe("a split position as the center term's parts (tg_splitParts)", () => {
  it("carries splitVec3's whole-meter high and its low exactly, up to int32's range", () => {
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
      2 ** 30 - 20,
      2 ** 30,
      -(2 ** 30) - 20,
      1.5e9 + 63,
      1.5e9 + 0.5,
      -1.5e9 - 0.25,
      2 ** 31 - 1,
      2 ** 31 - 20.75,
      -(2 ** 31) + 1,
      -(2 ** 31),
    ]) {
      const hi = new Float32Array(1);
      const lo = new Float32Array(1);
      splitVec3(Float64Array.of(v, 0, 0), hi, 0, lo, 0);
      const parts = splitParts(hi[0]!, lo[0]!);
      expect(fromFixParts(parts), `${v}`).toBe(hi[0]! + lo[0]!);
      // The low's whole units go to the whole units, so k is fixParts' size.
      expect(Math.abs(parts[2]!)).toBeLessThanOrEqual(2 ** 23);
      expect(Math.abs(parts[3]!)).toBeLessThanOrEqual(2 ** -25);
    }
  });

  it("puts an eye whose whole units leave int32's range, or that isn't finite, in the rest alone", () => {
    for (const v of [
      2 ** 31,
      2 ** 31 + 20,
      -(2 ** 31) - 1,
      3e9,
      -(2 ** 31) - 1000,
      1e12,
    ]) {
      const hi = new Float32Array(1);
      const lo = new Float32Array(1);
      splitVec3(Float64Array.of(v, 0, 0), hi, 0, lo, 0);
      expect(splitParts(hi[0]!, lo[0]!), `${v}`).toEqual([
        0,
        0,
        0,
        f(hi[0]! + lo[0]!),
      ]);
    }
    // NaN and infinity, in either half: (0, 0, 0, hi + lo), as fixParts writes them.
    for (const [hi, lo] of [
      [Number.NaN, 0],
      [0, Number.NaN],
      [6378137, Number.NaN],
      [Infinity, 0],
      [-Infinity, 0.25],
    ] as const) {
      const parts = splitParts(hi, lo);
      expect(parts.slice(0, 3)).toEqual([0, 0, 0]);
      expect(parts[3]).toBe(f(hi + lo));
    }
  });

  it("decides exact or fallback as fixParts does, within 64 units of 2^31 too", () => {
    // Just under 2^31 a float32 high rounds up to 2^31 itself: round 3's GPU
    // test on the high fell back there while fixParts stayed exact.
    for (const v of [
      2 ** 30 - 20,
      2 ** 30,
      2 ** 31 - 1,
      2 ** 31 - 20,
      2 ** 31 - 63.25,
      2 ** 31 - 64.25,
      2 ** 31 - 100,
      2 ** 31,
      2 ** 31 + 0.25,
      2 ** 31 + 63,
      -(2 ** 31) + 20,
      -(2 ** 31),
      -(2 ** 31) - 1,
      -(2 ** 31) - 40,
    ]) {
      const cpu = cpuParts(v);
      const gpu = eyeParts(v);
      expect(fellBack(gpu), `${v}`).toBe(fellBack(cpu));
      if (!fellBack(cpu)) {
        expect(gpu.slice(0, 2), `${v}`).toEqual(cpu.slice(0, 2));
        expect(fromFixParts(gpu)).toBe(fromFixParts(cpu));
      }
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

/** The WGSL's center term for one axis, emulated, and whether it was wide. */
function emulateSum(x: CenterInputs, wgsl = CENTER_TERM_WGSL): Sum {
  let s = diff(x.value.p, x.value.at, x.eye.p, x.eye.at, wgsl);
  for (const [p, g] of x.terms) {
    s = addMul(s, p.p, p.at, g.p, g.at, wgsl);
  }
  return s;
}
const emulate = (x: CenterInputs, wgsl = CENTER_TERM_WGSL): number =>
  value(emulateSum(x, wgsl), wgsl);
/** Whether the emulation takes the float32 sum, as tg_value decides. */
const emulateWide = (x: CenterInputs, wgsl = CENTER_TERM_WGSL): boolean =>
  valueWide(emulateSum(x, wgsl), wgsl);

/** A value's parts, for a term written by hand. */
function partsOf(v: number): PartsAt {
  const out = new Float32Array(4);
  fixParts(v, out, 0);
  return { p: out, at: 0 };
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

  it("decides wide as the shader does, on every lane", () => {
    let wide = 0;
    for (const l of lanes) {
      expect(centerTermWide(l.inputs), l.name).toBe(emulateWide(l.inputs));
      wide += emulateWide(l.inputs) ? 1 : 0;
    }
    // The either-side case's x and y, at both eyes.
    expect(wide).toBe(4);
  });

  it("doesn't wrap with F(c) and the eye on either side of the origin, 3 × 10^9 m apart", () => {
    const sides = lanes.filter((l) => l.name.includes("either side"));
    expect(sides.length).toBe(6);
    for (const l of sides) {
      const t = centerTermExact(l.inputs);
      const got = emulate(l.inputs);
      expect(Math.abs(got - t), l.name).toBeLessThanOrEqual(
        centerTermBound(l.inputs, t),
      );
      // x and y are 3 × 10⁹ m, past 2³¹ (wide: float32's rounding, not 2³²
      // units); z is 2 × 10⁹ m, under 2³¹, and exact.
      expect(Math.abs(t)).toBeGreaterThan(1.9e9);
      expect(Math.abs(got - l.map), l.name).toBeLessThan(2 ** -23 * l.scale);
      expect(centerTermWide(l.inputs), l.name).toBe(Math.abs(t) > 2 ** 31);
    }
  });

  it("is exact for F(c) and the eye 62.5 m apart near 1.5 × 10^9 m (CS-1096 A)", () => {
    const near = lanes.filter((l) => l.name.includes("near 1.5"));
    expect(near.length).toBe(9);
    for (const l of near) {
      expect(centerTermWide(l.inputs)).toBe(false);
      // Every term is a float32, and the integer sum gives it exactly.
      expect(emulate(l.inputs), l.name).toBe(centerTermExact(l.inputs));
      expect(emulate(l.inputs), l.name).toBe(l.map);
    }
    // The review's case: F(c) 1.5 × 10⁹ + 63 m, the eye 1.5 × 10⁹ + 0.5 m.
    const x: CenterInputs = {
      value: partsOf(1.5e9 + 63),
      eye: partsOf(1.5e9 + 0.5),
      terms: [],
    };
    expect(emulate(x)).toBe(62.5);
    expect(near[0]!.map).toBe(62.5);
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

describe("the center term at int32's edges (CS-1096 A)", () => {
  const term = (a: number, b: number, terms: [number, number][] = []) => ({
    value: partsOf(a),
    eye: partsOf(b),
    terms: terms.map(([p, g]) => [partsOf(p), partsOf(g)] as const),
  });
  const within = (x: CenterInputs) => {
    const t = centerTermExact(x);
    const got = emulate(x);
    expect(Math.abs(got - t)).toBeLessThanOrEqual(centerTermBound(x, t));
    expect(centerTermWide(x)).toBe(emulateWide(x));
    return { t, got };
  };

  it("is exact at 2^30 - 20, 2^30 and 2^31 - 1 units", () => {
    for (const v of [2 ** 30 - 20, 2 ** 30, 2 ** 31 - 1]) {
      for (const d of [0, 0.5, 62.5, 1234.25]) {
        // The parts write each exactly (fixParts, tg_splitParts, tgc_parts).
        expect(fromFixParts(cpuParts(v))).toBe(v);
        expect(fromFixParts(eyeParts(v))).toBe(v);
        const [hi, lo] = splitDf64(v);
        expect(fromFixParts(tgcParts(hi, lo))).toBe(v);
        // F(c) at v, the eye d below it: the term is d, exactly.
        const x = term(v, v - d);
        expect(centerTermWide(x)).toBe(false);
        expect(emulate(x), `${v}, ${d}`).toBe(d);
      }
    }
  });

  it("falls back for F(c) and the eye 1.5 × 10^9 m either side of the origin, and doesn't wrap", () => {
    for (const [a, b] of [
      [1.5e9, -1.5e9],
      [-1.5e9 - 0.25, 1.5e9 + 63],
      [2 ** 31 - 1, -1],
      [-(2 ** 31), 1],
    ]) {
      const x = term(a!, b!);
      // Both values are exact; their difference isn't an int32.
      expect(fellBack(cpuParts(a!)) || fellBack(cpuParts(b!))).toBe(false);
      expect(centerTermWide(x)).toBe(true);
      const { t, got } = within(x);
      expect(Math.sign(got)).toBe(Math.sign(t));
      expect(Math.abs(got - t)).toBeLessThan(2 ** -22 * Math.abs(t));
    }
    // Without tg_diff's sign test, the first wraps by 2^32 units.
    const x = term(1.5e9, -1.5e9);
    const unguarded = CENTER_TERM_WGSL.replace(
      /(fn tg_diff[^]*?let wide = ).+;/,
      "$1false;",
    );
    expect(emulate(x, unguarded)).toBe(3e9 - 2 ** 32);
  });

  it("guards the total term: F(c) - eye = 2^31 - 2, and p·g = 2, is 2^31", () => {
    const x = term(2 ** 30 - 1, -(2 ** 30 - 1), [[2, 1]]);
    expect(centerTermExact(x)).toBe(2 ** 31);
    expect(centerTermWide(x)).toBe(true);
    const { got } = within(x);
    expect(got).toBe(2 ** 31);
    // The bound is the wide one, not the integer sum's 1,152.
    expect(centerTermBound(x)).toBeGreaterThan(1e3);
    // One less is in range, and exact.
    const y = term(2 ** 30 - 1, -(2 ** 30 - 1), [[1, 1]]);
    expect(centerTermWide(y)).toBe(false);
    expect(emulate(y)).toBe(f(2 ** 31 - 1));
  });

  it("guards each sum of whole units, and a product of 2^31 or more", () => {
    // s·G at 2^31, and just past the guard's float32 band, wraps no more.
    for (const [p, g, wide] of [
      [65536, 32768, true],
      [46341, 46341, true],
      [-46341, 46341, true],
      [46340, 46340, false],
      [65535, 32768, false],
    ] as const) {
      const x = term(0, 0, [[p, g]]);
      expect(centerTermWide(x), `${p}·${g}`).toBe(wide);
      const { t, got } = within(x);
      expect(t).toBe(p * g);
      expect(Math.sign(got)).toBe(Math.sign(t));
      if (!wide) {
        expect(got).toBe(f(t));
      }
    }
    // Two in-range products whose sum isn't.
    const x = term(0, 0, [
      [2 ** 15, 2 ** 15],
      [2 ** 30, 1],
    ]);
    expect(centerTermWide(x)).toBe(true);
    within(x);
  });

  // One case for each term of tg_addMul's and tg_value's wide tests, which
  // only that term catches.
  const guarded: [string, CenterInputs][] = [
    // p·g is 2^31: the product wraps to -2^31, and 0 + -2^31 doesn't wrap.
    ["abs(f32(pw) * f32(gw)) >= 2147483136.0", term(0, 0, [[65536, 32768]])],
    // F(c) - eye = 2^31 - 2, then p·g = 2.
    ["tg_wraps(s.w, pg, w0)", term(2 ** 30 - 1, -(2 ** 30 - 1), [[2, 1]])],
    // Then p's whole units times g's 2^-24 units: 2^20 · 0.25.
    [
      "tg_wraps(w0, x.x, w1)",
      term(2 ** 30 - 1, -(2 ** 30 - 1), [[2 ** 20, 0.25]]),
    ],
    // And g's whole units times p's 2^-24 units.
    [
      "tg_wraps(w1, y.x, w2)",
      term(2 ** 30 - 1, -(2 ** 30 - 1), [[0.25, 2 ** 20]]),
    ],
    // F(c) - eye = 2^31 - 1 + 0.75, then p·g = 0.25: the 2^-24 units carry 1.
    [
      "tg_wraps(w2, c, w3)",
      term(2 ** 30 + 0.375, -(2 ** 30 - 1) - 0.375, [[0.25, 1]]),
    ],
    // F(c) - eye = 2^31 - 1 + 0.75: tg_value's rounding carries 1.
    ["tg_wraps(s.w, c, w)", term(2 ** 30 + 0.375, -(2 ** 30 - 1) - 0.375)],
    // A difference that wrapped, then a parameter that doesn't.
    ["s.wide", term(1.5e9, -1.5e9, [[2, 3]])],
  ];

  it("catches each guarded wrap, and each term of the wide tests is needed", () => {
    for (const [name, x] of guarded) {
      expect(centerTermWide(x), name).toBe(true);
      const t = centerTermExact(x);
      expect(Math.abs(emulate(x) - t), name).toBeLessThanOrEqual(
        centerTermBound(x, t),
      );
      // The shader without that one term: the case wraps by 2^32 units.
      const fn =
        name === "tg_wraps(s.w, c, w)" || name === "s.wide"
          ? "tg_value"
          : "tg_addMul";
      const terms = wideTermsOf(CENTER_TERM_WGSL, fn);
      expect(terms, name).toContain(name);
      const kept = terms.filter((k) => k !== name).join(" || ");
      const without = CENTER_TERM_WGSL.replace(
        terms.join(" || "),
        kept === "" ? "false" : kept,
      );
      expect(Math.abs(emulate(x, without) - t), name).toBeGreaterThan(2 ** 31);
    }
    // Every term has its case.
    const named = new Set(guarded.map(([n]) => n));
    for (const fn of ["tg_addMul", "tg_value"] as const) {
      for (const k of wideTermsOf(CENTER_TERM_WGSL, fn)) {
        expect(named.has(k), k).toBe(true);
      }
    }
  });

  it("gives NaN for a value that isn't finite, as fixParts writes it", () => {
    const x = term(Number.NaN, 6378137.25, [[150, 0.5]]);
    expect(emulate(x)).toBeNaN();
    expect(emulate(term(6378137.25, Number.NaN))).toBeNaN();
    expect(
      emulate({
        ...term(0, 0),
        value: { p: splitParts(Number.NaN, 0), at: 0 },
      }),
    ).toBeNaN();
  });
});

/** `tgc_parts`' line that makes the whole units, as the WGSL has it, emulated. */
function wholeOf(
  wgsl: string,
): (w: number, tw: number, a: number, b: number) => number {
  const line = /let wi = (.+);/.exec(wgsl)?.[1];
  if (line === "a + b") {
    return (_w, _tw, a, b) => (a + b) | 0;
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
  const wc = clamp(w, 2 ** 30);
  const a = i32(wc);
  const b = (i32(clamp(f(w - wc), 2 ** 30)) + i32(clamp(tw, 2 ** 24))) | 0;
  const wi = wholeOf(wgsl)(w, tw, a, b);
  const wide =
    wraps(a, b, wi) ||
    Math.abs(w) > 2 ** 31 ||
    Math.abs(tw) > 2 ** 24 ||
    notFinite(hi) ||
    notFinite(lo);
  if (wide) {
    return [0, 0, 0, f(hi + lo)];
  }
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

  it("decides exact or fallback as fixParts does, and puts NaN in the rest alone", () => {
    for (const v of [
      1.5e9 + 3.25,
      2 ** 31 - 1,
      2 ** 31 - 20.5,
      2 ** 31,
      2 ** 31 + 40,
      -(2 ** 31),
      -(2 ** 31) - 1,
      3e9,
    ]) {
      const [hi, lo] = splitDf64(v);
      const gpu = tgcParts(hi, lo);
      const cpu = cpuParts(v);
      expect(fellBack(gpu), `${v}`).toBe(fellBack(cpu));
      expect(fromFixParts(gpu), `${v}`).toBe(
        fellBack(cpu) ? f(hi + lo) : hi + lo,
      );
    }
    for (const [hi, lo] of [
      [Number.NaN, 0],
      [1, Number.NaN],
      [Infinity, 0],
    ] as const) {
      const parts = tgcParts(hi, lo);
      expect(parts.slice(0, 3)).toEqual([0, 0, 0]);
      expect(parts[3]).toBe(f(hi + lo));
    }
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

/** The wide sum's float leaves (`TgFix.v`): A's and B's three parts, and each ṽ(P)·ṽ(G). */
function wideLeavesOf(x: CenterInputs): Leaf[] {
  const of = (v: PartsAt, sign: number): Leaf[] => [
    { v: sign * f(whole(v.p, v.at)) },
    { v: sign * v.p[v.at + 2]! * UNIT },
    { v: sign * v.p[v.at + 3]! },
  ];
  return [
    ...of(x.value, 1),
    ...of(x.eye, -1),
    ...x.terms.map(([p, g]): Leaf => ({
      mul: [float(p.p, p.at), float(g.p, g.at)],
    })),
  ];
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
  // Ten times the attempts the cases need, so a centerTermWide that is
  // always one answer fails the count below instead of looping forever.
  for (let tries = 0; cases.length < 3000 && tries < 30000; tries++) {
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
    // The integer sum's cases: no sum of whole units wraps.
    if (!centerTermWide(x)) {
      cases.push(x);
    }
  }
  // The float32 sum's (wide) cases: F(c) and the eye near ±2^31 on either
  // side of the origin, with the same parameters.
  const wideCases: CenterInputs[] = [];
  for (let tries = 0; wideCases.length < 1000 && tries < 10000; tries++) {
    const [ka, ra] = fractionParts();
    const [kb, rb] = fractionParts();
    const wa = sign() * (2 ** 31 - 1 - pick(2 ** 30));
    const wb = -Math.sign(wa) * (2 ** 31 - 1 - pick(2 ** 30));
    const terms: [PartsAt, PartsAt][] = [];
    for (let j = pick(4); j > 0; j--) {
      const [kp, rp] = fractionParts();
      const [kg, rg] = fractionParts();
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
    if (centerTermWide(x)) {
      wideCases.push(x);
    }
  }

  it("makes its cases within its attempts", () => {
    expect(cases.length).toBe(3000);
    expect(wideCases.length).toBe(1000);
  });

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
    // The trees reach 0.226 of the bound (measured 2026-11-23), so a bound
    // more than 4.4 times too small fails the check above: 5 times does,
    // 4 times doesn't. The floor, 0.15, fails a bound more than 1.5 times
    // too loose.
    expect(worst).toBeGreaterThan(0.15);
  });

  it("stays within the wide bound over random summation trees of the float32 sum", () => {
    let worst = 0;
    for (const x of wideCases) {
      const t = centerTermExact(x);
      const bound = centerTermBound(x, t);
      expect(Math.abs(emulate(x) - t)).toBeLessThanOrEqual(bound);
      const leaves = wideLeavesOf(x);
      for (let tree = 0; tree < 16; tree++) {
        const err = Math.abs(sumTree(leaves, next, tree % 2 === 1) - t);
        expect(err, `|T| ${t}, ${x.terms.length} terms`).toBeLessThanOrEqual(
          bound,
        );
        worst = Math.max(worst, err / bound);
      }
    }
    // 0.131 of the bound (measured 2026-11-23): the floor fails a bound
    // more than 2.6 times too loose.
    expect(worst).toBeGreaterThan(0.05);
  });
});

describe("the center term's helpers", () => {
  it("are the same functions in WGSL and GLSL ES", () => {
    const names = (text: string) =>
      [...text.matchAll(/\b(tg_\w+)\(/g)].map((m) => m[1]).sort();
    expect(names(CENTER_TERM_GLSL)).toEqual(names(CENTER_TERM_WGSL));
  });

  it("test tg_addMul's and tg_value's sums for a wrap the same way in WGSL and GLSL ES", () => {
    for (const fn of ["tg_addMul", "tg_value"] as const) {
      const wgsl = wideTermsOf(CENTER_TERM_WGSL, fn);
      expect(wgsl.length).toBeGreaterThan(1);
      expect(wideTermsOf(CENTER_TERM_GLSL, fn)).toEqual(
        wgsl.map((k) => k.replace("f32(", "float(").replace("f32(", "float(")),
      );
    }
  });

  it("test tg_diff's difference for a wrap the same way in WGSL and GLSL ES", () => {
    const test = (text: string) =>
      /tg_diff[^]*?(?:let|bool) wide = (.+);/.exec(text)?.[1];
    expect(test(CENTER_TERM_WGSL)).toBe("((aw ^ bw) & (aw ^ w)) < 0");
    expect(test(CENTER_TERM_GLSL)).toBe(test(CENTER_TERM_WGSL));
  });

  it("have no loops", () => {
    for (const text of [CENTER_TERM_WGSL, CENTER_TERM_GLSL]) {
      expect(text).not.toMatch(/\b(for|while)\s*\(|\bloop\s*\{/);
    }
  });
});
