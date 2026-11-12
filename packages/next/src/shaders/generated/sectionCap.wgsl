// Generated from src/shaders/sectionCap.slang by slangc 2026.21
// (scripts/slangBuild.mjs). Do not edit: change the .slang and regenerate.
@binding(0) @group(1) var parityLow_0 : texture_2d<f32>;

@binding(1) @group(1) var parityHigh_0 : texture_2d<f32>;

@binding(17) @group(0) var<storage, read> clipTable_0 : array<vec4<f32>>;

struct _MatrixStorage_float4x4_ColMajorstd140_0
{
    @align(16) data_0 : array<vec4<f32>, i32(4)>,
};

struct AnchorEye_std140_0
{
    @align(16) eyeHi_0 : vec4<f32>,
    @align(16) eyeLo_0 : vec4<f32>,
    @align(16) axes_0 : array<vec4<f32>, i32(3)>,
};

struct _Array_std140_AnchorEye32_0
{
    @align(16) data_1 : array<AnchorEye_std140_0, i32(32)>,
};

struct View_std140_0
{
    @align(16) viewProj_0 : _MatrixStorage_float4x4_ColMajorstd140_0,
    @align(16) viewRotation_0 : _MatrixStorage_float4x4_ColMajorstd140_0,
    @align(16) cameraHi_0 : vec3<f32>,
    @align(4) near_0 : f32,
    @align(16) cameraLo_0 : vec3<f32>,
    @align(4) aspect_0 : f32,
    @align(16) planes_0 : array<vec4<f32>, i32(5)>,
    @align(16) sunDirection_0 : vec4<f32>,
    @align(16) viewport_0 : vec4<f32>,
    @align(16) iblFrame_0 : array<vec4<f32>, i32(3)>,
    @align(16) sunIlluminance_0 : f32,
    @align(4) diffuseIbl_0 : f32,
    @align(8) specularIbl_0 : f32,
    @align(4) specularMaxLod_0 : f32,
    @align(16) viewBit_0 : u32,
    @align(4) exposure_0 : f32,
    @align(8) aerialStart_0 : f32,
    @align(4) aerialEnd_0 : f32,
    @align(16) sunLight_0 : vec4<f32>,
    @align(16) bodyRadii_0 : vec4<f32>,
    @align(16) moonLight_0 : vec4<f32>,
    @align(16) time_0 : vec4<f32>,
    @align(16) anchors_0 : _Array_std140_AnchorEye32_0,
};

@binding(0) @group(0) var<uniform> view_0 : View_std140_0;
struct vertexOutput_0
{
    @builtin(position) output_0 : vec4<f32>,
};

@vertex
fn vs(@builtin(vertex_index) v_0 : u32) -> vertexOutput_0
{
    var _S1 : vertexOutput_0 = vertexOutput_0( vec4<f32>(vec2<f32>(f32((((v_0 << (u32(1)))) & (u32(2)))), f32((v_0 & (u32(2))))) * vec2<f32>(2.0f) - vec2<f32>(1.0f), 0.0f, 1.0f) );
    return _S1;
}

fn clipRow_0( row_0 : u32) -> vec4<f32>
{
    return clipTable_0[min(row_0, u32(4095))];
}

fn clipVertex_0( first_0 : u32,  i_0 : u32) -> vec2<f32>
{
    var v_1 : vec4<f32> = clipRow_0(first_0 + ((i_0 >> (u32(1)))));
    var _S2 : vec2<f32>;
    if(((i_0 & (u32(1)))) == u32(0))
    {
        _S2 = v_1.xy;
    }
    else
    {
        _S2 = v_1.zw;
    }
    return _S2;
}

fn insideClipShape_0( at_0 : u32,  p_0 : vec3<f32>) -> bool
{
    var head_0 : vec4<u32> = (bitcast<vec4<u32>>((clipRow_0(at_0))));
    var a_0 : vec4<f32> = clipRow_0(at_0 + u32(1));
    var ua_0 : f32 = dot(a_0.xyz, p_0) + a_0.w;
    var _S3 : u32 = head_0.x;
    if(_S3 == u32(0))
    {
        return (ua_0 <= 0.0f);
    }
    var b_0 : vec4<f32> = clipRow_0(at_0 + u32(2));
    var c_0 : vec4<f32> = clipRow_0(at_0 + u32(3));
    var ub_0 : f32 = dot(b_0.xyz, p_0) + b_0.w;
    var uc_0 : f32 = dot(c_0.xyz, p_0) + c_0.w;
    if(_S3 == u32(1))
    {
        return ((max(abs(ua_0), max(abs(ub_0), abs(uc_0)))) <= 1.0f);
    }
    var zRange_0 : vec2<f32> = clipRow_0(at_0 + u32(4)).xy;
    var inside_0 : bool;
    if((uc_0 < (zRange_0.x)))
    {
        inside_0 = true;
    }
    else
    {
        inside_0 = (uc_0 > (zRange_0.y));
    }
    if(inside_0)
    {
        return false;
    }
    var _S4 : u32 = min(head_0.z, u32(128));
    inside_0 = false;
    var i_1 : u32 = u32(0);
    loop
    {
        if((i_1 < u32(128)))
        {
        }
        else
        {
            break;
        }
        if((i_1 >= _S4))
        {
            break;
        }
        var _S5 : u32 = at_0 + u32(5);
        var s_0 : vec2<f32> = clipVertex_0(_S5, i_1);
        var _S6 : u32 = i_1 + u32(1);
        var _S7 : u32;
        if(_S6 == _S4)
        {
            _S7 = u32(0);
        }
        else
        {
            _S7 = _S6;
        }
        var e_0 : vec2<f32> = clipVertex_0(_S5, _S7);
        var _S8 : f32 = s_0.y;
        var _S9 : f32 = e_0.y;
        if((_S8 > ub_0) != (_S9 > ub_0))
        {
            var _S10 : f32 = s_0.x;
            var inside_1 : bool;
            if((ua_0 < (_S10 + (ub_0 - _S8) * (e_0.x - _S10) / (_S9 - _S8))))
            {
                inside_1 = !inside_0;
            }
            else
            {
                inside_1 = inside_0;
            }
            inside_0 = inside_1;
        }
        i_1 = _S6;
    }
    return inside_0;
}

