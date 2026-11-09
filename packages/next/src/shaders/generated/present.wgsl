// Generated from src/shaders/present.slang by slangc 2026.21
// (scripts/slangBuild.mjs). Do not edit: change the .slang and regenerate.
struct PresentParams_std140_0
{
    @align(16) origin_0 : vec2<f32>,
    @align(8) toneMapping_0 : u32,
    @align(4) encoding_0 : u32,
    @align(16) exposure_0 : f32,
    @align(4) eye_0 : u32,
    @align(8) cones_0 : f32,
    @align(4) rods_0 : f32,
    @align(16) compensation_0 : f32,
    @align(4) pad0_0 : f32,
    @align(8) pad1_0 : f32,
    @align(4) pad2_0 : f32,
};

@binding(1) @group(0) var<uniform> params_0 : PresentParams_std140_0;
@binding(2) @group(0) var display_0 : texture_2d<f32>;

@binding(0) @group(0) var hdr_0 : texture_2d<f32>;

@binding(3) @group(0) var adaptation_0 : texture_3d<f32>;

@binding(4) @group(0) var adaptationSampler_0 : sampler;

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

fn localAdaptation_0( uv_0 : vec2<f32>,  logY_0 : f32,  global_0 : vec2<f32>) -> vec2<f32>
{
    var g_0 : vec3<f32> = (textureSampleLevel((adaptation_0), (adaptationSampler_0), (vec3<f32>(uv_0, clamp((logY_0 - (global_0.x / 0.30103000998497009f - 12.0f)) / 24.0f, 0.0f, 1.0f))), (0.0f))).xyz;
    var _S2 : vec2<f32> = vec2<f32>(0.30103000998497009f);
    return (g_0.xy + global_0 / _S2 * vec2<f32>(0.05000000074505806f)) / vec2<f32>((g_0.z + 0.05000000074505806f)) * _S2;
}

fn coneThreshold_0( la_0 : f32) -> f32
{
    var l_0 : f32 = ((log( (max(la_0, 9.999999960041972e-13f)) ) * f32( 0.43429448190325182765112891891661) ));
    var _S3 : f32 = pow(0.24899999797344208f * l_0 + 0.64999997615814209f, 2.7000000476837158f) - 0.72000002861022949f;
    var t_0 : f32;
    if((l_0 <= -2.5999999046325684f))
    {
        t_0 = -0.72000002861022949f;
    }
    else
    {
        if((l_0 >= 1.8999999761581421f))
        {
            t_0 = l_0 - 1.2549999952316284f;
        }
        else
        {
            t_0 = _S3;
        }
    }
    return pow(10.0f, t_0);
}

fn brightness_0( la_1 : f32) -> f32
{
    var gamma_0 : f32;
    if((la_1 > 100.0f))
    {
        gamma_0 = 2.6549999713897705f;
    }
    else
    {
        gamma_0 = 1.8550000190734863f + 0.40000000596046448f * ((log( (max(la_1 + 2.3000000510364771e-05f, 9.999999960041972e-13f)) ) * f32( 0.43429448190325182765112891891661) ));
    }
    return pow(10.0f, (gamma_0 - 2.6549999713897705f) / (1.8550000190734863f + 0.40000000596046448f * ((log( (max(50.000022888183594f, 9.999999960041972e-13f)) ) * f32( 0.43429448190325182765112891891661) ))));
}

fn rodWeight_0( la_2 : f32) -> f32
{
    var k_0 : f32 = clamp(1.0f - (la_2 - 0.0099999997764825821f) / 9.9899997711181641f, 0.0f, 1.0f);
    return k_0 * k_0;
}

fn rodThreshold_0( la_3 : f32) -> f32
{
    var l_1 : f32 = ((log( (max(la_3, 9.999999960041972e-13f)) ) * f32( 0.43429448190325182765112891891661) ));
    var _S4 : f32 = pow(0.4050000011920929f * l_1 + 1.6000000238418579f, 2.1800000667572021f) - 2.8599998950958252f;
    var t_1 : f32;
    if((l_1 <= -3.940000057220459f))
    {
        t_1 = -2.8599998950958252f;
    }
    else
    {
        if((l_1 >= -1.440000057220459f))
        {
            t_1 = l_1 - 0.39500001072883606f;
        }
        else
        {
            t_1 = _S4;
        }
    }
    return pow(10.0f, t_1);
}

