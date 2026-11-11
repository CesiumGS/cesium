// Generated from src/shaders/cull.slang by slangc 2026.21
// (scripts/slangBuild.mjs). Do not edit: change the .slang and regenerate.
struct CullParams_std140_0
{
    @align(16) recordCount_0 : u32,
    @align(4) batchCount_0 : u32,
    @align(8) instanceCount_0 : u32,
    @align(4) firstInstanceItem_0 : u32,
};

@binding(8) @group(1) var<uniform> params_0 : CullParams_std140_0;
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
    @align(8) batch_0 : u32,
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
    @align(16) instanceCount_1 : u32,
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

struct _MatrixStorage_float3x3_ColMajorstd430_0
{
    @align(16) data_0 : array<vec3<f32>, i32(3)>,
};

struct Transform_std430_0
{
    @align(16) originHi_0 : vec3<f32>,
    @align(4) scale_0 : f32,
    @align(16) originLo_0 : vec3<f32>,
    @align(4) flags_1 : u32,
    @align(16) linear_0 : _MatrixStorage_float3x3_ColMajorstd430_0,
};

@binding(1) @group(1) var<storage, read> transforms_0 : array<Transform_std430_0>;

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
@binding(7) @group(1) var<storage, read> placements_0 : array<vec4<f32>>;

struct _MatrixStorage_float4x4_ColMajorstd430_0
{
    @align(16) data_3 : array<vec4<f32>, i32(4)>,
};

struct DrawItem_std430_0
{
    @align(16) relModel_0 : _MatrixStorage_float4x4_ColMajorstd430_0,
    @align(16) drawn_0 : vec4<f32>,
    @align(16) record_0 : u32,
    @align(4) feature_0 : u32,
    @align(8) instance_0 : u32,
    @align(4) tint_0 : u32,
};

@binding(3) @group(1) var<storage, read_write> items_0 : array<DrawItem_std430_0>;

@binding(9) @group(1) var<storage, read_write> args_0 : array<atomic<u32>>;

struct Batch_std430_0
{
    @align(4) itemBase_0 : u32,
    @align(4) indexCount_1 : u32,
    @align(4) firstIndex_1 : u32,
    @align(4) pad_0 : u32,
};

@binding(6) @group(1) var<storage, read> batches_0 : array<Batch_std430_0>;

@binding(4) @group(1) var<storage, read_write> itemList_0 : array<u32>;

struct Instance_std430_0
{
    @align(16) row0_0 : vec4<f32>,
    @align(16) row1_0 : vec4<f32>,
    @align(16) row2_0 : vec4<f32>,
    @align(16) record_1 : u32,
    @align(4) feature_1 : u32,
    @align(8) flags_2 : u32,
    @align(4) tint_1 : u32,
};

@binding(2) @group(1) var<storage, read> instanceTable_0 : array<Instance_std430_0>;

struct AnchorEye_0
{
     eyeHi_0 : vec4<f32>,
     eyeLo_0 : vec4<f32>,
     axes_0 : array<vec4<f32>, i32(3)>,
};

fn anchorEye_0( t_0 : ptr<function, Transform_std430_0>) -> AnchorEye_0
{
    var _S1 : AnchorEye_0 = AnchorEye_0( view_0.anchors_0.data_2[min((((((*t_0).flags_1) >> (u32(8)))) & (u32(255))), u32(31))].eyeHi_0, view_0.anchors_0.data_2[min((((((*t_0).flags_1) >> (u32(8)))) & (u32(255))), u32(31))].eyeLo_0, view_0.anchors_0.data_2[min((((((*t_0).flags_1) >> (u32(8)))) & (u32(255))), u32(31))].axes_0 );
    return _S1;
}

struct SplitPosition_0
{
     hi_0 : vec3<f32>,
     lo_0 : vec3<f32>,
};

fn SplitPosition_x24init_0( hi_1 : vec3<f32>,  lo_1 : vec3<f32>) -> SplitPosition_0
{
    var _S2 : SplitPosition_0;
    _S2.hi_0 = hi_1;
    _S2.lo_0 = lo_1;
    return _S2;
}

fn SplitPosition_difference_0( this_0 : SplitPosition_0,  b_0 : SplitPosition_0) -> vec3<f32>
{
    return vec3<f32>(vec3<i32>(this_0.hi_0) - vec3<i32>(b_0.hi_0)) + (this_0.lo_0 - b_0.lo_0);
}

