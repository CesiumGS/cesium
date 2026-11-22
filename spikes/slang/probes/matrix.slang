// A matrix in a storage buffer: how Slang lays it out and reads it.
struct Transform { float4x4 model; };
[[vk::binding(0, 0)]] StructuredBuffer<Transform> transforms;
[[vk::binding(1, 0)]] RWStructuredBuffer<float4> o;

[shader("compute")]
[numthreads(64, 1, 1)]
void main(uint3 id : SV_DispatchThreadID) { o[id.x] = mul(transforms[id.x].model, float4(1, 2, 3, 1)); }
