// Generated from src/shaders/ibl.slang by slangc 2026.21
// (scripts/slangBuild.mjs). Do not edit: change the .slang and regenerate.
struct SkyParams_std140_0
{
    @align(16) zenith_0 : vec4<f32>,
    @align(16) horizon_0 : vec4<f32>,
    @align(16) ground_0 : vec4<f32>,
    @align(16) belowHorizon_0 : vec4<f32>,
    @align(16) size_0 : u32,
    @align(4) level_0 : u32,
    @align(8) levels_0 : u32,
    @align(4) sampleCount_0 : u32,
};

@binding(0) @group(0) var<uniform> params_0 : SkyParams_std140_0;
@binding(0) @group(1) var skyTarget_0 : texture_storage_2d_array<rgba16float, write>;

@binding(1) @group(1) var source_0 : texture_cube<f32>;

@binding(2) @group(1) var linearSampler_0 : sampler;

@binding(3) @group(1) var prefilterTarget_0 : texture_storage_2d_array<rgba16float, write>;

@binding(4) @group(1) var shSource_0 : texture_2d_array<f32>;

@binding(5) @group(1) var<storage, read_write> shPartial_0 : array<vec4<f32>>;

@binding(6) @group(1) var<storage, read_write> shOut_0 : array<vec4<f32>>;

@binding(9) @group(1) var irradianceTarget_0 : texture_storage_2d_array<rgba16float, write>;

@binding(8) @group(1) var irradianceSource_0 : texture_2d_array<f32>;

@binding(11) @group(1) var mipTarget_0 : texture_storage_2d_array<rgba16float, write>;

@binding(10) @group(1) var mipSource_0 : texture_2d_array<f32>;

@binding(7) @group(1) var brdfTarget_0 : texture_storage_2d<rgba16float, write>;

fn cubeDirection_0( face_0 : u32,  x_0 : u32,  y_0 : u32,  size_1 : u32) -> vec3<f32>
{
    var _S1 : f32 = f32(size_1);
    var u_0 : f32 = (f32(x_0) + 0.5f) / _S1 * 2.0f - 1.0f;
    var v_0 : f32 = (f32(y_0) + 0.5f) / _S1 * 2.0f - 1.0f;
    switch(face_0)
    {
    case u32(0):
        {
            return normalize(vec3<f32>(1.0f, - v_0, - u_0));
        }
    case u32(1):
        {
            return normalize(vec3<f32>(-1.0f, - v_0, u_0));
        }
    case u32(2):
        {
            return normalize(vec3<f32>(u_0, 1.0f, v_0));
        }
    case u32(3):
        {
            return normalize(vec3<f32>(u_0, -1.0f, - v_0));
        }
    case u32(4):
        {
            return normalize(vec3<f32>(u_0, - v_0, 1.0f));
        }
    default :
        {
            return normalize(vec3<f32>(- u_0, - v_0, -1.0f));
        }
    }
}

fn skyRadiance_0( d_0 : vec3<f32>) -> vec3<f32>
{
    var _S2 : f32 = d_0.y;
    if((_S2 >= 0.0f))
    {
        return mix(params_0.zenith_0.xyz, params_0.horizon_0.xyz, vec3<f32>(pow(1.0f - _S2, 3.0f)));
    }
    return mix(params_0.ground_0.xyz, params_0.belowHorizon_0.xyz, vec3<f32>(pow(1.0f + _S2, 6.0f)));
}

@compute
@workgroup_size(8, 8, 1)
fn sky(@builtin(global_invocation_id) id_0 : vec3<u32>)
{
    var _S3 : u32 = id_0.x;
    var _S4 : bool;
    if((_S3 >= (params_0.size_0)))
    {
        _S4 = true;
    }
    else
    {
        _S4 = ((id_0.y) >= (params_0.size_0));
    }
    if(_S4)
    {
        return;
    }
    textureStore((skyTarget_0), ((id_0)).xy, i32(((id_0)).z), (vec4<f32>(skyRadiance_0(cubeDirection_0(id_0.z, _S3, id_0.y, params_0.size_0)), 1.0f)));
    return;
}

