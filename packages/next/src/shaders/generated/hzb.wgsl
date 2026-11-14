// Generated from src/shaders/hzb.slang by slangc 2026.21
// (scripts/slangBuild.mjs). Do not edit: change the .slang and regenerate.
@binding(0) @group(0) var depth_0 : texture_depth_multisampled_2d;

@binding(1) @group(0) var target0_0 : texture_storage_2d<r32float, write>;

@binding(0) @group(0) var pixels_0 : texture_depth_2d;

@binding(0) @group(0) var source_0 : texture_2d<f32>;

@binding(1) @group(0) var target_0 : texture_storage_2d<r32float, write>;

fn blockOf_0( i_0 : u32,  inputSize_0 : u32,  outputSize_0 : u32) -> vec2<u32>
{
    var first_0 : u32 = i_0 * u32(2);
    var _S1 : u32 = first_0 + u32(1);
    var _S2 : bool;
    if((i_0 + u32(1)) == outputSize_0)
    {
        _S2 = ((inputSize_0 & (u32(1)))) == u32(1);
    }
    else
    {
        _S2 = false;
    }
    var last_0 : u32;
    if(_S2)
    {
        last_0 = first_0 + u32(2);
    }
    else
    {
        last_0 = _S1;
    }
    var _S3 : u32 = inputSize_0 - u32(1);
    return vec2<u32>(min(first_0, _S3), min(last_0, _S3));
}

fn farthestOf4_0( p_0 : vec2<i32>) -> f32
{
    return min(min((textureLoad((depth_0), (p_0), (i32(0)))), (textureLoad((depth_0), (p_0), (i32(1))))), min((textureLoad((depth_0), (p_0), (i32(2)))), (textureLoad((depth_0), (p_0), (i32(3))))));
}

@compute
@workgroup_size(8, 8, 1)
fn level0(@builtin(global_invocation_id) id_0 : vec3<u32>)
{
    var width_0 : u32;
    var height_0 : u32;
    var samples_0 : u32;
    {var dim = textureDimensions((depth_0));((width_0)) = dim.x;((height_0)) = dim.y;((samples_0)) = textureNumSamples((depth_0));};
    var outWidth_0 : u32;
    var outHeight_0 : u32;
    {var dim = textureDimensions((target0_0));((outWidth_0)) = dim.x;((outHeight_0)) = dim.y;};
    var _S4 : u32 = id_0.x;
    var _S5 : bool;
    if((_S4 >= outWidth_0))
    {
        _S5 = true;
    }
    else
    {
        _S5 = ((id_0.y) >= outHeight_0);
    }
    if(_S5)
    {
        return;
    }
    var bx_0 : vec2<u32> = blockOf_0(_S4, width_0, outWidth_0);
    var by_0 : vec2<u32> = blockOf_0(id_0.y, height_0, outHeight_0);
    if(samples_0 == u32(4))
    {
        _S5 = (bx_0.y) == (bx_0.x + u32(1));
    }
    else
    {
        _S5 = false;
    }
    if(_S5)
    {
        _S5 = (by_0.y) == (by_0.x + u32(1));
    }
    else
    {
        _S5 = false;
    }
    if(_S5)
    {
        var p_1 : vec2<i32> = vec2<i32>(i32(bx_0.x), i32(by_0.x));
        textureStore((target0_0), (id_0.xy), vec4<f32>((min(min(farthestOf4_0(p_1), farthestOf4_0(p_1 + vec2<i32>(i32(1), i32(0)))), min(farthestOf4_0(p_1 + vec2<i32>(i32(0), i32(1))), farthestOf4_0(p_1 + vec2<i32>(i32(1), i32(1)))))), 0, 0, 1));
        return;
    }
    var _S6 : u32 = min(samples_0, u32(8));
    var farthest_0 : f32 = 3.39999995214436425e+38f;
    var j_0 : u32 = u32(0);
    loop
    {
        if((j_0 < u32(3)))
        {
        }
        else
        {
            break;
        }
        var y_0 : u32 = by_0.x + j_0;
        if((y_0 > (by_0.y)))
        {
            break;
        }
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
            var x_0 : u32 = bx_0.x + i_1;
            if((x_0 > (bx_0.y)))
            {
                break;
            }
            var farthest_1 : f32 = farthest_0;
            var s_0 : u32 = u32(0);
            loop
            {
                if((s_0 < u32(8)))
                {
                }
                else
                {
                    break;
                }
                if((s_0 >= _S6))
                {
                    break;
                }
                var _S7 : f32 = min(farthest_1, (textureLoad((depth_0), (vec2<i32>(i32(x_0), i32(y_0))), (i32(s_0)))));
                var _S8 : u32 = s_0 + u32(1);
                farthest_1 = _S7;
                s_0 = _S8;
            }
            var _S9 : u32 = i_1 + u32(1);
            farthest_0 = farthest_1;
            i_1 = _S9;
        }
        j_0 = j_0 + u32(1);
    }
    textureStore((target0_0), (id_0.xy), vec4<f32>((farthest_0), 0, 0, 1));
    return;
}

