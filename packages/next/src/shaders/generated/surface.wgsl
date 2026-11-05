// Generated from src/shaders/surface.slang by slangc 2026.21
// (scripts/slangBuild.mjs). Do not edit: change the .slang and regenerate.
struct DrawRecord_std430_0
{
    @align(16) center_0 : vec3<f32>,
    @align(4) radius_0 : f32,
    @align(16) color_0 : vec4<f32>,
    @align(16) transform_0 : u32,
    @align(4) flags_0 : u32,
    @align(8) materialIndex_0 : u32,
    @align(4) indexCount_0 : u32,
    @align(16) firstIndex_0 : u32,
    @align(4) featureId_0 : u32,
    @align(8) batch_0 : u32,
    @align(4) positionOffset_0 : u32,
    @align(16) normalOffset_0 : u32,
    @align(4) uvOffset_0 : u32,
    @align(8) colorOffset_0 : u32,
    @align(4) tangentOffset_0 : u32,
    @align(16) textureSet_0 : u32,
    @align(4) imagerySlice_0 : u32,
    @align(8) featureIdOffset_0 : u32,
    @align(4) viewMask_0 : u32,
    @align(16) clipBlock_0 : u32,
    @align(4) placeholderMask_0 : u32,
    @align(8) clipCount_0 : u32,
    @align(4) instanceFirst_0 : u32,
    @align(16) instanceCount_0 : u32,
    @align(4) instanceStreams_0 : u32,
    @align(8) instanceStride_0 : u32,
    @align(4) lightsSlice_0 : u32,
    @align(16) attributes_0 : u32,
    @align(4) instanceDirectory_0 : u32,
    @align(8) billboardSize_0 : f32,
    @align(4) billboardDepthTest_0 : f32,
};

@binding(0) @group(1) var<storage, read> records_0 : array<DrawRecord_std430_0>;

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
    @align(4) textures01_0 : u32,
    @align(8) textures23_0 : u32,
    @align(4) textures4_0 : u32,
};

@binding(3) @group(1) var<storage, read> materials_0 : array<Material_std430_0>;

@binding(0) @group(2) var baseColorTexture_0 : texture_2d<f32>;

@binding(5) @group(2) var baseColorSampler_0 : sampler;

@binding(1) @group(2) var metallicRoughnessTexture_0 : texture_2d<f32>;

@binding(6) @group(2) var metallicRoughnessSampler_0 : sampler;

@binding(2) @group(2) var normalTexture_0 : texture_2d<f32>;

@binding(7) @group(2) var normalSampler_0 : sampler;

@binding(3) @group(2) var occlusionTexture_0 : texture_2d<f32>;

@binding(8) @group(2) var occlusionSampler_0 : sampler;

@binding(4) @group(2) var emissiveTexture_0 : texture_2d<f32>;

@binding(9) @group(2) var emissiveSampler_0 : sampler;

struct _MatrixStorage_float4x4_ColMajorstd140_0
{
    @align(16) data_0 : array<vec4<f32>, i32(4)>,
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
};

@binding(0) @group(0) var<uniform> view_0 : View_std140_0;
@binding(4) @group(1) var<storage, read> clipBoxes_0 : array<vec4<f32>>;

@binding(5) @group(1) var imagery_0 : texture_2d_array<f32>;

@binding(6) @group(1) var imagerySampler_0 : sampler;

struct _Array_std140_matrixx3Cfloatx2C4x2C4x3E4_0
{
    @align(16) data_1 : array<_MatrixStorage_float4x4_ColMajorstd140_0, i32(4)>,
};

struct Shadows_std140_0
{
    @align(16) matrices_0 : _Array_std140_matrixx3Cfloatx2C4x2C4x3E4_0,
    @align(16) splits_0 : vec4<f32>,
    @align(16) texels_0 : vec4<f32>,
    @align(16) forward_0 : vec4<f32>,
    @align(16) fade_0 : vec4<f32>,
};

@binding(12) @group(0) var<uniform> shadows_0 : Shadows_std140_0;
@binding(13) @group(0) var shadowMap_0 : texture_depth_2d_array;

@binding(14) @group(0) var shadowSampler_0 : sampler_comparison;

@binding(5) @group(0) var sunLightTable_0 : texture_2d<f32>;

@binding(2) @group(0) var environmentSampler_0 : sampler;

@binding(18) @group(0) var<storage, read> lightTable_0 : array<u32>;

@binding(3) @group(0) var brdfLut_0 : texture_2d<f32>;

@binding(6) @group(0) var irradianceCube_0 : texture_cube<f32>;

@binding(1) @group(0) var specularEnvironment_0 : texture_cube<f32>;

@binding(15) @group(0) var<storage, read> aoWords_0 : array<u32>;

@binding(7) @group(0) var aerialVolume_0 : texture_3d<f32>;

@binding(16) @group(0) var aerialScreen_0 : texture_2d_array<f32>;

@binding(2) @group(3) var opaqueDepth_0 : texture_depth_multisampled_2d;

@binding(1) @group(3) var<storage, read_write> lists_0 : array<atomic<u32>>;

struct TranslucentParams_std140_0
{
    @align(16) width_0 : u32,
    @align(4) height_0 : u32,
    @align(8) nodesBase_0 : u32,
    @align(4) capacity_0 : u32,
    @align(16) logNear_0 : f32,
    @align(4) invLogRange_0 : f32,
    @align(8) bias_0 : f32,
    @align(4) pad_0 : f32,
};

@binding(0) @group(3) var<uniform> translucency_0 : TranslucentParams_std140_0;
struct AirGroup_std140_0
{
    @align(16) rayleighScattering_0 : vec4<f32>,
    @align(16) mieScattering_0 : vec4<f32>,
    @align(16) mieExtinction_0 : vec4<f32>,
    @align(16) ozoneAbsorption_0 : vec4<f32>,
    @align(16) solarIrradiance_0 : vec4<f32>,
    @align(16) bottomRadius_0 : f32,
    @align(4) topRadius_0 : f32,
    @align(8) rayleighScaleHeight_0 : f32,
    @align(4) mieScaleHeight_0 : f32,
    @align(16) miePhaseG_0 : f32,
    @align(4) groundAlbedo_0 : f32,
    @align(8) pad0_0 : f32,
    @align(4) pad1_0 : f32,
};

struct _Array_std140_AirGroup2_0
{
    @align(16) data_2 : array<AirGroup_std140_0, i32(2)>,
};

struct Air_std140_0
{
    @align(16) groups_0 : _Array_std140_AirGroup2_0,
    @align(16) weights_0 : array<vec4<f32>, i32(8)>,
};

@binding(9) @group(0) var<uniform> air_0 : Air_std140_0;
@binding(10) @group(0) var airTransmittance_0 : texture_2d_array<f32>;

@binding(11) @group(0) var airMultipleScattering_0 : texture_2d_array<f32>;

struct _MatrixStorage_float4x4_ColMajorstd430_0
{
    @align(16) data_3 : array<vec4<f32>, i32(4)>,
};

struct DrawItem_std430_0
{
    @align(16) relModel_0 : _MatrixStorage_float4x4_ColMajorstd430_0,
    @align(16) record_0 : u32,
    @align(4) feature_0 : u32,
    @align(8) instance_0 : u32,
    @align(4) tint_0 : u32,
};

@binding(1) @group(1) var<storage, read> items_0 : array<DrawItem_std430_0>;

@binding(2) @group(1) var<storage, read> vertices_0 : array<f32>;

@binding(20) @group(2) var propertyTexture0_0 : texture_2d<f32>;

@binding(21) @group(2) var propertyTexture1_0 : texture_2d<f32>;

const POINT_UV_0 : array<vec2<f32>, i32(4)> = array<vec2<f32>, i32(4)>( vec2<f32>(0.0f, 1.0f), vec2<f32>(1.0f, 1.0f), vec2<f32>(1.0f, 0.0f), vec2<f32>(0.0f, 0.0f) );
const POINT_OFFSET_0 : array<vec2<f32>, i32(4)> = array<vec2<f32>, i32(4)>( vec2<f32>(-0.5f, -0.5f), vec2<f32>(0.5f, -0.5f), vec2<f32>(0.5f, 0.5f), vec2<f32>(-0.5f, 0.5f) );
const POINT_CORNER_0 : array<u32, i32(6)> = array<u32, i32(6)>( u32(0), u32(1), u32(2), u32(0), u32(2), u32(3) );
fn firstbitlow_0( value_0 : u32) -> u32
{
    var _S1 : u32 = firstTrailingBit(value_0);
    return _S1;
}

const SAMPLE_OFFSETS_0 : array<vec2<f32>, i32(4)> = array<vec2<f32>, i32(4)>( vec2<f32>(-0.125f, -0.375f), vec2<f32>(0.375f, -0.125f), vec2<f32>(-0.375f, 0.125f), vec2<f32>(0.125f, 0.375f) );
@id(0) override cutOutInDepth_0 : bool = false;

fn materialTexture_0( m_0 : ptr<function, Material_std430_0>,  slot_0 : u32,  uv_0 : vec2<f32>) -> vec4<f32>
{
    switch(slot_0)
    {
    case u32(0):
        {
            return (textureSample((baseColorTexture_0), (baseColorSampler_0), (uv_0)));
        }
    case u32(1):
        {
            return (textureSample((metallicRoughnessTexture_0), (metallicRoughnessSampler_0), (uv_0)));
        }
    case u32(2):
        {
            return (textureSample((normalTexture_0), (normalSampler_0), (uv_0)));
        }
    case u32(3):
        {
            return (textureSample((occlusionTexture_0), (occlusionSampler_0), (uv_0)));
        }
    default :
        {
            return (textureSample((emissiveTexture_0), (emissiveSampler_0), (uv_0)));
        }
    }
}

fn materialTextureRef_0( m_1 : ptr<function, Material_std430_0>,  slot_1 : u32) -> u32
{
    var word_0 : u32;
    if((slot_1 < u32(2)))
    {
        word_0 = (*m_1).textures01_0;
    }
    else
    {
        if((slot_1 < u32(4)))
        {
            word_0 = (*m_1).textures23_0;
        }
        else
        {
            word_0 = (*m_1).textures4_0;
        }
    }
    return (((word_0 >> ((((slot_1 & (u32(1)))) * u32(16))))) & (u32(65535)));
}

fn materialHasTexture_0( m_2 : ptr<function, Material_std430_0>,  slot_2 : u32) -> bool
{
    var _S2 : u32 = materialTextureRef_0(&((*m_2)), slot_2);
    return _S2 != u32(65535);
}

struct MaterialOutput
{
     baseColor : vec3<f32>,
     alpha : f32,
     metallic : f32,
     roughness : f32,
     normal : vec3<f32>,
     occlusion : f32,
     emissive : vec3<f32>,
     unlit : bool,
};

fn materialOutput_0( baseColor_1 : vec3<f32>,  alpha_0 : f32,  metallic_1 : f32,  roughness_1 : f32,  normal_0 : vec3<f32>,  occlusion_0 : f32,  emissive_1 : vec3<f32>,  unlit_0 : bool) -> MaterialOutput
{
    var m_3 : MaterialOutput;
    m_3.baseColor = baseColor_1;
    m_3.alpha = alpha_0;
    m_3.metallic = metallic_1;
    m_3.roughness = roughness_1;
    m_3.normal = normal_0;
    m_3.occlusion = occlusion_0;
    m_3.emissive = emissive_1;
    m_3.unlit = unlit_0;
    return m_3;
}

struct CesiumFragment
{
     positionMC : vec3<f32>,
     positionEC : vec3<f32>,
     positionWC : vec3<f32>,
     normal : vec3<f32>,
     texCoord0 : vec2<f32>,
     color0 : vec4<f32>,
     featureId : u32,
     screen : vec2<f32>,
     time : f32,
     instanceIndex : u32,
     draw : u32,
     directory : u32,
     localFeature : u32,
     named0 : vec4<f32>,
     named1 : vec4<f32>,
     named2 : vec4<f32>,
     named3 : vec4<f32>,
};

var<private> cesiumAnchor_0 : vec3<f32>;

struct SplitPosition_0
{
     hi_0 : vec3<f32>,
     lo_0 : vec3<f32>,
};

fn SplitPosition_x24init_0( hi_1 : vec3<f32>,  lo_1 : vec3<f32>) -> SplitPosition_0
{
    var _S3 : SplitPosition_0;
    _S3.hi_0 = hi_1;
    _S3.lo_0 = lo_1;
    return _S3;
}

fn SplitPosition_approximate_0( this_0 : SplitPosition_0) -> vec3<f32>
{
    return this_0.hi_0 + this_0.lo_0;
}

fn cameraPosition_0() -> vec3<f32>
{
    return SplitPosition_approximate_0(SplitPosition_x24init_0(view_0.cameraHi_0, view_0.cameraLo_0));
}

struct SurfaceVaryings_0
{
     position_0 : vec4<f32>,
     normal_1 : vec3<f32>,
     uv_1 : vec2<f32>,
     color_1 : vec4<f32>,
     ids_0 : vec3<u32>,
     relPosition_0 : vec3<f32>,
     tangent_0 : vec4<f32>,
     airInscatter_0 : vec3<f32>,
     airTransmittance_1 : vec3<f32>,
     positionMC_0 : vec3<f32>,
     named0_0 : vec4<f32>,
     named1_0 : vec4<f32>,
     named2_0 : vec4<f32>,
     named3_0 : vec4<f32>,
};

fn fragmentOf_0( in_0 : SurfaceVaryings_0,  geometric_0 : vec3<f32>) -> CesiumFragment
{
    var _S4 : u32 = in_0.ids_0.x;
    cesiumAnchor_0 = in_0.relPosition_0;
    var f_0 : CesiumFragment;
    f_0.positionMC = in_0.positionMC_0;
    f_0.positionEC = in_0.relPosition_0;
    f_0.positionWC = in_0.relPosition_0 + cameraPosition_0();
    f_0.normal = geometric_0;
    f_0.texCoord0 = in_0.uv_1;
    f_0.color0 = in_0.color_1 * records_0[_S4].color_0;
    var _S5 : u32 = in_0.ids_0.y;
    f_0.featureId = _S5;
    f_0.screen = in_0.position_0.xy;
    f_0.time = view_0.time_0.x;
    f_0.instanceIndex = in_0.ids_0.z;
    f_0.draw = _S4;
    f_0.directory = records_0[_S4].attributes_0;
    var _S6 : u32;
    if(_S5 == u32(0))
    {
        _S6 = u32(4294967295);
    }
    else
    {
        _S6 = _S5 - records_0[_S4].featureId_0;
    }
    f_0.localFeature = _S6;
    f_0.named0 = in_0.named0_0;
    f_0.named1 = in_0.named1_0;
    f_0.named2 = in_0.named2_0;
    f_0.named3 = in_0.named3_0;
    return f_0;
}

fn materialAlpha_0( in_1 : SurfaceVaryings_0) -> f32
{
    var _S7 : u32 = in_1.ids_0.x;
    var _S8 : Material_std430_0 = materials_0[records_0[_S7].materialIndex_0];
    var _S9 : vec4<f32> = materialTexture_0(&(_S8), u32(0), in_1.uv_1);
    var color_2 : vec4<f32> = _S8.baseColor_0 * records_0[_S7].color_0 * in_1.color_1;
    var _S10 : bool = materialHasTexture_0(&(_S8), u32(0));
    var color_3 : vec4<f32>;
    if(_S10)
    {
        color_3 = color_2 * _S9;
    }
    else
    {
        color_3 = color_2;
    }
    var geometric_1 : vec3<f32> = normalize(in_1.normal_1);
    var custom_0 : MaterialOutput;
    var _S11 : vec3<f32> = color_3.xyz;
    var _S12 : f32 = color_3.w;
    var _S13 : f32 = _S8.metallic_0;
    var _S14 : f32 = _S8.roughness_0;
    var _S15 : vec3<f32> = _S8.emissive_0;
    var _S16 : bool;
    if((((_S8.flags_1) & (u32(1)))) != u32(0))
    {
        _S16 = true;
    }
    else
    {
        _S16 = (((records_0[_S7].flags_0) & (u32(2)))) != u32(0);
    }
    custom_0 = materialOutput_0(_S11, _S12, _S13, _S14, geometric_1, 1.0f, _S15, _S16);
    var _S17 : CesiumFragment = fragmentOf_0(in_1, geometric_1);
    cesiumFragmentStage((_S17), &((custom_0)));
    return custom_0.alpha;
}

