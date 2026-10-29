struct _MatrixStorage_float4x4_ColMajorstd430_0
{
    @align(16) data_0 : array<vec4<f32>, i32(4)>,
};

struct DrawRecord_std430_0
{
    @align(16) originHi_0 : vec3<f32>,
    @align(4) radius_0 : f32,
    @align(16) originLo_0 : vec3<f32>,
    @align(4) flags_0 : u32,
    @align(16) model_0 : _MatrixStorage_float4x4_ColMajorstd430_0,
    @align(16) color_0 : vec4<f32>,
    @align(16) center_0 : vec3<f32>,
    @align(4) materialIndex_0 : u32,
    @align(16) indexCount_0 : u32,
    @align(4) firstIndex_0 : u32,
    @align(8) featureId_0 : u32,
    @align(4) batch_0 : u32,
    @align(16) positionOffset_0 : u32,
    @align(4) normalOffset_0 : u32,
    @align(8) uvOffset_0 : u32,
    @align(4) colorOffset_0 : u32,
    @align(16) tangentOffset_0 : u32,
    @align(4) textureSet_0 : u32,
    @align(8) imagerySlice_0 : u32,
    @align(4) pad_0 : u32,
};

@binding(0) @group(1) var<storage, read> records_0 : array<DrawRecord_std430_0>;

struct DrawInstance_std430_0
{
    @align(16) relModel_0 : _MatrixStorage_float4x4_ColMajorstd430_0,
};

@binding(1) @group(1) var<storage, read> instances_0 : array<DrawInstance_std430_0>;

@binding(2) @group(1) var<storage, read> vertices_0 : array<f32>;

struct _MatrixStorage_float4x4_ColMajorstd140_0
{
    @align(16) data_1 : array<vec4<f32>, i32(4)>,
};

struct View_std140_0
{
    @align(16) viewProj_0 : _MatrixStorage_float4x4_ColMajorstd140_0,
    @align(16) viewRotation_0 : _MatrixStorage_float4x4_ColMajorstd140_0,
    @align(16) cameraHi_0 : vec3<f32>,
    @align(4) nearPlane_0 : f32,
    @align(16) cameraLo_0 : vec3<f32>,
    @align(4) aspect_0 : f32,
    @align(16) planes_0 : array<vec4<f32>, i32(5)>,
    @align(16) sunDirection_0 : vec4<f32>,
    @align(16) viewport_0 : vec4<f32>,
    @align(16) iblFrame_0 : array<vec4<f32>, i32(3)>,
    @align(16) sunIntensity_0 : f32,
    @align(4) diffuseIbl_0 : f32,
    @align(8) specularIbl_0 : f32,
    @align(4) specularMaxLod_0 : f32,
};

@binding(0) @group(0) var<uniform> view_0 : View_std140_0;
struct Material_std430_0
{
    @align(16) baseColor_0 : vec4<f32>,
    @align(16) emissive_0 : vec3<f32>,
    @align(4) metallic_0 : f32,
    @align(16) roughness_0 : f32,
    @align(4) alphaCutoff_0 : f32,
    @align(8) normalScale_0 : f32,
    @align(4) occlusionStrength_0 : f32,
    @align(16) flags_1 : u32,
    @align(4) pad0_0 : u32,
    @align(8) pad1_0 : u32,
    @align(4) pad2_0 : u32,
};

@binding(3) @group(1) var<storage, read> materials_0 : array<Material_std430_0>;

@binding(0) @group(2) var baseColorTexture_0 : texture_2d<f32>;

@binding(5) @group(2) var baseColorSampler_0 : sampler;

@binding(4) @group(2) var emissiveTexture_0 : texture_2d<f32>;

@binding(9) @group(2) var emissiveSampler_0 : sampler;

@binding(1) @group(2) var metallicRoughnessTexture_0 : texture_2d<f32>;

@binding(6) @group(2) var metallicRoughnessSampler_0 : sampler;

@binding(2) @group(2) var normalTexture_0 : texture_2d<f32>;

@binding(7) @group(2) var normalSampler_0 : sampler;

@binding(3) @group(2) var occlusionTexture_0 : texture_2d<f32>;

@binding(8) @group(2) var occlusionSampler_0 : sampler;

