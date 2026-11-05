// Generated from src/atmosphere/atmosphere.slang by slangc 2026.21
// (scripts/slangBuild.mjs). Do not edit: change the .slang and regenerate.
struct Atmosphere_std140_0
{
    @align(16) rayleighScattering_0 : vec4<f32>,
    @align(16) mieScattering_0 : vec4<f32>,
    @align(16) mieExtinction_0 : vec4<f32>,
    @align(16) ozoneAbsorption_0 : vec4<f32>,
    @align(16) solarIrradiance_0 : vec4<f32>,
    @align(16) bottomRadius_0 : f32,
    @align(4) topRadius_0 : f32,
    @align(8) rayleighScaleHeight_0 : f32,
    @align(4) mieScaleHeight_0 : f32,
    @align(16) miePhaseG_0 : f32,
    @align(4) groundAlbedo_0 : f32,
    @align(8) pad0_0 : f32,
    @align(4) pad1_0 : f32,
};

@binding(0) @group(0) var<uniform> atmosphere_0 : Atmosphere_std140_0;
@binding(0) @group(1) var transmittanceTarget_0 : texture_storage_2d<rgba16float, write>;

@binding(1) @group(1) var transmittanceTable_0 : texture_2d<f32>;

@binding(2) @group(1) var tableSampler_0 : sampler;

@binding(3) @group(1) var multipleScatteringTable_0 : texture_2d<f32>;

@binding(4) @group(1) var multipleScatteringTarget_0 : texture_storage_2d<rgba16float, write>;

struct ProbeParams_std140_0
{
    @align(16) observer_0 : vec3<f32>,
    @align(4) count_0 : u32,
    @align(16) sun_0 : vec3<f32>,
    @align(4) steps_0 : u32,
    @align(16) maxLength_0 : f32,
    @align(4) pad0_1 : f32,
    @align(8) pad1_1 : f32,
    @align(4) pad2_0 : f32,
};

@binding(5) @group(1) var<uniform> probe_0 : ProbeParams_std140_0;
@binding(6) @group(1) var<storage, read> probeDirections_0 : array<vec4<f32>>;

@binding(7) @group(1) var<storage, read_write> probeRadiance_0 : array<vec4<f32>>;

fn texelToUnit_0( u_0 : f32,  size_0 : f32) -> f32
{
    return (u_0 - 0.5f / size_0) / (1.0f - 1.0f / size_0);
}

fn transmittanceRMu_0( uv_0 : vec2<f32>) -> vec2<f32>
{
    var _S1 : f32 = atmosphere_0.topRadius_0;
    var _S2 : f32 = atmosphere_0.bottomRadius_0;
    var _S3 : f32 = _S2 * _S2;
    var h_0 : f32 = sqrt(_S1 * _S1 - _S3);
    var rho_0 : f32 = h_0 * texelToUnit_0(uv_0.y, 64.0f);
    var _S4 : f32 = rho_0 * rho_0;
    var r_0 : f32 = sqrt(_S4 + _S3);
    var dMin_0 : f32 = atmosphere_0.topRadius_0 - r_0;
    var d_0 : f32 = dMin_0 + texelToUnit_0(uv_0.x, 256.0f) * (rho_0 + h_0 - dMin_0);
    var mu_0 : f32;
    if(d_0 == 0.0f)
    {
        mu_0 = 1.0f;
    }
    else
    {
        mu_0 = clamp((h_0 * h_0 - _S4 - d_0 * d_0) / (2.0f * r_0 * d_0), -1.0f, 1.0f);
    }
    return vec2<f32>(r_0, mu_0);
}

fn sphereDistance_0( r_1 : f32,  mu_1 : f32,  radius_0 : f32,  near_0 : bool) -> f32
{
    var disc_0 : f32 = r_1 * r_1 * (mu_1 * mu_1 - 1.0f) + radius_0 * radius_0;
    if((disc_0 < 0.0f))
    {
        return -1.0f;
    }
    var s_0 : f32 = sqrt(disc_0);
    var t_0 : f32;
    if(near_0)
    {
        t_0 = - r_1 * mu_1 - s_0;
    }
    else
    {
        t_0 = - r_1 * mu_1 + s_0;
    }
    return t_0;
}

