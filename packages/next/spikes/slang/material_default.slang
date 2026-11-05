// glTF metallic-roughness surface, equivalent to src/shaders/opaque.wgsl.
// Bound into the engine by bind_default.slang.
module material_default;
import common;
import material;

public struct DefaultMaterial : IMaterial {
  public Surface surface(SurfaceInput i) {
    Material m = i.material;
    uint flags = m.flags;
    float4 baseColorSample = i.baseColorSample;
    float3 emissiveSample = i.emissiveSample;
    if ((flags & 512u) != 0u) {
      baseColorSample = float4(pow(baseColorSample.rgb, float3(2.2)), baseColorSample.a);
      emissiveSample = pow(emissiveSample, float3(2.2));
    }
    Surface s;
    s.baseColor = m.baseColor * i.drawColor * i.vertexColor;
    if (materialHasTexture(m, 0u)) {
      s.baseColor *= baseColorSample;
    }
    s.emissive = m.emissive;
    if (materialHasTexture(m, 4u)) {
      s.emissive *= emissiveSample;
    }
    s.metallic = m.metallic;
    s.roughness = m.roughness;
    if (materialHasTexture(m, 1u)) {
      s.roughness *= i.metallicRoughnessSample.g;
      s.metallic *= i.metallicRoughnessSample.b;
    }
    s.metallic = clamp(s.metallic, 0.0, 1.0);
    s.roughness = clamp(s.roughness, 0.0, 1.0);
    s.normal = i.normal;
    if (materialHasTexture(m, 2u)) {
      float3 t;
      float3 b;
      if (i.tangent.w != 0.0) {
        t = normalize(i.tangent.xyz - i.normal * dot(i.normal, i.tangent.xyz));
        b = cross(i.normal, t) * i.tangent.w;
      } else {
        float3 dp2perp = cross(i.dPdy, i.normal);
        float3 dp1perp = cross(i.normal, i.dPdx);
        float3 tt = dp2perp * i.dUVdx.x + dp1perp * i.dUVdy.x;
        float3 bb = dp2perp * i.dUVdx.y + dp1perp * i.dUVdy.y;
        float invMax = rsqrt(max(dot(tt, tt), dot(bb, bb)) + 1e-20);
        t = tt * invMax;
        b = bb * invMax;
      }
      float3 ts = (i.normalSample * 2.0 - 1.0) * float3(m.normalScale, m.normalScale, 1.0);
      s.normal = normalize(t * ts.x + b * ts.y + i.normal * ts.z);
    }
    s.occlusion = 1.0;
    if (materialHasTexture(m, 3u)) {
      s.occlusion = 1.0 + m.occlusionStrength * (i.occlusionSample - 1.0);
    }
    s.unlit = (flags & 1u) != 0u;
    return s;
  }
};