@compute
@workgroup_size(8, 8, 1)
fn level0Pixels(@builtin(global_invocation_id) id_1 : vec3<u32>)
{
    var width_1 : u32;
    var height_1 : u32;
    {var dim = textureDimensions((pixels_0));((width_1)) = dim.x;((height_1)) = dim.y;};
    var outWidth_1 : u32;
    var outHeight_1 : u32;
    {var dim = textureDimensions((target0_0));((outWidth_1)) = dim.x;((outHeight_1)) = dim.y;};
    var _S10 : u32 = id_1.x;
    var _S11 : bool;
    if((_S10 >= outWidth_1))
    {
        _S11 = true;
    }
    else
    {
        _S11 = ((id_1.y) >= outHeight_1);
    }
    if(_S11)
    {
        return;
    }
    var bx_1 : vec2<u32> = blockOf_0(_S10, width_1, outWidth_1);
    var by_1 : vec2<u32> = blockOf_0(id_1.y, height_1, outHeight_1);
    var _S12 : u32 = bx_1.x;
    var _S13 : u32;
    if((_S12 > u32(0)))
    {
        _S13 = _S12 - u32(1);
    }
    else
    {
        _S13 = u32(0);
    }
    var _S14 : u32 = by_1.x;
    var _S15 : u32;
    if((_S14 > u32(0)))
    {
        _S15 = _S14 - u32(1);
    }
    else
    {
        _S15 = u32(0);
    }
    var _S16 : u32 = min(bx_1.y + u32(1), width_1 - u32(1));
    var _S17 : u32 = min(by_1.y + u32(1), height_1 - u32(1));
    var farthest_2 : f32 = 3.39999995214436425e+38f;
    var j_1 : u32 = u32(0);
    loop
    {
        if((j_1 < u32(5)))
        {
        }
        else
        {
            break;
        }
        var y_1 : u32 = _S15 + j_1;
        if((y_1 > _S17))
        {
            break;
        }
        var i_2 : u32 = u32(0);
        loop
        {
            if((i_2 < u32(5)))
            {
            }
            else
            {
                break;
            }
            var x_1 : u32 = _S13 + i_2;
            if((x_1 > _S16))
            {
                break;
            }
            var _S18 : vec3<i32> = vec3<i32>(i32(x_1), i32(y_1), i32(0));
            var _S19 : f32 = min(farthest_2, (textureLoad((pixels_0), ((_S18)).xy, ((_S18)).z)));
            var _S20 : u32 = i_2 + u32(1);
            farthest_2 = _S19;
            i_2 = _S20;
        }
        j_1 = j_1 + u32(1);
    }
    textureStore((target0_0), (id_1.xy), vec4<f32>((farthest_2), 0, 0, 1));
    return;
}

@compute
@workgroup_size(8, 8, 1)
fn reduce(@builtin(global_invocation_id) id_2 : vec3<u32>)
{
    var width_2 : u32;
    var height_2 : u32;
    var levels_0 : u32;
    {var dim = textureDimensions((source_0), (u32(0)));((width_2)) = dim.x;((height_2)) = dim.y;((levels_0)) = textureNumLevels((source_0));};
    var outWidth_2 : u32;
    var outHeight_2 : u32;
    {var dim = textureDimensions((target_0));((outWidth_2)) = dim.x;((outHeight_2)) = dim.y;};
    var _S21 : u32 = id_2.x;
    var _S22 : bool;
    if((_S21 >= outWidth_2))
    {
        _S22 = true;
    }
    else
    {
        _S22 = ((id_2.y) >= outHeight_2);
    }
    if(_S22)
    {
        return;
    }
    var _S23 : vec2<u32> = blockOf_0(_S21, width_2, outWidth_2);
    var _S24 : vec2<u32> = blockOf_0(id_2.y, height_2, outHeight_2);
    var farthest_3 : f32 = 3.39999995214436425e+38f;
    var j_2 : u32 = u32(0);
    loop
    {
        if((j_2 < u32(3)))
        {
        }
        else
        {
            break;
        }
        var y_2 : u32 = _S24.x + j_2;
        if((y_2 > (_S24.y)))
        {
            break;
        }
        var i_3 : u32 = u32(0);
        loop
        {
            if((i_3 < u32(3)))
            {
            }
            else
            {
                break;
            }
            var x_2 : u32 = _S23.x + i_3;
            if((x_2 > (_S23.y)))
            {
                break;
            }
            var _S25 : vec3<i32> = vec3<i32>(i32(x_2), i32(y_2), i32(0));
            var _S26 : f32 = min(farthest_3, (textureLoad((source_0), ((_S25)).xy, ((_S25)).z).x));
            var _S27 : u32 = i_3 + u32(1);
            farthest_3 = _S26;
            i_3 = _S27;
        }
        j_2 = j_2 + u32(1);
    }
    textureStore((target_0), (id_2.xy), vec4<f32>((farthest_3), 0, 0, 1));
    return;
}