struct Medium_0
{
     scattering_0 : vec4<f32>,
     extinction_0 : vec4<f32>,
     rayleigh_0 : vec4<f32>,
     mie_0 : vec4<f32>,
};

fn medium_0( h_1 : f32) -> Medium_0
{
    var a_0 : Atmosphere_std140_0 = atmosphere_0;
    var _S5 : f32 = - h_1;
    var rayleighDensity_0 : f32 = exp(_S5 / atmosphere_0.rayleighScaleHeight_0);
    var mieDensity_0 : f32 = exp(_S5 / atmosphere_0.mieScaleHeight_0);
    var ozoneDensity_0 : f32;
    if((h_1 < 25.0f))
    {
        ozoneDensity_0 = clamp(h_1 / 15.0f - 0.66666668653488159f, 0.0f, 1.0f);
    }
    else
    {
        ozoneDensity_0 = clamp(_S5 / 15.0f + 2.6666667461395264f, 0.0f, 1.0f);
    }
    var m_0 : Medium_0;
    var _S6 : vec4<f32> = a_0.rayleighScattering_0 * vec4<f32>(rayleighDensity_0);
    m_0.rayleigh_0 = _S6;
    var _S7 : vec4<f32> = vec4<f32>(mieDensity_0);
    var _S8 : vec4<f32> = a_0.mieScattering_0 * _S7;
    m_0.mie_0 = _S8;
    m_0.scattering_0 = _S6 + _S8;
    m_0.extinction_0 = _S6 + a_0.mieExtinction_0 * _S7 + a_0.ozoneAbsorption_0 * vec4<f32>(ozoneDensity_0);
    return m_0;
}

@compute
@workgroup_size(8, 8, 1)
fn transmittanceLut(@builtin(global_invocation_id) id_0 : vec3<u32>)
{
    var _S9 : bool;
    if((f32(id_0.x) >= 256.0f))
    {
        _S9 = true;
    }
    else
    {
        _S9 = (f32(id_0.y) >= 64.0f);
    }
    if(_S9)
    {
        return;
    }
    var _S10 : vec2<u32> = id_0.xy;
    var rMu_0 : vec2<f32> = transmittanceRMu_0((vec2<f32>(_S10) + vec2<f32>(0.5f)) / vec2<f32>(256.0f, 64.0f));
    var r_2 : f32 = rMu_0.x;
    var mu_2 : f32 = rMu_0.y;
    var _S11 : f32 = max(0.0f, sphereDistance_0(r_2, mu_2, atmosphere_0.topRadius_0, false)) / 500.0f;
    var _S12 : vec4<f32> = vec4<f32>(0.0f);
    var i_0 : i32 = i32(0);
    var depth_0 : vec4<f32> = _S12;
    loop
    {
        if((i_0 < i32(500)))
        {
        }
        else
        {
            break;
        }
        var t_1 : f32 = (f32(i_0) + 0.5f) * _S11;
        var depth_1 : vec4<f32> = depth_0 + medium_0(sqrt(r_2 * r_2 + t_1 * t_1 + 2.0f * r_2 * mu_2 * t_1) - atmosphere_0.bottomRadius_0).extinction_0 * vec4<f32>(_S11);
        i_0 = i_0 + i32(1);
        depth_0 = depth_1;
    }
    textureStore((transmittanceTarget_0), (_S10), (exp((vec4<f32>(0) - depth_0))));
    return;
}

fn hitsGround_0( r_3 : f32,  mu_3 : f32) -> bool
{
    var bottom_0 : f32 = atmosphere_0.bottomRadius_0;
    var _S13 : bool;
    if((mu_3 < 0.0f))
    {
        _S13 = ((r_3 * r_3 * (mu_3 * mu_3 - 1.0f) + bottom_0 * bottom_0) >= 0.0f);
    }
    else
    {
        _S13 = false;
    }
    return _S13;
}

