// Slang port of src/shaders/cull.wgsl (v2): records and instances are draw
// items; each is culled and compacted per batch, then one indirect draw is
// written per batch.
module cull;
import common;

struct CullParams {
  uint recordCount;
  uint batchCount;
  uint instanceCount;
  uint firstInstanceItem;
};

struct Batch {
  uint itemBase;
  uint indexCount;
  uint firstIndex;
  uint pad;
};

[[vk::binding(0, 0)]] ConstantBuffer<View> view;
[[vk::binding(0, 1)]] StructuredBuffer<DrawRecord> records;
[[vk::binding(1, 1)]] StructuredBuffer<Transform> transforms;
[[vk::binding(2, 1)]] StructuredBuffer<Instance> instanceTable;
[[vk::binding(3, 1)]] RWStructuredBuffer<DrawItem> items;
[[vk::binding(4, 1)]] RWStructuredBuffer<uint> itemList;
[[vk::binding(5, 1)]] RWStructuredBuffer<Atomic<uint>> batchCounts;
[[vk::binding(6, 1)]] StructuredBuffer<Batch> batches;
[[vk::binding(7, 1)]] RWStructuredBuffer<uint> args;
[[vk::binding(8, 1)]] ConstantBuffer<CullParams> params;

static const uint NONE = 0xffffffffu;

// Hi and lo differences cancel separately before they are combined.
float4x4 relativeMatrix(Transform t) {
  float3 rel = (t.originHi - view.cameraHi) + (t.originLo - view.cameraLo);
  return float4x4(
    t.linear[0].x, t.linear[1].x, t.linear[2].x, rel.x,
    t.linear[0].y, t.linear[1].y, t.linear[2].y, rel.y,
    t.linear[0].z, t.linear[1].z, t.linear[2].z, rel.z,
    0.0, 0.0, 0.0, 1.0);
}

bool drawable(DrawRecord r, Transform t) {
  return (r.flags & 1u) == 0u && (t.flags & 1u) == 0u && r.indexCount != 0u &&
    (r.viewMask & view.viewBit) != 0u;
}

bool inFrustum(float4x4 m, float3 center, float radius) {
  float3 c = mul(m, float4(center, 1.0)).xyz;
  for (uint p = 0; p < 5; p++) {
    float4 plane = view.planes[p];
    if (dot(plane.xyz, c) + plane.w < -radius) {
      return false;
    }
  }
  return true;
}

void append(uint batch, uint item) {
  uint slot = batchCounts[batch].add(1u);
  itemList[batches[batch].itemBase + slot] = item;
}

DrawItem makeDrawItem(float4x4 m, uint record, uint feature, uint instance, uint tint) {
  DrawItem p;
  p.relModel = m;
  p.record = record;
  p.feature = feature;
  p.instance = instance;
  p.tint = tint;
  return p;
}

[shader("compute")]
[numthreads(64, 1, 1)]
void cullRecords(uint3 gid : SV_DispatchThreadID) {
  uint i = gid.x;
  if (i >= params.recordCount) {
    return;
  }
  DrawRecord r = records[i];
  if (r.instanceCount != 0u) {
    return;
  }
  Transform t = transforms[r.transform];
  float4x4 m = relativeMatrix(t);
  items[i] = makeDrawItem(m, i, 0u, 0u, NONE);
  if (drawable(r, t) && inFrustum(m, r.center, r.radius * t.scale)) {
    append(r.batch, i);
  }
}

[shader("compute")]
[numthreads(64, 1, 1)]
void cullInstances(uint3 gid : SV_DispatchThreadID) {
  uint j = gid.x;
  if (j >= params.instanceCount) {
    return;
  }
  Instance inst = instanceTable[j];
  if (inst.record == NONE) {
    return;
  }
  DrawRecord r = records[inst.record];
  Transform t = transforms[r.transform];
  float4x4 local = float4x4(inst.row0, inst.row1, inst.row2, float4(0.0, 0.0, 0.0, 1.0));
  float4x4 m = mul(relativeMatrix(t), local);
  uint feature = 0u;
  if (inst.feature != NONE && r.featureId != 0u) {
    feature = r.featureId + inst.feature;
  }
  uint item = params.firstInstanceItem + j;
  items[item] = makeDrawItem(m, inst.record, feature, j - r.instanceFirst, inst.tint);
  float scale = t.scale * max(length(float3(inst.row0.x, inst.row1.x, inst.row2.x)),
    max(length(float3(inst.row0.y, inst.row1.y, inst.row2.y)), length(float3(inst.row0.z, inst.row1.z, inst.row2.z))));
  if ((inst.flags & 1u) == 0u && drawable(r, t) && inFrustum(m, r.center, r.radius * scale)) {
    append(r.batch, item);
  }
}

[shader("compute")]
[numthreads(64, 1, 1)]
void writeDrawArgs(uint3 gid : SV_DispatchThreadID) {
  uint b = gid.x;
  if (b >= params.batchCount) {
    return;
  }
  Batch batch = batches[b];
  uint a = b * 5;
  args[a] = batch.indexCount;
  args[a + 1] = batchCounts[b].load();
  args[a + 2] = batch.firstIndex;
  args[a + 3] = 0;
  args[a + 4] = 0;
}
