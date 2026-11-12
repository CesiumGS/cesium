// Generated from src/shaders/warpFitGpu.slang by slangc 2026.21
// (scripts/slangBuild.mjs). Do not edit: change the .slang and regenerate.
struct FitParams_std140_0
{
    @align(16) kind_0 : u32,
    @align(4) cellCount_0 : u32,
    @align(8) pad0_0 : u32,
    @align(4) pad1_0 : u32,
    @align(16) w_0 : array<vec4<f32>, i32(16)>,
};

@binding(0) @group(0) var<uniform> params_0 : FitParams_std140_0;
@binding(3) @group(0) var<storage, read> cellList_0 : array<vec2<u32>>;

struct TileJob_std430_0
{
    @align(16) center_0 : vec4<f32>,
    @align(16) tHi_0 : vec4<f32>,
    @align(16) tLo_0 : vec4<f32>,
    @align(16) meta_0 : vec4<u32>,
};

@binding(2) @group(0) var<storage, read> jobs_0 : array<TileJob_std430_0>;

@binding(1) @group(0) var<storage, read> solve_0 : array<vec2<f32>>;

@binding(4) @group(0) var<storage, read_write> lattices_0 : array<vec4<f32>>;

@binding(5) @group(0) var<storage, read_write> errors_0 : array<atomic<u32>>;

@binding(6) @group(0) var<storage, read> points_0 : array<vec4<f32>>;

@binding(7) @group(0) var<storage, read_write> evaluated_0 : array<vec4<f32>>;

const POWERS_0 : array<u32, i32(20)> = array<u32, i32(20)>( u32(0), u32(1), u32(4), u32(16), u32(2), u32(5), u32(17), u32(8), u32(20), u32(32), u32(3), u32(6), u32(18), u32(9), u32(21), u32(33), u32(12), u32(24), u32(36), u32(48) );
const ASINH_C_0 : array<vec2<f32>, i32(14)> = array<vec2<f32>, i32(14)>( vec2<f32>(1.0f, 0.0f), vec2<f32>(-0.1666666716337204f, 4.9670538793122887e-09f), vec2<f32>(0.075000002980232239f, -2.98023228317845224e-09f), vec2<f32>(-0.0446428582072258f, 1.06436870428439079e-09f), vec2<f32>(0.0303819440305233f, 4.13921147357498853e-10f), vec2<f32>(-0.022372158244252205f, -8.46656911246412847e-10f), vec2<f32>(0.017352763563394547f, 8.59682380838222571e-10f), vec2<f32>(-0.013964843936264515f, 1.86264517698653265e-10f), vec2<f32>(0.011551801115274429f, -2.19134724255276581e-10f), vec2<f32>(-0.0097616091370582581f, -3.92135823812367335e-10f), vec2<f32>(0.0083903353661298752f, 4.43486941614779084e-10f), vec2<f32>(-0.0073125259950757027f, 1.21476856351776519e-10f), vec2<f32>(0.0064472104422748089f, -1.30385161001278505e-10f), vec2<f32>(-0.0057400376535952091f, -1.72467144732291189e-11f) );
const COS_C_0 : array<vec2<f32>, i32(14)> = array<vec2<f32>, i32(14)>( vec2<f32>(1.0f, 0.0f), vec2<f32>(-0.5f, 0.0f), vec2<f32>(0.041666667908430099f, -1.24176346982807218e-09f), vec2<f32>(-0.0013888889225199819f, 3.3631094437103215e-11f), vec2<f32>(2.4801587642286904e-05f, -3.40699609366681977e-13f), vec2<f32>(-2.75573199814971304e-07f, 7.57511220905119492e-15f), vec2<f32>(2.08767558795841524e-09f, 1.10828398092043424e-16f), vec2<f32>(-1.14707453605089604e-11f, -2.37220768923123805e-19f), vec2<f32>(4.77947725613294544e-14f, 7.62544404448642983e-22f), vec2<f32>(-1.56192068145415131e-16f, -1.54044714659419928e-24f), vec2<f32>(4.11031759093704896e-19f, 3.23751173286026499e-27f), vec2<f32>(-8.89679095956684809e-22f, -4.32883720343418359e-29f), vec2<f32>(1.61173759128276679e-24f, -2.01866484066039997e-32f), vec2<f32>(-2.47959628479967842e-27f, 2.1574881543945071e-35f) );
const SIN_C_0 : array<vec2<f32>, i32(13)> = array<vec2<f32>, i32(13)>( vec2<f32>(1.0f, 0.0f), vec2<f32>(-0.1666666716337204f, 4.9670538793122887e-09f), vec2<f32>(0.0083333337679505348f, -4.34617203337595015e-10f), vec2<f32>(-0.00019841270113829523f, 2.72559687493345582e-12f), vec2<f32>(2.75573188446287531e-06f, 3.79357122429722915e-14f), vec2<f32>(-2.50521079436794025e-08f, -4.41762304464836646e-16f), vec2<f32>(1.60590443720742826e-10f, -5.35252651156272563e-18f), vec2<f32>(-7.6471636098127127e-13f, -1.22007104711782877e-20f), vec2<f32>(2.81145735896637036e-15f, -1.04620847397636578e-22f), vec2<f32>(-8.22063507847652135e-18f, -1.68147809685589804e-25f), vec2<f32>(1.9572941524685808e-20f, -4.61294551382001689e-28f), vec2<f32>(-3.86817029796473082e-23f, 1.27334043171467727e-30f), vec2<f32>(6.44695034047916388e-26f, -5.60946914402853337e-34f) );
const SINH_C_0 : array<vec2<f32>, i32(6)> = array<vec2<f32>, i32(6)>( vec2<f32>(1.0f, 0.0f), vec2<f32>(0.1666666716337204f, -4.9670538793122887e-09f), vec2<f32>(0.0083333337679505348f, -4.34617203337595015e-10f), vec2<f32>(0.00019841270113829523f, -2.72559687493345582e-12f), vec2<f32>(2.75573188446287531e-06f, 3.79357122429722915e-14f), vec2<f32>(2.50521079436794025e-08f, 4.41762304464836646e-16f) );
const ATANH_C_0 : array<vec2<f32>, i32(9)> = array<vec2<f32>, i32(9)>( vec2<f32>(1.0f, 0.0f), vec2<f32>(0.3333333432674408f, -9.9341077586245774e-09f), vec2<f32>(0.20000000298023224f, -2.98023228317845224e-09f), vec2<f32>(0.1428571492433548f, -6.3862120036617398e-09f), vec2<f32>(0.1111111119389534f, -8.27842294714997706e-10f), vec2<f32>(0.090909093618392944f, -2.70930211598852111e-09f), vec2<f32>(0.076923079788684845f, -2.86560797313484272e-09f), vec2<f32>(0.066666670143604279f, -3.47693762670076012e-09f), vec2<f32>(0.058823529630899429f, -2.19134724255276581e-10f) );
const LOBATTO_0 : array<vec2<f32>, i32(5)> = array<vec2<f32>, i32(5)>( vec2<f32>(-1.0f, 0.0f), vec2<f32>(-0.70710676908493042f, -1.21016165977039236e-08f), vec2<f32>(0.0f, 0.0f), vec2<f32>(0.70710676908493042f, 1.21016165977039236e-08f), vec2<f32>(1.0f, 0.0f) );
struct Df3_0
{
     x_0 : vec2<f32>,
     y_0 : vec2<f32>,
     z_0 : vec2<f32>,
};

