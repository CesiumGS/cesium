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

@binding(17) @group(0) var<storage, read> clipTable_0 : array<vec4<f32>>;

@binding(2) @group(1) var<storage, read> vertices_0 : array<f32>;

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

@binding(20) @group(2) var propertyTexture0_0 : texture_2d<f32>;

@binding(21) @group(2) var propertyTexture1_0 : texture_2d<f32>;

@binding(8) @group(1) var<storage, read> pickIndices_0 : array<u32>;

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

fn fragmentOf_0( in_0 : SurfaceVaryings_0,  geometric_0 : vec3<f32>,  drawn_0 : vec3<f32>) -> CesiumFragment
{
    var _S4 : u32 = in_0.ids_0.x;
    cesiumAnchor_0 = drawn_0;
    var f_0 : CesiumFragment;
    f_0.positionMC = in_0.positionMC_0;
    f_0.positionEC = drawn_0;
    f_0.positionWC = drawn_0 + cameraPosition_0();
    f_0.normal = geometric_0;
    f_0.texCoord0 = in_0.uv_1;
    f_0.color0 = in_0.color_1 * records_0[_S4].color_0;
    var _S5 : u32 = in_0.ids_0.y;
    f_0.featureId = _S5;
    f_0.screen = in_0.position_0.xy;
    f_0.time = view_0.time_0.x;
    f_0.instanceIndex = ((in_0.ids_0.z) & (u32(2147483647)));
    if((((records_0[_S4].flags_0) & (u32(128)))) != u32(0))
    {
        f_0.instanceIndex = u32(0);
    }
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

fn drawnPosition_0( _S34 : SurfaceVaryings_0,  _S35 : u32) -> vec3<f32>
{
    var _S36 : bool;
    if((records_0[_S35].placement_0) != u32(4294967295))
    {
        _S36 = (((records_0[_S35].flags_0) & (u32(24)))) == u32(0);
    }
    else
    {
        _S36 = false;
    }
    if(_S36)
    {
        _S36 = ((view_0.time_0.y + view_0.time_0.z) < 0.5f);
    }
    else
    {
        _S36 = false;
    }
    var p_1 : vec3<f32>;
    if(_S36)
    {
        var ndc_0 : vec2<f32> = _S34.position_0.xy * view_0.viewport_0.zw * vec2<f32>(2.0f, -2.0f) + vec2<f32>(-1.0f, 1.0f);
        var _S37 : vec3<f32> = vec3<f32>(view_0.viewProj_0.data_0[i32(0)][i32(0)], view_0.viewProj_0.data_0[i32(1)][i32(0)], view_0.viewProj_0.data_0[i32(2)][i32(0)]);
        var _S38 : vec3<f32> = vec3<f32>(view_0.viewProj_0.data_0[i32(0)][i32(1)], view_0.viewProj_0.data_0[i32(1)][i32(1)], view_0.viewProj_0.data_0[i32(2)][i32(1)]);
        p_1 = (_S37 * vec3<f32>((ndc_0.x / dot(_S37, _S37))) + _S38 * vec3<f32>((ndc_0.y / dot(_S38, _S38))) + vec3<f32>(view_0.viewProj_0.data_0[i32(0)][i32(3)], view_0.viewProj_0.data_0[i32(1)][i32(3)], view_0.viewProj_0.data_0[i32(2)][i32(3)])) * vec3<f32>((view_0.near_0 / _S34.position_0.z));
    }
    else
    {
        p_1 = _S34.relPosition_0;
    }
    return p_1;
}

fn terrainAlpha_0( _S39 : u32,  _S40 : SurfaceVaryings_0) -> f32
{
    var _S41 : u32 = records_0[_S39].terrainClip_0;
    if((records_0[_S39].terrainClip_0) == u32(0))
    {
        return 1.0f;
    }
    var _S42 : u32;
    if(terrainSeen_0)
    {
        _S42 = u32(0);
    }
    else
    {
        _S42 = u32(2);
    }
    var opacity_2 : f32 = terrainOpacity_0(_S41, _S40.relPosition_0, _S42);
    var _S43 : bool;
    if((opacity_2 < 0.99900001287460327f))
    {
        _S43 = (((_S40.ids_0.z) & (u32(2147483648)))) != u32(0);
    }
    else
    {
        _S43 = false;
    }
    if(_S43)
    {
        return 0.0f;
    }
    return opacity_2;
}

fn materialAlpha_0( in_1 : SurfaceVaryings_0) -> f32
{
    var _S44 : u32 = in_1.ids_0.x;
    var _S45 : Material_std430_0 = materials_0[records_0[_S44].materialIndex_0];
    var _S46 : vec4<f32> = materialTexture_0(&(_S45), u32(0), in_1.uv_1);
    var color_2 : vec4<f32> = _S45.baseColor_0 * records_0[_S44].color_0 * in_1.color_1;
    var _S47 : bool = materialHasTexture_0(&(_S45), u32(0));
    var color_3 : vec4<f32>;
    if(_S47)
    {
        color_3 = color_2 * _S46;
    }
    else
    {
        color_3 = color_2;
    }
    var geometric_1 : vec3<f32> = normalize(in_1.normal_1);
    var custom_0 : MaterialOutput;
    var _S48 : vec3<f32> = color_3.xyz;
    var _S49 : f32 = color_3.w;
    var _S50 : f32 = _S45.metallic_0;
    var _S51 : f32 = _S45.roughness_0;
    var _S52 : vec3<f32> = _S45.emissive_0;
    var _S53 : bool;
    if((((_S45.flags_1) & (u32(1)))) != u32(0))
    {
        _S53 = true;
    }
    else
    {
        _S53 = (((records_0[_S44].flags_0) & (u32(2)))) != u32(0);
    }
    custom_0 = materialOutput_0(_S48, _S49, _S50, _S51, geometric_1, 1.0f, _S52, _S53);
    var _S54 : CesiumFragment = fragmentOf_0(in_1, geometric_1, drawnPosition_0(in_1, _S44));
    cesiumFragmentStage((_S54), &((custom_0)));
    return custom_0.alpha * terrainAlpha_0(_S44, in_1);
}

fn insideClipBoxes_0( packed_0 : u32,  p_2 : vec3<f32>) -> bool
{
    var _S55 : u32 = (packed_0 & (u32(268435455)));
    var _S56 : u32 = (packed_0 >> (u32(28)));
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
        if((i_0 >= _S56))
        {
            break;
        }
        var b_2 : u32 = (_S55 * u32(8) + i_0) * u32(5);
        var d_1 : vec3<f32> = p_2 - SplitPosition_difference_0(SplitPosition_x24init_0(clipBoxes_0[b_2].xyz, clipBoxes_0[b_2 + u32(1)].xyz), SplitPosition_x24init_0(view_0.cameraHi_0, view_0.cameraLo_0));
        var u_0 : vec3<f32> = abs(vec3<f32>(dot(clipBoxes_0[b_2 + u32(2)].xyz, d_1), dot(clipBoxes_0[b_2 + u32(3)].xyz, d_1), dot(clipBoxes_0[b_2 + u32(4)].xyz, d_1)));
        if(((max(u_0.x, max(u_0.y, u_0.z))) <= 1.0f))
        {
            return true;
        }
        i_0 = i_0 + u32(1);
    }
    return false;
}

@id(1) override clipsOn_0 : bool = false;

fn clipRow_0( row_0 : u32) -> vec4<f32>
{
    return clipTable_0[min(row_0, u32(4095))];
}

fn clipVertex_0( first_0 : u32,  i_1 : u32) -> vec2<f32>
{
    var v_0 : vec4<f32> = clipRow_0(first_0 + ((i_1 >> (u32(1)))));
    var _S57 : vec2<f32>;
    if(((i_1 & (u32(1)))) == u32(0))
    {
        _S57 = v_0.xy;
    }
    else
    {
        _S57 = v_0.zw;
    }
    return _S57;
}

fn insideClipShape_0( at_0 : u32,  p_3 : vec3<f32>) -> bool
{
    var head_0 : vec4<u32> = (bitcast<vec4<u32>>((clipRow_0(at_0))));
    var a_1 : vec4<f32> = clipRow_0(at_0 + u32(1));
    var ua_0 : f32 = dot(a_1.xyz, p_3) + a_1.w;
    var _S58 : u32 = head_0.x;
    if(_S58 == u32(0))
    {
        return (ua_0 <= 0.0f);
    }
    var b_3 : vec4<f32> = clipRow_0(at_0 + u32(2));
    var c_1 : vec4<f32> = clipRow_0(at_0 + u32(3));
    var ub_0 : f32 = dot(b_3.xyz, p_3) + b_3.w;
    var uc_0 : f32 = dot(c_1.xyz, p_3) + c_1.w;
    if(_S58 == u32(1))
    {
        return ((max(abs(ua_0), max(abs(ub_0), abs(uc_0)))) <= 1.0f);
    }
    var zRange_0 : vec2<f32> = clipRow_0(at_0 + u32(4)).xy;
    var inside_1 : bool;
    if((uc_0 < (zRange_0.x)))
    {
        inside_1 = true;
    }
    else
    {
        inside_1 = (uc_0 > (zRange_0.y));
    }
    if(inside_1)
    {
        return false;
    }
    var _S59 : u32 = min(head_0.z, u32(128));
    inside_1 = false;
    var i_2 : u32 = u32(0);
    loop
    {
        if((i_2 < u32(128)))
        {
        }
        else
        {
            break;
        }
        if((i_2 >= _S59))
        {
            break;
        }
        var _S60 : u32 = at_0 + u32(5);
        var s_1 : vec2<f32> = clipVertex_0(_S60, i_2);
        var _S61 : u32 = i_2 + u32(1);
        var _S62 : u32;
        if(_S61 == _S59)
        {
            _S62 = u32(0);
        }
        else
        {
            _S62 = _S61;
        }
        var e_1 : vec2<f32> = clipVertex_0(_S60, _S62);
        var _S63 : f32 = s_1.y;
        var _S64 : f32 = e_1.y;
        if((_S63 > ub_0) != (_S64 > ub_0))
        {
            var _S65 : f32 = s_1.x;
            var inside_2 : bool;
            if((ua_0 < (_S65 + (ub_0 - _S63) * (e_1.x - _S65) / (_S64 - _S63))))
            {
                inside_2 = !inside_1;
            }
            else
            {
                inside_2 = inside_1;
            }
            inside_1 = inside_2;
        }
        i_2 = _S61;
    }
    return inside_1;
}

fn placeholderOut_0( _S66 : u32,  _S67 : vec3<f32>) -> bool
{
    var _S68 : bool;
    if((((records_0[_S66].placeholderMask_0) & ((view_0.viewBit_0)))) != u32(0))
    {
        _S68 = !insideClipBoxes_0(records_0[_S66].clipBlock_0, _S67);
    }
    else
    {
        _S68 = false;
    }
    return _S68;
}

fn clippedOut_0( _S69 : u32,  _S70 : vec3<f32>) -> bool
{
    if(placeholderOut_0(_S69, _S70))
    {
        return true;
    }
    var _S71 : u32 = records_0[_S69].terrainClip_0;
    var _S72 : bool;
    if((records_0[_S69].terrainClip_0) != u32(0))
    {
        var _S73 : u32;
        if(terrainSeen_0)
        {
            _S73 = u32(1);
        }
        else
        {
            _S73 = u32(2);
        }
        _S72 = ((terrainOpacity_0(_S71, _S70, _S73)) <= 0.0f);
    }
    else
    {
        _S72 = false;
    }
    return _S72;
}

fn clipsKeep_0( _S74 : SurfaceVaryings_0,  _S75 : u32) -> bool
{
    var region_0 : bool;
    var head_1 : vec4<u32> = (bitcast<vec4<u32>>((clipRow_0(u32(0)))));
    var _S76 : u32 = min(head_1.x, u32(8));
    var _S77 : vec3<f32>;
    if((((head_1.y) & (u32(1)))) != u32(0))
    {
        _S77 = drawnPosition_0(_S74, _S75);
    }
    else
    {
        _S77 = _S74.relPosition_0;
    }
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
        if((s_2 >= _S76))
        {
            break;
        }
        var entry_1 : vec4<u32> = (bitcast<vec4<u32>>((clipRow_0(u32(1) + s_2))));
        var _S78 : u32 = entry_1.z;
        var _S79 : vec3<f32>;
        if(((_S78 & (u32(4)))) != u32(0))
        {
            _S79 = _S77;
        }
        else
        {
            _S79 = _S74.relPosition_0;
        }
        var every_0 : bool = ((_S78 & (u32(1)))) != u32(0);
        var _S80 : u32 = entry_1.x;
        var _S81 : u32 = min(entry_1.y, u32(16));
        var k_0 : u32 = u32(0);
        var at_1 : u32 = _S80;
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
            if((k_0 >= _S81))
            {
                region_0 = every_0;
                break;
            }
            var inside_3 : bool = insideClipShape_0(at_1, _S79);
            if(every_0)
            {
                region_0 = !inside_3;
            }
            else
            {
                region_0 = inside_3;
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
        var kept_0 : bool;
        if(((_S78 & (u32(2)))) != u32(0))
        {
            kept_0 = !region_0;
        }
        else
        {
            kept_0 = region_0;
        }
        if(!kept_0)
        {
            return false;
        }
        s_2 = s_2 + u32(1);
    }
    return true;
}

fn clipsDiscard_0( _S82 : SurfaceVaryings_0,  _S83 : u32) -> bool
{
    var _S84 : bool;
    if(clipsOn_0)
    {
        _S84 = !clipsKeep_0(_S82, _S83);
    }
    else
    {
        _S84 = false;
    }
    return _S84;
}

fn clippedAway_0( _S85 : u32,  _S86 : SurfaceVaryings_0) -> bool
{
    var _S87 : bool;
    if(clippedOut_0(_S85, _S86.relPosition_0))
    {
        _S87 = true;
    }
    else
    {
        _S87 = clipsDiscard_0(_S86, _S85);
    }
    return _S87;
}

