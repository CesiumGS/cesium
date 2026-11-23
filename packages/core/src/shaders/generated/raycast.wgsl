// Generated from src/shaders/raycast.slang by slangc 2026.22
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
    @align(8) casterMask_0 : u32,
    @align(4) debug_0 : u32,
    @align(16) morph_0 : f32,
    @align(4) imageryFrom_0 : u32,
    @align(8) imageryFade_0 : f32,
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

@binding(8) @group(0) var<storage, read_write> pickResult_0 : array<u32>;

@binding(9) @group(0) var<storage, read> pickBatchSlabs_0 : array<u32>;

struct PickTriangleParams_std140_0
{
    @align(16) slab_0 : u32,
    @align(16) pad_0 : vec3<u32>,
};

@binding(10) @group(0) var<uniform> pickTriangleParams_0 : PickTriangleParams_std140_0;
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

fn clampIndex_0( at_0 : u32,  count_0 : u32) -> u32
{
    return min(at_0, max(count_0, u32(1)) - u32(1));
}

fn indexAt_0( at_1 : u32) -> u32
{
    var _S3 : vec2<u32> = vec2<u32>(arrayLength(&indices_0), 4);
    return indices_0[clampIndex_0(at_1, _S3.x)];
}

fn clampSpan_0( at_2 : u32,  width_0 : u32,  count_1 : u32) -> u32
{
    var _S4 : u32;
    if((count_1 >= width_0))
    {
        _S4 = count_1 - width_0;
    }
    else
    {
        _S4 = u32(0);
    }
    return min(at_2, _S4);
}

fn position_0( offset_0 : u32,  index_0 : u32) -> vec3<f32>
{
    var _S5 : vec2<u32> = vec2<u32>(arrayLength(&vertices_0), 4);
    var b_1 : u32 = clampSpan_0(offset_0 + index_0 * u32(3), u32(3), _S5.x);
    return vec3<f32>(vertices_0[b_1], vertices_0[b_1 + u32(1)], vertices_0[b_1 + u32(2)]);
}