fn hammersley_0( i_0 : u32,  n_0 : u32) -> vec2<f32>
{
    var bits_0 : u32 = (((i_0 << (u32(16)))) | (((i_0 >> (u32(16))))));
    var bits_1 : u32 = (((((bits_0 & (u32(1431655765)))) << (u32(1)))) | (((((bits_0 & (u32(2863311530)))) >> (u32(1))))));
    var bits_2 : u32 = (((((bits_1 & (u32(858993459)))) << (u32(2)))) | (((((bits_1 & (u32(3435973836)))) >> (u32(2))))));
    var bits_3 : u32 = (((((bits_2 & (u32(252645135)))) << (u32(4)))) | (((((bits_2 & (u32(4042322160)))) >> (u32(4))))));
    return vec2<f32>(f32(i_0) / f32(n_0), f32((((((bits_3 & (u32(16711935)))) << (u32(8)))) | (((((bits_3 & (u32(4278255360)))) >> (u32(8))))))) * 2.32830643653869629e-10f);
}

fn importanceSampleGgx_0( xi_0 : vec2<f32>,  n_1 : vec3<f32>,  alpha_0 : f32) -> vec3<f32>
{
    var phi_0 : f32 = 6.2831854820251465f * xi_0.x;
    var _S5 : f32 = xi_0.y;
    var cosTheta_0 : f32 = sqrt((1.0f - _S5) / (1.0f + (alpha_0 * alpha_0 - 1.0f) * _S5));
    var sinTheta_0 : f32 = sqrt(1.0f - cosTheta_0 * cosTheta_0);
    var _S6 : f32 = sinTheta_0 * cos(phi_0);
    var _S7 : f32 = sinTheta_0 * sin(phi_0);
    var up_0 : vec3<f32>;
    if(((abs(n_1.z)) < 0.99900001287460327f))
    {
        up_0 = vec3<f32>(0.0f, 0.0f, 1.0f);
    }
    else
    {
        up_0 = vec3<f32>(1.0f, 0.0f, 0.0f);
    }
    var tx_0 : vec3<f32> = normalize(cross(up_0, n_1));
    return normalize(tx_0 * vec3<f32>(_S6) + cross(n_1, tx_0) * vec3<f32>(_S7) + n_1 * vec3<f32>(cosTheta_0));
}

