// Generated from src/lighting/iblReference.slang by slangc 2026.21
// (scripts/slangBuild.mjs). Do not edit: change the .slang and regenerate.
struct Params_std140_0
{
    @align(16) width_0 : u32,
    @align(4) height_0 : u32,
    @align(8) samples_0 : u32,
    @align(4) seed_0 : u32,
    @align(16) direction_0 : vec3<f32>,
    @align(4) tanX_0 : f32,
    @align(16) up_0 : vec3<f32>,
    @align(4) tanY_0 : f32,
    @align(16) right_0 : vec3<f32>,
    @align(4) sphereCount_0 : u32,
    @align(16) env0_0 : vec3<f32>,
    @align(4) pad0_0 : f32,
    @align(16) env1_0 : vec3<f32>,
    @align(4) pad1_0 : f32,
    @align(16) env2_0 : vec3<f32>,
    @align(4) pad2_0 : f32,
};

@binding(0) @group(0) var<uniform> params_0 : Params_std140_0;
struct Sphere_std430_0
{
    @align(16) center_0 : vec3<f32>,
    @align(4) radius_0 : f32,
    @align(16) baseColor_0 : vec3<f32>,
    @align(4) metallic_0 : f32,
    @align(16) roughness_0 : f32,
    @align(4) pad0_1 : f32,
    @align(8) pad1_1 : f32,
    @align(4) pad2_1 : f32,
};

@binding(1) @group(0) var<storage, read> spheres_0 : array<Sphere_std430_0>;

@binding(2) @group(0) var environment_0 : texture_cube<f32>;

@binding(3) @group(0) var environmentSampler_0 : sampler;

@binding(4) @group(0) var<storage, read_write> accum_0 : array<vec4<f32>>;

struct Frame_0
{
     t_0 : vec3<f32>,
     b_0 : vec3<f32>,
     n_0 : vec3<f32>,
};

fn basis_0( n_1 : vec3<f32>) -> Frame_0
{
    var _S1 : f32 = n_1.z;
    var s_0 : f32;
    if((_S1 >= 0.0f))
    {
        s_0 = 1.0f;
    }
    else
    {
        s_0 = -1.0f;
    }
    var a_0 : f32 = -1.0f / (s_0 + _S1);
    var _S2 : f32 = n_1.x;
    var _S3 : f32 = n_1.y;
    var b_1 : f32 = _S2 * _S3 * a_0;
    var f_0 : Frame_0;
    f_0.t_0 = vec3<f32>(1.0f + s_0 * _S2 * _S2 * a_0, s_0 * b_1, - s_0 * _S2);
    f_0.b_0 = vec3<f32>(b_1, s_0 + _S3 * _S3 * a_0, - _S3);
    f_0.n_0 = n_1;
    return f_0;
}

fn Frame_toLocal_0( this_0 : Frame_0,  w_0 : vec3<f32>) -> vec3<f32>
{
    return vec3<f32>(dot(this_0.t_0, w_0), dot(this_0.b_0, w_0), dot(this_0.n_0, w_0));
}

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

fn Rng_next_0( this_1 : ptr<function, Rng_0>) -> f32
{
    var _S4 : u32 = pcg_0((*this_1).state_1);
    (*this_1).state_1 = _S4;
    return f32((_S4 >> (u32(8)))) * 5.9604644775390625e-08f;
}

fn pdfCosine_0( l_0 : vec3<f32>) -> f32
{
    return max(l_0.z, 0.0f) / 3.1415927410125732f;
}

fn smithG1_0( alpha_0 : f32,  nDotX_0 : f32) -> f32
{
    var a2_0 : f32 = alpha_0 * alpha_0;
    return 2.0f * nDotX_0 / (nDotX_0 + sqrt(a2_0 + (1.0f - a2_0) * nDotX_0 * nDotX_0));
}

fn ggx_0( alpha_1 : f32,  nDotH_0 : f32) -> f32
{
    var a2_1 : f32 = alpha_1 * alpha_1;
    var f_1 : f32 = (nDotH_0 * a2_1 - nDotH_0) * nDotH_0 + 1.0f;
    return a2_1 / (3.1415927410125732f * f_1 * f_1);
}

struct Material_0
{
     diffuse_0 : vec3<f32>,
     f0_0 : vec3<f32>,
     alpha_2 : f32,
};

fn pdfVisibleNormal_0( m_0 : Material_0,  v_1 : vec3<f32>,  l_1 : vec3<f32>) -> f32
{
    if(((l_1.z) <= 0.0f))
    {
        return 0.0f;
    }
    var h_0 : vec3<f32> = normalize(v_1 + l_1);
    if(((dot(v_1, h_0)) <= 0.0f))
    {
        return 0.0f;
    }
    var _S5 : f32 = v_1.z;
    return smithG1_0(m_0.alpha_2, _S5) * ggx_0(m_0.alpha_2, h_0.z) / (4.0f * _S5);
}

