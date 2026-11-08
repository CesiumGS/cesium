// Generated from src/shaders/layouts.slang by slangc 2026.21
// (scripts/slangBuild.mjs). Do not edit: change the .slang and regenerate.
@binding(9) @group(0) var<storage, read_write> out_0 : array<u32>;

struct _MatrixStorage_float4x4_ColMajorstd140_0
{
    @align(16) data_0 : array<vec4<f32>, i32(4)>,
};

struct AnchorEye_std140_0
{
    @align(16) eyeHi_0 : vec4<f32>,
    @align(16) eyeLo_0 : vec4<f32>,
    @align(16) axes_0 : array<vec4<f32>, i32(3)>,
};

struct _Array_std140_AnchorEye32_0
{
    @align(16) data_1 : array<AnchorEye_std140_0, i32(32)>,
};

struct View_std140_0
{
    @align(16) viewProj_0 : _MatrixStorage_float4x4_ColMajorstd140_0,
    @align(16) viewRotation_0 : _MatrixStorage_float4x4_ColMajorstd140_0,
    @align(16) cameraHi_0 : vec3<f32>,
    @align(4) near_0 : f32,
    @align(16) cameraLo_0 : vec3<f32>,
    @align(4) aspect_0 : f32,
    @align(16) planes_0 : array<vec4<f32>, i32(5)>,
    @align(16) sunDirection_0 : vec4<f32>,
    @align(16) viewport_0 : vec4<f32>,
    @align(16) iblFrame_0 : array<vec4<f32>, i32(3)>,
    @align(16) sunIlluminance_0 : f32,
    @align(4) diffuseIbl_0 : f32,
    @align(8) specularIbl_0 : f32,
    @align(4) specularMaxLod_0 : f32,
    @align(16) viewBit_0 : u32,
    @align(4) exposure_0 : f32,
    @align(8) aerialStart_0 : f32,
    @align(4) aerialEnd_0 : f32,
    @align(16) sunLight_0 : vec4<f32>,
    @align(16) bodyRadii_0 : vec4<f32>,
    @align(16) moonLight_0 : vec4<f32>,
    @align(16) time_0 : vec4<f32>,
    @align(16) anchors_0 : _Array_std140_AnchorEye32_0,
};

@binding(0) @group(0) var<uniform> view_0 : View_std140_0;
struct DrawRecord_std430_0
{
    @align(16) center_0 : vec3<f32>,
    @align(4) radius_0 : f32,
    @align(16) color_0 : vec4<f32>,
    @align(16) transform_0 : u32,
    @align(4) flags_0 : u32,
    @align(8) materialIndex_0 : u32,
    @align(4) indexCount_0 : u32,
    @align(16) firstIndex_0 : u32,
    @align(4) featureId_0 : u32,
    @align(8) batch_0 : u32,
    @align(4) positionOffset_0 : u32,
    @align(16) normalOffset_0 : u32,
    @align(4) uvOffset_0 : u32,
    @align(8) colorOffset_0 : u32,
    @align(4) tangentOffset_0 : u32,
    @align(16) textureSet_0 : u32,
    @align(4) imagerySlice_0 : u32,
    @align(8) featureIdOffset_0 : u32,
    @align(4) viewMask_0 : u32,
    @align(16) clipBlock_0 : u32,
    @align(4) placeholderMask_0 : u32,
    @align(8) terrainClip_0 : u32,
    @align(4) instanceFirst_0 : u32,
    @align(16) instanceCount_0 : u32,
    @align(4) instanceStreams_0 : u32,
    @align(8) instanceStride_0 : u32,
    @align(4) lightsSlice_0 : u32,
    @align(16) attributes_0 : u32,
    @align(4) instanceDirectory_0 : u32,
    @align(8) billboardSize_0 : f32,
    @align(4) billboardDepthTest_0 : f32,
};

@binding(1) @group(0) var<storage, read> records_0 : array<DrawRecord_std430_0>;

