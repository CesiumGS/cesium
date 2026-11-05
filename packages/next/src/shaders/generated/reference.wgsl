// Generated from src/atmosphere/reference.slang by slangc 2026.21
// (scripts/slangBuild.mjs). Do not edit: change the .slang and regenerate.
struct Params_std140_0
{
    @align(16) observerHeight_0 : f32,
    @align(4) samples_0 : u32,
    @align(8) seed_0 : u32,
    @align(4) count_0 : u32,
    @align(16) sun_0 : vec3<f32>,
    @align(4) maxScattering_0 : u32,
    @align(16) bottomRadius_0 : f32,
    @align(4) topRadius_0 : f32,
    @align(8) rayleigh_0 : f32,
    @align(4) rayleighScaleHeight_0 : f32,
    @align(16) mieBeta_0 : f32,
    @align(4) mieAngstromAlpha_0 : f32,
    @align(8) mieScaleHeight_0 : f32,
    @align(4) mieSingleScatteringAlbedo_0 : f32,
    @align(16) miePhaseG_0 : f32,
    @align(4) ozoneMaxDensity_0 : f32,
    @align(8) groundAlbedo_0 : f32,
    @align(4) groundReflection_0 : u32,
};

@binding(0) @group(0) var<uniform> params_0 : Params_std140_0;
@binding(1) @group(0) var<storage, read> directions_0 : array<vec4<f32>>;

@binding(3) @group(0) var<storage, read> spectra_0 : array<f32>;

@binding(2) @group(0) var<storage, read_write> accum_0 : array<vec4<f32>>;

fn pcg_0( v_0 : u32) -> u32
{
    var state_0 : u32 = v_0 * u32(747796405) + u32(2891336453);
    var word_0 : u32 = ((((state_0 >> ((((state_0 >> (u32(28)))) + u32(4))))) ^ (state_0))) * u32(277803737);
    return (((word_0 >> (u32(22)))) ^ (word_0));
}

struct Rng_0
{
     state_1 : u32,
};

fn random_0( rng_0 : ptr<function, Rng_0>) -> f32
{
    var _S1 : u32 = pcg_0((*rng_0).state_1);
    (*rng_0).state_1 = _S1;
    return f32((_S1 >> (u32(8)))) * 5.9604644775390625e-08f;
}

fn table10_0( offset_0 : u32,  lambda_0 : f32) -> f32
{
    var x_0 : f32 = clamp((lambda_0 - 360.0f) / 10.0f, 0.0f, 47.0f);
    var _S2 : u32 = min(u32(x_0), u32(46));
    var _S3 : u32 = offset_0 + _S2;
    return mix(spectra_0[_S3], spectra_0[_S3 + u32(1)], x_0 - f32(_S2));
}

fn table10v_0( offset_1 : u32,  lambda_1 : vec4<f32>) -> vec4<f32>
{
    return vec4<f32>(table10_0(offset_1, lambda_1.x), table10_0(offset_1, lambda_1.y), table10_0(offset_1, lambda_1.z), table10_0(offset_1, lambda_1.w));
}

struct Medium_0
{
     rayleigh_1 : vec4<f32>,
     mieScattering_0 : vec4<f32>,
     mieExtinction_0 : vec4<f32>,
     ozone_0 : vec4<f32>,
     majorant_0 : f32,
};

fn medium_0( lambda_2 : vec4<f32>) -> Medium_0
{
    var microns_0 : vec4<f32> = lambda_2 * vec4<f32>(0.0010000000474974513f);
    var mie_0 : vec4<f32> = vec4<f32>((params_0.mieBeta_0 / params_0.mieScaleHeight_0)) * pow(microns_0, vec4<f32>(- params_0.mieAngstromAlpha_0));
    var m_0 : Medium_0;
    var _S4 : vec4<f32> = vec4<f32>(params_0.rayleigh_0) * pow(microns_0, vec4<f32>(-4.0f));
    m_0.rayleigh_1 = _S4;
    m_0.mieExtinction_0 = mie_0;
    m_0.mieScattering_0 = mie_0 * vec4<f32>(params_0.mieSingleScatteringAlbedo_0);
    var _S5 : vec4<f32> = vec4<f32>(params_0.ozoneMaxDensity_0) * table10v_0(u32(48), lambda_2);
    m_0.ozone_0 = _S5;
    var total_0 : vec4<f32> = _S4 + mie_0 + _S5;
    m_0.majorant_0 = max(max(total_0.x, total_0.y), max(total_0.z, total_0.w));
    return m_0;
}

