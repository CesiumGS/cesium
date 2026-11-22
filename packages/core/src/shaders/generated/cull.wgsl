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
    @align(16) shifts_0 : vec4<f32>,
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
    var _S4 : u32 = (word_0 >> (u32(2)));
    var _S5 : vec2<u32> = vec2<u32>(arrayLength(&placements_0), 16);
    return placements_0[min(_S4, max(_S5.x, u32(1)) - u32(1))][(word_0 & (u32(3)))];
}

fn termWeight_0( row_0 : u32,  head_0 : vec4<u32>) -> f32
{
    var _S6 : f32 = (bitcast<f32>((head_0.y)));
    var _S7 : u32 = ((((head_0.x) >> (u32(8)))) & (u32(3)));
    var f_0 : u32 = u32(0);
    var w_0 : f32 = _S6;
    loop
    {
        if((f_0 < u32(2)))
        {
        }
        else
        {
            break;
        }
        if((f_0 >= _S7))
        {
            break;
        }
        var _S8 : u32 = row_0 + u32(1) + f_0;
        var _S9 : vec2<u32> = vec2<u32>(arrayLength(&placements_0), 16);
        var _S10 : vec4<f32> = placements_0[min(_S8, max(_S9.x, u32(1)) - u32(1))];
        var w_1 : f32 = w_0 * (_S10.y + _S10.z * placementParameter_0((bitcast<u32>((_S10.x)))));
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
    var _S11 : vec3<f32> = vec3<f32>(0.0f);
    (*hi_2) = _S11;
    (*lo_2) = _S11;
    if(placement_1 == u32(4294967295))
    {
        return;
    }
    var _S12 : vec2<u32> = vec2<u32>(arrayLength(&placements_0), 16);
    var _S13 : u32 = min((bitcast<u32>((placements_0[min(placement_1, max(_S12.x, u32(1)) - u32(1))].x))), u32(3));
    var i_0 : u32 = u32(0);
    loop
    {
        if((i_0 < u32(3)))
        {
        }
        else
        {
            break;
        }
        if((i_0 >= _S13))
        {
            break;
        }
        var row_1 : u32 = placement_1 + u32(1) + i_0 * u32(3);
        var _S14 : vec2<u32> = vec2<u32>(arrayLength(&placements_0), 16);
        var head_1 : vec4<u32> = (bitcast<vec4<u32>>((placements_0[min(row_1, max(_S14.x, u32(1)) - u32(1))])));
        if((((head_1.x) & (u32(255)))) != u32(1))
        {
            i_0 = i_0 + u32(1);
            continue;
        }
        var _S15 : f32 = termWeight_0(row_1, head_1);
        var body_0 : u32 = placement_1 + head_1.z;
        var _S16 : u32 = body_0 + u32(1);
        var _S17 : vec2<u32> = vec2<u32>(arrayLength(&placements_0), 16);
        var _S18 : vec3<f32> = placements_0[min(_S16, max(_S17.x, u32(1)) - u32(1))].xyz;
        var _S19 : u32 = body_0 + u32(2);
        var _S20 : vec2<u32> = vec2<u32>(arrayLength(&placements_0), 16);
        var _S21 : vec3<f32> = placements_0[min(_S19, max(_S20.x, u32(1)) - u32(1))].xyz;
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
            var p_1 : vec2<f32> = twoProd_0(_S15, _S18[a_3]);
            var s_1 : vec2<f32> = twoSum_0((*hi_2)[a_3], p_1.x);
            (*hi_2)[a_3] = s_1.x;
            (*lo_2)[a_3] = (*lo_2)[a_3] + (s_1.y + p_1.y + _S15 * _S21[a_3]);
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
        var _S22 : u32 = a_3;
        var s_2 : vec2<f32> = twoSum_0((*hi_2)[a_3], (*lo_2)[_S22]);
        (*hi_2)[a_3] = s_2.x;
        (*lo_2)[_S22] = s_2.y;
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
    var _S23 : AnchorEye_0 = anchorEye_0(&((*t_2)));
    var whole_1 : vec3<f32>;
    var fraction_1 : vec3<f32>;
    SplitPosition_differenceParts_0(SplitPosition_x24init_0((*t_2).originHi_0, (*t_2).originLo_0), SplitPosition_x24init_0(_S23.eyeHi_0.xyz, _S23.eyeLo_0.xyz), &(whole_1), &(fraction_1));
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
        var _S24 : u32 = i_1;
        var sum_0 : vec2<f32> = vec2<f32>(whole_1[i_1], 0.0f);
        var j_0 : u32 = u32(0);
        var small_0 : f32 = fraction_1[_S24];
        loop
        {
            if((j_0 < u32(3)))
            {
            }
            else
            {
                break;
            }
            var _S25 : mat3x3<f32> = mat3x3<f32>((*t_2).linear_0.data_0[i32(0)][i32(0)], (*t_2).linear_0.data_0[i32(1)][i32(0)], (*t_2).linear_0.data_0[i32(2)][i32(0)], (*t_2).linear_0.data_0[i32(0)][i32(1)], (*t_2).linear_0.data_0[i32(1)][i32(1)], (*t_2).linear_0.data_0[i32(2)][i32(1)], (*t_2).linear_0.data_0[i32(0)][i32(2)], (*t_2).linear_0.data_0[i32(1)][i32(2)], (*t_2).linear_0.data_0[i32(2)][i32(2)]);
            var p_2 : vec2<f32> = twoProd_0(_S25[i_1][j_0], offsetHi_0[j_0]);
            var s_3 : vec2<f32> = twoSum_0(sum_0.x, p_2.x);
            var _S26 : vec2<f32> = vec2<f32>(s_3.x, sum_0.y + s_3.y);
            var small_1 : f32 = small_0 + (p_2.y + _S25[i_1][j_0] * offsetLo_0[j_0]);
            var _S27 : u32 = j_0 + u32(1);
            sum_0 = _S26;
            j_0 = _S27;
            small_0 = small_1;
        }
        rel_1[i_1] = sum_0.x + (sum_0.y + small_0);
        i_1 = i_1 + u32(1);
    }
    return (((rel_1) * (mat3x3<f32>(_S23.axes_0[i32(0)].xyz, _S23.axes_0[i32(1)].xyz, _S23.axes_0[i32(2)].xyz))));
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
    var _S28 : vec3<f32> = (((vec4<f32>(center_1, 1.0f)) * (m_1))).xyz;
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
        if(((dot(view_0.planes_0[p_3].xyz, _S28) + view_0.planes_0[p_3].w) < (- radius_1)))
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
     shiftX_0 : f32,
     shiftY_0 : f32,
};

fn boxHidden_0( pyramid_1 : texture_2d<f32>,  camera_0 : PyramidCamera_0,  center_2 : vec3<f32>,  a_4 : vec3<f32>,  b_4 : vec3<f32>,  c_1 : vec3<f32>,  window_0 : u32) -> bool
{
    var frameWidth_0 : f32 = f32(camera_0.width_1);
    var frameHeight_0 : f32 = f32(camera_0.height_1);
    const _S29 : vec2<f32> = vec2<f32>(-3.39999995214436425e+38f, -3.39999995214436425e+38f);
    var low_0 : vec2<f32> = vec2<f32>(3.39999995214436425e+38f, 3.39999995214436425e+38f);
    var high_0 : vec2<f32> = _S29;
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
        var _S30 : vec3<f32>;
        if(((k_0 & (u32(1)))) == u32(0))
        {
            _S30 = (vec3<f32>(0) - a_4);
        }
        else
        {
            _S30 = a_4;
        }
        var _S31 : vec3<f32> = center_2 + _S30;
        var _S32 : vec3<f32>;
        if(((k_0 & (u32(2)))) == u32(0))
        {
            _S32 = (vec3<f32>(0) - b_4);
        }
        else
        {
            _S32 = b_4;
        }
        var _S33 : vec3<f32> = _S31 + _S32;
        var _S34 : vec3<f32>;
        if(((k_0 & (u32(4)))) == u32(0))
        {
            _S34 = (vec3<f32>(0) - c_1);
        }
        else
        {
            _S34 = c_1;
        }
        var p_4 : vec3<f32> = _S33 + _S34;
        var _S35 : f32 = p_4.z;
        if(!(_S35 > (camera_0.near_1)))
        {
            return false;
        }
        var inverse_0 : f32 = 1.0f / _S35;
        var screen_0 : vec2<f32> = vec2<f32>(((p_4.x * inverse_0 / camera_0.tanX_0 + camera_0.shiftX_0) * 0.5f + 0.5f) * frameWidth_0, (0.5f - (p_4.y * inverse_0 / camera_0.tanY_0 + camera_0.shiftY_0) * 0.5f) * frameHeight_0);
        var _S36 : vec2<f32> = min(low_0, screen_0);
        var _S37 : vec2<f32> = max(high_0, screen_0);
        var _S38 : f32 = min(nearestZ_0, _S35);
        var _S39 : u32 = k_0 + u32(1);
        low_0 = _S36;
        high_0 = _S37;
        nearestZ_0 = _S38;
        k_0 = _S39;
    }
    var _S40 : bool;
    if(!((high_0.x) >= 0.0f))
    {
        _S40 = true;
    }
    else
    {
        _S40 = !((high_0.y) >= 0.0f);
    }
    if(_S40)
    {
        _S40 = true;
    }
    else
    {
        _S40 = !((low_0.x) < frameWidth_0);
    }
    if(_S40)
    {
        _S40 = true;
    }
    else
    {
        _S40 = !((low_0.y) < frameHeight_0);
    }
    if(_S40)
    {
        return false;
    }
    const _S41 : vec2<f32> = vec2<f32>(0.0f, 0.0f);
    var _S42 : vec2<f32> = vec2<f32>(frameWidth_0 - 1.0f, frameHeight_0 - 1.0f);
    var _S43 : vec2<u32> = vec2<u32>(clamp(floor(low_0), _S41, _S42));
    var _S44 : vec2<u32> = vec2<u32>(clamp(floor(high_0), _S41, _S42));
    var _S45 : u32 = max(((camera_0.width_1) >> (u32(1))), u32(1));
    var _S46 : u32 = max(((camera_0.height_1) >> (u32(1))), u32(1));
    var _S47 : u32 = _S45 - u32(1);
    var _S48 : u32 = _S46 - u32(1);
    var span_0 : vec2<u32> = vec2<u32>(min(((_S44.x) >> (u32(1))), _S47), min(((_S44.y) >> (u32(1))), _S48)) - vec2<u32>(min(((_S43.x) >> (u32(1))), _S47), min(((_S43.y) >> (u32(1))), _S48));
    var _S49 : u32 = max(span_0.x, span_0.y) + u32(1);
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
        if((((((_S49 - u32(1)) >> (level_0))) + u32(2)) <= wide_0))
        {
            _S40 = true;
        }
        else
        {
            _S40 = ((level_0 + u32(1)) >= (camera_0.levels_1));
        }
        if(_S40)
        {
            break;
        }
        var _S50 : u32 = level_0 + u32(1);
        l_0 = l_0 + u32(1);
        level_0 = _S50;
    }
    var _S51 : vec2<u32> = vec2<u32>((level_0 + u32(1)));
    var _S52 : vec2<u32> = vec2<u32>(max((_S45 >> (level_0)), u32(1)), max((_S46 >> (level_0)), u32(1))) - vec2<u32>(u32(1));
    var _S53 : vec2<u32> = min((_S43 >> (_S51)), _S52);
    var _S54 : vec2<u32> = min((_S44 >> (_S51)), _S52);
    var _S55 : u32 = _S54.x;
    var _S56 : u32 = _S53.x;
    var _S57 : u32 = wide_0 - u32(1);
    if(((_S55 - _S56) > _S57))
    {
        _S40 = true;
    }
    else
    {
        _S40 = ((_S54.y - _S53.y) > _S57);
    }
    if(_S40)
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
        var y_0 : u32 = _S53.y + j_1;
        if((y_0 > (_S54.y)))
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
            var x_0 : u32 = _S56 + i_2;
            if((x_0 > _S55))
            {
                break;
            }
            var _S58 : vec3<i32> = vec3<i32>(i32(x_0), i32(y_0), i32(level_0));
            var _S59 : f32 = min(farthest_0, (textureLoad((pyramid_1), ((_S58)).xy, ((_S58)).z).x));
            var _S60 : u32 = i_2 + u32(1);
            farthest_0 = _S59;
            i_2 = _S60;
        }
        j_1 = j_1 + u32(1);
    }
    return (farthest_0 > (camera_0.near_1 / nearestZ_0 * (1.0f + camera_0.bias_0)));
}

