// Generated from src/shaders/lights.slang by slangc 2026.21
// (scripts/slangBuild.mjs). Do not edit: change the .slang and regenerate.
@binding(0) @group(0) var<storage, read_write> lightTable_0 : array<u32>;

var<workgroup> tileCount_0 : atomic<u32>;

struct Light_0
{
     position_0 : vec4<f32>,
     color_0 : vec4<f32>,
     direction_0 : vec4<f32>,
     cone_0 : vec4<f32>,
};

fn lightAt_0( l_0 : u32) -> Light_0
{
    var _S1 : u32 = u32(80) + l_0 * u32(64);
    var _S2 : Light_0 = Light_0( vec4<f32>(bitcast<f32>(lightTable_0[(_S1)/4]), bitcast<f32>(lightTable_0[(_S1 + u32(4))/4]), bitcast<f32>(lightTable_0[(_S1 + u32(8))/4]), bitcast<f32>(lightTable_0[(_S1 + u32(12))/4])), vec4<f32>(bitcast<f32>(lightTable_0[(_S1 + u32(16))/4]), bitcast<f32>(lightTable_0[(_S1 + u32(20))/4]), bitcast<f32>(lightTable_0[(_S1 + u32(24))/4]), bitcast<f32>(lightTable_0[(_S1 + u32(28))/4])), vec4<f32>(bitcast<f32>(lightTable_0[(_S1 + u32(32))/4]), bitcast<f32>(lightTable_0[(_S1 + u32(36))/4]), bitcast<f32>(lightTable_0[(_S1 + u32(40))/4]), bitcast<f32>(lightTable_0[(_S1 + u32(44))/4])), vec4<f32>(bitcast<f32>(lightTable_0[(_S1 + u32(48))/4]), bitcast<f32>(lightTable_0[(_S1 + u32(52))/4]), bitcast<f32>(lightTable_0[(_S1 + u32(56))/4]), bitcast<f32>(lightTable_0[(_S1 + u32(60))/4])) );
    return _S2;
}

var<workgroup> tileLights_0 : array<u32, i32(1024)>;

