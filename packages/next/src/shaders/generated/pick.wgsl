// Generated from src/shaders/pick.slang by slangc 2026.21
// (scripts/slangBuild.mjs). Do not edit: change the .slang and regenerate.
struct PickParams_std140_0
{
    @align(16) pixel_0 : vec2<u32>,
    @align(8) pad_0 : vec2<u32>,
};

@binding(1) @group(0) var<uniform> params_0 : PickParams_std140_0;
@binding(0) @group(0) var ids_0 : texture_multisampled_2d<u32>;

@binding(2) @group(0) var<storage, read_write> result_0 : array<u32>;

@binding(3) @group(0) var depth_0 : texture_depth_multisampled_2d;

@compute
@workgroup_size(1, 1, 1)
fn main()
{
    var id_0 : vec2<u32> = (textureLoad((ids_0), (vec2<i32>(params_0.pixel_0)), (i32(0)))).xy;
    result_0[i32(0)] = ((id_0.x) | ((((id_0.y) << (u32(16))))));
    result_0[i32(1)] = (bitcast<u32>(((textureLoad((depth_0), (vec2<i32>(params_0.pixel_0)), (i32(0)))))));
    return;
}

