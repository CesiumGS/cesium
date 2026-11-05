// Generated from twistHeight.slang by scripts/slangShader.mjs; do not edit.
fn twist_0( v_0 : vec3<f32>,  a_0 : f32) -> vec3<f32>
{
    var c_0 : f32 = cos(a_0);
    var s_0 : f32 = sin(a_0);
    var _S1 : f32 = v_0.x;
    var _S2 : f32 = v_0.y;
    return vec3<f32>(c_0 * _S1 - s_0 * _S2, s_0 * _S1 + c_0 * _S2, v_0.z);
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

struct VertexInput_0
{
     positionMC_0 : vec3<f32>,
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
    var a_1 : f32 = vsInput_0.positionMC_0.z * 1.5f;
    (*vsOutput_0).positionMC_1 = twist_0(vsInput_0.positionMC_0, a_1);
    (*vsOutput_0).normalMC_1 = twist_0(vsInput_0.normalMC_0, a_1);
    return;
}

struct FragmentInput_0
{
     positionMC_2 : vec3<f32>,
     positionEC_0 : vec3<f32>,
     positionWC_0 : vec3<f32>,
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
    (*material_0).baseColor_0 = mix(vec3<f32>(0.10000000149011612f, 0.20000000298023224f, 0.89999997615814209f), vec3<f32>(0.94999998807907104f, 0.30000001192092896f, 0.10000000149011612f), vec3<f32>(clamp(fsInput_0.positionMC_2.z + 0.5f, 0.0f, 1.0f)));
    return;
}

@fragment
fn cesiumStages(@builtin(position) p_0 : vec4<f32>)
{
    var _S3 : vec4<f32> = vec4<f32>(0.0f);
    var result_0 : vec4<f32> = _S3;
    var _S4 : vec3<f32> = vec3<f32>(0.0f);
    var _S5 : vec2<f32> = vec2<f32>(0.0f);
    var _S6 : Attributes_0 = Attributes_0( u32(0) );
    var _S7 : Metadata_0 = Metadata_0( u32(0) );
    var _S8 : InstanceValues_0 = InstanceValues_0( u32(0) );
    var vi_0 : VertexInput_0 = VertexInput_0( _S4, _S4, _S5, _S3, u32(0), u32(0), u32(0), 0.0f, _S6, _S7, _S8 );
    var vo_0 : VertexOutput_0;
    vo_0.positionMC_1 = _S4;
    vo_0.normalMC_1 = _S4;
    vertexMain_0(vi_0, &(vo_0));
    var _S9 : vec3<f32> = _S3.xyz + (vo_0.positionMC_1 + vo_0.normalMC_1);
    result_0.x = _S9.x;
    result_0.y = _S9.y;
    result_0.z = _S9.z;
    var fi_0 : FragmentInput_0 = FragmentInput_0( _S4, _S4, _S4, _S4, _S5, _S3, u32(0), _S5, 0.0f, _S6, _S7, u32(0), _S8 );
    var mo_0 : MaterialOutput_0;
    mo_0.baseColor_0 = _S4;
    mo_0.alpha_0 = 0.0f;
    mo_0.metallic_0 = 0.0f;
    mo_0.roughness_0 = 0.0f;
    mo_0.normal_1 = _S4;
    mo_0.occlusion_0 = 0.0f;
    mo_0.emissive_0 = _S4;
    mo_0.unlit_0 = false;
    fragmentMain_0(fi_0, &(mo_0));
    var _S10 : vec4<f32> = result_0 + vec4<f32>(mo_0.baseColor_0, mo_0.alpha_0);
    result_0 = _S10;
    if((any((_S10 != _S3))))
    {
        discard;
    }
    return;
}

fn vertexMain(vsInput: VertexInput, vsOutput: ptr<function, VertexOutput>) {
  var staged = VertexOutput_0((*vsOutput).positionMC, (*vsOutput).normalMC);
  vertexMain_0(VertexInput_0(vsInput.positionMC, vsInput.normalMC, vsInput.texCoord0, vsInput.color0, vsInput.featureId0, vsInput.vertexIndex, vsInput.instanceIndex, vsInput.time, Attributes_0(vsInput.attributes.none), Metadata_0(vsInput.metadata.none), InstanceValues_0(vsInput.instance.none)), &staged);
  (*vsOutput).positionMC = staged.positionMC_1;
  (*vsOutput).normalMC = staged.normalMC_1;
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
