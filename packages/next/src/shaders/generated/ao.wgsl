// Generated from src/shaders/ao.slang by slangc 2026.21
// (scripts/slangBuild.mjs). Do not edit: change the .slang and regenerate.
struct AoParams_std140_0
{
    @align(16) right_0 : vec4<f32>,
    @align(16) up_0 : vec4<f32>,
    @align(16) forward_0 : vec4<f32>,
    @align(16) size_0 : vec4<f32>,
};

@binding(0) @group(0) var<uniform> params_0 : AoParams_std140_0;
@binding(1) @group(0) var depthTexture_0 : texture_depth_2d;

@binding(3) @group(0) var rawAo_0 : texture_storage_2d<r32float, write>;

@binding(2) @group(0) var normalTexture_0 : texture_2d<f32>;

@binding(4) @group(0) var rawInput_0 : texture_2d<f32>;

@binding(5) @group(0) var<storage, read_write> aoWords_0 : array<u32>;

fn depthAt_0( p_0 : vec2<u32>) -> f32
{
    var _S1 : vec3<i32> = vec3<i32>(vec2<i32>(p_0), i32(0));
    return (textureLoad((depthTexture_0), ((_S1)).xy, ((_S1)).z));
}

fn distanceAt_0( depth_0 : f32,  near_0 : f32) -> f32
{
    return near_0 / max(depth_0, 1.00000000317107685e-30f);
}

fn positionAt_0( pixel_0 : vec2<f32>,  depth_1 : f32) -> vec3<f32>
{
    return (params_0.forward_0.xyz + params_0.right_0.xyz * vec3<f32>(((pixel_0.x / params_0.size_0.x * 2.0f - 1.0f) * params_0.right_0.w)) + params_0.up_0.xyz * vec3<f32>(((1.0f - pixel_0.y / params_0.size_0.y * 2.0f) * params_0.up_0.w))) * vec3<f32>(distanceAt_0(depth_1, params_0.forward_0.w));
}

fn noise_0( pixel_1 : vec2<f32>) -> f32
{
    return fract(52.982917785644531f * fract(dot(pixel_1, vec2<f32>(0.067110560834407806f, 0.0058371499180793762f))));
}

fn fastAcos_0( x_0 : f32) -> f32
{
    var a_0 : f32 = abs(x_0);
    var r_0 : f32 = (-0.15658299624919891f * a_0 + 1.5707963705062866f) * sqrt(max(1.0f - a_0, 0.0f));
    var _S2 : f32;
    if((x_0 >= 0.0f))
    {
        _S2 = r_0;
    }
    else
    {
        _S2 = 3.1415927410125732f - r_0;
    }
    return _S2;
}