fn eyeSees_0( image_0 : vec3<f32>,  uv_1 : vec2<f32>) -> vec3<f32>
{
    var light_0 : vec3<f32> = image_0 / vec3<f32>(params_0.exposure_0);
    var y_0 : f32 = dot(light_0, vec3<f32>(0.2125999927520752f, 0.71520000696182251f, 0.072200000286102295f));
    var global_1 : vec2<f32> = vec2<f32>(params_0.cones_0, params_0.rods_0);
    var _S5 : vec2<f32> = vec2<f32>(2.0f);
    var adapted_0 : vec2<f32> = clamp(mix(global_1, localAdaptation_0(uv_1, log2(max(y_0, 1.00000001168609742e-07f)), global_1), vec2<f32>(0.5f)), global_1 - _S5, global_1 + _S5);
    var cones_1 : f32 = pow(10.0f, adapted_0.x);
    var _S6 : f32 = coneThreshold_0(50.0f);
    var scale_0 : f32 = 0.18000000715255737f / (_S6 * pow(10.0f, 1.2549999952316284f) / 100.0f) * brightness_0(cones_1) * exp2(params_0.compensation_0) / 100.0f;
    return light_0 * vec3<f32>((scale_0 * _S6 / coneThreshold_0(cones_1))) + vec3<f32>((max(y_0 * (1.3300000429153442f * (1.0f + (y_0 + dot(light_0, vec3<f32>(0.019300000742077827f, 0.11919999867677689f, 0.9505000114440918f))) / max(dot(light_0, vec3<f32>(0.4124000072479248f, 0.35760000348091125f, 0.18050000071525574f)), 9.999999960041972e-13f)) - 1.6799999475479126f), 0.0f) * (scale_0 * rodWeight_0(cones_1) * rodThreshold_0(50.0f) / rodThreshold_0(pow(10.0f, adapted_0.y))))) * vec3<f32>(1.0410000085830688f, 0.96200001239776611f, 1.2589999437332153f);
}

fn agx_0( input_0 : vec3<f32>) -> vec3<f32>
{
    var _S7 : vec3<f32> = vec3<f32>(0.0f);
    var _S8 : vec3<f32> = vec3<f32>(1.0f);
    var c_0 : vec3<f32> = clamp((log2(max((((mat3x3<f32>(0.85662716627120972f, 0.13731896877288818f, 0.11189821362495422f, 0.095121242105960846f, 0.76124197244644165f, 0.076799415051937103f, 0.048251606523990631f, 0.10143903642892838f, 0.81130236387252808f)) * ((((mat3x3<f32>(0.6273999810218811f, 0.069099999964237213f, 0.01640000008046627f, 0.32929998636245728f, 0.91949999332427979f, 0.087999999523162842f, 0.043299999088048935f, 0.011300000362098217f, 0.89560002088546753f)) * (input_0)))))), vec3<f32>(1.00000001335143196e-10f))) - vec3<f32>(-12.473930358886719f)) / vec3<f32>(16.5f), _S7, _S8);
    var x2_0 : vec3<f32> = c_0 * c_0;
    var x4_0 : vec3<f32> = x2_0 * x2_0;
    return clamp((((mat3x3<f32>(1.6605000495910645f, -0.12460000067949295f, -0.018200000748038292f, -0.5875999927520752f, 1.1328999996185303f, -0.1005999967455864f, -0.072800002992153168f, -0.0082999998703598976f, 1.1187000274658203f)) * (pow(max((((mat3x3<f32>(1.1271005868911743f, -0.14132976531982422f, -0.14132976531982422f, -0.11060664057731628f, 1.1578236818313599f, -0.11060664057731628f, -0.016493938863277435f, -0.016493938863277435f, 1.2519364356994629f)) * (vec3<f32>(15.5f) * x4_0 * x2_0 - vec3<f32>(40.139999389648438f) * x4_0 * c_0 + vec3<f32>(31.959999084472656f) * x4_0 - vec3<f32>(6.8680000305175781f) * x2_0 * c_0 + vec3<f32>(0.42980000376701355f) * x2_0 + vec3<f32>(0.11909999698400497f) * c_0 - vec3<f32>(0.0023199999704957008f)))), _S7), vec3<f32>(2.2000000476837158f))))), _S7, _S8);
}

