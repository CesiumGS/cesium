// Slang port of src/shaders/opaque.wgsl (v1 records, PBR + IBL). The
// material surface is bound at link time (`extern struct Material_`); the
// engine owns vertex pulling, texture sampling and lighting.
module opaque;
import common;
import material;

extern struct Material_ : IMaterial;

static const float PI = 3.14159265358979;

[[vk::binding(0, 0)]] ConstantBuffer<View> view;
[[vk::binding(1, 0)]] TextureCube<float4> specularEnvironment;
[[vk::binding(2, 0)]] SamplerState environmentSampler;
[[vk::binding(3, 0)]] Texture2D<float4> brdfLut;
struct Sh { float4 c[9]; };
[[vk::binding(4, 0)]] ConstantBuffer<Sh> irradianceSh;

[[vk::binding(0, 1)]] StructuredBuffer<DrawRecord> records;
[[vk::binding(1, 1)]] StructuredBuffer<DrawInstance> instances;
[[vk::binding(2, 1)]] StructuredBuffer<float> vertices;
[[vk::binding(3, 1)]] StructuredBuffer<Material> materials;

[[vk::binding(0, 2)]] Texture2D<float4> baseColorTexture;
[[vk::binding(1, 2)]] Texture2D<float4> metallicRoughnessTexture;
[[vk::binding(2, 2)]] Texture2D<float4> normalTexture;
[[vk::binding(3, 2)]] Texture2D<float4> occlusionTexture;
[[vk::binding(4, 2)]] Texture2D<float4> emissiveTexture;
[[vk::binding(5, 2)]] SamplerState baseColorSampler;
[[vk::binding(6, 2)]] SamplerState metallicRoughnessSampler;
[[vk::binding(7, 2)]] SamplerState normalSampler;
[[vk::binding(8, 2)]] SamplerState occlusionSampler;
[[vk::binding(9, 2)]] SamplerState emissiveSampler;

struct VsIn {
  [[vk::location(0)]] uint draw : DRAW_INDEX;
};

struct VsOut {
  float4 position : SV_Position;
  float3 normal : NORMAL;
  float2 uv : TEXCOORD0;
  float4 color : COLOR0;
  nointerpolation uint draw : DRAW;
  float3 relPosition : POSITION_REL;
  float4 tangent : TANGENT;
  nointerpolation uint feature : FEATURE; // global feature ID, 0 = none
};

float2 read2(uint offset, uint i) {
  uint b = offset + i * 2;
  return float2(vertices[b], vertices[b + 1]);
}

float3 read3(uint offset, uint i) {
  uint b = offset + i * 3;
  return float3(vertices[b], vertices[b + 1], vertices[b + 2]);
}

float4 read4(uint offset, uint i) {
  uint b = offset + i * 4;
  return float4(vertices[b], vertices[b + 1], vertices[b + 2], vertices[b + 3]);
}

[shader("vertex")]
VsOut vs(uint vertexIndex : SV_VertexID, VsIn input) {
  uint draw = input.draw;
  DrawRecord r = records[draw];
  float4x4 m = instances[draw].relModel;
  VsOut o;
  float3 normal = float3(0.0, 0.0, 1.0);
  if (r.normalOffset != NO_STREAM) {
    normal = read3(r.normalOffset, vertexIndex);
  }
  o.uv = float2(0.0);
  if (r.uvOffset != NO_STREAM) {
    o.uv = read2(r.uvOffset, vertexIndex);
  }
  o.color = float4(1.0);
  if (r.colorOffset != NO_STREAM) {
    o.color = read4(r.colorOffset, vertexIndex);
  }
  o.tangent = float4(0.0);
  if (r.tangentOffset != NO_STREAM) {
    float4 t = read4(r.tangentOffset, vertexIndex);
    o.tangent = float4(normalize(mul(m, float4(t.xyz, 0.0)).xyz), t.w);
  }
  float4 world = mul(m, float4(read3(r.positionOffset, vertexIndex), 1.0));
  o.relPosition = world.xyz;
  // Mixed-LOD placeholder (see opaque.wgsl).
  float4 clipWorld = world;
  if ((r.placeholderMask & view.viewBit) != 0u) {
    float d = max(length(world.xyz), 1e-3);
    clipWorld = float4(world.xyz * (1.0 + r.depthOffset / d), 1.0);
  }
  o.position = mul(view.viewProj, clipWorld);
  // Cofactor of the 3×3 part (the inverse transpose up to the determinant);
  // column j of the matrix is m[·][j].
  float3 c0 = float3(m[0][0], m[1][0], m[2][0]);
  float3 c1 = float3(m[0][1], m[1][1], m[2][1]);
  float3 c2 = float3(m[0][2], m[1][2], m[2][2]);
  float det = dot(c0, cross(c1, c2));
  o.normal = normalize(cross(c1, c2) * normal.x + cross(c2, c0) * normal.y + cross(c0, c1) * normal.z) * sign(det);
  o.draw = draw;
  // Per-vertex feature IDs are local to the draw; its first global ID
  // offsets them (see opaque.wgsl).
  o.feature = r.featureId;
  if (r.featureIdOffset != NO_STREAM) {
    uint local = asuint(vertices[r.featureIdOffset + vertexIndex]);
    o.feature = local == 0xffffffffu ? 0u : r.featureId + local;
  }
  return o;
}

struct FsOut {
  float4 color : SV_Target0;
  uint2 featureId : SV_Target1;
};

float3 fresnelSchlick(float3 f0, float3 f90, float cosTheta) {
  float x = 1.0 - cosTheta;
  float x2 = x * x;
  return f0 + (f90 - f0) * x2 * x2 * x;
}

