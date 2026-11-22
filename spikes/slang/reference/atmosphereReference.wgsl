// The reference atmosphere (plan §4.2): an unbiased spectral Monte Carlo
// volumetric path tracer through a spherical planet's atmosphere, against
// which real-time approximations are judged. Not fast; exact in the limit.
//
// One invocation per direction, `samples` paths per dispatch, each carrying
// four wavelengths stratified over 360-830 nm, accumulated as CIE XYZ. Free
// flights by spectral tracking (Kutz et al. 2017): one majorant for all four
// wavelengths, events chosen from their average coefficients, and a weight
// per wavelength that keeps each unbiased (far less color noise than one
// wavelength per path). Scattering events add next-event estimation toward
// the sun with transmittance by ratio tracking; Rayleigh, aerosol
// (Cornette-Shanks) and ozone absorption; a Lambertian ground. The sun's
// disk itself is not included (it is a separate term).
//
// Precision: positions are in a frame whose origin is the ground point
// below the observer, z up, so heights above the sphere are computed
// without cancellation (|P|² − R² = x² + y² + w(2R + w), P = p + (0, 0, R)).

struct Params {
  observerHeight: f32,
  samples: u32, // paths per direction in this dispatch
  seed: u32,
  count: u32, // directions
  sun: vec3f,
  maxScattering: u32,
  bottomRadius: f32,
  topRadius: f32,
  rayleigh: f32,
  rayleighScaleHeight: f32,
  mieBeta: f32,
  mieAngstromAlpha: f32,
  mieScaleHeight: f32,
  mieSingleScatteringAlbedo: f32,
  miePhaseG: f32,
  ozoneMaxDensity: f32, // molecules·m⁻³ at the ozone profile's peak
  groundAlbedo: f32,
  groundReflection: u32,
};

@group(0) @binding(0) var<uniform> params: Params;
// xyz: direction in the observer's frame (z up).
@group(0) @binding(1) var<storage, read> directions: array<vec4f>;
// xyz: summed CIE XYZ (W·m⁻²·sr⁻¹ before ×683), w: paths.
@group(0) @binding(2) var<storage, read_write> accum: array<vec4f>;
// Solar irradiance (48, every 10 nm), ozone cross-sections (48), then the
// CIE 1931 x̄ ȳ z̄ (95 × 3, every 5 nm), all from 360 nm.
@group(0) @binding(3) var<storage, read> spectra: array<f32>;

const LAMBDA_MIN = 360.0;
const LAMBDA_RANGE = 470.0;
const PI = 3.14159265358979;
const OZONE_OFFSET = 48u;
const CIE_OFFSET = 96u;

// PCG hash (Jarzynski & Olano 2020).
fn pcg(v: u32) -> u32 {
  let state = v * 747796405u + 2891336453u;
  let word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  return (word >> 22u) ^ word;
}

struct Rng { state: u32 };

fn random(rng: ptr<function, Rng>) -> f32 {
  (*rng).state = pcg((*rng).state);
  // 24 random bits in [0, 1).
  return f32((*rng).state >> 8u) * (1.0 / 16777216.0);
}

fn table10(offset: u32, lambda: f32) -> f32 {
  let x = clamp((lambda - LAMBDA_MIN) / 10.0, 0.0, 47.0);
  let i = min(u32(x), 46u);
  let u = x - f32(i);
  return mix(spectra[offset + i], spectra[offset + i + 1u], u);
}

fn cie(lambda: f32) -> vec3f {
  let x = clamp((lambda - LAMBDA_MIN) / 5.0, 0.0, 94.0);
  let i = min(u32(x), 93u);
  let u = x - f32(i);
  let a = CIE_OFFSET + i * 3u;
  let b = a + 3u;
  return mix(
    vec3f(spectra[a], spectra[a + 1u], spectra[a + 2u]),
    vec3f(spectra[b], spectra[b + 1u], spectra[b + 2u]),
    u,
  );
}

// Coefficients at density 1 for the path's four wavelengths.
struct Medium {
  rayleigh: vec4f,
  mieScattering: vec4f,
  mieExtinction: vec4f,
  ozone: vec4f,
  // One majorant for all four (each density is at most 1).
  majorant: f32,
};

fn table10v(offset: u32, lambda: vec4f) -> vec4f {
  return vec4f(
    table10(offset, lambda.x),
    table10(offset, lambda.y),
    table10(offset, lambda.z),
    table10(offset, lambda.w),
  );
}

fn medium(lambda: vec4f) -> Medium {
  let microns = lambda * 1e-3;
  let mie = params.mieBeta / params.mieScaleHeight * pow(microns, vec4f(-params.mieAngstromAlpha));
  var m: Medium;
  m.rayleigh = params.rayleigh * pow(microns, vec4f(-4.0));
  m.mieExtinction = mie;
  m.mieScattering = mie * params.mieSingleScatteringAlbedo;
  m.ozone = params.ozoneMaxDensity * table10v(OZONE_OFFSET, lambda);
  let total = m.rayleigh + m.mieExtinction + m.ozone;
  m.majorant = max(max(total.x, total.y), max(total.z, total.w));
  return m;
}