@compute
@workgroup_size(8, 8, 1)
fn prefilter(@builtin(global_invocation_id) id_1 : vec3<u32>)
{
    var _S8 : u32 = id_1.x;
    var _S9 : bool;
    if((_S8 >= (params_0.size_0)))
    {
        _S9 = true;
    }
    else
    {
        _S9 = ((id_1.y) >= (params_0.size_0));
    }
    if(_S9)
    {
        return;
    }
    var n_2 : vec3<f32> = cubeDirection_0(id_1.z, _S8, id_1.y, params_0.size_0);
    var roughness_0 : f32 = f32(params_0.level_0) / f32(max(params_0.levels_0 - u32(1), u32(1)));
    var _S10 : vec3<f32> = vec3<f32>(0.0f);
    var color_0 : vec3<f32>;
    if((params_0.level_0) == u32(0))
    {
        color_0 = (textureSampleLevel((source_0), (linearSampler_0), (n_2), (0.0f))).xyz;
    }
    else
    {
        var _S11 : f32 = roughness_0 * roughness_0;
        var sourceSize_0 : u32;
        var sourceHeight_0 : u32;
        {var dim = textureDimensions((source_0));((sourceSize_0)) = dim.x;((sourceHeight_0)) = dim.y;};
        var i_1 : u32 = u32(0);
        color_0 = _S10;
        var weight_0 : f32 = 0.0f;
        loop
        {
            if((i_1 < (params_0.sampleCount_0)))
            {
            }
            else
            {
                break;
            }
            var h_0 : vec3<f32> = importanceSampleGgx_0(hammersley_0(i_1, params_0.sampleCount_0), n_2, _S11);
            var _S12 : f32 = dot(n_2, h_0);
            var l_0 : vec3<f32> = normalize(vec3<f32>((2.0f * _S12)) * h_0 - n_2);
            var nDotL_0 : f32 = dot(n_2, l_0);
            if((nDotL_0 > 0.0f))
            {
                var _S13 : f32 = max(_S12, 0.0f);
                var a2_0 : f32 = _S11 * _S11;
                var weight_1 : f32 = weight_0 + nDotL_0;
                color_0 = color_0 + (textureSampleLevel((source_0), (linearSampler_0), (l_0), (max(0.5f * log2(1.0f / (f32(params_0.sampleCount_0) * (a2_0 / (3.1415927410125732f * pow(_S13 * _S13 * (a2_0 - 1.0f) + 1.0f, 2.0f)) * 0.25f + 9.9999997473787516e-05f)) / (12.566370964050293f / (6.0f * f32(sourceSize_0) * f32(sourceSize_0)))) + 1.0f, 0.0f)))).xyz * vec3<f32>(nDotL_0);
                weight_0 = weight_1;
            }
            i_1 = i_1 + u32(1);
        }
        color_0 = color_0 / vec3<f32>(max(weight_0, 9.9999997473787516e-05f));
    }
    textureStore((prefilterTarget_0), ((id_1)).xy, i32(((id_1)).z), (vec4<f32>(color_0, 1.0f)));
    return;
}

fn texelSolidAngle_0( x_1 : u32,  y_1 : u32,  size_2 : u32) -> f32
{
    var _S14 : f32 = f32(size_2);
    var u_1 : f32 = (f32(x_1) + 0.5f) / _S14 * 2.0f - 1.0f;
    var v_1 : f32 = (f32(y_1) + 0.5f) / _S14 * 2.0f - 1.0f;
    return 4.0f / (f32(size_2 * size_2) * pow(1.0f + u_1 * u_1 + v_1 * v_1, 1.5f));
}

fn shBasis_0( d_1 : vec3<f32>,  k_0 : u32) -> f32
{
    switch(k_0)
    {
    case u32(0):
        {
            return 0.28209498524665833f;
        }
    case u32(1):
        {
            return 0.48860299587249756f * d_1.y;
        }
    case u32(2):
        {
            return 0.48860299587249756f * d_1.z;
        }
    case u32(3):
        {
            return 0.48860299587249756f * d_1.x;
        }
    case u32(4):
        {
            return 1.0925480127334595f * d_1.x * d_1.y;
        }
    case u32(5):
        {
            return 1.0925480127334595f * d_1.y * d_1.z;
        }
    case u32(6):
        {
            var _S15 : f32 = d_1.z;
            return 0.31539198756217957f * (3.0f * _S15 * _S15 - 1.0f);
        }
    case u32(7):
        {
            return 1.0925480127334595f * d_1.x * d_1.z;
        }
    default :
        {
            var _S16 : f32 = d_1.x;
            var _S17 : f32 = d_1.y;
            return 0.54627400636672974f * (_S16 * _S16 - _S17 * _S17);
        }
    }
}

var<workgroup> partialSums_0 : array<array<vec3<f32>, i32(9)>, i32(64)>;