@binding(3) @group(0) var brdfLut_0 : texture_2d<f32>;

@binding(2) @group(0) var environmentSampler_0 : sampler;

struct Sh_std140_0
{
    @align(16) c_0 : array<vec4<f32>, i32(9)>,
};

@binding(4) @group(0) var<uniform> irradianceSh_0 : Sh_std140_0;
@binding(1) @group(0) var specularEnvironment_0 : texture_cube<f32>;

fn rsqrt_0( x_0 : f32) -> f32
{
    return 1.0f / sqrt(x_0);
}

fn read3_0( offset_0 : u32,  i_0 : u32) -> vec3<f32>
{
    var b_0 : u32 = offset_0 + i_0 * u32(3);
    return vec3<f32>(vertices_0[b_0], vertices_0[b_0 + u32(1)], vertices_0[b_0 + u32(2)]);
}

fn read2_0( offset_1 : u32,  i_1 : u32) -> vec2<f32>
{
    var b_1 : u32 = offset_1 + i_1 * u32(2);
    return vec2<f32>(vertices_0[b_1], vertices_0[b_1 + u32(1)]);
}

fn read4_0( offset_2 : u32,  i_2 : u32) -> vec4<f32>
{
    var b_2 : u32 = offset_2 + i_2 * u32(4);
    return vec4<f32>(vertices_0[b_2], vertices_0[b_2 + u32(1)], vertices_0[b_2 + u32(2)], vertices_0[b_2 + u32(3)]);
}

struct VsOut_0
{
    @builtin(position) position_0 : vec4<f32>,
    @location(0) normal_0 : vec3<f32>,
    @location(1) uv_0 : vec2<f32>,
    @location(2) color_1 : vec4<f32>,
    @interpolate(flat) @location(3) draw_0 : u32,
    @location(4) relPosition_0 : vec3<f32>,
    @location(5) tangent_0 : vec4<f32>,
};

struct vertexInput_0
{
    @location(0) draw_1 : u32,
};