@compute
@workgroup_size(64, 1, 1)
fn main(@builtin(workgroup_id) wg_0 : vec3<u32>, @builtin(local_invocation_index) lane_0 : u32, @builtin(num_workgroups) _builtinWorkgroupCount_0 : vec3<u32>)
{
    _S1 = _builtinWorkgroupCount_0;
    var jobIndex_0 : u32 = wg_0.y * WorkgroupCount_0().x + wg_0.x;
    var _S6 : vec2<u32> = vec2<u32>(arrayLength(&jobs_0), 16);
    if((jobIndex_0 >= (_S6.x)))
    {
        return;
    }
    var job_0 : Job_std430_0 = jobs_0[jobIndex_0];
    var _S7 : u32 = job_0.record_0;
    var firstIndex_1 : u32 = records_0[_S7].firstIndex_0;
    var positionOffset_1 : u32 = records_0[_S7].positionOffset_0;
    var _S8 : u32 = (job_0.firstTriangle_0 + lane_0) * u32(3);
    if(((_S8 + u32(2)) >= (records_0[_S7].indexCount_0)))
    {
        return;
    }
    var t_0 : Transform_std430_0 = transforms_0[records_0[_S7].transform_0];
    var ray_1 : Ray_std430_0 = rays_0[job_0.ray_0];
    var origin_0 : vec3<f32> = SplitPosition_difference_0(SplitPosition_x24init_0(ray_1.originHi_1, ray_1.originLo_1), SplitPosition_x24init_0(t_0.originHi_0, t_0.originLo_0));
    var _S9 : mat3x3<f32> = mat3x3<f32>(1.0f, 0.0f, 0.0f, 0.0f, 1.0f, 0.0f, 0.0f, 0.0f, 1.0f);
    var _S10 : vec3<f32> = vec3<f32>(0.0f);
    var local_0 : mat3x3<f32>;
    var offset_1 : vec3<f32>;
    if((job_0.instance_0) != u32(4294967295))
    {
        var inst_0 : Instance_std430_0 = instanceTable_0[job_0.instance_0];
        var _S11 : vec3<f32> = vec3<f32>(inst_0.row0_0.w, inst_0.row1_0.w, inst_0.row2_0.w);
        local_0 = mat3x3<f32>(inst_0.row0_0.xyz, inst_0.row1_0.xyz, inst_0.row2_0.xyz);
        offset_1 = _S11;
    }
    else
    {
        local_0 = _S9;
        offset_1 = _S10;
    }
    var first_0 : u32 = firstIndex_1 + _S8;
    var _S12 : mat3x3<f32> = mat3x3<f32>(t_0.linear_0.data_0[i32(0)][i32(0)], t_0.linear_0.data_0[i32(1)][i32(0)], t_0.linear_0.data_0[i32(2)][i32(0)], t_0.linear_0.data_0[i32(0)][i32(1)], t_0.linear_0.data_0[i32(1)][i32(1)], t_0.linear_0.data_0[i32(2)][i32(1)], t_0.linear_0.data_0[i32(0)][i32(2)], t_0.linear_0.data_0[i32(1)][i32(2)], t_0.linear_0.data_0[i32(2)][i32(2)]);
    var a_0 : vec3<f32> = ((((((position_0(positionOffset_1, indexAt_0(first_0))) * (local_0))) + offset_1) * (_S12)));
    var e1_0 : vec3<f32> = ((((((position_0(positionOffset_1, indexAt_0(first_0 + u32(1)))) * (local_0))) + offset_1) * (_S12))) - a_0;
    var e2_0 : vec3<f32> = ((((((position_0(positionOffset_1, indexAt_0(first_0 + u32(2)))) * (local_0))) + offset_1) * (_S12))) - a_0;
    var p_0 : vec3<f32> = cross(ray_1.direction_0, e2_0);
    var det_0 : f32 = dot(e1_0, p_0);
    if(((abs(det_0)) < 9.999999960041972e-13f))
    {
        return;
    }
    var inv_0 : f32 = 1.0f / det_0;
    var s_0 : vec3<f32> = origin_0 - a_0;
    var u_0 : f32 = dot(s_0, p_0) * inv_0;
    var _S13 : bool;
    if((u_0 < 0.0f))
    {
        _S13 = true;
    }
    else
    {
        _S13 = (u_0 > 1.0f);
    }
    if(_S13)
    {
        return;
    }
    var q_0 : vec3<f32> = cross(s_0, e1_0);
    var v_0 : f32 = dot(ray_1.direction_0, q_0) * inv_0;
    if((v_0 < 0.0f))
    {
        _S13 = true;
    }
    else
    {
        _S13 = ((u_0 + v_0) > 1.0f);
    }
    if(_S13)
    {
        return;
    }
    var d_0 : f32 = dot(e2_0, q_0) * inv_0;
    if((d_0 >= 0.0f))
    {
        _S13 = (d_0 <= (ray_1.maxDistance_0));
    }
    else
    {
        _S13 = false;
    }
    if(_S13)
    {
        var _S14 : u32 = atomicMin(&(hits_0[job_0.ray_0]), (bitcast<u32>((d_0))));
    }
    return;
}