@compute
@workgroup_size(8, 8, 1)
fn gtao(@builtin(global_invocation_id) id_0 : vec3<u32>)
{
    var _S3 : vec2<u32> = vec2<u32>(params_0.size_0.xy);
    var _S4 : vec2<u32> = id_0.xy;
    var full_0 : vec2<u32> = _S4 * vec2<u32>(u32(2));
    var _S5 : bool;
    if(((full_0.x) >= (_S3.x)))
    {
        _S5 = true;
    }
    else
    {
        _S5 = ((full_0.y) >= (_S3.y));
    }
    if(_S5)
    {
        return;
    }
    var depth_2 : f32 = depthAt_0(full_0);
    if((depth_2 <= 0.0f))
    {
        textureStore((rawAo_0), (_S4), vec4<f32>((1.0f), 0, 0, 1));
        return;
    }
    var _S6 : vec2<f32> = vec2<f32>(0.5f);
    var pixel_2 : vec2<f32> = vec2<f32>(full_0) + _S6;
    var center_0 : vec3<f32> = positionAt_0(pixel_2, depth_2);
    var _S7 : vec3<i32> = vec3<i32>(vec2<i32>(full_0), i32(0));
    var _S8 : vec3<f32> = normalize((textureLoad((normalTexture_0), ((_S7)).xy, ((_S7)).z)).xyz);
    var _S9 : vec3<f32> = normalize((vec3<f32>(0) - center_0));
    var radius_0 : f32 = params_0.size_0.z;
    var _S10 : f32 = min(radius_0 * (params_0.size_0.y * 0.5f / params_0.up_0.w) / distanceAt_0(depth_2, params_0.forward_0.w), params_0.size_0.w);
    if((_S10 < 1.0f))
    {
        textureStore((rawAo_0), (_S4), vec4<f32>((1.0f), 0, 0, 1));
        return;
    }
    var falloffRange_0 : f32 = 0.61500000953674316f * radius_0;
    var _S11 : f32 = -1.0f / falloffRange_0;
    var _S12 : f32 = radius_0 * 0.38499999046325684f / falloffRange_0 + 1.0f;
    var _S13 : f32 = noise_0(pixel_2);
    var _S14 : f32 = noise_0(pixel_2 + vec2<f32>(37.0f, 17.0f));
    var s_0 : u32 = u32(0);
    var visibility_0 : f32 = 0.0f;
    loop
    {
        if((s_0 < u32(2)))
        {
        }
        else
        {
            break;
        }
        var phi_0 : f32 = (f32(s_0) + _S13) / 2.0f * 3.1415927410125732f;
        var _S15 : f32 = cos(phi_0);
        var _S16 : f32 = sin(phi_0);
        var direction_0 : vec3<f32> = params_0.right_0.xyz * vec3<f32>(_S15) + params_0.up_0.xyz * vec3<f32>(_S16);
        var _S17 : vec2<f32> = vec2<f32>(_S15, - _S16);
        var ortho_0 : vec3<f32> = direction_0 - _S9 * vec3<f32>(dot(direction_0, _S9));
        var axis_0 : vec3<f32> = normalize(cross(ortho_0, _S9));
        var projected_0 : vec3<f32> = _S8 - axis_0 * vec3<f32>(dot(_S8, axis_0));
        var projectedLength_0 : f32 = length(projected_0);
        if((projectedLength_0 < 9.9999997473787516e-05f))
        {
            visibility_0 = visibility_0 + 1.0f;
            s_0 = s_0 + u32(1);
            continue;
        }
        var cosN_0 : f32 = clamp(dot(projected_0, _S9) / projectedLength_0, -1.0f, 1.0f);
        var n_0 : f32 = f32((i32(sign((dot(ortho_0, projected_0)))))) * fastAcos_0(cosN_0);
        var low0_0 : f32 = cos(n_0 + 1.5707963705062866f);
        var low1_0 : f32 = cos(n_0 - 1.5707963705062866f);
        var horizon0_0 : f32 = low0_0;
        var horizon1_0 : f32 = low1_0;
        var k_0 : u32 = u32(0);
        loop
        {
            if((k_0 < u32(6)))
            {
            }
            else
            {
                break;
            }
            var t_0 : f32 = (f32(k_0) + _S14) / 6.0f;
            var offset_0 : vec2<f32> = _S17 * vec2<f32>(max(t_0 * t_0 * _S10, 1.0f));
            var p0_0 : vec2<f32> = pixel_2 + offset_0;
            var p1_0 : vec2<f32> = pixel_2 - offset_0;
            var _S18 : vec2<f32> = vec2<f32>(0.0f);
            if((all(((p0_0 >= _S18)))))
            {
                _S5 = (all(((p0_0 < (params_0.size_0.xy)))));
            }
            else
            {
                _S5 = false;
            }
            var horizon1_1 : f32;
            if(_S5)
            {
                var d0_0 : f32 = depthAt_0(vec2<u32>(p0_0));
                if((d0_0 > 0.0f))
                {
                    var delta_0 : vec3<f32> = positionAt_0(floor(p0_0) + _S6, d0_0) - center_0;
                    var distance_0 : f32 = length(delta_0);
                    horizon1_1 = max(horizon0_0, mix(low0_0, dot(delta_0 / vec3<f32>(distance_0), _S9), clamp(distance_0 * _S11 + _S12, 0.0f, 1.0f)));
                }
                else
                {
                    horizon1_1 = horizon0_0;
                }
                horizon0_0 = horizon1_1;
            }
            var _S19 : bool;
            if((all(((p1_0 >= _S18)))))
            {
                _S19 = (all(((p1_0 < (params_0.size_0.xy)))));
            }
            else
            {
                _S19 = false;
            }
            if(_S19)
            {
                var d1_0 : f32 = depthAt_0(vec2<u32>(p1_0));
                if((d1_0 > 0.0f))
                {
                    var delta_1 : vec3<f32> = positionAt_0(floor(p1_0) + _S6, d1_0) - center_0;
                    var distance_1 : f32 = length(delta_1);
                    horizon1_1 = max(horizon1_0, mix(low1_0, dot(delta_1 / vec3<f32>(distance_1), _S9), clamp(distance_1 * _S11 + _S12, 0.0f, 1.0f)));
                }
                else
                {
                    horizon1_1 = horizon1_0;
                }
                horizon1_0 = horizon1_1;
            }
            k_0 = k_0 + u32(1);
        }
        var sinN_0 : f32 = sin(n_0);
        var _S20 : f32 = 2.0f * (n_0 + clamp(- fastAcos_0(horizon1_0) - n_0, -1.5707963705062866f, 1.5707963705062866f));
        var _S21 : f32 = 2.0f * (n_0 + clamp(fastAcos_0(horizon0_0) - n_0, -1.5707963705062866f, 1.5707963705062866f));
        visibility_0 = visibility_0 + projectedLength_0 * ((cosN_0 + _S20 * sinN_0 - cos(_S20 - n_0)) * 0.25f + (cosN_0 + _S21 * sinN_0 - cos(_S21 - n_0)) * 0.25f);
        s_0 = s_0 + u32(1);
    }
    textureStore((rawAo_0), (_S4), vec4<f32>((clamp(visibility_0 / 2.0f, 0.0f, 1.0f)), 0, 0, 1));
    return;
}

var<workgroup> tileDistance_0 : array<array<f32, i32(18)>, i32(6)>;

var<workgroup> tileAo_0 : array<array<f32, i32(18)>, i32(6)>;

