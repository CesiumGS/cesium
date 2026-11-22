// Subgroup (wave) operations: WGSL's `subgroups` feature.
[[vk::binding(0, 0)]] RWStructuredBuffer<uint> o;

[shader("compute")]
[numthreads(64, 1, 1)]
void main(uint3 id : SV_DispatchThreadID) { o[id.x] = WaveActiveSum(1u) + WavePrefixSum(1u); }
