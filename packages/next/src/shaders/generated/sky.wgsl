// Generated from src/atmosphere/sky.slang by slangc 2026.21
// (scripts/slangBuild.mjs). Do not edit: change the .slang and regenerate.
@binding(5) @group(3) var<storage, read> starPoints_0 : array<vec4<f32>>;

struct Stars_std140_0
{
    @align(16) rows_0 : array<vec4<f32>, i32(3)>,
    @align(16) planes_0 : array<vec4<f32>, i32(4)>,
    @align(16) minIlluminance_0 : f32,
    @align(4) minRadiance_0 : f32,
};

@binding(0) @group(3) var<uniform> stars_0 : Stars_std140_0;
struct Sky_std140_0
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
    @align(4) sunSolidAngle_0 : f32,
    @align(16) size_0 : vec2<f32>,
    @align(8) steps_0 : f32,
    @align(4) bottomRadius_0 : f32,
    @align(16) weights_0 : array<vec4<f32>, i32(8)>,
    @align(16) aerialStart_0 : f32,
    @align(4) aerialEnd_0 : f32,
    @align(8) starExposure_0 : f32,
    @align(4) moonLight_0 : f32,
    @align(16) moon_0 : vec3<f32>,
    @align(4) moonSize_0 : f32,
    @align(16) moonX_0 : vec3<f32>,
    @align(4) moonScale_0 : f32,
    @align(16) moonZ_0 : vec3<f32>,
    @align(4) earthshine_0 : f32,
    @align(16) moonSun_0 : vec3<f32>,
    @align(4) cityLight_0 : f32,
    @align(16) shape_0 : vec3<f32>,
    @align(4) starPixel_0 : f32,
    @align(16) starCore_0 : f32,
    @align(4) starWing_0 : f32,
    @align(8) starWingShare_0 : f32,
};

@binding(0) @group(2) var<uniform> sky_0 : Sky_std140_0;
@binding(6) @group(3) var<storage, read> starCells_0 : array<vec4<f32>>;

@binding(7) @group(3) var<storage, read_write> starArgs_0 : array<u32>;

struct Atmosphere_std140_0
{
    @align(16) rayleighScattering_0 : vec4<f32>,
    @align(16) mieScattering_0 : vec4<f32>,
    @align(16) mieExtinction_0 : vec4<f32>,
    @align(16) ozoneAbsorption_0 : vec4<f32>,
    @align(16) solarIrradiance_0 : vec4<f32>,
    @align(16) bottomRadius_1 : f32,
    @align(4) topRadius_0 : f32,
    @align(8) rayleighScaleHeight_0 : f32,
    @align(4) mieScaleHeight_0 : f32,
    @align(16) miePhaseG_0 : f32,
    @align(4) groundAlbedo_0 : f32,
    @align(8) pad0_0 : f32,
    @align(4) pad1_0 : f32,
};

@binding(0) @group(0) var<uniform> atmosphere_0 : Atmosphere_std140_0;
@binding(1) @group(1) var transmittanceTable_0 : texture_2d<f32>;

@binding(2) @group(1) var tableSampler_0 : sampler;

@binding(3) @group(1) var multipleScatteringTable_0 : texture_2d<f32>;

@binding(3) @group(3) var moonMap_0 : texture_2d<f32>;

@binding(2) @group(3) var starSampler_0 : sampler;

@binding(1) @group(3) var starBackground_0 : texture_cube<f32>;

@binding(4) @group(3) var starLayer_0 : texture_2d<f32>;

@binding(1) @group(2) var skyView_0 : texture_2d<f32>;

@binding(2) @group(2) var skyViewSampler_0 : sampler;

@binding(5) @group(2) var aerialPartial_0 : texture_3d<f32>;

@binding(7) @group(2) var aerialOut_0 : texture_storage_3d<rgba16float, write>;

fn rayleighPhase_0( mu_0 : f32) -> f32
{
    return 0.059683103114366531f * (1.0f + mu_0 * mu_0);
}

fn miePhase_0( mu_1 : f32) -> f32
{
    var _S1 : f32 = atmosphere_0.miePhaseG_0 * atmosphere_0.miePhaseG_0;
    return 0.11936620622873306f * (1.0f - _S1) / (2.0f + _S1) * (1.0f + mu_1 * mu_1) / pow(1.0f + _S1 - 2.0f * atmosphere_0.miePhaseG_0 * mu_1, 1.5f);
}

struct Medium_0
{
     scattering_0 : vec4<f32>,
     extinction_0 : vec4<f32>,
     rayleigh_0 : vec4<f32>,
     mie_0 : vec4<f32>,
};

fn medium_0( h_0 : f32) -> Medium_0
{
    var a_0 : Atmosphere_std140_0 = atmosphere_0;
    var _S2 : f32 = - h_0;
    var rayleighDensity_0 : f32 = exp(_S2 / atmosphere_0.rayleighScaleHeight_0);
    var mieDensity_0 : f32 = exp(_S2 / atmosphere_0.mieScaleHeight_0);
    var ozoneDensity_0 : f32;
    if((h_0 < 25.0f))
    {
        ozoneDensity_0 = clamp(h_0 / 15.0f - 0.66666668653488159f, 0.0f, 1.0f);
    }
    else
    {
        ozoneDensity_0 = clamp(_S2 / 15.0f + 2.6666667461395264f, 0.0f, 1.0f);
    }
    var m_0 : Medium_0;
    var _S3 : vec4<f32> = a_0.rayleighScattering_0 * vec4<f32>(rayleighDensity_0);
    m_0.rayleigh_0 = _S3;
    var _S4 : vec4<f32> = vec4<f32>(mieDensity_0);
    var _S5 : vec4<f32> = a_0.mieScattering_0 * _S4;
    m_0.mie_0 = _S5;
    m_0.scattering_0 = _S3 + _S5;
    m_0.extinction_0 = _S3 + a_0.mieExtinction_0 * _S4 + a_0.ozoneAbsorption_0 * vec4<f32>(ozoneDensity_0);
    return m_0;
}

fn hitsGround_0( r_0 : f32,  mu_2 : f32) -> bool
{
    var bottom_0 : f32 = atmosphere_0.bottomRadius_1;
    var _S6 : bool;
    if((mu_2 < 0.0f))
    {
        _S6 = ((r_0 * r_0 * (mu_2 * mu_2 - 1.0f) + bottom_0 * bottom_0) >= 0.0f);
    }
    else
    {
        _S6 = false;
    }
    return _S6;
}

fn sphereDistance_0( r_1 : f32,  mu_3 : f32,  radius_0 : f32,  near_0 : bool) -> f32
{
    var disc_0 : f32 = r_1 * r_1 * (mu_3 * mu_3 - 1.0f) + radius_0 * radius_0;
    if((disc_0 < 0.0f))
    {
        return -1.0f;
    }
    var s_0 : f32 = sqrt(disc_0);
    var t_0 : f32;
    if(near_0)
    {
        t_0 = - r_1 * mu_3 - s_0;
    }
    else
    {
        t_0 = - r_1 * mu_3 + s_0;
    }
    return t_0;
}

fn unitToTexel_0( x_0 : f32,  size_1 : f32) -> f32
{
    return 0.5f / size_1 + x_0 * (1.0f - 1.0f / size_1);
}

fn transmittanceUv_0( r_2 : f32,  mu_4 : f32) -> vec2<f32>
{
    var _S7 : f32 = atmosphere_0.topRadius_0;
    var _S8 : f32 = atmosphere_0.bottomRadius_1;
    var _S9 : f32 = _S8 * _S8;
    var h_1 : f32 = sqrt(_S7 * _S7 - _S9);
    var rho_0 : f32 = sqrt(max(0.0f, r_2 * r_2 - _S9));
    var dMin_0 : f32 = atmosphere_0.topRadius_0 - r_2;
    return vec2<f32>(unitToTexel_0((max(0.0f, sphereDistance_0(r_2, mu_4, atmosphere_0.topRadius_0, false)) - dMin_0) / (rho_0 + h_1 - dMin_0), 256.0f), unitToTexel_0(rho_0 / h_1, 64.0f));
}

fn transmittanceToTop_0( r_3 : f32,  mu_5 : f32) -> vec4<f32>
{
    return (textureSampleLevel((transmittanceTable_0), (tableSampler_0), (transmittanceUv_0(r_3, mu_5)), (0.0f)));
}

fn sunTransmittance_0( r_4 : f32,  muSun_0 : f32) -> vec4<f32>
{
    if(hitsGround_0(r_4, muSun_0))
    {
        return vec4<f32>(0.0f);
    }
    return transmittanceToTop_0(r_4, muSun_0);
}

fn multipleScattering_0( r_5 : f32,  muSun_1 : f32) -> vec4<f32>
{
    return (textureSampleLevel((multipleScatteringTable_0), (tableSampler_0), (vec2<f32>(unitToTexel_0(muSun_1 * 0.5f + 0.5f, 32.0f), unitToTexel_0(clamp((r_5 - atmosphere_0.bottomRadius_1) / (atmosphere_0.topRadius_0 - atmosphere_0.bottomRadius_1), 0.0f, 1.0f), 32.0f))), (0.0f)));
}

var<workgroup> scanRadiance_0 : array<vec4<f32>, i32(128)>;

var<workgroup> scanTransmittance_0 : array<vec4<f32>, i32(128)>;

fn toRgb_0( spectral_0 : vec4<f32>,  group_0 : u32) -> vec3<f32>
{
    var base_0 : u32 = group_0 * u32(4);
    return vec3<f32>(spectral_0.x) * sky_0.weights_0[base_0].xyz + vec3<f32>(spectral_0.y) * sky_0.weights_0[base_0 + u32(1)].xyz + vec3<f32>(spectral_0.z) * sky_0.weights_0[base_0 + u32(2)].xyz + vec3<f32>(spectral_0.w) * sky_0.weights_0[base_0 + u32(3)].xyz;
}

