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
// (the visible items, counted by `countInstance`), first index, base
// vertex, first instance. Read and written only through the accessors
// below (the draw-arguments seam, render/drawArguments.ts).
[[vk::binding(7, 1)]] public RWStructuredBuffer<Atomic<uint>> args;
[[vk::binding(8, 1)]] public ConstantBuffer<CullParams> params;

// A draw's record: the only read of `records` in the cull kernels (the
// per-draw constants seam, plan 5a's call 37). A later per-draw constants
// path (immediates, a resource table) replaces this function alone.
// Inlined, so each field is loaded where it is used, as before.
[ForceInline]
public DrawRecord drawRecord(uint index) {
  return records[index];
}

// The draw-arguments seam's shader side (plan 5a's call 37; on the CPU,
// render/drawArguments.ts, whose `slotOf` is `argumentSlot` in bytes).
// Multi-draw indirect or GPU-driven submission replaces these functions,
// not the kernels that call them. Inlined, so the kernels compile as they
// did before the seam.

// Words of the arguments a batch.
public static const uint ARGUMENT_WORDS = 5u;

// The first word of batch `batch`'s arguments. (Its result and
// `countInstance`'s are named locals so that the generated WGSL keeps the
// names it had before the seam: byte for byte the same kernels.)
[ForceInline]
public uint argumentSlot(uint batch) {
  uint a = batch * ARGUMENT_WORDS;
  return a;
}

// Counts one visible item into the instance count of the arguments at
// `a`; returns the count before it (the item's place in its batch's slice
// of `itemList`).
[ForceInline]
public uint countInstance(uint a) {
  uint slot = args[a + 1u].add(1u);
  return slot;
}

// The instance count the cull counted, in the arguments at `a`.
[ForceInline]
public uint countedInstances(uint a) {
  return args[a + 1u].load();
}

// An indexed batch's arguments at `a`, beside the instance count the
// cull counted. The item index comes from `itemList` bound as an
// instance-step vertex buffer at the batch's offset, so the base vertex
// and first instance stay 0 and the `indirect-first-instance` feature is
// not needed.
[ForceInline]
public void storeIndexedArguments(uint a, uint indexCount, uint firstIndex) {
  args[a].store(indexCount);
  args[a + 2u].store(firstIndex);
  args[a + 3u].store(0u);
  args[a + 4u].store(0u);
}

// Word `word` (0 to ARGUMENT_WORDS - 1) of the arguments at `a`. A point
// set's are read as a non-indexed draw's: vertex count, instance count,
// first vertex, first instance.
[ForceInline]
public void storeArgument(uint a, uint word, uint value) {
  args[a + word].store(value);
}

// A patch draw's batch (the dice kernels, dice.slang): its arguments are an
// indexed draw's, one instance a chunk of cells, over the one index buffer
// every chunk shares. Word 4 (the first instance, which must stay 0 once the
// draw is written) counts the chunks the dice wrote, cleared with the rest;
// `storePatchArguments` then replaces the cull's item count and zeroes it.
// `countChunks` returns the count before, the first slot of the chunks.
[ForceInline]
public uint countChunks(uint a, uint n) {
  uint first = args[a + 4u].add(n);
  return first;
}

[ForceInline]
public uint countedChunks(uint a) {
  return args[a + 4u].load();
}

[ForceInline]
public void storePatchArguments(uint a, uint indexCount, uint chunkCount) {
  args[a].store(indexCount);
  args[a + 1u].store(chunkCount);
  args[a + 2u].store(0u);
  args[a + 3u].store(0u);
  args[a + 4u].store(0u);
}

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
// view's body anchor, and for every anchor placed at the identity, whose
// inputs are then the same as before anchors; the multiply by the identity
// is still in the kernel, and Metal may sum floats in another order once the
// kernel's code changes, so a result can differ in the last bit). Rows: `linear` holds the rotation-scale by
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
// (RecordFlags.notGround). A shadow cascade's view (View.time.z 1) also
// draws the casters its view selected off screen (DrawRecord.casterMask).
// Under an anchor the eye is too far from (AnchorEye.eyeHi.w 1), nothing
// draws.
public bool drawable(DrawRecord r, Transform t) {
  uint mask = view.time.z > 0.5 ? r.viewMask | r.casterMask : r.viewMask;
  return (r.flags & 1u) == 0u && (t.flags & 1u) == 0u && r.indexCount != 0u &&
         (mask & view.viewBit) != 0u &&
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