fn sphereHidden_0( center_3 : vec3<f32>,  radius_2 : f32,  right_1 : vec4<f32>,  up_1 : vec4<f32>,  forward_1 : vec4<f32>,  lens_1 : vec4<f32>,  shift_0 : vec2<f32>) -> bool
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
    camera_1.shiftX_0 = shift_0.x;
    camera_1.shiftY_0 = shift_0.y;
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
    var _S61 : bool;
    if((occlusion_0.test_0) != u32(0))
    {
        _S61 = occludable_0(batch_4);
    }
    else
    {
        _S61 = false;
    }
    if(_S61)
    {
        _S61 = sphereHidden_0(center_4, radius_3, occlusion_0.lastRight_0, occlusion_0.lastUp_0, occlusion_0.lastForward_0, occlusion_0.lastLens_0, occlusion_0.shifts_0.xy);
    }
    else
    {
        _S61 = false;
    }
    if(_S61)
    {
        var _S62 : u32 = atomicAdd(&(args_0[occlusion_0.counters_0]), u32(1));
        var _S63 : u32 = atomicAdd(&(args_0[occlusion_0.counters_0 + u32(1)]), trianglesOf_0(batch_4));
        itemList_0[u32(2) * occlusion_0.itemRows_0 + min(_S62, occlusion_0.itemRows_0 - u32(1))] = item_2;
        return;
    }
    append_0(batch_4, item_2);
    return;
}

