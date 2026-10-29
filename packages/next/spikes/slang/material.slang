// The material extension point. A material turns interpolated geometry and
// the glTF material record into a surface; the engine lights the surface.
module material;
import common;

public struct SurfaceInput {
  public float2 uv;
  public float4 vertexColor;
  public float3 normal;       // geometric, camera-relative world axes, unit
  public float4 tangent;      // xyz + handedness; w == 0: none
  public float3 dPdx;
  public float3 dPdy;
  public float2 dUVdx;
  public float2 dUVdy;
  public float4 drawColor;    // per-draw tint
  public Material material;
  // Texture samples, taken by the engine in uniform control flow.
  public float4 baseColorSample;
  public float4 metallicRoughnessSample;
  public float3 normalSample;
  public float occlusionSample;
  public float3 emissiveSample;
};

public struct Surface {
  public float4 baseColor;    // linear
  public float metallic;
  public float roughness;
  public float3 normal;       // shading normal
  public float3 emissive;
  public float occlusion;
  public bool unlit;
};

public interface IMaterial {
  Surface surface(SurfaceInput input);
};
