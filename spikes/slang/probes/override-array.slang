// A workgroup array sized by a specialization constant (WGSL `override`
// array sizes). None of the engine's arrays need it today (theirs are
// const-sized).
[SpecializationConstant] const int GROUP = 64;
groupshared float tile[GROUP];
[[vk::binding(0, 0)]] RWStructuredBuffer<float> o;

[shader("compute")]
[numthreads(64, 1, 1)]
void main(uint3 t : SV_GroupThreadID) {
  tile[t.x] = 1.0;
  GroupMemoryBarrierWithGroupSync();
  o[t.x] = tile[(t.x + 1) % GROUP];
}