fn aerialColumn_0( column_0 : vec3<u32>,  j_0 : u32)
{
    var scattered_0 : vec4<f32>;
    var direction_0 : vec3<f32> = normalize(sky_0.forward_0 + sky_0.right_0 * vec3<f32>((((f32(column_0.x) + 0.5f) / 32.0f * 2.0f - 1.0f) * sky_0.tanX_0)) + sky_0.up_0 * vec3<f32>(((1.0f - (f32(column_0.y) + 0.5f) / 32.0f * 2.0f) * sky_0.tanY_0)));
    var _S10 : f32 = sky_0.aerialStart_0;
    var _S11 : f32 = sky_0.aerialEnd_0;
    var nu_0 : f32 = dot(direction_0, sky_0.sun_0);
    var _S12 : f32 = rayleighPhase_0(nu_0);
    var _S13 : f32 = miePhase_0(nu_0);
    var moonNu_0 : f32 = dot(direction_0, sky_0.moon_0);
    var _S14 : f32 = rayleighPhase_0(moonNu_0) * sky_0.moonLight_0;
    var _S15 : f32 = miePhase_0(moonNu_0) * sky_0.moonLight_0;
    var _S16 : f32 = f32(j_0);
    var w0_0 : f32 = (_S16 - 0.5f) / 128.0f;
    var w1_0 : f32 = (_S16 + 0.5f) / 128.0f;
    var a_1 : f32;
    if(j_0 == u32(0))
    {
        a_1 = _S10;
    }
    else
    {
        a_1 = _S10 + (_S11 - _S10) * w0_0 * w0_0;
    }
    var _S17 : f32 = max(_S10 + (_S11 - _S10) * w1_0 * w1_0 - a_1, 0.0f) / 2.0f;
    var _S18 : vec4<f32> = vec4<f32>(0.0f);
    var _S19 : vec4<f32> = vec4<f32>(1.0f);
    var i_0 : i32 = i32(0);
    var transmittance_0 : vec4<f32> = _S19;
    var radiance_0 : vec4<f32> = _S18;
    loop
    {
        if((i_0 < i32(2)))
        {
        }
        else
        {
            break;
        }
        var p_0 : vec3<f32> = sky_0.position_0 + direction_0 * vec3<f32>((a_1 + (f32(i_0) + 0.5f) * _S17));
        var _S20 : f32 = max(length(p_0), atmosphere_0.bottomRadius_1 + 0.0010000000474974513f);
        var muSun_2 : f32 = dot(p_0, sky_0.sun_0) / _S20;
        var m_1 : Medium_0 = medium_0(_S20 - atmosphere_0.bottomRadius_1);
        var scattered_1 : vec4<f32> = (m_1.rayleigh_0 * vec4<f32>(_S12) + m_1.mie_0 * vec4<f32>(_S13)) * sunTransmittance_0(_S20, muSun_2) + m_1.scattering_0 * multipleScattering_0(_S20, muSun_2);
        if(((sky_0.moonLight_0) > 0.0f))
        {
            var muMoon_0 : f32 = dot(p_0, sky_0.moon_0) / _S20;
            scattered_0 = scattered_1 + ((m_1.rayleigh_0 * vec4<f32>(_S14) + m_1.mie_0 * vec4<f32>(_S15)) * sunTransmittance_0(_S20, muMoon_0) + m_1.scattering_0 * multipleScattering_0(_S20, muMoon_0) * vec4<f32>(sky_0.moonLight_0));
        }
        else
        {
            scattered_0 = scattered_1;
        }
        var segment_0 : vec4<f32> = exp((vec4<f32>(0) - m_1.extinction_0) * vec4<f32>(_S17));
        var radiance_1 : vec4<f32> = radiance_0 + transmittance_0 * scattered_0 * (vec4<f32>(1.0f) - segment_0) / max(m_1.extinction_0, vec4<f32>(9.99999971718068537e-10f));
        var transmittance_1 : vec4<f32> = transmittance_0 * segment_0;
        i_0 = i_0 + i32(1);
        transmittance_0 = transmittance_1;
        radiance_0 = radiance_1;
    }
    scanRadiance_0[j_0] = radiance_0;
    scanTransmittance_0[j_0] = transmittance_0;
    var offset_0 : u32 = u32(1);
    loop
    {
        if((offset_0 < u32(128)))
        {
        }
        else
        {
            break;
        }
        workgroupBarrier();
        var beforeTransmittance_0 : vec4<f32>;
        if((j_0 >= offset_0))
        {
            var _S21 : u32 = j_0 - offset_0;
            scattered_0 = scanRadiance_0[_S21];
            beforeTransmittance_0 = scanTransmittance_0[_S21];
        }
        else
        {
            scattered_0 = _S18;
            beforeTransmittance_0 = _S19;
        }
        workgroupBarrier();
        var radiance_2 : vec4<f32> = scattered_0 + beforeTransmittance_0 * radiance_0;
        var transmittance_2 : vec4<f32> = beforeTransmittance_0 * transmittance_0;
        scanRadiance_0[j_0] = radiance_2;
        scanTransmittance_0[j_0] = transmittance_2;
        offset_0 = (offset_0 << (u32(1)));
        radiance_0 = radiance_2;
        transmittance_0 = transmittance_2;
    }
    var _S22 : vec3<f32> = vec3<f32>(0.0f);
    var k_0 : u32 = u32(0);
    var total_0 : vec3<f32> = _S22;
    loop
    {
        if((k_0 < u32(8)))
        {
        }
        else
        {
            break;
        }
        var total_1 : vec3<f32> = total_0 + sky_0.weights_0[k_0].xyz;
        k_0 = k_0 + u32(1);
        total_0 = total_1;
    }
    var inscatter_0 : vec3<f32> = toRgb_0(radiance_0 * atmosphere_0.solarIrradiance_0, u32(1)) * vec3<f32>(sky_0.exposure_0);
    var t_1 : vec3<f32> = (vec3<f32>(transmittance_0.x) * sky_0.weights_0[u32(4)].xyz + vec3<f32>(transmittance_0.y) * sky_0.weights_0[u32(5)].xyz + vec3<f32>(transmittance_0.z) * sky_0.weights_0[u32(6)].xyz + vec3<f32>(transmittance_0.w) * sky_0.weights_0[u32(7)].xyz) / total_0;
    var _S23 : vec2<u32> = column_0.xy;
    var at_0 : vec3<u32> = vec3<u32>(_S23, j_0);
    var atTransmittance_0 : vec3<u32> = vec3<u32>(_S23, j_0 + u32(128));
    var _S24 : vec4<i32> = vec4<i32>(vec3<i32>(at_0), i32(0));
    var _S25 : vec4<i32> = vec4<i32>(vec3<i32>(atTransmittance_0), i32(0));
    var t_2 : vec3<f32> = t_1 + (textureLoad((aerialPartial_0), ((_S25)).xyz, ((_S25)).w)).xyz;
    textureStore((aerialOut_0), (at_0), (vec4<f32>(min(inscatter_0 + (textureLoad((aerialPartial_0), ((_S24)).xyz, ((_S24)).w)).xyz, vec3<f32>(60000.0f)), 1.0f)));
    textureStore((aerialOut_0), (atTransmittance_0), (vec4<f32>(t_2, 1.0f)));
    return;
}

fn aerialColumn_1( column_1 : vec3<u32>,  j_1 : u32)
{
    var scattered_2 : vec4<f32>;
    var direction_1 : vec3<f32> = normalize(sky_0.forward_0 + sky_0.right_0 * vec3<f32>((((f32(column_1.x) + 0.5f) / 32.0f * 2.0f - 1.0f) * sky_0.tanX_0)) + sky_0.up_0 * vec3<f32>(((1.0f - (f32(column_1.y) + 0.5f) / 32.0f * 2.0f) * sky_0.tanY_0)));
    var _S26 : f32 = sky_0.aerialStart_0;
    var _S27 : f32 = sky_0.aerialEnd_0;
    var nu_1 : f32 = dot(direction_1, sky_0.sun_0);
    var _S28 : f32 = rayleighPhase_0(nu_1);
    var _S29 : f32 = miePhase_0(nu_1);
    var moonNu_1 : f32 = dot(direction_1, sky_0.moon_0);
    var _S30 : f32 = rayleighPhase_0(moonNu_1) * sky_0.moonLight_0;
    var _S31 : f32 = miePhase_0(moonNu_1) * sky_0.moonLight_0;
    var _S32 : f32 = f32(j_1);
    var w0_1 : f32 = (_S32 - 0.5f) / 128.0f;
    var w1_1 : f32 = (_S32 + 0.5f) / 128.0f;
    var a_2 : f32;
    if(j_1 == u32(0))
    {
        a_2 = _S26;
    }
    else
    {
        a_2 = _S26 + (_S27 - _S26) * w0_1 * w0_1;
    }
    var _S33 : f32 = max(_S26 + (_S27 - _S26) * w1_1 * w1_1 - a_2, 0.0f) / 2.0f;
    var _S34 : vec4<f32> = vec4<f32>(0.0f);
    var _S35 : vec4<f32> = vec4<f32>(1.0f);
    var i_1 : i32 = i32(0);
    var transmittance_3 : vec4<f32> = _S35;
    var radiance_3 : vec4<f32> = _S34;
    loop
    {
        if((i_1 < i32(2)))
        {
        }
        else
        {
            break;
        }
        var p_1 : vec3<f32> = sky_0.position_0 + direction_1 * vec3<f32>((a_2 + (f32(i_1) + 0.5f) * _S33));
        var _S36 : f32 = max(length(p_1), atmosphere_0.bottomRadius_1 + 0.0010000000474974513f);
        var muSun_3 : f32 = dot(p_1, sky_0.sun_0) / _S36;
        var m_2 : Medium_0 = medium_0(_S36 - atmosphere_0.bottomRadius_1);
        var scattered_3 : vec4<f32> = (m_2.rayleigh_0 * vec4<f32>(_S28) + m_2.mie_0 * vec4<f32>(_S29)) * sunTransmittance_0(_S36, muSun_3) + m_2.scattering_0 * multipleScattering_0(_S36, muSun_3);
        if(((sky_0.moonLight_0) > 0.0f))
        {
            var muMoon_1 : f32 = dot(p_1, sky_0.moon_0) / _S36;
            scattered_2 = scattered_3 + ((m_2.rayleigh_0 * vec4<f32>(_S30) + m_2.mie_0 * vec4<f32>(_S31)) * sunTransmittance_0(_S36, muMoon_1) + m_2.scattering_0 * multipleScattering_0(_S36, muMoon_1) * vec4<f32>(sky_0.moonLight_0));
        }
        else
        {
            scattered_2 = scattered_3;
        }
        var segment_1 : vec4<f32> = exp((vec4<f32>(0) - m_2.extinction_0) * vec4<f32>(_S33));
        var radiance_4 : vec4<f32> = radiance_3 + transmittance_3 * scattered_2 * (vec4<f32>(1.0f) - segment_1) / max(m_2.extinction_0, vec4<f32>(9.99999971718068537e-10f));
        var transmittance_4 : vec4<f32> = transmittance_3 * segment_1;
        i_1 = i_1 + i32(1);
        transmittance_3 = transmittance_4;
        radiance_3 = radiance_4;
    }
    scanRadiance_0[j_1] = radiance_3;
    scanTransmittance_0[j_1] = transmittance_3;
    var offset_1 : u32 = u32(1);
    loop
    {
        if((offset_1 < u32(128)))
        {
        }
        else
        {
            break;
        }
        workgroupBarrier();
        var beforeTransmittance_1 : vec4<f32>;
        if((j_1 >= offset_1))
        {
            var _S37 : u32 = j_1 - offset_1;
            scattered_2 = scanRadiance_0[_S37];
            beforeTransmittance_1 = scanTransmittance_0[_S37];
        }
        else
        {
            scattered_2 = _S34;
            beforeTransmittance_1 = _S35;
        }
        workgroupBarrier();
        var radiance_5 : vec4<f32> = scattered_2 + beforeTransmittance_1 * radiance_3;
        var transmittance_5 : vec4<f32> = beforeTransmittance_1 * transmittance_3;
        scanRadiance_0[j_1] = radiance_5;
        scanTransmittance_0[j_1] = transmittance_5;
        offset_1 = (offset_1 << (u32(1)));
        radiance_3 = radiance_5;
        transmittance_3 = transmittance_5;
    }
    var _S38 : vec3<f32> = vec3<f32>(0.0f);
    var k_1 : u32 = u32(0);
    var total_2 : vec3<f32> = _S38;
    loop
    {
        if((k_1 < u32(8)))
        {
        }
        else
        {
            break;
        }
        var total_3 : vec3<f32> = total_2 + sky_0.weights_0[k_1].xyz;
        k_1 = k_1 + u32(1);
        total_2 = total_3;
    }
    var inscatter_1 : vec3<f32> = toRgb_0(radiance_3 * atmosphere_0.solarIrradiance_0, u32(0)) * vec3<f32>(sky_0.exposure_0);
    var t_3 : vec3<f32> = (vec3<f32>(transmittance_3.x) * sky_0.weights_0[u32(0)].xyz + vec3<f32>(transmittance_3.y) * sky_0.weights_0[u32(1)].xyz + vec3<f32>(transmittance_3.z) * sky_0.weights_0[u32(2)].xyz + vec3<f32>(transmittance_3.w) * sky_0.weights_0[u32(3)].xyz) / total_2;
    var _S39 : vec2<u32> = column_1.xy;
    var at_1 : vec3<u32> = vec3<u32>(_S39, j_1);
    var atTransmittance_1 : vec3<u32> = vec3<u32>(_S39, j_1 + u32(128));
    textureStore((aerialOut_0), (at_1), (vec4<f32>(min(inscatter_1, vec3<f32>(60000.0f)), 1.0f)));
    textureStore((aerialOut_0), (atTransmittance_1), (vec4<f32>(t_3, 1.0f)));
    return;
}

