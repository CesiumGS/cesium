// Generated from src/shaders/fxaa.slang by slangc 2026.21
// (scripts/slangBuild.mjs). Do not edit: change the .slang and regenerate.
struct FxaaParams_std140_0
{
    @align(16) origin_0 : vec2<f32>,
    @align(8) rcp_0 : vec2<f32>,
    @align(16) decode_0 : u32,
    @align(4) pad0_0 : u32,
    @align(8) pad1_0 : u32,
    @align(4) pad2_0 : u32,
};

@binding(2) @group(0) var<uniform> params_0 : FxaaParams_std140_0;
@binding(0) @group(0) var image_0 : texture_2d<f32>;

@binding(1) @group(0) var imageSampler_0 : sampler;

const STEPS_0 : array<f32, i32(10)> = array<f32, i32(10)>( 1.0f, 1.5f, 2.0f, 2.0f, 2.0f, 2.0f, 2.0f, 2.0f, 4.0f, 8.0f );
struct vertexOutput_0
{
    @builtin(position) output_0 : vec4<f32>,
};

@vertex
fn vs(@builtin(vertex_index) i_0 : u32) -> vertexOutput_0
{
    var _S1 : vertexOutput_0 = vertexOutput_0( vec4<f32>(vec2<f32>(f32((((i_0 << (u32(1)))) & (u32(2)))), f32((i_0 & (u32(2))))) * vec2<f32>(2.0f) - vec2<f32>(1.0f), 0.0f, 1.0f) );
    return _S1;
}

fn rgbAt_0( p_0 : vec2<f32>) -> vec3<f32>
{
    return (textureSampleLevel((image_0), (imageSampler_0), (p_0), (0.0f))).xyz;
}

fn lumaOf_0( c_0 : vec3<f32>) -> f32
{
    return dot(c_0, vec3<f32>(0.29899999499320984f, 0.58700001239776611f, 0.11400000005960464f));
}

fn lumaAt_0( p_1 : vec2<f32>) -> f32
{
    return lumaOf_0(rgbAt_0(p_1));
}

