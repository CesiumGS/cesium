// Translucency (plan §3.5): blended materials' surfaces, shaded as the
// opaque pass shades them (`shadeSurface`), then put in order over what the
// opaque pass drew (composite.wgsl). Two ways:
//
// - "exact": every fragment into a list per pixel (`fsList`), sorted and
//   blended front to back when composited. Exact up to the lists' memory,
//   which grows to what a view needs; the reference the other is tested
//   against.
// - "moments": moment-based order-independent transparency (Münstermann,
//   Krumpen, Klein and Peters 2018). A first pass sums each pixel's
//   absorbance and its first four moments in depth (`fsMoments`); a second
//   shades and weights each fragment by the light reaching it through what
//   lies in front, reconstructed from those moments (`fsMomentColor`).
//   Bounded memory, two passes over the translucent geometry.
//
// Their parts at least `OPAQUE_ALPHA` opaque draw in the opaque pass
// instead (opaque.wgsl `depthCoverageFs`). Both run single-sampled, with
// no depth attachment: a fragment's share of the pixel is the share of the
// opaque pass's samples it is in front of, read from that pass's depth (a
// storage write disables early depth tests, so occluded fragments are
// tested here, not by the hardware). Edges against opaque surfaces
// antialias; glass's own silhouette doesn't. The lists' pass was
// multisampled once, its fragments' coverage antialiasing those edges, but
// a fragment shader's storage writes may run once per sample: on Apple's
// GPUs (Metal) at 4× they ran four times a pixel, each run seeing the
// whole coverage mask, and every layer went into its list four times
// (plan §3.5). At one sample, once per sample is once per pixel.
//
// Appended to common.wgsl and opaque.wgsl.

struct TranslucentParams {
  width: u32,
  height: u32,
  // The lists: their first node's word, and how many nodes fit.
  nodesBase: u32,
  capacity: u32,
  // The moments' depth: ln(distance), from ln(near) over ln(far / near)
  // mapped to [-1, 1].
  logNear: f32,
  invLogRange: f32,
  // The moments' bias toward a known distribution (their precision).
  bias: f32,
  _pad: f32,
};

@group(3) @binding(0) var<uniform> translucency: TranslucentParams;
// Word 0: the nodes used (past `capacity`: those that didn't fit);
// from LIST_HEADER, each pixel's first node plus one (0: none); from
// `nodesBase`, nodes of four words: color (rg, then b and alpha as halves,
// alpha negative for display-referred color), depth, next node plus one.
@group(3) @binding(1) var<storage, read_write> lists: array<atomic<u32>>;
@group(3) @binding(2) var opaqueDepth: texture_depth_multisampled_2d;
// The moments pass's sums, read by the color pass.
@group(3) @binding(3) var momentsZero: texture_2d<f32>;
@group(3) @binding(4) var momentsHigher: texture_2d<f32>;

const LIST_HEADER = 4u;

// Blended surfaces draw here below this alpha: a little past where the
// opaque pass takes them (opaque.wgsl `OPAQUE_ALPHA`), so a pixel its depth
// and shading stages decide differently (rounding, along an alpha
// gradient) is drawn here, not left a hole. In the overlap both draw: the
// layer over its own opaque self, the same color.
const TRANSLUCENT_ALPHA = 0.9995;

// WebGPU's standard 4× sample positions, from the pixel's center.
const SAMPLE_OFFSETS = array<vec2f, 4>(
  vec2f(-0.125, -0.375),
  vec2f(0.375, -0.125),
  vec2f(-0.375, 0.125),
  vec2f(0.125, 0.375),
);

