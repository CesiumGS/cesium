// Generated from src/shaders/dice.slang by slangc 2026.21
// (scripts/slangBuild.mjs). Do not edit: change the .slang and regenerate.
struct PatchDice_std140_0
{
    @align(16) record_0 : u32,
    @align(4) batch_0 : u32,
    @align(8) spans_0 : u32,
    @align(4) capacity_0 : u32,
    @align(16) errorPixels_0 : f32,
    @align(4) jacobian_0 : f32,
    @align(8) curvature_0 : f32,
    @align(4) pad_0 : u32,
};

@binding(0) @group(2) var<uniform> dice_0 : PatchDice_std140_0;
@binding(7) @group(1) var<storage, read_write> args_0 : array<atomic<u32>>;

struct DrawRecord_std430_0
{
    @align(16) center_0 : vec3<f32>,
    @align(4) radius_0 : f32,
    @align(16) color_0 : vec4<f32>,
    @align(16) transform_0 : u32,
    @align(4) flags_0 : u32,
    @align(8) materialIndex_0 : u32,
    @align(4) indexCount_0 : u32,
    @align(16) firstIndex_0 : u32,
    @align(4) featureId_0 : u32,
    @align(8) batch_1 : u32,
    @align(4) positionOffset_0 : u32,
    @align(16) normalOffset_0 : u32,
    @align(4) uvOffset_0 : u32,
    @align(8) colorOffset_0 : u32,
    @align(4) tangentOffset_0 : u32,
    @align(16) textureSet_0 : u32,
    @align(4) imagerySlice_0 : u32,
    @align(8) featureIdOffset_0 : u32,
    @align(4) viewMask_0 : u32,
    @align(16) clipBlock_0 : u32,
    @align(4) placeholderMask_0 : u32,
    @align(8) terrainClip_0 : u32,
    @align(4) instanceFirst_0 : u32,
    @align(16) instanceCount_0 : u32,
    @align(4) instanceStreams_0 : u32,
    @align(8) instanceStride_0 : u32,
    @align(4) lightsSlice_0 : u32,
    @align(16) attributes_0 : u32,
    @align(4) instanceDirectory_0 : u32,
    @align(8) billboardSize_0 : f32,
    @align(4) billboardDepthTest_0 : f32,
    @align(16) placement_0 : u32,
    @align(4) skirtStart_0 : u32,
    @align(8) casterMask_0 : u32,
};

@binding(0) @group(1) var<storage, read> records_0 : array<DrawRecord_std430_0>;

struct _MatrixStorage_float4x4_ColMajorstd430_0
{
    @align(16) data_0 : array<vec4<f32>, i32(4)>,
};

struct DrawItem_std430_0
{
    @align(16) relModel_0 : _MatrixStorage_float4x4_ColMajorstd430_0,
    @align(16) record_1 : u32,
    @align(4) feature_0 : u32,
    @align(8) instance_0 : u32,
    @align(4) tint_0 : u32,
};

@binding(3) @group(1) var<storage, read_write> items_0 : array<DrawItem_std430_0>;

@binding(1) @group(2) var<storage, read> arena_0 : array<f32>;

struct _MatrixStorage_float4x4_ColMajorstd140_0
{
    @align(16) data_1 : array<vec4<f32>, i32(4)>,
};

struct AnchorEye_std140_0
{
    @align(16) eyeHi_0 : vec4<f32>,
    @align(16) eyeLo_0 : vec4<f32>,
    @align(16) axes_0 : array<vec4<f32>, i32(3)>,
};

struct _Array_std140_AnchorEye32_0
{
    @align(16) data_2 : array<AnchorEye_std140_0, i32(32)>,
};

