// Generated from src/shaders/warpFitDirect.slang by slangc 2026.21
// (scripts/slangBuild.mjs). Do not edit: change the .slang and regenerate.
struct DirectParams_std140_0
{
    @align(16) kind_0 : u32,
    @align(4) count_0 : u32,
    @align(8) drawCount_0 : u32,
    @align(4) pad1_0 : u32,
    @align(16) a_0 : vec4<f32>,
    @align(16) aLo_0 : vec4<f32>,
    @align(16) b_0 : vec4<f32>,
    @align(16) cHi_0 : vec4<f32>,
    @align(16) cLo_0 : vec4<f32>,
    @align(16) s1_0 : vec4<f32>,
    @align(16) s1Lo_0 : vec4<f32>,
};

@binding(0) @group(0) var<uniform> params_0 : DirectParams_std140_0;
@binding(1) @group(0) var<storage, read> draws_0 : array<vec4<f32>>;

@binding(5) @group(0) var<storage, read_write> constants_0 : array<vec4<f32>>;

@binding(3) @group(0) var<storage, read> vertices_0 : array<vec4<f32>>;

@binding(4) @group(0) var<storage, read_write> output_0 : array<vec4<f32>>;

@binding(2) @group(0) var<storage, read> lattices_0 : array<vec4<f32>>;

const POWERS_0 : array<u32, i32(20)> = array<u32, i32(20)>( u32(0), u32(1), u32(4), u32(16), u32(2), u32(5), u32(17), u32(8), u32(20), u32(32), u32(3), u32(6), u32(18), u32(9), u32(21), u32(33), u32(12), u32(24), u32(36), u32(48) );
fn twoSum_0( a_1 : f32,  b_1 : f32) -> vec2<f32>
{
    var s_0 : f32 = a_1 + b_1;
    var v_0 : f32 = s_0 - a_1;
    return vec2<f32>(s_0, a_1 - (s_0 - v_0) + (b_1 - v_0));
}

fn dfQuick_0( a_2 : f32,  b_2 : f32) -> vec2<f32>
{
    var s_1 : f32 = a_2 + b_2;
    return vec2<f32>(s_1, b_2 - (s_1 - a_2));
}

fn dfAdd_0( a_3 : vec2<f32>,  b_3 : vec2<f32>) -> vec2<f32>
{
    var s_2 : vec2<f32> = twoSum_0(a_3.x, b_3.x);
    var t_0 : vec2<f32> = twoSum_0(a_3.y, b_3.y);
    var u_0 : vec2<f32> = dfQuick_0(s_2.x, s_2.y + t_0.x);
    return dfQuick_0(u_0.x, u_0.y + t_0.y);
}

fn dfSub_0( a_4 : vec2<f32>,  b_4 : vec2<f32>) -> vec2<f32>
{
    return dfAdd_0(a_4, (vec2<f32>(0) - b_4));
}

fn dfAddF_0( a_5 : vec2<f32>,  b_5 : f32) -> vec2<f32>
{
    var s_3 : vec2<f32> = twoSum_0(a_5.x, b_5);
    return dfQuick_0(s_3.x, s_3.y + a_5.y);
}

fn highHalf_0( a_6 : f32) -> f32
{
    var c_0 : f32 = 4097.0f * a_6;
    return c_0 - (c_0 - a_6);
}

fn twoProd_0( a_7 : f32,  b_6 : f32) -> vec2<f32>
{
    var p_0 : f32 = a_7 * b_6;
    var ah_0 : f32 = highHalf_0(a_7);
    var al_0 : f32 = a_7 - ah_0;
    var bh_0 : f32 = highHalf_0(b_6);
    var bl_0 : f32 = b_6 - bh_0;
    return vec2<f32>(p_0, ah_0 * bh_0 - p_0 + ah_0 * bl_0 + al_0 * bh_0 + al_0 * bl_0);
}

fn dfMul_0( a_8 : vec2<f32>,  b_7 : vec2<f32>) -> vec2<f32>
{
    var _S1 : f32 = a_8.x;
    var _S2 : f32 = b_7.x;
    var p_1 : vec2<f32> = twoProd_0(_S1, _S2);
    return dfQuick_0(p_1.x, p_1.y + (_S1 * b_7.y + a_8.y * _S2));
}

