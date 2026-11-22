// Misusing a SplitPosition (adding its parts, which loses the precision
// the type exists for) is a compile error, not a test failure.
struct SplitPosition {
  private float3 hi;
  private float3 lo;
  __init(float3 hi, float3 lo) { this.hi = hi; this.lo = lo; }
};
[[vk::binding(0, 0)]] RWStructuredBuffer<float4> o;

[shader("compute")]
[numthreads(1, 1, 1)]
void main() {
  SplitPosition a = SplitPosition(float3(1), float3(0));
  o[0] = float4(a.hi + a.lo, 0);
}
