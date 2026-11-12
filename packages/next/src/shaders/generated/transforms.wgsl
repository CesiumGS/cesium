// Generated from src/shaders/transforms.slang by slangc 2026.21
// (scripts/slangBuild.mjs). Do not edit: change the .slang and regenerate.
@binding(0) @group(0) var<storage, read> points_0 : array<vec4<f32>>;

@binding(1) @group(0) var<storage, read_write> results_0 : array<vec4<f32>>;

struct ScaleAboutParams_std140_0
{
    @align(16) cx_0 : f32,
    @align(4) cy_0 : f32,
    @align(8) cz_0 : f32,
    @align(4) sx_0 : f32,
    @align(16) sy_0 : f32,
    @align(4) sz_0 : f32,
};

@binding(2) @group(0) var<uniform> scaleAboutP_0 : ScaleAboutParams_std140_0;
struct BumpParams_std140_0
{
    @align(16) cx_1 : f32,
    @align(4) cy_1 : f32,
    @align(8) cz_1 : f32,
    @align(4) ux_0 : f32,
    @align(16) uy_0 : f32,
    @align(4) uz_0 : f32,
    @align(8) amplitude_0 : f32,
    @align(4) sigma_0 : f32,
};

@binding(3) @group(0) var<uniform> bumpP_0 : BumpParams_std140_0;
struct BendParams_std140_0
{
    @align(16) ox_0 : f32,
    @align(4) oz_0 : f32,
    @align(8) curvature_0 : f32,
};

@binding(4) @group(0) var<uniform> bendP_0 : BendParams_std140_0;
struct TwistParams_std140_0
{
    @align(16) ox_1 : f32,
    @align(4) oy_0 : f32,
    @align(8) oz_1 : f32,
    @align(4) ax_0 : f32,
    @align(16) ay_0 : f32,
    @align(4) az_0 : f32,
    @align(8) rate_0 : f32,
};

@binding(5) @group(0) var<uniform> twistP_0 : TwistParams_std140_0;
@binding(6) @group(0) var<uniform> taperP_0 : TwistParams_std140_0;
struct LatticeParams_std140_0
{
    @align(16) ox_2 : f32,
    @align(4) oy_1 : f32,
    @align(8) oz_2 : f32,
    @align(4) e1x_0 : f32,
    @align(16) e1y_0 : f32,
    @align(4) e1z_0 : f32,
    @align(8) e2x_0 : f32,
    @align(4) e2y_0 : f32,
    @align(16) e2z_0 : f32,
    @align(4) e3x_0 : f32,
    @align(8) e3y_0 : f32,
    @align(4) e3z_0 : f32,
};

@binding(7) @group(0) var<uniform> latticeP_0 : LatticeParams_std140_0;
@binding(8) @group(0) var<storage, read> latticeD_0 : array<vec4<f32>>;

struct RadialParams_std140_0
{
    @align(16) k1_0 : f32,
    @align(4) k2_0 : f32,
    @align(8) k3_0 : f32,
    @align(4) p1_0 : f32,
    @align(16) p2_0 : f32,
};

@binding(9) @group(0) var<uniform> radialP_0 : RadialParams_std140_0;
struct VelocityParams_std140_0
{
    @align(16) v0_0 : f32,
    @align(4) g_0 : f32,
};

@binding(10) @group(0) var<uniform> velocityP_0 : VelocityParams_std140_0;
struct CorridorParams_std140_0
{
    @align(16) count_0 : u32,
    @align(4) se_0 : f32,
    @align(8) xe_0 : f32,
    @align(4) ye_0 : f32,
    @align(16) ce_0 : f32,
    @align(4) ne_0 : f32,
};

@binding(11) @group(0) var<uniform> corridorP_0 : CorridorParams_std140_0;
@binding(12) @group(0) var<storage, read> corridorE_0 : array<vec4<f32>>;

struct ExaggerationParams_std140_0
{
    @align(16) factor_0 : f32,
    @align(4) ceiling_0 : f32,
    @align(8) baseHeight_0 : f32,
    @align(4) band_0 : f32,
    @align(16) rx_0 : f32,
    @align(4) ry_0 : f32,
    @align(8) rz_0 : f32,
};

@binding(13) @group(0) var<uniform> exaggerationP_0 : ExaggerationParams_std140_0;
struct DiffPair_vectorx3Cfloatx2C3x3E_0
{
     primal_0 : vec3<f32>,
     differential_0 : vec3<f32>,
};

struct DiffPair_float_0
{
     primal_0 : f32,
     differential_0 : f32,
};

fn _d_sqrt_0( dpx_0 : DiffPair_float_0) -> DiffPair_float_0
{
    var _S1 : DiffPair_float_0 = DiffPair_float_0( sqrt(dpx_0.primal_0), 0.5f / sqrt(max(1.00000001168609742e-07f, dpx_0.primal_0)) * dpx_0.differential_0 );
    return _S1;
}

fn s_fwd_length_impl_0( dpx_1 : DiffPair_vectorx3Cfloatx2C3x3E_0) -> DiffPair_float_0
{
    var _S2 : f32 = dpx_1.primal_0[i32(0)];
    var _S3 : f32 = dpx_1.differential_0[i32(0)] * dpx_1.primal_0[i32(0)];
    var _S4 : f32 = dpx_1.primal_0[i32(1)];
    var _S5 : f32 = dpx_1.differential_0[i32(1)] * dpx_1.primal_0[i32(1)];
    var _S6 : f32 = dpx_1.primal_0[i32(2)];
    var _S7 : f32 = dpx_1.differential_0[i32(2)] * dpx_1.primal_0[i32(2)];
    var _S8 : DiffPair_float_0 = DiffPair_float_0( _S2 * _S2 + _S4 * _S4 + _S6 * _S6, _S3 + _S3 + (_S5 + _S5) + (_S7 + _S7) );
    var _S9 : DiffPair_float_0 = _d_sqrt_0(_S8);
    var _S10 : DiffPair_float_0 = DiffPair_float_0( _S9.primal_0, _S9.differential_0 );
    return _S10;
}

fn s_fwd_normalize_impl_0( dpx_2 : DiffPair_vectorx3Cfloatx2C3x3E_0) -> DiffPair_vectorx3Cfloatx2C3x3E_0
{
    var _S11 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( dpx_2.primal_0, dpx_2.differential_0 );
    var _S12 : DiffPair_float_0 = s_fwd_length_impl_0(_S11);
    var _S13 : vec3<f32> = vec3<f32>((1.0f / _S12.primal_0));
    var _S14 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( dpx_2.primal_0 * _S13, dpx_2.differential_0 * _S13 + vec3<f32>(((0.0f - _S12.differential_0) / (_S12.primal_0 * _S12.primal_0))) * dpx_2.primal_0 );
    return _S14;
}

fn _d_min_0( dpx_3 : DiffPair_float_0,  dpy_0 : DiffPair_float_0) -> DiffPair_float_0
{
    var _S15 : f32 = min(dpx_3.primal_0, dpy_0.primal_0);
    var _S16 : f32;
    if(((dpx_3.primal_0) < (dpy_0.primal_0)))
    {
        _S16 = dpx_3.differential_0;
    }
    else
    {
        if(((dpx_3.primal_0) > (dpy_0.primal_0)))
        {
            _S16 = dpy_0.differential_0;
        }
        else
        {
            _S16 = 0.5f * (dpx_3.differential_0 + dpy_0.differential_0);
        }
    }
    var _S17 : DiffPair_float_0 = DiffPair_float_0( _S15, _S16 );
    return _S17;
}

fn _d_max_0( dpx_4 : DiffPair_float_0,  dpy_1 : DiffPair_float_0) -> DiffPair_float_0
{
    var _S18 : f32 = max(dpx_4.primal_0, dpy_1.primal_0);
    var _S19 : f32;
    if(((dpx_4.primal_0) > (dpy_1.primal_0)))
    {
        _S19 = dpx_4.differential_0;
    }
    else
    {
        if(((dpx_4.primal_0) < (dpy_1.primal_0)))
        {
            _S19 = dpy_1.differential_0;
        }
        else
        {
            _S19 = 0.5f * (dpx_4.differential_0 + dpy_1.differential_0);
        }
    }
    var _S20 : DiffPair_float_0 = DiffPair_float_0( _S18, _S19 );
    return _S20;
}

fn _d_cross_0( a_0 : DiffPair_vectorx3Cfloatx2C3x3E_0,  b_0 : DiffPair_vectorx3Cfloatx2C3x3E_0) -> DiffPair_vectorx3Cfloatx2C3x3E_0
{
    var _S21 : f32 = a_0.primal_0.y;
    var _S22 : f32 = b_0.primal_0.z;
    var _S23 : f32 = a_0.primal_0.z;
    var _S24 : f32 = b_0.primal_0.y;
    var _S25 : f32 = a_0.differential_0.y;
    var _S26 : f32 = b_0.differential_0.z;
    var _S27 : f32 = a_0.differential_0.z;
    var _S28 : f32 = b_0.differential_0.y;
    var _S29 : f32 = b_0.primal_0.x;
    var _S30 : f32 = a_0.primal_0.x;
    var _S31 : f32 = b_0.differential_0.x;
    var _S32 : f32 = a_0.differential_0.x;
    var _S33 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( vec3<f32>(_S21 * _S22 - _S23 * _S24, _S23 * _S29 - _S30 * _S22, _S30 * _S24 - _S21 * _S29), vec3<f32>(_S25 * _S22 + _S21 * _S26 - _S27 * _S24 - _S23 * _S28, _S27 * _S29 + _S23 * _S31 - _S32 * _S22 - _S30 * _S26, _S32 * _S24 + _S30 * _S28 - _S25 * _S29 - _S21 * _S31) );
    return _S33;
}

fn _d_cos_0( dpx_5 : DiffPair_float_0) -> DiffPair_float_0
{
    var _S34 : DiffPair_float_0 = DiffPair_float_0( cos(dpx_5.primal_0), - sin(dpx_5.primal_0) * dpx_5.differential_0 );
    return _S34;
}

fn _d_sin_0( dpx_6 : DiffPair_float_0) -> DiffPair_float_0
{
    var _S35 : DiffPair_float_0 = DiffPair_float_0( sin(dpx_6.primal_0), cos(dpx_6.primal_0) * dpx_6.differential_0 );
    return _S35;
}

fn _d_abs_0( dpx_7 : DiffPair_float_0) -> DiffPair_float_0
{
    var _S36 : DiffPair_float_0 = DiffPair_float_0( abs(dpx_7.primal_0), select(select(-1.0f, 0.0f, (dpx_7.primal_0) == 0.0f), 1.0f, ((dpx_7.primal_0) > 0.0f)) * dpx_7.differential_0 );
    return _S36;
}

fn _d_exp_0( dpx_8 : DiffPair_float_0) -> DiffPair_float_0
{
    var _S37 : f32 = exp(dpx_8.primal_0);
    var _S38 : DiffPair_float_0 = DiffPair_float_0( _S37, _S37 * dpx_8.differential_0 );
    return _S38;
}

fn _d_dot_0( dpx_9 : DiffPair_vectorx3Cfloatx2C3x3E_0,  dpy_2 : DiffPair_vectorx3Cfloatx2C3x3E_0) -> DiffPair_float_0
{
    var _S39 : DiffPair_float_0 = DiffPair_float_0( dpx_9.primal_0[i32(0)] * dpy_2.primal_0[i32(0)] + dpx_9.primal_0[i32(1)] * dpy_2.primal_0[i32(1)] + dpx_9.primal_0[i32(2)] * dpy_2.primal_0[i32(2)], dpx_9.primal_0[i32(0)] * dpy_2.differential_0[i32(0)] + dpy_2.primal_0[i32(0)] * dpx_9.differential_0[i32(0)] + dpx_9.primal_0[i32(1)] * dpy_2.differential_0[i32(1)] + dpy_2.primal_0[i32(1)] * dpx_9.differential_0[i32(1)] + dpx_9.primal_0[i32(2)] * dpy_2.differential_0[i32(2)] + dpy_2.primal_0[i32(2)] * dpx_9.differential_0[i32(2)] );
    return _S39;
}