fn recordMatrix_0( _S64 : u32,  _S65 : ptr<function, Transform_std430_0>,  _S66 : ptr<function, f32>) -> mat4x4<f32>
{
    (*_S66) = records_0[_S64].radius_0 * (*_S65).scale_0;
    var _S67 : mat4x4<f32> = relativeMatrix_0(&((*_S65)));
    return _S67;
}

fn drawable_0( _S68 : u32,  _S69 : ptr<function, Transform_std430_0>) -> bool
{
    var mask_0 : u32;
    if(((view_0.time_0.z) > 0.5f))
    {
        mask_0 = ((records_0[_S68].viewMask_0) | ((records_0[_S68].casterMask_0)));
    }
    else
    {
        mask_0 = records_0[_S68].viewMask_0;
    }
    var _S70 : u32 = records_0[_S68].flags_0;
    var _S71 : bool;
    if((((records_0[_S68].flags_0) & (u32(1)))) == u32(0))
    {
        _S71 = ((((*_S69).flags_1) & (u32(1)))) == u32(0);
    }
    else
    {
        _S71 = false;
    }
    if(_S71)
    {
        _S71 = (records_0[_S68].indexCount_0) != u32(0);
    }
    else
    {
        _S71 = false;
    }
    if(_S71)
    {
        _S71 = ((mask_0 & ((view_0.viewBit_0)))) != u32(0);
    }
    else
    {
        _S71 = false;
    }
    if(_S71)
    {
        if(((view_0.time_0.y) > 0.5f))
        {
            _S71 = ((_S70 & (u32(32)))) != u32(0);
        }
        else
        {
            _S71 = false;
        }
        _S71 = !_S71;
    }
    else
    {
        _S71 = false;
    }
    if(_S71)
    {
        var _S72 : AnchorEye_0 = anchorEye_0(&((*_S69)));
        _S71 = ((_S72.eyeHi_0.w) < 0.5f);
    }
    else
    {
        _S71 = false;
    }
    return _S71;
}

