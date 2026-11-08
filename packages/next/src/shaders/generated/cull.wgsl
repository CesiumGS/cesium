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
struct _MatrixStorage_float4x4_ColMajorstd430_0
{
    @align(16) data_3 : array<vec4<f32>, i32(4)>,
};

struct DrawItem_std430_0
{
    @align(16) relModel_0 : _MatrixStorage_float4x4_ColMajorstd430_0,
    @align(16) record_0 : u32,
    @align(4) feature_0 : u32,
    @align(8) instance_0 : u32,
    @align(4) tint_0 : u32,
};

@binding(3) @group(1) var<storage, read_write> items_0 : array<DrawItem_std430_0>;

@binding(7) @group(1) var<storage, read_write> args_0 : array<atomic<u32>>;

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

struct DrawItem_0
{
     relModel_0 : mat4x4<f32>,
     record_0 : u32,
     feature_0 : u32,
     instance_0 : u32,
     tint_0 : u32,
};

fn drawItem_0( m_0 : mat4x4<f32>,  record_2 : u32,  feature_2 : u32,  instance_1 : u32,  tint_2 : u32) -> DrawItem_0
{
    var item_0 : DrawItem_0;
    item_0.relModel_0 = m_0;
    item_0.record_0 = record_2;
    item_0.feature_0 = feature_2;
    item_0.instance_0 = instance_1;
    item_0.tint_0 = tint_2;
    return item_0;
}

fn inFrustum_0( m_1 : mat4x4<f32>,  center_1 : vec3<f32>,  radius_1 : f32) -> bool
{
    var _S4 : vec3<f32> = (((vec4<f32>(center_1, 1.0f)) * (m_1))).xyz;
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
        if(((dot(view_0.planes_0[p_0].xyz, _S4) + view_0.planes_0[p_0].w) < (- radius_1)))
        {
            return false;
        }
        p_0 = p_0 + u32(1);
    }
    return true;
}

fn append_0( batch_1 : u32,  item_1 : u32)
{
    var slot_0 : u32 = atomicAdd(&(args_0[batch_1 * u32(5) + u32(1)]), u32(1));
    itemList_0[batches_0[batch_1].itemBase_0 + slot_0] = item_1;
    return;
}

fn drawable_0( _S5 : u32,  _S6 : ptr<function, Transform_std430_0>) -> bool
{
    var _S7 : u32 = records_0[_S5].flags_0;
    var _S8 : bool;
    if((((records_0[_S5].flags_0) & (u32(1)))) == u32(0))
    {
        _S8 = ((((*_S6).flags_1) & (u32(1)))) == u32(0);
    }
    else
    {
        _S8 = false;
    }
    if(_S8)
    {
        _S8 = (records_0[_S5].indexCount_0) != u32(0);
    }
    else
    {
        _S8 = false;
    }
    if(_S8)
    {
        _S8 = (((records_0[_S5].viewMask_0) & ((view_0.viewBit_0)))) != u32(0);
    }
    else
    {
        _S8 = false;
    }
    if(_S8)
    {
        if(((view_0.time_0.y) > 0.5f))
        {
            _S8 = ((_S7 & (u32(32)))) != u32(0);
        }
        else
        {
            _S8 = false;
        }
        _S8 = !_S8;
    }
    else
    {
        _S8 = false;
    }
    if(_S8)
    {
        var _S9 : AnchorEye_0 = anchorEye_0(&((*_S6)));
        _S8 = ((_S9.eyeHi_0.w) < 0.5f);
    }
    else
    {
        _S8 = false;
    }
    return _S8;
}

@compute
@workgroup_size(64, 1, 1)
fn cullRecords(@builtin(global_invocation_id) gid_0 : vec3<u32>)
{
    var i_0 : u32 = gid_0.x;
    if((i_0 >= (params_0.recordCount_0)))
    {
        return;
    }
    if((records_0[i_0].instanceCount_1) != u32(0))
    {
        return;
    }
    var _S10 : Transform_std430_0 = transforms_0[records_0[i_0].transform_0];
    var _S11 : mat4x4<f32> = relativeMatrix_0(&(_S10));
    var _S12 : DrawItem_0 = drawItem_0(_S11, i_0, u32(0), u32(0), u32(4294967295));
    var _S13 : array<vec4<f32>, i32(4)> = array<vec4<f32>, i32(4)>( vec4<f32>(_S12.relModel_0[i32(0)][i32(0)], _S12.relModel_0[i32(1)][i32(0)], _S12.relModel_0[i32(2)][i32(0)], _S12.relModel_0[i32(3)][i32(0)]), vec4<f32>(_S12.relModel_0[i32(0)][i32(1)], _S12.relModel_0[i32(1)][i32(1)], _S12.relModel_0[i32(2)][i32(1)], _S12.relModel_0[i32(3)][i32(1)]), vec4<f32>(_S12.relModel_0[i32(0)][i32(2)], _S12.relModel_0[i32(1)][i32(2)], _S12.relModel_0[i32(2)][i32(2)], _S12.relModel_0[i32(3)][i32(2)]), vec4<f32>(_S12.relModel_0[i32(0)][i32(3)], _S12.relModel_0[i32(1)][i32(3)], _S12.relModel_0[i32(2)][i32(3)], _S12.relModel_0[i32(3)][i32(3)]) );
    items_0[i_0].relModel_0.data_3 = _S13;
    items_0[i_0].record_0 = _S12.record_0;
    items_0[i_0].feature_0 = _S12.feature_0;
    items_0[i_0].instance_0 = _S12.instance_0;
    items_0[i_0].tint_0 = _S12.tint_0;
    var _S14 : bool = drawable_0(i_0, &(_S10));
    var _S15 : bool;
    if(_S14)
    {
        _S15 = inFrustum_0(_S11, records_0[i_0].center_0, records_0[i_0].radius_0 * _S10.scale_0);
    }
    else
    {
        _S15 = false;
    }
    if(_S15)
    {
        append_0(records_0[i_0].batch_0, i_0);
    }
    return;
}

