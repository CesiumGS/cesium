// Generated from uniforms.slang by scripts/slangShader.mjs; do not edit.
struct _MatrixStorage_float3x3std140_0
{
    @align(16) data_0 : array<vec4<f32>, i32(3)>,
};

struct Uniforms_std140_0
{
    @align(16) amplitude_0 : f32,
    @align(8) offset_0 : vec2<f32>,
    @align(16) tint_0 : vec3<f32>,
    @align(4) bands_0 : u32,
    @align(16) shift_0 : i32,
    @align(16) spin_0 : _MatrixStorage_float3x3std140_0,
};

@binding(10) @group(2) var<uniform> uniforms_0 : Uniforms_std140_0;
@fragment
fn cesiumStages()
{
    return;
}

struct Attributes_0
{
     none_0 : u32,
};

struct Metadata_0
{
     none_1 : u32,
};

struct InstanceValues_0
{
     none_2 : u32,
};

struct FragmentInput_0
{
     positionMC_0 : vec3<f32>,
     positionEC_0 : vec3<f32>,
     positionWC_0 : vec3<f32>,
     normal_0 : vec3<f32>,
     texCoord0_0 : vec2<f32>,
     color0_0 : vec4<f32>,
     featureId_0 : u32,
     screen_0 : vec2<f32>,
     time_0 : f32,
     attributes_0 : Attributes_0,
     metadata_0 : Metadata_0,
     instanceIndex_0 : u32,
     instance_0 : InstanceValues_0,
};

struct MaterialOutput_0
{
     baseColor_0 : vec3<f32>,
     alpha_0 : f32,
     metallic_0 : f32,
     roughness_0 : f32,
     normal_1 : vec3<f32>,
     occlusion_0 : f32,
     emissive_0 : vec3<f32>,
     unlit_0 : bool,
};

fn fragmentMain_0( fsInput_0 : FragmentInput_0,  material_0 : ptr<function, MaterialOutput_0>)
{
    (*material_0).baseColor_0 = uniforms_0.tint_0 * vec3<f32>(uniforms_0.amplitude_0) * vec3<f32>((0.5f + 0.5f * fract(floor((((((fsInput_0.positionMC_0) * (mat3x3<f32>(mat3x3<f32>(uniforms_0.spin_0.data_0[i32(0)][i32(0)], uniforms_0.spin_0.data_0[i32(0)][i32(1)], uniforms_0.spin_0.data_0[i32(0)][i32(2)], uniforms_0.spin_0.data_0[i32(1)][i32(0)], uniforms_0.spin_0.data_0[i32(1)][i32(1)], uniforms_0.spin_0.data_0[i32(1)][i32(2)], uniforms_0.spin_0.data_0[i32(2)][i32(0)], uniforms_0.spin_0.data_0[i32(2)][i32(1)], uniforms_0.spin_0.data_0[i32(2)][i32(2)]))))).xy + uniforms_0.offset_0).x + 0.5f) * f32(uniforms_0.bands_0) + f32(uniforms_0.shift_0)) * 0.37000000476837158f)));
    return;
}

fn cesiumSlangFragment( in_positionMC_0 : vec3<f32>,  in_positionEC_0 : vec3<f32>,  in_positionWC_0 : vec3<f32>,  in_normal_0 : vec3<f32>,  in_texCoord0_0 : vec2<f32>,  in_color0_0 : vec4<f32>,  in_featureId_0 : u32,  in_screen_0 : vec2<f32>,  in_time_0 : f32,  in_instanceIndex_0 : u32,  out_baseColor_0 : ptr<function, vec3<f32>>,  out_alpha_0 : ptr<function, f32>,  out_metallic_0 : ptr<function, f32>,  out_roughness_0 : ptr<function, f32>,  out_normal_0 : ptr<function, vec3<f32>>,  out_occlusion_0 : ptr<function, f32>,  out_emissive_0 : ptr<function, vec3<f32>>,  out_unlit_0 : ptr<function, bool>)
{
    var _S1 : vec3<f32> = vec3<f32>(0.0f);
    var _S2 : vec2<f32> = vec2<f32>(0.0f);
    var _S3 : vec4<f32> = vec4<f32>(0.0f);
    var _S4 : Attributes_0 = Attributes_0( u32(0) );
    var _S5 : Metadata_0 = Metadata_0( u32(0) );
    var _S6 : InstanceValues_0 = InstanceValues_0( u32(0) );
    var i_0 : FragmentInput_0;
    i_0.positionMC_0 = _S1;
    i_0.positionEC_0 = _S1;
    i_0.positionWC_0 = _S1;
    i_0.normal_0 = _S1;
    i_0.texCoord0_0 = _S2;
    i_0.color0_0 = _S3;
    i_0.featureId_0 = u32(0);
    i_0.screen_0 = _S2;
    i_0.time_0 = 0.0f;
    i_0.attributes_0 = _S4;
    i_0.metadata_0 = _S5;
    i_0.instanceIndex_0 = u32(0);
    i_0.instance_0 = _S6;
    i_0.positionMC_0 = in_positionMC_0;
    i_0.positionEC_0 = in_positionEC_0;
    i_0.positionWC_0 = in_positionWC_0;
    i_0.normal_0 = in_normal_0;
    i_0.texCoord0_0 = in_texCoord0_0;
    i_0.color0_0 = in_color0_0;
    i_0.featureId_0 = in_featureId_0;
    i_0.screen_0 = in_screen_0;
    i_0.time_0 = in_time_0;
    i_0.instanceIndex_0 = in_instanceIndex_0;
    var o_0 : MaterialOutput_0;
    o_0.baseColor_0 = _S1;
    o_0.alpha_0 = 0.0f;
    o_0.metallic_0 = 0.0f;
    o_0.roughness_0 = 0.0f;
    o_0.normal_1 = _S1;
    o_0.occlusion_0 = 0.0f;
    o_0.emissive_0 = _S1;
    o_0.unlit_0 = false;
    o_0.baseColor_0 = (*out_baseColor_0);
    o_0.alpha_0 = (*out_alpha_0);
    o_0.metallic_0 = (*out_metallic_0);
    o_0.roughness_0 = (*out_roughness_0);
    o_0.normal_1 = (*out_normal_0);
    o_0.occlusion_0 = (*out_occlusion_0);
    o_0.emissive_0 = (*out_emissive_0);
    o_0.unlit_0 = (*out_unlit_0);
    fragmentMain_0(i_0, &(o_0));
    (*out_baseColor_0) = o_0.baseColor_0;
    (*out_alpha_0) = o_0.alpha_0;
    (*out_metallic_0) = o_0.metallic_0;
    (*out_roughness_0) = o_0.roughness_0;
    (*out_normal_0) = o_0.normal_1;
    (*out_occlusion_0) = o_0.occlusion_0;
    (*out_emissive_0) = o_0.emissive_0;
    (*out_unlit_0) = o_0.unlit_0;
    return;
}

