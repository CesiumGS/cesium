// The reference atmosphere (plan §4.2): an unbiased spectral Monte Carlo
// volumetric path tracer through a spherical planet's atmosphere, against
// which real-time approximations are judged. Not fast; exact in the limit
// (AtmosphereReference.ts).
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
// Choices between values are `select`s, both sides evaluated as the WGSL's
// were (`?:` branches rounded otherwise: paths drifted a few ulps), and
// the walk's end test one `any` (Slang's `||` chain of branches cost 4%).
// About 5% more stays: in Chrome on Metal, Tint guards every loop it can't
// prove finite with a 64-bit iteration counter, and Slang writes every
// loop as `loop {}` (only a constant-bounded `for` is exempt); the ratio
// tracking's loop does little else per step (plan §3.4, step 6).
//
// Precision: positions are in a frame whose origin is the ground point
// below the observer, z up, so heights above the sphere are computed
// without cancellation (|P|² − R² = x² + y² + w(2R + w), P = p + (0, 0, R)).

struct Params {
  float observerHeight;
  uint samples; // paths per direction in this dispatch
  uint seed;
  uint count;   // directions
  float3 sun;
  uint maxScattering;
  float bottomRadius;
  float topRadius;
  float rayleigh;
  float rayleighScaleHeight;
  float mieBeta;
  float mieAngstromAlpha;
  float mieScaleHeight;
  float mieSingleScatteringAlbedo;
  float miePhaseG;
  float ozoneMaxDensity; // molecules·m⁻³ at the ozone profile's peak
  float groundAlbedo;
  uint groundReflection;
};

[[vk::binding(0, 0)]] ConstantBuffer<Params> params;
// xyz: direction in the observer's frame (z up).
[[vk::binding(1, 0)]] StructuredBuffer<float4> directions;
// xyz: summed CIE XYZ (W·m⁻²·sr⁻¹ before ×683), w: paths.
[[vk::binding(2, 0)]] RWStructuredBuffer<float4> accum;
// Solar irradiance (48, every 10 nm), ozone cross-sections (48), then the
// CIE 1931 x̄ ȳ z̄ (95 × 3, every 5 nm), all from 360 nm.
[[vk::binding(3, 0)]] StructuredBuffer<float> spectra;

static const float LAMBDA_MIN = 360.0;
static const float LAMBDA_RANGE = 470.0;
static const float PI = 3.14159265358979;
static const uint OZONE_OFFSET = 48u;
static const uint CIE_OFFSET = 96u;

// PCG hash (Jarzynski & Olano 2020).
uint pcg(uint v) {
  uint state = v * 747796405u + 2891336453u;
  uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  return (word >> 22u) ^ word;
}

struct Rng {
  uint state;
};

float random(inout Rng rng) {
  rng.state = pcg(rng.state);
  // 24 random bits in [0, 1).
  return float(rng.state >> 8u) * (1.0 / 16777216.0);
}

float table10(uint offset, float lambda) {
  float x = clamp((lambda - LAMBDA_MIN) / 10.0, 0.0, 47.0);
  uint i = min(uint(x), 46u);
  float u = x - float(i);
  return lerp(spectra[offset + i], spectra[offset + i + 1u], u);
}

float3 cie(float lambda) {
  float x = clamp((lambda - LAMBDA_MIN) / 5.0, 0.0, 94.0);
  uint i = min(uint(x), 93u);
  float u = x - float(i);
  uint a = CIE_OFFSET + i * 3u;
  uint b = a + 3u;
  return lerp(
      float3(spectra[a], spectra[a + 1u], spectra[a + 2u]),
      float3(spectra[b], spectra[b + 1u], spectra[b + 2u]),
      u);
}

// Coefficients at density 1 for the path's four wavelengths.
struct Medium {
  float4 rayleigh;
  float4 mieScattering;
  float4 mieExtinction;
  float4 ozone;
  // One majorant for all four (each density is at most 1).
  float majorant;
};

float4 table10v(uint offset, float4 lambda) {
  return float4(
      table10(offset, lambda.x),
      table10(offset, lambda.y),
      table10(offset, lambda.z),
      table10(offset, lambda.w));
}

Medium medium(float4 lambda) {
  float4 microns = lambda * 1e-3;
  float4 mie = params.mieBeta / params.mieScaleHeight * pow(microns, float4(-params.mieAngstromAlpha));
  Medium m;
  m.rayleigh = params.rayleigh * pow(microns, float4(-4.0));
  m.mieExtinction = mie;
  m.mieScattering = mie * params.mieSingleScatteringAlbedo;
  m.ozone = params.ozoneMaxDensity * table10v(OZONE_OFFSET, lambda);
  float4 total = m.rayleigh + m.mieExtinction + m.ozone;
  m.majorant = max(max(total.x, total.y), max(total.z, total.w));
  return m;
}

// |P|² − R² for a local position (no cancellation near the ground).
float radialExcess(float3 p) {
  return p.x * p.x + p.y * p.y + p.z * (2.0 * params.bottomRadius + p.z);
}