// |P|² − R² for a local position (no cancellation near the ground).
fn radialExcess(p: vec3f) -> f32 {
  return p.x * p.x + p.y * p.y + p.z * (2.0 * params.bottomRadius + p.z);
}

fn height(p: vec3f) -> f32 {
  let R = params.bottomRadius;
  let P = vec3f(p.xy, p.z + R);
  return radialExcess(p) / (length(P) + R);
}

// Rayleigh, aerosol and ozone densities at a height.
fn densities(h: f32) -> vec3f {
  let ozone = select(
    clamp(-h / 15000.0 + 8.0 / 3.0, 0.0, 1.0),
    clamp(h / 15000.0 - 2.0 / 3.0, 0.0, 1.0),
    h < 25000.0,
  );
  return vec3f(
    exp(-h / params.rayleighScaleHeight),
    exp(-h / params.mieScaleHeight),
    ozone,
  );
}

fn extinction(m: Medium, h: f32) -> vec4f {
  let d = densities(h);
  return m.rayleigh * d.x + m.mieExtinction * d.y + m.ozone * d.z;
}

// Intersections of a ray with the sphere |P|² = R² + k (k = r² − R²):
// (near, far), or (-1, -1) on a miss. Numerically stable quadratic.
fn sphere(p: vec3f, d: vec3f, k: f32) -> vec2f {
  let b = dot(p, d) + params.bottomRadius * d.z;
  let c = radialExcess(p) - k;
  let disc = b * b - c;
  if (disc < 0.0) {
    return vec2f(-1.0);
  }
  let s = sqrt(disc);
  let q = -(b + select(s, -s, b < 0.0));
  if (q == 0.0) {
    return vec2f(0.0);
  }
  let t0 = q;
  let t1 = c / q;
  return vec2f(min(t0, t1), max(t0, t1));
}

// k for the top of the atmosphere.
fn topK() -> f32 {
  return (params.topRadius - params.bottomRadius) * (params.topRadius + params.bottomRadius);
}

// Distance to where the ray leaves the atmosphere or meets the ground; .y
// is 1 for the ground.
fn extent(p: vec3f, d: vec3f) -> vec2f {
  let ground = sphere(p, d, 0.0);
  if (ground.x > 0.0) {
    return vec2f(ground.x, 1.0);
  }
  let top = sphere(p, d, topK());
  return vec2f(max(top.y, 0.0), 0.0);
}

// Transmittance toward the sun by ratio tracking (0 behind the ground).
fn sunTransmittance(p: vec3f, m: Medium, rng: ptr<function, Rng>) -> vec4f {
  let e = extent(p, params.sun);
  if (e.y > 0.5) {
    return vec4f(0.0);
  }
  var t = 0.0;
  var transmittance = vec4f(1.0);
  for (var i = 0u; i < 4096u; i++) {
    t -= log(1.0 - random(rng)) / m.majorant;
    if (t >= e.x) {
      break;
    }
    transmittance *= 1.0 - extinction(m, height(p + params.sun * t)) / m.majorant;
    if (max(max(transmittance.x, transmittance.y), max(transmittance.z, transmittance.w)) < 1e-3) {
      // Russian roulette keeps it unbiased.
      if (random(rng) > 0.5) {
        return vec4f(0.0);
      }
      transmittance *= 2.0;
    }
  }
  return transmittance;
}

fn rayleighPhase(mu: f32) -> f32 {
  return 3.0 / (16.0 * PI) * (1.0 + mu * mu);
}

fn cornetteShanks(g: f32, mu: f32) -> f32 {
  let k = 3.0 / (8.0 * PI) * (1.0 - g * g) / (2.0 + g * g);
  return k * (1.0 + mu * mu) / pow(1.0 + g * g - 2.0 * g * mu, 1.5);
}

fn henyeyGreenstein(g: f32, mu: f32) -> f32 {
  return (1.0 - g * g) / (4.0 * PI * pow(1.0 + g * g - 2.0 * g * mu, 1.5));
}

// An orthonormal basis around n (Duff et al. 2017).
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

// Direction around `axis` with cosine `mu`.
fn around(axis: vec3f, mu: f32, phi: f32) -> vec3f {
  let sinTheta = sqrt(max(0.0, 1.0 - mu * mu));
  return basis(axis) * vec3f(sinTheta * cos(phi), sinTheta * sin(phi), mu);
}

fn sampleHenyeyGreenstein(g: f32, u: f32) -> f32 {
  if (abs(g) < 1e-4) {
    return 1.0 - 2.0 * u;
  }
  let s = (1.0 - g * g) / (1.0 - g + 2.0 * g * u);
  return (1.0 + g * g - s * s) / (2.0 * g);
}

fn mean4(v: vec4f) -> f32 {
  return (v.x + v.y + v.z + v.w) * 0.25;
}

fn largest4(v: vec4f) -> f32 {
  return max(max(v.x, v.y), max(v.z, v.w));
}

