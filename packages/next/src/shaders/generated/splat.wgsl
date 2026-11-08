// Generated from src/shaders/splat.slang by slangc 2026.21
// (scripts/slangBuild.mjs). Do not edit: change the .slang and regenerate.
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
@binding(0) @group(1) var<storage, read> splatDepth_0 : array<u32>;

@binding(1) @group(1) var<storage, read> splatColor_0 : array<u32>;

@binding(2) @group(1) var<storage, read> splatFeature_0 : array<u32>;

struct vertexOutput_0
{
    @builtin(position) output_0 : vec4<f32>,
};

@vertex
fn vs(@builtin(vertex_index) v_0 : u32) -> vertexOutput_0
{
    var _S1 : vertexOutput_0 = vertexOutput_0( vec4<f32>(vec2<f32>(f32((((v_0 << (u32(1)))) & (u32(2)))), f32((v_0 & (u32(2))))) * vec2<f32>(2.0f) - vec2<f32>(1.0f), 0.0f, 1.0f) );
    return _S1;
}

struct SplatOut_0
{
    @location(0) color_0 : vec4<f32>,
    @interpolate(flat) @location(1) featureId_0 : vec2<u32>,
    @location(2) display_0 : vec4<f32>,
    @builtin(frag_depth) depth_0 : f32,
};

@fragment
fn fs(@builtin(position) frag_0 : vec4<f32>) -> SplatOut_0
{
    var _S2 : vec2<u32> = vec2<u32>(frag_0.xy);
    var at_0 : u32 = _S2.y * u32(view_0.viewport_0.x) + _S2.x;
    var bits_0 : u32 = splatDepth_0[at_0];
    if(bits_0 == u32(0))
    {
        discard;
    }
    var srgb_0 : vec4<f32> = unpack4x8unorm(splatColor_0[at_0]);
    var feature_0 : u32 = splatFeature_0[at_0];
    var out_0 : SplatOut_0;
    out_0.color_0 = vec4<f32>(0.0f);
    var _S3 : f32 = srgb_0.w;
    out_0.display_0 = vec4<f32>(pow(srgb_0.xyz, vec3<f32>(2.2000000476837158f)) * vec3<f32>(_S3), _S3);
    out_0.featureId_0 = vec2<u32>((feature_0 & (u32(65535))), (feature_0 >> (u32(16))));
    out_0.depth_0 = (bitcast<f32>((bits_0)));
    return out_0;
}

