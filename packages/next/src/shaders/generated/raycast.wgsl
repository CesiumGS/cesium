// Generated from src/shaders/raycast.slang by slangc 2026.21
// (scripts/slangBuild.mjs). Do not edit: change the .slang and regenerate.
struct Job_std430_0
{
    @align(4) ray_0 : u32,
    @align(4) record_0 : u32,
    @align(4) firstTriangle_0 : u32,
    @align(4) instance_0 : u32,
};

@binding(1) @group(0) var<storage, read> jobs_0 : array<Job_std430_0>;

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
};

@binding(2) @group(0) var<storage, read> records_0 : array<DrawRecord_std430_0>;

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

@binding(3) @group(0) var<storage, read> transforms_0 : array<Transform_std430_0>;

struct Ray_std430_0
{
    @align(16) originHi_1 : vec3<f32>,
    @align(4) maxDistance_0 : f32,
    @align(16) originLo_1 : vec3<f32>,
    @align(4) pad0_0 : u32,
    @align(16) direction_0 : vec3<f32>,
    @align(4) pad1_0 : u32,
};

@binding(0) @group(0) var<storage, read> rays_0 : array<Ray_std430_0>;

struct Instance_std430_0
{
    @align(16) row0_0 : vec4<f32>,
    @align(16) row1_0 : vec4<f32>,
    @align(16) row2_0 : vec4<f32>,
    @align(16) record_1 : u32,
    @align(4) feature_0 : u32,
    @align(8) flags_2 : u32,
    @align(4) tint_0 : u32,
};

@binding(4) @group(0) var<storage, read> instanceTable_0 : array<Instance_std430_0>;

@binding(6) @group(0) var<storage, read> indices_0 : array<u32>;

@binding(5) @group(0) var<storage, read> vertices_0 : array<f32>;

@binding(7) @group(0) var<storage, read_write> hits_0 : array<atomic<u32>>;

var<private> _S1 : vec3<u32>;

fn WorkgroupCount_0() -> vec3<u32>
{
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

fn position_0( offset_0 : u32,  index_0 : u32) -> vec3<f32>
{
    var b_1 : u32 = offset_0 + index_0 * u32(3);
    return vec3<f32>(vertices_0[b_1], vertices_0[b_1 + u32(1)], vertices_0[b_1 + u32(2)]);
}

@compute
@workgroup_size(64, 1, 1)
fn main(@builtin(workgroup_id) wg_0 : vec3<u32>, @builtin(local_invocation_index) lane_0 : u32, @builtin(num_workgroups) _builtinWorkgroupCount_0 : vec3<u32>)
{
    _S1 = _builtinWorkgroupCount_0;
    var jobIndex_0 : u32 = wg_0.y * WorkgroupCount_0().x + wg_0.x;
    var _S3 : vec2<u32> = vec2<u32>(arrayLength(&jobs_0), 16);
    if((jobIndex_0 >= (_S3.x)))
    {
        return;
    }
    var job_0 : Job_std430_0 = jobs_0[jobIndex_0];
    var _S4 : u32 = job_0.record_0;
    var firstIndex_1 : u32 = records_0[_S4].firstIndex_0;
    var positionOffset_1 : u32 = records_0[_S4].positionOffset_0;
    var _S5 : u32 = (job_0.firstTriangle_0 + lane_0) * u32(3);
    if(((_S5 + u32(2)) >= (records_0[_S4].indexCount_0)))
    {
        return;
    }
    var t_0 : Transform_std430_0 = transforms_0[records_0[_S4].transform_0];
    var ray_1 : Ray_std430_0 = rays_0[job_0.ray_0];
    var origin_0 : vec3<f32> = SplitPosition_difference_0(SplitPosition_x24init_0(ray_1.originHi_1, ray_1.originLo_1), SplitPosition_x24init_0(t_0.originHi_0, t_0.originLo_0));
    var _S6 : mat3x3<f32> = mat3x3<f32>(1.0f, 0.0f, 0.0f, 0.0f, 1.0f, 0.0f, 0.0f, 0.0f, 1.0f);
    var _S7 : vec3<f32> = vec3<f32>(0.0f);
    var local_0 : mat3x3<f32>;
    var offset_1 : vec3<f32>;
    if((job_0.instance_0) != u32(4294967295))
    {
        var inst_0 : Instance_std430_0 = instanceTable_0[job_0.instance_0];
        var _S8 : vec3<f32> = vec3<f32>(inst_0.row0_0.w, inst_0.row1_0.w, inst_0.row2_0.w);
        local_0 = mat3x3<f32>(inst_0.row0_0.xyz, inst_0.row1_0.xyz, inst_0.row2_0.xyz);
        offset_1 = _S8;
    }
    else
    {
        local_0 = _S6;
        offset_1 = _S7;
    }
    var first_0 : u32 = firstIndex_1 + _S5;
    var _S9 : mat3x3<f32> = mat3x3<f32>(t_0.linear_0.data_0[i32(0)][i32(0)], t_0.linear_0.data_0[i32(1)][i32(0)], t_0.linear_0.data_0[i32(2)][i32(0)], t_0.linear_0.data_0[i32(0)][i32(1)], t_0.linear_0.data_0[i32(1)][i32(1)], t_0.linear_0.data_0[i32(2)][i32(1)], t_0.linear_0.data_0[i32(0)][i32(2)], t_0.linear_0.data_0[i32(1)][i32(2)], t_0.linear_0.data_0[i32(2)][i32(2)]);
    var a_0 : vec3<f32> = ((((((position_0(positionOffset_1, indices_0[first_0])) * (local_0))) + offset_1) * (_S9)));
    var e1_0 : vec3<f32> = ((((((position_0(positionOffset_1, indices_0[first_0 + u32(1)])) * (local_0))) + offset_1) * (_S9))) - a_0;
    var e2_0 : vec3<f32> = ((((((position_0(positionOffset_1, indices_0[first_0 + u32(2)])) * (local_0))) + offset_1) * (_S9))) - a_0;
    var p_0 : vec3<f32> = cross(ray_1.direction_0, e2_0);
    var det_0 : f32 = dot(e1_0, p_0);
    if(((abs(det_0)) < 9.999999960041972e-13f))
    {
        return;
    }
    var inv_0 : f32 = 1.0f / det_0;
    var s_0 : vec3<f32> = origin_0 - a_0;
    var u_0 : f32 = dot(s_0, p_0) * inv_0;
    var _S10 : bool;
    if((u_0 < 0.0f))
    {
        _S10 = true;
    }
    else
    {
        _S10 = (u_0 > 1.0f);
    }
    if(_S10)
    {
        return;
    }
    var q_0 : vec3<f32> = cross(s_0, e1_0);
    var v_0 : f32 = dot(ray_1.direction_0, q_0) * inv_0;
    if((v_0 < 0.0f))
    {
        _S10 = true;
    }
    else
    {
        _S10 = ((u_0 + v_0) > 1.0f);
    }
    if(_S10)
    {
        return;
    }
    var d_0 : f32 = dot(e2_0, q_0) * inv_0;
    if((d_0 >= 0.0f))
    {
        _S10 = (d_0 <= (ray_1.maxDistance_0));
    }
    else
    {
        _S10 = false;
    }
    if(_S10)
    {
        var _S11 : u32 = atomicMin(&(hits_0[job_0.ray_0]), (bitcast<u32>((d_0))));
    }
    return;
}

