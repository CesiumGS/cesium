// A compiled route's center term (CS-921): F(c) - eye + Σ s·G(c), per
// component, where F(c) is the route's value at the draw center with the
// separable parameters s at 0, and G(c) is its derivative in each. The terms
// are as large as the route's output (6.4 × 10⁶ m at the Earth's surface) and
// the sum is as small as the draw's distance from the eye, so the low parts
// decide it.
//
// Every value arrives as four float32s (`fixParts`): its whole units as a
// high and a low 16 bits, w = h·65536 + l, then the rest in units of 2⁻²⁴, k,
// then what is left, r, under 2⁻²⁵. The shader sums the whole units and the
// 2⁻²⁴ units as 32-bit integers, and multiplies s by G as integer limbs
// (`tg_wk`), so every large part is an integer from the moment it is read.
// Only the rests and the cross terms of the fractions are float32 sums, and
// each of those is under 1 unit.
//
// Why integers: Dawn (WebGPU) and ANGLE (WebGL 2) compile with relaxed math
// on Apple GPUs. Relaxed math may reassociate a float sum and fold df64's
// error terms, which are zero in real arithmetic: measured on an Apple M2
// (2026-11-22), the df64 form of this term erred 0.12 to 0.29 m at the
// Earth's surface for the separable routes. Relaxed math applies to float
// operations only. An integer add, multiply, shift or mask is exact, and a
// compiler may only replace it with something of the same value, so the
// whole and 2⁻²⁴ parts can't be reassociated with a float or dropped. The
// one float sum that's left, f32(whole) + (fraction + rests), has no
// intermediate larger than the result plus 1, so a reordering costs at most
// the result's own float32 rounding. The engine's positions do the same
// (shaders/common.slang `SplitPosition.difference`).
//
// The bound (CS-986), in the output's units (meters for every built-in at
// the Earth's surface). Write a value as V = W + k·2⁻²⁴ + r, with W its whole
// units, |k·2⁻²⁴| ≤ 1/2 and |r| ≤ 2⁻²⁵, and φ = k·2⁻²⁴ + r its fraction. The
// term is T = A − B + Σⱼ Pⱼ·Gⱼ, for F(c) = A, the eye B, and J separable
// parameters P with derivatives G. Assumptions: each float32 add, subtract,
// multiply and int-to-float conversion rounds to nearest, within u = 2⁻²⁴ of
// its result (WGSL, GLSL ES 3.00 and Metal specify it); relaxed math may
// reorder and contract the float sums in any way (their terms share no
// factor, so it has nothing to distribute); a result under 2⁻¹²⁶ may flush to
// 0; int32 add, subtract and multiply wrap modulo 2³² (WGSL and GLSL ES 3.00
// specify it).
//
// - The whole units (h, l): integers, |h| ≤ 2¹⁵ and l < 2¹⁶, exact in float32
//   and as int32. Their sums and the products W_P·W_G are int32, exact modulo
//   2³², so exact while the term's whole units are under 2³¹. Error: 0.
// - The 2⁻²⁴ units (k): |k| ≤ 2²³, exact the same way. W·k·2⁻²⁴ is exact as
//   limbs (`tg_wk`, every product under 2²⁸), and its carries are shifts of a
//   sum under 7·2²⁴. Error: 0.
// - The float32 rests: the terms r_A − r_B and, per parameter, W_P·r_G,
//   r_P·W_G and φ_P·φ_G. Their magnitudes sum to at most
//   S = |r_A| + |r_B| + Σⱼ (|W_P|·|r_G| + |r_P|·|W_G| + |φ_P|·|φ_G|).
//   Each term's own roundings (its product, and φ's) cost at most 3u of it.
// - The end (`tg_value`): an integer whole, w, and an integer fraction in
//   [−1/2, 1/2) give the integers' sum exactly, so T = w + fraction + rests.
//   The float32 sum has n = 3 + 3J terms (f32(w), the fraction, the rests).
//   Its terms' magnitudes sum to at most Σ = min(|T| + 1 + 2S, 3|T| + 4S): w
//   is 0 unless |T| ≥ 1/2 − S. In any order its n − 1 adds cost at most
//   (n − 1)·u·Σ, and f32(w) at most u·Σ.
//
// So, to first order in u, with m = n + 3 = 6 + 3J:
//
//   |error| ≤ m·u/(1 − m·u) · min(|T| + 1 + 2S, 3|T| + 4S) + m·2⁻¹²⁶
//
// against the exact value of the parts (`centerTermBound`). The parts carry
// each float64 value to 2⁻⁴⁹ units; what the CPU's float64 F(c) and G(c) miss
// is theirs, not this form's. In meters at the Earth's surface (u =
// 5.96 × 10⁻⁸):
//
// - The eye at the draw's image (|T| under 1 mm), integer-valued separable
//   parameters (φ_P = 0): under 10⁻¹³ m with none, 10⁻¹¹ m for flatten's
//   150 m (S ≈ 150·2⁻²⁵).
// - The eye at the image, a parameter and a derivative under 10⁴ m, each with
//   a fraction: S up to 0.2506, so up to 5.4 × 10⁻⁷ m for one parameter and
//   1.4 × 10⁻⁶ m for two, from φ_P·φ_G's float32 sums. The readback's cases
//   with fractional parameters, eye at the image: transverse Mercator's (its
//   scale factor) 1.4 × 10⁻⁷ m, radial distortion's 4.5 × 10⁻⁷ image-plane
//   units, the lattices' 72 and 81 up to 1.8 × 10⁻⁵ m.
// - The eye d away: about m·u·d, 3.6 × 10⁻⁷·d with no separable parameter
//   and 5.4 × 10⁻⁷·d with one: at 10 m, 5.9 × 10⁻⁶ m; 1 km, 5.4 × 10⁻⁴ m;
//   100 km, 0.054 m; 1,000 km, 0.54 m. That is reordering's worst case: the
//   sum as written rounds once at |T|, 2⁻²⁴·d, which a float32 output of d
//   costs anyway.
//
// So the bound is above 10⁻⁷ m where |T| is over about 0.1 m, or where
// parameters have fractions; the readback holds each case to the bound at
// its own parts.
//
// The exact range: every value under 2³¹ units (2.1 × 10⁹ m at 1 unit = 1 m,
// 5.6 times the Moon's distance), and the term and each s·G under 2³¹ units.
// Beyond it, `fixParts` writes a value whole in r, as float32: that value
// costs up to 2⁻²⁴ of itself (128 m at 2³¹ m), and the bound above still
// holds against the parts, with S then as large as the value. A term past
// 2³¹ units whose values are each under 2³¹ (F(c) and the eye on opposite
// sides past 2³⁰ units) would wrap by 2³² units: nothing guards that yet.

