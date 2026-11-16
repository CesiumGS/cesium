// Generated from src/shaders/cull.slang by slangc 2026.22
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
    @align(4) debug_0 : u32,
    @align(16) morph_0 : f32,
    @align(4) imageryFrom_0 : u32,
    @align(8) imageryFade_0 : f32,
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
    @align(16) transition_0 : vec4<f32>,
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

struct OcclusionCull_std140_0
{
    @align(16) lastRight_0 : vec4<f32>,
    @align(16) lastUp_0 : vec4<f32>,
    @align(16) lastForward_0 : vec4<f32>,
    @align(16) lastLens_0 : vec4<f32>,
    @align(16) right_0 : vec4<f32>,
    @align(16) up_0 : vec4<f32>,
    @align(16) forward_0 : vec4<f32>,
    @align(16) lens_0 : vec4<f32>,
    @align(16) width_0 : u32,
    @align(4) height_0 : u32,
    @align(8) levels_0 : u32,
    @align(4) test_0 : u32,
    @align(16) argumentRows_0 : u32,
    @align(4) itemRows_0 : u32,
    @align(8) counters_0 : u32,
    @align(4) pad_0 : u32,
};

@binding(0) @group(2) var<uniform> occlusion_0 : OcclusionCull_std140_0;
struct Batch_std430_0
{
    @align(4) itemBase_0 : u32,
    @align(4) indexCount_1 : u32,
    @align(4) firstIndex_1 : u32,
    @align(4) flags_2 : u32,
};

@binding(6) @group(1) var<storage, read> batches_0 : array<Batch_std430_0>;

@binding(1) @group(2) var pyramid_0 : texture_2d<f32>;

@binding(9) @group(1) var<storage, read_write> args_0 : array<atomic<u32>>;

@binding(4) @group(1) var<storage, read_write> itemList_0 : array<u32>;