@vertex
fn vs( _S1 : vertexInput_0, @builtin(vertex_index) vertexIndex_0 : u32) -> VsOut_0
{
    var _S2 : DrawInstance_std430_0 = instances_0[_S1.draw_1];
    var _S3 : mat4x4<f32> = mat4x4<f32>(_S2.relModel_0.data_0[i32(0)][i32(0)], _S2.relModel_0.data_0[i32(1)][i32(0)], _S2.relModel_0.data_0[i32(2)][i32(0)], _S2.relModel_0.data_0[i32(3)][i32(0)], _S2.relModel_0.data_0[i32(0)][i32(1)], _S2.relModel_0.data_0[i32(1)][i32(1)], _S2.relModel_0.data_0[i32(2)][i32(1)], _S2.relModel_0.data_0[i32(3)][i32(1)], _S2.relModel_0.data_0[i32(0)][i32(2)], _S2.relModel_0.data_0[i32(1)][i32(2)], _S2.relModel_0.data_0[i32(2)][i32(2)], _S2.relModel_0.data_0[i32(3)][i32(2)], _S2.relModel_0.data_0[i32(0)][i32(3)], _S2.relModel_0.data_0[i32(1)][i32(3)], _S2.relModel_0.data_0[i32(2)][i32(3)], _S2.relModel_0.data_0[i32(3)][i32(3)]);
    var o_0 : VsOut_0;
    const _S4 : vec3<f32> = vec3<f32>(0.0f, 0.0f, 1.0f);
    var _S5 : u32 = records_0[_S1.draw_1].normalOffset_0;
    var normal_1 : vec3<f32>;
    if((records_0[_S1.draw_1].normalOffset_0) != u32(4294967295))
    {
        normal_1 = read3_0(_S5, vertexIndex_0);
    }
    else
    {
        normal_1 = _S4;
    }
    o_0.uv_0 = vec2<f32>(0.0f);
    var _S6 : u32 = records_0[_S1.draw_1].uvOffset_0;
    if((records_0[_S1.draw_1].uvOffset_0) != u32(4294967295))
    {
        o_0.uv_0 = read2_0(_S6, vertexIndex_0);
    }
    o_0.color_1 = vec4<f32>(1.0f);
    var _S7 : u32 = records_0[_S1.draw_1].colorOffset_0;
    if((records_0[_S1.draw_1].colorOffset_0) != u32(4294967295))
    {
        o_0.color_1 = read4_0(_S7, vertexIndex_0);
    }
    o_0.tangent_0 = vec4<f32>(0.0f);
    var _S8 : u32 = records_0[_S1.draw_1].tangentOffset_0;
    if((records_0[_S1.draw_1].tangentOffset_0) != u32(4294967295))
    {
        var t_0 : vec4<f32> = read4_0(_S8, vertexIndex_0);
        o_0.tangent_0 = vec4<f32>(normalize((((vec4<f32>(t_0.xyz, 0.0f)) * (_S3))).xyz), t_0.w);
    }
    var world_0 : vec4<f32> = (((vec4<f32>(read3_0(records_0[_S1.draw_1].positionOffset_0, vertexIndex_0), 1.0f)) * (_S3)));
    o_0.position_0 = (((world_0) * (mat4x4<f32>(view_0.viewProj_0.data_1[i32(0)][i32(0)], view_0.viewProj_0.data_1[i32(1)][i32(0)], view_0.viewProj_0.data_1[i32(2)][i32(0)], view_0.viewProj_0.data_1[i32(3)][i32(0)], view_0.viewProj_0.data_1[i32(0)][i32(1)], view_0.viewProj_0.data_1[i32(1)][i32(1)], view_0.viewProj_0.data_1[i32(2)][i32(1)], view_0.viewProj_0.data_1[i32(3)][i32(1)], view_0.viewProj_0.data_1[i32(0)][i32(2)], view_0.viewProj_0.data_1[i32(1)][i32(2)], view_0.viewProj_0.data_1[i32(2)][i32(2)], view_0.viewProj_0.data_1[i32(3)][i32(2)], view_0.viewProj_0.data_1[i32(0)][i32(3)], view_0.viewProj_0.data_1[i32(1)][i32(3)], view_0.viewProj_0.data_1[i32(2)][i32(3)], view_0.viewProj_0.data_1[i32(3)][i32(3)]))));
    o_0.relPosition_0 = world_0.xyz;
    var c0_0 : vec3<f32> = vec3<f32>(_S3[i32(0)][i32(0)], _S3[i32(1)][i32(0)], _S3[i32(2)][i32(0)]);
    var c1_0 : vec3<f32> = vec3<f32>(_S3[i32(0)][i32(1)], _S3[i32(1)][i32(1)], _S3[i32(2)][i32(1)]);
    var c2_0 : vec3<f32> = vec3<f32>(_S3[i32(0)][i32(2)], _S3[i32(1)][i32(2)], _S3[i32(2)][i32(2)]);
    var _S9 : vec3<f32> = cross(c1_0, c2_0);
    o_0.normal_0 = normalize(_S9 * vec3<f32>(normal_1.x) + cross(c2_0, c0_0) * vec3<f32>(normal_1.y) + cross(c0_0, c1_0) * vec3<f32>(normal_1.z)) * vec3<f32>(f32((i32(sign((dot(c0_0, _S9)))))));
    o_0.draw_0 = _S1.draw_1;
    return o_0;
}

fn fresnelSchlick_0( f0_0 : vec3<f32>,  f90_0 : vec3<f32>,  cosTheta_0 : f32) -> vec3<f32>
{
    var x_1 : f32 = 1.0f - cosTheta_0;
    var _S10 : vec3<f32> = vec3<f32>((x_1 * x_1));
    return f0_0 + (f90_0 - f0_0) * _S10 * _S10 * vec3<f32>(x_1);
}

fn smithVisibility_0( alpha_0 : f32,  nDotL_0 : f32,  nDotV_0 : f32) -> f32
{
    var a2_0 : f32 = alpha_0 * alpha_0;
    var _S11 : f32 = 1.0f - a2_0;
    var sum_0 : f32 = nDotL_0 * sqrt(nDotV_0 * nDotV_0 * _S11 + a2_0) + nDotV_0 * sqrt(nDotL_0 * nDotL_0 * _S11 + a2_0);
    var _S12 : f32;
    if((sum_0 > 0.0f))
    {
        _S12 = 0.5f / sum_0;
    }
    else
    {
        _S12 = 0.0f;
    }
    return _S12;
}