fn SplitPosition_difference_0( this_1 : SplitPosition_0,  b_0 : SplitPosition_0) -> vec3<f32>
{
    return vec3<f32>(vec3<i32>(this_1.hi_0) - vec3<i32>(b_0.hi_0)) + (this_1.lo_0 - b_0.lo_0);
}

fn insideClipBoxes_0( block_0 : u32,  count_0 : u32,  p_0 : vec3<f32>) -> bool
{
    var i_0 : u32 = u32(0);
    loop
    {
        if((i_0 < count_0))
        {
        }
        else
        {
            break;
        }
        var b_1 : u32 = (block_0 * u32(8) + i_0) * u32(5);
        var d_0 : vec3<f32> = p_0 - SplitPosition_difference_0(SplitPosition_x24init_0(clipBoxes_0[b_1].xyz, clipBoxes_0[b_1 + u32(1)].xyz), SplitPosition_x24init_0(view_0.cameraHi_0, view_0.cameraLo_0));
        var u_0 : vec3<f32> = abs(vec3<f32>(dot(clipBoxes_0[b_1 + u32(2)].xyz, d_0), dot(clipBoxes_0[b_1 + u32(3)].xyz, d_0), dot(clipBoxes_0[b_1 + u32(4)].xyz, d_0)));
        if(((max(u_0.x, max(u_0.y, u_0.z))) <= 1.0f))
        {
            return true;
        }
        i_0 = i_0 + u32(1);
    }
    return false;
}

fn cutOut_0( in_2 : SurfaceVaryings_0)
{
    var _S18 : u32 = in_2.ids_0.x;
    var material_0 : Material_std430_0 = materials_0[records_0[_S18].materialIndex_0];
    var alpha_1 : f32 = materialAlpha_0(in_2);
    if((((material_0.flags_1) & (u32(12)))) != u32(0))
    {
        var cutoff_0 : f32;
        if((((material_0.flags_1) & (u32(8)))) != u32(0))
        {
            cutoff_0 = 0.99900001287460327f;
        }
        else
        {
            cutoff_0 = material_0.alphaCutoff_0;
        }
        if((alpha_1 < cutoff_0))
        {
            discard;
        }
    }
    var _S19 : bool;
    if((((records_0[_S18].placeholderMask_0) & ((view_0.viewBit_0)))) != u32(0))
    {
        _S19 = !insideClipBoxes_0(records_0[_S18].clipBlock_0, records_0[_S18].clipCount_0, in_2.relPosition_0);
    }
    else
    {
        _S19 = false;
    }
    if(_S19)
    {
        discard;
    }
    return;
}

struct pixelInput_0
{
    @location(0) normal_2 : vec3<f32>,
    @location(1) uv_2 : vec2<f32>,
    @location(2) color_4 : vec4<f32>,
    @interpolate(flat) @location(3) ids_1 : vec3<u32>,
    @location(4) relPosition_1 : vec3<f32>,
    @location(5) tangent_1 : vec4<f32>,
    @location(6) airInscatter_1 : vec3<f32>,
    @location(7) airTransmittance_2 : vec3<f32>,
    @location(8) positionMC_1 : vec3<f32>,
    @location(9) named0_1 : vec4<f32>,
    @location(10) named1_1 : vec4<f32>,
    @location(11) named2_1 : vec4<f32>,
    @location(12) named3_1 : vec4<f32>,
};

var<private> surfaceLight_0 : bool;

@fragment
fn shadowFs( _S20 : pixelInput_0, @builtin(position) position_1 : vec4<f32>)
{
    var _S21 : SurfaceVaryings_0 = SurfaceVaryings_0( position_1, _S20.normal_2, _S20.uv_2, _S20.color_4, _S20.ids_1, _S20.relPosition_1, _S20.tangent_1, _S20.airInscatter_1, _S20.airTransmittance_2, _S20.positionMC_1, _S20.named0_1, _S20.named1_1, _S20.named2_1, _S20.named3_1 );
    surfaceLight_0 = true;
    cutOut_0(_S21);
    return;
}

struct pixelInput_1
{
    @location(0) normal_3 : vec3<f32>,
    @location(1) uv_3 : vec2<f32>,
    @location(2) color_5 : vec4<f32>,
    @interpolate(flat) @location(3) ids_2 : vec3<u32>,
    @location(4) relPosition_2 : vec3<f32>,
    @location(5) tangent_2 : vec4<f32>,
    @location(6) airInscatter_2 : vec3<f32>,
    @location(7) airTransmittance_3 : vec3<f32>,
    @location(8) positionMC_2 : vec3<f32>,
    @location(9) named0_2 : vec4<f32>,
    @location(10) named1_2 : vec4<f32>,
    @location(11) named2_2 : vec4<f32>,
    @location(12) named3_2 : vec4<f32>,
};

@fragment
fn shadowPlaceholderFs( _S22 : pixelInput_1, @builtin(position) position_2 : vec4<f32>)
{
    surfaceLight_0 = true;
    var _S23 : u32 = _S22.ids_2.x;
    var _S24 : bool;
    if((((records_0[_S23].placeholderMask_0) & ((view_0.viewBit_0)))) != u32(0))
    {
        _S24 = !insideClipBoxes_0(records_0[_S23].clipBlock_0, records_0[_S23].clipCount_0, _S22.relPosition_2);
    }
    else
    {
        _S24 = false;
    }
    if(_S24)
    {
        discard;
    }
    return;
}

struct pixelOutput_0
{
    @location(0) output_0 : vec4<f32>,
};

struct pixelInput_2
{
    @location(0) normal_4 : vec3<f32>,
    @location(1) uv_4 : vec2<f32>,
    @location(2) color_6 : vec4<f32>,
    @interpolate(flat) @location(3) ids_3 : vec3<u32>,
    @location(4) relPosition_3 : vec3<f32>,
    @location(5) tangent_3 : vec4<f32>,
    @location(6) airInscatter_3 : vec3<f32>,
    @location(7) airTransmittance_4 : vec3<f32>,
    @location(8) positionMC_3 : vec3<f32>,
    @location(9) named0_3 : vec4<f32>,
    @location(10) named1_3 : vec4<f32>,
    @location(11) named2_3 : vec4<f32>,
    @location(12) named3_3 : vec4<f32>,
};

@fragment
fn prepassFs( _S25 : pixelInput_2, @builtin(front_facing) frontFacing_0 : bool, @builtin(position) position_3 : vec4<f32>) -> pixelOutput_0
{
    var _S26 : SurfaceVaryings_0 = SurfaceVaryings_0( position_3, _S25.normal_4, _S25.uv_4, _S25.color_6, _S25.ids_3, _S25.relPosition_3, _S25.tangent_3, _S25.airInscatter_3, _S25.airTransmittance_4, _S25.positionMC_3, _S25.named0_3, _S25.named1_3, _S25.named2_3, _S25.named3_3 );
    surfaceLight_0 = true;
    cutOut_0(_S26);
    var n_0 : vec3<f32> = normalize(_S25.normal_4);
    var n_1 : vec3<f32>;
    if(!frontFacing_0)
    {
        n_1 = (vec3<f32>(0) - n_0);
    }
    else
    {
        n_1 = n_0;
    }
    var _S27 : pixelOutput_0 = pixelOutput_0( vec4<f32>(n_1, 1.0f) );
    return _S27;
}

struct pixelOutput_1
{
    @location(0) output_1 : vec4<f32>,
};

struct pixelInput_3
{
    @location(0) normal_5 : vec3<f32>,
    @location(1) uv_5 : vec2<f32>,
    @location(2) color_7 : vec4<f32>,
    @interpolate(flat) @location(3) ids_4 : vec3<u32>,
    @location(4) relPosition_4 : vec3<f32>,
    @location(5) tangent_4 : vec4<f32>,
    @location(6) airInscatter_4 : vec3<f32>,
    @location(7) airTransmittance_5 : vec3<f32>,
    @location(8) positionMC_4 : vec3<f32>,
    @location(9) named0_4 : vec4<f32>,
    @location(10) named1_4 : vec4<f32>,
    @location(11) named2_4 : vec4<f32>,
    @location(12) named3_4 : vec4<f32>,
};

@fragment
fn depthCoverageFs( _S28 : pixelInput_3, @builtin(position) position_4 : vec4<f32>) -> pixelOutput_1
{
    var _S29 : SurfaceVaryings_0 = SurfaceVaryings_0( position_4, _S28.normal_5, _S28.uv_5, _S28.color_7, _S28.ids_4, _S28.relPosition_4, _S28.tangent_4, _S28.airInscatter_4, _S28.airTransmittance_5, _S28.positionMC_4, _S28.named0_4, _S28.named1_4, _S28.named2_4, _S28.named3_4 );
    surfaceLight_0 = true;
    var _S30 : u32 = _S28.ids_4.x;
    var material_1 : Material_std430_0 = materials_0[records_0[_S30].materialIndex_0];
    var alpha_2 : f32 = materialAlpha_0(_S29);
    var _S31 : f32 = max((fwidth((alpha_2))), 9.9999997473787516e-05f);
    var _S32 : bool;
    if((((records_0[_S30].placeholderMask_0) & ((view_0.viewBit_0)))) != u32(0))
    {
        _S32 = !insideClipBoxes_0(records_0[_S30].clipBlock_0, records_0[_S30].clipCount_0, _S28.relPosition_4);
    }
    else
    {
        _S32 = false;
    }
    if(_S32)
    {
        discard;
    }
    var cutoff_1 : f32;
    if((((material_1.flags_1) & (u32(8)))) != u32(0))
    {
        cutoff_1 = 0.99900001287460327f;
    }
    else
    {
        cutoff_1 = material_1.alphaCutoff_0;
    }
    var _S33 : pixelOutput_1 = pixelOutput_1( vec4<f32>(0.0f, 0.0f, 0.0f, clamp((alpha_2 - cutoff_1) / _S31 + 0.5f, 0.0f, 1.0f)) );
    return _S33;
}

fn imageryUv_0( packed_0 : u32,  uv_6 : vec2<f32>) -> vec2<f32>
{
    var t_0 : vec2<f32> = (vec2<f32>(f32((((packed_0 >> (u32(16)))) & (u32(255)))), f32((packed_0 >> (u32(24))))) + uv_6) / vec2<f32>(f32((u32(1) << (((((packed_0 >> (u32(12)))) & (u32(15))))))));
    return vec2<f32>(t_0.x, 1.0f - t_0.y);
}

fn srgbToLinear_0( c_0 : vec3<f32>) -> vec3<f32>
{
    return select(pow((c_0 + vec3<f32>(0.054999999701976776f)) / vec3<f32>(1.0549999475479126f), vec3<f32>(2.4000000953674316f)), c_0 / vec3<f32>(12.920000076293945f), (c_0 <= vec3<f32>(0.040449999272823334f)));
}

struct Surface_0
{
     color_8 : vec3<f32>,
     alpha_3 : f32,
     unlit_1 : bool,
};

fn surface_0( color_9 : vec3<f32>,  alpha_4 : f32,  unlit_2 : bool) -> Surface_0
{
    var s_0 : Surface_0;
    s_0.color_8 = color_9;
    s_0.alpha_3 = alpha_4;
    s_0.unlit_1 = unlit_2;
    return s_0;
}

fn fresnelSchlick_0( f0_0 : vec3<f32>,  f90_0 : vec3<f32>,  cosTheta_0 : f32) -> vec3<f32>
{
    var x_0 : f32 = 1.0f - cosTheta_0;
    var _S34 : vec3<f32> = vec3<f32>((x_0 * x_0));
    return f0_0 + (f90_0 - f0_0) * _S34 * _S34 * vec3<f32>(x_0);
}

fn smithVisibility_0( alpha_5 : f32,  nDotL_0 : f32,  nDotV_0 : f32) -> f32
{
    var a2_0 : f32 = alpha_5 * alpha_5;
    var _S35 : f32 = 1.0f - a2_0;
    var sum_0 : f32 = nDotL_0 * sqrt(nDotV_0 * nDotV_0 * _S35 + a2_0) + nDotV_0 * sqrt(nDotL_0 * nDotL_0 * _S35 + a2_0);
    var _S36 : f32;
    if((sum_0 > 0.0f))
    {
        _S36 = 0.5f / sum_0;
    }
    else
    {
        _S36 = 0.0f;
    }
    return _S36;
}

fn ggx_0( alpha_6 : f32,  nDotH_0 : f32) -> f32
{
    var a2_1 : f32 = alpha_6 * alpha_6;
    var f_1 : f32 = (nDotH_0 * a2_1 - nDotH_0) * nDotH_0 + 1.0f;
    return a2_1 / (3.1415927410125732f * f_1 * f_1);
}

fn directReflectance_0( n_2 : vec3<f32>,  v_0 : vec3<f32>,  l_0 : vec3<f32>,  f0_1 : vec3<f32>,  diffuseColor_0 : vec3<f32>,  alpha_7 : f32,  nDotV_1 : f32) -> vec3<f32>
{
    var h_0 : vec3<f32> = normalize(v_0 + l_0);
    var nDotL_1 : f32 = clamp(dot(n_2, l_0), 0.0010000000474974513f, 1.0f);
    var fresnel_0 : vec3<f32> = fresnelSchlick_0(f0_1, vec3<f32>(clamp(max(f0_1.x, max(f0_1.y, f0_1.z)) * 25.0f, 0.0f, 1.0f)), clamp(dot(v_0, h_0), 0.0f, 1.0f));
    return ((vec3<f32>(1.0f) - fresnel_0) * diffuseColor_0 / vec3<f32>(3.1415927410125732f) + fresnel_0 * vec3<f32>(smithVisibility_0(alpha_7, nDotL_1, nDotV_1)) * vec3<f32>(ggx_0(alpha_7, clamp(dot(n_2, h_0), 0.0f, 1.0f)))) * vec3<f32>(nDotL_1);
}