struct View_std140_0
{
    @align(16) viewProj_0 : _MatrixStorage_float4x4_ColMajorstd140_0,
    @align(16) viewRotation_0 : _MatrixStorage_float4x4_ColMajorstd140_0,
    @align(16) cameraHi_0 : vec3<f32>,
    @align(4) near_0 : f32,
    @align(16) cameraLo_0 : vec3<f32>,
    @align(4) aspect_0 : f32,
    @align(16) planes_0 : array<vec4<f32>, i32(5)>,
    @align(16) sunDirection_0 : vec4<f32>,
    @align(16) viewport_0 : vec4<f32>,
    @align(16) iblFrame_0 : array<vec4<f32>, i32(3)>,
    @align(16) sunIlluminance_0 : f32,
    @align(4) diffuseIbl_0 : f32,
    @align(8) specularIbl_0 : f32,
    @align(4) specularMaxLod_0 : f32,
    @align(16) viewBit_0 : u32,
    @align(4) exposure_0 : f32,
    @align(8) aerialStart_0 : f32,
    @align(4) aerialEnd_0 : f32,
    @align(16) sunLight_0 : vec4<f32>,
    @align(16) bodyRadii_0 : vec4<f32>,
    @align(16) moonLight_0 : vec4<f32>,
    @align(16) time_0 : vec4<f32>,
    @align(16) anchors_0 : _Array_std140_AnchorEye32_0,
};

@binding(0) @group(0) var<uniform> view_0 : View_std140_0;
@binding(2) @group(2) var<storage, read_write> chunks_0 : array<vec4<u32>>;

struct SpanWords_0
{
     u_0 : array<u32, i32(48)>,
};

fn f3_0( w_0 : SpanWords_0,  at_0 : u32) -> vec3<f32>
{
    return vec3<f32>((bitcast<f32>((w_0.u_0[at_0]))), (bitcast<f32>((w_0.u_0[at_0 + u32(1)]))), (bitcast<f32>((w_0.u_0[at_0 + u32(2)]))));
}

fn f4_0( w_1 : SpanWords_0,  at_1 : u32) -> vec4<f32>
{
    return vec4<f32>((bitcast<f32>((w_1.u_0[at_1]))), (bitcast<f32>((w_1.u_0[at_1 + u32(1)]))), (bitcast<f32>((w_1.u_0[at_1 + u32(2)]))), (bitcast<f32>((w_1.u_0[at_1 + u32(3)]))));
}

struct PatchSpan_0
{
     kind_0 : u32,
     reversed_0 : bool,
     degreeU_0 : u32,
     degreeV_0 : u32,
     face_0 : u32,
     controls_0 : u32,
     origin_0 : vec3<f32>,
     axisX_0 : vec3<f32>,
     axisY_0 : vec3<f32>,
     params_0 : vec2<f32>,
     domain_0 : vec4<f32>,
     rect_0 : vec4<f32>,
     corner_0 : vec2<f32>,
     sphere_0 : vec4<f32>,
     faceSphere_0 : vec4<f32>,
     density_0 : vec3<f32>,
     speed_0 : vec2<f32>,
     trim_0 : u32,
};

fn unpackSpan_0( w_2 : SpanWords_0) -> PatchSpan_0
{
    var s_0 : PatchSpan_0;
    s_0.kind_0 = ((w_2.u_0[u32(0)]) & (u32(255)));
    s_0.reversed_0 = (((w_2.u_0[u32(0)]) & (u32(256)))) != u32(0);
    s_0.degreeU_0 = ((w_2.u_0[u32(1)]) & (u32(255)));
    s_0.degreeV_0 = ((((w_2.u_0[u32(1)]) >> (u32(8)))) & (u32(255)));
    s_0.face_0 = w_2.u_0[u32(2)];
    s_0.controls_0 = w_2.u_0[u32(3)];
    s_0.origin_0 = f3_0(w_2, u32(4));
    s_0.axisX_0 = f3_0(w_2, u32(7));
    s_0.axisY_0 = f3_0(w_2, u32(10));
    s_0.params_0 = vec2<f32>((bitcast<f32>((w_2.u_0[u32(13)]))), (bitcast<f32>((w_2.u_0[u32(14)]))));
    s_0.domain_0 = f4_0(w_2, u32(15));
    s_0.rect_0 = f4_0(w_2, u32(19));
    s_0.corner_0 = vec2<f32>((bitcast<f32>((w_2.u_0[u32(23)]))), (bitcast<f32>((w_2.u_0[u32(24)]))));
    s_0.sphere_0 = f4_0(w_2, u32(25));
    s_0.faceSphere_0 = f4_0(w_2, u32(29));
    s_0.density_0 = f3_0(w_2, u32(33));
    s_0.speed_0 = vec2<f32>((bitcast<f32>((w_2.u_0[u32(36)]))), (bitcast<f32>((w_2.u_0[u32(37)]))));
    s_0.trim_0 = w_2.u_0[u32(41)];
    return s_0;
}