fn scaleAboutF_0( p_0 : vec3<f32>,  q_0 : ptr<function, ScaleAboutParams_std140_0>) -> vec3<f32>
{
    var c_0 : vec3<f32> = vec3<f32>((*q_0).cx_0, (*q_0).cy_0, (*q_0).cz_0);
    return c_0 + vec3<f32>((*q_0).sx_0, (*q_0).sy_0, (*q_0).sz_0) * (p_0 - c_0);
}

fn s_fwd_scaleAboutF_0( dpp_0 : DiffPair_vectorx3Cfloatx2C3x3E_0,  q_1 : ptr<function, ScaleAboutParams_std140_0>) -> DiffPair_vectorx3Cfloatx2C3x3E_0
{
    var c_1 : vec3<f32> = vec3<f32>((*q_1).cx_0, (*q_1).cy_0, (*q_1).cz_0);
    var _S40 : vec3<f32> = vec3<f32>((*q_1).sx_0, (*q_1).sy_0, (*q_1).sz_0);
    var _S41 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( c_1 + _S40 * (dpp_0.primal_0 - c_1), dpp_0.differential_0 * _S40 );
    return _S41;
}

@compute
@workgroup_size(64, 1, 1)
fn scaleAboutParity(@builtin(global_invocation_id) id_0 : vec3<u32>)
{
    var _S42 : vec2<u32> = vec2<u32>(arrayLength(&points_0), 16);
    var _S43 : u32 = id_0.x;
    if((_S43 >= (_S42.x)))
    {
        return;
    }
    var p_1 : vec3<f32> = points_0[_S43].xyz;
    var _S44 : u32 = u32(4) * _S43;
    var _S45 : ScaleAboutParams_std140_0 = scaleAboutP_0;
    var _S46 : vec3<f32> = scaleAboutF_0(p_1, &(_S45));
    results_0[_S44] = vec4<f32>(_S46, 0.0f);
    var _S47 : u32 = _S44 + u32(1);
    var _S48 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( p_1, vec3<f32>(1.0f, 0.0f, 0.0f) );
    var _S49 : DiffPair_vectorx3Cfloatx2C3x3E_0 = s_fwd_scaleAboutF_0(_S48, &(_S45));
    results_0[_S47] = vec4<f32>(_S49.differential_0, 0.0f);
    var _S50 : u32 = _S44 + u32(2);
    var _S51 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( p_1, vec3<f32>(0.0f, 1.0f, 0.0f) );
    var _S52 : DiffPair_vectorx3Cfloatx2C3x3E_0 = s_fwd_scaleAboutF_0(_S51, &(_S45));
    results_0[_S50] = vec4<f32>(_S52.differential_0, 0.0f);
    var _S53 : u32 = _S44 + u32(3);
    var _S54 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( p_1, vec3<f32>(0.0f, 0.0f, 1.0f) );
    var _S55 : DiffPair_vectorx3Cfloatx2C3x3E_0 = s_fwd_scaleAboutF_0(_S54, &(_S45));
    results_0[_S53] = vec4<f32>(_S55.differential_0, 0.0f);
    return;
}

fn bumpF_0( p_2 : vec3<f32>,  q_2 : ptr<function, BumpParams_std140_0>) -> vec3<f32>
{
    var d_0 : vec3<f32> = p_2 - vec3<f32>((*q_2).cx_1, (*q_2).cy_1, (*q_2).cz_1);
    return p_2 + vec3<f32>(((*q_2).amplitude_0 * exp(- dot(d_0, d_0) / (2.0f * (*q_2).sigma_0 * (*q_2).sigma_0)))) * normalize(vec3<f32>((*q_2).ux_0, (*q_2).uy_0, (*q_2).uz_0));
}

fn s_fwd_bumpF_0( dpp_1 : DiffPair_vectorx3Cfloatx2C3x3E_0,  q_3 : ptr<function, BumpParams_std140_0>) -> DiffPair_vectorx3Cfloatx2C3x3E_0
{
    var _S56 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( dpp_1.primal_0 - vec3<f32>((*q_3).cx_1, (*q_3).cy_1, (*q_3).cz_1), dpp_1.differential_0 );
    var _S57 : DiffPair_float_0 = _d_dot_0(_S56, _S56);
    var _S58 : f32 = 2.0f * (*q_3).sigma_0 * (*q_3).sigma_0;
    var _S59 : DiffPair_float_0 = DiffPair_float_0( - _S57.primal_0 / _S58, - _S57.differential_0 / _S58 );
    var _S60 : DiffPair_float_0 = _d_exp_0(_S59);
    var _S61 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( vec3<f32>((*q_3).ux_0, (*q_3).uy_0, (*q_3).uz_0), vec3<f32>(0.0f, 0.0f, 0.0f) );
    var _S62 : DiffPair_vectorx3Cfloatx2C3x3E_0 = s_fwd_normalize_impl_0(_S61);
    var _S63 : vec3<f32> = vec3<f32>(((*q_3).amplitude_0 * _S60.primal_0));
    var _S64 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( dpp_1.primal_0 + _S63 * _S62.primal_0, dpp_1.differential_0 + (vec3<f32>((_S60.differential_0 * (*q_3).amplitude_0)) * _S62.primal_0 + _S62.differential_0 * _S63) );
    return _S64;
}

@compute
@workgroup_size(64, 1, 1)
fn bumpParity(@builtin(global_invocation_id) id_1 : vec3<u32>)
{
    var _S65 : vec2<u32> = vec2<u32>(arrayLength(&points_0), 16);
    var _S66 : u32 = id_1.x;
    if((_S66 >= (_S65.x)))
    {
        return;
    }
    var p_3 : vec3<f32> = points_0[_S66].xyz;
    var _S67 : u32 = u32(4) * _S66;
    var _S68 : BumpParams_std140_0 = bumpP_0;
    var _S69 : vec3<f32> = bumpF_0(p_3, &(_S68));
    results_0[_S67] = vec4<f32>(_S69, 0.0f);
    var _S70 : u32 = _S67 + u32(1);
    var _S71 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( p_3, vec3<f32>(1.0f, 0.0f, 0.0f) );
    var _S72 : DiffPair_vectorx3Cfloatx2C3x3E_0 = s_fwd_bumpF_0(_S71, &(_S68));
    results_0[_S70] = vec4<f32>(_S72.differential_0, 0.0f);
    var _S73 : u32 = _S67 + u32(2);
    var _S74 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( p_3, vec3<f32>(0.0f, 1.0f, 0.0f) );
    var _S75 : DiffPair_vectorx3Cfloatx2C3x3E_0 = s_fwd_bumpF_0(_S74, &(_S68));
    results_0[_S73] = vec4<f32>(_S75.differential_0, 0.0f);
    var _S76 : u32 = _S67 + u32(3);
    var _S77 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( p_3, vec3<f32>(0.0f, 0.0f, 1.0f) );
    var _S78 : DiffPair_vectorx3Cfloatx2C3x3E_0 = s_fwd_bumpF_0(_S77, &(_S68));
    results_0[_S76] = vec4<f32>(_S78.differential_0, 0.0f);
    return;
}

fn bendF_0( p_4 : vec3<f32>,  q_4 : ptr<function, BendParams_std140_0>) -> vec3<f32>
{
    var _S79 : f32 = (*q_4).curvature_0;
    if(((abs((*q_4).curvature_0)) < 9.999999960041972e-13f))
    {
        return p_4;
    }
    var radius_0 : f32 = 1.0f / _S79;
    var theta_0 : f32 = _S79 * (p_4.x - (*q_4).ox_0);
    var rr_0 : f32 = radius_0 - (p_4.z - (*q_4).oz_0);
    return vec3<f32>((*q_4).ox_0 + rr_0 * sin(theta_0), p_4.y, (*q_4).oz_0 + radius_0 - rr_0 * cos(theta_0));
}

fn s_fwd_bendF_0( dpp_2 : DiffPair_vectorx3Cfloatx2C3x3E_0,  q_5 : ptr<function, BendParams_std140_0>) -> DiffPair_vectorx3Cfloatx2C3x3E_0
{
    var _S80 : f32 = (*q_5).curvature_0;
    var _S81 : DiffPair_float_0 = DiffPair_float_0( (*q_5).curvature_0, 0.0f );
    if(((_d_abs_0(_S81).primal_0) < 9.999999960041972e-13f))
    {
        var _S82 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( dpp_2.primal_0, dpp_2.differential_0 );
        return _S82;
    }
    var radius_1 : f32 = 1.0f / _S80;
    var rr_1 : f32 = radius_1 - (dpp_2.primal_0.z - (*q_5).oz_0);
    var s_diff_rr_0 : f32 = 0.0f - dpp_2.differential_0.z;
    var _S83 : DiffPair_float_0 = DiffPair_float_0( _S80 * (dpp_2.primal_0.x - (*q_5).ox_0), dpp_2.differential_0.x * _S80 );
    var _S84 : DiffPair_float_0 = _d_sin_0(_S83);
    var _S85 : DiffPair_float_0 = _d_cos_0(_S83);
    var _S86 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( vec3<f32>((*q_5).ox_0 + rr_1 * _S84.primal_0, dpp_2.primal_0.y, (*q_5).oz_0 + radius_1 - rr_1 * _S85.primal_0), vec3<f32>(s_diff_rr_0 * _S84.primal_0 + _S84.differential_0 * rr_1, dpp_2.differential_0.y, 0.0f - (s_diff_rr_0 * _S85.primal_0 + _S85.differential_0 * rr_1)) );
    return _S86;
}

@compute
@workgroup_size(64, 1, 1)
fn bendParity(@builtin(global_invocation_id) id_2 : vec3<u32>)
{
    var _S87 : vec2<u32> = vec2<u32>(arrayLength(&points_0), 16);
    var _S88 : u32 = id_2.x;
    if((_S88 >= (_S87.x)))
    {
        return;
    }
    var p_5 : vec3<f32> = points_0[_S88].xyz;
    var _S89 : u32 = u32(4) * _S88;
    var _S90 : BendParams_std140_0 = bendP_0;
    var _S91 : vec3<f32> = bendF_0(p_5, &(_S90));
    results_0[_S89] = vec4<f32>(_S91, 0.0f);
    var _S92 : u32 = _S89 + u32(1);
    var _S93 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( p_5, vec3<f32>(1.0f, 0.0f, 0.0f) );
    var _S94 : DiffPair_vectorx3Cfloatx2C3x3E_0 = s_fwd_bendF_0(_S93, &(_S90));
    results_0[_S92] = vec4<f32>(_S94.differential_0, 0.0f);
    var _S95 : u32 = _S89 + u32(2);
    var _S96 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( p_5, vec3<f32>(0.0f, 1.0f, 0.0f) );
    var _S97 : DiffPair_vectorx3Cfloatx2C3x3E_0 = s_fwd_bendF_0(_S96, &(_S90));
    results_0[_S95] = vec4<f32>(_S97.differential_0, 0.0f);
    var _S98 : u32 = _S89 + u32(3);
    var _S99 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( p_5, vec3<f32>(0.0f, 0.0f, 1.0f) );
    var _S100 : DiffPair_vectorx3Cfloatx2C3x3E_0 = s_fwd_bendF_0(_S99, &(_S90));
    results_0[_S98] = vec4<f32>(_S100.differential_0, 0.0f);
    return;
}

