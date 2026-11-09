// Generated from src/shaders/postStage.slang by slangc 2026.21
// (scripts/slangBuild.mjs). Do not edit: change the .slang and regenerate.
struct PostParams_std140_0
{
    @align(16) size_0 : vec2<f32>,
    @align(8) preExposure_0 : f32,
    @align(4) pixelAngle_0 : f32,
};

@binding(2) @group(0) var<uniform> postParams_0 : PostParams_std140_0;
@binding(0) @group(0) var postImage_0 : texture_2d<f32>;

@binding(1) @group(0) var postSampler_0 : sampler;

@binding(3) @group(0) var postDepth_0 : texture_depth_multisampled_2d;

@binding(4) @group(0) var postIds_0 : texture_multisampled_2d<u32>;

struct vertexOutput_0
{
    @builtin(position) output_0 : vec4<f32>,
};

@vertex
fn postStageVertex(@builtin(vertex_index) i_0 : u32) -> vertexOutput_0
{
    var _S1 : vertexOutput_0 = vertexOutput_0( vec4<f32>(vec2<f32>(f32((((i_0 << (u32(1)))) & (u32(2)))), f32((i_0 & (u32(2))))) * vec2<f32>(2.0f) - vec2<f32>(1.0f), 0.0f, 1.0f) );
    return _S1;
}

struct PostInput
{
     uv : vec2<f32>,
     pixel : vec2<i32>,
     size : vec2<f32>,
     preExposure : f32,
     pixelAngle : f32,
};

fn postInputAt( pixel_0 : vec2<i32>) -> PostInput
{
    var input_0 : PostInput;
    input_0.pixel = pixel_0;
    input_0.size = postParams_0.size_0;
    input_0.uv = (vec2<f32>(pixel_0) + vec2<f32>(0.5f)) / postParams_0.size_0;
    input_0.preExposure = postParams_0.preExposure_0;
    input_0.pixelAngle = postParams_0.pixelAngle_0;
    return input_0;
}

fn finite_0( value_0 : f32) -> f32
{
    var _S2 : f32;
    if((((bitcast<u32>((value_0))) & (u32(2139095040)))) == u32(2139095040))
    {
        _S2 = 0.0f;
    }
    else
    {
        _S2 = clamp(value_0, -65504.0f, 65504.0f);
    }
    return _S2;
}

fn postFinite( color_0 : vec4<f32>) -> vec4<f32>
{
    return vec4<f32>(finite_0(color_0.x), finite_0(color_0.y), finite_0(color_0.z), finite_0(color_0.w));
}

struct pixelOutput_0
{
    @location(0) output_1 : vec4<f32>,
};

@fragment
fn postStageFragment(@builtin(position) frag_0 : vec4<f32>) -> pixelOutput_0
{
    var _S3 : vec4<f32> = (postStage((postInputAt(vec2<i32>(frag_0.xy)))));
    var _S4 : pixelOutput_0 = pixelOutput_0( postFinite(_S3) );
    return _S4;
}

fn postColor( uv_0 : vec2<f32>) -> vec4<f32>
{
    return (textureSampleLevel((postImage_0), (postSampler_0), (uv_0), (0.0f)));
}

fn postColorAt( pixel_1 : vec2<i32>) -> vec4<f32>
{
    var _S5 : vec3<i32> = vec3<i32>(pixel_1, i32(0));
    return (textureLoad((postImage_0), ((_S5)).xy, ((_S5)).z));
}

fn postDepthAt( pixel_2 : vec2<i32>) -> f32
{
    return (textureLoad((postDepth_0), (pixel_2), (i32(0))));
}

fn postIdAt( pixel_3 : vec2<i32>) -> u32
{
    var id_0 : vec2<u32> = (textureLoad((postIds_0), (pixel_3), (i32(0)))).xy;
    return ((id_0.x) | ((((id_0.y) << (u32(16))))));
}

