// The cull kernels' view and world tables (group 0 the view, group 1 the
// world's cull tables) and what they share: the camera-relative matrix,
// whether a record draws in this view, the frustum test. cull.slang and
// pointCull.slang import it; each binds only what it uses (the point cull's
// group 1 is `cull.pointWorld`: records, transforms, arguments).
module cullTables;

import common;

public struct Batch {
  public uint itemBase;          // first slot of this batch in `itemList`
  public uint indexCount;
  public uint firstIndex;
  public uint pad;
};

public struct CullParams {
  public uint recordCount;
  public uint batchCount;
  public uint instanceCount;     // instance-table slots in use (high-water mark)
  public uint firstInstanceItem; // item index of instance slot 0 (= max records)
};

[[vk::binding(0, 0)]] public ConstantBuffer<View> view;
[[vk::binding(0, 1)]] public StructuredBuffer<DrawRecord> records;
[[vk::binding(1, 1)]] public StructuredBuffer<Transform> transforms;
[[vk::binding(2, 1)]] public StructuredBuffer<Instance> instanceTable;
[[vk::binding(3, 1)]] public RWStructuredBuffer<DrawItem> items;
[[vk::binding(4, 1)]] public RWStructuredBuffer<uint> itemList;
[[vk::binding(6, 1)]] public StructuredBuffer<Batch> batches;
// Five words a batch (drawIndexedIndirect): index count, instance count
// (the visible items, counted by `append`), first index, base vertex,
// first instance.
[[vk::binding(7, 1)]] public RWStructuredBuffer<Atomic<uint>> args;
[[vk::binding(8, 1)]] public ConstantBuffer<CullParams> params;

public static const uint NONE = 0xffffffffu;
public static const uint WHITE = 0xffffffffu;

// The view's eye for a transform's anchor (Transform.flags bits 8 to 15;
// a slot past the table reads its last entry).
public AnchorEye anchorEye(Transform t) {
  return view.anchors[min((t.flags >> 8u) & 0xffu, MAX_ANCHORS - 1u)];
}

// The transform as a camera-relative matrix. This is the only place large
// coordinates meet the camera: the position's difference from the eye in
// the transform's anchor is exact (SplitPosition), so the result keeps
// float32 precision relative to the (small) camera distance; then the
// anchor's axes turn it into the view's shading axes (the identity for the
// view's body anchor, and for every anchor placed at the identity, which
// leaves each float as it was). Rows: `linear` holds the rotation-scale by
// row as Slang indexes it (layout.ts writes columns, and the column-major
// storage reads them back as this matrix).
public float4x4 relativeMatrix(Transform t) {
  AnchorEye eye = anchorEye(t);
  float3 rel = SplitPosition(t.originHi, t.originLo)
                   .difference(SplitPosition(eye.eyeHi.xyz, eye.eyeLo.xyz));
  float3x3 axes = float3x3(eye.axes[0].xyz, eye.axes[1].xyz, eye.axes[2].xyz);
  float3x3 linear = mul(axes, t.linear);
  rel = mul(axes, rel);
  return float4x4(
      float4(linear[0], rel.x),
      float4(linear[1], rel.y),
      float4(linear[2], rel.z),
      float4(0, 0, 0, 1));
}

// Hidden, empty, or not selected for this view (multi-view tile selection
// shares one draw table and picks LOD per view through the mask). A height
// capture's view (View.time.y 1) culls what isn't ground
// (RecordFlags.notGround). Under an anchor the eye is too far from
// (AnchorEye.eyeHi.w 1), nothing draws.
public bool drawable(DrawRecord r, Transform t) {
  return (r.flags & 1u) == 0u && (t.flags & 1u) == 0u && r.indexCount != 0u &&
         (r.viewMask & view.viewBit) != 0u &&
         !(view.time.y > 0.5 && (r.flags & 32u) != 0u) &&
         anchorEye(t).eyeHi.w < 0.5;
}

public bool inFrustum(float4x4 m, float3 center, float radius) {
  float3 c = mul(m, float4(center, 1.0)).xyz;
  for (uint p = 0u; p < 5u; p++) {
    float4 plane = view.planes[p];
    if (dot(plane.xyz, c) + plane.w < -radius) {
      return false;
    }
  }
  return true;
}
