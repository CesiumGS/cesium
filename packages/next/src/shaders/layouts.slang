// The shared structs in the buffers the engine binds them in (View as a
// uniform, the tables as storage), for their reflected layouts: the
// TypeScript offsets are generated from this file's reflection
// (scripts/slangBuild.mjs → src/render/generated/layouts.ts). Its WGSL is
// not used by the engine.
import common;

[[vk::binding(0, 0)]] ConstantBuffer<View> view;
[[vk::binding(1, 0)]] StructuredBuffer<DrawRecord> records;
[[vk::binding(2, 0)]] StructuredBuffer<Transform> transforms;
[[vk::binding(3, 0)]] StructuredBuffer<Instance> instances;
[[vk::binding(4, 0)]] StructuredBuffer<DrawItem> items;
[[vk::binding(5, 0)]] StructuredBuffer<Material> materials;
[[vk::binding(6, 0)]] StructuredBuffer<LightHeader> lightHeaders;
[[vk::binding(7, 0)]] StructuredBuffer<Light> lights;
[[vk::binding(8, 0)]] RWStructuredBuffer<uint> out;

[shader("compute")]
[numthreads(1, 1, 1)]
void layouts() {
  // Every table read, so none is left out of the reflection.
  out[0] = view.viewBit + records[0].batch + transforms[0].flags +
           instances[0].record + items[0].record + materials[0].flags +
           uint(lightHeaders[0].grid.w + lights[0].position.w);
}