fn setKeeps_0( s_1 : u32,  p_1 : vec3<f32>) -> bool
{
    var region_0 : bool;
    var entry_0 : vec4<u32> = (bitcast<vec4<u32>>((clipRow_0(u32(1) + s_1))));
    var _S11 : u32 = entry_0.z;
    if(((_S11 & (u32(120)))) != u32(0))
    {
        return true;
    }
    var every_0 : bool = ((_S11 & (u32(1)))) != u32(0);
    var _S12 : u32 = entry_0.x;
    var _S13 : u32 = min(entry_0.y, u32(16));
    var k_0 : u32 = u32(0);
    var at_1 : u32 = _S12;
    loop
    {
        if((k_0 < u32(16)))
        {
        }
        else
        {
            region_0 = every_0;
            break;
        }
        if((k_0 >= _S13))
        {
            region_0 = every_0;
            break;
        }
        var inside_2 : bool = insideClipShape_0(at_1, p_1);
        if(every_0)
        {
            region_0 = !inside_2;
        }
        else
        {
            region_0 = inside_2;
        }
        if(region_0)
        {
            region_0 = !every_0;
            break;
        }
        var at_2 : u32 = at_1 + max((bitcast<vec4<u32>>((clipRow_0(at_1)))).y, u32(1));
        k_0 = k_0 + u32(1);
        at_1 = at_2;
    }
    if(((_S11 & (u32(2)))) != u32(0))
    {
        region_0 = !region_0;
    }
    return region_0;
}

fn hatchCover_0( h_0 : f32,  width_0 : f32,  pixel_0 : f32) -> f32
{
    if((pixel_0 > 0.5f))
    {
        return width_0;
    }
    var half_0 : f32 = 0.5f * width_0;
    var _S14 : f32 = 0.5f * max(pixel_0, 9.9999997473787516e-05f);
    return 1.0f - smoothstep(half_0 - _S14, half_0 + _S14, 0.5f - abs(fract(h_0) - 0.5f));
}

struct CapOut_0
{
    @location(0) color_0 : vec4<f32>,
    @interpolate(flat) @location(1) featureId_0 : vec2<u32>,
    @location(2) display_0 : vec4<f32>,
    @builtin(frag_depth) depth_0 : f32,
};