fn radialExcess_0( p_0 : vec3<f32>) -> f32
{
    var _S6 : f32 = p_0.x;
    var _S7 : f32 = p_0.y;
    var _S8 : f32 = p_0.z;
    return _S6 * _S6 + _S7 * _S7 + _S8 * (2.0f * params_0.bottomRadius_0 + _S8);
}

fn height_0( p_1 : vec3<f32>) -> f32
{
    return radialExcess_0(p_1) / (length(vec3<f32>(p_1.xy, p_1.z + params_0.bottomRadius_0)) + params_0.bottomRadius_0);
}

fn topK_0() -> f32
{
    return (params_0.topRadius_0 - params_0.bottomRadius_0) * (params_0.topRadius_0 + params_0.bottomRadius_0);
}

fn sphere_0( p_2 : vec3<f32>,  d_0 : vec3<f32>,  k_0 : f32) -> vec2<f32>
{
    var b_0 : f32 = dot(p_2, d_0) + params_0.bottomRadius_0 * d_0.z;
    var c_0 : f32 = radialExcess_0(p_2) - k_0;
    var disc_0 : f32 = b_0 * b_0 - c_0;
    if((disc_0 < 0.0f))
    {
        return vec2<f32>(-1.0f);
    }
    var s_0 : f32 = sqrt(disc_0);
    var q_0 : f32 = - (b_0 + select(s_0, - s_0, (b_0 < 0.0f)));
    if(q_0 == 0.0f)
    {
        return vec2<f32>(0.0f);
    }
    var t1_0 : f32 = c_0 / q_0;
    return vec2<f32>(min(q_0, t1_0), max(q_0, t1_0));
}

fn extent_0( p_3 : vec3<f32>,  d_1 : vec3<f32>) -> vec2<f32>
{
    var _S9 : f32 = sphere_0(p_3, d_1, 0.0f).x;
    if((_S9 > 0.0f))
    {
        return vec2<f32>(_S9, 1.0f);
    }
    return vec2<f32>(max(sphere_0(p_3, d_1, topK_0()).y, 0.0f), 0.0f);
}

fn densities_0( h_0 : f32) -> vec3<f32>
{
    var _S10 : f32 = - h_0;
    return vec3<f32>(exp(_S10 / params_0.rayleighScaleHeight_0), exp(_S10 / params_0.mieScaleHeight_0), select(clamp(_S10 / 15000.0f + 2.6666667461395264f, 0.0f, 1.0f), clamp(h_0 / 15000.0f - 0.66666668653488159f, 0.0f, 1.0f), (h_0 < 25000.0f)));
}

fn extinction_0( m_1 : Medium_0,  h_1 : f32) -> vec4<f32>
{
    var d_2 : vec3<f32> = densities_0(h_1);
    return m_1.rayleigh_1 * vec4<f32>(d_2.x) + m_1.mieExtinction_0 * vec4<f32>(d_2.y) + m_1.ozone_0 * vec4<f32>(d_2.z);
}

