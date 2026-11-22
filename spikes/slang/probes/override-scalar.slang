// A specialization constant used as a value: WGSL `override` (the
// engine's cutOutInDepth, AERIAL_GROUP).
[vk::constant_id(0)] const uint GROUP = 0u;
[[vk::binding(0, 0)]] RWStructuredBuffer<uint> o;

[shader("compute")]
[numthreads(64, 1, 1)]
void main(uint3 id : SV_DispatchThreadID) { o[id.x] = id.x + GROUP; }
