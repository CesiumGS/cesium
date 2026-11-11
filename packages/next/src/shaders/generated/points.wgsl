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
    @align(4) placement_0 : u32,
    @align(8) held_0 : u32,
    @align(4) pad2_1 : u32,
};

@binding(0) @group(0) var<uniform> params_0 : PointParams_std140_0;
@binding(2) @group(0) var<storage, read_write> vertices_0 : array<f32>;

@binding(3) @group(0) var heights_0 : texture_depth_2d;

@binding(7) @group(1) var<storage, read> placements_0 : array<vec4<f32>>;

const TERM_POWERS_0 : array<u32, i32(20)> = array<u32, i32(20)>( u32(0), u32(1), u32(4), u32(16), u32(2), u32(5), u32(17), u32(8), u32(20), u32(32), u32(3), u32(6), u32(18), u32(9), u32(21), u32(33), u32(12), u32(24), u32(36), u32(48) );
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

fn placementParameter_0( word_0 : u32) -> f32
{
    return placements_0[(word_0 >> (u32(2)))][(word_0 & (u32(3)))];
}

fn termWeight_0( row_0 : u32,  head_0 : vec4<u32>) -> f32
{
    var _S14 : f32 = (bitcast<f32>((head_0.y)));
    var _S15 : u32 = ((((head_0.x) >> (u32(8)))) & (u32(3)));
    var f_1 : u32 = u32(0);
    var w_0 : f32 = _S14;
    loop
    {
        if((f_1 < _S15))
        {
        }
        else
        {
            break;
        }
        var _S16 : vec4<f32> = placements_0[row_0 + u32(1) + f_1];
        var w_1 : f32 = w_0 * (_S16.y + _S16.z * placementParameter_0((bitcast<u32>((_S16.x)))));
        f_1 = f_1 + u32(1);
        w_0 = w_1;
    }
    return w_0;
}

fn latticeDisplacement_0( body_0 : u32,  cells_0 : u32,  p_0 : vec3<f32>,  jacobian_0 : ptr<function, mat3x3<f32>>,  clip_0 : ptr<function, f32>) -> vec3<f32>
{
    var _S17 : vec4<f32> = placements_0[body_0];
    var _S18 : f32 = _S17.w;
    var v_0 : vec3<f32> = (p_0 - _S17.xyz) * vec3<f32>(_S18);
    var v_1 : vec3<f32>;
    var cell_0 : u32;
    var dvdp_0 : f32;
    if((cells_0 > u32(1)))
    {
        var n_1 : f32 = f32(cells_0);
        var _S19 : vec3<f32> = vec3<f32>(1.0f);
        var s_3 : vec3<f32> = (v_0 + _S19) * vec3<f32>((0.5f * n_1));
        var f_2 : vec3<f32> = clamp(floor(s_3), vec3<f32>(0.0f), vec3<f32>((n_1 - 1.0f)));
        var _S20 : vec3<u32> = vec3<u32>(f_2);
        var _S21 : u32 = (_S20.z * cells_0 + _S20.y) * cells_0 + _S20.x;
        var dvdp_1 : f32 = _S18 * n_1;
        v_1 = vec3<f32>(2.0f) * (s_3 - f_2) - _S19;
        cell_0 = _S21;
        dvdp_0 = dvdp_1;
    }
    else
    {
        v_1 = v_0;
        cell_0 = u32(0);
        dvdp_0 = _S18;
    }
    var _S22 : f32 = v_1.x;
    var _S23 : f32 = _S22 * _S22;
    var _S24 : vec4<f32> = vec4<f32>(1.0f, _S22, _S23, _S23 * _S22);
    var _S25 : f32 = v_1.y;
    var _S26 : f32 = _S25 * _S25;
    var _S27 : vec4<f32> = vec4<f32>(1.0f, _S25, _S26, _S26 * _S25);
    var _S28 : f32 = v_1.z;
    var _S29 : f32 = _S28 * _S28;
    var _S30 : vec4<f32> = vec4<f32>(1.0f, _S28, _S29, _S29 * _S28);
    var _S31 : vec4<f32> = vec4<f32>(0.0f, 1.0f, 2.0f * _S22, 3.0f * _S22 * _S22);
    var _S32 : vec4<f32> = vec4<f32>(0.0f, 1.0f, 2.0f * _S25, 3.0f * _S25 * _S25);
    var _S33 : vec4<f32> = vec4<f32>(0.0f, 1.0f, 2.0f * _S28, 3.0f * _S28 * _S28);
    var _S34 : u32 = body_0 + u32(3) + cell_0 * u32(20);
    var _S35 : vec3<f32> = vec3<f32>(0.0f);
    var k_1 : u32 = u32(0);
    var d_1 : vec3<f32> = _S35;
    var scalar_0 : f32 = 0.0f;
    var gx_0 : vec3<f32> = _S35;
    var gy_0 : vec3<f32> = _S35;
    var gz_0 : vec3<f32> = _S35;
    loop
    {
        if((k_1 < u32(20)))
        {
        }
        else
        {
            break;
        }
        var a_2 : u32 = ((TERM_POWERS_0[k_1]) & (u32(3)));
        var b_0 : u32 = ((((TERM_POWERS_0[k_1]) >> (u32(2)))) & (u32(3)));
        var c_0 : u32 = ((((TERM_POWERS_0[k_1]) >> (u32(4)))) & (u32(3)));
        var _S36 : vec4<f32> = placements_0[_S34 + k_1];
        var coefficient_0 : vec3<f32> = _S36.xyz;
        var _S37 : f32 = _S24[a_2] * _S27[b_0];
        var _S38 : f32 = _S37 * _S30[c_0];
        var d_2 : vec3<f32> = d_1 + coefficient_0 * vec3<f32>(_S38);
        var scalar_1 : f32 = scalar_0 + _S36.w * _S38;
        var gx_1 : vec3<f32> = gx_0 + coefficient_0 * vec3<f32>((_S31[a_2] * (_S27[b_0] * _S30[c_0])));
        var gy_1 : vec3<f32> = gy_0 + coefficient_0 * vec3<f32>((_S32[b_0] * (_S24[a_2] * _S30[c_0])));
        var gz_1 : vec3<f32> = gz_0 + coefficient_0 * vec3<f32>((_S33[c_0] * _S37));
        k_1 = k_1 + u32(1);
        d_1 = d_2;
        scalar_0 = scalar_1;
        gx_0 = gx_1;
        gy_0 = gy_1;
        gz_0 = gz_1;
    }
    (*jacobian_0) = transpose(mat3x3<f32>(gx_0 * vec3<f32>(dvdp_0), gy_0 * vec3<f32>(dvdp_0), gz_0 * vec3<f32>(dvdp_0)));
    (*clip_0) = scalar_0;
    return d_1;
}