@compute
@workgroup_size(64, 1, 1)
fn rayFeature(@builtin(workgroup_id) wg_1 : vec3<u32>, @builtin(local_invocation_index) lane_1 : u32)
{
    var jobIndex_1 : u32 = wg_1.y * WorkgroupCount_0().x + wg_1.x;
    var _S15 : vec2<u32> = vec2<u32>(arrayLength(&jobs_0), 16);
    if((jobIndex_1 >= (_S15.x)))
    {
        return;
    }
    var job_1 : Job_std430_0 = jobs_0[jobIndex_1];
    var _S16 : u32 = job_1.record_0;
    var firstIndex_2 : u32 = records_0[_S16].firstIndex_0;
    var positionOffset_2 : u32 = records_0[_S16].positionOffset_0;
    var _S17 : u32 = (job_1.firstTriangle_0 + lane_1) * u32(3);
    if(((_S17 + u32(2)) >= (records_0[_S16].indexCount_0)))
    {
        return;
    }
    var _S18 : vec2<u32> = vec2<u32>(arrayLength(&rays_0), 48);
    var rayCount_0 : u32 = _S18.x;
    var _S19 : vec2<u32> = vec2<u32>(arrayLength(&hits_0), 4);
    var hitCount_0 : u32 = _S19.x;
    var _S20 : bool;
    if(((job_1.ray_0) >= rayCount_0))
    {
        _S20 = true;
    }
    else
    {
        _S20 = ((rayCount_0 + job_1.ray_0) >= hitCount_0);
    }
    if(_S20)
    {
        return;
    }
    var nearest_0 : u32 = atomicLoad(&(hits_0[job_1.ray_0]));
    if(nearest_0 == u32(2139095039))
    {
        return;
    }
    var t_1 : Transform_std430_0 = transforms_0[records_0[_S16].transform_0];
    var ray_2 : Ray_std430_0 = rays_0[job_1.ray_0];
    var origin_1 : vec3<f32> = SplitPosition_difference_0(SplitPosition_x24init_0(ray_2.originHi_1, ray_2.originLo_1), SplitPosition_x24init_0(t_1.originHi_0, t_1.originLo_0));
    var _S21 : mat3x3<f32> = mat3x3<f32>(1.0f, 0.0f, 0.0f, 0.0f, 1.0f, 0.0f, 0.0f, 0.0f, 1.0f);
    var _S22 : vec3<f32> = vec3<f32>(0.0f);
    var local_1 : mat3x3<f32>;
    var offset_2 : vec3<f32>;
    var instanceFeature_0 : u32;
    if((job_1.instance_0) != u32(4294967295))
    {
        var inst_1 : Instance_std430_0 = instanceTable_0[job_1.instance_0];
        var _S23 : vec3<f32> = vec3<f32>(inst_1.row0_0.w, inst_1.row1_0.w, inst_1.row2_0.w);
        local_1 = mat3x3<f32>(inst_1.row0_0.xyz, inst_1.row1_0.xyz, inst_1.row2_0.xyz);
        offset_2 = _S23;
        instanceFeature_0 = inst_1.feature_0;
    }
    else
    {
        local_1 = _S21;
        offset_2 = _S22;
        instanceFeature_0 = u32(4294967295);
    }
    var first_1 : u32 = firstIndex_2 + _S17;
    var _S24 : mat3x3<f32> = mat3x3<f32>(t_1.linear_0.data_0[i32(0)][i32(0)], t_1.linear_0.data_0[i32(1)][i32(0)], t_1.linear_0.data_0[i32(2)][i32(0)], t_1.linear_0.data_0[i32(0)][i32(1)], t_1.linear_0.data_0[i32(1)][i32(1)], t_1.linear_0.data_0[i32(2)][i32(1)], t_1.linear_0.data_0[i32(0)][i32(2)], t_1.linear_0.data_0[i32(1)][i32(2)], t_1.linear_0.data_0[i32(2)][i32(2)]);
    var a_1 : vec3<f32> = ((((((position_0(positionOffset_2, indexAt_0(first_1))) * (local_1))) + offset_2) * (_S24)));
    var e1_1 : vec3<f32> = ((((((position_0(positionOffset_2, indexAt_0(first_1 + u32(1)))) * (local_1))) + offset_2) * (_S24))) - a_1;
    var e2_1 : vec3<f32> = ((((((position_0(positionOffset_2, indexAt_0(first_1 + u32(2)))) * (local_1))) + offset_2) * (_S24))) - a_1;
    var p_1 : vec3<f32> = cross(ray_2.direction_0, e2_1);
    var det_1 : f32 = dot(e1_1, p_1);
    if(((abs(det_1)) < 9.999999960041972e-13f))
    {
        return;
    }
    var inv_1 : f32 = 1.0f / det_1;
    var s_1 : vec3<f32> = origin_1 - a_1;
    var u_1 : f32 = dot(s_1, p_1) * inv_1;
    if((u_1 < 0.0f))
    {
        _S20 = true;
    }
    else
    {
        _S20 = (u_1 > 1.0f);
    }
    if(_S20)
    {
        return;
    }
    var q_1 : vec3<f32> = cross(s_1, e1_1);
    var v_1 : f32 = dot(ray_2.direction_0, q_1) * inv_1;
    if((v_1 < 0.0f))
    {
        _S20 = true;
    }
    else
    {
        _S20 = ((u_1 + v_1) > 1.0f);
    }
    if(_S20)
    {
        return;
    }
    var d_1 : f32 = dot(e2_1, q_1) * inv_1;
    if((d_1 >= 0.0f))
    {
        _S20 = (d_1 <= (ray_2.maxDistance_0));
    }
    else
    {
        _S20 = false;
    }
    if(!_S20)
    {
        return;
    }
    if(((abs(i32((bitcast<u32>((d_1)))) - i32(nearest_0))) > i32(4)))
    {
        return;
    }
    var _S25 : u32 = records_0[_S16].featureId_0;
    if(instanceFeature_0 != u32(4294967295))
    {
        _S20 = _S25 != u32(0);
    }
    else
    {
        _S20 = false;
    }
    var slot_0 : u32;
    if(_S20)
    {
        slot_0 = _S25 + instanceFeature_0;
    }
    else
    {
        var _S26 : u32 = records_0[_S16].featureIdOffset_0;
        if((records_0[_S16].featureIdOffset_0) != u32(4294967295))
        {
            var _S27 : vec2<u32> = vec2<u32>(arrayLength(&vertices_0), 4);
            var localFeature_0 : u32 = (bitcast<u32>((vertices_0[min(_S26 + indexAt_0(first_1), max(_S27.x, u32(1)) - u32(1))])));
            if(localFeature_0 == u32(4294967295))
            {
                instanceFeature_0 = u32(0);
            }
            else
            {
                instanceFeature_0 = _S25 + localFeature_0;
            }
            slot_0 = instanceFeature_0;
        }
        else
        {
            slot_0 = _S25;
        }
    }
    if(slot_0 == u32(0))
    {
        return;
    }
    var _S28 : u32 = atomicMin(&(hits_0[rayCount_0 + job_1.ray_0]), slot_0);
    return;
}