fn dfSqr_0( a_9 : vec2<f32>) -> vec2<f32>
{
    return dfMul_0(a_9, a_9);
}

fn dfSqrt_0( a_10 : vec2<f32>) -> vec2<f32>
{
    var _S3 : f32 = a_10.x;
    if((_S3 <= 0.0f))
    {
        return vec2<f32>(0.0f);
    }
    var y_0 : f32 = sqrt(_S3);
    return dfQuick_0(y_0, dfSub_0(a_10, twoProd_0(y_0, y_0)).x / (2.0f * y_0));
}

fn dfMulF_0( a_11 : vec2<f32>,  b_8 : f32) -> vec2<f32>
{
    var p_2 : vec2<f32> = twoProd_0(a_11.x, b_8);
    return dfQuick_0(p_2.x, p_2.y + a_11.y * b_8);
}

fn dfDiv_0( a_12 : vec2<f32>,  b_9 : vec2<f32>) -> vec2<f32>
{
    var _S4 : f32 = b_9.x;
    var q1_0 : f32 = a_12.x / _S4;
    var r_0 : vec2<f32> = dfSub_0(a_12, dfMulF_0(b_9, q1_0));
    var q2_0 : f32 = r_0.x / _S4;
    return dfAddF_0(dfQuick_0(q1_0, q2_0), dfSub_0(r_0, dfMulF_0(b_9, q2_0)).x / _S4);
}

@compute
@workgroup_size(64, 1, 1)
fn directConstants(@builtin(global_invocation_id) id_0 : vec3<u32>)
{
    var _S5 : u32 = id_0.x;
    if((_S5 >= (params_0.drawCount_0)))
    {
        return;
    }
    var at_0 : u32 = _S5 * u32(29);
    var head_0 : vec4<f32> = draws_0[at_0];
    var _S6 : u32 = at_0 + u32(1);
    var _S7 : u32 = at_0 + u32(2);
    var wx_0 : vec2<f32> = dfAddF_0(dfSub_0(vec2<f32>(draws_0[_S6].x, draws_0[_S7].x), vec2<f32>(params_0.cHi_0.x, params_0.cLo_0.x)), head_0.x);
    var wy_0 : vec2<f32> = dfAddF_0(dfSub_0(vec2<f32>(draws_0[_S6].y, draws_0[_S7].y), vec2<f32>(params_0.cHi_0.y, params_0.cLo_0.y)), head_0.y);
    var wz_0 : vec2<f32> = dfAddF_0(dfSub_0(vec2<f32>(draws_0[_S6].z, draws_0[_S7].z), vec2<f32>(params_0.cHi_0.z, params_0.cLo_0.z)), head_0.z);
    if((params_0.kind_0) == u32(2))
    {
        var dx_0 : vec2<f32> = dfMul_0(vec2<f32>(params_0.s1_0.x, params_0.s1Lo_0.x), wx_0);
        var dy_0 : vec2<f32> = dfMul_0(vec2<f32>(params_0.s1_0.y, params_0.s1Lo_0.y), wy_0);
        var dz_0 : vec2<f32> = dfMul_0(vec2<f32>(params_0.s1_0.z, params_0.s1Lo_0.z), wz_0);
        var _S8 : u32 = u32(2) * _S5;
        constants_0[_S8] = vec4<f32>(dx_0.x, dy_0.x, dz_0.x, 0.0f);
        constants_0[_S8 + u32(1)] = vec4<f32>(dx_0.y, dy_0.y, dz_0.y, 0.0f);
        return;
    }
    var low_0 : vec4<f32> = draws_0[at_0 + u32(8)];
    var h_0 : vec2<f32> = vec2<f32>(draws_0[at_0 + u32(3)].x, low_0.x);
    var _S9 : u32 = at_0 + u32(9);
    var nx_0 : vec2<f32> = vec2<f32>(draws_0[_S9].x, low_0.y);
    var ny_0 : vec2<f32> = vec2<f32>(draws_0[_S9].y, low_0.z);
    var nz_0 : vec2<f32> = vec2<f32>(draws_0[_S9].z, low_0.w);
    var norm_0 : vec2<f32> = dfSqrt_0(dfAdd_0(dfAdd_0(dfSqr_0(nx_0), dfSqr_0(ny_0)), dfSqr_0(nz_0)));
    var lift_0 : vec2<f32>;
    if((params_0.kind_0) == u32(0))
    {
        lift_0 = dfAdd_0(dfMul_0(vec2<f32>(params_0.a_0.x, params_0.aLo_0.x), dfSub_0(h_0, vec2<f32>(params_0.a_0.y, params_0.aLo_0.y))), vec2<f32>(params_0.a_0.z, params_0.aLo_0.z));
    }
    else
    {
        var _S10 : f32 = wx_0.x;
        var _S11 : f32 = wy_0.x;
        var _S12 : f32 = wz_0.x;
        lift_0 = dfMulF_0(vec2<f32>(params_0.a_0.w, params_0.aLo_0.w), exp(- (_S10 * _S10 + _S11 * _S11 + _S12 * _S12) * params_0.b_0.x));
    }
    var scale_0 : vec2<f32> = dfDiv_0(lift_0, norm_0);
    var dx_1 : vec2<f32> = dfMul_0(scale_0, nx_0);
    var dy_1 : vec2<f32> = dfMul_0(scale_0, ny_0);
    var dz_1 : vec2<f32> = dfMul_0(scale_0, nz_0);
    var _S13 : u32 = u32(2) * _S5;
    constants_0[_S13] = vec4<f32>(dx_1.x, dy_1.x, dz_1.x, 0.0f);
    constants_0[_S13 + u32(1)] = vec4<f32>(dx_1.y, dy_1.y, dz_1.y, 0.0f);
    return;
}

