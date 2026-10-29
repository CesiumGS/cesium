// Slang port of src/shaders/prep.wgsl, including the hi/lo subtraction.
module prep;
import common;

struct PrepParams {
  uint count;
  uint writeFirstInstance;
  uint pad0;
  uint pad1;
};

[[vk::binding(0, 0)]] ConstantBuffer<View> view;
[[vk::binding(0, 1)]] StructuredBuffer<DrawRecord> records;
[[vk::binding(1, 1)]] RWStructuredBuffer<DrawInstance> instances;
[[vk::binding(2, 1)]] RWStructuredBuffer<uint> args;
[[vk::binding(3, 1)]] ConstantBuffer<PrepParams> params;

[shader("compute")]
[numthreads(64, 1, 1)]
void main(uint3 gid : SV_DispatchThreadID) {
  uint i = gid.x;
  if (i >= params.count) {
    return;
  }
  DrawRecord r = records[i];
  float3 rel = (r.originHi - view.cameraHi) + (r.originLo - view.cameraLo);

  bool visible = (r.flags & 1u) == 0u && r.indexCount > 0u;
  for (uint p = 0; p < 5; p++) {
    float4 plane = view.planes[p];
    if (dot(plane.xyz, rel) + plane.w < -r.radius) {
      visible = false;
    }
  }

  float4x4 m = r.model;
  m[0][3] += rel.x;
  m[1][3] += rel.y;
  m[2][3] += rel.z;
  instances[i].relModel = m;

  uint a = i * 5;
  args[a] = r.indexCount;
  args[a + 1] = visible ? 1u : 0u;
  args[a + 2] = r.firstIndex;
  args[a + 3] = asuint(r.baseVertex);
  args[a + 4] = params.writeFirstInstance == 1u ? i : 0u;
}