fn placeAnchor_0( placement_1 : u32,  p_1 : vec3<f32>) -> vec3<f32>
{
    if(placement_1 == u32(4294967295))
    {
        return p_1;
    }
    var _S39 : u32 = (bitcast<u32>((placements_0[placement_1].x)));
    var _S40 : vec3<f32> = vec3<f32>(0.0f);
    var i_1 : u32 = u32(0);
    var d_3 : vec3<f32> = _S40;
    loop
    {
        if((i_1 < _S39))
        {
        }
        else
        {
            break;
        }
        var row_1 : u32 = placement_1 + u32(1) + i_1 * u32(3);
        var head_1 : vec4<u32> = (bitcast<vec4<u32>>((placements_0[row_1])));
        if((((head_1.x) & (u32(255)))) != u32(1))
        {
            i_1 = i_1 + u32(1);
            continue;
        }
        var body_1 : u32 = placement_1 + head_1.z;
        var jacobian_1 : mat3x3<f32>;
        var clip_1 : f32;
        d_3 = d_3 + vec3<f32>(termWeight_0(row_1, head_1)) * (placements_0[body_1 + u32(1)].xyz + placements_0[body_1 + u32(2)].xyz + latticeDisplacement_0(body_1, head_1.w, p_1, &(jacobian_1), &(clip_1)));
        i_1 = i_1 + u32(1);
    }
    return p_1 + d_3;
}

@compute
@workgroup_size(64, 1, 1)
fn placePoints(@builtin(global_invocation_id) gid_1 : vec3<u32>)
{
    var i_2 : u32 = gid_1.x + gid_1.y * params_0.threads_1;
    if((i_2 >= (params_0.capacity_0)))
    {
        return;
    }
    var a_3 : u32 = params_0.anchors_0 + i_2 * u32(4);
    var _S41 : State_std430_0 = state_0[i_2];
    var _S42 : bool;
    if((i_2 >= (params_0.count_0)))
    {
        _S42 = true;
    }
    else
    {
        _S42 = ((_S41.sampled_0) < 0.5f);
    }
    if(_S42)
    {
        _S42 = true;
    }
    else
    {
        _S42 = (params_0.held_0) != u32(0);
    }
    if(_S42)
    {
        vertices_0[a_3] = 3.00000000549775576e+38f;
        return;
    }
    var _S43 : vec4<f32> = shown_0(&(_S41), params_0.time_0 - params_0.delay_1);
    var p_2 : vec4<f32> = _S43;
    if((params_0.clamped_0) != u32(0))
    {
        p_2[i32(2)] = p_2[i32(2)] + groundHeight_0(p_2.x, p_2.y, 0.0f);
    }
    var _S44 : vec3<f32> = placeAnchor_0(params_0.placement_0, p_2.xyz);
    p_2.x = _S44.x;
    p_2.y = _S44.y;
    p_2.z = _S44.z;
    vertices_0[a_3] = p_2.x;
    vertices_0[a_3 + u32(1)] = p_2.y;
    vertices_0[a_3 + u32(2)] = p_2.z;
    vertices_0[a_3 + u32(3)] = p_2.w;
    if(((params_0.stride_0) > u32(0)))
    {
        vertices_0[params_0.streams_0 + i_2 * params_0.stride_0 + params_0.headingWord_0] = p_2.w;
    }
    return;
}

