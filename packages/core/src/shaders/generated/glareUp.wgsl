// Generated from src/shaders/stages/glareUp.slang by slangc 2026.22
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

@binding(3) @group(1) var veil_0 : texture_2d<f32>;


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
    var _S3 : vec3<f32> = vec3<f32>(_S2) * level_0;
    var w_0 : u32;
    var h_0 : u32;
    {var dim = textureDimensions((veil_0));((w_0)) = dim.x;((h_0)) = dim.y;};
    var size_1 : vec2<f32> = vec2<f32>(f32(w_0), f32(h_0));
    var p_0 : vec2<f32> = input_0.uv_0 * size_1 - vec2<f32>(0.5f);
    var i_0 : vec2<f32> = floor(p_0);
    var f_0 : vec2<f32> = p_0 - i_0;
    var f2_0 : vec2<f32> = f_0 * f_0;
    var f3_0 : vec2<f32> = f2_0 * f_0;
    var _S4 : vec2<f32> = vec2<f32>(1.0f);
    var _S5 : vec2<f32> = vec2<f32>(3.0f);
    var _S6 : vec2<f32> = vec2<f32>(6.0f);
    var w1_1 : vec2<f32> = (vec2<f32>(4.0f) - _S6 * f2_0 + _S5 * f3_0) / _S6;
    var g0_0 : vec2<f32> = (_S4 - _S5 * f_0 + _S5 * f2_0 - f3_0) / _S6 + w1_1;
    var g1_0 : vec2<f32> = _S4 - g0_0;
    var h0_0 : vec2<f32> = (i_0 + vec2<f32>(-0.5f) + w1_1 / g0_0) / size_1;
    var h1_0 : vec2<f32> = (i_0 + vec2<f32>(1.5f) + f3_0 / _S6 / g1_0) / size_1;
    var _S7 : vec3<f32> = vec3<f32>(g0_0.x);
    var _S8 : vec3<f32> = vec3<f32>(g1_0.x);
    return vec4<f32>(_S3 + (vec3<f32>(g0_0.y) * (_S7 * (textureSampleLevel((veil_0), (stageSampler_0), (h0_0), (0.0f))).xyz + _S8 * (textureSampleLevel((veil_0), (stageSampler_0), (vec2<f32>(h1_0.x, h0_0.y)), (0.0f))).xyz) + vec3<f32>(g1_0.y) * (_S7 * (textureSampleLevel((veil_0), (stageSampler_0), (vec2<f32>(h0_0.x, h1_0.y)), (0.0f))).xyz + _S8 * (textureSampleLevel((veil_0), (stageSampler_0), (h1_0), (0.0f))).xyz)), 1.0f);
}

fn postStageBridge( uv_1 : vec2<f32>,  pixel_1 : vec2<i32>,  size_2 : vec2<f32>,  preExposure_1 : f32,  pixelAngle_2 : f32,  mip_1 : u32) -> vec4<f32>
{
    var i_1 : PostInput_0;
    i_1.uv_0 = uv_1;
    i_1.pixel_0 = pixel_1;
    i_1.size_0 = size_2;
    i_1.preExposure_0 = preExposure_1;
    i_1.pixelAngle_1 = pixelAngle_2;
    i_1.mip_0 = mip_1;
    return postStage_0(i_1);
}


fn postStage(input: PostInput) -> vec4<f32> {
  return postStageBridge(input.uv, input.pixel, input.size, input.preExposure, input.pixelAngle, input.mip);
}