struct SkyVarying_0
{
    @builtin(position) position_1 : vec4<f32>,
    @interpolate(flat) @location(0) group_1 : u32,
};

@vertex
fn skyVertex(@builtin(vertex_index) i_2 : u32, @builtin(instance_index) group_2 : u32) -> SkyVarying_0
{
    var out_0 : SkyVarying_0;
    out_0.position_1 = vec4<f32>(vec2<f32>(f32((((i_2 << (u32(1)))) & (u32(2)))), f32((i_2 & (u32(2))))) * vec2<f32>(2.0f) - vec2<f32>(1.0f), 0.0f, 1.0f);
    out_0.group_1 = group_2;
    return out_0;
}

fn starReach_0( brightest_0 : f32) -> f32
{
    var radius_1 : f32 = 3.5f * sky_0.starCore_0 * sky_0.starPixel_0 + 0.5f;
    var radius_2 : f32;
    if(((sky_0.starWingShare_0) > 0.0f))
    {
        var wing_0 : f32 = sky_0.starWing_0 * sky_0.starPixel_0;
        radius_2 = max(radius_1, wing_0 * sqrt(2.0f * log(max(brightest_0 * sky_0.starWingShare_0 / (6.2831854820251465f * wing_0 * wing_0) / 0.0020000000949949026f, 1.0f))));
    }
    else
    {
        radius_2 = radius_1;
    }
    return min(radius_2, 64.0f);
}

struct StarSplat_0
{
    @builtin(position) position_2 : vec4<f32>,
    @location(0) center_0 : vec2<f32>,
    @interpolate(flat) @location(1) light_0 : vec3<f32>,
};

@vertex
fn starVertex(@builtin(vertex_index) corner_0 : u32, @builtin(instance_index) index_0 : u32) -> StarSplat_0
{
    var out_1 : StarSplat_0;
    out_1.position_2 = vec4<f32>(2.0f, 2.0f, 0.0f, 1.0f);
    out_1.center_0 = vec2<f32>(0.0f);
    out_1.light_0 = vec3<f32>(0.0f);
    var _S40 : u32 = index_0 * u32(2);
    var a_3 : vec4<f32> = starPoints_0[_S40];
    var b_0 : vec4<f32> = starPoints_0[_S40 + u32(1)];
    var d_0 : vec3<f32> = stars_0.rows_0[i32(0)].xyz * vec3<f32>(a_3.x) + stars_0.rows_0[i32(1)].xyz * vec3<f32>(a_3.y) + stars_0.rows_0[i32(2)].xyz * vec3<f32>(a_3.z);
    var z_0 : f32 = dot(d_0, sky_0.forward_0);
    if((z_0 < 0.0099999997764825821f))
    {
        return out_1;
    }
    var pixel_0 : vec2<f32> = vec2<f32>((dot(d_0, sky_0.right_0) / (z_0 * sky_0.tanX_0) * 0.5f + 0.5f) * sky_0.size_0.x, (0.5f - dot(d_0, sky_0.up_0) / (z_0 * sky_0.tanY_0) * 0.5f) * sky_0.size_0.y);
    var pixelAngle_0 : f32 = 2.0f * sky_0.tanY_0 / sky_0.size_0.y;
    var omega_0 : f32 = pixelAngle_0 * pixelAngle_0 * z_0 * z_0 * z_0;
    var _S41 : f32 = a_3.w;
    if(((_S41 / omega_0) < (stars_0.minRadiance_0)))
    {
        return out_1;
    }
    var _S42 : vec3<f32> = min(b_0.xyz * vec3<f32>((_S41 / omega_0)), vec3<f32>(60000.0f));
    var p_2 : vec2<f32> = pixel_0 + (vec2<f32>(f32((corner_0 & (u32(1)))), f32((corner_0 >> (u32(1))))) * vec2<f32>(2.0f) - vec2<f32>(1.0f)) * vec2<f32>(starReach_0(max(_S42.x, max(_S42.y, _S42.z)) * max(sky_0.exposure_0, sky_0.starExposure_0)));
    out_1.position_2 = vec4<f32>(p_2.x / sky_0.size_0.x * 2.0f - 1.0f, 1.0f - p_2.y / sky_0.size_0.y * 2.0f, 0.0f, 1.0f);
    out_1.center_0 = pixel_0;
    out_1.light_0 = _S42;
    return out_1;
}

fn erfApprox_0( x_1 : f32) -> f32
{
    var x2_0 : f32 = x_1 * x_1;
    var _S43 : f32 = 0.14699999988079071f * x2_0;
    return f32((i32(sign((x_1))))) * sqrt(1.0f - exp(- x2_0 * (1.2732394933700562f + _S43) / (1.0f + _S43)));
}

struct pixelOutput_0
{
    @location(0) output_0 : vec4<f32>,
};

struct pixelInput_0
{
    @location(0) center_1 : vec2<f32>,
    @interpolate(flat) @location(1) light_1 : vec3<f32>,
};

@fragment
fn starFragment( _S44 : pixelInput_0, @builtin(position) position_3 : vec4<f32>) -> pixelOutput_0
{
    var d_1 : vec2<f32> = position_3.xy - _S44.center_1;
    var s_1 : f32 = 1.0f / (sqrt(2.0f) * sky_0.starCore_0 * sky_0.starPixel_0);
    var _S45 : f32 = d_1.x;
    var _S46 : f32 = d_1.y;
    var sharp_0 : f32 = 0.25f * (erfApprox_0((_S45 + 0.5f) * s_1) - erfApprox_0((_S45 - 0.5f) * s_1)) * (erfApprox_0((_S46 + 0.5f) * s_1) - erfApprox_0((_S46 - 0.5f) * s_1));
    var sharp_1 : f32;
    if(((sky_0.starWingShare_0) > 0.0f))
    {
        var wing_1 : f32 = sky_0.starWing_0 * sky_0.starPixel_0;
        sharp_1 = mix(sharp_0, exp(- dot(d_1, d_1) / (2.0f * wing_1 * wing_1)) / (6.2831854820251465f * wing_1 * wing_1), sky_0.starWingShare_0);
    }
    else
    {
        sharp_1 = sharp_0;
    }
    var _S47 : pixelOutput_0 = pixelOutput_0( vec4<f32>(_S44.light_1 * vec3<f32>(sharp_1), 0.0f) );
    return _S47;
}