fn cascadeLight_0( c_1 : u32,  relPosition_5 : vec3<f32>,  n_3 : vec3<f32>) -> f32
{
    var p_1 : vec4<f32> = (((vec4<f32>(relPosition_5 + n_3 * vec3<f32>((shadows_0.texels_0[c_1] * 2.0f)), 1.0f)) * (mat4x4<f32>(shadows_0.matrices_0.data_1[c_1].data_0[i32(0)][i32(0)], shadows_0.matrices_0.data_1[c_1].data_0[i32(1)][i32(0)], shadows_0.matrices_0.data_1[c_1].data_0[i32(2)][i32(0)], shadows_0.matrices_0.data_1[c_1].data_0[i32(3)][i32(0)], shadows_0.matrices_0.data_1[c_1].data_0[i32(0)][i32(1)], shadows_0.matrices_0.data_1[c_1].data_0[i32(1)][i32(1)], shadows_0.matrices_0.data_1[c_1].data_0[i32(2)][i32(1)], shadows_0.matrices_0.data_1[c_1].data_0[i32(3)][i32(1)], shadows_0.matrices_0.data_1[c_1].data_0[i32(0)][i32(2)], shadows_0.matrices_0.data_1[c_1].data_0[i32(1)][i32(2)], shadows_0.matrices_0.data_1[c_1].data_0[i32(2)][i32(2)], shadows_0.matrices_0.data_1[c_1].data_0[i32(3)][i32(2)], shadows_0.matrices_0.data_1[c_1].data_0[i32(0)][i32(3)], shadows_0.matrices_0.data_1[c_1].data_0[i32(1)][i32(3)], shadows_0.matrices_0.data_1[c_1].data_0[i32(2)][i32(3)], shadows_0.matrices_0.data_1[c_1].data_0[i32(3)][i32(3)]))));
    var uv_7 : vec2<f32> = vec2<f32>(p_1.x * 0.5f + 0.5f, 0.5f - p_1.y * 0.5f);
    var _S37 : bool;
    if((any(((uv_7 < vec2<f32>(0.0f))))))
    {
        _S37 = true;
    }
    else
    {
        _S37 = (any(((uv_7 > vec2<f32>(1.0f)))));
    }
    if(_S37)
    {
        _S37 = true;
    }
    else
    {
        _S37 = ((p_1.z) > 1.0f);
    }
    if(_S37)
    {
        return 1.0f;
    }
    var _S38 : vec2<f32> = vec2<f32>(0.5f);
    var _S39 : vec2<f32> = uv_7 * vec2<f32>(2048.0f) + _S38;
    var base_0 : vec2<f32> = floor(_S39);
    var st_0 : vec2<f32> = _S39 - base_0;
    var _S40 : vec2<f32> = vec2<f32>(0.00048828125f);
    var _S41 : vec2<f32> = (base_0 - _S38) * _S40;
    var _S42 : f32 = st_0.x;
    var _S43 : f32 = 3.0f * _S42;
    var _S44 : f32 = 4.0f - _S43;
    var _S45 : f32 = 1.0f + _S43;
    var _S46 : f32 = (3.0f - 2.0f * _S42) / _S44 - 2.0f;
    var _S47 : f32 = (3.0f + _S42) / 7.0f;
    var _S48 : f32 = _S42 / _S45 + 2.0f;
    var _S49 : f32 = st_0.y;
    var _S50 : f32 = 3.0f * _S49;
    var _S51 : f32 = 4.0f - _S50;
    var _S52 : f32 = 1.0f + _S50;
    var _S53 : f32 = (3.0f - 2.0f * _S49) / _S51 - 2.0f;
    var _S54 : f32 = (3.0f + _S49) / 7.0f;
    var _S55 : f32 = _S49 / _S52 + 2.0f;
    var _S56 : f32 = f32(c_1);
    var _S57 : vec3<f32> = vec3<f32>(_S41 + vec2<f32>(_S46, _S53) * _S40, _S56);
    var _S58 : f32 = p_1.z;
    var _S59 : vec3<f32> = vec3<f32>(_S41 + vec2<f32>(_S47, _S53) * _S40, _S56);
    var _S60 : vec3<f32> = vec3<f32>(_S41 + vec2<f32>(_S48, _S53) * _S40, _S56);
    var _S61 : vec3<f32> = vec3<f32>(_S41 + vec2<f32>(_S46, _S54) * _S40, _S56);
    var _S62 : vec3<f32> = vec3<f32>(_S41 + vec2<f32>(_S47, _S54) * _S40, _S56);
    var _S63 : vec3<f32> = vec3<f32>(_S41 + vec2<f32>(_S48, _S54) * _S40, _S56);
    var _S64 : vec3<f32> = vec3<f32>(_S41 + vec2<f32>(_S46, _S55) * _S40, _S56);
    var _S65 : vec3<f32> = vec3<f32>(_S41 + vec2<f32>(_S47, _S55) * _S40, _S56);
    var _S66 : vec3<f32> = vec3<f32>(_S41 + vec2<f32>(_S48, _S55) * _S40, _S56);
    return (_S44 * _S51 * (textureSampleCompareLevel((shadowMap_0), (shadowSampler_0), ((_S57)).xy, i32(((_S57)).z), (_S58))) + 7.0f * _S51 * (textureSampleCompareLevel((shadowMap_0), (shadowSampler_0), ((_S59)).xy, i32(((_S59)).z), (_S58))) + _S45 * _S51 * (textureSampleCompareLevel((shadowMap_0), (shadowSampler_0), ((_S60)).xy, i32(((_S60)).z), (_S58))) + _S44 * 7.0f * (textureSampleCompareLevel((shadowMap_0), (shadowSampler_0), ((_S61)).xy, i32(((_S61)).z), (_S58))) + 49.0f * (textureSampleCompareLevel((shadowMap_0), (shadowSampler_0), ((_S62)).xy, i32(((_S62)).z), (_S58))) + _S45 * 7.0f * (textureSampleCompareLevel((shadowMap_0), (shadowSampler_0), ((_S63)).xy, i32(((_S63)).z), (_S58))) + _S44 * _S52 * (textureSampleCompareLevel((shadowMap_0), (shadowSampler_0), ((_S64)).xy, i32(((_S64)).z), (_S58))) + 7.0f * _S52 * (textureSampleCompareLevel((shadowMap_0), (shadowSampler_0), ((_S65)).xy, i32(((_S65)).z), (_S58))) + _S45 * _S52 * (textureSampleCompareLevel((shadowMap_0), (shadowSampler_0), ((_S66)).xy, i32(((_S66)).z), (_S58)))) / 144.0f;
}

fn sunShadow_0( relPosition_6 : vec3<f32>,  n_4 : vec3<f32>) -> f32
{
    var _S67 : bool;
    if(((shadows_0.forward_0.w) < 0.5f))
    {
        return 1.0f;
    }
    var depth_0 : f32 = dot(relPosition_6, shadows_0.forward_0.xyz);
    if((depth_0 >= (shadows_0.fade_0.y)))
    {
        return 1.0f;
    }
    var c_2 : u32 = u32(0);
    loop
    {
        var _S68 : bool = (c_2 < u32(3));
        _S67 = _S68;
        var _S69 : bool;
        if(_S68)
        {
            _S69 = (depth_0 > (shadows_0.splits_0[c_2]));
        }
        else
        {
            _S69 = false;
        }
        if(_S69)
        {
        }
        else
        {
            break;
        }
        c_2 = c_2 + u32(1);
    }
    var lit_0 : f32 = cascadeLight_0(c_2, relPosition_6, n_4);
    var lit_1 : f32;
    if(_S67)
    {
        var near_1 : f32;
        if((c_2 > u32(0)))
        {
            near_1 = shadows_0.splits_0[max(c_2, u32(1)) - u32(1)];
        }
        else
        {
            near_1 = 0.0f;
        }
        var band_0 : f32 = 0.10000000149011612f * (shadows_0.splits_0[c_2] - near_1);
        var w_0 : f32 = clamp((depth_0 - (shadows_0.splits_0[c_2] - band_0)) / max(band_0, 0.0010000000474974513f), 0.0f, 1.0f);
        if((w_0 > 0.0f))
        {
            lit_1 = mix(lit_0, cascadeLight_0(c_2 + u32(1), relPosition_6, n_4), w_0);
        }
        else
        {
            lit_1 = lit_0;
        }
    }
    else
    {
        lit_1 = lit_0;
    }
    return mix(lit_1, 1.0f, clamp((depth_0 - shadows_0.fade_0.x) / max(shadows_0.fade_0.y - shadows_0.fade_0.x, 0.0010000000474974513f), 0.0f, 1.0f));
}

fn sunlightThroughAir_0( relPosition_7 : vec3<f32>,  direction_0 : vec3<f32>) -> vec3<f32>
{
    var p_2 : vec3<f32> = relPosition_7 + cameraPosition_0();
    var radii_0 : vec3<f32> = view_0.bodyRadii_0.xyz;
    var distance_0 : f32 = length(p_2);
    var mu_0 : f32 = dot(normalize(p_2 / (radii_0 * radii_0)), direction_0);
    const size_0 : vec2<f32> = vec2<f32>(256.0f, 64.0f);
    return (textureSampleLevel((sunLightTable_0), (environmentSampler_0), ((vec2<f32>(0.5f) + vec2<f32>(0.5f + 0.5f * f32((i32(sign((mu_0))))) * sqrt(abs(mu_0)), sqrt(clamp((distance_0 - distance_0 / length(p_2 / radii_0)) / 1000.0f / (view_0.sunLight_0.y - view_0.sunLight_0.x), 0.0f, 1.0f))) * (size_0 - vec2<f32>(1.0f))) / size_0), (0.0f))).xyz * vec3<f32>((1.0e+05f * view_0.sunIlluminance_0));
}

fn sunIlluminance_1( relPosition_8 : vec3<f32>) -> vec3<f32>
{
    if(((view_0.sunLight_0.z) < 0.5f))
    {
        return vec3<f32>(view_0.sunIlluminance_0);
    }
    return sunlightThroughAir_0(relPosition_8, view_0.sunDirection_0.xyz);
}

fn punctualLight_0( pixel_0 : vec2<f32>,  relPosition_9 : vec3<f32>,  n_5 : vec3<f32>,  v_1 : vec3<f32>,  f0_2 : vec3<f32>,  diffuseColor_1 : vec3<f32>,  alpha_8 : f32,  nDotV_2 : f32) -> vec3<f32>
{
    var _S70 : f32 = bitcast<f32>(lightTable_0[(u32(0))/4]);
    var _S71 : f32 = bitcast<f32>(lightTable_0[(u32(4))/4]);
    var _S72 : f32 = bitcast<f32>(lightTable_0[(u32(8))/4]);
    var _S73 : f32 = bitcast<f32>(lightTable_0[(u32(16))/4]);
    var _S74 : f32 = bitcast<f32>(lightTable_0[(u32(20))/4]);
    var _S75 : f32 = bitcast<f32>(lightTable_0[(u32(32))/4]);
    var _S76 : f32 = bitcast<f32>(lightTable_0[(u32(36))/4]);
    var _S77 : f32 = bitcast<f32>(lightTable_0[(u32(40))/4]);
    var _S78 : f32 = bitcast<f32>(lightTable_0[(u32(44))/4]);
    var sum_1 : vec3<f32> = vec3<f32>(0.0f);
    if((bitcast<f32>(lightTable_0[(u32(12))/4]) < 0.5f))
    {
        return sum_1;
    }
    var z_0 : f32 = dot(relPosition_9, vec3<f32>(_S75, _S76, _S77));
    var _S79 : bool;
    if((z_0 < _S73))
    {
        _S79 = true;
    }
    else
    {
        _S79 = (z_0 >= _S78);
    }
    if(_S79)
    {
        return sum_1;
    }
    var _S80 : vec3<u32> = vec3<u32>(vec3<f32>(_S70, _S71, _S72));
    var uv_8 : vec2<f32> = pixel_0 * view_0.viewport_0.zw;
    var _S81 : u32 = _S80.x;
    var _S82 : u32 = _S80.y;
    var base_1 : u32 = ((min(u32(log(z_0 / _S73) * _S74), _S80.z - u32(1)) * _S82 + min(u32(uv_8.y * f32(_S82)), _S82 - u32(1))) * _S81 + min(u32(uv_8.x * f32(_S81)), _S81 - u32(1))) * u32(17);
    var _S83 : u32 = lightTable_0[(u32(i32(u32(65616) + base_1 * u32(4))))/4];
    var t_1 : u32 = u32(0);
    var sum_2 : vec3<f32> = sum_1;
    loop
    {
        if((t_1 < _S83))
        {
        }
        else
        {
            break;
        }
        var _S84 : u32 = u32(80) + lightTable_0[(u32(i32(u32(65616) + (base_1 + u32(1) + t_1) * u32(4))))/4] * u32(64);
        var _S85 : f32 = bitcast<f32>(lightTable_0[(_S84 + u32(12))/4]);
        var _S86 : f32 = bitcast<f32>(lightTable_0[(_S84 + u32(16))/4]);
        var _S87 : f32 = bitcast<f32>(lightTable_0[(_S84 + u32(20))/4]);
        var _S88 : f32 = bitcast<f32>(lightTable_0[(_S84 + u32(24))/4]);
        var _S89 : f32 = bitcast<f32>(lightTable_0[(_S84 + u32(28))/4]);
        var _S90 : f32 = bitcast<f32>(lightTable_0[(_S84 + u32(32))/4]);
        var _S91 : f32 = bitcast<f32>(lightTable_0[(_S84 + u32(36))/4]);
        var _S92 : f32 = bitcast<f32>(lightTable_0[(_S84 + u32(40))/4]);
        var _S93 : f32 = bitcast<f32>(lightTable_0[(_S84 + u32(44))/4]);
        var _S94 : f32 = bitcast<f32>(lightTable_0[(_S84 + u32(48))/4]);
        var toLight_0 : vec3<f32> = vec3<f32>(bitcast<f32>(lightTable_0[(_S84)/4]), bitcast<f32>(lightTable_0[(_S84 + u32(4))/4]), bitcast<f32>(lightTable_0[(_S84 + u32(8))/4])) - relPosition_9;
        var _S95 : f32 = max(dot(toLight_0, toLight_0), 9.9999997473787516e-05f);
        var l_1 : vec3<f32> = toLight_0 * vec3<f32>(inverseSqrt(_S95));
        if(((dot(n_5, l_1)) <= 0.0f))
        {
            t_1 = t_1 + u32(1);
            continue;
        }
        var ratio2_0 : f32 = _S95 / (_S85 * _S85);
        var window_0 : f32 = clamp(1.0f - ratio2_0 * ratio2_0, 0.0f, 1.0f);
        var illuminance_0 : vec3<f32> = vec3<f32>(_S86, _S87, _S88) * vec3<f32>((window_0 * window_0 / _S95));
        var illuminance_1 : vec3<f32>;
        if((_S89 > 0.5f))
        {
            var cone_0 : f32 = clamp(dot(vec3<f32>(_S90, _S91, _S92), (vec3<f32>(0) - l_1)) * _S93 + _S94, 0.0f, 1.0f);
            illuminance_1 = illuminance_0 * vec3<f32>((cone_0 * cone_0));
        }
        else
        {
            illuminance_1 = illuminance_0;
        }
        sum_2 = sum_2 + directReflectance_0(n_5, v_1, l_1, f0_2, diffuseColor_1, alpha_8, nDotV_2) * illuminance_1;
        t_1 = t_1 + u32(1);
    }
    return sum_2;
}

fn toEnvironment_0( d_1 : vec3<f32>) -> vec3<f32>
{
    return vec3<f32>(dot(d_1, view_0.iblFrame_0[i32(0)].xyz), dot(d_1, view_0.iblFrame_0[i32(1)].xyz), dot(d_1, view_0.iblFrame_0[i32(2)].xyz));
}

fn irradiance_0( n_6 : vec3<f32>) -> vec3<f32>
{
    return (textureSampleLevel((irradianceCube_0), (environmentSampler_0), (n_6), (0.0f))).xyz;
}

fn ambientOcclusion_0( pixel_1 : vec2<f32>) -> f32
{
    if(((shadows_0.fade_0.z) < 0.5f))
    {
        return 1.0f;
    }
    var _S96 : vec2<u32> = vec2<u32>(pixel_1);
    var _S97 : u32 = _S96.x;
    return f32((((aoWords_0[_S96.y * ((u32(view_0.viewport_0.x) + u32(3)) / u32(4)) + _S97 / u32(4)] >> ((u32(8) * ((_S97 & (u32(3)))))))) & (u32(255)))) / 255.0f;
}

struct AerialPerspective_0
{
     inscatter_0 : vec3<f32>,
     transmittance_0 : vec3<f32>,
};

fn aerialPerspective_0( fragment_0 : vec2<f32>,  relPosition_10 : vec3<f32>) -> AerialPerspective_0
{
    var w_1 : f32 = sqrt(clamp((length(relPosition_10) / 1000.0f - view_0.aerialStart_0) / max(view_0.aerialEnd_0 - view_0.aerialStart_0, 9.99999997475242708e-07f), 0.0f, 1.0f));
    var uv_9 : vec2<f32> = fragment_0 * view_0.viewport_0.zw;
    var half_0 : f32 = clamp(w_1, 0.00390625f, 0.99609375f) * 0.5f;
    var transmittance_1 : vec3<f32> = (textureSampleLevel((aerialVolume_0), (environmentSampler_0), (vec3<f32>(uv_9, 0.5f + half_0)), (0.0f))).xyz;
    var result_0 : AerialPerspective_0;
    var _S98 : vec3<f32> = vec3<f32>(clamp(w_1 * 256.0f, 0.0f, 1.0f));
    result_0.inscatter_0 = (textureSampleLevel((aerialVolume_0), (environmentSampler_0), (vec3<f32>(uv_9, half_0)), (0.0f))).xyz * _S98;
    result_0.transmittance_0 = mix(vec3<f32>(1.0f), transmittance_1, _S98);
    return result_0;
}