/** 2⁻²⁴, the unit of a value's third part. */
const UNIT = 2 ** -24;

/**
 * `v` as the center term's four parts, at `out[at … at + 3]`: the whole
 * units' high and low 16 bits (whole = high·65536 + low, low in
 * [0, 65536)), the rest in units of 2⁻²⁴ (at most 2²³ either way), and the
 * float32 of what is left (under 2⁻²⁵). Each part is exact in float32.
 */
export function fixParts(v: number, out: Float32Array, at: number): void {
  const whole = Math.round(v);
  if (!Number.isFinite(v) || Math.abs(whole) >= 2 ** 31) {
    out[at] = 0;
    out[at + 1] = 0;
    out[at + 2] = 0;
    out[at + 3] = v;
    return;
  }
  // Both exact in float64: |v - whole| <= 0.5, and k·2⁻²⁴ is a multiple of 2⁻²⁴.
  const rest = v - whole;
  const k = Math.round(rest / UNIT);
  const high = Math.floor(whole / 65536);
  out[at] = high;
  out[at + 1] = whole - 65536 * high;
  out[at + 2] = k;
  out[at + 3] = rest - k * UNIT;
}

/** One value's four parts, at `p[at … at + 3]`, as `fixParts` writes them. */
export interface PartsAt {
  readonly p: ArrayLike<number>;
  readonly at: number;
}

/** The center term's inputs on one axis: F(c), the eye, and each separable parameter with its derivative. */
export interface CenterInputs {
  readonly value: PartsAt;
  readonly eye: PartsAt;
  readonly terms: readonly (readonly [PartsAt, PartsAt])[];
}

/** A value's parts as an exact integer times 2¹⁵⁰ (every float32 is a multiple of 2⁻¹⁴⁹). */
function bigParts(v: PartsAt): bigint {
  const rest = v.p[v.at + 3]! * 2 ** 150;
  if (!Number.isInteger(rest)) {
    throw new Error(`a part that isn't a float32: ${v.p[v.at + 3]}`);
  }
  return (
    (BigInt(65536 * v.p[v.at]! + v.p[v.at + 1]!) << 150n) +
    (BigInt(v.p[v.at + 2]!) << 126n) +
    BigInt(rest)
  );
}