@compute
@workgroup_size(64, 1, 1)
fn shFace(@builtin(local_invocation_index) lid_0 : u32, @builtin(workgroup_id) wg_0 : vec3<u32>)
{
    var _S18 : u32 = wg_0.x;
    var size_3 : u32;
    var height_0 : u32;
    var layers_0 : u32;
    {var dim = textureDimensions((shSource_0));((size_3)) = dim.x;((height_0)) = dim.y;((layers_0)) = textureNumLayers((shSource_0));};
    var sum_0 : array<vec3<f32>, i32(9)>;
    var _S19 : vec3<f32> = vec3<f32>(0.0f);
    sum_0[u32(0)] = _S19;
    sum_0[u32(1)] = _S19;
    sum_0[u32(2)] = _S19;
    sum_0[u32(3)] = _S19;
    sum_0[u32(4)] = _S19;
    sum_0[u32(5)] = _S19;
    sum_0[u32(6)] = _S19;
    sum_0[u32(7)] = _S19;
    sum_0[u32(8)] = _S19;
    var t_0 : u32 = lid_0;
    loop
    {
        if((t_0 < (size_3 * size_3)))
        {
        }
        else
        {
            break;
        }
        var x_2 : u32 = t_0 % size_3;
        var y_2 : u32 = t_0 / size_3;
        var _S20 : vec3<f32> = cubeDirection_0(_S18, x_2, y_2, size_3);
        var _S21 : f32 = texelSolidAngle_0(x_2, y_2, size_3);
        var _S22 : vec4<i32> = vec4<i32>(i32(x_2), i32(y_2), i32(_S18), i32(0));
        var _S23 : vec3<f32> = (textureLoad((shSource_0), ((_S22)).xy, i32(((_S22)).z), ((_S22)).w)).xyz;
        var _S24 : vec3<f32> = vec3<f32>(_S21);
        sum_0[u32(0)] = sum_0[u32(0)] + _S23 * vec3<f32>(shBasis_0(_S20, u32(0))) * _S24;
        sum_0[u32(1)] = sum_0[u32(1)] + _S23 * vec3<f32>(shBasis_0(_S20, u32(1))) * _S24;
        sum_0[u32(2)] = sum_0[u32(2)] + _S23 * vec3<f32>(shBasis_0(_S20, u32(2))) * _S24;
        sum_0[u32(3)] = sum_0[u32(3)] + _S23 * vec3<f32>(shBasis_0(_S20, u32(3))) * _S24;
        sum_0[u32(4)] = sum_0[u32(4)] + _S23 * vec3<f32>(shBasis_0(_S20, u32(4))) * _S24;
        sum_0[u32(5)] = sum_0[u32(5)] + _S23 * vec3<f32>(shBasis_0(_S20, u32(5))) * _S24;
        sum_0[u32(6)] = sum_0[u32(6)] + _S23 * vec3<f32>(shBasis_0(_S20, u32(6))) * _S24;
        sum_0[u32(7)] = sum_0[u32(7)] + _S23 * vec3<f32>(shBasis_0(_S20, u32(7))) * _S24;
        sum_0[u32(8)] = sum_0[u32(8)] + _S23 * vec3<f32>(shBasis_0(_S20, u32(8))) * _S24;
        t_0 = t_0 + u32(64);
    }
    partialSums_0[lid_0][u32(0)] = sum_0[u32(0)];
    partialSums_0[lid_0][u32(1)] = sum_0[u32(1)];
    partialSums_0[lid_0][u32(2)] = sum_0[u32(2)];
    partialSums_0[lid_0][u32(3)] = sum_0[u32(3)];
    partialSums_0[lid_0][u32(4)] = sum_0[u32(4)];
    partialSums_0[lid_0][u32(5)] = sum_0[u32(5)];
    partialSums_0[lid_0][u32(6)] = sum_0[u32(6)];
    partialSums_0[lid_0][u32(7)] = sum_0[u32(7)];
    partialSums_0[lid_0][u32(8)] = sum_0[u32(8)];
    workgroupBarrier();
    var stride_0 : u32 = u32(32);
    loop
    {
        if((stride_0 > u32(0)))
        {
        }
        else
        {
            break;
        }
        if((lid_0 < stride_0))
        {
            partialSums_0[lid_0][u32(0)] = partialSums_0[lid_0][u32(0)] + partialSums_0[lid_0 + stride_0][u32(0)];
            partialSums_0[lid_0][u32(1)] = partialSums_0[lid_0][u32(1)] + partialSums_0[lid_0 + stride_0][u32(1)];
            partialSums_0[lid_0][u32(2)] = partialSums_0[lid_0][u32(2)] + partialSums_0[lid_0 + stride_0][u32(2)];
            partialSums_0[lid_0][u32(3)] = partialSums_0[lid_0][u32(3)] + partialSums_0[lid_0 + stride_0][u32(3)];
            partialSums_0[lid_0][u32(4)] = partialSums_0[lid_0][u32(4)] + partialSums_0[lid_0 + stride_0][u32(4)];
            partialSums_0[lid_0][u32(5)] = partialSums_0[lid_0][u32(5)] + partialSums_0[lid_0 + stride_0][u32(5)];
            partialSums_0[lid_0][u32(6)] = partialSums_0[lid_0][u32(6)] + partialSums_0[lid_0 + stride_0][u32(6)];
            partialSums_0[lid_0][u32(7)] = partialSums_0[lid_0][u32(7)] + partialSums_0[lid_0 + stride_0][u32(7)];
            partialSums_0[lid_0][u32(8)] = partialSums_0[lid_0][u32(8)] + partialSums_0[lid_0 + stride_0][u32(8)];
        }
        workgroupBarrier();
        stride_0 = (stride_0 >> (u32(1)));
    }
    if(lid_0 == u32(0))
    {
        var _S25 : u32 = _S18 * u32(9);
        shPartial_0[_S25] = vec4<f32>(partialSums_0[i32(0)][u32(0)], 0.0f);
        shPartial_0[_S25 + u32(1)] = vec4<f32>(partialSums_0[i32(0)][u32(1)], 0.0f);
        shPartial_0[_S25 + u32(2)] = vec4<f32>(partialSums_0[i32(0)][u32(2)], 0.0f);
        shPartial_0[_S25 + u32(3)] = vec4<f32>(partialSums_0[i32(0)][u32(3)], 0.0f);
        shPartial_0[_S25 + u32(4)] = vec4<f32>(partialSums_0[i32(0)][u32(4)], 0.0f);
        shPartial_0[_S25 + u32(5)] = vec4<f32>(partialSums_0[i32(0)][u32(5)], 0.0f);
        shPartial_0[_S25 + u32(6)] = vec4<f32>(partialSums_0[i32(0)][u32(6)], 0.0f);
        shPartial_0[_S25 + u32(7)] = vec4<f32>(partialSums_0[i32(0)][u32(7)], 0.0f);
        shPartial_0[_S25 + u32(8)] = vec4<f32>(partialSums_0[i32(0)][u32(8)], 0.0f);
    }
    return;
}