fn directResidual_0( p_3 : ptr<function, DirectParams_std140_0>,  draw_0 : u32,  m_0 : vec3<f32>) -> vec3<f32>
{
    var at_1 : u32 = draw_0 * u32(29);
    var head_1 : vec4<f32> = draws_0[at_1];
    var _S14 : u32 = (*p_3).kind_0;
    if(((*p_3).kind_0) == u32(2))
    {
        return (*p_3).s1_0.xyz * (m_0 - head_1.xyz);
    }
    var _S15 : vec3<f32> = head_1.xyz;
    var _S16 : vec3<f32> = m_0 - _S15;
    var u_1 : vec3<f32> = _S16 * vec3<f32>(head_1.w);
    var _S17 : f32 = u_1.x;
    var _S18 : f32 = _S17 * _S17;
    var _S19 : vec4<f32> = vec4<f32>(1.0f, _S17, _S18, _S18 * _S17);
    var _S20 : f32 = u_1.y;
    var _S21 : f32 = _S20 * _S20;
    var _S22 : vec4<f32> = vec4<f32>(1.0f, _S20, _S21, _S21 * _S20);
    var _S23 : f32 = u_1.z;
    var _S24 : f32 = _S23 * _S23;
    var _S25 : vec4<f32> = vec4<f32>(1.0f, _S23, _S24, _S24 * _S23);
    var _S26 : vec3<f32> = vec3<f32>(0.0f);
    var k_0 : u32 = u32(19);
    var dh_0 : f32 = 0.0f;
    var dn_0 : vec3<f32> = _S26;
    loop
    {
        if((k_0 > u32(0)))
        {
        }
        else
        {
            break;
        }
        var mono_0 : f32 = _S19[((POWERS_0[k_0]) & (u32(3)))] * _S22[((((POWERS_0[k_0]) >> (u32(2)))) & (u32(3)))] * _S25[((((POWERS_0[k_0]) >> (u32(4)))) & (u32(3)))];
        var dh_1 : f32 = dh_0 + draws_0[at_1 + u32(3) + ((k_0 >> (u32(2))))][(k_0 & (u32(3)))] * mono_0;
        var dn_1 : vec3<f32> = dn_0 + draws_0[at_1 + u32(9) + k_0].xyz * vec3<f32>(mono_0);
        k_0 = k_0 - u32(1);
        dh_0 = dh_1;
        dn_0 = dn_1;
    }
    var low_1 : vec4<f32> = draws_0[at_1 + u32(8)];
    var n0_0 : vec3<f32> = draws_0[at_1 + u32(9)].xyz + low_1.yzw;
    var a2_0 : f32 = dot(n0_0, n0_0);
    var a_13 : f32 = sqrt(a2_0);
    var s_4 : f32 = 2.0f * dot(n0_0, dn_0) + dot(dn_0, dn_0);
    var b_10 : f32 = sqrt(a2_0 + s_4);
    var _S27 : vec3<f32> = vec3<f32>(b_10);
    var unit_0 : vec3<f32> = (n0_0 + dn_0) / _S27;
    var change_0 : vec3<f32> = dn_0 / _S27 - n0_0 * vec3<f32>((s_4 / (a_13 * b_10 * (a_13 + b_10))));
    var dlift_0 : f32;
    var lift_1 : f32;
    if(_S14 == u32(0))
    {
        var _S28 : f32 = (*p_3).a_0.x;
        var _S29 : f32 = _S28 * (draws_0[at_1 + u32(3)].x + low_1.x - (*p_3).a_0.y) + (*p_3).a_0.z;
        dlift_0 = _S28 * dh_0;
        lift_1 = _S29;
    }
    else
    {
        var w0_0 : vec3<f32> = draws_0[at_1 + u32(1)].xyz - (*p_3).cHi_0.xyz + (draws_0[at_1 + u32(2)].xyz - (*p_3).cLo_0.xyz) + _S15;
        var w_0 : vec3<f32> = w0_0 + _S16;
        var _S30 : f32 = (*p_3).b_0.x;
        var gc_0 : f32 = exp(- dot(w0_0, w0_0) * _S30);
        var _S31 : f32 = (*p_3).a_0.w;
        var _S32 : f32 = _S31 * gc_0;
        dlift_0 = _S31 * (exp(- dot(w_0, w_0) * _S30) - gc_0);
        lift_1 = _S32;
    }
    return vec3<f32>(dlift_0) * unit_0 + vec3<f32>(lift_1) * change_0;
}

