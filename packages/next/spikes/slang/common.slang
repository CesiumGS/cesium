// Shared structs, layout-identical to src/shaders/common.wgsl (v2 records:
// transforms and instances in their own tables).
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
  public float3 center; // bounding sphere in the transform's local frame
  public float radius;
  public float4 color;
  public uint transform; // index in the transform table
  public uint flags;
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
  public uint instanceFirst; // range in the instance table; count 0 = none
  public uint instanceCount;
  public uint instanceStreams; // per-instance streams in the arena
  public uint instanceStride;
  public uint recordPad;
};

// A placement composed in float64 on the CPU (World transform table).
public struct Transform {
  public float3 originHi;
  public float scale; // largest axis scale of the 3×3 (bounding radii)
  public float3 originLo;
  public uint flags; // 1 hidden (itself or an ancestor)
  public float4 linear[3]; // columns of the rotation-scale, .w unused
};

// One instance of an instanced record: an affine (three rows) relative to
// the record's transform.
public struct Instance {
  public float4 row0;
  public float4 row1;
  public float4 row2;
  public uint record; // 0xffffffff: free slot
  public uint feature; // local feature ID; 0xffffffff = the record's
  public uint flags; // 1 hidden
  public uint tint; // RGBA8 linear multiplier
};

// Written per view by the cull kernels for every draw item.
public struct DrawItem {
  public column_major float4x4 relModel;
  public uint record;
  public uint feature; // the instance's global feature ID; 0 = the record's
  public uint instance;
  public uint tint;
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