fn rayleighPhase_0( mu_4 : f32) -> f32
{
    return 0.059683103114366531f * (1.0f + mu_4 * mu_4);
}

fn miePhase_0( mu_5 : f32) -> f32
{
    var _S14 : f32 = atmosphere_0.miePhaseG_0 * atmosphere_0.miePhaseG_0;
    return 0.11936620622873306f * (1.0f - _S14) / (2.0f + _S14) * (1.0f + mu_5 * mu_5) / pow(1.0f + _S14 - 2.0f * atmosphere_0.miePhaseG_0 * mu_5, 1.5f);
}

fn unitToTexel_0( x_0 : f32,  size_1 : f32) -> f32
{
    return 0.5f / size_1 + x_0 * (1.0f - 1.0f / size_1);
}

fn transmittanceUv_0( r_4 : f32,  mu_6 : f32) -> vec2<f32>
{
    var _S15 : f32 = atmosphere_0.topRadius_0;
    var _S16 : f32 = atmosphere_0.bottomRadius_0;
    var _S17 : f32 = _S16 * _S16;
    var h_2 : f32 = sqrt(_S15 * _S15 - _S17);
    var rho_1 : f32 = sqrt(max(0.0f, r_4 * r_4 - _S17));
    var dMin_1 : f32 = atmosphere_0.topRadius_0 - r_4;
    return vec2<f32>(unitToTexel_0((max(0.0f, sphereDistance_0(r_4, mu_6, atmosphere_0.topRadius_0, false)) - dMin_1) / (rho_1 + h_2 - dMin_1), 256.0f), unitToTexel_0(rho_1 / h_2, 64.0f));
}

fn transmittanceToTop_0( r_5 : f32,  mu_7 : f32) -> vec4<f32>
{
    return (textureSampleLevel((transmittanceTable_0), (tableSampler_0), (transmittanceUv_0(r_5, mu_7)), (0.0f)));
}

fn sunTransmittance_0( r_6 : f32,  muSun_0 : f32) -> vec4<f32>
{
    if(hitsGround_0(r_6, muSun_0))
    {
        return vec4<f32>(0.0f);
    }
    return transmittanceToTop_0(r_6, muSun_0);
}

fn multipleScattering_0( r_7 : f32,  muSun_1 : f32) -> vec4<f32>
{
    return (textureSampleLevel((multipleScatteringTable_0), (tableSampler_0), (vec2<f32>(unitToTexel_0(muSun_1 * 0.5f + 0.5f, 32.0f), unitToTexel_0(clamp((r_7 - atmosphere_0.bottomRadius_0) / (atmosphere_0.topRadius_0 - atmosphere_0.bottomRadius_0), 0.0f, 1.0f), 32.0f))), (0.0f)));
}

struct Scattered_0
{
     radiance_0 : vec4<f32>,
     transmittance_0 : vec4<f32>,
     transfer_0 : vec4<f32>,
};

