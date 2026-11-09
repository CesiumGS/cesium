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
    @align(8) terrainClip_0 : u32,
    @align(4) instanceFirst_0 : u32,
    @align(16) instanceCount_0 : u32,
    @align(4) instanceStreams_0 : u32,
    @align(8) instanceStride_0 : u32,
    @align(4) lightsSlice_0 : u32,
    @align(16) attributes_0 : u32,
    @align(4) instanceDirectory_0 : u32,
    @align(8) billboardSize_0 : f32,
    @align(4) billboardDepthTest_0 : f32,
    @align(16) placement_0 : u32,
    @align(4) skirtStart_0 : u32,
    @align(8) casterMask_0 : u32,
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
@binding(4) @group(1) var<storage, read> clipBoxes_0 : array<vec4<f32>>;

@binding(5) @group(1) var imagery_0 : texture_2d_array<f32>;

@binding(6) @group(1) var imagerySampler_0 : sampler;

struct _Array_std140_matrixx3Cfloatx2C4x2C4x3E4_0
{
    @align(16) data_2 : array<_MatrixStorage_float4x4_ColMajorstd140_0, i32(4)>,
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
    @align(16) data_3 : array<AirGroup_std140_0, i32(2)>,
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
    @align(16) data_4 : array<vec4<f32>, i32(4)>,
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

@binding(7) @group(1) var<storage, read> placements_0 : array<vec4<f32>>;

const TERM_POWERS_0 : array<u32, i32(20)> = array<u32, i32(20)>( u32(0), u32(1), u32(4), u32(16), u32(2), u32(5), u32(17), u32(8), u32(20), u32(32), u32(3), u32(6), u32(18), u32(9), u32(21), u32(33), u32(12), u32(24), u32(36), u32(48) );
const POINT_UV_0 : array<vec2<f32>, i32(4)> = array<vec2<f32>, i32(4)>( vec2<f32>(0.0f, 1.0f), vec2<f32>(1.0f, 1.0f), vec2<f32>(1.0f, 0.0f), vec2<f32>(0.0f, 0.0f) );
const POINT_OFFSET_0 : array<vec2<f32>, i32(4)> = array<vec2<f32>, i32(4)>( vec2<f32>(-0.5f, -0.5f), vec2<f32>(0.5f, -0.5f), vec2<f32>(0.5f, 0.5f), vec2<f32>(-0.5f, 0.5f) );
const POINT_CORNER_0 : array<u32, i32(6)> = array<u32, i32(6)>( u32(0), u32(1), u32(2), u32(0), u32(2), u32(3) );
const SAMPLE_OFFSETS_0 : array<vec2<f32>, i32(4)> = array<vec2<f32>, i32(4)>( vec2<f32>(-0.125f, -0.375f), vec2<f32>(0.375f, -0.125f), vec2<f32>(-0.375f, 0.125f), vec2<f32>(0.125f, 0.375f) );
@id(0) override cutOutInDepth_0 : bool = false;

fn firstbitlow_0( value_0 : u32) -> u32
{
    var _S1 : u32 = firstTrailingBit(value_0);
    return _S1;
}

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
    f_0.instanceIndex = ((in_0.ids_0.z) & (u32(2147483647)));
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

var<private> terrainSeen_0 : bool;

fn SplitPosition_difference_0( this_1 : SplitPosition_0,  b_0 : SplitPosition_0) -> vec3<f32>
{
    return vec3<f32>(vec3<i32>(this_1.hi_0) - vec3<i32>(b_0.hi_0)) + (this_1.lo_0 - b_0.lo_0);
}

fn segmentsCross_0( a_0 : vec2<f32>,  b_1 : vec2<f32>,  q_0 : vec2<f32>,  s_0 : vec2<f32>) -> bool
{
    var e_0 : vec2<f32> = b_1 - a_0;
    var t_0 : vec2<f32> = s_0 - q_0;
    var _S7 : f32 = e_0.x;
    var _S8 : f32 = q_0.y;
    var _S9 : f32 = a_0.y;
    var _S10 : f32 = e_0.y;
    var _S11 : f32 = q_0.x;
    var _S12 : f32 = a_0.x;
    var _S13 : f32 = t_0.x;
    var _S14 : f32 = t_0.y;
    var aSide_0 : bool = ((_S13 * (_S9 - _S8) - _S14 * (_S12 - _S11)) > 0.0f);
    var bSide_0 : bool = ((_S13 * (b_1.y - _S8) - _S14 * (b_1.x - _S11)) > 0.0f);
    var _S15 : bool;
    if(((_S7 * (_S8 - _S9) - _S10 * (_S11 - _S12)) > 0.0f) != ((_S7 * (s_0.y - _S9) - _S10 * (s_0.x - _S12)) > 0.0f))
    {
        _S15 = aSide_0 != bSide_0;
    }
    else
    {
        _S15 = false;
    }
    return _S15;
}

fn terrainOpacity_0( mask_0 : u32,  p_0 : vec3<f32>,  which_0 : u32) -> f32
{
    var _S16 : SplitPosition_0 = SplitPosition_x24init_0(view_0.cameraHi_0, view_0.cameraLo_0);
    var opacity_0 : f32 = 1.0f;
    var n_0 : u32 = u32(0);
    var _S17 : u32 = mask_0;
    var budget_0 : u32 = u32(128);
    loop
    {
        if((n_0 < u32(32)))
        {
        }
        else
        {
            break;
        }
        if(_S17 == u32(0))
        {
            break;
        }
        var _S18 : u32 = (_S17 & ((_S17 - u32(1))));
        var entry_0 : vec4<u32> = (bitcast<vec4<u32>>((clipBoxes_0[firstbitlow_0(_S17)])));
        var _S19 : f32 = (bitcast<f32>((entry_0.y)));
        var alpha_1 : f32;
        if(which_0 == u32(2))
        {
            if((entry_0.w) != u32(0))
            {
                n_0 = n_0 + u32(1);
                _S17 = _S18;
                continue;
            }
            alpha_1 = 0.0f;
        }
        else
        {
            alpha_1 = _S19;
        }
        var _S20 : bool;
        if((alpha_1 >= opacity_0))
        {
            _S20 = true;
        }
        else
        {
            if(which_0 == u32(1))
            {
                _S20 = (alpha_1 > 0.0f);
            }
            else
            {
                _S20 = false;
            }
        }
        if(_S20)
        {
            n_0 = n_0 + u32(1);
            _S17 = _S18;
            continue;
        }
        if((entry_0.z) != u32(0))
        {
            opacity_0 = alpha_1;
            n_0 = n_0 + u32(1);
            _S17 = _S18;
            continue;
        }
        var o_0 : u32 = entry_0.x;
        var hi_2 : vec4<f32> = clipBoxes_0[o_0];
        var lo_2 : vec4<f32> = clipBoxes_0[o_0 + u32(1)];
        var d_0 : vec3<f32> = p_0 - SplitPosition_difference_0(SplitPosition_x24init_0(hi_2.xyz, lo_2.xyz), _S16);
        var _S21 : f32 = dot(clipBoxes_0[o_0 + u32(2)].xyz, d_0);
        var _S22 : f32 = dot(clipBoxes_0[o_0 + u32(3)].xyz, d_0);
        var _S23 : f32 = hi_2.w;
        var denominator_0 : f32 = _S23 + dot(clipBoxes_0[o_0 + u32(4)].xyz, d_0);
        if((denominator_0 <= 0.0f))
        {
            n_0 = n_0 + u32(1);
            _S17 = _S18;
            continue;
        }
        var q_1 : vec2<f32> = vec2<f32>(_S21, _S22) * vec2<f32>((_S23 / denominator_0));
        var box_0 : vec4<f32> = clipBoxes_0[o_0 + u32(5)];
        var _S24 : f32 = q_1.x;
        var _S25 : bool;
        if((_S24 < (box_0.x)))
        {
            _S25 = true;
        }
        else
        {
            _S25 = ((q_1.y) < (box_0.y));
        }
        var _S26 : bool;
        if(_S25)
        {
            _S26 = true;
        }
        else
        {
            _S26 = (_S24 > (box_0.z));
        }
        var _S27 : bool;
        if(_S26)
        {
            _S27 = true;
        }
        else
        {
            _S27 = ((q_1.y) > (box_0.w));
        }
        if(_S27)
        {
            n_0 = n_0 + u32(1);
            _S17 = _S18;
            continue;
        }
        var sizes_0 : u32 = (bitcast<u32>((lo_2.w)));
        var size_0 : vec2<u32> = clamp(vec2<u32>((sizes_0 & (u32(65535))), (sizes_0 >> (u32(16)))), vec2<u32>(u32(1)), vec2<u32>(u32(128)));
        var grid_0 : u32 = o_0 + u32(6);
        var _S28 : u32 = size_0.x;
        var _S29 : u32 = grid_0 + _S28 * size_0.y;
        var _S30 : vec2<f32> = box_0.xy;
        var _S31 : vec2<u32> = min(vec2<u32>(max((q_1 - _S30) / max((box_0.zw - _S30) / vec2<f32>(size_0), vec2<f32>(9.99999997475242708e-07f)), vec2<f32>(0.0f))), size_0 - vec2<u32>(u32(1)));
        var c_0 : vec4<f32> = clipBoxes_0[grid_0 + _S31.y * _S28 + _S31.x];
        var _S32 : u32 = (bitcast<u32>((c_0.x)));
        var word_1 : u32 = (bitcast<u32>((c_0.y)));
        var _S33 : u32 = min((word_1 & (u32(2147483647))), min(u32(32), budget_0));
        var budget_1 : u32 = budget_0 - _S33;
        var inside_0 : bool = ((word_1 >> (u32(31)))) != u32(0);
        var j_0 : u32 = u32(0);
        loop
        {
            if((j_0 < u32(32)))
            {
            }
            else
            {
                break;
            }
            if((j_0 >= _S33))
            {
                break;
            }
            var edge_0 : vec4<f32> = clipBoxes_0[_S29 + _S32 + j_0];
            if(segmentsCross_0(edge_0.xy, edge_0.zw, q_1, c_0.zw))
            {
                inside_0 = !inside_0;
            }
            j_0 = j_0 + u32(1);
        }
        var opacity_1 : f32;
        if(inside_0)
        {
            if((alpha_1 <= 0.0f))
            {
                return 0.0f;
            }
            opacity_1 = alpha_1;
        }
        else
        {
            opacity_1 = opacity_0;
        }
        opacity_0 = opacity_1;
        budget_0 = budget_1;
        n_0 = n_0 + u32(1);
        _S17 = _S18;
    }
    return opacity_0;
}

fn terrainAlpha_0( _S34 : u32,  _S35 : SurfaceVaryings_0) -> f32
{
    var _S36 : u32 = records_0[_S34].terrainClip_0;
    if((records_0[_S34].terrainClip_0) == u32(0))
    {
        return 1.0f;
    }
    var _S37 : u32;
    if(terrainSeen_0)
    {
        _S37 = u32(0);
    }
    else
    {
        _S37 = u32(2);
    }
    var opacity_2 : f32 = terrainOpacity_0(_S36, _S35.relPosition_0, _S37);
    var _S38 : bool;
    if((opacity_2 < 0.99900001287460327f))
    {
        _S38 = (((_S35.ids_0.z) & (u32(2147483648)))) != u32(0);
    }
    else
    {
        _S38 = false;
    }
    if(_S38)
    {
        return 0.0f;
    }
    return opacity_2;
}

fn materialAlpha_0( in_1 : SurfaceVaryings_0) -> f32
{
    var _S39 : u32 = in_1.ids_0.x;
    var _S40 : Material_std430_0 = materials_0[records_0[_S39].materialIndex_0];
    var _S41 : vec4<f32> = materialTexture_0(&(_S40), u32(0), in_1.uv_1);
    var color_2 : vec4<f32> = _S40.baseColor_0 * records_0[_S39].color_0 * in_1.color_1;
    var _S42 : bool = materialHasTexture_0(&(_S40), u32(0));
    var color_3 : vec4<f32>;
    if(_S42)
    {
        color_3 = color_2 * _S41;
    }
    else
    {
        color_3 = color_2;
    }
    var geometric_1 : vec3<f32> = normalize(in_1.normal_1);
    var custom_0 : MaterialOutput;
    var _S43 : vec3<f32> = color_3.xyz;
    var _S44 : f32 = color_3.w;
    var _S45 : f32 = _S40.metallic_0;
    var _S46 : f32 = _S40.roughness_0;
    var _S47 : vec3<f32> = _S40.emissive_0;
    var _S48 : bool;
    if((((_S40.flags_1) & (u32(1)))) != u32(0))
    {
        _S48 = true;
    }
    else
    {
        _S48 = (((records_0[_S39].flags_0) & (u32(2)))) != u32(0);
    }
    custom_0 = materialOutput_0(_S43, _S44, _S45, _S46, geometric_1, 1.0f, _S47, _S48);
    var _S49 : CesiumFragment = fragmentOf_0(in_1, geometric_1);
    cesiumFragmentStage((_S49), &((custom_0)));
    return custom_0.alpha * terrainAlpha_0(_S39, in_1);
}

fn insideClipBoxes_0( packed_0 : u32,  p_1 : vec3<f32>) -> bool
{
    var _S50 : u32 = (packed_0 & (u32(268435455)));
    var _S51 : u32 = (packed_0 >> (u32(28)));
    var i_0 : u32 = u32(0);
    loop
    {
        if((i_0 < u32(8)))
        {
        }
        else
        {
            break;
        }
        if((i_0 >= _S51))
        {
            break;
        }
        var b_2 : u32 = (_S50 * u32(8) + i_0) * u32(5);
        var d_1 : vec3<f32> = p_1 - SplitPosition_difference_0(SplitPosition_x24init_0(clipBoxes_0[b_2].xyz, clipBoxes_0[b_2 + u32(1)].xyz), SplitPosition_x24init_0(view_0.cameraHi_0, view_0.cameraLo_0));
        var u_0 : vec3<f32> = abs(vec3<f32>(dot(clipBoxes_0[b_2 + u32(2)].xyz, d_1), dot(clipBoxes_0[b_2 + u32(3)].xyz, d_1), dot(clipBoxes_0[b_2 + u32(4)].xyz, d_1)));
        if(((max(u_0.x, max(u_0.y, u_0.z))) <= 1.0f))
        {
            return true;
        }
        i_0 = i_0 + u32(1);
    }
    return false;
}

fn placeholderOut_0( _S52 : u32,  _S53 : vec3<f32>) -> bool
{
    var _S54 : bool;
    if((((records_0[_S52].placeholderMask_0) & ((view_0.viewBit_0)))) != u32(0))
    {
        _S54 = !insideClipBoxes_0(records_0[_S52].clipBlock_0, _S53);
    }
    else
    {
        _S54 = false;
    }
    return _S54;
}

fn clippedOut_0( _S55 : u32,  _S56 : vec3<f32>) -> bool
{
    if(placeholderOut_0(_S55, _S56))
    {
        return true;
    }
    var _S57 : u32 = records_0[_S55].terrainClip_0;
    var _S58 : bool;
    if((records_0[_S55].terrainClip_0) != u32(0))
    {
        var _S59 : u32;
        if(terrainSeen_0)
        {
            _S59 = u32(1);
        }
        else
        {
            _S59 = u32(2);
        }
        _S58 = ((terrainOpacity_0(_S57, _S56, _S59)) <= 0.0f);
    }
    else
    {
        _S58 = false;
    }
    return _S58;
}

fn cutOut_0( in_2 : SurfaceVaryings_0)
{
    var _S60 : u32 = in_2.ids_0.x;
    var material_0 : Material_std430_0 = materials_0[records_0[_S60].materialIndex_0];
    var alpha_2 : f32 = materialAlpha_0(in_2);
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
        if((alpha_2 < cutoff_0))
        {
            discard;
        }
    }
    if(clippedOut_0(_S60, in_2.relPosition_0))
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
fn shadowFs( _S61 : pixelInput_0, @builtin(position) position_1 : vec4<f32>)
{
    var _S62 : SurfaceVaryings_0 = SurfaceVaryings_0( position_1, _S61.normal_2, _S61.uv_2, _S61.color_4, _S61.ids_1, _S61.relPosition_1, _S61.tangent_1, _S61.airInscatter_1, _S61.airTransmittance_2, _S61.positionMC_1, _S61.named0_1, _S61.named1_1, _S61.named2_1, _S61.named3_1 );
    terrainSeen_0 = true;
    surfaceLight_0 = true;
    cutOut_0(_S62);
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
fn heightFs( _S63 : pixelInput_1, @builtin(position) position_2 : vec4<f32>)
{
    var _S64 : SurfaceVaryings_0 = SurfaceVaryings_0( position_2, _S63.normal_3, _S63.uv_3, _S63.color_5, _S63.ids_2, _S63.relPosition_2, _S63.tangent_2, _S63.airInscatter_2, _S63.airTransmittance_3, _S63.positionMC_2, _S63.named0_2, _S63.named1_2, _S63.named2_2, _S63.named3_2 );
    terrainSeen_0 = true;
    surfaceLight_0 = true;
    terrainSeen_0 = false;
    cutOut_0(_S64);
    return;
}

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
fn shadowPlaceholderFs( _S65 : pixelInput_2, @builtin(position) position_3 : vec4<f32>)
{
    terrainSeen_0 = true;
    surfaceLight_0 = true;
    if(clippedOut_0(_S65.ids_3.x, _S65.relPosition_3))
    {
        discard;
    }
    return;
}

struct pixelOutput_0
{
    @location(0) output_0 : vec4<f32>,
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
fn prepassFs( _S66 : pixelInput_3, @builtin(front_facing) frontFacing_0 : bool, @builtin(position) position_4 : vec4<f32>) -> pixelOutput_0
{
    var _S67 : SurfaceVaryings_0 = SurfaceVaryings_0( position_4, _S66.normal_5, _S66.uv_5, _S66.color_7, _S66.ids_4, _S66.relPosition_4, _S66.tangent_4, _S66.airInscatter_4, _S66.airTransmittance_5, _S66.positionMC_4, _S66.named0_4, _S66.named1_4, _S66.named2_4, _S66.named3_4 );
    terrainSeen_0 = true;
    surfaceLight_0 = true;
    cutOut_0(_S67);
    var n_1 : vec3<f32> = normalize(_S66.normal_5);
    var n_2 : vec3<f32>;
    if(!frontFacing_0)
    {
        n_2 = (vec3<f32>(0) - n_1);
    }
    else
    {
        n_2 = n_1;
    }
    var _S68 : pixelOutput_0 = pixelOutput_0( vec4<f32>(n_2, 1.0f) );
    return _S68;
}

struct pixelOutput_1
{
    @location(0) output_1 : vec4<f32>,
};

struct pixelInput_4
{
    @location(0) normal_6 : vec3<f32>,
    @location(1) uv_6 : vec2<f32>,
    @location(2) color_8 : vec4<f32>,
    @interpolate(flat) @location(3) ids_5 : vec3<u32>,
    @location(4) relPosition_5 : vec3<f32>,
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
fn depthCoverageFs( _S69 : pixelInput_4, @builtin(position) position_5 : vec4<f32>) -> pixelOutput_1
{
    var _S70 : SurfaceVaryings_0 = SurfaceVaryings_0( position_5, _S69.normal_6, _S69.uv_6, _S69.color_8, _S69.ids_5, _S69.relPosition_5, _S69.tangent_5, _S69.airInscatter_5, _S69.airTransmittance_6, _S69.positionMC_5, _S69.named0_5, _S69.named1_5, _S69.named2_5, _S69.named3_5 );
    terrainSeen_0 = true;
    surfaceLight_0 = true;
    var _S71 : u32 = _S69.ids_5.x;
    var material_1 : Material_std430_0 = materials_0[records_0[_S71].materialIndex_0];
    var alpha_3 : f32 = materialAlpha_0(_S70);
    var _S72 : f32 = max((fwidth((alpha_3))), 9.9999997473787516e-05f);
    if(clippedOut_0(_S71, _S69.relPosition_5))
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
    var _S73 : pixelOutput_1 = pixelOutput_1( vec4<f32>(0.0f, 0.0f, 0.0f, clamp((alpha_3 - cutoff_1) / _S72 + 0.5f, 0.0f, 1.0f)) );
    return _S73;
}

fn imageryUv_0( packed_1 : u32,  uv_7 : vec2<f32>) -> vec2<f32>
{
    var t_1 : vec2<f32> = (vec2<f32>(f32((((packed_1 >> (u32(16)))) & (u32(255)))), f32((packed_1 >> (u32(24))))) + uv_7) / vec2<f32>(f32((u32(1) << (((((packed_1 >> (u32(12)))) & (u32(15))))))));
    return vec2<f32>(t_1.x, 1.0f - t_1.y);
}

fn srgbToLinear_0( c_1 : vec3<f32>) -> vec3<f32>
{
    return select(pow((c_1 + vec3<f32>(0.054999999701976776f)) / vec3<f32>(1.0549999475479126f), vec3<f32>(2.4000000953674316f)), c_1 / vec3<f32>(12.920000076293945f), (c_1 <= vec3<f32>(0.040449999272823334f)));
}

struct Surface_0
{
     color_9 : vec3<f32>,
     alpha_4 : f32,
     unlit_1 : bool,
     sceneShare_0 : f32,
};

fn surface_0( color_10 : vec3<f32>,  alpha_5 : f32,  unlit_2 : bool) -> Surface_0
{
    var s_1 : Surface_0;
    s_1.color_9 = color_10;
    s_1.alpha_4 = alpha_5;
    s_1.unlit_1 = unlit_2;
    s_1.sceneShare_0 = 1.0f;
    return s_1;
}

fn fresnelSchlick_0( f0_0 : vec3<f32>,  f90_0 : vec3<f32>,  cosTheta_0 : f32) -> vec3<f32>
{
    var x_0 : f32 = 1.0f - cosTheta_0;
    var _S74 : vec3<f32> = vec3<f32>((x_0 * x_0));
    return f0_0 + (f90_0 - f0_0) * _S74 * _S74 * vec3<f32>(x_0);
}

fn smithVisibility_0( alpha_6 : f32,  nDotL_0 : f32,  nDotV_0 : f32) -> f32
{
    var a2_0 : f32 = alpha_6 * alpha_6;
    var _S75 : f32 = 1.0f - a2_0;
    var sum_0 : f32 = nDotL_0 * sqrt(nDotV_0 * nDotV_0 * _S75 + a2_0) + nDotV_0 * sqrt(nDotL_0 * nDotL_0 * _S75 + a2_0);
    var _S76 : f32;
    if((sum_0 > 0.0f))
    {
        _S76 = 0.5f / sum_0;
    }
    else
    {
        _S76 = 0.0f;
    }
    return _S76;
}

fn ggx_0( alpha_7 : f32,  nDotH_0 : f32) -> f32
{
    var a2_1 : f32 = alpha_7 * alpha_7;
    var f_1 : f32 = (nDotH_0 * a2_1 - nDotH_0) * nDotH_0 + 1.0f;
    return a2_1 / (3.1415927410125732f * f_1 * f_1);
}

fn directReflectance_0( n_3 : vec3<f32>,  v_0 : vec3<f32>,  l_0 : vec3<f32>,  f0_1 : vec3<f32>,  diffuseColor_0 : vec3<f32>,  alpha_8 : f32,  nDotV_1 : f32) -> vec3<f32>
{
    var h_0 : vec3<f32> = normalize(v_0 + l_0);
    var nDotL_1 : f32 = clamp(dot(n_3, l_0), 0.0010000000474974513f, 1.0f);
    var fresnel_0 : vec3<f32> = fresnelSchlick_0(f0_1, vec3<f32>(clamp(max(f0_1.x, max(f0_1.y, f0_1.z)) * 25.0f, 0.0f, 1.0f)), clamp(dot(v_0, h_0), 0.0f, 1.0f));
    return ((vec3<f32>(1.0f) - fresnel_0) * diffuseColor_0 / vec3<f32>(3.1415927410125732f) + fresnel_0 * vec3<f32>(smithVisibility_0(alpha_8, nDotL_1, nDotV_1)) * vec3<f32>(ggx_0(alpha_8, clamp(dot(n_3, h_0), 0.0f, 1.0f)))) * vec3<f32>(nDotL_1);
}

fn cascadeLight_0( c_2 : u32,  relPosition_6 : vec3<f32>,  n_4 : vec3<f32>) -> f32
{
    var p_2 : vec4<f32> = (((vec4<f32>(relPosition_6 + n_4 * vec3<f32>((shadows_0.texels_0[c_2] * 2.0f)), 1.0f)) * (mat4x4<f32>(shadows_0.matrices_0.data_2[c_2].data_0[i32(0)][i32(0)], shadows_0.matrices_0.data_2[c_2].data_0[i32(1)][i32(0)], shadows_0.matrices_0.data_2[c_2].data_0[i32(2)][i32(0)], shadows_0.matrices_0.data_2[c_2].data_0[i32(3)][i32(0)], shadows_0.matrices_0.data_2[c_2].data_0[i32(0)][i32(1)], shadows_0.matrices_0.data_2[c_2].data_0[i32(1)][i32(1)], shadows_0.matrices_0.data_2[c_2].data_0[i32(2)][i32(1)], shadows_0.matrices_0.data_2[c_2].data_0[i32(3)][i32(1)], shadows_0.matrices_0.data_2[c_2].data_0[i32(0)][i32(2)], shadows_0.matrices_0.data_2[c_2].data_0[i32(1)][i32(2)], shadows_0.matrices_0.data_2[c_2].data_0[i32(2)][i32(2)], shadows_0.matrices_0.data_2[c_2].data_0[i32(3)][i32(2)], shadows_0.matrices_0.data_2[c_2].data_0[i32(0)][i32(3)], shadows_0.matrices_0.data_2[c_2].data_0[i32(1)][i32(3)], shadows_0.matrices_0.data_2[c_2].data_0[i32(2)][i32(3)], shadows_0.matrices_0.data_2[c_2].data_0[i32(3)][i32(3)]))));
    var uv_8 : vec2<f32> = vec2<f32>(p_2.x * 0.5f + 0.5f, 0.5f - p_2.y * 0.5f);
    var _S77 : bool;
    if((any(((uv_8 < vec2<f32>(0.0f))))))
    {
        _S77 = true;
    }
    else
    {
        _S77 = (any(((uv_8 > vec2<f32>(1.0f)))));
    }
    if(_S77)
    {
        _S77 = true;
    }
    else
    {
        _S77 = ((p_2.z) > 1.0f);
    }
    if(_S77)
    {
        return 1.0f;
    }
    var _S78 : vec2<f32> = vec2<f32>(0.5f);
    var _S79 : vec2<f32> = uv_8 * vec2<f32>(2048.0f) + _S78;
    var base_0 : vec2<f32> = floor(_S79);
    var st_0 : vec2<f32> = _S79 - base_0;
    var _S80 : vec2<f32> = vec2<f32>(0.00048828125f);
    var _S81 : vec2<f32> = (base_0 - _S78) * _S80;
    var _S82 : f32 = st_0.x;
    var _S83 : f32 = 3.0f * _S82;
    var _S84 : f32 = 4.0f - _S83;
    var _S85 : f32 = 1.0f + _S83;
    var _S86 : f32 = (3.0f - 2.0f * _S82) / _S84 - 2.0f;
    var _S87 : f32 = (3.0f + _S82) / 7.0f;
    var _S88 : f32 = _S82 / _S85 + 2.0f;
    var _S89 : f32 = st_0.y;
    var _S90 : f32 = 3.0f * _S89;
    var _S91 : f32 = 4.0f - _S90;
    var _S92 : f32 = 1.0f + _S90;
    var _S93 : f32 = (3.0f - 2.0f * _S89) / _S91 - 2.0f;
    var _S94 : f32 = (3.0f + _S89) / 7.0f;
    var _S95 : f32 = _S89 / _S92 + 2.0f;
    var _S96 : f32 = f32(c_2);
    var _S97 : vec3<f32> = vec3<f32>(_S81 + vec2<f32>(_S86, _S93) * _S80, _S96);
    var _S98 : f32 = p_2.z;
    var _S99 : vec3<f32> = vec3<f32>(_S81 + vec2<f32>(_S87, _S93) * _S80, _S96);
    var _S100 : vec3<f32> = vec3<f32>(_S81 + vec2<f32>(_S88, _S93) * _S80, _S96);
    var _S101 : vec3<f32> = vec3<f32>(_S81 + vec2<f32>(_S86, _S94) * _S80, _S96);
    var _S102 : vec3<f32> = vec3<f32>(_S81 + vec2<f32>(_S87, _S94) * _S80, _S96);
    var _S103 : vec3<f32> = vec3<f32>(_S81 + vec2<f32>(_S88, _S94) * _S80, _S96);
    var _S104 : vec3<f32> = vec3<f32>(_S81 + vec2<f32>(_S86, _S95) * _S80, _S96);
    var _S105 : vec3<f32> = vec3<f32>(_S81 + vec2<f32>(_S87, _S95) * _S80, _S96);
    var _S106 : vec3<f32> = vec3<f32>(_S81 + vec2<f32>(_S88, _S95) * _S80, _S96);
    return (_S84 * _S91 * (textureSampleCompareLevel((shadowMap_0), (shadowSampler_0), ((_S97)).xy, i32(((_S97)).z), (_S98))) + 7.0f * _S91 * (textureSampleCompareLevel((shadowMap_0), (shadowSampler_0), ((_S99)).xy, i32(((_S99)).z), (_S98))) + _S85 * _S91 * (textureSampleCompareLevel((shadowMap_0), (shadowSampler_0), ((_S100)).xy, i32(((_S100)).z), (_S98))) + _S84 * 7.0f * (textureSampleCompareLevel((shadowMap_0), (shadowSampler_0), ((_S101)).xy, i32(((_S101)).z), (_S98))) + 49.0f * (textureSampleCompareLevel((shadowMap_0), (shadowSampler_0), ((_S102)).xy, i32(((_S102)).z), (_S98))) + _S85 * 7.0f * (textureSampleCompareLevel((shadowMap_0), (shadowSampler_0), ((_S103)).xy, i32(((_S103)).z), (_S98))) + _S84 * _S92 * (textureSampleCompareLevel((shadowMap_0), (shadowSampler_0), ((_S104)).xy, i32(((_S104)).z), (_S98))) + 7.0f * _S92 * (textureSampleCompareLevel((shadowMap_0), (shadowSampler_0), ((_S105)).xy, i32(((_S105)).z), (_S98))) + _S85 * _S92 * (textureSampleCompareLevel((shadowMap_0), (shadowSampler_0), ((_S106)).xy, i32(((_S106)).z), (_S98)))) / 144.0f;
}

fn sunShadow_0( relPosition_7 : vec3<f32>,  n_5 : vec3<f32>) -> f32
{
    var _S107 : bool;
    if(((shadows_0.forward_0.w) < 0.5f))
    {
        return 1.0f;
    }
    var depth_0 : f32 = dot(relPosition_7, shadows_0.forward_0.xyz);
    if((depth_0 >= (shadows_0.fade_0.y)))
    {
        return 1.0f;
    }
    var c_3 : u32 = u32(0);
    loop
    {
        var _S108 : bool = (c_3 < u32(3));
        _S107 = _S108;
        var _S109 : bool;
        if(_S108)
        {
            _S109 = (depth_0 > (shadows_0.splits_0[c_3]));
        }
        else
        {
            _S109 = false;
        }
        if(_S109)
        {
        }
        else
        {
            break;
        }
        c_3 = c_3 + u32(1);
    }
    var lit_0 : f32 = cascadeLight_0(c_3, relPosition_7, n_5);
    var lit_1 : f32;
    if(_S107)
    {
        var near_1 : f32;
        if((c_3 > u32(0)))
        {
            near_1 = shadows_0.splits_0[max(c_3, u32(1)) - u32(1)];
        }
        else
        {
            near_1 = 0.0f;
        }
        var band_0 : f32 = 0.10000000149011612f * (shadows_0.splits_0[c_3] - near_1);
        var w_0 : f32 = clamp((depth_0 - (shadows_0.splits_0[c_3] - band_0)) / max(band_0, 0.0010000000474974513f), 0.0f, 1.0f);
        if((w_0 > 0.0f))
        {
            lit_1 = mix(lit_0, cascadeLight_0(c_3 + u32(1), relPosition_7, n_5), w_0);
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

fn sunlightThroughAir_0( relPosition_8 : vec3<f32>,  direction_0 : vec3<f32>) -> vec3<f32>
{
    var p_3 : vec3<f32> = relPosition_8 + cameraPosition_0();
    var radii_0 : vec3<f32> = view_0.bodyRadii_0.xyz;
    var distance_0 : f32 = length(p_3);
    var mu_0 : f32 = dot(normalize(p_3 / (radii_0 * radii_0)), direction_0);
    const size_1 : vec2<f32> = vec2<f32>(256.0f, 64.0f);
    return (textureSampleLevel((sunLightTable_0), (environmentSampler_0), ((vec2<f32>(0.5f) + vec2<f32>(0.5f + 0.5f * f32((i32(sign((mu_0))))) * sqrt(abs(mu_0)), sqrt(clamp((distance_0 - distance_0 / length(p_3 / radii_0)) / 1000.0f / (view_0.sunLight_0.y - view_0.sunLight_0.x), 0.0f, 1.0f))) * (size_1 - vec2<f32>(1.0f))) / size_1), (0.0f))).xyz * vec3<f32>((1.0e+05f * view_0.sunIlluminance_0));
}

fn sunIlluminance_1( relPosition_9 : vec3<f32>) -> vec3<f32>
{
    if(((view_0.sunLight_0.z) < 0.5f))
    {
        return vec3<f32>(view_0.sunIlluminance_0);
    }
    return sunlightThroughAir_0(relPosition_9, view_0.sunDirection_0.xyz);
}

fn punctualLight_0( pixel_0 : vec2<f32>,  relPosition_10 : vec3<f32>,  n_6 : vec3<f32>,  v_1 : vec3<f32>,  f0_2 : vec3<f32>,  diffuseColor_1 : vec3<f32>,  alpha_9 : f32,  nDotV_2 : f32) -> vec3<f32>
{
    var _S110 : f32 = bitcast<f32>(lightTable_0[(u32(0))/4]);
    var _S111 : f32 = bitcast<f32>(lightTable_0[(u32(4))/4]);
    var _S112 : f32 = bitcast<f32>(lightTable_0[(u32(8))/4]);
    var _S113 : f32 = bitcast<f32>(lightTable_0[(u32(16))/4]);
    var _S114 : f32 = bitcast<f32>(lightTable_0[(u32(20))/4]);
    var _S115 : f32 = bitcast<f32>(lightTable_0[(u32(32))/4]);
    var _S116 : f32 = bitcast<f32>(lightTable_0[(u32(36))/4]);
    var _S117 : f32 = bitcast<f32>(lightTable_0[(u32(40))/4]);
    var _S118 : f32 = bitcast<f32>(lightTable_0[(u32(44))/4]);
    var sum_1 : vec3<f32> = vec3<f32>(0.0f);
    if((bitcast<f32>(lightTable_0[(u32(12))/4]) < 0.5f))
    {
        return sum_1;
    }
    var z_0 : f32 = dot(relPosition_10, vec3<f32>(_S115, _S116, _S117));
    var _S119 : bool;
    if((z_0 < _S113))
    {
        _S119 = true;
    }
    else
    {
        _S119 = (z_0 >= _S118);
    }
    if(_S119)
    {
        return sum_1;
    }
    var _S120 : vec3<u32> = vec3<u32>(vec3<f32>(_S110, _S111, _S112));
    var uv_9 : vec2<f32> = pixel_0 * view_0.viewport_0.zw;
    var _S121 : u32 = _S120.x;
    var _S122 : u32 = _S120.y;
    var base_1 : u32 = ((min(u32(log(z_0 / _S113) * _S114), _S120.z - u32(1)) * _S122 + min(u32(uv_9.y * f32(_S122)), _S122 - u32(1))) * _S121 + min(u32(uv_9.x * f32(_S121)), _S121 - u32(1))) * u32(17);
    var _S123 : u32 = min(lightTable_0[(u32(i32(u32(65616) + base_1 * u32(4))))/4], u32(16));
    var t_2 : u32 = u32(0);
    var sum_2 : vec3<f32> = sum_1;
    loop
    {
        if((t_2 < u32(16)))
        {
        }
        else
        {
            break;
        }
        if((t_2 >= _S123))
        {
            break;
        }
        var _S124 : u32 = u32(80) + min(lightTable_0[(u32(i32(u32(65616) + (base_1 + u32(1) + t_2) * u32(4))))/4], u32(1023)) * u32(64);
        var _S125 : f32 = bitcast<f32>(lightTable_0[(_S124 + u32(12))/4]);
        var _S126 : f32 = bitcast<f32>(lightTable_0[(_S124 + u32(16))/4]);
        var _S127 : f32 = bitcast<f32>(lightTable_0[(_S124 + u32(20))/4]);
        var _S128 : f32 = bitcast<f32>(lightTable_0[(_S124 + u32(24))/4]);
        var _S129 : f32 = bitcast<f32>(lightTable_0[(_S124 + u32(28))/4]);
        var _S130 : f32 = bitcast<f32>(lightTable_0[(_S124 + u32(32))/4]);
        var _S131 : f32 = bitcast<f32>(lightTable_0[(_S124 + u32(36))/4]);
        var _S132 : f32 = bitcast<f32>(lightTable_0[(_S124 + u32(40))/4]);
        var _S133 : f32 = bitcast<f32>(lightTable_0[(_S124 + u32(44))/4]);
        var _S134 : f32 = bitcast<f32>(lightTable_0[(_S124 + u32(48))/4]);
        var toLight_0 : vec3<f32> = vec3<f32>(bitcast<f32>(lightTable_0[(_S124)/4]), bitcast<f32>(lightTable_0[(_S124 + u32(4))/4]), bitcast<f32>(lightTable_0[(_S124 + u32(8))/4])) - relPosition_10;
        var _S135 : f32 = max(dot(toLight_0, toLight_0), 9.9999997473787516e-05f);
        var l_1 : vec3<f32> = toLight_0 * vec3<f32>(inverseSqrt(_S135));
        if(((dot(n_6, l_1)) <= 0.0f))
        {
            t_2 = t_2 + u32(1);
            continue;
        }
        var ratio2_0 : f32 = _S135 / (_S125 * _S125);
        var window_0 : f32 = clamp(1.0f - ratio2_0 * ratio2_0, 0.0f, 1.0f);
        var illuminance_0 : vec3<f32> = vec3<f32>(_S126, _S127, _S128) * vec3<f32>((window_0 * window_0 / _S135));
        var illuminance_1 : vec3<f32>;
        if((_S129 > 0.5f))
        {
            var cone_0 : f32 = clamp(dot(vec3<f32>(_S130, _S131, _S132), (vec3<f32>(0) - l_1)) * _S133 + _S134, 0.0f, 1.0f);
            illuminance_1 = illuminance_0 * vec3<f32>((cone_0 * cone_0));
        }
        else
        {
            illuminance_1 = illuminance_0;
        }
        sum_2 = sum_2 + directReflectance_0(n_6, v_1, l_1, f0_2, diffuseColor_1, alpha_9, nDotV_2) * illuminance_1;
        t_2 = t_2 + u32(1);
    }
    return sum_2;
}

fn toEnvironment_0( d_2 : vec3<f32>) -> vec3<f32>
{
    return vec3<f32>(dot(d_2, view_0.iblFrame_0[i32(0)].xyz), dot(d_2, view_0.iblFrame_0[i32(1)].xyz), dot(d_2, view_0.iblFrame_0[i32(2)].xyz));
}

fn irradiance_0( n_7 : vec3<f32>) -> vec3<f32>
{
    return (textureSampleLevel((irradianceCube_0), (environmentSampler_0), (n_7), (0.0f))).xyz;
}

fn ambientOcclusion_0( pixel_1 : vec2<f32>) -> f32
{
    if(((shadows_0.fade_0.z) < 0.5f))
    {
        return 1.0f;
    }
    var _S136 : vec2<u32> = vec2<u32>(pixel_1);
    var _S137 : u32 = _S136.x;
    return f32((((aoWords_0[_S136.y * ((u32(view_0.viewport_0.x) + u32(3)) / u32(4)) + _S137 / u32(4)] >> ((u32(8) * ((_S137 & (u32(3)))))))) & (u32(255)))) / 255.0f;
}

struct AerialPerspective_0
{
     inscatter_0 : vec3<f32>,
     transmittance_0 : vec3<f32>,
};

fn aerialPerspective_0( fragment_0 : vec2<f32>,  relPosition_11 : vec3<f32>) -> AerialPerspective_0
{
    var w_1 : f32 = sqrt(clamp((length(relPosition_11) / 1000.0f - view_0.aerialStart_0) / max(view_0.aerialEnd_0 - view_0.aerialStart_0, 9.99999997475242708e-07f), 0.0f, 1.0f));
    var uv_10 : vec2<f32> = fragment_0 * view_0.viewport_0.zw;
    var half_0 : f32 = clamp(w_1, 0.00390625f, 0.99609375f) * 0.5f;
    var transmittance_1 : vec3<f32> = (textureSampleLevel((aerialVolume_0), (environmentSampler_0), (vec3<f32>(uv_10, 0.5f + half_0)), (0.0f))).xyz;
    var result_0 : AerialPerspective_0;
    var _S138 : vec3<f32> = vec3<f32>(clamp(w_1 * 256.0f, 0.0f, 1.0f));
    result_0.inscatter_0 = (textureSampleLevel((aerialVolume_0), (environmentSampler_0), (vec3<f32>(uv_10, half_0)), (0.0f))).xyz * _S138;
    result_0.transmittance_0 = mix(vec3<f32>(1.0f), transmittance_1, _S138);
    return result_0;
}

fn shadeSurface_0( in_3 : SurfaceVaryings_0,  frontFacing_1 : bool,  translucent_0 : bool) -> Surface_0
{
    var _S139 : u32 = in_3.ids_0.x;
    var _S140 : Material_std430_0 = materials_0[records_0[_S139].materialIndex_0];
    var _S141 : u32 = _S140.flags_1;
    var _S142 : vec4<f32> = materialTexture_0(&(_S140), u32(0), in_3.uv_1);
    var _S143 : vec4<f32> = materialTexture_0(&(_S140), u32(4), in_3.uv_1);
    var emissiveSample_0 : vec3<f32> = _S143.xyz;
    var _S144 : vec4<f32> = materialTexture_0(&(_S140), u32(1), in_3.uv_1);
    var _S145 : vec4<f32> = materialTexture_0(&(_S140), u32(2), in_3.uv_1);
    var normalSample_0 : vec3<f32> = _S145.xyz;
    var _S146 : vec4<f32> = materialTexture_0(&(_S140), u32(3), in_3.uv_1);
    var occlusionSample_0 : f32 = _S146.x;
    var imageryPacked_0 : u32 = records_0[_S139].imagerySlice_0;
    var _S147 : vec3<f32> = vec3<f32>(imageryUv_0(records_0[_S139].imagerySlice_0, in_3.uv_1), f32(max(((records_0[_S139].imagerySlice_0) & (u32(4095))), u32(1)) - u32(1)));
    var imagerySample_0 : vec4<f32> = (textureSample((imagery_0), (imagerySampler_0), ((_S147)).xy, i32(((_S147)).z)));
    var lightsPacked_0 : u32 = records_0[_S139].lightsSlice_0;
    var _S148 : vec3<f32> = vec3<f32>(imageryUv_0(records_0[_S139].lightsSlice_0, in_3.uv_1), f32(max(((records_0[_S139].lightsSlice_0) & (u32(4095))), u32(1)) - u32(1)));
    var lightsSample_0 : vec3<f32> = (textureSample((imagery_0), (imagerySampler_0), ((_S148)).xy, i32(((_S148)).z))).xyz;
    var dPdx_0 : vec3<f32> = dpdx(in_3.relPosition_0);
    var dPdy_0 : vec3<f32> = dpdy(in_3.relPosition_0);
    var dUVdx_0 : vec2<f32> = dpdx(in_3.uv_1);
    var dUVdy_0 : vec2<f32> = dpdy(in_3.uv_1);
    var baseColorSample_0 : vec4<f32>;
    var emissiveSample_1 : vec3<f32>;
    if(((_S141 & (u32(512)))) != u32(0))
    {
        var _S149 : vec3<f32> = vec3<f32>(2.2000000476837158f);
        var _S150 : vec3<f32> = pow(emissiveSample_0, _S149);
        baseColorSample_0 = vec4<f32>(pow(_S142.xyz, _S149), _S142.w);
        emissiveSample_1 = _S150;
    }
    else
    {
        baseColorSample_0 = _S142;
        emissiveSample_1 = emissiveSample_0;
    }
    var _S151 : vec4<f32> = records_0[_S139].color_0;
    var baseColor_2 : vec4<f32> = _S140.baseColor_0 * records_0[_S139].color_0 * in_3.color_1;
    var _S152 : bool = materialHasTexture_0(&(_S140), u32(0));
    var baseColor_3 : vec4<f32>;
    if(_S152)
    {
        baseColor_3 = baseColor_2 * baseColorSample_0;
    }
    else
    {
        baseColor_3 = baseColor_2;
    }
    if(imageryPacked_0 != u32(0))
    {
        baseColor_3 = vec4<f32>(srgbToLinear_0(imagerySample_0.xyz), 1.0f) * _S151;
    }
    if(placeholderOut_0(_S139, in_3.relPosition_0))
    {
        discard;
    }
    var _S153 : bool;
    if(translucent_0)
    {
        _S153 = true;
    }
    else
    {
        _S153 = !cutOutInDepth_0;
    }
    var terrain_0 : f32;
    if(_S153)
    {
        var _S154 : f32 = terrainAlpha_0(_S139, in_3);
        if((_S154 <= 0.0f))
        {
            discard;
        }
        terrain_0 = _S154;
    }
    else
    {
        terrain_0 = 1.0f;
    }
    var _S155 : vec3<f32> = _S140.emissive_0;
    var _S156 : bool = materialHasTexture_0(&(_S140), u32(4));
    var emissive_2 : vec3<f32>;
    if(_S156)
    {
        emissive_2 = _S155 * emissiveSample_1;
    }
    else
    {
        emissive_2 = _S155;
    }
    var _S157 : f32 = _S140.metallic_0;
    var _S158 : f32 = _S140.roughness_0;
    var _S159 : bool = materialHasTexture_0(&(_S140), u32(1));
    var metallic_2 : f32;
    var roughness_2 : f32;
    if(_S159)
    {
        var roughness_3 : f32 = _S158 * _S144.y;
        metallic_2 = _S157 * _S144.z;
        roughness_2 = roughness_3;
    }
    else
    {
        metallic_2 = _S157;
        roughness_2 = _S158;
    }
    var metallic_3 : f32 = clamp(metallic_2, 0.0f, 1.0f);
    var roughness_4 : f32 = clamp(roughness_2, 0.0f, 1.0f);
    var n_8 : vec3<f32> = normalize(in_3.normal_1);
    var _S160 : bool = !frontFacing_1;
    var n_9 : vec3<f32>;
    if(_S160)
    {
        n_9 = (vec3<f32>(0) - n_8);
    }
    else
    {
        n_9 = n_8;
    }
    var _S161 : bool = materialHasTexture_0(&(_S140), u32(2));
    var geometric_2 : vec3<f32>;
    var direct_0 : vec3<f32>;
    if(_S161)
    {
        var _S162 : f32 = in_3.tangent_0.w;
        if(_S162 != 0.0f)
        {
            var _S163 : vec3<f32> = in_3.tangent_0.xyz;
            var t_3 : vec3<f32> = normalize(_S163 - n_9 * vec3<f32>(dot(n_9, _S163)));
            var _S164 : vec3<f32> = cross(n_9, t_3) * vec3<f32>(_S162);
            geometric_2 = t_3;
            direct_0 = _S164;
        }
        else
        {
            var dp2perp_0 : vec3<f32> = cross(dPdy_0, n_9);
            var dp1perp_0 : vec3<f32> = cross(n_9, dPdx_0);
            var tt_0 : vec3<f32> = dp2perp_0 * vec3<f32>(dUVdx_0.x) + dp1perp_0 * vec3<f32>(dUVdy_0.x);
            var bb_0 : vec3<f32> = dp2perp_0 * vec3<f32>(dUVdx_0.y) + dp1perp_0 * vec3<f32>(dUVdy_0.y);
            var _S165 : vec3<f32> = vec3<f32>(inverseSqrt(max(dot(tt_0, tt_0), dot(bb_0, bb_0)) + 9.99999968265522539e-21f));
            var _S166 : vec3<f32> = bb_0 * _S165;
            geometric_2 = tt_0 * _S165;
            direct_0 = _S166;
        }
        var tsNormal_0 : vec3<f32> = (normalSample_0 * vec3<f32>(2.0f) - vec3<f32>(1.0f)) * vec3<f32>(_S140.normalScale_0, _S140.normalScale_0, 1.0f);
        n_9 = normalize(geometric_2 * vec3<f32>(tsNormal_0.x) + direct_0 * vec3<f32>(tsNormal_0.y) + n_9 * vec3<f32>(tsNormal_0.z));
    }
    var _S167 : bool = materialHasTexture_0(&(_S140), u32(3));
    var occlusion_1 : f32;
    if(_S167)
    {
        occlusion_1 = 1.0f + _S140.occlusionStrength_0 * (occlusionSample_0 - 1.0f);
    }
    else
    {
        occlusion_1 = 1.0f;
    }
    if(_S160)
    {
        geometric_2 = (vec3<f32>(0) - n_8);
    }
    else
    {
        geometric_2 = n_8;
    }
    var fragment_1 : CesiumFragment = fragmentOf_0(in_3, geometric_2);
    var custom_1 : MaterialOutput;
    var _S168 : vec3<f32> = baseColor_3.xyz;
    var _S169 : f32 = baseColor_3.w;
    if(((_S141 & (u32(1)))) != u32(0))
    {
        _S153 = true;
    }
    else
    {
        _S153 = (((records_0[_S139].flags_0) & (u32(2)))) != u32(0);
    }
    custom_1 = materialOutput_0(_S168, _S169, metallic_3, roughness_4, n_9, occlusion_1, emissive_2, _S153);
    cesiumFragmentStage((fragment_1), &((custom_1)));
    var baseColor_4 : vec4<f32> = vec4<f32>(custom_1.baseColor, custom_1.alpha * terrain_0);
    if(!cutOutInDepth_0)
    {
        _S153 = ((_S141 & (u32(4)))) != u32(0);
    }
    else
    {
        _S153 = false;
    }
    if(_S153)
    {
        _S153 = ((baseColor_4.w) < (_S140.alphaCutoff_0));
    }
    else
    {
        _S153 = false;
    }
    if(_S153)
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
    var n_10 : vec3<f32> = normalize(custom_1.normal);
    var occlusion_2 : f32 = custom_1.occlusion;
    var emissive_3 : vec3<f32> = custom_1.emissive;
    var v_2 : vec3<f32> = (vec3<f32>(0) - normalize(in_3.relPosition_0));
    var l_2 : vec3<f32> = normalize(view_0.sunDirection_0.xyz);
    var nDotV_3 : f32 = clamp(dot(n_10, v_2), 0.0f, 1.0f);
    var _S170 : vec3<f32> = baseColor_4.xyz;
    var f0_3 : vec3<f32> = mix(vec3<f32>(0.039999999105930328f), _S170, vec3<f32>(metallic_4));
    var diffuseColor_2 : vec3<f32> = _S170 * vec3<f32>((1.0f - metallic_4));
    var alpha_10 : f32 = roughness_5 * roughness_5;
    var sunReflected_0 : vec3<f32> = directReflectance_0(n_10, v_2, l_2, f0_3, diffuseColor_2, alpha_10, nDotV_3);
    var moonShadows_0 : bool = ((shadows_0.fade_0.w) > 0.5f);
    var sunVisible_0 : f32;
    if(((dot(n_10, l_2)) > 0.0f))
    {
        sunVisible_0 = 1.0f;
    }
    else
    {
        sunVisible_0 = 0.0f;
    }
    if((sunVisible_0 > 0.0f))
    {
        _S153 = !moonShadows_0;
    }
    else
    {
        _S153 = false;
    }
    if(_S153)
    {
        sunVisible_0 = sunVisible_0 * sunShadow_0(in_3.relPosition_0, geometric_2);
    }
    var direct_1 : vec3<f32> = sunReflected_0 * sunIlluminance_1(in_3.relPosition_0) * vec3<f32>(sunVisible_0);
    var moonward_0 : vec3<f32> = view_0.moonLight_0.xyz;
    if(((view_0.moonLight_0.w) > 0.0f))
    {
        _S153 = ((view_0.sunLight_0.z) > 0.5f);
    }
    else
    {
        _S153 = false;
    }
    if(_S153)
    {
        _S153 = ((dot(n_10, moonward_0)) > 0.0f);
    }
    else
    {
        _S153 = false;
    }
    var ao_0 : f32;
    if(_S153)
    {
        if(moonShadows_0)
        {
            ao_0 = sunShadow_0(in_3.relPosition_0, geometric_2);
        }
        else
        {
            ao_0 = 1.0f;
        }
        direct_0 = direct_1 + directReflectance_0(n_10, v_2, moonward_0, f0_3, diffuseColor_2, alpha_10, nDotV_3) * sunlightThroughAir_0(in_3.relPosition_0, moonward_0) * vec3<f32>(view_0.moonLight_0.w) * vec3<f32>(ao_0);
    }
    else
    {
        direct_0 = direct_1;
    }
    var _S171 : vec2<f32> = in_3.position_0.xy;
    var direct_2 : vec3<f32> = direct_0 + punctualLight_0(_S171, in_3.relPosition_0, n_10, v_2, f0_3, diffuseColor_2, alpha_10, nDotV_3);
    var lut_0 : vec2<f32> = (textureSampleLevel((brdfLut_0), (environmentSampler_0), (vec2<f32>(nDotV_3, roughness_5)), (0.0f))).xy;
    var _S172 : f32 = lut_0.x;
    var _S173 : f32 = lut_0.y;
    var fssEss_0 : vec3<f32> = fresnelSchlick_0(f0_3, max(vec3<f32>((1.0f - roughness_5)), f0_3), nDotV_3) * vec3<f32>(_S172) + vec3<f32>(_S173);
    var _S174 : vec3<f32> = vec3<f32>(1.0f);
    var averageF_0 : vec3<f32> = f0_3 + (_S174 - f0_3) / vec3<f32>(21.0f);
    var _S175 : vec3<f32> = vec3<f32>((1.0f - _S172 - _S173));
    var fmsEms_0 : vec3<f32> = fssEss_0 * averageF_0 * _S175 / (_S174 - averageF_0 * _S175);
    var diffuseIbl_1 : vec3<f32> = irradiance_0(toEnvironment_0(n_10)) * (fmsEms_0 + (_S174 - fssEss_0 - fmsEms_0) * diffuseColor_2);
    var specularIbl_1 : vec3<f32> = (textureSampleLevel((specularEnvironment_0), (environmentSampler_0), (toEnvironment_0(reflect((vec3<f32>(0) - v_2), n_10))), (roughness_5 * view_0.specularMaxLod_0))).xyz * fssEss_0;
    if(translucent_0)
    {
        ao_0 = 1.0f;
    }
    else
    {
        ao_0 = ambientOcclusion_0(_S171);
    }
    var indirect_0 : vec3<f32> = (diffuseIbl_1 * max(vec3<f32>(ao_0), ((vec3<f32>(ao_0) * (vec3<f32>(2.0404000282287598f) * diffuseColor_2 - vec3<f32>(0.33239999413490295f)) + (vec3<f32>(-4.795100212097168f) * diffuseColor_2 + vec3<f32>(0.64170002937316895f))) * vec3<f32>(ao_0) + (vec3<f32>(2.7551999092102051f) * diffuseColor_2 + vec3<f32>(0.69029998779296875f))) * vec3<f32>(ao_0)) * vec3<f32>(view_0.diffuseIbl_0) + specularIbl_1 * vec3<f32>(clamp(pow(nDotV_3 + ao_0, exp2(-16.0f * roughness_5 - 1.0f)) - 1.0f + ao_0, 0.0f, 1.0f)) * vec3<f32>(view_0.specularIbl_0)) * vec3<f32>(occlusion_2);
    var _S176 : vec3<f32> = vec3<f32>(0.0f);
    if(lightsPacked_0 != u32(0))
    {
        _S153 = ((view_0.iblFrame_0[i32(0)].w) > 0.5f);
    }
    else
    {
        _S153 = false;
    }
    var emitted_0 : vec3<f32>;
    if(_S153)
    {
        emitted_0 = max(srgbToLinear_0(lightsSample_0) - vec3<f32>(0.0040000001899898052f), _S176) / vec3<f32>(0.99599999189376831f) * vec3<f32>(0.30000001192092896f);
    }
    else
    {
        emitted_0 = _S176;
    }
    var lit_2 : vec3<f32> = (direct_2 + indirect_0 + emitted_0) * vec3<f32>(view_0.exposure_0);
    var lit_3 : vec3<f32>;
    var shown_0 : vec3<f32>;
    if(((view_0.sunLight_0.w) > 0.5f))
    {
        var march_0 : f32 = view_0.bodyRadii_0.w;
        var ap_0 : AerialPerspective_0;
        ap_0.inscatter_0 = _S176;
        ap_0.transmittance_0 = vec3<f32>(1.0f);
        if((march_0 < 1.0f))
        {
            ap_0 = aerialPerspective_0(_S171, in_3.relPosition_0);
        }
        if((march_0 > 0.0f))
        {
            var a_1 : AerialPerspective_0;
            a_1.inscatter_0 = in_3.airInscatter_0;
            a_1.transmittance_0 = in_3.airTransmittance_1;
            var screen_0 : f32 = view_0.iblFrame_0[i32(1)].w;
            if((screen_0 > 0.0f))
            {
                var uv_11 : vec2<f32> = _S171 * view_0.viewport_0.zw;
                var _S177 : vec3<f32> = vec3<f32>(uv_11, 0.0f);
                var _S178 : vec3<f32> = vec3<f32>(screen_0);
                a_1.inscatter_0 = mix(a_1.inscatter_0, (textureSampleLevel((aerialScreen_0), (environmentSampler_0), ((_S177)).xy, i32(((_S177)).z), (0.0f))).xyz, _S178);
                var _S179 : vec3<f32> = vec3<f32>(uv_11, 1.0f);
                a_1.transmittance_0 = mix(a_1.transmittance_0, (textureSampleLevel((aerialScreen_0), (environmentSampler_0), ((_S179)).xy, i32(((_S179)).z), (0.0f))).xyz, _S178);
            }
            var _S180 : vec3<f32> = vec3<f32>(march_0);
            ap_0.inscatter_0 = mix(ap_0.inscatter_0, a_1.inscatter_0, _S180);
            ap_0.transmittance_0 = mix(ap_0.transmittance_0, a_1.transmittance_0, _S180);
        }
        var _S181 : vec3<f32> = emissive_3 * ap_0.transmittance_0;
        lit_3 = lit_2 * ap_0.transmittance_0 + ap_0.inscatter_0;
        shown_0 = _S181;
    }
    else
    {
        lit_3 = lit_2;
        shown_0 = emissive_3;
    }
    var s_2 : Surface_0 = surface_0(min(lit_3 + shown_0, vec3<f32>(60000.0f)), baseColor_4.w, false);
    const luminance_0 : vec3<f32> = vec3<f32>(0.2125999927520752f, 0.71520000696182251f, 0.072200000286102295f);
    var shownLuminance_0 : f32 = dot(shown_0, luminance_0);
    if((shownLuminance_0 > 0.0f))
    {
        var _S182 : f32 = dot(lit_3, luminance_0);
        s_2.sceneShare_0 = clamp(_S182 / (_S182 + shownLuminance_0), 0.0f, 1.0f);
    }
    return s_2;
}

struct FsOut_0
{
    @location(0) color_11 : vec4<f32>,
    @interpolate(flat) @location(1) featureId_1 : vec2<u32>,
    @location(2) display_0 : vec4<f32>,
};

struct pixelInput_5
{
    @location(0) normal_7 : vec3<f32>,
    @location(1) uv_12 : vec2<f32>,
    @location(2) color_12 : vec4<f32>,
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
fn fs( _S183 : pixelInput_5, @builtin(front_facing) frontFacing_2 : bool, @builtin(position) position_6 : vec4<f32>) -> FsOut_0
{
    var _S184 : SurfaceVaryings_0 = SurfaceVaryings_0( position_6, _S183.normal_7, _S183.uv_12, _S183.color_12, _S183.ids_6, _S183.relPosition_12, _S183.tangent_6, _S183.airInscatter_6, _S183.airTransmittance_7, _S183.positionMC_6, _S183.named0_6, _S183.named1_6, _S183.named2_6, _S183.named3_6 );
    terrainSeen_0 = true;
    surfaceLight_0 = true;
    var s_3 : Surface_0 = shadeSurface_0(_S184, frontFacing_2, false);
    var _S185 : bool;
    if(!cutOutInDepth_0)
    {
        _S185 = (((materials_0[records_0[_S183.ids_6.x].materialIndex_0].flags_1) & (u32(8)))) != u32(0);
    }
    else
    {
        _S185 = false;
    }
    if(_S185)
    {
        _S185 = ((s_3.alpha_4) < 0.99900001287460327f);
    }
    else
    {
        _S185 = false;
    }
    if(_S185)
    {
        discard;
    }
    var out_0 : FsOut_0;
    var _S186 : u32 = _S183.ids_6.y;
    out_0.featureId_1 = vec2<u32>((_S186 & (u32(65535))), (_S186 >> (u32(16))));
    if(s_3.unlit_1)
    {
        out_0.color_11 = vec4<f32>(0.0f);
        out_0.display_0 = vec4<f32>(s_3.color_9, 1.0f);
    }
    else
    {
        out_0.color_11 = vec4<f32>(s_3.color_9, s_3.sceneShare_0);
        out_0.display_0 = vec4<f32>(0.0f);
    }
    return out_0;
}

struct FsPointsOut_0
{
    @location(0) color_13 : vec4<f32>,
    @interpolate(flat) @location(1) featureId_2 : vec2<u32>,
    @location(2) display_1 : vec4<f32>,
    @builtin(sample_mask) mask_1 : u32,
};

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
fn fsPoints( _S187 : pixelInput_6, @builtin(front_facing) frontFacing_3 : bool, @builtin(position) position_7 : vec4<f32>) -> FsPointsOut_0
{
    var _S188 : SurfaceVaryings_0 = SurfaceVaryings_0( position_7, _S187.normal_8, _S187.uv_13, _S187.color_14, _S187.ids_7, _S187.relPosition_13, _S187.tangent_7, _S187.airInscatter_7, _S187.airTransmittance_8, _S187.positionMC_7, _S187.named0_7, _S187.named1_7, _S187.named2_7, _S187.named3_7 );
    terrainSeen_0 = true;
    surfaceLight_0 = true;
    var s_4 : Surface_0 = shadeSurface_0(_S188, frontFacing_3, false);
    var samples_0 : u32 = u32(round(clamp(s_4.alpha_4, 0.0f, 1.0f) * 4.0f));
    if(samples_0 == u32(0))
    {
        discard;
    }
    var turn_0 : u32 = (u32(position_7.x) + u32(2) * u32(position_7.y)) % u32(4);
    var covered_0 : u32 = ((u32(1) << (samples_0))) - u32(1);
    var out_1 : FsPointsOut_0;
    out_1.mask_1 = (((((covered_0 << (turn_0))) | (((covered_0 >> ((u32(4) - turn_0))))))) & (u32(15)));
    var _S189 : u32 = _S187.ids_7.y;
    out_1.featureId_2 = vec2<u32>((_S189 & (u32(65535))), (_S189 >> (u32(16))));
    if(s_4.unlit_1)
    {
        out_1.color_13 = vec4<f32>(0.0f);
        out_1.display_1 = vec4<f32>(s_4.color_9, 1.0f);
    }
    else
    {
        out_1.color_13 = vec4<f32>(s_4.color_9, s_4.sceneShare_0);
        out_1.display_1 = vec4<f32>(0.0f);
    }
    return out_1;
}

fn depthSlope_0( position_8 : vec4<f32>) -> vec2<f32>
{
    var _S190 : f32 = position_8.z;
    return vec2<f32>(dpdx(_S190), dpdy(_S190));
}

fn visibleSamples_0( position_9 : vec4<f32>,  slope_0 : vec2<f32>,  mask_2 : u32) -> u32
{
    var _S191 : vec2<f32> = position_9.xy;
    var _S192 : vec2<i32> = vec2<i32>(vec2<u32>(_S191));
    var width_1 : u32;
    var height_1 : u32;
    var samples_1 : u32;
    {var dim = textureDimensions((opaqueDepth_0));((width_1)) = dim.x;((height_1)) = dim.y;((samples_1)) = textureNumSamples((opaqueDepth_0));};
    var _S193 : vec2<f32> = fract(_S191) - vec2<f32>(0.5f);
    var i_1 : u32 = u32(0);
    var visible_0 : u32 = u32(0);
    loop
    {
        if((i_1 < u32(4)))
        {
        }
        else
        {
            break;
        }
        if((i_1 >= samples_1))
        {
            break;
        }
        var z_1 : f32 = position_9.z;
        var z_2 : f32;
        if(samples_1 == u32(4))
        {
            z_2 = z_1 + dot(slope_0, SAMPLE_OFFSETS_0[i_1] - _S193);
        }
        else
        {
            z_2 = z_1;
        }
        var _S194 : u32 = (u32(1) << (i_1));
        var _S195 : bool;
        if(((mask_2 & (_S194))) != u32(0))
        {
            _S195 = (z_2 >= (textureLoad((opaqueDepth_0), (_S192), (i32(i_1)))));
        }
        else
        {
            _S195 = false;
        }
        if(_S195)
        {
            visible_0 = (visible_0 | (_S194));
        }
        i_1 = i_1 + u32(1);
    }
    return visible_0;
}

fn listNode_0( in_4 : SurfaceVaryings_0,  color_15 : vec3<f32>,  alpha_11 : f32,  visible_1 : u32)
{
    var index_0 : u32 = atomicAdd(&(lists_0[i32(0)]), u32(1));
    if((index_0 >= (translucency_0.capacity_0)))
    {
        return;
    }
    var node_0 : u32 = translucency_0.nodesBase_0 + index_0 * u32(4);
    atomicStore(&(lists_0[node_0]), pack2x16float(color_15.xy));
    atomicStore(&(lists_0[node_0 + u32(1)]), pack2x16float(vec2<f32>(color_15.z, alpha_11)));
    atomicStore(&(lists_0[node_0 + u32(2)]), (bitcast<u32>((in_4.position_0.z))));
    var next_0 : u32 = atomicExchange(&(lists_0[u32(4) + (u32(in_4.position_0.y) * translucency_0.width_0 + u32(in_4.position_0.x))]), index_0 + u32(1));
    atomicStore(&(lists_0[node_0 + u32(3)]), (next_0 | (((visible_1 << (u32(28)))))));
    return;
}

fn appendNode_0( in_5 : SurfaceVaryings_0,  slope_1 : vec2<f32>,  s_5 : Surface_0,  mask_3 : u32)
{
    if(((s_5.alpha_4) >= 0.99949997663497925f))
    {
        return;
    }
    var alpha_12 : f32 = clamp(s_5.alpha_4, 0.0f, 1.0f);
    var visible_2 : u32 = visibleSamples_0(in_5.position_0, slope_1, mask_3);
    var _S196 : bool;
    if((alpha_12 <= 0.0f))
    {
        _S196 = true;
    }
    else
    {
        _S196 = visible_2 == u32(0);
    }
    if(_S196)
    {
        return;
    }
    if(s_5.unlit_1)
    {
        listNode_0(in_5, s_5.color_9, - alpha_12, visible_2);
        return;
    }
    listNode_0(in_5, s_5.color_9 * vec3<f32>(s_5.sceneShare_0), alpha_12, visible_2);
    if(((s_5.sceneShare_0) < 1.0f))
    {
        listNode_0(in_5, s_5.color_9 * vec3<f32>((1.0f - s_5.sceneShare_0)) * vec3<f32>(alpha_12), 2.0f, visible_2);
    }
    return;
}

struct pixelInput_7
{
    @location(0) normal_9 : vec3<f32>,
    @location(1) uv_14 : vec2<f32>,
    @location(2) color_16 : vec4<f32>,
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
fn fsList( _S197 : pixelInput_7, @builtin(front_facing) frontFacing_4 : bool, @builtin(sample_mask) mask_4 : u32, @builtin(position) position_10 : vec4<f32>)
{
    var _S198 : SurfaceVaryings_0 = SurfaceVaryings_0( position_10, _S197.normal_9, _S197.uv_14, _S197.color_16, _S197.ids_8, _S197.relPosition_14, _S197.tangent_8, _S197.airInscatter_8, _S197.airTransmittance_9, _S197.positionMC_8, _S197.named0_8, _S197.named1_8, _S197.named2_8, _S197.named3_8 );
    terrainSeen_0 = true;
    surfaceLight_0 = true;
    var slope_2 : vec2<f32> = depthSlope_0(position_10);
    var s_6 : Surface_0 = shadeSurface_0(_S198, frontFacing_4, true);
    appendNode_0(_S198, slope_2, s_6, mask_4);
    return;
}

struct pixelInput_8
{
    @location(0) normal_10 : vec3<f32>,
    @location(1) uv_15 : vec2<f32>,
    @location(2) color_17 : vec4<f32>,
    @interpolate(flat) @location(3) ids_9 : vec3<u32>,
    @location(4) relPosition_15 : vec3<f32>,
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
fn fsListSamples( _S199 : pixelInput_8, @builtin(front_facing) frontFacing_5 : bool, @builtin(sample_mask) mask_5 : u32, @builtin(sample_index) sample_0 : u32, @builtin(position) position_11 : vec4<f32>)
{
    var _S200 : SurfaceVaryings_0 = SurfaceVaryings_0( position_11, _S199.normal_10, _S199.uv_15, _S199.color_17, _S199.ids_9, _S199.relPosition_15, _S199.tangent_9, _S199.airInscatter_9, _S199.airTransmittance_10, _S199.positionMC_9, _S199.named0_9, _S199.named1_9, _S199.named2_9, _S199.named3_9 );
    terrainSeen_0 = true;
    surfaceLight_0 = true;
    var slope_3 : vec2<f32> = depthSlope_0(position_11);
    var writes_0 : bool = sample_0 == (firstbitlow_0(mask_5));
    surfaceLight_0 = writes_0;
    var s_7 : Surface_0 = shadeSurface_0(_S200, frontFacing_5, true);
    if(writes_0)
    {
        appendNode_0(_S200, slope_3, s_7, mask_5);
    }
    return;
}

fn blendedAlpha_0( in_6 : SurfaceVaryings_0) -> f32
{
    var _S201 : u32 = in_6.ids_0.x;
    var alpha_13 : f32 = materialAlpha_0(in_6);
    if(clippedOut_0(_S201, in_6.relPosition_0))
    {
        discard;
    }
    return clamp(alpha_13, 0.0f, 1.0f);
}

fn uncovered_0( position_12 : vec4<f32>,  slope_4 : vec2<f32>) -> f32
{
    var width_2 : u32;
    var height_2 : u32;
    var samples_2 : u32;
    {var dim = textureDimensions((opaqueDepth_0));((width_2)) = dim.x;((height_2)) = dim.y;((samples_2)) = textureNumSamples((opaqueDepth_0));};
    return f32(countOneBits(visibleSamples_0(position_12, slope_4, u32(4294967295)))) / f32(samples_2);
}

fn momentDepth_0( relPosition_16 : vec3<f32>) -> f32
{
    return clamp((log(max(length(relPosition_16), 9.99999997475242708e-07f)) - translucency_0.logNear_0) * translucency_0.invLogRange_0, 0.0f, 1.0f) * 2.0f - 1.0f;
}

struct MomentsOut_0
{
    @location(0) zero_0 : f32,
    @location(1) higher_0 : vec4<f32>,
};

struct pixelInput_9
{
    @location(0) normal_11 : vec3<f32>,
    @location(1) uv_16 : vec2<f32>,
    @location(2) color_18 : vec4<f32>,
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
fn fsMoments( _S202 : pixelInput_9, @builtin(position) position_13 : vec4<f32>) -> MomentsOut_0
{
    var _S203 : SurfaceVaryings_0 = SurfaceVaryings_0( position_13, _S202.normal_11, _S202.uv_16, _S202.color_18, _S202.ids_10, _S202.relPosition_17, _S202.tangent_10, _S202.airInscatter_10, _S202.airTransmittance_11, _S202.positionMC_10, _S202.named0_10, _S202.named1_10, _S202.named2_10, _S202.named3_10 );
    terrainSeen_0 = true;
    surfaceLight_0 = true;
    var slope_5 : vec2<f32> = depthSlope_0(position_13);
    var blended_0 : f32 = blendedAlpha_0(_S203);
    var alpha_14 : f32 = blended_0 * uncovered_0(position_13, slope_5);
    var _S204 : bool;
    if((alpha_14 <= 0.0f))
    {
        _S204 = true;
    }
    else
    {
        _S204 = (blended_0 >= 0.99949997663497925f);
    }
    if(_S204)
    {
        discard;
    }
    var absorbance_0 : f32 = - log(1.0f - alpha_14);
    var z_3 : f32 = momentDepth_0(_S202.relPosition_17);
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
    var b_3 : vec4<f32> = mix(sums_0 / vec4<f32>(b0_0), vec4<f32>(0.0f, 0.375f, 0.0f, 0.375f), vec4<f32>(translucency_0.bias_0));
    var _S205 : f32 = b_3.x;
    var _S206 : f32 = b_3.y;
    var l21d11_0 : f32 = b_3.z - _S205 * _S206;
    var invD11_0 : f32 = 1.0f / (_S206 - _S205 * _S205);
    var l21_0 : f32 = l21d11_0 * invD11_0;
    var d22_0 : f32 = b_3.w - _S206 * _S206 - l21d11_0 * l21_0;
    var c_4 : vec3<f32> = vec3<f32>(1.0f, z_4, z_4 * z_4);
    var _S207 : f32 = c_4[i32(1)] - _S205;
    c_4[i32(1)] = _S207;
    var _S208 : f32 = c_4[i32(2)] - (_S206 + l21_0 * c_4.y);
    var _S209 : f32 = _S207 * invD11_0;
    c_4[i32(1)] = _S209;
    c_4[i32(2)] = _S208 / d22_0;
    c_4[i32(1)] = _S209 - l21_0 * c_4.z;
    var _S210 : vec2<f32> = b_3.xy;
    c_4[i32(0)] = c_4[i32(0)] - dot(c_4.yz, _S210);
    if(!((abs(c_4.z)) > (9.9999997473787516e-06f * max(abs(c_4.x), abs(c_4.y)))))
    {
        return exp(- b0_0 * 0.25f);
    }
    var p_4 : f32 = c_4.y / c_4.z;
    var r_0 : f32 = sqrt(max(p_4 * p_4 * 0.25f - c_4.x / c_4.z, 0.0f));
    var _S211 : f32 = - p_4 * 0.5f;
    var z1_0 : f32 = _S211 - r_0;
    var z2_1 : f32 = _S211 + r_0;
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
    return clamp(exp(- b0_0 * (0.25f - k1_0 * z_4 + dot(_S210, vec2<f32>(k1_0 - f012_0 * z_4, f012_0)))), 0.0f, 1.0f);
}

struct AccumulatedOut_0
{
    @location(0) lit_4 : vec4<f32>,
    @location(1) unlit_3 : vec4<f32>,
};

struct pixelInput_10
{
    @location(0) normal_12 : vec3<f32>,
    @location(1) uv_17 : vec2<f32>,
    @location(2) color_19 : vec4<f32>,
    @interpolate(flat) @location(3) ids_11 : vec3<u32>,
    @location(4) relPosition_18 : vec3<f32>,
    @location(5) tangent_11 : vec4<f32>,
    @location(6) airInscatter_11 : vec3<f32>,
    @location(7) airTransmittance_12 : vec3<f32>,
    @location(8) positionMC_11 : vec3<f32>,
    @location(9) named0_11 : vec4<f32>,
    @location(10) named1_11 : vec4<f32>,
    @location(11) named2_11 : vec4<f32>,
    @location(12) named3_11 : vec4<f32>,
};

@fragment
fn fsMomentColor( _S212 : pixelInput_10, @builtin(front_facing) frontFacing_6 : bool, @builtin(position) position_14 : vec4<f32>) -> AccumulatedOut_0
{
    var _S213 : SurfaceVaryings_0 = SurfaceVaryings_0( position_14, _S212.normal_12, _S212.uv_17, _S212.color_19, _S212.ids_11, _S212.relPosition_18, _S212.tangent_11, _S212.airInscatter_11, _S212.airTransmittance_12, _S212.positionMC_11, _S212.named0_11, _S212.named1_11, _S212.named2_11, _S212.named3_11 );
    terrainSeen_0 = true;
    surfaceLight_0 = true;
    var slope_6 : vec2<f32> = depthSlope_0(position_14);
    var s_8 : Surface_0 = shadeSurface_0(_S213, frontFacing_6, true);
    var alpha_15 : f32 = clamp(s_8.alpha_4, 0.0f, 1.0f) * uncovered_0(position_14, slope_6);
    var _S214 : bool;
    if((alpha_15 <= 0.0f))
    {
        _S214 = true;
    }
    else
    {
        _S214 = ((s_8.alpha_4) >= 0.99949997663497925f);
    }
    if(_S214)
    {
        discard;
    }
    var _S215 : vec2<u32> = vec2<u32>(position_14.xy);
    var _S216 : vec4<f32> = (textureLoad(momentsZero, (_S215)));
    var b0_1 : f32 = _S216.x;
    var sums_1 : vec4<f32> = (textureLoad(momentsHigher, (_S215)));
    var w_2 : f32 = transmittanceBefore_0(b0_1, sums_1, momentDepth_0(_S212.relPosition_18)) * alpha_15;
    var _S217 : vec3<f32> = min(s_8.color_9 * vec3<f32>(w_2), vec3<f32>(16384.0f));
    var out_3 : AccumulatedOut_0;
    var _S218 : vec3<f32>;
    if(s_8.unlit_1)
    {
        _S218 = vec3<f32>(0.0f);
    }
    else
    {
        _S218 = _S217;
    }
    out_3.lit_4 = vec4<f32>(_S218, w_2);
    var sceneLuminance_0 : f32 = dot(_S217, vec3<f32>(0.2125999927520752f, 0.71520000696182251f, 0.072200000286102295f)) * s_8.sceneShare_0;
    var _S219 : vec4<f32>;
    if(s_8.unlit_1)
    {
        _S219 = vec4<f32>(_S217, 0.0f);
    }
    else
    {
        _S219 = vec4<f32>(vec3<f32>(0.0f), sceneLuminance_0);
    }
    out_3.unlit_3 = _S219;
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
    var _S220 : u32 = (bitcast<u32>((vertices_0[directory_0])));
    var i_2 : u32 = u32(0);
    loop
    {
        if((i_2 < u32(256)))
        {
        }
        else
        {
            break;
        }
        if((i_2 >= _S220))
        {
            break;
        }
        var entry_1 : u32 = directory_0 + u32(1) + i_2 * u32(3);
        if((bitcast<u32>((vertices_0[entry_1]))) == hash_0)
        {
            var components_0 : u32 = (bitcast<u32>((vertices_0[entry_1 + u32(2)])));
            if((components_0 >= u32(2147483648)))
            {
                break;
            }
            var row_0 : u32;
            var size_2 : u32;
            if((components_0 >= u32(1073741824)))
            {
                if(feature_1 == u32(4294967295))
                {
                    break;
                }
                var _S221 : u32 = (components_0 & (u32(255)));
                row_0 = feature_1;
                size_2 = _S221;
            }
            else
            {
                row_0 = vertexIndex_0;
                size_2 = components_0;
            }
            var _S222 : u32 = (bitcast<u32>((vertices_0[entry_1 + u32(1)]))) + row_0 * size_2;
            var c_5 : u32 = u32(0);
            loop
            {
                if((c_5 < u32(4)))
                {
                }
                else
                {
                    break;
                }
                if((c_5 >= size_2))
                {
                    break;
                }
                value_1[c_5] = vertices_0[_S222 + c_5];
                c_5 = c_5 + u32(1);
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
    var _S223 : u32 = records_0[draw_0].instanceDirectory_0;
    var _S224 : bool;
    if((records_0[draw_0].instanceDirectory_0) == u32(4294967295))
    {
        _S224 = true;
    }
    else
    {
        _S224 = (records_0[draw_0].instanceStreams_0) == u32(4294967295);
    }
    if(_S224)
    {
        return bits_0;
    }
    var _S225 : u32 = (bitcast<u32>((vertices_0[_S223])));
    var i_3 : u32 = u32(0);
    loop
    {
        if((i_3 < u32(256)))
        {
        }
        else
        {
            break;
        }
        if((i_3 >= _S225))
        {
            break;
        }
        var entry_2 : u32 = _S223 + u32(1) + i_3 * u32(3);
        if((bitcast<u32>((vertices_0[entry_2]))) == hash_1)
        {
            var _S226 : u32 = records_0[draw_0].instanceStreams_0 + instance_1 * records_0[draw_0].instanceStride_0 + (bitcast<u32>((vertices_0[entry_2 + u32(1)])));
            var _S227 : u32 = (bitcast<u32>((vertices_0[entry_2 + u32(2)])));
            var c_6 : u32 = u32(0);
            loop
            {
                if((c_6 < u32(4)))
                {
                }
                else
                {
                    break;
                }
                if((c_6 >= _S227))
                {
                    break;
                }
                bits_0[c_6] = (bitcast<u32>((vertices_0[_S226 + c_6])));
                c_6 = c_6 + u32(1);
            }
            break;
        }
        i_3 = i_3 + u32(1);
    }
    return bits_0;
}

fn propertyTexel_0( slot_3 : u32,  uv_18 : vec2<f32>) -> vec4<u32>
{
    var width_3 : u32;
    var height_3 : u32;
    var texel_0 : vec4<f32>;
    if(slot_3 == u32(0))
    {
        {var dim = textureDimensions((propertyTexture0_0));((width_3)) = dim.x;((height_3)) = dim.y;};
        var size_3 : vec2<u32> = vec2<u32>(width_3, height_3);
        var _S228 : vec3<i32> = vec3<i32>(vec2<i32>(min(vec2<u32>(fract(uv_18) * vec2<f32>(size_3)), size_3 - vec2<u32>(u32(1)))), i32(0));
        texel_0 = (textureLoad((propertyTexture0_0), ((_S228)).xy, ((_S228)).z));
    }
    else
    {
        {var dim = textureDimensions((propertyTexture1_0));((width_3)) = dim.x;((height_3)) = dim.y;};
        var size_4 : vec2<u32> = vec2<u32>(width_3, height_3);
        var _S229 : vec3<i32> = vec3<i32>(vec2<i32>(min(vec2<u32>(fract(uv_18) * vec2<f32>(size_4)), size_4 - vec2<u32>(u32(1)))), i32(0));
        texel_0 = (textureLoad((propertyTexture1_0), ((_S229)).xy, ((_S229)).z));
    }
    return vec4<u32>(round(texel_0 * vec4<f32>(255.0f)));
}

fn readFragmentProperty( directory_1 : u32,  hash_2 : u32,  uv_19 : vec2<f32>,  feature_2 : u32,  fallback_0 : vec4<f32>) -> vec4<f32>
{
    if(directory_1 == u32(4294967295))
    {
        return fallback_0;
    }
    var _S230 : u32 = (bitcast<u32>((vertices_0[directory_1])));
    var i_4 : u32 = u32(0);
    loop
    {
        if((i_4 < u32(256)))
        {
        }
        else
        {
            break;
        }
        if((i_4 >= _S230))
        {
            break;
        }
        var entry_3 : u32 = directory_1 + u32(1) + i_4 * u32(3);
        if((bitcast<u32>((vertices_0[entry_3]))) != hash_2)
        {
            i_4 = i_4 + u32(1);
            continue;
        }
        var info_0 : u32 = (bitcast<u32>((vertices_0[entry_3 + u32(2)])));
        if((info_0 < u32(1073741824)))
        {
            return fallback_0;
        }
        var c_7 : u32;
        if((info_0 < u32(2147483648)))
        {
            var value_2 : vec4<f32> = vec4<f32>(0.0f);
            if(feature_2 != u32(4294967295))
            {
                var size_5 : u32 = (info_0 & (u32(255)));
                var _S231 : u32 = (bitcast<u32>((vertices_0[entry_3 + u32(1)]))) + feature_2 * size_5;
                c_7 = u32(0);
                loop
                {
                    if((c_7 < u32(4)))
                    {
                    }
                    else
                    {
                        break;
                    }
                    if((c_7 >= size_5))
                    {
                        break;
                    }
                    value_2[c_7] = vertices_0[_S231 + c_7];
                    c_7 = c_7 + u32(1);
                }
            }
            return value_2;
        }
        var b_4 : u32 = (bitcast<u32>((vertices_0[entry_3 + u32(1)])));
        var _S232 : vec4<u32> = propertyTexel_0((bitcast<u32>((vertices_0[b_4]))), uv_19);
        var _S233 : u32 = min((bitcast<u32>((vertices_0[b_4 + u32(1)]))), u32(4));
        var _S234 : u32 = (bitcast<u32>((vertices_0[b_4 + u32(2)])));
        var kind_0 : u32 = (bitcast<u32>((vertices_0[b_4 + u32(3)])));
        var _S235 : u32 = min((bitcast<u32>((vertices_0[b_4 + u32(4)]))), u32(4));
        var _S236 : bool = (bitcast<u32>((vertices_0[b_4 + u32(5)]))) != u32(0);
        var bytes_0 : array<u32, i32(4)>;
        bytes_0[i32(0)] = u32(0);
        bytes_0[i32(1)] = u32(0);
        bytes_0[i32(2)] = u32(0);
        bytes_0[i32(3)] = u32(0);
        var k_0 : u32 = u32(0);
        loop
        {
            if((k_0 < u32(4)))
            {
            }
            else
            {
                break;
            }
            if((k_0 >= _S233))
            {
                break;
            }
            bytes_0[k_0] = _S232[(((_S234 >> ((k_0 * u32(8))))) & (u32(3)))];
            k_0 = k_0 + u32(1);
        }
        if((kind_0 <= u32(1)))
        {
            i_4 = u32(1);
        }
        else
        {
            var _S237 : bool;
            if(kind_0 == u32(2))
            {
                _S237 = true;
            }
            else
            {
                _S237 = kind_0 == u32(3);
            }
            if(_S237)
            {
                i_4 = u32(2);
            }
            else
            {
                i_4 = u32(4);
            }
        }
        var value_3 : vec4<f32> = vec4<f32>(0.0f);
        c_7 = u32(0);
        loop
        {
            if((c_7 < u32(4)))
            {
            }
            else
            {
                break;
            }
            if((c_7 >= _S235))
            {
                break;
            }
            k_0 = u32(0);
            var raw_0 : u32 = u32(0);
            loop
            {
                if((k_0 < u32(4)))
                {
                }
                else
                {
                    break;
                }
                if((k_0 >= i_4))
                {
                    break;
                }
                var at_0 : u32 = c_7 * i_4 + k_0;
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
                    if(_S236)
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
                    if(_S236)
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
                    if(_S236)
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
                    if(_S236)
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
                    if(_S236)
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
                    if(_S236)
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
            value_3[c_7] = v_3 * vertices_0[b_4 + u32(10) + c_7] + vertices_0[b_4 + u32(6) + c_7];
            c_7 = c_7 + u32(1);
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
     designPositionMC : vec3<f32>,
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
    var b_5 : u32 = offset_0 + index_1 * u32(4);
    return vec4<f32>(vertices_0[b_5], vertices_0[b_5 + u32(1)], vertices_0[b_5 + u32(2)], vertices_0[b_5 + u32(3)]);
}

fn read3_0( offset_1 : u32,  index_2 : u32) -> vec3<f32>
{
    var b_6 : u32 = offset_1 + index_2 * u32(3);
    return vec3<f32>(vertices_0[b_6], vertices_0[b_6 + u32(1)], vertices_0[b_6 + u32(2)]);
}

fn read2_0( offset_2 : u32,  index_3 : u32) -> vec2<f32>
{
    var b_7 : u32 = offset_2 + index_3 * u32(2);
    return vec2<f32>(vertices_0[b_7], vertices_0[b_7 + u32(1)]);
}

fn placementParameter_0( word_2 : u32) -> f32
{
    return placements_0[(word_2 >> (u32(2)))][(word_2 & (u32(3)))];
}

fn powerOf_0( x_1 : f32,  e_1 : u32) -> f32
{
    var _S238 : f32;
    if(e_1 == u32(0))
    {
        _S238 = 1.0f;
    }
    else
    {
        if(e_1 == u32(1))
        {
            _S238 = x_1;
        }
        else
        {
            if(e_1 == u32(2))
            {
                _S238 = x_1 * x_1;
            }
            else
            {
                _S238 = x_1 * x_1 * x_1;
            }
        }
    }
    return _S238;
}

fn fittedDisplacement_0( body_0 : u32,  p_5 : vec3<f32>) -> vec3<f32>
{
    var _S239 : vec4<f32> = placements_0[body_0];
    var _S240 : vec3<f32> = (p_5 - _S239.xyz) * vec3<f32>(_S239.w);
    var _S241 : vec3<f32> = vec3<f32>(0.0f);
    var k_1 : u32 = u32(0);
    var d_3 : vec3<f32> = _S241;
    loop
    {
        if((k_1 < u32(20)))
        {
        }
        else
        {
            break;
        }
        var d_4 : vec3<f32> = d_3 + placements_0[body_0 + u32(1) + k_1].xyz * vec3<f32>((powerOf_0(_S240.x, ((TERM_POWERS_0[k_1]) & (u32(3)))) * powerOf_0(_S240.y, ((((TERM_POWERS_0[k_1]) >> (u32(2)))) & (u32(3)))) * powerOf_0(_S240.z, ((((TERM_POWERS_0[k_1]) >> (u32(4)))) & (u32(3))))));
        k_1 = k_1 + u32(1);
        d_3 = d_4;
    }
    return d_3;
}

fn placePosition_0( placement_1 : u32,  positionMC_12 : vec3<f32>,  vertexIndex_1 : u32,  directory_2 : u32,  feature_3 : u32) -> vec3<f32>
{
    if(placement_1 == u32(4294967295))
    {
        return positionMC_12;
    }
    var header_0 : vec4<u32> = (bitcast<vec4<u32>>((placements_0[placement_1])));
    var _S242 : u32 = header_0.x;
    if(_S242 == u32(1))
    {
        var _S243 : vec4<f32> = (readNamed((directory_2), (header_0.z), (vertexIndex_1), (feature_3)));
        return mix(positionMC_12, _S243.xyz, vec3<f32>(placementParameter_0(header_0.y)));
    }
    if(_S242 == u32(2))
    {
        return positionMC_12 + fittedDisplacement_0(placement_1 + u32(1), positionMC_12);
    }
    if(_S242 == u32(3))
    {
        var t_4 : f32 = placementParameter_0(header_0.y);
        var _S244 : vec3<f32> = vec3<f32>(0.0f);
        var _S245 : u32 = header_0.z;
        var from_0 : vec3<f32>;
        if(_S245 != u32(4294967295))
        {
            from_0 = fittedDisplacement_0(_S245, positionMC_12);
        }
        else
        {
            from_0 = _S244;
        }
        var _S246 : u32 = header_0.w;
        var to_0 : vec3<f32>;
        if(_S246 != u32(4294967295))
        {
            to_0 = fittedDisplacement_0(_S246, positionMC_12);
        }
        else
        {
            to_0 = _S244;
        }
        return positionMC_12 + mix(from_0, to_0, vec3<f32>(t_4));
    }
    return positionMC_12;
}

fn column3_0( m_4 : mat4x4<f32>,  c_8 : i32) -> vec3<f32>
{
    return vec3<f32>(m_4[i32(0)][c_8], m_4[i32(1)][c_8], m_4[i32(2)][c_8]);
}

fn airTransmittanceUv_0( r_1 : f32,  mu_1 : f32,  bottom_0 : f32,  top_0 : f32) -> vec2<f32>
{
    var _S247 : f32 = top_0 * top_0;
    var _S248 : f32 = bottom_0 * bottom_0;
    var h_1 : f32 = sqrt(_S247 - _S248);
    var _S249 : f32 = r_1 * r_1;
    var rho_0 : f32 = sqrt(max(0.0f, _S249 - _S248));
    var dMin_0 : f32 = top_0 - r_1;
    return vec2<f32>(0.001953125f + (max(0.0f, - r_1 * mu_1 + sqrt(max(_S249 * (mu_1 * mu_1 - 1.0f) + _S247, 0.0f))) - dMin_0) / (rho_0 + h_1 - dMin_0) * 0.99609375f, 0.0078125f + rho_0 / h_1 * 0.984375f);
}

fn sunAbove_0( r_2 : f32,  mu_2 : f32,  bottom_1 : f32,  soft_0 : f32) -> f32
{
    return clamp(0.5f + (asin(clamp(mu_2, -1.0f, 1.0f)) - asin(- sqrt(max(0.0f, 1.0f - bottom_1 / r_2 * (bottom_1 / r_2))))) / soft_0, 0.0f, 1.0f);
}

fn aerialMarch_0( relPosition_19 : vec3<f32>) -> AerialPerspective_0
{
    var a_2 : AirGroup_std140_0 = air_0.groups_0.data_3[i32(0)];
    var b_8 : AirGroup_std140_0 = air_0.groups_0.data_3[i32(1)];
    var clearAir_0 : AerialPerspective_0;
    clearAir_0.inscatter_0 = vec3<f32>(0.0f);
    clearAir_0.transmittance_0 = vec3<f32>(1.0f);
    var meters_0 : f32 = length(relPosition_19);
    var direction_1 : vec3<f32> = relPosition_19 / vec3<f32>(max(meters_0, 9.99999997475242708e-07f));
    var _S250 : vec3<f32> = vec3<f32>(1000.0f);
    var radii_1 : vec3<f32> = view_0.bodyRadii_0.xyz / _S250;
    var origin_0 : vec3<f32> = cameraPosition_0() / _S250;
    var r_3 : f32 = length(origin_0);
    var mu_3 : f32 = dot(origin_0, direction_1) / r_3;
    var outer_0 : f32 = max(radii_1.x, max(radii_1.y, radii_1.z)) + air_0.groups_0.data_3[i32(0)].topRadius_0 - air_0.groups_0.data_3[i32(0)].bottomRadius_0;
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
    var _S251 : f32 = 1.0f + nu_0 * nu_0;
    var _S252 : f32 = 0.059683103114366531f * _S251;
    var _S253 : f32 = a_2.miePhaseG_0 * a_2.miePhaseG_0;
    var _S254 : f32 = 0.11936620622873306f * (1.0f - _S253);
    var _S255 : f32 = 2.0f + _S253;
    var _S256 : f32 = 1.0f + _S253;
    var _S257 : f32 = 2.0f * a_2.miePhaseG_0;
    var _S258 : f32 = _S254 / _S255 * _S251 / pow(_S256 - _S257 * nu_0, 1.5f);
    var moonShare_0 : f32 = view_0.sunDirection_0.w;
    var moon_0 : vec3<f32> = view_0.moonLight_0.xyz;
    var moonNu_0 : f32 = dot(direction_1, moon_0);
    var _S259 : f32 = 1.0f + moonNu_0 * moonNu_0;
    var _S260 : f32 = 0.059683103114366531f * _S259 * moonShare_0;
    var _S261 : f32 = _S254 / _S255 * _S259 / pow(_S256 - _S257 * moonNu_0, 1.5f) * moonShare_0;
    var _S262 : vec4<f32> = vec4<f32>(0.0f);
    var _S263 : vec4<f32> = vec4<f32>(1.0f);
    var t0_0 : f32 = start_0;
    var i_5 : i32 = i32(1);
    var transmittanceA_0 : vec4<f32> = _S263;
    var radianceA_0 : vec4<f32> = _S262;
    var transmittanceB_0 : vec4<f32> = _S263;
    var radianceB_0 : vec4<f32> = _S262;
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
        var p_6 : vec3<f32> = origin_0 + direction_1 * vec3<f32>((0.5f * (t0_0 + t1_0)));
        var distance_1 : f32 = length(p_6);
        var _S264 : f32 = max(distance_1 - distance_1 / length(p_6 / radii_1), 0.0010000000474974513f);
        var rp_0 : f32 = a_2.bottomRadius_0 + _S264;
        var _S265 : vec3<f32> = radii_1 * radii_1;
        var muSun_0 : f32 = dot(normalize(p_6 / _S265), sun_0);
        var _S266 : f32 = - _S264;
        var rayleighDensity_0 : f32 = exp(_S266 / a_2.rayleighScaleHeight_0);
        var mieDensity_0 : f32 = exp(_S266 / a_2.mieScaleHeight_0);
        var ozoneDensity_0 : f32;
        if((_S264 < 25.0f))
        {
            ozoneDensity_0 = clamp(_S264 / 15.0f - 0.66666668653488159f, 0.0f, 1.0f);
        }
        else
        {
            ozoneDensity_0 = clamp(_S266 / 15.0f + 2.6666667461395264f, 0.0f, 1.0f);
        }
        var _S267 : f32 = max(0.017500000074505806f, dt_0 / rp_0);
        var uv_20 : vec2<f32> = airTransmittanceUv_0(rp_0, muSun_0, a_2.bottomRadius_0, a_2.topRadius_0);
        var _S268 : vec3<f32> = vec3<f32>(uv_20, 0.0f);
        var _S269 : vec4<f32> = vec4<f32>(sunAbove_0(rp_0, muSun_0, a_2.bottomRadius_0, _S267));
        var sunA_0 : vec4<f32> = (textureSampleLevel((airTransmittance_0), (environmentSampler_0), ((_S268)).xy, i32(((_S268)).z), (0.0f))) * _S269;
        var _S270 : vec3<f32> = vec3<f32>(uv_20, 1.0f);
        var sunB_0 : vec4<f32> = (textureSampleLevel((airTransmittance_0), (environmentSampler_0), ((_S270)).xy, i32(((_S270)).z), (0.0f))) * _S269;
        var _S271 : f32 = 0.015625f + clamp(_S264 / (a_2.topRadius_0 - a_2.bottomRadius_0), 0.0f, 1.0f) * 0.96875f;
        var msUv_0 : vec2<f32> = vec2<f32>(0.015625f + (muSun_0 * 0.5f + 0.5f) * 0.96875f, _S271);
        var _S272 : vec3<f32> = vec3<f32>(msUv_0, 0.0f);
        var msA_0 : vec4<f32> = (textureSampleLevel((airMultipleScattering_0), (environmentSampler_0), ((_S272)).xy, i32(((_S272)).z), (0.0f)));
        var _S273 : vec3<f32> = vec3<f32>(msUv_0, 1.0f);
        var msB_0 : vec4<f32> = (textureSampleLevel((airMultipleScattering_0), (environmentSampler_0), ((_S273)).xy, i32(((_S273)).z), (0.0f)));
        var moonA_0 : vec4<f32>;
        var moonMsA_0 : vec4<f32>;
        var moonB_0 : vec4<f32>;
        var moonMsB_0 : vec4<f32>;
        if((moonShare_0 > 0.0f))
        {
            var muMoon_0 : f32 = dot(normalize(p_6 / _S265), moon_0);
            var moonUv_0 : vec2<f32> = airTransmittanceUv_0(rp_0, muMoon_0, a_2.bottomRadius_0, a_2.topRadius_0);
            var _S274 : vec3<f32> = vec3<f32>(moonUv_0, 0.0f);
            var _S275 : vec4<f32> = vec4<f32>(sunAbove_0(rp_0, muMoon_0, a_2.bottomRadius_0, _S267));
            var _S276 : vec3<f32> = vec3<f32>(moonUv_0, 1.0f);
            var _S277 : vec4<f32> = (textureSampleLevel((airTransmittance_0), (environmentSampler_0), ((_S276)).xy, i32(((_S276)).z), (0.0f))) * _S275;
            var moonMsUv_0 : vec2<f32> = vec2<f32>(0.015625f + (muMoon_0 * 0.5f + 0.5f) * 0.96875f, _S271);
            var _S278 : vec3<f32> = vec3<f32>(moonMsUv_0, 0.0f);
            var _S279 : vec4<f32> = vec4<f32>(moonShare_0);
            var _S280 : vec4<f32> = (textureSampleLevel((airMultipleScattering_0), (environmentSampler_0), ((_S278)).xy, i32(((_S278)).z), (0.0f))) * _S279;
            var _S281 : vec3<f32> = vec3<f32>(moonMsUv_0, 1.0f);
            var _S282 : vec4<f32> = (textureSampleLevel((airMultipleScattering_0), (environmentSampler_0), ((_S281)).xy, i32(((_S281)).z), (0.0f))) * _S279;
            moonA_0 = (textureSampleLevel((airTransmittance_0), (environmentSampler_0), ((_S274)).xy, i32(((_S274)).z), (0.0f))) * _S275;
            moonMsA_0 = _S280;
            moonB_0 = _S277;
            moonMsB_0 = _S282;
        }
        else
        {
            moonA_0 = _S262;
            moonMsA_0 = _S262;
            moonB_0 = _S262;
            moonMsB_0 = _S262;
        }
        var _S283 : vec4<f32> = vec4<f32>(rayleighDensity_0);
        var rayleigh_0 : vec4<f32> = a_2.rayleighScattering_0 * _S283;
        var _S284 : vec4<f32> = vec4<f32>(mieDensity_0);
        var mie_0 : vec4<f32> = a_2.mieScattering_0 * _S284;
        var extinction_0 : vec4<f32> = rayleigh_0 + a_2.mieExtinction_0 * _S284 + a_2.ozoneAbsorption_0 * vec4<f32>(ozoneDensity_0);
        var _S285 : vec4<f32> = vec4<f32>(_S252);
        var _S286 : vec4<f32> = vec4<f32>(_S258);
        var _S287 : vec4<f32> = rayleigh_0 + mie_0;
        var _S288 : vec4<f32> = vec4<f32>(_S260);
        var _S289 : vec4<f32> = vec4<f32>(_S261);
        var _S290 : vec4<f32> = vec4<f32>(dt_0);
        var segment_0 : vec4<f32> = exp((vec4<f32>(0) - extinction_0) * _S290);
        var _S291 : vec4<f32> = vec4<f32>(1.0f);
        var _S292 : vec4<f32> = vec4<f32>(9.99999971718068537e-10f);
        var radianceA_1 : vec4<f32> = radianceA_0 + transmittanceA_0 * ((rayleigh_0 * _S285 + mie_0 * _S286) * sunA_0 + _S287 * msA_0 + (rayleigh_0 * _S288 + mie_0 * _S289) * moonA_0 + _S287 * moonMsA_0) * (_S291 - segment_0) / max(extinction_0, _S292);
        var transmittanceA_1 : vec4<f32> = transmittanceA_0 * segment_0;
        var rayleigh_1 : vec4<f32> = b_8.rayleighScattering_0 * _S283;
        var mie_1 : vec4<f32> = b_8.mieScattering_0 * _S284;
        var extinction_1 : vec4<f32> = rayleigh_1 + b_8.mieExtinction_0 * _S284 + b_8.ozoneAbsorption_0 * vec4<f32>(ozoneDensity_0);
        var _S293 : vec4<f32> = rayleigh_1 + mie_1;
        var segment_1 : vec4<f32> = exp((vec4<f32>(0) - extinction_1) * _S290);
        var radianceB_1 : vec4<f32> = radianceB_0 + transmittanceB_0 * ((rayleigh_1 * _S285 + mie_1 * _S286) * sunB_0 + _S293 * msB_0 + (rayleigh_1 * _S288 + mie_1 * _S289) * moonB_0 + _S293 * moonMsB_0) * (_S291 - segment_1) / max(extinction_1, _S292);
        var transmittanceB_1 : vec4<f32> = transmittanceB_0 * segment_1;
        var _S294 : i32 = i_5 + i32(1);
        t0_0 = t1_0;
        i_5 = _S294;
        transmittanceA_0 = transmittanceA_1;
        radianceA_0 = radianceA_1;
        transmittanceB_0 = transmittanceB_1;
        radianceB_0 = radianceB_1;
    }
    var la_0 : vec4<f32> = radianceA_0 * a_2.solarIrradiance_0;
    var lb_0 : vec4<f32> = radianceB_0 * b_8.solarIrradiance_0;
    var transmittance_2 : vec3<f32> = (vec3<f32>(transmittanceA_0.x) * air_0.weights_0[i32(0)].xyz + vec3<f32>(transmittanceA_0.y) * air_0.weights_0[i32(1)].xyz + vec3<f32>(transmittanceA_0.z) * air_0.weights_0[i32(2)].xyz + vec3<f32>(transmittanceA_0.w) * air_0.weights_0[i32(3)].xyz + vec3<f32>(transmittanceB_0.x) * air_0.weights_0[i32(4)].xyz + vec3<f32>(transmittanceB_0.y) * air_0.weights_0[i32(5)].xyz + vec3<f32>(transmittanceB_0.z) * air_0.weights_0[i32(6)].xyz + vec3<f32>(transmittanceB_0.w) * air_0.weights_0[i32(7)].xyz) / (air_0.weights_0[i32(0)].xyz + air_0.weights_0[i32(1)].xyz + air_0.weights_0[i32(2)].xyz + air_0.weights_0[i32(3)].xyz + air_0.weights_0[i32(4)].xyz + air_0.weights_0[i32(5)].xyz + air_0.weights_0[i32(6)].xyz + air_0.weights_0[i32(7)].xyz);
    var result_1 : AerialPerspective_0;
    result_1.inscatter_0 = (vec3<f32>(la_0.x) * air_0.weights_0[i32(0)].xyz + vec3<f32>(la_0.y) * air_0.weights_0[i32(1)].xyz + vec3<f32>(la_0.z) * air_0.weights_0[i32(2)].xyz + vec3<f32>(la_0.w) * air_0.weights_0[i32(3)].xyz + vec3<f32>(lb_0.x) * air_0.weights_0[i32(4)].xyz + vec3<f32>(lb_0.y) * air_0.weights_0[i32(5)].xyz + vec3<f32>(lb_0.z) * air_0.weights_0[i32(6)].xyz + vec3<f32>(lb_0.w) * air_0.weights_0[i32(7)].xyz) * vec3<f32>(view_0.exposure_0);
    result_1.transmittance_0 = transmittance_2;
    return result_1;
}

fn vertexOut_0( vertexIndex_2 : u32,  item_0 : u32,  withAir_0 : bool) -> SurfaceVertex
{
    var p_7 : DrawItem_std430_0 = items_0[item_0];
    var _S295 : u32 = p_7.record_0;
    var _S296 : mat4x4<f32> = mat4x4<f32>(p_7.relModel_0.data_4[i32(0)][i32(0)], p_7.relModel_0.data_4[i32(1)][i32(0)], p_7.relModel_0.data_4[i32(2)][i32(0)], p_7.relModel_0.data_4[i32(3)][i32(0)], p_7.relModel_0.data_4[i32(0)][i32(1)], p_7.relModel_0.data_4[i32(1)][i32(1)], p_7.relModel_0.data_4[i32(2)][i32(1)], p_7.relModel_0.data_4[i32(3)][i32(1)], p_7.relModel_0.data_4[i32(0)][i32(2)], p_7.relModel_0.data_4[i32(1)][i32(2)], p_7.relModel_0.data_4[i32(2)][i32(2)], p_7.relModel_0.data_4[i32(3)][i32(2)], p_7.relModel_0.data_4[i32(0)][i32(3)], p_7.relModel_0.data_4[i32(1)][i32(3)], p_7.relModel_0.data_4[i32(2)][i32(3)], p_7.relModel_0.data_4[i32(3)][i32(3)]);
    var out_4 : SurfaceVertex;
    out_4.uv = vec2<f32>(0.0f);
    var _S297 : u32 = records_0[_S295].flags_0;
    var points_0 : bool = (((records_0[_S295].flags_0) & (u32(64)))) != u32(0);
    var _S298 : vec4<f32> = vec4<f32>(0.0f);
    var anchor_0 : vec4<f32>;
    var instance_2 : u32;
    var position_15 : vec3<f32>;
    if(points_0)
    {
        var _S299 : u32 = vertexIndex_2 % u32(6);
        var instance_3 : u32 = vertexIndex_2 / u32(6);
        var _S300 : vec4<f32> = read4_0(records_0[_S295].positionOffset_0, instance_3);
        var _S301 : vec3<f32> = vec3<f32>(POINT_OFFSET_0[POINT_CORNER_0[_S299]], 0.0f);
        out_4.uv = POINT_UV_0[POINT_CORNER_0[_S299]];
        anchor_0 = _S300;
        instance_2 = instance_3;
        position_15 = _S301;
    }
    else
    {
        var _S302 : vec3<f32> = read3_0(records_0[_S295].positionOffset_0, vertexIndex_2);
        anchor_0 = _S298;
        instance_2 = p_7.instance_0;
        position_15 = _S302;
    }
    var _S303 : vec4<f32> = (((vec4<f32>(anchor_0.xyz, 1.0f)) * (_S296)));
    var _S304 : vec3<f32> = _S303.xyz;
    cesiumAnchor_0 = _S304;
    const _S305 : vec3<f32> = vec3<f32>(0.0f, 0.0f, 1.0f);
    var _S306 : u32 = records_0[_S295].normalOffset_0;
    var normal_13 : vec3<f32>;
    if((records_0[_S295].normalOffset_0) != u32(4294967295))
    {
        normal_13 = read3_0(_S306, vertexIndex_2);
    }
    else
    {
        normal_13 = _S305;
    }
    var _S307 : bool;
    if(!points_0)
    {
        _S307 = (records_0[_S295].uvOffset_0) != u32(4294967295);
    }
    else
    {
        _S307 = false;
    }
    if(_S307)
    {
        out_4.uv = read2_0(records_0[_S295].uvOffset_0, vertexIndex_2);
    }
    var _S308 : vec4<f32> = vec4<f32>(1.0f);
    var _S309 : u32 = records_0[_S295].colorOffset_0;
    var vertexColor_0 : vec4<f32>;
    if((records_0[_S295].colorOffset_0) != u32(4294967295))
    {
        vertexColor_0 = read4_0(_S309, vertexIndex_2);
    }
    else
    {
        vertexColor_0 = _S308;
    }
    out_4.color = unpack4x8unorm(p_7.tint_0) * vertexColor_0;
    out_4.tangent = _S298;
    var _S310 : u32 = records_0[_S295].tangentOffset_0;
    if((records_0[_S295].tangentOffset_0) != u32(4294967295))
    {
        var t_5 : vec4<f32> = read4_0(_S310, vertexIndex_2);
        out_4.tangent = vec4<f32>(normalize((((vec4<f32>(t_5.xyz, 0.0f)) * (_S296))).xyz), t_5.w);
    }
    var _S311 : u32 = records_0[_S295].featureIdOffset_0;
    var _S312 : bool = (records_0[_S295].featureIdOffset_0) != u32(4294967295);
    var localFeature_0 : u32;
    if(_S312)
    {
        localFeature_0 = (bitcast<u32>((vertices_0[_S311 + vertexIndex_2])));
    }
    else
    {
        localFeature_0 = u32(4294967295);
    }
    var tableFeature_0 : u32;
    if(_S311 == u32(4294967295))
    {
        tableFeature_0 = u32(0);
    }
    else
    {
        tableFeature_0 = localFeature_0;
    }
    var _S313 : bool = (p_7.feature_0) != u32(0);
    if(_S313)
    {
        tableFeature_0 = p_7.feature_0 - records_0[_S295].featureId_0;
    }
    if(points_0)
    {
        tableFeature_0 = instance_2;
        localFeature_0 = instance_2;
    }
    var position_16 : vec3<f32> = placePosition_0(records_0[_S295].placement_0, position_15, vertexIndex_2, records_0[_S295].attributes_0, tableFeature_0);
    var v_7 : CesiumVertex;
    v_7.positionMC = position_16;
    v_7.designPositionMC = position_15;
    v_7.normalMC = normal_13;
    v_7.texCoord0 = out_4.uv;
    v_7.color0 = vertexColor_0;
    v_7.featureId0 = localFeature_0;
    v_7.vertexIndex = vertexIndex_2;
    v_7.instanceIndex = instance_2;
    v_7.time = view_0.time_0.x;
    v_7.draw = p_7.record_0;
    v_7.directory = records_0[_S295].attributes_0;
    v_7.tableFeature = tableFeature_0;
    var stage_0 : CesiumVertexResult = (cesiumVertexStage((v_7)));
    if((vertexIndex_2 >= (records_0[_S295].skirtStart_0)))
    {
        tableFeature_0 = u32(2147483648);
    }
    else
    {
        tableFeature_0 = u32(0);
    }
    out_4.ids[i32(2)] = (instance_2 | (tableFeature_0));
    out_4.named0 = stage_0.named0;
    out_4.named1 = stage_0.named1;
    out_4.named2 = stage_0.named2;
    out_4.named3 = stage_0.named3;
    out_4.positionMC = stage_0.positionMC;
    var world_0 : vec4<f32> = (((vec4<f32>(stage_0.positionMC, 1.0f)) * (_S296)));
    out_4.relPosition = world_0.xyz;
    out_4.position = (((world_0) * (mat4x4<f32>(view_0.viewProj_0.data_0[i32(0)][i32(0)], view_0.viewProj_0.data_0[i32(1)][i32(0)], view_0.viewProj_0.data_0[i32(2)][i32(0)], view_0.viewProj_0.data_0[i32(3)][i32(0)], view_0.viewProj_0.data_0[i32(0)][i32(1)], view_0.viewProj_0.data_0[i32(1)][i32(1)], view_0.viewProj_0.data_0[i32(2)][i32(1)], view_0.viewProj_0.data_0[i32(3)][i32(1)], view_0.viewProj_0.data_0[i32(0)][i32(2)], view_0.viewProj_0.data_0[i32(1)][i32(2)], view_0.viewProj_0.data_0[i32(2)][i32(2)], view_0.viewProj_0.data_0[i32(3)][i32(2)], view_0.viewProj_0.data_0[i32(0)][i32(3)], view_0.viewProj_0.data_0[i32(1)][i32(3)], view_0.viewProj_0.data_0[i32(2)][i32(3)], view_0.viewProj_0.data_0[i32(3)][i32(3)]))));
    var billboard_0 : bool = ((_S297 & (u32(16)))) != u32(0);
    var world_1 : vec4<f32>;
    if(billboard_0)
    {
        out_4.relPosition = _S304;
        var _S314 : vec4<f32> = (((_S303) * (mat4x4<f32>(view_0.viewProj_0.data_0[i32(0)][i32(0)], view_0.viewProj_0.data_0[i32(1)][i32(0)], view_0.viewProj_0.data_0[i32(2)][i32(0)], view_0.viewProj_0.data_0[i32(3)][i32(0)], view_0.viewProj_0.data_0[i32(0)][i32(1)], view_0.viewProj_0.data_0[i32(1)][i32(1)], view_0.viewProj_0.data_0[i32(2)][i32(1)], view_0.viewProj_0.data_0[i32(3)][i32(1)], view_0.viewProj_0.data_0[i32(0)][i32(2)], view_0.viewProj_0.data_0[i32(1)][i32(2)], view_0.viewProj_0.data_0[i32(2)][i32(2)], view_0.viewProj_0.data_0[i32(3)][i32(2)], view_0.viewProj_0.data_0[i32(0)][i32(3)], view_0.viewProj_0.data_0[i32(1)][i32(3)], view_0.viewProj_0.data_0[i32(2)][i32(3)], view_0.viewProj_0.data_0[i32(3)][i32(3)]))));
        out_4.position = vec4<f32>(_S314.xy + stage_0.positionMC.xy * vec2<f32>(records_0[_S295].billboardSize_0) * vec2<f32>(length(column3_0(_S296, i32(0)))) * vec2<f32>(2.0f) * view_0.viewport_0.zw * vec2<f32>(_S314.w), _S314.zw);
        if(((length(_S304)) < (records_0[_S295].billboardDepthTest_0)))
        {
            out_4.position[i32(2)] = out_4.position.w;
        }
        if(points_0)
        {
            _S307 = !((abs(anchor_0.x)) < 9.99999993381581251e+36f);
        }
        else
        {
            _S307 = false;
        }
        if(_S307)
        {
            out_4.position = vec4<f32>(0.0f, 0.0f, -1.0f, 1.0f);
        }
        world_1 = _S303;
    }
    else
    {
        world_1 = world_0;
    }
    out_4.airInscatter = vec3<f32>(0.0f);
    out_4.airTransmittance = vec3<f32>(1.0f);
    var unlitDraw_0 : bool = ((_S297 & (u32(2)))) != u32(0);
    if(withAir_0)
    {
        _S307 = !unlitDraw_0;
    }
    else
    {
        _S307 = false;
    }
    if(_S307)
    {
        _S307 = ((view_0.sunLight_0.w) > 0.5f);
    }
    else
    {
        _S307 = false;
    }
    if(_S307)
    {
        _S307 = ((view_0.bodyRadii_0.w) > 0.0f);
    }
    else
    {
        _S307 = false;
    }
    if(_S307)
    {
        var a_3 : AerialPerspective_0 = aerialMarch_0(world_1.xyz);
        out_4.airInscatter = a_3.inscatter_0;
        out_4.airTransmittance = a_3.transmittance_0;
    }
    if(((_S297 & (u32(8)))) != u32(0))
    {
        out_4.position[i32(2)] = out_4.position[i32(2)] * 5.42101086242752217e-20f;
    }
    var c0_0 : vec3<f32> = column3_0(_S296, i32(0));
    var c1_0 : vec3<f32> = column3_0(_S296, i32(1));
    var c2_0 : vec3<f32> = column3_0(_S296, i32(2));
    var _S315 : vec3<f32> = cross(c1_0, c2_0);
    out_4.normal = normalize(_S315 * vec3<f32>(stage_0.normalMC.x) + cross(c2_0, c0_0) * vec3<f32>(stage_0.normalMC.y) + cross(c0_0, c1_0) * vec3<f32>(stage_0.normalMC.z)) * vec3<f32>(f32((i32(sign((dot(c0_0, _S315)))))));
    if(billboard_0)
    {
        out_4.normal = (vec3<f32>(0) - normalize(world_1.xyz));
    }
    out_4.ids[i32(0)] = p_7.record_0;
    var _S316 : u32 = records_0[_S295].featureId_0;
    out_4.ids[i32(1)] = records_0[_S295].featureId_0;
    if(points_0)
    {
        out_4.ids[i32(1)] = _S316 + instance_2;
    }
    else
    {
        if(_S313)
        {
            out_4.ids[i32(1)] = p_7.feature_0;
        }
        else
        {
            if(_S312)
            {
                if(localFeature_0 == u32(4294967295))
                {
                    instance_2 = u32(0);
                }
                else
                {
                    instance_2 = _S316 + localFeature_0;
                }
                out_4.ids[i32(1)] = instance_2;
            }
        }
    }
    return out_4;
}

fn surfaceVertex( vertexIndex_3 : u32,  item_1 : u32) -> SurfaceVertex
{
    var _S317 : SurfaceVertex = vertexOut_0(vertexIndex_3, item_1, true);
    return _S317;
}

fn surfacePointVertex( vertexIndex_4 : u32,  item_2 : u32) -> SurfaceVertex
{
    var _S318 : SurfaceVertex = vertexOut_0((bitcast<u32>((vertices_0[records_0[items_0[item_2].record_0].uvOffset_0 + vertexIndex_4 / u32(6)]))) * u32(6) + vertexIndex_4 % u32(6), item_2, true);
    return _S318;
}

fn surfaceDepthVertex( vertexIndex_5 : u32,  item_3 : u32) -> SurfaceVertex
{
    var _S319 : SurfaceVertex = vertexOut_0(vertexIndex_5, item_3, false);
    return _S319;
}

