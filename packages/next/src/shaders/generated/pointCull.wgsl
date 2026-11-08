// Generated from src/shaders/pointCull.slang by slangc 2026.21
// (scripts/slangBuild.mjs). Do not edit: change the .slang and regenerate.
struct PointCull_std140_0
{
    @align(16) anchors_0 : u32,
    @align(4) list_0 : u32,
    @align(8) capacity_0 : u32,
    @align(4) record_0 : u32,
    @align(16) counter_0 : u32,
    @align(4) batch_0 : u32,
    @align(8) splat_0 : u32,
    @align(4) margin_0 : f32,
    @align(16) tiny_0 : f32,
    @align(4) streams_0 : u32,
    @align(8) stride_0 : u32,
    @align(4) pad_0 : u32,
};

@binding(0) @group(2) var<uniform> pointCull_0 : PointCull_std140_0;
@binding(1) @group(2) var<storage, read_write> arena_0 : array<u32>;

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
    @align(16) anchors_1 : _Array_std140_AnchorEye32_0,
};

@binding(0) @group(0) var<uniform> view_0 : View_std140_0;
@binding(3) @group(2) var<storage, read_write> splatDepth_0 : array<atomic<u32>>;

@binding(2) @group(2) var<storage, read_write> pointCounts_0 : array<atomic<u32>>;

@binding(4) @group(2) var<storage, read_write> splatColor_0 : array<u32>;

@binding(5) @group(2) var<storage, read_write> splatFeature_0 : array<u32>;

@binding(7) @group(1) var<storage, read_write> args_0 : array<atomic<u32>>;

var<workgroup> pointsKept_0 : atomic<u32>;

var<private> _S1 : vec3<u32>;

fn WorkgroupCount_0() -> vec3<u32>
{
    return _S1;
}

struct AnchorEye_0
{
     eyeHi_0 : vec4<f32>,
     eyeLo_0 : vec4<f32>,
     axes_0 : array<vec4<f32>, i32(3)>,
};

fn anchorEye_0( t_0 : ptr<function, Transform_std430_0>) -> AnchorEye_0
{
    var _S2 : AnchorEye_0 = AnchorEye_0( view_0.anchors_1.data_2[min((((((*t_0).flags_1) >> (u32(8)))) & (u32(255))), u32(31))].eyeHi_0, view_0.anchors_1.data_2[min((((((*t_0).flags_1) >> (u32(8)))) & (u32(255))), u32(31))].eyeLo_0, view_0.anchors_1.data_2[min((((((*t_0).flags_1) >> (u32(8)))) & (u32(255))), u32(31))].axes_0 );
    return _S2;
}

struct SplitPosition_0
{
     hi_0 : vec3<f32>,
     lo_0 : vec3<f32>,
};

fn SplitPosition_x24init_0( hi_1 : vec3<f32>,  lo_1 : vec3<f32>) -> SplitPosition_0
{
    var _S3 : SplitPosition_0;
    _S3.hi_0 = hi_1;
    _S3.lo_0 = lo_1;
    return _S3;
}

fn SplitPosition_difference_0( this_0 : SplitPosition_0,  b_0 : SplitPosition_0) -> vec3<f32>
{
    return vec3<f32>(vec3<i32>(this_0.hi_0) - vec3<i32>(b_0.hi_0)) + (this_0.lo_0 - b_0.lo_0);
}