@compute
@workgroup_size(64, 1, 1)
fn cullRecords(@builtin(global_invocation_id) gid_0 : vec3<u32>)
{
    var _S73 : u32 = gid_0.x;
    loop
    {
        if((_S73 >= (params_0.recordCount_0)))
        {
            break;
        }
        if((records_0[_S73].instanceCount_1) != u32(0))
        {
            break;
        }
        var _S74 : Transform_std430_0 = transforms_0[records_0[_S73].transform_0];
        var radius_4 : f32;
        var _S75 : mat4x4<f32> = recordMatrix_0(_S73, &(_S74), &(radius_4));
        var _S76 : vec3<f32> = vec3<f32>(_S75[i32(0)][i32(3)], _S75[i32(1)][i32(3)], _S75[i32(2)][i32(3)]);
        var _S77 : u32 = records_0[_S73].placement_0;
        var drawn_2 : vec3<f32>;
        if((records_0[_S73].placement_0) != u32(4294967295))
        {
            var offsetHi_1 : vec3<f32>;
            var offsetLo_1 : vec3<f32>;
            placementOffset_0(_S77, &(offsetHi_1), &(offsetLo_1));
            var _S78 : vec3<f32> = drawnTranslation_0(&(_S74), offsetHi_1, offsetLo_1);
            drawn_2 = _S78;
        }
        else
        {
            drawn_2 = _S76;
        }
        var _S79 : DrawItem_0 = drawItem_0(_S75, drawn_2, _S73, u32(0), u32(0), u32(4294967295));
        var _S80 : array<vec4<f32>, i32(4)> = array<vec4<f32>, i32(4)>( vec4<f32>(_S79.relModel_0[i32(0)][i32(0)], _S79.relModel_0[i32(1)][i32(0)], _S79.relModel_0[i32(2)][i32(0)], _S79.relModel_0[i32(3)][i32(0)]), vec4<f32>(_S79.relModel_0[i32(0)][i32(1)], _S79.relModel_0[i32(1)][i32(1)], _S79.relModel_0[i32(2)][i32(1)], _S79.relModel_0[i32(3)][i32(1)]), vec4<f32>(_S79.relModel_0[i32(0)][i32(2)], _S79.relModel_0[i32(1)][i32(2)], _S79.relModel_0[i32(2)][i32(2)], _S79.relModel_0[i32(3)][i32(2)]), vec4<f32>(_S79.relModel_0[i32(0)][i32(3)], _S79.relModel_0[i32(1)][i32(3)], _S79.relModel_0[i32(2)][i32(3)], _S79.relModel_0[i32(3)][i32(3)]) );
        items_0[_S73].relModel_0.data_3 = _S80;
        items_0[_S73].drawn_0 = _S79.drawn_0;
        items_0[_S73].record_0 = _S79.record_0;
        items_0[_S73].feature_0 = _S79.feature_0;
        items_0[_S73].instance_0 = _S79.instance_0;
        items_0[_S73].tint_0 = _S79.tint_0;
        var _S81 : bool = drawable_0(_S73, &(_S74));
        var _S82 : bool;
        if(_S81)
        {
            _S82 = inFrustum_0(_S75, records_0[_S73].center_0, radius_4);
        }
        else
        {
            _S82 = false;
        }
        if(_S82)
        {
            append_0(records_0[_S73].batch_0, _S73);
        }
        break;
    }
    return;
}

var<private> _S83 : vec3<u32>;

fn WorkgroupCount_0() -> vec3<u32>
{
    return _S83;
}

fn instanceMatrix_0( _S84 : ptr<function, Instance_std430_0>,  _S85 : u32,  _S86 : ptr<function, Transform_std430_0>,  _S87 : ptr<function, mat4x4<f32>>,  _S88 : ptr<function, f32>) -> mat4x4<f32>
{
    (*_S87) = mat4x4<f32>((*_S84).row0_0, (*_S84).row1_0, (*_S84).row2_0, vec4<f32>(0.0f, 0.0f, 0.0f, 1.0f));
    (*_S88) = records_0[_S85].radius_0 * ((*_S86).scale_0 * max(length(vec3<f32>((*_S87)[i32(0)][i32(0)], (*_S87)[i32(1)][i32(0)], (*_S87)[i32(2)][i32(0)])), max(length(vec3<f32>((*_S87)[i32(0)][i32(1)], (*_S87)[i32(1)][i32(1)], (*_S87)[i32(2)][i32(1)])), length(vec3<f32>((*_S87)[i32(0)][i32(2)], (*_S87)[i32(1)][i32(2)], (*_S87)[i32(2)][i32(2)])))));
    var _S89 : mat4x4<f32> = relativeMatrix_0(&((*_S86)));
    return ((((*_S87)) * (_S89)));
}