fn march_0( position_0 : vec3<f32>,  direction_0 : vec3<f32>,  sun_1 : vec3<f32>,  maxLength_1 : f32,  steps_1 : i32,  uniformPhase_0 : bool) -> Scattered_0
{
    var a_1 : Atmosphere_std140_0 = atmosphere_0;
    var out_0 : Scattered_0;
    var _S18 : vec4<f32> = vec4<f32>(0.0f);
    out_0.radiance_0 = _S18;
    out_0.transfer_0 = _S18;
    out_0.transmittance_0 = vec4<f32>(1.0f);
    var r_8 : f32 = length(position_0);
    var mu_8 : f32 = dot(position_0, direction_0) / r_8;
    var ground_0 : bool = hitsGround_0(r_8, mu_8);
    var end_0 : f32;
    if(ground_0)
    {
        end_0 = sphereDistance_0(r_8, mu_8, a_1.bottomRadius_0, true);
    }
    else
    {
        end_0 = sphereDistance_0(r_8, mu_8, a_1.topRadius_0, false);
    }
    var start_0 : f32;
    var _S19 : bool;
    if((r_8 > (a_1.topRadius_0)))
    {
        var enter_0 : f32 = sphereDistance_0(r_8, mu_8, a_1.topRadius_0, true);
        if((enter_0 < 0.0f))
        {
            _S19 = true;
        }
        else
        {
            _S19 = (end_0 < 0.0f);
        }
        if(_S19)
        {
            return out_0;
        }
        start_0 = enter_0;
    }
    else
    {
        start_0 = 0.0f;
    }
    var _S20 : f32 = min(end_0, maxLength_1);
    if((_S20 <= start_0))
    {
        return out_0;
    }
    var nu_0 : f32 = dot(direction_0, sun_1);
    if(uniformPhase_0)
    {
        end_0 = 0.07957746833562851f;
    }
    else
    {
        end_0 = rayleighPhase_0(nu_0);
    }
    var _S21 : f32;
    if(uniformPhase_0)
    {
        _S21 = 0.07957746833562851f;
    }
    else
    {
        _S21 = miePhase_0(nu_0);
    }
    var _S22 : f32 = (_S20 - start_0) / f32(steps_1);
    var i_1 : i32 = i32(0);
    loop
    {
        if((i_1 < steps_1))
        {
        }
        else
        {
            break;
        }
        var p_0 : vec3<f32> = position_0 + direction_0 * vec3<f32>((start_0 + (f32(i_1) + 0.5f) * _S22));
        var rp_0 : f32 = length(p_0);
        var muSun_2 : f32 = dot(p_0, sun_1) / rp_0;
        var m_1 : Medium_0 = medium_0(rp_0 - a_1.bottomRadius_0);
        var scattered_0 : vec4<f32> = (m_1.rayleigh_0 * vec4<f32>(end_0) + m_1.mie_0 * vec4<f32>(_S21)) * sunTransmittance_0(rp_0, muSun_2);
        var scattered_1 : vec4<f32>;
        if(!uniformPhase_0)
        {
            scattered_1 = scattered_0 + m_1.scattering_0 * multipleScattering_0(rp_0, muSun_2);
        }
        else
        {
            scattered_1 = scattered_0;
        }
        var segment_0 : vec4<f32> = exp((vec4<f32>(0) - m_1.extinction_0) * vec4<f32>(_S22));
        var integral_0 : vec4<f32> = (vec4<f32>(1.0f) - segment_0) / max(m_1.extinction_0, vec4<f32>(9.99999971718068537e-10f));
        out_0.radiance_0 = out_0.radiance_0 + out_0.transmittance_0 * scattered_1 * integral_0;
        out_0.transfer_0 = out_0.transfer_0 + out_0.transmittance_0 * m_1.scattering_0 * integral_0;
        out_0.transmittance_0 = out_0.transmittance_0 * segment_0;
        i_1 = i_1 + i32(1);
    }
    if(ground_0)
    {
        _S19 = (_S20 < maxLength_1);
    }
    else
    {
        _S19 = false;
    }
    if(_S19)
    {
        var p_1 : vec3<f32> = position_0 + direction_0 * vec3<f32>(_S20);
        var muSun_3 : f32 = dot(normalize(p_1), sun_1);
        out_0.radiance_0 = out_0.radiance_0 + out_0.transmittance_0 * vec4<f32>(a_1.groundAlbedo_0) / vec4<f32>(3.1415927410125732f) * vec4<f32>(max(muSun_3, 0.0f)) * sunTransmittance_0(length(p_1), muSun_3);
    }
    return out_0;
}

