// Generated from src/shaders/glare.slang by slangc 2026.21
// (scripts/slangBuild.mjs). Do not edit: change the .slang and regenerate.
struct GlareFrame_std140_0
{
    @align(16) position_0 : vec3<f32>,
    @align(4) exposure_0 : f32,
    @align(16) sun_0 : vec3<f32>,
    @align(4) sunCos_0 : f32,
    @align(16) forward_0 : vec3<f32>,
    @align(4) tanX_0 : f32,
    @align(16) right_0 : vec3<f32>,
    @align(4) tanY_0 : f32,
    @align(16) up_0 : vec3<f32>,
    @align(4) bottomRadius_0 : f32,
    @align(16) size_0 : vec2<f32>,
    @align(8) sunFixed_0 : f32,
    @align(4) sunOn_0 : f32,
    @align(16) shape_0 : vec3<f32>,
    @align(4) moonSize_0 : f32,
    @align(16) moon_0 : vec3<f32>,
    @align(4) starCount_0 : f32,
    @align(16) geodeticUp_0 : vec3<f32>,
    @align(4) heightShare_0 : f32,
    @align(16) rows_0 : array<vec4<f32>, i32(3)>,
    @align(16) spritePixels_0 : f32,
    @align(4) spriteCap_0 : f32,
    @align(8) brightness_0 : f32,
    @align(4) pixelsPerCell_0 : f32,
    @align(16) radii_0 : array<vec4<f32>, i32(8)>,
    @align(16) kernelScale_0 : f32,
    @align(4) uvPerPixel_0 : f32,
    @align(8) kernelLevel_0 : f32,
    @align(4) topRadius_0 : f32,
};

@binding(0) @group(0) var<uniform> frame_0 : GlareFrame_std140_0;
@binding(1) @group(0) var depth_0 : texture_depth_multisampled_2d;

@binding(2) @group(0) var sunLightTable_0 : texture_2d<f32>;

@binding(3) @group(0) var tableSampler_0 : sampler;

struct GlareSource_std430_0
{
    @align(16) pixel_0 : vec2<f32>,
    @align(8) radius_0 : f32,
    @align(4) visibility_0 : f32,
    @align(16) light_0 : vec3<f32>,
    @align(4) kind_0 : f32,
};

@binding(5) @group(0) var<storage, read_write> sources_0 : array<GlareSource_std430_0>;

@binding(4) @group(0) var<storage, read> glareStars_0 : array<vec4<f32>>;

fn toPixel_0( d_0 : vec3<f32>,  z_0 : f32) -> vec2<f32>
{
    return vec2<f32>((dot(d_0, frame_0.right_0) / (z_0 * frame_0.tanX_0) * 0.5f + 0.5f) * frame_0.size_0.x, (0.5f - dot(d_0, frame_0.up_0) / (z_0 * frame_0.tanY_0) * 0.5f) * frame_0.size_0.y);
}

fn missesBody_0( direction_0 : vec3<f32>) -> bool
{
    var r_0 : f32 = length(frame_0.position_0);
    var mu_0 : f32 = dot(frame_0.position_0, normalize(frame_0.shape_0 * direction_0)) / r_0;
    var below_0 : f32 = r_0 * r_0 * (mu_0 * mu_0 - 1.0f) + frame_0.bottomRadius_0 * frame_0.bottomRadius_0;
    var _S1 : bool;
    if((mu_0 < 0.0f))
    {
        _S1 = (below_0 >= 0.0f);
    }
    else
    {
        _S1 = false;
    }
    return !_S1;
}

