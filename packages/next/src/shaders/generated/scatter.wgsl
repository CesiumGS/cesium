// Generated from src/shaders/scatter.slang by slangc 2026.21
// (scripts/slangBuild.mjs). Do not edit: change the .slang and regenerate.
struct ScatterParams_std140_0
{
    @align(16) count_0 : u32,
    @align(4) words_0 : u32,
    @align(8) pad0_0 : u32,
    @align(4) pad1_0 : u32,
};

@binding(0) @group(0) var<uniform> params_0 : ScatterParams_std140_0;
@binding(1) @group(0) var<storage, read> src_0 : array<u32>;

@binding(2) @group(0) var<storage, read_write> dst_0 : array<u32>;

@compute
@workgroup_size(64, 1, 1)
fn main(@builtin(global_invocation_id) gid_0 : vec3<u32>)
{
    var k_0 : u32 = gid_0.x;
    if((k_0 >= (params_0.count_0 * params_0.words_0)))
    {
        return;
    }
    var entry_0 : u32 = k_0 / params_0.words_0;
    dst_0[src_0[entry_0] * params_0.words_0 + (k_0 - entry_0 * params_0.words_0)] = src_0[params_0.count_0 + k_0];
    return;
}