var<workgroup> samples_0 : array<Df3_0, i32(128)>;

fn highHalf_0( a_0 : f32) -> f32
{
    var c_0 : f32 = 4097.0f * a_0;
    return c_0 - (c_0 - a_0);
}

fn twoProd_0( a_1 : f32,  b_0 : f32) -> vec2<f32>
{
    var p_0 : f32 = a_1 * b_0;
    var ah_0 : f32 = highHalf_0(a_1);
    var al_0 : f32 = a_1 - ah_0;
    var bh_0 : f32 = highHalf_0(b_0);
    var bl_0 : f32 = b_0 - bh_0;
    return vec2<f32>(p_0, ah_0 * bh_0 - p_0 + ah_0 * bl_0 + al_0 * bh_0 + al_0 * bl_0);
}

fn dfQuick_0( a_2 : f32,  b_1 : f32) -> vec2<f32>
{
    var s_0 : f32 = a_2 + b_1;
    return vec2<f32>(s_0, b_1 - (s_0 - a_2));
}

fn dfMulF_0( a_3 : vec2<f32>,  b_2 : f32) -> vec2<f32>
{
    var p_1 : vec2<f32> = twoProd_0(a_3.x, b_2);
    return dfQuick_0(p_1.x, p_1.y + a_3.y * b_2);
}

fn twoSum_0( a_4 : f32,  b_3 : f32) -> vec2<f32>
{
    var s_1 : f32 = a_4 + b_3;
    var v_0 : f32 = s_1 - a_4;
    return vec2<f32>(s_1, a_4 - (s_1 - v_0) + (b_3 - v_0));
}

fn dfAddF_0( a_5 : vec2<f32>,  b_4 : f32) -> vec2<f32>
{
    var s_2 : vec2<f32> = twoSum_0(a_5.x, b_4);
    return dfQuick_0(s_2.x, s_2.y + a_5.y);
}

fn dfAdd_0( a_6 : vec2<f32>,  b_5 : vec2<f32>) -> vec2<f32>
{
    var s_3 : vec2<f32> = twoSum_0(a_6.x, b_5.x);
    var t_0 : vec2<f32> = twoSum_0(a_6.y, b_5.y);
    var u_0 : vec2<f32> = dfQuick_0(s_3.x, s_3.y + t_0.x);
    return dfQuick_0(u_0.x, u_0.y + t_0.y);
}