fn shadeSurface_0( in_3 : SurfaceVaryings_0,  frontFacing_1 : bool,  translucent_0 : bool) -> Surface_0
{
    var _S99 : u32 = in_3.ids_0.x;
    var _S100 : Material_std430_0 = materials_0[records_0[_S99].materialIndex_0];
    var _S101 : u32 = _S100.flags_1;
    var _S102 : vec4<f32> = materialTexture_0(&(_S100), u32(0), in_3.uv_1);
    var _S103 : vec4<f32> = materialTexture_0(&(_S100), u32(4), in_3.uv_1);
    var emissiveSample_0 : vec3<f32> = _S103.xyz;
    var _S104 : vec4<f32> = materialTexture_0(&(_S100), u32(1), in_3.uv_1);
    var _S105 : vec4<f32> = materialTexture_0(&(_S100), u32(2), in_3.uv_1);
    var normalSample_0 : vec3<f32> = _S105.xyz;
    var _S106 : vec4<f32> = materialTexture_0(&(_S100), u32(3), in_3.uv_1);
    var occlusionSample_0 : f32 = _S106.x;
    var imageryPacked_0 : u32 = records_0[_S99].imagerySlice_0;
    var _S107 : vec3<f32> = vec3<f32>(imageryUv_0(records_0[_S99].imagerySlice_0, in_3.uv_1), f32(max(((records_0[_S99].imagerySlice_0) & (u32(4095))), u32(1)) - u32(1)));
    var imagerySample_0 : vec4<f32> = (textureSample((imagery_0), (imagerySampler_0), ((_S107)).xy, i32(((_S107)).z)));
    var lightsPacked_0 : u32 = records_0[_S99].lightsSlice_0;
    var _S108 : vec3<f32> = vec3<f32>(imageryUv_0(records_0[_S99].lightsSlice_0, in_3.uv_1), f32(max(((records_0[_S99].lightsSlice_0) & (u32(4095))), u32(1)) - u32(1)));
    var lightsSample_0 : vec3<f32> = (textureSample((imagery_0), (imagerySampler_0), ((_S108)).xy, i32(((_S108)).z))).xyz;
    var dPdx_0 : vec3<f32> = dpdx(in_3.relPosition_0);
    var dPdy_0 : vec3<f32> = dpdy(in_3.relPosition_0);
    var dUVdx_0 : vec2<f32> = dpdx(in_3.uv_1);
    var dUVdy_0 : vec2<f32> = dpdy(in_3.uv_1);
    var baseColorSample_0 : vec4<f32>;
    var emissiveSample_1 : vec3<f32>;
    if(((_S101 & (u32(512)))) != u32(0))
    {
        var _S109 : vec3<f32> = vec3<f32>(2.2000000476837158f);
        var _S110 : vec3<f32> = pow(emissiveSample_0, _S109);
        baseColorSample_0 = vec4<f32>(pow(_S102.xyz, _S109), _S102.w);
        emissiveSample_1 = _S110;
    }
    else
    {
        baseColorSample_0 = _S102;
        emissiveSample_1 = emissiveSample_0;
    }
    var _S111 : vec4<f32> = records_0[_S99].color_0;
    var baseColor_2 : vec4<f32> = _S100.baseColor_0 * records_0[_S99].color_0 * in_3.color_1;
    var _S112 : bool = materialHasTexture_0(&(_S100), u32(0));
    var baseColor_3 : vec4<f32>;
    if(_S112)
    {
        baseColor_3 = baseColor_2 * baseColorSample_0;
    }
    else
    {
        baseColor_3 = baseColor_2;
    }
    if(imageryPacked_0 != u32(0))
    {
        baseColor_3 = vec4<f32>(srgbToLinear_0(imagerySample_0.xyz), 1.0f) * _S111;
    }
    var _S113 : bool;
    if((((records_0[_S99].placeholderMask_0) & ((view_0.viewBit_0)))) != u32(0))
    {
        _S113 = !insideClipBoxes_0(records_0[_S99].clipBlock_0, records_0[_S99].clipCount_0, in_3.relPosition_0);
    }
    else
    {
        _S113 = false;
    }
    if(_S113)
    {
        discard;
    }
    var _S114 : vec3<f32> = _S100.emissive_0;
    var _S115 : bool = materialHasTexture_0(&(_S100), u32(4));
    var emissive_2 : vec3<f32>;
    if(_S115)
    {
        emissive_2 = _S114 * emissiveSample_1;
    }
    else
    {
        emissive_2 = _S114;
    }
    var _S116 : f32 = _S100.metallic_0;
    var _S117 : f32 = _S100.roughness_0;
    var _S118 : bool = materialHasTexture_0(&(_S100), u32(1));
    var metallic_2 : f32;
    var roughness_2 : f32;
    if(_S118)
    {
        var roughness_3 : f32 = _S117 * _S104.y;
        metallic_2 = _S116 * _S104.z;
        roughness_2 = roughness_3;
    }
    else
    {
        metallic_2 = _S116;
        roughness_2 = _S117;
    }
    var metallic_3 : f32 = clamp(metallic_2, 0.0f, 1.0f);
    var roughness_4 : f32 = clamp(roughness_2, 0.0f, 1.0f);
    var n_7 : vec3<f32> = normalize(in_3.normal_1);
    var _S119 : bool = !frontFacing_1;
    var n_8 : vec3<f32>;
    if(_S119)
    {
        n_8 = (vec3<f32>(0) - n_7);
    }
    else
    {
        n_8 = n_7;
    }
    var _S120 : bool = materialHasTexture_0(&(_S100), u32(2));
    var geometric_2 : vec3<f32>;
    var direct_0 : vec3<f32>;
    if(_S120)
    {
        var _S121 : f32 = in_3.tangent_0.w;
        if(_S121 != 0.0f)
        {
            var _S122 : vec3<f32> = in_3.tangent_0.xyz;
            var t_2 : vec3<f32> = normalize(_S122 - n_8 * vec3<f32>(dot(n_8, _S122)));
            var _S123 : vec3<f32> = cross(n_8, t_2) * vec3<f32>(_S121);
            geometric_2 = t_2;
            direct_0 = _S123;
        }
        else
        {
            var dp2perp_0 : vec3<f32> = cross(dPdy_0, n_8);
            var dp1perp_0 : vec3<f32> = cross(n_8, dPdx_0);
            var tt_0 : vec3<f32> = dp2perp_0 * vec3<f32>(dUVdx_0.x) + dp1perp_0 * vec3<f32>(dUVdy_0.x);
            var bb_0 : vec3<f32> = dp2perp_0 * vec3<f32>(dUVdx_0.y) + dp1perp_0 * vec3<f32>(dUVdy_0.y);
            var _S124 : vec3<f32> = vec3<f32>(inverseSqrt(max(dot(tt_0, tt_0), dot(bb_0, bb_0)) + 9.99999968265522539e-21f));
            var _S125 : vec3<f32> = bb_0 * _S124;
            geometric_2 = tt_0 * _S124;
            direct_0 = _S125;
        }
        var tsNormal_0 : vec3<f32> = (normalSample_0 * vec3<f32>(2.0f) - vec3<f32>(1.0f)) * vec3<f32>(_S100.normalScale_0, _S100.normalScale_0, 1.0f);
        n_8 = normalize(geometric_2 * vec3<f32>(tsNormal_0.x) + direct_0 * vec3<f32>(tsNormal_0.y) + n_8 * vec3<f32>(tsNormal_0.z));
    }
    var _S126 : bool = materialHasTexture_0(&(_S100), u32(3));
    var occlusion_1 : f32;
    if(_S126)
    {
        occlusion_1 = 1.0f + _S100.occlusionStrength_0 * (occlusionSample_0 - 1.0f);
    }
    else
    {
        occlusion_1 = 1.0f;
    }
    if(_S119)
    {
        geometric_2 = (vec3<f32>(0) - n_7);
    }
    else
    {
        geometric_2 = n_7;
    }
    var fragment_1 : CesiumFragment = fragmentOf_0(in_3, geometric_2);
    var custom_1 : MaterialOutput;
    var _S127 : vec3<f32> = baseColor_3.xyz;
    var _S128 : f32 = baseColor_3.w;
    if(((_S101 & (u32(1)))) != u32(0))
    {
        _S113 = true;
    }
    else
    {
        _S113 = (((records_0[_S99].flags_0) & (u32(2)))) != u32(0);
    }
    custom_1 = materialOutput_0(_S127, _S128, metallic_3, roughness_4, n_8, occlusion_1, emissive_2, _S113);
    cesiumFragmentStage((fragment_1), &((custom_1)));
    var baseColor_4 : vec4<f32> = vec4<f32>(custom_1.baseColor, custom_1.alpha);
    if(!cutOutInDepth_0)
    {
        _S113 = ((_S101 & (u32(4)))) != u32(0);
    }
    else
    {
        _S113 = false;
    }
    if(_S113)
    {
        _S113 = ((baseColor_4.w) < (_S100.alphaCutoff_0));
    }
    else
    {
        _S113 = false;
    }
    if(_S113)
    {
        discard;
    }
    if(custom_1.unlit)
    {
        return surface_0(baseColor_4.xyz, baseColor_4.w, true);
    }
    if(!surfaceLight_0)
    {
        return surface_0(vec3<f32>(0.0f), baseColor_4.w, false);
    }
    var metallic_4 : f32 = clamp(custom_1.metallic, 0.0f, 1.0f);
    var roughness_5 : f32 = clamp(custom_1.roughness, 0.0f, 1.0f);
    var n_9 : vec3<f32> = normalize(custom_1.normal);
    var occlusion_2 : f32 = custom_1.occlusion;
    var emissive_3 : vec3<f32> = custom_1.emissive;
    var v_2 : vec3<f32> = (vec3<f32>(0) - normalize(in_3.relPosition_0));
    var l_2 : vec3<f32> = normalize(view_0.sunDirection_0.xyz);
    var nDotV_3 : f32 = clamp(dot(n_9, v_2), 0.0f, 1.0f);
    var _S129 : vec3<f32> = baseColor_4.xyz;
    var f0_3 : vec3<f32> = mix(vec3<f32>(0.039999999105930328f), _S129, vec3<f32>(metallic_4));
    var diffuseColor_2 : vec3<f32> = _S129 * vec3<f32>((1.0f - metallic_4));
    var alpha_9 : f32 = roughness_5 * roughness_5;
    var sunReflected_0 : vec3<f32> = directReflectance_0(n_9, v_2, l_2, f0_3, diffuseColor_2, alpha_9, nDotV_3);
    var moonShadows_0 : bool = ((shadows_0.fade_0.w) > 0.5f);
    var sunVisible_0 : f32;
    if(((dot(n_9, l_2)) > 0.0f))
    {
        sunVisible_0 = 1.0f;
    }
    else
    {
        sunVisible_0 = 0.0f;
    }
    if((sunVisible_0 > 0.0f))
    {
        _S113 = !moonShadows_0;
    }
    else
    {
        _S113 = false;
    }
    if(_S113)
    {
        sunVisible_0 = sunVisible_0 * sunShadow_0(in_3.relPosition_0, geometric_2);
    }
    var direct_1 : vec3<f32> = sunReflected_0 * sunIlluminance_1(in_3.relPosition_0) * vec3<f32>(sunVisible_0);
    var moonward_0 : vec3<f32> = view_0.moonLight_0.xyz;
    if(((view_0.moonLight_0.w) > 0.0f))
    {
        _S113 = ((view_0.sunLight_0.z) > 0.5f);
    }
    else
    {
        _S113 = false;
    }
    if(_S113)
    {
        _S113 = ((dot(n_9, moonward_0)) > 0.0f);
    }
    else
    {
        _S113 = false;
    }
    var ao_0 : f32;
    if(_S113)
    {
        if(moonShadows_0)
        {
            ao_0 = sunShadow_0(in_3.relPosition_0, geometric_2);
        }
        else
        {
            ao_0 = 1.0f;
        }
        direct_0 = direct_1 + directReflectance_0(n_9, v_2, moonward_0, f0_3, diffuseColor_2, alpha_9, nDotV_3) * sunlightThroughAir_0(in_3.relPosition_0, moonward_0) * vec3<f32>(view_0.moonLight_0.w) * vec3<f32>(ao_0);
    }
    else
    {
        direct_0 = direct_1;
    }
    var _S130 : vec2<f32> = in_3.position_0.xy;
    var direct_2 : vec3<f32> = direct_0 + punctualLight_0(_S130, in_3.relPosition_0, n_9, v_2, f0_3, diffuseColor_2, alpha_9, nDotV_3);
    var lut_0 : vec2<f32> = (textureSampleLevel((brdfLut_0), (environmentSampler_0), (vec2<f32>(nDotV_3, roughness_5)), (0.0f))).xy;
    var _S131 : f32 = lut_0.x;
    var _S132 : f32 = lut_0.y;
    var fssEss_0 : vec3<f32> = fresnelSchlick_0(f0_3, max(vec3<f32>((1.0f - roughness_5)), f0_3), nDotV_3) * vec3<f32>(_S131) + vec3<f32>(_S132);
    var _S133 : vec3<f32> = vec3<f32>(1.0f);
    var averageF_0 : vec3<f32> = f0_3 + (_S133 - f0_3) / vec3<f32>(21.0f);
    var _S134 : vec3<f32> = vec3<f32>((1.0f - _S131 - _S132));
    var fmsEms_0 : vec3<f32> = fssEss_0 * averageF_0 * _S134 / (_S133 - averageF_0 * _S134);
    var diffuseIbl_1 : vec3<f32> = irradiance_0(toEnvironment_0(n_9)) * (fmsEms_0 + (_S133 - fssEss_0 - fmsEms_0) * diffuseColor_2);
    var specularIbl_1 : vec3<f32> = (textureSampleLevel((specularEnvironment_0), (environmentSampler_0), (toEnvironment_0(reflect((vec3<f32>(0) - v_2), n_9))), (roughness_5 * view_0.specularMaxLod_0))).xyz * fssEss_0;
    if(translucent_0)
    {
        ao_0 = 1.0f;
    }
    else
    {
        ao_0 = ambientOcclusion_0(_S130);
    }
    var indirect_0 : vec3<f32> = (diffuseIbl_1 * max(vec3<f32>(ao_0), ((vec3<f32>(ao_0) * (vec3<f32>(2.0404000282287598f) * diffuseColor_2 - vec3<f32>(0.33239999413490295f)) + (vec3<f32>(-4.795100212097168f) * diffuseColor_2 + vec3<f32>(0.64170002937316895f))) * vec3<f32>(ao_0) + (vec3<f32>(2.7551999092102051f) * diffuseColor_2 + vec3<f32>(0.69029998779296875f))) * vec3<f32>(ao_0)) * vec3<f32>(view_0.diffuseIbl_0) + specularIbl_1 * vec3<f32>(clamp(pow(nDotV_3 + ao_0, exp2(-16.0f * roughness_5 - 1.0f)) - 1.0f + ao_0, 0.0f, 1.0f)) * vec3<f32>(view_0.specularIbl_0)) * vec3<f32>(occlusion_2);
    var _S135 : vec3<f32> = vec3<f32>(0.0f);
    if(lightsPacked_0 != u32(0))
    {
        _S113 = ((view_0.iblFrame_0[i32(0)].w) > 0.5f);
    }
    else
    {
        _S113 = false;
    }
    var emitted_0 : vec3<f32>;
    if(_S113)
    {
        emitted_0 = max(srgbToLinear_0(lightsSample_0) - vec3<f32>(0.0040000001899898052f), _S135) / vec3<f32>(0.99599999189376831f) * vec3<f32>(0.30000001192092896f);
    }
    else
    {
        emitted_0 = _S135;
    }
    var lit_2 : vec3<f32> = (direct_2 + indirect_0 + emitted_0) * vec3<f32>(view_0.exposure_0);
    var lit_3 : vec3<f32>;
    var shown_0 : vec3<f32>;
    if(((view_0.sunLight_0.w) > 0.5f))
    {
        var march_0 : f32 = view_0.bodyRadii_0.w;
        var ap_0 : AerialPerspective_0;
        ap_0.inscatter_0 = _S135;
        ap_0.transmittance_0 = vec3<f32>(1.0f);
        if((march_0 < 1.0f))
        {
            ap_0 = aerialPerspective_0(_S130, in_3.relPosition_0);
        }
        if((march_0 > 0.0f))
        {
            var a_0 : AerialPerspective_0;
            a_0.inscatter_0 = in_3.airInscatter_0;
            a_0.transmittance_0 = in_3.airTransmittance_1;
            var screen_0 : f32 = view_0.iblFrame_0[i32(1)].w;
            if((screen_0 > 0.0f))
            {
                var uv_10 : vec2<f32> = _S130 * view_0.viewport_0.zw;
                var _S136 : vec3<f32> = vec3<f32>(uv_10, 0.0f);
                var _S137 : vec3<f32> = vec3<f32>(screen_0);
                a_0.inscatter_0 = mix(a_0.inscatter_0, (textureSampleLevel((aerialScreen_0), (environmentSampler_0), ((_S136)).xy, i32(((_S136)).z), (0.0f))).xyz, _S137);
                var _S138 : vec3<f32> = vec3<f32>(uv_10, 1.0f);
                a_0.transmittance_0 = mix(a_0.transmittance_0, (textureSampleLevel((aerialScreen_0), (environmentSampler_0), ((_S138)).xy, i32(((_S138)).z), (0.0f))).xyz, _S137);
            }
            var _S139 : vec3<f32> = vec3<f32>(march_0);
            ap_0.inscatter_0 = mix(ap_0.inscatter_0, a_0.inscatter_0, _S139);
            ap_0.transmittance_0 = mix(ap_0.transmittance_0, a_0.transmittance_0, _S139);
        }
        var _S140 : vec3<f32> = emissive_3 * ap_0.transmittance_0;
        lit_3 = lit_2 * ap_0.transmittance_0 + ap_0.inscatter_0;
        shown_0 = _S140;
    }
    else
    {
        lit_3 = lit_2;
        shown_0 = emissive_3;
    }
    return surface_0(min(lit_3 + shown_0, vec3<f32>(60000.0f)), baseColor_4.w, false);
}

