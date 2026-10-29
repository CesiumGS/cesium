// Shared structs, layout-identical to src/shaders/common.wgsl.
module common;

public struct View {
  public column_major float4x4 viewProj;
  public column_major float4x4 viewRotation;
  public float3 cameraHi;
  public float nearPlane;
  public float3 cameraLo;
  public float aspect;
  public float4 planes[5];
  public float4 sunDirection;
  public float4 viewport;
};

public struct DrawRecord {
  public float3 originHi;
  public float radius;
  public float3 originLo;
  public uint flags;
  public column_major float4x4 model;
  public float4 color;
  public uint indexCount;
  public uint firstIndex;
  public int baseVertex;
  public uint featureId;
};

public struct DrawInstance {
  public column_major float4x4 relModel;
};