fn sunTransmittance_0( p_4 : vec3<f32>,  m_2 : Medium_0,  rng_1 : ptr<function, Rng_0>) -> vec4<f32>
{
    var e_0 : vec2<f32> = extent_0(p_4, params_0.sun_0);
    if(((e_0.y) > 0.5f))
    {
        return vec4<f32>(0.0f);
    }
    var _S11 : vec4<f32> = vec4<f32>(1.0f);
    var i_0 : u32 = u32(0);
    var t_0 : f32 = 0.0f;
    var transmittance_0 : vec4<f32> = _S11;
    loop
    {
        if((i_0 < u32(4096)))
        {
        }
        else
        {
            break;
        }
        var _S12 : f32 = random_0(&((*rng_1)));
        var t_1 : f32 = t_0 - log(1.0f - _S12) / m_2.majorant_0;
        if((t_1 >= (e_0.x)))
        {
            break;
        }
        var transmittance_1 : vec4<f32> = transmittance_0 * (vec4<f32>(1.0f) - extinction_0(m_2, height_0(p_4 + params_0.sun_0 * vec3<f32>(t_1))) / vec4<f32>(m_2.majorant_0));
        if(((max(max(transmittance_1.x, transmittance_1.y), max(transmittance_1.z, transmittance_1.w))) < 0.0010000000474974513f))
        {
            var _S13 : f32 = random_0(&((*rng_1)));
            if((_S13 > 0.5f))
            {
                return vec4<f32>(0.0f);
            }
            transmittance_0 = transmittance_1 * vec4<f32>(2.0f);
        }
        else
        {
            transmittance_0 = transmittance_1;
        }
        i_0 = i_0 + u32(1);
        t_0 = t_1;
    }
    return transmittance_0;
}

fn basis_0( n_0 : vec3<f32>) -> mat3x3<f32>
{
    var _S14 : f32 = n_0.z;
    var s_1 : f32 = select(-1.0f, 1.0f, (_S14 >= 0.0f));
    var a_0 : f32 = -1.0f / (s_1 + _S14);
    var _S15 : f32 = n_0.x;
    var _S16 : f32 = n_0.y;
    var b_1 : f32 = _S15 * _S16 * a_0;
    return mat3x3<f32>(vec3<f32>(1.0f + s_1 * _S15 * _S15 * a_0, s_1 * b_1, - s_1 * _S15), vec3<f32>(b_1, s_1 + _S16 * _S16 * a_0, - _S16), n_0);
}

fn around_0( axis_0 : vec3<f32>,  mu_0 : f32,  phi_0 : f32) -> vec3<f32>
{
    var sinTheta_0 : f32 = sqrt(max(0.0f, 1.0f - mu_0 * mu_0));
    return (((basis_0(axis_0)) * (vec3<f32>(sinTheta_0 * cos(phi_0), sinTheta_0 * sin(phi_0), mu_0))));
}

fn mean4_0( v_1 : vec4<f32>) -> f32
{
    return (v_1.x + v_1.y + v_1.z + v_1.w) * 0.25f;
}

fn rayleighPhase_0( mu_1 : f32) -> f32
{
    return 0.059683103114366531f * (1.0f + mu_1 * mu_1);
}

fn cornetteShanks_0( g_0 : f32,  mu_2 : f32) -> f32
{
    var _S17 : f32 = g_0 * g_0;
    return 0.11936620622873306f * (1.0f - _S17) / (2.0f + _S17) * (1.0f + mu_2 * mu_2) / pow(1.0f + _S17 - 2.0f * g_0 * mu_2, 1.5f);
}

fn sampleHenyeyGreenstein_0( g_1 : f32,  u_0 : f32) -> f32
{
    if(((abs(g_1)) < 9.9999997473787516e-05f))
    {
        return 1.0f - 2.0f * u_0;
    }
    var _S18 : f32 = g_1 * g_1;
    var _S19 : f32 = 2.0f * g_1;
    var s_2 : f32 = (1.0f - _S18) / (1.0f - g_1 + _S19 * u_0);
    return (1.0f + _S18 - s_2 * s_2) / _S19;
}

fn henyeyGreenstein_0( g_2 : f32,  mu_3 : f32) -> f32
{
    var _S20 : f32 = g_2 * g_2;
    return (1.0f - _S20) / (12.566370964050293f * pow(1.0f + _S20 - 2.0f * g_2 * mu_3, 1.5f));
}