struct FsOut_0
{
    @location(0) color_10 : vec4<f32>,
    @interpolate(flat) @location(1) featureId_1 : vec2<u32>,
    @location(2) display_0 : vec4<f32>,
};

struct pixelInput_4
{
    @location(0) normal_6 : vec3<f32>,
    @location(1) uv_11 : vec2<f32>,
    @location(2) color_11 : vec4<f32>,
    @interpolate(flat) @location(3) ids_5 : vec3<u32>,
    @location(4) relPosition_11 : vec3<f32>,
    @location(5) tangent_5 : vec4<f32>,
    @location(6) airInscatter_5 : vec3<f32>,
    @location(7) airTransmittance_6 : vec3<f32>,
    @location(8) positionMC_5 : vec3<f32>,
    @location(9) named0_5 : vec4<f32>,
    @location(10) named1_5 : vec4<f32>,
    @location(11) named2_5 : vec4<f32>,
    @location(12) named3_5 : vec4<f32>,
};

@fragment
fn fs( _S141 : pixelInput_4, @builtin(front_facing) frontFacing_2 : bool, @builtin(position) position_5 : vec4<f32>) -> FsOut_0
{
    var _S142 : SurfaceVaryings_0 = SurfaceVaryings_0( position_5, _S141.normal_6, _S141.uv_11, _S141.color_11, _S141.ids_5, _S141.relPosition_11, _S141.tangent_5, _S141.airInscatter_5, _S141.airTransmittance_6, _S141.positionMC_5, _S141.named0_5, _S141.named1_5, _S141.named2_5, _S141.named3_5 );
    surfaceLight_0 = true;
    var s_1 : Surface_0 = shadeSurface_0(_S142, frontFacing_2, false);
    var _S143 : bool;
    if(!cutOutInDepth_0)
    {
        _S143 = (((materials_0[records_0[_S141.ids_5.x].materialIndex_0].flags_1) & (u32(8)))) != u32(0);
    }
    else
    {
        _S143 = false;
    }
    if(_S143)
    {
        _S143 = ((s_1.alpha_3) < 0.99900001287460327f);
    }
    else
    {
        _S143 = false;
    }
    if(_S143)
    {
        discard;
    }
    var out_0 : FsOut_0;
    var _S144 : u32 = _S141.ids_5.y;
    out_0.featureId_1 = vec2<u32>((_S144 & (u32(65535))), (_S144 >> (u32(16))));
    if(s_1.unlit_1)
    {
        out_0.color_10 = vec4<f32>(0.0f);
        out_0.display_0 = vec4<f32>(s_1.color_8, 1.0f);
    }
    else
    {
        out_0.color_10 = vec4<f32>(s_1.color_8, 1.0f);
        out_0.display_0 = vec4<f32>(0.0f);
    }
    return out_0;
}

struct FsPointsOut_0
{
    @location(0) color_12 : vec4<f32>,
    @interpolate(flat) @location(1) featureId_2 : vec2<u32>,
    @location(2) display_1 : vec4<f32>,
    @builtin(sample_mask) mask_0 : u32,
};

struct pixelInput_5
{
    @location(0) normal_7 : vec3<f32>,
    @location(1) uv_12 : vec2<f32>,
    @location(2) color_13 : vec4<f32>,
    @interpolate(flat) @location(3) ids_6 : vec3<u32>,
    @location(4) relPosition_12 : vec3<f32>,
    @location(5) tangent_6 : vec4<f32>,
    @location(6) airInscatter_6 : vec3<f32>,
    @location(7) airTransmittance_7 : vec3<f32>,
    @location(8) positionMC_6 : vec3<f32>,
    @location(9) named0_6 : vec4<f32>,
    @location(10) named1_6 : vec4<f32>,
    @location(11) named2_6 : vec4<f32>,
    @location(12) named3_6 : vec4<f32>,
};

@fragment
fn fsPoints( _S145 : pixelInput_5, @builtin(front_facing) frontFacing_3 : bool, @builtin(position) position_6 : vec4<f32>) -> FsPointsOut_0
{
    var _S146 : SurfaceVaryings_0 = SurfaceVaryings_0( position_6, _S145.normal_7, _S145.uv_12, _S145.color_13, _S145.ids_6, _S145.relPosition_12, _S145.tangent_6, _S145.airInscatter_6, _S145.airTransmittance_7, _S145.positionMC_6, _S145.named0_6, _S145.named1_6, _S145.named2_6, _S145.named3_6 );
    surfaceLight_0 = true;
    var s_2 : Surface_0 = shadeSurface_0(_S146, frontFacing_3, false);
    var samples_0 : u32 = u32(round(clamp(s_2.alpha_3, 0.0f, 1.0f) * 4.0f));
    if(samples_0 == u32(0))
    {
        discard;
    }
    var turn_0 : u32 = (u32(position_6.x) + u32(2) * u32(position_6.y)) % u32(4);
    var covered_0 : u32 = ((u32(1) << (samples_0))) - u32(1);
    var out_1 : FsPointsOut_0;
    out_1.mask_0 = (((((covered_0 << (turn_0))) | (((covered_0 >> ((u32(4) - turn_0))))))) & (u32(15)));
    var _S147 : u32 = _S145.ids_6.y;
    out_1.featureId_2 = vec2<u32>((_S147 & (u32(65535))), (_S147 >> (u32(16))));
    if(s_2.unlit_1)
    {
        out_1.color_12 = vec4<f32>(0.0f);
        out_1.display_1 = vec4<f32>(s_2.color_8, 1.0f);
    }
    else
    {
        out_1.color_12 = vec4<f32>(s_2.color_8, 1.0f);
        out_1.display_1 = vec4<f32>(0.0f);
    }
    return out_1;
}

fn depthSlope_0( position_7 : vec4<f32>) -> vec2<f32>
{
    var _S148 : f32 = position_7.z;
    return vec2<f32>(dpdx(_S148), dpdy(_S148));
}

fn visibleSamples_0( position_8 : vec4<f32>,  slope_0 : vec2<f32>,  mask_1 : u32) -> u32
{
    var _S149 : vec2<f32> = position_8.xy;
    var _S150 : vec2<i32> = vec2<i32>(vec2<u32>(_S149));
    var width_1 : u32;
    var height_1 : u32;
    var samples_1 : u32;
    {var dim = textureDimensions((opaqueDepth_0));((width_1)) = dim.x;((height_1)) = dim.y;((samples_1)) = textureNumSamples((opaqueDepth_0));};
    var _S151 : vec2<f32> = fract(_S149) - vec2<f32>(0.5f);
    var i_1 : u32 = u32(0);
    var visible_0 : u32 = u32(0);
    loop
    {
        if((i_1 < samples_1))
        {
        }
        else
        {
            break;
        }
        var z_1 : f32 = position_8.z;
        var z_2 : f32;
        if(samples_1 == u32(4))
        {
            z_2 = z_1 + dot(slope_0, SAMPLE_OFFSETS_0[i_1] - _S151);
        }
        else
        {
            z_2 = z_1;
        }
        var _S152 : u32 = (u32(1) << (i_1));
        var _S153 : bool;
        if(((mask_1 & (_S152))) != u32(0))
        {
            _S153 = (z_2 >= (textureLoad((opaqueDepth_0), (_S150), (i32(i_1)))));
        }
        else
        {
            _S153 = false;
        }
        if(_S153)
        {
            visible_0 = (visible_0 | (_S152));
        }
        i_1 = i_1 + u32(1);
    }
    return visible_0;
}

fn appendNode_0( in_4 : SurfaceVaryings_0,  slope_1 : vec2<f32>,  s_3 : Surface_0,  mask_2 : u32)
{
    if(((s_3.alpha_3) >= 0.99949997663497925f))
    {
        return;
    }
    var alpha_10 : f32 = clamp(s_3.alpha_3, 0.0f, 1.0f);
    var visible_1 : u32 = visibleSamples_0(in_4.position_0, slope_1, mask_2);
    var _S154 : bool;
    if((alpha_10 <= 0.0f))
    {
        _S154 = true;
    }
    else
    {
        _S154 = visible_1 == u32(0);
    }
    if(_S154)
    {
        return;
    }
    var index_0 : u32 = atomicAdd(&(lists_0[i32(0)]), u32(1));
    if((index_0 >= (translucency_0.capacity_0)))
    {
        return;
    }
    var node_0 : u32 = translucency_0.nodesBase_0 + index_0 * u32(4);
    atomicStore(&(lists_0[node_0]), pack2x16float(s_3.color_8.xy));
    var _S155 : u32 = node_0 + u32(1);
    var _S156 : f32 = s_3.color_8.z;
    var _S157 : f32;
    if(s_3.unlit_1)
    {
        _S157 = - alpha_10;
    }
    else
    {
        _S157 = alpha_10;
    }
    atomicStore(&(lists_0[_S155]), pack2x16float(vec2<f32>(_S156, _S157)));
    atomicStore(&(lists_0[node_0 + u32(2)]), (bitcast<u32>((in_4.position_0.z))));
    var next_0 : u32 = atomicExchange(&(lists_0[u32(4) + (u32(in_4.position_0.y) * translucency_0.width_0 + u32(in_4.position_0.x))]), index_0 + u32(1));
    atomicStore(&(lists_0[node_0 + u32(3)]), (next_0 | (((visible_1 << (u32(28)))))));
    return;
}

struct pixelInput_6
{
    @location(0) normal_8 : vec3<f32>,
    @location(1) uv_13 : vec2<f32>,
    @location(2) color_14 : vec4<f32>,
    @interpolate(flat) @location(3) ids_7 : vec3<u32>,
    @location(4) relPosition_13 : vec3<f32>,
    @location(5) tangent_7 : vec4<f32>,
    @location(6) airInscatter_7 : vec3<f32>,
    @location(7) airTransmittance_8 : vec3<f32>,
    @location(8) positionMC_7 : vec3<f32>,
    @location(9) named0_7 : vec4<f32>,
    @location(10) named1_7 : vec4<f32>,
    @location(11) named2_7 : vec4<f32>,
    @location(12) named3_7 : vec4<f32>,
};

@fragment
fn fsList( _S158 : pixelInput_6, @builtin(front_facing) frontFacing_4 : bool, @builtin(sample_mask) mask_3 : u32, @builtin(position) position_9 : vec4<f32>)
{
    var _S159 : SurfaceVaryings_0 = SurfaceVaryings_0( position_9, _S158.normal_8, _S158.uv_13, _S158.color_14, _S158.ids_7, _S158.relPosition_13, _S158.tangent_7, _S158.airInscatter_7, _S158.airTransmittance_8, _S158.positionMC_7, _S158.named0_7, _S158.named1_7, _S158.named2_7, _S158.named3_7 );
    surfaceLight_0 = true;
    var slope_2 : vec2<f32> = depthSlope_0(position_9);
    var s_4 : Surface_0 = shadeSurface_0(_S159, frontFacing_4, true);
    appendNode_0(_S159, slope_2, s_4, mask_3);
    return;
}

struct pixelInput_7
{
    @location(0) normal_9 : vec3<f32>,
    @location(1) uv_14 : vec2<f32>,
    @location(2) color_15 : vec4<f32>,
    @interpolate(flat) @location(3) ids_8 : vec3<u32>,
    @location(4) relPosition_14 : vec3<f32>,
    @location(5) tangent_8 : vec4<f32>,
    @location(6) airInscatter_8 : vec3<f32>,
    @location(7) airTransmittance_9 : vec3<f32>,
    @location(8) positionMC_8 : vec3<f32>,
    @location(9) named0_8 : vec4<f32>,
    @location(10) named1_8 : vec4<f32>,
    @location(11) named2_8 : vec4<f32>,
    @location(12) named3_8 : vec4<f32>,
};

@fragment
fn fsListSamples( _S160 : pixelInput_7, @builtin(front_facing) frontFacing_5 : bool, @builtin(sample_mask) mask_4 : u32, @builtin(sample_index) sample_0 : u32, @builtin(position) position_10 : vec4<f32>)
{
    var _S161 : SurfaceVaryings_0 = SurfaceVaryings_0( position_10, _S160.normal_9, _S160.uv_14, _S160.color_15, _S160.ids_8, _S160.relPosition_14, _S160.tangent_8, _S160.airInscatter_8, _S160.airTransmittance_9, _S160.positionMC_8, _S160.named0_8, _S160.named1_8, _S160.named2_8, _S160.named3_8 );
    surfaceLight_0 = true;
    var slope_3 : vec2<f32> = depthSlope_0(position_10);
    var writes_0 : bool = sample_0 == (firstbitlow_0(mask_4));
    surfaceLight_0 = writes_0;
    var s_5 : Surface_0 = shadeSurface_0(_S161, frontFacing_5, true);
    if(writes_0)
    {
        appendNode_0(_S161, slope_3, s_5, mask_4);
    }
    return;
}

fn blendedAlpha_0( in_5 : SurfaceVaryings_0) -> f32
{
    var _S162 : u32 = in_5.ids_0.x;
    var alpha_11 : f32 = materialAlpha_0(in_5);
    var _S163 : bool;
    if((((records_0[_S162].placeholderMask_0) & ((view_0.viewBit_0)))) != u32(0))
    {
        _S163 = !insideClipBoxes_0(records_0[_S162].clipBlock_0, records_0[_S162].clipCount_0, in_5.relPosition_0);
    }
    else
    {
        _S163 = false;
    }
    if(_S163)
    {
        discard;
    }
    return clamp(alpha_11, 0.0f, 1.0f);
}

fn uncovered_0( position_11 : vec4<f32>,  slope_4 : vec2<f32>) -> f32
{
    var width_2 : u32;
    var height_2 : u32;
    var samples_2 : u32;
    {var dim = textureDimensions((opaqueDepth_0));((width_2)) = dim.x;((height_2)) = dim.y;((samples_2)) = textureNumSamples((opaqueDepth_0));};
    return f32(countOneBits(visibleSamples_0(position_11, slope_4, u32(4294967295)))) / f32(samples_2);
}

fn momentDepth_0( relPosition_15 : vec3<f32>) -> f32
{
    return clamp((log(max(length(relPosition_15), 9.99999997475242708e-07f)) - translucency_0.logNear_0) * translucency_0.invLogRange_0, 0.0f, 1.0f) * 2.0f - 1.0f;
}

struct MomentsOut_0
{
    @location(0) zero_0 : f32,
    @location(1) higher_0 : vec4<f32>,
};

struct pixelInput_8
{
    @location(0) normal_10 : vec3<f32>,
    @location(1) uv_15 : vec2<f32>,
    @location(2) color_16 : vec4<f32>,
    @interpolate(flat) @location(3) ids_9 : vec3<u32>,
    @location(4) relPosition_16 : vec3<f32>,
    @location(5) tangent_9 : vec4<f32>,
    @location(6) airInscatter_9 : vec3<f32>,
    @location(7) airTransmittance_10 : vec3<f32>,
    @location(8) positionMC_9 : vec3<f32>,
    @location(9) named0_9 : vec4<f32>,
    @location(10) named1_9 : vec4<f32>,
    @location(11) named2_9 : vec4<f32>,
    @location(12) named3_9 : vec4<f32>,
};

@fragment
fn fsMoments( _S164 : pixelInput_8, @builtin(position) position_12 : vec4<f32>) -> MomentsOut_0
{
    var _S165 : SurfaceVaryings_0 = SurfaceVaryings_0( position_12, _S164.normal_10, _S164.uv_15, _S164.color_16, _S164.ids_9, _S164.relPosition_16, _S164.tangent_9, _S164.airInscatter_9, _S164.airTransmittance_10, _S164.positionMC_9, _S164.named0_9, _S164.named1_9, _S164.named2_9, _S164.named3_9 );
    surfaceLight_0 = true;
    var slope_5 : vec2<f32> = depthSlope_0(position_12);
    var blended_0 : f32 = blendedAlpha_0(_S165);
    var alpha_12 : f32 = blended_0 * uncovered_0(position_12, slope_5);
    var _S166 : bool;
    if((alpha_12 <= 0.0f))
    {
        _S166 = true;
    }
    else
    {
        _S166 = (blended_0 >= 0.99949997663497925f);
    }
    if(_S166)
    {
        discard;
    }
    var absorbance_0 : f32 = - log(1.0f - alpha_12);
    var z_3 : f32 = momentDepth_0(_S164.relPosition_16);
    var z2_0 : f32 = z_3 * z_3;
    var out_2 : MomentsOut_0;
    out_2.zero_0 = absorbance_0;
    out_2.higher_0 = vec4<f32>(z_3, z2_0, z2_0 * z_3, z2_0 * z2_0) * vec4<f32>(absorbance_0);
    return out_2;
}

