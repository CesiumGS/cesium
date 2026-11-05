// The image-based lighting reference (plan §4.2): for each pixel of a
// camera's view of analytic spheres, the light reflected toward the camera
// from an environment cube, integrated by Monte Carlo with the glTF
// specification's BRDF (Appendix B: Lambertian diffuse and GGX specular
// with Smith height-correlated visibility, Schlick Fresnel, mixed by
// metallic) and no approximation: no spherical harmonics, no prefiltering,
// no split sum. Directions are sampled from the cosine lobe and the GGX
// distribution of visible normals (Heitz 2018), combined with the balance
// heuristic. No occlusion between spheres, as 2.0's IBL has none.

struct Params {
  width: u32,
  height: u32,
  samples: u32,
  seed: u32,
  // Camera basis (world), and tan of the half field of view.
  direction: vec3f,
  tanX: f32,
  up: vec3f,
  tanY: f32,
  right: vec3f,
  sphereCount: u32,
  // World → environment frame (rows), as 2.0's iblFrame.
  env0: vec3f,
  pad0: f32,
  env1: vec3f,
  pad1: f32,
  env2: vec3f,
  pad2: f32,
};

struct Sphere {
  // Center relative to the camera, and radius.
  center: vec3f,
  radius: f32,
  baseColor: vec3f,
  metallic: f32,
  roughness: f32,
  pad0: f32,
  pad1: f32,
  pad2: f32,
};

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> spheres: array<Sphere>;
@group(0) @binding(2) var environment: texture_cube<f32>;
@group(0) @binding(3) var environmentSampler: sampler;
// rgb: summed radiance; a: 1 where a sphere was hit.
@group(0) @binding(4) var<storage, read_write> accum: array<vec4f>;

const PI = 3.14159265358979;

fn pcg(v: u32) -> u32 {
  let state = v * 747796405u + 2891336453u;
  let word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  return (word >> 22u) ^ word;
}

struct Rng { state: u32 };

fn random(rng: ptr<function, Rng>) -> f32 {
  (*rng).state = pcg((*rng).state);
  return f32((*rng).state >> 8u) * (1.0 / 16777216.0);
}

fn radiance(d: vec3f) -> vec3f {
  let e = vec3f(dot(d, params.env0), dot(d, params.env1), dot(d, params.env2));
  return textureSampleLevel(environment, environmentSampler, e, 0.0).rgb;
}

fn basis(n: vec3f) -> mat3x3f {
  let s = select(-1.0, 1.0, n.z >= 0.0);
  let a = -1.0 / (s + n.z);
  let b = n.x * n.y * a;
  return mat3x3f(
    vec3f(1.0 + s * n.x * n.x * a, s * b, -s * n.x),
    vec3f(b, s + n.y * n.y * a, -n.y),
    n,
  );
}

fn ggx(alpha: f32, nDotH: f32) -> f32 {
  let a2 = alpha * alpha;
  let f = (nDotH * a2 - nDotH) * nDotH + 1.0;
  return a2 / (PI * f * f);
}

fn smithG1(alpha: f32, nDotX: f32) -> f32 {
  let a2 = alpha * alpha;
  return 2.0 * nDotX / (nDotX + sqrt(a2 + (1.0 - a2) * nDotX * nDotX));
}

fn smithVisibility(alpha: f32, nDotL: f32, nDotV: f32) -> f32 {
  let a2 = alpha * alpha;
  let ggxV = nDotL * sqrt(nDotV * nDotV * (1.0 - a2) + a2);
  let ggxL = nDotV * sqrt(nDotL * nDotL * (1.0 - a2) + a2);
  return 0.5 / max(ggxV + ggxL, 1e-12);
}

// A visible normal in the local frame (z = n), Heitz 2018.
fn sampleVisibleNormal(v: vec3f, alpha: f32, u1: f32, u2: f32) -> vec3f {
  let vh = normalize(vec3f(alpha * v.x, alpha * v.y, v.z));
  let lensq = vh.x * vh.x + vh.y * vh.y;
  let t1 = select(vec3f(1.0, 0.0, 0.0), vec3f(-vh.y, vh.x, 0.0) / sqrt(lensq), lensq > 0.0);
  let t2 = cross(vh, t1);
  let r = sqrt(u1);
  let phi = 2.0 * PI * u2;
  let p1 = r * cos(phi);
  var p2 = r * sin(phi);
  let s = 0.5 * (1.0 + vh.z);
  p2 = (1.0 - s) * sqrt(1.0 - p1 * p1) + s * p2;
  let nh = p1 * t1 + p2 * t2 + sqrt(max(0.0, 1.0 - p1 * p1 - p2 * p2)) * vh;
  return normalize(vec3f(alpha * nh.x, alpha * nh.y, max(0.0, nh.z)));
}