fn relativeMatrix_0( t_1 : ptr<function, Transform_std430_0>) -> mat4x4<f32>
{
    var _S3 : AnchorEye_0 = anchorEye_0(&((*t_1)));
    var axes_1 : mat3x3<f32> = mat3x3<f32>(_S3.axes_0[i32(0)].xyz, _S3.axes_0[i32(1)].xyz, _S3.axes_0[i32(2)].xyz);
    var linear_1 : mat3x3<f32> = (((mat3x3<f32>((*t_1).linear_0.data_0[i32(0)][i32(0)], (*t_1).linear_0.data_0[i32(1)][i32(0)], (*t_1).linear_0.data_0[i32(2)][i32(0)], (*t_1).linear_0.data_0[i32(0)][i32(1)], (*t_1).linear_0.data_0[i32(1)][i32(1)], (*t_1).linear_0.data_0[i32(2)][i32(1)], (*t_1).linear_0.data_0[i32(0)][i32(2)], (*t_1).linear_0.data_0[i32(1)][i32(2)], (*t_1).linear_0.data_0[i32(2)][i32(2)])) * (axes_1)));
    var rel_0 : vec3<f32> = (((SplitPosition_difference_0(SplitPosition_x24init_0((*t_1).originHi_0, (*t_1).originLo_0), SplitPosition_x24init_0(_S3.eyeHi_0.xyz, _S3.eyeLo_0.xyz))) * (axes_1)));
    return mat4x4<f32>(vec4<f32>(linear_1[i32(0)], rel_0.x), vec4<f32>(linear_1[i32(1)], rel_0.y), vec4<f32>(linear_1[i32(2)], rel_0.z), vec4<f32>(0.0f, 0.0f, 0.0f, 1.0f));
}

fn placementParameter_0( word_0 : u32) -> f32
{
    return placements_0[(word_0 >> (u32(2)))][(word_0 & (u32(3)))];
}

fn termWeight_0( row_0 : u32,  head_0 : vec4<u32>) -> f32
{
    var _S4 : f32 = (bitcast<f32>((head_0.y)));
    var _S5 : u32 = ((((head_0.x) >> (u32(8)))) & (u32(3)));
    var f_0 : u32 = u32(0);
    var w_0 : f32 = _S4;
    loop
    {
        if((f_0 < _S5))
        {
        }
        else
        {
            break;
        }
        var _S6 : vec4<f32> = placements_0[row_0 + u32(1) + f_0];
        var w_1 : f32 = w_0 * (_S6.y + _S6.z * placementParameter_0((bitcast<u32>((_S6.x)))));
        f_0 = f_0 + u32(1);
        w_0 = w_1;
    }
    return w_0;
}

fn highHalf_0( a_0 : f32) -> f32
{
    var c_0 : f32 = 4097.0f * a_0;
    return c_0 - (c_0 - a_0);
}

fn twoProd_0( a_1 : f32,  b_1 : f32) -> vec2<f32>
{
    var p_0 : f32 = a_1 * b_1;
    var ah_0 : f32 = highHalf_0(a_1);
    var al_0 : f32 = a_1 - ah_0;
    var bh_0 : f32 = highHalf_0(b_1);
    var bl_0 : f32 = b_1 - bh_0;
    return vec2<f32>(p_0, ah_0 * bh_0 - p_0 + ah_0 * bl_0 + al_0 * bh_0 + al_0 * bl_0);
}

fn twoSum_0( a_2 : f32,  b_2 : f32) -> vec2<f32>
{
    var s_0 : f32 = a_2 + b_2;
    var v_0 : f32 = s_0 - a_2;
    return vec2<f32>(s_0, a_2 - (s_0 - v_0) + (b_2 - v_0));
}