@compute
@workgroup_size(64, 1, 1)
fn starCull(@builtin(global_invocation_id) id_0 : vec3<u32>)
{
    var _S48 : u32 = min(id_0.x, u32(383));
    var _S49 : u32 = _S48 * u32(2);
    var cone_0 : vec4<f32> = starCells_0[_S49];
    var span_0 : vec4<f32> = starCells_0[_S49 + u32(1)];
    var first_0 : u32 = u32(span_0.x);
    var _S50 : vec3<f32> = cone_0.xyz;
    var _S51 : f32 = - cone_0.w;
    var _S52 : bool;
    if(((dot(stars_0.planes_0[i32(0)].xyz, _S50)) >= _S51))
    {
        _S52 = ((dot(stars_0.planes_0[i32(1)].xyz, _S50)) >= _S51);
    }
    else
    {
        _S52 = false;
    }
    if(_S52)
    {
        _S52 = ((dot(stars_0.planes_0[i32(2)].xyz, _S50)) >= _S51);
    }
    else
    {
        _S52 = false;
    }
    if(_S52)
    {
        _S52 = ((dot(stars_0.planes_0[i32(3)].xyz, _S50)) >= _S51);
    }
    else
    {
        _S52 = false;
    }
    var drawn_0 : u32;
    if(_S52)
    {
        var _S53 : u32 = u32(span_0.y);
        var high_0 : u32;
        if((u32(0) < _S53))
        {
            var middle_0 : u32 = (_S53 >> (u32(1)));
            if(((starPoints_0[(first_0 + middle_0) * u32(2)].w) >= (stars_0.minIlluminance_0)))
            {
                drawn_0 = middle_0 + u32(1);
                high_0 = _S53;
            }
            else
            {
                drawn_0 = u32(0);
                high_0 = middle_0;
            }
        }
        else
        {
            drawn_0 = u32(0);
            high_0 = _S53;
        }
        if((drawn_0 < high_0))
        {
            var middle_1 : u32 = ((drawn_0 + high_0) >> (u32(1)));
            if(((starPoints_0[(first_0 + middle_1) * u32(2)].w) >= (stars_0.minIlluminance_0)))
            {
                drawn_0 = middle_1 + u32(1);
            }
            else
            {
                high_0 = middle_1;
            }
        }
        if((drawn_0 < high_0))
        {
            var middle_2 : u32 = ((drawn_0 + high_0) >> (u32(1)));
            if(((starPoints_0[(first_0 + middle_2) * u32(2)].w) >= (stars_0.minIlluminance_0)))
            {
                drawn_0 = middle_2 + u32(1);
            }
            else
            {
                high_0 = middle_2;
            }
        }
        if((drawn_0 < high_0))
        {
            var middle_3 : u32 = ((drawn_0 + high_0) >> (u32(1)));
            if(((starPoints_0[(first_0 + middle_3) * u32(2)].w) >= (stars_0.minIlluminance_0)))
            {
                drawn_0 = middle_3 + u32(1);
            }
            else
            {
                high_0 = middle_3;
            }
        }
        if((drawn_0 < high_0))
        {
            var middle_4 : u32 = ((drawn_0 + high_0) >> (u32(1)));
            if(((starPoints_0[(first_0 + middle_4) * u32(2)].w) >= (stars_0.minIlluminance_0)))
            {
                drawn_0 = middle_4 + u32(1);
            }
            else
            {
                high_0 = middle_4;
            }
        }
        if((drawn_0 < high_0))
        {
            var middle_5 : u32 = ((drawn_0 + high_0) >> (u32(1)));
            if(((starPoints_0[(first_0 + middle_5) * u32(2)].w) >= (stars_0.minIlluminance_0)))
            {
                drawn_0 = middle_5 + u32(1);
            }
            else
            {
                high_0 = middle_5;
            }
        }
        if((drawn_0 < high_0))
        {
            var middle_6 : u32 = ((drawn_0 + high_0) >> (u32(1)));
            if(((starPoints_0[(first_0 + middle_6) * u32(2)].w) >= (stars_0.minIlluminance_0)))
            {
                drawn_0 = middle_6 + u32(1);
            }
            else
            {
                high_0 = middle_6;
            }
        }
        if((drawn_0 < high_0))
        {
            var middle_7 : u32 = ((drawn_0 + high_0) >> (u32(1)));
            if(((starPoints_0[(first_0 + middle_7) * u32(2)].w) >= (stars_0.minIlluminance_0)))
            {
                drawn_0 = middle_7 + u32(1);
            }
            else
            {
                high_0 = middle_7;
            }
        }
        if((drawn_0 < high_0))
        {
            var middle_8 : u32 = ((drawn_0 + high_0) >> (u32(1)));
            if(((starPoints_0[(first_0 + middle_8) * u32(2)].w) >= (stars_0.minIlluminance_0)))
            {
                drawn_0 = middle_8 + u32(1);
            }
            else
            {
                high_0 = middle_8;
            }
        }
        if((drawn_0 < high_0))
        {
            var middle_9 : u32 = ((drawn_0 + high_0) >> (u32(1)));
            if(((starPoints_0[(first_0 + middle_9) * u32(2)].w) >= (stars_0.minIlluminance_0)))
            {
                drawn_0 = middle_9 + u32(1);
            }
            else
            {
                high_0 = middle_9;
            }
        }
        if((drawn_0 < high_0))
        {
            var middle_10 : u32 = ((drawn_0 + high_0) >> (u32(1)));
            if(((starPoints_0[(first_0 + middle_10) * u32(2)].w) >= (stars_0.minIlluminance_0)))
            {
                drawn_0 = middle_10 + u32(1);
            }
            else
            {
                high_0 = middle_10;
            }
        }
        if((drawn_0 < high_0))
        {
            var middle_11 : u32 = ((drawn_0 + high_0) >> (u32(1)));
            if(((starPoints_0[(first_0 + middle_11) * u32(2)].w) >= (stars_0.minIlluminance_0)))
            {
                drawn_0 = middle_11 + u32(1);
            }
            else
            {
                high_0 = middle_11;
            }
        }
        if((drawn_0 < high_0))
        {
            var middle_12 : u32 = ((drawn_0 + high_0) >> (u32(1)));
            if(((starPoints_0[(first_0 + middle_12) * u32(2)].w) >= (stars_0.minIlluminance_0)))
            {
                drawn_0 = middle_12 + u32(1);
            }
            else
            {
                high_0 = middle_12;
            }
        }
        if((drawn_0 < high_0))
        {
            var middle_13 : u32 = ((drawn_0 + high_0) >> (u32(1)));
            if(((starPoints_0[(first_0 + middle_13) * u32(2)].w) >= (stars_0.minIlluminance_0)))
            {
                drawn_0 = middle_13 + u32(1);
            }
            else
            {
                high_0 = middle_13;
            }
        }
        if((drawn_0 < high_0))
        {
            var middle_14 : u32 = ((drawn_0 + high_0) >> (u32(1)));
            if(((starPoints_0[(first_0 + middle_14) * u32(2)].w) >= (stars_0.minIlluminance_0)))
            {
                drawn_0 = middle_14 + u32(1);
            }
            else
            {
                high_0 = middle_14;
            }
        }
        if((drawn_0 < high_0))
        {
            var middle_15 : u32 = ((drawn_0 + high_0) >> (u32(1)));
            if(((starPoints_0[(first_0 + middle_15) * u32(2)].w) >= (stars_0.minIlluminance_0)))
            {
                drawn_0 = middle_15 + u32(1);
            }
            else
            {
                high_0 = middle_15;
            }
        }
        if((drawn_0 < high_0))
        {
            var middle_16 : u32 = ((drawn_0 + high_0) >> (u32(1)));
            if(((starPoints_0[(first_0 + middle_16) * u32(2)].w) >= (stars_0.minIlluminance_0)))
            {
                drawn_0 = middle_16 + u32(1);
            }
            else
            {
                high_0 = middle_16;
            }
        }
        if((drawn_0 < high_0))
        {
            var middle_17 : u32 = ((drawn_0 + high_0) >> (u32(1)));
            if(((starPoints_0[(first_0 + middle_17) * u32(2)].w) >= (stars_0.minIlluminance_0)))
            {
                drawn_0 = middle_17 + u32(1);
            }
            else
            {
                high_0 = middle_17;
            }
        }
        if((drawn_0 < high_0))
        {
            var middle_18 : u32 = ((drawn_0 + high_0) >> (u32(1)));
            if(((starPoints_0[(first_0 + middle_18) * u32(2)].w) >= (stars_0.minIlluminance_0)))
            {
                drawn_0 = middle_18 + u32(1);
            }
            else
            {
                high_0 = middle_18;
            }
        }
        if((drawn_0 < high_0))
        {
            var middle_19 : u32 = ((drawn_0 + high_0) >> (u32(1)));
            if(((starPoints_0[(first_0 + middle_19) * u32(2)].w) >= (stars_0.minIlluminance_0)))
            {
                drawn_0 = middle_19 + u32(1);
            }
            else
            {
                high_0 = middle_19;
            }
        }
        if((drawn_0 < high_0))
        {
            var middle_20 : u32 = ((drawn_0 + high_0) >> (u32(1)));
            if(((starPoints_0[(first_0 + middle_20) * u32(2)].w) >= (stars_0.minIlluminance_0)))
            {
                drawn_0 = middle_20 + u32(1);
            }
            else
            {
                high_0 = middle_20;
            }
        }
        if((drawn_0 < high_0))
        {
            var middle_21 : u32 = ((drawn_0 + high_0) >> (u32(1)));
            if(((starPoints_0[(first_0 + middle_21) * u32(2)].w) >= (stars_0.minIlluminance_0)))
            {
                drawn_0 = middle_21 + u32(1);
            }
            else
            {
                high_0 = middle_21;
            }
        }
        if((drawn_0 < high_0))
        {
            var middle_22 : u32 = ((drawn_0 + high_0) >> (u32(1)));
            if(((starPoints_0[(first_0 + middle_22) * u32(2)].w) >= (stars_0.minIlluminance_0)))
            {
                drawn_0 = middle_22 + u32(1);
            }
            else
            {
                high_0 = middle_22;
            }
        }
        if((drawn_0 < high_0))
        {
            var middle_23 : u32 = ((drawn_0 + high_0) >> (u32(1)));
            if(((starPoints_0[(first_0 + middle_23) * u32(2)].w) >= (stars_0.minIlluminance_0)))
            {
                drawn_0 = middle_23 + u32(1);
            }
        }
    }
    else
    {
        drawn_0 = u32(0);
    }
    var _S54 : u32 = _S48 * u32(4);
    starArgs_0[_S54] = u32(4);
    starArgs_0[_S54 + u32(1)] = drawn_0;
    starArgs_0[_S54 + u32(2)] = u32(0);
    starArgs_0[_S54 + u32(3)] = first_0;
    return;
}

fn viewDirection_0( pixel_1 : vec2<f32>) -> vec3<f32>
{
    return normalize(sky_0.forward_0 + sky_0.right_0 * vec3<f32>(((pixel_1.x / sky_0.size_0.x * 2.0f - 1.0f) * sky_0.tanX_0)) + sky_0.up_0 * vec3<f32>(((1.0f - pixel_1.y / sky_0.size_0.y * 2.0f) * sky_0.tanY_0)));
}

struct Scattered_0
{
     radiance_6 : vec4<f32>,
     transmittance_6 : vec4<f32>,
     transfer_0 : vec4<f32>,
};

