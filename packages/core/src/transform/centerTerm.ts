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
// reassociate the float sums in any order and contract a product into the
// add above it (a fused multiply-add, which only drops a rounding), but
// doesn't expand a product into a sum of products. That last is an
// assumption about the compilers, not a property of the terms: p.w is in
// both p.w·f32(gw) and pf, and g.w in both f32(pw)·g.w and gf, so
// distributing pf·gf would make new terms this bound doesn't count. A
// result under 2⁻¹²⁶ may flush to 0 (`fixParts` writes no subnormal rest, so
// only results flush); int32 add, subtract and multiply wrap modulo 2³²
// (WGSL and GLSL ES 3.00 specify it).
//
// - The whole units (h, l): integers, |h| ≤ 2¹⁵ and l < 2¹⁶, exact in float32
//   and as int32. Their sums and the products W_P·W_G are int32, exact while
//   each stays in int32's range, and guarded past it (below). Error: 0.
// - The 2⁻²⁴ units (k): |k| ≤ 2²³, exact the same way. W·k·2⁻²⁴ is exact as
//   limbs (`tg_wk`, every product under 2²⁸), and its carries are shifts of a
//   sum under 7·2²⁴. Error: 0.
// - The float32 rests: the terms r_A − r_B and, per parameter, W_P·r_G,
//   r_P·W_G and φ_P·φ_G. Their magnitudes sum to at most
//   S = |r_A| + |r_B| + Σⱼ (|W_P|·|r_G| + |r_P|·|W_G| + |φ_P|·|φ_G|).
//   Each term's own roundings (its product, and φ's) cost at most 3u of it.
// - The end (`tg_value`): an integer whole, w, and an integer fraction in
//   [−1/2, 1/2) give the integers' sum exactly, so T = w + fraction + rests.
//   The float32 sum's leaves are f32(w), the fraction, r_A, −r_B and three
//   products a parameter: 4 + 3J leaves, so 3 + 3J adds in any tree, whether
//   `a.w − b.w` is made first (as written) or r_A and −r_B are reassociated
//   apart. The leaves' magnitudes sum to at most Σ = min(|T| + 1 + 2S,
//   3|T| + 4S): w is 0 unless |T| ≥ 1/2 − S. The adds cost at most
//   (3 + 3J)·u·Σ, f32(w) at most u·Σ, and the products' own roundings at
//   most 3u·S ≤ 1.5u·Σ, since Σ ≥ 2S. That is (5.5 + 3J)·u·Σ, under
//   m·u·Σ for m = 6 + 3J.
// - Flushes: each float operation whose result is under 2⁻¹²⁶ may give 0
//   instead, at most 2⁻¹²⁶ each: one in `tg_diff`, ten a parameter in
//   `tg_addMul`, three in `tg_value`, and one to spare, (5 + 10J)·2⁻¹²⁶.
//
// So, to first order in u, with m = 6 + 3J:
//
//   |error| ≤ m·u/(1 − m·u) · min(|T| + 1 + 2S, 3|T| + 4S) + (5 + 10J)·2⁻¹²⁶
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
// The exact range (CS-1096 A): every value whose whole units fit an int32,
// from −2³¹ to 2³¹ − 1 (2.1 × 10⁹ m at 1 unit = 1 m, 5.6 times the Moon's
// distance). Past it, a value falls back: its parts are (0, 0, 0, the value
// as float32), and it costs up to 2⁻²⁴ of itself (128 m at 2³¹ m). A value
// that isn't finite falls back the same way. Every writer of parts decides
// by the same test, on the value's whole units: `fixParts` on the CPU (a
// record's F(c) and G, the CPU path's eye, each parameter), `tg_splitParts`
// for the renderer's eye and `tgc_parts` for the compute pass's records.
// The two GPU writers add the high's and the low's whole units as integers
// and test that sum's sign, so a high that rounds up to 2³¹ (a value within
// 64 units of it) is still exact. (They round a half-unit tie to even, and
// `fixParts` rounds it up: at a tie on the range's edge the two can differ,
// and both are then exact or within 2⁻²⁴ of the value.)
//
// Each sum of whole units is guarded instead: F(c) less the eye, each
// s·G, and each sum of those can leave int32's range when the values
// don't. A sum wraps when its operands share a sign that it doesn't (for
// a − b: a's and b's signs differ and the result's differs from a's); a
// product wraps when its float32 is at least 2³¹ − 512 (the float32 of a
// product of 2³¹ or more is at least 2³¹ − 384, three roundings of 2⁻²⁴).
// Then that term (the one axis's T) is the float32 sum of its values
// instead, which the shader makes beside the integer one (`TgFix.v`):
//
//   T̃ = (ṽ(A) − ṽ(B)) + Σⱼ ṽ(Pⱼ)·ṽ(Gⱼ),  ṽ(V) = f32(W) + (k·2⁻²⁴ + r).
//
// Its leaves are f32(W), k·2⁻²⁴ and r of A and of B, and J products: 6 + J
// leaves and 5 + J adds in any order. With Σw = |A| + |B| + 3 +
// Σⱼ (|Pⱼ| + 1)·(|Gⱼ| + 1), the adds cost at most (5 + J)·u·Σw, the
// conversions of A's and B's whole units u·Σw, and each product, with its
// factors' three roundings each, 7u·(|P| + 1)·(|G| + 1), at most 7u·Σw in
// all. So, wide:
//
//   |error| ≤ mw·u/(1 − mw·u) · Σw + (5 + 10J)·2⁻¹²⁶,  mw = 13 + J
//
// (`centerTermBound`, which decides wide as the shader does,
// `centerTermWide`). At 3 × 10⁹ m apart, F(c) and the eye cost up to about
// 2,300 m, against 2³² units (4.3 × 10⁹ m) if the whole units wrapped.
//
// The parts of the renderer's eye: `splitVec3` makes the high a whole
// number of units below 2²⁴ and the nearest float32 above it, so the low
// holds up to half a float32 ulp of the high, 64 units under 2³¹.
// `tg_splitParts` rounds the low to its whole units and adds those to the
// high's as integers, so the eye's k is under 2²³ in magnitude, as
// `fixParts`' is. Its r is the low less its whole units and k·2⁻²⁴, which
// float32 holds exactly.