float smithVisibility(float alpha, float nDotL, float nDotV) {
  float a2 = alpha * alpha;
  float ggxV = nDotL * sqrt(nDotV * nDotV * (1.0 - a2) + a2);
  float ggxL = nDotV * sqrt(nDotL * nDotL * (1.0 - a2) + a2);
  float sum = ggxV + ggxL;
  return sum > 0.0 ? 0.5 / sum : 0.0;
}

float ggx(float alpha, float nDotH) {
  float a2 = alpha * alpha;
  float f = (nDotH * a2 - nDotH) * nDotH + 1.0;
  return a2 / (PI * f * f);
}

float3 irradiance(float3 n) {
  float x = n.x;
  float y = n.y;
  float z = n.z;
  float3 e = irradianceSh.c[0].rgb + irradianceSh.c[1].rgb * y + irradianceSh.c[2].rgb * z
    + irradianceSh.c[3].rgb * x + irradianceSh.c[4].rgb * (x * y) + irradianceSh.c[5].rgb * (y * z)
    + irradianceSh.c[6].rgb * (3.0 * z * z - 1.0) + irradianceSh.c[7].rgb * (z * x)
    + irradianceSh.c[8].rgb * (x * x - y * y);
  return max(e, float3(0.0));
}

float3 toEnvironment(float3 d) {
  return float3(dot(d, view.iblFrame[0].xyz), dot(d, view.iblFrame[1].xyz), dot(d, view.iblFrame[2].xyz));
}

[shader("fragment")]
FsOut fs(VsOut input, bool frontFacing : SV_IsFrontFace) {
  DrawRecord r = records[input.draw];
  SurfaceInput si;
  si.material = materials[r.materialIndex];
  si.uv = input.uv;
  si.vertexColor = input.color;
  si.drawColor = r.color;
  si.tangent = input.tangent;
  // Samples and derivatives first, in uniform control flow.
  si.baseColorSample = baseColorTexture.Sample(baseColorSampler, input.uv);
  si.emissiveSample = emissiveTexture.Sample(emissiveSampler, input.uv).rgb;
  si.metallicRoughnessSample = metallicRoughnessTexture.Sample(metallicRoughnessSampler, input.uv);
  si.normalSample = normalTexture.Sample(normalSampler, input.uv).xyz;
  si.occlusionSample = occlusionTexture.Sample(occlusionSampler, input.uv).r;
  si.dPdx = ddx(input.relPosition);
  si.dPdy = ddy(input.relPosition);
  si.dUVdx = ddx(input.uv);
  si.dUVdy = ddy(input.uv);
  float3 n = normalize(input.normal);
  si.normal = frontFacing ? n : -n;

  Material_ material;
  Surface s = material.surface(si);
  if ((si.material.flags & 4u) != 0u && s.baseColor.a < si.material.alphaCutoff) {
    discard;
  }

  FsOut o;
  o.featureId = uint2(input.feature & 0xffffu, input.feature >> 16u);
  if (s.unlit || (r.flags & 2u) != 0u) {
    o.color = float4(s.baseColor.rgb, 1.0);
    return o;
  }

  float3 v = -normalize(input.relPosition);
  float3 l = normalize(view.sunDirection.xyz);
  n = s.normal;
  float nDotV = clamp(dot(n, v), 0.0, 1.0);
  float3 f0 = lerp(float3(0.04), s.baseColor.rgb, s.metallic);
  float3 diffuseColor = s.baseColor.rgb * (1.0 - s.metallic);
  float alpha = s.roughness * s.roughness;

  float3 h = normalize(v + l);
  float nDotL = clamp(dot(n, l), 0.001, 1.0);
  float vDotH = clamp(dot(v, h), 0.0, 1.0);
  float nDotH = clamp(dot(n, h), 0.0, 1.0);
  float3 f90 = float3(clamp(max(f0.r, max(f0.g, f0.b)) * 25.0, 0.0, 1.0));
  float3 fresnel = fresnelSchlick(f0, f90, vDotH);
  float3 specular = fresnel * smithVisibility(alpha, nDotL, nDotV) * ggx(alpha, nDotH);
  float3 diffuse = (1.0 - fresnel) * diffuseColor / PI;
  float sunVisible = dot(n, l) > 0.0 ? 1.0 : 0.0;
  float3 direct = (diffuse + specular) * nDotL * view.sunIntensity * sunVisible;

  float2 lut = brdfLut.SampleLevel(environmentSampler, float2(nDotV, s.roughness), 0.0).rg;
  float3 iblF90 = max(float3(1.0 - s.roughness), f0);
  float3 fss = fresnelSchlick(f0, iblF90, nDotV);
  float3 fssEss = fss * lut.x + lut.y;
  float ems = 1.0 - lut.x - lut.y;
  float3 averageF = f0 + (1.0 - f0) / 21.0;
  float3 fmsEms = fssEss * averageF * ems / (1.0 - averageF * ems);
  float3 diffuseIbl = irradiance(toEnvironment(n)) * (fmsEms + (1.0 - fssEss - fmsEms) * diffuseColor);
  float3 reflected = toEnvironment(reflect(-v, n));
  float3 radiance = specularEnvironment.SampleLevel(environmentSampler, reflected, s.roughness * view.specularMaxLod).rgb;
  float3 specularIbl = radiance * fssEss;
  float3 indirect = (diffuseIbl * view.diffuseIbl + specularIbl * view.specularIbl) * s.occlusion;

  o.color = float4(direct + indirect + s.emissive, 1.0);
  return o;
}