float height(float3 p) {
  float R = params.bottomRadius;
  float3 P = float3(p.xy, p.z + R);
  return radialExcess(p) / (length(P) + R);
}

// Rayleigh, aerosol and ozone densities at a height.
float3 densities(float h) {
  float ozone = select(h < 25000.0, clamp(h / 15000.0 - 2.0 / 3.0, 0.0, 1.0),
                       clamp(-h / 15000.0 + 8.0 / 3.0, 0.0, 1.0));
  return float3(
      exp(-h / params.rayleighScaleHeight),
      exp(-h / params.mieScaleHeight),
      ozone);
}

float4 extinction(Medium m, float h) {
  float3 d = densities(h);
  return m.rayleigh * d.x + m.mieExtinction * d.y + m.ozone * d.z;
}

// Intersections of a ray with the sphere |P|² = R² + k (k = r² − R²):
// (near, far), or (-1, -1) on a miss. Numerically stable quadratic.
float2 sphere(float3 p, float3 d, float k) {
  float b = dot(p, d) + params.bottomRadius * d.z;
  float c = radialExcess(p) - k;
  float disc = b * b - c;
  if (disc < 0.0) {
    return float2(-1.0);
  }
  float s = sqrt(disc);
  float q = -(b + select(b < 0.0, -s, s));
  if (q == 0.0) {
    return float2(0.0);
  }
  float t0 = q;
  float t1 = c / q;
  return float2(min(t0, t1), max(t0, t1));
}

// k for the top of the atmosphere.
float topK() {
  return (params.topRadius - params.bottomRadius) * (params.topRadius + params.bottomRadius);
}

// Distance to where the ray leaves the atmosphere or meets the ground; .y
// is 1 for the ground.
float2 extent(float3 p, float3 d) {
  float2 ground = sphere(p, d, 0.0);
  if (ground.x > 0.0) {
    return float2(ground.x, 1.0);
  }
  float2 top = sphere(p, d, topK());
  return float2(max(top.y, 0.0), 0.0);
}

// Transmittance toward the sun by ratio tracking (0 behind the ground).
float4 sunTransmittance(float3 p, Medium m, inout Rng rng) {
  float2 e = extent(p, params.sun);
  if (e.y > 0.5) {
    return float4(0.0);
  }
  float t = 0.0;
  float4 transmittance = float4(1.0);
  for (uint i = 0u; i < 4096u; i++) {
    t -= log(1.0 - random(rng)) / m.majorant;
    if (t >= e.x) {
      break;
    }
    transmittance *= 1.0 - extinction(m, height(p + params.sun * t)) / m.majorant;
    if (max(max(transmittance.x, transmittance.y), max(transmittance.z, transmittance.w)) < 1e-3) {
      // Russian roulette keeps it unbiased.
      if (random(rng) > 0.5) {
        return float4(0.0);
      }
      transmittance *= 2.0;
    }
  }
  return transmittance;
}

float rayleighPhase(float mu) {
  return 3.0 / (16.0 * PI) * (1.0 + mu * mu);
}

float cornetteShanks(float g, float mu) {
  float k = 3.0 / (8.0 * PI) * (1.0 - g * g) / (2.0 + g * g);
  return k * (1.0 + mu * mu) / pow(1.0 + g * g - 2.0 * g * mu, 1.5);
}

float henyeyGreenstein(float g, float mu) {
  return (1.0 - g * g) / (4.0 * PI * pow(1.0 + g * g - 2.0 * g * mu, 1.5));
}

// An orthonormal basis around n (Duff et al. 2017), its rows the WGSL's
// columns (a literal takes rows: `mul(v, basis(n))` is the columns' sum).
float3x3 basis(float3 n) {
  float s = select(n.z >= 0.0, 1.0, -1.0);
  float a = -1.0 / (s + n.z);
  float b = n.x * n.y * a;
  return float3x3(
      float3(1.0 + s * n.x * n.x * a, s * b, -s * n.x),
      float3(b, s + n.y * n.y * a, -n.y),
      n);
}

// Direction around `axis` with cosine `mu`.
float3 around(float3 axis, float mu, float phi) {
  float sinTheta = sqrt(max(0.0, 1.0 - mu * mu));
  return mul(float3(sinTheta * cos(phi), sinTheta * sin(phi), mu), basis(axis));
}

float sampleHenyeyGreenstein(float g, float u) {
  if (abs(g) < 1e-4) {
    return 1.0 - 2.0 * u;
  }
  float s = (1.0 - g * g) / (1.0 - g + 2.0 * g * u);
  return (1.0 + g * g - s * s) / (2.0 * g);
}

float mean4(float4 v) {
  return (v.x + v.y + v.z + v.w) * 0.25;
}

float largest4(float4 v) {
  return max(max(v.x, v.y), max(v.z, v.w));
}