@compute
@workgroup_size(1, 1, 1)
fn pickTriangle()
{
    var draw_0 : u32 = pickResult_0[i32(0)];
    var number_0 : u32 = pickResult_0[i32(2)];
    var _S29 : bool;
    if(pickResult_0[i32(0)] == u32(4294967295))
    {
        _S29 = true;
    }
    else
    {
        _S29 = number_0 == u32(4294967295);
    }
    if(_S29)
    {
        return;
    }
    if(pickBatchSlabs_0[records_0[draw_0].batch_0] != (pickTriangleParams_0.slab_0))
    {
        return;
    }
    var _S30 : u32 = records_0[draw_0].firstIndex_0 + number_0 * u32(3);
    var k_0 : u32 = u32(0);
    loop
    {
        if((k_0 < u32(3)))
        {
        }
        else
        {
            break;
        }
        var p_2 : vec3<f32> = position_0(records_0[draw_0].positionOffset_0, indexAt_0(_S30 + k_0));
        var _S31 : u32 = k_0 * u32(3);
        pickResult_0[u32(10) + _S31] = (bitcast<u32>((p_2.x)));
        pickResult_0[u32(11) + _S31] = (bitcast<u32>((p_2.y)));
        pickResult_0[u32(12) + _S31] = (bitcast<u32>((p_2.z)));
        k_0 = k_0 + u32(1);
    }
    pickResult_0[i32(9)] = u32(1);
    return;
}

