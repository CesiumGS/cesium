// Generated from src/vector/modelPool.slang by slangc 2026.21
// (scripts/slangBuild.mjs). Do not edit: change the .slang and regenerate.
@binding(4) @group(0) var<storage, read_write> counters_0 : array<atomic<u32>>;

struct PoolParams_std140_0
{
    @align(16) count_0 : u32,
    @align(4) slots_0 : u32,
    @align(8) parts_0 : u32,
    @align(4) threads_0 : u32,
    @align(16) anchors_0 : u32,
    @align(4) streams_0 : u32,
    @align(8) stride_0 : u32,
    @align(4) cameras_0 : u32,
    @align(16) time_0 : f32,
    @align(4) pad0_0 : u32,
    @align(8) pad1_0 : u32,
    @align(4) pad2_0 : u32,
    @align(16) camera_0 : array<vec4<f32>, i32(4)>,
};

@binding(0) @group(0) var<uniform> pool_0 : PoolParams_std140_0;
@binding(5) @group(0) var<storage, read_write> bins_0 : array<u32>;

@binding(1) @group(0) var<storage, read> vertices_0 : array<f32>;

struct _MatrixStorage_float4x4_ColMajorstd430_0
{
    @align(16) data_0 : array<vec4<f32>, i32(4)>,
};

struct Part_std430_0
{
    @align(16) local_0 : _MatrixStorage_float4x4_ColMajorstd430_0,
    @align(16) inverse_0 : _MatrixStorage_float4x4_ColMajorstd430_0,
    @align(16) first_0 : u32,
    @align(4) pad0_1 : u32,
    @align(8) pad1_1 : u32,
    @align(4) pad2_1 : u32,
};

@binding(2) @group(0) var<storage, read> parts_1 : array<Part_std430_0>;

struct Instance_std430_0
{
    @align(16) row0_0 : vec4<f32>,
    @align(16) row1_0 : vec4<f32>,
    @align(16) row2_0 : vec4<f32>,
    @align(16) record_0 : u32,
    @align(4) feature_0 : u32,
    @align(8) flags_0 : u32,
    @align(4) tint_0 : u32,
};

@binding(3) @group(0) var<storage, read_write> instanceRows_0 : array<Instance_std430_0>;

@compute
@workgroup_size(64, 1, 1)
fn resetPool(@builtin(global_invocation_id) gid_0 : vec3<u32>)
{
    var _S1 : u32 = gid_0.x;
    if((_S1 < u32(132)))
    {
        atomicStore(&(counters_0[_S1]), u32(0));
    }
    return;
}

fn anchorOf_0( i_0 : u32) -> vec4<f32>
{
    var a_0 : u32 = pool_0.anchors_0 + i_0 * u32(4);
    return vec4<f32>(vertices_0[a_0], vertices_0[a_0 + u32(1)], vertices_0[a_0 + u32(2)], vertices_0[a_0 + u32(3)]);
}

fn nearest_0( p_0 : vec3<f32>) -> f32
{
    var d_0 : f32 = 3.39999995214436425e+38f;
    var k_0 : u32 = u32(0);
    loop
    {
        if((k_0 < (min(pool_0.cameras_0, u32(4)))))
        {
        }
        else
        {
            break;
        }
        var _S2 : f32 = min(d_0, distance(p_0, pool_0.camera_0[k_0].xyz));
        var _S3 : u32 = k_0 + u32(1);
        d_0 = _S2;
        k_0 = _S3;
    }
    return d_0;
}