/** The exact value of the center term's parts, rounded once to float64 (tests). */
export function centerTermExact(x: CenterInputs): number {
  let sum = (bigParts(x.value) - bigParts(x.eye)) << 150n;
  for (const [p, g] of x.terms) {
    sum += bigParts(p) * bigParts(g);
  }
  return Number(sum) / 2 ** 300;
}

/**
 * The center term's worst-case error against the exact value `t` of its
 * parts, in its units: the bound derived above (tests and the readback).
 */
export function centerTermBound(
  x: CenterInputs,
  t = centerTermExact(x),
): number {
  const whole = (v: PartsAt) => Math.abs(65536 * v.p[v.at]! + v.p[v.at + 1]!);
  const rest = (v: PartsAt) => Math.abs(v.p[v.at + 3]!);
  const fraction = (v: PartsAt) =>
    Math.abs(v.p[v.at + 2]! * UNIT + v.p[v.at + 3]!);
  let s = rest(x.value) + rest(x.eye);
  for (const [p, g] of x.terms) {
    s += whole(p) * rest(g) + rest(p) * whole(g) + fraction(p) * fraction(g);
  }
  const m = 6 + 3 * x.terms.length;
  const at = Math.abs(t);
  const sum = Math.min(at + 1 + 2 * s, 3 * at + 4 * s);
  return ((m * UNIT) / (1 - m * UNIT)) * sum + m * 2 ** -126;
}

/** The value `fixParts` wrote, in float64 (tests). */
export function fromFixParts(parts: ArrayLike<number>, at = 0): number {
  return (
    65536 * parts[at]! + parts[at + 1]! + parts[at + 2]! * UNIT + parts[at + 3]!
  );
}

const UNIT_LITERAL = "5.9604644775390625e-8";

/** The center term's helpers in WGSL: `TgFix`, `tg_diff`, `tg_addMul` and `tg_value`. */
export const CENTER_TERM_WGSL = `
// ---- the center term's integer sums (centerTerm.ts) ----
// A value is vec4f(h, l, k, r): whole units h·65536 + l, k units of 2^-24,
// and r. A sum keeps its whole units and 2^-24 units as integers, which
// relaxed math can't reassociate or fold; f holds the rests, each under 1.
struct TgFix {
  w: i32,
  q: i32,
  f: f32,
}

fn tg_whole(v: vec4f) -> i32 {
  return i32(v.x) * 65536 + i32(v.y);
}

// A split position's high (whole units) and low (shaders/common.slang
// SplitPosition, math/transforms.ts splitVec3) as a value's parts.
fn tg_splitParts(hi: f32, lo: f32) -> vec4f {
  let w = i32(hi);
  let k = round(lo * 16777216.0);
  return vec4f(f32(w >> 16u), f32(w & 65535), k, lo - k * ${UNIT_LITERAL});
}

// a - b.
fn tg_diff(a: vec4f, b: vec4f) -> TgFix {
  return TgFix(tg_whole(a) - tg_whole(b), i32(a.z) - i32(b.z), a.w - b.w);
}

// (h·65536 + l)·k·2^-24 exactly, as whole units and 2^-24 units: 16-bit and
// 12-bit limbs, so every product is under 2^28.
fn tg_wk(h: i32, l: i32, k: i32) -> vec2i {
  let kh = k >> 12u;
  let kl = k & 4095;
  let a = h * kh;
  let b = h * kl;
  let c = l * kh;
  let d = l * kl;
  return vec2i(
    a * 16 + (b >> 8u) + (c >> 12u) + (d >> 24u),
    ((b & 255) << 16u) + ((c & 4095) << 12u) + (d & 16777215),
  );
}

// s + p·g, for a separable parameter p and its derivative g.
fn tg_addMul(s: TgFix, p: vec4f, g: vec4f) -> TgFix {
  let ph = i32(p.x);
  let pl = i32(p.y);
  let pk = i32(p.z);
  let gh = i32(g.x);
  let gl = i32(g.y);
  let gk = i32(g.z);
  let pw = ph * 65536 + pl;
  let gw = gh * 65536 + gl;
  let x = tg_wk(ph, pl, gk);
  let y = tg_wk(gh, gl, pk);
  let q = s.q + x.y + y.y;
  let pf = f32(pk) * ${UNIT_LITERAL} + p.w;
  let gf = f32(gk) * ${UNIT_LITERAL} + g.w;
  return TgFix(
    s.w + pw * gw + x.x + y.x + (q >> 24u),
    q & 16777215,
    s.f + (f32(pw) * g.w + p.w * f32(gw) + pf * gf),
  );
}

// The sum in float32: a whole number plus a fraction in [-0.5, 0.5), so
// the fraction's own rounding is under 2^-26.
fn tg_value(s: TgFix) -> f32 {
  let q = s.q + 8388608;
  let fraction = (q & 16777215) - 8388608;
  return f32(s.w + (q >> 24u)) + (f32(fraction) * ${UNIT_LITERAL} + s.f);
}
`;