@fragment
fn fs(@builtin(position) frag_0 : vec4<f32>) -> CapOut_0
{
    var cover_0 : f32;
    var _S15 : vec2<f32> = frag_0.xy;
    var _S16 : vec3<i32> = vec3<i32>(vec2<i32>(_S15), i32(0));
    var _S17 : vec4<f32> = (textureLoad((parityLow_0), ((_S16)).xy, ((_S16)).z));
    var _S18 : vec4<f32> = (textureLoad((parityHigh_0), ((_S16)).xy, ((_S16)).z));
    var head_1 : vec4<u32> = (bitcast<vec4<u32>>((clipRow_0(u32(0)))));
    var _S19 : u32 = min(head_1.w, u32(8));
    var _S20 : u32 = min(head_1.x, u32(8));
    var ndc_0 : vec2<f32> = _S15 * view_0.viewport_0.zw * vec2<f32>(2.0f, -2.0f) + vec2<f32>(-1.0f, 1.0f);
    var _S21 : vec3<f32> = vec3<f32>(view_0.viewProj_0.data_0[i32(0)][i32(0)], view_0.viewProj_0.data_0[i32(1)][i32(0)], view_0.viewProj_0.data_0[i32(2)][i32(0)]);
    var _S22 : vec3<f32> = vec3<f32>(view_0.viewProj_0.data_0[i32(0)][i32(1)], view_0.viewProj_0.data_0[i32(1)][i32(1)], view_0.viewProj_0.data_0[i32(2)][i32(1)]);
    var ray_0 : vec3<f32> = _S21 * vec3<f32>((ndc_0.x / dot(_S21, _S21))) + _S22 * vec3<f32>((ndc_0.y / dot(_S22, _S22))) + vec3<f32>(view_0.viewProj_0.data_0[i32(0)][i32(3)], view_0.viewProj_0.data_0[i32(1)][i32(3)], view_0.viewProj_0.data_0[i32(2)][i32(3)]);
    var best_0 : f32 = 1.00000001504746622e+30f;
    var face_0 : u32 = u32(0);
    var k_1 : u32 = u32(0);
    loop
    {
        if((k_1 < u32(8)))
        {
        }
        else
        {
            break;
        }
        if((k_1 >= _S19))
        {
            break;
        }
        if((k_1 < u32(4)))
        {
            cover_0 = _S17[k_1];
        }
        else
        {
            cover_0 = _S18[k_1 - u32(4)];
        }
        var _S23 : u32 = head_1.z + u32(3) * k_1;
        var plane_0 : vec4<f32> = clipRow_0(_S23);
        var _S24 : vec3<f32> = plane_0.xyz;
        var along_0 : f32 = dot(_S24, ray_0);
        var _S25 : bool;
        if((cover_0 < 0.5f))
        {
            _S25 = true;
        }
        else
        {
            _S25 = (along_0 <= 9.99999997475242708e-07f);
        }
        if(_S25)
        {
            k_1 = k_1 + u32(1);
            continue;
        }
        var t_0 : f32 = - plane_0.w / along_0;
        var _S26 : bool;
        if((t_0 <= 0.0f))
        {
            _S26 = true;
        }
        else
        {
            _S26 = (t_0 >= best_0);
        }
        if(_S26)
        {
            k_1 = k_1 + u32(1);
            continue;
        }
        var p_2 : vec3<f32> = ray_0 * vec3<f32>(t_0);
        var own_0 : u32 = (bitcast<u32>((clipRow_0(_S23 + u32(1)).w)));
        var _S27 : vec3<f32> = _S24 * vec3<f32>((0.0010000000474974513f + 1.9999999494757503e-05f * t_0));
        var _S28 : bool;
        if(!setKeeps_0(own_0, p_2 + _S27))
        {
            _S28 = true;
        }
        else
        {
            _S28 = setKeeps_0(own_0, p_2 - _S27);
        }
        if(_S28)
        {
            k_1 = k_1 + u32(1);
            continue;
        }
        var others_0 : bool = true;
        var s_2 : u32 = u32(0);
        loop
        {
            if((s_2 < u32(8)))
            {
            }
            else
            {
                break;
            }
            if((s_2 >= _S20))
            {
                break;
            }
            var _S29 : bool;
            if(s_2 != own_0)
            {
                _S29 = !setKeeps_0(s_2, p_2);
            }
            else
            {
                _S29 = false;
            }
            if(_S29)
            {
                others_0 = false;
            }
            s_2 = s_2 + u32(1);
        }
        var best_1 : f32;
        var face_1 : u32;
        if(others_0)
        {
            best_1 = t_0;
            face_1 = k_1;
        }
        else
        {
            best_1 = best_0;
            face_1 = face_0;
        }
        best_0 = best_1;
        face_0 = face_1;
        k_1 = k_1 + u32(1);
    }
    if((best_0 >= 1.00000001504746622e+30f))
    {
        discard;
    }
    var _S30 : u32 = head_1.z;
    var look_0 : vec4<f32> = clipRow_0(_S30 - u32(2));
    var hatch_0 : vec4<f32> = clipRow_0(_S30 - u32(1));
    var _S31 : u32 = _S30 + u32(3) * face_0;
    var u_0 : vec3<f32> = clipRow_0(_S31 + u32(2)).xyz;
    var _S32 : vec3<f32> = clipRow_0(_S31).xyz;
    var _S33 : vec3<f32> = ray_0 * vec3<f32>(best_0) - clipRow_0(_S31 + u32(1)).xyz;
    var pixel_1 : f32 = 2.0f * best_0 * view_0.viewport_0.w / length(_S22) / max(abs(dot(_S32, ray_0)) / length(ray_0), 0.20000000298023224f);
    var _S34 : f32 = max(hatch_0.x, 0.0010000000474974513f);
    var angle_0 : f32 = hatch_0.z;
    var h_1 : f32 = (dot(_S33, u_0) * cos(angle_0) + dot(_S33, cross(_S32, u_0)) * sin(angle_0)) / _S34;
    var _S35 : f32 = hatch_0.y;
    if((_S35 > 0.0f))
    {
        cover_0 = hatchCover_0(h_1, _S35, pixel_1 / _S34) * hatch_0.w;
    }
    else
    {
        cover_0 = 0.0f;
    }
    var rgb_0 : vec3<f32> = look_0.xyz * vec3<f32>(mix(1.0f, 0.55000001192092896f, cover_0));
    var o_0 : CapOut_0;
    o_0.color_0 = vec4<f32>(0.0f);
    o_0.featureId_0 = vec2<u32>(u32(0), u32(0));
    var _S36 : f32 = look_0.w;
    o_0.display_0 = vec4<f32>(rgb_0 * vec3<f32>(_S36), _S36);
    o_0.depth_0 = view_0.near_0 / best_0;
    return o_0;
}