fn inFrustum_0( m_0 : mat4x4<f32>,  center_1 : vec3<f32>,  radius_1 : f32) -> bool
{
    var _S1 : vec3<f32> = (((vec4<f32>(center_1, 1.0f)) * (m_0))).xyz;
    var p_0 : u32 = u32(0);
    loop
    {
        if((p_0 < u32(5)))
        {
        }
        else
        {
            break;
        }
        if(((dot(view_0.planes_0[p_0].xyz, _S1) + view_0.planes_0[p_0].w) < (- radius_1)))
        {
            return false;
        }
        p_0 = p_0 + u32(1);
    }
    return true;
}

fn cellCount_0( x_0 : f32) -> u32
{
    var y_0 : f32;
    if(x_0 == x_0)
    {
        y_0 = min(x_0, 1.0e+06f);
    }
    else
    {
        y_0 = 1.0e+06f;
    }
    return u32(clamp(ceil(y_0), 1.0f, 64.0f));
}

@compute
@workgroup_size(64, 1, 1)
fn dicePatches(@builtin(global_invocation_id) gid_0 : vec3<u32>)
{
    var index_0 : u32 = gid_0.x;
    if((index_0 >= (dice_0.spans_0)))
    {
        return;
    }
    var a_0 : u32 = dice_0.batch_0 * u32(5);
    var _S2 : u32 = atomicLoad(&(args_0[a_0 + u32(1)]));
    if(_S2 == u32(0))
    {
        return;
    }
    var _S3 : u32 = dice_0.record_0;
    var _S4 : mat4x4<f32> = mat4x4<f32>(items_0[dice_0.record_0].relModel_0.data_0[i32(0)][i32(0)], items_0[dice_0.record_0].relModel_0.data_0[i32(1)][i32(0)], items_0[dice_0.record_0].relModel_0.data_0[i32(2)][i32(0)], items_0[dice_0.record_0].relModel_0.data_0[i32(3)][i32(0)], items_0[dice_0.record_0].relModel_0.data_0[i32(0)][i32(1)], items_0[dice_0.record_0].relModel_0.data_0[i32(1)][i32(1)], items_0[dice_0.record_0].relModel_0.data_0[i32(2)][i32(1)], items_0[dice_0.record_0].relModel_0.data_0[i32(3)][i32(1)], items_0[dice_0.record_0].relModel_0.data_0[i32(0)][i32(2)], items_0[dice_0.record_0].relModel_0.data_0[i32(1)][i32(2)], items_0[dice_0.record_0].relModel_0.data_0[i32(2)][i32(2)], items_0[dice_0.record_0].relModel_0.data_0[i32(3)][i32(2)], items_0[dice_0.record_0].relModel_0.data_0[i32(0)][i32(3)], items_0[dice_0.record_0].relModel_0.data_0[i32(1)][i32(3)], items_0[dice_0.record_0].relModel_0.data_0[i32(2)][i32(3)], items_0[dice_0.record_0].relModel_0.data_0[i32(3)][i32(3)]);
    var w_3 : SpanWords_0;
    var _S5 : u32 = records_0[_S3].positionOffset_0 + index_0 * u32(48);
    var k_0 : u32 = u32(0);
    loop
    {
        if((k_0 < u32(48)))
        {
        }
        else
        {
            break;
        }
        w_3.u_0[k_0] = (bitcast<u32>((arena_0[_S5 + k_0])));
        k_0 = k_0 + u32(1);
    }
    var s_1 : PatchSpan_0 = unpackSpan_0(w_3);
    var _S6 : f32 = max(length(vec3<f32>(_S4[i32(0)][i32(0)], _S4[i32(1)][i32(0)], _S4[i32(2)][i32(0)])), max(length(vec3<f32>(_S4[i32(0)][i32(1)], _S4[i32(1)][i32(1)], _S4[i32(2)][i32(1)])), length(vec3<f32>(_S4[i32(0)][i32(2)], _S4[i32(1)][i32(2)], _S4[i32(2)][i32(2)]))));
    var _S7 : bool;
    if((records_0[_S3].placement_0) == u32(4294967295))
    {
        _S7 = !inFrustum_0(_S4, s_1.sphere_0.xyz, s_1.sphere_0.w * _S6);
    }
    else
    {
        _S7 = false;
    }
    if(_S7)
    {
        return;
    }
    var perspective_0 : f32 = length(vec3<f32>(view_0.viewProj_0.data_1[i32(0)][i32(3)], view_0.viewProj_0.data_1[i32(1)][i32(3)], view_0.viewProj_0.data_1[i32(2)][i32(3)]));
    var error_0 : f32 = dice_0.errorPixels_0 / max(max(length(vec3<f32>(view_0.viewProj_0.data_1[i32(0)][i32(0)], view_0.viewProj_0.data_1[i32(1)][i32(0)], view_0.viewProj_0.data_1[i32(2)][i32(0)])) * view_0.viewport_0.x, length(vec3<f32>(view_0.viewProj_0.data_1[i32(0)][i32(1)], view_0.viewProj_0.data_1[i32(1)][i32(1)], view_0.viewProj_0.data_1[i32(2)][i32(1)])) * view_0.viewport_0.y) * 0.5f * _S6 / max(max((((vec4<f32>((((vec4<f32>(s_1.faceSphere_0.xyz, 1.0f)) * (_S4))).xyz, 1.0f)) * (mat4x4<f32>(view_0.viewProj_0.data_1[i32(0)][i32(0)], view_0.viewProj_0.data_1[i32(1)][i32(0)], view_0.viewProj_0.data_1[i32(2)][i32(0)], view_0.viewProj_0.data_1[i32(3)][i32(0)], view_0.viewProj_0.data_1[i32(0)][i32(1)], view_0.viewProj_0.data_1[i32(1)][i32(1)], view_0.viewProj_0.data_1[i32(2)][i32(1)], view_0.viewProj_0.data_1[i32(3)][i32(1)], view_0.viewProj_0.data_1[i32(0)][i32(2)], view_0.viewProj_0.data_1[i32(1)][i32(2)], view_0.viewProj_0.data_1[i32(2)][i32(2)], view_0.viewProj_0.data_1[i32(3)][i32(2)], view_0.viewProj_0.data_1[i32(0)][i32(3)], view_0.viewProj_0.data_1[i32(1)][i32(3)], view_0.viewProj_0.data_1[i32(2)][i32(3)], view_0.viewProj_0.data_1[i32(3)][i32(3)])))).w - s_1.faceSphere_0.w * _S6 * perspective_0, perspective_0 * view_0.near_0), 9.99999997475242708e-07f), 9.999999960041972e-13f);
    var _S8 : f32 = s_1.speed_0.x;
    var du_0 : f32 = dice_0.jacobian_0 * s_1.density_0.x + dice_0.curvature_0 * _S8 * _S8 * 0.125f;
    var _S9 : f32 = s_1.speed_0.y;
    var duv_0 : f32 = dice_0.jacobian_0 * s_1.density_0.y + dice_0.curvature_0 * 2.0f * _S8 * _S9 * 0.125f;
    var dv_0 : f32 = dice_0.jacobian_0 * s_1.density_0.z + dice_0.curvature_0 * _S9 * _S9 * 0.125f;
    var shares_0 : f32 = f32(select(i32(0), i32(1), (du_0 > 0.0f)) + select(i32(0), i32(1), (duv_0 > 0.0f)) + select(i32(0), i32(1), (dv_0 > 0.0f)));
    var ru_0 : f32 = sqrt(shares_0 * du_0 / error_0);
    var rv_0 : f32 = sqrt(shares_0 * dv_0 / error_0);
    var wanted_0 : f32 = shares_0 * duv_0 / error_0;
    var have_0 : f32 = ru_0 * rv_0;
    var ru_1 : f32;
    var rv_1 : f32;
    if((have_0 < wanted_0))
    {
        var _S10 : bool = (ru_0 > 0.0f);
        if(_S10)
        {
            _S7 = (rv_0 > 0.0f);
        }
        else
        {
            _S7 = false;
        }
        if(_S7)
        {
            var f_0 : f32 = sqrt(wanted_0 / have_0);
            var rv_2 : f32 = rv_0 * f_0;
            ru_1 = ru_0 * f_0;
            rv_1 = rv_2;
        }
        else
        {
            if(_S10)
            {
                var _S11 : f32 = wanted_0 / ru_0;
                ru_1 = ru_0;
                rv_1 = _S11;
            }
            else
            {
                if((rv_0 > 0.0f))
                {
                    ru_1 = wanted_0 / rv_0;
                    rv_1 = rv_0;
                }
                else
                {
                    var ru_2 : f32 = sqrt(wanted_0);
                    ru_1 = ru_2;
                    rv_1 = ru_2;
                }
            }
        }
    }
    else
    {
        ru_1 = ru_0;
        rv_1 = rv_0;
    }
    var nu_0 : u32 = cellCount_0(ru_1 * (s_1.rect_0.y - s_1.rect_0.x));
    var nv_0 : u32 = cellCount_0(rv_1 * (s_1.rect_0.w - s_1.rect_0.z));
    var across_0 : u32 = (nu_0 + u32(8) - u32(1)) / u32(8);
    var total_0 : u32 = across_0 * ((nv_0 + u32(8) - u32(1)) / u32(8));
    var first_0 : u32 = atomicAdd(&(args_0[a_0 + u32(4)]), total_0);
    var c_0 : u32 = u32(0);
    loop
    {
        if((c_0 < total_0))
        {
        }
        else
        {
            break;
        }
        var _S12 : u32 = first_0 + c_0;
        if((_S12 >= (dice_0.capacity_0)))
        {
            break;
        }
        var _S13 : u32 = c_0 % across_0;
        var i0_0 : u32 = _S13 * u32(8);
        var _S14 : u32 = c_0 / across_0;
        chunks_0[_S12] = vec4<u32>(dice_0.record_0, index_0, (((((i0_0 | ((((_S14 * u32(8)) << (u32(8))))))) | (((nu_0 << (u32(16))))))) | (((nv_0 << (u32(24)))))), u32(0));
        c_0 = c_0 + u32(1);
    }
    return;
}

@compute
@workgroup_size(1, 1, 1)
fn writePatchArgs()
{
    var a_1 : u32 = dice_0.batch_0 * u32(5);
    var _S15 : u32 = atomicLoad(&(args_0[a_1 + u32(4)]));
    var _S16 : u32 = min(_S15, dice_0.capacity_0);
    atomicStore(&(args_0[a_1]), u32(384));
    atomicStore(&(args_0[a_1 + u32(1)]), _S16);
    atomicStore(&(args_0[a_1 + u32(2)]), u32(0));
    atomicStore(&(args_0[a_1 + u32(3)]), u32(0));
    return;
}