fn twistF_0( p_6 : vec3<f32>,  q_6 : ptr<function, TwistParams_std140_0>) -> vec3<f32>
{
    var o_0 : vec3<f32> = vec3<f32>((*q_6).ox_1, (*q_6).oy_0, (*q_6).oz_1);
    var a_1 : vec3<f32> = normalize(vec3<f32>((*q_6).ax_0, (*q_6).ay_0, (*q_6).az_0));
    var d_1 : vec3<f32> = p_6 - o_0;
    var t_0 : f32 = dot(d_1, a_1);
    var _S101 : vec3<f32> = vec3<f32>(t_0) * a_1;
    var m_0 : vec3<f32> = d_1 - _S101;
    var theta_1 : f32 = (*q_6).rate_0 * t_0;
    return o_0 + _S101 + m_0 * vec3<f32>(cos(theta_1)) + cross(a_1, m_0) * vec3<f32>(sin(theta_1));
}

fn s_fwd_twistF_0( dpp_3 : DiffPair_vectorx3Cfloatx2C3x3E_0,  q_7 : ptr<function, TwistParams_std140_0>) -> DiffPair_vectorx3Cfloatx2C3x3E_0
{
    var o_1 : vec3<f32> = vec3<f32>((*q_7).ox_1, (*q_7).oy_0, (*q_7).oz_1);
    var _S102 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( vec3<f32>((*q_7).ax_0, (*q_7).ay_0, (*q_7).az_0), vec3<f32>(0.0f, 0.0f, 0.0f) );
    var _S103 : DiffPair_vectorx3Cfloatx2C3x3E_0 = s_fwd_normalize_impl_0(_S102);
    var d_2 : vec3<f32> = dpp_3.primal_0 - o_1;
    var _S104 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( d_2, dpp_3.differential_0 );
    var _S105 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( _S103.primal_0, _S103.differential_0 );
    var _S106 : DiffPair_float_0 = _d_dot_0(_S104, _S105);
    var _S107 : vec3<f32> = vec3<f32>(_S106.primal_0);
    var _S108 : vec3<f32> = _S107 * _S103.primal_0;
    var _S109 : vec3<f32> = vec3<f32>(_S106.differential_0) * _S103.primal_0 + _S103.differential_0 * _S107;
    var m_1 : vec3<f32> = d_2 - _S108;
    var s_diff_m_0 : vec3<f32> = dpp_3.differential_0 - _S109;
    var _S110 : DiffPair_float_0 = DiffPair_float_0( (*q_7).rate_0 * _S106.primal_0, _S106.differential_0 * (*q_7).rate_0 );
    var _S111 : DiffPair_float_0 = _d_cos_0(_S110);
    var _S112 : vec3<f32> = vec3<f32>(_S111.primal_0);
    var _S113 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( m_1, s_diff_m_0 );
    var _S114 : DiffPair_vectorx3Cfloatx2C3x3E_0 = _d_cross_0(_S105, _S113);
    var _S115 : DiffPair_float_0 = _d_sin_0(_S110);
    var _S116 : vec3<f32> = vec3<f32>(_S115.primal_0);
    var _S117 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( o_1 + _S108 + m_1 * _S112 + _S114.primal_0 * _S116, _S109 + (s_diff_m_0 * _S112 + vec3<f32>(_S111.differential_0) * m_1) + (_S114.differential_0 * _S116 + vec3<f32>(_S115.differential_0) * _S114.primal_0) );
    return _S117;
}

@compute
@workgroup_size(64, 1, 1)
fn twistParity(@builtin(global_invocation_id) id_3 : vec3<u32>)
{
    var _S118 : vec2<u32> = vec2<u32>(arrayLength(&points_0), 16);
    var _S119 : u32 = id_3.x;
    if((_S119 >= (_S118.x)))
    {
        return;
    }
    var p_7 : vec3<f32> = points_0[_S119].xyz;
    var _S120 : u32 = u32(4) * _S119;
    var _S121 : TwistParams_std140_0 = twistP_0;
    var _S122 : vec3<f32> = twistF_0(p_7, &(_S121));
    results_0[_S120] = vec4<f32>(_S122, 0.0f);
    var _S123 : u32 = _S120 + u32(1);
    var _S124 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( p_7, vec3<f32>(1.0f, 0.0f, 0.0f) );
    var _S125 : DiffPair_vectorx3Cfloatx2C3x3E_0 = s_fwd_twistF_0(_S124, &(_S121));
    results_0[_S123] = vec4<f32>(_S125.differential_0, 0.0f);
    var _S126 : u32 = _S120 + u32(2);
    var _S127 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( p_7, vec3<f32>(0.0f, 1.0f, 0.0f) );
    var _S128 : DiffPair_vectorx3Cfloatx2C3x3E_0 = s_fwd_twistF_0(_S127, &(_S121));
    results_0[_S126] = vec4<f32>(_S128.differential_0, 0.0f);
    var _S129 : u32 = _S120 + u32(3);
    var _S130 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( p_7, vec3<f32>(0.0f, 0.0f, 1.0f) );
    var _S131 : DiffPair_vectorx3Cfloatx2C3x3E_0 = s_fwd_twistF_0(_S130, &(_S121));
    results_0[_S129] = vec4<f32>(_S131.differential_0, 0.0f);
    return;
}

fn taperF_0( p_8 : vec3<f32>,  q_8 : ptr<function, TwistParams_std140_0>) -> vec3<f32>
{
    var o_2 : vec3<f32> = vec3<f32>((*q_8).ox_1, (*q_8).oy_0, (*q_8).oz_1);
    var a_2 : vec3<f32> = normalize(vec3<f32>((*q_8).ax_0, (*q_8).ay_0, (*q_8).az_0));
    var d_3 : vec3<f32> = p_8 - o_2;
    var t_1 : f32 = dot(d_3, a_2);
    var _S132 : vec3<f32> = vec3<f32>(t_1) * a_2;
    return o_2 + _S132 + vec3<f32>((1.0f + (*q_8).rate_0 * t_1)) * (d_3 - _S132);
}

fn s_fwd_taperF_0( dpp_4 : DiffPair_vectorx3Cfloatx2C3x3E_0,  q_9 : ptr<function, TwistParams_std140_0>) -> DiffPair_vectorx3Cfloatx2C3x3E_0
{
    var o_3 : vec3<f32> = vec3<f32>((*q_9).ox_1, (*q_9).oy_0, (*q_9).oz_1);
    var _S133 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( vec3<f32>((*q_9).ax_0, (*q_9).ay_0, (*q_9).az_0), vec3<f32>(0.0f, 0.0f, 0.0f) );
    var _S134 : DiffPair_vectorx3Cfloatx2C3x3E_0 = s_fwd_normalize_impl_0(_S133);
    var d_4 : vec3<f32> = dpp_4.primal_0 - o_3;
    var _S135 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( d_4, dpp_4.differential_0 );
    var _S136 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( _S134.primal_0, _S134.differential_0 );
    var _S137 : DiffPair_float_0 = _d_dot_0(_S135, _S136);
    var _S138 : vec3<f32> = vec3<f32>(_S137.primal_0);
    var _S139 : vec3<f32> = _S138 * _S134.primal_0;
    var _S140 : vec3<f32> = vec3<f32>(_S137.differential_0) * _S134.primal_0 + _S134.differential_0 * _S138;
    var _S141 : vec3<f32> = d_4 - _S139;
    var _S142 : vec3<f32> = vec3<f32>((1.0f + (*q_9).rate_0 * _S137.primal_0));
    var _S143 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( o_3 + _S139 + _S142 * _S141, _S140 + (vec3<f32>((_S137.differential_0 * (*q_9).rate_0)) * _S141 + (dpp_4.differential_0 - _S140) * _S142) );
    return _S143;
}

@compute
@workgroup_size(64, 1, 1)
fn taperParity(@builtin(global_invocation_id) id_4 : vec3<u32>)
{
    var _S144 : vec2<u32> = vec2<u32>(arrayLength(&points_0), 16);
    var _S145 : u32 = id_4.x;
    if((_S145 >= (_S144.x)))
    {
        return;
    }
    var p_9 : vec3<f32> = points_0[_S145].xyz;
    var _S146 : u32 = u32(4) * _S145;
    var _S147 : TwistParams_std140_0 = taperP_0;
    var _S148 : vec3<f32> = taperF_0(p_9, &(_S147));
    results_0[_S146] = vec4<f32>(_S148, 0.0f);
    var _S149 : u32 = _S146 + u32(1);
    var _S150 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( p_9, vec3<f32>(1.0f, 0.0f, 0.0f) );
    var _S151 : DiffPair_vectorx3Cfloatx2C3x3E_0 = s_fwd_taperF_0(_S150, &(_S147));
    results_0[_S149] = vec4<f32>(_S151.differential_0, 0.0f);
    var _S152 : u32 = _S146 + u32(2);
    var _S153 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( p_9, vec3<f32>(0.0f, 1.0f, 0.0f) );
    var _S154 : DiffPair_vectorx3Cfloatx2C3x3E_0 = s_fwd_taperF_0(_S153, &(_S147));
    results_0[_S152] = vec4<f32>(_S154.differential_0, 0.0f);
    var _S155 : u32 = _S146 + u32(3);
    var _S156 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( p_9, vec3<f32>(0.0f, 0.0f, 1.0f) );
    var _S157 : DiffPair_vectorx3Cfloatx2C3x3E_0 = s_fwd_taperF_0(_S156, &(_S147));
    results_0[_S155] = vec4<f32>(_S157.differential_0, 0.0f);
    return;
}

fn bernstein2_0( x_0 : f32,  i_0 : i32) -> f32
{
    var y_0 : f32 = 1.0f - x_0;
    var _S158 : f32;
    if(i_0 == i32(0))
    {
        _S158 = y_0 * y_0;
    }
    else
    {
        if(i_0 == i32(1))
        {
            _S158 = 2.0f * x_0 * y_0;
        }
        else
        {
            _S158 = x_0 * x_0;
        }
    }
    return _S158;
}

fn s_fwd_bernstein2_0( dpx_10 : DiffPair_float_0,  i_1 : i32) -> DiffPair_float_0
{
    var y_1 : f32 = 1.0f - dpx_10.primal_0;
    var s_diff_y_0 : f32 = 0.0f - dpx_10.differential_0;
    var _S159 : f32;
    var _S160 : f32;
    if(i_1 == i32(0))
    {
        var _S161 : f32 = s_diff_y_0 * y_1;
        var _S162 : f32 = _S161 + _S161;
        _S159 = y_1 * y_1;
        _S160 = _S162;
    }
    else
    {
        if(i_1 == i32(1))
        {
            var _S163 : f32 = 2.0f * dpx_10.primal_0;
            var _S164 : f32 = dpx_10.differential_0 * 2.0f * y_1 + s_diff_y_0 * _S163;
            _S159 = _S163 * y_1;
            _S160 = _S164;
        }
        else
        {
            var _S165 : f32 = dpx_10.differential_0 * dpx_10.primal_0;
            var _S166 : f32 = _S165 + _S165;
            _S159 = dpx_10.primal_0 * dpx_10.primal_0;
            _S160 = _S166;
        }
    }
    var _S167 : DiffPair_float_0 = DiffPair_float_0( _S159, _S160 );
    return _S167;
}

