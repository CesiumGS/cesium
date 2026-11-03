// Ambient occlusion: ground-truth ambient occlusion (GTAO; Jimenez et al.
// 2016, in the form of Intel's XeGTAO) from the view's depth and normal
// prepass, at half resolution (one pixel of each 2 × 2). Per pixel, two
// slices through the view direction at angles set by interleaved gradient
// noise; along each, the highest horizon on either side within a world
// radius (6 steps a side, in full-resolution pixels), and the
// cosine-weighted visible arc between them, integrated exactly. Then, per
// full-resolution pixel, a depth-aware 3 × 3 of the half-resolution result
// (upsampling and blurring the noise at once), written to a buffer the
// opaque pass reads (4 pixels a word, 8 bits each), where it occludes the
// environment's light. Full resolution with a 5 × 5 blur took 13 ms at 2.6
// megapixels.
//
// Positions are camera-relative, rebuilt from reverse-Z depth: a pixel's
// distance along the view is near / depth.

struct AoParams {
  right: vec4f,    // camera right (xyz); w: tan of the half field of view, x
  up: vec4f,       // camera up (xyz); w: the same, y
  forward: vec4f,  // camera forward (xyz); w: near plane, m
  size: vec4f,     // width, height (pixels); radius, m; largest radius, pixels
};

@group(0) @binding(0) var<uniform> params: AoParams;
@group(0) @binding(1) var depthTexture: texture_depth_2d;
@group(0) @binding(2) var normalTexture: texture_2d<f32>;
@group(0) @binding(3) var rawAo: texture_storage_2d<r32float, write>;

// The blur's own (each entry point's layout holds what it uses).
@group(0) @binding(4) var rawInput: texture_2d<f32>;
@group(0) @binding(5) var<storage, read_write> aoWords: array<u32>;

const PI: f32 = 3.14159265358979;
const SLICES: u32 = 2u;
const STEPS: u32 = 6u;

fn distanceAt(depth: f32, near: f32) -> f32 {
  return near / max(depth, 1e-30);
}

fn positionAt(pixel: vec2f, depth: f32) -> vec3f {
  let ndc = vec2f(pixel.x / params.size.x * 2.0 - 1.0, 1.0 - pixel.y / params.size.y * 2.0);
  let ray = params.forward.xyz + params.right.xyz * (ndc.x * params.right.w) + params.up.xyz * (ndc.y * params.up.w);
  return ray * distanceAt(depth, params.forward.w);
}

// Jimenez's interleaved gradient noise.
fn noise(pixel: vec2f) -> f32 {
  return fract(52.9829189 * fract(dot(pixel, vec2f(0.06711056, 0.00583715))));
}

fn fastAcos(x: f32) -> f32 {
  let a = abs(x);
  var r = (-0.156583 * a + PI * 0.5) * sqrt(max(1.0 - a, 0.0));
  return select(PI - r, r, x >= 0.0);
}

