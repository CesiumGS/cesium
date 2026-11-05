// Generated from src/shaders/composite.slang by slangc 2026.21
// (scripts/slangBuild.mjs). Do not edit: change the .slang and regenerate.
struct TranslucentParams_std140_0
{
    @align(16) width_0 : u32,
    @align(4) height_0 : u32,
    @align(8) nodesBase_0 : u32,
    @align(4) capacity_0 : u32,
    @align(16) logNear_0 : f32,
    @align(4) invLogRange_0 : f32,
    @align(8) bias_0 : f32,
    @align(4) pad_0 : f32,
};

@binding(0) @group(0) var<uniform> translucency_0 : TranslucentParams_std140_0;
@binding(1) @group(0) var<storage, read> lists_0 : array<u32>;

@binding(5) @group(0) var sortedLit_0 : texture_storage_2d<rgba16float, write>;

@binding(6) @group(0) var sortedUnlit_0 : texture_storage_2d<rgba16float, write>;

@binding(3) @group(0) var accumulatedLit_0 : texture_2d<f32>;

@binding(4) @group(0) var accumulatedUnlit_0 : texture_2d<f32>;

@binding(2) @group(0) var momentsZero_0 : texture_2d<f32>;

struct vertexOutput_0
{
    @builtin(position) output_0 : vec4<f32>,
};

@vertex
fn vs(@builtin(vertex_index) i_0 : u32) -> vertexOutput_0
{
    var _S1 : vertexOutput_0 = vertexOutput_0( vec4<f32>(vec2<f32>(f32((((i_0 << (u32(1)))) & (u32(2)))), f32((i_0 & (u32(2))))) * vec2<f32>(2.0f) - vec2<f32>(1.0f), 0.0f, 1.0f) );
    return _S1;
}

fn slot_0( i_1 : u32,  lane_0 : u32) -> u32
{
    return i_1 * u32(32) + lane_0;
}

var<workgroup> sortDepths_0 : array<f32, i32(1024)>;

var<workgroup> sortNodes_0 : array<u32, i32(1024)>;

@compute
@workgroup_size(8, 4, 1)
fn sortLists(@builtin(global_invocation_id) id_0 : vec3<u32>, @builtin(local_invocation_index) lane_1 : u32)
{
    var i_2 : u32;
    var _S2 : u32 = id_0.x;
    var _S3 : bool;
    if((_S2 >= (translucency_0.width_0)))
    {
        _S3 = true;
    }
    else
    {
        _S3 = ((id_0.y) >= (translucency_0.height_0));
    }
    if(_S3)
    {
        return;
    }
    var next_0 : u32 = lists_0[u32(4) + id_0.y * translucency_0.width_0 + _S2];
    var count_0 : u32 = u32(0);
    loop
    {
        if(next_0 != u32(0))
        {
        }
        else
        {
            break;
        }
        var node_0 : u32 = translucency_0.nodesBase_0 + (next_0 - u32(1)) * u32(4);
        var depth_0 : f32 = (bitcast<f32>((lists_0[node_0 + u32(2)])));
        var _S4 : u32 = (lists_0[node_0 + u32(3)] & (u32(268435455)));
        if(count_0 == u32(32))
        {
            if((depth_0 <= (sortDepths_0[slot_0(u32(31), lane_1)])))
            {
                next_0 = _S4;
                continue;
            }
            i_2 = u32(31);
        }
        else
        {
            var _S5 : u32 = count_0 + u32(1);
            i_2 = count_0;
            count_0 = _S5;
        }
        var i_3 : u32 = i_2;
        loop
        {
            if((i_3 > u32(0)))
            {
                _S3 = ((sortDepths_0[slot_0(i_3 - u32(1), lane_1)]) < depth_0);
            }
            else
            {
                _S3 = false;
            }
            if(_S3)
            {
            }
            else
            {
                break;
            }
            var _S6 : u32 = i_3 - u32(1);
            var _S7 : u32 = slot_0(_S6, lane_1);
            sortDepths_0[slot_0(i_3, lane_1)] = sortDepths_0[_S7];
            sortNodes_0[slot_0(i_3, lane_1)] = sortNodes_0[_S7];
            i_3 = _S6;
        }
        sortDepths_0[slot_0(i_3, lane_1)] = depth_0;
        sortNodes_0[slot_0(i_3, lane_1)] = node_0;
        next_0 = _S4;
    }
    var lit_0 : array<vec3<f32>, i32(4)>;
    var unlit_0 : array<vec3<f32>, i32(4)>;
    var through_0 : vec4<f32> = vec4<f32>(1.0f);
    var _S8 : vec3<f32> = vec3<f32>(0.0f);
    lit_0[u32(0)] = _S8;
    unlit_0[u32(0)] = _S8;
    lit_0[u32(1)] = _S8;
    unlit_0[u32(1)] = _S8;
    lit_0[u32(2)] = _S8;
    unlit_0[u32(2)] = _S8;
    lit_0[u32(3)] = _S8;
    unlit_0[u32(3)] = _S8;
    i_2 = u32(0);
    loop
    {
        if((i_2 < count_0))
        {
            _S3 = (any(((through_0 > vec4<f32>(0.0010000000474974513f)))));
        }
        else
        {
            _S3 = false;
        }
        if(_S3)
        {
        }
        else
        {
            break;
        }
        var ba_0 : vec2<f32> = unpack2x16float(lists_0[sortNodes_0[slot_0(i_2, lane_1)] + u32(1)]);
        var _S9 : u32 = (lists_0[sortNodes_0[slot_0(i_2, lane_1)] + u32(3)] >> (u32(28)));
        var _S10 : f32 = ba_0.y;
        var alpha_0 : f32 = abs(_S10);
        var _S11 : vec3<f32> = vec3<f32>(unpack2x16float(lists_0[sortNodes_0[slot_0(i_2, lane_1)]]), ba_0.x) * vec3<f32>(alpha_0);
        if(((_S9 & (u32(1)))) != u32(0))
        {
            if((_S10 < 0.0f))
            {
                unlit_0[u32(0)] = unlit_0[u32(0)] + _S11 * vec3<f32>(through_0[u32(0)]);
            }
            else
            {
                lit_0[u32(0)] = lit_0[u32(0)] + _S11 * vec3<f32>(through_0[u32(0)]);
            }
            through_0[u32(0)] = through_0[u32(0)] * (1.0f - alpha_0);
        }
        if(((_S9 & (u32(2)))) != u32(0))
        {
            if((_S10 < 0.0f))
            {
                unlit_0[u32(1)] = unlit_0[u32(1)] + _S11 * vec3<f32>(through_0[u32(1)]);
            }
            else
            {
                lit_0[u32(1)] = lit_0[u32(1)] + _S11 * vec3<f32>(through_0[u32(1)]);
            }
            through_0[u32(1)] = through_0[u32(1)] * (1.0f - alpha_0);
        }
        if(((_S9 & (u32(4)))) != u32(0))
        {
            if((_S10 < 0.0f))
            {
                unlit_0[u32(2)] = unlit_0[u32(2)] + _S11 * vec3<f32>(through_0[u32(2)]);
            }
            else
            {
                lit_0[u32(2)] = lit_0[u32(2)] + _S11 * vec3<f32>(through_0[u32(2)]);
            }
            through_0[u32(2)] = through_0[u32(2)] * (1.0f - alpha_0);
        }
        if(((_S9 & (u32(8)))) != u32(0))
        {
            if((_S10 < 0.0f))
            {
                unlit_0[u32(3)] = unlit_0[u32(3)] + _S11 * vec3<f32>(through_0[u32(3)]);
            }
            else
            {
                lit_0[u32(3)] = lit_0[u32(3)] + _S11 * vec3<f32>(through_0[u32(3)]);
            }
            through_0[u32(3)] = through_0[u32(3)] * (1.0f - alpha_0);
        }
        i_2 = i_2 + u32(1);
    }
    var hidden_0 : f32 = 1.0f - dot(through_0, vec4<f32>(0.25f));
    var _S12 : vec3<f32> = vec3<f32>(4.0f);
    var unlitSum_0 : vec3<f32> = (unlit_0[i32(0)] + unlit_0[i32(1)] + unlit_0[i32(2)] + unlit_0[i32(3)]) / _S12;
    var _S13 : vec2<u32> = id_0.xy;
    textureStore((sortedLit_0), (_S13), (vec4<f32>((lit_0[i32(0)] + lit_0[i32(1)] + lit_0[i32(2)] + lit_0[i32(3)]) / _S12, hidden_0)));
    textureStore((sortedUnlit_0), (_S13), (vec4<f32>(unlitSum_0, hidden_0)));
    return;
}