@compute
@workgroup_size(32, 1, 1)
fn assign(@builtin(workgroup_id) tile_0 : vec3<u32>, @builtin(local_invocation_index) k_0 : u32)
{
    var _S3 : bool;
    var _S4 : bool;
    var _S5 : f32 = bitcast<f32>(lightTable_0[(u32(12))/4]);
    var _S6 : f32 = bitcast<f32>(lightTable_0[(u32(16))/4]);
    var _S7 : f32 = bitcast<f32>(lightTable_0[(u32(20))/4]);
    var _S8 : f32 = bitcast<f32>(lightTable_0[(u32(32))/4]);
    var _S9 : f32 = bitcast<f32>(lightTable_0[(u32(36))/4]);
    var _S10 : f32 = bitcast<f32>(lightTable_0[(u32(40))/4]);
    var _S11 : f32 = bitcast<f32>(lightTable_0[(u32(48))/4]);
    var _S12 : f32 = bitcast<f32>(lightTable_0[(u32(52))/4]);
    var _S13 : f32 = bitcast<f32>(lightTable_0[(u32(56))/4]);
    var _S14 : f32 = bitcast<f32>(lightTable_0[(u32(64))/4]);
    var _S15 : f32 = bitcast<f32>(lightTable_0[(u32(68))/4]);
    var _S16 : f32 = bitcast<f32>(lightTable_0[(u32(72))/4]);
    var _S17 : vec3<u32> = vec3<u32>(vec3<f32>(bitcast<f32>(lightTable_0[(u32(0))/4]), bitcast<f32>(lightTable_0[(u32(4))/4]), bitcast<f32>(lightTable_0[(u32(8))/4])));
    var i_0 : u32 = tile_0.x;
    var j_0 : u32 = tile_0.y;
    var _S18 : u32 = _S17.x;
    var _S19 : vec2<f32> = vec2<f32>(2.0f);
    var _S20 : vec2<f32> = vec2<f32>(1.0f);
    var sx_0 : vec2<f32> = (vec2<f32>(f32(i_0), f32(i_0 + u32(1))) / vec2<f32>(f32(_S18)) * _S19 - _S20) * vec2<f32>(bitcast<f32>(lightTable_0[(u32(24))/4]));
    var _S21 : u32 = _S17.y;
    var sy_0 : vec2<f32> = (_S20 - vec2<f32>(f32(j_0 + u32(1)), f32(j_0)) / vec2<f32>(f32(_S21)) * _S19) * vec2<f32>(bitcast<f32>(lightTable_0[(u32(28))/4]));
    var _S22 : f32 = sx_0.x;
    var _S23 : vec3<f32> = vec3<f32>(-1.0f, 0.0f, _S22) * vec3<f32>(inverseSqrt(1.0f + _S22 * _S22));
    var _S24 : f32 = sx_0.y;
    var _S25 : vec3<f32> = vec3<f32>(1.0f, 0.0f, - _S24) * vec3<f32>(inverseSqrt(1.0f + _S24 * _S24));
    var _S26 : f32 = sy_0.x;
    var _S27 : vec3<f32> = vec3<f32>(0.0f, -1.0f, _S26) * vec3<f32>(inverseSqrt(1.0f + _S26 * _S26));
    var _S28 : f32 = sy_0.y;
    var _S29 : vec3<f32> = vec3<f32>(0.0f, 1.0f, - _S28) * vec3<f32>(inverseSqrt(1.0f + _S28 * _S28));
    if(k_0 == u32(0))
    {
        atomicStore(&(tileCount_0), u32(0));
    }
    workgroupBarrier();
    var _S30 : u32 = u32(_S5);
    var l_1 : u32 = k_0;
    loop
    {
        if((l_1 < _S30))
        {
        }
        else
        {
            break;
        }
        var light_0 : Light_0 = lightAt_0(l_1);
        var c_0 : vec3<f32> = light_0.position_0.xyz;
        var v_0 : vec3<f32> = vec3<f32>(dot(c_0, vec3<f32>(_S11, _S12, _S13)), dot(c_0, vec3<f32>(_S14, _S15, _S16)), dot(c_0, vec3<f32>(_S8, _S9, _S10)));
        var r_0 : f32 = light_0.position_0.w;
        if(((dot(_S23, v_0)) <= r_0))
        {
            _S3 = ((dot(_S25, v_0)) <= r_0);
        }
        else
        {
            _S3 = false;
        }
        if(_S3)
        {
            _S4 = ((dot(_S27, v_0)) <= r_0);
        }
        else
        {
            _S4 = false;
        }
        var _S31 : bool;
        if(_S4)
        {
            _S31 = ((dot(_S29, v_0)) <= r_0);
        }
        else
        {
            _S31 = false;
        }
        if(_S31)
        {
            var at_0 : u32 = atomicAdd(&(tileCount_0), u32(1));
            if((at_0 < u32(1024)))
            {
                tileLights_0[at_0] = l_1;
            }
        }
        l_1 = l_1 + u32(32);
    }
    workgroupBarrier();
    var _S32 : u32 = atomicLoad(&(tileCount_0));
    var _S33 : u32 = min(_S32, u32(1024));
    var z0_0 : f32 = _S6 * exp(f32(k_0) / _S7);
    var z1_0 : f32 = _S6 * exp(f32(k_0 + u32(1)) / _S7);
    var _S34 : vec3<f32> = vec3<f32>(min(_S22 * z0_0, _S22 * z1_0), min(_S26 * z0_0, _S26 * z1_0), z0_0);
    var _S35 : vec3<f32> = vec3<f32>(max(_S24 * z0_0, _S24 * z1_0), max(_S28 * z0_0, _S28 * z1_0), z1_0);
    var base_0 : u32 = ((k_0 * _S21 + j_0) * _S18 + i_0) * u32(17);
    var kept_0 : array<u32, i32(16)>;
    var score_0 : array<f32, i32(16)>;
    var count_0 : u32 = u32(0);
    var t_0 : u32 = u32(0);
    loop
    {
        if((t_0 < _S33))
        {
        }
        else
        {
            break;
        }
        var l_2 : u32 = tileLights_0[t_0];
        var light_1 : Light_0 = lightAt_0(tileLights_0[t_0]);
        var c_1 : vec3<f32> = light_1.position_0.xyz;
        var v_1 : vec3<f32> = vec3<f32>(dot(c_1, vec3<f32>(_S11, _S12, _S13)), dot(c_1, vec3<f32>(_S14, _S15, _S16)), dot(c_1, vec3<f32>(_S8, _S9, _S10)));
        var d_0 : vec3<f32> = v_1 - clamp(v_1, _S34, _S35);
        var d2_0 : f32 = dot(d_0, d_0);
        var _S36 : f32 = light_1.position_0.w;
        if((d2_0 > (_S36 * _S36)))
        {
            t_0 = t_0 + u32(1);
            continue;
        }
        var s_0 : f32 = max(light_1.color_0.x, max(light_1.color_0.y, light_1.color_0.z)) / max(d2_0, 1.0f);
        if(count_0 == u32(16))
        {
            _S3 = (s_0 <= (score_0[u32(15)]));
        }
        else
        {
            _S3 = false;
        }
        if(_S3)
        {
            t_0 = t_0 + u32(1);
            continue;
        }
        var at_1 : u32 = min(count_0, u32(15));
        loop
        {
            if((at_1 > u32(0)))
            {
                _S4 = ((score_0[at_1 - u32(1)]) < s_0);
            }
            else
            {
                _S4 = false;
            }
            if(_S4)
            {
            }
            else
            {
                break;
            }
            var _S37 : u32 = at_1 - u32(1);
            kept_0[at_1] = kept_0[_S37];
            score_0[at_1] = score_0[_S37];
            at_1 = _S37;
        }
        kept_0[at_1] = l_2;
        score_0[at_1] = s_0;
        count_0 = min(count_0 + u32(1), u32(16));
        t_0 = t_0 + u32(1);
    }
    t_0 = u32(0);
    loop
    {
        if((t_0 < count_0))
        {
        }
        else
        {
            break;
        }
        lightTable_0[(u32(65616) + (base_0 + u32(1) + t_0) * u32(4))/4] = kept_0[t_0];
        t_0 = t_0 + u32(1);
    }
    lightTable_0[(u32(65616) + base_0 * u32(4))/4] = count_0;
    return;
}