fn antialiased_0( center_0 : vec2<f32>) -> vec3<f32>
{
    var goodSpan_0 : bool;
    var posM_0 : vec2<f32> = center_0;
    var rgbM_0 : vec3<f32> = rgbAt_0(center_0);
    var lumaM_0 : f32 = lumaOf_0(rgbM_0);
    var _S2 : f32 = params_0.rcp_0.y;
    var _S3 : vec2<f32> = vec2<f32>(0.0f, _S2);
    var lumaS_0 : f32 = lumaAt_0(center_0 + _S3);
    var _S4 : f32 = params_0.rcp_0.x;
    var _S5 : vec2<f32> = vec2<f32>(_S4, 0.0f);
    var lumaE_0 : f32 = lumaAt_0(center_0 + _S5);
    var lumaN_0 : f32 = lumaAt_0(center_0 - _S3);
    var lumaW_0 : f32 = lumaAt_0(center_0 - _S5);
    var _S6 : f32 = max(max(max(lumaS_0, lumaE_0), max(lumaN_0, lumaW_0)), lumaM_0);
    var range_0 : f32 = _S6 - min(min(min(lumaS_0, lumaE_0), min(lumaN_0, lumaW_0)), lumaM_0);
    if((range_0 < (max(0.083300001919269562f, _S6 * 0.16599999368190765f))))
    {
        return rgbM_0;
    }
    var _S7 : f32 = - _S4;
    var _S8 : f32 = - _S2;
    var lumaNW_0 : f32 = lumaAt_0(posM_0 + vec2<f32>(_S7, _S8));
    var lumaSE_0 : f32 = lumaAt_0(posM_0 + vec2<f32>(_S4, _S2));
    var lumaNE_0 : f32 = lumaAt_0(posM_0 + vec2<f32>(_S4, _S8));
    var lumaSW_0 : f32 = lumaAt_0(posM_0 + vec2<f32>(_S7, _S2));
    var lumaNS_0 : f32 = lumaN_0 + lumaS_0;
    var lumaWE_0 : f32 = lumaW_0 + lumaE_0;
    var _S9 : f32 = -2.0f * lumaM_0;
    var lumaNESE_0 : f32 = lumaNE_0 + lumaSE_0;
    var lumaNWSW_0 : f32 = lumaNW_0 + lumaSW_0;
    var horzSpan_0 : bool = ((abs(-2.0f * lumaW_0 + lumaNWSW_0) + abs(_S9 + lumaNS_0) * 2.0f + abs(-2.0f * lumaE_0 + lumaNESE_0)) >= (abs(-2.0f * lumaS_0 + (lumaSW_0 + lumaSE_0)) + abs(_S9 + lumaWE_0) * 2.0f + abs(-2.0f * lumaN_0 + (lumaNW_0 + lumaNE_0))));
    var subpixA_0 : f32 = (lumaNS_0 + lumaWE_0) * 2.0f + lumaNWSW_0 + lumaNESE_0;
    var _S10 : bool = !horzSpan_0;
    var lumaN_1 : f32;
    var lumaS_1 : f32;
    var lengthSign_0 : f32;
    if(_S10)
    {
        lumaN_1 = lumaW_0;
        lumaS_1 = lumaE_0;
        lengthSign_0 = _S4;
    }
    else
    {
        lumaN_1 = lumaN_0;
        lumaS_1 = lumaS_0;
        lengthSign_0 = _S2;
    }
    var subpixB_0 : f32 = subpixA_0 / 12.0f - lumaM_0;
    var _S11 : f32 = lumaN_1 + lumaM_0;
    var lumaSS_0 : f32 = lumaS_1 + lumaM_0;
    var _S12 : f32 = abs(lumaN_1 - lumaM_0);
    var _S13 : f32 = abs(lumaS_1 - lumaM_0);
    var pairN_0 : bool = (_S12 >= _S13);
    var _S14 : f32 = max(_S12, _S13);
    if(pairN_0)
    {
        lengthSign_0 = - lengthSign_0;
    }
    var subpixC_0 : f32 = clamp(abs(subpixB_0) / range_0, 0.0f, 1.0f);
    var posB_0 : vec2<f32> = posM_0;
    var offNP_0 : vec2<f32>;
    if(horzSpan_0)
    {
        posB_0[i32(1)] = posB_0[i32(1)] + lengthSign_0 * 0.5f;
        offNP_0 = _S5;
    }
    else
    {
        posB_0[i32(0)] = posB_0[i32(0)] + lengthSign_0 * 0.5f;
        offNP_0 = _S3;
    }
    var posN_0 : vec2<f32> = posB_0 - offNP_0;
    var posP_0 : vec2<f32> = posB_0 + offNP_0;
    var subpixD_0 : f32 = -2.0f * subpixC_0 + 3.0f;
    var subpixE_0 : f32 = subpixC_0 * subpixC_0;
    var lumaNN_0 : f32;
    if(!pairN_0)
    {
        lumaNN_0 = lumaSS_0;
    }
    else
    {
        lumaNN_0 = _S11;
    }
    var gradientScaled_0 : f32 = _S14 * 0.25f;
    var _S15 : f32 = lumaNN_0 * 0.5f;
    var subpixF_0 : f32 = subpixD_0 * subpixE_0;
    var lumaMLTZero_0 : bool = ((lumaM_0 - _S15) < 0.0f);
    var lumaEndN_0 : f32 = lumaAt_0(posN_0) - _S15;
    var lumaEndP_0 : f32 = lumaAt_0(posP_0) - _S15;
    var _S16 : bool = ((abs(lumaEndP_0)) >= gradientScaled_0);
    var doneN_0 : bool = ((abs(lumaEndN_0)) >= gradientScaled_0);
    var doneP_0 : bool = _S16;
    var lumaEndN_1 : f32 = lumaEndN_0;
    var lumaEndP_1 : f32 = lumaEndP_0;
    var i_1 : u32 = u32(1);
    var posN_1 : vec2<f32> = posN_0;
    var posP_1 : vec2<f32> = posP_0;
    loop
    {
        if((i_1 < u32(10)))
        {
            if(doneN_0)
            {
                goodSpan_0 = doneP_0;
            }
            else
            {
                goodSpan_0 = false;
            }
            goodSpan_0 = !goodSpan_0;
        }
        else
        {
            goodSpan_0 = false;
        }
        if(goodSpan_0)
        {
        }
        else
        {
            break;
        }
        if(!doneN_0)
        {
            var posN_2 : vec2<f32> = posN_1 - offNP_0 * vec2<f32>(STEPS_0[i_1]);
            var lumaEndN_2 : f32 = lumaAt_0(posN_2) - _S15;
            doneN_0 = ((abs(lumaEndN_2)) >= gradientScaled_0);
            lumaEndN_1 = lumaEndN_2;
            posN_1 = posN_2;
        }
        if(!doneP_0)
        {
            var posP_2 : vec2<f32> = posP_1 + offNP_0 * vec2<f32>(STEPS_0[i_1]);
            var lumaEndP_2 : f32 = lumaAt_0(posP_2) - _S15;
            doneP_0 = ((abs(lumaEndP_2)) >= gradientScaled_0);
            lumaEndP_1 = lumaEndP_2;
            posP_1 = posP_2;
        }
        i_1 = i_1 + u32(1);
    }
    var _S17 : f32 = posM_0.x - posN_1.x;
    var _S18 : f32 = posP_1.x - posM_0.x;
    var dstP_0 : f32;
    var dstN_0 : f32;
    if(_S10)
    {
        var _S19 : f32 = posM_0.y - posN_1.y;
        dstP_0 = posP_1.y - posM_0.y;
        dstN_0 = _S19;
    }
    else
    {
        dstP_0 = _S18;
        dstN_0 = _S17;
    }
    var goodSpanN_0 : bool = (lumaEndN_1 < 0.0f) != lumaMLTZero_0;
    var goodSpanP_0 : bool = (lumaEndP_1 < 0.0f) != lumaMLTZero_0;
    var spanLength_0 : f32 = dstP_0 + dstN_0;
    var _S20 : f32 = min(dstN_0, dstP_0);
    if((dstN_0 < dstP_0))
    {
        goodSpan_0 = goodSpanN_0;
    }
    else
    {
        goodSpan_0 = goodSpanP_0;
    }
    var pixelOffset_0 : f32 = - _S20 / spanLength_0 + 0.5f;
    var subpixH_0 : f32 = subpixF_0 * subpixF_0 * 0.75f;
    if(goodSpan_0)
    {
        lumaN_1 = pixelOffset_0;
    }
    else
    {
        lumaN_1 = 0.0f;
    }
    var _S21 : f32 = max(lumaN_1, subpixH_0);
    if(horzSpan_0)
    {
        posM_0[i32(1)] = posM_0[i32(1)] + _S21 * lengthSign_0;
    }
    else
    {
        posM_0[i32(0)] = posM_0[i32(0)] + _S21 * lengthSign_0;
    }
    return rgbAt_0(posM_0);
}

