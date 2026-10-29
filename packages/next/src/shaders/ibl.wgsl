// Image-based lighting, built on the GPU with compute shaders:
//   sky      — render the environment radiance into a cube map (procedural
//              sky for now; the M4 atmosphere renders here instead)
//   prefilter— GGX-prefiltered specular mips (roughness = mip / (levels - 1))
//   shFace   — per-face SH9 projection by workgroup reduction
//   shFinal  — sum the faces into irradiance coefficients (E/π form)
//   brdf     — split-sum BRDF lookup table (scale, bias)
//
// Directions are in the environment frame: x = east, y = up, z = -north
// (y-up, the same convention as CesiumJS 1.x's IBL reference frame).

const PI: f32 = 3.14159265358979;

struct SkyParams {
  zenith: vec4f,     // rgb radiance
  horizon: vec4f,
  ground: vec4f,
  size: u32,         // face size of the target level
  level: u32,        // mip level being written (prefilter)
  levels: u32,       // total mip levels
  sampleCount: u32,
};

@group(0) @binding(0) var<uniform> params: SkyParams;

// Direction for texel (x, y) of cube face `face` (WebGPU/D3D layer order:
// +X, -X, +Y, -Y, +Z, -Z), sampled at texel centers.
fn cubeDirection(face: u32, x: u32, y: u32, size: u32) -> vec3f {
  let u = (f32(x) + 0.5) / f32(size) * 2.0 - 1.0;
  let v = (f32(y) + 0.5) / f32(size) * 2.0 - 1.0;
  switch (face) {
    case 0u: { return normalize(vec3f(1.0, -v, -u)); }
    case 1u: { return normalize(vec3f(-1.0, -v, u)); }
    case 2u: { return normalize(vec3f(u, 1.0, v)); }
    case 3u: { return normalize(vec3f(u, -1.0, -v)); }
    case 4u: { return normalize(vec3f(u, -v, 1.0)); }
    default: { return normalize(vec3f(-u, -v, -1.0)); }
  }
}

fn skyRadiance(d: vec3f) -> vec3f {
  if (d.y >= 0.0) {
    let t = pow(1.0 - d.y, 3.0);
    return mix(params.zenith.rgb, params.horizon.rgb, t);
  }
  let t = pow(1.0 + d.y, 6.0);
  return mix(params.ground.rgb, params.horizon.rgb * 0.5, t);
}

// --- sky --------------------------------------------------------------------

@group(1) @binding(0) var skyTarget: texture_storage_2d_array<rgba16float, write>;

@compute @workgroup_size(8, 8, 1)
fn sky(@builtin(global_invocation_id) id: vec3u) {
  if (id.x >= params.size || id.y >= params.size) {
    return;
  }
  let d = cubeDirection(id.z, id.x, id.y, params.size);
  textureStore(skyTarget, vec2u(id.xy), id.z, vec4f(skyRadiance(d), 1.0));
}

// --- prefilter (GGX importance sampling, Karis 2013) -------------------------

@group(1) @binding(1) var source: texture_cube<f32>;
@group(1) @binding(2) var linearSampler: sampler;
@group(1) @binding(3) var prefilterTarget: texture_storage_2d_array<rgba16float, write>;

fn hammersley(i: u32, n: u32) -> vec2f {
  var bits = i;
  bits = (bits << 16u) | (bits >> 16u);
  bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
  bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
  bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
  bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
  return vec2f(f32(i) / f32(n), f32(bits) * 2.3283064365386963e-10);
}

fn importanceSampleGgx(xi: vec2f, n: vec3f, alpha: f32) -> vec3f {
  let phi = 2.0 * PI * xi.x;
  let cosTheta = sqrt((1.0 - xi.y) / (1.0 + (alpha * alpha - 1.0) * xi.y));
  let sinTheta = sqrt(1.0 - cosTheta * cosTheta);
  let h = vec3f(sinTheta * cos(phi), sinTheta * sin(phi), cosTheta);
  let up = select(vec3f(1.0, 0.0, 0.0), vec3f(0.0, 0.0, 1.0), abs(n.z) < 0.999);
  let tx = normalize(cross(up, n));
  let ty = cross(n, tx);
  return normalize(tx * h.x + ty * h.y + n * h.z);
}