struct Instance_std430_0
{
    @align(16) row0_0 : vec4<f32>,
    @align(16) row1_0 : vec4<f32>,
    @align(16) row2_0 : vec4<f32>,
    @align(16) record_1 : u32,
    @align(4) feature_1 : u32,
    @align(8) flags_3 : u32,
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

fn occludable_0( batch_1 : u32) -> bool
{
    return (((batches_0[batch_1].flags_2) & (u32(1)))) != u32(0);
}

struct PyramidCamera_0
{
     width_1 : u32,
     height_1 : u32,
     levels_1 : u32,
     tanX_0 : f32,
     tanY_0 : f32,
     near_1 : f32,
     bias_0 : f32,
};

fn boxHidden_0( pyramid_1 : texture_2d<f32>,  camera_0 : PyramidCamera_0,  center_2 : vec3<f32>,  a_4 : vec3<f32>,  b_4 : vec3<f32>,  c_1 : vec3<f32>,  window_0 : u32) -> bool
{
    var frameWidth_0 : f32 = f32(camera_0.width_1);
    var frameHeight_0 : f32 = f32(camera_0.height_1);
    const _S19 : vec2<f32> = vec2<f32>(-3.39999995214436425e+38f, -3.39999995214436425e+38f);
    var low_0 : vec2<f32> = vec2<f32>(3.39999995214436425e+38f, 3.39999995214436425e+38f);
    var high_0 : vec2<f32> = _S19;
    var nearestZ_0 : f32 = 3.39999995214436425e+38f;
    var k_0 : u32 = u32(0);
    loop
    {
        if((k_0 < u32(8)))
        {
        }
        else
        {
            break;
        }
        var _S20 : vec3<f32>;
        if(((k_0 & (u32(1)))) == u32(0))
        {
            _S20 = (vec3<f32>(0) - a_4);
        }
        else
        {
            _S20 = a_4;
        }
        var _S21 : vec3<f32> = center_2 + _S20;
        var _S22 : vec3<f32>;
        if(((k_0 & (u32(2)))) == u32(0))
        {
            _S22 = (vec3<f32>(0) - b_4);
        }
        else
        {
            _S22 = b_4;
        }
        var _S23 : vec3<f32> = _S21 + _S22;
        var _S24 : vec3<f32>;
        if(((k_0 & (u32(4)))) == u32(0))
        {
            _S24 = (vec3<f32>(0) - c_1);
        }
        else
        {
            _S24 = c_1;
        }
        var p_4 : vec3<f32> = _S23 + _S24;
        var _S25 : f32 = p_4.z;
        if(!(_S25 > (camera_0.near_1)))
        {
            return false;
        }
        var inverse_0 : f32 = 1.0f / _S25;
        var screen_0 : vec2<f32> = vec2<f32>((p_4.x * inverse_0 / camera_0.tanX_0 * 0.5f + 0.5f) * frameWidth_0, (0.5f - p_4.y * inverse_0 / camera_0.tanY_0 * 0.5f) * frameHeight_0);
        var _S26 : vec2<f32> = min(low_0, screen_0);
        var _S27 : vec2<f32> = max(high_0, screen_0);
        var _S28 : f32 = min(nearestZ_0, _S25);
        var _S29 : u32 = k_0 + u32(1);
        low_0 = _S26;
        high_0 = _S27;
        nearestZ_0 = _S28;
        k_0 = _S29;
    }
    var _S30 : bool;
    if(!((high_0.x) >= 0.0f))
    {
        _S30 = true;
    }
    else
    {
        _S30 = !((high_0.y) >= 0.0f);
    }
    if(_S30)
    {
        _S30 = true;
    }
    else
    {
        _S30 = !((low_0.x) < frameWidth_0);
    }
    if(_S30)
    {
        _S30 = true;
    }
    else
    {
        _S30 = !((low_0.y) < frameHeight_0);
    }
    if(_S30)
    {
        return false;
    }
    const _S31 : vec2<f32> = vec2<f32>(0.0f, 0.0f);
    var _S32 : vec2<f32> = vec2<f32>(frameWidth_0 - 1.0f, frameHeight_0 - 1.0f);
    var _S33 : vec2<u32> = vec2<u32>(clamp(floor(low_0), _S31, _S32));
    var _S34 : vec2<u32> = vec2<u32>(clamp(floor(high_0), _S31, _S32));
    var _S35 : u32 = max(((camera_0.width_1) >> (u32(1))), u32(1));
    var _S36 : u32 = max(((camera_0.height_1) >> (u32(1))), u32(1));
    var _S37 : u32 = _S35 - u32(1);
    var _S38 : u32 = _S36 - u32(1);
    var span_0 : vec2<u32> = vec2<u32>(min(((_S34.x) >> (u32(1))), _S37), min(((_S34.y) >> (u32(1))), _S38)) - vec2<u32>(min(((_S33.x) >> (u32(1))), _S37), min(((_S33.y) >> (u32(1))), _S38));
    var _S39 : u32 = max(span_0.x, span_0.y) + u32(1);
    var wide_0 : u32 = clamp(window_0, u32(2), u32(8));
    var l_0 : u32 = u32(0);
    var level_0 : u32 = u32(0);
    loop
    {
        if((l_0 < u32(16)))
        {
        }
        else
        {
            break;
        }
        if((((((_S39 - u32(1)) >> (level_0))) + u32(2)) <= wide_0))
        {
            _S30 = true;
        }
        else
        {
            _S30 = ((level_0 + u32(1)) >= (camera_0.levels_1));
        }
        if(_S30)
        {
            break;
        }
        var _S40 : u32 = level_0 + u32(1);
        l_0 = l_0 + u32(1);
        level_0 = _S40;
    }
    var _S41 : vec2<u32> = vec2<u32>((level_0 + u32(1)));
    var _S42 : vec2<u32> = vec2<u32>(max((_S35 >> (level_0)), u32(1)), max((_S36 >> (level_0)), u32(1))) - vec2<u32>(u32(1));
    var _S43 : vec2<u32> = min((_S33 >> (_S41)), _S42);
    var _S44 : vec2<u32> = min((_S34 >> (_S41)), _S42);
    var _S45 : u32 = _S44.x;
    var _S46 : u32 = _S43.x;
    var _S47 : u32 = wide_0 - u32(1);
    if(((_S45 - _S46) > _S47))
    {
        _S30 = true;
    }
    else
    {
        _S30 = ((_S44.y - _S43.y) > _S47);
    }
    if(_S30)
    {
        return false;
    }
    var farthest_0 : f32 = 3.39999995214436425e+38f;
    var j_1 : u32 = u32(0);
    loop
    {
        if((j_1 < u32(8)))
        {
        }
        else
        {
            break;
        }
        var y_0 : u32 = _S43.y + j_1;
        if((y_0 > (_S44.y)))
        {
            break;
        }
        var i_2 : u32 = u32(0);
        loop
        {
            if((i_2 < u32(8)))
            {
            }
            else
            {
                break;
            }
            var x_0 : u32 = _S46 + i_2;
            if((x_0 > _S45))
            {
                break;
            }
            var _S48 : vec3<i32> = vec3<i32>(i32(x_0), i32(y_0), i32(level_0));
            var _S49 : f32 = min(farthest_0, (textureLoad((pyramid_1), ((_S48)).xy, ((_S48)).z).x));
            var _S50 : u32 = i_2 + u32(1);
            farthest_0 = _S49;
            i_2 = _S50;
        }
        j_1 = j_1 + u32(1);
    }
    return (farthest_0 > (camera_0.near_1 / nearestZ_0 * (1.0f + camera_0.bias_0)));
}

fn sphereHidden_0( center_3 : vec3<f32>,  radius_2 : f32,  right_1 : vec4<f32>,  up_1 : vec4<f32>,  forward_1 : vec4<f32>,  lens_1 : vec4<f32>) -> bool
{
    if(!(radius_2 < 1.00000001504746622e+30f))
    {
        return false;
    }
    var camera_1 : PyramidCamera_0;
    camera_1.width_1 = occlusion_0.width_0;
    camera_1.height_1 = occlusion_0.height_0;
    camera_1.levels_1 = occlusion_0.levels_0;
    camera_1.tanX_0 = lens_1.x;
    camera_1.tanY_0 = lens_1.y;
    camera_1.near_1 = lens_1.z;
    camera_1.bias_0 = lens_1.w;
    return boxHidden_0(pyramid_0, camera_1, vec3<f32>(dot(right_1.xyz, center_3) + right_1.w, dot(up_1.xyz, center_3) + up_1.w, dot(forward_1.xyz, center_3) + forward_1.w), vec3<f32>(radius_2, 0.0f, 0.0f), vec3<f32>(0.0f, radius_2, 0.0f), vec3<f32>(0.0f, 0.0f, radius_2), u32(8));
}

fn trianglesOf_0( batch_2 : u32) -> u32
{
    return batches_0[batch_2].indexCount_1 / u32(3);
}

fn append_0( batch_3 : u32,  item_1 : u32)
{
    var slot_0 : u32 = atomicAdd(&(args_0[batch_3 * u32(5) + u32(1)]), u32(1));
    itemList_0[batches_0[batch_3].itemBase_0 + slot_0] = item_1;
    return;
}

fn place_0( batch_4 : u32,  item_2 : u32,  center_4 : vec3<f32>,  radius_3 : f32)
{
    var _S51 : bool;
    if((occlusion_0.test_0) != u32(0))
    {
        _S51 = occludable_0(batch_4);
    }
    else
    {
        _S51 = false;
    }
    if(_S51)
    {
        _S51 = sphereHidden_0(center_4, radius_3, occlusion_0.lastRight_0, occlusion_0.lastUp_0, occlusion_0.lastForward_0, occlusion_0.lastLens_0);
    }
    else
    {
        _S51 = false;
    }
    if(_S51)
    {
        var _S52 : u32 = atomicAdd(&(args_0[occlusion_0.counters_0]), u32(1));
        var _S53 : u32 = atomicAdd(&(args_0[occlusion_0.counters_0 + u32(1)]), trianglesOf_0(batch_4));
        itemList_0[u32(2) * occlusion_0.itemRows_0 + min(_S52, occlusion_0.itemRows_0 - u32(1))] = item_2;
        return;
    }
    append_0(batch_4, item_2);
    return;
}

fn recordMatrix_0( _S54 : u32,  _S55 : ptr<function, Transform_std430_0>,  _S56 : ptr<function, f32>) -> mat4x4<f32>
{
    (*_S56) = records_0[_S54].radius_0 * (*_S55).scale_0;
    var _S57 : mat4x4<f32> = relativeMatrix_0(&((*_S55)));
    return _S57;
}

fn drawable_0( _S58 : u32,  _S59 : ptr<function, Transform_std430_0>) -> bool
{
    var mask_0 : u32;
    if(((view_0.time_0.z) > 0.5f))
    {
        mask_0 = ((records_0[_S58].viewMask_0) | ((records_0[_S58].casterMask_0)));
    }
    else
    {
        mask_0 = records_0[_S58].viewMask_0;
    }
    var _S60 : u32 = records_0[_S58].flags_0;
    var _S61 : bool;
    if((((records_0[_S58].flags_0) & (u32(1)))) == u32(0))
    {
        _S61 = ((((*_S59).flags_1) & (u32(1)))) == u32(0);
    }
    else
    {
        _S61 = false;
    }
    if(_S61)
    {
        _S61 = (records_0[_S58].indexCount_0) != u32(0);
    }
    else
    {
        _S61 = false;
    }
    if(_S61)
    {
        _S61 = ((mask_0 & ((view_0.viewBit_0)))) != u32(0);
    }
    else
    {
        _S61 = false;
    }
    if(_S61)
    {
        if(((view_0.time_0.y) > 0.5f))
        {
            _S61 = ((_S60 & (u32(32)))) != u32(0);
        }
        else
        {
            _S61 = false;
        }
        _S61 = !_S61;
    }
    else
    {
        _S61 = false;
    }
    if(_S61)
    {
        var _S62 : AnchorEye_0 = anchorEye_0(&((*_S59)));
        _S61 = ((_S62.eyeHi_0.w) < 0.5f);
    }
    else
    {
        _S61 = false;
    }
    return _S61;
}

@compute
@workgroup_size(64, 1, 1)
fn cullRecords(@builtin(global_invocation_id) gid_0 : vec3<u32>)
{
    var _S63 : u32 = gid_0.x;
    loop
    {
        if((_S63 >= (params_0.recordCount_0)))
        {
            break;
        }
        if((records_0[_S63].instanceCount_1) != u32(0))
        {
            break;
        }
        var _S64 : Transform_std430_0 = transforms_0[records_0[_S63].transform_0];
        var radius_4 : f32;
        var _S65 : mat4x4<f32> = recordMatrix_0(_S63, &(_S64), &(radius_4));
        var _S66 : vec3<f32> = vec3<f32>(_S65[i32(0)][i32(3)], _S65[i32(1)][i32(3)], _S65[i32(2)][i32(3)]);
        var _S67 : u32 = records_0[_S63].placement_0;
        var drawn_2 : vec3<f32>;
        if((records_0[_S63].placement_0) != u32(4294967295))
        {
            var offsetHi_1 : vec3<f32>;
            var offsetLo_1 : vec3<f32>;
            placementOffset_0(_S67, &(offsetHi_1), &(offsetLo_1));
            var _S68 : vec3<f32> = drawnTranslation_0(&(_S64), offsetHi_1, offsetLo_1);
            drawn_2 = _S68;
        }
        else
        {
            drawn_2 = _S66;
        }
        var _S69 : DrawItem_0 = drawItem_0(_S65, drawn_2, _S63, u32(0), u32(0), u32(4294967295));
        var _S70 : array<vec4<f32>, i32(4)> = array<vec4<f32>, i32(4)>( vec4<f32>(_S69.relModel_0[i32(0)][i32(0)], _S69.relModel_0[i32(1)][i32(0)], _S69.relModel_0[i32(2)][i32(0)], _S69.relModel_0[i32(3)][i32(0)]), vec4<f32>(_S69.relModel_0[i32(0)][i32(1)], _S69.relModel_0[i32(1)][i32(1)], _S69.relModel_0[i32(2)][i32(1)], _S69.relModel_0[i32(3)][i32(1)]), vec4<f32>(_S69.relModel_0[i32(0)][i32(2)], _S69.relModel_0[i32(1)][i32(2)], _S69.relModel_0[i32(2)][i32(2)], _S69.relModel_0[i32(3)][i32(2)]), vec4<f32>(_S69.relModel_0[i32(0)][i32(3)], _S69.relModel_0[i32(1)][i32(3)], _S69.relModel_0[i32(2)][i32(3)], _S69.relModel_0[i32(3)][i32(3)]) );
        items_0[_S63].relModel_0.data_3 = _S70;
        items_0[_S63].drawn_0 = _S69.drawn_0;
        items_0[_S63].record_0 = _S69.record_0;
        items_0[_S63].feature_0 = _S69.feature_0;
        items_0[_S63].instance_0 = _S69.instance_0;
        items_0[_S63].tint_0 = _S69.tint_0;
        var _S71 : bool = drawable_0(_S63, &(_S64));
        var _S72 : bool;
        if(_S71)
        {
            _S72 = inFrustum_0(_S65, records_0[_S63].center_0, radius_4);
        }
        else
        {
            _S72 = false;
        }
        if(_S72)
        {
            append_0(records_0[_S63].batch_0, _S63);
        }
        break;
    }
    return;
}

var<private> _S73 : vec3<u32>;

fn WorkgroupCount_0() -> vec3<u32>
{
    return _S73;
}

fn instanceMatrix_0( _S74 : ptr<function, Instance_std430_0>,  _S75 : u32,  _S76 : ptr<function, Transform_std430_0>,  _S77 : ptr<function, mat4x4<f32>>,  _S78 : ptr<function, f32>) -> mat4x4<f32>
{
    (*_S77) = mat4x4<f32>((*_S74).row0_0, (*_S74).row1_0, (*_S74).row2_0, vec4<f32>(0.0f, 0.0f, 0.0f, 1.0f));
    (*_S78) = records_0[_S75].radius_0 * ((*_S76).scale_0 * max(length(vec3<f32>((*_S77)[i32(0)][i32(0)], (*_S77)[i32(1)][i32(0)], (*_S77)[i32(2)][i32(0)])), max(length(vec3<f32>((*_S77)[i32(0)][i32(1)], (*_S77)[i32(1)][i32(1)], (*_S77)[i32(2)][i32(1)])), length(vec3<f32>((*_S77)[i32(0)][i32(2)], (*_S77)[i32(1)][i32(2)], (*_S77)[i32(2)][i32(2)])))));
    var _S79 : mat4x4<f32> = relativeMatrix_0(&((*_S76)));
    return ((((*_S77)) * (_S79)));
}

@compute
@workgroup_size(64, 1, 1)
fn cullInstances(@builtin(global_invocation_id) gid_1 : vec3<u32>, @builtin(num_workgroups) _builtinWorkgroupCount_0 : vec3<u32>)
{
    _S73 = _builtinWorkgroupCount_0;
    var _S80 : u32 = gid_1.x + gid_1.y * WorkgroupCount_0().x * u32(64);
    loop
    {
        if((_S80 >= (params_0.instanceCount_0)))
        {
            break;
        }
        var _S81 : Instance_std430_0 = instanceTable_0[_S80];
        var _S82 : u32 = _S81.record_1;
        if((_S81.record_1) == u32(4294967295))
        {
            break;
        }
        var _S83 : Transform_std430_0 = transforms_0[records_0[_S82].transform_0];
        var local_0 : mat4x4<f32>;
        var radius_5 : f32;
        var _S84 : mat4x4<f32> = instanceMatrix_0(&(_S81), _S82, &(_S83), &(local_0), &(radius_5));
        var _S85 : u32 = _S81.feature_1;
        var shown_0 : bool;
        if((_S81.feature_1) != u32(4294967295))
        {
            shown_0 = (records_0[_S82].featureId_0) != u32(0);
        }
        else
        {
            shown_0 = false;
        }
        var feature_3 : u32;
        if(shown_0)
        {
            feature_3 = records_0[_S82].featureId_0 + _S85;
        }
        else
        {
            feature_3 = u32(0);
        }
        var item_3 : u32 = params_0.firstInstanceItem_0 + _S80;
        var _S86 : DrawItem_0 = drawItem_0(_S84, vec3<f32>(_S84[i32(0)][i32(3)], _S84[i32(1)][i32(3)], _S84[i32(2)][i32(3)]), _S82, feature_3, _S80 - records_0[_S82].instanceFirst_0, _S81.tint_1);
        var _S87 : array<vec4<f32>, i32(4)> = array<vec4<f32>, i32(4)>( vec4<f32>(_S86.relModel_0[i32(0)][i32(0)], _S86.relModel_0[i32(1)][i32(0)], _S86.relModel_0[i32(2)][i32(0)], _S86.relModel_0[i32(3)][i32(0)]), vec4<f32>(_S86.relModel_0[i32(0)][i32(1)], _S86.relModel_0[i32(1)][i32(1)], _S86.relModel_0[i32(2)][i32(1)], _S86.relModel_0[i32(3)][i32(1)]), vec4<f32>(_S86.relModel_0[i32(0)][i32(2)], _S86.relModel_0[i32(1)][i32(2)], _S86.relModel_0[i32(2)][i32(2)], _S86.relModel_0[i32(3)][i32(2)]), vec4<f32>(_S86.relModel_0[i32(0)][i32(3)], _S86.relModel_0[i32(1)][i32(3)], _S86.relModel_0[i32(2)][i32(3)], _S86.relModel_0[i32(3)][i32(3)]) );
        items_0[item_3].relModel_0.data_3 = _S87;
        items_0[item_3].drawn_0 = _S86.drawn_0;
        items_0[item_3].record_0 = _S86.record_0;
        items_0[item_3].feature_0 = _S86.feature_0;
        items_0[item_3].instance_0 = _S86.instance_0;
        items_0[item_3].tint_0 = _S86.tint_0;
        var _S88 : u32 = _S81.flags_3;
        if((((_S81.flags_3) & (u32(6)))) != u32(0))
        {
            var within_0 : bool = ((length((((vec4<f32>(records_0[_S82].center_0, 1.0f)) * (_S84))).xyz)) <= (unpack2x16float(((_S88 >> (u32(16))))).x));
            if(((_S88 & (u32(2)))) != u32(0))
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
        if(((_S88 & (u32(1)))) == u32(0))
        {
        }
        else
        {
            shown_0 = false;
        }
        if(shown_0)
        {
            var _S89 : bool = drawable_0(_S82, &(_S83));
            shown_0 = _S89;
        }
        else
        {
            shown_0 = false;
        }
        if(shown_0)
        {
            shown_0 = inFrustum_0(_S84, records_0[_S82].center_0, radius_5);
        }
        else
        {
            shown_0 = false;
        }
        if(shown_0)
        {
            append_0(records_0[_S82].batch_0, item_3);
        }
        break;
    }
    return;
}

@compute
@workgroup_size(64, 1, 1)
fn writeDrawArgs(@builtin(global_invocation_id) gid_2 : vec3<u32>)
{
    var _S90 : u32 = gid_2.x;
    loop
    {
        if((_S90 >= (params_0.batchCount_0)))
        {
            break;
        }
        var batch_5 : Batch_std430_0 = batches_0[_S90];
        var a_5 : u32 = _S90 * u32(5);
        atomicStore(&(args_0[a_5]), batch_5.indexCount_1);
        atomicStore(&(args_0[a_5 + u32(2)]), batch_5.firstIndex_1);
        atomicStore(&(args_0[a_5 + u32(3)]), u32(0));
        atomicStore(&(args_0[a_5 + u32(4)]), u32(0));
        break;
    }
    return;
}

@compute
@workgroup_size(64, 1, 1)
fn cullRecordsOccluded(@builtin(global_invocation_id) gid_3 : vec3<u32>)
{
    var _S91 : u32 = gid_3.x;
    loop
    {
        if((_S91 >= (params_0.recordCount_0)))
        {
            break;
        }
        if((records_0[_S91].instanceCount_1) != u32(0))
        {
            break;
        }
        var _S92 : Transform_std430_0 = transforms_0[records_0[_S91].transform_0];
        var radius_6 : f32;
        var _S93 : mat4x4<f32> = recordMatrix_0(_S91, &(_S92), &(radius_6));
        var _S94 : vec3<f32> = vec3<f32>(_S93[i32(0)][i32(3)], _S93[i32(1)][i32(3)], _S93[i32(2)][i32(3)]);
        var _S95 : u32 = records_0[_S91].placement_0;
        var drawn_3 : vec3<f32>;
        if((records_0[_S91].placement_0) != u32(4294967295))
        {
            var offsetHi_2 : vec3<f32>;
            var offsetLo_2 : vec3<f32>;
            placementOffset_0(_S95, &(offsetHi_2), &(offsetLo_2));
            var _S96 : vec3<f32> = drawnTranslation_0(&(_S92), offsetHi_2, offsetLo_2);
            drawn_3 = _S96;
        }
        else
        {
            drawn_3 = _S94;
        }
        var _S97 : DrawItem_0 = drawItem_0(_S93, drawn_3, _S91, u32(0), u32(0), u32(4294967295));
        var _S98 : array<vec4<f32>, i32(4)> = array<vec4<f32>, i32(4)>( vec4<f32>(_S97.relModel_0[i32(0)][i32(0)], _S97.relModel_0[i32(1)][i32(0)], _S97.relModel_0[i32(2)][i32(0)], _S97.relModel_0[i32(3)][i32(0)]), vec4<f32>(_S97.relModel_0[i32(0)][i32(1)], _S97.relModel_0[i32(1)][i32(1)], _S97.relModel_0[i32(2)][i32(1)], _S97.relModel_0[i32(3)][i32(1)]), vec4<f32>(_S97.relModel_0[i32(0)][i32(2)], _S97.relModel_0[i32(1)][i32(2)], _S97.relModel_0[i32(2)][i32(2)], _S97.relModel_0[i32(3)][i32(2)]), vec4<f32>(_S97.relModel_0[i32(0)][i32(3)], _S97.relModel_0[i32(1)][i32(3)], _S97.relModel_0[i32(2)][i32(3)], _S97.relModel_0[i32(3)][i32(3)]) );
        items_0[_S91].relModel_0.data_3 = _S98;
        items_0[_S91].drawn_0 = _S97.drawn_0;
        items_0[_S91].record_0 = _S97.record_0;
        items_0[_S91].feature_0 = _S97.feature_0;
        items_0[_S91].instance_0 = _S97.instance_0;
        items_0[_S91].tint_0 = _S97.tint_0;
        var _S99 : bool = drawable_0(_S91, &(_S92));
        var _S100 : bool;
        if(_S99)
        {
            _S100 = inFrustum_0(_S93, records_0[_S91].center_0, radius_6);
        }
        else
        {
            _S100 = false;
        }
        if(_S100)
        {
            place_0(records_0[_S91].batch_0, _S91, (((vec4<f32>(records_0[_S91].center_0, 1.0f)) * (_S93))).xyz, radius_6);
        }
        break;
    }
    return;
}

@compute
@workgroup_size(64, 1, 1)
fn cullInstancesOccluded(@builtin(global_invocation_id) gid_4 : vec3<u32>)
{
    var _S101 : u32 = gid_4.x + gid_4.y * WorkgroupCount_0().x * u32(64);
    loop
    {
        if((_S101 >= (params_0.instanceCount_0)))
        {
            break;
        }
        var _S102 : Instance_std430_0 = instanceTable_0[_S101];
        var _S103 : u32 = _S102.record_1;
        if((_S102.record_1) == u32(4294967295))
        {
            break;
        }
        var _S104 : Transform_std430_0 = transforms_0[records_0[_S103].transform_0];
        var local_1 : mat4x4<f32>;
        var radius_7 : f32;
        var _S105 : mat4x4<f32> = instanceMatrix_0(&(_S102), _S103, &(_S104), &(local_1), &(radius_7));
        var _S106 : u32 = _S102.feature_1;
        var shown_1 : bool;
        if((_S102.feature_1) != u32(4294967295))
        {
            shown_1 = (records_0[_S103].featureId_0) != u32(0);
        }
        else
        {
            shown_1 = false;
        }
        var feature_4 : u32;
        if(shown_1)
        {
            feature_4 = records_0[_S103].featureId_0 + _S106;
        }
        else
        {
            feature_4 = u32(0);
        }
        var item_4 : u32 = params_0.firstInstanceItem_0 + _S101;
        var _S107 : DrawItem_0 = drawItem_0(_S105, vec3<f32>(_S105[i32(0)][i32(3)], _S105[i32(1)][i32(3)], _S105[i32(2)][i32(3)]), _S103, feature_4, _S101 - records_0[_S103].instanceFirst_0, _S102.tint_1);
        var _S108 : array<vec4<f32>, i32(4)> = array<vec4<f32>, i32(4)>( vec4<f32>(_S107.relModel_0[i32(0)][i32(0)], _S107.relModel_0[i32(1)][i32(0)], _S107.relModel_0[i32(2)][i32(0)], _S107.relModel_0[i32(3)][i32(0)]), vec4<f32>(_S107.relModel_0[i32(0)][i32(1)], _S107.relModel_0[i32(1)][i32(1)], _S107.relModel_0[i32(2)][i32(1)], _S107.relModel_0[i32(3)][i32(1)]), vec4<f32>(_S107.relModel_0[i32(0)][i32(2)], _S107.relModel_0[i32(1)][i32(2)], _S107.relModel_0[i32(2)][i32(2)], _S107.relModel_0[i32(3)][i32(2)]), vec4<f32>(_S107.relModel_0[i32(0)][i32(3)], _S107.relModel_0[i32(1)][i32(3)], _S107.relModel_0[i32(2)][i32(3)], _S107.relModel_0[i32(3)][i32(3)]) );
        items_0[item_4].relModel_0.data_3 = _S108;
        items_0[item_4].drawn_0 = _S107.drawn_0;
        items_0[item_4].record_0 = _S107.record_0;
        items_0[item_4].feature_0 = _S107.feature_0;
        items_0[item_4].instance_0 = _S107.instance_0;
        items_0[item_4].tint_0 = _S107.tint_0;
        var _S109 : u32 = _S102.flags_3;
        if((((_S102.flags_3) & (u32(6)))) != u32(0))
        {
            var within_1 : bool = ((length((((vec4<f32>(records_0[_S103].center_0, 1.0f)) * (_S105))).xyz)) <= (unpack2x16float(((_S109 >> (u32(16))))).x));
            if(((_S109 & (u32(2)))) != u32(0))
            {
                shown_1 = within_1;
            }
            else
            {
                shown_1 = !within_1;
            }
        }
        else
        {
            shown_1 = true;
        }
        if(((_S109 & (u32(1)))) == u32(0))
        {
        }
        else
        {
            shown_1 = false;
        }
        if(shown_1)
        {
            var _S110 : bool = drawable_0(_S103, &(_S104));
            shown_1 = _S110;
        }
        else
        {
            shown_1 = false;
        }
        if(shown_1)
        {
            shown_1 = inFrustum_0(_S105, records_0[_S103].center_0, radius_7);
        }
        else
        {
            shown_1 = false;
        }
        if(shown_1)
        {
            place_0(records_0[_S103].batch_0, item_4, (((vec4<f32>(records_0[_S103].center_0, 1.0f)) * (_S105))).xyz, radius_7);
        }
        break;
    }
    return;
}

@compute
@workgroup_size(64, 1, 1)
fn writeDrawArgsOccluded(@builtin(global_invocation_id) gid_5 : vec3<u32>)
{
    var _S111 : u32 = gid_5.x;
    loop
    {
        if((_S111 >= (params_0.batchCount_0)))
        {
            break;
        }
        var batch_6 : Batch_std430_0 = batches_0[_S111];
        var a_6 : u32 = _S111 * u32(5);
        atomicStore(&(args_0[a_6]), batch_6.indexCount_1);
        atomicStore(&(args_0[a_6 + u32(2)]), batch_6.firstIndex_1);
        atomicStore(&(args_0[a_6 + u32(3)]), u32(0));
        atomicStore(&(args_0[a_6 + u32(4)]), u32(0));
        var a_7 : u32 = (occlusion_0.argumentRows_0 + _S111) * u32(5);
        atomicStore(&(args_0[a_7]), batch_6.indexCount_1);
        atomicStore(&(args_0[a_7 + u32(2)]), batch_6.firstIndex_1);
        atomicStore(&(args_0[a_7 + u32(3)]), u32(0));
        atomicStore(&(args_0[a_7 + u32(4)]), u32(0));
        break;
    }
    return;
}

struct DrawRecord_0
{
     center_0 : vec3<f32>,
     radius_0 : f32,
     color_0 : vec4<f32>,
     transform_0 : u32,
     flags_0 : u32,
     materialIndex_0 : u32,
     indexCount_0 : u32,
     firstIndex_0 : u32,
     featureId_0 : u32,
     batch_0 : u32,
     positionOffset_0 : u32,
     normalOffset_0 : u32,
     uvOffset_0 : u32,
     colorOffset_0 : u32,
     tangentOffset_0 : u32,
     textureSet_0 : u32,
     imagerySlice_0 : u32,
     featureIdOffset_0 : u32,
     viewMask_0 : u32,
     clipBlock_0 : u32,
     placeholderMask_0 : u32,
     terrainClip_0 : u32,
     instanceFirst_0 : u32,
     instanceCount_1 : u32,
     instanceStreams_0 : u32,
     instanceStride_0 : u32,
     lightsSlice_0 : u32,
     attributes_0 : u32,
     instanceDirectory_0 : u32,
     billboardSize_0 : f32,
     billboardDepthTest_0 : f32,
     placement_0 : u32,
     skirtStart_0 : u32,
     casterMask_0 : u32,
     debug_0 : u32,
     morph_0 : f32,
     imageryFrom_0 : u32,
     imageryFade_0 : f32,
};

@compute
@workgroup_size(64, 1, 1)
fn retestOccluded(@builtin(global_invocation_id) gid_6 : vec3<u32>)
{
    var k_1 : u32 = gid_6.x + gid_6.y * WorkgroupCount_0().x * u32(64);
    var _S112 : u32 = atomicLoad(&(args_0[occlusion_0.counters_0]));
    if((k_1 >= (min(_S112, occlusion_0.itemRows_0))))
    {
        return;
    }
    var item_5 : u32 = itemList_0[u32(2) * occlusion_0.itemRows_0 + k_1];
    var radius_8 : f32;
    var r_0 : DrawRecord_0;
    var m_2 : mat4x4<f32>;
    if((itemList_0[u32(2) * occlusion_0.itemRows_0 + k_1] < (params_0.firstInstanceItem_0)))
    {
        var _S113 : DrawRecord_std430_0 = records_0[item_5];
        var _S114 : Transform_std430_0 = transforms_0[_S113.transform_0];
        var _S115 : mat4x4<f32> = recordMatrix_0(item_5, &(_S114), &(radius_8));
        r_0.center_0 = _S113.center_0;
        r_0.radius_0 = _S113.radius_0;
        r_0.color_0 = _S113.color_0;
        r_0.transform_0 = _S113.transform_0;
        r_0.flags_0 = _S113.flags_0;
        r_0.materialIndex_0 = _S113.materialIndex_0;
        r_0.indexCount_0 = _S113.indexCount_0;
        r_0.firstIndex_0 = _S113.firstIndex_0;
        r_0.featureId_0 = _S113.featureId_0;
        r_0.batch_0 = _S113.batch_0;
        r_0.positionOffset_0 = _S113.positionOffset_0;
        r_0.normalOffset_0 = _S113.normalOffset_0;
        r_0.uvOffset_0 = _S113.uvOffset_0;
        r_0.colorOffset_0 = _S113.colorOffset_0;
        r_0.tangentOffset_0 = _S113.tangentOffset_0;
        r_0.textureSet_0 = _S113.textureSet_0;
        r_0.imagerySlice_0 = _S113.imagerySlice_0;
        r_0.featureIdOffset_0 = _S113.featureIdOffset_0;
        r_0.viewMask_0 = _S113.viewMask_0;
        r_0.clipBlock_0 = _S113.clipBlock_0;
        r_0.placeholderMask_0 = _S113.placeholderMask_0;
        r_0.terrainClip_0 = _S113.terrainClip_0;
        r_0.instanceFirst_0 = _S113.instanceFirst_0;
        r_0.instanceCount_1 = _S113.instanceCount_1;
        r_0.instanceStreams_0 = _S113.instanceStreams_0;
        r_0.instanceStride_0 = _S113.instanceStride_0;
        r_0.lightsSlice_0 = _S113.lightsSlice_0;
        r_0.attributes_0 = _S113.attributes_0;
        r_0.instanceDirectory_0 = _S113.instanceDirectory_0;
        r_0.billboardSize_0 = _S113.billboardSize_0;
        r_0.billboardDepthTest_0 = _S113.billboardDepthTest_0;
        r_0.placement_0 = _S113.placement_0;
        r_0.skirtStart_0 = _S113.skirtStart_0;
        r_0.casterMask_0 = _S113.casterMask_0;
        r_0.debug_0 = _S113.debug_0;
        r_0.morph_0 = _S113.morph_0;
        r_0.imageryFrom_0 = _S113.imageryFrom_0;
        r_0.imageryFade_0 = _S113.imageryFade_0;
        m_2 = _S115;
    }
    else
    {
        var _S116 : Instance_std430_0 = instanceTable_0[min(item_5 - params_0.firstInstanceItem_0, params_0.instanceCount_0 - u32(1))];
        var _S117 : DrawRecord_std430_0 = records_0[_S116.record_1];
        var _S118 : Transform_std430_0 = transforms_0[_S117.transform_0];
        var local_2 : mat4x4<f32>;
        var _S119 : mat4x4<f32> = instanceMatrix_0(&(_S116), _S116.record_1, &(_S118), &(local_2), &(radius_8));
        r_0.center_0 = _S117.center_0;
        r_0.radius_0 = _S117.radius_0;
        r_0.color_0 = _S117.color_0;
        r_0.transform_0 = _S117.transform_0;
        r_0.flags_0 = _S117.flags_0;
        r_0.materialIndex_0 = _S117.materialIndex_0;
        r_0.indexCount_0 = _S117.indexCount_0;
        r_0.firstIndex_0 = _S117.firstIndex_0;
        r_0.featureId_0 = _S117.featureId_0;
        r_0.batch_0 = _S117.batch_0;
        r_0.positionOffset_0 = _S117.positionOffset_0;
        r_0.normalOffset_0 = _S117.normalOffset_0;
        r_0.uvOffset_0 = _S117.uvOffset_0;
        r_0.colorOffset_0 = _S117.colorOffset_0;
        r_0.tangentOffset_0 = _S117.tangentOffset_0;
        r_0.textureSet_0 = _S117.textureSet_0;
        r_0.imagerySlice_0 = _S117.imagerySlice_0;
        r_0.featureIdOffset_0 = _S117.featureIdOffset_0;
        r_0.viewMask_0 = _S117.viewMask_0;
        r_0.clipBlock_0 = _S117.clipBlock_0;
        r_0.placeholderMask_0 = _S117.placeholderMask_0;
        r_0.terrainClip_0 = _S117.terrainClip_0;
        r_0.instanceFirst_0 = _S117.instanceFirst_0;
        r_0.instanceCount_1 = _S117.instanceCount_1;
        r_0.instanceStreams_0 = _S117.instanceStreams_0;
        r_0.instanceStride_0 = _S117.instanceStride_0;
        r_0.lightsSlice_0 = _S117.lightsSlice_0;
        r_0.attributes_0 = _S117.attributes_0;
        r_0.instanceDirectory_0 = _S117.instanceDirectory_0;
        r_0.billboardSize_0 = _S117.billboardSize_0;
        r_0.billboardDepthTest_0 = _S117.billboardDepthTest_0;
        r_0.placement_0 = _S117.placement_0;
        r_0.skirtStart_0 = _S117.skirtStart_0;
        r_0.casterMask_0 = _S117.casterMask_0;
        r_0.debug_0 = _S117.debug_0;
        r_0.morph_0 = _S117.morph_0;
        r_0.imageryFrom_0 = _S117.imageryFrom_0;
        r_0.imageryFade_0 = _S117.imageryFade_0;
        m_2 = _S119;
    }
    var _S120 : DrawRecord_0 = r_0;
    if(sphereHidden_0((((vec4<f32>(r_0.center_0, 1.0f)) * (m_2))).xyz, radius_8, occlusion_0.right_0, occlusion_0.up_0, occlusion_0.forward_0, occlusion_0.lens_0))
    {
        return;
    }
    var _S121 : u32 = atomicAdd(&(args_0[occlusion_0.counters_0 + u32(2)]), u32(1));
    var _S122 : u32 = atomicAdd(&(args_0[occlusion_0.counters_0 + u32(3)]), trianglesOf_0(_S120.batch_0));
    var slot_1 : u32 = atomicAdd(&(args_0[(occlusion_0.argumentRows_0 + _S120.batch_0) * u32(5) + u32(1)]), u32(1));
    itemList_0[occlusion_0.itemRows_0 + batches_0[_S120.batch_0].itemBase_0 + slot_1] = item_5;
    return;
}