@compute @workgroup_size(8, 8, 1)
fn gtao(@builtin(global_invocation_id) id: vec3u) {
  let size = vec2u(params.size.xy);
  let full = id.xy * 2u;
  if (full.x >= size.x || full.y >= size.y) {
    return;
  }
  let depth = textureLoad(depthTexture, full, 0);
  // Nothing drawn (the sky): unoccluded.
  if (depth <= 0.0) {
    textureStore(rawAo, id.xy, vec4f(1.0));
    return;
  }
  let pixel = vec2f(full) + 0.5;
  let center = positionAt(pixel, depth);
  let normal = normalize(textureLoad(normalTexture, full, 0).xyz);
  let viewVec = normalize(-center);
  let radius = params.size.z;
  // The radius on screen: the focal length in pixels over the distance.
  let focal = params.size.y * 0.5 / params.up.w;
  let screenRadius = min(radius * focal / distanceAt(depth, params.forward.w), params.size.w);
  if (screenRadius < 1.0) {
    textureStore(rawAo, id.xy, vec4f(1.0));
    return;
  }
  let falloffRange = 0.615 * radius;
  let falloffFrom = radius * (1.0 - 0.615);
  let falloffMul = -1.0 / falloffRange;
  let falloffAdd = falloffFrom / falloffRange + 1.0;
  let jitterAngle = noise(pixel);
  let jitterStep = noise(pixel + vec2f(37.0, 17.0));
  var visibility = 0.0;
  for (var s = 0u; s < SLICES; s++) {
    let phi = (f32(s) + jitterAngle) / f32(SLICES) * PI;
    let omega = vec2f(cos(phi), sin(phi));
    // The slice's direction in the scene (screen y is down).
    let direction = params.right.xyz * omega.x + params.up.xyz * omega.y;
    let screenDirection = vec2f(omega.x, -omega.y);
    let ortho = direction - viewVec * dot(direction, viewVec);
    let axis = normalize(cross(ortho, viewVec));
    let projected = normal - axis * dot(normal, axis);
    let projectedLength = length(projected);
    if (projectedLength < 1e-4) {
      visibility += 1.0;
      continue;
    }
    let signN = sign(dot(ortho, projected));
    let cosN = clamp(dot(projected, viewVec) / projectedLength, -1.0, 1.0);
    let n = signN * fastAcos(cosN);
    let low0 = cos(n + PI * 0.5);
    let low1 = cos(n - PI * 0.5);
    var horizon0 = low0;
    var horizon1 = low1;
    for (var k = 0u; k < STEPS; k++) {
      // Quadratic steps: denser near the pixel.
      let t = (f32(k) + jitterStep) / f32(STEPS);
      let offset = screenDirection * max(t * t * screenRadius, 1.0);
      let p0 = pixel + offset;
      let p1 = pixel - offset;
      if (all(p0 >= vec2f(0.0)) && all(p0 < params.size.xy)) {
        let d0 = textureLoad(depthTexture, vec2u(p0), 0);
        if (d0 > 0.0) {
          let delta = positionAt(floor(p0) + 0.5, d0) - center;
          let distance = length(delta);
          let weight = clamp(distance * falloffMul + falloffAdd, 0.0, 1.0);
          horizon0 = max(horizon0, mix(low0, dot(delta / distance, viewVec), weight));
        }
      }
      if (all(p1 >= vec2f(0.0)) && all(p1 < params.size.xy)) {
        let d1 = textureLoad(depthTexture, vec2u(p1), 0);
        if (d1 > 0.0) {
          let delta = positionAt(floor(p1) + 0.5, d1) - center;
          let distance = length(delta);
          let weight = clamp(distance * falloffMul + falloffAdd, 0.0, 1.0);
          horizon1 = max(horizon1, mix(low1, dot(delta / distance, viewVec), weight));
        }
      }
    }
    var h0 = -fastAcos(horizon1);
    var h1 = fastAcos(horizon0);
    h0 = n + clamp(h0 - n, -PI * 0.5, PI * 0.5);
    h1 = n + clamp(h1 - n, -PI * 0.5, PI * 0.5);
    let sinN = sin(n);
    let arc0 = (cosN + 2.0 * h0 * sinN - cos(2.0 * h0 - n)) * 0.25;
    let arc1 = (cosN + 2.0 * h1 * sinN - cos(2.0 * h1 - n)) * 0.25;
    visibility += projectedLength * (arc0 + arc1);
  }
  textureStore(rawAo, id.xy, vec4f(clamp(visibility / f32(SLICES), 0.0, 1.0)));
}

// The upsample and blur: the 3 × 3 half-resolution pixels around each
// pixel, each weighted by how close its distance is to the pixel's (no
// occlusion bleeding across depth edges). Four pixels of a row per thread,
// packed into one word.
@compute @workgroup_size(8, 8, 1)
fn denoise(@builtin(global_invocation_id) id: vec3u) {
  let size = vec2i(params.size.xy);
  let words = (size.x + 3) / 4;
  if (i32(id.x) >= words || i32(id.y) >= size.y) {
    return;
  }
  var packed = 0u;
  for (var i = 0; i < 4; i++) {
    let p = vec2i(i32(id.x) * 4 + i, i32(id.y));
    var ao = 1.0;
    if (p.x < size.x) {
      let depth = textureLoad(depthTexture, p, 0);
      if (depth > 0.0) {
        let distance = params.forward.w / depth;
        var sum = 0.0;
        var total = 0.0;
        let half = (size + 1) / 2;
        let center = p / 2;
        for (var dy = -1; dy <= 1; dy++) {
          for (var dx = -1; dx <= 1; dx++) {
            let q = clamp(center + vec2i(dx, dy), vec2i(0), half - 1);
            let d = textureLoad(depthTexture, min(q * 2, size - 1), 0);
            let other = params.forward.w / max(d, 1e-30);
            let w = select(0.0, 1.0 / (1.0 + 50.0 * abs(other - distance) / distance), d > 0.0);
            sum += textureLoad(rawInput, q, 0).r * w;
            total += w;
          }
        }
        ao = sum / max(total, 1e-6);
      }
    }
    packed |= u32(round(clamp(ao, 0.0, 1.0) * 255.0)) << (8u * u32(i));
  }
  aoWords[u32(id.y) * u32(words) + id.x] = packed;
}