fn slot_0( i_0 : u32) -> vec2<f32>
{
    var row_0 : vec4<f32> = params_0.w_0[(i_0 >> (u32(1)))];
    var _S1 : vec2<f32>;
    if(((i_0 & (u32(1)))) == u32(0))
    {
        _S1 = row_0.xy;
    }
    else
    {
        _S1 = row_0.zw;
    }
    return _S1;
}

fn dfSub_0( a_7 : vec2<f32>,  b_6 : vec2<f32>) -> vec2<f32>
{
    return dfAdd_0(a_7, (vec2<f32>(0) - b_6));
}

fn dfMul_0( a_8 : vec2<f32>,  b_7 : vec2<f32>) -> vec2<f32>
{
    var _S2 : f32 = a_8.x;
    var _S3 : f32 = b_7.x;
    var p_2 : vec2<f32> = twoProd_0(_S2, _S3);
    return dfQuick_0(p_2.x, p_2.y + (_S2 * b_7.y + a_8.y * _S3));
}

fn dfSqr_0( a_9 : vec2<f32>) -> vec2<f32>
{
    return dfMul_0(a_9, a_9);
}

fn dfOf_0( a_10 : f32) -> vec2<f32>
{
    return vec2<f32>(a_10, 0.0f);
}

fn dfDiv_0( a_11 : vec2<f32>,  b_8 : vec2<f32>) -> vec2<f32>
{
    var _S4 : f32 = b_8.x;
    var q1_0 : f32 = a_11.x / _S4;
    var r_0 : vec2<f32> = dfSub_0(a_11, dfMulF_0(b_8, q1_0));
    var q2_0 : f32 = r_0.x / _S4;
    return dfAddF_0(dfQuick_0(q1_0, q2_0), dfSub_0(r_0, dfMulF_0(b_8, q2_0)).x / _S4);
}

fn dfSqrt_0( a_12 : vec2<f32>) -> vec2<f32>
{
    var _S5 : f32 = a_12.x;
    if((_S5 <= 0.0f))
    {
        return vec2<f32>(0.0f);
    }
    var y_1 : f32 = sqrt(_S5);
    return dfQuick_0(y_1, dfSub_0(a_12, twoProd_0(y_1, y_1)).x / (2.0f * y_1));
}

struct Foot_0
{
     h_0 : vec2<f32>,
     nx_0 : vec2<f32>,
     ny_0 : vec2<f32>,
     nz_0 : vec2<f32>,
};

fn ellipsoidFoot_0( px_0 : vec2<f32>,  py_0 : vec2<f32>,  pz_0 : vec2<f32>) -> Foot_0
{
    var osx_0 : vec2<f32> = slot_0(u32(0));
    var osy_0 : vec2<f32> = slot_0(u32(1));
    var osz_0 : vec2<f32> = slot_0(u32(2));
    var ax_0 : vec2<f32> = dfMul_0(dfSqr_0(px_0), osx_0);
    var ay_0 : vec2<f32> = dfMul_0(dfSqr_0(py_0), osy_0);
    var az_0 : vec2<f32> = dfMul_0(dfSqr_0(pz_0), osz_0);
    var one_0 : vec2<f32> = dfOf_0(1.0f);
    var lambda_0 : vec2<f32> = dfOf_0((sqrt(ax_0.x + ay_0.x + az_0.x) - 1.0f) / ((osx_0.x + osy_0.x + osz_0.x) * 0.3333333432674408f));
    var mx_0 : vec2<f32> = one_0;
    var my_0 : vec2<f32> = one_0;
    var mz_0 : vec2<f32> = one_0;
    var i_1 : u32 = u32(0);
    loop
    {
        if((i_1 < u32(5)))
        {
        }
        else
        {
            break;
        }
        var mx_1 : vec2<f32> = dfDiv_0(one_0, dfAddF_0(dfMul_0(lambda_0, osx_0), 1.0f));
        var my_1 : vec2<f32> = dfDiv_0(one_0, dfAddF_0(dfMul_0(lambda_0, osy_0), 1.0f));
        var mz_1 : vec2<f32> = dfDiv_0(one_0, dfAddF_0(dfMul_0(lambda_0, osz_0), 1.0f));
        if(i_1 == u32(4))
        {
            mx_0 = mx_1;
            my_0 = my_1;
            mz_0 = mz_1;
            break;
        }
        var tx_0 : vec2<f32> = dfMul_0(ax_0, dfSqr_0(mx_1));
        var ty_0 : vec2<f32> = dfMul_0(ay_0, dfSqr_0(my_1));
        var tz_0 : vec2<f32> = dfMul_0(az_0, dfSqr_0(mz_1));
        var _S6 : vec2<f32> = dfAdd_0(lambda_0, dfDiv_0(dfAddF_0(dfAdd_0(dfAdd_0(tx_0, ty_0), tz_0), -1.0f), dfMulF_0(dfAdd_0(dfAdd_0(dfMul_0(dfMul_0(tx_0, mx_1), osx_0), dfMul_0(dfMul_0(ty_0, my_1), osy_0)), dfMul_0(dfMul_0(tz_0, mz_1), osz_0)), 2.0f)));
        var _S7 : u32 = i_1 + u32(1);
        lambda_0 = _S6;
        mx_0 = mx_1;
        my_0 = my_1;
        mz_0 = mz_1;
        i_1 = _S7;
    }
    var gx_0 : vec2<f32> = dfMul_0(dfMul_0(px_0, mx_0), osx_0);
    var gy_0 : vec2<f32> = dfMul_0(dfMul_0(py_0, my_0), osy_0);
    var gz_0 : vec2<f32> = dfMul_0(dfMul_0(pz_0, mz_0), osz_0);
    var g_0 : vec2<f32> = dfSqrt_0(dfAdd_0(dfAdd_0(dfSqr_0(gx_0), dfSqr_0(gy_0)), dfSqr_0(gz_0)));
    var inverse_0 : vec2<f32> = dfDiv_0(one_0, g_0);
    var foot_0 : Foot_0;
    foot_0.h_0 = dfMul_0(lambda_0, g_0);
    foot_0.nx_0 = dfMul_0(gx_0, inverse_0);
    foot_0.ny_0 = dfMul_0(gy_0, inverse_0);
    foot_0.nz_0 = dfMul_0(gz_0, inverse_0);
    return foot_0;
}