fn placementOffset_0( placement_1 : u32,  hi_2 : ptr<function, vec3<f32>>,  lo_2 : ptr<function, vec3<f32>>)
{
    var a_3 : u32;
    var _S7 : vec3<f32> = vec3<f32>(0.0f);
    (*hi_2) = _S7;
    (*lo_2) = _S7;
    if(placement_1 == u32(4294967295))
    {
        return;
    }
    var _S8 : u32 = (bitcast<u32>((placements_0[placement_1].x)));
    var i_0 : u32 = u32(0);
    loop
    {
        if((i_0 < _S8))
        {
        }
        else
        {
            break;
        }
        var row_1 : u32 = placement_1 + u32(1) + i_0 * u32(3);
        var head_1 : vec4<u32> = (bitcast<vec4<u32>>((placements_0[row_1])));
        if((((head_1.x) & (u32(255)))) != u32(1))
        {
            i_0 = i_0 + u32(1);
            continue;
        }
        var _S9 : f32 = termWeight_0(row_1, head_1);
        var body_0 : u32 = placement_1 + head_1.z;
        var _S10 : vec3<f32> = placements_0[body_0 + u32(1)].xyz;
        var _S11 : vec3<f32> = placements_0[body_0 + u32(2)].xyz;
        a_3 = u32(0);
        loop
        {
            if((a_3 < u32(3)))
            {
            }
            else
            {
                break;
            }
            var p_1 : vec2<f32> = twoProd_0(_S9, _S10[a_3]);
            var s_1 : vec2<f32> = twoSum_0((*hi_2)[a_3], p_1.x);
            (*hi_2)[a_3] = s_1.x;
            (*lo_2)[a_3] = (*lo_2)[a_3] + (s_1.y + p_1.y + _S9 * _S11[a_3]);
            a_3 = a_3 + u32(1);
        }
        i_0 = i_0 + u32(1);
    }
    a_3 = u32(0);
    loop
    {
        if((a_3 < u32(3)))
        {
        }
        else
        {
            break;
        }
        var _S12 : u32 = a_3;
        var s_2 : vec2<f32> = twoSum_0((*hi_2)[a_3], (*lo_2)[_S12]);
        (*hi_2)[a_3] = s_2.x;
        (*lo_2)[_S12] = s_2.y;
        a_3 = a_3 + u32(1);
    }
    return;
}

fn SplitPosition_differenceParts_0( this_1 : SplitPosition_0,  b_3 : SplitPosition_0,  whole_0 : ptr<function, vec3<f32>>,  fraction_0 : ptr<function, vec3<f32>>)
{
    (*whole_0) = vec3<f32>(vec3<i32>(this_1.hi_0) - vec3<i32>(b_3.hi_0));
    (*fraction_0) = this_1.lo_0 - b_3.lo_0;
    return;
}

fn drawnTranslation_0( t_2 : ptr<function, Transform_std430_0>,  offsetHi_0 : vec3<f32>,  offsetLo_0 : vec3<f32>) -> vec3<f32>
{
    var _S13 : AnchorEye_0 = anchorEye_0(&((*t_2)));
    var whole_1 : vec3<f32>;
    var fraction_1 : vec3<f32>;
    SplitPosition_differenceParts_0(SplitPosition_x24init_0((*t_2).originHi_0, (*t_2).originLo_0), SplitPosition_x24init_0(_S13.eyeHi_0.xyz, _S13.eyeLo_0.xyz), &(whole_1), &(fraction_1));
    var rel_1 : vec3<f32>;
    var i_1 : u32 = u32(0);
    loop
    {
        if((i_1 < u32(3)))
        {
        }
        else
        {
            break;
        }
        var _S14 : u32 = i_1;
        var sum_0 : vec2<f32> = vec2<f32>(whole_1[i_1], 0.0f);
        var j_0 : u32 = u32(0);
        var small_0 : f32 = fraction_1[_S14];
        loop
        {
            if((j_0 < u32(3)))
            {
            }
            else
            {
                break;
            }
            var _S15 : mat3x3<f32> = mat3x3<f32>((*t_2).linear_0.data_0[i32(0)][i32(0)], (*t_2).linear_0.data_0[i32(1)][i32(0)], (*t_2).linear_0.data_0[i32(2)][i32(0)], (*t_2).linear_0.data_0[i32(0)][i32(1)], (*t_2).linear_0.data_0[i32(1)][i32(1)], (*t_2).linear_0.data_0[i32(2)][i32(1)], (*t_2).linear_0.data_0[i32(0)][i32(2)], (*t_2).linear_0.data_0[i32(1)][i32(2)], (*t_2).linear_0.data_0[i32(2)][i32(2)]);
            var p_2 : vec2<f32> = twoProd_0(_S15[i_1][j_0], offsetHi_0[j_0]);
            var s_3 : vec2<f32> = twoSum_0(sum_0.x, p_2.x);
            var _S16 : vec2<f32> = vec2<f32>(s_3.x, sum_0.y + s_3.y);
            var small_1 : f32 = small_0 + (p_2.y + _S15[i_1][j_0] * offsetLo_0[j_0]);
            var _S17 : u32 = j_0 + u32(1);
            sum_0 = _S16;
            j_0 = _S17;
            small_0 = small_1;
        }
        rel_1[i_1] = sum_0.x + (sum_0.y + small_0);
        i_1 = i_1 + u32(1);
    }
    return (((rel_1) * (mat3x3<f32>(_S13.axes_0[i32(0)].xyz, _S13.axes_0[i32(1)].xyz, _S13.axes_0[i32(2)].xyz))));
}

