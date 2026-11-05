// Generated from heightBands.slang by scripts/slangShader.mjs; do not edit.
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
    (*material_0).baseColor_0 = mix((*material_0).baseColor_0, hue_0(fract((length(fsInput_0.positionWC_0) - 6.369e+06f) / 8.0f)), vec3<f32>(0.69999998807907104f));
    return;
}

@fragment
fn cesiumStages(@builtin(position) p_0 : vec4<f32>)
{
    var _S1 : vec3<f32> = vec3<f32>(0.0f);
    var _S2 : vec2<f32> = vec2<f32>(0.0f);
    var _S3 : vec4<f32> = vec4<f32>(0.0f);
    var _S4 : Attributes_0 = Attributes_0( u32(0) );
    var _S5 : Metadata_0 = Metadata_0( u32(0) );
    var _S6 : InstanceValues_0 = InstanceValues_0( u32(0) );
    var fi_0 : FragmentInput_0 = FragmentInput_0( _S1, _S1, _S1, _S1, _S2, _S3, u32(0), _S2, 0.0f, _S4, _S5, u32(0), _S6 );
    var mo_0 : MaterialOutput_0;
    mo_0.baseColor_0 = _S1;
    mo_0.alpha_0 = 0.0f;
    mo_0.metallic_0 = 0.0f;
    mo_0.roughness_0 = 0.0f;
    mo_0.normal_1 = _S1;
    mo_0.occlusion_0 = 0.0f;
    mo_0.emissive_0 = _S1;
    mo_0.unlit_0 = false;
    fragmentMain_0(fi_0, &(mo_0));
    if((any((vec4<f32>(mo_0.baseColor_0, mo_0.alpha_0) != _S3))))
    {
        discard;
    }
    return;
}

fn fragmentMain(fsInput: FragmentInput, material: ptr<function, MaterialOutput>) {
  var staged = MaterialOutput_0((*material).baseColor, (*material).alpha, (*material).metallic, (*material).roughness, (*material).normal, (*material).occlusion, (*material).emissive, (*material).unlit);
  fragmentMain_0(FragmentInput_0(fsInput.positionMC, fsInput.positionEC, fsInput.positionWC, fsInput.normal, fsInput.texCoord0, fsInput.color0, fsInput.featureId, fsInput.screen, fsInput.time, Attributes_0(fsInput.attributes.none), Metadata_0(fsInput.metadata.none), fsInput.instanceIndex, InstanceValues_0(fsInput.instance.none)), &staged);
  (*material).baseColor = staged.baseColor_0;
  (*material).alpha = staged.alpha_0;
  (*material).metallic = staged.metallic_0;
  (*material).roughness = staged.roughness_0;
  (*material).normal = staged.normal_1;
  (*material).occlusion = staged.occlusion_0;
  (*material).emissive = staged.emissive_0;
  (*material).unlit = staged.unlit_0;
}