struct Material {
  diffuse: vec3f,
  f0: vec3f,
  alpha: f32,
};

// BRDF × cos θ (local frame, z = n).
fn brdfCos(m: Material, v: vec3f, l: vec3f) -> vec3f {
  if (l.z <= 0.0 || v.z <= 0.0) {
    return vec3f(0.0);
  }
  let h = normalize(v + l);
  let vDotH = max(dot(v, h), 0.0);
  let x = 1.0 - vDotH;
  let fresnel = m.f0 + (1.0 - m.f0) * (x * x * x * x * x);
  let specular = fresnel * ggx(m.alpha, h.z) * smithVisibility(m.alpha, l.z, v.z);
  let diffuse = (1.0 - fresnel) * m.diffuse / PI;
  return (diffuse + specular) * l.z;
}

// The two strategies' densities for a direction l (solid angle).
fn pdfCosine(l: vec3f) -> f32 {
  return max(l.z, 0.0) / PI;
}

fn pdfVisibleNormal(m: Material, v: vec3f, l: vec3f) -> f32 {
  if (l.z <= 0.0) {
    return 0.0;
  }
  let h = normalize(v + l);
  let vDotH = dot(v, h);
  if (vDotH <= 0.0) {
    return 0.0;
  }
  // D_v(h) / (4 v·h), D_v(h) = G1(v) max(0, v·h) D(h) / v.z.
  return smithG1(m.alpha, v.z) * ggx(m.alpha, h.z) / (4.0 * v.z);
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3u) {
  if (id.x >= params.width || id.y >= params.height) {
    return;
  }
  let index = id.y * params.width + id.x;
  // The pixel's ray, as 2.0's camera projects (pixel centers, y down).
  let ndc = vec2f(
    (f32(id.x) + 0.5) / f32(params.width) * 2.0 - 1.0,
    1.0 - (f32(id.y) + 0.5) / f32(params.height) * 2.0,
  );
  let ray = normalize(params.direction + ndc.x * params.tanX * params.right + ndc.y * params.tanY * params.up);
  var nearest = 1e30;
  var hit = -1;
  for (var i = 0u; i < params.sphereCount; i++) {
    let s = spheres[i];
    let b = dot(ray, s.center);
    let c = dot(s.center, s.center) - s.radius * s.radius;
    let disc = b * b - c;
    if (disc >= 0.0) {
      let t = b - sqrt(disc);
      if (t > 0.0 && t < nearest) {
        nearest = t;
        hit = i32(i);
      }
    }
  }
  if (hit < 0) {
    return;
  }
  let s = spheres[hit];
  let n = normalize(ray * nearest - s.center);
  let frame = basis(n);
  let toLocal = transpose(frame);
  let v = toLocal * -ray;
  var m: Material;
  m.diffuse = s.baseColor * (1.0 - s.metallic);
  m.f0 = mix(vec3f(0.04), s.baseColor, s.metallic);
  m.alpha = max(s.roughness * s.roughness, 1e-3);

  var rng: Rng;
  rng.state = pcg(index * 7919u + params.seed * 104729u + 1u);
  var sum = vec3f(0.0);
  for (var k = 0u; k < params.samples; k++) {
    // Cosine sample.
    let u1 = random(&rng);
    let phi = 2.0 * PI * random(&rng);
    let r = sqrt(u1);
    let lc = vec3f(r * cos(phi), r * sin(phi), sqrt(max(0.0, 1.0 - u1)));
    let pc = pdfCosine(lc) + pdfVisibleNormal(m, v, lc);
    if (pc > 0.0) {
      sum += brdfCos(m, v, lc) * radiance(frame * lc) / pc;
    }
    // Visible-normal sample.
    let h = sampleVisibleNormal(v, m.alpha, random(&rng), random(&rng));
    let lg = reflect(-v, h);
    let pg = pdfCosine(lg) + pdfVisibleNormal(m, v, lg);
    if (lg.z > 0.0 && pg > 0.0) {
      sum += brdfCos(m, v, lg) * radiance(frame * lg) / pg;
    }
  }
  accum[index] += vec4f(sum, 1.0);
}