struct DrawItem_0
{
     relModel_0 : mat4x4<f32>,
     drawn_0 : vec4<f32>,
     record_0 : u32,
     feature_0 : u32,
     instance_0 : u32,
     tint_0 : u32,
};

fn drawItem_0( m_0 : mat4x4<f32>,  drawn_1 : vec3<f32>,  record_2 : u32,  feature_2 : u32,  instance_1 : u32,  tint_2 : u32) -> DrawItem_0
{
    var item_0 : DrawItem_0;
    item_0.relModel_0 = m_0;
    item_0.drawn_0 = vec4<f32>(drawn_1, 0.0f);
    item_0.record_0 = record_2;
    item_0.feature_0 = feature_2;
    item_0.instance_0 = instance_1;
    item_0.tint_0 = tint_2;
    return item_0;
}

fn inFrustum_0( m_1 : mat4x4<f32>,  center_1 : vec3<f32>,  radius_1 : f32) -> bool
{
    var _S18 : vec3<f32> = (((vec4<f32>(center_1, 1.0f)) * (m_1))).xyz;
    var p_3 : u32 = u32(0);
    loop
    {
        if((p_3 < u32(5)))
        {
        }
        else
        {
            break;
        }
        if(((dot(view_0.planes_0[p_3].xyz, _S18) + view_0.planes_0[p_3].w) < (- radius_1)))
        {
            return false;
        }
        p_3 = p_3 + u32(1);
    }
    return true;
}

fn append_0( batch_1 : u32,  item_1 : u32)
{
    var slot_0 : u32 = atomicAdd(&(args_0[batch_1 * u32(5) + u32(1)]), u32(1));
    itemList_0[batches_0[batch_1].itemBase_0 + slot_0] = item_1;
    return;
}

fn drawable_0( _S19 : u32,  _S20 : ptr<function, Transform_std430_0>) -> bool
{
    var mask_0 : u32;
    if(((view_0.time_0.z) > 0.5f))
    {
        mask_0 = ((records_0[_S19].viewMask_0) | ((records_0[_S19].casterMask_0)));
    }
    else
    {
        mask_0 = records_0[_S19].viewMask_0;
    }
    var _S21 : u32 = records_0[_S19].flags_0;
    var _S22 : bool;
    if((((records_0[_S19].flags_0) & (u32(1)))) == u32(0))
    {
        _S22 = ((((*_S20).flags_1) & (u32(1)))) == u32(0);
    }
    else
    {
        _S22 = false;
    }
    if(_S22)
    {
        _S22 = (records_0[_S19].indexCount_0) != u32(0);
    }
    else
    {
        _S22 = false;
    }
    if(_S22)
    {
        _S22 = ((mask_0 & ((view_0.viewBit_0)))) != u32(0);
    }
    else
    {
        _S22 = false;
    }
    if(_S22)
    {
        if(((view_0.time_0.y) > 0.5f))
        {
            _S22 = ((_S21 & (u32(32)))) != u32(0);
        }
        else
        {
            _S22 = false;
        }
        _S22 = !_S22;
    }
    else
    {
        _S22 = false;
    }
    if(_S22)
    {
        var _S23 : AnchorEye_0 = anchorEye_0(&((*_S20)));
        _S22 = ((_S23.eyeHi_0.w) < 0.5f);
    }
    else
    {
        _S22 = false;
    }
    return _S22;
}

