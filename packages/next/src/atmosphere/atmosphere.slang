// The real-time atmosphere's tables and probe (plan §4.2), with air.slang's
// model (RealtimeAtmosphere.ts):
//
// - transmittanceLut: transmittance to the top of the atmosphere by height
//   and zenith angle (Bruneton's mapping), 256 × 64.
// - multipleScatteringLut: the isotropic multiple-scattering term Ψ_ms by
//   height and sun zenith angle, 32 × 32 (Hillaire §5.5).
// - skyProbe: sky radiance along given directions by ray marching with
//   both tables (the sky-view table and aerial perspective build on the
//   same function); the reference (reference.slang) judges it.
import air;

[[vk::binding(0, 1)]] [[vk::image_format("rgba16f")]] WTexture2D<float4> transmittanceTarget;

[shader("compute")]
[numthreads(8, 8, 1)]
void transmittanceLut(uint3 id : SV_DispatchThreadID) {
  if (float(id.x) >= TRANSMITTANCE_SIZE.x || float(id.y) >= TRANSMITTANCE_SIZE.y) {
    return;
  }
  float2 rMu = transmittanceRMu((float2(id.xy) + 0.5) / TRANSMITTANCE_SIZE);
  float r = rMu.x;
  float mu = rMu.y;
  float length = max(0.0, sphereDistance(r, mu, atmosphere.topRadius, false));
  int steps = 500;
  float dt = length / float(steps);
  float4 depth = float4(0.0);
  for (int i = 0; i < steps; i++) {
    float t = (float(i) + 0.5) * dt;
    float rt = sqrt(r * r + t * t + 2.0 * r * mu * t);
    depth += medium(rt - atmosphere.bottomRadius).extinction * dt;
  }
  transmittanceTarget.Store(id.xy, exp(-depth));
}

// --- multiple-scattering table (Hillaire §5.5) ---------------------------------

[[vk::binding(4, 1)]] [[vk::image_format("rgba16f")]] WTexture2D<float4> multipleScatteringTarget;

[shader("compute")]
[numthreads(8, 8, 1)]
void multipleScatteringLut(uint3 id : SV_DispatchThreadID) {
  uint size = uint(MULTIPLE_SCATTERING_SIZE);
  if (id.x >= size || id.y >= size) {
    return;
  }
  Atmosphere a = atmosphere;
  float2 uv = (float2(id.xy) + 0.5) / MULTIPLE_SCATTERING_SIZE;
  float muSun = texelToUnit(uv.x, MULTIPLE_SCATTERING_SIZE) * 2.0 - 1.0;
  float r = a.bottomRadius + clamp(texelToUnit(uv.y, MULTIPLE_SCATTERING_SIZE), 0.0, 1.0) * (a.topRadius - a.bottomRadius);
  float3 position = float3(0.0, 0.0, max(r, a.bottomRadius + 1e-3));
  float3 sun = float3(sqrt(max(0.0, 1.0 - muSun * muSun)), 0.0, muSun);
  // Second-order light and the transfer f_ms, averaged over the sphere of
  // directions (uniform phase): Ψ_ms = L2 / (1 − f_ms).
  uint n = 8u;
  float4 second = float4(0.0);
  float4 transfer = float4(0.0);
  for (uint i = 0u; i < n; i++) {
    for (uint j = 0u; j < n; j++) {
      float cosTheta = 1.0 - 2.0 * (float(i) + 0.5) / float(n);
      float phi = 2.0 * PI * (float(j) + 0.5) / float(n);
      float sinTheta = sqrt(max(0.0, 1.0 - cosTheta * cosTheta));
      float3 direction = float3(sinTheta * cos(phi), sinTheta * sin(phi), cosTheta);
      Scattered s = march(position, direction, sun, 1e9, 20, true);
      second += s.radiance;
      transfer += s.transfer;
    }
  }
  float count = float(n * n);
  // Averages over the sphere times the uniform phase's 4π / 4π.
  second /= count;
  transfer /= count;
  float4 psi = second / (1.0 - transfer);
  multipleScatteringTarget.Store(id.xy, psi);
}

// --- sky radiance along directions (for checking against the reference) --------

struct ProbeParams {
  float3 observer; // km, planet-centered
  uint count;
  float3 sun;
  uint steps;
  float maxLength; // km along each ray (the aerial-perspective volume's checks)
  float pad0;
  float pad1;
  float pad2;
};

[[vk::binding(5, 1)]] ConstantBuffer<ProbeParams> probe;
[[vk::binding(6, 1)]] StructuredBuffer<float4> probeDirections;
[[vk::binding(7, 1)]] RWStructuredBuffer<float4> probeRadiance;

[shader("compute")]
[numthreads(64, 1, 1)]
void skyProbe(uint3 id : SV_DispatchThreadID) {
  if (id.x >= probe.count) {
    return;
  }
  float3 direction = normalize(probeDirections[id.x].xyz);
  // A finite length is a stretch of air (the aerial-perspective volume's):
  // stop short of the ground, as the volume does, so its light isn't added.
  float maxLength = probe.maxLength;
  float r = length(probe.observer);
  float mu = dot(probe.observer, direction) / r;
  if (maxLength < 1e8 && hitsGround(r, mu)) {
    maxLength = min(maxLength, sphereDistance(r, mu, atmosphere.bottomRadius, true) * 0.999);
  }
  Scattered s = march(probe.observer, direction, probe.sun, maxLength, int(probe.steps), false);
  // Spectral radiance at this pass's 4 wavelengths, W·m⁻²·sr⁻¹·nm⁻¹ (the
  // bands' weights turn the 8 into sRGB, RealtimeAtmosphere).
  probeRadiance[id.x] = s.radiance * atmosphere.solarIrradiance;
}
