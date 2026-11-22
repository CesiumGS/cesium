// Generated from src/shaders/stages/glareComposite.slang by slangc 2026.22
// (scripts/slangBuild.mjs). Do not edit: change the .slang and regenerate.
struct GlareUniforms_std140_0
{
    @align(16) viewSize_0 : vec2<f32>,
    @align(8) pixelAngle_0 : f32,
    @align(4) share_0 : f32,
    @align(16) imageShare_0 : f32,
    @align(16) w0_0 : vec4<f32>,
    @align(16) w1_0 : vec4<f32>,
    @align(16) w2_0 : f32,
    @align(4) basePixels_0 : f32,
};

@binding(0) @group(1) var<uniform> uniforms_0 : GlareUniforms_std140_0;
@binding(1) @group(1) var stageSampler_0 : sampler;

@binding(2) @group(1) var veil_0 : texture_2d<f32>;


struct PostInput_0
{
     uv_0 : vec2<f32>,
     pixel_0 : vec2<i32>,
     size_0 : vec2<f32>,
     preExposure_0 : f32,
     pixelAngle_1 : f32,
     mip_0 : u32,
};

fn postStage_0( input_0 : PostInput_0) -> vec4<f32>
{
    var _S1 : vec4<f32> = (postColorAt((input_0.pixel_0)));
    var finite_0 : vec4<f32> = (postFinite((_S1)));
    var _S2 : vec3<f32> = vec3<f32>(10000.0f);
    var _S3 : vec4<f32> = vec4<f32>(clamp(finite_0.xyz, vec3<f32>(0.0f), _S2), finite_0.w);
    return vec4<f32>(min(_S3.xyz * vec3<f32>((1.0f - uniforms_0.imageShare_0)) + (textureSampleLevel((veil_0), (stageSampler_0), (input_0.uv_0), (0.0f))).xyz, _S2), _S3.w);
}

fn postStageBridge( uv_1 : vec2<f32>,  pixel_1 : vec2<i32>,  size_1 : vec2<f32>,  preExposure_1 : f32,  pixelAngle_2 : f32,  mip_1 : u32) -> vec4<f32>
{
    var i_0 : PostInput_0;
    i_0.uv_0 = uv_1;
    i_0.pixel_0 = pixel_1;
    i_0.size_0 = size_1;
    i_0.preExposure_0 = preExposure_1;
    i_0.pixelAngle_1 = pixelAngle_2;
    i_0.mip_0 = mip_1;
    var _S4 : vec4<f32> = postStage_0(i_0);
    return _S4;
}


fn postStage(input: PostInput) -> vec4<f32> {
  return postStageBridge(input.uv, input.pixel, input.size, input.preExposure, input.pixelAngle, input.mip);
}