@compute
@workgroup_size(64, 1, 1)
fn cullRecords(@builtin(global_invocation_id) gid_0 : vec3<u32>)
{
    var i_2 : u32 = gid_0.x;
    if((i_2 >= (params_0.recordCount_0)))
    {
        return;
    }
    if((records_0[i_2].instanceCount_1) != u32(0))
    {
        return;
    }
    var _S24 : Transform_std430_0 = transforms_0[records_0[i_2].transform_0];
    var _S25 : mat4x4<f32> = relativeMatrix_0(&(_S24));
    var _S26 : vec3<f32> = vec3<f32>(_S25[i32(0)][i32(3)], _S25[i32(1)][i32(3)], _S25[i32(2)][i32(3)]);
    var _S27 : u32 = records_0[i_2].placement_0;
    var drawn_2 : vec3<f32>;
    if((records_0[i_2].placement_0) != u32(4294967295))
    {
        var offsetHi_1 : vec3<f32>;
        var offsetLo_1 : vec3<f32>;
        placementOffset_0(_S27, &(offsetHi_1), &(offsetLo_1));
        var _S28 : vec3<f32> = drawnTranslation_0(&(_S24), offsetHi_1, offsetLo_1);
        drawn_2 = _S28;
    }
    else
    {
        drawn_2 = _S26;
    }
    var _S29 : DrawItem_0 = drawItem_0(_S25, drawn_2, i_2, u32(0), u32(0), u32(4294967295));
    var _S30 : array<vec4<f32>, i32(4)> = array<vec4<f32>, i32(4)>( vec4<f32>(_S29.relModel_0[i32(0)][i32(0)], _S29.relModel_0[i32(1)][i32(0)], _S29.relModel_0[i32(2)][i32(0)], _S29.relModel_0[i32(3)][i32(0)]), vec4<f32>(_S29.relModel_0[i32(0)][i32(1)], _S29.relModel_0[i32(1)][i32(1)], _S29.relModel_0[i32(2)][i32(1)], _S29.relModel_0[i32(3)][i32(1)]), vec4<f32>(_S29.relModel_0[i32(0)][i32(2)], _S29.relModel_0[i32(1)][i32(2)], _S29.relModel_0[i32(2)][i32(2)], _S29.relModel_0[i32(3)][i32(2)]), vec4<f32>(_S29.relModel_0[i32(0)][i32(3)], _S29.relModel_0[i32(1)][i32(3)], _S29.relModel_0[i32(2)][i32(3)], _S29.relModel_0[i32(3)][i32(3)]) );
    items_0[i_2].relModel_0.data_3 = _S30;
    items_0[i_2].drawn_0 = _S29.drawn_0;
    items_0[i_2].record_0 = _S29.record_0;
    items_0[i_2].feature_0 = _S29.feature_0;
    items_0[i_2].instance_0 = _S29.instance_0;
    items_0[i_2].tint_0 = _S29.tint_0;
    var _S31 : bool = drawable_0(i_2, &(_S24));
    var _S32 : bool;
    if(_S31)
    {
        _S32 = inFrustum_0(_S25, records_0[i_2].center_0, records_0[i_2].radius_0 * _S24.scale_0);
    }
    else
    {
        _S32 = false;
    }
    if(_S32)
    {
        append_0(records_0[i_2].batch_0, i_2);
    }
    return;
}

var<private> _S33 : vec3<u32>;

fn WorkgroupCount_0() -> vec3<u32>
{
    return _S33;
}