fn transmittanceBefore_0( b0_0 : f32,  sums_0 : vec4<f32>,  z_4 : f32) -> f32
{
    if((b0_0 < 0.0010005002841353416f))
    {
        return 1.0f;
    }
    var b_2 : vec4<f32> = mix(sums_0 / vec4<f32>(b0_0), vec4<f32>(0.0f, 0.375f, 0.0f, 0.375f), vec4<f32>(translucency_0.bias_0));
    var _S167 : f32 = b_2.x;
    var _S168 : f32 = b_2.y;
    var l21d11_0 : f32 = b_2.z - _S167 * _S168;
    var invD11_0 : f32 = 1.0f / (_S168 - _S167 * _S167);
    var l21_0 : f32 = l21d11_0 * invD11_0;
    var d22_0 : f32 = b_2.w - _S168 * _S168 - l21d11_0 * l21_0;
    var c_3 : vec3<f32> = vec3<f32>(1.0f, z_4, z_4 * z_4);
    var _S169 : f32 = c_3[i32(1)] - _S167;
    c_3[i32(1)] = _S169;
    var _S170 : f32 = c_3[i32(2)] - (_S168 + l21_0 * c_3.y);
    var _S171 : f32 = _S169 * invD11_0;
    c_3[i32(1)] = _S171;
    c_3[i32(2)] = _S170 / d22_0;
    c_3[i32(1)] = _S171 - l21_0 * c_3.z;
    var _S172 : vec2<f32> = b_2.xy;
    c_3[i32(0)] = c_3[i32(0)] - dot(c_3.yz, _S172);
    if(!((abs(c_3.z)) > (9.9999997473787516e-06f * max(abs(c_3.x), abs(c_3.y)))))
    {
        return exp(- b0_0 * 0.25f);
    }
    var p_3 : f32 = c_3.y / c_3.z;
    var r_0 : f32 = sqrt(max(p_3 * p_3 * 0.25f - c_3.x / c_3.z, 0.0f));
    var _S173 : f32 = - p_3 * 0.5f;
    var z1_0 : f32 = _S173 - r_0;
    var z2_1 : f32 = _S173 + r_0;
    var f1_0 : f32;
    if((z1_0 < z_4))
    {
        f1_0 = 1.0f;
    }
    else
    {
        f1_0 = 0.0f;
    }
    var f2_0 : f32;
    if((z2_1 < z_4))
    {
        f2_0 = 1.0f;
    }
    else
    {
        f2_0 = 0.0f;
    }
    var f01_0 : f32 = (f1_0 - 0.25f) / (z1_0 - z_4);
    var f012_0 : f32 = ((f2_0 - f1_0) / (z2_1 - z1_0) - f01_0) / (z2_1 - z_4);
    var k1_0 : f32 = f01_0 - f012_0 * z1_0;
    return clamp(exp(- b0_0 * (0.25f - k1_0 * z_4 + dot(_S172, vec2<f32>(k1_0 - f012_0 * z_4, f012_0)))), 0.0f, 1.0f);
}

struct AccumulatedOut_0
{
    @location(0) lit_4 : vec4<f32>,
    @location(1) unlit_3 : vec4<f32>,
};

struct pixelInput_9
{
    @location(0) normal_11 : vec3<f32>,
    @location(1) uv_16 : vec2<f32>,
    @location(2) color_17 : vec4<f32>,
    @interpolate(flat) @location(3) ids_10 : vec3<u32>,
    @location(4) relPosition_17 : vec3<f32>,
    @location(5) tangent_10 : vec4<f32>,
    @location(6) airInscatter_10 : vec3<f32>,
    @location(7) airTransmittance_11 : vec3<f32>,
    @location(8) positionMC_10 : vec3<f32>,
    @location(9) named0_10 : vec4<f32>,
    @location(10) named1_10 : vec4<f32>,
    @location(11) named2_10 : vec4<f32>,
    @location(12) named3_10 : vec4<f32>,
};

@fragment
fn fsMomentColor( _S174 : pixelInput_9, @builtin(front_facing) frontFacing_6 : bool, @builtin(position) position_13 : vec4<f32>) -> AccumulatedOut_0
{
    var _S175 : SurfaceVaryings_0 = SurfaceVaryings_0( position_13, _S174.normal_11, _S174.uv_16, _S174.color_17, _S174.ids_10, _S174.relPosition_17, _S174.tangent_10, _S174.airInscatter_10, _S174.airTransmittance_11, _S174.positionMC_10, _S174.named0_10, _S174.named1_10, _S174.named2_10, _S174.named3_10 );
    surfaceLight_0 = true;
    var slope_6 : vec2<f32> = depthSlope_0(position_13);
    var s_6 : Surface_0 = shadeSurface_0(_S175, frontFacing_6, true);
    var alpha_13 : f32 = clamp(s_6.alpha_3, 0.0f, 1.0f) * uncovered_0(position_13, slope_6);
    var _S176 : bool;
    if((alpha_13 <= 0.0f))
    {
        _S176 = true;
    }
    else
    {
        _S176 = ((s_6.alpha_3) >= 0.99949997663497925f);
    }
    if(_S176)
    {
        discard;
    }
    var _S177 : vec2<u32> = vec2<u32>(position_13.xy);
    var _S178 : vec4<f32> = (textureLoad(momentsZero, (_S177)));
    var b0_1 : f32 = _S178.x;
    var sums_1 : vec4<f32> = (textureLoad(momentsHigher, (_S177)));
    var w_2 : f32 = transmittanceBefore_0(b0_1, sums_1, momentDepth_0(_S174.relPosition_17)) * alpha_13;
    var _S179 : vec3<f32> = min(s_6.color_8 * vec3<f32>(w_2), vec3<f32>(16384.0f));
    var out_3 : AccumulatedOut_0;
    var _S180 : vec3<f32>;
    if(s_6.unlit_1)
    {
        _S180 = vec3<f32>(0.0f);
    }
    else
    {
        _S180 = _S179;
    }
    out_3.lit_4 = vec4<f32>(_S180, w_2);
    if(s_6.unlit_1)
    {
        _S180 = _S179;
    }
    else
    {
        _S180 = vec3<f32>(0.0f);
    }
    out_3.unlit_3 = vec4<f32>(_S180, 0.0f);
    return out_3;
}

fn cesiumAnchorPosition() -> vec3<f32>
{
    return cesiumAnchor_0;
}

fn cesiumCameraPosition() -> vec3<f32>
{
    return cameraPosition_0();
}

fn cesiumViewProjection() -> mat4x4<f32>
{
    return mat4x4<f32>(view_0.viewProj_0.data_0[i32(0)][i32(0)], view_0.viewProj_0.data_0[i32(1)][i32(0)], view_0.viewProj_0.data_0[i32(2)][i32(0)], view_0.viewProj_0.data_0[i32(3)][i32(0)], view_0.viewProj_0.data_0[i32(0)][i32(1)], view_0.viewProj_0.data_0[i32(1)][i32(1)], view_0.viewProj_0.data_0[i32(2)][i32(1)], view_0.viewProj_0.data_0[i32(3)][i32(1)], view_0.viewProj_0.data_0[i32(0)][i32(2)], view_0.viewProj_0.data_0[i32(1)][i32(2)], view_0.viewProj_0.data_0[i32(2)][i32(2)], view_0.viewProj_0.data_0[i32(3)][i32(2)], view_0.viewProj_0.data_0[i32(0)][i32(3)], view_0.viewProj_0.data_0[i32(1)][i32(3)], view_0.viewProj_0.data_0[i32(2)][i32(3)], view_0.viewProj_0.data_0[i32(3)][i32(3)]);
}

fn cesiumPixelSize() -> vec2<f32>
{
    return view_0.viewport_0.zw;
}

fn readNamed( directory_0 : u32,  hash_0 : u32,  vertexIndex_0 : u32,  feature_1 : u32) -> vec4<f32>
{
    var value_1 : vec4<f32> = vec4<f32>(0.0f);
    if(directory_0 == u32(4294967295))
    {
        return value_1;
    }
    var _S181 : u32 = (bitcast<u32>((vertices_0[directory_0])));
    var i_2 : u32 = u32(0);
    loop
    {
        if((i_2 < _S181))
        {
        }
        else
        {
            break;
        }
        var entry_0 : u32 = directory_0 + u32(1) + i_2 * u32(3);
        if((bitcast<u32>((vertices_0[entry_0]))) == hash_0)
        {
            var components_0 : u32 = (bitcast<u32>((vertices_0[entry_0 + u32(2)])));
            if((components_0 >= u32(2147483648)))
            {
                break;
            }
            var row_0 : u32;
            var size_1 : u32;
            if((components_0 >= u32(1073741824)))
            {
                if(feature_1 == u32(4294967295))
                {
                    break;
                }
                var _S182 : u32 = (components_0 & (u32(255)));
                row_0 = feature_1;
                size_1 = _S182;
            }
            else
            {
                row_0 = vertexIndex_0;
                size_1 = components_0;
            }
            var _S183 : u32 = (bitcast<u32>((vertices_0[entry_0 + u32(1)]))) + row_0 * size_1;
            var c_4 : u32 = u32(0);
            loop
            {
                if((c_4 < size_1))
                {
                }
                else
                {
                    break;
                }
                value_1[c_4] = vertices_0[_S183 + c_4];
                c_4 = c_4 + u32(1);
            }
            break;
        }
        i_2 = i_2 + u32(1);
    }
    return value_1;
}

fn readInstance( draw_0 : u32,  instance_1 : u32,  hash_1 : u32) -> vec4<u32>
{
    var bits_0 : vec4<u32> = vec4<u32>(u32(0));
    var _S184 : u32 = records_0[draw_0].instanceDirectory_0;
    var _S185 : bool;
    if((records_0[draw_0].instanceDirectory_0) == u32(4294967295))
    {
        _S185 = true;
    }
    else
    {
        _S185 = (records_0[draw_0].instanceStreams_0) == u32(4294967295);
    }
    if(_S185)
    {
        return bits_0;
    }
    var _S186 : u32 = (bitcast<u32>((vertices_0[_S184])));
    var i_3 : u32 = u32(0);
    loop
    {
        if((i_3 < _S186))
        {
        }
        else
        {
            break;
        }
        var entry_1 : u32 = _S184 + u32(1) + i_3 * u32(3);
        if((bitcast<u32>((vertices_0[entry_1]))) == hash_1)
        {
            var _S187 : u32 = records_0[draw_0].instanceStreams_0 + instance_1 * records_0[draw_0].instanceStride_0 + (bitcast<u32>((vertices_0[entry_1 + u32(1)])));
            var _S188 : u32 = min((bitcast<u32>((vertices_0[entry_1 + u32(2)]))), u32(4));
            var c_5 : u32 = u32(0);
            loop
            {
                if((c_5 < _S188))
                {
                }
                else
                {
                    break;
                }
                bits_0[c_5] = (bitcast<u32>((vertices_0[_S187 + c_5])));
                c_5 = c_5 + u32(1);
            }
            break;
        }
        i_3 = i_3 + u32(1);
    }
    return bits_0;
}

fn propertyTexel_0( slot_3 : u32,  uv_17 : vec2<f32>) -> vec4<u32>
{
    var width_3 : u32;
    var height_3 : u32;
    var texel_0 : vec4<f32>;
    if(slot_3 == u32(0))
    {
        {var dim = textureDimensions((propertyTexture0_0));((width_3)) = dim.x;((height_3)) = dim.y;};
        var size_2 : vec2<u32> = vec2<u32>(width_3, height_3);
        var _S189 : vec3<i32> = vec3<i32>(vec2<i32>(min(vec2<u32>(fract(uv_17) * vec2<f32>(size_2)), size_2 - vec2<u32>(u32(1)))), i32(0));
        texel_0 = (textureLoad((propertyTexture0_0), ((_S189)).xy, ((_S189)).z));
    }
    else
    {
        {var dim = textureDimensions((propertyTexture1_0));((width_3)) = dim.x;((height_3)) = dim.y;};
        var size_3 : vec2<u32> = vec2<u32>(width_3, height_3);
        var _S190 : vec3<i32> = vec3<i32>(vec2<i32>(min(vec2<u32>(fract(uv_17) * vec2<f32>(size_3)), size_3 - vec2<u32>(u32(1)))), i32(0));
        texel_0 = (textureLoad((propertyTexture1_0), ((_S190)).xy, ((_S190)).z));
    }
    return vec4<u32>(round(texel_0 * vec4<f32>(255.0f)));
}

fn readFragmentProperty( directory_1 : u32,  hash_2 : u32,  uv_18 : vec2<f32>,  feature_2 : u32,  fallback_0 : vec4<f32>) -> vec4<f32>
{
    if(directory_1 == u32(4294967295))
    {
        return fallback_0;
    }
    var _S191 : u32 = (bitcast<u32>((vertices_0[directory_1])));
    var i_4 : u32 = u32(0);
    loop
    {
        if((i_4 < _S191))
        {
        }
        else
        {
            break;
        }
        var entry_2 : u32 = directory_1 + u32(1) + i_4 * u32(3);
        if((bitcast<u32>((vertices_0[entry_2]))) != hash_2)
        {
            i_4 = i_4 + u32(1);
            continue;
        }
        var info_0 : u32 = (bitcast<u32>((vertices_0[entry_2 + u32(2)])));
        if((info_0 < u32(1073741824)))
        {
            return fallback_0;
        }
        var c_6 : u32;
        if((info_0 < u32(2147483648)))
        {
            var value_2 : vec4<f32> = vec4<f32>(0.0f);
            if(feature_2 != u32(4294967295))
            {
                var size_4 : u32 = (info_0 & (u32(255)));
                var _S192 : u32 = (bitcast<u32>((vertices_0[entry_2 + u32(1)]))) + feature_2 * size_4;
                c_6 = u32(0);
                loop
                {
                    if((c_6 < size_4))
                    {
                    }
                    else
                    {
                        break;
                    }
                    value_2[c_6] = vertices_0[_S192 + c_6];
                    c_6 = c_6 + u32(1);
                }
            }
            return value_2;
        }
        var b_3 : u32 = (bitcast<u32>((vertices_0[entry_2 + u32(1)])));
        var _S193 : vec4<u32> = propertyTexel_0((bitcast<u32>((vertices_0[b_3]))), uv_18);
        var _S194 : u32 = min((bitcast<u32>((vertices_0[b_3 + u32(1)]))), u32(4));
        var _S195 : u32 = (bitcast<u32>((vertices_0[b_3 + u32(2)])));
        var kind_0 : u32 = (bitcast<u32>((vertices_0[b_3 + u32(3)])));
        var _S196 : u32 = min((bitcast<u32>((vertices_0[b_3 + u32(4)]))), u32(4));
        var _S197 : bool = (bitcast<u32>((vertices_0[b_3 + u32(5)]))) != u32(0);
        var bytes_0 : array<u32, i32(4)>;
        bytes_0[i32(0)] = u32(0);
        bytes_0[i32(1)] = u32(0);
        bytes_0[i32(2)] = u32(0);
        bytes_0[i32(3)] = u32(0);
        var k_0 : u32 = u32(0);
        loop
        {
            if((k_0 < _S194))
            {
            }
            else
            {
                break;
            }
            bytes_0[k_0] = _S193[(((_S195 >> ((k_0 * u32(8))))) & (u32(3)))];
            k_0 = k_0 + u32(1);
        }
        if((kind_0 <= u32(1)))
        {
            i_4 = u32(1);
        }
        else
        {
            var _S198 : bool;
            if(kind_0 == u32(2))
            {
                _S198 = true;
            }
            else
            {
                _S198 = kind_0 == u32(3);
            }
            if(_S198)
            {
                i_4 = u32(2);
            }
            else
            {
                i_4 = u32(4);
            }
        }
        var value_3 : vec4<f32> = vec4<f32>(0.0f);
        c_6 = u32(0);
        loop
        {
            if((c_6 < _S196))
            {
            }
            else
            {
                break;
            }
            k_0 = u32(0);
            var raw_0 : u32 = u32(0);
            loop
            {
                if((k_0 < i_4))
                {
                }
                else
                {
                    break;
                }
                var at_0 : u32 = c_6 * i_4 + k_0;
                if((at_0 < u32(4)))
                {
                    raw_0 = (raw_0 | ((((bytes_0[at_0]) << ((k_0 * u32(8)))))));
                }
                k_0 = k_0 + u32(1);
            }
            var v_3 : f32;
            switch(kind_0)
            {
            case u32(0):
                {
                    if(_S197)
                    {
                        v_3 = f32(raw_0) / 255.0f;
                    }
                    else
                    {
                        v_3 = f32(raw_0);
                    }
                }
            case u32(1):
                {
                    var v_4 : f32 = f32((i32((raw_0 << (u32(24)))) >> (u32(24))));
                    if(_S197)
                    {
                        v_3 = max(v_4 / 127.0f, -1.0f);
                    }
                    else
                    {
                        v_3 = v_4;
                    }
                }
            case u32(2):
                {
                    if(_S197)
                    {
                        v_3 = f32(raw_0) / 65535.0f;
                    }
                    else
                    {
                        v_3 = f32(raw_0);
                    }
                }
            case u32(3):
                {
                    var v_5 : f32 = f32((i32((raw_0 << (u32(16)))) >> (u32(16))));
                    if(_S197)
                    {
                        v_3 = max(v_5 / 32767.0f, -1.0f);
                    }
                    else
                    {
                        v_3 = v_5;
                    }
                }
            case u32(4):
                {
                    if(_S197)
                    {
                        v_3 = f32(raw_0) / 4.294967296e+09f;
                    }
                    else
                    {
                        v_3 = f32(raw_0);
                    }
                }
            case u32(5):
                {
                    var v_6 : f32 = f32((bitcast<i32>((raw_0))));
                    if(_S197)
                    {
                        v_3 = max(v_6 / 2.147483648e+09f, -1.0f);
                    }
                    else
                    {
                        v_3 = v_6;
                    }
                }
            default :
                {
                    v_3 = (bitcast<f32>((raw_0)));
                }
            }
            value_3[c_6] = v_3 * vertices_0[b_3 + u32(10) + c_6] + vertices_0[b_3 + u32(6) + c_6];
            c_6 = c_6 + u32(1);
        }
        return value_3;
    }
    return fallback_0;
}