fn ggx_0( alpha_1 : f32,  nDotH_0 : f32) -> f32
{
    var a2_1 : f32 = alpha_1 * alpha_1;
    var f_0 : f32 = (nDotH_0 * a2_1 - nDotH_0) * nDotH_0 + 1.0f;
    return a2_1 / (3.1415927410125732f * f_0 * f_0);
}

fn toEnvironment_0( d_0 : vec3<f32>) -> vec3<f32>
{
    return vec3<f32>(dot(d_0, view_0.iblFrame_0[i32(0)].xyz), dot(d_0, view_0.iblFrame_0[i32(1)].xyz), dot(d_0, view_0.iblFrame_0[i32(2)].xyz));
}

fn irradiance_0( n_0 : vec3<f32>) -> vec3<f32>
{
    var x_2 : f32 = n_0.x;
    var y_0 : f32 = n_0.y;
    var z_0 : f32 = n_0.z;
    return max(irradianceSh_0.c_0[i32(0)].xyz + irradianceSh_0.c_0[i32(1)].xyz * vec3<f32>(y_0) + irradianceSh_0.c_0[i32(2)].xyz * vec3<f32>(z_0) + irradianceSh_0.c_0[i32(3)].xyz * vec3<f32>(x_2) + irradianceSh_0.c_0[i32(4)].xyz * vec3<f32>((x_2 * y_0)) + irradianceSh_0.c_0[i32(5)].xyz * vec3<f32>((y_0 * z_0)) + irradianceSh_0.c_0[i32(6)].xyz * vec3<f32>((3.0f * z_0 * z_0 - 1.0f)) + irradianceSh_0.c_0[i32(7)].xyz * vec3<f32>((z_0 * x_2)) + irradianceSh_0.c_0[i32(8)].xyz * vec3<f32>((x_2 * x_2 - y_0 * y_0)), vec3<f32>(0.0f));
}

struct FsOut_0
{
    @location(0) color_2 : vec4<f32>,
    @location(1) featureId_1 : vec2<u32>,
};

struct pixelInput_0
{
    @location(0) normal_2 : vec3<f32>,
    @location(1) uv_1 : vec2<f32>,
    @location(2) color_3 : vec4<f32>,
    @interpolate(flat) @location(3) draw_2 : u32,
    @location(4) relPosition_1 : vec3<f32>,
    @location(5) tangent_1 : vec4<f32>,
};

struct Material_0
{
     baseColor_0 : vec4<f32>,
     emissive_0 : vec3<f32>,
     metallic_0 : f32,
     roughness_0 : f32,
     alphaCutoff_0 : f32,
     normalScale_0 : f32,
     occlusionStrength_0 : f32,
     flags_1 : u32,
     pad0_0 : u32,
     pad1_0 : u32,
     pad2_0 : u32,
};

struct SurfaceInput_0
{
     uv_2 : vec2<f32>,
     vertexColor_0 : vec4<f32>,
     normal_3 : vec3<f32>,
     tangent_2 : vec4<f32>,
     dPdx_0 : vec3<f32>,
     dPdy_0 : vec3<f32>,
     dUVdx_0 : vec2<f32>,
     dUVdy_0 : vec2<f32>,
     drawColor_0 : vec4<f32>,
     material_0 : Material_0,
     baseColorSample_0 : vec4<f32>,
     metallicRoughnessSample_0 : vec4<f32>,
     normalSample_0 : vec3<f32>,
     occlusionSample_0 : f32,
     emissiveSample_0 : vec3<f32>,
};

struct Surface_0
{
     baseColor_1 : vec4<f32>,
     metallic_1 : f32,
     roughness_1 : f32,
     normal_4 : vec3<f32>,
     emissive_1 : vec3<f32>,
     occlusion_0 : f32,
     unlit_0 : bool,
};

