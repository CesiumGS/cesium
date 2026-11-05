// Generated from src/vector/points.slang by slangc 2026.21
// (scripts/slangBuild.mjs). Do not edit: change the .slang and regenerate.
struct Update_std140_0
{
    @align(16) first_0 : u32,
    @align(4) n_0 : u32,
    @align(8) now_0 : f32,
    @align(4) delay_0 : f32,
    @align(16) threads_0 : u32,
    @align(4) pad0_0 : u32,
    @align(8) pad1_0 : u32,
    @align(4) pad2_0 : u32,
};

@binding(0) @group(1) var<uniform> update_0 : Update_std140_0;
@binding(1) @group(1) var<storage, read> samples_0 : array<vec4<f32>>;

struct State_std430_0
{
    @align(16) p0_0 : vec3<f32>,
    @align(4) t0_0 : f32,
    @align(16) p1_0 : vec3<f32>,
    @align(4) t1_0 : f32,
    @align(16) h0_0 : f32,
    @align(4) h1_0 : f32,
    @align(8) sampled_0 : f32,
    @align(4) pad_0 : f32,
};

@binding(1) @group(0) var<storage, read_write> state_0 : array<State_std430_0>;

struct PointParams_std140_0
{
    @align(16) time_0 : f32,
    @align(4) delay_1 : f32,
    @align(8) count_0 : u32,
    @align(4) capacity_0 : u32,
    @align(16) anchors_0 : u32,
    @align(4) streams_0 : u32,
    @align(8) stride_0 : u32,
    @align(4) headingWord_0 : u32,
    @align(16) clamped_0 : u32,
    @align(4) halfExtent_0 : f32,
    @align(8) top_0 : f32,
    @align(4) bottom_0 : f32,
    @align(16) threads_1 : u32,
    @align(4) pad0_1 : u32,
    @align(8) pad1_1 : u32,
    @align(4) pad2_1 : u32,
};

@binding(0) @group(0) var<uniform> params_0 : PointParams_std140_0;
@binding(2) @group(0) var<storage, read_write> vertices_0 : array<f32>;

@binding(3) @group(0) var heights_0 : texture_depth_2d;

fn shown_0( s_0 : ptr<function, State_std430_0>,  t_0 : f32) -> vec4<f32>
{
    var a_0 : f32 = clamp((t_0 - (*s_0).t0_0) / max((*s_0).t1_0 - (*s_0).t0_0, 9.99999997475242708e-07f), 0.0f, 1.0f);
    var _S1 : f32 = (*s_0).h1_0 - (*s_0).h0_0;
    return vec4<f32>(mix((*s_0).p0_0, (*s_0).p1_0, vec3<f32>(a_0)), (*s_0).h0_0 + (_S1 - 360.0f * round(_S1 / 360.0f)) * a_0);
}

struct State_0
{
     p0_0 : vec3<f32>,
     t0_0 : f32,
     p1_0 : vec3<f32>,
     t1_0 : f32,
     h0_0 : f32,
     h1_0 : f32,
     sampled_0 : f32,
     pad_0 : f32,
};

fn shown_1( s_1 : State_0,  t_1 : f32) -> vec4<f32>
{
    var a_1 : f32 = clamp((t_1 - s_1.t0_0) / max(s_1.t1_0 - s_1.t0_0, 9.99999997475242708e-07f), 0.0f, 1.0f);
    var _S2 : f32 = s_1.h1_0 - s_1.h0_0;
    return vec4<f32>(mix(s_1.p0_0, s_1.p1_0, vec3<f32>(a_1)), s_1.h0_0 + (_S2 - 360.0f * round(_S2 / 360.0f)) * a_1);
}

@compute
@workgroup_size(64, 1, 1)
fn applySamples(@builtin(global_invocation_id) gid_0 : vec3<u32>)
{
    var k_0 : u32 = gid_0.x + gid_0.y * update_0.threads_0;
    if((k_0 >= (update_0.n_0)))
    {
        return;
    }
    var i_0 : u32 = update_0.first_0 + k_0;
    var next_0 : vec4<f32> = samples_0[k_0];
    var s_2 : State_0;
    s_2.p0_0 = state_0[i_0].p0_0;
    s_2.t0_0 = state_0[i_0].t0_0;
    s_2.p1_0 = state_0[i_0].p1_0;
    s_2.t1_0 = state_0[i_0].t1_0;
    s_2.h0_0 = state_0[i_0].h0_0;
    s_2.h1_0 = state_0[i_0].h1_0;
    s_2.sampled_0 = state_0[i_0].sampled_0;
    s_2.pad_0 = state_0[i_0].pad_0;
    var start_0 : vec4<f32>;
    if(((s_2.sampled_0) > 0.5f))
    {
        start_0 = shown_1(s_2, update_0.now_0 - update_0.delay_0);
    }
    else
    {
        start_0 = next_0;
    }
    s_2.p0_0 = start_0.xyz;
    s_2.h0_0 = start_0.w;
    s_2.t0_0 = update_0.now_0 - update_0.delay_0;
    s_2.p1_0 = next_0.xyz;
    s_2.h1_0 = next_0.w;
    s_2.t1_0 = update_0.now_0;
    s_2.sampled_0 = 1.0f;
    state_0[i_0].p0_0 = s_2.p0_0;
    state_0[i_0].t0_0 = s_2.t0_0;
    state_0[i_0].p1_0 = s_2.p1_0;
    state_0[i_0].t1_0 = s_2.t1_0;
    state_0[i_0].h0_0 = s_2.h0_0;
    state_0[i_0].h1_0 = s_2.h1_0;
    state_0[i_0].sampled_0 = s_2.sampled_0;
    state_0[i_0].pad_0 = s_2.pad_0;
    return;
}