@compute
@workgroup_size(1, 1, 1)
fn shFinal()
{
    var L_0 : array<vec3<f32>, i32(9)>;
    L_0[u32(0)] = shPartial_0[u32(0)].xyz + shPartial_0[u32(9)].xyz + shPartial_0[u32(18)].xyz + shPartial_0[u32(27)].xyz + shPartial_0[u32(36)].xyz + shPartial_0[u32(45)].xyz;
    L_0[u32(1)] = shPartial_0[u32(1)].xyz + shPartial_0[u32(10)].xyz + shPartial_0[u32(19)].xyz + shPartial_0[u32(28)].xyz + shPartial_0[u32(37)].xyz + shPartial_0[u32(46)].xyz;
    L_0[u32(2)] = shPartial_0[u32(2)].xyz + shPartial_0[u32(11)].xyz + shPartial_0[u32(20)].xyz + shPartial_0[u32(29)].xyz + shPartial_0[u32(38)].xyz + shPartial_0[u32(47)].xyz;
    L_0[u32(3)] = shPartial_0[u32(3)].xyz + shPartial_0[u32(12)].xyz + shPartial_0[u32(21)].xyz + shPartial_0[u32(30)].xyz + shPartial_0[u32(39)].xyz + shPartial_0[u32(48)].xyz;
    L_0[u32(4)] = shPartial_0[u32(4)].xyz + shPartial_0[u32(13)].xyz + shPartial_0[u32(22)].xyz + shPartial_0[u32(31)].xyz + shPartial_0[u32(40)].xyz + shPartial_0[u32(49)].xyz;
    L_0[u32(5)] = shPartial_0[u32(5)].xyz + shPartial_0[u32(14)].xyz + shPartial_0[u32(23)].xyz + shPartial_0[u32(32)].xyz + shPartial_0[u32(41)].xyz + shPartial_0[u32(50)].xyz;
    L_0[u32(6)] = shPartial_0[u32(6)].xyz + shPartial_0[u32(15)].xyz + shPartial_0[u32(24)].xyz + shPartial_0[u32(33)].xyz + shPartial_0[u32(42)].xyz + shPartial_0[u32(51)].xyz;
    L_0[u32(7)] = shPartial_0[u32(7)].xyz + shPartial_0[u32(16)].xyz + shPartial_0[u32(25)].xyz + shPartial_0[u32(34)].xyz + shPartial_0[u32(43)].xyz + shPartial_0[u32(52)].xyz;
    L_0[u32(8)] = shPartial_0[u32(8)].xyz + shPartial_0[u32(17)].xyz + shPartial_0[u32(26)].xyz + shPartial_0[u32(35)].xyz + shPartial_0[u32(44)].xyz + shPartial_0[u32(53)].xyz;
    var _S26 : vec3<f32> = vec3<f32>(0.31830987334251404f);
    shOut_0[i32(0)] = vec4<f32>(vec3<f32>(0.88622701168060303f) * L_0[i32(0)] * _S26, 0.0f);
    var _S27 : vec3<f32> = vec3<f32>(1.0233279466629028f);
    shOut_0[i32(1)] = vec4<f32>(_S27 * L_0[i32(1)] * _S26, 0.0f);
    shOut_0[i32(2)] = vec4<f32>(_S27 * L_0[i32(2)] * _S26, 0.0f);
    shOut_0[i32(3)] = vec4<f32>(_S27 * L_0[i32(3)] * _S26, 0.0f);
    var _S28 : vec3<f32> = vec3<f32>(0.8580859899520874f);
    shOut_0[i32(4)] = vec4<f32>(_S28 * L_0[i32(4)] * _S26, 0.0f);
    shOut_0[i32(5)] = vec4<f32>(_S28 * L_0[i32(5)] * _S26, 0.0f);
    shOut_0[i32(6)] = vec4<f32>(vec3<f32>(0.24770833551883698f) * L_0[i32(6)] * _S26, 0.0f);
    shOut_0[i32(7)] = vec4<f32>(_S28 * L_0[i32(7)] * _S26, 0.0f);
    shOut_0[i32(8)] = vec4<f32>(vec3<f32>(0.4290429949760437f) * L_0[i32(8)] * _S26, 0.0f);
    return;
}