fn DefaultMaterial_surface_0( i_3 : SurfaceInput_0) -> Surface_0
{
    var baseColorSample_1 : vec4<f32>;
    var emissiveSample_1 : vec3<f32>;
    if((((i_3.material_0.flags_1) & (u32(512)))) != u32(0))
    {
        var _S13 : vec3<f32> = vec3<f32>(2.2000000476837158f);
        var _S14 : vec3<f32> = pow(i_3.emissiveSample_0, _S13);
        baseColorSample_1 = vec4<f32>(pow(i_3.baseColorSample_0.xyz, _S13), i_3.baseColorSample_0.w);
        emissiveSample_1 = _S14;
    }
    else
    {
        baseColorSample_1 = i_3.baseColorSample_0;
        emissiveSample_1 = i_3.emissiveSample_0;
    }
    var s_0 : Surface_0;
    s_0.baseColor_1 = i_3.material_0.baseColor_0 * i_3.drawColor_0 * i_3.vertexColor_0;
    if((((i_3.material_0.flags_1) & (u32(16)))) != u32(0))
    {
        s_0.baseColor_1 = s_0.baseColor_1 * baseColorSample_1;
    }
    s_0.emissive_1 = i_3.material_0.emissive_0;
    if((((i_3.material_0.flags_1) & (u32(256)))) != u32(0))
    {
        s_0.emissive_1 = s_0.emissive_1 * emissiveSample_1;
    }
    s_0.metallic_1 = i_3.material_0.metallic_0;
    s_0.roughness_1 = i_3.material_0.roughness_0;
    if((((i_3.material_0.flags_1) & (u32(32)))) != u32(0))
    {
        s_0.roughness_1 = s_0.roughness_1 * i_3.metallicRoughnessSample_0.y;
        s_0.metallic_1 = s_0.metallic_1 * i_3.metallicRoughnessSample_0.z;
    }
    s_0.metallic_1 = clamp(s_0.metallic_1, 0.0f, 1.0f);
    s_0.roughness_1 = clamp(s_0.roughness_1, 0.0f, 1.0f);
    s_0.normal_4 = i_3.normal_3;
    if((((i_3.material_0.flags_1) & (u32(64)))) != u32(0))
    {
        var _S15 : f32 = i_3.tangent_2.w;
        var t_1 : vec3<f32>;
        var b_3 : vec3<f32>;
        if(_S15 != 0.0f)
        {
            var _S16 : vec3<f32> = i_3.tangent_2.xyz;
            var t_2 : vec3<f32> = normalize(_S16 - i_3.normal_3 * vec3<f32>(dot(i_3.normal_3, _S16)));
            var _S17 : vec3<f32> = cross(i_3.normal_3, t_2) * vec3<f32>(_S15);
            t_1 = t_2;
            b_3 = _S17;
        }
        else
        {
            var dp2perp_0 : vec3<f32> = cross(i_3.dPdy_0, i_3.normal_3);
            var dp1perp_0 : vec3<f32> = cross(i_3.normal_3, i_3.dPdx_0);
            var tt_0 : vec3<f32> = dp2perp_0 * vec3<f32>(i_3.dUVdx_0.x) + dp1perp_0 * vec3<f32>(i_3.dUVdy_0.x);
            var bb_0 : vec3<f32> = dp2perp_0 * vec3<f32>(i_3.dUVdx_0.y) + dp1perp_0 * vec3<f32>(i_3.dUVdy_0.y);
            var _S18 : vec3<f32> = vec3<f32>(rsqrt_0(max(dot(tt_0, tt_0), dot(bb_0, bb_0)) + 9.99999968265522539e-21f));
            var _S19 : vec3<f32> = bb_0 * _S18;
            t_1 = tt_0 * _S18;
            b_3 = _S19;
        }
        var _S20 : f32 = i_3.material_0.normalScale_0;
        var ts_0 : vec3<f32> = (i_3.normalSample_0 * vec3<f32>(2.0f) - vec3<f32>(1.0f)) * vec3<f32>(_S20, _S20, 1.0f);
        s_0.normal_4 = normalize(t_1 * vec3<f32>(ts_0.x) + b_3 * vec3<f32>(ts_0.y) + i_3.normal_3 * vec3<f32>(ts_0.z));
    }
    s_0.occlusion_0 = 1.0f;
    if((((i_3.material_0.flags_1) & (u32(128)))) != u32(0))
    {
        s_0.occlusion_0 = 1.0f + i_3.material_0.occlusionStrength_0 * (i_3.occlusionSample_0 - 1.0f);
    }
    s_0.unlit_0 = (((i_3.material_0.flags_1) & (u32(1)))) != u32(0);
    return s_0;
}

