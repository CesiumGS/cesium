// Generated from twistHeight.slang by scripts/slangShader.mjs; do not edit.
fn twist_0( v_0 : vec3<f32>,  a_0 : f32) -> vec3<f32>
{
    var c_0 : f32 = cos(a_0);
    var s_0 : f32 = sin(a_0);
    var _S1 : f32 = v_0.x;
    var _S2 : f32 = v_0.y;
    return vec3<f32>(c_0 * _S1 - s_0 * _S2, s_0 * _S1 + c_0 * _S2, v_0.z);
}

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

struct pixelOutput_0
{
    @location(0) output_0 : vec4<f32>,
};

@fragment
fn cesiumStages(@builtin(position) p_0 : vec4<f32>) -> pixelOutput_0
{
    var _S3 : vec4<f32> = vec4<f32>(0.0f);
    var result_0 : vec4<f32> = _S3;
    var _S4 : vec3<f32> = vec3<f32>(0.0f);
    var _S5 : vec2<f32> = vec2<f32>(0.0f);
    var vi_0 : VertexInput_0 = VertexInput_0( _S4, _S4, _S5, _S3, u32(0), u32(0), u32(0), 0.0f );
    var vo_0 : VertexOutput_0;
    vo_0.positionMC_1 = _S4;
    vo_0.normalMC_1 = _S4;
    vertexMain_0(vi_0, &(vo_0));
    var _S6 : vec3<f32> = _S3.xyz + (vo_0.positionMC_1 + vo_0.normalMC_1);
    result_0.x = _S6.x;
    result_0.y = _S6.y;
    result_0.z = _S6.z;
    var fi_0 : FragmentInput_0 = FragmentInput_0( _S4, _S4, _S4, _S4, _S5, _S3, u32(0), _S5, 0.0f );
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
    var _S7 : vec4<f32> = result_0 + vec4<f32>(mo_0.baseColor_0, mo_0.alpha_0);
    result_0 = _S7;
    var _S8 : pixelOutput_0 = pixelOutput_0( _S7 );
    return _S8;
}

fn vertexMain(vsInput: VertexInput, vsOutput: ptr<function, VertexOutput>) {
  var staged = VertexOutput_0((*vsOutput).positionMC, (*vsOutput).normalMC);
  vertexMain_0(VertexInput_0(vsInput.positionMC, vsInput.normalMC, vsInput.texCoord0, vsInput.color0, vsInput.featureId0, vsInput.vertexIndex, vsInput.instanceIndex, vsInput.time), &staged);
  (*vsOutput).positionMC = staged.positionMC_1;
  (*vsOutput).normalMC = staged.normalMC_1;
}

fn fragmentMain(fsInput: FragmentInput, material: ptr<function, MaterialOutput>) {
  var staged = MaterialOutput_0((*material).baseColor, (*material).alpha, (*material).metallic, (*material).roughness, (*material).normal, (*material).occlusion, (*material).emissive, (*material).unlit);
  fragmentMain_0(FragmentInput_0(fsInput.positionMC, fsInput.positionEC, fsInput.positionWC, fsInput.normal, fsInput.texCoord0, fsInput.color0, fsInput.featureId, fsInput.screen, fsInput.time), &staged);
  (*material).baseColor = staged.baseColor_0;
  (*material).alpha = staged.alpha_0;
  (*material).metallic = staged.metallic_0;
  (*material).roughness = staged.roughness_0;
  (*material).normal = staged.normal_1;
  (*material).occlusion = staged.occlusion_0;
  (*material).emissive = staged.emissive_0;
  (*material).unlit = staged.unlit_0;
}