fn march_0( position_4 : vec3<f32>,  direction_2 : vec3<f32>,  sun_1 : vec3<f32>,  maxLength_0 : f32,  steps_1 : i32,  uniformPhase_0 : bool) -> Scattered_0
{
    var a_4 : Atmosphere_std140_0 = atmosphere_0;
    var out_2 : Scattered_0;
    var _S55 : vec4<f32> = vec4<f32>(0.0f);
    out_2.radiance_6 = _S55;
    out_2.transfer_0 = _S55;
    out_2.transmittance_6 = vec4<f32>(1.0f);
    var r_6 : f32 = length(position_4);
    var mu_6 : f32 = dot(position_4, direction_2) / r_6;
    var ground_0 : bool = hitsGround_0(r_6, mu_6);
    var end_0 : f32;
    if(ground_0)
    {
        end_0 = sphereDistance_0(r_6, mu_6, a_4.bottomRadius_1, true);
    }
    else
    {
        end_0 = sphereDistance_0(r_6, mu_6, a_4.topRadius_0, false);
    }
    var start_0 : f32;
    var _S56 : bool;
    if((r_6 > (a_4.topRadius_0)))
    {
        var enter_0 : f32 = sphereDistance_0(r_6, mu_6, a_4.topRadius_0, true);
        if((enter_0 < 0.0f))
        {
            _S56 = true;
        }
        else
        {
            _S56 = (end_0 < 0.0f);
        }
        if(_S56)
        {
            return out_2;
        }
        start_0 = enter_0;
    }
    else
    {
        start_0 = 0.0f;
    }
    var _S57 : f32 = min(end_0, maxLength_0);
    if((_S57 <= start_0))
    {
        return out_2;
    }
    var nu_2 : f32 = dot(direction_2, sun_1);
    if(uniformPhase_0)
    {
        end_0 = 0.07957746833562851f;
    }
    else
    {
        end_0 = rayleighPhase_0(nu_2);
    }
    var _S58 : f32;
    if(uniformPhase_0)
    {
        _S58 = 0.07957746833562851f;
    }
    else
    {
        _S58 = miePhase_0(nu_2);
    }
    var _S59 : f32 = (_S57 - start_0) / f32(steps_1);
    var i_3 : i32 = i32(0);
    loop
    {
        if((i_3 < steps_1))
        {
        }
        else
        {
            break;
        }
        var p_3 : vec3<f32> = position_4 + direction_2 * vec3<f32>((start_0 + (f32(i_3) + 0.5f) * _S59));
        var rp_0 : f32 = length(p_3);
        var muSun_4 : f32 = dot(p_3, sun_1) / rp_0;
        var m_3 : Medium_0 = medium_0(rp_0 - a_4.bottomRadius_1);
        var scattered_4 : vec4<f32> = (m_3.rayleigh_0 * vec4<f32>(end_0) + m_3.mie_0 * vec4<f32>(_S58)) * sunTransmittance_0(rp_0, muSun_4);
        var scattered_5 : vec4<f32>;
        if(!uniformPhase_0)
        {
            scattered_5 = scattered_4 + m_3.scattering_0 * multipleScattering_0(rp_0, muSun_4);
        }
        else
        {
            scattered_5 = scattered_4;
        }
        var segment_2 : vec4<f32> = exp((vec4<f32>(0) - m_3.extinction_0) * vec4<f32>(_S59));
        var integral_0 : vec4<f32> = (vec4<f32>(1.0f) - segment_2) / max(m_3.extinction_0, vec4<f32>(9.99999971718068537e-10f));
        out_2.radiance_6 = out_2.radiance_6 + out_2.transmittance_6 * scattered_5 * integral_0;
        out_2.transfer_0 = out_2.transfer_0 + out_2.transmittance_6 * m_3.scattering_0 * integral_0;
        out_2.transmittance_6 = out_2.transmittance_6 * segment_2;
        i_3 = i_3 + i32(1);
    }
    if(ground_0)
    {
        _S56 = (_S57 < maxLength_0);
    }
    else
    {
        _S56 = false;
    }
    if(_S56)
    {
        var p_4 : vec3<f32> = position_4 + direction_2 * vec3<f32>(_S57);
        var muSun_5 : f32 = dot(normalize(p_4), sun_1);
        out_2.radiance_6 = out_2.radiance_6 + out_2.transmittance_6 * vec4<f32>(a_4.groundAlbedo_0) / vec4<f32>(3.1415927410125732f) * vec4<f32>(max(muSun_5, 0.0f)) * sunTransmittance_0(length(p_4), muSun_5);
    }
    return out_2;
}

fn skyAlong_0( direction_3 : vec3<f32>,  sun_2 : vec3<f32>) -> vec4<f32>
{
    return march_0(sky_0.position_0, direction_3, sun_2, 1.0e+09f, i32(sky_0.steps_0), false).radiance_6 * atmosphere_0.solarIrradiance_0;
}

fn sunDisk_0( direction_4 : vec3<f32>) -> f32
{
    if(((sky_0.sunCos_0) > 1.0f))
    {
        return 0.0f;
    }
    var cosAngle_0 : f32 = dot(direction_4, sky_0.sun_0);
    var pixel_2 : f32 = 2.0f * sky_0.tanY_0 / sky_0.size_0.y;
    var sinRadius_0 : f32 = sqrt(max(0.0f, 1.0f - sky_0.sunCos_0 * sky_0.sunCos_0));
    var sinAngle_0 : f32 = sqrt(max(0.0f, 1.0f - cosAngle_0 * cosAngle_0));
    var _S60 : bool;
    if((cosAngle_0 <= 0.0f))
    {
        _S60 = true;
    }
    else
    {
        _S60 = (sinAngle_0 >= (sinRadius_0 + pixel_2));
    }
    if(_S60)
    {
        return 0.0f;
    }
    var _S61 : f32 = min(sinAngle_0 / sinRadius_0, 1.0f);
    return (1.0f - 0.60000002384185791f * (1.0f - sqrt(max(0.0f, 1.0f - _S61 * _S61)))) / 0.80000001192092896f * clamp((sinRadius_0 - sinAngle_0) / pixel_2 + 0.5f, 0.0f, 1.0f);
}

fn luminanceShare_0( t_4 : vec4<f32>,  group_3 : u32) -> f32
{
    const y_0 : vec3<f32> = vec3<f32>(0.2125999927520752f, 0.71520000696182251f, 0.072200000286102295f);
    var b_1 : u32 = u32(0);
    var total_4 : f32 = 0.0f;
    loop
    {
        if((b_1 < u32(8)))
        {
        }
        else
        {
            break;
        }
        var total_5 : f32 = total_4 + dot(sky_0.weights_0[b_1].xyz, y_0);
        b_1 = b_1 + u32(1);
        total_4 = total_5;
    }
    var base_1 : u32 = group_3 * u32(4);
    return (t_4.x * dot(sky_0.weights_0[base_1].xyz, y_0) + t_4.y * dot(sky_0.weights_0[base_1 + u32(1)].xyz, y_0) + t_4.z * dot(sky_0.weights_0[base_1 + u32(2)].xyz, y_0) + t_4.w * dot(sky_0.weights_0[base_1 + u32(3)].xyz, y_0)) / total_4;
}

fn sphereSpan_0( r_7 : f32,  mu_7 : f32,  radius_3 : f32,  a_5 : f32,  b_2 : f32) -> f32
{
    var disc_1 : f32 = r_7 * r_7 * (mu_7 * mu_7 - 1.0f) + radius_3 * radius_3;
    var _S62 : bool;
    if((disc_1 <= 0.0f))
    {
        _S62 = true;
    }
    else
    {
        _S62 = (b_2 <= a_5);
    }
    if(_S62)
    {
        return 0.0f;
    }
    var s_2 : f32 = sqrt(disc_1);
    var _S63 : f32 = - r_7 * mu_7;
    return max(min(_S63 + s_2, b_2) - max(_S63 - s_2, a_5), 0.0f);
}

fn cityGlow_0( height_0 : f32,  mu_8 : f32,  ground_1 : bool) -> vec3<f32>
{
    if(((sky_0.cityLight_0) <= 0.0f))
    {
        return vec3<f32>(0.0f);
    }
    if(ground_1)
    {
        return vec3<f32>(1.25f, 0.94999998807907104f, 0.62000000476837158f) * vec3<f32>((sky_0.cityLight_0 * 0.5f));
    }
    var _S64 : f32 = - max(height_0, 0.0f);
    return vec3<f32>(1.25f, 0.94999998807907104f, 0.62000000476837158f) * vec3<f32>((sky_0.cityLight_0 * 0.10000000149011612f * (1.0f + 2.0f * pow(1.0f - clamp(mu_8, 0.0f, 1.0f), 3.0f)) * (0.60000002384185791f * exp(_S64 / 1.5f) + 0.40000000596046448f * exp(_S64 / 8.0f)) * 0.5f));
}

fn nightGlow_0( r_8 : f32,  mu_9 : f32,  ground_2 : bool,  toSpace_0 : f32) -> vec3<f32>
{
    var bottom_1 : f32 = atmosphere_0.bottomRadius_1;
    var end_1 : f32;
    if(ground_2)
    {
        end_1 = sphereDistance_0(r_8, mu_9, bottom_1, true);
    }
    else
    {
        end_1 = 1.0e+09f;
    }
    var lowest_0 : f32 = clamp(- r_8 * mu_9, 0.0f, end_1);
    var r1_0 : f32 = bottom_1 + 87.0f;
    var r2_0 : f32 = bottom_1 + 97.0f;
    var far_0 : f32 = sphereSpan_0(r_8, mu_9, r2_0, lowest_0, end_1) - sphereSpan_0(r_8, mu_9, r1_0, lowest_0, end_1);
    var _S65 : f32 = (sphereSpan_0(r_8, mu_9, r2_0, 0.0f, lowest_0) - sphereSpan_0(r_8, mu_9, r1_0, 0.0f, lowest_0)) * 0.5f;
    if(ground_2)
    {
        end_1 = 0.5f;
    }
    else
    {
        end_1 = toSpace_0;
    }
    return vec3<f32>(0.85500001907348633f, 1.0690000057220459f, 0.74800002574920654f) * vec3<f32>(1.4000000192027073e-05f) * vec3<f32>((_S65 + far_0 * end_1)) + vec3<f32>(1.0700000524520874f, 0.99000000953674316f, 0.86000001430511475f) * vec3<f32>(7.9999997979030013e-05f) * vec3<f32>(toSpace_0) + cityGlow_0(r_8 - bottom_1, mu_9, ground_2);
}