var<workgroup> chunkRadiance_0 : array<vec3<f32>, i32(256)>;

var<workgroup> chunkDirection_0 : array<vec4<f32>, i32(256)>;

@compute
@workgroup_size(8, 8, 1)
fn irradianceCube(@builtin(global_invocation_id) id_2 : vec3<u32>, @builtin(local_invocation_index) lane_0 : u32)
{
    var size_4 : u32;
    var height_1 : u32;
    var layers_1 : u32;
    {var dim = textureDimensions((irradianceTarget_0));((size_4)) = dim.x;((height_1)) = dim.y;((layers_1)) = textureNumLayers((irradianceTarget_0));};
    var _S29 : u32 = id_2.x;
    var inside_0 : bool;
    if((_S29 < size_4))
    {
        inside_0 = ((id_2.y) < size_4);
    }
    else
    {
        inside_0 = false;
    }
    var _S30 : vec3<f32> = cubeDirection_0(id_2.z, min(_S29, size_4 - u32(1)), min(id_2.y, size_4 - u32(1)), size_4);
    var sourceSize_1 : u32;
    var sourceHeight_1 : u32;
    var sourceLayers_0 : u32;
    {var dim = textureDimensions((irradianceSource_0));((sourceSize_1)) = dim.x;((sourceHeight_1)) = dim.y;((sourceLayers_0)) = textureNumLayers((irradianceSource_0));};
    var _S31 : u32 = sourceSize_1 * sourceSize_1;
    var _S32 : vec3<f32> = vec3<f32>(0.0f);
    var face_1 : u32 = u32(0);
    var sum_1 : vec3<f32> = _S32;
    loop
    {
        if((face_1 < u32(6)))
        {
        }
        else
        {
            break;
        }
        var base_0 : u32 = u32(0);
        loop
        {
            if((base_0 < _S31))
            {
            }
            else
            {
                break;
            }
            var _S33 : u32 = min(u32(256), _S31 - base_0);
            var t_1 : u32 = lane_0;
            loop
            {
                if((t_1 < _S33))
                {
                }
                else
                {
                    break;
                }
                var _S34 : u32 = base_0 + t_1;
                var x_3 : u32 = _S34 % sourceSize_1;
                var y_3 : u32 = _S34 / sourceSize_1;
                var _S35 : vec4<i32> = vec4<i32>(i32(x_3), i32(y_3), i32(face_1), i32(0));
                chunkRadiance_0[t_1] = (textureLoad((irradianceSource_0), ((_S35)).xy, i32(((_S35)).z), ((_S35)).w)).xyz;
                chunkDirection_0[t_1] = vec4<f32>(cubeDirection_0(face_1, x_3, y_3, sourceSize_1), texelSolidAngle_0(x_3, y_3, sourceSize_1));
                t_1 = t_1 + u32(64);
            }
            workgroupBarrier();
            var t_2 : u32 = u32(0);
            var sum_2 : vec3<f32> = sum_1;
            loop
            {
                if((t_2 < _S33))
                {
                }
                else
                {
                    break;
                }
                var d_2 : vec4<f32> = chunkDirection_0[t_2];
                var cosine_0 : f32 = dot(_S30, chunkDirection_0[t_2].xyz);
                if((cosine_0 > 0.0f))
                {
                    sum_2 = sum_2 + chunkRadiance_0[t_2] * vec3<f32>(cosine_0) * vec3<f32>(d_2.w);
                }
                t_2 = t_2 + u32(1);
            }
            workgroupBarrier();
            base_0 = base_0 + u32(256);
            sum_1 = sum_2;
        }
        face_1 = face_1 + u32(1);
    }
    if(inside_0)
    {
        textureStore((irradianceTarget_0), ((id_2)).xy, i32(((id_2)).z), (vec4<f32>(sum_1 / vec3<f32>(3.1415927410125732f), 1.0f)));
    }
    return;
}

