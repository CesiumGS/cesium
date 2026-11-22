// 32-bit atomics through typed buffers (InterlockedAdd on a plain
// RWStructuredBuffer<uint> isn't available for WGSL).
[[vk::binding(0, 0)]] RWStructuredBuffer<Atomic<uint>> counters;
groupshared Atomic<uint> local;

[shader("compute")]
[numthreads(64, 1, 1)]
void main(uint3 id : SV_DispatchThreadID, uint3 t : SV_GroupThreadID) {
  if (t.x == 0) { local.store(0u); }
  GroupMemoryBarrierWithGroupSync();
  local.add(1u);
  GroupMemoryBarrierWithGroupSync();
  if (t.x == 0) { counters[0].add(local.load()); counters[1].max(id.x); }
}
