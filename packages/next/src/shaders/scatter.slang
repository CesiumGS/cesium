// Scatter upload: `src` holds `count` entry indices followed by their data,
// `words` u32s per entry; one thread per word copies it to its entry in
// `dst` (records, transforms or instances). Changes spread across a table
// upload as packed pairs instead of the whole span between them.

struct ScatterParams {
  uint count;
  uint words;
  uint pad0;
  uint pad1;
};

[[vk::binding(0, 0)]] ConstantBuffer<ScatterParams> params;
[[vk::binding(1, 0)]] StructuredBuffer<uint> src;
[[vk::binding(2, 0)]] RWStructuredBuffer<uint> dst;

[shader("compute")]
[numthreads(64, 1, 1)]
void main(uint3 gid : SV_DispatchThreadID) {
  uint k = gid.x;
  if (k >= params.count * params.words) {
    return;
  }
  uint entry = k / params.words;
  uint word = k - entry * params.words;
  dst[src[entry] * params.words + word] = src[params.count + k];
}