fn cutOut_0( in_2 : SurfaceVaryings_0)
{
    var _S88 : u32 = in_2.ids_0.x;
    var material_0 : Material_std430_0 = materials_0[records_0[_S88].materialIndex_0];
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
    if(clippedAway_0(_S88, in_2))
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
fn shadowFs( _S89 : pixelInput_0, @builtin(position) position_1 : vec4<f32>)
{
    var _S90 : SurfaceVaryings_0 = SurfaceVaryings_0( position_1, _S89.normal_2, _S89.uv_2, _S89.color_4, _S89.ids_1, _S89.relPosition_1, _S89.tangent_1, _S89.airInscatter_1, _S89.airTransmittance_2, _S89.positionMC_1, _S89.named0_1, _S89.named1_1, _S89.named2_1, _S89.named3_1 );
    terrainSeen_0 = true;
    surfaceLight_0 = true;
    cutOut_0(_S90);
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
fn heightFs( _S91 : pixelInput_1, @builtin(position) position_2 : vec4<f32>)
{
    var _S92 : SurfaceVaryings_0 = SurfaceVaryings_0( position_2, _S91.normal_3, _S91.uv_3, _S91.color_5, _S91.ids_2, _S91.relPosition_2, _S91.tangent_2, _S91.airInscatter_2, _S91.airTransmittance_3, _S91.positionMC_2, _S91.named0_2, _S91.named1_2, _S91.named2_2, _S91.named3_2 );
    terrainSeen_0 = true;
    surfaceLight_0 = true;
    terrainSeen_0 = false;
    cutOut_0(_S92);
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
fn shadowPlaceholderFs( _S93 : pixelInput_2, @builtin(position) position_3 : vec4<f32>)
{
    var _S94 : SurfaceVaryings_0 = SurfaceVaryings_0( position_3, _S93.normal_4, _S93.uv_4, _S93.color_6, _S93.ids_3, _S93.relPosition_3, _S93.tangent_3, _S93.airInscatter_3, _S93.airTransmittance_4, _S93.positionMC_3, _S93.named0_3, _S93.named1_3, _S93.named2_3, _S93.named3_3 );
    terrainSeen_0 = true;
    surfaceLight_0 = true;
    if(clippedAway_0(_S93.ids_3.x, _S94))
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
fn prepassFs( _S95 : pixelInput_3, @builtin(front_facing) frontFacing_0 : bool, @builtin(position) position_4 : vec4<f32>) -> pixelOutput_0
{
    var _S96 : SurfaceVaryings_0 = SurfaceVaryings_0( position_4, _S95.normal_5, _S95.uv_5, _S95.color_7, _S95.ids_4, _S95.relPosition_4, _S95.tangent_4, _S95.airInscatter_4, _S95.airTransmittance_5, _S95.positionMC_4, _S95.named0_4, _S95.named1_4, _S95.named2_4, _S95.named3_4 );
    terrainSeen_0 = true;
    surfaceLight_0 = true;
    cutOut_0(_S96);
    var n_1 : vec3<f32> = normalize(_S95.normal_5);
    var n_2 : vec3<f32>;
    if(!frontFacing_0)
    {
        n_2 = (vec3<f32>(0) - n_1);
    }
    else
    {
        n_2 = n_1;
    }
    var _S97 : pixelOutput_0 = pixelOutput_0( vec4<f32>(n_2, 1.0f) );
    return _S97;
}

struct Crossings_0
{
     winding_0 : i32,
     nearest_0 : f32,
     taps_0 : bool,
};

fn crossings_0( _S98 : u32,  _S99 : vec2<f32>,  _S100 : vec2<f32>) -> Crossings_0
{
    var result_0 : Crossings_0;
    result_0.winding_0 = i32(0);
    result_0.nearest_0 = 3.00000000549775576e+38f;
    result_0.taps_0 = false;
    var scale_0 : f32 = vertices_0[_S98 + u32(1)];
    var _S101 : f32 = _S99.y;
    var _S102 : i32 = i32((bitcast<u32>((vertices_0[_S98])))) - i32(1);
    var band_0 : i32 = clamp(i32(floor(_S101 * scale_0)), i32(0), _S102);
    var _S103 : f32 = _S100.y;
    var onRay_0 : bool;
    if((_S103 > 0.0f))
    {
        var above_0 : i32 = clamp(i32(floor((_S101 + _S103) * scale_0)), i32(0), _S102);
        if((clamp(i32(floor((_S101 - _S103) * scale_0)), i32(0), _S102)) != band_0)
        {
            onRay_0 = true;
        }
        else
        {
            onRay_0 = above_0 != band_0;
        }
        result_0.taps_0 = onRay_0;
    }
    var record_1 : u32 = _S98 + u32(4) + u32(band_0) * u32(3);
    var _S104 : u32 = _S98 + (bitcast<u32>((vertices_0[record_1])));
    var count_0 : u32 = (bitcast<u32>((vertices_0[record_1 + u32(1)])));
    if(count_0 == u32(0))
    {
        result_0.winding_0 = (bitcast<i32>((vertices_0[record_1 + u32(2)])));
        return result_0;
    }
    var i_3 : u32 = u32(0);
    loop
    {
        if((i_3 < count_0))
        {
        }
        else
        {
            break;
        }
        var s_3 : u32 = _S98 + (bitcast<u32>((vertices_0[_S104 + i_3])));
        var _S105 : u32 = s_3 + u32(6);
        var _S106 : f32 = _S99.x;
        if((vertices_0[_S105] < (_S106 - _S100.x)))
        {
            break;
        }
        var y0_0 : f32 = vertices_0[s_3 + u32(1)] - _S101;
        var y2_0 : f32 = vertices_0[s_3 + u32(5)] - _S101;
        if((y0_0 <= 0.0f))
        {
            onRay_0 = (y2_0 > 0.0f);
        }
        else
        {
            onRay_0 = false;
        }
        var ends_0 : bool;
        if(!onRay_0)
        {
            if((y0_0 <= _S103))
            {
                ends_0 = (y2_0 > (- _S103));
            }
            else
            {
                ends_0 = false;
            }
            if(ends_0)
            {
                result_0.taps_0 = true;
            }
            i_3 = i_3 + u32(1);
            continue;
        }
        if((y0_0 > (- _S103)))
        {
            ends_0 = true;
        }
        else
        {
            ends_0 = (y2_0 <= _S103);
        }
        var y1_0 : f32 = vertices_0[s_3 + u32(3)] - _S101;
        var a_2 : f32 = y0_0 - 2.0f * y1_0 + y2_0;
        var b_4 : f32 = y0_0 - y1_0;
        var d_2 : f32 = sqrt(max(b_4 * b_4 - a_2 * y0_0, 0.0f));
        var _S107 : f32;
        if((b_4 < 0.0f))
        {
            _S107 = - d_2;
        }
        else
        {
            _S107 = d_2;
        }
        var q_2 : f32 = b_4 + _S107;
        var t1_0 : f32;
        if(((abs(a_2)) > 1.00000000317107685e-30f))
        {
            t1_0 = q_2 / a_2;
        }
        else
        {
            t1_0 = 1.00000001504746622e+30f;
        }
        var t2_0 : f32;
        if(q_2 != 0.0f)
        {
            t2_0 = y0_0 / q_2;
        }
        else
        {
            t2_0 = 0.0f;
        }
        var _S108 : f32;
        if(((abs(t1_0 - clamp(t1_0, 0.0f, 1.0f))) <= (abs(t2_0 - clamp(t2_0, 0.0f, 1.0f)))))
        {
            _S108 = t1_0;
        }
        else
        {
            _S108 = t2_0;
        }
        var t_1 : f32 = clamp(_S108, 0.0f, 1.0f);
        var r_0 : f32 = 1.0f - t_1;
        var _S109 : u32 = s_3 + u32(2);
        var _S110 : u32 = s_3 + u32(4);
        var x_0 : f32 = r_0 * r_0 * (vertices_0[s_3] - _S106) + 2.0f * r_0 * t_1 * (vertices_0[_S109] - _S106) + t_1 * t_1 * (vertices_0[_S110] - _S106);
        var _S111 : f32 = abs(x_0);
        result_0.nearest_0 = min(result_0.nearest_0, _S111);
        if((x_0 > 0.0f))
        {
            var _S112 : i32;
            if((vertices_0[s_3 + u32(7)] > 0.0f))
            {
                _S112 = i32(1);
            }
            else
            {
                _S112 = i32(-1);
            }
            result_0.winding_0 = result_0.winding_0 + _S112;
        }
        var width_1 : f32 = vertices_0[_S105] - min(vertices_0[s_3], min(vertices_0[_S109], vertices_0[_S110]));
        var _S113 : bool;
        if(ends_0)
        {
            _S113 = true;
        }
        else
        {
            _S113 = (width_1 >= _S111);
        }
        if(_S113)
        {
            result_0.taps_0 = true;
        }
        i_3 = i_3 + u32(1);
    }
    return result_0;
}

fn covers_0( _S114 : u32,  _S115 : vec2<f32>,  _S116 : vec2<f32>) -> bool
{
    var _S117 : Crossings_0 = crossings_0(_S114, _S115, _S116);
    var _S118 : bool;
    if((_S117.winding_0) != i32(0))
    {
        _S118 = true;
    }
    else
    {
        _S118 = ((_S117.nearest_0) <= (_S116.x));
    }
    if(_S118)
    {
        return true;
    }
    if(!_S117.taps_0)
    {
        return false;
    }
    var _S119 : vec2<f32> = vec2<f32>(0.0f, _S116.y);
    var _S120 : vec2<f32> = vec2<f32>(0.0f);
    if((crossings_0(_S114, _S115 + _S119, _S120).winding_0) != i32(0))
    {
        return true;
    }
    return (crossings_0(_S114, _S115 - _S119, _S120).winding_0) != i32(0);
}

fn trimCovered_0( in_3 : SurfaceVaryings_0) -> bool
{
    var reach_0 : vec2<f32> = vec2<f32>(0.5f) * (fwidth((in_3.uv_1)));
    var at_3 : u32 = in_3.ids_0.z;
    if(at_3 == u32(0))
    {
        return true;
    }
    return covers_0(records_0[in_3.ids_0.x].positionOffset_0 + at_3 - u32(1), in_3.uv_1, reach_0);
}

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
fn shadowTrimmedFs( _S121 : pixelInput_4, @builtin(position) position_5 : vec4<f32>)
{
    var _S122 : SurfaceVaryings_0 = SurfaceVaryings_0( position_5, _S121.normal_6, _S121.uv_6, _S121.color_8, _S121.ids_5, _S121.relPosition_5, _S121.tangent_5, _S121.airInscatter_5, _S121.airTransmittance_6, _S121.positionMC_5, _S121.named0_5, _S121.named1_5, _S121.named2_5, _S121.named3_5 );
    terrainSeen_0 = true;
    surfaceLight_0 = true;
    var _S123 : u32 = _S121.ids_5.x;
    var _S124 : bool;
    if(!trimCovered_0(_S122))
    {
        _S124 = true;
    }
    else
    {
        _S124 = clippedAway_0(_S123, _S122);
    }
    if(_S124)
    {
        discard;
    }
    return;
}

struct pixelOutput_1
{
    @location(0) output_1 : vec4<f32>,
};

struct pixelInput_5
{
    @location(0) normal_7 : vec3<f32>,
    @location(1) uv_7 : vec2<f32>,
    @location(2) color_9 : vec4<f32>,
    @interpolate(flat) @location(3) ids_6 : vec3<u32>,
    @location(4) relPosition_6 : vec3<f32>,
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
fn prepassTrimmedFs( _S125 : pixelInput_5, @builtin(front_facing) frontFacing_1 : bool, @builtin(position) position_6 : vec4<f32>) -> pixelOutput_1
{
    var _S126 : SurfaceVaryings_0 = SurfaceVaryings_0( position_6, _S125.normal_7, _S125.uv_7, _S125.color_9, _S125.ids_6, _S125.relPosition_6, _S125.tangent_6, _S125.airInscatter_6, _S125.airTransmittance_7, _S125.positionMC_6, _S125.named0_6, _S125.named1_6, _S125.named2_6, _S125.named3_6 );
    terrainSeen_0 = true;
    surfaceLight_0 = true;
    var covered_0 : bool = trimCovered_0(_S126);
    cutOut_0(_S126);
    if(!covered_0)
    {
        discard;
    }
    var n_3 : vec3<f32> = normalize(_S125.normal_7);
    var n_4 : vec3<f32>;
    if(!frontFacing_1)
    {
        n_4 = (vec3<f32>(0) - n_3);
    }
    else
    {
        n_4 = n_3;
    }
    var _S127 : pixelOutput_1 = pixelOutput_1( vec4<f32>(n_4, 1.0f) );
    return _S127;
}

struct pixelOutput_2
{
    @location(0) output_2 : vec4<f32>,
};

struct pixelInput_6
{
    @location(0) normal_8 : vec3<f32>,
    @location(1) uv_8 : vec2<f32>,
    @location(2) color_10 : vec4<f32>,
    @interpolate(flat) @location(3) ids_7 : vec3<u32>,
    @location(4) relPosition_7 : vec3<f32>,
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
fn depthCoverageFs( _S128 : pixelInput_6, @builtin(position) position_7 : vec4<f32>) -> pixelOutput_2
{
    var _S129 : SurfaceVaryings_0 = SurfaceVaryings_0( position_7, _S128.normal_8, _S128.uv_8, _S128.color_10, _S128.ids_7, _S128.relPosition_7, _S128.tangent_7, _S128.airInscatter_7, _S128.airTransmittance_8, _S128.positionMC_7, _S128.named0_7, _S128.named1_7, _S128.named2_7, _S128.named3_7 );
    terrainSeen_0 = true;
    surfaceLight_0 = true;
    var _S130 : u32 = _S128.ids_7.x;
    var material_1 : Material_std430_0 = materials_0[records_0[_S130].materialIndex_0];
    var alpha_3 : f32 = materialAlpha_0(_S129);
    var _S131 : f32 = max((fwidth((alpha_3))), 9.9999997473787516e-05f);
    if(clippedAway_0(_S130, _S129))
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
    var _S132 : pixelOutput_2 = pixelOutput_2( vec4<f32>(0.0f, 0.0f, 0.0f, clamp((alpha_3 - cutoff_1) / _S131 + 0.5f, 0.0f, 1.0f)) );
    return _S132;
}

fn pickFramePixel_0( pixel_0 : vec2<f32>) -> vec2<f32>
{
    return ((view_0.iblFrame_0[i32(0)].xy + (pixel_0 / vec2<f32>(3.0f) * vec2<f32>(2.0f, -2.0f) + vec2<f32>(-1.0f, 1.0f)) * view_0.iblFrame_0[i32(0)].zw) * vec2<f32>(0.5f, -0.5f) + vec2<f32>(0.5f)) * view_0.viewport_0.xy;
}

fn pickMask_0( low_0 : f32,  high_0 : f32) -> u32
{
    return (u32(low_0) | (((u32(high_0) << (u32(16))))));
}

struct PickOut_0
{
    @interpolate(flat) @location(0) ids_8 : vec4<u32>,
    @location(1) domain_0 : vec4<f32>,
};

fn pickGoesThrough_0( _S133 : u32,  _S134 : vec3<f32>) -> bool
{
    var _S135 : u32 = records_0[_S133].terrainClip_0;
    var through_0 : u32 = ((records_0[_S133].terrainClip_0) & ((pickMask_0(view_0.iblFrame_0[i32(1)].z, view_0.iblFrame_0[i32(1)].w))));
    var _S136 : bool;
    if(through_0 == u32(0))
    {
        _S136 = true;
    }
    else
    {
        _S136 = ((terrainOpacity_0(through_0, _S134, u32(0))) >= 1.0f);
    }
    if(_S136)
    {
        return false;
    }
    return ((terrainOpacity_0((_S135 & ((pickMask_0(view_0.iblFrame_0[i32(1)].x, view_0.iblFrame_0[i32(1)].y)))), _S134, u32(0))) >= 1.0f);
}

fn pickOutput_0( in_4 : SurfaceVaryings_0,  triangle_0 : u32,  trimmed_0 : bool) -> PickOut_0
{
    var s_4 : SurfaceVaryings_0 = in_4;
    var _S137 : vec2<f32> = pickFramePixel_0(s_4.position_0.xy);
    s_4.position_0.x = _S137.x;
    s_4.position_0.y = _S137.y;
    var covered_1 : bool;
    if(trimmed_0)
    {
        covered_1 = trimCovered_0(s_4);
    }
    else
    {
        covered_1 = true;
    }
    cutOut_0(s_4);
    var _S138 : u32 = s_4.ids_0.x;
    if(!covered_1)
    {
        covered_1 = true;
    }
    else
    {
        covered_1 = pickGoesThrough_0(_S138, s_4.relPosition_0);
    }
    if(covered_1)
    {
        discard;
    }
    var patched_0 : bool = (((records_0[_S138].flags_0) & (u32(128)))) != u32(0);
    var o_1 : PickOut_0;
    var _S139 : u32 = s_4.ids_0.x;
    var _S140 : u32 = s_4.ids_0.y;
    var _S141 : u32;
    if(patched_0)
    {
        _S141 = u32(4294967295);
    }
    else
    {
        _S141 = triangle_0;
    }
    var _S142 : u32;
    if(patched_0)
    {
        _S142 = u32(0);
    }
    else
    {
        _S142 = ((s_4.ids_0.z) & (u32(2147483647)));
    }
    o_1.ids_8 = vec4<u32>(_S139, _S140, _S141, _S142);
    var _S143 : vec4<f32>;
    if(patched_0)
    {
        _S143 = vec4<f32>(s_4.uv_1, s_4.airInscatter_0.xy);
    }
    else
    {
        _S143 = vec4<f32>(s_4.airInscatter_0, 0.0f);
    }
    o_1.domain_0 = _S143;
    return o_1;
}

struct pixelInput_7
{
    @location(0) normal_9 : vec3<f32>,
    @location(1) uv_9 : vec2<f32>,
    @location(2) color_11 : vec4<f32>,
    @interpolate(flat) @location(3) ids_9 : vec3<u32>,
    @location(4) relPosition_8 : vec3<f32>,
    @location(5) tangent_8 : vec4<f32>,
    @location(6) airInscatter_8 : vec3<f32>,
    @location(7) airTransmittance_9 : vec3<f32>,
    @location(8) positionMC_8 : vec3<f32>,
    @location(9) named0_8 : vec4<f32>,
    @location(10) named1_8 : vec4<f32>,
    @location(11) named2_8 : vec4<f32>,
    @location(12) named3_8 : vec4<f32>,
    @interpolate(flat) @location(13) triangle_1 : u32,
};

@fragment
fn pickFs( _S144 : pixelInput_7, @builtin(position) position_8 : vec4<f32>) -> PickOut_0
{
    var _S145 : SurfaceVaryings_0 = SurfaceVaryings_0( position_8, _S144.normal_9, _S144.uv_9, _S144.color_11, _S144.ids_9, _S144.relPosition_8, _S144.tangent_8, _S144.airInscatter_8, _S144.airTransmittance_9, _S144.positionMC_8, _S144.named0_8, _S144.named1_8, _S144.named2_8, _S144.named3_8 );
    terrainSeen_0 = true;
    surfaceLight_0 = true;
    var _S146 : PickOut_0 = pickOutput_0(_S145, _S144.triangle_1, false);
    return _S146;
}

struct pixelInput_8
{
    @location(0) normal_10 : vec3<f32>,
    @location(1) uv_10 : vec2<f32>,
    @location(2) color_12 : vec4<f32>,
    @interpolate(flat) @location(3) ids_10 : vec3<u32>,
    @location(4) relPosition_9 : vec3<f32>,
    @location(5) tangent_9 : vec4<f32>,
    @location(6) airInscatter_9 : vec3<f32>,
    @location(7) airTransmittance_10 : vec3<f32>,
    @location(8) positionMC_9 : vec3<f32>,
    @location(9) named0_9 : vec4<f32>,
    @location(10) named1_9 : vec4<f32>,
    @location(11) named2_9 : vec4<f32>,
    @location(12) named3_9 : vec4<f32>,
    @interpolate(flat) @location(13) triangle_2 : u32,
};

@fragment
fn pickTrimmedFs( _S147 : pixelInput_8, @builtin(position) position_9 : vec4<f32>) -> PickOut_0
{
    var _S148 : SurfaceVaryings_0 = SurfaceVaryings_0( position_9, _S147.normal_10, _S147.uv_10, _S147.color_12, _S147.ids_10, _S147.relPosition_9, _S147.tangent_9, _S147.airInscatter_9, _S147.airTransmittance_10, _S147.positionMC_9, _S147.named0_9, _S147.named1_9, _S147.named2_9, _S147.named3_9 );
    terrainSeen_0 = true;
    surfaceLight_0 = true;
    var _S149 : PickOut_0 = pickOutput_0(_S148, _S147.triangle_2, true);
    return _S149;
}

fn imageryUv_0( packed_1 : u32,  uv_11 : vec2<f32>) -> vec2<f32>
{
    var t_2 : vec2<f32> = (vec2<f32>(f32((((packed_1 >> (u32(16)))) & (u32(255)))), f32((packed_1 >> (u32(24))))) + uv_11) / vec2<f32>(f32((u32(1) << (((((packed_1 >> (u32(12)))) & (u32(15))))))));
    return vec2<f32>(t_2.x, 1.0f - t_2.y);
}

fn srgbToLinear_0( c_2 : vec3<f32>) -> vec3<f32>
{
    return select(pow((c_2 + vec3<f32>(0.054999999701976776f)) / vec3<f32>(1.0549999475479126f), vec3<f32>(2.4000000953674316f)), c_2 / vec3<f32>(12.920000076293945f), (c_2 <= vec3<f32>(0.040449999272823334f)));
}

struct Surface_0
{
     color_13 : vec3<f32>,
     alpha_4 : f32,
     unlit_1 : bool,
     sceneShare_0 : f32,
};

fn surface_0( color_14 : vec3<f32>,  alpha_5 : f32,  unlit_2 : bool) -> Surface_0
{
    var s_5 : Surface_0;
    s_5.color_13 = color_14;
    s_5.alpha_4 = alpha_5;
    s_5.unlit_1 = unlit_2;
    s_5.sceneShare_0 = 1.0f;
    return s_5;
}

fn fresnelSchlick_0( f0_0 : vec3<f32>,  f90_0 : vec3<f32>,  cosTheta_0 : f32) -> vec3<f32>
{
    var x_1 : f32 = 1.0f - cosTheta_0;
    var _S150 : vec3<f32> = vec3<f32>((x_1 * x_1));
    return f0_0 + (f90_0 - f0_0) * _S150 * _S150 * vec3<f32>(x_1);
}

fn smithVisibility_0( alpha_6 : f32,  nDotL_0 : f32,  nDotV_0 : f32) -> f32
{
    var a2_0 : f32 = alpha_6 * alpha_6;
    var _S151 : f32 = 1.0f - a2_0;
    var sum_0 : f32 = nDotL_0 * sqrt(nDotV_0 * nDotV_0 * _S151 + a2_0) + nDotV_0 * sqrt(nDotL_0 * nDotL_0 * _S151 + a2_0);
    var _S152 : f32;
    if((sum_0 > 0.0f))
    {
        _S152 = 0.5f / sum_0;
    }
    else
    {
        _S152 = 0.0f;
    }
    return _S152;
}

fn ggx_0( alpha_7 : f32,  nDotH_0 : f32) -> f32
{
    var a2_1 : f32 = alpha_7 * alpha_7;
    var f_1 : f32 = (nDotH_0 * a2_1 - nDotH_0) * nDotH_0 + 1.0f;
    return a2_1 / (3.1415927410125732f * f_1 * f_1);
}

fn directReflectance_0( n_5 : vec3<f32>,  v_1 : vec3<f32>,  l_0 : vec3<f32>,  f0_1 : vec3<f32>,  diffuseColor_0 : vec3<f32>,  alpha_8 : f32,  nDotV_1 : f32) -> vec3<f32>
{
    var h_0 : vec3<f32> = normalize(v_1 + l_0);
    var nDotL_1 : f32 = clamp(dot(n_5, l_0), 0.0010000000474974513f, 1.0f);
    var fresnel_0 : vec3<f32> = fresnelSchlick_0(f0_1, vec3<f32>(clamp(max(f0_1.x, max(f0_1.y, f0_1.z)) * 25.0f, 0.0f, 1.0f)), clamp(dot(v_1, h_0), 0.0f, 1.0f));
    return ((vec3<f32>(1.0f) - fresnel_0) * diffuseColor_0 / vec3<f32>(3.1415927410125732f) + fresnel_0 * vec3<f32>(smithVisibility_0(alpha_8, nDotL_1, nDotV_1)) * vec3<f32>(ggx_0(alpha_8, clamp(dot(n_5, h_0), 0.0f, 1.0f)))) * vec3<f32>(nDotL_1);
}

fn cascadeLight_0( c_3 : u32,  relPosition_10 : vec3<f32>,  n_6 : vec3<f32>) -> f32
{
    var p_4 : vec4<f32> = (((vec4<f32>(relPosition_10 + n_6 * vec3<f32>((shadows_0.texels_0[c_3] * 2.0f)), 1.0f)) * (mat4x4<f32>(shadows_0.matrices_0.data_2[c_3].data_0[i32(0)][i32(0)], shadows_0.matrices_0.data_2[c_3].data_0[i32(1)][i32(0)], shadows_0.matrices_0.data_2[c_3].data_0[i32(2)][i32(0)], shadows_0.matrices_0.data_2[c_3].data_0[i32(3)][i32(0)], shadows_0.matrices_0.data_2[c_3].data_0[i32(0)][i32(1)], shadows_0.matrices_0.data_2[c_3].data_0[i32(1)][i32(1)], shadows_0.matrices_0.data_2[c_3].data_0[i32(2)][i32(1)], shadows_0.matrices_0.data_2[c_3].data_0[i32(3)][i32(1)], shadows_0.matrices_0.data_2[c_3].data_0[i32(0)][i32(2)], shadows_0.matrices_0.data_2[c_3].data_0[i32(1)][i32(2)], shadows_0.matrices_0.data_2[c_3].data_0[i32(2)][i32(2)], shadows_0.matrices_0.data_2[c_3].data_0[i32(3)][i32(2)], shadows_0.matrices_0.data_2[c_3].data_0[i32(0)][i32(3)], shadows_0.matrices_0.data_2[c_3].data_0[i32(1)][i32(3)], shadows_0.matrices_0.data_2[c_3].data_0[i32(2)][i32(3)], shadows_0.matrices_0.data_2[c_3].data_0[i32(3)][i32(3)]))));
    var uv_12 : vec2<f32> = vec2<f32>(p_4.x * 0.5f + 0.5f, 0.5f - p_4.y * 0.5f);
    var _S153 : bool;
    if((any(((uv_12 < vec2<f32>(0.0f))))))
    {
        _S153 = true;
    }
    else
    {
        _S153 = (any(((uv_12 > vec2<f32>(1.0f)))));
    }
    if(_S153)
    {
        _S153 = true;
    }
    else
    {
        _S153 = ((p_4.z) > 1.0f);
    }
    if(_S153)
    {
        return 1.0f;
    }
    var _S154 : vec2<f32> = vec2<f32>(0.5f);
    var _S155 : vec2<f32> = uv_12 * vec2<f32>(2048.0f) + _S154;
    var base_0 : vec2<f32> = floor(_S155);
    var st_0 : vec2<f32> = _S155 - base_0;
    var _S156 : vec2<f32> = vec2<f32>(0.00048828125f);
    var _S157 : vec2<f32> = (base_0 - _S154) * _S156;
    var _S158 : f32 = st_0.x;
    var _S159 : f32 = 3.0f * _S158;
    var _S160 : f32 = 4.0f - _S159;
    var _S161 : f32 = 1.0f + _S159;
    var _S162 : f32 = (3.0f - 2.0f * _S158) / _S160 - 2.0f;
    var _S163 : f32 = (3.0f + _S158) / 7.0f;
    var _S164 : f32 = _S158 / _S161 + 2.0f;
    var _S165 : f32 = st_0.y;
    var _S166 : f32 = 3.0f * _S165;
    var _S167 : f32 = 4.0f - _S166;
    var _S168 : f32 = 1.0f + _S166;
    var _S169 : f32 = (3.0f - 2.0f * _S165) / _S167 - 2.0f;
    var _S170 : f32 = (3.0f + _S165) / 7.0f;
    var _S171 : f32 = _S165 / _S168 + 2.0f;
    var _S172 : f32 = f32(c_3);
    var _S173 : vec3<f32> = vec3<f32>(_S157 + vec2<f32>(_S162, _S169) * _S156, _S172);
    var _S174 : f32 = p_4.z;
    var _S175 : vec3<f32> = vec3<f32>(_S157 + vec2<f32>(_S163, _S169) * _S156, _S172);
    var _S176 : vec3<f32> = vec3<f32>(_S157 + vec2<f32>(_S164, _S169) * _S156, _S172);
    var _S177 : vec3<f32> = vec3<f32>(_S157 + vec2<f32>(_S162, _S170) * _S156, _S172);
    var _S178 : vec3<f32> = vec3<f32>(_S157 + vec2<f32>(_S163, _S170) * _S156, _S172);
    var _S179 : vec3<f32> = vec3<f32>(_S157 + vec2<f32>(_S164, _S170) * _S156, _S172);
    var _S180 : vec3<f32> = vec3<f32>(_S157 + vec2<f32>(_S162, _S171) * _S156, _S172);
    var _S181 : vec3<f32> = vec3<f32>(_S157 + vec2<f32>(_S163, _S171) * _S156, _S172);
    var _S182 : vec3<f32> = vec3<f32>(_S157 + vec2<f32>(_S164, _S171) * _S156, _S172);
    return (_S160 * _S167 * (textureSampleCompareLevel((shadowMap_0), (shadowSampler_0), ((_S173)).xy, i32(((_S173)).z), (_S174))) + 7.0f * _S167 * (textureSampleCompareLevel((shadowMap_0), (shadowSampler_0), ((_S175)).xy, i32(((_S175)).z), (_S174))) + _S161 * _S167 * (textureSampleCompareLevel((shadowMap_0), (shadowSampler_0), ((_S176)).xy, i32(((_S176)).z), (_S174))) + _S160 * 7.0f * (textureSampleCompareLevel((shadowMap_0), (shadowSampler_0), ((_S177)).xy, i32(((_S177)).z), (_S174))) + 49.0f * (textureSampleCompareLevel((shadowMap_0), (shadowSampler_0), ((_S178)).xy, i32(((_S178)).z), (_S174))) + _S161 * 7.0f * (textureSampleCompareLevel((shadowMap_0), (shadowSampler_0), ((_S179)).xy, i32(((_S179)).z), (_S174))) + _S160 * _S168 * (textureSampleCompareLevel((shadowMap_0), (shadowSampler_0), ((_S180)).xy, i32(((_S180)).z), (_S174))) + 7.0f * _S168 * (textureSampleCompareLevel((shadowMap_0), (shadowSampler_0), ((_S181)).xy, i32(((_S181)).z), (_S174))) + _S161 * _S168 * (textureSampleCompareLevel((shadowMap_0), (shadowSampler_0), ((_S182)).xy, i32(((_S182)).z), (_S174)))) / 144.0f;
}

fn sunShadow_0( relPosition_11 : vec3<f32>,  n_7 : vec3<f32>) -> f32
{
    var _S183 : bool;
    if(((shadows_0.forward_0.w) < 0.5f))
    {
        return 1.0f;
    }
    var depth_0 : f32 = dot(relPosition_11, shadows_0.forward_0.xyz);
    if((depth_0 >= (shadows_0.fade_0.y)))
    {
        return 1.0f;
    }
    var c_4 : u32 = u32(0);
    loop
    {
        var _S184 : bool = (c_4 < u32(3));
        _S183 = _S184;
        var _S185 : bool;
        if(_S184)
        {
            _S185 = (depth_0 > (shadows_0.splits_0[c_4]));
        }
        else
        {
            _S185 = false;
        }
        if(_S185)
        {
        }
        else
        {
            break;
        }
        c_4 = c_4 + u32(1);
    }
    var lit_0 : f32 = cascadeLight_0(c_4, relPosition_11, n_7);
    var lit_1 : f32;
    if(_S183)
    {
        var near_1 : f32;
        if((c_4 > u32(0)))
        {
            near_1 = shadows_0.splits_0[max(c_4, u32(1)) - u32(1)];
        }
        else
        {
            near_1 = 0.0f;
        }
        var band_1 : f32 = 0.10000000149011612f * (shadows_0.splits_0[c_4] - near_1);
        var w_0 : f32 = clamp((depth_0 - (shadows_0.splits_0[c_4] - band_1)) / max(band_1, 0.0010000000474974513f), 0.0f, 1.0f);
        if((w_0 > 0.0f))
        {
            lit_1 = mix(lit_0, cascadeLight_0(c_4 + u32(1), relPosition_11, n_7), w_0);
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

fn sunLightTableUv_0( mu_0 : f32,  heightShare_0 : f32) -> vec2<f32>
{
    const size_1 : vec2<f32> = vec2<f32>(256.0f, 64.0f);
    return (vec2<f32>(0.5f) + vec2<f32>(0.5f + 0.5f * f32((i32(sign((mu_0))))) * sqrt(abs(mu_0)), sqrt(clamp(heightShare_0, 0.0f, 1.0f))) * (size_1 - vec2<f32>(1.0f))) / size_1;
}

fn sunlightThroughAir_0( relPosition_12 : vec3<f32>,  direction_0 : vec3<f32>) -> vec3<f32>
{
    var p_5 : vec3<f32> = relPosition_12 + cameraPosition_0();
    var radii_0 : vec3<f32> = view_0.bodyRadii_0.xyz;
    var distance_0 : f32 = length(p_5);
    return (textureSampleLevel((sunLightTable_0), (environmentSampler_0), (sunLightTableUv_0(dot(normalize(p_5 / (radii_0 * radii_0)), direction_0), (distance_0 - distance_0 / length(p_5 / radii_0)) / 1000.0f / (view_0.sunLight_0.y - view_0.sunLight_0.x))), (0.0f))).xyz * vec3<f32>((1.0e+05f * view_0.sunIlluminance_0));
}

fn sunIlluminance_1( relPosition_13 : vec3<f32>) -> vec3<f32>
{
    if(((view_0.sunLight_0.z) < 0.5f))
    {
        return vec3<f32>(view_0.sunIlluminance_0);
    }
    return sunlightThroughAir_0(relPosition_13, view_0.sunDirection_0.xyz);
}

fn punctualLight_0( pixel_1 : vec2<f32>,  relPosition_14 : vec3<f32>,  n_8 : vec3<f32>,  v_2 : vec3<f32>,  f0_2 : vec3<f32>,  diffuseColor_1 : vec3<f32>,  alpha_9 : f32,  nDotV_2 : f32) -> vec3<f32>
{
    var _S186 : f32 = bitcast<f32>(lightTable_0[(u32(0))/4]);
    var _S187 : f32 = bitcast<f32>(lightTable_0[(u32(4))/4]);
    var _S188 : f32 = bitcast<f32>(lightTable_0[(u32(8))/4]);
    var _S189 : f32 = bitcast<f32>(lightTable_0[(u32(16))/4]);
    var _S190 : f32 = bitcast<f32>(lightTable_0[(u32(20))/4]);
    var _S191 : f32 = bitcast<f32>(lightTable_0[(u32(32))/4]);
    var _S192 : f32 = bitcast<f32>(lightTable_0[(u32(36))/4]);
    var _S193 : f32 = bitcast<f32>(lightTable_0[(u32(40))/4]);
    var _S194 : f32 = bitcast<f32>(lightTable_0[(u32(44))/4]);
    var sum_1 : vec3<f32> = vec3<f32>(0.0f);
    if((bitcast<f32>(lightTable_0[(u32(12))/4]) < 0.5f))
    {
        return sum_1;
    }
    var z_0 : f32 = dot(relPosition_14, vec3<f32>(_S191, _S192, _S193));
    var _S195 : bool;
    if((z_0 < _S189))
    {
        _S195 = true;
    }
    else
    {
        _S195 = (z_0 >= _S194);
    }
    if(_S195)
    {
        return sum_1;
    }
    var _S196 : vec3<u32> = vec3<u32>(vec3<f32>(_S186, _S187, _S188));
    var uv_13 : vec2<f32> = pixel_1 * view_0.viewport_0.zw;
    var _S197 : u32 = _S196.x;
    var _S198 : u32 = _S196.y;
    var base_1 : u32 = ((min(u32(log(z_0 / _S189) * _S190), _S196.z - u32(1)) * _S198 + min(u32(uv_13.y * f32(_S198)), _S198 - u32(1))) * _S197 + min(u32(uv_13.x * f32(_S197)), _S197 - u32(1))) * u32(17);
    var _S199 : u32 = min(lightTable_0[(u32(i32(u32(65616) + base_1 * u32(4))))/4], u32(16));
    var t_3 : u32 = u32(0);
    var sum_2 : vec3<f32> = sum_1;
    loop
    {
        if((t_3 < u32(16)))
        {
        }
        else
        {
            break;
        }
        if((t_3 >= _S199))
        {
            break;
        }
        var _S200 : u32 = u32(80) + min(lightTable_0[(u32(i32(u32(65616) + (base_1 + u32(1) + t_3) * u32(4))))/4], u32(1023)) * u32(64);
        var _S201 : f32 = bitcast<f32>(lightTable_0[(_S200 + u32(12))/4]);
        var _S202 : f32 = bitcast<f32>(lightTable_0[(_S200 + u32(16))/4]);
        var _S203 : f32 = bitcast<f32>(lightTable_0[(_S200 + u32(20))/4]);
        var _S204 : f32 = bitcast<f32>(lightTable_0[(_S200 + u32(24))/4]);
        var _S205 : f32 = bitcast<f32>(lightTable_0[(_S200 + u32(28))/4]);
        var _S206 : f32 = bitcast<f32>(lightTable_0[(_S200 + u32(32))/4]);
        var _S207 : f32 = bitcast<f32>(lightTable_0[(_S200 + u32(36))/4]);
        var _S208 : f32 = bitcast<f32>(lightTable_0[(_S200 + u32(40))/4]);
        var _S209 : f32 = bitcast<f32>(lightTable_0[(_S200 + u32(44))/4]);
        var _S210 : f32 = bitcast<f32>(lightTable_0[(_S200 + u32(48))/4]);
        var toLight_0 : vec3<f32> = vec3<f32>(bitcast<f32>(lightTable_0[(_S200)/4]), bitcast<f32>(lightTable_0[(_S200 + u32(4))/4]), bitcast<f32>(lightTable_0[(_S200 + u32(8))/4])) - relPosition_14;
        var _S211 : f32 = max(dot(toLight_0, toLight_0), 9.9999997473787516e-05f);
        var l_1 : vec3<f32> = toLight_0 * vec3<f32>(inverseSqrt(_S211));
        if(((dot(n_8, l_1)) <= 0.0f))
        {
            t_3 = t_3 + u32(1);
            continue;
        }
        var ratio2_0 : f32 = _S211 / (_S201 * _S201);
        var window_0 : f32 = clamp(1.0f - ratio2_0 * ratio2_0, 0.0f, 1.0f);
        var illuminance_0 : vec3<f32> = vec3<f32>(_S202, _S203, _S204) * vec3<f32>((window_0 * window_0 / _S211));
        var illuminance_1 : vec3<f32>;
        if((_S205 > 0.5f))
        {
            var cone_0 : f32 = clamp(dot(vec3<f32>(_S206, _S207, _S208), (vec3<f32>(0) - l_1)) * _S209 + _S210, 0.0f, 1.0f);
            illuminance_1 = illuminance_0 * vec3<f32>((cone_0 * cone_0));
        }
        else
        {
            illuminance_1 = illuminance_0;
        }
        sum_2 = sum_2 + directReflectance_0(n_8, v_2, l_1, f0_2, diffuseColor_1, alpha_9, nDotV_2) * illuminance_1;
        t_3 = t_3 + u32(1);
    }
    return sum_2;
}

fn toEnvironment_0( d_3 : vec3<f32>) -> vec3<f32>
{
    return vec3<f32>(dot(d_3, view_0.iblFrame_0[i32(0)].xyz), dot(d_3, view_0.iblFrame_0[i32(1)].xyz), dot(d_3, view_0.iblFrame_0[i32(2)].xyz));
}

fn irradiance_0( n_9 : vec3<f32>) -> vec3<f32>
{
    return (textureSampleLevel((irradianceCube_0), (environmentSampler_0), (n_9), (0.0f))).xyz;
}

fn ambientOcclusion_0( pixel_2 : vec2<f32>) -> f32
{
    if(((shadows_0.fade_0.z) < 0.5f))
    {
        return 1.0f;
    }
    var _S212 : vec2<u32> = vec2<u32>(pixel_2);
    var _S213 : u32 = _S212.x;
    return f32((((aoWords_0[_S212.y * ((u32(view_0.viewport_0.x) + u32(3)) / u32(4)) + _S213 / u32(4)] >> ((u32(8) * ((_S213 & (u32(3)))))))) & (u32(255)))) / 255.0f;
}

struct AerialPerspective_0
{
     inscatter_0 : vec3<f32>,
     transmittance_0 : vec3<f32>,
};

fn aerialPerspective_0( fragment_0 : vec2<f32>,  relPosition_15 : vec3<f32>) -> AerialPerspective_0
{
    var w_1 : f32 = sqrt(clamp((length(relPosition_15) / 1000.0f - view_0.aerialStart_0) / max(view_0.aerialEnd_0 - view_0.aerialStart_0, 9.99999997475242708e-07f), 0.0f, 1.0f));
    var uv_14 : vec2<f32> = fragment_0 * view_0.viewport_0.zw;
    var half_0 : f32 = clamp(w_1, 0.00390625f, 0.99609375f) * 0.5f;
    var transmittance_1 : vec3<f32> = (textureSampleLevel((aerialVolume_0), (environmentSampler_0), (vec3<f32>(uv_14, 0.5f + half_0)), (0.0f))).xyz;
    var result_1 : AerialPerspective_0;
    var _S214 : vec3<f32> = vec3<f32>(clamp(w_1 * 256.0f, 0.0f, 1.0f));
    result_1.inscatter_0 = (textureSampleLevel((aerialVolume_0), (environmentSampler_0), (vec3<f32>(uv_14, half_0)), (0.0f))).xyz * _S214;
    result_1.transmittance_0 = mix(vec3<f32>(1.0f), transmittance_1, _S214);
    return result_1;
}

fn shadeSurface_0( in_5 : SurfaceVaryings_0,  frontFacing_2 : bool,  translucent_0 : bool) -> Surface_0
{
    var _S215 : u32 = in_5.ids_0.x;
    var _S216 : Material_std430_0 = materials_0[records_0[_S215].materialIndex_0];
    var _S217 : u32 = _S216.flags_1;
    var _S218 : vec4<f32> = materialTexture_0(&(_S216), u32(0), in_5.uv_1);
    var _S219 : vec4<f32> = materialTexture_0(&(_S216), u32(4), in_5.uv_1);
    var emissiveSample_0 : vec3<f32> = _S219.xyz;
    var _S220 : vec4<f32> = materialTexture_0(&(_S216), u32(1), in_5.uv_1);
    var _S221 : vec4<f32> = materialTexture_0(&(_S216), u32(2), in_5.uv_1);
    var normalSample_0 : vec3<f32> = _S221.xyz;
    var _S222 : vec4<f32> = materialTexture_0(&(_S216), u32(3), in_5.uv_1);
    var occlusionSample_0 : f32 = _S222.x;
    var imageryPacked_0 : u32 = records_0[_S215].imagerySlice_0;
    var _S223 : vec3<f32> = vec3<f32>(imageryUv_0(records_0[_S215].imagerySlice_0, in_5.uv_1), f32(max(((records_0[_S215].imagerySlice_0) & (u32(4095))), u32(1)) - u32(1)));
    var imagerySample_0 : vec4<f32> = (textureSample((imagery_0), (imagerySampler_0), ((_S223)).xy, i32(((_S223)).z)));
    var lightsPacked_0 : u32 = records_0[_S215].lightsSlice_0;
    var _S224 : vec3<f32> = vec3<f32>(imageryUv_0(records_0[_S215].lightsSlice_0, in_5.uv_1), f32(max(((records_0[_S215].lightsSlice_0) & (u32(4095))), u32(1)) - u32(1)));
    var lightsSample_0 : vec3<f32> = (textureSample((imagery_0), (imagerySampler_0), ((_S224)).xy, i32(((_S224)).z))).xyz;
    var _S225 : vec3<f32> = drawnPosition_0(in_5, _S215);
    var dPdx_0 : vec3<f32> = dpdx(_S225);
    var dPdy_0 : vec3<f32> = dpdy(_S225);
    var dUVdx_0 : vec2<f32> = dpdx(in_5.uv_1);
    var dUVdy_0 : vec2<f32> = dpdy(in_5.uv_1);
    var baseColorSample_0 : vec4<f32>;
    var emissiveSample_1 : vec3<f32>;
    if(((_S217 & (u32(512)))) != u32(0))
    {
        var _S226 : vec3<f32> = vec3<f32>(2.2000000476837158f);
        var _S227 : vec3<f32> = pow(emissiveSample_0, _S226);
        baseColorSample_0 = vec4<f32>(pow(_S218.xyz, _S226), _S218.w);
        emissiveSample_1 = _S227;
    }
    else
    {
        baseColorSample_0 = _S218;
        emissiveSample_1 = emissiveSample_0;
    }
    var _S228 : vec4<f32> = records_0[_S215].color_0;
    var baseColor_2 : vec4<f32> = _S216.baseColor_0 * records_0[_S215].color_0 * in_5.color_1;
    var _S229 : bool = materialHasTexture_0(&(_S216), u32(0));
    var baseColor_3 : vec4<f32>;
    if(_S229)
    {
        baseColor_3 = baseColor_2 * baseColorSample_0;
    }
    else
    {
        baseColor_3 = baseColor_2;
    }
    if(imageryPacked_0 != u32(0))
    {
        baseColor_3 = vec4<f32>(srgbToLinear_0(imagerySample_0.xyz), 1.0f) * _S228;
    }
    if(placeholderOut_0(_S215, in_5.relPosition_0))
    {
        discard;
    }
    var _S230 : bool;
    if(translucent_0)
    {
        _S230 = true;
    }
    else
    {
        _S230 = !cutOutInDepth_0;
    }
    if(_S230)
    {
        _S230 = clipsDiscard_0(in_5, _S215);
    }
    else
    {
        _S230 = false;
    }
    if(_S230)
    {
        discard;
    }
    if(translucent_0)
    {
        _S230 = true;
    }
    else
    {
        _S230 = !cutOutInDepth_0;
    }
    var terrain_0 : f32;
    if(_S230)
    {
        var _S231 : f32 = terrainAlpha_0(_S215, in_5);
        if((_S231 <= 0.0f))
        {
            discard;
        }
        terrain_0 = _S231;
    }
    else
    {
        terrain_0 = 1.0f;
    }
    var _S232 : vec3<f32> = _S216.emissive_0;
    var _S233 : bool = materialHasTexture_0(&(_S216), u32(4));
    var emissive_2 : vec3<f32>;
    if(_S233)
    {
        emissive_2 = _S232 * emissiveSample_1;
    }
    else
    {
        emissive_2 = _S232;
    }
    var _S234 : f32 = _S216.metallic_0;
    var _S235 : f32 = _S216.roughness_0;
    var _S236 : bool = materialHasTexture_0(&(_S216), u32(1));
    var metallic_2 : f32;
    var roughness_2 : f32;
    if(_S236)
    {
        var roughness_3 : f32 = _S235 * _S220.y;
        metallic_2 = _S234 * _S220.z;
        roughness_2 = roughness_3;
    }
    else
    {
        metallic_2 = _S234;
        roughness_2 = _S235;
    }
    var metallic_3 : f32 = clamp(metallic_2, 0.0f, 1.0f);
    var roughness_4 : f32 = clamp(roughness_2, 0.0f, 1.0f);
    var n_10 : vec3<f32> = normalize(in_5.normal_1);
    var _S237 : bool = !frontFacing_2;
    var n_11 : vec3<f32>;
    if(_S237)
    {
        n_11 = (vec3<f32>(0) - n_10);
    }
    else
    {
        n_11 = n_10;
    }
    var _S238 : bool = materialHasTexture_0(&(_S216), u32(2));
    var geometric_2 : vec3<f32>;
    var direct_0 : vec3<f32>;
    if(_S238)
    {
        var _S239 : f32 = in_5.tangent_0.w;
        if(_S239 != 0.0f)
        {
            var _S240 : vec3<f32> = in_5.tangent_0.xyz;
            var t_4 : vec3<f32> = normalize(_S240 - n_11 * vec3<f32>(dot(n_11, _S240)));
            var _S241 : vec3<f32> = cross(n_11, t_4) * vec3<f32>(_S239);
            geometric_2 = t_4;
            direct_0 = _S241;
        }
        else
        {
            var dp2perp_0 : vec3<f32> = cross(dPdy_0, n_11);
            var dp1perp_0 : vec3<f32> = cross(n_11, dPdx_0);
            var tt_0 : vec3<f32> = dp2perp_0 * vec3<f32>(dUVdx_0.x) + dp1perp_0 * vec3<f32>(dUVdy_0.x);
            var bb_0 : vec3<f32> = dp2perp_0 * vec3<f32>(dUVdx_0.y) + dp1perp_0 * vec3<f32>(dUVdy_0.y);
            var _S242 : vec3<f32> = vec3<f32>(inverseSqrt(max(dot(tt_0, tt_0), dot(bb_0, bb_0)) + 9.99999968265522539e-21f));
            var _S243 : vec3<f32> = bb_0 * _S242;
            geometric_2 = tt_0 * _S242;
            direct_0 = _S243;
        }
        var tsNormal_0 : vec3<f32> = (normalSample_0 * vec3<f32>(2.0f) - vec3<f32>(1.0f)) * vec3<f32>(_S216.normalScale_0, _S216.normalScale_0, 1.0f);
        n_11 = normalize(geometric_2 * vec3<f32>(tsNormal_0.x) + direct_0 * vec3<f32>(tsNormal_0.y) + n_11 * vec3<f32>(tsNormal_0.z));
    }
    var _S244 : bool = materialHasTexture_0(&(_S216), u32(3));
    var occlusion_1 : f32;
    if(_S244)
    {
        occlusion_1 = 1.0f + _S216.occlusionStrength_0 * (occlusionSample_0 - 1.0f);
    }
    else
    {
        occlusion_1 = 1.0f;
    }
    if(_S237)
    {
        geometric_2 = (vec3<f32>(0) - n_10);
    }
    else
    {
        geometric_2 = n_10;
    }
    var fragment_1 : CesiumFragment = fragmentOf_0(in_5, geometric_2, _S225);
    var custom_1 : MaterialOutput;
    var _S245 : vec3<f32> = baseColor_3.xyz;
    var _S246 : f32 = baseColor_3.w;
    if(((_S217 & (u32(1)))) != u32(0))
    {
        _S230 = true;
    }
    else
    {
        _S230 = (((records_0[_S215].flags_0) & (u32(2)))) != u32(0);
    }
    custom_1 = materialOutput_0(_S245, _S246, metallic_3, roughness_4, n_11, occlusion_1, emissive_2, _S230);
    cesiumFragmentStage((fragment_1), &((custom_1)));
    var baseColor_4 : vec4<f32> = vec4<f32>(custom_1.baseColor, custom_1.alpha * terrain_0);
    if(!cutOutInDepth_0)
    {
        _S230 = ((_S217 & (u32(4)))) != u32(0);
    }
    else
    {
        _S230 = false;
    }
    if(_S230)
    {
        _S230 = ((baseColor_4.w) < (_S216.alphaCutoff_0));
    }
    else
    {
        _S230 = false;
    }
    if(_S230)
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
    var n_12 : vec3<f32> = normalize(custom_1.normal);
    var occlusion_2 : f32 = custom_1.occlusion;
    var emissive_3 : vec3<f32> = custom_1.emissive;
    var v_3 : vec3<f32> = (vec3<f32>(0) - normalize(_S225));
    var l_2 : vec3<f32> = normalize(view_0.sunDirection_0.xyz);
    var nDotV_3 : f32 = clamp(dot(n_12, v_3), 0.0f, 1.0f);
    var _S247 : vec3<f32> = baseColor_4.xyz;
    var f0_3 : vec3<f32> = mix(vec3<f32>(0.039999999105930328f), _S247, vec3<f32>(metallic_4));
    var diffuseColor_2 : vec3<f32> = _S247 * vec3<f32>((1.0f - metallic_4));
    var alpha_10 : f32 = roughness_5 * roughness_5;
    var sunReflected_0 : vec3<f32> = directReflectance_0(n_12, v_3, l_2, f0_3, diffuseColor_2, alpha_10, nDotV_3);
    var moonShadows_0 : bool = ((shadows_0.fade_0.w) > 0.5f);
    var sunVisible_0 : f32;
    if(((dot(n_12, l_2)) > 0.0f))
    {
        sunVisible_0 = 1.0f;
    }
    else
    {
        sunVisible_0 = 0.0f;
    }
    if((sunVisible_0 > 0.0f))
    {
        _S230 = !moonShadows_0;
    }
    else
    {
        _S230 = false;
    }
    if(_S230)
    {
        sunVisible_0 = sunVisible_0 * sunShadow_0(_S225, geometric_2);
    }
    var direct_1 : vec3<f32> = sunReflected_0 * sunIlluminance_1(_S225) * vec3<f32>(sunVisible_0);
    var moonward_0 : vec3<f32> = view_0.moonLight_0.xyz;
    if(((view_0.moonLight_0.w) > 0.0f))
    {
        _S230 = ((view_0.sunLight_0.z) > 0.5f);
    }
    else
    {
        _S230 = false;
    }
    if(_S230)
    {
        _S230 = ((dot(n_12, moonward_0)) > 0.0f);
    }
    else
    {
        _S230 = false;
    }
    var ao_0 : f32;
    if(_S230)
    {
        if(moonShadows_0)
        {
            ao_0 = sunShadow_0(_S225, geometric_2);
        }
        else
        {
            ao_0 = 1.0f;
        }
        direct_0 = direct_1 + directReflectance_0(n_12, v_3, moonward_0, f0_3, diffuseColor_2, alpha_10, nDotV_3) * sunlightThroughAir_0(_S225, moonward_0) * vec3<f32>(view_0.moonLight_0.w) * vec3<f32>(ao_0);
    }
    else
    {
        direct_0 = direct_1;
    }
    var _S248 : vec2<f32> = in_5.position_0.xy;
    var direct_2 : vec3<f32> = direct_0 + punctualLight_0(_S248, _S225, n_12, v_3, f0_3, diffuseColor_2, alpha_10, nDotV_3);
    var lut_0 : vec2<f32> = (textureSampleLevel((brdfLut_0), (environmentSampler_0), (vec2<f32>(nDotV_3, roughness_5)), (0.0f))).xy;
    var _S249 : f32 = lut_0.x;
    var _S250 : f32 = lut_0.y;
    var fssEss_0 : vec3<f32> = fresnelSchlick_0(f0_3, max(vec3<f32>((1.0f - roughness_5)), f0_3), nDotV_3) * vec3<f32>(_S249) + vec3<f32>(_S250);
    var _S251 : vec3<f32> = vec3<f32>(1.0f);
    var averageF_0 : vec3<f32> = f0_3 + (_S251 - f0_3) / vec3<f32>(21.0f);
    var _S252 : vec3<f32> = vec3<f32>((1.0f - _S249 - _S250));
    var fmsEms_0 : vec3<f32> = fssEss_0 * averageF_0 * _S252 / (_S251 - averageF_0 * _S252);
    var diffuseIbl_1 : vec3<f32> = irradiance_0(toEnvironment_0(n_12)) * (fmsEms_0 + (_S251 - fssEss_0 - fmsEms_0) * diffuseColor_2);
    var specularIbl_1 : vec3<f32> = (textureSampleLevel((specularEnvironment_0), (environmentSampler_0), (toEnvironment_0(reflect((vec3<f32>(0) - v_3), n_12))), (roughness_5 * view_0.specularMaxLod_0))).xyz * fssEss_0;
    if(translucent_0)
    {
        ao_0 = 1.0f;
    }
    else
    {
        ao_0 = ambientOcclusion_0(_S248);
    }
    var indirect_0 : vec3<f32> = (diffuseIbl_1 * max(vec3<f32>(ao_0), ((vec3<f32>(ao_0) * (vec3<f32>(2.0404000282287598f) * diffuseColor_2 - vec3<f32>(0.33239999413490295f)) + (vec3<f32>(-4.795100212097168f) * diffuseColor_2 + vec3<f32>(0.64170002937316895f))) * vec3<f32>(ao_0) + (vec3<f32>(2.7551999092102051f) * diffuseColor_2 + vec3<f32>(0.69029998779296875f))) * vec3<f32>(ao_0)) * vec3<f32>(view_0.diffuseIbl_0) + specularIbl_1 * vec3<f32>(clamp(pow(nDotV_3 + ao_0, exp2(-16.0f * roughness_5 - 1.0f)) - 1.0f + ao_0, 0.0f, 1.0f)) * vec3<f32>(view_0.specularIbl_0)) * vec3<f32>(occlusion_2);
    var _S253 : vec3<f32> = vec3<f32>(0.0f);
    if(lightsPacked_0 != u32(0))
    {
        _S230 = ((view_0.iblFrame_0[i32(0)].w) > 0.5f);
    }
    else
    {
        _S230 = false;
    }
    var emitted_0 : vec3<f32>;
    if(_S230)
    {
        emitted_0 = max(srgbToLinear_0(lightsSample_0) - vec3<f32>(0.0040000001899898052f), _S253) / vec3<f32>(0.99599999189376831f) * vec3<f32>(0.30000001192092896f);
    }
    else
    {
        emitted_0 = _S253;
    }
    var lit_2 : vec3<f32> = (direct_2 + indirect_0 + emitted_0) * vec3<f32>(view_0.exposure_0);
    var lit_3 : vec3<f32>;
    var shown_0 : vec3<f32>;
    if(((view_0.sunLight_0.w) > 0.5f))
    {
        var march_0 : f32 = view_0.bodyRadii_0.w;
        var ap_0 : AerialPerspective_0;
        ap_0.inscatter_0 = _S253;
        ap_0.transmittance_0 = vec3<f32>(1.0f);
        if((march_0 < 1.0f))
        {
            ap_0 = aerialPerspective_0(_S248, _S225);
        }
        if((march_0 > 0.0f))
        {
            var a_3 : AerialPerspective_0;
            a_3.inscatter_0 = in_5.airInscatter_0;
            a_3.transmittance_0 = in_5.airTransmittance_1;
            var screen_0 : f32 = view_0.iblFrame_0[i32(1)].w;
            if((screen_0 > 0.0f))
            {
                var uv_15 : vec2<f32> = _S248 * view_0.viewport_0.zw;
                var _S254 : vec3<f32> = vec3<f32>(uv_15, 0.0f);
                var _S255 : vec3<f32> = vec3<f32>(screen_0);
                a_3.inscatter_0 = mix(a_3.inscatter_0, (textureSampleLevel((aerialScreen_0), (environmentSampler_0), ((_S254)).xy, i32(((_S254)).z), (0.0f))).xyz, _S255);
                var _S256 : vec3<f32> = vec3<f32>(uv_15, 1.0f);
                a_3.transmittance_0 = mix(a_3.transmittance_0, (textureSampleLevel((aerialScreen_0), (environmentSampler_0), ((_S256)).xy, i32(((_S256)).z), (0.0f))).xyz, _S255);
            }
            var _S257 : vec3<f32> = vec3<f32>(march_0);
            ap_0.inscatter_0 = mix(ap_0.inscatter_0, a_3.inscatter_0, _S257);
            ap_0.transmittance_0 = mix(ap_0.transmittance_0, a_3.transmittance_0, _S257);
        }
        var _S258 : vec3<f32> = emissive_3 * ap_0.transmittance_0;
        lit_3 = lit_2 * ap_0.transmittance_0 + ap_0.inscatter_0;
        shown_0 = _S258;
    }
    else
    {
        lit_3 = lit_2;
        shown_0 = emissive_3;
    }
    var s_6 : Surface_0 = surface_0(min(lit_3 + shown_0, vec3<f32>(60000.0f)), baseColor_4.w, false);
    const luminance_0 : vec3<f32> = vec3<f32>(0.2125999927520752f, 0.71520000696182251f, 0.072200000286102295f);
    var shownLuminance_0 : f32 = dot(shown_0, luminance_0);
    if((shownLuminance_0 > 0.0f))
    {
        var _S259 : f32 = dot(lit_3, luminance_0);
        s_6.sceneShare_0 = clamp(_S259 / (_S259 + shownLuminance_0), 0.0f, 1.0f);
    }
    return s_6;
}

struct FsOut_0
{
    @location(0) color_15 : vec4<f32>,
    @interpolate(flat) @location(1) featureId_1 : vec2<u32>,
    @location(2) display_0 : vec4<f32>,
};

fn shadeOpaque_0( in_6 : SurfaceVaryings_0,  frontFacing_3 : bool) -> FsOut_0
{
    var s_7 : Surface_0 = shadeSurface_0(in_6, frontFacing_3, false);
    var _S260 : bool;
    if(!cutOutInDepth_0)
    {
        _S260 = (((materials_0[records_0[in_6.ids_0.x].materialIndex_0].flags_1) & (u32(8)))) != u32(0);
    }
    else
    {
        _S260 = false;
    }
    if(_S260)
    {
        _S260 = ((s_7.alpha_4) < 0.99900001287460327f);
    }
    else
    {
        _S260 = false;
    }
    if(_S260)
    {
        discard;
    }
    var out_0 : FsOut_0;
    var _S261 : u32 = in_6.ids_0.y;
    out_0.featureId_1 = vec2<u32>((_S261 & (u32(65535))), (_S261 >> (u32(16))));
    if(s_7.unlit_1)
    {
        out_0.color_15 = vec4<f32>(0.0f);
        out_0.display_0 = vec4<f32>(s_7.color_13, 1.0f);
    }
    else
    {
        out_0.color_15 = vec4<f32>(s_7.color_13, s_7.sceneShare_0);
        out_0.display_0 = vec4<f32>(0.0f);
    }
    return out_0;
}

struct pixelInput_9
{
    @location(0) normal_11 : vec3<f32>,
    @location(1) uv_16 : vec2<f32>,
    @location(2) color_16 : vec4<f32>,
    @interpolate(flat) @location(3) ids_11 : vec3<u32>,
    @location(4) relPosition_16 : vec3<f32>,
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
fn fs( _S262 : pixelInput_9, @builtin(front_facing) frontFacing_4 : bool, @builtin(position) position_10 : vec4<f32>) -> FsOut_0
{
    var _S263 : SurfaceVaryings_0 = SurfaceVaryings_0( position_10, _S262.normal_11, _S262.uv_16, _S262.color_16, _S262.ids_11, _S262.relPosition_16, _S262.tangent_10, _S262.airInscatter_10, _S262.airTransmittance_11, _S262.positionMC_10, _S262.named0_10, _S262.named1_10, _S262.named2_10, _S262.named3_10 );
    terrainSeen_0 = true;
    surfaceLight_0 = true;
    var _S264 : FsOut_0 = shadeOpaque_0(_S263, frontFacing_4);
    return _S264;
}

struct pixelInput_10
{
    @location(0) normal_12 : vec3<f32>,
    @location(1) uv_17 : vec2<f32>,
    @location(2) color_17 : vec4<f32>,
    @interpolate(flat) @location(3) ids_12 : vec3<u32>,
    @location(4) relPosition_17 : vec3<f32>,
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
fn fsTrimmed( _S265 : pixelInput_10, @builtin(front_facing) frontFacing_5 : bool, @builtin(position) position_11 : vec4<f32>) -> FsOut_0
{
    var _S266 : SurfaceVaryings_0 = SurfaceVaryings_0( position_11, _S265.normal_12, _S265.uv_17, _S265.color_17, _S265.ids_12, _S265.relPosition_17, _S265.tangent_11, _S265.airInscatter_11, _S265.airTransmittance_12, _S265.positionMC_11, _S265.named0_11, _S265.named1_11, _S265.named2_11, _S265.named3_11 );
    terrainSeen_0 = true;
    surfaceLight_0 = true;
    var covered_2 : bool;
    if(cutOutInDepth_0)
    {
        covered_2 = true;
    }
    else
    {
        covered_2 = trimCovered_0(_S266);
    }
    var out_1 : FsOut_0 = shadeOpaque_0(_S266, frontFacing_5);
    if(!covered_2)
    {
        discard;
    }
    return out_1;
}

struct FsPointsOut_0
{
    @location(0) color_18 : vec4<f32>,
    @interpolate(flat) @location(1) featureId_2 : vec2<u32>,
    @location(2) display_1 : vec4<f32>,
    @builtin(sample_mask) mask_1 : u32,
};

struct pixelInput_11
{
    @location(0) normal_13 : vec3<f32>,
    @location(1) uv_18 : vec2<f32>,
    @location(2) color_19 : vec4<f32>,
    @interpolate(flat) @location(3) ids_13 : vec3<u32>,
    @location(4) relPosition_18 : vec3<f32>,
    @location(5) tangent_12 : vec4<f32>,
    @location(6) airInscatter_12 : vec3<f32>,
    @location(7) airTransmittance_13 : vec3<f32>,
    @location(8) positionMC_12 : vec3<f32>,
    @location(9) named0_12 : vec4<f32>,
    @location(10) named1_12 : vec4<f32>,
    @location(11) named2_12 : vec4<f32>,
    @location(12) named3_12 : vec4<f32>,
};

@fragment
fn fsPoints( _S267 : pixelInput_11, @builtin(front_facing) frontFacing_6 : bool, @builtin(position) position_12 : vec4<f32>) -> FsPointsOut_0
{
    var _S268 : SurfaceVaryings_0 = SurfaceVaryings_0( position_12, _S267.normal_13, _S267.uv_18, _S267.color_19, _S267.ids_13, _S267.relPosition_18, _S267.tangent_12, _S267.airInscatter_12, _S267.airTransmittance_13, _S267.positionMC_12, _S267.named0_12, _S267.named1_12, _S267.named2_12, _S267.named3_12 );
    terrainSeen_0 = true;
    surfaceLight_0 = true;
    var s_8 : Surface_0 = shadeSurface_0(_S268, frontFacing_6, false);
    var samples_0 : u32 = u32(round(clamp(s_8.alpha_4, 0.0f, 1.0f) * 4.0f));
    if(samples_0 == u32(0))
    {
        discard;
    }
    var turn_0 : u32 = (u32(position_12.x) + u32(2) * u32(position_12.y)) % u32(4);
    var covered_3 : u32 = ((u32(1) << (samples_0))) - u32(1);
    var out_2 : FsPointsOut_0;
    out_2.mask_1 = (((((covered_3 << (turn_0))) | (((covered_3 >> ((u32(4) - turn_0))))))) & (u32(15)));
    var _S269 : u32 = _S267.ids_13.y;
    out_2.featureId_2 = vec2<u32>((_S269 & (u32(65535))), (_S269 >> (u32(16))));
    if(s_8.unlit_1)
    {
        out_2.color_18 = vec4<f32>(0.0f);
        out_2.display_1 = vec4<f32>(s_8.color_13, 1.0f);
    }
    else
    {
        out_2.color_18 = vec4<f32>(s_8.color_13, s_8.sceneShare_0);
        out_2.display_1 = vec4<f32>(0.0f);
    }
    return out_2;
}

fn depthSlope_0( position_13 : vec4<f32>) -> vec2<f32>
{
    var _S270 : f32 = position_13.z;
    return vec2<f32>(dpdx(_S270), dpdy(_S270));
}

fn visibleSamples_0( position_14 : vec4<f32>,  slope_0 : vec2<f32>,  mask_2 : u32) -> u32
{
    var _S271 : vec2<f32> = position_14.xy;
    var _S272 : vec2<i32> = vec2<i32>(vec2<u32>(_S271));
    var width_2 : u32;
    var height_1 : u32;
    var samples_1 : u32;
    {var dim = textureDimensions((opaqueDepth_0));((width_2)) = dim.x;((height_1)) = dim.y;((samples_1)) = textureNumSamples((opaqueDepth_0));};
    var _S273 : vec2<f32> = fract(_S271) - vec2<f32>(0.5f);
    var i_4 : u32 = u32(0);
    var visible_0 : u32 = u32(0);
    loop
    {
        if((i_4 < u32(4)))
        {
        }
        else
        {
            break;
        }
        if((i_4 >= samples_1))
        {
            break;
        }
        var z_1 : f32 = position_14.z;
        var z_2 : f32;
        if(samples_1 == u32(4))
        {
            z_2 = z_1 + dot(slope_0, SAMPLE_OFFSETS_0[i_4] - _S273);
        }
        else
        {
            z_2 = z_1;
        }
        var _S274 : u32 = (u32(1) << (i_4));
        var _S275 : bool;
        if(((mask_2 & (_S274))) != u32(0))
        {
            _S275 = (z_2 >= (textureLoad((opaqueDepth_0), (_S272), (i32(i_4)))));
        }
        else
        {
            _S275 = false;
        }
        if(_S275)
        {
            visible_0 = (visible_0 | (_S274));
        }
        i_4 = i_4 + u32(1);
    }
    return visible_0;
}

fn listNode_0( in_7 : SurfaceVaryings_0,  color_20 : vec3<f32>,  alpha_11 : f32,  visible_1 : u32)
{
    var index_0 : u32 = atomicAdd(&(lists_0[i32(0)]), u32(1));
    if((index_0 >= (translucency_0.capacity_0)))
    {
        return;
    }
    var node_0 : u32 = translucency_0.nodesBase_0 + index_0 * u32(4);
    atomicStore(&(lists_0[node_0]), pack2x16float(color_20.xy));
    atomicStore(&(lists_0[node_0 + u32(1)]), pack2x16float(vec2<f32>(color_20.z, alpha_11)));
    atomicStore(&(lists_0[node_0 + u32(2)]), (bitcast<u32>((in_7.position_0.z))));
    var next_0 : u32 = atomicExchange(&(lists_0[u32(4) + (u32(in_7.position_0.y) * translucency_0.width_0 + u32(in_7.position_0.x))]), index_0 + u32(1));
    atomicStore(&(lists_0[node_0 + u32(3)]), (next_0 | (((visible_1 << (u32(28)))))));
    return;
}

fn appendNode_0( in_8 : SurfaceVaryings_0,  slope_1 : vec2<f32>,  s_9 : Surface_0,  mask_3 : u32)
{
    if(((s_9.alpha_4) >= 0.99949997663497925f))
    {
        return;
    }
    var alpha_12 : f32 = clamp(s_9.alpha_4, 0.0f, 1.0f);
    var visible_2 : u32 = visibleSamples_0(in_8.position_0, slope_1, mask_3);
    var _S276 : bool;
    if((alpha_12 <= 0.0f))
    {
        _S276 = true;
    }
    else
    {
        _S276 = visible_2 == u32(0);
    }
    if(_S276)
    {
        return;
    }
    if(s_9.unlit_1)
    {
        listNode_0(in_8, s_9.color_13, - alpha_12, visible_2);
        return;
    }
    listNode_0(in_8, s_9.color_13 * vec3<f32>(s_9.sceneShare_0), alpha_12, visible_2);
    if(((s_9.sceneShare_0) < 1.0f))
    {
        listNode_0(in_8, s_9.color_13 * vec3<f32>((1.0f - s_9.sceneShare_0)) * vec3<f32>(alpha_12), 2.0f, visible_2);
    }
    return;
}

struct pixelInput_12
{
    @location(0) normal_14 : vec3<f32>,
    @location(1) uv_19 : vec2<f32>,
    @location(2) color_21 : vec4<f32>,
    @interpolate(flat) @location(3) ids_14 : vec3<u32>,
    @location(4) relPosition_19 : vec3<f32>,
    @location(5) tangent_13 : vec4<f32>,
    @location(6) airInscatter_13 : vec3<f32>,
    @location(7) airTransmittance_14 : vec3<f32>,
    @location(8) positionMC_13 : vec3<f32>,
    @location(9) named0_13 : vec4<f32>,
    @location(10) named1_13 : vec4<f32>,
    @location(11) named2_13 : vec4<f32>,
    @location(12) named3_13 : vec4<f32>,
};

@fragment
fn fsList( _S277 : pixelInput_12, @builtin(front_facing) frontFacing_7 : bool, @builtin(sample_mask) mask_4 : u32, @builtin(position) position_15 : vec4<f32>)
{
    var _S278 : SurfaceVaryings_0 = SurfaceVaryings_0( position_15, _S277.normal_14, _S277.uv_19, _S277.color_21, _S277.ids_14, _S277.relPosition_19, _S277.tangent_13, _S277.airInscatter_13, _S277.airTransmittance_14, _S277.positionMC_13, _S277.named0_13, _S277.named1_13, _S277.named2_13, _S277.named3_13 );
    terrainSeen_0 = true;
    surfaceLight_0 = true;
    var slope_2 : vec2<f32> = depthSlope_0(position_15);
    var s_10 : Surface_0 = shadeSurface_0(_S278, frontFacing_7, true);
    appendNode_0(_S278, slope_2, s_10, mask_4);
    return;
}

struct pixelInput_13
{
    @location(0) normal_15 : vec3<f32>,
    @location(1) uv_20 : vec2<f32>,
    @location(2) color_22 : vec4<f32>,
    @interpolate(flat) @location(3) ids_15 : vec3<u32>,
    @location(4) relPosition_20 : vec3<f32>,
    @location(5) tangent_14 : vec4<f32>,
    @location(6) airInscatter_14 : vec3<f32>,
    @location(7) airTransmittance_15 : vec3<f32>,
    @location(8) positionMC_14 : vec3<f32>,
    @location(9) named0_14 : vec4<f32>,
    @location(10) named1_14 : vec4<f32>,
    @location(11) named2_14 : vec4<f32>,
    @location(12) named3_14 : vec4<f32>,
};

@fragment
fn fsListSamples( _S279 : pixelInput_13, @builtin(front_facing) frontFacing_8 : bool, @builtin(sample_mask) mask_5 : u32, @builtin(sample_index) sample_0 : u32, @builtin(position) position_16 : vec4<f32>)
{
    var _S280 : SurfaceVaryings_0 = SurfaceVaryings_0( position_16, _S279.normal_15, _S279.uv_20, _S279.color_22, _S279.ids_15, _S279.relPosition_20, _S279.tangent_14, _S279.airInscatter_14, _S279.airTransmittance_15, _S279.positionMC_14, _S279.named0_14, _S279.named1_14, _S279.named2_14, _S279.named3_14 );
    terrainSeen_0 = true;
    surfaceLight_0 = true;
    var slope_3 : vec2<f32> = depthSlope_0(position_16);
    var writes_0 : bool = sample_0 == (firstbitlow_0(mask_5));
    surfaceLight_0 = writes_0;
    var s_11 : Surface_0 = shadeSurface_0(_S280, frontFacing_8, true);
    if(writes_0)
    {
        appendNode_0(_S280, slope_3, s_11, mask_5);
    }
    return;
}

fn blendedAlpha_0( in_9 : SurfaceVaryings_0) -> f32
{
    var _S281 : u32 = in_9.ids_0.x;
    var alpha_13 : f32 = materialAlpha_0(in_9);
    if(clippedAway_0(_S281, in_9))
    {
        discard;
    }
    return clamp(alpha_13, 0.0f, 1.0f);
}

fn uncovered_0( position_17 : vec4<f32>,  slope_4 : vec2<f32>) -> f32
{
    var width_3 : u32;
    var height_2 : u32;
    var samples_2 : u32;
    {var dim = textureDimensions((opaqueDepth_0));((width_3)) = dim.x;((height_2)) = dim.y;((samples_2)) = textureNumSamples((opaqueDepth_0));};
    return f32(countOneBits(visibleSamples_0(position_17, slope_4, u32(4294967295)))) / f32(samples_2);
}

fn momentDepth_0( relPosition_21 : vec3<f32>) -> f32
{
    return clamp((log(max(length(relPosition_21), 9.99999997475242708e-07f)) - translucency_0.logNear_0) * translucency_0.invLogRange_0, 0.0f, 1.0f) * 2.0f - 1.0f;
}

struct MomentsOut_0
{
    @location(0) zero_0 : f32,
    @location(1) higher_0 : vec4<f32>,
};

struct pixelInput_14
{
    @location(0) normal_16 : vec3<f32>,
    @location(1) uv_21 : vec2<f32>,
    @location(2) color_23 : vec4<f32>,
    @interpolate(flat) @location(3) ids_16 : vec3<u32>,
    @location(4) relPosition_22 : vec3<f32>,
    @location(5) tangent_15 : vec4<f32>,
    @location(6) airInscatter_15 : vec3<f32>,
    @location(7) airTransmittance_16 : vec3<f32>,
    @location(8) positionMC_15 : vec3<f32>,
    @location(9) named0_15 : vec4<f32>,
    @location(10) named1_15 : vec4<f32>,
    @location(11) named2_15 : vec4<f32>,
    @location(12) named3_15 : vec4<f32>,
};

@fragment
fn fsMoments( _S282 : pixelInput_14, @builtin(position) position_18 : vec4<f32>) -> MomentsOut_0
{
    var _S283 : SurfaceVaryings_0 = SurfaceVaryings_0( position_18, _S282.normal_16, _S282.uv_21, _S282.color_23, _S282.ids_16, _S282.relPosition_22, _S282.tangent_15, _S282.airInscatter_15, _S282.airTransmittance_16, _S282.positionMC_15, _S282.named0_15, _S282.named1_15, _S282.named2_15, _S282.named3_15 );
    terrainSeen_0 = true;
    surfaceLight_0 = true;
    var slope_5 : vec2<f32> = depthSlope_0(position_18);
    var blended_0 : f32 = blendedAlpha_0(_S283);
    var alpha_14 : f32 = blended_0 * uncovered_0(position_18, slope_5);
    var _S284 : bool;
    if((alpha_14 <= 0.0f))
    {
        _S284 = true;
    }
    else
    {
        _S284 = (blended_0 >= 0.99949997663497925f);
    }
    if(_S284)
    {
        discard;
    }
    var absorbance_0 : f32 = - log(1.0f - alpha_14);
    var z_3 : f32 = momentDepth_0(drawnPosition_0(_S283, _S282.ids_16.x));
    var z2_0 : f32 = z_3 * z_3;
    var out_3 : MomentsOut_0;
    out_3.zero_0 = absorbance_0;
    out_3.higher_0 = vec4<f32>(z_3, z2_0, z2_0 * z_3, z2_0 * z2_0) * vec4<f32>(absorbance_0);
    return out_3;
}

fn transmittanceBefore_0( b0_0 : f32,  sums_0 : vec4<f32>,  z_4 : f32) -> f32
{
    if((b0_0 < 0.0010005002841353416f))
    {
        return 1.0f;
    }
    var b_5 : vec4<f32> = mix(sums_0 / vec4<f32>(b0_0), vec4<f32>(0.0f, 0.375f, 0.0f, 0.375f), vec4<f32>(translucency_0.bias_0));
    var _S285 : f32 = b_5.x;
    var _S286 : f32 = b_5.y;
    var l21d11_0 : f32 = b_5.z - _S285 * _S286;
    var invD11_0 : f32 = 1.0f / (_S286 - _S285 * _S285);
    var l21_0 : f32 = l21d11_0 * invD11_0;
    var d22_0 : f32 = b_5.w - _S286 * _S286 - l21d11_0 * l21_0;
    var c_5 : vec3<f32> = vec3<f32>(1.0f, z_4, z_4 * z_4);
    var _S287 : f32 = c_5[i32(1)] - _S285;
    c_5[i32(1)] = _S287;
    var _S288 : f32 = c_5[i32(2)] - (_S286 + l21_0 * c_5.y);
    var _S289 : f32 = _S287 * invD11_0;
    c_5[i32(1)] = _S289;
    c_5[i32(2)] = _S288 / d22_0;
    c_5[i32(1)] = _S289 - l21_0 * c_5.z;
    var _S290 : vec2<f32> = b_5.xy;
    c_5[i32(0)] = c_5[i32(0)] - dot(c_5.yz, _S290);
    if(!((abs(c_5.z)) > (9.9999997473787516e-06f * max(abs(c_5.x), abs(c_5.y)))))
    {
        return exp(- b0_0 * 0.25f);
    }
    var p_6 : f32 = c_5.y / c_5.z;
    var r_1 : f32 = sqrt(max(p_6 * p_6 * 0.25f - c_5.x / c_5.z, 0.0f));
    var _S291 : f32 = - p_6 * 0.5f;
    var z1_0 : f32 = _S291 - r_1;
    var z2_1 : f32 = _S291 + r_1;
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
    return clamp(exp(- b0_0 * (0.25f - k1_0 * z_4 + dot(_S290, vec2<f32>(k1_0 - f012_0 * z_4, f012_0)))), 0.0f, 1.0f);
}

struct AccumulatedOut_0
{
    @location(0) lit_4 : vec4<f32>,
    @location(1) unlit_3 : vec4<f32>,
};

struct pixelInput_15
{
    @location(0) normal_17 : vec3<f32>,
    @location(1) uv_22 : vec2<f32>,
    @location(2) color_24 : vec4<f32>,
    @interpolate(flat) @location(3) ids_17 : vec3<u32>,
    @location(4) relPosition_23 : vec3<f32>,
    @location(5) tangent_16 : vec4<f32>,
    @location(6) airInscatter_16 : vec3<f32>,
    @location(7) airTransmittance_17 : vec3<f32>,
    @location(8) positionMC_16 : vec3<f32>,
    @location(9) named0_16 : vec4<f32>,
    @location(10) named1_16 : vec4<f32>,
    @location(11) named2_16 : vec4<f32>,
    @location(12) named3_16 : vec4<f32>,
};

@fragment
fn fsMomentColor( _S292 : pixelInput_15, @builtin(front_facing) frontFacing_9 : bool, @builtin(position) position_19 : vec4<f32>) -> AccumulatedOut_0
{
    var _S293 : SurfaceVaryings_0 = SurfaceVaryings_0( position_19, _S292.normal_17, _S292.uv_22, _S292.color_24, _S292.ids_17, _S292.relPosition_23, _S292.tangent_16, _S292.airInscatter_16, _S292.airTransmittance_17, _S292.positionMC_16, _S292.named0_16, _S292.named1_16, _S292.named2_16, _S292.named3_16 );
    terrainSeen_0 = true;
    surfaceLight_0 = true;
    var slope_6 : vec2<f32> = depthSlope_0(position_19);
    var s_12 : Surface_0 = shadeSurface_0(_S293, frontFacing_9, true);
    var alpha_15 : f32 = clamp(s_12.alpha_4, 0.0f, 1.0f) * uncovered_0(position_19, slope_6);
    var _S294 : bool;
    if((alpha_15 <= 0.0f))
    {
        _S294 = true;
    }
    else
    {
        _S294 = ((s_12.alpha_4) >= 0.99949997663497925f);
    }
    if(_S294)
    {
        discard;
    }
    var _S295 : vec2<u32> = vec2<u32>(position_19.xy);
    var _S296 : vec4<f32> = (textureLoad(momentsZero, (_S295)));
    var b0_1 : f32 = _S296.x;
    var sums_1 : vec4<f32> = (textureLoad(momentsHigher, (_S295)));
    var w_2 : f32 = transmittanceBefore_0(b0_1, sums_1, momentDepth_0(drawnPosition_0(_S293, _S292.ids_17.x))) * alpha_15;
    var _S297 : vec3<f32> = min(s_12.color_13 * vec3<f32>(w_2), vec3<f32>(16384.0f));
    var out_4 : AccumulatedOut_0;
    var _S298 : vec3<f32>;
    if(s_12.unlit_1)
    {
        _S298 = vec3<f32>(0.0f);
    }
    else
    {
        _S298 = _S297;
    }
    out_4.lit_4 = vec4<f32>(_S298, w_2);
    var sceneLuminance_0 : f32 = dot(_S297, vec3<f32>(0.2125999927520752f, 0.71520000696182251f, 0.072200000286102295f)) * s_12.sceneShare_0;
    var _S299 : vec4<f32>;
    if(s_12.unlit_1)
    {
        _S299 = vec4<f32>(_S297, 0.0f);
    }
    else
    {
        _S299 = vec4<f32>(vec3<f32>(0.0f), sceneLuminance_0);
    }
    out_4.unlit_3 = _S299;
    return out_4;
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
    var _S300 : u32 = (bitcast<u32>((vertices_0[directory_0])));
    var i_5 : u32 = u32(0);
    loop
    {
        if((i_5 < u32(256)))
        {
        }
        else
        {
            break;
        }
        if((i_5 >= _S300))
        {
            break;
        }
        var entry_2 : u32 = directory_0 + u32(1) + i_5 * u32(3);
        if((bitcast<u32>((vertices_0[entry_2]))) == hash_0)
        {
            var components_0 : u32 = (bitcast<u32>((vertices_0[entry_2 + u32(2)])));
            if((components_0 >= u32(2147483648)))
            {
                break;
            }
            var row_1 : u32;
            var size_2 : u32;
            if((components_0 >= u32(1073741824)))
            {
                if(feature_1 == u32(4294967295))
                {
                    break;
                }
                var _S301 : u32 = (components_0 & (u32(255)));
                row_1 = feature_1;
                size_2 = _S301;
            }
            else
            {
                row_1 = vertexIndex_0;
                size_2 = components_0;
            }
            var _S302 : u32 = (bitcast<u32>((vertices_0[entry_2 + u32(1)]))) + row_1 * size_2;
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
                if((c_6 >= size_2))
                {
                    break;
                }
                value_1[c_6] = vertices_0[_S302 + c_6];
                c_6 = c_6 + u32(1);
            }
            break;
        }
        i_5 = i_5 + u32(1);
    }
    return value_1;
}

fn readInstance( draw_0 : u32,  instance_1 : u32,  hash_1 : u32) -> vec4<u32>
{
    var bits_0 : vec4<u32> = vec4<u32>(u32(0));
    var _S303 : u32 = records_0[draw_0].instanceDirectory_0;
    var _S304 : bool;
    if((records_0[draw_0].instanceDirectory_0) == u32(4294967295))
    {
        _S304 = true;
    }
    else
    {
        _S304 = (records_0[draw_0].instanceStreams_0) == u32(4294967295);
    }
    if(_S304)
    {
        return bits_0;
    }
    var _S305 : u32 = (bitcast<u32>((vertices_0[_S303])));
    var i_6 : u32 = u32(0);
    loop
    {
        if((i_6 < u32(256)))
        {
        }
        else
        {
            break;
        }
        if((i_6 >= _S305))
        {
            break;
        }
        var entry_3 : u32 = _S303 + u32(1) + i_6 * u32(3);
        if((bitcast<u32>((vertices_0[entry_3]))) == hash_1)
        {
            var _S306 : u32 = records_0[draw_0].instanceStreams_0 + instance_1 * records_0[draw_0].instanceStride_0 + (bitcast<u32>((vertices_0[entry_3 + u32(1)])));
            var _S307 : u32 = (bitcast<u32>((vertices_0[entry_3 + u32(2)])));
            var c_7 : u32 = u32(0);
            loop
            {
                if((c_7 < u32(4)))
                {
                }
                else
                {
                    break;
                }
                if((c_7 >= _S307))
                {
                    break;
                }
                bits_0[c_7] = (bitcast<u32>((vertices_0[_S306 + c_7])));
                c_7 = c_7 + u32(1);
            }
            break;
        }
        i_6 = i_6 + u32(1);
    }
    return bits_0;
}

fn propertyTexel_0( slot_3 : u32,  uv_23 : vec2<f32>) -> vec4<u32>
{
    var width_4 : u32;
    var height_3 : u32;
    var texel_0 : vec4<f32>;
    if(slot_3 == u32(0))
    {
        {var dim = textureDimensions((propertyTexture0_0));((width_4)) = dim.x;((height_3)) = dim.y;};
        var size_3 : vec2<u32> = vec2<u32>(width_4, height_3);
        var _S308 : vec3<i32> = vec3<i32>(vec2<i32>(min(vec2<u32>(fract(uv_23) * vec2<f32>(size_3)), size_3 - vec2<u32>(u32(1)))), i32(0));
        texel_0 = (textureLoad((propertyTexture0_0), ((_S308)).xy, ((_S308)).z));
    }
    else
    {
        {var dim = textureDimensions((propertyTexture1_0));((width_4)) = dim.x;((height_3)) = dim.y;};
        var size_4 : vec2<u32> = vec2<u32>(width_4, height_3);
        var _S309 : vec3<i32> = vec3<i32>(vec2<i32>(min(vec2<u32>(fract(uv_23) * vec2<f32>(size_4)), size_4 - vec2<u32>(u32(1)))), i32(0));
        texel_0 = (textureLoad((propertyTexture1_0), ((_S309)).xy, ((_S309)).z));
    }
    return vec4<u32>(round(texel_0 * vec4<f32>(255.0f)));
}

fn readFragmentProperty( directory_1 : u32,  hash_2 : u32,  uv_24 : vec2<f32>,  feature_2 : u32,  fallback_0 : vec4<f32>) -> vec4<f32>
{
    if(directory_1 == u32(4294967295))
    {
        return fallback_0;
    }
    var _S310 : u32 = (bitcast<u32>((vertices_0[directory_1])));
    var i_7 : u32 = u32(0);
    loop
    {
        if((i_7 < u32(256)))
        {
        }
        else
        {
            break;
        }
        if((i_7 >= _S310))
        {
            break;
        }
        var entry_4 : u32 = directory_1 + u32(1) + i_7 * u32(3);
        if((bitcast<u32>((vertices_0[entry_4]))) != hash_2)
        {
            i_7 = i_7 + u32(1);
            continue;
        }
        var info_0 : u32 = (bitcast<u32>((vertices_0[entry_4 + u32(2)])));
        if((info_0 < u32(1073741824)))
        {
            return fallback_0;
        }
        var c_8 : u32;
        if((info_0 < u32(2147483648)))
        {
            var value_2 : vec4<f32> = vec4<f32>(0.0f);
            if(feature_2 != u32(4294967295))
            {
                var size_5 : u32 = (info_0 & (u32(255)));
                var _S311 : u32 = (bitcast<u32>((vertices_0[entry_4 + u32(1)]))) + feature_2 * size_5;
                c_8 = u32(0);
                loop
                {
                    if((c_8 < u32(4)))
                    {
                    }
                    else
                    {
                        break;
                    }
                    if((c_8 >= size_5))
                    {
                        break;
                    }
                    value_2[c_8] = vertices_0[_S311 + c_8];
                    c_8 = c_8 + u32(1);
                }
            }
            return value_2;
        }
        var b_6 : u32 = (bitcast<u32>((vertices_0[entry_4 + u32(1)])));
        var _S312 : vec4<u32> = propertyTexel_0((bitcast<u32>((vertices_0[b_6]))), uv_24);
        var _S313 : u32 = min((bitcast<u32>((vertices_0[b_6 + u32(1)]))), u32(4));
        var _S314 : u32 = (bitcast<u32>((vertices_0[b_6 + u32(2)])));
        var kind_0 : u32 = (bitcast<u32>((vertices_0[b_6 + u32(3)])));
        var _S315 : u32 = min((bitcast<u32>((vertices_0[b_6 + u32(4)]))), u32(4));
        var _S316 : bool = (bitcast<u32>((vertices_0[b_6 + u32(5)]))) != u32(0);
        var bytes_0 : array<u32, i32(4)>;
        bytes_0[i32(0)] = u32(0);
        bytes_0[i32(1)] = u32(0);
        bytes_0[i32(2)] = u32(0);
        bytes_0[i32(3)] = u32(0);
        var k_1 : u32 = u32(0);
        loop
        {
            if((k_1 < u32(4)))
            {
            }
            else
            {
                break;
            }
            if((k_1 >= _S313))
            {
                break;
            }
            bytes_0[k_1] = _S312[(((_S314 >> ((k_1 * u32(8))))) & (u32(3)))];
            k_1 = k_1 + u32(1);
        }
        if((kind_0 <= u32(1)))
        {
            i_7 = u32(1);
        }
        else
        {
            var _S317 : bool;
            if(kind_0 == u32(2))
            {
                _S317 = true;
            }
            else
            {
                _S317 = kind_0 == u32(3);
            }
            if(_S317)
            {
                i_7 = u32(2);
            }
            else
            {
                i_7 = u32(4);
            }
        }
        var value_3 : vec4<f32> = vec4<f32>(0.0f);
        c_8 = u32(0);
        loop
        {
            if((c_8 < u32(4)))
            {
            }
            else
            {
                break;
            }
            if((c_8 >= _S315))
            {
                break;
            }
            k_1 = u32(0);
            var raw_0 : u32 = u32(0);
            loop
            {
                if((k_1 < u32(4)))
                {
                }
                else
                {
                    break;
                }
                if((k_1 >= i_7))
                {
                    break;
                }
                var at_4 : u32 = c_8 * i_7 + k_1;
                if((at_4 < u32(4)))
                {
                    raw_0 = (raw_0 | ((((bytes_0[at_4]) << ((k_1 * u32(8)))))));
                }
                k_1 = k_1 + u32(1);
            }
            var v_4 : f32;
            switch(kind_0)
            {
            case u32(0):
                {
                    if(_S316)
                    {
                        v_4 = f32(raw_0) / 255.0f;
                    }
                    else
                    {
                        v_4 = f32(raw_0);
                    }
                }
            case u32(1):
                {
                    var v_5 : f32 = f32((i32((raw_0 << (u32(24)))) >> (u32(24))));
                    if(_S316)
                    {
                        v_4 = max(v_5 / 127.0f, -1.0f);
                    }
                    else
                    {
                        v_4 = v_5;
                    }
                }
            case u32(2):
                {
                    if(_S316)
                    {
                        v_4 = f32(raw_0) / 65535.0f;
                    }
                    else
                    {
                        v_4 = f32(raw_0);
                    }
                }
            case u32(3):
                {
                    var v_6 : f32 = f32((i32((raw_0 << (u32(16)))) >> (u32(16))));
                    if(_S316)
                    {
                        v_4 = max(v_6 / 32767.0f, -1.0f);
                    }
                    else
                    {
                        v_4 = v_6;
                    }
                }
            case u32(4):
                {
                    if(_S316)
                    {
                        v_4 = f32(raw_0) / 4.294967296e+09f;
                    }
                    else
                    {
                        v_4 = f32(raw_0);
                    }
                }
            case u32(5):
                {
                    var v_7 : f32 = f32((bitcast<i32>((raw_0))));
                    if(_S316)
                    {
                        v_4 = max(v_7 / 2.147483648e+09f, -1.0f);
                    }
                    else
                    {
                        v_4 = v_7;
                    }
                }
            default :
                {
                    v_4 = (bitcast<f32>((raw_0)));
                }
            }
            value_3[c_8] = v_4 * vertices_0[b_6 + u32(10) + c_8] + vertices_0[b_6 + u32(6) + c_8];
            c_8 = c_8 + u32(1);
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
    var b_7 : u32 = offset_0 + index_1 * u32(4);
    return vec4<f32>(vertices_0[b_7], vertices_0[b_7 + u32(1)], vertices_0[b_7 + u32(2)], vertices_0[b_7 + u32(3)]);
}

var<private> patchChunk_0 : vec4<u32>;

fn casteljau_0( p_7 : array<vec4<f32>, i32(4)>,  n_13 : u32,  t_5 : f32,  value_4 : ptr<function, vec4<f32>>,  derivative_0 : ptr<function, vec4<f32>>)
{
    var _S318 : array<vec4<f32>, i32(4)> = p_7;
    var _S319 : f32 = 1.0f - t_5;
    (*derivative_0) = vec4<f32>(0.0f);
    var level_0 : u32 = u32(1);
    loop
    {
        if((level_0 <= u32(3)))
        {
        }
        else
        {
            break;
        }
        if((level_0 > n_13))
        {
            break;
        }
        if(level_0 == n_13)
        {
            (*derivative_0) = vec4<f32>(f32(n_13)) * (_S318[i32(1)] - _S318[i32(0)]);
        }
        var i_8 : u32 = u32(0);
        loop
        {
            if(((i_8 + level_0) <= n_13))
            {
            }
            else
            {
                break;
            }
            var _S320 : u32 = i_8 + u32(1);
            _S318[i_8] = vec4<f32>(_S319) * _S318[i_8] + vec4<f32>(t_5) * _S318[_S320];
            i_8 = _S320;
        }
        level_0 = level_0 + u32(1);
    }
    (*value_4) = _S318[i32(0)];
    return;
}

struct PatchSpan_0
{
     kind_1 : u32,
     reversed_0 : bool,
     degreeU_0 : u32,
     degreeV_0 : u32,
     face_0 : u32,
     controls_0 : u32,
     origin_0 : vec3<f32>,
     axisX_0 : vec3<f32>,
     axisY_0 : vec3<f32>,
     params_0 : vec2<f32>,
     domain_1 : vec4<f32>,
     rect_0 : vec4<f32>,
     corner_0 : vec2<f32>,
     sphere_0 : vec4<f32>,
     faceSphere_0 : vec4<f32>,
     density_0 : vec3<f32>,
     speed_0 : vec2<f32>,
     trim_0 : u32,
};

fn bezierPatch_0( sp_0 : PatchSpan_0,  net_0 : array<vec4<f32>, i32(16)>,  s_13 : f32,  t_6 : f32,  position_20 : ptr<function, vec3<f32>>,  ds_0 : ptr<function, vec3<f32>>,  dt_0 : ptr<function, vec3<f32>>)
{
    var rowValue_0 : array<vec4<f32>, i32(4)>;
    var rowDerivative_0 : array<vec4<f32>, i32(4)>;
    var j_1 : u32 = u32(0);
    loop
    {
        if((j_1 <= u32(3)))
        {
        }
        else
        {
            break;
        }
        var _S321 : u32 = j_1;
        var _S322 : vec4<f32> = vec4<f32>(0.0f);
        rowValue_0[_S321] = _S322;
        var _S323 : u32 = j_1;
        rowDerivative_0[_S323] = _S322;
        if((j_1 > (sp_0.degreeV_0)))
        {
            j_1 = j_1 + u32(1);
            continue;
        }
        var p_8 : array<vec4<f32>, i32(4)>;
        var i_9 : u32 = u32(0);
        loop
        {
            if((i_9 <= u32(3)))
            {
            }
            else
            {
                break;
            }
            var _S324 : u32 = i_9;
            var _S325 : vec4<f32>;
            if((i_9 <= (sp_0.degreeU_0)))
            {
                _S325 = net_0[j_1 * (sp_0.degreeU_0 + u32(1)) + i_9];
            }
            else
            {
                _S325 = _S322;
            }
            p_8[_S324] = _S325;
            i_9 = i_9 + u32(1);
        }
        var _S326 : vec4<f32> = rowValue_0[_S321];
        var _S327 : vec4<f32> = rowDerivative_0[_S323];
        casteljau_0(p_8, sp_0.degreeU_0, s_13, &(_S326), &(_S327));
        rowValue_0[_S321] = _S326;
        rowDerivative_0[_S323] = _S327;
        j_1 = j_1 + u32(1);
    }
    var h_1 : vec4<f32>;
    var ht_0 : vec4<f32>;
    casteljau_0(rowValue_0, sp_0.degreeV_0, t_6, &(h_1), &(ht_0));
    var hs_0 : vec4<f32>;
    var unused_0 : vec4<f32>;
    casteljau_0(rowDerivative_0, sp_0.degreeV_0, t_6, &(hs_0), &(unused_0));
    var _S328 : vec3<f32> = vec3<f32>(h_1.w);
    var _S329 : vec3<f32> = h_1.xyz / _S328;
    (*position_20) = _S329;
    (*ds_0) = (hs_0.xyz - vec3<f32>(hs_0.w) * _S329) / _S328;
    (*dt_0) = (ht_0.xyz - vec3<f32>(ht_0.w) * (*position_20)) / _S328;
    return;
}

struct PatchPoint_0
{
     position_21 : vec3<f32>,
     normal_18 : vec3<f32>,
};

fn evaluateBezier_0( sp_1 : PatchSpan_0,  net_1 : array<vec4<f32>, i32(16)>,  u_1 : f32,  v_8 : f32) -> PatchPoint_0
{
    var _S330 : f32 = sp_1.domain_1.x;
    var _S331 : f32 = sp_1.domain_1.y - _S330;
    var _S332 : f32 = sp_1.domain_1.z;
    var _S333 : f32 = sp_1.domain_1.w - _S332;
    var _S334 : bool = (_S331 > 0.0f);
    var s_14 : f32;
    if(_S334)
    {
        s_14 = clamp((u_1 - _S330) / _S331, 0.0f, 1.0f);
    }
    else
    {
        s_14 = 0.0f;
    }
    var _S335 : bool = (_S333 > 0.0f);
    var t_7 : f32;
    if(_S335)
    {
        t_7 = clamp((v_8 - _S332) / _S333, 0.0f, 1.0f);
    }
    else
    {
        t_7 = 0.0f;
    }
    var point_0 : PatchPoint_0;
    var _S336 : vec3<f32> = point_0.position_21;
    var ds_1 : vec3<f32>;
    var dt_1 : vec3<f32>;
    bezierPatch_0(sp_1, net_1, s_14, t_7, &(_S336), &(ds_1), &(dt_1));
    point_0.position_21 = _S336;
    var n_14 : vec3<f32> = cross(ds_1, dt_1);
    var _S337 : f32 = max(dot(ds_1, ds_1), dot(dt_1, dt_1));
    var n_15 : vec3<f32>;
    if(((dot(n_14, n_14)) <= (9.999999960041972e-13f * _S337 * _S337)))
    {
        var _S338 : vec2<f32> = vec2<f32>(u_1, v_8);
        var at_5 : vec2<f32> = _S338 + (vec2<f32>(0.5f * (sp_1.rect_0.x + sp_1.rect_0.y), 0.5f * (sp_1.rect_0.z + sp_1.rect_0.w)) - _S338) * vec2<f32>(0.0010000000474974513f);
        var s2_0 : f32;
        if(_S334)
        {
            s2_0 = clamp((at_5.x - _S330) / _S331, 0.0f, 1.0f);
        }
        else
        {
            s2_0 = 0.0f;
        }
        var t2_1 : f32;
        if(_S335)
        {
            t2_1 = clamp((at_5.y - _S332) / _S333, 0.0f, 1.0f);
        }
        else
        {
            t2_1 = 0.0f;
        }
        var p2_0 : vec3<f32>;
        bezierPatch_0(sp_1, net_1, s2_0, t2_1, &(p2_0), &(ds_1), &(dt_1));
        n_15 = cross(ds_1, dt_1);
    }
    else
    {
        n_15 = n_14;
    }
    var length2_0 : f32 = dot(n_15, n_15);
    if((length2_0 > 0.0f))
    {
        n_15 = n_15 * vec3<f32>(inverseSqrt(length2_0));
    }
    else
    {
        n_15 = vec3<f32>(0.0f, 0.0f, 1.0f);
    }
    point_0.normal_18 = n_15;
    return point_0;
}

fn sign1_0( x_2 : f32) -> f32
{
    var _S339 : f32;
    if((x_2 < 0.0f))
    {
        _S339 = -1.0f;
    }
    else
    {
        _S339 = 1.0f;
    }
    return _S339;
}

fn evaluateAnalytic_0( s_15 : PatchSpan_0,  u_2 : f32,  v_9 : f32) -> PatchPoint_0
{
    var cu_0 : f32 = cos(u_2);
    var su_0 : f32 = sin(u_2);
    var p0_0 : f32 = s_15.params_0.x;
    var p1_0 : f32 = s_15.params_0.y;
    var local_0 : vec3<f32>;
    var n_16 : vec3<f32>;
    switch(s_15.kind_1)
    {
    case u32(0):
        {
            const _S340 : vec3<f32> = vec3<f32>(0.0f, 0.0f, 1.0f);
            local_0 = vec3<f32>(u_2, v_9, 0.0f);
            n_16 = _S340;
        }
    case u32(1):
        {
            var _S341 : vec3<f32> = vec3<f32>(cu_0, su_0, 0.0f) * vec3<f32>(sign1_0(p0_0));
            local_0 = vec3<f32>(p0_0 * cu_0, p0_0 * su_0, v_9);
            n_16 = _S341;
        }
    case u32(2):
        {
            var t_8 : f32 = tan(p1_0);
            var radius_1 : f32 = p0_0 + v_9 * t_8;
            var _S342 : vec3<f32> = vec3<f32>(cu_0, su_0, - t_8) * vec3<f32>(sign1_0(radius_1));
            local_0 = vec3<f32>(radius_1 * cu_0, radius_1 * su_0, v_9);
            n_16 = _S342;
        }
    case u32(3):
        {
            var cv_0 : f32 = cos(v_9);
            var sv_0 : f32 = sin(v_9);
            var _S343 : f32 = p0_0 * cv_0;
            var _S344 : vec3<f32> = vec3<f32>(cv_0 * cu_0, cv_0 * su_0, sv_0) * vec3<f32>((sign1_0(p0_0) * sign1_0(cv_0)));
            local_0 = vec3<f32>(_S343 * cu_0, _S343 * su_0, p0_0 * sv_0);
            n_16 = _S344;
        }
    default :
        {
            var cv_1 : f32 = cos(v_9);
            var sv_1 : f32 = sin(v_9);
            var radius_2 : f32 = p0_0 + p1_0 * cv_1;
            var _S345 : vec3<f32> = vec3<f32>(cv_1 * cu_0, cv_1 * su_0, sv_1) * vec3<f32>((sign1_0(p1_0) * sign1_0(radius_2)));
            local_0 = vec3<f32>(radius_2 * cu_0, radius_2 * su_0, p1_0 * sv_1);
            n_16 = _S345;
        }
    }
    var z_5 : vec3<f32> = cross(s_15.axisX_0, s_15.axisY_0);
    var point_1 : PatchPoint_0;
    point_1.position_21 = s_15.origin_0 + vec3<f32>(local_0.x) * s_15.axisX_0 + vec3<f32>(local_0.y) * s_15.axisY_0 + vec3<f32>(local_0.z) * z_5;
    point_1.normal_18 = normalize(vec3<f32>(n_16.x) * s_15.axisX_0 + vec3<f32>(n_16.y) * s_15.axisY_0 + vec3<f32>(n_16.z) * z_5);
    return point_1;
}

fn read3_0( offset_1 : u32,  index_2 : u32) -> vec3<f32>
{
    var b_8 : u32 = offset_1 + index_2 * u32(3);
    return vec3<f32>(vertices_0[b_8], vertices_0[b_8 + u32(1)], vertices_0[b_8 + u32(2)]);
}

fn placementParameter_0( word_2 : u32) -> f32
{
    return placements_0[(word_2 >> (u32(2)))][(word_2 & (u32(3)))];
}

fn termWeight_0( row_2 : u32,  head_2 : vec4<u32>) -> f32
{
    var _S346 : f32 = (bitcast<f32>((head_2.y)));
    var _S347 : u32 = ((((head_2.x) >> (u32(8)))) & (u32(3)));
    var f_2 : u32 = u32(0);
    var w_3 : f32 = _S346;
    loop
    {
        if((f_2 < _S347))
        {
        }
        else
        {
            break;
        }
        var _S348 : vec4<f32> = placements_0[row_2 + u32(1) + f_2];
        var w_4 : f32 = w_3 * (_S348.y + _S348.z * placementParameter_0((bitcast<u32>((_S348.x)))));
        f_2 = f_2 + u32(1);
        w_3 = w_4;
    }
    return w_3;
}

fn latticeDisplacement_0( body_0 : u32,  cells_0 : u32,  p_9 : vec3<f32>,  jacobian_0 : ptr<function, mat3x3<f32>>) -> vec3<f32>
{
    var _S349 : vec4<f32> = placements_0[body_0];
    var _S350 : f32 = _S349.w;
    var v_10 : vec3<f32> = (p_9 - _S349.xyz) * vec3<f32>(_S350);
    var v_11 : vec3<f32>;
    var cell_0 : u32;
    var dvdp_0 : f32;
    if((cells_0 > u32(1)))
    {
        var n_17 : f32 = f32(cells_0);
        var _S351 : vec3<f32> = vec3<f32>(1.0f);
        var s_16 : vec3<f32> = (v_10 + _S351) * vec3<f32>((0.5f * n_17));
        var f_3 : vec3<f32> = clamp(floor(s_16), vec3<f32>(0.0f), vec3<f32>((n_17 - 1.0f)));
        var _S352 : vec3<u32> = vec3<u32>(f_3);
        var _S353 : u32 = (_S352.z * cells_0 + _S352.y) * cells_0 + _S352.x;
        var dvdp_1 : f32 = _S350 * n_17;
        v_11 = vec3<f32>(2.0f) * (s_16 - f_3) - _S351;
        cell_0 = _S353;
        dvdp_0 = dvdp_1;
    }
    else
    {
        v_11 = v_10;
        cell_0 = u32(0);
        dvdp_0 = _S350;
    }
    var _S354 : f32 = v_11.x;
    var _S355 : f32 = _S354 * _S354;
    var _S356 : vec4<f32> = vec4<f32>(1.0f, _S354, _S355, _S355 * _S354);
    var _S357 : f32 = v_11.y;
    var _S358 : f32 = _S357 * _S357;
    var _S359 : vec4<f32> = vec4<f32>(1.0f, _S357, _S358, _S358 * _S357);
    var _S360 : f32 = v_11.z;
    var _S361 : f32 = _S360 * _S360;
    var _S362 : vec4<f32> = vec4<f32>(1.0f, _S360, _S361, _S361 * _S360);
    var _S363 : vec4<f32> = vec4<f32>(0.0f, 1.0f, 2.0f * _S354, 3.0f * _S354 * _S354);
    var _S364 : vec4<f32> = vec4<f32>(0.0f, 1.0f, 2.0f * _S357, 3.0f * _S357 * _S357);
    var _S365 : vec4<f32> = vec4<f32>(0.0f, 1.0f, 2.0f * _S360, 3.0f * _S360 * _S360);
    var _S366 : u32 = body_0 + u32(1) + cell_0 * u32(20);
    var _S367 : vec3<f32> = vec3<f32>(0.0f);
    var k_2 : u32 = u32(0);
    var d_4 : vec3<f32> = _S367;
    var gx_0 : vec3<f32> = _S367;
    var gy_0 : vec3<f32> = _S367;
    var gz_0 : vec3<f32> = _S367;
    loop
    {
        if((k_2 < u32(20)))
        {
        }
        else
        {
            break;
        }
        var a_4 : u32 = ((TERM_POWERS_0[k_2]) & (u32(3)));
        var b_9 : u32 = ((((TERM_POWERS_0[k_2]) >> (u32(2)))) & (u32(3)));
        var c_9 : u32 = ((((TERM_POWERS_0[k_2]) >> (u32(4)))) & (u32(3)));
        var coefficient_0 : vec3<f32> = placements_0[_S366 + k_2].xyz;
        var _S368 : f32 = _S356[a_4] * _S359[b_9];
        var d_5 : vec3<f32> = d_4 + coefficient_0 * vec3<f32>((_S368 * _S362[c_9]));
        var gx_1 : vec3<f32> = gx_0 + coefficient_0 * vec3<f32>((_S363[a_4] * (_S359[b_9] * _S362[c_9])));
        var gy_1 : vec3<f32> = gy_0 + coefficient_0 * vec3<f32>((_S364[b_9] * (_S356[a_4] * _S362[c_9])));
        var gz_1 : vec3<f32> = gz_0 + coefficient_0 * vec3<f32>((_S365[c_9] * _S368));
        k_2 = k_2 + u32(1);
        d_4 = d_5;
        gx_0 = gx_1;
        gy_0 = gy_1;
        gz_0 = gz_1;
    }
    (*jacobian_0) = transpose(mat3x3<f32>(gx_0 * vec3<f32>(dvdp_0), gy_0 * vec3<f32>(dvdp_0), gz_0 * vec3<f32>(dvdp_0)));
    return d_4;
}

fn termDisplacement_0( head_3 : vec4<u32>,  block_0 : u32,  p_10 : vec3<f32>,  vertexIndex_1 : u32,  directory_2 : u32,  feature_3 : u32,  jacobian_1 : ptr<function, mat3x3<f32>>) -> vec3<f32>
{
    if((((head_3.x) & (u32(255)))) == u32(1))
    {
        var _S369 : vec3<f32> = latticeDisplacement_0(block_0 + head_3.z, head_3.w, p_10, &((*jacobian_1)));
        return _S369;
    }
    (*jacobian_1) = mat3x3<f32>(0.0f, 0.0f, 0.0f, 0.0f, 0.0f, 0.0f, 0.0f, 0.0f, 0.0f);
    var _S370 : vec4<f32> = (readNamed((directory_2), (head_3.z), (vertexIndex_1), (feature_3)));
    var other_0 : vec3<f32> = _S370.xyz;
    var _S371 : vec3<f32>;
    if((head_3.w) != u32(0))
    {
        _S371 = other_0 - p_10;
    }
    else
    {
        _S371 = other_0;
    }
    return _S371;
}

struct Placed_0
{
     position_22 : vec3<f32>,
     jacobian_2 : mat3x3<f32>,
};

fn placeVertex_0( placement_1 : u32,  positionMC_17 : vec3<f32>,  vertexIndex_2 : u32,  directory_3 : u32,  feature_4 : u32) -> Placed_0
{
    var placed_0 : Placed_0;
    placed_0.position_22 = positionMC_17;
    placed_0.jacobian_2 = mat3x3<f32>(1.0f, 0.0f, 0.0f, 0.0f, 1.0f, 0.0f, 0.0f, 0.0f, 1.0f);
    if(placement_1 == u32(4294967295))
    {
        return placed_0;
    }
    var _S372 : u32 = (bitcast<u32>((placements_0[placement_1].x)));
    var _S373 : vec3<f32> = vec3<f32>(0.0f);
    var i_10 : u32 = u32(0);
    var d_6 : vec3<f32> = _S373;
    var j_2 : mat3x3<f32> = mat3x3<f32>(0.0f, 0.0f, 0.0f, 0.0f, 0.0f, 0.0f, 0.0f, 0.0f, 0.0f);
    loop
    {
        if((i_10 < _S372))
        {
        }
        else
        {
            break;
        }
        var row_3 : u32 = placement_1 + u32(1) + i_10 * u32(3);
        var head_4 : vec4<u32> = (bitcast<vec4<u32>>((placements_0[row_3])));
        var w_5 : f32 = termWeight_0(row_3, head_4);
        var jd_0 : mat3x3<f32>;
        var _S374 : vec3<f32> = termDisplacement_0(head_4, placement_1, positionMC_17, vertexIndex_2, directory_3, feature_4, &(jd_0));
        var d_7 : vec3<f32> = d_6 + vec3<f32>(w_5) * _S374;
        var _S375 : mat3x3<f32> = mat3x3<f32>(w_5, w_5, w_5, w_5, w_5, w_5, w_5, w_5, w_5);
        var _S376 : mat3x3<f32> = jd_0;
        var _S377 : mat3x3<f32> = j_2 + mat3x3<f32>(_S375[0] * _S376[0], _S375[1] * _S376[1], _S375[2] * _S376[2]);
        i_10 = i_10 + u32(1);
        d_6 = d_7;
        j_2 = _S377;
    }
    placed_0.position_22 = positionMC_17 + d_6;
    placed_0.jacobian_2 = mat3x3<f32>(1.0f, 0.0f, 0.0f, 0.0f, 1.0f, 0.0f, 0.0f, 0.0f, 1.0f) + j_2;
    return placed_0;
}

fn placePosition_0( placement_2 : u32,  positionMC_18 : vec3<f32>,  vertexIndex_3 : u32,  directory_4 : u32,  feature_5 : u32) -> vec3<f32>
{
    var _S378 : Placed_0 = placeVertex_0(placement_2, positionMC_18, vertexIndex_3, directory_4, feature_5);
    return _S378.position_22;
}

fn read2_0( offset_2 : u32,  index_3 : u32) -> vec2<f32>
{
    var b_10 : u32 = offset_2 + index_3 * u32(2);
    return vec2<f32>(vertices_0[b_10], vertices_0[b_10 + u32(1)]);
}

fn jacobianColumn_0( j_3 : mat3x3<f32>,  c_10 : i32) -> vec3<f32>
{
    return vec3<f32>(j_3[i32(0)][c_10], j_3[i32(1)][c_10], j_3[i32(2)][c_10]);
}

fn turnNormal_0( j_4 : mat3x3<f32>,  n_18 : vec3<f32>) -> vec3<f32>
{
    var c0_0 : vec3<f32> = jacobianColumn_0(j_4, i32(0));
    var c1_0 : vec3<f32> = jacobianColumn_0(j_4, i32(1));
    var c2_0 : vec3<f32> = jacobianColumn_0(j_4, i32(2));
    var a_5 : vec3<f32> = cross(c1_0, c2_0);
    var turned_0 : vec3<f32> = a_5 * vec3<f32>(n_18.x) + cross(c2_0, c0_0) * vec3<f32>(n_18.y) + cross(c0_0, c1_0) * vec3<f32>(n_18.z);
    var _S379 : vec3<f32>;
    if(((dot(c0_0, a_5)) < 0.0f))
    {
        _S379 = (vec3<f32>(0) - turned_0);
    }
    else
    {
        _S379 = turned_0;
    }
    return normalize(_S379);
}

fn column3_0( m_4 : mat4x4<f32>,  c_11 : i32) -> vec3<f32>
{
    return vec3<f32>(m_4[i32(0)][c_11], m_4[i32(1)][c_11], m_4[i32(2)][c_11]);
}

fn airTransmittanceUv_0( r_2 : f32,  mu_1 : f32,  bottom_0 : f32,  top_0 : f32) -> vec2<f32>
{
    var _S380 : f32 = top_0 * top_0;
    var _S381 : f32 = bottom_0 * bottom_0;
    var h_2 : f32 = sqrt(_S380 - _S381);
    var _S382 : f32 = r_2 * r_2;
    var rho_0 : f32 = sqrt(max(0.0f, _S382 - _S381));
    var dMin_0 : f32 = top_0 - r_2;
    return vec2<f32>(0.001953125f + (max(0.0f, - r_2 * mu_1 + sqrt(max(_S382 * (mu_1 * mu_1 - 1.0f) + _S380, 0.0f))) - dMin_0) / (rho_0 + h_2 - dMin_0) * 0.99609375f, 0.0078125f + rho_0 / h_2 * 0.984375f);
}

fn sunAbove_0( r_3 : f32,  mu_2 : f32,  bottom_1 : f32,  soft_0 : f32) -> f32
{
    return clamp(0.5f + (asin(clamp(mu_2, -1.0f, 1.0f)) - asin(- sqrt(max(0.0f, 1.0f - bottom_1 / r_3 * (bottom_1 / r_3))))) / soft_0, 0.0f, 1.0f);
}

fn aerialMarch_0( relPosition_24 : vec3<f32>) -> AerialPerspective_0
{
    var a_6 : AirGroup_std140_0 = air_0.groups_0.data_3[i32(0)];
    var b_11 : AirGroup_std140_0 = air_0.groups_0.data_3[i32(1)];
    var clearAir_0 : AerialPerspective_0;
    clearAir_0.inscatter_0 = vec3<f32>(0.0f);
    clearAir_0.transmittance_0 = vec3<f32>(1.0f);
    var meters_0 : f32 = length(relPosition_24);
    var direction_1 : vec3<f32> = relPosition_24 / vec3<f32>(max(meters_0, 9.99999997475242708e-07f));
    var _S383 : vec3<f32> = vec3<f32>(1000.0f);
    var radii_1 : vec3<f32> = view_0.bodyRadii_0.xyz / _S383;
    var origin_1 : vec3<f32> = cameraPosition_0() / _S383;
    var r_4 : f32 = length(origin_1);
    var mu_3 : f32 = dot(origin_1, direction_1) / r_4;
    var outer_0 : f32 = max(radii_1.x, max(radii_1.y, radii_1.z)) + air_0.groups_0.data_3[i32(0)].topRadius_0 - air_0.groups_0.data_3[i32(0)].bottomRadius_0;
    var start_0 : f32;
    if((r_4 > outer_0))
    {
        var disc_0 : f32 = r_4 * r_4 * (mu_3 * mu_3 - 1.0f) + outer_0 * outer_0;
        if((disc_0 < 0.0f))
        {
            return clearAir_0;
        }
        start_0 = max(- r_4 * mu_3 - sqrt(disc_0), 0.0f);
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
    var _S384 : f32 = 1.0f + nu_0 * nu_0;
    var _S385 : f32 = 0.059683103114366531f * _S384;
    var _S386 : f32 = a_6.miePhaseG_0 * a_6.miePhaseG_0;
    var _S387 : f32 = 0.11936620622873306f * (1.0f - _S386);
    var _S388 : f32 = 2.0f + _S386;
    var _S389 : f32 = 1.0f + _S386;
    var _S390 : f32 = 2.0f * a_6.miePhaseG_0;
    var _S391 : f32 = _S387 / _S388 * _S384 / pow(_S389 - _S390 * nu_0, 1.5f);
    var moonShare_0 : f32 = view_0.sunDirection_0.w;
    var moon_0 : vec3<f32> = view_0.moonLight_0.xyz;
    var moonNu_0 : f32 = dot(direction_1, moon_0);
    var _S392 : f32 = 1.0f + moonNu_0 * moonNu_0;
    var _S393 : f32 = 0.059683103114366531f * _S392 * moonShare_0;
    var _S394 : f32 = _S387 / _S388 * _S392 / pow(_S389 - _S390 * moonNu_0, 1.5f) * moonShare_0;
    var _S395 : vec4<f32> = vec4<f32>(0.0f);
    var _S396 : vec4<f32> = vec4<f32>(1.0f);
    var t0_0 : f32 = start_0;
    var i_11 : i32 = i32(1);
    var transmittanceA_0 : vec4<f32> = _S396;
    var radianceA_0 : vec4<f32> = _S395;
    var transmittanceB_0 : vec4<f32> = _S396;
    var radianceB_0 : vec4<f32> = _S395;
    loop
    {
        if((i_11 <= i32(24)))
        {
        }
        else
        {
            break;
        }
        var u_3 : f32 = 1.0f - f32(i_11) / 24.0f;
        var t1_1 : f32 = start_0 + (end_0 - start_0) * (1.0f - u_3 * u_3 * u_3);
        var dt_2 : f32 = t1_1 - t0_0;
        var p_11 : vec3<f32> = origin_1 + direction_1 * vec3<f32>((0.5f * (t0_0 + t1_1)));
        var distance_1 : f32 = length(p_11);
        var _S397 : f32 = max(distance_1 - distance_1 / length(p_11 / radii_1), 0.0010000000474974513f);
        var rp_0 : f32 = a_6.bottomRadius_0 + _S397;
        var _S398 : vec3<f32> = radii_1 * radii_1;
        var muSun_0 : f32 = dot(normalize(p_11 / _S398), sun_0);
        var _S399 : f32 = - _S397;
        var rayleighDensity_0 : f32 = exp(_S399 / a_6.rayleighScaleHeight_0);
        var mieDensity_0 : f32 = exp(_S399 / a_6.mieScaleHeight_0);
        var ozoneDensity_0 : f32;
        if((_S397 < 25.0f))
        {
            ozoneDensity_0 = clamp(_S397 / 15.0f - 0.66666668653488159f, 0.0f, 1.0f);
        }
        else
        {
            ozoneDensity_0 = clamp(_S399 / 15.0f + 2.6666667461395264f, 0.0f, 1.0f);
        }
        var _S400 : f32 = max(0.017500000074505806f, dt_2 / rp_0);
        var uv_25 : vec2<f32> = airTransmittanceUv_0(rp_0, muSun_0, a_6.bottomRadius_0, a_6.topRadius_0);
        var _S401 : vec3<f32> = vec3<f32>(uv_25, 0.0f);
        var _S402 : vec4<f32> = vec4<f32>(sunAbove_0(rp_0, muSun_0, a_6.bottomRadius_0, _S400));
        var sunA_0 : vec4<f32> = (textureSampleLevel((airTransmittance_0), (environmentSampler_0), ((_S401)).xy, i32(((_S401)).z), (0.0f))) * _S402;
        var _S403 : vec3<f32> = vec3<f32>(uv_25, 1.0f);
        var sunB_0 : vec4<f32> = (textureSampleLevel((airTransmittance_0), (environmentSampler_0), ((_S403)).xy, i32(((_S403)).z), (0.0f))) * _S402;
        var _S404 : f32 = 0.015625f + clamp(_S397 / (a_6.topRadius_0 - a_6.bottomRadius_0), 0.0f, 1.0f) * 0.96875f;
        var msUv_0 : vec2<f32> = vec2<f32>(0.015625f + (muSun_0 * 0.5f + 0.5f) * 0.96875f, _S404);
        var _S405 : vec3<f32> = vec3<f32>(msUv_0, 0.0f);
        var msA_0 : vec4<f32> = (textureSampleLevel((airMultipleScattering_0), (environmentSampler_0), ((_S405)).xy, i32(((_S405)).z), (0.0f)));
        var _S406 : vec3<f32> = vec3<f32>(msUv_0, 1.0f);
        var msB_0 : vec4<f32> = (textureSampleLevel((airMultipleScattering_0), (environmentSampler_0), ((_S406)).xy, i32(((_S406)).z), (0.0f)));
        var moonA_0 : vec4<f32>;
        var moonMsA_0 : vec4<f32>;
        var moonB_0 : vec4<f32>;
        var moonMsB_0 : vec4<f32>;
        if((moonShare_0 > 0.0f))
        {
            var muMoon_0 : f32 = dot(normalize(p_11 / _S398), moon_0);
            var moonUv_0 : vec2<f32> = airTransmittanceUv_0(rp_0, muMoon_0, a_6.bottomRadius_0, a_6.topRadius_0);
            var _S407 : vec3<f32> = vec3<f32>(moonUv_0, 0.0f);
            var _S408 : vec4<f32> = vec4<f32>(sunAbove_0(rp_0, muMoon_0, a_6.bottomRadius_0, _S400));
            var _S409 : vec3<f32> = vec3<f32>(moonUv_0, 1.0f);
            var _S410 : vec4<f32> = (textureSampleLevel((airTransmittance_0), (environmentSampler_0), ((_S409)).xy, i32(((_S409)).z), (0.0f))) * _S408;
            var moonMsUv_0 : vec2<f32> = vec2<f32>(0.015625f + (muMoon_0 * 0.5f + 0.5f) * 0.96875f, _S404);
            var _S411 : vec3<f32> = vec3<f32>(moonMsUv_0, 0.0f);
            var _S412 : vec4<f32> = vec4<f32>(moonShare_0);
            var _S413 : vec4<f32> = (textureSampleLevel((airMultipleScattering_0), (environmentSampler_0), ((_S411)).xy, i32(((_S411)).z), (0.0f))) * _S412;
            var _S414 : vec3<f32> = vec3<f32>(moonMsUv_0, 1.0f);
            var _S415 : vec4<f32> = (textureSampleLevel((airMultipleScattering_0), (environmentSampler_0), ((_S414)).xy, i32(((_S414)).z), (0.0f))) * _S412;
            moonA_0 = (textureSampleLevel((airTransmittance_0), (environmentSampler_0), ((_S407)).xy, i32(((_S407)).z), (0.0f))) * _S408;
            moonMsA_0 = _S413;
            moonB_0 = _S410;
            moonMsB_0 = _S415;
        }
        else
        {
            moonA_0 = _S395;
            moonMsA_0 = _S395;
            moonB_0 = _S395;
            moonMsB_0 = _S395;
        }
        var _S416 : vec4<f32> = vec4<f32>(rayleighDensity_0);
        var rayleigh_0 : vec4<f32> = a_6.rayleighScattering_0 * _S416;
        var _S417 : vec4<f32> = vec4<f32>(mieDensity_0);
        var mie_0 : vec4<f32> = a_6.mieScattering_0 * _S417;
        var extinction_0 : vec4<f32> = rayleigh_0 + a_6.mieExtinction_0 * _S417 + a_6.ozoneAbsorption_0 * vec4<f32>(ozoneDensity_0);
        var _S418 : vec4<f32> = vec4<f32>(_S385);
        var _S419 : vec4<f32> = vec4<f32>(_S391);
        var _S420 : vec4<f32> = rayleigh_0 + mie_0;
        var _S421 : vec4<f32> = vec4<f32>(_S393);
        var _S422 : vec4<f32> = vec4<f32>(_S394);
        var _S423 : vec4<f32> = vec4<f32>(dt_2);
        var segment_0 : vec4<f32> = exp((vec4<f32>(0) - extinction_0) * _S423);
        var _S424 : vec4<f32> = vec4<f32>(1.0f);
        var _S425 : vec4<f32> = vec4<f32>(9.99999971718068537e-10f);
        var radianceA_1 : vec4<f32> = radianceA_0 + transmittanceA_0 * ((rayleigh_0 * _S418 + mie_0 * _S419) * sunA_0 + _S420 * msA_0 + (rayleigh_0 * _S421 + mie_0 * _S422) * moonA_0 + _S420 * moonMsA_0) * (_S424 - segment_0) / max(extinction_0, _S425);
        var transmittanceA_1 : vec4<f32> = transmittanceA_0 * segment_0;
        var rayleigh_1 : vec4<f32> = b_11.rayleighScattering_0 * _S416;
        var mie_1 : vec4<f32> = b_11.mieScattering_0 * _S417;
        var extinction_1 : vec4<f32> = rayleigh_1 + b_11.mieExtinction_0 * _S417 + b_11.ozoneAbsorption_0 * vec4<f32>(ozoneDensity_0);
        var _S426 : vec4<f32> = rayleigh_1 + mie_1;
        var segment_1 : vec4<f32> = exp((vec4<f32>(0) - extinction_1) * _S423);
        var radianceB_1 : vec4<f32> = radianceB_0 + transmittanceB_0 * ((rayleigh_1 * _S418 + mie_1 * _S419) * sunB_0 + _S426 * msB_0 + (rayleigh_1 * _S421 + mie_1 * _S422) * moonB_0 + _S426 * moonMsB_0) * (_S424 - segment_1) / max(extinction_1, _S425);
        var transmittanceB_1 : vec4<f32> = transmittanceB_0 * segment_1;
        var _S427 : i32 = i_11 + i32(1);
        t0_0 = t1_1;
        i_11 = _S427;
        transmittanceA_0 = transmittanceA_1;
        radianceA_0 = radianceA_1;
        transmittanceB_0 = transmittanceB_1;
        radianceB_0 = radianceB_1;
    }
    var la_0 : vec4<f32> = radianceA_0 * a_6.solarIrradiance_0;
    var lb_0 : vec4<f32> = radianceB_0 * b_11.solarIrradiance_0;
    var transmittance_2 : vec3<f32> = (vec3<f32>(transmittanceA_0.x) * air_0.weights_0[i32(0)].xyz + vec3<f32>(transmittanceA_0.y) * air_0.weights_0[i32(1)].xyz + vec3<f32>(transmittanceA_0.z) * air_0.weights_0[i32(2)].xyz + vec3<f32>(transmittanceA_0.w) * air_0.weights_0[i32(3)].xyz + vec3<f32>(transmittanceB_0.x) * air_0.weights_0[i32(4)].xyz + vec3<f32>(transmittanceB_0.y) * air_0.weights_0[i32(5)].xyz + vec3<f32>(transmittanceB_0.z) * air_0.weights_0[i32(6)].xyz + vec3<f32>(transmittanceB_0.w) * air_0.weights_0[i32(7)].xyz) / (air_0.weights_0[i32(0)].xyz + air_0.weights_0[i32(1)].xyz + air_0.weights_0[i32(2)].xyz + air_0.weights_0[i32(3)].xyz + air_0.weights_0[i32(4)].xyz + air_0.weights_0[i32(5)].xyz + air_0.weights_0[i32(6)].xyz + air_0.weights_0[i32(7)].xyz);
    var result_2 : AerialPerspective_0;
    result_2.inscatter_0 = (vec3<f32>(la_0.x) * air_0.weights_0[i32(0)].xyz + vec3<f32>(la_0.y) * air_0.weights_0[i32(1)].xyz + vec3<f32>(la_0.z) * air_0.weights_0[i32(2)].xyz + vec3<f32>(la_0.w) * air_0.weights_0[i32(3)].xyz + vec3<f32>(lb_0.x) * air_0.weights_0[i32(4)].xyz + vec3<f32>(lb_0.y) * air_0.weights_0[i32(5)].xyz + vec3<f32>(lb_0.z) * air_0.weights_0[i32(6)].xyz + vec3<f32>(lb_0.w) * air_0.weights_0[i32(7)].xyz) * vec3<f32>(view_0.exposure_0);
    result_2.transmittance_0 = transmittance_2;
    return result_2;
}

struct PatchVertex_0
{
     position_23 : vec3<f32>,
     normal_19 : vec3<f32>,
     uv_26 : vec2<f32>,
     face_1 : u32,
     trim_1 : u32,
};

fn load4_0( _S428 : u32) -> vec4<f32>
{
    return vec4<f32>(vertices_0[_S428], vertices_0[_S428 + u32(1)], vertices_0[_S428 + u32(2)], vertices_0[_S428 + u32(3)]);
}

fn load3_0( _S429 : u32) -> vec3<f32>
{
    return vec3<f32>(vertices_0[_S429], vertices_0[_S429 + u32(1)], vertices_0[_S429 + u32(2)]);
}

fn loadSpan_0( _S430 : u32) -> PatchSpan_0
{
    var k_3 : u32 = (bitcast<u32>((vertices_0[_S430])));
    var s_17 : PatchSpan_0;
    var _S431 : u32 = (k_3 & (u32(255)));
    s_17.kind_1 = _S431;
    s_17.reversed_0 = ((k_3 & (u32(256)))) != u32(0);
    var d_8 : u32 = (bitcast<u32>((vertices_0[_S430 + u32(1)])));
    s_17.degreeU_0 = (d_8 & (u32(255)));
    s_17.degreeV_0 = (((d_8 >> (u32(8)))) & (u32(255)));
    s_17.face_0 = (bitcast<u32>((vertices_0[_S430 + u32(2)])));
    s_17.controls_0 = (bitcast<u32>((vertices_0[_S430 + u32(3)])));
    s_17.rect_0 = load4_0(_S430 + u32(19));
    var _S432 : u32 = _S430 + u32(23);
    s_17.corner_0 = vec2<f32>(vertices_0[_S432], vertices_0[_S432 + u32(1)]);
    s_17.trim_0 = (bitcast<u32>((vertices_0[_S430 + u32(41)])));
    var _S433 : vec3<f32> = vec3<f32>(0.0f);
    s_17.origin_0 = _S433;
    s_17.axisX_0 = _S433;
    s_17.axisY_0 = _S433;
    var _S434 : vec2<f32> = vec2<f32>(0.0f);
    s_17.params_0 = _S434;
    var _S435 : vec4<f32> = vec4<f32>(0.0f);
    s_17.domain_1 = _S435;
    s_17.sphere_0 = _S435;
    s_17.faceSphere_0 = _S435;
    s_17.density_0 = _S433;
    s_17.speed_0 = _S434;
    if(_S431 == u32(5))
    {
        s_17.domain_1 = load4_0(_S430 + u32(15));
    }
    else
    {
        s_17.origin_0 = load3_0(_S430 + u32(4));
        s_17.axisX_0 = load3_0(_S430 + u32(7));
        s_17.axisY_0 = load3_0(_S430 + u32(10));
        var _S436 : u32 = _S430 + u32(13);
        s_17.params_0 = vec2<f32>(vertices_0[_S436], vertices_0[_S436 + u32(1)]);
    }
    return s_17;
}

fn patchVertex_0( _S437 : u32,  _S438 : u32) -> PatchVertex_0
{
    var result_3 : PatchVertex_0;
    var _S439 : u32 = records_0[_S437].positionOffset_0;
    var _S440 : PatchSpan_0 = loadSpan_0(records_0[_S437].positionOffset_0 + patchChunk_0.y * u32(48));
    var packed_2 : u32 = patchChunk_0.z;
    var nu_1 : u32 = (((packed_2 >> (u32(16)))) & (u32(255)));
    var nv_0 : u32 = (((packed_2 >> (u32(24)))) & (u32(255)));
    var _S441 : u32 = min(((packed_2 & (u32(255)))) + _S438 % u32(5), nu_1);
    var _S442 : u32 = min(((((packed_2 >> (u32(8)))) & (u32(255)))) + _S438 / u32(5), nv_0);
    var i_12 : u32;
    if(_S440.reversed_0)
    {
        i_12 = nu_1 - _S441;
    }
    else
    {
        i_12 = _S441;
    }
    result_3.face_1 = _S440.face_0;
    var n_19 : u32;
    if(((_S440.trim_0) >= u32(4294967294)))
    {
        n_19 = u32(0);
    }
    else
    {
        n_19 = _S440.trim_0 + u32(1);
    }
    result_3.trim_1 = n_19;
    var u_4 : f32;
    if(i_12 == nu_1)
    {
        u_4 = _S440.rect_0.y;
    }
    else
    {
        var _S443 : f32 = _S440.rect_0.x;
        u_4 = _S443 + (_S440.rect_0.y - _S443) * f32(i_12) / f32(nu_1);
    }
    var v_12 : f32;
    if(_S442 == nv_0)
    {
        v_12 = _S440.rect_0.w;
    }
    else
    {
        var _S444 : f32 = _S440.rect_0.z;
        v_12 = _S444 + (_S440.rect_0.w - _S444) * f32(_S442) / f32(nv_0);
    }
    var point_2 : PatchPoint_0;
    if((_S440.kind_1) == u32(5))
    {
        var net_2 : array<vec4<f32>, i32(16)>;
        var _S445 : u32 = (_S440.degreeU_0 + u32(1)) * (_S440.degreeV_0 + u32(1));
        n_19 = u32(0);
        loop
        {
            if((n_19 < u32(16)))
            {
            }
            else
            {
                break;
            }
            if((n_19 < _S445))
            {
                var at_6 : u32 = _S439 + _S440.controls_0 + n_19 * u32(4);
                net_2[n_19] = vec4<f32>(vertices_0[at_6], vertices_0[at_6 + u32(1)], vertices_0[at_6 + u32(2)], vertices_0[at_6 + u32(3)]);
            }
            else
            {
                net_2[n_19] = vec4<f32>(0.0f);
            }
            n_19 = n_19 + u32(1);
        }
        point_2 = evaluateBezier_0(_S440, net_2, u_4, v_12);
    }
    else
    {
        point_2 = evaluateAnalytic_0(_S440, u_4, v_12);
    }
    result_3.position_23 = point_2.position_21;
    var _S446 : vec3<f32>;
    if(_S440.reversed_0)
    {
        _S446 = (vec3<f32>(0) - point_2.normal_18);
    }
    else
    {
        _S446 = point_2.normal_18;
    }
    result_3.normal_19 = _S446;
    result_3.uv_26 = vec2<f32>(u_4, v_12) - _S440.corner_0;
    return result_3;
}

fn vertexOut_0( vertexIndex_4 : u32,  item_0 : u32,  withAir_0 : bool) -> SurfaceVertex
{
    var p_12 : DrawItem_std430_0 = items_0[item_0];
    var _S447 : u32 = p_12.record_0;
    var _S448 : mat4x4<f32> = mat4x4<f32>(p_12.relModel_0.data_4[i32(0)][i32(0)], p_12.relModel_0.data_4[i32(1)][i32(0)], p_12.relModel_0.data_4[i32(2)][i32(0)], p_12.relModel_0.data_4[i32(3)][i32(0)], p_12.relModel_0.data_4[i32(0)][i32(1)], p_12.relModel_0.data_4[i32(1)][i32(1)], p_12.relModel_0.data_4[i32(2)][i32(1)], p_12.relModel_0.data_4[i32(3)][i32(1)], p_12.relModel_0.data_4[i32(0)][i32(2)], p_12.relModel_0.data_4[i32(1)][i32(2)], p_12.relModel_0.data_4[i32(2)][i32(2)], p_12.relModel_0.data_4[i32(3)][i32(2)], p_12.relModel_0.data_4[i32(0)][i32(3)], p_12.relModel_0.data_4[i32(1)][i32(3)], p_12.relModel_0.data_4[i32(2)][i32(3)], p_12.relModel_0.data_4[i32(3)][i32(3)]);
    var out_5 : SurfaceVertex;
    var _S449 : vec2<f32> = vec2<f32>(0.0f);
    out_5.uv = _S449;
    var _S450 : u32 = records_0[_S447].flags_0;
    var points_0 : bool = (((records_0[_S447].flags_0) & (u32(64)))) != u32(0);
    var patched_1 : bool = (((records_0[_S447].flags_0) & (u32(128)))) != u32(0);
    var patchData_0 : PatchVertex_0;
    patchData_0.face_1 = u32(0);
    patchData_0.trim_1 = u32(0);
    var _S451 : vec3<f32> = vec3<f32>(0.0f);
    patchData_0.position_23 = _S451;
    const _S452 : vec3<f32> = vec3<f32>(0.0f, 0.0f, 1.0f);
    patchData_0.normal_19 = _S452;
    patchData_0.uv_26 = _S449;
    var _S453 : vec4<f32> = vec4<f32>(0.0f);
    var anchor_0 : vec4<f32> = _S453;
    var position_24 : vec3<f32>;
    var instance_2 : u32;
    if(points_0)
    {
        var _S454 : u32 = vertexIndex_4 % u32(6);
        var instance_3 : u32 = vertexIndex_4 / u32(6);
        anchor_0 = read4_0(records_0[_S447].positionOffset_0, instance_3);
        var _S455 : vec3<f32> = vec3<f32>(POINT_OFFSET_0[POINT_CORNER_0[_S454]], 0.0f);
        out_5.uv = POINT_UV_0[POINT_CORNER_0[_S454]];
        instance_2 = instance_3;
        position_24 = _S455;
    }
    else
    {
        if(patched_1)
        {
            patchData_0 = patchVertex_0(p_12.record_0, vertexIndex_4);
            out_5.uv = patchData_0.uv_26;
            position_24 = patchData_0.position_23;
        }
        else
        {
            position_24 = read3_0(records_0[_S447].positionOffset_0, vertexIndex_4);
        }
        instance_2 = p_12.instance_0;
    }
    var billboard_0 : bool = ((_S450 & (u32(16)))) != u32(0);
    var placedDraw_0 : bool;
    if(billboard_0)
    {
        placedDraw_0 = (records_0[_S447].placement_0) != u32(4294967295);
    }
    else
    {
        placedDraw_0 = false;
    }
    if(placedDraw_0)
    {
        var _S456 : vec3<f32> = placePosition_0(records_0[_S447].placement_0, anchor_0.xyz, u32(0), records_0[_S447].attributes_0, u32(0));
        anchor_0.x = _S456.x;
        anchor_0.y = _S456.y;
        anchor_0.z = _S456.z;
    }
    cesiumAnchor_0 = (((vec4<f32>(anchor_0.xyz, 1.0f)) * (_S448))).xyz;
    var normal_20 : vec3<f32>;
    if(patched_1)
    {
        normal_20 = patchData_0.normal_19;
    }
    else
    {
        var _S457 : u32 = records_0[_S447].normalOffset_0;
        if((records_0[_S447].normalOffset_0) != u32(4294967295))
        {
            normal_20 = read3_0(_S457, vertexIndex_4);
        }
        else
        {
            normal_20 = _S452;
        }
    }
    if(!points_0)
    {
        placedDraw_0 = !patched_1;
    }
    else
    {
        placedDraw_0 = false;
    }
    if(placedDraw_0)
    {
        placedDraw_0 = (records_0[_S447].uvOffset_0) != u32(4294967295);
    }
    else
    {
        placedDraw_0 = false;
    }
    if(placedDraw_0)
    {
        out_5.uv = read2_0(records_0[_S447].uvOffset_0, vertexIndex_4);
    }
    var _S458 : vec4<f32> = vec4<f32>(1.0f);
    var _S459 : u32 = records_0[_S447].colorOffset_0;
    var vertexColor_0 : vec4<f32>;
    if((records_0[_S447].colorOffset_0) != u32(4294967295))
    {
        vertexColor_0 = read4_0(_S459, vertexIndex_4);
    }
    else
    {
        vertexColor_0 = _S458;
    }
    out_5.color = unpack4x8unorm(p_12.tint_0) * vertexColor_0;
    var _S460 : u32 = records_0[_S447].featureIdOffset_0;
    var _S461 : bool = (records_0[_S447].featureIdOffset_0) != u32(4294967295);
    var localFeature_0 : u32;
    if(_S461)
    {
        localFeature_0 = (bitcast<u32>((vertices_0[_S460 + vertexIndex_4])));
    }
    else
    {
        localFeature_0 = u32(4294967295);
    }
    var tableFeature_0 : u32;
    if(_S460 == u32(4294967295))
    {
        tableFeature_0 = u32(0);
    }
    else
    {
        tableFeature_0 = localFeature_0;
    }
    var _S462 : bool = (p_12.feature_0) != u32(0);
    if(_S462)
    {
        tableFeature_0 = p_12.feature_0 - records_0[_S447].featureId_0;
    }
    if(points_0)
    {
        tableFeature_0 = instance_2;
        localFeature_0 = instance_2;
    }
    if(patched_1)
    {
        tableFeature_0 = patchData_0.face_1;
        localFeature_0 = patchData_0.face_1;
    }
    var _S463 : u32;
    if(billboard_0)
    {
        _S463 = u32(4294967295);
    }
    else
    {
        _S463 = records_0[_S447].placement_0;
    }
    var _S464 : u32 = records_0[_S447].attributes_0;
    var placed_1 : Placed_0 = placeVertex_0(_S463, position_24, vertexIndex_4, records_0[_S447].attributes_0, tableFeature_0);
    if((records_0[_S447].placement_0) != u32(4294967295))
    {
        placedDraw_0 = !billboard_0;
    }
    else
    {
        placedDraw_0 = false;
    }
    if(placedDraw_0)
    {
        normal_20 = turnNormal_0(placed_1.jacobian_2, normal_20);
    }
    out_5.tangent = _S453;
    var _S465 : u32 = records_0[_S447].tangentOffset_0;
    if((records_0[_S447].tangentOffset_0) != u32(4294967295))
    {
        var t_9 : vec4<f32> = read4_0(_S465, vertexIndex_4);
        var turned_1 : vec3<f32>;
        if(placedDraw_0)
        {
            turned_1 = (((t_9.xyz) * (placed_1.jacobian_2)));
        }
        else
        {
            turned_1 = t_9.xyz;
        }
        out_5.tangent = vec4<f32>(normalize((((vec4<f32>(turned_1, 0.0f)) * (_S448))).xyz), t_9.w);
    }
    var v_13 : CesiumVertex;
    v_13.positionMC = placed_1.position_22;
    v_13.designPositionMC = position_24;
    v_13.normalMC = normal_20;
    v_13.texCoord0 = out_5.uv;
    v_13.color0 = vertexColor_0;
    v_13.featureId0 = localFeature_0;
    v_13.vertexIndex = vertexIndex_4;
    v_13.instanceIndex = instance_2;
    v_13.time = view_0.time_0.x;
    v_13.draw = p_12.record_0;
    v_13.directory = _S464;
    v_13.tableFeature = tableFeature_0;
    var stage_0 : CesiumVertexResult = (cesiumVertexStage((v_13)));
    if((vertexIndex_4 >= (records_0[_S447].skirtStart_0)))
    {
        tableFeature_0 = u32(2147483648);
    }
    else
    {
        tableFeature_0 = u32(0);
    }
    out_5.ids[i32(2)] = (instance_2 | (tableFeature_0));
    if(patched_1)
    {
        out_5.ids[i32(2)] = patchData_0.trim_1;
    }
    out_5.named0 = stage_0.named0;
    out_5.named1 = stage_0.named1;
    out_5.named2 = stage_0.named2;
    out_5.named3 = stage_0.named3;
    out_5.positionMC = position_24;
    var world_0 : vec4<f32> = (((vec4<f32>(stage_0.positionMC, 1.0f)) * (_S448)));
    if(placedDraw_0)
    {
        position_24 = (((vec4<f32>(position_24, 1.0f)) * (_S448))).xyz;
    }
    else
    {
        position_24 = world_0.xyz;
    }
    out_5.relPosition = position_24;
    out_5.position = (((world_0) * (mat4x4<f32>(view_0.viewProj_0.data_0[i32(0)][i32(0)], view_0.viewProj_0.data_0[i32(1)][i32(0)], view_0.viewProj_0.data_0[i32(2)][i32(0)], view_0.viewProj_0.data_0[i32(3)][i32(0)], view_0.viewProj_0.data_0[i32(0)][i32(1)], view_0.viewProj_0.data_0[i32(1)][i32(1)], view_0.viewProj_0.data_0[i32(2)][i32(1)], view_0.viewProj_0.data_0[i32(3)][i32(1)], view_0.viewProj_0.data_0[i32(0)][i32(2)], view_0.viewProj_0.data_0[i32(1)][i32(2)], view_0.viewProj_0.data_0[i32(2)][i32(2)], view_0.viewProj_0.data_0[i32(3)][i32(2)], view_0.viewProj_0.data_0[i32(0)][i32(3)], view_0.viewProj_0.data_0[i32(1)][i32(3)], view_0.viewProj_0.data_0[i32(2)][i32(3)], view_0.viewProj_0.data_0[i32(3)][i32(3)]))));
    var world_1 : vec4<f32>;
    if(billboard_0)
    {
        var world_2 : vec4<f32> = (((vec4<f32>(anchor_0.xyz, 1.0f)) * (_S448)));
        var _S466 : vec3<f32> = world_2.xyz;
        out_5.relPosition = _S466;
        var _S467 : vec4<f32> = (((world_2) * (mat4x4<f32>(view_0.viewProj_0.data_0[i32(0)][i32(0)], view_0.viewProj_0.data_0[i32(1)][i32(0)], view_0.viewProj_0.data_0[i32(2)][i32(0)], view_0.viewProj_0.data_0[i32(3)][i32(0)], view_0.viewProj_0.data_0[i32(0)][i32(1)], view_0.viewProj_0.data_0[i32(1)][i32(1)], view_0.viewProj_0.data_0[i32(2)][i32(1)], view_0.viewProj_0.data_0[i32(3)][i32(1)], view_0.viewProj_0.data_0[i32(0)][i32(2)], view_0.viewProj_0.data_0[i32(1)][i32(2)], view_0.viewProj_0.data_0[i32(2)][i32(2)], view_0.viewProj_0.data_0[i32(3)][i32(2)], view_0.viewProj_0.data_0[i32(0)][i32(3)], view_0.viewProj_0.data_0[i32(1)][i32(3)], view_0.viewProj_0.data_0[i32(2)][i32(3)], view_0.viewProj_0.data_0[i32(3)][i32(3)]))));
        out_5.position = vec4<f32>(_S467.xy + stage_0.positionMC.xy * vec2<f32>(records_0[_S447].billboardSize_0) * vec2<f32>(length(column3_0(_S448, i32(0)))) * vec2<f32>(2.0f) * view_0.viewport_0.zw * vec2<f32>(_S467.w), _S467.zw);
        if(((length(_S466)) < (records_0[_S447].billboardDepthTest_0)))
        {
            out_5.position[i32(2)] = out_5.position.w;
        }
        if(points_0)
        {
            placedDraw_0 = !((abs(anchor_0.x)) < 9.99999993381581251e+36f);
        }
        else
        {
            placedDraw_0 = false;
        }
        if(placedDraw_0)
        {
            out_5.position = vec4<f32>(0.0f, 0.0f, -1.0f, 1.0f);
        }
        world_1 = world_2;
    }
    else
    {
        world_1 = world_0;
    }
    out_5.airInscatter = _S451;
    out_5.airTransmittance = vec3<f32>(1.0f);
    var unlitDraw_0 : bool = ((_S450 & (u32(2)))) != u32(0);
    if(withAir_0)
    {
        placedDraw_0 = !unlitDraw_0;
    }
    else
    {
        placedDraw_0 = false;
    }
    if(placedDraw_0)
    {
        placedDraw_0 = ((view_0.sunLight_0.w) > 0.5f);
    }
    else
    {
        placedDraw_0 = false;
    }
    if(placedDraw_0)
    {
        placedDraw_0 = ((view_0.bodyRadii_0.w) > 0.0f);
    }
    else
    {
        placedDraw_0 = false;
    }
    if(placedDraw_0)
    {
        var a_7 : AerialPerspective_0 = aerialMarch_0(world_1.xyz);
        out_5.airInscatter = a_7.inscatter_0;
        out_5.airTransmittance = a_7.transmittance_0;
    }
    if(((_S450 & (u32(8)))) != u32(0))
    {
        out_5.position[i32(2)] = out_5.position[i32(2)] * 5.42101086242752217e-20f;
    }
    var c0_1 : vec3<f32> = column3_0(_S448, i32(0));
    var c1_1 : vec3<f32> = column3_0(_S448, i32(1));
    var c2_1 : vec3<f32> = column3_0(_S448, i32(2));
    var _S468 : vec3<f32> = cross(c1_1, c2_1);
    out_5.normal = normalize(_S468 * vec3<f32>(stage_0.normalMC.x) + cross(c2_1, c0_1) * vec3<f32>(stage_0.normalMC.y) + cross(c0_1, c1_1) * vec3<f32>(stage_0.normalMC.z)) * vec3<f32>(f32((i32(sign((dot(c0_1, _S468)))))));
    if(billboard_0)
    {
        out_5.normal = (vec3<f32>(0) - normalize(world_1.xyz));
    }
    out_5.ids[i32(0)] = p_12.record_0;
    var _S469 : u32 = records_0[_S447].featureId_0;
    out_5.ids[i32(1)] = records_0[_S447].featureId_0;
    if(points_0)
    {
        out_5.ids[i32(1)] = _S469 + instance_2;
    }
    else
    {
        if(patched_1)
        {
            if(_S469 == u32(0))
            {
                instance_2 = u32(0);
            }
            else
            {
                instance_2 = _S469 + patchData_0.face_1;
            }
            out_5.ids[i32(1)] = instance_2;
        }
        else
        {
            if(_S462)
            {
                out_5.ids[i32(1)] = p_12.feature_0;
            }
            else
            {
                if(_S461)
                {
                    if(localFeature_0 == u32(4294967295))
                    {
                        instance_2 = u32(0);
                    }
                    else
                    {
                        instance_2 = _S469 + localFeature_0;
                    }
                    out_5.ids[i32(1)] = instance_2;
                }
            }
        }
    }
    return out_5;
}

fn surfaceVertex( vertexIndex_5 : u32,  item_1 : u32) -> SurfaceVertex
{
    var _S470 : SurfaceVertex = vertexOut_0(vertexIndex_5, item_1, true);
    return _S470;
}

fn surfacePointVertex( vertexIndex_6 : u32,  item_2 : u32) -> SurfaceVertex
{
    var _S471 : SurfaceVertex = vertexOut_0((bitcast<u32>((vertices_0[records_0[items_0[item_2].record_0].uvOffset_0 + vertexIndex_6 / u32(6)]))) * u32(6) + vertexIndex_6 % u32(6), item_2, true);
    return _S471;
}

fn surfaceDepthVertex( vertexIndex_7 : u32,  item_3 : u32) -> SurfaceVertex
{
    var _S472 : SurfaceVertex = vertexOut_0(vertexIndex_7, item_3, false);
    return _S472;
}

fn surfacePatchVertex( vertexIndex_8 : u32,  chunk_0 : vec4<u32>) -> SurfaceVertex
{
    patchChunk_0 = chunk_0;
    var _S473 : SurfaceVertex = vertexOut_0(vertexIndex_8, chunk_0.x, true);
    return _S473;
}

fn surfacePatchDepthVertex( vertexIndex_9 : u32,  chunk_1 : vec4<u32>) -> SurfaceVertex
{
    patchChunk_0 = chunk_1;
    var _S474 : SurfaceVertex = vertexOut_0(vertexIndex_9, chunk_1.x, false);
    return _S474;
}

var<private> pickTriangleNumber_0 : u32;

fn pickWindowed_0( v_14 : SurfaceVertex) -> SurfaceVertex
{
    var _S475 : SurfaceVertex = v_14;
    var _S476 : vec2<f32> = (_S475.position.xy - view_0.iblFrame_0[i32(0)].xy * vec2<f32>(_S475.position.w)) / view_0.iblFrame_0[i32(0)].zw;
    _S475.position.x = _S476.x;
    _S475.position.y = _S476.y;
    return _S475;
}

fn surfacePickVertex( vertexIndex_10 : u32,  item_4 : u32) -> SurfaceVertex
{
    var at_7 : u32 = vertexIndex_10 - records_0[items_0[item_4].record_0].firstIndex_0;
    pickTriangleNumber_0 = at_7 / u32(3);
    var corner_1 : u32 = at_7 % u32(3);
    var _S477 : SurfaceVertex = vertexOut_0(pickIndices_0[vertexIndex_10], item_4, false);
    var out_6 : SurfaceVertex = _S477;
    var _S478 : f32;
    if(corner_1 == u32(0))
    {
        _S478 = 1.0f;
    }
    else
    {
        _S478 = 0.0f;
    }
    var _S479 : f32;
    if(corner_1 == u32(1))
    {
        _S479 = 1.0f;
    }
    else
    {
        _S479 = 0.0f;
    }
    var _S480 : f32;
    if(corner_1 == u32(2))
    {
        _S480 = 1.0f;
    }
    else
    {
        _S480 = 0.0f;
    }
    out_6.airInscatter = vec3<f32>(_S478, _S479, _S480);
    return pickWindowed_0(out_6);
}

fn surfacePatchPickVertex( vertexIndex_11 : u32,  chunk_2 : vec4<u32>) -> SurfaceVertex
{
    patchChunk_0 = chunk_2;
    pickTriangleNumber_0 = u32(0);
    var _S481 : u32 = chunk_2.x;
    var _S482 : SurfaceVertex = vertexOut_0(vertexIndex_11, _S481, false);
    var out_7 : SurfaceVertex = _S482;
    out_7.airInscatter = vec3<f32>(loadSpan_0(records_0[_S481].positionOffset_0 + chunk_2.y * u32(48)).corner_0, 0.0f);
    return pickWindowed_0(out_7);
}

fn surfacePickTriangle() -> u32
{
    return pickTriangleNumber_0;
}