@compute
@workgroup_size(64, 1, 1)
fn directEval(@builtin(global_invocation_id) id_1 : vec3<u32>)
{
    var _S33 : u32 = id_1.x;
    if((_S33 >= (params_0.count_0)))
    {
        return;
    }
    var v_1 : vec4<f32> = vertices_0[_S33];
    var _S34 : DirectParams_std140_0 = params_0;
    var _S35 : vec3<f32> = directResidual_0(&(_S34), (bitcast<u32>((v_1.w))), v_1.xyz);
    output_0[_S33] = vec4<f32>(_S35, 0.0f);
    return;
}

@compute
@workgroup_size(64, 1, 1)
fn latticeEval(@builtin(global_invocation_id) id_2 : vec3<u32>)
{
    var _S36 : u32 = id_2.x;
    if((_S36 >= (params_0.count_0)))
    {
        return;
    }
    var v_2 : vec4<f32> = vertices_0[_S36];
    var at_2 : u32 = (bitcast<u32>((v_2.w))) * u32(23);
    var head_2 : vec4<f32> = lattices_0[at_2];
    var u_2 : vec3<f32> = (v_2.xyz - head_2.xyz) * vec3<f32>(head_2.w);
    var _S37 : f32 = u_2.x;
    var _S38 : f32 = _S37 * _S37;
    var _S39 : vec4<f32> = vec4<f32>(1.0f, _S37, _S38, _S38 * _S37);
    var _S40 : f32 = u_2.y;
    var _S41 : f32 = _S40 * _S40;
    var _S42 : vec4<f32> = vec4<f32>(1.0f, _S40, _S41, _S41 * _S40);
    var _S43 : f32 = u_2.z;
    var _S44 : f32 = _S43 * _S43;
    var _S45 : vec4<f32> = vec4<f32>(1.0f, _S43, _S44, _S44 * _S43);
    var _S46 : vec3<f32> = vec3<f32>(0.0f);
    var k_1 : u32 = u32(0);
    var d_0 : vec3<f32> = _S46;
    loop
    {
        if((k_1 < u32(20)))
        {
        }
        else
        {
            break;
        }
        var d_1 : vec3<f32> = d_0 + lattices_0[at_2 + u32(3) + k_1].xyz * vec3<f32>((_S39[((POWERS_0[k_1]) & (u32(3)))] * _S42[((((POWERS_0[k_1]) >> (u32(2)))) & (u32(3)))] * _S45[((((POWERS_0[k_1]) >> (u32(4)))) & (u32(3)))]));
        k_1 = k_1 + u32(1);
        d_0 = d_1;
    }
    output_0[_S36] = vec4<f32>(d_0, 0.0f);
    return;
}

