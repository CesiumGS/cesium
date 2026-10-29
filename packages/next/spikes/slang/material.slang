// The material extension point: what a user implements.
module material;

public struct MaterialInput {
  public float4 baseColor; // linear
  public float3 normal;    // unit, camera-relative world axes
  public float3 sunDirection;
  public uint flags;
};

public interface IMaterial {
  float3 shade(MaterialInput input);
};
