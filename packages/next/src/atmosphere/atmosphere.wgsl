// The real-time atmosphere (plan §4.2): Hillaire's "A Scalable and
// Production Ready Sky and Atmosphere Rendering Technique" (2020) with
// Bruneton's 2017 parameters, computed at four wavelengths per pass (two
// passes cover the 8 bands of `spectralBands`, combined into sRGB after).
//
// - transmittanceLut: transmittance to the top of the atmosphere by height
//   and zenith angle (Bruneton's mapping), 256 × 64.
// - multipleScatteringLut: the isotropic multiple-scattering term Ψ_ms by
//   height and sun zenith angle, 32 × 32 (Hillaire §5.5).
// - skyProbe: sky radiance along given directions by ray marching with
//   both tables (the sky-view table and aerial perspective build on the
//   same function); the reference (reference.wgsl) judges it.
//
// Lengths in kilometers; positions relative to the planet's center.

// Coefficients at this pass's four wavelengths.
struct Atmosphere {
  rayleighScattering: vec4f, // km⁻¹ at sea level
  mieScattering: vec4f,
  mieExtinction: vec4f,
  ozoneAbsorption: vec4f,    // km⁻¹ at the ozone peak
  solarIrradiance: vec4f,    // W·m⁻²·nm⁻¹ outside the atmosphere
  bottomRadius: f32,
  topRadius: f32,
  rayleighScaleHeight: f32,
  mieScaleHeight: f32,
  miePhaseG: f32,
  groundAlbedo: f32,
  _pad0: f32,
  _pad1: f32,
};

@group(0) @binding(0) var<uniform> atmosphere: Atmosphere;

const PI = 3.14159265358979;
const TRANSMITTANCE_SIZE = vec2f(256.0, 64.0);
const MULTIPLE_SCATTERING_SIZE = 32.0;

// --- the medium ---------------------------------------------------------------

struct Medium {
  scattering: vec4f,
  extinction: vec4f,
  rayleigh: vec4f,
  mie: vec4f,
};

fn medium(h: f32) -> Medium {
  let a = atmosphere;
  let rayleighDensity = exp(-h / a.rayleighScaleHeight);
  let mieDensity = exp(-h / a.mieScaleHeight);
  let ozoneDensity = select(
    clamp(-h / 15.0 + 8.0 / 3.0, 0.0, 1.0),
    clamp(h / 15.0 - 2.0 / 3.0, 0.0, 1.0),
    h < 25.0,
  );
  var m: Medium;
  m.rayleigh = a.rayleighScattering * rayleighDensity;
  m.mie = a.mieScattering * mieDensity;
  m.scattering = m.rayleigh + m.mie;
  m.extinction = m.rayleigh + a.mieExtinction * mieDensity + a.ozoneAbsorption * ozoneDensity;
  return m;
}

fn rayleighPhase(mu: f32) -> f32 {
  return 3.0 / (16.0 * PI) * (1.0 + mu * mu);
}

fn miePhase(mu: f32) -> f32 {
  let g = atmosphere.miePhaseG;
  let k = 3.0 / (8.0 * PI) * (1.0 - g * g) / (2.0 + g * g);
  return k * (1.0 + mu * mu) / pow(1.0 + g * g - 2.0 * g * mu, 1.5);
}

// --- geometry -------------------------------------------------------------------

// Distance along a ray from radius r with zenith cosine mu to the sphere of
// radius `radius`: the far intersection (or near with `near`), or -1.
fn sphereDistance(r: f32, mu: f32, radius: f32, near: bool) -> f32 {
  let disc = r * r * (mu * mu - 1.0) + radius * radius;
  if (disc < 0.0) {
    return -1.0;
  }
  let s = sqrt(disc);
  let t = select(-r * mu + s, -r * mu - s, near);
  return t;
}

fn hitsGround(r: f32, mu: f32) -> bool {
  let bottom = atmosphere.bottomRadius;
  return mu < 0.0 && r * r * (mu * mu - 1.0) + bottom * bottom >= 0.0;
}

// --- transmittance table (Bruneton's mapping) ------------------------------------

fn unitToTexel(x: f32, size: f32) -> f32 {
  return 0.5 / size + x * (1.0 - 1.0 / size);
}

fn texelToUnit(u: f32, size: f32) -> f32 {
  return (u - 0.5 / size) / (1.0 - 1.0 / size);
}

fn transmittanceUv(r: f32, mu: f32) -> vec2f {
  let a = atmosphere;
  let h = sqrt(a.topRadius * a.topRadius - a.bottomRadius * a.bottomRadius);
  let rho = sqrt(max(0.0, r * r - a.bottomRadius * a.bottomRadius));
  let d = max(0.0, sphereDistance(r, mu, a.topRadius, false));
  let dMin = a.topRadius - r;
  let dMax = rho + h;
  let xMu = (d - dMin) / (dMax - dMin);
  let xR = rho / h;
  return vec2f(unitToTexel(xMu, TRANSMITTANCE_SIZE.x), unitToTexel(xR, TRANSMITTANCE_SIZE.y));
}

