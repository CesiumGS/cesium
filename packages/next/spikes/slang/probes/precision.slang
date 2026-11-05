// The hi/lo position as a type: private parts, one operation. A float64
// position split into float32 pairs (`hi` whole meters), whose difference
// subtracts the highs as integers, which relaxed math can't reassociate
// (common.wgsl `hiLoDifference`, CESIUM2_WEBGPU_PLAN.md §3.3).
struct SplitPosition {
  private float3 hi;
  private float3 lo;

  __init(float3 hi, float3 lo) { this.hi = hi; this.lo = lo; }

  // The offset from `b` to this, exact to float32 for offsets well under
  // 2^24 m.
  float3 difference(SplitPosition b) {
    return float3(int3(hi) - int3(b.hi)) + (lo - b.lo);
  }
};

// Per item: a.hi, a.lo, b.hi, b.lo (xyz of each float4).
[[vk::binding(0, 0)]] StructuredBuffer<float4> inputs;
[[vk::binding(1, 0)]] RWStructuredBuffer<float4> outputs;

[shader("compute")]
[numthreads(64, 1, 1)]
void main(uint3 id : SV_DispatchThreadID) {
  uint i = id.x * 4;
  SplitPosition a = SplitPosition(inputs[i].xyz, inputs[i + 1].xyz);
  SplitPosition b = SplitPosition(inputs[i + 2].xyz, inputs[i + 3].xyz);
  outputs[id.x] = float4(a.difference(b), 0);
}
