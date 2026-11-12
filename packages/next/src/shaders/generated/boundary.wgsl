// Generated from src/shaders/boundary.slang by slangc 2026.21
// (scripts/slangBuild.mjs). Do not edit: change the .slang and regenerate.
@binding(5) @group(0) var<storage, read_write> out_0 : array<u32>;

struct CesiumVertex_std430_0
{
    @align(16) positionMC : vec3<f32>,
    @align(16) designPositionMC : vec3<f32>,
    @align(16) normalMC : vec3<f32>,
    @align(16) texCoord0 : vec2<f32>,
    @align(16) color0 : vec4<f32>,
    @align(16) featureId0 : u32,
    @align(4) vertexIndex : u32,
    @align(8) instanceIndex : u32,
    @align(4) time : f32,
    @align(16) draw : u32,
    @align(4) directory : u32,
    @align(8) tableFeature : u32,
};

@binding(0) @group(0) var<storage, read> cesiumVertex_0 : array<CesiumVertex_std430_0>;

struct CesiumVertexResult_std430_0
{
    @align(16) positionMC : vec3<f32>,
    @align(16) normalMC : vec3<f32>,
    @align(16) named0 : vec4<f32>,
    @align(16) named1 : vec4<f32>,
    @align(16) named2 : vec4<f32>,
    @align(16) named3 : vec4<f32>,
};

@binding(1) @group(0) var<storage, read> cesiumVertexResult_0 : array<CesiumVertexResult_std430_0>;

struct CesiumFragment_std430_0
{
    @align(16) positionMC : vec3<f32>,
    @align(16) positionEC : vec3<f32>,
    @align(16) positionWC : vec3<f32>,
    @align(16) truePositionEC : vec3<f32>,
    @align(16) normal : vec3<f32>,
    @align(16) texCoord0 : vec2<f32>,
    @align(16) color0 : vec4<f32>,
    @align(16) featureId : u32,
    @align(8) screen : vec2<f32>,
    @align(16) time : f32,
    @align(4) instanceIndex : u32,
    @align(8) draw : u32,
    @align(4) directory : u32,
    @align(16) localFeature : u32,
    @align(16) named0 : vec4<f32>,
    @align(16) named1 : vec4<f32>,
    @align(16) named2 : vec4<f32>,
    @align(16) named3 : vec4<f32>,
    @align(16) clipDistance : f32,
    @align(4) clipFlags : u32,
    @align(8) clipId : u32,
    @align(16) clipParams : vec4<f32>,
};

@binding(2) @group(0) var<storage, read> cesiumFragment_0 : array<CesiumFragment_std430_0>;

struct MaterialOutput_std430_0
{
    @align(16) baseColor : vec3<f32>,
    @align(4) alpha : f32,
    @align(16) metallic : f32,
    @align(4) roughness : f32,
    @align(16) normal : vec3<f32>,
    @align(4) occlusion : f32,
    @align(16) emissive : vec3<f32>,
    @align(4) unlit : bool,
};

@binding(3) @group(0) var<storage, read> materialOutput_0 : array<MaterialOutput_std430_0>;

struct SurfaceVertex_std430_0
{
    @align(16) position : vec4<f32>,
    @align(16) normal : vec3<f32>,
    @align(16) uv : vec2<f32>,
    @align(16) color : vec4<f32>,
    @align(16) ids : vec3<u32>,
    @align(16) relPosition : vec3<f32>,
    @align(16) tangent : vec4<f32>,
    @align(16) airInscatter : vec3<f32>,
    @align(16) airTransmittance : vec4<f32>,
    @align(16) positionMC : vec3<f32>,
    @align(16) named0 : vec4<f32>,
    @align(16) named1 : vec4<f32>,
    @align(16) named2 : vec4<f32>,
    @align(16) named3 : vec4<f32>,
};

@binding(4) @group(0) var<storage, read> surfaceVertex_0 : array<SurfaceVertex_std430_0>;

struct CesiumVertex
{
     positionMC : vec3<f32>,
     designPositionMC : vec3<f32>,
     normalMC : vec3<f32>,
     texCoord0 : vec2<f32>,
     color0 : vec4<f32>,
     featureId0 : u32,
     vertexIndex : u32,
     instanceIndex : u32,
     time : f32,
     draw : u32,
     directory : u32,
     tableFeature : u32,
};

struct CesiumVertexResult
{
     positionMC : vec3<f32>,
     normalMC : vec3<f32>,
     named0 : vec4<f32>,
     named1 : vec4<f32>,
     named2 : vec4<f32>,
     named3 : vec4<f32>,
};

struct CesiumFragment
{
     positionMC : vec3<f32>,
     positionEC : vec3<f32>,
     positionWC : vec3<f32>,
     truePositionEC : vec3<f32>,
     normal : vec3<f32>,
     texCoord0 : vec2<f32>,
     color0 : vec4<f32>,
     featureId : u32,
     screen : vec2<f32>,
     time : f32,
     instanceIndex : u32,
     draw : u32,
     directory : u32,
     localFeature : u32,
     named0 : vec4<f32>,
     named1 : vec4<f32>,
     named2 : vec4<f32>,
     named3 : vec4<f32>,
     clipDistance : f32,
     clipFlags : u32,
     clipId : u32,
     clipParams : vec4<f32>,
};

struct MaterialOutput
{
     baseColor : vec3<f32>,
     alpha : f32,
     metallic : f32,
     roughness : f32,
     normal : vec3<f32>,
     occlusion : f32,
     emissive : vec3<f32>,
     unlit : bool,
};

struct SurfaceVertex
{
     position : vec4<f32>,
     normal : vec3<f32>,
     uv : vec2<f32>,
     color : vec4<f32>,
     ids : vec3<u32>,
     relPosition : vec3<f32>,
     tangent : vec4<f32>,
     airInscatter : vec3<f32>,
     airTransmittance : vec4<f32>,
     positionMC : vec3<f32>,
     named0 : vec4<f32>,
     named1 : vec4<f32>,
     named2 : vec4<f32>,
     named3 : vec4<f32>,
};

@compute
@workgroup_size(1, 1, 1)
fn boundary()
{
    out_0[i32(0)] = cesiumVertex_0[i32(0)].draw + u32(cesiumVertexResult_0[i32(0)].named0.x) + cesiumFragment_0[i32(0)].draw + u32(materialOutput_0[i32(0)].alpha) + surfaceVertex_0[i32(0)].ids.x;
    return;
}

struct RoutedVertex
{
     routed : bool,
     position : vec3<f32>,
     displacement : vec3<f32>,
     jx : vec3<f32>,
     jy : vec3<f32>,
     jz : vec3<f32>,
};