var<private> _S16 : vec3<u32>;

fn WorkgroupCount_0() -> vec3<u32>
{
    return _S16;
}

@compute
@workgroup_size(64, 1, 1)
fn cullInstances(@builtin(global_invocation_id) gid_1 : vec3<u32>, @builtin(num_workgroups) _builtinWorkgroupCount_0 : vec3<u32>)
{
    _S16 = _builtinWorkgroupCount_0;
    var j_0 : u32 = gid_1.x + gid_1.y * WorkgroupCount_0().x * u32(64);
    if((j_0 >= (params_0.instanceCount_0)))
    {
        return;
    }
    var inst_0 : Instance_std430_0 = instanceTable_0[j_0];
    if((inst_0.record_1) == u32(4294967295))
    {
        return;
    }
    var _S17 : u32 = inst_0.record_1;
    var _S18 : Transform_std430_0 = transforms_0[records_0[_S17].transform_0];
    var local_0 : mat4x4<f32> = mat4x4<f32>(inst_0.row0_0, inst_0.row1_0, inst_0.row2_0, vec4<f32>(0.0f, 0.0f, 0.0f, 1.0f));
    var _S19 : mat4x4<f32> = relativeMatrix_0(&(_S18));
    var m_2 : mat4x4<f32> = (((local_0) * (_S19)));
    var shown_0 : bool;
    if((inst_0.feature_1) != u32(4294967295))
    {
        shown_0 = (records_0[_S17].featureId_0) != u32(0);
    }
    else
    {
        shown_0 = false;
    }
    var feature_3 : u32;
    if(shown_0)
    {
        feature_3 = records_0[_S17].featureId_0 + inst_0.feature_1;
    }
    else
    {
        feature_3 = u32(0);
    }
    var item_2 : u32 = params_0.firstInstanceItem_0 + j_0;
    var _S20 : DrawItem_0 = drawItem_0(m_2, inst_0.record_1, feature_3, j_0 - records_0[_S17].instanceFirst_0, inst_0.tint_1);
    var _S21 : array<vec4<f32>, i32(4)> = array<vec4<f32>, i32(4)>( vec4<f32>(_S20.relModel_0[i32(0)][i32(0)], _S20.relModel_0[i32(1)][i32(0)], _S20.relModel_0[i32(2)][i32(0)], _S20.relModel_0[i32(3)][i32(0)]), vec4<f32>(_S20.relModel_0[i32(0)][i32(1)], _S20.relModel_0[i32(1)][i32(1)], _S20.relModel_0[i32(2)][i32(1)], _S20.relModel_0[i32(3)][i32(1)]), vec4<f32>(_S20.relModel_0[i32(0)][i32(2)], _S20.relModel_0[i32(1)][i32(2)], _S20.relModel_0[i32(2)][i32(2)], _S20.relModel_0[i32(3)][i32(2)]), vec4<f32>(_S20.relModel_0[i32(0)][i32(3)], _S20.relModel_0[i32(1)][i32(3)], _S20.relModel_0[i32(2)][i32(3)], _S20.relModel_0[i32(3)][i32(3)]) );
    items_0[item_2].relModel_0.data_3 = _S21;
    items_0[item_2].record_0 = _S20.record_0;
    items_0[item_2].feature_0 = _S20.feature_0;
    items_0[item_2].instance_0 = _S20.instance_0;
    items_0[item_2].tint_0 = _S20.tint_0;
    var scale_1 : f32 = _S18.scale_0 * max(length(vec3<f32>(local_0[i32(0)][i32(0)], local_0[i32(1)][i32(0)], local_0[i32(2)][i32(0)])), max(length(vec3<f32>(local_0[i32(0)][i32(1)], local_0[i32(1)][i32(1)], local_0[i32(2)][i32(1)])), length(vec3<f32>(local_0[i32(0)][i32(2)], local_0[i32(1)][i32(2)], local_0[i32(2)][i32(2)]))));
    if((((inst_0.flags_2) & (u32(6)))) != u32(0))
    {
        var within_0 : bool = ((length((((vec4<f32>(records_0[_S17].center_0, 1.0f)) * (m_2))).xyz)) <= (unpack2x16float((((inst_0.flags_2) >> (u32(16))))).x));
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
        var _S22 : bool = drawable_0(inst_0.record_1, &(_S18));
        shown_0 = _S22;
    }
    else
    {
        shown_0 = false;
    }
    if(shown_0)
    {
        shown_0 = inFrustum_0(m_2, records_0[_S17].center_0, records_0[_S17].radius_0 * scale_1);
    }
    else
    {
        shown_0 = false;
    }
    if(shown_0)
    {
        append_0(records_0[_S17].batch_0, item_2);
    }
    return;
}

@compute
@workgroup_size(64, 1, 1)
fn writeDrawArgs(@builtin(global_invocation_id) gid_2 : vec3<u32>)
{
    var b_1 : u32 = gid_2.x;
    if((b_1 >= (params_0.batchCount_0)))
    {
        return;
    }
    var batch_2 : Batch_std430_0 = batches_0[b_1];
    var a_0 : u32 = b_1 * u32(5);
    atomicStore(&(args_0[a_0]), batch_2.indexCount_1);
    atomicStore(&(args_0[a_0 + u32(2)]), batch_2.firstIndex_1);
    atomicStore(&(args_0[a_0 + u32(3)]), u32(0));
    atomicStore(&(args_0[a_0 + u32(4)]), u32(0));
    return;
}

