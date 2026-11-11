// Generated from src/shaders/pickDomain.slang by slangc 2026.21
// (scripts/slangBuild.mjs). Do not edit: change the .slang and regenerate.
@binding(0) @group(0) var ids_0 : texture_2d<u32>;

@binding(1) @group(0) var domain_0 : texture_2d<f32>;

@binding(3) @group(0) var<storage, read_write> result_0 : array<u32>;

@binding(2) @group(0) var depth_0 : texture_depth_2d;

@compute
@workgroup_size(1, 1, 1)
fn gather()
{
    var _S1 : vec2<i32> = vec2<i32>(i32(1), i32(1));
    var _S2 : vec3<i32> = vec3<i32>(_S1, i32(0));
    var id_0 : vec4<u32> = (textureLoad((ids_0), ((_S2)).xy, ((_S2)).z));
    var values_0 : vec4<f32> = (textureLoad((domain_0), ((_S2)).xy, ((_S2)).z));
    result_0[i32(0)] = id_0.x;
    result_0[i32(1)] = id_0.y;
    result_0[i32(2)] = id_0.z;
    result_0[i32(3)] = id_0.w;
    result_0[i32(4)] = (bitcast<u32>((values_0.x)));
    result_0[i32(5)] = (bitcast<u32>((values_0.y)));
    result_0[i32(6)] = (bitcast<u32>((values_0.z)));
    result_0[i32(7)] = (bitcast<u32>((values_0.w)));
    result_0[i32(8)] = (bitcast<u32>(((textureLoad((depth_0), ((_S2)).xy, ((_S2)).z)))));
    result_0[u32(9)] = u32(0);
    return;
}

