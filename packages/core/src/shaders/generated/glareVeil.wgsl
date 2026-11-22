// Generated from src/shaders/stages/glareVeil.slang by slangc 2026.22
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

struct GlareSource_std430_0
{
    @align(16) pixel_0 : vec2<f32>,
    @align(8) radius_0 : f32,
    @align(4) visibility_0 : f32,
    @align(16) light_0 : vec3<f32>,
    @align(4) kind_0 : f32,
};

@binding(4) @group(1) var<storage, read> glareRecords_0 : array<GlareSource_std430_0>;


struct PostInput_0
{
     uv_0 : vec2<f32>,
     pixel_1 : vec2<i32>,
     size_0 : vec2<f32>,
     preExposure_0 : f32,
     pixelAngle_1 : f32,
     mip_0 : u32,
};

fn postStage_0( input_0 : PostInput_0) -> vec4<f32>
{
    var _S1 : GlareUniforms_std140_0 = uniforms_0;
    var _S2 : vec3<f32> = vec3<f32>(uniforms_0.w0_0[u32(0)]) * (textureSampleLevel((pyramid_0), (stageSampler_0), (input_0.uv_0), (0.0f))).xyz;
    var w_0 : u32;
    var h_0 : u32;
    {var dim = textureDimensions((veil_0));((w_0)) = dim.x;((h_0)) = dim.y;};
    var size_1 : vec2<f32> = vec2<f32>(f32(w_0), f32(h_0));
    var p_0 : vec2<f32> = input_0.uv_0 * size_1 - vec2<f32>(0.5f);
    var i_0 : vec2<f32> = floor(p_0);
    var f_0 : vec2<f32> = p_0 - i_0;
    var f2_0 : vec2<f32> = f_0 * f_0;
    var f3_0 : vec2<f32> = f2_0 * f_0;
    var _S3 : vec2<f32> = vec2<f32>(1.0f);
    var _S4 : vec2<f32> = vec2<f32>(3.0f);
    var _S5 : vec2<f32> = vec2<f32>(6.0f);
    var w1_1 : vec2<f32> = (vec2<f32>(4.0f) - _S5 * f2_0 + _S4 * f3_0) / _S5;
    var g0_0 : vec2<f32> = (_S3 - _S4 * f_0 + _S4 * f2_0 - f3_0) / _S5 + w1_1;
    var g1_0 : vec2<f32> = _S3 - g0_0;
    var h0_0 : vec2<f32> = (i_0 + vec2<f32>(-0.5f) + w1_1 / g0_0) / size_1;
    var h1_0 : vec2<f32> = (i_0 + vec2<f32>(1.5f) + f3_0 / _S5 / g1_0) / size_1;
    var _S6 : vec3<f32> = vec3<f32>(g0_0.x);
    var _S7 : vec3<f32> = vec3<f32>(g1_0.x);
    var _S8 : vec3<f32> = vec3<f32>(uniforms_0.share_0) * (_S2 + (vec3<f32>(g0_0.y) * (_S6 * (textureSampleLevel((veil_0), (stageSampler_0), (h0_0), (0.0f))).xyz + _S7 * (textureSampleLevel((veil_0), (stageSampler_0), (vec2<f32>(h1_0.x, h0_0.y)), (0.0f))).xyz) + vec3<f32>(g1_0.y) * (_S6 * (textureSampleLevel((veil_0), (stageSampler_0), (vec2<f32>(h0_0.x, h1_0.y)), (0.0f))).xyz + _S7 * (textureSampleLevel((veil_0), (stageSampler_0), (h1_0), (0.0f))).xyz)));
    var _S9 : GlareSource_std430_0 = glareRecords_0[i32(1)];
    var _S10 : GlareSource_std430_0 = glareRecords_0[i32(0)];
    var _S11 : vec3<f32> = vec3<f32>(0.0f);
    var veil_1 : vec3<f32>;
    if(((_S9.visibility_0) > 0.0f))
    {
        var pixel_2 : vec2<f32> = input_0.uv_0 * _S1.viewSize_0;
        var offset_0 : vec2<f32> = pixel_2 - _S9.pixel_0;
        var t_0 : vec2<f32> = (pixel_2 - _S1.viewSize_0 * vec2<f32>(0.5f)) * vec2<f32>(_S1.pixelAngle_0);
        var z_0 : f32 = 1.0f / sqrt(1.0f + dot(t_0, t_0));
        var solid_0 : f32 = _S1.pixelAngle_0 * _S1.pixelAngle_0 * z_0 * z_0 * z_0;
        if((solid_0 > 0.0f))
        {
            var _S12 : f32 = _S1.basePixels_0;
            var variance_0 : f32 = _S12 * _S12;
            var _S13 : f32 = - dot(offset_0, offset_0);
            var reach_0 : f32 = _S1.basePixels_0 * 2.0f;
            var variance_1 : f32 = reach_0 * reach_0;
            var reach_1 : f32 = _S1.basePixels_0 * 4.0f;
            var variance_2 : f32 = reach_1 * reach_1;
            var reach_2 : f32 = _S1.basePixels_0 * 8.0f;
            var variance_3 : f32 = reach_2 * reach_2;
            var reach_3 : f32 = _S1.basePixels_0 * 16.0f;
            var variance_4 : f32 = reach_3 * reach_3;
            var reach_4 : f32 = _S1.basePixels_0 * 32.0f;
            var variance_5 : f32 = reach_4 * reach_4;
            var reach_5 : f32 = _S1.basePixels_0 * 64.0f;
            var variance_6 : f32 = reach_5 * reach_5;
            var reach_6 : f32 = _S1.basePixels_0 * 128.0f;
            var variance_7 : f32 = reach_6 * reach_6;
            var reach_7 : f32 = _S1.basePixels_0 * 256.0f;
            var variance_8 : f32 = reach_7 * reach_7;
            veil_1 = _S9.light_0 * vec3<f32>(_S9.visibility_0) * vec3<f32>(_S1.share_0) * vec3<f32>((_S1.w0_0[u32(0)] * exp(_S13 / (2.0f * variance_0)) / (6.2831854820251465f * variance_0) + _S1.w0_0[u32(1)] * exp(_S13 / (2.0f * variance_1)) / (6.2831854820251465f * variance_1) + _S1.w0_0[u32(2)] * exp(_S13 / (2.0f * variance_2)) / (6.2831854820251465f * variance_2) + _S1.w0_0[u32(3)] * exp(_S13 / (2.0f * variance_3)) / (6.2831854820251465f * variance_3) + _S1.w1_0[u32(0)] * exp(_S13 / (2.0f * variance_4)) / (6.2831854820251465f * variance_4) + _S1.w1_0[u32(1)] * exp(_S13 / (2.0f * variance_5)) / (6.2831854820251465f * variance_5) + _S1.w1_0[u32(2)] * exp(_S13 / (2.0f * variance_6)) / (6.2831854820251465f * variance_6) + _S1.w1_0[u32(3)] * exp(_S13 / (2.0f * variance_7)) / (6.2831854820251465f * variance_7) + _S1.w2_0 * exp(_S13 / (2.0f * variance_8)) / (6.2831854820251465f * variance_8))) / vec3<f32>(solid_0) * vec3<f32>(smoothstep(0.05000000074505806f, 0.15000000596046448f, _S10.pixel_0.y)) * vec3<f32>(input_0.preExposure_0);
        }
        else
        {
            veil_1 = _S11;
        }
    }
    else
    {
        veil_1 = _S11;
    }
    return vec4<f32>(min(_S8 + veil_1, vec3<f32>(10000.0f)), 1.0f);
}

fn postStageBridge( uv_1 : vec2<f32>,  pixel_3 : vec2<i32>,  size_2 : vec2<f32>,  preExposure_1 : f32,  pixelAngle_2 : f32,  mip_1 : u32) -> vec4<f32>
{
    var i_1 : PostInput_0;
    i_1.uv_0 = uv_1;
    i_1.pixel_1 = pixel_3;
    i_1.size_0 = size_2;
    i_1.preExposure_0 = preExposure_1;
    i_1.pixelAngle_1 = pixelAngle_2;
    i_1.mip_0 = mip_1;
    return postStage_0(i_1);
}


fn postStage(input: PostInput) -> vec4<f32> {
  return postStageBridge(input.uv, input.pixel, input.size, input.preExposure, input.pixelAngle, input.mip);
}