@compute
@workgroup_size(8, 8, 1)
fn multipleScatteringLut(@builtin(global_invocation_id) id_1 : vec3<u32>)
{
    var _S23 : bool;
    if(((id_1.x) >= u32(32)))
    {
        _S23 = true;
    }
    else
    {
        _S23 = ((id_1.y) >= u32(32));
    }
    if(_S23)
    {
        return;
    }
    var _S24 : vec2<u32> = id_1.xy;
    var uv_1 : vec2<f32> = (vec2<f32>(_S24) + vec2<f32>(0.5f)) / vec2<f32>(32.0f);
    var muSun_4 : f32 = texelToUnit_0(uv_1.x, 32.0f) * 2.0f - 1.0f;
    var _S25 : vec3<f32> = vec3<f32>(0.0f, 0.0f, max(atmosphere_0.bottomRadius_0 + clamp(texelToUnit_0(uv_1.y, 32.0f), 0.0f, 1.0f) * (atmosphere_0.topRadius_0 - atmosphere_0.bottomRadius_0), atmosphere_0.bottomRadius_0 + 0.0010000000474974513f));
    var _S26 : vec3<f32> = vec3<f32>(sqrt(max(0.0f, 1.0f - muSun_4 * muSun_4)), 0.0f, muSun_4);
    var _S27 : vec4<f32> = vec4<f32>(0.0f);
    var i_2 : u32 = u32(0);
    var second_0 : vec4<f32> = _S27;
    var transfer_1 : vec4<f32> = _S27;
    loop
    {
        if((i_2 < u32(8)))
        {
        }
        else
        {
            break;
        }
        var j_0 : u32 = u32(0);
        loop
        {
            if((j_0 < u32(8)))
            {
            }
            else
            {
                break;
            }
            var cosTheta_0 : f32 = 1.0f - 2.0f * (f32(i_2) + 0.5f) / 8.0f;
            var phi_0 : f32 = 6.2831854820251465f * (f32(j_0) + 0.5f) / 8.0f;
            var sinTheta_0 : f32 = sqrt(max(0.0f, 1.0f - cosTheta_0 * cosTheta_0));
            var s_1 : Scattered_0 = march_0(_S25, vec3<f32>(sinTheta_0 * cos(phi_0), sinTheta_0 * sin(phi_0), cosTheta_0), _S26, 1.0e+09f, i32(20), true);
            var second_1 : vec4<f32> = second_0 + s_1.radiance_0;
            var transfer_2 : vec4<f32> = transfer_1 + s_1.transfer_0;
            j_0 = j_0 + u32(1);
            second_0 = second_1;
            transfer_1 = transfer_2;
        }
        i_2 = i_2 + u32(1);
    }
    var _S28 : vec4<f32> = vec4<f32>(64.0f);
    textureStore((multipleScatteringTarget_0), (_S24), (second_0 / _S28 / (vec4<f32>(1.0f) - transfer_1 / _S28)));
    return;
}

@compute
@workgroup_size(64, 1, 1)
fn skyProbe(@builtin(global_invocation_id) id_2 : vec3<u32>)
{
    var _S29 : u32 = id_2.x;
    if((_S29 >= (probe_0.count_0)))
    {
        return;
    }
    var direction_1 : vec3<f32> = normalize(probeDirections_0[_S29].xyz);
    var maxLength_2 : f32 = probe_0.maxLength_0;
    var r_9 : f32 = length(probe_0.observer_0);
    var mu_9 : f32 = dot(probe_0.observer_0, direction_1) / r_9;
    var _S30 : bool;
    if(((probe_0.maxLength_0) < 1.0e+08f))
    {
        _S30 = hitsGround_0(r_9, mu_9);
    }
    else
    {
        _S30 = false;
    }
    var maxLength_3 : f32;
    if(_S30)
    {
        maxLength_3 = min(maxLength_2, sphereDistance_0(r_9, mu_9, atmosphere_0.bottomRadius_0, true) * 0.99900001287460327f);
    }
    else
    {
        maxLength_3 = maxLength_2;
    }
    probeRadiance_0[_S29] = march_0(probe_0.observer_0, direction_1, probe_0.sun_0, maxLength_3, i32(probe_0.steps_0), false).radiance_0 * atmosphere_0.solarIrradiance_0;
    return;
}