fn srgbToLinear_0( c_1 : vec3<f32>) -> vec3<f32>
{
    return select(pow((c_1 + vec3<f32>(0.054999999701976776f)) / vec3<f32>(1.0549999475479126f), vec3<f32>(2.4000000953674316f)), c_1 / vec3<f32>(12.920000076293945f), (c_1 <= vec3<f32>(0.040449999272823334f)));
}

struct pixelOutput_0
{
    @location(0) output_1 : vec4<f32>,
};

@fragment
fn fs(@builtin(position) frag_0 : vec4<f32>) -> pixelOutput_0
{
    var color_0 : vec3<f32> = antialiased_0((frag_0.xy - params_0.origin_0) * params_0.rcp_0);
    var color_1 : vec3<f32>;
    if((params_0.decode_0) == u32(1))
    {
        color_1 = srgbToLinear_0(color_0);
    }
    else
    {
        color_1 = color_0;
    }
    var _S22 : pixelOutput_0 = pixelOutput_0( vec4<f32>(color_1, 1.0f) );
    return _S22;
}

struct pixelOutput_1
{
    @location(0) output_2 : vec4<f32>,
};

@fragment
fn fsCopy(@builtin(position) frag_1 : vec4<f32>) -> pixelOutput_1
{
    var _S23 : vec3<i32> = vec3<i32>(vec2<i32>(frag_1.xy - params_0.origin_0), i32(0));
    var color_2 : vec3<f32> = (textureLoad((image_0), ((_S23)).xy, ((_S23)).z)).xyz;
    var color_3 : vec3<f32>;
    if((params_0.decode_0) == u32(1))
    {
        color_3 = srgbToLinear_0(color_2);
    }
    else
    {
        color_3 = color_2;
    }
    var _S24 : pixelOutput_1 = pixelOutput_1( vec4<f32>(color_3, 1.0f) );
    return _S24;
}