fn latticeF_0( p_10 : vec3<f32>,  q_10 : ptr<function, LatticeParams_std140_0>) -> vec3<f32>
{
    var e1_0 : vec3<f32> = vec3<f32>((*q_10).e1x_0, (*q_10).e1y_0, (*q_10).e1z_0);
    var e2_0 : vec3<f32> = vec3<f32>((*q_10).e2x_0, (*q_10).e2y_0, (*q_10).e2z_0);
    var e3_0 : vec3<f32> = vec3<f32>((*q_10).e3x_0, (*q_10).e3y_0, (*q_10).e3z_0);
    var d_5 : vec3<f32> = p_10 - vec3<f32>((*q_10).ox_2, (*q_10).oy_1, (*q_10).oz_2);
    var c23_0 : vec3<f32> = cross(e2_0, e3_0);
    var det_0 : f32 = dot(e1_0, c23_0);
    var _S168 : f32 = dot(c23_0, d_5) / det_0;
    var _S169 : f32 = dot(cross(e3_0, e1_0), d_5) / det_0;
    var _S170 : f32 = dot(cross(e1_0, e2_0), d_5) / det_0;
    var _S171 : f32 = bernstein2_0(_S168, i32(0));
    var _S172 : f32 = bernstein2_0(_S169, i32(0));
    var _S173 : f32 = _S171 * _S172;
    var _S174 : f32 = bernstein2_0(_S170, i32(0));
    var _S175 : f32 = bernstein2_0(_S170, i32(1));
    var _S176 : f32 = bernstein2_0(_S170, i32(2));
    var _S177 : f32 = bernstein2_0(_S169, i32(1));
    var _S178 : f32 = _S171 * _S177;
    var _S179 : f32 = bernstein2_0(_S169, i32(2));
    var _S180 : f32 = _S171 * _S179;
    var _S181 : f32 = bernstein2_0(_S168, i32(1));
    var _S182 : f32 = _S181 * _S172;
    var _S183 : f32 = _S181 * _S177;
    var _S184 : f32 = _S181 * _S179;
    var _S185 : f32 = bernstein2_0(_S168, i32(2));
    var _S186 : f32 = _S185 * _S172;
    var _S187 : f32 = _S185 * _S177;
    var _S188 : f32 = _S185 * _S179;
    return p_10 + vec3<f32>((_S173 * _S174)) * latticeD_0[i32(0)].xyz + vec3<f32>((_S173 * _S175)) * latticeD_0[i32(1)].xyz + vec3<f32>((_S173 * _S176)) * latticeD_0[i32(2)].xyz + vec3<f32>((_S178 * _S174)) * latticeD_0[i32(3)].xyz + vec3<f32>((_S178 * _S175)) * latticeD_0[i32(4)].xyz + vec3<f32>((_S178 * _S176)) * latticeD_0[i32(5)].xyz + vec3<f32>((_S180 * _S174)) * latticeD_0[i32(6)].xyz + vec3<f32>((_S180 * _S175)) * latticeD_0[i32(7)].xyz + vec3<f32>((_S180 * _S176)) * latticeD_0[i32(8)].xyz + vec3<f32>((_S182 * _S174)) * latticeD_0[i32(9)].xyz + vec3<f32>((_S182 * _S175)) * latticeD_0[i32(10)].xyz + vec3<f32>((_S182 * _S176)) * latticeD_0[i32(11)].xyz + vec3<f32>((_S183 * _S174)) * latticeD_0[i32(12)].xyz + vec3<f32>((_S183 * _S175)) * latticeD_0[i32(13)].xyz + vec3<f32>((_S183 * _S176)) * latticeD_0[i32(14)].xyz + vec3<f32>((_S184 * _S174)) * latticeD_0[i32(15)].xyz + vec3<f32>((_S184 * _S175)) * latticeD_0[i32(16)].xyz + vec3<f32>((_S184 * _S176)) * latticeD_0[i32(17)].xyz + vec3<f32>((_S186 * _S174)) * latticeD_0[i32(18)].xyz + vec3<f32>((_S186 * _S175)) * latticeD_0[i32(19)].xyz + vec3<f32>((_S186 * _S176)) * latticeD_0[i32(20)].xyz + vec3<f32>((_S187 * _S174)) * latticeD_0[i32(21)].xyz + vec3<f32>((_S187 * _S175)) * latticeD_0[i32(22)].xyz + vec3<f32>((_S187 * _S176)) * latticeD_0[i32(23)].xyz + vec3<f32>((_S188 * _S174)) * latticeD_0[i32(24)].xyz + vec3<f32>((_S188 * _S175)) * latticeD_0[i32(25)].xyz + vec3<f32>((_S188 * _S176)) * latticeD_0[i32(26)].xyz;
}

fn s_fwd_latticeF_0( dpp_5 : DiffPair_vectorx3Cfloatx2C3x3E_0,  q_11 : ptr<function, LatticeParams_std140_0>) -> DiffPair_vectorx3Cfloatx2C3x3E_0
{
    const s_diff_e1_0 : vec3<f32> = vec3<f32>(0.0f, 0.0f, 0.0f);
    var _S189 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( vec3<f32>((*q_11).e2x_0, (*q_11).e2y_0, (*q_11).e2z_0), s_diff_e1_0 );
    var _S190 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( vec3<f32>((*q_11).e3x_0, (*q_11).e3y_0, (*q_11).e3z_0), s_diff_e1_0 );
    var _S191 : DiffPair_vectorx3Cfloatx2C3x3E_0 = _d_cross_0(_S189, _S190);
    var _S192 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( vec3<f32>((*q_11).e1x_0, (*q_11).e1y_0, (*q_11).e1z_0), s_diff_e1_0 );
    var _S193 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( _S191.primal_0, _S191.differential_0 );
    var _S194 : DiffPair_float_0 = _d_dot_0(_S192, _S193);
    var _S195 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( dpp_5.primal_0 - vec3<f32>((*q_11).ox_2, (*q_11).oy_1, (*q_11).oz_2), dpp_5.differential_0 );
    var _S196 : DiffPair_float_0 = _d_dot_0(_S193, _S195);
    var _S197 : f32 = _S194.primal_0 * _S194.primal_0;
    var _S198 : DiffPair_vectorx3Cfloatx2C3x3E_0 = _d_cross_0(_S190, _S192);
    var _S199 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( _S198.primal_0, _S198.differential_0 );
    var _S200 : DiffPair_float_0 = _d_dot_0(_S199, _S195);
    var _S201 : DiffPair_vectorx3Cfloatx2C3x3E_0 = _d_cross_0(_S192, _S189);
    var _S202 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( _S201.primal_0, _S201.differential_0 );
    var _S203 : DiffPair_float_0 = _d_dot_0(_S202, _S195);
    var _S204 : DiffPair_float_0 = DiffPair_float_0( _S196.primal_0 / _S194.primal_0, (_S196.differential_0 * _S194.primal_0 - _S196.primal_0 * _S194.differential_0) / _S197 );
    var _S205 : DiffPair_float_0 = s_fwd_bernstein2_0(_S204, i32(0));
    var _S206 : DiffPair_float_0 = DiffPair_float_0( _S200.primal_0 / _S194.primal_0, (_S200.differential_0 * _S194.primal_0 - _S200.primal_0 * _S194.differential_0) / _S197 );
    var _S207 : DiffPair_float_0 = s_fwd_bernstein2_0(_S206, i32(0));
    var _S208 : f32 = _S205.primal_0 * _S207.primal_0;
    var _S209 : f32 = _S205.differential_0 * _S207.primal_0 + _S207.differential_0 * _S205.primal_0;
    var _S210 : DiffPair_float_0 = DiffPair_float_0( _S203.primal_0 / _S194.primal_0, (_S203.differential_0 * _S194.primal_0 - _S203.primal_0 * _S194.differential_0) / _S197 );
    var _S211 : DiffPair_float_0 = s_fwd_bernstein2_0(_S210, i32(0));
    var _S212 : DiffPair_float_0 = s_fwd_bernstein2_0(_S210, i32(1));
    var _S213 : DiffPair_float_0 = s_fwd_bernstein2_0(_S210, i32(2));
    var _S214 : DiffPair_float_0 = s_fwd_bernstein2_0(_S206, i32(1));
    var _S215 : f32 = _S205.primal_0 * _S214.primal_0;
    var _S216 : f32 = _S205.differential_0 * _S214.primal_0 + _S214.differential_0 * _S205.primal_0;
    var _S217 : DiffPair_float_0 = s_fwd_bernstein2_0(_S206, i32(2));
    var _S218 : f32 = _S205.primal_0 * _S217.primal_0;
    var _S219 : f32 = _S205.differential_0 * _S217.primal_0 + _S217.differential_0 * _S205.primal_0;
    var _S220 : DiffPair_float_0 = s_fwd_bernstein2_0(_S204, i32(1));
    var _S221 : f32 = _S220.primal_0 * _S207.primal_0;
    var _S222 : f32 = _S220.differential_0 * _S207.primal_0 + _S207.differential_0 * _S220.primal_0;
    var _S223 : f32 = _S220.primal_0 * _S214.primal_0;
    var _S224 : f32 = _S220.differential_0 * _S214.primal_0 + _S214.differential_0 * _S220.primal_0;
    var _S225 : f32 = _S220.primal_0 * _S217.primal_0;
    var _S226 : f32 = _S220.differential_0 * _S217.primal_0 + _S217.differential_0 * _S220.primal_0;
    var _S227 : DiffPair_float_0 = s_fwd_bernstein2_0(_S204, i32(2));
    var _S228 : f32 = _S227.primal_0 * _S207.primal_0;
    var _S229 : f32 = _S227.differential_0 * _S207.primal_0 + _S207.differential_0 * _S227.primal_0;
    var _S230 : f32 = _S227.primal_0 * _S214.primal_0;
    var _S231 : f32 = _S227.differential_0 * _S214.primal_0 + _S214.differential_0 * _S227.primal_0;
    var _S232 : f32 = _S227.primal_0 * _S217.primal_0;
    var _S233 : f32 = _S227.differential_0 * _S217.primal_0 + _S217.differential_0 * _S227.primal_0;
    var _S234 : vec3<f32> = latticeD_0[i32(0)].xyz;
    var _S235 : vec3<f32> = latticeD_0[i32(1)].xyz;
    var _S236 : vec3<f32> = latticeD_0[i32(2)].xyz;
    var _S237 : vec3<f32> = latticeD_0[i32(3)].xyz;
    var _S238 : vec3<f32> = latticeD_0[i32(4)].xyz;
    var _S239 : vec3<f32> = latticeD_0[i32(5)].xyz;
    var _S240 : vec3<f32> = latticeD_0[i32(6)].xyz;
    var _S241 : vec3<f32> = latticeD_0[i32(7)].xyz;
    var _S242 : vec3<f32> = latticeD_0[i32(8)].xyz;
    var _S243 : vec3<f32> = latticeD_0[i32(9)].xyz;
    var _S244 : vec3<f32> = latticeD_0[i32(10)].xyz;
    var _S245 : vec3<f32> = latticeD_0[i32(11)].xyz;
    var _S246 : vec3<f32> = latticeD_0[i32(12)].xyz;
    var _S247 : vec3<f32> = latticeD_0[i32(13)].xyz;
    var _S248 : vec3<f32> = latticeD_0[i32(14)].xyz;
    var _S249 : vec3<f32> = latticeD_0[i32(15)].xyz;
    var _S250 : vec3<f32> = latticeD_0[i32(16)].xyz;
    var _S251 : vec3<f32> = latticeD_0[i32(17)].xyz;
    var _S252 : vec3<f32> = latticeD_0[i32(18)].xyz;
    var _S253 : vec3<f32> = latticeD_0[i32(19)].xyz;
    var _S254 : vec3<f32> = latticeD_0[i32(20)].xyz;
    var _S255 : vec3<f32> = latticeD_0[i32(21)].xyz;
    var _S256 : vec3<f32> = latticeD_0[i32(22)].xyz;
    var _S257 : vec3<f32> = latticeD_0[i32(23)].xyz;
    var _S258 : vec3<f32> = latticeD_0[i32(24)].xyz;
    var _S259 : vec3<f32> = latticeD_0[i32(25)].xyz;
    var _S260 : vec3<f32> = latticeD_0[i32(26)].xyz;
    var _S261 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( dpp_5.primal_0 + vec3<f32>((_S208 * _S211.primal_0)) * _S234 + vec3<f32>((_S208 * _S212.primal_0)) * _S235 + vec3<f32>((_S208 * _S213.primal_0)) * _S236 + vec3<f32>((_S215 * _S211.primal_0)) * _S237 + vec3<f32>((_S215 * _S212.primal_0)) * _S238 + vec3<f32>((_S215 * _S213.primal_0)) * _S239 + vec3<f32>((_S218 * _S211.primal_0)) * _S240 + vec3<f32>((_S218 * _S212.primal_0)) * _S241 + vec3<f32>((_S218 * _S213.primal_0)) * _S242 + vec3<f32>((_S221 * _S211.primal_0)) * _S243 + vec3<f32>((_S221 * _S212.primal_0)) * _S244 + vec3<f32>((_S221 * _S213.primal_0)) * _S245 + vec3<f32>((_S223 * _S211.primal_0)) * _S246 + vec3<f32>((_S223 * _S212.primal_0)) * _S247 + vec3<f32>((_S223 * _S213.primal_0)) * _S248 + vec3<f32>((_S225 * _S211.primal_0)) * _S249 + vec3<f32>((_S225 * _S212.primal_0)) * _S250 + vec3<f32>((_S225 * _S213.primal_0)) * _S251 + vec3<f32>((_S228 * _S211.primal_0)) * _S252 + vec3<f32>((_S228 * _S212.primal_0)) * _S253 + vec3<f32>((_S228 * _S213.primal_0)) * _S254 + vec3<f32>((_S230 * _S211.primal_0)) * _S255 + vec3<f32>((_S230 * _S212.primal_0)) * _S256 + vec3<f32>((_S230 * _S213.primal_0)) * _S257 + vec3<f32>((_S232 * _S211.primal_0)) * _S258 + vec3<f32>((_S232 * _S212.primal_0)) * _S259 + vec3<f32>((_S232 * _S213.primal_0)) * _S260, dpp_5.differential_0 + vec3<f32>((_S209 * _S211.primal_0 + _S211.differential_0 * _S208)) * _S234 + vec3<f32>((_S209 * _S212.primal_0 + _S212.differential_0 * _S208)) * _S235 + vec3<f32>((_S209 * _S213.primal_0 + _S213.differential_0 * _S208)) * _S236 + vec3<f32>((_S216 * _S211.primal_0 + _S211.differential_0 * _S215)) * _S237 + vec3<f32>((_S216 * _S212.primal_0 + _S212.differential_0 * _S215)) * _S238 + vec3<f32>((_S216 * _S213.primal_0 + _S213.differential_0 * _S215)) * _S239 + vec3<f32>((_S219 * _S211.primal_0 + _S211.differential_0 * _S218)) * _S240 + vec3<f32>((_S219 * _S212.primal_0 + _S212.differential_0 * _S218)) * _S241 + vec3<f32>((_S219 * _S213.primal_0 + _S213.differential_0 * _S218)) * _S242 + vec3<f32>((_S222 * _S211.primal_0 + _S211.differential_0 * _S221)) * _S243 + vec3<f32>((_S222 * _S212.primal_0 + _S212.differential_0 * _S221)) * _S244 + vec3<f32>((_S222 * _S213.primal_0 + _S213.differential_0 * _S221)) * _S245 + vec3<f32>((_S224 * _S211.primal_0 + _S211.differential_0 * _S223)) * _S246 + vec3<f32>((_S224 * _S212.primal_0 + _S212.differential_0 * _S223)) * _S247 + vec3<f32>((_S224 * _S213.primal_0 + _S213.differential_0 * _S223)) * _S248 + vec3<f32>((_S226 * _S211.primal_0 + _S211.differential_0 * _S225)) * _S249 + vec3<f32>((_S226 * _S212.primal_0 + _S212.differential_0 * _S225)) * _S250 + vec3<f32>((_S226 * _S213.primal_0 + _S213.differential_0 * _S225)) * _S251 + vec3<f32>((_S229 * _S211.primal_0 + _S211.differential_0 * _S228)) * _S252 + vec3<f32>((_S229 * _S212.primal_0 + _S212.differential_0 * _S228)) * _S253 + vec3<f32>((_S229 * _S213.primal_0 + _S213.differential_0 * _S228)) * _S254 + vec3<f32>((_S231 * _S211.primal_0 + _S211.differential_0 * _S230)) * _S255 + vec3<f32>((_S231 * _S212.primal_0 + _S212.differential_0 * _S230)) * _S256 + vec3<f32>((_S231 * _S213.primal_0 + _S213.differential_0 * _S230)) * _S257 + vec3<f32>((_S233 * _S211.primal_0 + _S211.differential_0 * _S232)) * _S258 + vec3<f32>((_S233 * _S212.primal_0 + _S212.differential_0 * _S232)) * _S259 + vec3<f32>((_S233 * _S213.primal_0 + _S213.differential_0 * _S232)) * _S260 );
    return _S261;
}