@compute @workgroup_size(8, 8, 1)
fn prefilter(@builtin(global_invocation_id) id: vec3u) {
  if (id.x >= params.size || id.y >= params.size) {
    return;
  }
  let n = cubeDirection(id.z, id.x, id.y, params.size);
  let roughness = f32(params.level) / f32(max(params.levels - 1u, 1u));
  var color = vec3f(0.0);
  if (params.level == 0u) {
    color = textureSampleLevel(source, linearSampler, n, 0.0).rgb;
  } else {
    let alpha = roughness * roughness;
    var weight = 0.0;
    for (var i = 0u; i < params.sampleCount; i++) {
      let h = importanceSampleGgx(hammersley(i, params.sampleCount), n, alpha);
      let l = normalize(2.0 * dot(n, h) * h - n);
      let nDotL = dot(n, l);
      if (nDotL > 0.0) {
        // Sample a blurrier source level where the sample density is low
        // (filtered importance sampling) to avoid fireflies.
        let nDotH = max(dot(n, h), 0.0);
        let a2 = alpha * alpha;
        let d = a2 / (PI * pow(nDotH * nDotH * (a2 - 1.0) + 1.0, 2.0));
        let pdf = d * 0.25 + 1e-4;
        let sourceSize = f32(textureDimensions(source).x);
        let texelSolidAngle = 4.0 * PI / (6.0 * sourceSize * sourceSize);
        let sampleSolidAngle = 1.0 / (f32(params.sampleCount) * pdf);
        let lod = max(0.5 * log2(sampleSolidAngle / texelSolidAngle) + 1.0, 0.0);
        color += textureSampleLevel(source, linearSampler, l, lod).rgb * nDotL;
        weight += nDotL;
      }
    }
    color /= max(weight, 1e-4);
  }
  textureStore(prefilterTarget, vec2u(id.xy), id.z, vec4f(color, 1.0));
}

// --- SH9 projection ---------------------------------------------------------

@group(1) @binding(4) var shSource: texture_2d_array<f32>;
@group(1) @binding(5) var<storage, read_write> shPartial: array<vec4f>; // 6 faces × 9
@group(1) @binding(6) var<storage, read_write> shOut: array<vec4f>;     // 9, E/π form

var<workgroup> partialSums: array<array<vec3f, 9>, 64>;

fn shBasis(d: vec3f) -> array<f32, 9> {
  return array<f32, 9>(
    0.282095,
    0.488603 * d.y,
    0.488603 * d.z,
    0.488603 * d.x,
    1.092548 * d.x * d.y,
    1.092548 * d.y * d.z,
    0.315392 * (3.0 * d.z * d.z - 1.0),
    1.092548 * d.x * d.z,
    0.546274 * (d.x * d.x - d.y * d.y),
  );
}

@compute @workgroup_size(64, 1, 1)
fn shFace(@builtin(local_invocation_index) lid: u32, @builtin(workgroup_id) wg: vec3u) {
  let face = wg.x;
  let size = textureDimensions(shSource).x;
  var sum: array<vec3f, 9>;
  for (var k = 0u; k < 9u; k++) {
    sum[k] = vec3f(0.0);
  }
  for (var t = lid; t < size * size; t += 64u) {
    let x = t % size;
    let y = t / size;
    let d = cubeDirection(face, x, y, size);
    // Solid angle of a cube texel: (2/size)^2 / |p|^3 with p on the unit cube.
    let u = (f32(x) + 0.5) / f32(size) * 2.0 - 1.0;
    let v = (f32(y) + 0.5) / f32(size) * 2.0 - 1.0;
    let solidAngle = 4.0 / (f32(size * size) * pow(1.0 + u * u + v * v, 1.5));
    let radiance = textureLoad(shSource, vec2u(x, y), face, 0).rgb;
    let basis = shBasis(d);
    for (var k = 0u; k < 9u; k++) {
      sum[k] += radiance * basis[k] * solidAngle;
    }
  }
  partialSums[lid] = sum;
  workgroupBarrier();
  for (var stride = 32u; stride > 0u; stride >>= 1u) {
    if (lid < stride) {
      for (var k = 0u; k < 9u; k++) {
        partialSums[lid][k] += partialSums[lid + stride][k];
      }
    }
    workgroupBarrier();
  }
  if (lid == 0u) {
    for (var k = 0u; k < 9u; k++) {
      shPartial[face * 9u + k] = vec4f(partialSums[0][k], 0.0);
    }
  }
}

