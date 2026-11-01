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
    @align(8) clipCount_0 : u32,
    @align(4) instanceFirst_0 : u32,
    @align(16) instanceCount_1 : u32,
    @align(4) instanceStreams_0 : u32,
    @align(8) instanceStride_0 : u32,
    @align(4) recordPad_0 : u32,
};

@binding(0) @group(1) var<storage, read> records_0 : array<DrawRecord_std430_0>;

struct Transform_std430_0
{
    @align(16) originHi_0 : vec3<f32>,
    @align(4) scale_0 : f32,
    @align(16) originLo_0 : vec3<f32>,
    @align(4) flags_1 : u32,
    @align(16) linear_0 : array<vec4<f32>, i32(3)>,
};

@binding(1) @group(1) var<storage, read> transforms_0 : array<Transform_std430_0>;

struct _MatrixStorage_float4x4_ColMajorstd140_0
{
    @align(16) data_0 : array<vec4<f32>, i32(4)>,
};

struct View_std140_0
{
    @align(16) viewProj_0 : _MatrixStorage_float4x4_ColMajorstd140_0,
    @align(16) viewRotation_0 : _MatrixStorage_float4x4_ColMajorstd140_0,
    @align(16) cameraHi_0 : vec3<f32>,
    @align(4) nearPlane_0 : f32,
    @align(16) cameraLo_0 : vec3<f32>,
    @align(4) aspect_0 : f32,
    @align(16) planes_0 : array<vec4<f32>, i32(5)>,
    @align(16) sunDirection_0 : vec4<f32>,
    @align(16) viewport_0 : vec4<f32>,
    @align(16) iblFrame_0 : array<vec4<f32>, i32(3)>,
    @align(16) sunIntensity_0 : f32,
    @align(4) diffuseIbl_0 : f32,
    @align(8) specularIbl_0 : f32,
    @align(4) specularMaxLod_0 : f32,
    @align(16) viewBit_0 : u32,
    @align(4) viewPad0_0 : u32,
    @align(8) viewPad1_0 : u32,
    @align(4) viewPad2_0 : u32,
};