@compute
@workgroup_size(64, 1, 1)
fn cullInstances(@builtin(global_invocation_id) gid_1 : vec3<u32>, @builtin(num_workgroups) _builtinWorkgroupCount_0 : vec3<u32>)
{
    _S83 = _builtinWorkgroupCount_0;
    var _S90 : u32 = gid_1.x + gid_1.y * WorkgroupCount_0().x * u32(64);
    loop
    {
        if((_S90 >= (params_0.instanceCount_0)))
        {
            break;
        }
        var _S91 : Instance_std430_0 = instanceTable_0[_S90];
        var _S92 : u32 = _S91.record_1;
        if((_S91.record_1) == u32(4294967295))
        {
            break;
        }
        var _S93 : Transform_std430_0 = transforms_0[records_0[_S92].transform_0];
        var local_0 : mat4x4<f32>;
        var radius_5 : f32;
        var _S94 : mat4x4<f32> = instanceMatrix_0(&(_S91), _S92, &(_S93), &(local_0), &(radius_5));
        var _S95 : u32 = _S91.feature_1;
        var shown_0 : bool;
        if((_S91.feature_1) != u32(4294967295))
        {
            shown_0 = (records_0[_S92].featureId_0) != u32(0);
        }
        else
        {
            shown_0 = false;
        }
        var feature_3 : u32;
        if(shown_0)
        {
            feature_3 = records_0[_S92].featureId_0 + _S95;
        }
        else
        {
            feature_3 = u32(0);
        }
        var item_3 : u32 = params_0.firstInstanceItem_0 + _S90;
        var _S96 : DrawItem_0 = drawItem_0(_S94, vec3<f32>(_S94[i32(0)][i32(3)], _S94[i32(1)][i32(3)], _S94[i32(2)][i32(3)]), _S92, feature_3, _S90 - records_0[_S92].instanceFirst_0, _S91.tint_1);
        var _S97 : array<vec4<f32>, i32(4)> = array<vec4<f32>, i32(4)>( vec4<f32>(_S96.relModel_0[i32(0)][i32(0)], _S96.relModel_0[i32(1)][i32(0)], _S96.relModel_0[i32(2)][i32(0)], _S96.relModel_0[i32(3)][i32(0)]), vec4<f32>(_S96.relModel_0[i32(0)][i32(1)], _S96.relModel_0[i32(1)][i32(1)], _S96.relModel_0[i32(2)][i32(1)], _S96.relModel_0[i32(3)][i32(1)]), vec4<f32>(_S96.relModel_0[i32(0)][i32(2)], _S96.relModel_0[i32(1)][i32(2)], _S96.relModel_0[i32(2)][i32(2)], _S96.relModel_0[i32(3)][i32(2)]), vec4<f32>(_S96.relModel_0[i32(0)][i32(3)], _S96.relModel_0[i32(1)][i32(3)], _S96.relModel_0[i32(2)][i32(3)], _S96.relModel_0[i32(3)][i32(3)]) );
        items_0[item_3].relModel_0.data_3 = _S97;
        items_0[item_3].drawn_0 = _S96.drawn_0;
        items_0[item_3].record_0 = _S96.record_0;
        items_0[item_3].feature_0 = _S96.feature_0;
        items_0[item_3].instance_0 = _S96.instance_0;
        items_0[item_3].tint_0 = _S96.tint_0;
        var _S98 : u32 = _S91.flags_3;
        if((((_S91.flags_3) & (u32(6)))) != u32(0))
        {
            var within_0 : bool = ((length((((vec4<f32>(records_0[_S92].center_0, 1.0f)) * (_S94))).xyz)) <= (unpack2x16float(((_S98 >> (u32(16))))).x));
            if(((_S98 & (u32(2)))) != u32(0))
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
        if(((_S98 & (u32(1)))) == u32(0))
        {
        }
        else
        {
            shown_0 = false;
        }
        if(shown_0)
        {
            var _S99 : bool = drawable_0(_S92, &(_S93));
            shown_0 = _S99;
        }
        else
        {
            shown_0 = false;
        }
        if(shown_0)
        {
            shown_0 = inFrustum_0(_S94, records_0[_S92].center_0, radius_5);
        }
        else
        {
            shown_0 = false;
        }
        if(shown_0)
        {
            append_0(records_0[_S92].batch_0, item_3);
        }
        break;
    }
    return;
}

@compute
@workgroup_size(64, 1, 1)
fn writeDrawArgs(@builtin(global_invocation_id) gid_2 : vec3<u32>)
{
    var _S100 : u32 = gid_2.x;
    loop
    {
        if((_S100 >= (params_0.batchCount_0)))
        {
            break;
        }
        var batch_5 : Batch_std430_0 = batches_0[_S100];
        var a_5 : u32 = _S100 * u32(5);
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
    var _S101 : u32 = gid_3.x;
    loop
    {
        if((_S101 >= (params_0.recordCount_0)))
        {
            break;
        }
        if((records_0[_S101].instanceCount_1) != u32(0))
        {
            break;
        }
        var _S102 : Transform_std430_0 = transforms_0[records_0[_S101].transform_0];
        var radius_6 : f32;
        var _S103 : mat4x4<f32> = recordMatrix_0(_S101, &(_S102), &(radius_6));
        var _S104 : vec3<f32> = vec3<f32>(_S103[i32(0)][i32(3)], _S103[i32(1)][i32(3)], _S103[i32(2)][i32(3)]);
        var _S105 : u32 = records_0[_S101].placement_0;
        var drawn_3 : vec3<f32>;
        if((records_0[_S101].placement_0) != u32(4294967295))
        {
            var offsetHi_2 : vec3<f32>;
            var offsetLo_2 : vec3<f32>;
            placementOffset_0(_S105, &(offsetHi_2), &(offsetLo_2));
            var _S106 : vec3<f32> = drawnTranslation_0(&(_S102), offsetHi_2, offsetLo_2);
            drawn_3 = _S106;
        }
        else
        {
            drawn_3 = _S104;
        }
        var _S107 : DrawItem_0 = drawItem_0(_S103, drawn_3, _S101, u32(0), u32(0), u32(4294967295));
        var _S108 : array<vec4<f32>, i32(4)> = array<vec4<f32>, i32(4)>( vec4<f32>(_S107.relModel_0[i32(0)][i32(0)], _S107.relModel_0[i32(1)][i32(0)], _S107.relModel_0[i32(2)][i32(0)], _S107.relModel_0[i32(3)][i32(0)]), vec4<f32>(_S107.relModel_0[i32(0)][i32(1)], _S107.relModel_0[i32(1)][i32(1)], _S107.relModel_0[i32(2)][i32(1)], _S107.relModel_0[i32(3)][i32(1)]), vec4<f32>(_S107.relModel_0[i32(0)][i32(2)], _S107.relModel_0[i32(1)][i32(2)], _S107.relModel_0[i32(2)][i32(2)], _S107.relModel_0[i32(3)][i32(2)]), vec4<f32>(_S107.relModel_0[i32(0)][i32(3)], _S107.relModel_0[i32(1)][i32(3)], _S107.relModel_0[i32(2)][i32(3)], _S107.relModel_0[i32(3)][i32(3)]) );
        items_0[_S101].relModel_0.data_3 = _S108;
        items_0[_S101].drawn_0 = _S107.drawn_0;
        items_0[_S101].record_0 = _S107.record_0;
        items_0[_S101].feature_0 = _S107.feature_0;
        items_0[_S101].instance_0 = _S107.instance_0;
        items_0[_S101].tint_0 = _S107.tint_0;
        var _S109 : bool = drawable_0(_S101, &(_S102));
        var _S110 : bool;
        if(_S109)
        {
            _S110 = inFrustum_0(_S103, records_0[_S101].center_0, radius_6);
        }
        else
        {
            _S110 = false;
        }
        if(_S110)
        {
            place_0(records_0[_S101].batch_0, _S101, (((vec4<f32>(records_0[_S101].center_0, 1.0f)) * (_S103))).xyz, radius_6);
        }
        break;
    }
    return;
}

@compute
@workgroup_size(64, 1, 1)
fn cullInstancesOccluded(@builtin(global_invocation_id) gid_4 : vec3<u32>)
{
    var _S111 : u32 = gid_4.x + gid_4.y * WorkgroupCount_0().x * u32(64);
    loop
    {
        if((_S111 >= (params_0.instanceCount_0)))
        {
            break;
        }
        var _S112 : Instance_std430_0 = instanceTable_0[_S111];
        var _S113 : u32 = _S112.record_1;
        if((_S112.record_1) == u32(4294967295))
        {
            break;
        }
        var _S114 : Transform_std430_0 = transforms_0[records_0[_S113].transform_0];
        var local_1 : mat4x4<f32>;
        var radius_7 : f32;
        var _S115 : mat4x4<f32> = instanceMatrix_0(&(_S112), _S113, &(_S114), &(local_1), &(radius_7));
        var _S116 : u32 = _S112.feature_1;
        var shown_1 : bool;
        if((_S112.feature_1) != u32(4294967295))
        {
            shown_1 = (records_0[_S113].featureId_0) != u32(0);
        }
        else
        {
            shown_1 = false;
        }
        var feature_4 : u32;
        if(shown_1)
        {
            feature_4 = records_0[_S113].featureId_0 + _S116;
        }
        else
        {
            feature_4 = u32(0);
        }
        var item_4 : u32 = params_0.firstInstanceItem_0 + _S111;
        var _S117 : DrawItem_0 = drawItem_0(_S115, vec3<f32>(_S115[i32(0)][i32(3)], _S115[i32(1)][i32(3)], _S115[i32(2)][i32(3)]), _S113, feature_4, _S111 - records_0[_S113].instanceFirst_0, _S112.tint_1);
        var _S118 : array<vec4<f32>, i32(4)> = array<vec4<f32>, i32(4)>( vec4<f32>(_S117.relModel_0[i32(0)][i32(0)], _S117.relModel_0[i32(1)][i32(0)], _S117.relModel_0[i32(2)][i32(0)], _S117.relModel_0[i32(3)][i32(0)]), vec4<f32>(_S117.relModel_0[i32(0)][i32(1)], _S117.relModel_0[i32(1)][i32(1)], _S117.relModel_0[i32(2)][i32(1)], _S117.relModel_0[i32(3)][i32(1)]), vec4<f32>(_S117.relModel_0[i32(0)][i32(2)], _S117.relModel_0[i32(1)][i32(2)], _S117.relModel_0[i32(2)][i32(2)], _S117.relModel_0[i32(3)][i32(2)]), vec4<f32>(_S117.relModel_0[i32(0)][i32(3)], _S117.relModel_0[i32(1)][i32(3)], _S117.relModel_0[i32(2)][i32(3)], _S117.relModel_0[i32(3)][i32(3)]) );
        items_0[item_4].relModel_0.data_3 = _S118;
        items_0[item_4].drawn_0 = _S117.drawn_0;
        items_0[item_4].record_0 = _S117.record_0;
        items_0[item_4].feature_0 = _S117.feature_0;
        items_0[item_4].instance_0 = _S117.instance_0;
        items_0[item_4].tint_0 = _S117.tint_0;
        var _S119 : u32 = _S112.flags_3;
        if((((_S112.flags_3) & (u32(6)))) != u32(0))
        {
            var within_1 : bool = ((length((((vec4<f32>(records_0[_S113].center_0, 1.0f)) * (_S115))).xyz)) <= (unpack2x16float(((_S119 >> (u32(16))))).x));
            if(((_S119 & (u32(2)))) != u32(0))
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
        if(((_S119 & (u32(1)))) == u32(0))
        {
        }
        else
        {
            shown_1 = false;
        }
        if(shown_1)
        {
            var _S120 : bool = drawable_0(_S113, &(_S114));
            shown_1 = _S120;
        }
        else
        {
            shown_1 = false;
        }
        if(shown_1)
        {
            shown_1 = inFrustum_0(_S115, records_0[_S113].center_0, radius_7);
        }
        else
        {
            shown_1 = false;
        }
        if(shown_1)
        {
            place_0(records_0[_S113].batch_0, item_4, (((vec4<f32>(records_0[_S113].center_0, 1.0f)) * (_S115))).xyz, radius_7);
        }
        break;
    }
    return;
}

@compute
@workgroup_size(64, 1, 1)
fn writeDrawArgsOccluded(@builtin(global_invocation_id) gid_5 : vec3<u32>)
{
    var _S121 : u32 = gid_5.x;
    loop
    {
        if((_S121 >= (params_0.batchCount_0)))
        {
            break;
        }
        var batch_6 : Batch_std430_0 = batches_0[_S121];
        var a_6 : u32 = _S121 * u32(5);
        atomicStore(&(args_0[a_6]), batch_6.indexCount_1);
        atomicStore(&(args_0[a_6 + u32(2)]), batch_6.firstIndex_1);
        atomicStore(&(args_0[a_6 + u32(3)]), u32(0));
        atomicStore(&(args_0[a_6 + u32(4)]), u32(0));
        var a_7 : u32 = (occlusion_0.argumentRows_0 + _S121) * u32(5);
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
    var _S122 : u32 = atomicLoad(&(args_0[occlusion_0.counters_0]));
    if((k_1 >= (min(_S122, occlusion_0.itemRows_0))))
    {
        return;
    }
    var item_5 : u32 = itemList_0[u32(2) * occlusion_0.itemRows_0 + k_1];
    var radius_8 : f32;
    var r_0 : DrawRecord_0;
    var m_2 : mat4x4<f32>;
    if((itemList_0[u32(2) * occlusion_0.itemRows_0 + k_1] < (params_0.firstInstanceItem_0)))
    {
        var _S123 : DrawRecord_std430_0 = records_0[item_5];
        var _S124 : Transform_std430_0 = transforms_0[_S123.transform_0];
        var _S125 : mat4x4<f32> = recordMatrix_0(item_5, &(_S124), &(radius_8));
        r_0.center_0 = _S123.center_0;
        r_0.radius_0 = _S123.radius_0;
        r_0.color_0 = _S123.color_0;
        r_0.transform_0 = _S123.transform_0;
        r_0.flags_0 = _S123.flags_0;
        r_0.materialIndex_0 = _S123.materialIndex_0;
        r_0.indexCount_0 = _S123.indexCount_0;
        r_0.firstIndex_0 = _S123.firstIndex_0;
        r_0.featureId_0 = _S123.featureId_0;
        r_0.batch_0 = _S123.batch_0;
        r_0.positionOffset_0 = _S123.positionOffset_0;
        r_0.normalOffset_0 = _S123.normalOffset_0;
        r_0.uvOffset_0 = _S123.uvOffset_0;
        r_0.colorOffset_0 = _S123.colorOffset_0;
        r_0.tangentOffset_0 = _S123.tangentOffset_0;
        r_0.textureSet_0 = _S123.textureSet_0;
        r_0.imagerySlice_0 = _S123.imagerySlice_0;
        r_0.featureIdOffset_0 = _S123.featureIdOffset_0;
        r_0.viewMask_0 = _S123.viewMask_0;
        r_0.clipBlock_0 = _S123.clipBlock_0;
        r_0.placeholderMask_0 = _S123.placeholderMask_0;
        r_0.terrainClip_0 = _S123.terrainClip_0;
        r_0.instanceFirst_0 = _S123.instanceFirst_0;
        r_0.instanceCount_1 = _S123.instanceCount_1;
        r_0.instanceStreams_0 = _S123.instanceStreams_0;
        r_0.instanceStride_0 = _S123.instanceStride_0;
        r_0.lightsSlice_0 = _S123.lightsSlice_0;
        r_0.attributes_0 = _S123.attributes_0;
        r_0.instanceDirectory_0 = _S123.instanceDirectory_0;
        r_0.billboardSize_0 = _S123.billboardSize_0;
        r_0.billboardDepthTest_0 = _S123.billboardDepthTest_0;
        r_0.placement_0 = _S123.placement_0;
        r_0.skirtStart_0 = _S123.skirtStart_0;
        r_0.casterMask_0 = _S123.casterMask_0;
        r_0.debug_0 = _S123.debug_0;
        r_0.morph_0 = _S123.morph_0;
        r_0.imageryFrom_0 = _S123.imageryFrom_0;
        r_0.imageryFade_0 = _S123.imageryFade_0;
        m_2 = _S125;
    }
    else
    {
        var _S126 : Instance_std430_0 = instanceTable_0[min(item_5 - params_0.firstInstanceItem_0, params_0.instanceCount_0 - u32(1))];
        var _S127 : DrawRecord_std430_0 = records_0[_S126.record_1];
        var _S128 : Transform_std430_0 = transforms_0[_S127.transform_0];
        var local_2 : mat4x4<f32>;
        var _S129 : mat4x4<f32> = instanceMatrix_0(&(_S126), _S126.record_1, &(_S128), &(local_2), &(radius_8));
        r_0.center_0 = _S127.center_0;
        r_0.radius_0 = _S127.radius_0;
        r_0.color_0 = _S127.color_0;
        r_0.transform_0 = _S127.transform_0;
        r_0.flags_0 = _S127.flags_0;
        r_0.materialIndex_0 = _S127.materialIndex_0;
        r_0.indexCount_0 = _S127.indexCount_0;
        r_0.firstIndex_0 = _S127.firstIndex_0;
        r_0.featureId_0 = _S127.featureId_0;
        r_0.batch_0 = _S127.batch_0;
        r_0.positionOffset_0 = _S127.positionOffset_0;
        r_0.normalOffset_0 = _S127.normalOffset_0;
        r_0.uvOffset_0 = _S127.uvOffset_0;
        r_0.colorOffset_0 = _S127.colorOffset_0;
        r_0.tangentOffset_0 = _S127.tangentOffset_0;
        r_0.textureSet_0 = _S127.textureSet_0;
        r_0.imagerySlice_0 = _S127.imagerySlice_0;
        r_0.featureIdOffset_0 = _S127.featureIdOffset_0;
        r_0.viewMask_0 = _S127.viewMask_0;
        r_0.clipBlock_0 = _S127.clipBlock_0;
        r_0.placeholderMask_0 = _S127.placeholderMask_0;
        r_0.terrainClip_0 = _S127.terrainClip_0;
        r_0.instanceFirst_0 = _S127.instanceFirst_0;
        r_0.instanceCount_1 = _S127.instanceCount_1;
        r_0.instanceStreams_0 = _S127.instanceStreams_0;
        r_0.instanceStride_0 = _S127.instanceStride_0;
        r_0.lightsSlice_0 = _S127.lightsSlice_0;
        r_0.attributes_0 = _S127.attributes_0;
        r_0.instanceDirectory_0 = _S127.instanceDirectory_0;
        r_0.billboardSize_0 = _S127.billboardSize_0;
        r_0.billboardDepthTest_0 = _S127.billboardDepthTest_0;
        r_0.placement_0 = _S127.placement_0;
        r_0.skirtStart_0 = _S127.skirtStart_0;
        r_0.casterMask_0 = _S127.casterMask_0;
        r_0.debug_0 = _S127.debug_0;
        r_0.morph_0 = _S127.morph_0;
        r_0.imageryFrom_0 = _S127.imageryFrom_0;
        r_0.imageryFade_0 = _S127.imageryFade_0;
        m_2 = _S129;
    }
    var _S130 : DrawRecord_0 = r_0;
    if(sphereHidden_0((((vec4<f32>(r_0.center_0, 1.0f)) * (m_2))).xyz, radius_8, occlusion_0.right_0, occlusion_0.up_0, occlusion_0.forward_0, occlusion_0.lens_0, occlusion_0.shifts_0.zw))
    {
        return;
    }
    var _S131 : u32 = atomicAdd(&(args_0[occlusion_0.counters_0 + u32(2)]), u32(1));
    var _S132 : u32 = atomicAdd(&(args_0[occlusion_0.counters_0 + u32(3)]), trianglesOf_0(_S130.batch_0));
    var slot_1 : u32 = atomicAdd(&(args_0[(occlusion_0.argumentRows_0 + _S130.batch_0) * u32(5) + u32(1)]), u32(1));
    itemList_0[occlusion_0.itemRows_0 + batches_0[_S130.batch_0].itemBase_0 + slot_1] = item_5;
    return;
}

