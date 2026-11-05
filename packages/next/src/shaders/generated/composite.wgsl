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

@binding(2) @group(0) var momentsZero_0 : texture_2d<f32>;

@binding(3) @group(0) var accumulatedLit_0 : texture_2d<f32>;

@binding(4) @group(0) var accumulatedUnlit_0 : texture_2d<f32>;

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

struct CompositeOut_0
{
    @location(0) scene_0 : vec4<f32>,
    @location(1) display_0 : vec4<f32>,
};

@fragment
fn fsExact(@builtin(position) frag_0 : vec4<f32>) -> CompositeOut_0
{
    var i_1 : u32;
    var _S2 : bool;
    var next_0 : u32 = lists_0[u32(4) + (u32(frag_0.y) * translucency_0.width_0 + u32(frag_0.x))];
    if(next_0 == u32(0))
    {
        discard;
    }
    var depths_0 : array<f32, i32(32)>;
    var nodes_0 : array<u32, i32(32)>;
    var next_1 : u32 = next_0;
    var count_0 : u32 = u32(0);
    loop
    {
        if(next_1 != u32(0))
        {
        }
        else
        {
            break;
        }
        var node_0 : u32 = translucency_0.nodesBase_0 + (next_1 - u32(1)) * u32(4);
        var depth_0 : f32 = (bitcast<f32>((lists_0[node_0 + u32(2)])));
        var _S3 : u32 = lists_0[node_0 + u32(3)];
        if(count_0 == u32(32))
        {
            if((depth_0 <= (depths_0[u32(31)])))
            {
                next_1 = _S3;
                continue;
            }
            i_1 = u32(31);
        }
        else
        {
            var _S4 : u32 = count_0 + u32(1);
            i_1 = count_0;
            count_0 = _S4;
        }
        var i_2 : u32 = i_1;
        loop
        {
            if((i_2 > u32(0)))
            {
                _S2 = ((depths_0[i_2 - u32(1)]) < depth_0);
            }
            else
            {
                _S2 = false;
            }
            if(_S2)
            {
            }
            else
            {
                break;
            }
            var _S5 : u32 = i_2 - u32(1);
            depths_0[i_2] = depths_0[_S5];
            nodes_0[i_2] = nodes_0[_S5];
            i_2 = _S5;
        }
        depths_0[i_2] = depth_0;
        nodes_0[i_2] = node_0;
        next_1 = _S3;
    }
    var _S6 : vec3<f32> = vec3<f32>(0.0f);
    i_1 = u32(0);
    var through_0 : f32 = 1.0f;
    var unlit_0 : vec3<f32> = _S6;
    var lit_0 : vec3<f32> = _S6;
    loop
    {
        if((i_1 < count_0))
        {
            _S2 = (through_0 > 0.0010000000474974513f);
        }
        else
        {
            _S2 = false;
        }
        if(_S2)
        {
        }
        else
        {
            break;
        }
        var ba_0 : vec2<f32> = unpack2x16float(lists_0[nodes_0[i_1] + u32(1)]);
        var _S7 : f32 = ba_0.y;
        var alpha_0 : f32 = abs(_S7);
        var light_0 : vec3<f32> = vec3<f32>(unpack2x16float(lists_0[nodes_0[i_1]]), ba_0.x) * vec3<f32>((through_0 * alpha_0));
        if((_S7 < 0.0f))
        {
            unlit_0 = unlit_0 + light_0;
        }
        else
        {
            lit_0 = lit_0 + light_0;
        }
        var through_1 : f32 = through_0 * (1.0f - alpha_0);
        i_1 = i_1 + u32(1);
        through_0 = through_1;
    }
    var out_0 : CompositeOut_0;
    var _S8 : f32 = 1.0f - through_0;
    out_0.scene_0 = vec4<f32>(lit_0, _S8);
    out_0.display_0 = vec4<f32>(unlit_0, _S8);
    return out_0;
}

@fragment
fn fsMoments(@builtin(position) frag_1 : vec4<f32>) -> CompositeOut_0
{
    var p_0 : vec3<i32> = vec3<i32>(vec2<i32>(frag_1.xy), i32(0));
    var b0_0 : f32 = (textureLoad((momentsZero_0), ((p_0)).xy, ((p_0)).z)).x;
    if((b0_0 < 0.0010005002841353416f))
    {
        discard;
    }
    var lit_1 : vec4<f32> = (textureLoad((accumulatedLit_0), ((p_0)).xy, ((p_0)).z));
    var unlit_1 : vec4<f32> = (textureLoad((accumulatedUnlit_0), ((p_0)).xy, ((p_0)).z));
    var _S9 : f32 = lit_1.w;
    if(!(_S9 > 0.0f))
    {
        discard;
    }
    var opacity_0 : f32 = 1.0f - exp(- b0_0);
    var out_1 : CompositeOut_0;
    var _S10 : vec3<f32> = vec3<f32>((opacity_0 / _S9));
    out_1.scene_0 = vec4<f32>(lit_1.xyz * _S10, opacity_0);
    out_1.display_0 = vec4<f32>(unlit_1.xyz * _S10, opacity_0);
    return out_1;
}