@compute
@workgroup_size(64, 1, 1)
fn latticeParity(@builtin(global_invocation_id) id_5 : vec3<u32>)
{
    var _S262 : vec2<u32> = vec2<u32>(arrayLength(&points_0), 16);
    var _S263 : u32 = id_5.x;
    if((_S263 >= (_S262.x)))
    {
        return;
    }
    var p_11 : vec3<f32> = points_0[_S263].xyz;
    var _S264 : u32 = u32(4) * _S263;
    var _S265 : LatticeParams_std140_0 = latticeP_0;
    var _S266 : vec3<f32> = latticeF_0(p_11, &(_S265));
    results_0[_S264] = vec4<f32>(_S266, 0.0f);
    var _S267 : u32 = _S264 + u32(1);
    var _S268 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( p_11, vec3<f32>(1.0f, 0.0f, 0.0f) );
    var _S269 : DiffPair_vectorx3Cfloatx2C3x3E_0 = s_fwd_latticeF_0(_S268, &(_S265));
    results_0[_S267] = vec4<f32>(_S269.differential_0, 0.0f);
    var _S270 : u32 = _S264 + u32(2);
    var _S271 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( p_11, vec3<f32>(0.0f, 1.0f, 0.0f) );
    var _S272 : DiffPair_vectorx3Cfloatx2C3x3E_0 = s_fwd_latticeF_0(_S271, &(_S265));
    results_0[_S270] = vec4<f32>(_S272.differential_0, 0.0f);
    var _S273 : u32 = _S264 + u32(3);
    var _S274 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( p_11, vec3<f32>(0.0f, 0.0f, 1.0f) );
    var _S275 : DiffPair_vectorx3Cfloatx2C3x3E_0 = s_fwd_latticeF_0(_S274, &(_S265));
    results_0[_S273] = vec4<f32>(_S275.differential_0, 0.0f);
    return;
}

fn radialDistortionF_0( p_12 : vec3<f32>,  q_12 : ptr<function, RadialParams_std140_0>) -> vec3<f32>
{
    var _S276 : f32 = p_12.z;
    var u_0 : f32 = p_12.x / _S276;
    var v_0 : f32 = p_12.y / _S276;
    var r2_0 : f32 = u_0 * u_0 + v_0 * v_0;
    var radial_0 : f32 = 1.0f + r2_0 * ((*q_12).k1_0 + r2_0 * ((*q_12).k2_0 + r2_0 * (*q_12).k3_0));
    return vec3<f32>((u_0 * radial_0 + (2.0f * (*q_12).p1_0 * u_0 * v_0 + (*q_12).p2_0 * (r2_0 + 2.0f * u_0 * u_0))) * _S276, (v_0 * radial_0 + ((*q_12).p1_0 * (r2_0 + 2.0f * v_0 * v_0) + 2.0f * (*q_12).p2_0 * u_0 * v_0)) * _S276, _S276);
}

fn s_fwd_radialDistortionF_0( dpp_6 : DiffPair_vectorx3Cfloatx2C3x3E_0,  q_13 : ptr<function, RadialParams_std140_0>) -> DiffPair_vectorx3Cfloatx2C3x3E_0
{
    var _S277 : f32 = dpp_6.primal_0.x;
    var _S278 : f32 = dpp_6.primal_0.z;
    var _S279 : f32 = dpp_6.differential_0.z;
    var u_1 : f32 = _S277 / _S278;
    var _S280 : f32 = _S278 * _S278;
    var s_diff_u_0 : f32 = (dpp_6.differential_0.x * _S278 - _S277 * _S279) / _S280;
    var _S281 : f32 = dpp_6.primal_0.y;
    var v_1 : f32 = _S281 / _S278;
    var s_diff_v_0 : f32 = (dpp_6.differential_0.y * _S278 - _S281 * _S279) / _S280;
    var _S282 : f32 = s_diff_u_0 * u_1;
    var _S283 : f32 = s_diff_v_0 * v_1;
    var r2_1 : f32 = u_1 * u_1 + v_1 * v_1;
    var s_diff_r2_0 : f32 = _S282 + _S282 + (_S283 + _S283);
    var _S284 : f32 = (*q_13).k2_0 + r2_1 * (*q_13).k3_0;
    var _S285 : f32 = (*q_13).k1_0 + r2_1 * _S284;
    var _S286 : f32 = s_diff_r2_0 * _S285 + (s_diff_r2_0 * _S284 + s_diff_r2_0 * (*q_13).k3_0 * r2_1) * r2_1;
    var radial_1 : f32 = 1.0f + r2_1 * _S285;
    var _S287 : f32 = 2.0f * (*q_13).p1_0;
    var _S288 : f32 = _S287 * u_1;
    var _S289 : f32 = 2.0f * u_1;
    var _S290 : f32 = 2.0f * v_1;
    var _S291 : f32 = 2.0f * (*q_13).p2_0;
    var _S292 : f32 = _S291 * u_1;
    var _S293 : f32 = u_1 * radial_1 + (_S288 * v_1 + (*q_13).p2_0 * (r2_1 + _S289 * u_1));
    var _S294 : f32 = v_1 * radial_1 + ((*q_13).p1_0 * (r2_1 + _S290 * v_1) + _S292 * v_1);
    var _S295 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( vec3<f32>(_S293 * _S278, _S294 * _S278, _S278), vec3<f32>((s_diff_u_0 * radial_1 + _S286 * u_1 + (s_diff_u_0 * _S287 * v_1 + s_diff_v_0 * _S288 + (s_diff_r2_0 + (s_diff_u_0 * 2.0f * u_1 + s_diff_u_0 * _S289)) * (*q_13).p2_0)) * _S278 + _S279 * _S293, (s_diff_v_0 * radial_1 + _S286 * v_1 + ((s_diff_r2_0 + (s_diff_v_0 * 2.0f * v_1 + s_diff_v_0 * _S290)) * (*q_13).p1_0 + (s_diff_u_0 * _S291 * v_1 + s_diff_v_0 * _S292))) * _S278 + _S279 * _S294, _S279) );
    return _S295;
}

@compute
@workgroup_size(64, 1, 1)
fn radialDistortionParity(@builtin(global_invocation_id) id_6 : vec3<u32>)
{
    var _S296 : vec2<u32> = vec2<u32>(arrayLength(&points_0), 16);
    var _S297 : u32 = id_6.x;
    if((_S297 >= (_S296.x)))
    {
        return;
    }
    var p_13 : vec3<f32> = points_0[_S297].xyz;
    var _S298 : u32 = u32(4) * _S297;
    var _S299 : RadialParams_std140_0 = radialP_0;
    var _S300 : vec3<f32> = radialDistortionF_0(p_13, &(_S299));
    results_0[_S298] = vec4<f32>(_S300, 0.0f);
    var _S301 : u32 = _S298 + u32(1);
    var _S302 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( p_13, vec3<f32>(1.0f, 0.0f, 0.0f) );
    var _S303 : DiffPair_vectorx3Cfloatx2C3x3E_0 = s_fwd_radialDistortionF_0(_S302, &(_S299));
    results_0[_S301] = vec4<f32>(_S303.differential_0, 0.0f);
    var _S304 : u32 = _S298 + u32(2);
    var _S305 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( p_13, vec3<f32>(0.0f, 1.0f, 0.0f) );
    var _S306 : DiffPair_vectorx3Cfloatx2C3x3E_0 = s_fwd_radialDistortionF_0(_S305, &(_S299));
    results_0[_S304] = vec4<f32>(_S306.differential_0, 0.0f);
    var _S307 : u32 = _S298 + u32(3);
    var _S308 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( p_13, vec3<f32>(0.0f, 0.0f, 1.0f) );
    var _S309 : DiffPair_vectorx3Cfloatx2C3x3E_0 = s_fwd_radialDistortionF_0(_S308, &(_S299));
    results_0[_S307] = vec4<f32>(_S309.differential_0, 0.0f);
    return;
}