// Ramamoorthi & Hanrahan 2001: irradiance E(n) from radiance SH, rewritten
// for evaluation as
//   c0 + c1·y + c2·z + c3·x + c4·xy + c5·yz + c6·(3z²−1) + c7·xz + c8·(x²−y²)
// and divided by π, so shading multiplies it by the diffuse albedo directly
// (the same form as CesiumJS 1.x's czm_sphericalHarmonics).
@compute @workgroup_size(1)
fn shFinal() {
  var L: array<vec3f, 9>;
  for (var k = 0u; k < 9u; k++) {
    L[k] = vec3f(0.0);
    for (var f = 0u; f < 6u; f++) {
      L[k] += shPartial[f * 9u + k].xyz;
    }
  }
  let c1 = 0.429043;
  let c2 = 0.511664;
  let c3 = 0.743125;
  let c4 = 0.886227;
  let s = 1.0 / PI;
  shOut[0] = vec4f(c4 * L[0] * s, 0.0);
  shOut[1] = vec4f(2.0 * c2 * L[1] * s, 0.0);
  shOut[2] = vec4f(2.0 * c2 * L[2] * s, 0.0);
  shOut[3] = vec4f(2.0 * c2 * L[3] * s, 0.0);
  shOut[4] = vec4f(2.0 * c1 * L[4] * s, 0.0);
  shOut[5] = vec4f(2.0 * c1 * L[5] * s, 0.0);
  shOut[6] = vec4f(c3 / 3.0 * L[6] * s, 0.0);
  shOut[7] = vec4f(2.0 * c1 * L[7] * s, 0.0);
  shOut[8] = vec4f(c1 * L[8] * s, 0.0);
}

// --- BRDF LUT (split sum: scale and bias of F0) -------------------------------

@group(1) @binding(7) var brdfTarget: texture_storage_2d<rgba16float, write>;

@compute @workgroup_size(8, 8, 1)
fn brdf(@builtin(global_invocation_id) id: vec3u) {
  let size = textureDimensions(brdfTarget);
  if (id.x >= size.x || id.y >= size.y) {
    return;
  }
  let nDotV = max((f32(id.x) + 0.5) / f32(size.x), 1e-4);
  let roughness = (f32(id.y) + 0.5) / f32(size.y);
  let alpha = roughness * roughness;
  let v = vec3f(sqrt(1.0 - nDotV * nDotV), 0.0, nDotV);
  let n = vec3f(0.0, 0.0, 1.0);
  var a = 0.0;
  var b = 0.0;
  let count = 512u;
  for (var i = 0u; i < count; i++) {
    let h = importanceSampleGgx(hammersley(i, count), n, alpha);
    let l = normalize(2.0 * dot(v, h) * h - v);
    let nDotL = max(l.z, 0.0);
    let nDotH = max(h.z, 0.0);
    let vDotH = max(dot(v, h), 0.0);
    if (nDotL > 0.0) {
      // Height-correlated Smith visibility, as in the direct lighting.
      let a2 = alpha * alpha;
      let ggxV = nDotL * sqrt(nDotV * nDotV * (1.0 - a2) + a2);
      let ggxL = nDotV * sqrt(nDotL * nDotL * (1.0 - a2) + a2);
      let vis = 0.5 / max(ggxV + ggxL, 1e-6);
      let g = vis * 4.0 * nDotL * vDotH / max(nDotH, 1e-6);
      let fc = pow(1.0 - vDotH, 5.0);
      a += (1.0 - fc) * g;
      b += fc * g;
    }
  }
  textureStore(brdfTarget, vec2u(id.xy), vec4f(a / f32(count), b / f32(count), 0.0, 1.0));
}