// One path at four wavelengths: spectral radiance, W·m⁻²·sr⁻¹·nm⁻¹ each.
fn tracePath(start: vec3f, direction: vec3f, lambda: vec4f, rng: ptr<function, Rng>) -> vec4f {
  let m = medium(lambda);
  let solar = table10v(0u, lambda);
  var p = start;
  var d = direction;
  // From space: move to the top of the atmosphere first.
  if (height(p) > params.topRadius - params.bottomRadius) {
    let top = sphere(p, d, topK());
    if (top.x <= 0.0) {
      return vec4f(0.0);
    }
    p += d * top.x;
  }
  var weight = vec4f(1.0);
  var radiance = vec4f(0.0);
  var scatterings = 0u;
  for (var step = 0u; step < 65536u; step++) {
    let e = extent(p, d);
    let t = -log(1.0 - random(rng)) / m.majorant;
    if (t >= e.x) {
      if (e.y < 0.5 || params.groundReflection == 0u || scatterings >= params.maxScattering) {
        break; // left the atmosphere, or ended on a ground that isn't counted
      }
      // The ground: Lambertian, next event toward the sun, then a bounce.
      p += d * e.x;
      let n = normalize(vec3f(p.xy, p.z + params.bottomRadius));
      p += n * 0.01;
      let cosSun = dot(n, params.sun);
      if (cosSun > 0.0) {
        radiance += weight * params.groundAlbedo / PI * cosSun * solar * sunTransmittance(p, m, rng);
      }
      scatterings++;
      if (scatterings >= params.maxScattering) {
        break;
      }
      weight *= params.groundAlbedo;
      let u = random(rng);
      d = around(n, sqrt(1.0 - u), 2.0 * PI * random(rng));
    } else {
      p += d * t;
      let density = densities(height(p));
      // Spectral tracking: events from the four wavelengths' average
      // coefficients; absorption is not an event but lowers the weights.
      let rayleigh = m.rayleigh * density.x;
      let mie = m.mieScattering * density.y;
      let absorption = (m.mieExtinction - m.mieScattering) * density.y + m.ozone * density.z;
      let nullCollision = m.majorant - rayleigh - mie - absorption;
      let pr = mean4(rayleigh);
      let pm = mean4(mie);
      let pn = mean4(nullCollision);
      let total = pr + pm + pn;
      let xi = random(rng) * total;
      if (xi >= pr + pm) {
        weight *= nullCollision * total / (m.majorant * pn);
        continue;
      }
      let isRayleigh = xi < pr;
      if (isRayleigh) {
        weight *= rayleigh * total / (m.majorant * pr);
      } else {
        weight *= mie * total / (m.majorant * pm);
      }
      let mu = dot(d, params.sun);
      let phase = select(cornetteShanks(params.miePhaseG, mu), rayleighPhase(mu), isRayleigh);
      radiance += weight * phase * solar * sunTransmittance(p, m, rng);
      scatterings++;
      if (scatterings >= params.maxScattering) {
        break;
      }
      // The next direction: uniform for Rayleigh, Henyey-Greenstein for
      // aerosols, weighted by the true phase function.
      if (isRayleigh) {
        let u = random(rng);
        let next = around(vec3f(0.0, 0.0, 1.0), 1.0 - 2.0 * u, 2.0 * PI * random(rng));
        weight *= rayleighPhase(dot(d, next)) * 4.0 * PI;
        d = next;
      } else {
        let g = params.miePhaseG;
        let cosTheta = sampleHenyeyGreenstein(g, random(rng));
        let next = around(d, cosTheta, 2.0 * PI * random(rng));
        weight *= cornetteShanks(g, cosTheta) / henyeyGreenstein(g, cosTheta);
        d = next;
      }
    }
    if (scatterings > 6u) {
      let survive = min(largest4(weight), 0.95);
      if (random(rng) >= survive) {
        break;
      }
      weight /= survive;
    }
  }
  return radiance;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3u) {
  let i = id.x;
  if (i >= params.count) {
    return;
  }
  let direction = normalize(directions[i].xyz);
  let start = vec3f(0.0, 0.0, params.observerHeight);
  var rng: Rng;
  rng.state = pcg(i * 9781u + params.seed * 6271u + 1u);
  var xyz = vec3f(0.0);
  let spacing = LAMBDA_RANGE / 4.0;
  for (var s = 0u; s < params.samples; s++) {
    // Four wavelengths a quarter of the spectrum apart, the first
    // stratified over its quarter (8 strata).
    let stratum = f32((s + params.seed) % 8u);
    let first = LAMBDA_MIN + spacing * (stratum + random(&rng)) / 8.0;
    let lambda = first + vec4f(0.0, 1.0, 2.0, 3.0) * spacing;
    let radiance = tracePath(start, direction, lambda, &rng);
    xyz += (radiance.x * cie(lambda.x) + radiance.y * cie(lambda.y) +
      radiance.z * cie(lambda.z) + radiance.w * cie(lambda.w)) * spacing;
  }
  accum[i] += vec4f(xyz, f32(params.samples));
}
