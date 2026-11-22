// Generated from src/shaders/stages/glareDown.slang by slangc 2026.22
// (scripts/slangBuild.mjs). Do not edit: change the .slang and regenerate.
@binding(1) @group(1) var stageSampler_0 : sampler;

@binding(2) @group(1) var pyramid_0 : texture_2d<f32>;


struct PostInput_0
{
     uv_0 : vec2<f32>,
     pixel_0 : vec2<i32>,
     size_0 : vec2<f32>,
     preExposure_0 : f32,
     pixelAngle_0 : f32,
     mip_0 : u32,
};

fn postStage_0( input_0 : PostInput_0) -> vec4<f32>
{
    var w_0 : u32;
    var h_0 : u32;
    {var dim = textureDimensions((pyramid_0));((w_0)) = dim.x;((h_0)) = dim.y;};
    var o_0 : vec2<f32> = vec2<f32>(1.208299994468689f) / vec2<f32>(f32(w_0), f32(h_0));
    var _S1 : f32 = o_0.x;
    var _S2 : f32 = - _S1;
    var _S3 : f32 = o_0.y;
    var _S4 : f32 = - _S3;
    return vec4<f32>(0.25f) * ((textureSampleLevel((pyramid_0), (stageSampler_0), (input_0.uv_0 + vec2<f32>(_S2, _S4)), (0.0f))) + (textureSampleLevel((pyramid_0), (stageSampler_0), (input_0.uv_0 + vec2<f32>(_S1, _S4)), (0.0f))) + (textureSampleLevel((pyramid_0), (stageSampler_0), (input_0.uv_0 + vec2<f32>(_S2, _S3)), (0.0f))) + (textureSampleLevel((pyramid_0), (stageSampler_0), (input_0.uv_0 + vec2<f32>(_S1, _S3)), (0.0f))));
}

fn postStageBridge( uv_1 : vec2<f32>,  pixel_1 : vec2<i32>,  size_1 : vec2<f32>,  preExposure_1 : f32,  pixelAngle_1 : f32,  mip_1 : u32) -> vec4<f32>
{
    var i_0 : PostInput_0;
    i_0.uv_0 = uv_1;
    i_0.pixel_0 = pixel_1;
    i_0.size_0 = size_1;
    i_0.preExposure_0 = preExposure_1;
    i_0.pixelAngle_0 = pixelAngle_1;
    i_0.mip_0 = mip_1;
    return postStage_0(i_0);
}


fn postStage(input: PostInput) -> vec4<f32> {
  return postStageBridge(input.uv, input.pixel, input.size, input.preExposure, input.pixelAngle, input.mip);
}