@compute
@workgroup_size(8, 8, 1)
fn downsample(@builtin(global_invocation_id) id_3 : vec3<u32>)
{
    var size_5 : u32;
    var height_2 : u32;
    var layers_2 : u32;
    {var dim = textureDimensions((mipTarget_0));((size_5)) = dim.x;((height_2)) = dim.y;((layers_2)) = textureNumLayers((mipTarget_0));};
    var _S36 : bool;
    if(((id_3.x) >= size_5))
    {
        _S36 = true;
    }
    else
    {
        _S36 = ((id_3.y) >= size_5);
    }
    if(_S36)
    {
        return;
    }
    var s_0 : vec2<i32> = vec2<i32>(id_3.xy) * vec2<i32>(i32(2));
    var z_0 : i32 = i32(id_3.z);
    var _S37 : vec4<i32> = vec4<i32>(s_0, z_0, i32(0));
    var _S38 : vec4<i32> = vec4<i32>(s_0 + vec2<i32>(i32(1), i32(0)), z_0, i32(0));
    var _S39 : vec4<i32> = vec4<i32>(s_0 + vec2<i32>(i32(0), i32(1)), z_0, i32(0));
    var _S40 : vec4<i32> = vec4<i32>(s_0 + vec2<i32>(i32(1), i32(1)), z_0, i32(0));
    textureStore((mipTarget_0), ((id_3)).xy, i32(((id_3)).z), (((textureLoad((mipSource_0), ((_S37)).xy, i32(((_S37)).z), ((_S37)).w)) + (textureLoad((mipSource_0), ((_S38)).xy, i32(((_S38)).z), ((_S38)).w)) + (textureLoad((mipSource_0), ((_S39)).xy, i32(((_S39)).z), ((_S39)).w)) + (textureLoad((mipSource_0), ((_S40)).xy, i32(((_S40)).z), ((_S40)).w))) * vec4<f32>(0.25f)));
    return;
}