fn ToonMaterial_surface_0( i_4 : SurfaceInput_0) -> Surface_0
{
    var s_1 : Surface_0 = DefaultMaterial_surface_0(i_4);
    var _S21 : vec3<f32> = vec3<f32>(4.0f);
    s_1.baseColor_1 = vec4<f32>(floor(s_1.baseColor_1.xyz * _S21 + vec3<f32>(0.5f)) / _S21, s_1.baseColor_1.w);
    s_1.roughness_1 = max(s_1.roughness_1, 0.60000002384185791f);
    return s_1;
}

@fragment
fn fs( _S22 : pixelInput_0, @builtin(front_facing) frontFacing_0 : bool, @builtin(position) position_1 : vec4<f32>) -> FsOut_0
{
    var si_0 : SurfaceInput_0;
    var _S23 : Material_std430_0 = materials_0[records_0[_S22.draw_2].materialIndex_0];
    si_0.material_0.baseColor_0 = _S23.baseColor_0;
    si_0.material_0.emissive_0 = _S23.emissive_0;
    si_0.material_0.metallic_0 = _S23.metallic_0;
    si_0.material_0.roughness_0 = _S23.roughness_0;
    si_0.material_0.alphaCutoff_0 = _S23.alphaCutoff_0;
    si_0.material_0.normalScale_0 = _S23.normalScale_0;
    si_0.material_0.occlusionStrength_0 = _S23.occlusionStrength_0;
    si_0.material_0.flags_1 = _S23.flags_1;
    si_0.material_0.pad0_0 = _S23.pad0_0;
    si_0.material_0.pad1_0 = _S23.pad1_0;
    si_0.material_0.pad2_0 = _S23.pad2_0;
    si_0.uv_2 = _S22.uv_1;
    si_0.vertexColor_0 = _S22.color_3;
    si_0.drawColor_0 = records_0[_S22.draw_2].color_0;
    si_0.tangent_2 = _S22.tangent_1;
    si_0.baseColorSample_0 = (textureSample((baseColorTexture_0), (baseColorSampler_0), (_S22.uv_1)));
    si_0.emissiveSample_0 = (textureSample((emissiveTexture_0), (emissiveSampler_0), (_S22.uv_1))).xyz;
    si_0.metallicRoughnessSample_0 = (textureSample((metallicRoughnessTexture_0), (metallicRoughnessSampler_0), (_S22.uv_1)));
    si_0.normalSample_0 = (textureSample((normalTexture_0), (normalSampler_0), (_S22.uv_1))).xyz;
    si_0.occlusionSample_0 = (textureSample((occlusionTexture_0), (occlusionSampler_0), (_S22.uv_1))).x;
    si_0.dPdx_0 = dpdx(_S22.relPosition_1);
    si_0.dPdy_0 = dpdy(_S22.relPosition_1);
    si_0.dUVdx_0 = dpdx(_S22.uv_1);
    si_0.dUVdy_0 = dpdy(_S22.uv_1);
    var n_1 : vec3<f32> = normalize(_S22.normal_2);
    var _S24 : vec3<f32>;
    if(frontFacing_0)
    {
        _S24 = n_1;
    }
    else
    {
        _S24 = (vec3<f32>(0) - n_1);
    }
    si_0.normal_3 = _S24;
    var _S25 : Surface_0 = ToonMaterial_surface_0(si_0);
    var _S26 : bool;
    if((((si_0.material_0.flags_1) & (u32(4)))) != u32(0))
    {
        _S26 = ((_S25.baseColor_1.w) < (si_0.material_0.alphaCutoff_0));
    }
    else
    {
        _S26 = false;
    }
    if(_S26)
    {
        discard;
    }
    var o_1 : FsOut_0;
    o_1.featureId_1 = vec2<u32>(((records_0[_S22.draw_2].featureId_0) & (u32(65535))), ((records_0[_S22.draw_2].featureId_0) >> (u32(16))));
    if(_S25.unlit_0)
    {
        _S26 = true;
    }
    else
    {
        _S26 = (((records_0[_S22.draw_2].flags_0) & (u32(2)))) != u32(0);
    }
    if(_S26)
    {
        o_1.color_2 = vec4<f32>(_S25.baseColor_1.xyz, 1.0f);
        return o_1;
    }
    var v_0 : vec3<f32> = (vec3<f32>(0) - normalize(_S22.relPosition_1));
    var l_0 : vec3<f32> = normalize(view_0.sunDirection_0.xyz);
    var nDotV_1 : f32 = clamp(dot(_S25.normal_4, v_0), 0.0f, 1.0f);
    var _S27 : vec3<f32> = _S25.baseColor_1.xyz;
    var f0_1 : vec3<f32> = mix(vec3<f32>(0.039999999105930328f), _S27, vec3<f32>(_S25.metallic_1));
    var diffuseColor_0 : vec3<f32> = _S27 * vec3<f32>((1.0f - _S25.metallic_1));
    var _S28 : f32 = _S25.roughness_1;
    var alpha_2 : f32 = _S28 * _S28;
    var h_0 : vec3<f32> = normalize(v_0 + l_0);
    var _S29 : f32 = dot(_S25.normal_4, l_0);
    var nDotL_1 : f32 = clamp(_S29, 0.0010000000474974513f, 1.0f);
    var fresnel_0 : vec3<f32> = fresnelSchlick_0(f0_1, vec3<f32>(clamp(max(f0_1.x, max(f0_1.y, f0_1.z)) * 25.0f, 0.0f, 1.0f)), clamp(dot(v_0, h_0), 0.0f, 1.0f));
    var specular_0 : vec3<f32> = fresnel_0 * vec3<f32>(smithVisibility_0(alpha_2, nDotL_1, nDotV_1)) * vec3<f32>(ggx_0(alpha_2, clamp(dot(_S25.normal_4, h_0), 0.0f, 1.0f)));
    var _S30 : vec3<f32> = vec3<f32>(1.0f);
    var diffuse_0 : vec3<f32> = (_S30 - fresnel_0) * diffuseColor_0 / vec3<f32>(3.1415927410125732f);
    var sunVisible_0 : f32;
    if((_S29 > 0.0f))
    {
        sunVisible_0 = 1.0f;
    }
    else
    {
        sunVisible_0 = 0.0f;
    }
    var lut_0 : vec2<f32> = (textureSampleLevel((brdfLut_0), (environmentSampler_0), (vec2<f32>(nDotV_1, _S25.roughness_1)), (0.0f))).xy;
    var _S31 : f32 = lut_0.x;
    var _S32 : f32 = lut_0.y;
    var fssEss_0 : vec3<f32> = fresnelSchlick_0(f0_1, max(vec3<f32>((1.0f - _S25.roughness_1)), f0_1), nDotV_1) * vec3<f32>(_S31) + vec3<f32>(_S32);
    var averageF_0 : vec3<f32> = f0_1 + (_S30 - f0_1) / vec3<f32>(21.0f);
    var _S33 : vec3<f32> = vec3<f32>((1.0f - _S31 - _S32));
    var fmsEms_0 : vec3<f32> = fssEss_0 * averageF_0 * _S33 / (_S30 - averageF_0 * _S33);
    o_1.color_2 = vec4<f32>((diffuse_0 + specular_0) * vec3<f32>(nDotL_1) * vec3<f32>(view_0.sunIntensity_0) * vec3<f32>(sunVisible_0) + (irradiance_0(toEnvironment_0(_S25.normal_4)) * (fmsEms_0 + (_S30 - fssEss_0 - fmsEms_0) * diffuseColor_0) * vec3<f32>(view_0.diffuseIbl_0) + (textureSampleLevel((specularEnvironment_0), (environmentSampler_0), (toEnvironment_0(reflect((vec3<f32>(0) - v_0), _S25.normal_4))), (_S25.roughness_1 * view_0.specularMaxLod_0))).xyz * fssEss_0 * vec3<f32>(view_0.specularIbl_0)) * vec3<f32>(_S25.occlusion_0) + _S25.emissive_1, 1.0f);
    return o_1;
}