fn transmittanceRMu(uv: vec2f) -> vec2f {
  let a = atmosphere;
  let xMu = texelToUnit(uv.x, TRANSMITTANCE_SIZE.x);
  let xR = texelToUnit(uv.y, TRANSMITTANCE_SIZE.y);
  let h = sqrt(a.topRadius * a.topRadius - a.bottomRadius * a.bottomRadius);
  let rho = h * xR;
  let r = sqrt(rho * rho + a.bottomRadius * a.bottomRadius);
  let dMin = a.topRadius - r;
  let dMax = rho + h;
  let d = dMin + xMu * (dMax - dMin);
  let mu = select(clamp((h * h - rho * rho - d * d) / (2.0 * r * d), -1.0, 1.0), 1.0, d == 0.0);
  return vec2f(r, mu);
}

@group(1) @binding(0) var transmittanceTarget: texture_storage_2d<rgba16float, write>;

@compute @workgroup_size(8, 8)
fn transmittanceLut(@builtin(global_invocation_id) id: vec3u) {
  if (f32(id.x) >= TRANSMITTANCE_SIZE.x || f32(id.y) >= TRANSMITTANCE_SIZE.y) {
    return;
  }
  let rMu = transmittanceRMu((vec2f(id.xy) + 0.5) / TRANSMITTANCE_SIZE);
  let r = rMu.x;
  let mu = rMu.y;
  let length = max(0.0, sphereDistance(r, mu, atmosphere.topRadius, false));
  let steps = 500;
  let dt = length / f32(steps);
  var depth = vec4f(0.0);
  for (var i = 0; i < steps; i++) {
    let t = (f32(i) + 0.5) * dt;
    let rt = sqrt(r * r + t * t + 2.0 * r * mu * t);
    depth += medium(rt - atmosphere.bottomRadius).extinction * dt;
  }
  textureStore(transmittanceTarget, id.xy, exp(-depth));
}

// --- reading the tables ---------------------------------------------------------

@group(1) @binding(1) var transmittanceTable: texture_2d<f32>;
@group(1) @binding(2) var tableSampler: sampler;
@group(1) @binding(3) var multipleScatteringTable: texture_2d<f32>;

fn transmittanceToTop(r: f32, mu: f32) -> vec4f {
  return textureSampleLevel(transmittanceTable, tableSampler, transmittanceUv(r, mu), 0.0);
}

// Transmittance toward the sun from (r, muSun): 0 where the planet is in
// the way (its shadow; the sun's disk is a point here).
fn sunTransmittance(r: f32, muSun: f32) -> vec4f {
  if (hitsGround(r, muSun)) {
    return vec4f(0.0);
  }
  return transmittanceToTop(r, muSun);
}

fn multipleScattering(r: f32, muSun: f32) -> vec4f {
  let a = atmosphere;
  let uv = vec2f(
    unitToTexel(muSun * 0.5 + 0.5, MULTIPLE_SCATTERING_SIZE),
    unitToTexel(clamp((r - a.bottomRadius) / (a.topRadius - a.bottomRadius), 0.0, 1.0), MULTIPLE_SCATTERING_SIZE),
  );
  return textureSampleLevel(multipleScatteringTable, tableSampler, uv, 0.0);
}

// --- ray marching ---------------------------------------------------------------

struct Scattered {
  // In-scattered radiance per unit solar irradiance, at the 4 wavelengths.
  radiance: vec4f,
  // Transmittance along the ray to where the march stopped.
  transmittance: vec4f,
  // Hillaire's f_ms integrand: light scattered once, per unit light.
  transfer: vec4f,
};

