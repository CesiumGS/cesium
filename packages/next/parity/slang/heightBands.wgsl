// Generated from heightBands.slang by scripts/slangShader.mjs; do not edit.
@fragment
fn cesiumStages()
{
    return;
}

fn hue_0( h_0 : f32) -> vec3<f32>
{
    return saturate(abs(fract(vec3<f32>(h_0) + vec3<f32>(0.0f, 0.66666668653488159f, 0.3333333432674408f)) * vec3<f32>(6.0f) - vec3<f32>(3.0f)) - vec3<f32>(1.0f));
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
     truePositionEC_0 : vec3<f32>,
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
    (*material_0).baseColor_0 = mix((*material_0).baseColor_0, hue_0(fract((length(fsInput_0.positionWC_0) - 6.369e+06f) / 8.0f)), vec3<f32>(0.69999998807907104f));
    return;
}

fn cesiumSlangFragment( in_positionMC_0 : vec3<f32>,  in_positionEC_0 : vec3<f32>,  in_positionWC_0 : vec3<f32>,  in_truePositionEC_0 : vec3<f32>,  in_normal_0 : vec3<f32>,  in_texCoord0_0 : vec2<f32>,  in_color0_0 : vec4<f32>,  in_featureId_0 : u32,  in_screen_0 : vec2<f32>,  in_time_0 : f32,  in_instanceIndex_0 : u32,  in_clipDistance_0 : f32,  in_clipFlags_0 : u32,  in_clipId_0 : u32,  in_clipParams_0 : vec4<f32>,  out_baseColor_0 : ptr<function, vec3<f32>>,  out_alpha_0 : ptr<function, f32>,  out_metallic_0 : ptr<function, f32>,  out_roughness_0 : ptr<function, f32>,  out_normal_0 : ptr<function, vec3<f32>>,  out_occlusion_0 : ptr<function, f32>,  out_emissive_0 : ptr<function, vec3<f32>>,  out_unlit_0 : ptr<function, bool>)
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
    i_0.truePositionEC_0 = _S1;
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
    i_0.clipDistance_0 = 0.0f;
    i_0.clipFlags_0 = u32(0);
    i_0.clipId_0 = u32(0);
    i_0.clipParams_0 = _S3;
    i_0.positionMC_0 = in_positionMC_0;
    i_0.positionEC_0 = in_positionEC_0;
    i_0.positionWC_0 = in_positionWC_0;
    i_0.truePositionEC_0 = in_truePositionEC_0;
    i_0.normal_0 = in_normal_0;
    i_0.texCoord0_0 = in_texCoord0_0;
    i_0.color0_0 = in_color0_0;
    i_0.featureId_0 = in_featureId_0;
    i_0.screen_0 = in_screen_0;
    i_0.time_0 = in_time_0;
    i_0.instanceIndex_0 = in_instanceIndex_0;
    i_0.clipDistance_0 = in_clipDistance_0;
    i_0.clipFlags_0 = in_clipFlags_0;
    i_0.clipId_0 = in_clipId_0;
    i_0.clipParams_0 = in_clipParams_0;
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