fn groundHeight_0( x_0 : f32,  y_0 : f32,  none_0 : f32) -> f32
{
    var width_0 : u32;
    var height_0 : u32;
    {var dim = textureDimensions((heights_0));((width_0)) = dim.x;((height_0)) = dim.y;};
    var size_0 : vec2<i32> = vec2<i32>(i32(width_0), i32(height_0));
    var _S3 : vec2<f32> = vec2<f32>(0.5f);
    var uv_0 : vec2<f32> = vec2<f32>(x_0, - y_0) / vec2<f32>(params_0.halfExtent_0) * _S3 + _S3;
    var _S4 : bool;
    if((any(((uv_0 < vec2<f32>(0.0f))))))
    {
        _S4 = true;
    }
    else
    {
        _S4 = (any(((uv_0 > vec2<f32>(1.0f)))));
    }
    if(_S4)
    {
        return none_0;
    }
    var texel_0 : vec2<f32> = uv_0 * vec2<f32>(size_0) - _S3;
    var base_0 : vec2<f32> = floor(texel_0);
    var f_0 : vec2<f32> = texel_0 - base_0;
    var _S5 : vec2<i32> = vec2<i32>(base_0);
    var top_1 : vec2<i32> = size_0 - vec2<i32>(i32(1));
    var _S6 : vec2<i32> = vec2<i32>(i32(0));
    var _S7 : vec3<i32> = vec3<i32>(clamp(_S5, _S6, top_1), i32(0));
    var d00_0 : f32 = (textureLoad((heights_0), ((_S7)).xy, ((_S7)).z));
    var _S8 : vec3<i32> = vec3<i32>(clamp(_S5 + vec2<i32>(i32(1), i32(0)), _S6, top_1), i32(0));
    var d10_0 : f32 = (textureLoad((heights_0), ((_S8)).xy, ((_S8)).z));
    var _S9 : vec3<i32> = vec3<i32>(clamp(_S5 + vec2<i32>(i32(0), i32(1)), _S6, top_1), i32(0));
    var d01_0 : f32 = (textureLoad((heights_0), ((_S9)).xy, ((_S9)).z));
    var _S10 : vec3<i32> = vec3<i32>(clamp(_S5 + vec2<i32>(i32(1), i32(1)), _S6, top_1), i32(0));
    var d11_0 : f32 = (textureLoad((heights_0), ((_S10)).xy, ((_S10)).z));
    var _S11 : f32 = max(max(d00_0, d10_0), max(d01_0, d11_0));
    if((_S11 <= 0.0f))
    {
        return none_0;
    }
    var _S12 : f32 = f_0.x;
    var _S13 : f32 = mix(mix(d00_0, d10_0, _S12), mix(d01_0, d11_0, _S12), f_0.y);
    var d_0 : f32;
    if(((min(min(d00_0, d10_0), min(d01_0, d11_0))) <= 0.0f))
    {
        d_0 = _S11;
    }
    else
    {
        d_0 = _S13;
    }
    return params_0.bottom_0 + d_0 * (params_0.top_0 - params_0.bottom_0);
}

@compute
@workgroup_size(64, 1, 1)
fn placePoints(@builtin(global_invocation_id) gid_1 : vec3<u32>)
{
    var i_1 : u32 = gid_1.x + gid_1.y * params_0.threads_1;
    if((i_1 >= (params_0.capacity_0)))
    {
        return;
    }
    var a_2 : u32 = params_0.anchors_0 + i_1 * u32(4);
    var _S14 : State_std430_0 = state_0[i_1];
    var _S15 : bool;
    if((i_1 >= (params_0.count_0)))
    {
        _S15 = true;
    }
    else
    {
        _S15 = ((_S14.sampled_0) < 0.5f);
    }
    if(_S15)
    {
        vertices_0[a_2] = 3.00000000549775576e+38f;
        return;
    }
    var _S16 : vec4<f32> = shown_0(&(_S14), params_0.time_0 - params_0.delay_1);
    var p_0 : vec4<f32> = _S16;
    if((params_0.clamped_0) != u32(0))
    {
        p_0[i32(2)] = p_0[i32(2)] + groundHeight_0(p_0.x, p_0.y, 0.0f);
    }
    vertices_0[a_2] = p_0.x;
    vertices_0[a_2 + u32(1)] = p_0.y;
    vertices_0[a_2 + u32(2)] = p_0.z;
    vertices_0[a_2 + u32(3)] = p_0.w;
    if(((params_0.stride_0) > u32(0)))
    {
        vertices_0[params_0.streams_0 + i_1 * params_0.stride_0 + params_0.headingWord_0] = p_0.w;
    }
    return;
}