@binding(0) @group(0) var<uniform> view_0 : View_std140_0;
struct _MatrixStorage_float4x4_ColMajorstd430_0
{
    @align(16) data_1 : array<vec4<f32>, i32(4)>,
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

@binding(5) @group(1) var<storage, read_write> batchCounts_0 : array<atomic<u32>>;

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

@binding(7) @group(1) var<storage, read_write> args_0 : array<u32>;

struct DrawItem_0
{
     relModel_0 : mat4x4<f32>,
     record_0 : u32,
     feature_0 : u32,
     instance_0 : u32,
     tint_0 : u32,
};

fn makeDrawItem_0( m_0 : mat4x4<f32>,  record_2 : u32,  feature_2 : u32,  instance_1 : u32,  tint_2 : u32) -> DrawItem_0
{
    var p_0 : DrawItem_0;
    p_0.relModel_0 = m_0;
    p_0.record_0 = record_2;
    p_0.feature_0 = feature_2;
    p_0.instance_0 = instance_1;
    p_0.tint_0 = tint_2;
    return p_0;
}

fn inFrustum_0( m_1 : mat4x4<f32>,  center_1 : vec3<f32>,  radius_1 : f32) -> bool
{
    var _S1 : vec3<f32> = (((vec4<f32>(center_1, 1.0f)) * (m_1))).xyz;
    var p_1 : u32 = u32(0);
    loop
    {
        if((p_1 < u32(5)))
        {
        }
        else
        {
            break;
        }
        if(((dot(view_0.planes_0[p_1].xyz, _S1) + view_0.planes_0[p_1].w) < (- radius_1)))
        {
            return false;
        }
        p_1 = p_1 + u32(1);
    }
    return true;
}

fn append_0( batch_1 : u32,  item_0 : u32)
{
    var slot_0 : u32 = atomicAdd(&(batchCounts_0[batch_1]), u32(1));
    itemList_0[batches_0[batch_1].itemBase_0 + slot_0] = item_0;
    return;
}

fn relativeMatrix_0( _S2 : u32) -> mat4x4<f32>
{
    var rel_0 : vec3<f32> = transforms_0[_S2].originHi_0 - view_0.cameraHi_0 + (transforms_0[_S2].originLo_0 - view_0.cameraLo_0);
    return mat4x4<f32>(transforms_0[_S2].linear_0[i32(0)].x, transforms_0[_S2].linear_0[i32(1)].x, transforms_0[_S2].linear_0[i32(2)].x, rel_0.x, transforms_0[_S2].linear_0[i32(0)].y, transforms_0[_S2].linear_0[i32(1)].y, transforms_0[_S2].linear_0[i32(2)].y, rel_0.y, transforms_0[_S2].linear_0[i32(0)].z, transforms_0[_S2].linear_0[i32(1)].z, transforms_0[_S2].linear_0[i32(2)].z, rel_0.z, 0.0f, 0.0f, 0.0f, 1.0f);
}

fn drawable_0( _S3 : ptr<function, DrawRecord_std430_0>,  _S4 : u32) -> bool
{
    var _S5 : bool;
    if(((((*_S3).flags_0) & (u32(1)))) == u32(0))
    {
        _S5 = (((transforms_0[_S4].flags_1) & (u32(1)))) == u32(0);
    }
    else
    {
        _S5 = false;
    }
    if(_S5)
    {
        _S5 = ((*_S3).indexCount_0) != u32(0);
    }
    else
    {
        _S5 = false;
    }
    if(_S5)
    {
        _S5 = ((((*_S3).viewMask_0) & ((view_0.viewBit_0)))) != u32(0);
    }
    else
    {
        _S5 = false;
    }
    return _S5;
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
    var _S6 : DrawRecord_std430_0 = records_0[i_0];
    if((_S6.instanceCount_1) != u32(0))
    {
        return;
    }
    var _S7 : mat4x4<f32> = relativeMatrix_0(_S6.transform_0);
    var _S8 : DrawItem_0 = makeDrawItem_0(_S7, i_0, u32(0), u32(0), u32(4294967295));
    var _S9 : array<vec4<f32>, i32(4)> = array<vec4<f32>, i32(4)>( vec4<f32>(_S8.relModel_0[i32(0)][i32(0)], _S8.relModel_0[i32(1)][i32(0)], _S8.relModel_0[i32(2)][i32(0)], _S8.relModel_0[i32(3)][i32(0)]), vec4<f32>(_S8.relModel_0[i32(0)][i32(1)], _S8.relModel_0[i32(1)][i32(1)], _S8.relModel_0[i32(2)][i32(1)], _S8.relModel_0[i32(3)][i32(1)]), vec4<f32>(_S8.relModel_0[i32(0)][i32(2)], _S8.relModel_0[i32(1)][i32(2)], _S8.relModel_0[i32(2)][i32(2)], _S8.relModel_0[i32(3)][i32(2)]), vec4<f32>(_S8.relModel_0[i32(0)][i32(3)], _S8.relModel_0[i32(1)][i32(3)], _S8.relModel_0[i32(2)][i32(3)], _S8.relModel_0[i32(3)][i32(3)]) );
    items_0[i_0].relModel_0.data_1 = _S9;
    items_0[i_0].record_0 = _S8.record_0;
    items_0[i_0].feature_0 = _S8.feature_0;
    items_0[i_0].instance_0 = _S8.instance_0;
    items_0[i_0].tint_0 = _S8.tint_0;
    var _S10 : bool = drawable_0(&(_S6), _S6.transform_0);
    var _S11 : bool;
    if(_S10)
    {
        _S11 = inFrustum_0(_S7, _S6.center_0, _S6.radius_0 * transforms_0[_S6.transform_0].scale_0);
    }
    else
    {
        _S11 = false;
    }
    if(_S11)
    {
        append_0(_S6.batch_0, i_0);
    }
    return;
}

@compute
@workgroup_size(64, 1, 1)
fn cullInstances(@builtin(global_invocation_id) gid_1 : vec3<u32>)
{
    var j_0 : u32 = gid_1.x;
    if((j_0 >= (params_0.instanceCount_0)))
    {
        return;
    }
    var inst_0 : Instance_std430_0 = instanceTable_0[j_0];
    if((inst_0.record_1) == u32(4294967295))
    {
        return;
    }
    var _S12 : DrawRecord_std430_0 = records_0[inst_0.record_1];
    var _S13 : u32 = _S12.transform_0;
    var m_2 : mat4x4<f32> = (((mat4x4<f32>(inst_0.row0_0, inst_0.row1_0, inst_0.row2_0, vec4<f32>(0.0f, 0.0f, 0.0f, 1.0f))) * (relativeMatrix_0(_S12.transform_0))));
    var _S14 : bool;
    if((inst_0.feature_1) != u32(4294967295))
    {
        _S14 = (_S12.featureId_0) != u32(0);
    }
    else
    {
        _S14 = false;
    }
    var feature_3 : u32;
    if(_S14)
    {
        feature_3 = _S12.featureId_0 + inst_0.feature_1;
    }
    else
    {
        feature_3 = u32(0);
    }
    var item_1 : u32 = params_0.firstInstanceItem_0 + j_0;
    var _S15 : DrawItem_0 = makeDrawItem_0(m_2, inst_0.record_1, feature_3, j_0 - _S12.instanceFirst_0, inst_0.tint_1);
    var _S16 : array<vec4<f32>, i32(4)> = array<vec4<f32>, i32(4)>( vec4<f32>(_S15.relModel_0[i32(0)][i32(0)], _S15.relModel_0[i32(1)][i32(0)], _S15.relModel_0[i32(2)][i32(0)], _S15.relModel_0[i32(3)][i32(0)]), vec4<f32>(_S15.relModel_0[i32(0)][i32(1)], _S15.relModel_0[i32(1)][i32(1)], _S15.relModel_0[i32(2)][i32(1)], _S15.relModel_0[i32(3)][i32(1)]), vec4<f32>(_S15.relModel_0[i32(0)][i32(2)], _S15.relModel_0[i32(1)][i32(2)], _S15.relModel_0[i32(2)][i32(2)], _S15.relModel_0[i32(3)][i32(2)]), vec4<f32>(_S15.relModel_0[i32(0)][i32(3)], _S15.relModel_0[i32(1)][i32(3)], _S15.relModel_0[i32(2)][i32(3)], _S15.relModel_0[i32(3)][i32(3)]) );
    items_0[item_1].relModel_0.data_1 = _S16;
    items_0[item_1].record_0 = _S15.record_0;
    items_0[item_1].feature_0 = _S15.feature_0;
    items_0[item_1].instance_0 = _S15.instance_0;
    items_0[item_1].tint_0 = _S15.tint_0;
    var scale_1 : f32 = transforms_0[_S12.transform_0].scale_0 * max(length(vec3<f32>(inst_0.row0_0.x, inst_0.row1_0.x, inst_0.row2_0.x)), max(length(vec3<f32>(inst_0.row0_0.y, inst_0.row1_0.y, inst_0.row2_0.y)), length(vec3<f32>(inst_0.row0_0.z, inst_0.row1_0.z, inst_0.row2_0.z))));
    if((((inst_0.flags_2) & (u32(1)))) == u32(0))
    {
        var _S17 : bool = drawable_0(&(_S12), _S13);
        _S14 = _S17;
    }
    else
    {
        _S14 = false;
    }
    if(_S14)
    {
        _S14 = inFrustum_0(m_2, _S12.center_0, _S12.radius_0 * scale_1);
    }
    else
    {
        _S14 = false;
    }
    if(_S14)
    {
        append_0(_S12.batch_0, item_1);
    }
    return;
}

@compute
@workgroup_size(64, 1, 1)
fn writeDrawArgs(@builtin(global_invocation_id) gid_2 : vec3<u32>)
{
    var b_0 : u32 = gid_2.x;
    if((b_0 >= (params_0.batchCount_0)))
    {
        return;
    }
    var batch_2 : Batch_std430_0 = batches_0[b_0];
    var a_0 : u32 = b_0 * u32(5);
    args_0[a_0] = batch_2.indexCount_1;
    var _S18 : u32 = atomicLoad(&(batchCounts_0[b_0]));
    args_0[a_0 + u32(1)] = _S18;
    args_0[a_0 + u32(2)] = batch_2.firstIndex_1;
    args_0[a_0 + u32(3)] = u32(0);
    args_0[a_0 + u32(4)] = u32(0);
    return;
}