// The share of the opaque pass's samples a fragment is in front of
// (reverse-Z: nearer is greater), its depth taken at each sample from its
// slope (`depthSlope`), as the hardware tests it: at the pixel's center
// alone, glass meeting its frame, the depths nearly equal, came out in
// front of some samples and behind others at random, speckling the seam.
fn uncovered(position: vec4f, slope: vec2f) -> f32 {
  let p = vec2u(position.xy);
  let samples = textureNumSamples(opaqueDepth);
  var n = 0u;
  for (var i = 0u; i < samples; i++) {
    var z = position.z;
    if (samples == 4u) {
      z += dot(slope, SAMPLE_OFFSETS[i]);
    }
    if (z >= textureLoad(opaqueDepth, p, i)) {
      n++;
    }
  }
  return f32(n) / f32(samples);
}

// Depth's change per pixel (in uniform control flow, before any discard).
fn depthSlope(position: vec4f) -> vec2f {
  return vec2f(dpdx(position.z), dpdy(position.z));
}

@fragment
fn fsList(in: VsOut, @builtin(front_facing) frontFacing: bool) {
  let slope = depthSlope(in.position);
  let surface = shadeSurface(in, frontFacing, true);
  if (surface.alpha >= TRANSLUCENT_ALPHA) {
    return; // drawn opaque (opaque.wgsl `cutOut`)
  }
  let alpha = clamp(surface.alpha, 0.0, 1.0) * uncovered(in.position, slope);
  if (alpha <= 0.0) {
    return;
  }
  let index = atomicAdd(&lists[0], 1u);
  if (index >= translucency.capacity) {
    return;
  }
  let node = translucency.nodesBase + index * 4u;
  atomicStore(&lists[node], pack2x16float(surface.color.rg));
  atomicStore(&lists[node + 1u], pack2x16float(vec2f(surface.color.b, select(alpha, -alpha, surface.unlit))));
  atomicStore(&lists[node + 2u], bitcast<u32>(in.position.z));
  let pixel = u32(in.position.y) * translucency.width + u32(in.position.x);
  atomicStore(&lists[node + 3u], atomicExchange(&lists[LIST_HEADER + pixel], index + 1u));
}

// --- moments ---------------------------------------------------------------------

// Distance from the camera warped to [-1, 1] (logarithmic, as the paper
// recommends: layers far apart in depth stay apart in the moments).
fn momentDepth(relPosition: vec3f) -> f32 {
  let t = (log(max(length(relPosition), 1e-6)) - translucency.logNear) * translucency.invLogRange;
  return clamp(t, 0.0, 1.0) * 2.0 - 1.0;
}

// A blended surface's alpha (`shadeSurface`'s, without its light), with the
// opaque pass's placeholder clip.
fn blendedAlpha(in: VsOut) -> f32 {
  let r = records[in.draw];
  let alpha = materialAlpha(in);
  if ((r.placeholderMask & view.viewBit) != 0u &&
      !insideClipBoxes(r.clipBlock, r.clipCount, in.relPosition)) {
    discard;
  }
  return clamp(alpha, 0.0, 1.0);
}

struct MomentsOut {
  @location(0) zero: f32,     // absorbance, -ln(1 - alpha), summed
  @location(1) higher: vec4f, // its first four moments in depth
};

@fragment
fn fsMoments(in: VsOut) -> MomentsOut {
  let slope = depthSlope(in.position);
  let blended = blendedAlpha(in);
  let alpha = blended * uncovered(in.position, slope);
  if (alpha <= 0.0 || blended >= TRANSLUCENT_ALPHA) {
    discard;
  }
  let absorbance = -log(1.0 - alpha);
  let z = momentDepth(in.relPosition);
  let z2 = z * z;
  return MomentsOut(absorbance, vec4f(z, z2, z2 * z, z2 * z2) * absorbance);
}

// The light reaching depth z through what lies in front: from the total
// absorbance b0 and its four moments, the bound on absorbance in front of z
// over all distributions with those moments, a quarter of the way from the
// lower to the upper (Münstermann et al. 2018, after Peters and Klein 2015's
// Hamburger four-moment reconstruction).
const MOMENT_OVERESTIMATION = 0.25;