@compute
@workgroup_size(64, 1, 1)
fn cullInstances(@builtin(global_invocation_id) gid_1 : vec3<u32>, @builtin(num_workgroups) _builtinWorkgroupCount_0 : vec3<u32>)
{
    _S33 = _builtinWorkgroupCount_0;
    var j_1 : u32 = gid_1.x + gid_1.y * WorkgroupCount_0().x * u32(64);
    if((j_1 >= (params_0.instanceCount_0)))
    {
        return;
    }
    var inst_0 : Instance_std430_0 = instanceTable_0[j_1];
    if((inst_0.record_1) == u32(4294967295))
    {
        return;
    }
    var _S34 : u32 = inst_0.record_1;
    var _S35 : Transform_std430_0 = transforms_0[records_0[_S34].transform_0];
    var local_0 : mat4x4<f32> = mat4x4<f32>(inst_0.row0_0, inst_0.row1_0, inst_0.row2_0, vec4<f32>(0.0f, 0.0f, 0.0f, 1.0f));
    var _S36 : mat4x4<f32> = relativeMatrix_0(&(_S35));
    var m_2 : mat4x4<f32> = (((local_0) * (_S36)));
    var shown_0 : bool;
    if((inst_0.feature_1) != u32(4294967295))
    {
        shown_0 = (records_0[_S34].featureId_0) != u32(0);
    }
    else
    {
        shown_0 = false;
    }
    var feature_3 : u32;
    if(shown_0)
    {
        feature_3 = records_0[_S34].featureId_0 + inst_0.feature_1;
    }
    else
    {
        feature_3 = u32(0);
    }
    var item_2 : u32 = params_0.firstInstanceItem_0 + j_1;
    var _S37 : DrawItem_0 = drawItem_0(m_2, vec3<f32>(m_2[i32(0)][i32(3)], m_2[i32(1)][i32(3)], m_2[i32(2)][i32(3)]), inst_0.record_1, feature_3, j_1 - records_0[_S34].instanceFirst_0, inst_0.tint_1);
    var _S38 : array<vec4<f32>, i32(4)> = array<vec4<f32>, i32(4)>( vec4<f32>(_S37.relModel_0[i32(0)][i32(0)], _S37.relModel_0[i32(1)][i32(0)], _S37.relModel_0[i32(2)][i32(0)], _S37.relModel_0[i32(3)][i32(0)]), vec4<f32>(_S37.relModel_0[i32(0)][i32(1)], _S37.relModel_0[i32(1)][i32(1)], _S37.relModel_0[i32(2)][i32(1)], _S37.relModel_0[i32(3)][i32(1)]), vec4<f32>(_S37.relModel_0[i32(0)][i32(2)], _S37.relModel_0[i32(1)][i32(2)], _S37.relModel_0[i32(2)][i32(2)], _S37.relModel_0[i32(3)][i32(2)]), vec4<f32>(_S37.relModel_0[i32(0)][i32(3)], _S37.relModel_0[i32(1)][i32(3)], _S37.relModel_0[i32(2)][i32(3)], _S37.relModel_0[i32(3)][i32(3)]) );
    items_0[item_2].relModel_0.data_3 = _S38;
    items_0[item_2].drawn_0 = _S37.drawn_0;
    items_0[item_2].record_0 = _S37.record_0;
    items_0[item_2].feature_0 = _S37.feature_0;
    items_0[item_2].instance_0 = _S37.instance_0;
    items_0[item_2].tint_0 = _S37.tint_0;
    var scale_1 : f32 = _S35.scale_0 * max(length(vec3<f32>(local_0[i32(0)][i32(0)], local_0[i32(1)][i32(0)], local_0[i32(2)][i32(0)])), max(length(vec3<f32>(local_0[i32(0)][i32(1)], local_0[i32(1)][i32(1)], local_0[i32(2)][i32(1)])), length(vec3<f32>(local_0[i32(0)][i32(2)], local_0[i32(1)][i32(2)], local_0[i32(2)][i32(2)]))));
    if((((inst_0.flags_2) & (u32(6)))) != u32(0))
    {
        var within_0 : bool = ((length((((vec4<f32>(records_0[_S34].center_0, 1.0f)) * (m_2))).xyz)) <= (unpack2x16float((((inst_0.flags_2) >> (u32(16))))).x));
        if((((inst_0.flags_2) & (u32(2)))) != u32(0))
        {
            shown_0 = within_0;
        }
        else
        {
            shown_0 = !within_0;
        }
    }
    else
    {
        shown_0 = true;
    }
    if((((inst_0.flags_2) & (u32(1)))) == u32(0))
    {
    }
    else
    {
        shown_0 = false;
    }
    if(shown_0)
    {
        var _S39 : bool = drawable_0(inst_0.record_1, &(_S35));
        shown_0 = _S39;
    }
    else
    {
        shown_0 = false;
    }
    if(shown_0)
    {
        shown_0 = inFrustum_0(m_2, records_0[_S34].center_0, records_0[_S34].radius_0 * scale_1);
    }
    else
    {
        shown_0 = false;
    }
    if(shown_0)
    {
        append_0(records_0[_S34].batch_0, item_2);
    }
    return;
}

@compute
@workgroup_size(64, 1, 1)
fn writeDrawArgs(@builtin(global_invocation_id) gid_2 : vec3<u32>)
{
    var b_4 : u32 = gid_2.x;
    if((b_4 >= (params_0.batchCount_0)))
    {
        return;
    }
    var batch_2 : Batch_std430_0 = batches_0[b_4];
    var a_4 : u32 = b_4 * u32(5);
    atomicStore(&(args_0[a_4]), batch_2.indexCount_1);
    atomicStore(&(args_0[a_4 + u32(2)]), batch_2.firstIndex_1);
    atomicStore(&(args_0[a_4 + u32(3)]), u32(0));
    atomicStore(&(args_0[a_4 + u32(4)]), u32(0));
    return;
}