struct MarchedSky_0
{
     color_0 : vec3<f32>,
     toSpace_1 : f32,
     transmittance_7 : vec4<f32>,
};

fn marchedSky_0( pixel_3 : vec2<f32>,  group_4 : u32) -> MarchedSky_0
{
    var seen_0 : vec3<f32> = viewDirection_0(pixel_3);
    var direction_5 : vec3<f32> = normalize(sky_0.shape_0 * seen_0);
    var sun_3 : vec3<f32> = normalize(sky_0.shape_0 * sky_0.sun_0);
    var s_3 : Scattered_0 = march_0(sky_0.position_0, direction_5, sun_3, 1.0e+09f, i32(sky_0.steps_0), false);
    var _S66 : vec4<f32> = s_3.radiance_6 * atmosphere_0.solarIrradiance_0;
    var r0_0 : f32 = length(sky_0.position_0);
    var mu0_0 : f32 = dot(sky_0.position_0, direction_5) / r0_0;
    var closest_0 : f32 = r0_0 * sqrt(max(0.0f, 1.0f - mu0_0 * mu0_0));
    var pixelAngle_1 : f32 = 2.0f * sky_0.tanY_0 / sky_0.size_0.y;
    var footprint_0 : f32 = max(- r0_0 * mu0_0, 0.0f) * pixelAngle_1;
    var _S67 : bool;
    if((r0_0 > (atmosphere_0.topRadius_0)))
    {
        _S67 = (mu0_0 < 0.0f);
    }
    else
    {
        _S67 = false;
    }
    if(_S67)
    {
        _S67 = (closest_0 < (atmosphere_0.topRadius_0 + footprint_0));
    }
    else
    {
        _S67 = false;
    }
    if(_S67)
    {
        _S67 = (closest_0 > (atmosphere_0.bottomRadius_1 - footprint_0));
    }
    else
    {
        _S67 = false;
    }
    var spectral_1 : vec4<f32>;
    if(_S67)
    {
        var center_2 : vec3<f32> = (vec3<f32>(0) - sky_0.position_0) / vec3<f32>(r0_0);
        var _S68 : vec3<f32> = normalize(center_2 - direction_5 * vec3<f32>(dot(center_2, direction_5)));
        var _S69 : vec4<f32> = vec4<f32>(0.0f);
        var k_2 : i32 = i32(0);
        spectral_1 = _S69;
        loop
        {
            if((k_2 < i32(8)))
            {
            }
            else
            {
                break;
            }
            var sum_0 : vec4<f32> = spectral_1 + skyAlong_0(normalize(direction_5 + _S68 * vec3<f32>((((f32(k_2) + 0.5f) / 8.0f - 0.5f) * pixelAngle_1))), sun_3);
            k_2 = k_2 + i32(1);
            spectral_1 = sum_0;
        }
        spectral_1 = spectral_1 * vec4<f32>(0.125f);
    }
    else
    {
        spectral_1 = _S66;
    }
    var r_9 : f32 = length(sky_0.position_0);
    var mu_10 : f32 = dot(sky_0.position_0, direction_5) / r_9;
    var ground_3 : bool = hitsGround_0(r_9, mu_10);
    if(!ground_3)
    {
        spectral_1 = spectral_1 + atmosphere_0.solarIrradiance_0 / vec4<f32>(sky_0.sunSolidAngle_0) * vec4<f32>(sunDisk_0(seen_0)) * s_3.transmittance_6;
    }
    if(((sky_0.moonLight_0) > 0.0f))
    {
        spectral_1 = spectral_1 + march_0(sky_0.position_0, direction_5, normalize(sky_0.shape_0 * sky_0.moon_0), 1.0e+09f, i32(sky_0.steps_0), false).radiance_6 * atmosphere_0.solarIrradiance_0 * vec4<f32>(sky_0.moonLight_0);
    }
    var toSpace_2 : f32;
    if(ground_3)
    {
        toSpace_2 = 0.0f;
    }
    else
    {
        toSpace_2 = luminanceShare_0(s_3.transmittance_6, group_4);
    }
    var result_0 : MarchedSky_0;
    result_0.color_0 = (toRgb_0(spectral_1, group_4) + nightGlow_0(r_9, mu_10, ground_3, toSpace_2)) * vec3<f32>(sky_0.exposure_0);
    result_0.toSpace_1 = toSpace_2;
    if(ground_3)
    {
        spectral_1 = vec4<f32>(0.0f);
    }
    else
    {
        spectral_1 = s_3.transmittance_6;
    }
    result_0.transmittance_7 = spectral_1;
    return result_0;
}

struct pixelOutput_1
{
    @location(0) output_1 : vec4<f32>,
};

struct pixelInput_1
{
    @interpolate(flat) @location(0) group_5 : u32,
};

@fragment
fn skyFragment( _S70 : pixelInput_1, @builtin(position) position_5 : vec4<f32>) -> pixelOutput_1
{
    var _S71 : pixelOutput_1 = pixelOutput_1( vec4<f32>(min(marchedSky_0(position_5.xy, _S70.group_5).color_0, vec3<f32>(30000.0f)), 1.0f) );
    return _S71;
}

struct MoonSample_0
{
     radiance_7 : f32,
     coverage_0 : f32,
};

fn moonSample_0( radiance_8 : f32,  coverage_1 : f32) -> MoonSample_0
{
    var s_4 : MoonSample_0;
    s_4.radiance_7 = radiance_8;
    s_4.coverage_0 = coverage_1;
    return s_4;
}

fn moonSurface_0( direction_6 : vec3<f32>) -> vec3<f32>
{
    var m_4 : vec3<f32> = sky_0.moon_0;
    var q_0 : vec3<f32> = (direction_6 - sky_0.moon_0 * vec3<f32>(dot(direction_6, sky_0.moon_0))) / vec3<f32>(sky_0.moonSize_0);
    var q2_0 : f32 = dot(q_0, q_0);
    var q_1 : vec3<f32>;
    if((q2_0 > 1.0f))
    {
        q_1 = q_0 * vec3<f32>(inverseSqrt(q2_0));
    }
    else
    {
        q_1 = q_0;
    }
    return q_1 - m_4 * vec3<f32>(sqrt(max(0.0f, 1.0f - dot(q_1, q_1))));
}

fn moonUv_0( normal_0 : vec3<f32>) -> vec2<f32>
{
    return vec2<f32>(0.5f + atan2(dot(normal_0, cross(sky_0.moonZ_0, sky_0.moonX_0)), dot(normal_0, sky_0.moonX_0)) / 6.2831854820251465f, 0.5f - asin(clamp(dot(normal_0, sky_0.moonZ_0), -1.0f, 1.0f)) / 3.1415927410125732f);
}

fn moonDisk_0( direction_7 : vec3<f32>) -> MoonSample_0
{
    var m_5 : vec3<f32> = sky_0.moon_0;
    var k_3 : f32 = sky_0.moonSize_0;
    var _S72 : bool;
    if(((sky_0.moonSize_0) <= 0.0f))
    {
        _S72 = true;
    }
    else
    {
        _S72 = ((dot(direction_7, m_5)) <= 0.0f);
    }
    if(_S72)
    {
        return moonSample_0(0.0f, 0.0f);
    }
    var pixel_4 : f32 = 2.0f * sky_0.tanY_0 / sky_0.size_0.y;
    var sinAngle_1 : f32 = length(direction_7 - m_5 * vec3<f32>(dot(direction_7, m_5)));
    if((sinAngle_1 >= (k_3 + pixel_4)))
    {
        return moonSample_0(0.0f, 0.0f);
    }
    var coverage_2 : f32 = clamp((k_3 - sinAngle_1) / pixel_4 + 0.5f, 0.0f, 1.0f);
    var normal_1 : vec3<f32> = moonSurface_0(direction_7);
    var mu_11 : f32 = - dot(normal_1, m_5);
    var mu0_1 : f32 = dot(normal_1, sky_0.moonSun_0);
    var uv_0 : vec2<f32> = moonUv_0(normal_1);
    var _S73 : vec3<f32>;
    if(((abs(m_5.z)) > 0.89999997615814209f))
    {
        _S73 = vec3<f32>(1.0f, 0.0f, 0.0f);
    }
    else
    {
        _S73 = vec3<f32>(0.0f, 0.0f, 1.0f);
    }
    var across_0 : vec3<f32> = normalize(cross(m_5, _S73));
    var _S74 : vec3<f32> = vec3<f32>(pixel_4);
    var _S75 : vec2<f32> = moonUv_0(moonSurface_0(direction_7 + across_0 * _S74)) - uv_0;
    var dx_0 : vec2<f32> = _S75;
    var _S76 : vec2<f32> = moonUv_0(moonSurface_0(direction_7 + cross(m_5, across_0) * _S74)) - uv_0;
    var dy_0 : vec2<f32> = _S76;
    dx_0[i32(0)] = dx_0[i32(0)] - round(_S75.x);
    dy_0[i32(0)] = dy_0[i32(0)] - round(_S76.x);
    var albedo_0 : f32 = dot((textureSampleGrad((moonMap_0), (starSampler_0), (uv_0), (dx_0), (dy_0))).xyz, vec3<f32>(0.2125999927520752f, 0.71520000696182251f, 0.072200000286102295f));
    var sunlit_0 : f32;
    if((mu0_1 > 0.0f))
    {
        sunlit_0 = sky_0.moonScale_0 * 2.0f * mu0_1 / (mu0_1 + mu_11);
    }
    else
    {
        sunlit_0 = 0.0f;
    }
    return moonSample_0((sunlit_0 + sky_0.earthshine_0) * albedo_0 * coverage_2, coverage_2);
}

fn starLight_0( pixel_5 : vec2<f32>,  direction_8 : vec3<f32>) -> vec3<f32>
{
    var _S77 : vec3<i32> = vec3<i32>(vec2<i32>(pixel_5), i32(0));
    return (textureLoad((starLayer_0), ((_S77)).xy, ((_S77)).z)).xyz + (textureSampleLevel((starBackground_0), (starSampler_0), (vec3<f32>(dot(stars_0.rows_0[i32(0)].xyz, direction_8), dot(stars_0.rows_0[i32(1)].xyz, direction_8), dot(stars_0.rows_0[i32(2)].xyz, direction_8))), (0.0f))).xyz * vec3<f32>(stars_0.rows_0[i32(0)].w);
}

