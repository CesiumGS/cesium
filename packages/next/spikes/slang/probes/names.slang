// Names: what the engine's runtime-composed code would refer to (bindings,
// helpers, struct fields) keeps its name in the WGSL, or doesn't.
struct DrawRecord { float4 center; uint flags; uint batch; };
[[vk::binding(0, 0)]] StructuredBuffer<DrawRecord> records;
[[vk::binding(1, 0)]] RWStructuredBuffer<uint> visible;

public float doubled(float x) { return x * 2.0; }

[shader("compute")]
[numthreads(64, 1, 1)]
void main(uint3 id : SV_DispatchThreadID) {
  visible[id.x] = doubled(records[id.x].center.w) > 1.0 ? records[id.x].batch : 0u;
}