fn tapVisible_0( direction_1 : vec3<f32>) -> bool
{
    var z_1 : f32 = dot(direction_1, frame_0.forward_0);
    var _S2 : bool;
    if((z_1 > 9.9999997473787516e-05f))
    {
        var pixel_1 : vec2<f32> = toPixel_0(direction_1, z_1);
        var _S3 : f32 = pixel_1.x;
        if((_S3 >= 0.0f))
        {
            _S2 = ((pixel_1.y) >= 0.0f);
        }
        else
        {
            _S2 = false;
        }
        if(_S2)
        {
            _S2 = (_S3 < (frame_0.size_0.x));
        }
        else
        {
            _S2 = false;
        }
        if(_S2)
        {
            _S2 = ((pixel_1.y) < (frame_0.size_0.y));
        }
        else
        {
            _S2 = false;
        }
        if(_S2)
        {
            if((textureLoad((depth_0), (vec2<i32>(pixel_1)), (i32(0)))) != 0.0f)
            {
                return false;
            }
        }
    }
    if(!missesBody_0(direction_1))
    {
        return false;
    }
    if(((frame_0.moonSize_0) > 0.0f))
    {
        _S2 = ((dot(direction_1, frame_0.moon_0)) > (sqrt(max(0.0f, 1.0f - frame_0.moonSize_0 * frame_0.moonSize_0))));
    }
    else
    {
        _S2 = false;
    }
    if(_S2)
    {
        return false;
    }
    return true;
}

fn sunLightTableUv_0( mu_1 : f32,  heightShare_1 : f32) -> vec2<f32>
{
    const size_1 : vec2<f32> = vec2<f32>(256.0f, 64.0f);
    return (vec2<f32>(0.5f) + vec2<f32>(0.5f + 0.5f * f32((i32(sign((mu_1))))) * sqrt(abs(mu_1)), sqrt(clamp(heightShare_1, 0.0f, 1.0f))) * (size_1 - vec2<f32>(1.0f))) / size_1;
}

fn tableAt_0( mu_2 : f32,  heightShare_2 : f32) -> vec3<f32>
{
    return max((textureSampleLevel((sunLightTable_0), (tableSampler_0), (sunLightTableUv_0(mu_2, heightShare_2)), (0.0f))).xyz * vec3<f32>(1.0e+05f), vec3<f32>(0.0f));
}

fn throughAir_0( direction_2 : vec3<f32>) -> vec3<f32>
{
    if(((frame_0.heightShare_0) < 1.0f))
    {
        return tableAt_0(dot(frame_0.geodeticUp_0, direction_2), frame_0.heightShare_0);
    }
    var outside_0 : vec3<f32> = tableAt_0(1.0f, 1.0f);
    var r_1 : f32 = length(frame_0.position_0);
    var mu_3 : f32 = dot(frame_0.position_0, normalize(frame_0.shape_0 * direction_2)) / r_1;
    var lowest_0 : f32 = r_1 * sqrt(max(0.0f, 1.0f - mu_3 * mu_3));
    var _S4 : bool;
    if((mu_3 >= 0.0f))
    {
        _S4 = true;
    }
    else
    {
        _S4 = (lowest_0 >= (frame_0.topRadius_0));
    }
    if(_S4)
    {
        return outside_0;
    }
    var half_0 : vec3<f32> = tableAt_0(0.0f, (lowest_0 - frame_0.bottomRadius_0) / (frame_0.topRadius_0 - frame_0.bottomRadius_0));
    return half_0 * half_0 / max(outside_0, vec3<f32>(9.99999997475242708e-07f));
}

fn spriteRadius_0( brightest_0 : f32) -> f32
{
    var display_0 : f32 = brightest_0 * frame_0.brightness_0;
    if(!(display_0 >= 1.0f))
    {
        return 0.0f;
    }
    var _S5 : u32 = min(u32(log2(display_0)), u32(31));
    var cells_0 : f32 = frame_0.radii_0[_S5 / u32(4)][_S5 % u32(4)];
    if(((frame_0.radii_0[_S5 / u32(4)][_S5 % u32(4)]) < 2.0f))
    {
        return 0.0f;
    }
    return min(cells_0 * frame_0.pixelsPerCell_0, 512.0f);
}

struct GlareSource_0
{
     pixel_0 : vec2<f32>,
     radius_0 : f32,
     visibility_0 : f32,
     light_0 : vec3<f32>,
     kind_0 : f32,
};