fn starExposure_1( background_0 : vec3<f32>,  share_0 : f32) -> f32
{
    return sky_0.exposure_0 + max(sky_0.starExposure_0 - sky_0.exposure_0, 0.0f) * (1.0f - smoothstep(0.0020000000949949026f, 0.029999999329447746f, dot(background_0, vec3<f32>(0.2125999927520752f, 0.71520000696182251f, 0.072200000286102295f)) / share_0));
}

struct pixelOutput_2
{
    @location(0) output_2 : vec4<f32>,
};

struct pixelInput_2
{
    @interpolate(flat) @location(0) group_6 : u32,
};

@fragment
fn skyStarsFragment( _S78 : pixelInput_2, @builtin(position) position_6 : vec4<f32>) -> pixelOutput_2
{
    var _S79 : vec2<f32> = position_6.xy;
    var m_6 : MarchedSky_0 = marchedSky_0(_S79, _S78.group_6);
    var direction_9 : vec3<f32> = viewDirection_0(_S79);
    var moon_1 : MoonSample_0 = moonDisk_0(direction_9);
    var _S80 : pixelOutput_2 = pixelOutput_2( vec4<f32>(min(m_6.color_0 + toRgb_0(atmosphere_0.solarIrradiance_0 * vec4<f32>(moon_1.radiance_7) * m_6.transmittance_7, _S78.group_6) * vec3<f32>(sky_0.exposure_0) + starLight_0(_S79, direction_9) * vec3<f32>(m_6.toSpace_1) * vec3<f32>(starExposure_1(m_6.color_0, 0.5f)) * vec3<f32>((1.0f - moon_1.coverage_0)), vec3<f32>(30000.0f)), 1.0f) );
    return _S80;
}

struct SkyFrame_0
{
     up_1 : vec3<f32>,
     toward_0 : vec3<f32>,
     side_0 : vec3<f32>,
};

fn frameToward_0( light_2 : vec3<f32>) -> SkyFrame_0
{
    var up_2 : vec3<f32> = normalize(sky_0.position_0);
    var toward_1 : vec3<f32> = light_2 - up_2 * vec3<f32>(dot(light_2, up_2));
    var toward_2 : vec3<f32>;
    if(((dot(toward_1, toward_1)) < 1.00000001335143196e-10f))
    {
        if(((abs(up_2.x)) > 0.89999997615814209f))
        {
            toward_2 = vec3<f32>(0.0f, 1.0f, 0.0f);
        }
        else
        {
            toward_2 = vec3<f32>(1.0f, 0.0f, 0.0f);
        }
        toward_2 = cross(up_2, toward_2);
    }
    else
    {
        toward_2 = toward_1;
    }
    var toward_3 : vec3<f32> = normalize(toward_2);
    var f_0 : SkyFrame_0;
    f_0.up_1 = up_2;
    f_0.toward_0 = toward_3;
    f_0.side_0 = cross(up_2, toward_3);
    return f_0;
}

fn skyFrame_0() -> SkyFrame_0
{
    return frameToward_0(sky_0.sun_0);
}

fn texelToUnit_0( u_0 : f32,  size_2 : f32) -> f32
{
    return (u_0 - 0.5f / size_2) / (1.0f - 1.0f / size_2);
}

fn skyViewAngles_0( unit_0 : vec2<f32>,  r_10 : f32,  bottom_2 : f32) -> vec2<f32>
{
    var beta_0 : f32 = acos(sqrt(max(0.0f, r_10 * r_10 - bottom_2 * bottom_2)) / r_10);
    var horizon_0 : f32 = 3.1415927410125732f - beta_0;
    var _S81 : f32 = unit_0.y;
    var zenith_0 : f32;
    if((_S81 < 0.5f))
    {
        var c_0 : f32 = 1.0f - _S81 * 2.0f;
        zenith_0 = horizon_0 * (1.0f - c_0 * c_0);
    }
    else
    {
        var c_1 : f32 = _S81 * 2.0f - 1.0f;
        zenith_0 = horizon_0 + beta_0 * c_1 * c_1;
    }
    var _S82 : f32 = unit_0.x;
    return vec2<f32>(zenith_0, 1.0f - 2.0f * (_S82 * _S82));
}

fn tableDirection_0( unit_1 : vec2<f32>,  r_11 : f32,  f_1 : SkyFrame_0) -> vec3<f32>
{
    var angles_0 : vec2<f32> = skyViewAngles_0(unit_1, r_11, atmosphere_0.bottomRadius_1);
    var _S83 : f32 = angles_0.x;
    var cosAzimuth_0 : f32 = angles_0.y;
    return f_1.up_1 * vec3<f32>(cos(_S83)) + (f_1.toward_0 * vec3<f32>(cosAzimuth_0) + f_1.side_0 * vec3<f32>(sqrt(max(0.0f, 1.0f - cosAzimuth_0 * cosAzimuth_0)))) * vec3<f32>(sin(_S83));
}

struct pixelOutput_3
{
    @location(0) output_3 : vec4<f32>,
};

struct pixelInput_3
{
    @interpolate(flat) @location(0) group_7 : u32,
};

@fragment
fn skyViewFragment( _S84 : pixelInput_3, @builtin(position) position_7 : vec4<f32>) -> pixelOutput_3
{
    var r_12 : f32 = length(sky_0.position_0);
    var f_2 : SkyFrame_0 = skyFrame_0();
    var _S85 : vec4<f32> = vec4<f32>(0.0f);
    var _S86 : f32 = position_7.y;
    var spectral_2 : vec4<f32>;
    if((_S86 >= 109.0f))
    {
        if(((sky_0.moonLight_0) <= 0.0f))
        {
            var _S87 : pixelOutput_3 = pixelOutput_3( _S85 );
            return _S87;
        }
        spectral_2 = march_0(sky_0.position_0, tableDirection_0(vec2<f32>(texelToUnit_0(position_7.x / 192.0f, 192.0f), texelToUnit_0((_S86 - 109.0f) / 108.0f, 108.0f)), r_12, frameToward_0(sky_0.moon_0)), sky_0.moon_0, 1.0e+09f, i32(30), false).radiance_6 * atmosphere_0.solarIrradiance_0 * vec4<f32>(sky_0.moonLight_0);
    }
    else
    {
        if((_S86 >= 108.0f))
        {
            var _S88 : f32 = position_7.x;
            if((_S88 >= 1.0f))
            {
                var _S89 : bool;
                if((_S88 < 2.0f))
                {
                    _S89 = ((sky_0.moonSize_0) > 0.0f);
                }
                else
                {
                    _S89 = false;
                }
                if(_S89)
                {
                    var _S90 : pixelOutput_3 = pixelOutput_3( vec4<f32>(toRgb_0(atmosphere_0.solarIrradiance_0 * sunTransmittance_0(r_12, dot(f_2.up_1, sky_0.moon_0)), _S84.group_7) * vec3<f32>(9.9999997473787516e-06f), 0.0f) );
                    return _S90;
                }
                var _S91 : pixelOutput_3 = pixelOutput_3( _S85 );
                return _S91;
            }
            if(((sky_0.sunCos_0) <= 1.0f))
            {
                spectral_2 = atmosphere_0.solarIrradiance_0 / vec4<f32>(sky_0.sunSolidAngle_0) * sunTransmittance_0(r_12, dot(f_2.up_1, sky_0.sun_0));
            }
            else
            {
                spectral_2 = _S85;
            }
        }
        else
        {
            var direction_10 : vec3<f32> = tableDirection_0(vec2<f32>(texelToUnit_0(position_7.x / 192.0f, 192.0f), texelToUnit_0(_S86 / 108.0f, 108.0f)), r_12, f_2);
            var s_5 : Scattered_0 = march_0(sky_0.position_0, direction_10, sky_0.sun_0, 1.0e+09f, i32(30), false);
            var spectral_3 : vec4<f32> = s_5.radiance_6 * atmosphere_0.solarIrradiance_0;
            var mu_12 : f32 = dot(sky_0.position_0, direction_10) / r_12;
            var ground_4 : bool = hitsGround_0(r_12, mu_12);
            var toSpace_3 : f32;
            if(!ground_4)
            {
                toSpace_3 = luminanceShare_0(s_5.transmittance_6, _S84.group_7);
            }
            else
            {
                toSpace_3 = 0.0f;
            }
            var _S92 : pixelOutput_3 = pixelOutput_3( vec4<f32>(min((toRgb_0(spectral_3, _S84.group_7) + nightGlow_0(r_12, mu_12, ground_4, toSpace_3)) * vec3<f32>(sky_0.exposure_0), vec3<f32>(30000.0f)), toSpace_3) );
            return _S92;
        }
    }
    var _S93 : pixelOutput_3 = pixelOutput_3( vec4<f32>(min(toRgb_0(spectral_2, _S84.group_7) * vec3<f32>(sky_0.exposure_0), vec3<f32>(30000.0f)), 0.0f) );
    return _S93;
}

fn skyViewUnit_0( cosZenith_0 : f32,  cosAzimuth_1 : f32,  ground_5 : bool,  r_13 : f32,  bottom_3 : f32) -> vec2<f32>
{
    var beta_1 : f32 = acos(sqrt(max(0.0f, r_13 * r_13 - bottom_3 * bottom_3)) / r_13);
    var horizon_1 : f32 = 3.1415927410125732f - beta_1;
    var zenith_1 : f32 = acos(clamp(cosZenith_0, -1.0f, 1.0f));
    var y_1 : f32;
    if(!ground_5)
    {
        y_1 = (1.0f - sqrt(1.0f - clamp(zenith_1 / horizon_1, 0.0f, 1.0f))) * 0.5f;
    }
    else
    {
        y_1 = sqrt(clamp((zenith_1 - horizon_1) / beta_1, 0.0f, 1.0f)) * 0.5f + 0.5f;
    }
    return vec2<f32>(sqrt(clamp(0.5f - cosAzimuth_1 * 0.5f, 0.0f, 1.0f)), y_1);
}