struct CompositeOut_0
{
    @location(0) scene_0 : vec4<f32>,
    @location(1) display_0 : vec4<f32>,
};

@fragment
fn fsSorted(@builtin(position) frag_0 : vec4<f32>) -> CompositeOut_0
{
    var p_0 : vec3<i32> = vec3<i32>(vec2<i32>(frag_0.xy), i32(0));
    var lit_1 : vec4<f32> = (textureLoad((accumulatedLit_0), ((p_0)).xy, ((p_0)).z));
    if(!((lit_1.w) > 0.0f))
    {
        discard;
    }
    var out_0 : CompositeOut_0;
    out_0.scene_0 = lit_1;
    out_0.display_0 = (textureLoad((accumulatedUnlit_0), ((p_0)).xy, ((p_0)).z));
    return out_0;
}

@fragment
fn fsMoments(@builtin(position) frag_1 : vec4<f32>) -> CompositeOut_0
{
    var p_1 : vec3<i32> = vec3<i32>(vec2<i32>(frag_1.xy), i32(0));
    var b0_0 : f32 = (textureLoad((momentsZero_0), ((p_1)).xy, ((p_1)).z)).x;
    if((b0_0 < 0.0010005002841353416f))
    {
        discard;
    }
    var lit_2 : vec4<f32> = (textureLoad((accumulatedLit_0), ((p_1)).xy, ((p_1)).z));
    var unlit_1 : vec4<f32> = (textureLoad((accumulatedUnlit_0), ((p_1)).xy, ((p_1)).z));
    var _S14 : f32 = lit_2.w;
    if(!(_S14 > 0.0f))
    {
        discard;
    }
    var opacity_0 : f32 = 1.0f - exp(- b0_0);
    var out_1 : CompositeOut_0;
    var _S15 : vec3<f32> = vec3<f32>((opacity_0 / _S14));
    out_1.scene_0 = vec4<f32>(lit_2.xyz * _S15, opacity_0);
    out_1.display_0 = vec4<f32>(unlit_1.xyz * _S15, opacity_0);
    return out_1;
}