fn dfAtanhSmall_0( u_1 : vec2<f32>) -> vec2<f32>
{
    var _S8 : vec2<f32> = dfSqr_0(u_1);
    var r_1 : vec2<f32> = vec2<f32>(0.058823529630899429f, -2.19134724255276581e-10f);
    var k_0 : i32 = i32(7);
    loop
    {
        if((k_0 >= i32(0)))
        {
        }
        else
        {
            break;
        }
        var _S9 : vec2<f32> = dfAdd_0(dfMul_0(r_1, _S8), ATANH_C_0[k_0]);
        var _S10 : i32 = k_0 - i32(1);
        r_1 = _S9;
        k_0 = _S10;
    }
    return dfMul_0(r_1, u_1);
}

fn dfSinhSmall_0( y_2 : vec2<f32>) -> vec2<f32>
{
    var _S11 : vec2<f32> = dfSqr_0(y_2);
    var r_2 : vec2<f32> = vec2<f32>(2.50521079436794025e-08f, 4.41762304464836646e-16f);
    var k_1 : i32 = i32(4);
    loop
    {
        if((k_1 >= i32(0)))
        {
        }
        else
        {
            break;
        }
        var _S12 : vec2<f32> = dfAdd_0(dfMul_0(r_2, _S11), SINH_C_0[k_1]);
        var _S13 : i32 = k_1 - i32(1);
        r_2 = _S12;
        k_1 = _S13;
    }
    return dfMul_0(r_2, y_2);
}

fn dfSinCos_0( x_1 : f32,  sine_0 : ptr<function, vec2<f32>>,  cosine_0 : ptr<function, vec2<f32>>)
{
    var u_2 : vec2<f32> = dfOf_0(x_1);
    var _S14 : vec2<f32> = dfSqr_0(u_2);
    var s_4 : vec2<f32> = vec2<f32>(6.44695034047916388e-26f, -5.60946914402853337e-34f);
    var k_2 : i32 = i32(11);
    loop
    {
        if((k_2 >= i32(0)))
        {
        }
        else
        {
            break;
        }
        var _S15 : vec2<f32> = dfAdd_0(dfMul_0(s_4, _S14), SIN_C_0[k_2]);
        var _S16 : i32 = k_2 - i32(1);
        s_4 = _S15;
        k_2 = _S16;
    }
    var c_1 : vec2<f32> = vec2<f32>(-2.47959628479967842e-27f, 2.1574881543945071e-35f);
    k_2 = i32(12);
    loop
    {
        if((k_2 >= i32(0)))
        {
        }
        else
        {
            break;
        }
        var _S17 : vec2<f32> = dfAdd_0(dfMul_0(c_1, _S14), COS_C_0[k_2]);
        var _S18 : i32 = k_2 - i32(1);
        c_1 = _S17;
        k_2 = _S18;
    }
    (*sine_0) = dfMul_0(s_4, u_2);
    (*cosine_0) = c_1;
    return;
}

fn dfAtan2_0( s_5 : vec2<f32>,  c_2 : vec2<f32>) -> vec2<f32>
{
    var t0_0 : f32 = atan2(s_5.x, c_2.x);
    var s0_0 : vec2<f32>;
    var c0_0 : vec2<f32>;
    dfSinCos_0(t0_0, &(s0_0), &(c0_0));
    var d_0 : vec2<f32> = dfSub_0(dfMul_0(s_5, c0_0), dfMul_0(c_2, s0_0));
    var _S19 : f32 = d_0.x;
    return dfAddF_0(dfAdd_0(dfOf_0(t0_0), d_0), _S19 * _S19 * _S19 * 0.1666666716337204f);
}