fn relativeMatrix_0( t_1 : ptr<function, Transform_std430_0>) -> mat4x4<f32>
{
    var _S4 : AnchorEye_0 = anchorEye_0(&((*t_1)));
    var axes_1 : mat3x3<f32> = mat3x3<f32>(_S4.axes_0[i32(0)].xyz, _S4.axes_0[i32(1)].xyz, _S4.axes_0[i32(2)].xyz);
    var linear_1 : mat3x3<f32> = (((mat3x3<f32>((*t_1).linear_0.data_0[i32(0)][i32(0)], (*t_1).linear_0.data_0[i32(1)][i32(0)], (*t_1).linear_0.data_0[i32(2)][i32(0)], (*t_1).linear_0.data_0[i32(0)][i32(1)], (*t_1).linear_0.data_0[i32(1)][i32(1)], (*t_1).linear_0.data_0[i32(2)][i32(1)], (*t_1).linear_0.data_0[i32(0)][i32(2)], (*t_1).linear_0.data_0[i32(1)][i32(2)], (*t_1).linear_0.data_0[i32(2)][i32(2)])) * (axes_1)));
    var rel_0 : vec3<f32> = (((SplitPosition_difference_0(SplitPosition_x24init_0((*t_1).originHi_0, (*t_1).originLo_0), SplitPosition_x24init_0(_S4.eyeHi_0.xyz, _S4.eyeLo_0.xyz))) * (axes_1)));
    return mat4x4<f32>(vec4<f32>(linear_1[i32(0)], rel_0.x), vec4<f32>(linear_1[i32(1)], rel_0.y), vec4<f32>(linear_1[i32(2)], rel_0.z), vec4<f32>(0.0f, 0.0f, 0.0f, 1.0f));
}

fn placePoint_0( i_0 : u32) -> vec4<f32>
{
    if((i_0 >= (pointCull_0.capacity_0)))
    {
        return vec4<f32>(0.0f);
    }
    var a_0 : u32 = pointCull_0.anchors_0 + i_0 * u32(4);
    var x_0 : f32 = (bitcast<f32>((arena_0[a_0])));
    if(!((abs(x_0)) < 9.99999993381581251e+36f))
    {
        return vec4<f32>(0.0f);
    }
    var _S5 : Transform_std430_0 = transforms_0[records_0[pointCull_0.record_0].transform_0];
    var _S6 : AnchorEye_0 = anchorEye_0(&(_S5));
    if(((_S6.eyeHi_0.w) > 0.5f))
    {
        return vec4<f32>(0.0f);
    }
    var _S7 : mat4x4<f32> = relativeMatrix_0(&(_S5));
    var c_0 : vec3<f32> = (((vec4<f32>(x_0, (bitcast<f32>((arena_0[a_0 + u32(1)]))), (bitcast<f32>((arena_0[a_0 + u32(2)]))), 1.0f)) * (_S7))).xyz;
    var _S8 : f32 = length(c_0) * pointCull_0.margin_0 * 2.0f * view_0.viewport_0.w;
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
        if(((dot(view_0.planes_0[p_0].xyz, c_0) + view_0.planes_0[p_0].w) < (- _S8)))
        {
            return vec4<f32>(0.0f);
        }
        p_0 = p_0 + u32(1);
    }
    return vec4<f32>(c_0, 1.0f);
}

fn splatted_0( i_1 : u32,  distance_0 : f32) -> bool
{
    var _S9 : bool;
    if((pointCull_0.splat_0) != u32(0))
    {
        var _S10 : f32 = (styleSize((i_1), (distance_0)));
        _S9 = (_S10 <= (pointCull_0.tiny_0));
    }
    else
    {
        _S9 = false;
    }
    if(_S9)
    {
        var _S11 : vec4<f32> = (styleColor((i_1), (distance_0)));
        _S9 = ((_S11.w) >= 0.5f);
    }
    else
    {
        _S9 = false;
    }
    return _S9;
}