/** 2⁻²⁴, the unit of a value's third part. */
const UNIT = 2 ** -24;
/**
 * A value's whole units must be at least −`EXACT_REACH` and under it (an
 * int32), or its parts fall back to float32 (`fixParts`).
 */
export const EXACT_REACH = 2 ** 31;
/** A product of whole units whose float32 reaches this may wrap: the term is then wide. */
const PRODUCT_REACH = 2 ** 31 - 512;

/**
 * `v` as the center term's four parts, at `out[at … at + 3]`: the whole
 * units' high and low 16 bits (whole = high·65536 + low, low in
 * [0, 65536)), the rest in units of 2⁻²⁴ (at most 2²³ either way), and the
 * float32 of what is left (under 2⁻²⁵, and 0 where it would be subnormal).
 * Each part is exact in float32. With whole units outside int32's range
 * (`EXACT_REACH`), or not finite, the value is the last part alone, as
 * float32.
 */
export function fixParts(v: number, out: Float32Array, at: number): void {
  const whole = Math.round(v);
  if (!Number.isFinite(v) || whole < -EXACT_REACH || whole >= EXACT_REACH) {
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
  // A subnormal rest could be flushed where it's read; 0 is the GPU's value.
  const r = Math.fround(rest - k * UNIT);
  out[at + 3] = Math.abs(r) < 2 ** -126 ? 0 : r;
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

/** Whether s = a + b wrapped in int32: a and b share a sign that s doesn't. */
const wraps = (a: number, b: number, s: number) => ((a ^ s) & (b ^ s)) < 0;

/** `tg_whole`: a value's whole units as an int32. */
const wholeOf = (v: PartsAt) =>
  (Math.imul(v.p[v.at]! | 0, 65536) + (v.p[v.at + 1]! | 0)) | 0;

/** `tg_wk`: (h·65536 + l)·k·2⁻²⁴ as int32 whole units and 2⁻²⁴ units. */
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

/**
 * Whether the shader takes the center term's float32 sum (`TgFix.v`) instead
 * of its integer one: an int32 sum of whole units, or a product, wraps. The
 * shader's integer steps, in the same order (`tg_diff`, `tg_addMul`,
 * `tg_value`).
 */
export function centerTermWide(x: CenterInputs): boolean {
  const aw = wholeOf(x.value);
  const bw = wholeOf(x.eye);
  let w = (aw - bw) | 0;
  let wide = ((aw ^ bw) & (aw ^ w)) < 0;
  let q = ((x.value.p[x.value.at + 2]! | 0) - (x.eye.p[x.eye.at + 2]! | 0)) | 0;
  for (const [p, g] of x.terms) {
    const [ph, pl, pk] = [
      p.p[p.at]! | 0,
      p.p[p.at + 1]! | 0,
      p.p[p.at + 2]! | 0,
    ];
    const [gh, gl, gk] = [
      g.p[g.at]! | 0,
      g.p[g.at + 1]! | 0,
      g.p[g.at + 2]! | 0,
    ];
    const pw = (Math.imul(ph, 65536) + pl) | 0;
    const gw = (Math.imul(gh, 65536) + gl) | 0;
    const [xw, xq] = wk(ph, pl, gk);
    const [yw, yq] = wk(gh, gl, pk);
    q = (q + xq + yq) | 0;
    const c = q >> 24;
    const pg = Math.imul(pw, gw);
    const w0 = (w + pg) | 0;
    const w1 = (w0 + xw) | 0;
    const w2 = (w1 + yw) | 0;
    const w3 = (w2 + c) | 0;
    wide =
      wide ||
      Math.abs(Math.fround(Math.fround(pw) * Math.fround(gw))) >=
        PRODUCT_REACH ||
      wraps(w, pg, w0) ||
      wraps(w0, xw, w1) ||
      wraps(w1, yw, w2) ||
      wraps(w2, c, w3);
    w = w3;
    q &= 16777215;
  }
  const c = ((q + 8388608) | 0) >> 24;
  return wide || wraps(w, c, (w + c) | 0);
}

/**
 * The center term's worst-case error against the exact value `t` of its
 * parts, in its units: the bound derived above, for the integer sum or,
 * when the shader takes it (`centerTermWide`), the float32 one (tests and
 * the readback).
 */
export function centerTermBound(
  x: CenterInputs,
  t = centerTermExact(x),
): number {
  const flushes = (5 + 10 * x.terms.length) * 2 ** -126;
  if (centerTermWide(x)) {
    const size = (v: PartsAt) => Math.abs(fromFixParts(v.p, v.at));
    let sw = size(x.value) + size(x.eye) + 3;
    for (const [p, g] of x.terms) {
      sw += (size(p) + 1) * (size(g) + 1);
    }
    const mw = 13 + x.terms.length;
    return ((mw * UNIT) / (1 - mw * UNIT)) * sw + flushes;
  }
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
  return ((m * UNIT) / (1 - m * UNIT)) * sum + flushes;
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
// v is the same sum in float32 alone, and wide says an integer sum or
// product left int32's range: then v is the term (tg_value).
struct TgFix {
  w: i32,
  q: i32,
  f: f32,
  v: f32,
  wide: bool,
}

// a + b, a - b and a·b modulo 2^32 (WGSL's i32 arithmetic wraps).
fn tg_add(a: i32, b: i32) -> i32 {
  return a + b;
}

fn tg_sub(a: i32, b: i32) -> i32 {
  return a - b;
}

fn tg_mul(a: i32, b: i32) -> i32 {
  return a * b;
}

// Whether s = a + b wrapped: a and b share a sign that s doesn't.
fn tg_wraps(a: i32, b: i32, s: i32) -> bool {
  return ((a ^ s) & (b ^ s)) < 0;
}

// Whether x is infinite or NaN, from its bits: relaxed math may assume no
// float is, and drop a float comparison that tests for it.
fn tg_notFinite(x: f32) -> bool {
  return (bitcast<u32>(x) & 0x7f800000u) == 0x7f800000u;
}

fn tg_whole(v: vec4f) -> i32 {
  return i32(v.x) * 65536 + i32(v.y);
}

// A value's parts as one float32 (TgFix.v's terms).
fn tg_float(v: vec4f) -> f32 {
  return f32(tg_whole(v)) + (v.z * ${UNIT_LITERAL} + v.w);
}

// A split position's high and low (shaders/common.slang SplitPosition,
// math/transforms.ts splitVec3) as a value's parts: the low's whole units
// added to the high's as integers. Whole units outside int32's range, or a
// value that isn't finite, give the value as float32 alone (fixParts'
// fallback). Every float is clamped before it is converted to an integer.
fn tg_splitParts(hi: f32, lo: f32) -> vec4f {
  let hc = clamp(hi, -1073741824.0, 1073741824.0);
  let lw = round(lo);
  let rest = lo - lw;
  let k = round(rest * 16777216.0);
  let a = i32(hc);
  let b = i32(clamp(hi - hc, -1073741824.0, 1073741824.0)) + i32(clamp(lw, -16777216.0, 16777216.0));
  let w = tg_add(a, b);
  let parts = vec4f(f32(w >> 16u), f32(w & 65535), k, rest - k * ${UNIT_LITERAL});
  let wide = tg_wraps(a, b, w) || abs(hi) > 2147483648.0 || abs(lo) > 16777216.0 || tg_notFinite(hi) || tg_notFinite(lo);
  return select(parts, vec4f(0.0, 0.0, 0.0, hi + lo), wide);
}

// a - b. The whole units' difference wraps past int32's range: a's and b's
// signs differ, and the difference's sign differs from a's.
fn tg_diff(a: vec4f, b: vec4f) -> TgFix {
  let aw = tg_whole(a);
  let bw = tg_whole(b);
  let w = tg_sub(aw, bw);
  let wide = ((aw ^ bw) & (aw ^ w)) < 0;
  return TgFix(w, i32(a.z) - i32(b.z), a.w - b.w, tg_float(a) - tg_float(b), wide);
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

// s + p·g, for a separable parameter p and its derivative g. p·g wraps
// only if its float32 is at least 2^31 - 384 (centerTerm.ts).
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
  let c = q >> 24u;
  let pf = f32(pk) * ${UNIT_LITERAL} + p.w;
  let gf = f32(gk) * ${UNIT_LITERAL} + g.w;
  let pg = tg_mul(pw, gw);
  let w0 = tg_add(s.w, pg);
  let w1 = tg_add(w0, x.x);
  let w2 = tg_add(w1, y.x);
  let w3 = tg_add(w2, c);
  let wide = abs(f32(pw) * f32(gw)) >= 2147483136.0 || tg_wraps(s.w, pg, w0) || tg_wraps(w0, x.x, w1) || tg_wraps(w1, y.x, w2) || tg_wraps(w2, c, w3);
  return TgFix(
    w3,
    q & 16777215,
    s.f + (f32(pw) * g.w + p.w * f32(gw) + pf * gf),
    s.v + tg_float(p) * tg_float(g),
    s.wide || wide,
  );
}

// The sum in float32: a whole number plus a fraction in [-0.5, 0.5), so
// the fraction's own rounding is under 2^-26; or v, if a sum was wide.
fn tg_value(s: TgFix) -> f32 {
  let q = s.q + 8388608;
  let c = q >> 24u;
  let w = tg_add(s.w, c);
  let fraction = (q & 16777215) - 8388608;
  let exact = f32(w) + (f32(fraction) * ${UNIT_LITERAL} + s.f);
  return select(exact, s.v, s.wide || tg_wraps(s.w, c, w));
}
`;

/** `CENTER_TERM_WGSL` in GLSL ES 3.00: the same functions and statements. */
export const CENTER_TERM_GLSL = `
// ---- the center term's integer sums (centerTerm.ts) ----
// A value is vec4(h, l, k, r): whole units h·65536 + l, k units of 2^-24,
// and r. A sum keeps its whole units and 2^-24 units as integers, which
// relaxed math can't reassociate or fold; f holds the rests, each under 1.
// v is the same sum in float32 alone, and wide says an integer sum or
// product left int32's range: then v is the term (tg_value).
struct TgFix {
  int w;
  int q;
  float f;
  float v;
  bool wide;
};

// a + b, a - b and a·b modulo 2^32, through uint. GLSL ES 3.00 wraps int
// arithmetic too, but a translation of it into a language where signed
// overflow is undefined (ANGLE's Metal or HLSL) might not; uint wraps in
// every one.
int tg_add(int a, int b) {
  return int(uint(a) + uint(b));
}

int tg_sub(int a, int b) {
  return int(uint(a) - uint(b));
}

int tg_mul(int a, int b) {
  return int(uint(a) * uint(b));
}

// Whether s = a + b wrapped: a and b share a sign that s doesn't.
bool tg_wraps(int a, int b, int s) {
  return ((a ^ s) & (b ^ s)) < 0;
}

// Whether x is infinite or NaN, from its bits: relaxed math may assume no
// float is, and drop a float comparison that tests for it.
bool tg_notFinite(float x) {
  return (floatBitsToUint(x) & 0x7f800000u) == 0x7f800000u;
}

int tg_whole(vec4 v) {
  return int(v.x) * 65536 + int(v.y);
}

// A value's parts as one float32 (TgFix.v's terms).
float tg_float(vec4 v) {
  return float(tg_whole(v)) + (v.z * ${UNIT_LITERAL} + v.w);
}

// A split position's high and low (shaders/common.slang SplitPosition,
// math/transforms.ts splitVec3) as a value's parts: the low's whole units
// added to the high's as integers. Whole units outside int32's range, or a
// value that isn't finite, give the value as float32 alone (fixParts'
// fallback). Every float is clamped before it is converted to an integer.
vec4 tg_splitParts(float hi, float lo) {
  float hc = clamp(hi, -1073741824.0, 1073741824.0);
  float lw = round(lo);
  float rest = lo - lw;
  float k = round(rest * 16777216.0);
  int a = int(hc);
  int b = int(clamp(hi - hc, -1073741824.0, 1073741824.0)) + int(clamp(lw, -16777216.0, 16777216.0));
  int w = tg_add(a, b);
  vec4 parts = vec4(float(w >> 16), float(w & 65535), k, rest - k * ${UNIT_LITERAL});
  bool wide = tg_wraps(a, b, w) || abs(hi) > 2147483648.0 || abs(lo) > 16777216.0 || tg_notFinite(hi) || tg_notFinite(lo);
  return wide ? vec4(0.0, 0.0, 0.0, hi + lo) : parts;
}

// a - b. The whole units' difference wraps past int32's range: a's and b's
// signs differ, and the difference's sign differs from a's.
TgFix tg_diff(vec4 a, vec4 b) {
  int aw = tg_whole(a);
  int bw = tg_whole(b);
  int w = tg_sub(aw, bw);
  bool wide = ((aw ^ bw) & (aw ^ w)) < 0;
  return TgFix(w, int(a.z) - int(b.z), a.w - b.w, tg_float(a) - tg_float(b), wide);
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

// s + p·g, for a separable parameter p and its derivative g. p·g wraps
// only if its float32 is at least 2^31 - 384 (centerTerm.ts).
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
  int c = q >> 24;
  float pf = float(pk) * ${UNIT_LITERAL} + p.w;
  float gf = float(gk) * ${UNIT_LITERAL} + g.w;
  int pg = tg_mul(pw, gw);
  int w0 = tg_add(s.w, pg);
  int w1 = tg_add(w0, x.x);
  int w2 = tg_add(w1, y.x);
  int w3 = tg_add(w2, c);
  bool wide = abs(float(pw) * float(gw)) >= 2147483136.0 || tg_wraps(s.w, pg, w0) || tg_wraps(w0, x.x, w1) || tg_wraps(w1, y.x, w2) || tg_wraps(w2, c, w3);
  return TgFix(
    w3,
    q & 16777215,
    s.f + (float(pw) * g.w + p.w * float(gw) + pf * gf),
    s.v + tg_float(p) * tg_float(g),
    s.wide || wide);
}

// The sum in float32: a whole number plus a fraction in [-0.5, 0.5), so
// the fraction's own rounding is under 2^-26; or v, if a sum was wide.
float tg_value(TgFix s) {
  int q = s.q + 8388608;
  int c = q >> 24;
  int w = tg_add(s.w, c);
  int fraction = (q & 16777215) - 8388608;
  float exact = float(w) + (float(fraction) * ${UNIT_LITERAL} + s.f);
  return s.wide || tg_wraps(s.w, c, w) ? s.v : exact;
}
`;

/**
 * The compute pass's helper (WGSL): a df64 value as `fixParts`' four parts,
 * for the records it writes. Its inputs are df64 sums, which relaxed math
 * can fold as before; the parts it writes are what the center term reads.
 * Past 2²⁴ the low part holds whole units, so the high's and the low's whole
 * units are each converted to i32 and added as integers: a float32 add of
 * the two would round once |w| passes 2²⁴ (2 m off at 4.2 × 10⁷ m). With
 * whole units outside int32's range (the sum's sign test, as
 * `tg_splitParts` makes it), or a value that isn't finite, the value falls
 * back to float32, as `fixParts` does.
 */
export const CENTER_PARTS_WGSL = `
// A df64 value as the center term's parts (centerTerm.ts fixParts). Every
// float is clamped before it is converted to an integer.
fn tgc_parts(x: vec2f) -> vec4f {
  let w = round(x.x);
  let t = (x.x - w) + x.y;
  let tw = round(t);
  let rest = t - tw;
  let k = round(rest * 16777216.0);
  let wc = clamp(w, -1073741824.0, 1073741824.0);
  let a = i32(wc);
  let b = i32(clamp(w - wc, -1073741824.0, 1073741824.0)) + i32(clamp(tw, -16777216.0, 16777216.0));
  let wi = a + b;
  let parts = vec4f(f32(wi >> 16u), f32(wi & 65535), k, rest - k * ${UNIT_LITERAL});
  let exponent = 0x7f800000u;
  let wide = ((a ^ wi) & (b ^ wi)) < 0 || abs(w) > 2147483648.0 || abs(tw) > 16777216.0 || (bitcast<u32>(x.x) & exponent) == exponent || (bitcast<u32>(x.y) & exponent) == exponent;
  return select(parts, vec4f(0.0, 0.0, 0.0, x.x + x.y), wide);
}
`;