fn dfAsinhSmall_0( s_6 : vec2<f32>) -> vec2<f32>
{
    var _S20 : vec2<f32> = dfSqr_0(s_6);
    var r_3 : vec2<f32> = vec2<f32>(-0.0057400376535952091f, -1.72467144732291189e-11f);
    var k_3 : i32 = i32(12);
    loop
    {
        if((k_3 >= i32(0)))
        {
        }
        else
        {
            break;
        }
        var _S21 : vec2<f32> = dfAdd_0(dfMul_0(r_3, _S20), ASINH_C_0[k_3]);
        var _S22 : i32 = k_3 - i32(1);
        r_3 = _S21;
        k_3 = _S22;
    }
    return dfMul_0(r_3, s_6);
}

fn transverseMercator_0( px_1 : vec2<f32>,  py_1 : vec2<f32>,  pz_1 : vec2<f32>) -> Df3_0
{
    var f_0 : Foot_0 = ellipsoidFoot_0(px_1, py_1, pz_1);
    var one_1 : vec2<f32> = dfOf_0(1.0f);
    var inverse_1 : vec2<f32> = dfDiv_0(one_1, dfSqrt_0(dfAdd_0(dfSqr_0(f_0.nx_0), dfSqr_0(f_0.ny_0))));
    var sinLambda_0 : vec2<f32> = dfMul_0(f_0.ny_0, inverse_1);
    var cosLambda_0 : vec2<f32> = dfMul_0(f_0.nx_0, inverse_1);
    var tau_0 : vec2<f32> = dfMul_0(f_0.nz_0, inverse_1);
    var e_0 : vec2<f32> = slot_0(u32(3));
    var sigma_0 : vec2<f32> = dfSinhSmall_0(dfMul_0(e_0, dfAtanhSmall_0(dfMul_0(e_0, f_0.nz_0))));
    var tauPrime_0 : vec2<f32> = dfSub_0(dfMul_0(tau_0, dfSqrt_0(dfAddF_0(dfSqr_0(sigma_0), 1.0f))), dfMul_0(sigma_0, dfSqrt_0(dfAddF_0(dfSqr_0(tau_0), 1.0f))));
    var cos0_0 : vec2<f32> = slot_0(u32(11));
    var sin0_0 : vec2<f32> = slot_0(u32(12));
    var cosL_0 : vec2<f32> = dfAdd_0(dfMul_0(cosLambda_0, cos0_0), dfMul_0(sinLambda_0, sin0_0));
    var _S23 : vec2<f32> = dfSqr_0(tauPrime_0);
    var invQ_0 : vec2<f32> = dfDiv_0(one_1, dfSqrt_0(dfAdd_0(_S23, dfSqr_0(cosL_0))));
    var s_7 : vec2<f32> = dfMul_0(tauPrime_0, invQ_0);
    var c_3 : vec2<f32> = dfMul_0(cosL_0, invQ_0);
    var sh_0 : vec2<f32> = dfMul_0(dfSub_0(dfMul_0(sinLambda_0, cos0_0), dfMul_0(cosLambda_0, sin0_0)), invQ_0);
    var ch_0 : vec2<f32> = dfMul_0(dfSqrt_0(dfAddF_0(_S23, 1.0f)), invQ_0);
    var _S24 : vec2<f32> = dfAsinhSmall_0(sh_0);
    var s1_0 : vec2<f32> = dfMulF_0(dfMul_0(s_7, c_3), 2.0f);
    var c1_0 : vec2<f32> = dfSub_0(dfSqr_0(c_3), dfSqr_0(s_7));
    var sh1_0 : vec2<f32> = dfMulF_0(dfMul_0(sh_0, ch_0), 2.0f);
    var ch1_0 : vec2<f32> = dfAdd_0(dfSqr_0(ch_0), dfSqr_0(sh_0));
    var sumXi_0 : vec2<f32> = dfAtan2_0(s_7, c_3);
    var sj_0 : vec2<f32> = s1_0;
    var chj_0 : vec2<f32> = ch1_0;
    var sumEta_0 : vec2<f32> = _S24;
    var cj_0 : vec2<f32> = c1_0;
    var shj_0 : vec2<f32> = sh1_0;
    var j_0 : u32 = u32(1);
    loop
    {
        if((j_0 <= u32(6)))
        {
        }
        else
        {
            break;
        }
        var a_13 : vec2<f32> = slot_0(u32(3) + j_0);
        var _S25 : vec2<f32> = dfAdd_0(sumXi_0, dfMul_0(a_13, dfMul_0(sj_0, chj_0)));
        var _S26 : vec2<f32> = dfAdd_0(sumEta_0, dfMul_0(a_13, dfMul_0(cj_0, shj_0)));
        var sn_0 : vec2<f32> = dfAdd_0(dfMul_0(sj_0, c1_0), dfMul_0(cj_0, s1_0));
        var cn_0 : vec2<f32> = dfSub_0(dfMul_0(cj_0, c1_0), dfMul_0(sj_0, s1_0));
        var shn_0 : vec2<f32> = dfAdd_0(dfMul_0(shj_0, ch1_0), dfMul_0(chj_0, sh1_0));
        var chn_0 : vec2<f32> = dfAdd_0(dfMul_0(chj_0, ch1_0), dfMul_0(shj_0, sh1_0));
        var _S27 : u32 = j_0 + u32(1);
        sumXi_0 = _S25;
        sj_0 = sn_0;
        chj_0 = chn_0;
        sumEta_0 = _S26;
        cj_0 = cn_0;
        shj_0 = shn_0;
        j_0 = _S27;
    }
    var kA_0 : vec2<f32> = slot_0(u32(10));
    var d_1 : Df3_0;
    d_1.x_0 = dfSub_0(dfAdd_0(slot_0(u32(13)), dfMul_0(kA_0, sumEta_0)), px_1);
    d_1.y_0 = dfSub_0(dfAdd_0(slot_0(u32(14)), dfMul_0(kA_0, sumXi_0)), py_1);
    d_1.z_0 = dfSub_0(f_0.h_0, pz_1);
    return d_1;
}