fn onScreen_0( i_2 : u32,  distance_1 : f32,  rel_1 : vec3<f32>) -> vec4<f32>
{
    var clip_0 : vec4<f32> = (((vec4<f32>(rel_1, 1.0f)) * (mat4x4<f32>(view_0.viewProj_0.data_1[i32(0)][i32(0)], view_0.viewProj_0.data_1[i32(1)][i32(0)], view_0.viewProj_0.data_1[i32(2)][i32(0)], view_0.viewProj_0.data_1[i32(3)][i32(0)], view_0.viewProj_0.data_1[i32(0)][i32(1)], view_0.viewProj_0.data_1[i32(1)][i32(1)], view_0.viewProj_0.data_1[i32(2)][i32(1)], view_0.viewProj_0.data_1[i32(3)][i32(1)], view_0.viewProj_0.data_1[i32(0)][i32(2)], view_0.viewProj_0.data_1[i32(1)][i32(2)], view_0.viewProj_0.data_1[i32(2)][i32(2)], view_0.viewProj_0.data_1[i32(3)][i32(2)], view_0.viewProj_0.data_1[i32(0)][i32(3)], view_0.viewProj_0.data_1[i32(1)][i32(3)], view_0.viewProj_0.data_1[i32(2)][i32(3)], view_0.viewProj_0.data_1[i32(3)][i32(3)]))));
    var _S12 : f32 = clip_0.w;
    if((_S12 <= 0.0f))
    {
        return vec4<f32>(0.0f);
    }
    var ndc_0 : vec3<f32> = clip_0.xyz / vec3<f32>(_S12);
    var _S13 : f32 = ndc_0.z;
    var _S14 : bool;
    if((_S13 <= 0.0f))
    {
        _S14 = true;
    }
    else
    {
        _S14 = (_S13 > 1.0f);
    }
    if(_S14)
    {
        return vec4<f32>(0.0f);
    }
    var offset_0 : vec2<f32> = (styleOffset((i_2), (distance_1)));
    return vec4<f32>((ndc_0.x * 0.5f + 0.5f) * view_0.viewport_0.x + offset_0.x, (0.5f - ndc_0.y * 0.5f) * view_0.viewport_0.y + offset_0.y, _S13, 1.0f);
}

fn splatCoverage_0( i_3 : u32,  distance_2 : f32,  p_1 : vec2<f32>,  half_0 : f32,  center_1 : bool) -> f32
{
    var _S15 : f32 = (styleShapeAt((i_3), (distance_2), (p_1)));
    var c_1 : f32 = clamp(0.5f - _S15 * half_0, 0.0f, 1.0f);
    var _S16 : f32;
    if(center_1)
    {
        _S16 = max(c_1, 0.5f);
    }
    else
    {
        _S16 = c_1;
    }
    return _S16;
}

var<workgroup> pointsBase_0 : u32;

