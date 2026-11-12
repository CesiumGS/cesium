// Generated from instances.slang by scripts/slangShader.mjs; do not edit.
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
     lift_0 : f32,
     tint_0 : vec3<f32>,
     symbol_0 : u32,
};

struct VertexInput_0
{
     positionMC_0 : vec3<f32>,
     designPositionMC_0 : vec3<f32>,
     normalMC_0 : vec3<f32>,
     texCoord0_0 : vec2<f32>,
     color0_0 : vec4<f32>,
     featureId0_0 : u32,
     vertexIndex_0 : u32,
     instanceIndex_0 : u32,
     time_0 : f32,
     attributes_0 : Attributes_0,
     metadata_0 : Metadata_0,
     instance_0 : InstanceValues_0,
};

struct VertexOutput_0
{
     positionMC_1 : vec3<f32>,
     normalMC_1 : vec3<f32>,
};

fn vertexMain_0( vsInput_0 : VertexInput_0,  vsOutput_0 : ptr<function, VertexOutput_0>)
{
    (*vsOutput_0).positionMC_1[i32(2)] = (*vsOutput_0).positionMC_1[i32(2)] + vsInput_0.instance_0.lift_0 * step(0.0f, vsInput_0.positionMC_0.z);
    return;
}

fn cesiumSlangVertex( in_positionMC_0 : vec3<f32>,  in_designPositionMC_0 : vec3<f32>,  in_normalMC_0 : vec3<f32>,  in_texCoord0_0 : vec2<f32>,  in_color0_0 : vec4<f32>,  in_featureId0_0 : u32,  in_vertexIndex_0 : u32,  in_instanceIndex_0 : u32,  in_time_0 : f32,  in_instance_lift_0 : f32,  in_instance_symbol_0 : u32,  in_instance_tint_0 : vec3<f32>,  out_positionMC_0 : ptr<function, vec3<f32>>,  out_normalMC_0 : ptr<function, vec3<f32>>)
{
    var _S1 : vec3<f32> = vec3<f32>(0.0f);
    var _S2 : vec2<f32> = vec2<f32>(0.0f);
    var _S3 : vec4<f32> = vec4<f32>(0.0f);
    var _S4 : Attributes_0 = Attributes_0( u32(0) );
    var _S5 : Metadata_0 = Metadata_0( u32(0) );
    var _S6 : InstanceValues_0 = InstanceValues_0( 0.0f, _S1, u32(0) );
    var i_0 : VertexInput_0;
    i_0.positionMC_0 = _S1;
    i_0.designPositionMC_0 = _S1;
    i_0.normalMC_0 = _S1;
    i_0.texCoord0_0 = _S2;
    i_0.color0_0 = _S3;
    i_0.featureId0_0 = u32(0);
    i_0.vertexIndex_0 = u32(0);
    i_0.instanceIndex_0 = u32(0);
    i_0.time_0 = 0.0f;
    i_0.attributes_0 = _S4;
    i_0.metadata_0 = _S5;
    i_0.instance_0 = _S6;
    i_0.positionMC_0 = in_positionMC_0;
    i_0.designPositionMC_0 = in_designPositionMC_0;
    i_0.normalMC_0 = in_normalMC_0;
    i_0.texCoord0_0 = in_texCoord0_0;
    i_0.color0_0 = in_color0_0;
    i_0.featureId0_0 = in_featureId0_0;
    i_0.vertexIndex_0 = in_vertexIndex_0;
    i_0.instanceIndex_0 = in_instanceIndex_0;
    i_0.time_0 = in_time_0;
    i_0.instance_0.lift_0 = in_instance_lift_0;
    i_0.instance_0.symbol_0 = in_instance_symbol_0;
    i_0.instance_0.tint_0 = in_instance_tint_0;
    var o_0 : VertexOutput_0;
    o_0.positionMC_1 = _S1;
    o_0.normalMC_1 = _S1;
    o_0.positionMC_1 = (*out_positionMC_0);
    o_0.normalMC_1 = (*out_normalMC_0);
    vertexMain_0(i_0, &(o_0));
    (*out_positionMC_0) = o_0.positionMC_1;
    (*out_normalMC_0) = o_0.normalMC_1;
    return;
}

struct FragmentInput_0
{
     positionMC_2 : vec3<f32>,
     positionEC_0 : vec3<f32>,
     positionWC_0 : vec3<f32>,
     truePositionEC_0 : vec3<f32>,
     normal_0 : vec3<f32>,
     texCoord0_1 : vec2<f32>,
     color0_1 : vec4<f32>,
     featureId_0 : u32,
     screen_0 : vec2<f32>,
     time_1 : f32,
     attributes_1 : Attributes_0,
     metadata_1 : Metadata_0,
     instanceIndex_1 : u32,
     instance_1 : InstanceValues_0,
     clipDistance_0 : f32,
     clipFlags_0 : u32,
     clipId_0 : u32,
     clipParams_0 : vec4<f32>,
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
    (*material_0).baseColor_0 = fsInput_0.instance_1.tint_0 * vec3<f32>((f32(fsInput_0.instance_1.symbol_0) + 1.0f)) / vec3<f32>(3.0f);
    return;
}

