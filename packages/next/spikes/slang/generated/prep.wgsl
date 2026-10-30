struct PrepParams_std140_0
{
    @align(16) recordCount_0 : u32,
    @align(4) batchCount_0 : u32,
    @align(8) pad0_0 : u32,
    @align(4) pad1_0 : u32,
};

@binding(6) @group(1) var<uniform> params_0 : PrepParams_std140_0;
struct _MatrixStorage_float4x4_ColMajorstd430_0
{
    @align(16) data_0 : array<vec4<f32>, i32(4)>,
};

struct DrawRecord_std430_0
{
    @align(16) originHi_0 : vec3<f32>,
    @align(4) radius_0 : f32,
    @align(16) originLo_0 : vec3<f32>,
    @align(4) flags_0 : u32,
    @align(16) model_0 : _MatrixStorage_float4x4_ColMajorstd430_0,
    @align(16) color_0 : vec4<f32>,
    @align(16) center_0 : vec3<f32>,
    @align(4) materialIndex_0 : u32,
    @align(16) indexCount_0 : u32,
    @align(4) firstIndex_0 : u32,
    @align(8) featureId_0 : u32,
    @align(4) batch_0 : u32,
    @align(16) positionOffset_0 : u32,
    @align(4) normalOffset_0 : u32,
    @align(8) uvOffset_0 : u32,
    @align(4) colorOffset_0 : u32,
    @align(16) tangentOffset_0 : u32,
    @align(4) textureSet_0 : u32,
    @align(8) imagerySlice_0 : u32,
    @align(4) featureIdOffset_0 : u32,
    @align(16) viewMask_0 : u32,
    @align(4) clipBlock_0 : u32,
    @align(8) placeholderMask_0 : u32,
    @align(4) clipCount_0 : u32,
    @align(16) horizonPoint_0 : vec3<f32>,
    @align(4) recordPad3_0 : u32,
};

@binding(0) @group(1) var<storage, read> records_0 : array<DrawRecord_std430_0>;