@compute
@workgroup_size(64, 1, 1)
fn cullPoints(@builtin(global_invocation_id) gid_0 : vec3<u32>, @builtin(local_invocation_index) lane_0 : u32, @builtin(num_workgroups) _builtinWorkgroupCount_0 : vec3<u32>)
{
    _S1 = _builtinWorkgroupCount_0;
    var _S17 : bool = lane_0 == u32(0);
    if(_S17)
    {
        atomicStore(&(pointsKept_0), u32(0));
    }
    workgroupBarrier();
    var i_4 : u32 = gid_0.x + gid_0.y * WorkgroupCount_0().x * u32(64);
    var placed_0 : vec4<f32> = placePoint_0(i_4);
    var quad_0 : bool;
    if(((placed_0.w) > 0.0f))
    {
        var _S18 : vec3<f32> = placed_0.xyz;
        var distance_3 : f32 = length(_S18);
        var _S19 : bool = (styleShow((i_4), (distance_3)));
        if(_S19)
        {
            var _S20 : bool = splatted_0(i_4, distance_3);
            if(_S20)
            {
                var s_0 : vec4<f32> = onScreen_0(i_4, distance_3, _S18);
                if(((s_0.w) > 0.0f))
                {
                    var _S21 : f32 = (styleSize((i_4), (distance_3)));
                    var _S22 : f32 = max(_S21, 1.0f);
                    var half_1 : f32 = _S22 * 0.5f;
                    var _S23 : u32 = (bitcast<u32>((s_0.z)));
                    var _S24 : i32 = i32(view_0.viewport_0.x);
                    var _S25 : i32 = i32(view_0.viewport_0.y);
                    var _S26 : i32 = i32(floor(s_0.x - half_1 - 0.5f));
                    var _S27 : i32 = i32(floor(s_0.y - half_1 - 0.5f));
                    var _S28 : vec2<f32> = s_0.xy;
                    var _S29 : vec2<i32> = vec2<i32>(floor(_S28));
                    var dy_0 : i32 = i32(0);
                    loop
                    {
                        if((dy_0 < i32(9)))
                        {
                        }
                        else
                        {
                            break;
                        }
                        var dx_0 : i32 = i32(0);
                        loop
                        {
                            if((dx_0 < i32(9)))
                            {
                            }
                            else
                            {
                                break;
                            }
                            var _S30 : i32 = _S26 + dx_0;
                            var _S31 : i32 = _S27 + dy_0;
                            var px_0 : vec2<i32> = vec2<i32>(_S30, _S31);
                            var _S32 : f32 = _S22 + 2.0f;
                            if((f32(dx_0) > _S32))
                            {
                                quad_0 = true;
                            }
                            else
                            {
                                quad_0 = (f32(dy_0) > _S32);
                            }
                            var _S33 : bool;
                            if(quad_0)
                            {
                                _S33 = true;
                            }
                            else
                            {
                                _S33 = (any(((px_0 < vec2<i32>(i32(0))))));
                            }
                            var _S34 : bool;
                            if(_S33)
                            {
                                _S34 = true;
                            }
                            else
                            {
                                _S34 = (_S30 >= _S24);
                            }
                            var _S35 : bool;
                            if(_S34)
                            {
                                _S35 = true;
                            }
                            else
                            {
                                _S35 = (_S31 >= _S25);
                            }
                            if(_S35)
                            {
                                dx_0 = dx_0 + i32(1);
                                continue;
                            }
                            var _S36 : f32 = splatCoverage_0(i_4, distance_3, (vec2<f32>(px_0) + vec2<f32>(0.5f) - _S28) / vec2<f32>(half_1), half_1, (all((px_0 == _S29))));
                            if((_S36 > 0.0f))
                            {
                                var _S37 : u32 = atomicMax(&(splatDepth_0[u32(_S31 * _S24 + _S30)]), _S23);
                            }
                            dx_0 = dx_0 + i32(1);
                        }
                        dy_0 = dy_0 + i32(1);
                    }
                }
                quad_0 = false;
            }
            else
            {
                quad_0 = true;
            }
        }
        else
        {
            quad_0 = false;
        }
    }
    else
    {
        quad_0 = false;
    }
    var local_0 : u32;
    if(quad_0)
    {
        var _S38 : u32 = atomicAdd(&(pointsKept_0), u32(1));
        local_0 = _S38;
    }
    else
    {
        local_0 = u32(0);
    }
    workgroupBarrier();
    if(_S17)
    {
        var _S39 : u32 = pointCull_0.counter_0;
        var _S40 : u32 = atomicLoad(&(pointsKept_0));
        var _S41 : u32 = atomicAdd(&(pointCounts_0[_S39]), _S40);
        pointsBase_0 = _S41;
    }
    workgroupBarrier();
    if(quad_0)
    {
        arena_0[pointCull_0.list_0 + pointsBase_0 + local_0] = i_4;
    }
    return;
}