fn velocityModelF_0( p_14 : vec3<f32>,  q_14 : ptr<function, VelocityParams_std140_0>) -> vec3<f32>
{
    var _S310 : f32 = p_14.z;
    var x_1 : f32 = 0.5f * (*q_14).g_0 * _S310;
    var small_0 : bool = ((abs(x_1)) < 0.0010000000474974513f);
    var safe_0 : f32;
    if(small_0)
    {
        safe_0 = 1.0f;
    }
    else
    {
        safe_0 = x_1;
    }
    var f_0 : f32;
    if(small_0)
    {
        f_0 = 1.0f + x_1 * (0.5f + x_1 * (0.1666666716337204f + x_1 / 24.0f));
    }
    else
    {
        f_0 = (exp(x_1) - 1.0f) / safe_0;
    }
    return vec3<f32>(p_14.x, p_14.y, 0.5f * (*q_14).v0_0 * _S310 * f_0);
}

fn s_fwd_velocityModelF_0( dpp_7 : DiffPair_vectorx3Cfloatx2C3x3E_0,  q_15 : ptr<function, VelocityParams_std140_0>) -> DiffPair_vectorx3Cfloatx2C3x3E_0
{
    var _S311 : f32 = 0.5f * (*q_15).g_0;
    var _S312 : f32 = dpp_7.primal_0.z;
    var _S313 : f32 = dpp_7.differential_0.z;
    var x_2 : f32 = _S311 * _S312;
    var _S314 : f32 = _S313 * _S311;
    var _S315 : DiffPair_float_0 = DiffPair_float_0( x_2, _S314 );
    var small_1 : bool = ((_d_abs_0(_S315).primal_0) < 0.0010000000474974513f);
    var safe_1 : f32;
    var s_diff_safe_0 : f32;
    if(small_1)
    {
        safe_1 = 1.0f;
        s_diff_safe_0 = 0.0f;
    }
    else
    {
        safe_1 = x_2;
        s_diff_safe_0 = _S314;
    }
    var f_1 : f32;
    var s_diff_f_0 : f32;
    if(small_1)
    {
        var _S316 : f32 = 0.1666666716337204f + x_2 / 24.0f;
        var _S317 : f32 = 0.5f + x_2 * _S316;
        var _S318 : f32 = _S314 * _S317 + (_S314 * _S316 + _S314 * 0.041666667908430099f * x_2) * x_2;
        f_1 = 1.0f + x_2 * _S317;
        s_diff_f_0 = _S318;
    }
    else
    {
        var _S319 : DiffPair_float_0 = _d_exp_0(_S315);
        var _S320 : f32 = _S319.primal_0 - 1.0f;
        var _S321 : f32 = (_S319.differential_0 * safe_1 - _S320 * s_diff_safe_0) / (safe_1 * safe_1);
        f_1 = _S320 / safe_1;
        s_diff_f_0 = _S321;
    }
    var _S322 : f32 = 0.5f * (*q_15).v0_0;
    var _S323 : f32 = _S322 * _S312;
    var _S324 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( vec3<f32>(dpp_7.primal_0.x, dpp_7.primal_0.y, _S323 * f_1), vec3<f32>(dpp_7.differential_0.x, dpp_7.differential_0.y, _S313 * _S322 * f_1 + s_diff_f_0 * _S323) );
    return _S324;
}

@compute
@workgroup_size(64, 1, 1)
fn velocityModelParity(@builtin(global_invocation_id) id_7 : vec3<u32>)
{
    var _S325 : vec2<u32> = vec2<u32>(arrayLength(&points_0), 16);
    var _S326 : u32 = id_7.x;
    if((_S326 >= (_S325.x)))
    {
        return;
    }
    var p_15 : vec3<f32> = points_0[_S326].xyz;
    var _S327 : u32 = u32(4) * _S326;
    var _S328 : VelocityParams_std140_0 = velocityP_0;
    var _S329 : vec3<f32> = velocityModelF_0(p_15, &(_S328));
    results_0[_S327] = vec4<f32>(_S329, 0.0f);
    var _S330 : u32 = _S327 + u32(1);
    var _S331 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( p_15, vec3<f32>(1.0f, 0.0f, 0.0f) );
    var _S332 : DiffPair_vectorx3Cfloatx2C3x3E_0 = s_fwd_velocityModelF_0(_S331, &(_S328));
    results_0[_S330] = vec4<f32>(_S332.differential_0, 0.0f);
    var _S333 : u32 = _S327 + u32(2);
    var _S334 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( p_15, vec3<f32>(0.0f, 1.0f, 0.0f) );
    var _S335 : DiffPair_vectorx3Cfloatx2C3x3E_0 = s_fwd_velocityModelF_0(_S334, &(_S328));
    results_0[_S333] = vec4<f32>(_S335.differential_0, 0.0f);
    var _S336 : u32 = _S327 + u32(3);
    var _S337 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( p_15, vec3<f32>(0.0f, 0.0f, 1.0f) );
    var _S338 : DiffPair_vectorx3Cfloatx2C3x3E_0 = s_fwd_velocityModelF_0(_S337, &(_S328));
    results_0[_S336] = vec4<f32>(_S338.differential_0, 0.0f);
    return;
}

fn corridorUnrollF_0( p_16 : vec3<f32>,  q_16 : ptr<function, CorridorParams_std140_0>) -> vec3<f32>
{
    var st_0 : f32 = p_16.x;
    var first_0 : vec4<f32> = corridorE_0[i32(0)];
    var firstDir_0 : vec4<f32> = corridorE_0[i32(1)];
    var _S339 : f32 = first_0.x;
    var pos_0 : vec2<f32>;
    var tangent_0 : vec2<f32>;
    if((st_0 < _S339))
    {
        var _S340 : vec2<f32> = firstDir_0.xy;
        pos_0 = first_0.yz + vec2<f32>((st_0 - _S339)) * _S340;
        tangent_0 = _S340;
    }
    else
    {
        var _S341 : f32 = (*q_16).se_0;
        if((st_0 >= ((*q_16).se_0)))
        {
            var _S342 : vec2<f32> = vec2<f32>((*q_16).ce_0, (*q_16).ne_0);
            pos_0 = vec2<f32>((*q_16).xe_0, (*q_16).ye_0) + vec2<f32>((st_0 - _S341)) * _S342;
            tangent_0 = _S342;
        }
        else
        {
            var _S343 : u32 = (*q_16).count_0;
            var _S344 : bool;
            if((u32(1) < ((*q_16).count_0)))
            {
                _S344 = (st_0 >= (corridorE_0[u32(2)].x));
            }
            else
            {
                _S344 = false;
            }
            var pick_0 : u32;
            if(_S344)
            {
                pick_0 = u32(1);
            }
            else
            {
                pick_0 = u32(0);
            }
            if((u32(2) < _S343))
            {
                _S344 = (st_0 >= (corridorE_0[u32(4)].x));
            }
            else
            {
                _S344 = false;
            }
            if(_S344)
            {
                pick_0 = u32(2);
            }
            if((u32(3) < _S343))
            {
                _S344 = (st_0 >= (corridorE_0[u32(6)].x));
            }
            else
            {
                _S344 = false;
            }
            if(_S344)
            {
                pick_0 = u32(3);
            }
            if((u32(4) < _S343))
            {
                _S344 = (st_0 >= (corridorE_0[u32(8)].x));
            }
            else
            {
                _S344 = false;
            }
            if(_S344)
            {
                pick_0 = u32(4);
            }
            if((u32(5) < _S343))
            {
                _S344 = (st_0 >= (corridorE_0[u32(10)].x));
            }
            else
            {
                _S344 = false;
            }
            if(_S344)
            {
                pick_0 = u32(5);
            }
            if((u32(6) < _S343))
            {
                _S344 = (st_0 >= (corridorE_0[u32(12)].x));
            }
            else
            {
                _S344 = false;
            }
            if(_S344)
            {
                pick_0 = u32(6);
            }
            if((u32(7) < _S343))
            {
                _S344 = (st_0 >= (corridorE_0[u32(14)].x));
            }
            else
            {
                _S344 = false;
            }
            if(_S344)
            {
                pick_0 = u32(7);
            }
            var _S345 : u32 = u32(2) * pick_0;
            var e_0 : vec4<f32> = corridorE_0[_S345];
            var dir_0 : vec4<f32> = corridorE_0[_S345 + u32(1)];
            var u_2 : f32 = st_0 - e_0.x;
            var _S346 : f32 = e_0.w;
            if(_S346 == 0.0f)
            {
                var _S347 : vec2<f32> = dir_0.xy;
                pos_0 = e_0.yz + vec2<f32>(u_2) * _S347;
                tangent_0 = _S347;
            }
            else
            {
                var _S348 : f32 = _S346 * u_2;
                var ca_0 : f32 = cos(_S348);
                var sa_0 : f32 = sin(_S348);
                var _S349 : f32 = dir_0.y;
                var _S350 : f32 = ca_0 - 1.0f;
                var _S351 : f32 = dir_0.x;
                var _S352 : f32 = _S351 * sa_0;
                var _S353 : f32 = _S349 * sa_0;
                var _S354 : vec2<f32> = vec2<f32>(_S351 * ca_0 - _S353, _S349 * ca_0 + _S352);
                pos_0 = vec2<f32>(e_0.y + (_S349 * _S350 + _S352) / _S346, e_0.z - (_S351 * _S350 - _S353) / _S346);
                tangent_0 = _S354;
            }
        }
    }
    var _S355 : f32 = p_16.y;
    return vec3<f32>(pos_0.x - _S355 * tangent_0.y, pos_0.y + _S355 * tangent_0.x, p_16.z);
}