fn smithVisibility_0( alpha_3 : f32,  nDotL_0 : f32,  nDotV_0 : f32) -> f32
{
    var a2_2 : f32 = alpha_3 * alpha_3;
    var _S6 : f32 = 1.0f - a2_2;
    return 0.5f / max(nDotL_0 * sqrt(nDotV_0 * nDotV_0 * _S6 + a2_2) + nDotV_0 * sqrt(nDotL_0 * nDotL_0 * _S6 + a2_2), 9.999999960041972e-13f);
}

fn brdfCos_0( m_1 : Material_0,  v_2 : vec3<f32>,  l_2 : vec3<f32>) -> vec3<f32>
{
    var _S7 : f32 = l_2.z;
    var _S8 : bool;
    if((_S7 <= 0.0f))
    {
        _S8 = true;
    }
    else
    {
        _S8 = ((v_2.z) <= 0.0f);
    }
    if(_S8)
    {
        return vec3<f32>(0.0f);
    }
    var h_1 : vec3<f32> = normalize(v_2 + l_2);
    var x_0 : f32 = 1.0f - max(dot(v_2, h_1), 0.0f);
    var _S9 : vec3<f32> = vec3<f32>(1.0f);
    var fresnel_0 : vec3<f32> = m_1.f0_0 + (_S9 - m_1.f0_0) * vec3<f32>((x_0 * x_0 * x_0 * x_0 * x_0));
    return ((_S9 - fresnel_0) * m_1.diffuse_0 / vec3<f32>(3.1415927410125732f) + fresnel_0 * vec3<f32>(ggx_0(m_1.alpha_2, h_1.z)) * vec3<f32>(smithVisibility_0(m_1.alpha_2, _S7, v_2.z))) * vec3<f32>(_S7);
}

fn Frame_toWorld_0( this_2 : Frame_0,  l_3 : vec3<f32>) -> vec3<f32>
{
    return this_2.t_0 * vec3<f32>(l_3.x) + this_2.b_0 * vec3<f32>(l_3.y) + this_2.n_0 * vec3<f32>(l_3.z);
}

fn radiance_0( d_0 : vec3<f32>) -> vec3<f32>
{
    return (textureSampleLevel((environment_0), (environmentSampler_0), (vec3<f32>(dot(d_0, params_0.env0_0), dot(d_0, params_0.env1_0), dot(d_0, params_0.env2_0))), (0.0f))).xyz;
}

fn sampleVisibleNormal_0( v_3 : vec3<f32>,  alpha_4 : f32,  u1_0 : f32,  u2_0 : f32) -> vec3<f32>
{
    var vh_0 : vec3<f32> = normalize(vec3<f32>(alpha_4 * v_3.x, alpha_4 * v_3.y, v_3.z));
    var _S10 : f32 = vh_0.x;
    var _S11 : f32 = vh_0.y;
    var lensq_0 : f32 = _S10 * _S10 + _S11 * _S11;
    var t1_0 : vec3<f32>;
    if((lensq_0 > 0.0f))
    {
        t1_0 = vec3<f32>(- _S11, _S10, 0.0f) / vec3<f32>(sqrt(lensq_0));
    }
    else
    {
        t1_0 = vec3<f32>(1.0f, 0.0f, 0.0f);
    }
    var r_0 : f32 = sqrt(u1_0);
    var phi_0 : f32 = 6.2831854820251465f * u2_0;
    var p1_0 : f32 = r_0 * cos(phi_0);
    var s_1 : f32 = 0.5f * (1.0f + vh_0.z);
    var _S12 : f32 = 1.0f - p1_0 * p1_0;
    var p2_0 : f32 = (1.0f - s_1) * sqrt(_S12) + s_1 * (r_0 * sin(phi_0));
    var nh_0 : vec3<f32> = vec3<f32>(p1_0) * t1_0 + vec3<f32>(p2_0) * cross(vh_0, t1_0) + vec3<f32>(sqrt(max(0.0f, _S12 - p2_0 * p2_0))) * vh_0;
    return normalize(vec3<f32>(alpha_4 * nh_0.x, alpha_4 * nh_0.y, max(0.0f, nh_0.z)));
}