@compute
@workgroup_size(64, 1, 1)
fn splatPoints(@builtin(global_invocation_id) gid_1 : vec3<u32>)
{
    var i_5 : u32 = gid_1.x + gid_1.y * WorkgroupCount_0().x * u32(64);
    var placed_1 : vec4<f32> = placePoint_0(i_5);
    if((placed_1.w) == 0.0f)
    {
        return;
    }
    var _S42 : vec3<f32> = placed_1.xyz;
    var distance_4 : f32 = length(_S42);
    var _S43 : bool = (styleShow((i_5), (distance_4)));
    var _S44 : bool;
    if(!_S43)
    {
        _S44 = true;
    }
    else
    {
        var _S45 : bool = splatted_0(i_5, distance_4);
        _S44 = !_S45;
    }
    if(_S44)
    {
        return;
    }
    var s_1 : vec4<f32> = onScreen_0(i_5, distance_4, _S42);
    if((s_1.w) == 0.0f)
    {
        return;
    }
    var _S46 : f32 = (styleSize((i_5), (distance_4)));
    var _S47 : f32 = max(_S46, 1.0f);
    var half_2 : f32 = _S47 * 0.5f;
    var _S48 : u32 = (bitcast<u32>((s_1.z)));
    var _S49 : vec4<f32> = (styleColor((i_5), (distance_4)));
    var _S50 : u32 = records_0[pointCull_0.record_0].featureId_0 + i_5;
    var _S51 : i32 = i32(view_0.viewport_0.x);
    var _S52 : i32 = i32(view_0.viewport_0.y);
    var _S53 : i32 = i32(floor(s_1.x - half_2 - 0.5f));
    var _S54 : i32 = i32(floor(s_1.y - half_2 - 0.5f));
    var _S55 : vec2<f32> = s_1.xy;
    var _S56 : vec2<i32> = vec2<i32>(floor(_S55));
    var dy_1 : i32 = i32(0);
    loop
    {
        if((dy_1 < i32(9)))
        {
        }
        else
        {
            break;
        }
        var dx_1 : i32 = i32(0);
        loop
        {
            if((dx_1 < i32(9)))
            {
            }
            else
            {
                break;
            }
            var _S57 : i32 = _S53 + dx_1;
            var _S58 : i32 = _S54 + dy_1;
            var px_1 : vec2<i32> = vec2<i32>(_S57, _S58);
            var _S59 : f32 = _S47 + 2.0f;
            if((f32(dx_1) > _S59))
            {
                _S44 = true;
            }
            else
            {
                _S44 = (f32(dy_1) > _S59);
            }
            var _S60 : bool;
            if(_S44)
            {
                _S60 = true;
            }
            else
            {
                _S60 = (any(((px_1 < vec2<i32>(i32(0))))));
            }
            var _S61 : bool;
            if(_S60)
            {
                _S61 = true;
            }
            else
            {
                _S61 = (_S57 >= _S51);
            }
            var _S62 : bool;
            if(_S61)
            {
                _S62 = true;
            }
            else
            {
                _S62 = (_S58 >= _S52);
            }
            if(_S62)
            {
                dx_1 = dx_1 + i32(1);
                continue;
            }
            var at_0 : u32 = u32(_S58 * _S51 + _S57);
            var coverage_0 : f32 = splatCoverage_0(i_5, distance_4, (vec2<f32>(px_1) + vec2<f32>(0.5f) - _S55) / vec2<f32>(half_2), half_2, (all((px_1 == _S56))));
            var _S63 : bool;
            if((coverage_0 > 0.0f))
            {
                var _S64 : u32 = atomicLoad(&(splatDepth_0[at_0]));
                _S63 = _S64 == _S48;
            }
            else
            {
                _S63 = false;
            }
            if(_S63)
            {
                splatColor_0[at_0] = pack4x8unorm(vec4<f32>(_S49.xyz, coverage_0));
                splatFeature_0[at_0] = _S50;
            }
            dx_1 = dx_1 + i32(1);
        }
        dy_1 = dy_1 + i32(1);
    }
    return;
}

@compute
@workgroup_size(1, 1, 1)
fn writePointArgs()
{
    var a_1 : u32 = pointCull_0.batch_0 * u32(5);
    var _S65 : u32 = a_1 + u32(1);
    var _S66 : u32 = atomicLoad(&(args_0[_S65]));
    var shown_0 : bool = (_S66 > u32(0));
    var _S67 : u32;
    if(shown_0)
    {
        var _S68 : u32 = atomicLoad(&(pointCounts_0[pointCull_0.counter_0]));
        _S67 = _S68 * u32(6);
    }
    else
    {
        _S67 = u32(0);
    }
    atomicStore(&(args_0[a_1]), _S67);
    if(shown_0)
    {
        _S67 = u32(1);
    }
    else
    {
        _S67 = u32(0);
    }
    atomicStore(&(args_0[_S65]), _S67);
    atomicStore(&(args_0[a_1 + u32(2)]), u32(0));
    atomicStore(&(args_0[a_1 + u32(3)]), u32(0));
    return;
}

fn pointF32( i_6 : u32,  word_0 : u32) -> f32
{
    return (bitcast<f32>((arena_0[pointCull_0.streams_0 + i_6 * pointCull_0.stride_0 + word_0])));
}

fn pointU32( i_7 : u32,  word_1 : u32) -> u32
{
    return arena_0[pointCull_0.streams_0 + i_7 * pointCull_0.stride_0 + word_1];
}

fn styleTime() -> f32
{
    return view_0.time_0.x;
}