fn s_fwd_corridorUnrollF_0( dpp_8 : DiffPair_vectorx3Cfloatx2C3x3E_0,  q_17 : ptr<function, CorridorParams_std140_0>) -> DiffPair_vectorx3Cfloatx2C3x3E_0
{
    var st_1 : f32 = dpp_8.primal_0.x;
    var s_diff_st_0 : f32 = dpp_8.differential_0.x;
    var first_1 : vec4<f32> = corridorE_0[i32(0)];
    var firstDir_1 : vec4<f32> = corridorE_0[i32(1)];
    var _S356 : f32 = first_1.x;
    var pos_1 : vec2<f32>;
    var s_diff_pos_0 : vec2<f32>;
    var tangent_1 : vec2<f32>;
    var s_diff_tangent_0 : vec2<f32>;
    if((st_1 < _S356))
    {
        var _S357 : vec2<f32> = firstDir_1.xy;
        var _S358 : vec2<f32> = vec2<f32>(s_diff_st_0) * _S357;
        var _S359 : vec2<f32> = vec2<f32>(0.0f);
        pos_1 = first_1.yz + vec2<f32>((st_1 - _S356)) * _S357;
        s_diff_pos_0 = _S358;
        tangent_1 = _S357;
        s_diff_tangent_0 = _S359;
    }
    else
    {
        var _S360 : f32 = (*q_17).se_0;
        if((st_1 >= ((*q_17).se_0)))
        {
            var _S361 : vec2<f32> = vec2<f32>((*q_17).ce_0, (*q_17).ne_0);
            const _S362 : vec2<f32> = vec2<f32>(0.0f, 0.0f);
            var _S363 : vec2<f32> = vec2<f32>(s_diff_st_0) * _S361;
            pos_1 = vec2<f32>((*q_17).xe_0, (*q_17).ye_0) + vec2<f32>((st_1 - _S360)) * _S361;
            s_diff_pos_0 = _S363;
            tangent_1 = _S361;
            s_diff_tangent_0 = _S362;
        }
        else
        {
            var _S364 : bool = (u32(2) < ((*q_17).count_0));
            var _S365 : bool = (u32(3) < ((*q_17).count_0));
            var _S366 : bool = (u32(4) < ((*q_17).count_0));
            var _S367 : bool = (u32(5) < ((*q_17).count_0));
            var _S368 : bool = (u32(6) < ((*q_17).count_0));
            var _S369 : bool = (u32(7) < ((*q_17).count_0));
            var _S370 : bool;
            if((u32(1) < ((*q_17).count_0)))
            {
                _S370 = (st_1 >= (corridorE_0[u32(2)].x));
            }
            else
            {
                _S370 = false;
            }
            var pick_1 : u32;
            if(_S370)
            {
                pick_1 = u32(1);
            }
            else
            {
                pick_1 = u32(0);
            }
            if(_S364)
            {
                _S370 = (st_1 >= (corridorE_0[u32(4)].x));
            }
            else
            {
                _S370 = false;
            }
            if(_S370)
            {
                pick_1 = u32(2);
            }
            if(_S365)
            {
                _S370 = (st_1 >= (corridorE_0[u32(6)].x));
            }
            else
            {
                _S370 = false;
            }
            if(_S370)
            {
                pick_1 = u32(3);
            }
            if(_S366)
            {
                _S370 = (st_1 >= (corridorE_0[u32(8)].x));
            }
            else
            {
                _S370 = false;
            }
            if(_S370)
            {
                pick_1 = u32(4);
            }
            if(_S367)
            {
                _S370 = (st_1 >= (corridorE_0[u32(10)].x));
            }
            else
            {
                _S370 = false;
            }
            if(_S370)
            {
                pick_1 = u32(5);
            }
            if(_S368)
            {
                _S370 = (st_1 >= (corridorE_0[u32(12)].x));
            }
            else
            {
                _S370 = false;
            }
            if(_S370)
            {
                pick_1 = u32(6);
            }
            if(_S369)
            {
                _S370 = (st_1 >= (corridorE_0[u32(14)].x));
            }
            else
            {
                _S370 = false;
            }
            if(_S370)
            {
                pick_1 = u32(7);
            }
            var _S371 : u32 = u32(2) * pick_1;
            var e_1 : vec4<f32> = corridorE_0[_S371];
            var dir_1 : vec4<f32> = corridorE_0[_S371 + u32(1)];
            var u_3 : f32 = st_1 - e_1.x;
            var _S372 : f32 = e_1.w;
            if(_S372 == 0.0f)
            {
                var _S373 : vec2<f32> = dir_1.xy;
                var _S374 : vec2<f32> = vec2<f32>(s_diff_st_0) * _S373;
                var _S375 : vec2<f32> = vec2<f32>(0.0f);
                pos_1 = e_1.yz + vec2<f32>(u_3) * _S373;
                s_diff_pos_0 = _S374;
                tangent_1 = _S373;
                s_diff_tangent_0 = _S375;
            }
            else
            {
                var _S376 : DiffPair_float_0 = DiffPair_float_0( _S372 * u_3, s_diff_st_0 * _S372 );
                var _S377 : DiffPair_float_0 = _d_cos_0(_S376);
                var _S378 : DiffPair_float_0 = _d_sin_0(_S376);
                var _S379 : f32 = dir_1.y;
                var _S380 : f32 = _S377.primal_0 - 1.0f;
                var _S381 : f32 = dir_1.x;
                var _S382 : f32 = _S381 * _S378.primal_0;
                var _S383 : f32 = _S377.differential_0 * _S379 + _S378.differential_0 * _S381;
                var _S384 : f32 = _S379 * _S378.primal_0;
                var _S385 : f32 = _S377.differential_0 * _S381 - _S378.differential_0 * _S379;
                var _S386 : vec2<f32> = vec2<f32>(_S383 / _S372, 0.0f - _S385 / _S372);
                var _S387 : vec2<f32> = vec2<f32>(_S381 * _S377.primal_0 - _S384, _S379 * _S377.primal_0 + _S382);
                var _S388 : vec2<f32> = vec2<f32>(_S385, _S383);
                pos_1 = vec2<f32>(e_1.y + (_S379 * _S380 + _S382) / _S372, e_1.z - (_S381 * _S380 - _S384) / _S372);
                s_diff_pos_0 = _S386;
                tangent_1 = _S387;
                s_diff_tangent_0 = _S388;
            }
        }
    }
    var _S389 : f32 = dpp_8.primal_0.y;
    var _S390 : f32 = dpp_8.differential_0.y;
    var _S391 : f32 = tangent_1.y;
    var _S392 : f32 = tangent_1.x;
    var _S393 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( vec3<f32>(pos_1.x - _S389 * _S391, pos_1.y + _S389 * _S392, dpp_8.primal_0.z), vec3<f32>(s_diff_pos_0.x - (_S390 * _S391 + s_diff_tangent_0.y * _S389), s_diff_pos_0.y + (_S390 * _S392 + s_diff_tangent_0.x * _S389), dpp_8.differential_0.z) );
    return _S393;
}

@compute
@workgroup_size(64, 1, 1)
fn corridorUnrollParity(@builtin(global_invocation_id) id_8 : vec3<u32>)
{
    var _S394 : vec2<u32> = vec2<u32>(arrayLength(&points_0), 16);
    var _S395 : u32 = id_8.x;
    if((_S395 >= (_S394.x)))
    {
        return;
    }
    var p_17 : vec3<f32> = points_0[_S395].xyz;
    var _S396 : u32 = u32(4) * _S395;
    var _S397 : CorridorParams_std140_0 = corridorP_0;
    var _S398 : vec3<f32> = corridorUnrollF_0(p_17, &(_S397));
    results_0[_S396] = vec4<f32>(_S398, 0.0f);
    var _S399 : u32 = _S396 + u32(1);
    var _S400 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( p_17, vec3<f32>(1.0f, 0.0f, 0.0f) );
    var _S401 : DiffPair_vectorx3Cfloatx2C3x3E_0 = s_fwd_corridorUnrollF_0(_S400, &(_S397));
    results_0[_S399] = vec4<f32>(_S401.differential_0, 0.0f);
    var _S402 : u32 = _S396 + u32(2);
    var _S403 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( p_17, vec3<f32>(0.0f, 1.0f, 0.0f) );
    var _S404 : DiffPair_vectorx3Cfloatx2C3x3E_0 = s_fwd_corridorUnrollF_0(_S403, &(_S397));
    results_0[_S402] = vec4<f32>(_S404.differential_0, 0.0f);
    var _S405 : u32 = _S396 + u32(3);
    var _S406 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( p_17, vec3<f32>(0.0f, 0.0f, 1.0f) );
    var _S407 : DiffPair_vectorx3Cfloatx2C3x3E_0 = s_fwd_corridorUnrollF_0(_S406, &(_S397));
    results_0[_S405] = vec4<f32>(_S407.differential_0, 0.0f);
    return;
}

fn exaggerationF_0( p_18 : vec3<f32>,  q_18 : ptr<function, ExaggerationParams_std140_0>) -> vec3<f32>
{
    var _S408 : f32 = 1.0f / ((*q_18).rx_0 * (*q_18).rx_0);
    var _S409 : f32 = 1.0f / ((*q_18).ry_0 * (*q_18).ry_0);
    var _S410 : f32 = 1.0f / ((*q_18).rz_0 * (*q_18).rz_0);
    var os_0 : vec3<f32> = vec3<f32>(_S408, _S409, _S410);
    var p2_1 : vec3<f32> = p_18 * p_18 * os_0;
    var _S411 : f32 = (sqrt(p2_1.x + p2_1.y + p2_1.z) - 1.0f) / ((_S408 + _S409 + _S410) / 3.0f);
    var _S412 : vec3<f32> = vec3<f32>(1.0f);
    var a_3 : vec3<f32> = _S412 / (_S412 + vec3<f32>(_S411) * os_0);
    var _S413 : f32 = _S411 + (dot(p2_1, a_3 * a_3) - 1.0f) / (2.0f * dot(p2_1 * a_3 * a_3 * a_3, os_0));
    var a_4 : vec3<f32> = _S412 / (_S412 + vec3<f32>(_S413) * os_0);
    var _S414 : f32 = _S413 + (dot(p2_1, a_4 * a_4) - 1.0f) / (2.0f * dot(p2_1 * a_4 * a_4 * a_4, os_0));
    var a_5 : vec3<f32> = _S412 / (_S412 + vec3<f32>(_S414) * os_0);
    var _S415 : f32 = _S414 + (dot(p2_1, a_5 * a_5) - 1.0f) / (2.0f * dot(p2_1 * a_5 * a_5 * a_5, os_0));
    var a_6 : vec3<f32> = _S412 / (_S412 + vec3<f32>(_S415) * os_0);
    var _S416 : f32 = _S415 + (dot(p2_1, a_6 * a_6) - 1.0f) / (2.0f * dot(p2_1 * a_6 * a_6 * a_6, os_0));
    var a_7 : vec3<f32> = _S412 / (_S412 + vec3<f32>(_S416) * os_0);
    var lam_0 : f32 = _S416 + (dot(p2_1, a_7 * a_7) - 1.0f) / (2.0f * dot(p2_1 * a_7 * a_7 * a_7, os_0));
    var g_1 : vec3<f32> = p_18 * os_0 / (_S412 + vec3<f32>(lam_0) * os_0);
    var gl_0 : f32 = length(g_1);
    var h_0 : f32 = lam_0 * gl_0;
    var a0_0 : f32 = (*q_18).ceiling_0 - (*q_18).band_0;
    var _S417 : f32 = min(max(h_0 - a0_0, 0.0f), (*q_18).band_0);
    return p_18 + vec3<f32>((((*q_18).factor_0 - 1.0f) * (min(h_0, a0_0) - (*q_18).baseHeight_0 + _S417 - _S417 * _S417 / (2.0f * (*q_18).band_0)))) * (g_1 / vec3<f32>(gl_0));
}

