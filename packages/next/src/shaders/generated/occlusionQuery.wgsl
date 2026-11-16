// Generated from src/shaders/occlusionQuery.slang by slangc 2026.22
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

struct PyramidCamera_0
{
     width_1 : u32,
     height_1 : u32,
     levels_1 : u32,
     tanX_1 : f32,
     tanY_1 : f32,
     near_1 : f32,
     bias_1 : f32,
};

fn boxHidden_0( pyramid_1 : texture_2d<f32>,  camera_0 : PyramidCamera_0,  center_0 : vec3<f32>,  a_0 : vec3<f32>,  b_0 : vec3<f32>,  c_0 : vec3<f32>,  window_0 : u32) -> bool
{
    var frameWidth_0 : f32 = f32(camera_0.width_1);
    var frameHeight_0 : f32 = f32(camera_0.height_1);
    const _S1 : vec2<f32> = vec2<f32>(-3.39999995214436425e+38f, -3.39999995214436425e+38f);
    var low_0 : vec2<f32> = vec2<f32>(3.39999995214436425e+38f, 3.39999995214436425e+38f);
    var high_0 : vec2<f32> = _S1;
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
        var _S2 : vec3<f32>;
        if(((k_0 & (u32(1)))) == u32(0))
        {
            _S2 = (vec3<f32>(0) - a_0);
        }
        else
        {
            _S2 = a_0;
        }
        var _S3 : vec3<f32> = center_0 + _S2;
        var _S4 : vec3<f32>;
        if(((k_0 & (u32(2)))) == u32(0))
        {
            _S4 = (vec3<f32>(0) - b_0);
        }
        else
        {
            _S4 = b_0;
        }
        var _S5 : vec3<f32> = _S3 + _S4;
        var _S6 : vec3<f32>;
        if(((k_0 & (u32(4)))) == u32(0))
        {
            _S6 = (vec3<f32>(0) - c_0);
        }
        else
        {
            _S6 = c_0;
        }
        var p_0 : vec3<f32> = _S5 + _S6;
        var _S7 : f32 = p_0.z;
        if(!(_S7 > (camera_0.near_1)))
        {
            return false;
        }
        var inverse_0 : f32 = 1.0f / _S7;
        var screen_0 : vec2<f32> = vec2<f32>((p_0.x * inverse_0 / camera_0.tanX_1 * 0.5f + 0.5f) * frameWidth_0, (0.5f - p_0.y * inverse_0 / camera_0.tanY_1 * 0.5f) * frameHeight_0);
        var _S8 : vec2<f32> = min(low_0, screen_0);
        var _S9 : vec2<f32> = max(high_0, screen_0);
        var _S10 : f32 = min(nearestZ_0, _S7);
        var _S11 : u32 = k_0 + u32(1);
        low_0 = _S8;
        high_0 = _S9;
        nearestZ_0 = _S10;
        k_0 = _S11;
    }
    var _S12 : bool;
    if(!((high_0.x) >= 0.0f))
    {
        _S12 = true;
    }
    else
    {
        _S12 = !((high_0.y) >= 0.0f);
    }
    if(_S12)
    {
        _S12 = true;
    }
    else
    {
        _S12 = !((low_0.x) < frameWidth_0);
    }
    if(_S12)
    {
        _S12 = true;
    }
    else
    {
        _S12 = !((low_0.y) < frameHeight_0);
    }
    if(_S12)
    {
        return false;
    }
    const _S13 : vec2<f32> = vec2<f32>(0.0f, 0.0f);
    var _S14 : vec2<f32> = vec2<f32>(frameWidth_0 - 1.0f, frameHeight_0 - 1.0f);
    var _S15 : vec2<u32> = vec2<u32>(clamp(floor(low_0), _S13, _S14));
    var _S16 : vec2<u32> = vec2<u32>(clamp(floor(high_0), _S13, _S14));
    var _S17 : u32 = max(((camera_0.width_1) >> (u32(1))), u32(1));
    var _S18 : u32 = max(((camera_0.height_1) >> (u32(1))), u32(1));
    var _S19 : u32 = _S17 - u32(1);
    var _S20 : u32 = _S18 - u32(1);
    var span_0 : vec2<u32> = vec2<u32>(min(((_S16.x) >> (u32(1))), _S19), min(((_S16.y) >> (u32(1))), _S20)) - vec2<u32>(min(((_S15.x) >> (u32(1))), _S19), min(((_S15.y) >> (u32(1))), _S20));
    var _S21 : u32 = max(span_0.x, span_0.y) + u32(1);
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
        if((((((_S21 - u32(1)) >> (level_0))) + u32(2)) <= wide_0))
        {
            _S12 = true;
        }
        else
        {
            _S12 = ((level_0 + u32(1)) >= (camera_0.levels_1));
        }
        if(_S12)
        {
            break;
        }
        var _S22 : u32 = level_0 + u32(1);
        l_0 = l_0 + u32(1);
        level_0 = _S22;
    }
    var _S23 : vec2<u32> = vec2<u32>((level_0 + u32(1)));
    var _S24 : vec2<u32> = vec2<u32>(max((_S17 >> (level_0)), u32(1)), max((_S18 >> (level_0)), u32(1))) - vec2<u32>(u32(1));
    var _S25 : vec2<u32> = min((_S15 >> (_S23)), _S24);
    var _S26 : vec2<u32> = min((_S16 >> (_S23)), _S24);
    var _S27 : u32 = _S26.x;
    var _S28 : u32 = _S25.x;
    var _S29 : u32 = wide_0 - u32(1);
    if(((_S27 - _S28) > _S29))
    {
        _S12 = true;
    }
    else
    {
        _S12 = ((_S26.y - _S25.y) > _S29);
    }
    if(_S12)
    {
        return false;
    }
    var farthest_0 : f32 = 3.39999995214436425e+38f;
    var j_0 : u32 = u32(0);
    loop
    {
        if((j_0 < u32(8)))
        {
        }
        else
        {
            break;
        }
        var y_0 : u32 = _S25.y + j_0;
        if((y_0 > (_S26.y)))
        {
            break;
        }
        var i_0 : u32 = u32(0);
        loop
        {
            if((i_0 < u32(8)))
            {
            }
            else
            {
                break;
            }
            var x_0 : u32 = _S28 + i_0;
            if((x_0 > _S27))
            {
                break;
            }
            var _S30 : vec3<i32> = vec3<i32>(i32(x_0), i32(y_0), i32(level_0));
            var _S31 : f32 = min(farthest_0, (textureLoad((pyramid_1), ((_S30)).xy, ((_S30)).z).x));
            var _S32 : u32 = i_0 + u32(1);
            farthest_0 = _S31;
            i_0 = _S32;
        }
        j_0 = j_0 + u32(1);
    }
    return (farthest_0 > (camera_0.near_1 / nearestZ_0 * (1.0f + camera_0.bias_1)));
}

