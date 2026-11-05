// The real-time atmosphere's model (plan §4.2): Hillaire's "A Scalable and
// Production Ready Sky and Atmosphere Rendering Technique" (2020) with
// Bruneton's 2017 parameters, at four wavelengths per pass (two passes
// cover the 8 bands of `spectralBands`, combined into sRGB after). The
// medium, the geometry, the tables' mappings and reads, and the march;
// atmosphere.slang builds the tables with it, sky.slang draws with it.
//
// Lengths in kilometers; positions relative to the planet's center.
module air;

// Coefficients at this pass's four wavelengths.
public struct Atmosphere {
  public float4 rayleighScattering; // km⁻¹ at sea level
  public float4 mieScattering;
  public float4 mieExtinction;
  public float4 ozoneAbsorption;    // km⁻¹ at the ozone peak
  public float4 solarIrradiance;    // W·m⁻²·nm⁻¹ outside the atmosphere
  public float bottomRadius;
  public float topRadius;
  public float rayleighScaleHeight;
  public float mieScaleHeight;
  public float miePhaseG;
  public float groundAlbedo;
  public float pad0;
  public float pad1;
};

[[vk::binding(0, 0)]] public ConstantBuffer<Atmosphere> atmosphere;

public static const float PI = 3.14159265358979;
public static const float2 TRANSMITTANCE_SIZE = float2(256.0, 64.0);
public static const float MULTIPLE_SCATTERING_SIZE = 32.0;

// --- the medium ---------------------------------------------------------------

public struct Medium {
  public float4 scattering;
  public float4 extinction;
  public float4 rayleigh;
  public float4 mie;
};

public Medium medium(float h) {
  Atmosphere a = atmosphere;
  float rayleighDensity = exp(-h / a.rayleighScaleHeight);
  float mieDensity = exp(-h / a.mieScaleHeight);
  float ozoneDensity = h < 25.0 ? clamp(h / 15.0 - 2.0 / 3.0, 0.0, 1.0)
                                : clamp(-h / 15.0 + 8.0 / 3.0, 0.0, 1.0);
  Medium m;
  m.rayleigh = a.rayleighScattering * rayleighDensity;
  m.mie = a.mieScattering * mieDensity;
  m.scattering = m.rayleigh + m.mie;
  m.extinction = m.rayleigh + a.mieExtinction * mieDensity + a.ozoneAbsorption * ozoneDensity;
  return m;
}

public float rayleighPhase(float mu) {
  return 3.0 / (16.0 * PI) * (1.0 + mu * mu);
}

public float miePhase(float mu) {
  float g = atmosphere.miePhaseG;
  float k = 3.0 / (8.0 * PI) * (1.0 - g * g) / (2.0 + g * g);
  return k * (1.0 + mu * mu) / pow(1.0 + g * g - 2.0 * g * mu, 1.5);
}

// --- geometry -------------------------------------------------------------------

// Distance along a ray from radius r with zenith cosine mu to the sphere of
// radius `radius`: the far intersection (or near with `near`), or -1.
public float sphereDistance(float r, float mu, float radius, bool near) {
  float disc = r * r * (mu * mu - 1.0) + radius * radius;
  if (disc < 0.0) {
    return -1.0;
  }
  float s = sqrt(disc);
  float t = near ? -r * mu - s : -r * mu + s;
  return t;
}

public bool hitsGround(float r, float mu) {
  float bottom = atmosphere.bottomRadius;
  return mu < 0.0 && r * r * (mu * mu - 1.0) + bottom * bottom >= 0.0;
}

// --- transmittance table (Bruneton's mapping) ------------------------------------

public float unitToTexel(float x, float size) {
  return 0.5 / size + x * (1.0 - 1.0 / size);
}

public float texelToUnit(float u, float size) {
  return (u - 0.5 / size) / (1.0 - 1.0 / size);
}

public float2 transmittanceUv(float r, float mu) {
  Atmosphere a = atmosphere;
  float h = sqrt(a.topRadius * a.topRadius - a.bottomRadius * a.bottomRadius);
  float rho = sqrt(max(0.0, r * r - a.bottomRadius * a.bottomRadius));
  float d = max(0.0, sphereDistance(r, mu, a.topRadius, false));
  float dMin = a.topRadius - r;
  float dMax = rho + h;
  float xMu = (d - dMin) / (dMax - dMin);
  float xR = rho / h;
  return float2(unitToTexel(xMu, TRANSMITTANCE_SIZE.x), unitToTexel(xR, TRANSMITTANCE_SIZE.y));
}