fn evalForm_0( px_2 : vec2<f32>,  py_2 : vec2<f32>,  pz_2 : vec2<f32>) -> Df3_0
{
    var d_2 : Df3_0;
    var kind_1 : u32 = params_0.kind_0;
    if((params_0.kind_0) == u32(2))
    {
        d_2.x_0 = dfMul_0(slot_0(u32(3)), dfSub_0(px_2, slot_0(u32(0))));
        d_2.y_0 = dfMul_0(slot_0(u32(4)), dfSub_0(py_2, slot_0(u32(1))));
        d_2.z_0 = dfMul_0(slot_0(u32(5)), dfSub_0(pz_2, slot_0(u32(2))));
        return d_2;
    }
    if(kind_1 == u32(3))
    {
        return transverseMercator_0(px_2, py_2, pz_2);
    }
    var f_1 : Foot_0 = ellipsoidFoot_0(px_2, py_2, pz_2);
    var lift_0 : vec2<f32>;
    if(kind_1 == u32(0))
    {
        lift_0 = dfAdd_0(dfMul_0(slot_0(u32(3)), dfSub_0(f_1.h_0, slot_0(u32(4)))), slot_0(u32(5)));
    }
    else
    {
        var _S28 : f32 = dfSub_0(px_2, slot_0(u32(3))).x;
        var _S29 : f32 = dfSub_0(py_2, slot_0(u32(4))).x;
        var _S30 : f32 = dfSub_0(pz_2, slot_0(u32(5))).x;
        lift_0 = dfOf_0(slot_0(u32(6)).x * exp(- (_S28 * _S28 + _S29 * _S29 + _S30 * _S30) * slot_0(u32(7)).x));
    }
    d_2.x_0 = dfMul_0(f_1.nx_0, lift_0);
    d_2.y_0 = dfMul_0(f_1.ny_0, lift_0);
    d_2.z_0 = dfMul_0(f_1.nz_0, lift_0);
    return d_2;
}

fn evalAtModel_0( job_0 : ptr<function, TileJob_std430_0>,  mx_2 : vec2<f32>,  my_2 : vec2<f32>,  mz_2 : vec2<f32>) -> Df3_0
{
    return evalForm_0(dfAdd_0(vec2<f32>((*job_0).tHi_0.x, (*job_0).tLo_0.x), mx_2), dfAdd_0(vec2<f32>((*job_0).tHi_0.y, (*job_0).tLo_0.y), my_2), dfAdd_0(vec2<f32>((*job_0).tHi_0.z, (*job_0).tLo_0.z), mz_2));
}

fn evalAtCell_0( job_1 : ptr<function, TileJob_std430_0>,  cells_0 : u32,  cell_0 : u32,  vx_0 : vec2<f32>,  vy_0 : vec2<f32>,  vz_0 : vec2<f32>) -> Df3_0
{
    var n_0 : f32 = f32(cells_0);
    var _S31 : u32 = cell_0 % cells_0;
    var _S32 : f32 = f32(_S31);
    var _S33 : u32 = cell_0 / cells_0;
    var _S34 : u32 = _S33 % cells_0;
    var _S35 : f32 = f32(_S34);
    var _S36 : u32 = cell_0 / (cells_0 * cells_0);
    var _S37 : vec3<f32> = vec3<f32>(1.0f);
    var whole_0 : vec3<f32> = (vec3<f32>(2.0f) * vec3<f32>(_S32, _S35, f32(_S36)) + _S37) / vec3<f32>(n_0) - _S37;
    var s_8 : f32 = (*job_1).center_0.w;
    var _S38 : Df3_0 = evalAtModel_0(&((*job_1)), dfAddF_0(dfMulF_0(dfAddF_0(dfMulF_0(vx_0, 1.0f / n_0), whole_0.x), s_8), (*job_1).center_0.x), dfAddF_0(dfMulF_0(dfAddF_0(dfMulF_0(vy_0, 1.0f / n_0), whole_0.y), s_8), (*job_1).center_0.y), dfAddF_0(dfMulF_0(dfAddF_0(dfMulF_0(vz_0, 1.0f / n_0), whole_0.z), s_8), (*job_1).center_0.z));
    return _S38;
}

