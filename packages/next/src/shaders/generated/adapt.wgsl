// Generated from src/shaders/adapt.slang by slangc 2026.21
// (scripts/slangBuild.mjs). Do not edit: change the .slang and regenerate.
@binding(2) @group(0) var grid_0 : texture_storage_3d<rgba16float, write>;

@binding(0) @group(0) var image_0 : texture_2d<f32>;

struct AdaptParams_std140_0
{
    @align(16) exposure_0 : f32,
    @align(4) cones_0 : f32,
    @align(8) pad0_0 : f32,
    @align(4) pad1_0 : f32,
};

@binding(1) @group(0) var<uniform> params_0 : AdaptParams_std140_0;
@binding(4) @group(0) var blurred_0 : texture_storage_3d<rgba16float, write>;

@binding(3) @group(0) var gridIn_0 : texture_3d<f32>;

const WEIGHTS_0 : array<f32, i32(4)> = array<f32, i32(4)>( 1.0f, 0.88249689340591431f, 0.60653072595596313f, 0.32465249300003052f );
var<workgroup> samples_0 : array<vec3<f32>, i32(64)>;

var<workgroup> levels_0 : array<u32, i32(64)>;

fn level_0( logY_0 : f32) -> u32
{
    return u32(clamp((logY_0 - (params_0.cones_0 / 0.30103000998497009f - 12.0f)) / 24.0f * 16.0f, 0.0f, 15.0f));
}

@compute
@workgroup_size(8, 8, 1)
fn reduce(@builtin(workgroup_id) cell_0 : vec3<u32>, @builtin(local_invocation_id) pixel_0 : vec3<u32>, @builtin(local_invocation_index) lane_0 : u32)
{
    var size_0 : vec3<u32>;
    var _S1 : u32 = size_0[i32(0)];
    var _S2 : u32 = size_0[i32(1)];
    var _S3 : u32 = size_0[i32(2)];
    {var dim = textureDimensions((grid_0));((_S1)) = dim.x;((_S2)) = dim.y;((_S3)) = dim.z;};
    size_0[i32(0)] = _S1;
    size_0[i32(1)] = _S2;
    size_0[i32(2)] = _S3;
    var inGrid_0 : bool;
    if(((cell_0.x) < (size_0.x)))
    {
        inGrid_0 = ((cell_0.y) < (size_0.y));
    }
    else
    {
        inGrid_0 = false;
    }
    var imageSize_0 : vec2<u32>;
    var _S4 : u32 = imageSize_0[i32(0)];
    var _S5 : u32 = imageSize_0[i32(1)];
    {var dim = textureDimensions((image_0));((_S4)) = dim.x;((_S5)) = dim.y;};
    imageSize_0[i32(0)] = _S4;
    imageSize_0[i32(1)] = _S5;
    var _S6 : vec2<u32> = cell_0.xy;
    var _S7 : vec2<u32> = vec2<u32>(u32(1));
    var _S8 : vec3<i32> = vec3<i32>(vec2<i32>(min(_S6 * vec2<u32>(u32(16)) + pixel_0.xy * vec2<u32>(u32(2)) + _S7, imageSize_0 - _S7)), i32(0));
    var _S9 : vec3<f32> = vec3<f32>(0.0f);
    var light_0 : vec3<f32> = max((textureLoad((image_0), ((_S8)).xy, ((_S8)).z)).xyz, _S9) / vec3<f32>(params_0.exposure_0);
    var y_0 : f32 = dot(light_0, vec3<f32>(0.2125999927520752f, 0.71520000696182251f, 0.072200000286102295f));
    var logs_0 : vec2<f32> = log2(max(vec2<f32>(y_0, max(y_0 * (1.3300000429153442f * (1.0f + (y_0 + dot(light_0, vec3<f32>(0.019300000742077827f, 0.11919999867677689f, 0.9505000114440918f))) / max(dot(light_0, vec3<f32>(0.4124000072479248f, 0.35760000348091125f, 0.18050000071525574f)), 9.999999960041972e-13f)) - 1.6799999475479126f), 0.0f)), vec2<f32>(1.00000001168609742e-07f)));
    samples_0[lane_0] = vec3<f32>(logs_0, 1.0f) / vec3<f32>(64.0f);
    levels_0[lane_0] = level_0(logs_0.x);
    workgroupBarrier();
    if(!inGrid_0)
    {
        inGrid_0 = true;
    }
    else
    {
        inGrid_0 = (lane_0 >= u32(16));
    }
    if(inGrid_0)
    {
        return;
    }
    var k_0 : u32 = u32(0);
    var sum_0 : vec3<f32> = _S9;
    loop
    {
        if((k_0 < u32(64)))
        {
        }
        else
        {
            break;
        }
        if((levels_0[k_0]) == lane_0)
        {
            sum_0 = sum_0 + samples_0[k_0];
        }
        k_0 = k_0 + u32(1);
    }
    textureStore((grid_0), (vec3<u32>(_S6, lane_0)), (vec4<f32>(sum_0, 1.0f)));
    return;
}