public float2 transmittanceRMu(float2 uv) {
  Atmosphere a = atmosphere;
  float xMu = texelToUnit(uv.x, TRANSMITTANCE_SIZE.x);
  float xR = texelToUnit(uv.y, TRANSMITTANCE_SIZE.y);
  float h = sqrt(a.topRadius * a.topRadius - a.bottomRadius * a.bottomRadius);
  float rho = h * xR;
  float r = sqrt(rho * rho + a.bottomRadius * a.bottomRadius);
  float dMin = a.topRadius - r;
  float dMax = rho + h;
  float d = dMin + xMu * (dMax - dMin);
  float mu = d == 0.0 ? 1.0 : clamp((h * h - rho * rho - d * d) / (2.0 * r * d), -1.0, 1.0);
  return float2(r, mu);
}

// --- reading the tables ---------------------------------------------------------

[[vk::binding(1, 1)]] public Texture2D<float4> transmittanceTable;
[[vk::binding(2, 1)]] public SamplerState tableSampler;
[[vk::binding(3, 1)]] public Texture2D<float4> multipleScatteringTable;

public float4 transmittanceToTop(float r, float mu) {
  return transmittanceTable.SampleLevel(tableSampler, transmittanceUv(r, mu), 0.0);
}

// Transmittance toward the sun from (r, muSun): 0 where the planet is in
// the way (its shadow; the sun's disk is a point here).
public float4 sunTransmittance(float r, float muSun) {
  if (hitsGround(r, muSun)) {
    return float4(0.0);
  }
  return transmittanceToTop(r, muSun);
}

public float4 multipleScattering(float r, float muSun) {
  Atmosphere a = atmosphere;
  float2 uv = float2(
      unitToTexel(muSun * 0.5 + 0.5, MULTIPLE_SCATTERING_SIZE),
      unitToTexel(clamp((r - a.bottomRadius) / (a.topRadius - a.bottomRadius), 0.0, 1.0), MULTIPLE_SCATTERING_SIZE));
  return multipleScatteringTable.SampleLevel(tableSampler, uv, 0.0);
}

// --- ray marching ---------------------------------------------------------------

public struct Scattered {
  // In-scattered radiance per unit solar irradiance, at the 4 wavelengths.
  public float4 radiance;
  // Transmittance along the ray to where the march stopped.
  public float4 transmittance;
  // Hillaire's f_ms integrand: light scattered once, per unit light.
  public float4 transfer;
};

// Marches from `position` along `direction` (unit) for up to `maxLength`,
// lit by a sun along `sun` of unit irradiance. `uniformPhase` (the
// multiple-scattering table's integral) scatters with phase 1/4π and leaves
// out the multiple-scattering term; the sky adds it. The ground, where the
// ray meets it, reflects the sun (Lambertian).
public Scattered march(float3 position, float3 direction, float3 sun, float maxLength, int steps, bool uniformPhase) {
  Atmosphere a = atmosphere;
  Scattered out;
  out.radiance = float4(0.0);
  out.transfer = float4(0.0);
  out.transmittance = float4(1.0);
  float r = length(position);
  float mu = dot(position, direction) / r;
  float start = 0.0;
  float end = -1.0;
  bool ground = hitsGround(r, mu);
  if (ground) {
    end = sphereDistance(r, mu, a.bottomRadius, true);
  } else {
    end = sphereDistance(r, mu, a.topRadius, false);
  }
  if (r > a.topRadius) {
    float enter = sphereDistance(r, mu, a.topRadius, true);
    if (enter < 0.0 || end < 0.0) {
      return out;
    }
    start = enter;
  }
  end = min(end, maxLength);
  if (end <= start) {
    return out;
  }
  float nu = dot(direction, sun);
  float phaseR = uniformPhase ? 1.0 / (4.0 * PI) : rayleighPhase(nu);
  float phaseM = uniformPhase ? 1.0 / (4.0 * PI) : miePhase(nu);
  float dt = (end - start) / float(steps);
  for (int i = 0; i < steps; i++) {
    float t = start + (float(i) + 0.5) * dt;
    float3 p = position + direction * t;
    float rp = length(p);
    float muSun = dot(p, sun) / rp;
    Medium m = medium(rp - a.bottomRadius);
    float4 toSun = sunTransmittance(rp, muSun);
    float4 scattered = (m.rayleigh * phaseR + m.mie * phaseM) * toSun;
    if (!uniformPhase) {
      scattered += m.scattering * multipleScattering(rp, muSun);
    }
    // Integrated exactly over the segment (Hillaire's energy-conserving
    // form): ∫ T(t) S dt = S (1 − e^(−σ dt)) / σ.
    float4 segment = exp(-m.extinction * dt);
    float4 integral = (1.0 - segment) / max(m.extinction, float4(1e-9));
    out.radiance += out.transmittance * scattered * integral;
    out.transfer += out.transmittance * m.scattering * integral;
    out.transmittance *= segment;
  }
  if (ground && end < maxLength) {
    float3 p = position + direction * end;
    float3 n = normalize(p);
    float muSun = dot(n, sun);
    out.radiance += out.transmittance * a.groundAlbedo / PI * max(muSun, 0.0) * sunTransmittance(length(p), muSun);
  }
  return out;
}