@compute
@workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) id_0 : vec3<u32>)
{
    var _S13 : u32 = id_0.x;
    var _S14 : bool;
    if((_S13 >= (params_0.width_0)))
    {
        _S14 = true;
    }
    else
    {
        _S14 = ((id_0.y) >= (params_0.height_0));
    }
    if(_S14)
    {
        return;
    }
    var _S15 : u32 = id_0.y;
    var index_0 : u32 = _S15 * params_0.width_0 + _S13;
    var ray_0 : vec3<f32> = normalize(params_0.direction_0 + vec3<f32>((((f32(_S13) + 0.5f) / f32(params_0.width_0) * 2.0f - 1.0f) * params_0.tanX_0)) * params_0.right_0 + vec3<f32>(((1.0f - (f32(_S15) + 0.5f) / f32(params_0.height_0) * 2.0f) * params_0.tanY_0)) * params_0.up_0);
    var nearest_0 : f32 = 1.00000001504746622e+30f;
    var hit_0 : i32 = i32(-1);
    var i_0 : u32 = u32(0);
    loop
    {
        if((i_0 < (params_0.sphereCount_0)))
        {
        }
        else
        {
            break;
        }
        var s_2 : Sphere_std430_0 = spheres_0[i_0];
        var b_2 : f32 = dot(ray_0, s_2.center_0);
        var _S16 : f32 = s_2.radius_0;
        var disc_0 : f32 = b_2 * b_2 - (dot(s_2.center_0, s_2.center_0) - _S16 * _S16);
        if((disc_0 >= 0.0f))
        {
            var t_1 : f32 = b_2 - sqrt(disc_0);
            if((t_1 > 0.0f))
            {
                _S14 = (t_1 < nearest_0);
            }
            else
            {
                _S14 = false;
            }
            var nearest_1 : f32;
            var hit_1 : i32;
            if(_S14)
            {
                var _S17 : i32 = i32(i_0);
                nearest_1 = t_1;
                hit_1 = _S17;
            }
            else
            {
                nearest_1 = nearest_0;
                hit_1 = hit_0;
            }
            nearest_0 = nearest_1;
            hit_0 = hit_1;
        }
        i_0 = i_0 + u32(1);
    }
    if((hit_0 < i32(0)))
    {
        return;
    }
    var s_3 : Sphere_std430_0 = spheres_0[hit_0];
    var frame_0 : Frame_0 = basis_0(normalize(ray_0 * vec3<f32>(nearest_0) - s_3.center_0));
    var _S18 : vec3<f32> = Frame_toLocal_0(frame_0, (vec3<f32>(0) - ray_0));
    var m_2 : Material_0;
    m_2.diffuse_0 = s_3.baseColor_0 * vec3<f32>((1.0f - s_3.metallic_0));
    m_2.f0_0 = mix(vec3<f32>(0.039999999105930328f), s_3.baseColor_0, vec3<f32>(s_3.metallic_0));
    var _S19 : f32 = s_3.roughness_0;
    m_2.alpha_2 = max(_S19 * _S19, 0.0010000000474974513f);
    var rng_0 : Rng_0;
    rng_0.state_1 = pcg_0(index_0 * u32(7919) + params_0.seed_0 * u32(104729) + u32(1));
    var _S20 : vec3<f32> = vec3<f32>(0.0f);
    var k_0 : u32 = u32(0);
    var sum_0 : vec3<f32> = _S20;
    loop
    {
        if((k_0 < (params_0.samples_0)))
        {
        }
        else
        {
            break;
        }
        var u1_1 : f32 = Rng_next_0(&(rng_0));
        var _S21 : f32 = Rng_next_0(&(rng_0));
        var phi_1 : f32 = 6.2831854820251465f * _S21;
        var r_1 : f32 = sqrt(u1_1);
        var lc_0 : vec3<f32> = vec3<f32>(r_1 * cos(phi_1), r_1 * sin(phi_1), sqrt(max(0.0f, 1.0f - u1_1)));
        var pc_0 : f32 = pdfCosine_0(lc_0) + pdfVisibleNormal_0(m_2, _S18, lc_0);
        var sum_1 : vec3<f32>;
        if((pc_0 > 0.0f))
        {
            sum_1 = sum_0 + brdfCos_0(m_2, _S18, lc_0) * radiance_0(Frame_toWorld_0(frame_0, lc_0)) / vec3<f32>(pc_0);
        }
        else
        {
            sum_1 = sum_0;
        }
        var g1_0 : f32 = Rng_next_0(&(rng_0));
        var g2_0 : f32 = Rng_next_0(&(rng_0));
        var lg_0 : vec3<f32> = reflect((vec3<f32>(0) - _S18), sampleVisibleNormal_0(_S18, m_2.alpha_2, g1_0, g2_0));
        var pg_0 : f32 = pdfCosine_0(lg_0) + pdfVisibleNormal_0(m_2, _S18, lg_0);
        if(((lg_0.z) > 0.0f))
        {
            _S14 = (pg_0 > 0.0f);
        }
        else
        {
            _S14 = false;
        }
        if(_S14)
        {
            sum_0 = sum_1 + brdfCos_0(m_2, _S18, lg_0) * radiance_0(Frame_toWorld_0(frame_0, lg_0)) / vec3<f32>(pg_0);
        }
        else
        {
            sum_0 = sum_1;
        }
        k_0 = k_0 + u32(1);
    }
    accum_0[index_0] = accum_0[index_0] + vec4<f32>(sum_0, 1.0f);
    return;
}