@compute
@workgroup_size(64, 1, 1)
fn binPoints(@builtin(global_invocation_id) gid_1 : vec3<u32>)
{
    var i_1 : u32 = gid_1.x + gid_1.y * pool_0.threads_0;
    if((i_1 >= (pool_0.count_0)))
    {
        return;
    }
    bins_0[i_1] = u32(4294967295);
    var a_1 : vec4<f32> = anchorOf_0(i_1);
    if(!((abs(a_1.x)) < 9.99999993381581251e+36f))
    {
        return;
    }
    var d_1 : f32 = nearest_0(a_1.xyz);
    var _S4 : bool = (styleShow((i_1), (d_1)));
    if(!_S4)
    {
        return;
    }
    var _S5 : u32 = min(u32(max(log2(max(d_1, 1.0f)) * 8.0f, 0.0f)), u32(127));
    bins_0[i_1] = _S5;
    var _S6 : u32 = atomicAdd(&(counters_0[_S5]), u32(1));
    return;
}

@compute
@workgroup_size(1, 1, 1)
fn cutPool()
{
    var cut_0 : u32;
    var b_0 : u32 = u32(0);
    var sum_0 : u32 = u32(0);
    loop
    {
        if((b_0 < u32(128)))
        {
        }
        else
        {
            cut_0 = u32(128);
            break;
        }
        var n_0 : u32 = atomicLoad(&(counters_0[b_0]));
        var _S7 : u32 = sum_0 + n_0;
        if((_S7 > (pool_0.slots_0)))
        {
            cut_0 = b_0;
            break;
        }
        b_0 = b_0 + u32(1);
        sum_0 = _S7;
    }
    atomicStore(&(counters_0[u32(128)]), cut_0);
    return;
}

@compute
@workgroup_size(64, 1, 1)
fn claimSlots(@builtin(global_invocation_id) gid_2 : vec3<u32>)
{
    var i_2 : u32 = gid_2.x + gid_2.y * pool_0.threads_0;
    if((i_2 >= (pool_0.count_0)))
    {
        return;
    }
    var b_1 : u32 = bins_0[i_2];
    var _S8 : bool;
    if(bins_0[i_2] == u32(4294967295))
    {
        _S8 = true;
    }
    else
    {
        var _S9 : u32 = atomicLoad(&(counters_0[u32(128)]));
        _S8 = (b_1 >= _S9);
    }
    if(_S8)
    {
        return;
    }
    var slot_0 : u32 = atomicAdd(&(counters_0[u32(129)]), u32(1));
    if((slot_0 >= (pool_0.slots_0)))
    {
        return;
    }
    var a_2 : vec4<f32> = anchorOf_0(i_2);
    var _S10 : vec3<f32> = a_2.xyz;
    var d_2 : f32 = nearest_0(_S10);
    var _S11 : f32 = (styleHeading((i_2), (d_2)));
    var h_0 : f32 = radians(_S11);
    var scale_0 : f32 = (styleScale((i_2), (d_2)));
    var up_0 : vec3<f32> = normalize(vec3<f32>(a_2.x, a_2.y, a_2.z + 6.371e+06f));
    var east_0 : vec3<f32> = normalize(cross(vec3<f32>(0.0f, 1.0f, 0.0f), up_0));
    var north_0 : vec3<f32> = cross(up_0, east_0);
    var _S12 : vec3<f32> = vec3<f32>(cos(h_0));
    var _S13 : vec3<f32> = vec3<f32>(sin(h_0));
    var _S14 : vec3<f32> = vec3<f32>(scale_0);
    var _S15 : mat4x4<f32> = transpose(mat4x4<f32>(vec4<f32>((north_0 * _S12 + east_0 * _S13) * _S14, 0.0f), vec4<f32>((north_0 * _S13 - east_0 * _S12) * _S14, 0.0f), vec4<f32>(up_0 * _S14, 0.0f), vec4<f32>(_S10, 1.0f)));
    var k_1 : u32 = u32(0);
    loop
    {
        if((k_1 < (pool_0.parts_0)))
        {
        }
        else
        {
            break;
        }
        var m_0 : mat4x4<f32> = (((mat4x4<f32>(parts_1[k_1].local_0.data_0[i32(0)][i32(0)], parts_1[k_1].local_0.data_0[i32(1)][i32(0)], parts_1[k_1].local_0.data_0[i32(2)][i32(0)], parts_1[k_1].local_0.data_0[i32(3)][i32(0)], parts_1[k_1].local_0.data_0[i32(0)][i32(1)], parts_1[k_1].local_0.data_0[i32(1)][i32(1)], parts_1[k_1].local_0.data_0[i32(2)][i32(1)], parts_1[k_1].local_0.data_0[i32(3)][i32(1)], parts_1[k_1].local_0.data_0[i32(0)][i32(2)], parts_1[k_1].local_0.data_0[i32(1)][i32(2)], parts_1[k_1].local_0.data_0[i32(2)][i32(2)], parts_1[k_1].local_0.data_0[i32(3)][i32(2)], parts_1[k_1].local_0.data_0[i32(0)][i32(3)], parts_1[k_1].local_0.data_0[i32(1)][i32(3)], parts_1[k_1].local_0.data_0[i32(2)][i32(3)], parts_1[k_1].local_0.data_0[i32(3)][i32(3)])) * ((((_S15) * (mat4x4<f32>(parts_1[k_1].inverse_0.data_0[i32(0)][i32(0)], parts_1[k_1].inverse_0.data_0[i32(1)][i32(0)], parts_1[k_1].inverse_0.data_0[i32(2)][i32(0)], parts_1[k_1].inverse_0.data_0[i32(3)][i32(0)], parts_1[k_1].inverse_0.data_0[i32(0)][i32(1)], parts_1[k_1].inverse_0.data_0[i32(1)][i32(1)], parts_1[k_1].inverse_0.data_0[i32(2)][i32(1)], parts_1[k_1].inverse_0.data_0[i32(3)][i32(1)], parts_1[k_1].inverse_0.data_0[i32(0)][i32(2)], parts_1[k_1].inverse_0.data_0[i32(1)][i32(2)], parts_1[k_1].inverse_0.data_0[i32(2)][i32(2)], parts_1[k_1].inverse_0.data_0[i32(3)][i32(2)], parts_1[k_1].inverse_0.data_0[i32(0)][i32(3)], parts_1[k_1].inverse_0.data_0[i32(1)][i32(3)], parts_1[k_1].inverse_0.data_0[i32(2)][i32(3)], parts_1[k_1].inverse_0.data_0[i32(3)][i32(3)])))))));
        var row_0 : u32 = parts_1[k_1].first_0 + slot_0;
        instanceRows_0[row_0].row0_0 = m_0[i32(0)];
        instanceRows_0[row_0].row1_0 = m_0[i32(1)];
        instanceRows_0[row_0].row2_0 = m_0[i32(2)];
        instanceRows_0[row_0].flags_0 = ((instanceRows_0[row_0].flags_0) & (u32(4294967294)));
        k_1 = k_1 + u32(1);
    }
    return;
}