struct SurfaceVertex
{
     position : vec4<f32>,
     normal : vec3<f32>,
     uv : vec2<f32>,
     color : vec4<f32>,
     ids : vec3<u32>,
     relPosition : vec3<f32>,
     tangent : vec4<f32>,
     airInscatter : vec3<f32>,
     airTransmittance : vec3<f32>,
     positionMC : vec3<f32>,
     named0 : vec4<f32>,
     named1 : vec4<f32>,
     named2 : vec4<f32>,
     named3 : vec4<f32>,
};

struct CesiumVertex
{
     positionMC : vec3<f32>,
     normalMC : vec3<f32>,
     texCoord0 : vec2<f32>,
     color0 : vec4<f32>,
     featureId0 : u32,
     vertexIndex : u32,
     instanceIndex : u32,
     time : f32,
     draw : u32,
     directory : u32,
     tableFeature : u32,
};

struct CesiumVertexResult
{
     positionMC : vec3<f32>,
     normalMC : vec3<f32>,
     named0 : vec4<f32>,
     named1 : vec4<f32>,
     named2 : vec4<f32>,
     named3 : vec4<f32>,
};

fn read4_0( offset_0 : u32,  index_1 : u32) -> vec4<f32>
{
    var b_4 : u32 = offset_0 + index_1 * u32(4);
    return vec4<f32>(vertices_0[b_4], vertices_0[b_4 + u32(1)], vertices_0[b_4 + u32(2)], vertices_0[b_4 + u32(3)]);
}

fn read3_0( offset_1 : u32,  index_2 : u32) -> vec3<f32>
{
    var b_5 : u32 = offset_1 + index_2 * u32(3);
    return vec3<f32>(vertices_0[b_5], vertices_0[b_5 + u32(1)], vertices_0[b_5 + u32(2)]);
}

fn read2_0( offset_2 : u32,  index_3 : u32) -> vec2<f32>
{
    var b_6 : u32 = offset_2 + index_3 * u32(2);
    return vec2<f32>(vertices_0[b_6], vertices_0[b_6 + u32(1)]);
}

fn column3_0( m_4 : mat4x4<f32>,  c_7 : i32) -> vec3<f32>
{
    return vec3<f32>(m_4[i32(0)][c_7], m_4[i32(1)][c_7], m_4[i32(2)][c_7]);
}

fn airTransmittanceUv_0( r_1 : f32,  mu_1 : f32,  bottom_0 : f32,  top_0 : f32) -> vec2<f32>
{
    var _S199 : f32 = top_0 * top_0;
    var _S200 : f32 = bottom_0 * bottom_0;
    var h_1 : f32 = sqrt(_S199 - _S200);
    var _S201 : f32 = r_1 * r_1;
    var rho_0 : f32 = sqrt(max(0.0f, _S201 - _S200));
    var dMin_0 : f32 = top_0 - r_1;
    return vec2<f32>(0.001953125f + (max(0.0f, - r_1 * mu_1 + sqrt(max(_S201 * (mu_1 * mu_1 - 1.0f) + _S199, 0.0f))) - dMin_0) / (rho_0 + h_1 - dMin_0) * 0.99609375f, 0.0078125f + rho_0 / h_1 * 0.984375f);
}

fn sunAbove_0( r_2 : f32,  mu_2 : f32,  bottom_1 : f32,  soft_0 : f32) -> f32
{
    return clamp(0.5f + (asin(clamp(mu_2, -1.0f, 1.0f)) - asin(- sqrt(max(0.0f, 1.0f - bottom_1 / r_2 * (bottom_1 / r_2))))) / soft_0, 0.0f, 1.0f);
}

fn aerialMarch_0( relPosition_18 : vec3<f32>) -> AerialPerspective_0
{
    var a_1 : AirGroup_std140_0 = air_0.groups_0.data_2[i32(0)];
    var b_7 : AirGroup_std140_0 = air_0.groups_0.data_2[i32(1)];
    var clearAir_0 : AerialPerspective_0;
    clearAir_0.inscatter_0 = vec3<f32>(0.0f);
    clearAir_0.transmittance_0 = vec3<f32>(1.0f);
    var meters_0 : f32 = length(relPosition_18);
    var direction_1 : vec3<f32> = relPosition_18 / vec3<f32>(max(meters_0, 9.99999997475242708e-07f));
    var _S202 : vec3<f32> = vec3<f32>(1000.0f);
    var radii_1 : vec3<f32> = view_0.bodyRadii_0.xyz / _S202;
    var origin_0 : vec3<f32> = cameraPosition_0() / _S202;
    var r_3 : f32 = length(origin_0);
    var mu_3 : f32 = dot(origin_0, direction_1) / r_3;
    var outer_0 : f32 = max(radii_1.x, max(radii_1.y, radii_1.z)) + air_0.groups_0.data_2[i32(0)].topRadius_0 - air_0.groups_0.data_2[i32(0)].bottomRadius_0;
    var start_0 : f32;
    if((r_3 > outer_0))
    {
        var disc_0 : f32 = r_3 * r_3 * (mu_3 * mu_3 - 1.0f) + outer_0 * outer_0;
        if((disc_0 < 0.0f))
        {
            return clearAir_0;
        }
        start_0 = max(- r_3 * mu_3 - sqrt(disc_0), 0.0f);
    }
    else
    {
        start_0 = 0.0f;
    }
    var end_0 : f32 = meters_0 / 1000.0f;
    if((end_0 <= start_0))
    {
        return clearAir_0;
    }
    var sun_0 : vec3<f32> = view_0.sunDirection_0.xyz;
    var nu_0 : f32 = dot(direction_1, sun_0);
    var _S203 : f32 = 1.0f + nu_0 * nu_0;
    var _S204 : f32 = 0.059683103114366531f * _S203;
    var _S205 : f32 = a_1.miePhaseG_0 * a_1.miePhaseG_0;
    var _S206 : f32 = 0.11936620622873306f * (1.0f - _S205);
    var _S207 : f32 = 2.0f + _S205;
    var _S208 : f32 = 1.0f + _S205;
    var _S209 : f32 = 2.0f * a_1.miePhaseG_0;
    var _S210 : f32 = _S206 / _S207 * _S203 / pow(_S208 - _S209 * nu_0, 1.5f);
    var moonShare_0 : f32 = view_0.sunDirection_0.w;
    var moon_0 : vec3<f32> = view_0.moonLight_0.xyz;
    var moonNu_0 : f32 = dot(direction_1, moon_0);
    var _S211 : f32 = 1.0f + moonNu_0 * moonNu_0;
    var _S212 : f32 = 0.059683103114366531f * _S211 * moonShare_0;
    var _S213 : f32 = _S206 / _S207 * _S211 / pow(_S208 - _S209 * moonNu_0, 1.5f) * moonShare_0;
    var _S214 : vec4<f32> = vec4<f32>(0.0f);
    var _S215 : vec4<f32> = vec4<f32>(1.0f);
    var t0_0 : f32 = start_0;
    var i_5 : i32 = i32(1);
    var transmittanceA_0 : vec4<f32> = _S215;
    var radianceA_0 : vec4<f32> = _S214;
    var transmittanceB_0 : vec4<f32> = _S215;
    var radianceB_0 : vec4<f32> = _S214;
    loop
    {
        if((i_5 <= i32(24)))
        {
        }
        else
        {
            break;
        }
        var u_1 : f32 = 1.0f - f32(i_5) / 24.0f;
        var t1_0 : f32 = start_0 + (end_0 - start_0) * (1.0f - u_1 * u_1 * u_1);
        var dt_0 : f32 = t1_0 - t0_0;
        var p_4 : vec3<f32> = origin_0 + direction_1 * vec3<f32>((0.5f * (t0_0 + t1_0)));
        var distance_1 : f32 = length(p_4);
        var _S216 : f32 = max(distance_1 - distance_1 / length(p_4 / radii_1), 0.0010000000474974513f);
        var rp_0 : f32 = a_1.bottomRadius_0 + _S216;
        var _S217 : vec3<f32> = radii_1 * radii_1;
        var muSun_0 : f32 = dot(normalize(p_4 / _S217), sun_0);
        var _S218 : f32 = - _S216;
        var rayleighDensity_0 : f32 = exp(_S218 / a_1.rayleighScaleHeight_0);
        var mieDensity_0 : f32 = exp(_S218 / a_1.mieScaleHeight_0);
        var ozoneDensity_0 : f32;
        if((_S216 < 25.0f))
        {
            ozoneDensity_0 = clamp(_S216 / 15.0f - 0.66666668653488159f, 0.0f, 1.0f);
        }
        else
        {
            ozoneDensity_0 = clamp(_S218 / 15.0f + 2.6666667461395264f, 0.0f, 1.0f);
        }
        var _S219 : f32 = max(0.017500000074505806f, dt_0 / rp_0);
        var uv_19 : vec2<f32> = airTransmittanceUv_0(rp_0, muSun_0, a_1.bottomRadius_0, a_1.topRadius_0);
        var _S220 : vec3<f32> = vec3<f32>(uv_19, 0.0f);
        var _S221 : vec4<f32> = vec4<f32>(sunAbove_0(rp_0, muSun_0, a_1.bottomRadius_0, _S219));
        var sunA_0 : vec4<f32> = (textureSampleLevel((airTransmittance_0), (environmentSampler_0), ((_S220)).xy, i32(((_S220)).z), (0.0f))) * _S221;
        var _S222 : vec3<f32> = vec3<f32>(uv_19, 1.0f);
        var sunB_0 : vec4<f32> = (textureSampleLevel((airTransmittance_0), (environmentSampler_0), ((_S222)).xy, i32(((_S222)).z), (0.0f))) * _S221;
        var _S223 : f32 = 0.015625f + clamp(_S216 / (a_1.topRadius_0 - a_1.bottomRadius_0), 0.0f, 1.0f) * 0.96875f;
        var msUv_0 : vec2<f32> = vec2<f32>(0.015625f + (muSun_0 * 0.5f + 0.5f) * 0.96875f, _S223);
        var _S224 : vec3<f32> = vec3<f32>(msUv_0, 0.0f);
        var msA_0 : vec4<f32> = (textureSampleLevel((airMultipleScattering_0), (environmentSampler_0), ((_S224)).xy, i32(((_S224)).z), (0.0f)));
        var _S225 : vec3<f32> = vec3<f32>(msUv_0, 1.0f);
        var msB_0 : vec4<f32> = (textureSampleLevel((airMultipleScattering_0), (environmentSampler_0), ((_S225)).xy, i32(((_S225)).z), (0.0f)));
        var moonA_0 : vec4<f32>;
        var moonMsA_0 : vec4<f32>;
        var moonB_0 : vec4<f32>;
        var moonMsB_0 : vec4<f32>;
        if((moonShare_0 > 0.0f))
        {
            var muMoon_0 : f32 = dot(normalize(p_4 / _S217), moon_0);
            var moonUv_0 : vec2<f32> = airTransmittanceUv_0(rp_0, muMoon_0, a_1.bottomRadius_0, a_1.topRadius_0);
            var _S226 : vec3<f32> = vec3<f32>(moonUv_0, 0.0f);
            var _S227 : vec4<f32> = vec4<f32>(sunAbove_0(rp_0, muMoon_0, a_1.bottomRadius_0, _S219));
            var _S228 : vec3<f32> = vec3<f32>(moonUv_0, 1.0f);
            var _S229 : vec4<f32> = (textureSampleLevel((airTransmittance_0), (environmentSampler_0), ((_S228)).xy, i32(((_S228)).z), (0.0f))) * _S227;
            var moonMsUv_0 : vec2<f32> = vec2<f32>(0.015625f + (muMoon_0 * 0.5f + 0.5f) * 0.96875f, _S223);
            var _S230 : vec3<f32> = vec3<f32>(moonMsUv_0, 0.0f);
            var _S231 : vec4<f32> = vec4<f32>(moonShare_0);
            var _S232 : vec4<f32> = (textureSampleLevel((airMultipleScattering_0), (environmentSampler_0), ((_S230)).xy, i32(((_S230)).z), (0.0f))) * _S231;
            var _S233 : vec3<f32> = vec3<f32>(moonMsUv_0, 1.0f);
            var _S234 : vec4<f32> = (textureSampleLevel((airMultipleScattering_0), (environmentSampler_0), ((_S233)).xy, i32(((_S233)).z), (0.0f))) * _S231;
            moonA_0 = (textureSampleLevel((airTransmittance_0), (environmentSampler_0), ((_S226)).xy, i32(((_S226)).z), (0.0f))) * _S227;
            moonMsA_0 = _S232;
            moonB_0 = _S229;
            moonMsB_0 = _S234;
        }
        else
        {
            moonA_0 = _S214;
            moonMsA_0 = _S214;
            moonB_0 = _S214;
            moonMsB_0 = _S214;
        }
        var _S235 : vec4<f32> = vec4<f32>(rayleighDensity_0);
        var rayleigh_0 : vec4<f32> = a_1.rayleighScattering_0 * _S235;
        var _S236 : vec4<f32> = vec4<f32>(mieDensity_0);
        var mie_0 : vec4<f32> = a_1.mieScattering_0 * _S236;
        var extinction_0 : vec4<f32> = rayleigh_0 + a_1.mieExtinction_0 * _S236 + a_1.ozoneAbsorption_0 * vec4<f32>(ozoneDensity_0);
        var _S237 : vec4<f32> = vec4<f32>(_S204);
        var _S238 : vec4<f32> = vec4<f32>(_S210);
        var _S239 : vec4<f32> = rayleigh_0 + mie_0;
        var _S240 : vec4<f32> = vec4<f32>(_S212);
        var _S241 : vec4<f32> = vec4<f32>(_S213);
        var _S242 : vec4<f32> = vec4<f32>(dt_0);
        var segment_0 : vec4<f32> = exp((vec4<f32>(0) - extinction_0) * _S242);
        var _S243 : vec4<f32> = vec4<f32>(1.0f);
        var _S244 : vec4<f32> = vec4<f32>(9.99999971718068537e-10f);
        var radianceA_1 : vec4<f32> = radianceA_0 + transmittanceA_0 * ((rayleigh_0 * _S237 + mie_0 * _S238) * sunA_0 + _S239 * msA_0 + (rayleigh_0 * _S240 + mie_0 * _S241) * moonA_0 + _S239 * moonMsA_0) * (_S243 - segment_0) / max(extinction_0, _S244);
        var transmittanceA_1 : vec4<f32> = transmittanceA_0 * segment_0;
        var rayleigh_1 : vec4<f32> = b_7.rayleighScattering_0 * _S235;
        var mie_1 : vec4<f32> = b_7.mieScattering_0 * _S236;
        var extinction_1 : vec4<f32> = rayleigh_1 + b_7.mieExtinction_0 * _S236 + b_7.ozoneAbsorption_0 * vec4<f32>(ozoneDensity_0);
        var _S245 : vec4<f32> = rayleigh_1 + mie_1;
        var segment_1 : vec4<f32> = exp((vec4<f32>(0) - extinction_1) * _S242);
        var radianceB_1 : vec4<f32> = radianceB_0 + transmittanceB_0 * ((rayleigh_1 * _S237 + mie_1 * _S238) * sunB_0 + _S245 * msB_0 + (rayleigh_1 * _S240 + mie_1 * _S241) * moonB_0 + _S245 * moonMsB_0) * (_S243 - segment_1) / max(extinction_1, _S244);
        var transmittanceB_1 : vec4<f32> = transmittanceB_0 * segment_1;
        var _S246 : i32 = i_5 + i32(1);
        t0_0 = t1_0;
        i_5 = _S246;
        transmittanceA_0 = transmittanceA_1;
        radianceA_0 = radianceA_1;
        transmittanceB_0 = transmittanceB_1;
        radianceB_0 = radianceB_1;
    }
    var la_0 : vec4<f32> = radianceA_0 * a_1.solarIrradiance_0;
    var lb_0 : vec4<f32> = radianceB_0 * b_7.solarIrradiance_0;
    var transmittance_2 : vec3<f32> = (vec3<f32>(transmittanceA_0.x) * air_0.weights_0[i32(0)].xyz + vec3<f32>(transmittanceA_0.y) * air_0.weights_0[i32(1)].xyz + vec3<f32>(transmittanceA_0.z) * air_0.weights_0[i32(2)].xyz + vec3<f32>(transmittanceA_0.w) * air_0.weights_0[i32(3)].xyz + vec3<f32>(transmittanceB_0.x) * air_0.weights_0[i32(4)].xyz + vec3<f32>(transmittanceB_0.y) * air_0.weights_0[i32(5)].xyz + vec3<f32>(transmittanceB_0.z) * air_0.weights_0[i32(6)].xyz + vec3<f32>(transmittanceB_0.w) * air_0.weights_0[i32(7)].xyz) / (air_0.weights_0[i32(0)].xyz + air_0.weights_0[i32(1)].xyz + air_0.weights_0[i32(2)].xyz + air_0.weights_0[i32(3)].xyz + air_0.weights_0[i32(4)].xyz + air_0.weights_0[i32(5)].xyz + air_0.weights_0[i32(6)].xyz + air_0.weights_0[i32(7)].xyz);
    var result_1 : AerialPerspective_0;
    result_1.inscatter_0 = (vec3<f32>(la_0.x) * air_0.weights_0[i32(0)].xyz + vec3<f32>(la_0.y) * air_0.weights_0[i32(1)].xyz + vec3<f32>(la_0.z) * air_0.weights_0[i32(2)].xyz + vec3<f32>(la_0.w) * air_0.weights_0[i32(3)].xyz + vec3<f32>(lb_0.x) * air_0.weights_0[i32(4)].xyz + vec3<f32>(lb_0.y) * air_0.weights_0[i32(5)].xyz + vec3<f32>(lb_0.z) * air_0.weights_0[i32(6)].xyz + vec3<f32>(lb_0.w) * air_0.weights_0[i32(7)].xyz) * vec3<f32>(view_0.exposure_0);
    result_1.transmittance_0 = transmittance_2;
    return result_1;
}

