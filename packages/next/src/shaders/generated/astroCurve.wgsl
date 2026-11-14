// Generated from src/shaders/stages/astroCurve.slang by slangc 2026.21
// (scripts/slangBuild.mjs). Do not edit: change the .slang and regenerate.
struct Uniforms_std140_0
{
    @align(16) strength_0 : f32,
};

@binding(0) @group(1) var<uniform> uniforms_0 : Uniforms_std140_0;

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
    var c_0 : vec4<f32> = (postColorAt((input_0.pixel_0)));
    var _S1 : vec3<f32> = c_0.xyz;
    var y_0 : f32 = dot(_S1, vec3<f32>(0.2125999927520752f, 0.71520000696182251f, 0.072200000286102295f));
    var _S2 : f32 = max(8.0f * uniforms_0.strength_0, 0.0010000000474974513f);
    var curved_0 : f32 = asinh(_S2 * max(y_0 - 0.0040000001899898052f * uniforms_0.strength_0, 0.0f)) / asinh(_S2);
    return vec4<f32>(max(mix(vec3<f32>(curved_0), _S1 * vec3<f32>((curved_0 / max(y_0, 9.99999997475242708e-07f))), vec3<f32>((1.0f + 0.40000000596046448f * uniforms_0.strength_0))), vec3<f32>(0.0f)), c_0.w);
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
    var _S3 : vec4<f32> = postStage_0(i_0);
    return _S3;
}


fn postStage(input: PostInput) -> vec4<f32> {
  return postStageBridge(input.uv, input.pixel, input.size, input.preExposure, input.pixelAngle, input.mip);
}