@compute
@workgroup_size(64, 1, 1)
fn hideRest(@builtin(global_invocation_id) gid_3 : vec3<u32>)
{
    var j_0 : u32 = gid_3.x;
    if((j_0 >= (pool_0.slots_0 * pool_0.parts_0)))
    {
        return;
    }
    var slot_1 : u32 = j_0 % pool_0.slots_0;
    var _S16 : u32 = atomicLoad(&(counters_0[u32(129)]));
    if((slot_1 < (min(_S16, pool_0.slots_0))))
    {
        return;
    }
    var _S17 : u32 = j_0 / pool_0.slots_0;
    instanceRows_0[parts_1[_S17].first_0 + slot_1].flags_0 = ((instanceRows_0[parts_1[_S17].first_0 + slot_1].flags_0) | (u32(1)));
    return;
}

fn styleTime() -> f32
{
    return pool_0.time_0;
}

fn pointF32( i_3 : u32,  word_0 : u32) -> f32
{
    return vertices_0[pool_0.streams_0 + i_3 * pool_0.stride_0 + word_0];
}

fn pointU32( i_4 : u32,  word_1 : u32) -> u32
{
    return (bitcast<u32>((vertices_0[pool_0.streams_0 + i_4 * pool_0.stride_0 + word_1])));
}

