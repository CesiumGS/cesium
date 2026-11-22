// Generated from src/shaders/stages/glareUpTop.slang by slangc 2026.22
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

@binding(2) @group(1) var pyramid_0 : texture_2d<f32>;


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
    var level_0 : vec3<f32> = (textureSampleLevel((pyramid_0), (stageSampler_0), (input_0.uv_0), (0.0f))).xyz;
    var _S1 : GlareUniforms_std140_0 = uniforms_0;
    var _S2 : f32;
    if(((input_0.mip_0) < u32(4)))
    {
        _S2 = _S1.w0_0[input_0.mip_0];
    }
    else
    {
        if(((input_0.mip_0) < u32(8)))
        {
            _S2 = _S1.w1_0[input_0.mip_0 - u32(4)];
        }
        else
        {
            _S2 = _S1.w2_0;
        }
    }
    return vec4<f32>(vec3<f32>(_S2) * level_0, 1.0f);
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
    return postStage_0(i_0);
}


fn postStage(input: PostInput) -> vec4<f32> {
  return postStageBridge(input.uv, input.pixel, input.size, input.preExposure, input.pixelAngle, input.mip);
}