struct _MatrixStorage_float3x3_ColMajorstd430_0
{
    @align(16) data_2 : array<vec3<f32>, i32(3)>,
};

struct Transform_std430_0
{
    @align(16) originHi_0 : vec3<f32>,
    @align(4) scale_0 : f32,
    @align(16) originLo_0 : vec3<f32>,
    @align(4) flags_1 : u32,
    @align(16) linear_0 : _MatrixStorage_float3x3_ColMajorstd430_0,
};

@binding(2) @group(0) var<storage, read> transforms_0 : array<Transform_std430_0>;

struct Instance_std430_0
{
    @align(16) row0_0 : vec4<f32>,
    @align(16) row1_0 : vec4<f32>,
    @align(16) row2_0 : vec4<f32>,
    @align(16) record_0 : u32,
    @align(4) feature_0 : u32,
    @align(8) flags_2 : u32,
    @align(4) tint_0 : u32,
};

@binding(3) @group(0) var<storage, read> instances_0 : array<Instance_std430_0>;

struct _MatrixStorage_float4x4_ColMajorstd430_0
{
    @align(16) data_3 : array<vec4<f32>, i32(4)>,
};

struct DrawItem_std430_0
{
    @align(16) relModel_0 : _MatrixStorage_float4x4_ColMajorstd430_0,
    @align(16) record_1 : u32,
    @align(4) feature_1 : u32,
    @align(8) instance_0 : u32,
    @align(4) tint_1 : u32,
};

@binding(4) @group(0) var<storage, read> items_0 : array<DrawItem_std430_0>;

struct Material_std430_0
{
    @align(16) baseColor_0 : vec4<f32>,
    @align(16) emissive_0 : vec3<f32>,
    @align(4) metallic_0 : f32,
    @align(16) roughness_0 : f32,
    @align(4) alphaCutoff_0 : f32,
    @align(8) normalScale_0 : f32,
    @align(4) occlusionStrength_0 : f32,
    @align(16) flags_3 : u32,
    @align(4) textures01_0 : u32,
    @align(8) textures23_0 : u32,
    @align(4) textures4_0 : u32,
};

@binding(5) @group(0) var<storage, read> materials_0 : array<Material_std430_0>;

struct LightHeader_std430_0
{
    @align(16) grid_0 : vec4<f32>,
    @align(16) depth_0 : vec4<f32>,
    @align(16) forward_0 : vec4<f32>,
    @align(16) right_0 : vec4<f32>,
    @align(16) up_0 : vec4<f32>,
};

@binding(6) @group(0) var<storage, read> lightHeaders_0 : array<LightHeader_std430_0>;

struct Light_std430_0
{
    @align(16) position_0 : vec4<f32>,
    @align(16) color_1 : vec4<f32>,
    @align(16) direction_0 : vec4<f32>,
    @align(16) cone_0 : vec4<f32>,
};

@binding(7) @group(0) var<storage, read> lights_0 : array<Light_std430_0>;

struct AnchorEye_std430_0
{
    @align(16) eyeHi_0 : vec4<f32>,
    @align(16) eyeLo_0 : vec4<f32>,
    @align(16) axes_0 : array<vec4<f32>, i32(3)>,
};

@binding(8) @group(0) var<storage, read> anchorEyes_0 : array<AnchorEye_std430_0>;

@compute
@workgroup_size(1, 1, 1)
fn layouts()
{
    out_0[i32(0)] = view_0.viewBit_0 + records_0[u32(0)].batch_0 + transforms_0[i32(0)].flags_1 + instances_0[i32(0)].record_0 + items_0[i32(0)].record_1 + materials_0[i32(0)].flags_3 + u32(lightHeaders_0[i32(0)].grid_0.w + lights_0[i32(0)].position_0.w + anchorEyes_0[i32(0)].eyeHi_0.w);
    return;
}