fn aces_0( c_1 : vec3<f32>) -> vec3<f32>
{
    return clamp((c_1 * (c_1 + vec3<f32>(0.064999997615814209f)) - vec3<f32>(9.9999997473787516e-05f)) / (c_1 * (vec3<f32>(0.98500001430511475f) * c_1 + vec3<f32>(0.43299999833106995f)) + vec3<f32>(0.23800000548362732f)), vec3<f32>(0.0f), vec3<f32>(1.0f));
}

fn pbrNeutral_0( input_1 : vec3<f32>) -> vec3<f32>
{
    var _S9 : f32 = min(input_1.x, min(input_1.y, input_1.z));
    var offset_0 : f32;
    if((_S9 < 0.079999998211860657f))
    {
        offset_0 = _S9 - 6.25f * _S9 * _S9;
    }
    else
    {
        offset_0 = 0.039999999105930328f;
    }
    var color_0 : vec3<f32> = input_1 - vec3<f32>(offset_0);
    var _S10 : f32 = max(color_0.x, max(color_0.y, color_0.z));
    if((_S10 < 0.75999999046325684f))
    {
        return color_0;
    }
    var newPeak_0 : f32 = 1.0f - 0.057600002735853195f / (_S10 + 0.24000000953674316f - 0.75999999046325684f);
    return mix(color_0 * vec3<f32>((newPeak_0 / _S10)), vec3<f32>(newPeak_0), vec3<f32>((1.0f - 1.0f / (0.15000000596046448f * (_S10 - newPeak_0) + 1.0f))));
}

fn toneMap_0( c_2 : vec3<f32>) -> vec3<f32>
{
    switch(params_0.toneMapping_0)
    {
    case u32(1):
        {
            return agx_0(c_2);
        }
    case u32(2):
        {
            return aces_0(c_2);
        }
    default :
        {
            return pbrNeutral_0(c_2);
        }
    }
}

fn linearToSrgb_0( c_3 : vec3<f32>) -> vec3<f32>
{
    return select(vec3<f32>(1.0549999475479126f) * pow(c_3, vec3<f32>(0.4166666567325592f)) - vec3<f32>(0.054999999701976776f), c_3 * vec3<f32>(12.920000076293945f), (c_3 <= vec3<f32>(0.0031308000907301903f)));
}

struct pixelOutput_0
{
    @location(0) output_1 : vec4<f32>,
};

@fragment
fn fs(@builtin(position) frag_0 : vec4<f32>) -> pixelOutput_0
{
    var _S11 : vec2<i32> = vec2<i32>(frag_0.xy - params_0.origin_0);
    var _S12 : vec3<i32> = vec3<i32>(_S11, i32(0));
    var shown_0 : vec4<f32> = (textureLoad((display_0), ((_S12)).xy, ((_S12)).z));
    var sceneCoverage_0 : f32 = 1.0f - shown_0.w;
    var scene_0 : vec3<f32> = (textureLoad((hdr_0), ((_S12)).xy, ((_S12)).z)).xyz / vec3<f32>(max(sceneCoverage_0, 9.9999997473787516e-05f));
    var scene_1 : vec3<f32>;
    if((params_0.eye_0) == u32(1))
    {
        var size_0 : vec2<u32>;
        var _S13 : u32 = size_0[i32(0)];
        var _S14 : u32 = size_0[i32(1)];
        {var dim = textureDimensions((hdr_0));((_S13)) = dim.x;((_S14)) = dim.y;};
        size_0[i32(0)] = _S13;
        size_0[i32(1)] = _S14;
        scene_1 = eyeSees_0(max(scene_0, vec3<f32>(0.0f)), (vec2<f32>(_S11) + vec2<f32>(0.5f)) / vec2<f32>(size_0));
    }
    else
    {
        scene_1 = scene_0;
    }
    var _S15 : vec3<f32> = vec3<f32>(0.0f);
    var color_1 : vec3<f32> = clamp(toneMap_0(max(scene_1, _S15)) * vec3<f32>(sceneCoverage_0) + shown_0.xyz, _S15, vec3<f32>(1.0f));
    var color_2 : vec3<f32>;
    if((params_0.encoding_0) == u32(1))
    {
        color_2 = linearToSrgb_0(color_1);
    }
    else
    {
        if((params_0.encoding_0) == u32(2))
        {
            color_2 = pow(color_1, vec3<f32>(0.45454543828964233f));
        }
        else
        {
            color_2 = color_1;
        }
    }
    var _S16 : pixelOutput_0 = pixelOutput_0( vec4<f32>(color_2, 1.0f) );
    return _S16;
}