@compute
@workgroup_size(8, 8, 1)
fn brdf(@builtin(global_invocation_id) id_4 : vec3<u32>)
{
    var width_0 : u32;
    var height_3 : u32;
    {var dim = textureDimensions((brdfTarget_0));((width_0)) = dim.x;((height_3)) = dim.y;};
    var _S41 : u32 = id_4.x;
    var _S42 : bool;
    if((_S41 >= width_0))
    {
        _S42 = true;
    }
    else
    {
        _S42 = ((id_4.y) >= height_3);
    }
    if(_S42)
    {
        return;
    }
    var _S43 : f32 = max((f32(_S41) + 0.5f) / f32(width_0), 9.9999997473787516e-05f);
    var roughness_1 : f32 = (f32(id_4.y) + 0.5f) / f32(height_3);
    var _S44 : f32 = roughness_1 * roughness_1;
    var _S45 : f32 = _S43 * _S43;
    var _S46 : vec3<f32> = vec3<f32>(sqrt(1.0f - _S45), 0.0f, _S43);
    const _S47 : vec3<f32> = vec3<f32>(0.0f, 0.0f, 1.0f);
    var i_2 : u32 = u32(0);
    var a_0 : f32 = 0.0f;
    var b_0 : f32 = 0.0f;
    loop
    {
        if((i_2 < u32(512)))
        {
        }
        else
        {
            break;
        }
        var h_1 : vec3<f32> = importanceSampleGgx_0(hammersley_0(i_2, u32(512)), _S47, _S44);
        var _S48 : f32 = dot(_S46, h_1);
        var _S49 : f32 = max(normalize(vec3<f32>((2.0f * _S48)) * h_1 - _S46).z, 0.0f);
        var _S50 : f32 = max(h_1.z, 0.0f);
        var _S51 : f32 = max(_S48, 0.0f);
        if((_S49 > 0.0f))
        {
            var a2_1 : f32 = _S44 * _S44;
            var _S52 : f32 = 1.0f - a2_1;
            var g_0 : f32 = 0.5f / max(_S49 * sqrt(_S45 * _S52 + a2_1) + _S43 * sqrt(_S49 * _S49 * _S52 + a2_1), 9.99999997475242708e-07f) * 4.0f * _S49 * _S51 / max(_S50, 9.99999997475242708e-07f);
            var fc_0 : f32 = pow(1.0f - _S51, 5.0f);
            var b_1 : f32 = b_0 + fc_0 * g_0;
            a_0 = a_0 + (1.0f - fc_0) * g_0;
            b_0 = b_1;
        }
        i_2 = i_2 + u32(1);
    }
    textureStore((brdfTarget_0), (id_4.xy), (vec4<f32>(a_0 / 512.0f, b_0 / 512.0f, 0.0f, 1.0f)));
    return;
}