@compute
@workgroup_size(8, 8, 1)
fn denoise(@builtin(global_invocation_id) id_1 : vec3<u32>, @builtin(workgroup_id) group_0 : vec3<u32>, @builtin(local_invocation_index) lane_0 : u32)
{
    var ao_0 : f32;
    var _S22 : vec2<i32> = vec2<i32>(params_0.size_0.xy);
    var _S23 : vec2<i32> = vec2<i32>(i32(1));
    var _S24 : vec2<i32> = vec2<i32>(i32(2));
    var _S25 : vec2<i32> = (_S22 + _S23) / _S24;
    var _S26 : vec2<i32> = vec2<i32>(group_0.xy) * vec2<i32>(i32(16), i32(4)) - _S23;
    var t_1 : u32 = lane_0;
    loop
    {
        if((t_1 < u32(108)))
        {
        }
        else
        {
            break;
        }
        var _S27 : i32 = i32(t_1);
        var _S28 : i32 = _S27 % i32(18);
        var _S29 : i32 = _S27 / i32(18);
        var q_0 : vec2<i32> = clamp(_S26 + vec2<i32>(_S28, _S29), vec2<i32>(i32(0)), _S25 - _S23);
        var _S30 : vec3<i32> = vec3<i32>(min(q_0 * _S24, _S22 - _S23), i32(0));
        var d_0 : f32 = (textureLoad((depthTexture_0), ((_S30)).xy, ((_S30)).z));
        if((d_0 > 0.0f))
        {
            ao_0 = params_0.forward_0.w / max(d_0, 1.00000000317107685e-30f);
        }
        else
        {
            ao_0 = -1.0f;
        }
        tileDistance_0[_S29][_S28] = ao_0;
        var _S31 : vec3<i32> = vec3<i32>(q_0, i32(0));
        tileAo_0[_S29][_S28] = (textureLoad((rawInput_0), ((_S31)).xy, ((_S31)).z).x);
        t_1 = t_1 + u32(64);
    }
    workgroupBarrier();
    var _S32 : i32 = _S22.x;
    var words_0 : i32 = (_S32 + i32(3)) / i32(4);
    var _S33 : u32 = id_1.x;
    var _S34 : i32 = i32(_S33);
    var _S35 : bool;
    if((_S34 >= words_0))
    {
        _S35 = true;
    }
    else
    {
        _S35 = (i32(id_1.y) >= (_S22.y));
    }
    if(_S35)
    {
        return;
    }
    var i_0 : i32 = i32(0);
    var packed_0 : u32 = u32(0);
    loop
    {
        if((i_0 < i32(4)))
        {
        }
        else
        {
            break;
        }
        var _S36 : i32 = _S34 * i32(4) + i_0;
        var p_1 : vec2<i32> = vec2<i32>(_S36, i32(id_1.y));
        if((_S36 < _S32))
        {
            var _S37 : vec3<i32> = vec3<i32>(p_1, i32(0));
            var depth_3 : f32 = (textureLoad((depthTexture_0), ((_S37)).xy, ((_S37)).z));
            if((depth_3 > 0.0f))
            {
                var _S38 : f32 = params_0.forward_0.w / depth_3;
                var _S39 : vec2<i32> = p_1 / _S24;
                var _S40 : vec2<i32> = _S39 - _S26;
                var dy_0 : i32 = i32(-1);
                ao_0 = 0.0f;
                var total_0 : f32 = 0.0f;
                loop
                {
                    if((dy_0 <= i32(1)))
                    {
                    }
                    else
                    {
                        break;
                    }
                    var dx_0 : i32 = i32(-1);
                    loop
                    {
                        if((dx_0 <= i32(1)))
                        {
                        }
                        else
                        {
                            break;
                        }
                        var at_0 : vec2<i32> = _S40 + vec2<i32>(dx_0, dy_0);
                        var _S41 : i32 = at_0.y;
                        var _S42 : i32 = at_0.x;
                        var other_0 : f32 = tileDistance_0[_S41][_S42];
                        var w_0 : f32;
                        if(((tileDistance_0[_S41][_S42]) >= 0.0f))
                        {
                            w_0 = 1.0f / (1.0f + 50.0f * abs(other_0 - _S38) / _S38);
                        }
                        else
                        {
                            w_0 = 0.0f;
                        }
                        var sum_0 : f32 = ao_0 + tileAo_0[_S41][_S42] * w_0;
                        var total_1 : f32 = total_0 + w_0;
                        dx_0 = dx_0 + i32(1);
                        ao_0 = sum_0;
                        total_0 = total_1;
                    }
                    dy_0 = dy_0 + i32(1);
                }
                ao_0 = ao_0 / max(total_0, 9.99999997475242708e-07f);
            }
            else
            {
                ao_0 = 1.0f;
            }
        }
        else
        {
            ao_0 = 1.0f;
        }
        var packed_1 : u32 = (packed_0 | (((u32(round(clamp(ao_0, 0.0f, 1.0f) * 255.0f)) << ((u32(8) * u32(i_0)))))));
        i_0 = i_0 + i32(1);
        packed_0 = packed_1;
    }
    aoWords_0[id_1.y * u32(words_0) + _S33] = packed_0;
    return;
}