fn isHidden_0( q_0 : u32) -> bool
{
    var at_1 : u32 = q_0 * u32(12);
    var camera_1 : PyramidCamera_0;
    camera_1.width_1 = params_0.width_0;
    camera_1.height_1 = params_0.height_0;
    camera_1.levels_1 = params_0.levels_0;
    camera_1.tanX_1 = params_0.tanX_0;
    camera_1.tanY_1 = params_0.tanY_0;
    camera_1.near_1 = params_0.near_0;
    camera_1.bias_1 = params_0.bias_0;
    return boxHidden_0(pyramid_0, camera_1, vec_0(at_1), vec_0(at_1 + u32(3)), vec_0(at_1 + u32(6)), vec_0(at_1 + u32(9)), u32(2));
}

@compute
@workgroup_size(32, 1, 1)
fn main(@builtin(global_invocation_id) id_0 : vec3<u32>, @builtin(local_invocation_index) local_0 : u32, @builtin(workgroup_id) group_0 : vec3<u32>)
{
    var _S33 : bool = local_0 == u32(0);
    if(_S33)
    {
        atomicStore(&(word_0), u32(0));
    }
    workgroupBarrier();
    var _S34 : u32 = id_0.x;
    var _S35 : bool;
    if((_S34 < (min(params_0.count_0, u32(8192)))))
    {
        _S35 = isHidden_0(_S34);
    }
    else
    {
        _S35 = false;
    }
    if(_S35)
    {
        var _S36 : u32 = atomicOr(&(word_0), (u32(1) << (local_0)));
    }
    workgroupBarrier();
    if(_S33)
    {
        var _S37 : u32 = min(group_0.x, u32(255));
        var _S38 : u32 = atomicLoad(&(word_0));
        hidden_0[_S37] = _S38;
    }
    return;
}