fn largest4_0( v_2 : vec4<f32>) -> f32
{
    return max(max(v_2.x, v_2.y), max(v_2.z, v_2.w));
}

fn tracePath_0( start_0 : vec3<f32>,  direction_0 : vec3<f32>,  lambda_3 : vec4<f32>,  rng_2 : ptr<function, Rng_0>) -> vec4<f32>
{
    var _S21 : Medium_0 = medium_0(lambda_3);
    var _S22 : vec4<f32> = table10v_0(u32(0), lambda_3);
    var p_5 : vec3<f32>;
    if(((height_0(start_0)) > (params_0.topRadius_0 - params_0.bottomRadius_0)))
    {
        var _S23 : f32 = sphere_0(start_0, direction_0, topK_0()).x;
        if((_S23 <= 0.0f))
        {
            return vec4<f32>(0.0f);
        }
        p_5 = start_0 + direction_0 * vec3<f32>(_S23);
    }
    else
    {
        p_5 = start_0;
    }
    var _S24 : vec4<f32> = vec4<f32>(1.0f);
    var _S25 : vec4<f32> = vec4<f32>(0.0f);
    var d_3 : vec3<f32> = direction_0;
    var step_0 : u32 = u32(0);
    var scatterings_0 : u32 = u32(0);
    var weight_0 : vec4<f32> = _S24;
    var radiance_0 : vec4<f32> = _S25;
    loop
    {
        if((step_0 < u32(65536)))
        {
        }
        else
        {
            break;
        }
        var e_1 : vec2<f32> = extent_0(p_5, d_3);
        var _S26 : f32 = random_0(&((*rng_2)));
        var t_2 : f32 = - log(1.0f - _S26) / _S21.majorant_0;
        var _S27 : f32 = e_1.x;
        var d_4 : vec3<f32>;
        var p_6 : vec3<f32>;
        var scatterings_1 : u32;
        var weight_1 : vec4<f32>;
        var radiance_1 : vec4<f32>;
        if((t_2 >= _S27))
        {
            if((any((vec3<bool>(((e_1.y) < 0.5f), (params_0.groundReflection_0) == u32(0), (scatterings_0 >= (params_0.maxScattering_0)))))))
            {
                break;
            }
            var p_7 : vec3<f32> = p_5 + d_3 * vec3<f32>(_S27);
            var n_1 : vec3<f32> = normalize(vec3<f32>(p_7.xy, p_7.z + params_0.bottomRadius_0));
            var p_8 : vec3<f32> = p_7 + n_1 * vec3<f32>(0.0099999997764825821f);
            var cosSun_0 : f32 = dot(n_1, params_0.sun_0);
            if((cosSun_0 > 0.0f))
            {
                var _S28 : vec4<f32> = weight_0 * vec4<f32>(params_0.groundAlbedo_0) / vec4<f32>(3.1415927410125732f) * vec4<f32>(cosSun_0) * _S22;
                var _S29 : vec4<f32> = sunTransmittance_0(p_8, _S21, &((*rng_2)));
                weight_1 = radiance_0 + _S28 * _S29;
            }
            else
            {
                weight_1 = radiance_0;
            }
            var scatterings_2 : u32 = scatterings_0 + u32(1);
            if((scatterings_2 >= (params_0.maxScattering_0)))
            {
                radiance_0 = weight_1;
                break;
            }
            var weight_2 : vec4<f32> = weight_0 * vec4<f32>(params_0.groundAlbedo_0);
            var u_1 : f32 = random_0(&((*rng_2)));
            var _S30 : f32 = sqrt(1.0f - u_1);
            var _S31 : f32 = random_0(&((*rng_2)));
            var _S32 : vec4<f32> = weight_1;
            d_4 = around_0(n_1, _S30, 6.2831854820251465f * _S31);
            scatterings_1 = scatterings_2;
            weight_1 = weight_2;
            p_6 = p_8;
            radiance_1 = _S32;
        }
        else
        {
            var p_9 : vec3<f32> = p_5 + d_3 * vec3<f32>(t_2);
            var density_0 : vec3<f32> = densities_0(height_0(p_9));
            var rayleigh_2 : vec4<f32> = _S21.rayleigh_1 * vec4<f32>(density_0.x);
            var _S33 : vec4<f32> = vec4<f32>(density_0.y);
            var mie_1 : vec4<f32> = _S21.mieScattering_0 * _S33;
            var nullCollision_0 : vec4<f32> = vec4<f32>(_S21.majorant_0) - rayleigh_2 - mie_1 - ((_S21.mieExtinction_0 - _S21.mieScattering_0) * _S33 + _S21.ozone_0 * vec4<f32>(density_0.z));
            var pr_0 : f32 = mean4_0(rayleigh_2);
            var pm_0 : f32 = mean4_0(mie_1);
            var pn_0 : f32 = mean4_0(nullCollision_0);
            var _S34 : f32 = pr_0 + pm_0;
            var total_1 : f32 = _S34 + pn_0;
            var _S35 : f32 = random_0(&((*rng_2)));
            var xi_0 : f32 = _S35 * total_1;
            if((xi_0 >= _S34))
            {
                var weight_3 : vec4<f32> = weight_0 * (nullCollision_0 * vec4<f32>(total_1) / vec4<f32>((_S21.majorant_0 * pn_0)));
                d_4 = d_3;
                p_5 = p_9;
                weight_1 = weight_3;
                var _S36 : u32 = step_0 + u32(1);
                d_3 = d_4;
                step_0 = _S36;
                weight_0 = weight_1;
                continue;
            }
            var isRayleigh_0 : bool = (xi_0 < pr_0);
            if(isRayleigh_0)
            {
                weight_1 = weight_0 * (rayleigh_2 * vec4<f32>(total_1) / vec4<f32>((_S21.majorant_0 * pr_0)));
            }
            else
            {
                weight_1 = weight_0 * (mie_1 * vec4<f32>(total_1) / vec4<f32>((_S21.majorant_0 * pm_0)));
            }
            var mu_4 : f32 = dot(d_3, params_0.sun_0);
            var _S37 : vec4<f32> = weight_1 * vec4<f32>(select(cornetteShanks_0(params_0.miePhaseG_0, mu_4), rayleighPhase_0(mu_4), isRayleigh_0)) * _S22;
            var _S38 : vec4<f32> = sunTransmittance_0(p_9, _S21, &((*rng_2)));
            var radiance_2 : vec4<f32> = radiance_0 + _S37 * _S38;
            var scatterings_3 : u32 = scatterings_0 + u32(1);
            if((scatterings_3 >= (params_0.maxScattering_0)))
            {
                radiance_0 = radiance_2;
                break;
            }
            if(isRayleigh_0)
            {
                var u_2 : f32 = random_0(&((*rng_2)));
                const _S39 : vec3<f32> = vec3<f32>(0.0f, 0.0f, 1.0f);
                var _S40 : f32 = 1.0f - 2.0f * u_2;
                var _S41 : f32 = random_0(&((*rng_2)));
                var next_0 : vec3<f32> = around_0(_S39, _S40, 6.2831854820251465f * _S41);
                var weight_4 : vec4<f32> = weight_1 * vec4<f32>((rayleighPhase_0(dot(d_3, next_0)) * 4.0f * 3.1415927410125732f));
                d_4 = next_0;
                radiance_1 = weight_4;
            }
            else
            {
                var g_3 : f32 = params_0.miePhaseG_0;
                var _S42 : f32 = random_0(&((*rng_2)));
                var cosTheta_0 : f32 = sampleHenyeyGreenstein_0(g_3, _S42);
                var _S43 : f32 = random_0(&((*rng_2)));
                var weight_5 : vec4<f32> = weight_1 * vec4<f32>((cornetteShanks_0(g_3, cosTheta_0) / henyeyGreenstein_0(g_3, cosTheta_0)));
                d_4 = around_0(d_3, cosTheta_0, 6.2831854820251465f * _S43);
                radiance_1 = weight_5;
            }
            scatterings_1 = scatterings_3;
            weight_1 = radiance_1;
            p_6 = p_9;
            radiance_1 = radiance_2;
        }
        var weight_6 : vec4<f32>;
        if((scatterings_1 > u32(6)))
        {
            var _S44 : f32 = min(largest4_0(weight_1), 0.94999998807907104f);
            var _S45 : f32 = random_0(&((*rng_2)));
            if((_S45 >= _S44))
            {
                radiance_0 = radiance_1;
                break;
            }
            weight_6 = weight_1 / vec4<f32>(_S44);
        }
        else
        {
            weight_6 = weight_1;
        }
        p_5 = p_6;
        scatterings_0 = scatterings_1;
        weight_1 = weight_6;
        radiance_0 = radiance_1;
        var _S36 : u32 = step_0 + u32(1);
        d_3 = d_4;
        step_0 = _S36;
        weight_0 = weight_1;
    }
    return radiance_0;
}