fn cesiumSlangFragment( in_positionMC_1 : vec3<f32>,  in_positionEC_0 : vec3<f32>,  in_positionWC_0 : vec3<f32>,  in_truePositionEC_0 : vec3<f32>,  in_normal_0 : vec3<f32>,  in_texCoord0_1 : vec2<f32>,  in_color0_1 : vec4<f32>,  in_featureId_0 : u32,  in_screen_0 : vec2<f32>,  in_time_1 : f32,  in_instanceIndex_1 : u32,  in_instance_lift_1 : f32,  in_instance_symbol_1 : u32,  in_instance_tint_1 : vec3<f32>,  in_clipDistance_0 : f32,  in_clipFlags_0 : u32,  in_clipId_0 : u32,  in_clipParams_0 : vec4<f32>,  out_baseColor_0 : ptr<function, vec3<f32>>,  out_alpha_0 : ptr<function, f32>,  out_metallic_0 : ptr<function, f32>,  out_roughness_0 : ptr<function, f32>,  out_normal_0 : ptr<function, vec3<f32>>,  out_occlusion_0 : ptr<function, f32>,  out_emissive_0 : ptr<function, vec3<f32>>,  out_unlit_0 : ptr<function, bool>)
{
    var _S7 : vec3<f32> = vec3<f32>(0.0f);
    var _S8 : vec2<f32> = vec2<f32>(0.0f);
    var _S9 : vec4<f32> = vec4<f32>(0.0f);
    var _S10 : Attributes_0 = Attributes_0( u32(0) );
    var _S11 : Metadata_0 = Metadata_0( u32(0) );
    var _S12 : InstanceValues_0 = InstanceValues_0( 0.0f, _S7, u32(0) );
    var i_1 : FragmentInput_0;
    i_1.positionMC_2 = _S7;
    i_1.positionEC_0 = _S7;
    i_1.positionWC_0 = _S7;
    i_1.truePositionEC_0 = _S7;
    i_1.normal_0 = _S7;
    i_1.texCoord0_1 = _S8;
    i_1.color0_1 = _S9;
    i_1.featureId_0 = u32(0);
    i_1.screen_0 = _S8;
    i_1.time_1 = 0.0f;
    i_1.attributes_1 = _S10;
    i_1.metadata_1 = _S11;
    i_1.instanceIndex_1 = u32(0);
    i_1.instance_1 = _S12;
    i_1.clipDistance_0 = 0.0f;
    i_1.clipFlags_0 = u32(0);
    i_1.clipId_0 = u32(0);
    i_1.clipParams_0 = _S9;
    i_1.positionMC_2 = in_positionMC_1;
    i_1.positionEC_0 = in_positionEC_0;
    i_1.positionWC_0 = in_positionWC_0;
    i_1.truePositionEC_0 = in_truePositionEC_0;
    i_1.normal_0 = in_normal_0;
    i_1.texCoord0_1 = in_texCoord0_1;
    i_1.color0_1 = in_color0_1;
    i_1.featureId_0 = in_featureId_0;
    i_1.screen_0 = in_screen_0;
    i_1.time_1 = in_time_1;
    i_1.instanceIndex_1 = in_instanceIndex_1;
    i_1.instance_1.lift_0 = in_instance_lift_1;
    i_1.instance_1.symbol_0 = in_instance_symbol_1;
    i_1.instance_1.tint_0 = in_instance_tint_1;
    i_1.clipDistance_0 = in_clipDistance_0;
    i_1.clipFlags_0 = in_clipFlags_0;
    i_1.clipId_0 = in_clipId_0;
    i_1.clipParams_0 = in_clipParams_0;
    var o_1 : MaterialOutput_0;
    o_1.baseColor_0 = _S7;
    o_1.alpha_0 = 0.0f;
    o_1.metallic_0 = 0.0f;
    o_1.roughness_0 = 0.0f;
    o_1.normal_1 = _S7;
    o_1.occlusion_0 = 0.0f;
    o_1.emissive_0 = _S7;
    o_1.unlit_0 = false;
    o_1.baseColor_0 = (*out_baseColor_0);
    o_1.alpha_0 = (*out_alpha_0);
    o_1.metallic_0 = (*out_metallic_0);
    o_1.roughness_0 = (*out_roughness_0);
    o_1.normal_1 = (*out_normal_0);
    o_1.occlusion_0 = (*out_occlusion_0);
    o_1.emissive_0 = (*out_emissive_0);
    o_1.unlit_0 = (*out_unlit_0);
    fragmentMain_0(i_1, &(o_1));
    (*out_baseColor_0) = o_1.baseColor_0;
    (*out_alpha_0) = o_1.alpha_0;
    (*out_metallic_0) = o_1.metallic_0;
    (*out_roughness_0) = o_1.roughness_0;
    (*out_normal_0) = o_1.normal_1;
    (*out_occlusion_0) = o_1.occlusion_0;
    (*out_emissive_0) = o_1.emissive_0;
    (*out_unlit_0) = o_1.unlit_0;
    return;
}

