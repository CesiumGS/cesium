// Generated from src/shaders/imagery.slang by slangc 2026.21
// (scripts/slangBuild.mjs). Do not edit: change the .slang and regenerate.
struct Params_std140_0
{
    @align(16) col_0 : vec4<f32>,
    @align(16) color_0 : vec4<f32>,
    @align(16) rows_0 : array<vec4<f32>, i32(64)>,
};

@binding(3) @group(0) var<uniform> params_0 : Params_std140_0;
@binding(2) @group(0) var destination_0 : texture_storage_2d<rgba8unorm, write>;

@binding(0) @group(0) var source_0 : texture_2d<f32>;

@binding(1) @group(0) var sourceSampler_0 : sampler;

@compute
@workgroup_size(8, 8, 1)
fn fill(@builtin(global_invocation_id) id_0 : vec3<u32>)
{
    var size_0 : u32 = u32(params_0.col_0.z);
    var _S1 : bool;
    if(((id_0.x) >= size_0))
    {
        _S1 = true;
    }
    else
    {
        _S1 = ((id_0.y) >= size_0);
    }
    if(_S1)
    {
        return;
    }
    textureStore((destination_0), (id_0.xy), (params_0.color_0));
    return;
}

@compute
@workgroup_size(8, 8, 1)
fn composite(@builtin(global_invocation_id) id_1 : vec3<u32>)
{
    var size_1 : u32 = u32(params_0.col_0.z);
    var _S2 : u32 = id_1.x;
    var _S3 : bool;
    if((_S2 >= size_1))
    {
        _S3 = true;
    }
    else
    {
        _S3 = ((id_1.y) >= size_1);
    }
    if(_S3)
    {
        return;
    }
    var s_0 : f32 = params_0.col_0.x + params_0.col_0.y * (f32(_S2) + 0.5f);
    var _S4 : u32 = id_1.y;
    var t_0 : f32 = params_0.rows_0[_S4 / u32(4)][_S4 % u32(4)];
    if((s_0 < 0.0f))
    {
        _S3 = true;
    }
    else
    {
        _S3 = (s_0 > 1.0f);
    }
    if(_S3)
    {
        _S3 = true;
    }
    else
    {
        _S3 = (t_0 < 0.0f);
    }
    if(_S3)
    {
        _S3 = true;
    }
    else
    {
        _S3 = (t_0 > 1.0f);
    }
    if(_S3)
    {
        return;
    }
    textureStore((destination_0), (id_1.xy), ((textureSampleLevel((source_0), (sourceSampler_0), (vec2<f32>(s_0, t_0)), (0.0f)))));
    return;
}

@compute
@workgroup_size(8, 8, 1)
fn downsample(@builtin(global_invocation_id) id_2 : vec3<u32>)
{
    var size_2 : u32 = u32(params_0.col_0.z);
    var _S5 : bool;
    if(((id_2.x) >= size_2))
    {
        _S5 = true;
    }
    else
    {
        _S5 = ((id_2.y) >= size_2);
    }
    if(_S5)
    {
        return;
    }
    var _S6 : vec2<u32> = id_2.xy;
    var p_0 : vec2<i32> = vec2<i32>(_S6) * vec2<i32>(i32(2));
    var _S7 : vec3<i32> = vec3<i32>(p_0, i32(0));
    var _S8 : vec3<i32> = vec3<i32>(p_0 + vec2<i32>(i32(1), i32(0)), i32(0));
    var _S9 : vec3<i32> = vec3<i32>(p_0 + vec2<i32>(i32(0), i32(1)), i32(0));
    var _S10 : vec3<i32> = vec3<i32>(p_0 + vec2<i32>(i32(1), i32(1)), i32(0));
    textureStore((destination_0), (_S6), (((textureLoad((source_0), ((_S7)).xy, ((_S7)).z)) + (textureLoad((source_0), ((_S8)).xy, ((_S8)).z)) + (textureLoad((source_0), ((_S9)).xy, ((_S9)).z)) + (textureLoad((source_0), ((_S10)).xy, ((_S10)).z))) * vec4<f32>(0.25f)));
    return;
}