/** `CENTER_TERM_WGSL` in GLSL ES 3.00: the same functions and statements. */
export const CENTER_TERM_GLSL = `
// ---- the center term's integer sums (centerTerm.ts) ----
// A value is vec4(h, l, k, r): whole units h·65536 + l, k units of 2^-24,
// and r. A sum keeps its whole units and 2^-24 units as integers, which
// relaxed math can't reassociate or fold; f holds the rests, each under 1.
struct TgFix {
  int w;
  int q;
  float f;
};

int tg_whole(vec4 v) {
  return int(v.x) * 65536 + int(v.y);
}

// A split position's high (whole units) and low (shaders/common.slang
// SplitPosition, math/transforms.ts splitVec3) as a value's parts.
vec4 tg_splitParts(float hi, float lo) {
  int w = int(hi);
  float k = round(lo * 16777216.0);
  return vec4(float(w >> 16), float(w & 65535), k, lo - k * ${UNIT_LITERAL});
}

// a - b.
TgFix tg_diff(vec4 a, vec4 b) {
  return TgFix(tg_whole(a) - tg_whole(b), int(a.z) - int(b.z), a.w - b.w);
}

// (h·65536 + l)·k·2^-24 exactly, as whole units and 2^-24 units: 16-bit and
// 12-bit limbs, so every product is under 2^28.
ivec2 tg_wk(int h, int l, int k) {
  int kh = k >> 12;
  int kl = k & 4095;
  int a = h * kh;
  int b = h * kl;
  int c = l * kh;
  int d = l * kl;
  return ivec2(
    a * 16 + (b >> 8) + (c >> 12) + (d >> 24),
    ((b & 255) << 16) + ((c & 4095) << 12) + (d & 16777215));
}

// s + p·g, for a separable parameter p and its derivative g.
TgFix tg_addMul(TgFix s, vec4 p, vec4 g) {
  int ph = int(p.x);
  int pl = int(p.y);
  int pk = int(p.z);
  int gh = int(g.x);
  int gl = int(g.y);
  int gk = int(g.z);
  int pw = ph * 65536 + pl;
  int gw = gh * 65536 + gl;
  ivec2 x = tg_wk(ph, pl, gk);
  ivec2 y = tg_wk(gh, gl, pk);
  int q = s.q + x.y + y.y;
  float pf = float(pk) * ${UNIT_LITERAL} + p.w;
  float gf = float(gk) * ${UNIT_LITERAL} + g.w;
  return TgFix(
    s.w + pw * gw + x.x + y.x + (q >> 24),
    q & 16777215,
    s.f + (float(pw) * g.w + p.w * float(gw) + pf * gf));
}

// The sum in float32: a whole number plus a fraction in [-0.5, 0.5), so
// the fraction's own rounding is under 2^-26.
float tg_value(TgFix s) {
  int q = s.q + 8388608;
  int fraction = (q & 16777215) - 8388608;
  return float(s.w + (q >> 24)) + (float(fraction) * ${UNIT_LITERAL} + s.f);
}
`;

/**
 * The compute pass's helper (WGSL): a df64 value as `fixParts`' four parts,
 * for the records it writes. Its inputs are df64 sums, which relaxed math
 * can fold as before; the parts it writes are what the center term reads.
 */
export const CENTER_PARTS_WGSL = `
// A df64 value as the center term's parts (centerTerm.ts fixParts).
fn tgc_parts(x: vec2f) -> vec4f {
  let w = round(x.x);
  let t = (x.x - w) + x.y;
  let tw = round(t);
  let rest = t - tw;
  let k = round(rest * 16777216.0);
  let wi = i32(w + tw);
  return vec4f(f32(wi >> 16u), f32(wi & 65535), k, rest - k * ${UNIT_LITERAL});
}
`;