// One path at four wavelengths: spectral radiance, W·m⁻²·sr⁻¹·nm⁻¹ each.
float4 tracePath(float3 start, float3 direction, float4 lambda, inout Rng rng) {
  Medium m = medium(lambda);
  float4 solar = table10v(0u, lambda);
  float3 p = start;
  float3 d = direction;
  // From space: move to the top of the atmosphere first.
  if (height(p) > params.topRadius - params.bottomRadius) {
    float2 top = sphere(p, d, topK());
    if (top.x <= 0.0) {
      return float4(0.0);
    }
    p += d * top.x;
  }
  float4 weight = float4(1.0);
  float4 radiance = float4(0.0);
  uint scatterings = 0u;
  for (uint step = 0u; step < 65536u; step++) {
    float2 e = extent(p, d);
    float t = -log(1.0 - random(rng)) / m.majorant;
    if (t >= e.x) {
      if (any(bool3(e.y < 0.5, params.groundReflection == 0u, scatterings >= params.maxScattering))) {
        break; // left the atmosphere, or ended on a ground that isn't counted
      }
      // The ground: Lambertian, next event toward the sun, then a bounce.
      p += d * e.x;
      float3 n = normalize(float3(p.xy, p.z + params.bottomRadius));
      p += n * 0.01;
      float cosSun = dot(n, params.sun);
      if (cosSun > 0.0) {
        radiance += weight * params.groundAlbedo / PI * cosSun * solar * sunTransmittance(p, m, rng);
      }
      scatterings++;
      if (scatterings >= params.maxScattering) {
        break;
      }
      weight *= params.groundAlbedo;
      float u = random(rng);
      d = around(n, sqrt(1.0 - u), 2.0 * PI * random(rng));
    } else {
      p += d * t;
      float3 density = densities(height(p));
      // Spectral tracking: events from the four wavelengths' average
      // coefficients; absorption is not an event but lowers the weights.
      float4 rayleigh = m.rayleigh * density.x;
      float4 mie = m.mieScattering * density.y;
      float4 absorption = (m.mieExtinction - m.mieScattering) * density.y + m.ozone * density.z;
      float4 nullCollision = m.majorant - rayleigh - mie - absorption;
      float pr = mean4(rayleigh);
      float pm = mean4(mie);
      float pn = mean4(nullCollision);
      float total = pr + pm + pn;
      float xi = random(rng) * total;
      if (xi >= pr + pm) {
        weight *= nullCollision * total / (m.majorant * pn);
        continue;
      }
      bool isRayleigh = xi < pr;
      if (isRayleigh) {
        weight *= rayleigh * total / (m.majorant * pr);
      } else {
        weight *= mie * total / (m.majorant * pm);
      }
      float mu = dot(d, params.sun);
      float phase = select(isRayleigh, rayleighPhase(mu), cornetteShanks(params.miePhaseG, mu));
      radiance += weight * phase * solar * sunTransmittance(p, m, rng);
      scatterings++;
      if (scatterings >= params.maxScattering) {
        break;
      }
      // The next direction: uniform for Rayleigh, Henyey-Greenstein for
      // aerosols, weighted by the true phase function.
      if (isRayleigh) {
        float u = random(rng);
        float3 next = around(float3(0.0, 0.0, 1.0), 1.0 - 2.0 * u, 2.0 * PI * random(rng));
        weight *= rayleighPhase(dot(d, next)) * 4.0 * PI;
        d = next;
      } else {
        float g = params.miePhaseG;
        float cosTheta = sampleHenyeyGreenstein(g, random(rng));
        float3 next = around(d, cosTheta, 2.0 * PI * random(rng));
        weight *= cornetteShanks(g, cosTheta) / henyeyGreenstein(g, cosTheta);
        d = next;
      }
    }
    if (scatterings > 6u) {
      float survive = min(largest4(weight), 0.95);
      if (random(rng) >= survive) {
        break;
      }
      weight /= survive;
    }
  }
  return radiance;
}

[shader("compute")]
[numthreads(64, 1, 1)]
void main(uint3 id : SV_DispatchThreadID) {
  uint i = id.x;
  if (i >= params.count) {
    return;
  }
  float3 direction = normalize(directions[i].xyz);
  float3 start = float3(0.0, 0.0, params.observerHeight);
  Rng rng;
  rng.state = pcg(i * 9781u + params.seed * 6271u + 1u);
  float3 xyz = float3(0.0);
  float spacing = LAMBDA_RANGE / 4.0;
  for (uint s = 0u; s < params.samples; s++) {
    // Four wavelengths a quarter of the spectrum apart, the first
    // stratified over its quarter (8 strata).
    float stratum = float((s + params.seed) % 8u);
    float first = LAMBDA_MIN + spacing * (stratum + random(rng)) / 8.0;
    float4 lambda = first + float4(0.0, 1.0, 2.0, 3.0) * spacing;
    float4 radiance = tracePath(start, direction, lambda, rng);
    xyz += (radiance.x * cie(lambda.x) + radiance.y * cie(lambda.y) +
            radiance.z * cie(lambda.z) + radiance.w * cie(lambda.w)) * spacing;
  }
  accum[i] += float4(xyz, float(params.samples));
}
