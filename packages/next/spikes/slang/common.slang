// Shared structs, layout-identical to src/shaders/common.wgsl (v1 records).
// Matrices are column-major in memory, as written by src/render/layout.ts.
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
  public float4 iblFrame[3];
  public float sunIntensity;
  public float diffuseIbl;
  public float specularIbl;
  public float specularMaxLod;
  public uint viewBit; // this view's bit in DrawRecord.viewMask
  public uint viewPad0;
  public uint viewPad1;
  public uint viewPad2;
};

public struct DrawRecord {
  public float3 originHi;
  public float radius;
  public float3 originLo;
  public uint flags;
  public column_major float4x4 model;
  public float4 color;
  public float3 center;
  public uint materialIndex;
  public uint indexCount;
  public uint firstIndex;
  public uint featureId;
  public uint batch;
  public uint positionOffset;
  public uint normalOffset;
  public uint uvOffset;
  public uint colorOffset;
  public uint tangentOffset;
  public uint textureSet;
  public uint imagerySlice;
  public uint featureIdOffset; // per-vertex local feature IDs (u32 words)
  public uint viewMask; // views that draw this record
  public uint clipBlock; // mixed-LOD placeholder: block of clip boxes
  public uint placeholderMask; // views in which the record draws only inside them
  public uint clipCount; // boxes in the block
  public float3 horizonPoint; // ellipsoid-scaled horizon-occlusion point (flags & 4)
  public uint recordPad3;
};

public struct DrawInstance {
  public column_major float4x4 relModel;
};

public struct Material {
  public float4 baseColor;
  public float3 emissive;
  public float metallic;
  public float roughness;
  public float alphaCutoff;
  public float normalScale;
  public float occlusionStrength;
  public uint flags;
  public uint pad0;
  public uint pad1;
  public uint pad2;
};

public static const uint NO_STREAM = 0xffffffffu;
