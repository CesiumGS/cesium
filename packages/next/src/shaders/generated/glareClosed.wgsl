// Generated from src/shaders/stages/glareClosed.slang by slangc 2026.22
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
struct GlareSource_std430_0
{
    @align(16) pixel_0 : vec2<f32>,
    @align(8) radius_0 : f32,
    @align(4) visibility_0 : f32,
    @align(16) light_0 : vec3<f32>,
    @align(4) kind_0 : f32,
};

@binding(2) @group(1) var<storage, read> glareRecords_0 : array<GlareSource_std430_0>;


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
    var _S1 : vec4<f32> = (postColorAt((input_0.pixel_1)));
    var finite_0 : vec4<f32> = (postFinite((_S1)));
    var _S2 : vec3<f32> = vec3<f32>(0.0f);
    var _S3 : vec3<f32> = vec3<f32>(10000.0f);
    var _S4 : vec4<f32> = vec4<f32>(clamp(finite_0.xyz, _S2, _S3), finite_0.w);
    var _S5 : vec3<f32> = _S4.xyz;
    var _S6 : GlareUniforms_std140_0 = uniforms_0;
    var _S7 : GlareSource_std430_0 = glareRecords_0[i32(1)];
    var _S8 : GlareSource_std430_0 = glareRecords_0[i32(0)];
    var veil_0 : vec3<f32>;
    if(((_S7.visibility_0) > 0.0f))
    {
        var pixel_2 : vec2<f32> = input_0.uv_0 * _S6.viewSize_0;
        var offset_0 : vec2<f32> = pixel_2 - _S7.pixel_0;
        var t_0 : vec2<f32> = (pixel_2 - _S6.viewSize_0 * vec2<f32>(0.5f)) * vec2<f32>(_S6.pixelAngle_0);
        var z_0 : f32 = 1.0f / sqrt(1.0f + dot(t_0, t_0));
        var solid_0 : f32 = _S6.pixelAngle_0 * _S6.pixelAngle_0 * z_0 * z_0 * z_0;
        if((solid_0 > 0.0f))
        {
            var _S9 : f32 = _S6.basePixels_0;
            var variance_0 : f32 = _S9 * _S9;
            var _S10 : f32 = - dot(offset_0, offset_0);
            var reach_0 : f32 = _S6.basePixels_0 * 2.0f;
            var variance_1 : f32 = reach_0 * reach_0;
            var reach_1 : f32 = _S6.basePixels_0 * 4.0f;
            var variance_2 : f32 = reach_1 * reach_1;
            var reach_2 : f32 = _S6.basePixels_0 * 8.0f;
            var variance_3 : f32 = reach_2 * reach_2;
            var reach_3 : f32 = _S6.basePixels_0 * 16.0f;
            var variance_4 : f32 = reach_3 * reach_3;
            var reach_4 : f32 = _S6.basePixels_0 * 32.0f;
            var variance_5 : f32 = reach_4 * reach_4;
            var reach_5 : f32 = _S6.basePixels_0 * 64.0f;
            var variance_6 : f32 = reach_5 * reach_5;
            var reach_6 : f32 = _S6.basePixels_0 * 128.0f;
            var variance_7 : f32 = reach_6 * reach_6;
            var reach_7 : f32 = _S6.basePixels_0 * 256.0f;
            var variance_8 : f32 = reach_7 * reach_7;
            veil_0 = _S7.light_0 * vec3<f32>(_S7.visibility_0) * vec3<f32>(_S6.share_0) * vec3<f32>((_S6.w0_0[u32(0)] * exp(_S10 / (2.0f * variance_0)) / (6.2831854820251465f * variance_0) + _S6.w0_0[u32(1)] * exp(_S10 / (2.0f * variance_1)) / (6.2831854820251465f * variance_1) + _S6.w0_0[u32(2)] * exp(_S10 / (2.0f * variance_2)) / (6.2831854820251465f * variance_2) + _S6.w0_0[u32(3)] * exp(_S10 / (2.0f * variance_3)) / (6.2831854820251465f * variance_3) + _S6.w1_0[u32(0)] * exp(_S10 / (2.0f * variance_4)) / (6.2831854820251465f * variance_4) + _S6.w1_0[u32(1)] * exp(_S10 / (2.0f * variance_5)) / (6.2831854820251465f * variance_5) + _S6.w1_0[u32(2)] * exp(_S10 / (2.0f * variance_6)) / (6.2831854820251465f * variance_6) + _S6.w1_0[u32(3)] * exp(_S10 / (2.0f * variance_7)) / (6.2831854820251465f * variance_7) + _S6.w2_0 * exp(_S10 / (2.0f * variance_8)) / (6.2831854820251465f * variance_8))) / vec3<f32>(solid_0) * vec3<f32>(smoothstep(0.05000000074505806f, 0.15000000596046448f, _S8.pixel_0.y)) * vec3<f32>(input_0.preExposure_0);
        }
        else
        {
            veil_0 = _S2;
        }
    }
    else
    {
        veil_0 = _S2;
    }
    return vec4<f32>(min(_S5 + veil_0, _S3), _S4.w);
}

fn postStageBridge( uv_1 : vec2<f32>,  pixel_3 : vec2<i32>,  size_1 : vec2<f32>,  preExposure_1 : f32,  pixelAngle_2 : f32,  mip_1 : u32) -> vec4<f32>
{
    var i_0 : PostInput_0;
    i_0.uv_0 = uv_1;
    i_0.pixel_1 = pixel_3;
    i_0.size_0 = size_1;
    i_0.preExposure_0 = preExposure_1;
    i_0.pixelAngle_1 = pixelAngle_2;
    i_0.mip_0 = mip_1;
    var _S11 : vec4<f32> = postStage_0(i_0);
    return _S11;
}


fn postStage(input: PostInput) -> vec4<f32> {
  return postStageBridge(input.uv, input.pixel, input.size, input.preExposure, input.pixelAngle, input.mip);
}