fn transmittanceBefore(b0: f32, sums: vec4f, z: f32) -> f32 {
  if (b0 < 0.00100050033) {
    return 1.0;
  }
  let b = mix(sums / b0, vec4f(0.0, 0.375, 0.0, 0.375), translucency.bias);
  // Cholesky factorization of the Hankel matrix of (1, b1, b2; b1, b2, b3;
  // b2, b3, b4), its nontrivial entries.
  let l21d11 = b.z - b.x * b.y;
  let d11 = b.y - b.x * b.x;
  let invD11 = 1.0 / d11;
  let l21 = l21d11 * invD11;
  let d22 = (b.w - b.y * b.y) - l21d11 * l21;
  // Solve B c = (1, z, z²) by substitution.
  var c = vec3f(1.0, z, z * z);
  c.y -= b.x;
  c.z -= b.y + l21 * c.y;
  c.y *= invD11;
  c.z /= d22;
  c.y -= l21 * c.z;
  c.x -= dot(c.yz, b.xy);
  // A lone layer seen at its own depth: z is a support point and the
  // quadratic degenerates (in 32-bit floats its division gave NaN, a black
  // pixel, about one time in six). The weight there is the overestimation.
  if (!(abs(c.z) > 1e-5 * max(abs(c.x), abs(c.y)))) {
    return exp(-b0 * MOMENT_OVERESTIMATION);
  }
  // The roots of c0 + c1 x + c2 x² are the other two support points.
  let p = c.y / c.z;
  let q = c.x / c.z;
  let r = sqrt(max(p * p * 0.25 - q, 0.0));
  let z1 = -p * 0.5 - r;
  let z2 = -p * 0.5 + r;
  // The weights in front of z: the quadratic through (z, overestimation),
  // (z1, 1 if in front), (z2, the same), its expectation under the moments.
  let f0 = MOMENT_OVERESTIMATION;
  let f1 = select(0.0, 1.0, z1 < z);
  let f2 = select(0.0, 1.0, z2 < z);
  let f01 = (f1 - f0) / (z1 - z);
  let f12 = (f2 - f1) / (z2 - z1);
  let f012 = (f12 - f01) / (z2 - z);
  let k1 = f01 - f012 * z1;
  let p2 = f012;
  let p1 = k1 - f012 * z;
  let p0 = f0 - k1 * z;
  let absorbance = p0 + dot(b.xy, vec2f(p1, p2));
  return clamp(exp(-b0 * absorbance), 0.0, 1.0);
}

struct AccumulatedOut {
  // Scene-referred light weighted by the light reaching it (rgb), and the
  // weights summed (a, over every fragment, lit or not).
  @location(0) lit: vec4f,
  // Display-referred (unlit) color, the same.
  @location(1) unlit: vec4f,
};

@fragment
fn fsMomentColor(in: VsOut, @builtin(front_facing) frontFacing: bool) -> AccumulatedOut {
  let slope = depthSlope(in.position);
  let surface = shadeSurface(in, frontFacing, true);
  let alpha = clamp(surface.alpha, 0.0, 1.0) * uncovered(in.position, slope);
  if (alpha <= 0.0 || surface.alpha >= TRANSLUCENT_ALPHA) {
    discard;
  }
  let p = vec2u(in.position.xy);
  let b0 = textureLoad(momentsZero, p, 0).r;
  let sums = textureLoad(momentsHigher, p, 0);
  let w = transmittanceBefore(b0, sums, momentDepth(in.relPosition)) * alpha;
  // Bright layers summed stay below fp16's largest value.
  let weighted = min(surface.color * w, vec3f(16384.0));
  var out: AccumulatedOut;
  out.lit = vec4f(select(weighted, vec3f(0.0), surface.unlit), w);
  out.unlit = vec4f(select(vec3f(0.0), weighted, surface.unlit), 0.0);
  return out;
}