fn s_fwd_exaggerationF_0( dpp_9 : DiffPair_vectorx3Cfloatx2C3x3E_0,  q_19 : ptr<function, ExaggerationParams_std140_0>) -> DiffPair_vectorx3Cfloatx2C3x3E_0
{
    var _S418 : f32 = 1.0f / ((*q_19).rx_0 * (*q_19).rx_0);
    var _S419 : f32 = 1.0f / ((*q_19).ry_0 * (*q_19).ry_0);
    var _S420 : f32 = 1.0f / ((*q_19).rz_0 * (*q_19).rz_0);
    var os_1 : vec3<f32> = vec3<f32>(_S418, _S419, _S420);
    var _S421 : vec3<f32> = dpp_9.differential_0 * dpp_9.primal_0;
    var p2_2 : vec3<f32> = dpp_9.primal_0 * dpp_9.primal_0 * os_1;
    var _S422 : vec3<f32> = (_S421 + _S421) * os_1;
    var _S423 : DiffPair_float_0 = DiffPair_float_0( p2_2.x + p2_2.y + p2_2.z, _S422.x + _S422.y + _S422.z );
    var _S424 : DiffPair_float_0 = _d_sqrt_0(_S423);
    var _S425 : f32 = (_S418 + _S419 + _S420) / 3.0f;
    var _S426 : f32 = (_S424.primal_0 - 1.0f) / _S425;
    var _S427 : f32 = _S424.differential_0 / _S425;
    var _S428 : vec3<f32> = vec3<f32>(1.0f);
    var _S429 : vec3<f32> = _S428 + vec3<f32>(_S426) * os_1;
    var _S430 : vec3<f32> = dpp_9.primal_0 * os_1;
    var a0_1 : f32 = (*q_19).ceiling_0 - (*q_19).band_0;
    var _S431 : f32 = 2.0f * (*q_19).band_0;
    var _S432 : f32 = (*q_19).factor_0 - 1.0f;
    var a_8 : vec3<f32> = _S428 / _S429;
    var _S433 : vec3<f32> = vec3<f32>(0.0f);
    var s_diff_a_0 : vec3<f32> = (_S433 - vec3<f32>(_S427) * os_1) / (_S429 * _S429);
    var _S434 : vec3<f32> = s_diff_a_0 * a_8;
    var _S435 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( p2_2, _S422 );
    var _S436 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( a_8 * a_8, _S434 + _S434 );
    var _S437 : DiffPair_float_0 = _d_dot_0(_S435, _S436);
    var f_2 : f32 = _S437.primal_0 - 1.0f;
    var _S438 : vec3<f32> = p2_2 * a_8;
    var _S439 : vec3<f32> = _S438 * a_8;
    var _S440 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( _S439 * a_8, ((_S422 * a_8 + s_diff_a_0 * p2_2) * a_8 + s_diff_a_0 * _S438) * a_8 + s_diff_a_0 * _S439 );
    var _S441 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( os_1, vec3<f32>(0.0f, 0.0f, 0.0f) );
    var _S442 : DiffPair_float_0 = _d_dot_0(_S440, _S441);
    var _S443 : f32 = 2.0f * _S442.primal_0;
    var _S444 : f32 = _S426 + f_2 / _S443;
    var _S445 : f32 = _S427 + (_S437.differential_0 * _S443 - f_2 * (_S442.differential_0 * 2.0f)) / (_S443 * _S443);
    var _S446 : vec3<f32> = _S428 + vec3<f32>(_S444) * os_1;
    var a_9 : vec3<f32> = _S428 / _S446;
    var s_diff_a_1 : vec3<f32> = (_S433 - vec3<f32>(_S445) * os_1) / (_S446 * _S446);
    var _S447 : vec3<f32> = s_diff_a_1 * a_9;
    var _S448 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( a_9 * a_9, _S447 + _S447 );
    var _S449 : DiffPair_float_0 = _d_dot_0(_S435, _S448);
    var f_3 : f32 = _S449.primal_0 - 1.0f;
    var _S450 : vec3<f32> = p2_2 * a_9;
    var _S451 : vec3<f32> = _S450 * a_9;
    var _S452 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( _S451 * a_9, ((_S422 * a_9 + s_diff_a_1 * p2_2) * a_9 + s_diff_a_1 * _S450) * a_9 + s_diff_a_1 * _S451 );
    var _S453 : DiffPair_float_0 = _d_dot_0(_S452, _S441);
    var _S454 : f32 = 2.0f * _S453.primal_0;
    var _S455 : f32 = _S444 + f_3 / _S454;
    var _S456 : f32 = _S445 + (_S449.differential_0 * _S454 - f_3 * (_S453.differential_0 * 2.0f)) / (_S454 * _S454);
    var _S457 : vec3<f32> = _S428 + vec3<f32>(_S455) * os_1;
    var a_10 : vec3<f32> = _S428 / _S457;
    var s_diff_a_2 : vec3<f32> = (_S433 - vec3<f32>(_S456) * os_1) / (_S457 * _S457);
    var _S458 : vec3<f32> = s_diff_a_2 * a_10;
    var _S459 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( a_10 * a_10, _S458 + _S458 );
    var _S460 : DiffPair_float_0 = _d_dot_0(_S435, _S459);
    var f_4 : f32 = _S460.primal_0 - 1.0f;
    var _S461 : vec3<f32> = p2_2 * a_10;
    var _S462 : vec3<f32> = _S461 * a_10;
    var _S463 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( _S462 * a_10, ((_S422 * a_10 + s_diff_a_2 * p2_2) * a_10 + s_diff_a_2 * _S461) * a_10 + s_diff_a_2 * _S462 );
    var _S464 : DiffPair_float_0 = _d_dot_0(_S463, _S441);
    var _S465 : f32 = 2.0f * _S464.primal_0;
    var _S466 : f32 = _S455 + f_4 / _S465;
    var _S467 : f32 = _S456 + (_S460.differential_0 * _S465 - f_4 * (_S464.differential_0 * 2.0f)) / (_S465 * _S465);
    var _S468 : vec3<f32> = _S428 + vec3<f32>(_S466) * os_1;
    var a_11 : vec3<f32> = _S428 / _S468;
    var s_diff_a_3 : vec3<f32> = (_S433 - vec3<f32>(_S467) * os_1) / (_S468 * _S468);
    var _S469 : vec3<f32> = s_diff_a_3 * a_11;
    var _S470 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( a_11 * a_11, _S469 + _S469 );
    var _S471 : DiffPair_float_0 = _d_dot_0(_S435, _S470);
    var f_5 : f32 = _S471.primal_0 - 1.0f;
    var _S472 : vec3<f32> = p2_2 * a_11;
    var _S473 : vec3<f32> = _S472 * a_11;
    var _S474 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( _S473 * a_11, ((_S422 * a_11 + s_diff_a_3 * p2_2) * a_11 + s_diff_a_3 * _S472) * a_11 + s_diff_a_3 * _S473 );
    var _S475 : DiffPair_float_0 = _d_dot_0(_S474, _S441);
    var _S476 : f32 = 2.0f * _S475.primal_0;
    var _S477 : f32 = _S466 + f_5 / _S476;
    var _S478 : f32 = _S467 + (_S471.differential_0 * _S476 - f_5 * (_S475.differential_0 * 2.0f)) / (_S476 * _S476);
    var _S479 : vec3<f32> = _S428 + vec3<f32>(_S477) * os_1;
    var a_12 : vec3<f32> = _S428 / _S479;
    var s_diff_a_4 : vec3<f32> = (_S433 - vec3<f32>(_S478) * os_1) / (_S479 * _S479);
    var _S480 : vec3<f32> = s_diff_a_4 * a_12;
    var _S481 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( a_12 * a_12, _S480 + _S480 );
    var _S482 : DiffPair_float_0 = _d_dot_0(_S435, _S481);
    var f_6 : f32 = _S482.primal_0 - 1.0f;
    var _S483 : vec3<f32> = p2_2 * a_12;
    var _S484 : vec3<f32> = _S483 * a_12;
    var _S485 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( _S484 * a_12, ((_S422 * a_12 + s_diff_a_4 * p2_2) * a_12 + s_diff_a_4 * _S483) * a_12 + s_diff_a_4 * _S484 );
    var _S486 : DiffPair_float_0 = _d_dot_0(_S485, _S441);
    var _S487 : f32 = 2.0f * _S486.primal_0;
    var lam_1 : f32 = _S477 + f_6 / _S487;
    var s_diff_lam_0 : f32 = _S478 + (_S482.differential_0 * _S487 - f_6 * (_S486.differential_0 * 2.0f)) / (_S487 * _S487);
    var _S488 : vec3<f32> = _S428 + vec3<f32>(lam_1) * os_1;
    var g_2 : vec3<f32> = _S430 / _S488;
    var s_diff_g_0 : vec3<f32> = (dpp_9.differential_0 * os_1 * _S488 - _S430 * (vec3<f32>(s_diff_lam_0) * os_1)) / (_S488 * _S488);
    var _S489 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( g_2, s_diff_g_0 );
    var _S490 : DiffPair_float_0 = s_fwd_length_impl_0(_S489);
    var _S491 : vec3<f32> = vec3<f32>(_S490.primal_0);
    var n_0 : vec3<f32> = g_2 / _S491;
    var h_1 : f32 = lam_1 * _S490.primal_0;
    var s_diff_h_0 : f32 = s_diff_lam_0 * _S490.primal_0 + _S490.differential_0 * lam_1;
    var _S492 : DiffPair_float_0 = DiffPair_float_0( h_1 - a0_1, s_diff_h_0 );
    var _S493 : DiffPair_float_0 = DiffPair_float_0( 0.0f, 0.0f );
    var _S494 : DiffPair_float_0 = _d_max_0(_S492, _S493);
    var _S495 : DiffPair_float_0 = DiffPair_float_0( _S494.primal_0, _S494.differential_0 );
    var _S496 : DiffPair_float_0 = DiffPair_float_0( (*q_19).band_0, 0.0f );
    var _S497 : DiffPair_float_0 = _d_min_0(_S495, _S496);
    var _S498 : DiffPair_float_0 = DiffPair_float_0( h_1, s_diff_h_0 );
    var _S499 : DiffPair_float_0 = DiffPair_float_0( a0_1, 0.0f );
    var _S500 : DiffPair_float_0 = _d_min_0(_S498, _S499);
    var _S501 : f32 = _S497.differential_0 * _S497.primal_0;
    var _S502 : vec3<f32> = vec3<f32>((_S432 * (_S500.primal_0 - (*q_19).baseHeight_0 + _S497.primal_0 - _S497.primal_0 * _S497.primal_0 / _S431)));
    var _S503 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( dpp_9.primal_0 + _S502 * n_0, dpp_9.differential_0 + (vec3<f32>(((_S500.differential_0 + _S497.differential_0 - (_S501 + _S501) / _S431) * _S432)) * n_0 + (s_diff_g_0 * _S491 - g_2 * vec3<f32>(_S490.differential_0)) / vec3<f32>((_S490.primal_0 * _S490.primal_0)) * _S502) );
    return _S503;
}

@compute
@workgroup_size(64, 1, 1)
fn exaggerationParity(@builtin(global_invocation_id) id_9 : vec3<u32>)
{
    var _S504 : vec2<u32> = vec2<u32>(arrayLength(&points_0), 16);
    var _S505 : u32 = id_9.x;
    if((_S505 >= (_S504.x)))
    {
        return;
    }
    var p_19 : vec3<f32> = points_0[_S505].xyz;
    var _S506 : u32 = u32(4) * _S505;
    var _S507 : ExaggerationParams_std140_0 = exaggerationP_0;
    var _S508 : vec3<f32> = exaggerationF_0(p_19, &(_S507));
    results_0[_S506] = vec4<f32>(_S508, 0.0f);
    var _S509 : u32 = _S506 + u32(1);
    var _S510 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( p_19, vec3<f32>(1.0f, 0.0f, 0.0f) );
    var _S511 : DiffPair_vectorx3Cfloatx2C3x3E_0 = s_fwd_exaggerationF_0(_S510, &(_S507));
    results_0[_S509] = vec4<f32>(_S511.differential_0, 0.0f);
    var _S512 : u32 = _S506 + u32(2);
    var _S513 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( p_19, vec3<f32>(0.0f, 1.0f, 0.0f) );
    var _S514 : DiffPair_vectorx3Cfloatx2C3x3E_0 = s_fwd_exaggerationF_0(_S513, &(_S507));
    results_0[_S512] = vec4<f32>(_S514.differential_0, 0.0f);
    var _S515 : u32 = _S506 + u32(3);
    var _S516 : DiffPair_vectorx3Cfloatx2C3x3E_0 = DiffPair_vectorx3Cfloatx2C3x3E_0( p_19, vec3<f32>(0.0f, 0.0f, 1.0f) );
    var _S517 : DiffPair_vectorx3Cfloatx2C3x3E_0 = s_fwd_exaggerationF_0(_S516, &(_S507));
    results_0[_S515] = vec4<f32>(_S517.differential_0, 0.0f);
    return;
}