fn tableTexel_0( direction_11 : vec3<f32>,  f_3 : SkyFrame_0,  first_1 : f32,  ground_6 : bool,  r_14 : f32) -> vec4<f32>
{
    var cosZenith_1 : f32 = dot(direction_11, f_3.up_1);
    var horizontal_0 : vec3<f32> = direction_11 - f_3.up_1 * vec3<f32>(cosZenith_1);
    var length2_0 : f32 = dot(horizontal_0, horizontal_0);
    var cosAzimuth_2 : f32;
    if((length2_0 > 9.999999960041972e-13f))
    {
        cosAzimuth_2 = dot(horizontal_0, f_3.toward_0) * inverseSqrt(length2_0);
    }
    else
    {
        cosAzimuth_2 = 1.0f;
    }
    var unit_2 : vec2<f32> = skyViewUnit_0(cosZenith_1, cosAzimuth_2, ground_6, r_14, sky_0.bottomRadius_0);
    var row_0 : f32 = unitToTexel_0(unit_2.y, 108.0f) * 108.0f;
    var row_1 : f32;
    if(ground_6)
    {
        row_1 = max(row_0, 54.5f);
    }
    else
    {
        row_1 = min(row_0, 53.5f);
    }
    return (textureSampleLevel((skyView_0), (skyViewSampler_0), (vec2<f32>(unitToTexel_0(unit_2.x, 192.0f), (first_1 + row_1) / 217.0f)), (0.0f)));
}

struct TableSky_0
{
     color_1 : vec3<f32>,
     ground_7 : bool,
     toSpace_4 : f32,
};

fn skyFromTable_0( direction_12 : vec3<f32>) -> TableSky_0
{
    var r_15 : f32 = length(sky_0.position_0);
    var f_4 : SkyFrame_0 = skyFrame_0();
    var cosZenith_2 : f32 = dot(direction_12, f_4.up_1);
    var bottom_4 : f32 = sky_0.bottomRadius_0;
    var ground_8 : bool;
    if((cosZenith_2 < 0.0f))
    {
        ground_8 = ((r_15 * r_15 * (cosZenith_2 * cosZenith_2 - 1.0f) + bottom_4 * bottom_4) >= 0.0f);
    }
    else
    {
        ground_8 = false;
    }
    var texel_0 : vec4<f32> = tableTexel_0(direction_12, f_4, 0.0f, ground_8, r_15);
    var color_2 : vec3<f32> = texel_0.xyz;
    var color_3 : vec3<f32>;
    if(((sky_0.moonLight_0) > 0.0f))
    {
        color_3 = color_2 + tableTexel_0(direction_12, frameToward_0(sky_0.moon_0), 109.0f, ground_8, r_15).xyz;
    }
    else
    {
        color_3 = color_2;
    }
    var t_5 : TableSky_0;
    t_5.color_1 = color_3;
    t_5.ground_7 = ground_8;
    t_5.toSpace_4 = texel_0.w;
    return t_5;
}

struct pixelOutput_4
{
    @location(0) output_4 : vec4<f32>,
};

struct pixelInput_4
{
    @interpolate(flat) @location(0) group_8 : u32,
};

@fragment
fn skyFromTableFragment( _S94 : pixelInput_4, @builtin(position) position_8 : vec4<f32>) -> pixelOutput_4
{
    var _S95 : vec2<f32> = position_8.xy;
    var direction_13 : vec3<f32> = viewDirection_0(_S95);
    var s_6 : TableSky_0 = skyFromTable_0(direction_13);
    var color_4 : vec3<f32>;
    if(!s_6.ground_7)
    {
        const _S96 : vec3<i32> = vec3<i32>(i32(0), i32(108), i32(0));
        var color_5 : vec3<f32> = s_6.color_1 + (textureLoad((skyView_0), ((_S96)).xy, ((_S96)).z)).xyz * vec3<f32>(sunDisk_0(direction_13));
        var moon_2 : MoonSample_0 = moonDisk_0(direction_13);
        if(((moon_2.coverage_0) > 0.0f))
        {
            const _S97 : vec3<i32> = vec3<i32>(i32(1), i32(108), i32(0));
            color_4 = color_5 + (textureLoad((skyView_0), ((_S97)).xy, ((_S97)).z)).xyz / vec3<f32>(9.9999997473787516e-06f) * vec3<f32>(moon_2.radiance_7) * vec3<f32>(sky_0.exposure_0);
        }
        else
        {
            color_4 = color_5;
        }
        color_4 = color_4 + starLight_0(_S95, direction_13) * vec3<f32>(s_6.toSpace_4) * vec3<f32>(starExposure_1(s_6.color_1, 1.0f)) * vec3<f32>((1.0f - moon_2.coverage_0));
    }
    else
    {
        color_4 = s_6.color_1;
    }
    var _S98 : pixelOutput_4 = pixelOutput_4( vec4<f32>(min(color_4, vec3<f32>(60000.0f)), 1.0f) );
    return _S98;
}

struct pixelOutput_5
{
    @location(0) output_5 : vec4<f32>,
};

struct pixelInput_5
{
    @interpolate(flat) @location(0) group_9 : u32,
};

@fragment
fn environmentFromTableFragment( _S99 : pixelInput_5, @builtin(position) position_9 : vec4<f32>) -> pixelOutput_5
{
    var _S100 : pixelOutput_5 = pixelOutput_5( vec4<f32>(skyFromTable_0(viewDirection_0(position_9.xy)).color_1 * vec3<f32>(sky_0.exposure_0), 1.0f) );
    return _S100;
}

struct pixelOutput_6
{
    @location(0) output_6 : vec4<f32>,
};

struct pixelInput_6
{
    @interpolate(flat) @location(0) group_10 : u32,
};

@fragment
fn sunLightFragment( _S101 : pixelInput_6, @builtin(position) position_10 : vec4<f32>) -> pixelOutput_6
{
    var _S102 : f32 = texelToUnit_0(position_10.y / 64.0f, 64.0f);
    var s_7 : f32 = texelToUnit_0(position_10.x / 256.0f, 256.0f) * 2.0f - 1.0f;
    var mu_13 : f32 = f32((i32(sign((s_7))))) * s_7 * s_7;
    var r_16 : f32 = atmosphere_0.bottomRadius_1 + (atmosphere_0.topRadius_0 - atmosphere_0.bottomRadius_1) * _S102 * _S102;
    var muHorizon_0 : f32 = - sqrt(max(0.0f, 1.0f - atmosphere_0.bottomRadius_1 / r_16 * (atmosphere_0.bottomRadius_1 / r_16)));
    var _S103 : pixelOutput_6 = pixelOutput_6( vec4<f32>(toRgb_0(atmosphere_0.solarIrradiance_0 * transmittanceToTop_0(r_16, max(mu_13, muHorizon_0 + 9.9999997473787516e-05f)) * vec4<f32>(clamp(0.5f + (asin(clamp(mu_13, -1.0f, 1.0f)) - asin(muHorizon_0)) / 0.0093499999493360519f, 0.0f, 1.0f)), _S101.group_10) * vec3<f32>(9.9999997473787516e-06f), 1.0f) );
    return _S103;
}

@compute
@workgroup_size(128, 1, 1)
fn aerialCompute0(@builtin(workgroup_id) column_2 : vec3<u32>, @builtin(local_invocation_index) j_2 : u32)
{
    aerialColumn_1(column_2, j_2);
    return;
}

@compute
@workgroup_size(128, 1, 1)
fn aerialCompute1(@builtin(workgroup_id) column_3 : vec3<u32>, @builtin(local_invocation_index) j_3 : u32)
{
    aerialColumn_0(column_3, j_3);
    return;
}

struct AerialScreen_0
{
    @location(0) inscatter_2 : vec4<f32>,
    @location(1) transmittance_8 : vec4<f32>,
};

struct pixelInput_7
{
    @interpolate(flat) @location(0) group_11 : u32,
};

@fragment
fn aerialScreenFragment( _S104 : pixelInput_7, @builtin(position) position_11 : vec4<f32>) -> AerialScreen_0
{
    var direction_14 : vec3<f32> = normalize(sky_0.shape_0 * normalize(sky_0.forward_0 + sky_0.right_0 * vec3<f32>(((position_11.x / 640.0f * 2.0f - 1.0f) * sky_0.tanX_0)) + sky_0.up_0 * vec3<f32>(((1.0f - position_11.y / 400.0f * 2.0f) * sky_0.tanY_0))));
    var sun_4 : vec3<f32> = normalize(sky_0.shape_0 * sky_0.sun_0);
    var r_17 : f32 = length(sky_0.position_0);
    var mu_14 : f32 = dot(sky_0.position_0, direction_14) / r_17;
    var reach_0 : f32;
    if(hitsGround_0(r_17, mu_14))
    {
        reach_0 = sphereDistance_0(r_17, mu_14, atmosphere_0.bottomRadius_1, true) * 0.99989998340606689f;
    }
    else
    {
        reach_0 = 1.0e+09f;
    }
    var s_8 : Scattered_0 = march_0(sky_0.position_0, direction_14, sun_4, reach_0, i32(sky_0.steps_0), false);
    var spectral_4 : vec4<f32> = s_8.radiance_6 * atmosphere_0.solarIrradiance_0;
    var spectral_5 : vec4<f32>;
    if(((sky_0.moonLight_0) > 0.0f))
    {
        spectral_5 = spectral_4 + march_0(sky_0.position_0, direction_14, normalize(sky_0.shape_0 * sky_0.moon_0), reach_0, i32(sky_0.steps_0), false).radiance_6 * atmosphere_0.solarIrradiance_0 * vec4<f32>(sky_0.moonLight_0);
    }
    else
    {
        spectral_5 = spectral_4;
    }
    var _S105 : vec3<f32> = vec3<f32>(0.0f);
    var k_4 : u32 = u32(0);
    var total_6 : vec3<f32> = _S105;
    loop
    {
        if((k_4 < u32(8)))
        {
        }
        else
        {
            break;
        }
        var total_7 : vec3<f32> = total_6 + sky_0.weights_0[k_4].xyz;
        k_4 = k_4 + u32(1);
        total_6 = total_7;
    }
    var base_2 : u32 = _S104.group_11 * u32(4);
    var t_6 : vec3<f32> = (vec3<f32>(s_8.transmittance_6.x) * sky_0.weights_0[base_2].xyz + vec3<f32>(s_8.transmittance_6.y) * sky_0.weights_0[base_2 + u32(1)].xyz + vec3<f32>(s_8.transmittance_6.z) * sky_0.weights_0[base_2 + u32(2)].xyz + vec3<f32>(s_8.transmittance_6.w) * sky_0.weights_0[base_2 + u32(3)].xyz) / total_6;
    var out_3 : AerialScreen_0;
    out_3.inscatter_2 = vec4<f32>(min(toRgb_0(spectral_5, _S104.group_11) * vec3<f32>(sky_0.exposure_0), vec3<f32>(30000.0f)), 0.0f);
    out_3.transmittance_8 = vec4<f32>(t_6, 0.0f);
    return out_3;
}