// Marches from `position` along `direction` (unit) for up to `maxLength`,
// lit by a sun along `sun` of unit irradiance. `uniformPhase` (the
// multiple-scattering table's integral) scatters with phase 1/4π and leaves
// out the multiple-scattering term; the sky adds it. The ground, where the
// ray meets it, reflects the sun (Lambertian).
fn march(position: vec3f, direction: vec3f, sun: vec3f, maxLength: f32, steps: i32, uniformPhase: bool) -> Scattered {
  let a = atmosphere;
  var out: Scattered;
  out.transmittance = vec4f(1.0);
  let r = length(position);
  let mu = dot(position, direction) / r;
  var start = 0.0;
  var end = -1.0;
  let ground = hitsGround(r, mu);
  if (ground) {
    end = sphereDistance(r, mu, a.bottomRadius, true);
  } else {
    end = sphereDistance(r, mu, a.topRadius, false);
  }
  if (r > a.topRadius) {
    let enter = sphereDistance(r, mu, a.topRadius, true);
    if (enter < 0.0 || end < 0.0) {
      return out;
    }
    start = enter;
  }
  end = min(end, maxLength);
  if (end <= start) {
    return out;
  }
  let nu = dot(direction, sun);
  let phaseR = select(rayleighPhase(nu), 1.0 / (4.0 * PI), uniformPhase);
  let phaseM = select(miePhase(nu), 1.0 / (4.0 * PI), uniformPhase);
  let dt = (end - start) / f32(steps);
  for (var i = 0; i < steps; i++) {
    let t = start + (f32(i) + 0.5) * dt;
    let p = position + direction * t;
    let rp = length(p);
    let muSun = dot(p, sun) / rp;
    let m = medium(rp - a.bottomRadius);
    let toSun = sunTransmittance(rp, muSun);
    var scattered = (m.rayleigh * phaseR + m.mie * phaseM) * toSun;
    if (!uniformPhase) {
      scattered += m.scattering * multipleScattering(rp, muSun);
    }
    // Integrated exactly over the segment (Hillaire's energy-conserving
    // form): ∫ T(t) S dt = S (1 − e^(−σ dt)) / σ.
    let segment = exp(-m.extinction * dt);
    let integral = (1.0 - segment) / max(m.extinction, vec4f(1e-9));
    out.radiance += out.transmittance * scattered * integral;
    out.transfer += out.transmittance * m.scattering * integral;
    out.transmittance *= segment;
  }
  if (ground && end < maxLength) {
    let p = position + direction * end;
    let n = normalize(p);
    let muSun = dot(n, sun);
    out.radiance += out.transmittance * a.groundAlbedo / PI * max(muSun, 0.0) * sunTransmittance(length(p), muSun);
  }
  return out;
}

// --- multiple-scattering table (Hillaire §5.5) ---------------------------------

@group(1) @binding(4) var multipleScatteringTarget: texture_storage_2d<rgba16float, write>;

@compute @workgroup_size(8, 8)
fn multipleScatteringLut(@builtin(global_invocation_id) id: vec3u) {
  let size = u32(MULTIPLE_SCATTERING_SIZE);
  if (id.x >= size || id.y >= size) {
    return;
  }
  let a = atmosphere;
  let uv = (vec2f(id.xy) + 0.5) / MULTIPLE_SCATTERING_SIZE;
  let muSun = texelToUnit(uv.x, MULTIPLE_SCATTERING_SIZE) * 2.0 - 1.0;
  let r = a.bottomRadius + clamp(texelToUnit(uv.y, MULTIPLE_SCATTERING_SIZE), 0.0, 1.0) * (a.topRadius - a.bottomRadius);
  let position = vec3f(0.0, 0.0, max(r, a.bottomRadius + 1e-3));
  let sun = vec3f(sqrt(max(0.0, 1.0 - muSun * muSun)), 0.0, muSun);
  // Second-order light and the transfer f_ms, averaged over the sphere of
  // directions (uniform phase): Ψ_ms = L2 / (1 − f_ms).
  let n = 8u;
  var second = vec4f(0.0);
  var transfer = vec4f(0.0);
  for (var i = 0u; i < n; i++) {
    for (var j = 0u; j < n; j++) {
      let cosTheta = 1.0 - 2.0 * (f32(i) + 0.5) / f32(n);
      let phi = 2.0 * PI * (f32(j) + 0.5) / f32(n);
      let sinTheta = sqrt(max(0.0, 1.0 - cosTheta * cosTheta));
      let direction = vec3f(sinTheta * cos(phi), sinTheta * sin(phi), cosTheta);
      let s = march(position, direction, sun, 1e9, 20, true);
      second += s.radiance;
      transfer += s.transfer;
    }
  }
  let count = f32(n * n);
  // Averages over the sphere times the uniform phase's 4π / 4π.
  second /= count;
  transfer /= count;
  let psi = second / (1.0 - transfer);
  textureStore(multipleScatteringTarget, id.xy, psi);
}

// --- sky radiance along directions (for checking against the reference) --------

struct ProbeParams {
  observer: vec3f, // km, planet-centered
  count: u32,
  sun: vec3f,
  steps: u32,
};

@group(1) @binding(5) var<uniform> probe: ProbeParams;
@group(1) @binding(6) var<storage, read> probeDirections: array<vec4f>;
@group(1) @binding(7) var<storage, read_write> probeRadiance: array<vec4f>;

@compute @workgroup_size(64)
fn skyProbe(@builtin(global_invocation_id) id: vec3u) {
  if (id.x >= probe.count) {
    return;
  }
  let direction = normalize(probeDirections[id.x].xyz);
  let s = march(probe.observer, direction, probe.sun, 1e9, i32(probe.steps), false);
  // Spectral radiance at this pass's 4 wavelengths, W·m⁻²·sr⁻¹·nm⁻¹ (the
  // bands' weights turn the 8 into sRGB, RealtimeAtmosphere).
  probeRadiance[id.x] = s.radiance * atmosphere.solarIrradiance;
}