fn vertexOut_0( vertexIndex_1 : u32,  item_0 : u32,  withAir_0 : bool) -> SurfaceVertex
{
    var p_5 : DrawItem_std430_0 = items_0[item_0];
    var _S247 : u32 = p_5.record_0;
    var _S248 : mat4x4<f32> = mat4x4<f32>(p_5.relModel_0.data_3[i32(0)][i32(0)], p_5.relModel_0.data_3[i32(1)][i32(0)], p_5.relModel_0.data_3[i32(2)][i32(0)], p_5.relModel_0.data_3[i32(3)][i32(0)], p_5.relModel_0.data_3[i32(0)][i32(1)], p_5.relModel_0.data_3[i32(1)][i32(1)], p_5.relModel_0.data_3[i32(2)][i32(1)], p_5.relModel_0.data_3[i32(3)][i32(1)], p_5.relModel_0.data_3[i32(0)][i32(2)], p_5.relModel_0.data_3[i32(1)][i32(2)], p_5.relModel_0.data_3[i32(2)][i32(2)], p_5.relModel_0.data_3[i32(3)][i32(2)], p_5.relModel_0.data_3[i32(0)][i32(3)], p_5.relModel_0.data_3[i32(1)][i32(3)], p_5.relModel_0.data_3[i32(2)][i32(3)], p_5.relModel_0.data_3[i32(3)][i32(3)]);
    var out_4 : SurfaceVertex;
    out_4.uv = vec2<f32>(0.0f);
    var _S249 : u32 = records_0[_S247].flags_0;
    var points_0 : bool = (((records_0[_S247].flags_0) & (u32(64)))) != u32(0);
    var _S250 : vec4<f32> = vec4<f32>(0.0f);
    var anchor_0 : vec4<f32>;
    var instance_2 : u32;
    var position_14 : vec3<f32>;
    if(points_0)
    {
        var _S251 : u32 = vertexIndex_1 % u32(6);
        var instance_3 : u32 = vertexIndex_1 / u32(6);
        var _S252 : vec4<f32> = read4_0(records_0[_S247].positionOffset_0, instance_3);
        var _S253 : vec3<f32> = vec3<f32>(POINT_OFFSET_0[POINT_CORNER_0[_S251]], 0.0f);
        out_4.uv = POINT_UV_0[POINT_CORNER_0[_S251]];
        anchor_0 = _S252;
        instance_2 = instance_3;
        position_14 = _S253;
    }
    else
    {
        var _S254 : vec3<f32> = read3_0(records_0[_S247].positionOffset_0, vertexIndex_1);
        anchor_0 = _S250;
        instance_2 = p_5.instance_0;
        position_14 = _S254;
    }
    var _S255 : vec4<f32> = (((vec4<f32>(anchor_0.xyz, 1.0f)) * (_S248)));
    var _S256 : vec3<f32> = _S255.xyz;
    cesiumAnchor_0 = _S256;
    const _S257 : vec3<f32> = vec3<f32>(0.0f, 0.0f, 1.0f);
    var _S258 : u32 = records_0[_S247].normalOffset_0;
    var normal_12 : vec3<f32>;
    if((records_0[_S247].normalOffset_0) != u32(4294967295))
    {
        normal_12 = read3_0(_S258, vertexIndex_1);
    }
    else
    {
        normal_12 = _S257;
    }
    var _S259 : bool;
    if(!points_0)
    {
        _S259 = (records_0[_S247].uvOffset_0) != u32(4294967295);
    }
    else
    {
        _S259 = false;
    }
    if(_S259)
    {
        out_4.uv = read2_0(records_0[_S247].uvOffset_0, vertexIndex_1);
    }
    var _S260 : vec4<f32> = vec4<f32>(1.0f);
    var _S261 : u32 = records_0[_S247].colorOffset_0;
    var vertexColor_0 : vec4<f32>;
    if((records_0[_S247].colorOffset_0) != u32(4294967295))
    {
        vertexColor_0 = read4_0(_S261, vertexIndex_1);
    }
    else
    {
        vertexColor_0 = _S260;
    }
    out_4.color = unpack4x8unorm(p_5.tint_0) * vertexColor_0;
    out_4.tangent = _S250;
    var _S262 : u32 = records_0[_S247].tangentOffset_0;
    if((records_0[_S247].tangentOffset_0) != u32(4294967295))
    {
        var t_3 : vec4<f32> = read4_0(_S262, vertexIndex_1);
        out_4.tangent = vec4<f32>(normalize((((vec4<f32>(t_3.xyz, 0.0f)) * (_S248))).xyz), t_3.w);
    }
    var _S263 : u32 = records_0[_S247].featureIdOffset_0;
    var _S264 : bool = (records_0[_S247].featureIdOffset_0) != u32(4294967295);
    var localFeature_0 : u32;
    if(_S264)
    {
        localFeature_0 = (bitcast<u32>((vertices_0[_S263 + vertexIndex_1])));
    }
    else
    {
        localFeature_0 = u32(4294967295);
    }
    var tableFeature_0 : u32;
    if(_S263 == u32(4294967295))
    {
        tableFeature_0 = u32(0);
    }
    else
    {
        tableFeature_0 = localFeature_0;
    }
    var _S265 : bool = (p_5.feature_0) != u32(0);
    if(_S265)
    {
        tableFeature_0 = p_5.feature_0 - records_0[_S247].featureId_0;
    }
    if(points_0)
    {
        localFeature_0 = instance_2;
        tableFeature_0 = instance_2;
    }
    var v_7 : CesiumVertex;
    v_7.positionMC = position_14;
    v_7.normalMC = normal_12;
    v_7.texCoord0 = out_4.uv;
    v_7.color0 = vertexColor_0;
    v_7.featureId0 = localFeature_0;
    v_7.vertexIndex = vertexIndex_1;
    v_7.instanceIndex = instance_2;
    v_7.time = view_0.time_0.x;
    v_7.draw = p_5.record_0;
    v_7.directory = records_0[_S247].attributes_0;
    v_7.tableFeature = tableFeature_0;
    var stage_0 : CesiumVertexResult = (cesiumVertexStage((v_7)));
    out_4.ids[i32(2)] = instance_2;
    out_4.named0 = stage_0.named0;
    out_4.named1 = stage_0.named1;
    out_4.named2 = stage_0.named2;
    out_4.named3 = stage_0.named3;
    out_4.positionMC = stage_0.positionMC;
    var world_0 : vec4<f32> = (((vec4<f32>(stage_0.positionMC, 1.0f)) * (_S248)));
    out_4.relPosition = world_0.xyz;
    out_4.position = (((world_0) * (mat4x4<f32>(view_0.viewProj_0.data_0[i32(0)][i32(0)], view_0.viewProj_0.data_0[i32(1)][i32(0)], view_0.viewProj_0.data_0[i32(2)][i32(0)], view_0.viewProj_0.data_0[i32(3)][i32(0)], view_0.viewProj_0.data_0[i32(0)][i32(1)], view_0.viewProj_0.data_0[i32(1)][i32(1)], view_0.viewProj_0.data_0[i32(2)][i32(1)], view_0.viewProj_0.data_0[i32(3)][i32(1)], view_0.viewProj_0.data_0[i32(0)][i32(2)], view_0.viewProj_0.data_0[i32(1)][i32(2)], view_0.viewProj_0.data_0[i32(2)][i32(2)], view_0.viewProj_0.data_0[i32(3)][i32(2)], view_0.viewProj_0.data_0[i32(0)][i32(3)], view_0.viewProj_0.data_0[i32(1)][i32(3)], view_0.viewProj_0.data_0[i32(2)][i32(3)], view_0.viewProj_0.data_0[i32(3)][i32(3)]))));
    var billboard_0 : bool = ((_S249 & (u32(16)))) != u32(0);
    var world_1 : vec4<f32>;
    if(billboard_0)
    {
        out_4.relPosition = _S256;
        var _S266 : vec4<f32> = (((_S255) * (mat4x4<f32>(view_0.viewProj_0.data_0[i32(0)][i32(0)], view_0.viewProj_0.data_0[i32(1)][i32(0)], view_0.viewProj_0.data_0[i32(2)][i32(0)], view_0.viewProj_0.data_0[i32(3)][i32(0)], view_0.viewProj_0.data_0[i32(0)][i32(1)], view_0.viewProj_0.data_0[i32(1)][i32(1)], view_0.viewProj_0.data_0[i32(2)][i32(1)], view_0.viewProj_0.data_0[i32(3)][i32(1)], view_0.viewProj_0.data_0[i32(0)][i32(2)], view_0.viewProj_0.data_0[i32(1)][i32(2)], view_0.viewProj_0.data_0[i32(2)][i32(2)], view_0.viewProj_0.data_0[i32(3)][i32(2)], view_0.viewProj_0.data_0[i32(0)][i32(3)], view_0.viewProj_0.data_0[i32(1)][i32(3)], view_0.viewProj_0.data_0[i32(2)][i32(3)], view_0.viewProj_0.data_0[i32(3)][i32(3)]))));
        out_4.position = vec4<f32>(_S266.xy + stage_0.positionMC.xy * vec2<f32>(records_0[_S247].billboardSize_0) * vec2<f32>(length(column3_0(_S248, i32(0)))) * vec2<f32>(2.0f) * view_0.viewport_0.zw * vec2<f32>(_S266.w), _S266.zw);
        if(((length(_S256)) < (records_0[_S247].billboardDepthTest_0)))
        {
            out_4.position[i32(2)] = out_4.position.w;
        }
        if(points_0)
        {
            _S259 = !((abs(anchor_0.x)) < 9.99999993381581251e+36f);
        }
        else
        {
            _S259 = false;
        }
        if(_S259)
        {
            out_4.position = vec4<f32>(0.0f, 0.0f, -1.0f, 1.0f);
        }
        world_1 = _S255;
    }
    else
    {
        world_1 = world_0;
    }
    out_4.airInscatter = vec3<f32>(0.0f);
    out_4.airTransmittance = vec3<f32>(1.0f);
    var unlitDraw_0 : bool = ((_S249 & (u32(2)))) != u32(0);
    if(withAir_0)
    {
        _S259 = !unlitDraw_0;
    }
    else
    {
        _S259 = false;
    }
    if(_S259)
    {
        _S259 = ((view_0.sunLight_0.w) > 0.5f);
    }
    else
    {
        _S259 = false;
    }
    if(_S259)
    {
        _S259 = ((view_0.bodyRadii_0.w) > 0.0f);
    }
    else
    {
        _S259 = false;
    }
    if(_S259)
    {
        var a_2 : AerialPerspective_0 = aerialMarch_0(world_1.xyz);
        out_4.airInscatter = a_2.inscatter_0;
        out_4.airTransmittance = a_2.transmittance_0;
    }
    if(((_S249 & (u32(8)))) != u32(0))
    {
        out_4.position[i32(2)] = out_4.position[i32(2)] * 5.42101086242752217e-20f;
    }
    var c0_0 : vec3<f32> = column3_0(_S248, i32(0));
    var c1_0 : vec3<f32> = column3_0(_S248, i32(1));
    var c2_0 : vec3<f32> = column3_0(_S248, i32(2));
    var _S267 : vec3<f32> = cross(c1_0, c2_0);
    out_4.normal = normalize(_S267 * vec3<f32>(stage_0.normalMC.x) + cross(c2_0, c0_0) * vec3<f32>(stage_0.normalMC.y) + cross(c0_0, c1_0) * vec3<f32>(stage_0.normalMC.z)) * vec3<f32>(f32((i32(sign((dot(c0_0, _S267)))))));
    if(billboard_0)
    {
        out_4.normal = (vec3<f32>(0) - normalize(world_1.xyz));
    }
    out_4.ids[i32(0)] = p_5.record_0;
    var _S268 : u32 = records_0[_S247].featureId_0;
    out_4.ids[i32(1)] = records_0[_S247].featureId_0;
    if(points_0)
    {
        out_4.ids[i32(1)] = _S268 + instance_2;
    }
    else
    {
        if(_S265)
        {
            out_4.ids[i32(1)] = p_5.feature_0;
        }
        else
        {
            if(_S264)
            {
                if(localFeature_0 == u32(4294967295))
                {
                    instance_2 = u32(0);
                }
                else
                {
                    instance_2 = _S268 + localFeature_0;
                }
                out_4.ids[i32(1)] = instance_2;
            }
        }
    }
    return out_4;
}

fn surfaceVertex( vertexIndex_2 : u32,  item_1 : u32) -> SurfaceVertex
{
    var _S269 : SurfaceVertex = vertexOut_0(vertexIndex_2, item_1, true);
    return _S269;
}

fn surfacePointVertex( vertexIndex_3 : u32,  item_2 : u32) -> SurfaceVertex
{
    var _S270 : SurfaceVertex = vertexOut_0((bitcast<u32>((vertices_0[records_0[items_0[item_2].record_0].uvOffset_0 + vertexIndex_3 / u32(6)]))) * u32(6) + vertexIndex_3 % u32(6), item_2, true);
    return _S270;
}

fn surfaceDepthVertex( vertexIndex_4 : u32,  item_3 : u32) -> SurfaceVertex
{
    var _S271 : SurfaceVertex = vertexOut_0(vertexIndex_4, item_3, false);
    return _S271;
}

