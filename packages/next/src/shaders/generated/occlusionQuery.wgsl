// Generated from src/shaders/occlusionQuery.slang by slangc 2026.21
// (scripts/slangBuild.mjs). Do not edit: change the .slang and regenerate.
struct QueryParams_std140_0
{
    @align(16) count_0 : u32,
    @align(4) width_0 : u32,
    @align(8) height_0 : u32,
    @align(4) levels_0 : u32,
    @align(16) tanX_0 : f32,
    @align(4) tanY_0 : f32,
    @align(8) near_0 : f32,
    @align(4) bias_0 : f32,
};

@binding(0) @group(0) var<uniform> params_0 : QueryParams_std140_0;
@binding(2) @group(0) var<storage, read> queries_0 : array<f32>;

@binding(1) @group(0) var pyramid_0 : texture_2d<f32>;

@binding(3) @group(0) var<storage, read_write> hidden_0 : array<u32>;

var<workgroup> word_0 : atomic<u32>;

fn vec_0( at_0 : u32) -> vec3<f32>
{
    return vec3<f32>(queries_0[at_0], queries_0[at_0 + u32(1)], queries_0[at_0 + u32(2)]);
}

fn isHidden_0( q_0 : u32) -> bool
{
    var at_1 : u32 = q_0 * u32(12);
    var _S1 : vec3<f32> = vec_0(at_1);
    var _S2 : vec3<f32> = vec_0(at_1 + u32(3));
    var _S3 : vec3<f32> = vec_0(at_1 + u32(6));
    var _S4 : vec3<f32> = vec_0(at_1 + u32(9));
    var frameWidth_0 : f32 = f32(params_0.width_0);
    var frameHeight_0 : f32 = f32(params_0.height_0);
    const _S5 : vec2<f32> = vec2<f32>(-3.39999995214436425e+38f, -3.39999995214436425e+38f);
    var low_0 : vec2<f32> = vec2<f32>(3.39999995214436425e+38f, 3.39999995214436425e+38f);
    var high_0 : vec2<f32> = _S5;
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
        var _S6 : vec3<f32>;
        if(((k_0 & (u32(1)))) == u32(0))
        {
            _S6 = (vec3<f32>(0) - _S2);
        }
        else
        {
            _S6 = _S2;
        }
        var _S7 : vec3<f32> = _S1 + _S6;
        var _S8 : vec3<f32>;
        if(((k_0 & (u32(2)))) == u32(0))
        {
            _S8 = (vec3<f32>(0) - _S3);
        }
        else
        {
            _S8 = _S3;
        }
        var _S9 : vec3<f32> = _S7 + _S8;
        var _S10 : vec3<f32>;
        if(((k_0 & (u32(4)))) == u32(0))
        {
            _S10 = (vec3<f32>(0) - _S4);
        }
        else
        {
            _S10 = _S4;
        }
        var p_0 : vec3<f32> = _S9 + _S10;
        var _S11 : f32 = p_0.z;
        if(!(_S11 > (params_0.near_0)))
        {
            return false;
        }
        var inverse_0 : f32 = 1.0f / _S11;
        var screen_0 : vec2<f32> = vec2<f32>((p_0.x * inverse_0 / params_0.tanX_0 * 0.5f + 0.5f) * frameWidth_0, (0.5f - p_0.y * inverse_0 / params_0.tanY_0 * 0.5f) * frameHeight_0);
        var _S12 : vec2<f32> = min(low_0, screen_0);
        var _S13 : vec2<f32> = max(high_0, screen_0);
        var _S14 : f32 = min(nearestZ_0, _S11);
        var _S15 : u32 = k_0 + u32(1);
        low_0 = _S12;
        high_0 = _S13;
        nearestZ_0 = _S14;
        k_0 = _S15;
    }
    var _S16 : bool;
    if(!((high_0.x) >= 0.0f))
    {
        _S16 = true;
    }
    else
    {
        _S16 = !((high_0.y) >= 0.0f);
    }
    if(_S16)
    {
        _S16 = true;
    }
    else
    {
        _S16 = !((low_0.x) < frameWidth_0);
    }
    if(_S16)
    {
        _S16 = true;
    }
    else
    {
        _S16 = !((low_0.y) < frameHeight_0);
    }
    if(_S16)
    {
        return false;
    }
    const _S17 : vec2<f32> = vec2<f32>(0.0f, 0.0f);
    var _S18 : vec2<f32> = vec2<f32>(frameWidth_0 - 1.0f, frameHeight_0 - 1.0f);
    var _S19 : vec2<u32> = vec2<u32>(clamp(floor(low_0), _S17, _S18));
    var _S20 : vec2<u32> = vec2<u32>(clamp(floor(high_0), _S17, _S18));
    var _S21 : u32 = max(((params_0.width_0) >> (u32(1))), u32(1));
    var _S22 : u32 = max(((params_0.height_0) >> (u32(1))), u32(1));
    var _S23 : u32 = _S21 - u32(1);
    var _S24 : u32 = _S22 - u32(1);
    var span_0 : vec2<u32> = vec2<u32>(min(((_S20.x) >> (u32(1))), _S23), min(((_S20.y) >> (u32(1))), _S24)) - vec2<u32>(min(((_S19.x) >> (u32(1))), _S23), min(((_S19.y) >> (u32(1))), _S24));
    var _S25 : u32 = max(span_0.x, span_0.y) + u32(1);
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
        if((((u32(1) << (level_0))) >= _S25))
        {
            _S16 = true;
        }
        else
        {
            _S16 = ((level_0 + u32(1)) >= (params_0.levels_0));
        }
        if(_S16)
        {
            break;
        }
        var _S26 : u32 = level_0 + u32(1);
        l_0 = l_0 + u32(1);
        level_0 = _S26;
    }
    var _S27 : vec2<u32> = vec2<u32>((level_0 + u32(1)));
    var _S28 : vec2<u32> = vec2<u32>(max((_S21 >> (level_0)), u32(1)), max((_S22 >> (level_0)), u32(1))) - vec2<u32>(u32(1));
    var _S29 : vec2<u32> = min((_S19 >> (_S27)), _S28);
    var _S30 : vec2<u32> = min((_S20 >> (_S27)), _S28);
    var _S31 : u32 = _S30.x;
    var _S32 : u32 = _S29.x;
    if(((_S31 - _S32) > u32(1)))
    {
        _S16 = true;
    }
    else
    {
        _S16 = ((_S30.y - _S29.y) > u32(1));
    }
    if(_S16)
    {
        return false;
    }
    var farthest_0 : f32 = 3.39999995214436425e+38f;
    var j_0 : u32 = u32(0);
    loop
    {
        if((j_0 < u32(2)))
        {
        }
        else
        {
            break;
        }
        var y_0 : u32 = _S29.y + j_0;
        if((y_0 > (_S30.y)))
        {
            break;
        }
        var i_0 : u32 = u32(0);
        loop
        {
            if((i_0 < u32(2)))
            {
            }
            else
            {
                break;
            }
            var x_0 : u32 = _S32 + i_0;
            if((x_0 > _S31))
            {
                break;
            }
            var _S33 : vec3<i32> = vec3<i32>(i32(x_0), i32(y_0), i32(level_0));
            var _S34 : f32 = min(farthest_0, (textureLoad((pyramid_0), ((_S33)).xy, ((_S33)).z).x));
            var _S35 : u32 = i_0 + u32(1);
            farthest_0 = _S34;
            i_0 = _S35;
        }
        j_0 = j_0 + u32(1);
    }
    return (farthest_0 > (params_0.near_0 / nearestZ_0 * (1.0f + params_0.bias_0)));
}

@compute
@workgroup_size(32, 1, 1)
fn main(@builtin(global_invocation_id) id_0 : vec3<u32>, @builtin(local_invocation_index) local_0 : u32, @builtin(workgroup_id) group_0 : vec3<u32>)
{
    var _S36 : bool = local_0 == u32(0);
    if(_S36)
    {
        atomicStore(&(word_0), u32(0));
    }
    workgroupBarrier();
    var _S37 : u32 = id_0.x;
    var _S38 : bool;
    if((_S37 < (min(params_0.count_0, u32(8192)))))
    {
        _S38 = isHidden_0(_S37);
    }
    else
    {
        _S38 = false;
    }
    if(_S38)
    {
        var _S39 : u32 = atomicOr(&(word_0), (u32(1) << (local_0)));
    }
    workgroupBarrier();
    if(_S36)
    {
        var _S40 : u32 = min(group_0.x, u32(255));
        var _S41 : u32 = atomicLoad(&(word_0));
        hidden_0[_S40] = _S41;
    }
    return;
}