fn evalAtCenter_0( job_2 : ptr<function, TileJob_std430_0>) -> Df3_0
{
    var _S39 : Df3_0 = evalAtModel_0(&((*job_2)), dfOf_0((*job_2).center_0.x), dfOf_0((*job_2).center_0.y), dfOf_0((*job_2).center_0.z));
    return _S39;
}

var<workgroup> residual_0 : array<Df3_0, i32(128)>;

var<workgroup> coefficient_0 : array<f32, i32(64)>;

@compute
@workgroup_size(128, 1, 1)
fn fitCells(@builtin(workgroup_id) group_0 : vec3<u32>, @builtin(local_invocation_index) t_1 : u32)
{
    var at_0 : u32 = group_0.y * u32(65535) + group_0.x;
    if((at_0 >= (params_0.cellCount_0)))
    {
        return;
    }
    var entry_0 : vec2<u32> = cellList_0[at_0];
    var _S40 : TileJob_std430_0 = jobs_0[entry_0.x];
    var _S41 : vec4<u32> = _S40.meta_0;
    var cells_1 : u32 = _S40.meta_0.y;
    var _S42 : bool = (t_1 < u32(125));
    if(_S42)
    {
        var _S43 : Df3_0 = evalAtCell_0(&(_S40), cells_1, entry_0.y, LOBATTO_0[t_1 % u32(5)], LOBATTO_0[t_1 / u32(5) % u32(5)], LOBATTO_0[t_1 / u32(25)]);
        samples_0[t_1] = _S43;
    }
    else
    {
        if(t_1 == u32(125))
        {
            var _S44 : Df3_0 = evalAtCenter_0(&(_S40));
            samples_0[t_1] = _S44;
        }
    }
    workgroupBarrier();
    var center_1 : Df3_0 = samples_0[u32(125)];
    if(_S42)
    {
        var r_4 : Df3_0;
        r_4.x_0 = dfSub_0(samples_0[t_1].x_0, center_1.x_0);
        r_4.y_0 = dfSub_0(samples_0[t_1].y_0, center_1.y_0);
        r_4.z_0 = dfSub_0(samples_0[t_1].z_0, center_1.z_0);
        residual_0[t_1] = r_4;
    }
    workgroupBarrier();
    var body_0 : u32 = _S41.x;
    if((t_1 < u32(60)))
    {
        var _S45 : u32 = t_1 / u32(3);
        var _S46 : u32 = t_1 % u32(3);
        var sum_0 : vec2<f32> = vec2<f32>(0.0f);
        var s_9 : u32 = u32(0);
        loop
        {
            if((s_9 < u32(125)))
            {
            }
            else
            {
                break;
            }
            var r_5 : Df3_0 = residual_0[s_9];
            var value_0 : vec2<f32>;
            if(_S46 == u32(0))
            {
                value_0 = r_5.x_0;
            }
            else
            {
                if(_S46 == u32(1))
                {
                    value_0 = r_5.y_0;
                }
                else
                {
                    value_0 = r_5.z_0;
                }
            }
            var _S47 : vec2<f32> = dfAdd_0(sum_0, dfMul_0(solve_0[_S45 * u32(125) + s_9], value_0));
            var _S48 : u32 = s_9 + u32(1);
            sum_0 = _S47;
            s_9 = _S48;
        }
        coefficient_0[t_1] = sum_0.x;
    }
    workgroupBarrier();
    if((t_1 < u32(20)))
    {
        var _S49 : u32 = u32(3) * t_1;
        lattices_0[body_0 + u32(3) + entry_0.y * u32(20) + t_1] = vec4<f32>(coefficient_0[_S49], coefficient_0[_S49 + u32(1)], coefficient_0[_S49 + u32(2)], 0.0f);
    }
    var _S50 : bool;
    if(t_1 == u32(125))
    {
        _S50 = (entry_0.y) == u32(0);
    }
    else
    {
        _S50 = false;
    }
    if(_S50)
    {
        lattices_0[body_0 + u32(1)] = vec4<f32>(center_1.x_0.x, center_1.y_0.x, center_1.z_0.x, 0.0f);
        lattices_0[body_0 + u32(2)] = vec4<f32>(center_1.x_0.y, center_1.y_0.y, center_1.z_0.y, 0.0f);
    }
    return;
}