var<workgroup> gathered_0 : array<array<vec3<f32>, i32(14)>, i32(14)>;

var<workgroup> across_0 : array<array<vec3<f32>, i32(8)>, i32(14)>;

@compute
@workgroup_size(8, 8, 1)
fn blur(@builtin(global_invocation_id) id_0 : vec3<u32>, @builtin(local_invocation_id) local_0 : vec3<u32>, @builtin(local_invocation_index) lane_1 : u32)
{
    var sum_1 : vec3<f32>;
    var d_0 : i32;
    var size_1 : vec3<u32>;
    var _S10 : u32 = size_1[i32(0)];
    var _S11 : u32 = size_1[i32(1)];
    var _S12 : u32 = size_1[i32(2)];
    {var dim = textureDimensions((blurred_0));((_S10)) = dim.x;((_S11)) = dim.y;((_S12)) = dim.z;};
    size_1[i32(0)] = _S10;
    size_1[i32(1)] = _S11;
    size_1[i32(2)] = _S12;
    var _S13 : vec2<i32> = vec2<i32>(id_0.xy - local_0.xy) - vec2<i32>(i32(3));
    var _S14 : i32 = i32(id_0.z);
    var t_0 : u32 = lane_1;
    loop
    {
        if((t_0 < u32(196)))
        {
        }
        else
        {
            break;
        }
        var _S15 : i32 = i32(t_0);
        var _S16 : i32 = _S15 % i32(14);
        var _S17 : i32 = _S15 / i32(14);
        var p_0 : vec2<i32> = _S13 + vec2<i32>(_S16, _S17);
        var _S18 : vec3<f32> = vec3<f32>(0.0f);
        var _S19 : bool;
        if((all(((p_0 >= vec2<i32>(i32(0)))))))
        {
            _S19 = (all(((p_0 < vec2<i32>(size_1.xy)))));
        }
        else
        {
            _S19 = false;
        }
        if(_S19)
        {
            var _S20 : vec4<i32> = vec4<i32>(p_0, _S14, i32(0));
            var sum_2 : vec3<f32> = (textureLoad((gridIn_0), ((_S20)).xyz, ((_S20)).w)).xyz;
            if((_S14 > i32(0)))
            {
                var _S21 : vec4<i32> = vec4<i32>(p_0, _S14 - i32(1), i32(0));
                sum_1 = sum_2 + (textureLoad((gridIn_0), ((_S21)).xyz, ((_S21)).w)).xyz * vec3<f32>(0.5f);
            }
            else
            {
                sum_1 = sum_2;
            }
            var _S22 : i32 = _S14 + i32(1);
            var sum_3 : vec3<f32>;
            if((_S22 < i32(size_1.z)))
            {
                var _S23 : vec4<i32> = vec4<i32>(p_0, _S22, i32(0));
                sum_3 = sum_1 + (textureLoad((gridIn_0), ((_S23)).xyz, ((_S23)).w)).xyz * vec3<f32>(0.5f);
            }
            else
            {
                sum_3 = sum_1;
            }
            sum_1 = sum_3;
        }
        else
        {
            sum_1 = _S18;
        }
        gathered_0[_S17][_S16] = sum_1;
        t_0 = t_0 + u32(64);
    }
    workgroupBarrier();
    t_0 = lane_1;
    loop
    {
        if((t_0 < u32(112)))
        {
        }
        else
        {
            break;
        }
        var x_0 : u32 = t_0 % u32(8);
        var y_1 : u32 = t_0 / u32(8);
        var _S24 : u32 = x_0 + u32(3);
        d_0 = i32(1);
        sum_1 = gathered_0[y_1][_S24];
        loop
        {
            if((d_0 <= i32(3)))
            {
            }
            else
            {
                break;
            }
            var _S25 : u32 = u32(d_0);
            var sum_4 : vec3<f32> = sum_1 + (gathered_0[y_1][_S24 - _S25] + gathered_0[y_1][_S24 + _S25]) * vec3<f32>(WEIGHTS_0[d_0]);
            d_0 = d_0 + i32(1);
            sum_1 = sum_4;
        }
        across_0[y_1][x_0] = sum_1;
        t_0 = t_0 + u32(64);
    }
    workgroupBarrier();
    if((any(((id_0 >= size_1)))))
    {
        return;
    }
    var _S26 : u32 = local_0.y + u32(3);
    var _S27 : u32 = local_0.x;
    d_0 = i32(1);
    sum_1 = across_0[_S26][_S27];
    loop
    {
        if((d_0 <= i32(3)))
        {
        }
        else
        {
            break;
        }
        var _S28 : u32 = u32(d_0);
        var sum_5 : vec3<f32> = sum_1 + (across_0[_S26 - _S28][_S27] + across_0[_S26 + _S28][_S27]) * vec3<f32>(WEIGHTS_0[d_0]);
        d_0 = d_0 + i32(1);
        sum_1 = sum_5;
    }
    textureStore((blurred_0), (id_0), (vec4<f32>(sum_1, 1.0f)));
    return;
}

