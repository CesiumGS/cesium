// Generated from src/shaders/stages/glareInput.slang by slangc 2026.21
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
    var _S1 : GlareUniforms_std140_0 = uniforms_0;
    var _S2 : GlareSource_std430_0 = glareRecords_0[i32(1)];
    var _S3 : GlareSource_std430_0 = glareRecords_0[i32(0)];
    var inside_0 : bool;
    if(((_S2.kind_0) >= 0.5f))
    {
        inside_0 = ((_S3.pixel_0.y) > 0.0f);
    }
    else
    {
        inside_0 = false;
    }
    if(inside_0)
    {
        var _S4 : vec2<f32> = vec2<f32>(_S1.pixelAngle_0);
        var t_0 : vec2<f32> = (input_0.uv_0 - vec2<f32>(0.5f)) * _S1.viewSize_0 * _S4;
        var s_0 : vec2<f32> = (_S2.pixel_0 - _S1.viewSize_0 * vec2<f32>(0.5f)) * _S4;
        var d_0 : vec2<f32> = t_0 - s_0;
        var across_0 : f32 = t_0.x * s_0.y - t_0.y * s_0.x;
        inside_0 = ((sqrt(dot(d_0, d_0) + across_0 * across_0) / sqrt((1.0f + dot(t_0, t_0)) * (1.0f + dot(s_0, s_0)))) < (_S3.radius_0 + 1.5f * _S1.pixelAngle_0));
    }
    else
    {
        inside_0 = false;
    }
    if(inside_0)
    {
        return vec4<f32>(0.0f, 0.0f, 0.0f, 1.0f);
    }
    var o_0 : vec2<f32> = vec2<f32>(0.25f) / input_0.size_0;
    var _S5 : f32 = o_0.x;
    var _S6 : f32 = - _S5;
    var _S7 : f32 = o_0.y;
    var _S8 : f32 = - _S7;
    var _S9 : vec4<f32> = (postColor((input_0.uv_0 + vec2<f32>(_S6, _S8))));
    var finite_0 : vec4<f32> = (postFinite((_S9)));
    var _S10 : vec3<f32> = vec3<f32>(0.0f);
    var _S11 : vec3<f32> = vec3<f32>(10000.0f);
    var _S12 : vec4<f32> = vec4<f32>(clamp(finite_0.xyz, _S10, _S11), finite_0.w);
    var _S13 : vec4<f32> = (postColor((input_0.uv_0 + vec2<f32>(_S5, _S8))));
    var finite_1 : vec4<f32> = (postFinite((_S13)));
    var _S14 : vec4<f32> = _S12 + vec4<f32>(clamp(finite_1.xyz, _S10, _S11), finite_1.w);
    var _S15 : vec4<f32> = (postColor((input_0.uv_0 + vec2<f32>(_S6, _S7))));
    var finite_2 : vec4<f32> = (postFinite((_S15)));
    var _S16 : vec4<f32> = _S14 + vec4<f32>(clamp(finite_2.xyz, _S10, _S11), finite_2.w);
    var _S17 : vec4<f32> = (postColor((input_0.uv_0 + vec2<f32>(_S5, _S7))));
    var finite_3 : vec4<f32> = (postFinite((_S17)));
    return vec4<f32>((vec4<f32>(0.25f) * (_S16 + vec4<f32>(clamp(finite_3.xyz, _S10, _S11), finite_3.w))).xyz, 1.0f);
}

fn postStageBridge( uv_1 : vec2<f32>,  pixel_2 : vec2<i32>,  size_1 : vec2<f32>,  preExposure_1 : f32,  pixelAngle_2 : f32,  mip_1 : u32) -> vec4<f32>
{
    var i_0 : PostInput_0;
    i_0.uv_0 = uv_1;
    i_0.pixel_1 = pixel_2;
    i_0.size_0 = size_1;
    i_0.preExposure_0 = preExposure_1;
    i_0.pixelAngle_1 = pixelAngle_2;
    i_0.mip_0 = mip_1;
    var _S18 : vec4<f32> = postStage_0(i_0);
    return _S18;
}


fn postStage(input: PostInput) -> vec4<f32> {
  return postStageBridge(input.uv, input.pixel, input.size, input.preExposure, input.pixelAngle, input.mip);
}