fn cie_0( lambda_4 : f32) -> vec3<f32>
{
    var x_1 : f32 = clamp((lambda_4 - 360.0f) / 5.0f, 0.0f, 94.0f);
    var _S46 : u32 = min(u32(x_1), u32(93));
    var a_1 : u32 = u32(96) + _S46 * u32(3);
    var b_2 : u32 = a_1 + u32(3);
    return mix(vec3<f32>(spectra_0[a_1], spectra_0[a_1 + u32(1)], spectra_0[a_1 + u32(2)]), vec3<f32>(spectra_0[b_2], spectra_0[b_2 + u32(1)], spectra_0[b_2 + u32(2)]), vec3<f32>((x_1 - f32(_S46))));
}

@compute
@workgroup_size(64, 1, 1)
fn main(@builtin(global_invocation_id) id_0 : vec3<u32>)
{
    var i_1 : u32 = id_0.x;
    if((i_1 >= (params_0.count_0)))
    {
        return;
    }
    var _S47 : vec3<f32> = normalize(directions_0[i_1].xyz);
    var _S48 : vec3<f32> = vec3<f32>(0.0f, 0.0f, params_0.observerHeight_0);
    var rng_3 : Rng_0;
    rng_3.state_1 = pcg_0(i_1 * u32(9781) + params_0.seed_0 * u32(6271) + u32(1));
    var _S49 : vec3<f32> = vec3<f32>(0.0f);
    var s_3 : u32 = u32(0);
    var xyz_0 : vec3<f32> = _S49;
    loop
    {
        if((s_3 < (params_0.samples_0)))
        {
        }
        else
        {
            break;
        }
        var stratum_0 : f32 = f32((s_3 + params_0.seed_0) % u32(8));
        var _S50 : f32 = random_0(&(rng_3));
        var lambda_5 : vec4<f32> = vec4<f32>((360.0f + 117.5f * (stratum_0 + _S50) / 8.0f)) + vec4<f32>(0.0f, 1.0f, 2.0f, 3.0f) * vec4<f32>(117.5f);
        var radiance_3 : vec4<f32> = tracePath_0(_S48, _S47, lambda_5, &(rng_3));
        var xyz_1 : vec3<f32> = xyz_0 + (vec3<f32>(radiance_3.x) * cie_0(lambda_5.x) + vec3<f32>(radiance_3.y) * cie_0(lambda_5.y) + vec3<f32>(radiance_3.z) * cie_0(lambda_5.z) + vec3<f32>(radiance_3.w) * cie_0(lambda_5.w)) * vec3<f32>(117.5f);
        s_3 = s_3 + u32(1);
        xyz_0 = xyz_1;
    }
    accum_0[i_1] = accum_0[i_1] + vec4<f32>(xyz_0, f32(params_0.samples_0));
    return;
}