var<workgroup> worst_0 : atomic<u32>;

@compute
@workgroup_size(128, 1, 1)
fn checkCells(@builtin(workgroup_id) group_1 : vec3<u32>, @builtin(local_invocation_index) t_2 : u32)
{
    var at_1 : u32 = group_1.y * u32(65535) + group_1.x;
    if((at_1 >= (params_0.cellCount_0)))
    {
        return;
    }
    var entry_1 : vec2<u32> = cellList_0[at_1];
    var _S51 : TileJob_std430_0 = jobs_0[entry_1.x];
    var _S52 : vec4<u32> = _S51.meta_0;
    var _S53 : u32 = _S51.meta_0.y;
    var body_1 : u32 = _S51.meta_0.x;
    var _S54 : bool = t_2 == u32(0);
    if(_S54)
    {
        atomicStore(&(worst_0), u32(0));
    }
    workgroupBarrier();
    var _S55 : vec3<f32> = lattices_0[body_1 + u32(1)].xyz;
    var _S56 : vec3<f32> = lattices_0[body_1 + u32(2)].xyz;
    var _S57 : u32 = entry_1.y;
    var _S58 : u32 = body_1 + u32(3) + _S57 * u32(20);
    var mine_0 : f32 = 0.0f;
    var s_10 : u32 = t_2;
    loop
    {
        if((s_10 < u32(729)))
        {
        }
        else
        {
            break;
        }
        var v_1 : vec3<f32> = vec3<f32>(f32(s_10 % u32(9)), f32(s_10 / u32(9) % u32(9)), f32(s_10 / u32(81))) * vec3<f32>(0.25f) - vec3<f32>(1.0f);
        var _S59 : f32 = v_1.x;
        var _S60 : f32 = v_1.y;
        var _S61 : f32 = v_1.z;
        var _S62 : Df3_0 = evalAtCell_0(&(_S51), _S53, _S57, dfOf_0(_S59), dfOf_0(_S60), dfOf_0(_S61));
        var _S63 : vec3<f32> = vec3<f32>(dfSub_0(_S62.x_0, vec2<f32>(_S55.x, _S56.x)).x, dfSub_0(_S62.y_0, vec2<f32>(_S55.y, _S56.y)).x, dfSub_0(_S62.z_0, vec2<f32>(_S55.z, _S56.z)).x);
        var _S64 : f32 = _S59 * _S59;
        var _S65 : vec4<f32> = vec4<f32>(1.0f, _S59, _S64, _S64 * _S59);
        var _S66 : f32 = _S60 * _S60;
        var _S67 : vec4<f32> = vec4<f32>(1.0f, _S60, _S66, _S66 * _S60);
        var _S68 : f32 = _S61 * _S61;
        var _S69 : vec4<f32> = vec4<f32>(1.0f, _S61, _S68, _S68 * _S61);
        var k_4 : u32 = u32(0);
        var r_6 : vec3<f32> = _S63;
        loop
        {
            if((k_4 < u32(20)))
            {
            }
            else
            {
                break;
            }
            var r_7 : vec3<f32> = r_6 - lattices_0[_S58 + k_4].xyz * vec3<f32>((_S65[((POWERS_0[k_4]) & (u32(3)))] * _S67[((((POWERS_0[k_4]) >> (u32(2)))) & (u32(3)))] * _S69[((((POWERS_0[k_4]) >> (u32(4)))) & (u32(3)))]));
            k_4 = k_4 + u32(1);
            r_6 = r_7;
        }
        var _S70 : f32 = max(mine_0, length(r_6));
        var s_11 : u32 = s_10 + u32(128);
        mine_0 = _S70;
        s_10 = s_11;
    }
    var _S71 : u32 = atomicMax(&(worst_0), (bitcast<u32>((mine_0))));
    workgroupBarrier();
    if(_S54)
    {
        var _S72 : u32 = _S52.z;
        var _S73 : u32 = atomicLoad(&(worst_0));
        var _S74 : u32 = atomicMax(&(errors_0[_S72]), _S73);
    }
    return;
}

@compute
@workgroup_size(64, 1, 1)
fn evalDirect(@builtin(global_invocation_id) id_0 : vec3<u32>)
{
    var _S75 : u32 = id_0.x;
    if((_S75 >= (params_0.cellCount_0)))
    {
        return;
    }
    var _S76 : TileJob_std430_0 = jobs_0[i32(0)];
    var m_0 : vec3<f32> = points_0[_S75].xyz;
    var _S77 : Df3_0 = evalAtModel_0(&(_S76), dfOf_0(m_0.x), dfOf_0(m_0.y), dfOf_0(m_0.z));
    evaluated_0[_S75] = vec4<f32>(_S77.x_0.x, _S77.y_0.x, _S77.z_0.x, 0.0f);
    return;
}

