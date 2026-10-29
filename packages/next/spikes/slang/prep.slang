// Slang port of src/shaders/prep.wgsl (v1): cull, compact per batch, write
// one indirect draw per batch.
module prep;
import common;

struct PrepParams {
  uint recordCount;
  uint batchCount;
  uint pad0;
  uint pad1;
};

struct Batch {
  uint instanceBase;
  uint indexCount;
  uint firstIndex;
  uint pad;
};

[[vk::binding(0, 0)]] ConstantBuffer<View> view;
[[vk::binding(0, 1)]] StructuredBuffer<DrawRecord> records;
[[vk::binding(1, 1)]] RWStructuredBuffer<DrawInstance> instances;
[[vk::binding(2, 1)]] RWStructuredBuffer<uint> instanceList;
[[vk::binding(3, 1)]] RWStructuredBuffer<Atomic<uint>> batchCounts;
[[vk::binding(4, 1)]] StructuredBuffer<Batch> batches;
[[vk::binding(5, 1)]] RWStructuredBuffer<uint> args;
[[vk::binding(6, 1)]] ConstantBuffer<PrepParams> params;

[shader("compute")]
[numthreads(64, 1, 1)]
void main(uint3 gid : SV_DispatchThreadID) {
  uint i = gid.x;
  if (i >= params.recordCount) {
    return;
  }
  DrawRecord r = records[i];
  // Hi and lo differences cancel separately before they are combined.
  float3 rel = (r.originHi - view.cameraHi) + (r.originLo - view.cameraLo);

  float4x4 m = r.model;
  m[0][3] += rel.x;
  m[1][3] += rel.y;
  m[2][3] += rel.z;
  instances[i].relModel = m;

  if ((r.flags & 1u) != 0u || r.indexCount == 0u) {
    return;
  }
  float3 center = rel + r.center;
  for (uint p = 0; p < 5; p++) {
    float4 plane = view.planes[p];
    if (dot(plane.xyz, center) + plane.w < -r.radius) {
      return;
    }
  }
  uint slot = batchCounts[r.batch].add(1u);
  instanceList[batches[r.batch].instanceBase + slot] = i;
}

[shader("compute")]
[numthreads(64, 1, 1)]
void writeArgs(uint3 gid : SV_DispatchThreadID) {
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