@compute
@workgroup_size(1, 1, 1)
fn glareSources()
{
    var sun_1 : GlareSource_0;
    sun_1.pixel_0 = vec2<f32>(-1.0e+06f);
    sun_1.radius_0 = 0.0f;
    sun_1.visibility_0 = 0.0f;
    var _S6 : vec3<f32> = vec3<f32>(0.0f);
    sun_1.light_0 = _S6;
    sun_1.kind_0 = 0.0f;
    var fixedLight_0 : bool = ((frame_0.sunFixed_0) >= 0.0f);
    var _S7 : vec3<f32>;
    var sunZ_0 : f32;
    var pixels_0 : f32;
    var sinRadius_0 : f32;
    if(((frame_0.sunOn_0) > 0.0f))
    {
        var _S8 : f32 = sqrt(max(0.0f, 1.0f - frame_0.sunCos_0 * frame_0.sunCos_0));
        var sunZ_1 : f32 = dot(frame_0.sun_0, frame_0.forward_0);
        if((sunZ_1 > 9.9999997473787516e-05f))
        {
            sun_1.pixel_0 = toPixel_0(frame_0.sun_0, sunZ_1);
        }
        var _S9 : vec3<f32> = frame_0.sun_0;
        if(((abs(frame_0.sun_0.z)) < 0.89999997615814209f))
        {
            _S7 = vec3<f32>(0.0f, 0.0f, 1.0f);
        }
        else
        {
            _S7 = vec3<f32>(1.0f, 0.0f, 0.0f);
        }
        var x_0 : vec3<f32> = normalize(cross(_S9, _S7));
        var _S10 : vec3<f32> = cross(frame_0.sun_0, x_0);
        var _S11 : vec2<f32> = vec2<f32>(_S8);
        var tap_0 : vec2<f32> = vec2<f32>(0.125f, 0.0f) * _S11;
        if(tapVisible_0(normalize(frame_0.sun_0 + x_0 * vec3<f32>(tap_0.x) + _S10 * vec3<f32>(tap_0.y))))
        {
            sunZ_0 = 1.0f;
        }
        else
        {
            sunZ_0 = 0.0f;
        }
        var tap_1 : vec2<f32> = vec2<f32>(-0.15964500606060028f, 0.14624799787998199f) * _S11;
        if(tapVisible_0(normalize(frame_0.sun_0 + x_0 * vec3<f32>(tap_1.x) + _S10 * vec3<f32>(tap_1.y))))
        {
            sunZ_0 = sunZ_0 + 1.0f;
        }
        var tap_2 : vec2<f32> = vec2<f32>(0.024436000734567642f, -0.27843800187110901f) * _S11;
        if(tapVisible_0(normalize(frame_0.sun_0 + x_0 * vec3<f32>(tap_2.x) + _S10 * vec3<f32>(tap_2.y))))
        {
            sunZ_0 = sunZ_0 + 1.0f;
        }
        var tap_3 : vec2<f32> = vec2<f32>(0.2012220025062561f, 0.26245900988578796f) * _S11;
        if(tapVisible_0(normalize(frame_0.sun_0 + x_0 * vec3<f32>(tap_3.x) + _S10 * vec3<f32>(tap_3.y))))
        {
            sunZ_0 = sunZ_0 + 1.0f;
        }
        var tap_4 : vec2<f32> = vec2<f32>(-0.36926800012588501f, -0.065318003296852112f) * _S11;
        if(tapVisible_0(normalize(frame_0.sun_0 + x_0 * vec3<f32>(tap_4.x) + _S10 * vec3<f32>(tap_4.y))))
        {
            sunZ_0 = sunZ_0 + 1.0f;
        }
        var tap_5 : vec2<f32> = vec2<f32>(0.34980198740959167f, -0.22251600027084351f) * _S11;
        if(tapVisible_0(normalize(frame_0.sun_0 + x_0 * vec3<f32>(tap_5.x) + _S10 * vec3<f32>(tap_5.y))))
        {
            sunZ_0 = sunZ_0 + 1.0f;
        }
        var tap_6 : vec2<f32> = vec2<f32>(-0.11700200289487839f, 0.43524199724197388f) * _S11;
        if(tapVisible_0(normalize(frame_0.sun_0 + x_0 * vec3<f32>(tap_6.x) + _S10 * vec3<f32>(tap_6.y))))
        {
            sunZ_0 = sunZ_0 + 1.0f;
        }
        var tap_7 : vec2<f32> = vec2<f32>(-0.22313599288463593f, -0.42963400483131409f) * _S11;
        if(tapVisible_0(normalize(frame_0.sun_0 + x_0 * vec3<f32>(tap_7.x) + _S10 * vec3<f32>(tap_7.y))))
        {
            sunZ_0 = sunZ_0 + 1.0f;
        }
        var tap_8 : vec2<f32> = vec2<f32>(0.48411500453948975f, 0.17679800093173981f) * _S11;
        if(tapVisible_0(normalize(frame_0.sun_0 + x_0 * vec3<f32>(tap_8.x) + _S10 * vec3<f32>(tap_8.y))))
        {
            sunZ_0 = sunZ_0 + 1.0f;
        }
        var tap_9 : vec2<f32> = vec2<f32>(-0.50364100933074951f, 0.20789599418640137f) * _S11;
        if(tapVisible_0(normalize(frame_0.sun_0 + x_0 * vec3<f32>(tap_9.x) + _S10 * vec3<f32>(tap_9.y))))
        {
            sunZ_0 = sunZ_0 + 1.0f;
        }
        var tap_10 : vec2<f32> = vec2<f32>(0.24278800189495087f, -0.51882398128509521f) * _S11;
        if(tapVisible_0(normalize(frame_0.sun_0 + x_0 * vec3<f32>(tap_10.x) + _S10 * vec3<f32>(tap_10.y))))
        {
            sunZ_0 = sunZ_0 + 1.0f;
        }
        var tap_11 : vec2<f32> = vec2<f32>(0.17941400408744812f, 0.57200098037719727f) * _S11;
        if(tapVisible_0(normalize(frame_0.sun_0 + x_0 * vec3<f32>(tap_11.x) + _S10 * vec3<f32>(tap_11.y))))
        {
            sunZ_0 = sunZ_0 + 1.0f;
        }
        var tap_12 : vec2<f32> = vec2<f32>(-0.54075700044631958f, -0.31338000297546387f) * _S11;
        if(tapVisible_0(normalize(frame_0.sun_0 + x_0 * vec3<f32>(tap_12.x) + _S10 * vec3<f32>(tap_12.y))))
        {
            sunZ_0 = sunZ_0 + 1.0f;
        }
        var tap_13 : vec2<f32> = vec2<f32>(0.63437002897262573f, -0.13946400582790375f) * _S11;
        if(tapVisible_0(normalize(frame_0.sun_0 + x_0 * vec3<f32>(tap_13.x) + _S10 * vec3<f32>(tap_13.y))))
        {
            sunZ_0 = sunZ_0 + 1.0f;
        }
        var tap_14 : vec2<f32> = vec2<f32>(-0.38714599609375f, 0.55067497491836548f) * _S11;
        if(tapVisible_0(normalize(frame_0.sun_0 + x_0 * vec3<f32>(tap_14.x) + _S10 * vec3<f32>(tap_14.y))))
        {
            sunZ_0 = sunZ_0 + 1.0f;
        }
        var tap_15 : vec2<f32> = vec2<f32>(-0.089440003037452698f, -0.69019997119903564f) * _S11;
        if(tapVisible_0(normalize(frame_0.sun_0 + x_0 * vec3<f32>(tap_15.x) + _S10 * vec3<f32>(tap_15.y))))
        {
            sunZ_0 = sunZ_0 + 1.0f;
        }
        var tap_16 : vec2<f32> = vec2<f32>(0.5490720272064209f, 0.46275800466537476f) * _S11;
        if(tapVisible_0(normalize(frame_0.sun_0 + x_0 * vec3<f32>(tap_16.x) + _S10 * vec3<f32>(tap_16.y))))
        {
            sunZ_0 = sunZ_0 + 1.0f;
        }
        var tap_17 : vec2<f32> = vec2<f32>(-0.73887801170349121f, 0.030555000528693199f) * _S11;
        if(tapVisible_0(normalize(frame_0.sun_0 + x_0 * vec3<f32>(tap_17.x) + _S10 * vec3<f32>(tap_17.y))))
        {
            sunZ_0 = sunZ_0 + 1.0f;
        }
        var tap_18 : vec2<f32> = vec2<f32>(0.5389549732208252f, -0.53633201122283936f) * _S11;
        if(tapVisible_0(normalize(frame_0.sun_0 + x_0 * vec3<f32>(tap_18.x) + _S10 * vec3<f32>(tap_18.y))))
        {
            sunZ_0 = sunZ_0 + 1.0f;
        }
        var tap_19 : vec2<f32> = vec2<f32>(-0.036058001220226288f, 0.77979201078414917f) * _S11;
        if(tapVisible_0(normalize(frame_0.sun_0 + x_0 * vec3<f32>(tap_19.x) + _S10 * vec3<f32>(tap_19.y))))
        {
            sunZ_0 = sunZ_0 + 1.0f;
        }
        var tap_20 : vec2<f32> = vec2<f32>(-0.51281797885894775f, -0.61452698707580566f) * _S11;
        if(tapVisible_0(normalize(frame_0.sun_0 + x_0 * vec3<f32>(tap_20.x) + _S10 * vec3<f32>(tap_20.y))))
        {
            sunZ_0 = sunZ_0 + 1.0f;
        }
        var tap_21 : vec2<f32> = vec2<f32>(0.81235998868942261f, 0.10930199921131134f) * _S11;
        if(tapVisible_0(normalize(frame_0.sun_0 + x_0 * vec3<f32>(tap_21.x) + _S10 * vec3<f32>(tap_21.y))))
        {
            sunZ_0 = sunZ_0 + 1.0f;
        }
        var tap_22 : vec2<f32> = vec2<f32>(-0.68831098079681396f, 0.47890898585319519f) * _S11;
        if(tapVisible_0(normalize(frame_0.sun_0 + x_0 * vec3<f32>(tap_22.x) + _S10 * vec3<f32>(tap_22.y))))
        {
            sunZ_0 = sunZ_0 + 1.0f;
        }
        var tap_23 : vec2<f32> = vec2<f32>(0.18808600306510925f, -0.83606100082397461f) * _S11;
        if(tapVisible_0(normalize(frame_0.sun_0 + x_0 * vec3<f32>(tap_23.x) + _S10 * vec3<f32>(tap_23.y))))
        {
            sunZ_0 = sunZ_0 + 1.0f;
        }
        var tap_24 : vec2<f32> = vec2<f32>(0.43503299355506897f, 0.75919097661972046f) * _S11;
        if(tapVisible_0(normalize(frame_0.sun_0 + x_0 * vec3<f32>(tap_24.x) + _S10 * vec3<f32>(tap_24.y))))
        {
            sunZ_0 = sunZ_0 + 1.0f;
        }
        var tap_25 : vec2<f32> = vec2<f32>(-0.85044801235198975f, -0.27131599187850952f) * _S11;
        if(tapVisible_0(normalize(frame_0.sun_0 + x_0 * vec3<f32>(tap_25.x) + _S10 * vec3<f32>(tap_25.y))))
        {
            sunZ_0 = sunZ_0 + 1.0f;
        }
        var tap_26 : vec2<f32> = vec2<f32>(0.82610201835632324f, -0.38168001174926758f) * _S11;
        if(tapVisible_0(normalize(frame_0.sun_0 + x_0 * vec3<f32>(tap_26.x) + _S10 * vec3<f32>(tap_26.y))))
        {
            sunZ_0 = sunZ_0 + 1.0f;
        }
        var tap_27 : vec2<f32> = vec2<f32>(-0.35788801312446594f, 0.85515600442886353f) * _S11;
        if(tapVisible_0(normalize(frame_0.sun_0 + x_0 * vec3<f32>(tap_27.x) + _S10 * vec3<f32>(tap_27.y))))
        {
            sunZ_0 = sunZ_0 + 1.0f;
        }
        var tap_28 : vec2<f32> = vec2<f32>(-0.31940698623657227f, -0.88803398609161377f) * _S11;
        if(tapVisible_0(normalize(frame_0.sun_0 + x_0 * vec3<f32>(tap_28.x) + _S10 * vec3<f32>(tap_28.y))))
        {
            sunZ_0 = sunZ_0 + 1.0f;
        }
        var tap_29 : vec2<f32> = vec2<f32>(0.84990900754928589f, 0.44668799638748169f) * _S11;
        if(tapVisible_0(normalize(frame_0.sun_0 + x_0 * vec3<f32>(tap_29.x) + _S10 * vec3<f32>(tap_29.y))))
        {
            sunZ_0 = sunZ_0 + 1.0f;
        }
        var tap_30 : vec2<f32> = vec2<f32>(-0.94403499364852905f, 0.24884499609470367f) * _S11;
        if(tapVisible_0(normalize(frame_0.sun_0 + x_0 * vec3<f32>(tap_30.x) + _S10 * vec3<f32>(tap_30.y))))
        {
            sunZ_0 = sunZ_0 + 1.0f;
        }
        var tap_31 : vec2<f32> = vec2<f32>(0.53659600019454956f, -0.83452999591827393f) * _S11;
        if(tapVisible_0(normalize(frame_0.sun_0 + x_0 * vec3<f32>(tap_31.x) + _S10 * vec3<f32>(tap_31.y))))
        {
            sunZ_0 = sunZ_0 + 1.0f;
        }
        sun_1.visibility_0 = sunZ_0 / 32.0f;
        if(fixedLight_0)
        {
            _S7 = vec3<f32>(frame_0.sunFixed_0);
        }
        else
        {
            _S7 = throughAir_0(frame_0.sun_0);
        }
        sun_1.light_0 = _S7;
        sun_1.kind_0 = 1.0f;
        if(((sun_1.visibility_0) > 0.0f))
        {
            var _S12 : f32 = spriteRadius_0(max(sun_1.light_0.x, max(sun_1.light_0.y, sun_1.light_0.z)) * frame_0.exposure_0);
            sun_1.radius_0 = _S12;
            pixels_0 = 4.0f * _S12 * _S12;
        }
        else
        {
            pixels_0 = 0.0f;
        }
        sunZ_0 = sunZ_1;
        sinRadius_0 = _S8;
    }
    else
    {
        pixels_0 = 0.0f;
        sunZ_0 = 0.0f;
        sinRadius_0 = 0.0f;
    }
    sources_0[i32(1)].pixel_0 = sun_1.pixel_0;
    sources_0[i32(1)].radius_0 = sun_1.radius_0;
    sources_0[i32(1)].visibility_0 = sun_1.visibility_0;
    sources_0[i32(1)].light_0 = sun_1.light_0;
    sources_0[i32(1)].kind_0 = sun_1.kind_0;
    if(fixedLight_0)
    {
        _S7 = vec3<f32>(1.0f);
    }
    else
    {
        _S7 = max(tableAt_0(1.0f, 1.0f), vec3<f32>(9.99999997475242708e-07f));
    }
    var _S13 : u32 = min(u32(frame_0.starCount_0), u32(2048));
    var i_0 : u32 = u32(0);
    var count_0 : u32 = u32(1);
    loop
    {
        if((i_0 < _S13))
        {
        }
        else
        {
            break;
        }
        var _S14 : bool;
        if((count_0 >= u32(frame_0.spriteCap_0)))
        {
            _S14 = true;
        }
        else
        {
            _S14 = (pixels_0 >= (frame_0.spritePixels_0));
        }
        if(_S14)
        {
            break;
        }
        var _S15 : u32 = i_0 * u32(2);
        var a_0 : vec4<f32> = glareStars_0[_S15];
        var color_0 : vec3<f32> = glareStars_0[_S15 + u32(1)].xyz;
        var d_1 : vec3<f32> = frame_0.rows_0[i32(0)].xyz * vec3<f32>(a_0.x) + frame_0.rows_0[i32(1)].xyz * vec3<f32>(a_0.y) + frame_0.rows_0[i32(2)].xyz * vec3<f32>(a_0.z);
        var z_2 : f32 = dot(d_1, frame_0.forward_0);
        if((z_2 < 0.0099999997764825821f))
        {
            i_0 = i_0 + u32(1);
            continue;
        }
        var light_1 : vec3<f32> = vec3<f32>(a_0.w) * color_0;
        var light_2 : vec3<f32>;
        if(!fixedLight_0)
        {
            light_2 = light_1 * (throughAir_0(d_1) / _S7);
        }
        else
        {
            light_2 = light_1;
        }
        var radius_1 : f32 = spriteRadius_0(max(light_2.x, max(light_2.y, light_2.z)) * frame_0.exposure_0);
        if((radius_1 <= 0.0f))
        {
            i_0 = i_0 + u32(1);
            continue;
        }
        var pixel_2 : vec2<f32> = toPixel_0(d_1, z_2);
        var _S16 : f32 = pixel_2.x;
        var _S17 : f32 = - radius_1;
        var _S18 : bool;
        if((_S16 < _S17))
        {
            _S18 = true;
        }
        else
        {
            _S18 = ((pixel_2.y) < _S17);
        }
        var _S19 : bool;
        if(_S18)
        {
            _S19 = true;
        }
        else
        {
            _S19 = (_S16 > (frame_0.size_0.x + radius_1));
        }
        var _S20 : bool;
        if(_S19)
        {
            _S20 = true;
        }
        else
        {
            _S20 = ((pixel_2.y) > (frame_0.size_0.y + radius_1));
        }
        if(_S20)
        {
            i_0 = i_0 + u32(1);
            continue;
        }
        if(!tapVisible_0(d_1))
        {
            i_0 = i_0 + u32(1);
            continue;
        }
        var pixels_1 : f32 = pixels_0 + 4.0f * radius_1 * radius_1;
        var star_0 : GlareSource_0;
        star_0.pixel_0 = pixel_2;
        star_0.radius_0 = radius_1;
        star_0.visibility_0 = 1.0f;
        star_0.light_0 = light_2;
        star_0.kind_0 = 2.0f;
        var _S21 : u32 = count_0 + u32(1);
        sources_0[_S21].pixel_0 = star_0.pixel_0;
        sources_0[_S21].radius_0 = star_0.radius_0;
        sources_0[_S21].visibility_0 = star_0.visibility_0;
        sources_0[_S21].light_0 = star_0.light_0;
        sources_0[_S21].kind_0 = star_0.kind_0;
        count_0 = _S21;
        pixels_0 = pixels_1;
        i_0 = i_0 + u32(1);
    }
    var header_0 : GlareSource_0;
    header_0.pixel_0 = vec2<f32>(f32(count_0), sunZ_0);
    header_0.radius_0 = sinRadius_0;
    header_0.visibility_0 = pixels_0;
    header_0.light_0 = _S6;
    header_0.kind_0 = 0.0f;
    sources_0[i32(0)].pixel_0 = header_0.pixel_0;
    sources_0[i32(0)].radius_0 = header_0.radius_0;
    sources_0[i32(0)].visibility_0 = header_0.visibility_0;
    sources_0[i32(0)].light_0 = header_0.light_0;
    sources_0[i32(0)].kind_0 = header_0.kind_0;
    return;
}

