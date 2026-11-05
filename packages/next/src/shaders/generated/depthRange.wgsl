// Generated from src/shaders/depthRange.slang by slangc 2026.21
// (scripts/slangBuild.mjs). Do not edit: change the .slang and regenerate.
struct RangeParams_std140_0
{
    @align(16) near_0 : f32,
    @align(4) width_0 : u32,
    @align(8) height_0 : u32,
    @align(4) pad_0 : u32,
};

@binding(1) @group(0) var<uniform> params_0 : RangeParams_std140_0;
@binding(0) @group(0) var depth_0 : texture_depth_multisampled_2d;

@binding(2) @group(0) var<storage, read_write> result_0 : array<atomic<u32>>;

var<workgroup> nearest_0 : atomic<u32>;

var<workgroup> farthest_0 : atomic<u32>;

var<private> _S1 : vec3<u32>;

fn WorkgroupCount_0() -> vec3<u32>
{
    return _S1;
}

@compute
@workgroup_size(16, 16, 1)
fn main(@builtin(global_invocation_id) id_0 : vec3<u32>, @builtin(local_invocation_index) local_0 : u32, @builtin(num_workgroups) _builtinWorkgroupCount_0 : vec3<u32>)
{
    _S1 = _builtinWorkgroupCount_0;
    var _S2 : bool = local_0 == u32(0);
    if(_S2)
    {
        atomicStore(&(nearest_0), u32(2139095039));
        atomicStore(&(farthest_0), u32(0));
    }
    workgroupBarrier();
    var _S3 : vec2<u32> = WorkgroupCount_0().xy * vec2<u32>(u32(16));
    var _S4 : u32 = id_0.y;
    var lo_0 : f32 = 3.39999995214436425e+38f;
    var hi_0 : f32 = 0.0f;
    var y_0 : u32 = _S4;
    loop
    {
        if((y_0 < (params_0.height_0)))
        {
        }
        else
        {
            break;
        }
        var _S5 : u32 = id_0.x;
        var lo_1 : f32 = lo_0;
        var hi_1 : f32 = hi_0;
        var x_0 : u32 = _S5;
        loop
        {
            if((x_0 < (params_0.width_0)))
            {
            }
            else
            {
                break;
            }
            var d_0 : f32 = (textureLoad((depth_0), (vec2<i32>(i32(x_0), i32(y_0))), (i32(0))));
            if((d_0 > 0.0f))
            {
                var distance_0 : f32 = params_0.near_0 / d_0;
                var _S6 : f32 = max(hi_1, distance_0);
                lo_1 = min(lo_1, distance_0);
                hi_1 = _S6;
            }
            x_0 = x_0 + _S3.x;
        }
        var y_1 : u32 = y_0 + _S3.y;
        lo_0 = lo_1;
        hi_0 = hi_1;
        y_0 = y_1;
    }
    if((hi_0 > 0.0f))
    {
        var _S7 : u32 = atomicMin(&(nearest_0), (bitcast<u32>((lo_0))));
        var _S8 : u32 = atomicMax(&(farthest_0), (bitcast<u32>((hi_0))));
    }
    workgroupBarrier();
    if(_S2)
    {
        var _S9 : u32 = atomicLoad(&(nearest_0));
        var _S10 : u32 = atomicMin(&(result_0[i32(0)]), _S9);
        var _S11 : u32 = atomicLoad(&(farthest_0));
        var _S12 : u32 = atomicMax(&(result_0[i32(1)]), _S11);
    }
    return;
}

