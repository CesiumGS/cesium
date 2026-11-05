// The surface boundary's structs (surfaceBoundary.slang) in buffers, for
// their reflection: src/shaders/generated/boundary.ts (fields and types in
// order) is generated from this file's, with cesium.slang's contract
// (scripts/slangBuild.mjs `boundaryTs`). Its WGSL is not used.
import surfaceBoundary;

[[vk::binding(0, 0)]] StructuredBuffer<CesiumVertex> cesiumVertex;
[[vk::binding(1, 0)]] StructuredBuffer<CesiumVertexResult> cesiumVertexResult;
[[vk::binding(2, 0)]] StructuredBuffer<CesiumFragment> cesiumFragment;
[[vk::binding(3, 0)]] StructuredBuffer<MaterialOutput> materialOutput;
[[vk::binding(4, 0)]] StructuredBuffer<SurfaceVertex> surfaceVertex;
[[vk::binding(5, 0)]] RWStructuredBuffer<uint> out;

[shader("compute")]
[numthreads(1, 1, 1)]
void boundary() {
  // Every buffer read, so none is left out of the reflection.
  out[0] = cesiumVertex[0].draw + uint(cesiumVertexResult[0].named0.x) +
           cesiumFragment[0].draw + uint(materialOutput[0].alpha) +
           surfaceVertex[0].ids.x;
}