struct pixelOutput_1
{
    @location(0) output_2 : vec4<f32>,
};

@fragment
fn fsResponse(@builtin(position) frag_1 : vec4<f32>) -> pixelOutput_1
{
    var _S17 : vec2<i32> = vec2<i32>(frag_1.xy);
    var _S18 : vec3<i32> = vec3<i32>(_S17, i32(0));
    var scene_2 : vec3<f32> = (textureLoad((hdr_0), ((_S18)).xy, ((_S18)).z)).xyz / vec3<f32>(max(1.0f - (textureLoad((display_0), ((_S18)).xy, ((_S18)).z)).w, 9.9999997473787516e-05f));
    var scene_3 : vec3<f32>;
    if((params_0.eye_0) == u32(1))
    {
        var size_1 : vec2<u32>;
        var _S19 : u32 = size_1[i32(0)];
        var _S20 : u32 = size_1[i32(1)];
        {var dim = textureDimensions((hdr_0));((_S19)) = dim.x;((_S20)) = dim.y;};
        size_1[i32(0)] = _S19;
        size_1[i32(1)] = _S20;
        scene_3 = eyeSees_0(max(scene_2, vec3<f32>(0.0f)), (vec2<f32>(_S17) + vec2<f32>(0.5f)) / vec2<f32>(size_1));
    }
    else
    {
        scene_3 = scene_2;
    }
    var _S21 : pixelOutput_1 = pixelOutput_1( vec4<f32>(min(max(scene_3, vec3<f32>(0.0f)), vec3<f32>(65504.0f)), 1.0f) );
    return _S21;
}

struct pixelOutput_2
{
    @location(0) output_3 : vec4<f32>,
};

@fragment
fn fsTone(@builtin(position) frag_2 : vec4<f32>) -> pixelOutput_2
{
    var _S22 : vec3<i32> = vec3<i32>(vec2<i32>(frag_2.xy - params_0.origin_0), i32(0));
    var shown_1 : vec4<f32> = (textureLoad((display_0), ((_S22)).xy, ((_S22)).z));
    var _S23 : vec3<f32> = vec3<f32>(0.0f);
    var color_3 : vec3<f32> = clamp(toneMap_0(max((textureLoad((hdr_0), ((_S22)).xy, ((_S22)).z)).xyz, _S23)) * vec3<f32>((1.0f - shown_1.w)) + shown_1.xyz, _S23, vec3<f32>(1.0f));
    var color_4 : vec3<f32>;
    if((params_0.encoding_0) == u32(1))
    {
        color_4 = linearToSrgb_0(color_3);
    }
    else
    {
        if((params_0.encoding_0) == u32(2))
        {
            color_4 = pow(color_3, vec3<f32>(0.45454543828964233f));
        }
        else
        {
            color_4 = color_3;
        }
    }
    var _S24 : pixelOutput_2 = pixelOutput_2( vec4<f32>(color_4, 1.0f) );
    return _S24;
}