struct _MatrixStorage_float4x4_ColMajorstd140_0
{
    @align(16) data_1 : array<vec4<f32>, i32(4)>,
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
struct DrawInstance_std430_0
{
    @align(16) relModel_0 : _MatrixStorage_float4x4_ColMajorstd430_0,
};

@binding(1) @group(1) var<storage, read_write> instances_0 : array<DrawInstance_std430_0>;

@binding(3) @group(1) var<storage, read_write> batchCounts_0 : array<atomic<u32>>;

struct Batch_std430_0
{
    @align(4) instanceBase_0 : u32,
    @align(4) indexCount_1 : u32,
    @align(4) firstIndex_1 : u32,
    @align(4) pad_0 : u32,
};

@binding(4) @group(1) var<storage, read> batches_0 : array<Batch_std430_0>;

@binding(2) @group(1) var<storage, read_write> instanceList_0 : array<u32>;

@binding(5) @group(1) var<storage, read_write> args_0 : array<u32>;

fn horizonVisible_0( occludee_0 : vec3<f32>) -> bool
{
    var cv_0 : vec3<f32> = (view_0.cameraHi_0 + view_0.cameraLo_0) * vec3<f32>(1.56785588956154243e-07f, 1.56785588956154243e-07f, 1.57313024828908965e-07f);
    var vhMagnitudeSquared_0 : f32 = dot(cv_0, cv_0) - 1.0f;
    var vt_0 : vec3<f32> = occludee_0 - cv_0;
    var vtDotVc_0 : f32 = - dot(vt_0, cv_0);
    var occluded_0 : bool;
    if((vhMagnitudeSquared_0 < 0.0f))
    {
        occluded_0 = (vtDotVc_0 > 0.0f);
    }
    else
    {
        if((vtDotVc_0 > vhMagnitudeSquared_0))
        {
            occluded_0 = ((vtDotVc_0 * vtDotVc_0 / dot(vt_0, vt_0)) > vhMagnitudeSquared_0);
        }
        else
        {
            occluded_0 = false;
        }
    }
    return !occluded_0;
}

@compute
@workgroup_size(64, 1, 1)
fn main(@builtin(global_invocation_id) gid_0 : vec3<u32>)
{
    var i_0 : u32 = gid_0.x;
    if((i_0 >= (params_0.recordCount_0)))
    {
        return;
    }
    var rel_0 : vec3<f32> = records_0[i_0].originHi_0 - view_0.cameraHi_0 + (records_0[i_0].originLo_0 - view_0.cameraLo_0);
    var m_0 : mat4x4<f32> = mat4x4<f32>(records_0[i_0].model_0.data_0[i32(0)][i32(0)], records_0[i_0].model_0.data_0[i32(1)][i32(0)], records_0[i_0].model_0.data_0[i32(2)][i32(0)], records_0[i_0].model_0.data_0[i32(3)][i32(0)], records_0[i_0].model_0.data_0[i32(0)][i32(1)], records_0[i_0].model_0.data_0[i32(1)][i32(1)], records_0[i_0].model_0.data_0[i32(2)][i32(1)], records_0[i_0].model_0.data_0[i32(3)][i32(1)], records_0[i_0].model_0.data_0[i32(0)][i32(2)], records_0[i_0].model_0.data_0[i32(1)][i32(2)], records_0[i_0].model_0.data_0[i32(2)][i32(2)], records_0[i_0].model_0.data_0[i32(3)][i32(2)], records_0[i_0].model_0.data_0[i32(0)][i32(3)], records_0[i_0].model_0.data_0[i32(1)][i32(3)], records_0[i_0].model_0.data_0[i32(2)][i32(3)], records_0[i_0].model_0.data_0[i32(3)][i32(3)]);
    m_0[i32(0)][i32(3)] = m_0[i32(0)][i32(3)] + rel_0.x;
    m_0[i32(1)][i32(3)] = m_0[i32(1)][i32(3)] + rel_0.y;
    m_0[i32(2)][i32(3)] = m_0[i32(2)][i32(3)] + rel_0.z;
    var _S1 : array<vec4<f32>, i32(4)> = array<vec4<f32>, i32(4)>( vec4<f32>(m_0[i32(0)][i32(0)], m_0[i32(1)][i32(0)], m_0[i32(2)][i32(0)], m_0[i32(3)][i32(0)]), vec4<f32>(m_0[i32(0)][i32(1)], m_0[i32(1)][i32(1)], m_0[i32(2)][i32(1)], m_0[i32(3)][i32(1)]), vec4<f32>(m_0[i32(0)][i32(2)], m_0[i32(1)][i32(2)], m_0[i32(2)][i32(2)], m_0[i32(3)][i32(2)]), vec4<f32>(m_0[i32(0)][i32(3)], m_0[i32(1)][i32(3)], m_0[i32(2)][i32(3)], m_0[i32(3)][i32(3)]) );
    instances_0[i_0].relModel_0.data_0 = _S1;
    var _S2 : u32 = records_0[i_0].flags_0;
    var _S3 : bool;
    if((((records_0[i_0].flags_0) & (u32(1)))) != u32(0))
    {
        _S3 = true;
    }
    else
    {
        _S3 = (records_0[i_0].indexCount_0) == u32(0);
    }
    if(_S3)
    {
        _S3 = true;
    }
    else
    {
        _S3 = (((records_0[i_0].viewMask_0) & ((view_0.viewBit_0)))) == u32(0);
    }
    if(_S3)
    {
        return;
    }
    if(((_S2 & (u32(4)))) != u32(0))
    {
        _S3 = !horizonVisible_0(records_0[i_0].horizonPoint_0);
    }
    else
    {
        _S3 = false;
    }
    if(_S3)
    {
        return;
    }
    var _S4 : vec3<f32> = rel_0 + records_0[i_0].center_0;
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
        if(((dot(view_0.planes_0[p_0].xyz, _S4) + view_0.planes_0[p_0].w) < (- records_0[i_0].radius_0)))
        {
            return;
        }
        p_0 = p_0 + u32(1);
    }
    var _S5 : u32 = records_0[i_0].batch_0;
    var slot_0 : u32 = atomicAdd(&(batchCounts_0[records_0[i_0].batch_0]), u32(1));
    instanceList_0[batches_0[_S5].instanceBase_0 + slot_0] = i_0;
    return;
}

@compute
@workgroup_size(64, 1, 1)
fn writeArgs(@builtin(global_invocation_id) gid_1 : vec3<u32>)
{
    var b_0 : u32 = gid_1.x;
    if((b_0 >= (params_0.batchCount_0)))
    {
        return;
    }
    var batch_1 : Batch_std430_0 = batches_0[b_0];
    var a_0 : u32 = b_0 * u32(5);
    args_0[a_0] = batch_1.indexCount_1;
    var _S6 : u32 = atomicLoad(&(batchCounts_0[b_0]));
    args_0[a_0 + u32(1)] = _S6;
    args_0[a_0 + u32(2)] = batch_1.firstIndex_1;
    args_0[a_0 + u32(3)] = u32(0);
    args_0[a_0 + u32(4)] = u32(0);
    return;
}

