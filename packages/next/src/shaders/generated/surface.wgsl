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

@binding(17) @group(0) var<storage, read> clipTable_0 : array<vec4<f32>>;

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

@binding(4) @group(1) var<storage, read> clipBoxes_0 : array<vec4<f32>>;

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
    @align(16) drawn_0 : vec4<f32>,
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

@id(1) override clipsOn_0 : bool = false;

var<private> clipGhosts_0 : bool;

var<private> clipGhosted_0 : bool;

var<private> clipGhostAlpha_0 : f32;

fn clipRow_0( row_0 : u32) -> vec4<f32>
{
    return clipTable_0[min(row_0, u32(4095))];
}

fn clipVertex_0( first_0 : u32,  i_0 : u32) -> vec2<f32>
{
    var v_0 : vec4<f32> = clipRow_0(first_0 + ((i_0 >> (u32(1)))));
    var _S2 : vec2<f32>;
    if(((i_0 & (u32(1)))) == u32(0))
    {
        _S2 = v_0.xy;
    }
    else
    {
        _S2 = v_0.zw;
    }
    return _S2;
}

fn insideClipShape_0( at_0 : u32,  p_0 : vec3<f32>) -> bool
{
    var head_0 : vec4<u32> = (bitcast<vec4<u32>>((clipRow_0(at_0))));
    var a_0 : vec4<f32> = clipRow_0(at_0 + u32(1));
    var ua_0 : f32 = dot(a_0.xyz, p_0) + a_0.w;
    var _S3 : u32 = head_0.x;
    if(_S3 == u32(0))
    {
        return (ua_0 <= 0.0f);
    }
    var b_0 : vec4<f32> = clipRow_0(at_0 + u32(2));
    var c_0 : vec4<f32> = clipRow_0(at_0 + u32(3));
    var ub_0 : f32 = dot(b_0.xyz, p_0) + b_0.w;
    var uc_0 : f32 = dot(c_0.xyz, p_0) + c_0.w;
    if(_S3 == u32(1))
    {
        return ((max(abs(ua_0), max(abs(ub_0), abs(uc_0)))) <= 1.0f);
    }
    var zRange_0 : vec2<f32> = clipRow_0(at_0 + u32(4)).xy;
    var inside_0 : bool;
    if((uc_0 < (zRange_0.x)))
    {
        inside_0 = true;
    }
    else
    {
        inside_0 = (uc_0 > (zRange_0.y));
    }
    if(inside_0)
    {
        return false;
    }
    var _S4 : u32 = min(head_0.z, u32(128));
    inside_0 = false;
    var i_1 : u32 = u32(0);
    loop
    {
        if((i_1 < u32(128)))
        {
        }
        else
        {
            break;
        }
        if((i_1 >= _S4))
        {
            break;
        }
        var _S5 : u32 = at_0 + u32(5);
        var s_0 : vec2<f32> = clipVertex_0(_S5, i_1);
        var _S6 : u32 = i_1 + u32(1);
        var _S7 : u32;
        if(_S6 == _S4)
        {
            _S7 = u32(0);
        }
        else
        {
            _S7 = _S6;
        }
        var e_0 : vec2<f32> = clipVertex_0(_S5, _S7);
        var _S8 : f32 = s_0.y;
        var _S9 : f32 = e_0.y;
        if((_S8 > ub_0) != (_S9 > ub_0))
        {
            var _S10 : f32 = s_0.x;
            var inside_1 : bool;
            if((ua_0 < (_S10 + (ub_0 - _S8) * (e_0.x - _S10) / (_S9 - _S8))))
            {
                inside_1 = !inside_0;
            }
            else
            {
                inside_1 = inside_0;
            }
            inside_0 = inside_1;
        }
        i_1 = _S6;
    }
    return inside_0;
}

fn clipDither_0( position_0 : vec2<f32>) -> f32
{
    return fract(52.982917785644531f * fract(dot(floor(position_0), vec2<f32>(0.067110560834407806f, 0.0058371499180793762f))));
}

fn _S11() -> vec4<f32>
{
    return vec4<f32>(1.0f, 1.0f, 1.0f, 0.0f);
}

var<private> clipGhostTint_0 : vec4<f32>;

fn clipShapeDistance_0( at_1 : u32,  p_1 : vec3<f32>) -> f32
{
    var head_1 : vec4<u32> = (bitcast<vec4<u32>>((clipRow_0(at_1))));
    var a_1 : vec4<f32> = clipRow_0(at_1 + u32(1));
    var _S12 : vec3<f32> = a_1.xyz;
    var ua_1 : f32 = dot(_S12, p_1) + a_1.w;
    var _S13 : u32 = head_1.x;
    if(_S13 == u32(0))
    {
        return ua_1;
    }
    var b_1 : vec4<f32> = clipRow_0(at_1 + u32(2));
    var c_1 : vec4<f32> = clipRow_0(at_1 + u32(3));
    var _S14 : vec3<f32> = b_1.xyz;
    var ub_1 : f32 = dot(_S14, p_1) + b_1.w;
    var _S15 : vec3<f32> = c_1.xyz;
    var uc_1 : f32 = dot(_S15, p_1) + c_1.w;
    if(_S13 == u32(1))
    {
        return max((abs(ua_1) - 1.0f) / length(_S12), max((abs(ub_1) - 1.0f) / length(_S14), (abs(uc_1) - 1.0f) / length(_S15)));
    }
    var zRange_1 : vec2<f32> = clipRow_0(at_1 + u32(4)).xy;
    var _S16 : u32 = min(head_1.z, u32(128));
    var nearest_0 : f32 = 3.39999995214436425e+38f;
    var inside_2 : bool = false;
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
        if((i_2 >= _S16))
        {
            break;
        }
        var _S17 : u32 = at_1 + u32(5);
        var s_1 : vec2<f32> = clipVertex_0(_S17, i_2);
        var _S18 : u32 = i_2 + u32(1);
        var _S19 : u32;
        if(_S18 == _S16)
        {
            _S19 = u32(0);
        }
        else
        {
            _S19 = _S18;
        }
        var e_1 : vec2<f32> = clipVertex_0(_S17, _S19);
        var edge_0 : vec2<f32> = e_1 - s_1;
        var toPoint_0 : vec2<f32> = vec2<f32>(ua_1, ub_1) - s_1;
        var _S20 : f32 = min(nearest_0, length(toPoint_0 - edge_0 * vec2<f32>(clamp(dot(toPoint_0, edge_0) / max(dot(edge_0, edge_0), 9.99999968265522539e-21f), 0.0f, 1.0f))));
        var _S21 : f32 = s_1.y;
        var _S22 : f32 = e_1.y;
        if((_S21 > ub_1) != (_S22 > ub_1))
        {
            var _S23 : f32 = s_1.x;
            var inside_3 : bool;
            if((ua_1 < (_S23 + (ub_1 - _S21) * (e_1.x - _S23) / (_S22 - _S21))))
            {
                inside_3 = !inside_2;
            }
            else
            {
                inside_3 = inside_2;
            }
            inside_2 = inside_3;
        }
        nearest_0 = _S20;
        i_2 = _S18;
    }
    if(inside_2)
    {
        nearest_0 = - nearest_0;
    }
    return max(nearest_0, max(zRange_1.x - uc_1, uc_1 - zRange_1.y));
}

var<private> clipIdOut_0 : u32;

var<private> clipDistanceOut_0 : f32;

var<private> clipFlagsOut_0 : u32;

fn _S24() -> vec4<f32>
{
    return vec4<f32>(0.0f);
}

var<private> clipParamsOut_0 : vec4<f32>;

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
    var _S25 : u32 = materialTextureRef_0(&((*m_2)), slot_2);
    return _S25 != u32(65535);
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
     truePositionEC : vec3<f32>,
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
     clipDistance : f32,
     clipFlags : u32,
     clipId : u32,
     clipParams : vec4<f32>,
};

var<private> cesiumAnchor_0 : vec3<f32>;

struct SplitPosition_0
{
     hi_0 : vec3<f32>,
     lo_0 : vec3<f32>,
};

fn SplitPosition_x24init_0( hi_1 : vec3<f32>,  lo_1 : vec3<f32>) -> SplitPosition_0
{
    var _S26 : SplitPosition_0;
    _S26.hi_0 = hi_1;
    _S26.lo_0 = lo_1;
    return _S26;
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
     position_1 : vec4<f32>,
     normal_1 : vec3<f32>,
     uv_1 : vec2<f32>,
     color_1 : vec4<f32>,
     ids_0 : vec3<u32>,
     relPosition_0 : vec3<f32>,
     tangent_0 : vec4<f32>,
     airInscatter_0 : vec3<f32>,
     airTransmittance_1 : vec4<f32>,
     positionMC_0 : vec3<f32>,
     named0_0 : vec4<f32>,
     named1_0 : vec4<f32>,
     named2_0 : vec4<f32>,
     named3_0 : vec4<f32>,
};

fn fragmentOf_0( in_0 : SurfaceVaryings_0,  geometric_0 : vec3<f32>,  drawn_1 : vec3<f32>) -> CesiumFragment
{
    var _S27 : u32 = in_0.ids_0.x;
    cesiumAnchor_0 = drawn_1;
    var f_0 : CesiumFragment;
    f_0.positionMC = in_0.positionMC_0;
    f_0.positionEC = drawn_1;
    f_0.positionWC = drawn_1 + cameraPosition_0();
    f_0.truePositionEC = in_0.relPosition_0;
    f_0.normal = geometric_0;
    f_0.texCoord0 = in_0.uv_1;
    f_0.color0 = in_0.color_1 * records_0[_S27].color_0;
    var _S28 : u32 = in_0.ids_0.y;
    f_0.featureId = _S28;
    f_0.screen = in_0.position_1.xy;
    f_0.time = view_0.time_0.x;
    f_0.instanceIndex = ((in_0.ids_0.z) & (u32(2147483647)));
    if((((records_0[_S27].flags_0) & (u32(128)))) != u32(0))
    {
        f_0.instanceIndex = u32(0);
    }
    f_0.draw = _S27;
    f_0.directory = records_0[_S27].attributes_0;
    var _S29 : u32;
    if(_S28 == u32(0))
    {
        _S29 = u32(4294967295);
    }
    else
    {
        _S29 = _S28 - records_0[_S27].featureId_0;
    }
    f_0.localFeature = _S29;
    f_0.named0 = in_0.named0_0;
    f_0.named1 = in_0.named1_0;
    f_0.named2 = in_0.named2_0;
    f_0.named3 = in_0.named3_0;
    f_0.clipDistance = clipDistanceOut_0;
    f_0.clipFlags = clipFlagsOut_0;
    f_0.clipId = clipIdOut_0;
    f_0.clipParams = clipParamsOut_0;
    return f_0;
}

var<private> terrainSeen_0 : bool;

fn SplitPosition_difference_0( this_1 : SplitPosition_0,  b_2 : SplitPosition_0) -> vec3<f32>
{
    return vec3<f32>(vec3<i32>(this_1.hi_0) - vec3<i32>(b_2.hi_0)) + (this_1.lo_0 - b_2.lo_0);
}

fn segmentsCross_0( a_2 : vec2<f32>,  b_3 : vec2<f32>,  q_0 : vec2<f32>,  s_2 : vec2<f32>) -> bool
{
    var e_2 : vec2<f32> = b_3 - a_2;
    var t_0 : vec2<f32> = s_2 - q_0;
    var _S30 : f32 = e_2.x;
    var _S31 : f32 = q_0.y;
    var _S32 : f32 = a_2.y;
    var _S33 : f32 = e_2.y;
    var _S34 : f32 = q_0.x;
    var _S35 : f32 = a_2.x;
    var _S36 : f32 = t_0.x;
    var _S37 : f32 = t_0.y;
    var aSide_0 : bool = ((_S36 * (_S32 - _S31) - _S37 * (_S35 - _S34)) > 0.0f);
    var bSide_0 : bool = ((_S36 * (b_3.y - _S31) - _S37 * (b_3.x - _S34)) > 0.0f);
    var _S38 : bool;
    if(((_S30 * (_S31 - _S32) - _S33 * (_S34 - _S35)) > 0.0f) != ((_S30 * (s_2.y - _S32) - _S33 * (s_2.x - _S35)) > 0.0f))
    {
        _S38 = aSide_0 != bSide_0;
    }
    else
    {
        _S38 = false;
    }
    return _S38;
}

fn terrainOpacity_0( mask_0 : u32,  p_2 : vec3<f32>,  which_0 : u32) -> f32
{
    var _S39 : SplitPosition_0 = SplitPosition_x24init_0(view_0.cameraHi_0, view_0.cameraLo_0);
    var opacity_0 : f32 = 1.0f;
    var n_0 : u32 = u32(0);
    var _S40 : u32 = mask_0;
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
        if(_S40 == u32(0))
        {
            break;
        }
        var _S41 : u32 = (_S40 & ((_S40 - u32(1))));
        var entry_0 : vec4<u32> = (bitcast<vec4<u32>>((clipBoxes_0[firstbitlow_0(_S40)])));
        var _S42 : f32 = (bitcast<f32>((entry_0.y)));
        var alpha_1 : f32;
        if(which_0 == u32(2))
        {
            if((entry_0.w) != u32(0))
            {
                n_0 = n_0 + u32(1);
                _S40 = _S41;
                continue;
            }
            alpha_1 = 0.0f;
        }
        else
        {
            alpha_1 = _S42;
        }
        var _S43 : bool;
        if((alpha_1 >= opacity_0))
        {
            _S43 = true;
        }
        else
        {
            if(which_0 == u32(1))
            {
                _S43 = (alpha_1 > 0.0f);
            }
            else
            {
                _S43 = false;
            }
        }
        if(_S43)
        {
            n_0 = n_0 + u32(1);
            _S40 = _S41;
            continue;
        }
        if((entry_0.z) != u32(0))
        {
            opacity_0 = alpha_1;
            n_0 = n_0 + u32(1);
            _S40 = _S41;
            continue;
        }
        var o_0 : u32 = entry_0.x;
        var hi_2 : vec4<f32> = clipBoxes_0[o_0];
        var lo_2 : vec4<f32> = clipBoxes_0[o_0 + u32(1)];
        var d_0 : vec3<f32> = p_2 - SplitPosition_difference_0(SplitPosition_x24init_0(hi_2.xyz, lo_2.xyz), _S39);
        var _S44 : f32 = dot(clipBoxes_0[o_0 + u32(2)].xyz, d_0);
        var _S45 : f32 = dot(clipBoxes_0[o_0 + u32(3)].xyz, d_0);
        var _S46 : f32 = hi_2.w;
        var denominator_0 : f32 = _S46 + dot(clipBoxes_0[o_0 + u32(4)].xyz, d_0);
        if((denominator_0 <= 0.0f))
        {
            n_0 = n_0 + u32(1);
            _S40 = _S41;
            continue;
        }
        var q_1 : vec2<f32> = vec2<f32>(_S44, _S45) * vec2<f32>((_S46 / denominator_0));
        var box_0 : vec4<f32> = clipBoxes_0[o_0 + u32(5)];
        var _S47 : f32 = q_1.x;
        var _S48 : bool;
        if((_S47 < (box_0.x)))
        {
            _S48 = true;
        }
        else
        {
            _S48 = ((q_1.y) < (box_0.y));
        }
        var _S49 : bool;
        if(_S48)
        {
            _S49 = true;
        }
        else
        {
            _S49 = (_S47 > (box_0.z));
        }
        var _S50 : bool;
        if(_S49)
        {
            _S50 = true;
        }
        else
        {
            _S50 = ((q_1.y) > (box_0.w));
        }
        if(_S50)
        {
            n_0 = n_0 + u32(1);
            _S40 = _S41;
            continue;
        }
        var sizes_0 : u32 = (bitcast<u32>((lo_2.w)));
        var size_0 : vec2<u32> = clamp(vec2<u32>((sizes_0 & (u32(65535))), (sizes_0 >> (u32(16)))), vec2<u32>(u32(1)), vec2<u32>(u32(128)));
        var grid_0 : u32 = o_0 + u32(6);
        var _S51 : u32 = size_0.x;
        var _S52 : u32 = grid_0 + _S51 * size_0.y;
        var _S53 : vec2<f32> = box_0.xy;
        var _S54 : vec2<u32> = min(vec2<u32>(max((q_1 - _S53) / max((box_0.zw - _S53) / vec2<f32>(size_0), vec2<f32>(9.99999997475242708e-07f)), vec2<f32>(0.0f))), size_0 - vec2<u32>(u32(1)));
        var c_2 : vec4<f32> = clipBoxes_0[grid_0 + _S54.y * _S51 + _S54.x];
        var _S55 : u32 = (bitcast<u32>((c_2.x)));
        var word_1 : u32 = (bitcast<u32>((c_2.y)));
        var _S56 : u32 = min((word_1 & (u32(2147483647))), min(u32(32), budget_0));
        var budget_1 : u32 = budget_0 - _S56;
        var inside_4 : bool = ((word_1 >> (u32(31)))) != u32(0);
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
            if((j_0 >= _S56))
            {
                break;
            }
            var edge_1 : vec4<f32> = clipBoxes_0[_S52 + _S55 + j_0];
            if(segmentsCross_0(edge_1.xy, edge_1.zw, q_1, c_2.zw))
            {
                inside_4 = !inside_4;
            }
            j_0 = j_0 + u32(1);
        }
        var opacity_1 : f32;
        if(inside_4)
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
        _S40 = _S41;
    }
    return opacity_0;
}

fn drawnPosition_0( _S57 : SurfaceVaryings_0,  _S58 : u32) -> vec3<f32>
{
    var _S59 : bool;
    if((records_0[_S58].placement_0) != u32(4294967295))
    {
        _S59 = (((records_0[_S58].flags_0) & (u32(24)))) == u32(0);
    }
    else
    {
        _S59 = false;
    }
    if(_S59)
    {
        _S59 = ((view_0.time_0.y + view_0.time_0.z) < 0.5f);
    }
    else
    {
        _S59 = false;
    }
    var p_3 : vec3<f32>;
    if(_S59)
    {
        var ndc_0 : vec2<f32> = _S57.position_1.xy * view_0.viewport_0.zw * vec2<f32>(2.0f, -2.0f) + vec2<f32>(-1.0f, 1.0f);
        var _S60 : vec3<f32> = vec3<f32>(view_0.viewProj_0.data_0[i32(0)][i32(0)], view_0.viewProj_0.data_0[i32(1)][i32(0)], view_0.viewProj_0.data_0[i32(2)][i32(0)]);
        var _S61 : vec3<f32> = vec3<f32>(view_0.viewProj_0.data_0[i32(0)][i32(1)], view_0.viewProj_0.data_0[i32(1)][i32(1)], view_0.viewProj_0.data_0[i32(2)][i32(1)]);
        p_3 = (_S60 * vec3<f32>((ndc_0.x / dot(_S60, _S60))) + _S61 * vec3<f32>((ndc_0.y / dot(_S61, _S61))) + vec3<f32>(view_0.viewProj_0.data_0[i32(0)][i32(3)], view_0.viewProj_0.data_0[i32(1)][i32(3)], view_0.viewProj_0.data_0[i32(2)][i32(3)])) * vec3<f32>((view_0.near_0 / _S57.position_1.z));
    }
    else
    {
        p_3 = _S57.relPosition_0;
    }
    return p_3;
}

fn clipsKeep_0( _S62 : SurfaceVaryings_0,  _S63 : u32) -> bool
{
    var region_0 : bool;
    clipGhosted_0 = false;
    clipGhostAlpha_0 = 1.0f;
    if((((records_0[_S63].flags_0) & (u32(4096)))) != u32(0))
    {
        return true;
    }
    var head_2 : vec4<u32> = (bitcast<vec4<u32>>((clipRow_0(u32(0)))));
    var _S64 : u32 = min(head_2.x, u32(8));
    var _S65 : vec3<f32>;
    if((((head_2.y) & (u32(1)))) != u32(0))
    {
        _S65 = drawnPosition_0(_S62, _S63);
    }
    else
    {
        _S65 = _S62.relPosition_0;
    }
    var s_3 : u32 = u32(0);
    loop
    {
        if((s_3 < u32(8)))
        {
        }
        else
        {
            break;
        }
        if((s_3 >= _S64))
        {
            break;
        }
        var entry_1 : vec4<u32> = (bitcast<vec4<u32>>((clipRow_0(u32(1) + s_3))));
        var _S66 : u32 = entry_1.z;
        if(((_S66 & (u32(8)))) != u32(0))
        {
            if(((_S62.airTransmittance_1.w) > 0.0f))
            {
                return false;
            }
            s_3 = s_3 + u32(1);
            continue;
        }
        var _S67 : vec3<f32>;
        if(((_S66 & (u32(4)))) != u32(0))
        {
            _S67 = _S65;
        }
        else
        {
            _S67 = _S62.relPosition_0;
        }
        var every_0 : bool = ((_S66 & (u32(1)))) != u32(0);
        var _S68 : u32 = entry_1.x;
        var _S69 : u32 = min(entry_1.y, u32(16));
        var k_0 : u32 = u32(0);
        var at_2 : u32 = _S68;
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
            if((k_0 >= _S69))
            {
                region_0 = every_0;
                break;
            }
            var inside_5 : bool = insideClipShape_0(at_2, _S67);
            if(every_0)
            {
                region_0 = !inside_5;
            }
            else
            {
                region_0 = inside_5;
            }
            if(region_0)
            {
                region_0 = !every_0;
                break;
            }
            var at_3 : u32 = at_2 + max((bitcast<vec4<u32>>((clipRow_0(at_2)))).y, u32(1));
            k_0 = k_0 + u32(1);
            at_2 = at_3;
        }
        var kept_0 : bool;
        if(((_S66 & (u32(2)))) != u32(0))
        {
            kept_0 = !region_0;
        }
        else
        {
            kept_0 = region_0;
        }
        if(!kept_0)
        {
            if(((_S66 & (u32(64)))) != u32(0))
            {
                s_3 = s_3 + u32(1);
                continue;
            }
            if(((_S66 & (u32(16)))) != u32(0))
            {
                var effect_0 : u32 = (_S66 >> (u32(8)));
                var alpha_2 : f32 = clipRow_0(effect_0 + u32(1)).x;
                if(((_S66 & (u32(32)))) != u32(0))
                {
                    if(clipGhosts_0)
                    {
                        s_3 = s_3 + u32(1);
                        continue;
                    }
                    if(((clipDither_0(_S62.position_1.xy)) < alpha_2))
                    {
                        clipGhosted_0 = true;
                        clipGhostTint_0 = clipRow_0(effect_0);
                        s_3 = s_3 + u32(1);
                        continue;
                    }
                }
                else
                {
                    if(clipGhosts_0)
                    {
                        clipGhosted_0 = true;
                        clipGhostAlpha_0 = clipGhostAlpha_0 * alpha_2;
                        clipGhostTint_0 = clipRow_0(effect_0);
                        s_3 = s_3 + u32(1);
                        continue;
                    }
                }
            }
            return false;
        }
        s_3 = s_3 + u32(1);
    }
    return true;
}

fn clipsReport_0( _S70 : SurfaceVaryings_0,  _S71 : u32)
{
    var _S72 : bool;
    if(!clipsOn_0)
    {
        _S72 = true;
    }
    else
    {
        _S72 = (((records_0[_S71].flags_0) & (u32(4096)))) != u32(0);
    }
    if(_S72)
    {
        return;
    }
    var head_3 : vec4<u32> = (bitcast<vec4<u32>>((clipRow_0(u32(0)))));
    var _S73 : u32 = head_3.y;
    if(((_S73 & (u32(4)))) == u32(0))
    {
        return;
    }
    var _S74 : u32 = min(head_3.x, u32(8));
    var _S75 : vec3<f32>;
    if(((_S73 & (u32(1)))) != u32(0))
    {
        _S75 = drawnPosition_0(_S70, _S71);
    }
    else
    {
        _S75 = _S70.relPosition_0;
    }
    var s_4 : u32 = u32(0);
    loop
    {
        if((s_4 < u32(8)))
        {
        }
        else
        {
            break;
        }
        if((s_4 >= _S74))
        {
            break;
        }
        var entry_2 : vec4<u32> = (bitcast<vec4<u32>>((clipRow_0(u32(1) + s_4))));
        var _S76 : u32 = entry_2.z;
        if(((_S76 & (u32(128)))) == u32(0))
        {
            s_4 = s_4 + u32(1);
            continue;
        }
        var _S77 : vec3<f32>;
        if(((_S76 & (u32(4)))) != u32(0))
        {
            _S77 = _S75;
        }
        else
        {
            _S77 = _S70.relPosition_0;
        }
        var every_1 : bool = ((_S76 & (u32(1)))) != u32(0);
        var _S78 : f32;
        if(every_1)
        {
            _S78 = -3.39999995214436425e+38f;
        }
        else
        {
            _S78 = 3.39999995214436425e+38f;
        }
        var _S79 : u32 = entry_2.x;
        var _S80 : u32 = min(entry_2.y, u32(16));
        var d_1 : f32 = _S78;
        var k_1 : u32 = u32(0);
        var at_4 : u32 = _S79;
        loop
        {
            if((k_1 < u32(16)))
            {
            }
            else
            {
                break;
            }
            if((k_1 >= _S80))
            {
                break;
            }
            var shape_0 : f32 = clipShapeDistance_0(at_4, _S77);
            if(every_1)
            {
                d_1 = max(d_1, shape_0);
            }
            else
            {
                d_1 = min(d_1, shape_0);
            }
            var at_5 : u32 = at_4 + max((bitcast<vec4<u32>>((clipRow_0(at_4)))).y, u32(1));
            k_1 = k_1 + u32(1);
            at_4 = at_5;
        }
        var d_2 : f32;
        if(((_S76 & (u32(2)))) != u32(0))
        {
            d_2 = - d_1;
        }
        else
        {
            d_2 = d_1;
        }
        if(clipIdOut_0 == u32(4294967295))
        {
            _S72 = true;
        }
        else
        {
            _S72 = (d_2 > clipDistanceOut_0);
        }
        if(_S72)
        {
            clipDistanceOut_0 = d_2;
            clipIdOut_0 = s_4;
            var _S81 : u32;
            if((d_2 > 0.0f))
            {
                _S81 = u32(1);
            }
            else
            {
                _S81 = u32(0);
            }
            var _S82 : u32;
            if(((_S76 & (u32(16)))) != u32(0))
            {
                _S82 = u32(2);
            }
            else
            {
                _S82 = u32(0);
            }
            clipFlagsOut_0 = (_S81 | (_S82));
            clipParamsOut_0 = clipRow_0(((_S76 >> (u32(8)))) + u32(2));
        }
        s_4 = s_4 + u32(1);
    }
    return;
}

fn terrainAlpha_0( _S83 : u32,  _S84 : SurfaceVaryings_0) -> f32
{
    var _S85 : u32 = records_0[_S83].terrainClip_0;
    if((records_0[_S83].terrainClip_0) == u32(0))
    {
        return 1.0f;
    }
    var _S86 : u32;
    if(terrainSeen_0)
    {
        _S86 = u32(0);
    }
    else
    {
        _S86 = u32(2);
    }
    var opacity_2 : f32 = terrainOpacity_0(_S85, _S84.relPosition_0, _S86);
    var _S87 : bool;
    if((opacity_2 < 0.99900001287460327f))
    {
        _S87 = (((_S84.ids_0.z) & (u32(2147483648)))) != u32(0);
    }
    else
    {
        _S87 = false;
    }
    if(_S87)
    {
        return 0.0f;
    }
    return opacity_2;
}

fn materialAlpha_0( in_1 : SurfaceVaryings_0) -> f32
{
    var _S88 : u32 = in_1.ids_0.x;
    var _S89 : Material_std430_0 = materials_0[records_0[_S88].materialIndex_0];
    var clipDrops_0 : bool;
    if(clipsOn_0)
    {
        if(clipGhosts_0)
        {
            var _S90 : bool = clipsKeep_0(in_1, _S88);
            if(!_S90)
            {
                clipDrops_0 = true;
            }
            else
            {
                if((((_S89.flags_1) & (u32(8)))) == u32(0))
                {
                    clipDrops_0 = !clipGhosted_0;
                }
                else
                {
                    clipDrops_0 = false;
                }
            }
        }
        else
        {
            clipDrops_0 = false;
        }
        clipsReport_0(in_1, _S88);
    }
    else
    {
        clipDrops_0 = false;
    }
    var _S91 : vec4<f32> = materialTexture_0(&(_S89), u32(0), in_1.uv_1);
    var color_2 : vec4<f32> = _S89.baseColor_0 * records_0[_S88].color_0 * in_1.color_1;
    var _S92 : bool = materialHasTexture_0(&(_S89), u32(0));
    if(_S92)
    {
        color_2 = color_2 * _S91;
    }
    var _S93 : bool;
    if(clipGhosted_0)
    {
        _S93 = clipGhosts_0;
    }
    else
    {
        _S93 = false;
    }
    if(_S93)
    {
        color_2[i32(3)] = color_2[i32(3)] * clipGhostAlpha_0;
    }
    var geometric_1 : vec3<f32> = normalize(in_1.normal_1);
    var custom_0 : MaterialOutput;
    var _S94 : vec3<f32> = color_2.xyz;
    var _S95 : f32 = color_2.w;
    var _S96 : f32 = _S89.metallic_0;
    var _S97 : f32 = _S89.roughness_0;
    var _S98 : vec3<f32> = _S89.emissive_0;
    if((((_S89.flags_1) & (u32(1)))) != u32(0))
    {
        _S93 = true;
    }
    else
    {
        _S93 = (((records_0[_S88].flags_0) & (u32(2)))) != u32(0);
    }
    custom_0 = materialOutput_0(_S94, _S95, _S96, _S97, geometric_1, 1.0f, _S98, _S93);
    var _S99 : CesiumFragment = fragmentOf_0(in_1, geometric_1, drawnPosition_0(in_1, _S88));
    cesiumFragmentStage((_S99), &((custom_0)));
    if(clipDrops_0)
    {
        return 0.0f;
    }
    if(clipGhosts_0)
    {
        clipDrops_0 = clipGhosted_0;
    }
    else
    {
        clipDrops_0 = false;
    }
    if(clipDrops_0)
    {
        clipDrops_0 = (((in_1.ids_0.z) & (u32(2147483648)))) != u32(0);
    }
    else
    {
        clipDrops_0 = false;
    }
    var skirts_0 : f32;
    if(clipDrops_0)
    {
        skirts_0 = 0.0f;
    }
    else
    {
        skirts_0 = 1.0f;
    }
    return custom_0.alpha * terrainAlpha_0(_S88, in_1) * skirts_0;
}

fn insideClipBoxes_0( packed_0 : u32,  p_4 : vec3<f32>) -> bool
{
    var _S100 : u32 = (packed_0 & (u32(268435455)));
    var _S101 : u32 = (packed_0 >> (u32(28)));
    var i_3 : u32 = u32(0);
    loop
    {
        if((i_3 < u32(8)))
        {
        }
        else
        {
            break;
        }
        if((i_3 >= _S101))
        {
            break;
        }
        var b_4 : u32 = (_S100 * u32(8) + i_3) * u32(5);
        var d_3 : vec3<f32> = p_4 - SplitPosition_difference_0(SplitPosition_x24init_0(clipBoxes_0[b_4].xyz, clipBoxes_0[b_4 + u32(1)].xyz), SplitPosition_x24init_0(view_0.cameraHi_0, view_0.cameraLo_0));
        var u_0 : vec3<f32> = abs(vec3<f32>(dot(clipBoxes_0[b_4 + u32(2)].xyz, d_3), dot(clipBoxes_0[b_4 + u32(3)].xyz, d_3), dot(clipBoxes_0[b_4 + u32(4)].xyz, d_3)));
        if(((max(u_0.x, max(u_0.y, u_0.z))) <= 1.0f))
        {
            return true;
        }
        i_3 = i_3 + u32(1);
    }
    return false;
}

fn placeholderOut_0( _S102 : u32,  _S103 : vec3<f32>) -> bool
{
    var _S104 : bool;
    if((((records_0[_S102].placeholderMask_0) & ((view_0.viewBit_0)))) != u32(0))
    {
        _S104 = !insideClipBoxes_0(records_0[_S102].clipBlock_0, _S103);
    }
    else
    {
        _S104 = false;
    }
    return _S104;
}

fn clippedOut_0( _S105 : u32,  _S106 : vec3<f32>) -> bool
{
    if(placeholderOut_0(_S105, _S106))
    {
        return true;
    }
    var _S107 : u32 = records_0[_S105].terrainClip_0;
    var _S108 : bool;
    if((records_0[_S105].terrainClip_0) != u32(0))
    {
        var _S109 : u32;
        if(terrainSeen_0)
        {
            _S109 = u32(1);
        }
        else
        {
            _S109 = u32(2);
        }
        _S108 = ((terrainOpacity_0(_S107, _S106, _S109)) <= 0.0f);
    }
    else
    {
        _S108 = false;
    }
    return _S108;
}

fn clipsDiscard_0( _S110 : SurfaceVaryings_0,  _S111 : u32) -> bool
{
    var _S112 : bool;
    if(clipsOn_0)
    {
        var _S113 : bool = clipsKeep_0(_S110, _S111);
        _S112 = !_S113;
    }
    else
    {
        _S112 = false;
    }
    return _S112;
}

fn clippedAway_0( _S114 : u32,  _S115 : SurfaceVaryings_0) -> bool
{
    var _S116 : bool;
    if(clippedOut_0(_S114, _S115.relPosition_0))
    {
        _S116 = true;
    }
    else
    {
        var _S117 : bool = clipsDiscard_0(_S115, _S114);
        _S116 = _S117;
    }
    return _S116;
}

fn cutOut_0( in_2 : SurfaceVaryings_0)
{
    var _S118 : u32 = in_2.ids_0.x;
    var material_0 : Material_std430_0 = materials_0[records_0[_S118].materialIndex_0];
    var alpha_3 : f32 = materialAlpha_0(in_2);
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
        if((alpha_3 < cutoff_0))
        {
            discard;
        }
    }
    var _S119 : bool = clippedAway_0(_S118, in_2);
    if(_S119)
    {
        discard;
    }
    return;
}

struct pixelInput_0
{
    @location(0) normal_2 : vec3<f32>,
    @location(1) uv_2 : vec2<f32>,
    @location(2) color_3 : vec4<f32>,
    @interpolate(flat) @location(3) ids_1 : vec3<u32>,
    @location(4) relPosition_1 : vec3<f32>,
    @location(5) tangent_1 : vec4<f32>,
    @location(6) airInscatter_1 : vec3<f32>,
    @location(7) airTransmittance_2 : vec4<f32>,
    @location(8) positionMC_1 : vec3<f32>,
    @location(9) named0_1 : vec4<f32>,
    @location(10) named1_1 : vec4<f32>,
    @location(11) named2_1 : vec4<f32>,
    @location(12) named3_1 : vec4<f32>,
};

fn _S120() -> vec4<f32>
{
    return vec4<f32>(0.0f);
}

var<private> patchLine_0 : vec4<f32>;

var<private> surfaceLight_0 : bool;

@fragment
fn shadowFs( _S121 : pixelInput_0, @builtin(position) position_2 : vec4<f32>)
{
    var _S122 : SurfaceVaryings_0 = SurfaceVaryings_0( position_2, _S121.normal_2, _S121.uv_2, _S121.color_3, _S121.ids_1, _S121.relPosition_1, _S121.tangent_1, _S121.airInscatter_1, _S121.airTransmittance_2, _S121.positionMC_1, _S121.named0_1, _S121.named1_1, _S121.named2_1, _S121.named3_1 );
    clipGhosts_0 = false;
    clipGhosted_0 = false;
    clipGhostAlpha_0 = 1.0f;
    clipGhostTint_0 = _S11();
    clipIdOut_0 = u32(4294967295);
    clipDistanceOut_0 = 3.39999995214436425e+38f;
    clipFlagsOut_0 = u32(0);
    clipParamsOut_0 = _S24();
    terrainSeen_0 = true;
    patchLine_0 = _S120();
    surfaceLight_0 = true;
    cutOut_0(_S122);
    return;
}

struct pixelInput_1
{
    @location(0) normal_3 : vec3<f32>,
    @location(1) uv_3 : vec2<f32>,
    @location(2) color_4 : vec4<f32>,
    @interpolate(flat) @location(3) ids_2 : vec3<u32>,
    @location(4) relPosition_2 : vec3<f32>,
    @location(5) tangent_2 : vec4<f32>,
    @location(6) airInscatter_2 : vec3<f32>,
    @location(7) airTransmittance_3 : vec4<f32>,
    @location(8) positionMC_2 : vec3<f32>,
    @location(9) named0_2 : vec4<f32>,
    @location(10) named1_2 : vec4<f32>,
    @location(11) named2_2 : vec4<f32>,
    @location(12) named3_2 : vec4<f32>,
};

@fragment
fn heightFs( _S123 : pixelInput_1, @builtin(position) position_3 : vec4<f32>)
{
    var _S124 : SurfaceVaryings_0 = SurfaceVaryings_0( position_3, _S123.normal_3, _S123.uv_3, _S123.color_4, _S123.ids_2, _S123.relPosition_2, _S123.tangent_2, _S123.airInscatter_2, _S123.airTransmittance_3, _S123.positionMC_2, _S123.named0_2, _S123.named1_2, _S123.named2_2, _S123.named3_2 );
    clipGhosts_0 = false;
    clipGhosted_0 = false;
    clipGhostAlpha_0 = 1.0f;
    clipGhostTint_0 = _S11();
    clipIdOut_0 = u32(4294967295);
    clipDistanceOut_0 = 3.39999995214436425e+38f;
    clipFlagsOut_0 = u32(0);
    clipParamsOut_0 = _S24();
    terrainSeen_0 = true;
    patchLine_0 = _S120();
    surfaceLight_0 = true;
    terrainSeen_0 = false;
    cutOut_0(_S124);
    return;
}

struct pixelInput_2
{
    @location(0) normal_4 : vec3<f32>,
    @location(1) uv_4 : vec2<f32>,
    @location(2) color_5 : vec4<f32>,
    @interpolate(flat) @location(3) ids_3 : vec3<u32>,
    @location(4) relPosition_3 : vec3<f32>,
    @location(5) tangent_3 : vec4<f32>,
    @location(6) airInscatter_3 : vec3<f32>,
    @location(7) airTransmittance_4 : vec4<f32>,
    @location(8) positionMC_3 : vec3<f32>,
    @location(9) named0_3 : vec4<f32>,
    @location(10) named1_3 : vec4<f32>,
    @location(11) named2_3 : vec4<f32>,
    @location(12) named3_3 : vec4<f32>,
};

@fragment
fn shadowPlaceholderFs( _S125 : pixelInput_2, @builtin(position) position_4 : vec4<f32>)
{
    var _S126 : SurfaceVaryings_0 = SurfaceVaryings_0( position_4, _S125.normal_4, _S125.uv_4, _S125.color_5, _S125.ids_3, _S125.relPosition_3, _S125.tangent_3, _S125.airInscatter_3, _S125.airTransmittance_4, _S125.positionMC_3, _S125.named0_3, _S125.named1_3, _S125.named2_3, _S125.named3_3 );
    clipGhosts_0 = false;
    clipGhosted_0 = false;
    clipGhostAlpha_0 = 1.0f;
    clipGhostTint_0 = _S11();
    clipIdOut_0 = u32(4294967295);
    clipDistanceOut_0 = 3.39999995214436425e+38f;
    clipFlagsOut_0 = u32(0);
    clipParamsOut_0 = _S24();
    terrainSeen_0 = true;
    patchLine_0 = _S120();
    surfaceLight_0 = true;
    var _S127 : bool = clippedAway_0(_S125.ids_3.x, _S126);
    if(_S127)
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
    @location(2) color_6 : vec4<f32>,
    @interpolate(flat) @location(3) ids_4 : vec3<u32>,
    @location(4) relPosition_4 : vec3<f32>,
    @location(5) tangent_4 : vec4<f32>,
    @location(6) airInscatter_4 : vec3<f32>,
    @location(7) airTransmittance_5 : vec4<f32>,
    @location(8) positionMC_4 : vec3<f32>,
    @location(9) named0_4 : vec4<f32>,
    @location(10) named1_4 : vec4<f32>,
    @location(11) named2_4 : vec4<f32>,
    @location(12) named3_4 : vec4<f32>,
};

@fragment
fn prepassFs( _S128 : pixelInput_3, @builtin(front_facing) frontFacing_0 : bool, @builtin(position) position_5 : vec4<f32>) -> pixelOutput_0
{
    var _S129 : SurfaceVaryings_0 = SurfaceVaryings_0( position_5, _S128.normal_5, _S128.uv_5, _S128.color_6, _S128.ids_4, _S128.relPosition_4, _S128.tangent_4, _S128.airInscatter_4, _S128.airTransmittance_5, _S128.positionMC_4, _S128.named0_4, _S128.named1_4, _S128.named2_4, _S128.named3_4 );
    clipGhosts_0 = false;
    clipGhosted_0 = false;
    clipGhostAlpha_0 = 1.0f;
    clipGhostTint_0 = _S11();
    clipIdOut_0 = u32(4294967295);
    clipDistanceOut_0 = 3.39999995214436425e+38f;
    clipFlagsOut_0 = u32(0);
    clipParamsOut_0 = _S24();
    terrainSeen_0 = true;
    patchLine_0 = _S120();
    surfaceLight_0 = true;
    cutOut_0(_S129);
    var n_1 : vec3<f32> = normalize(_S128.normal_5);
    var n_2 : vec3<f32>;
    if(!frontFacing_0)
    {
        n_2 = (vec3<f32>(0) - n_1);
    }
    else
    {
        n_2 = n_1;
    }
    var _S130 : pixelOutput_0 = pixelOutput_0( vec4<f32>(n_2, 1.0f) );
    return _S130;
}

struct Crossings_0
{
     winding_0 : i32,
     nearest_1 : f32,
     taps_0 : bool,
};

fn crossings_0( _S131 : u32,  _S132 : vec2<f32>,  _S133 : vec2<f32>) -> Crossings_0
{
    var result_0 : Crossings_0;
    result_0.winding_0 = i32(0);
    result_0.nearest_1 = 3.00000000549775576e+38f;
    result_0.taps_0 = false;
    var scale_0 : f32 = vertices_0[_S131 + u32(1)];
    var _S134 : f32 = _S132.y;
    var _S135 : i32 = i32((bitcast<u32>((vertices_0[_S131])))) - i32(1);
    var band_0 : i32 = clamp(i32(floor(_S134 * scale_0)), i32(0), _S135);
    var _S136 : f32 = _S133.y;
    var onRay_0 : bool;
    if((_S136 > 0.0f))
    {
        var above_0 : i32 = clamp(i32(floor((_S134 + _S136) * scale_0)), i32(0), _S135);
        if((clamp(i32(floor((_S134 - _S136) * scale_0)), i32(0), _S135)) != band_0)
        {
            onRay_0 = true;
        }
        else
        {
            onRay_0 = above_0 != band_0;
        }
        result_0.taps_0 = onRay_0;
    }
    var record_1 : u32 = _S131 + u32(4) + u32(band_0) * u32(3);
    var _S137 : u32 = _S131 + (bitcast<u32>((vertices_0[record_1])));
    var count_0 : u32 = (bitcast<u32>((vertices_0[record_1 + u32(1)])));
    if(count_0 == u32(0))
    {
        result_0.winding_0 = (bitcast<i32>((vertices_0[record_1 + u32(2)])));
        return result_0;
    }
    var i_4 : u32 = u32(0);
    loop
    {
        if((i_4 < count_0))
        {
        }
        else
        {
            break;
        }
        var s_5 : u32 = _S131 + (bitcast<u32>((vertices_0[_S137 + i_4])));
        var _S138 : u32 = s_5 + u32(6);
        var _S139 : f32 = _S132.x;
        if((vertices_0[_S138] < (_S139 - _S133.x)))
        {
            break;
        }
        var y0_0 : f32 = vertices_0[s_5 + u32(1)] - _S134;
        var y2_0 : f32 = vertices_0[s_5 + u32(5)] - _S134;
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
            if((y0_0 <= _S136))
            {
                ends_0 = (y2_0 > (- _S136));
            }
            else
            {
                ends_0 = false;
            }
            if(ends_0)
            {
                result_0.taps_0 = true;
            }
            i_4 = i_4 + u32(1);
            continue;
        }
        if((y0_0 > (- _S136)))
        {
            ends_0 = true;
        }
        else
        {
            ends_0 = (y2_0 <= _S136);
        }
        var y1_0 : f32 = vertices_0[s_5 + u32(3)] - _S134;
        var a_3 : f32 = y0_0 - 2.0f * y1_0 + y2_0;
        var b_5 : f32 = y0_0 - y1_0;
        var d_4 : f32 = sqrt(max(b_5 * b_5 - a_3 * y0_0, 0.0f));
        var _S140 : f32;
        if((b_5 < 0.0f))
        {
            _S140 = - d_4;
        }
        else
        {
            _S140 = d_4;
        }
        var q_2 : f32 = b_5 + _S140;
        var t1_0 : f32;
        if(((abs(a_3)) > 1.00000000317107685e-30f))
        {
            t1_0 = q_2 / a_3;
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
        var _S141 : f32;
        if(((abs(t1_0 - clamp(t1_0, 0.0f, 1.0f))) <= (abs(t2_0 - clamp(t2_0, 0.0f, 1.0f)))))
        {
            _S141 = t1_0;
        }
        else
        {
            _S141 = t2_0;
        }
        var t_1 : f32 = clamp(_S141, 0.0f, 1.0f);
        var r_0 : f32 = 1.0f - t_1;
        var _S142 : u32 = s_5 + u32(2);
        var _S143 : u32 = s_5 + u32(4);
        var x_0 : f32 = r_0 * r_0 * (vertices_0[s_5] - _S139) + 2.0f * r_0 * t_1 * (vertices_0[_S142] - _S139) + t_1 * t_1 * (vertices_0[_S143] - _S139);
        var _S144 : f32 = abs(x_0);
        result_0.nearest_1 = min(result_0.nearest_1, _S144);
        if((x_0 > 0.0f))
        {
            var _S145 : i32;
            if((vertices_0[s_5 + u32(7)] > 0.0f))
            {
                _S145 = i32(1);
            }
            else
            {
                _S145 = i32(-1);
            }
            result_0.winding_0 = result_0.winding_0 + _S145;
        }
        var width_1 : f32 = vertices_0[_S138] - min(vertices_0[s_5], min(vertices_0[_S142], vertices_0[_S143]));
        var _S146 : bool;
        if(ends_0)
        {
            _S146 = true;
        }
        else
        {
            _S146 = (width_1 >= _S144);
        }
        if(_S146)
        {
            result_0.taps_0 = true;
        }
        i_4 = i_4 + u32(1);
    }
    return result_0;
}

fn covers_0( _S147 : u32,  _S148 : vec2<f32>,  _S149 : vec2<f32>) -> bool
{
    var _S150 : Crossings_0 = crossings_0(_S147, _S148, _S149);
    var _S151 : bool;
    if((_S150.winding_0) != i32(0))
    {
        _S151 = true;
    }
    else
    {
        _S151 = ((_S150.nearest_1) <= (_S149.x));
    }
    if(_S151)
    {
        return true;
    }
    if(!_S150.taps_0)
    {
        return false;
    }
    var _S152 : vec2<f32> = vec2<f32>(0.0f, _S149.y);
    var _S153 : vec2<f32> = vec2<f32>(0.0f);
    if((crossings_0(_S147, _S148 + _S152, _S153).winding_0) != i32(0))
    {
        return true;
    }
    return (crossings_0(_S147, _S148 - _S152, _S153).winding_0) != i32(0);
}

fn trimCovered_0( in_3 : SurfaceVaryings_0) -> bool
{
    var reach_0 : vec2<f32> = vec2<f32>(0.5f) * (fwidth((in_3.uv_1)));
    var at_6 : u32 = in_3.ids_0.z;
    if(at_6 == u32(0))
    {
        return true;
    }
    return covers_0(records_0[in_3.ids_0.x].positionOffset_0 + at_6 - u32(1), in_3.uv_1, reach_0);
}

struct PatchWidths_0
{
     grid_1 : vec3<f32>,
     uv_6 : vec2<f32>,
};

fn patchWidths_0( in_4 : SurfaceVaryings_0) -> PatchWidths_0
{
    var w_0 : PatchWidths_0;
    var _S154 : f32 = in_4.tangent_0.x;
    var _S155 : f32 = in_4.tangent_0.y;
    w_0.grid_1 = vec3<f32>((fwidth((_S154))), (fwidth((_S155))), (fwidth((_S154 - _S155))));
    w_0.uv_6 = (fwidth((in_4.uv_1)));
    return w_0;
}

fn patchLines_0( in_5 : SurfaceVaryings_0,  display_0 : u32,  w_1 : PatchWidths_0,  divisions_0 : u32) -> vec2<f32>
{
    var cover_0 : vec2<f32> = vec2<f32>(0.0f);
    if(((display_0 & (u32(256)))) != u32(0))
    {
        var f_1 : vec2<f32> = fract(in_5.tangent_0.xy);
        var edge_2 : vec2<f32> = min(f_1, vec2<f32>(1.0f) - f_1) / max(w_1.grid_1.xy, vec2<f32>(9.99999997475242708e-07f));
        cover_0[i32(0)] = saturate(1.0f - min(min(edge_2.x, edge_2.y), abs(f_1.x - f_1.y) / max(w_1.grid_1.z, 9.99999997475242708e-07f)));
    }
    var _S156 : bool;
    if(((display_0 & (u32(512)))) != u32(0))
    {
        _S156 = (divisions_0 > u32(1));
    }
    else
    {
        _S156 = false;
    }
    if(_S156)
    {
        var _S157 : vec2<f32> = max(in_5.tangent_0.zw, vec2<f32>(9.99999968265522539e-21f));
        var n_3 : f32 = f32(divisions_0);
        var _S158 : vec2<f32> = vec2<f32>(n_3);
        var t_2 : vec2<f32> = in_5.uv_1 / _S157 * _S158;
        var k_2 : vec2<f32> = round(t_2);
        var d_5 : vec2<f32> = abs(t_2 - k_2) / max(w_1.uv_6 / _S157 * _S158, vec2<f32>(9.99999997475242708e-07f));
        var _S159 : f32 = k_2.x;
        if((_S159 >= 1.0f))
        {
            _S156 = (_S159 <= (n_3 - 1.0f));
        }
        else
        {
            _S156 = false;
        }
        var _S160 : f32;
        if(_S156)
        {
            _S160 = 1.0f;
        }
        else
        {
            _S160 = 0.0f;
        }
        var _S161 : f32 = k_2.y;
        if((_S161 >= 1.0f))
        {
            _S156 = (_S161 <= (n_3 - 1.0f));
        }
        else
        {
            _S156 = false;
        }
        var _S162 : f32;
        if(_S156)
        {
            _S162 = 1.0f;
        }
        else
        {
            _S162 = 0.0f;
        }
        cover_0[i32(1)] = saturate(1.0f - min(d_5.x + (1.0f - _S160) * 1.0e+06f, d_5.y + (1.0f - _S162) * 1.0e+06f));
    }
    return cover_0;
}

struct pixelInput_4
{
    @location(0) normal_6 : vec3<f32>,
    @location(1) uv_7 : vec2<f32>,
    @location(2) color_7 : vec4<f32>,
    @interpolate(flat) @location(3) ids_5 : vec3<u32>,
    @location(4) relPosition_5 : vec3<f32>,
    @location(5) tangent_5 : vec4<f32>,
    @location(6) airInscatter_5 : vec3<f32>,
    @location(7) airTransmittance_6 : vec4<f32>,
    @location(8) positionMC_5 : vec3<f32>,
    @location(9) named0_5 : vec4<f32>,
    @location(10) named1_5 : vec4<f32>,
    @location(11) named2_5 : vec4<f32>,
    @location(12) named3_5 : vec4<f32>,
};

fn patchDisplay_0( _S163 : u32) -> u32
{
    var _S164 : u32 = records_0[_S163].flags_0;
    var _S165 : u32;
    if((((records_0[_S163].flags_0) & (u32(128)))) != u32(0))
    {
        _S165 = (_S164 & (u32(3840)));
    }
    else
    {
        _S165 = u32(0);
    }
    return _S165;
}

fn offLines_0( _S166 : SurfaceVaryings_0,  _S167 : u32) -> bool
{
    var w_2 : PatchWidths_0 = patchWidths_0(_S166);
    var _S168 : u32 = patchDisplay_0(_S167);
    if(((_S168 & (u32(2048)))) == u32(0))
    {
        return false;
    }
    if(((view_0.time_0.z) > 0.5f))
    {
        return true;
    }
    var cover_1 : vec2<f32> = patchLines_0(_S166, _S168, w_2, ((((records_0[_S167].flags_0) >> (u32(16)))) & (u32(255))));
    return ((max(cover_1.x, cover_1.y)) < 0.5f);
}

@fragment
fn shadowTrimmedFs( _S169 : pixelInput_4, @builtin(position) position_6 : vec4<f32>)
{
    var _S170 : SurfaceVaryings_0 = SurfaceVaryings_0( position_6, _S169.normal_6, _S169.uv_7, _S169.color_7, _S169.ids_5, _S169.relPosition_5, _S169.tangent_5, _S169.airInscatter_5, _S169.airTransmittance_6, _S169.positionMC_5, _S169.named0_5, _S169.named1_5, _S169.named2_5, _S169.named3_5 );
    clipGhosts_0 = false;
    clipGhosted_0 = false;
    clipGhostAlpha_0 = 1.0f;
    clipGhostTint_0 = _S11();
    clipIdOut_0 = u32(4294967295);
    clipDistanceOut_0 = 3.39999995214436425e+38f;
    clipFlagsOut_0 = u32(0);
    clipParamsOut_0 = _S24();
    terrainSeen_0 = true;
    patchLine_0 = _S120();
    surfaceLight_0 = true;
    var _S171 : u32 = _S169.ids_5.x;
    var _S172 : bool = offLines_0(_S170, _S171);
    var _S173 : bool;
    if(!trimCovered_0(_S170))
    {
        _S173 = true;
    }
    else
    {
        _S173 = _S172;
    }
    if(_S173)
    {
        _S173 = true;
    }
    else
    {
        var _S174 : bool = clippedAway_0(_S171, _S170);
        _S173 = _S174;
    }
    if(_S173)
    {
        discard;
    }
    return;
}

struct pixelInput_5
{
    @location(0) normal_7 : vec3<f32>,
    @location(1) uv_8 : vec2<f32>,
    @location(2) color_8 : vec4<f32>,
    @interpolate(flat) @location(3) ids_6 : vec3<u32>,
    @location(4) relPosition_6 : vec3<f32>,
    @location(5) tangent_6 : vec4<f32>,
    @location(6) airInscatter_6 : vec3<f32>,
    @location(7) airTransmittance_7 : vec4<f32>,
    @location(8) positionMC_6 : vec3<f32>,
    @location(9) named0_6 : vec4<f32>,
    @location(10) named1_6 : vec4<f32>,
    @location(11) named2_6 : vec4<f32>,
    @location(12) named3_6 : vec4<f32>,
};

@fragment
fn shadowPatchFs( _S175 : pixelInput_5, @builtin(position) position_7 : vec4<f32>)
{
    var _S176 : SurfaceVaryings_0 = SurfaceVaryings_0( position_7, _S175.normal_7, _S175.uv_8, _S175.color_8, _S175.ids_6, _S175.relPosition_6, _S175.tangent_6, _S175.airInscatter_6, _S175.airTransmittance_7, _S175.positionMC_6, _S175.named0_6, _S175.named1_6, _S175.named2_6, _S175.named3_6 );
    clipGhosts_0 = false;
    clipGhosted_0 = false;
    clipGhostAlpha_0 = 1.0f;
    clipGhostTint_0 = _S11();
    clipIdOut_0 = u32(4294967295);
    clipDistanceOut_0 = 3.39999995214436425e+38f;
    clipFlagsOut_0 = u32(0);
    clipParamsOut_0 = _S24();
    terrainSeen_0 = true;
    patchLine_0 = _S120();
    surfaceLight_0 = true;
    var _S177 : u32 = _S175.ids_6.x;
    var _S178 : bool;
    if(offLines_0(_S176, _S177))
    {
        _S178 = true;
    }
    else
    {
        var _S179 : bool = clippedAway_0(_S177, _S176);
        _S178 = _S179;
    }
    if(_S178)
    {
        discard;
    }
    return;
}

struct CapParity_0
{
    @location(0) low_0 : vec4<f32>,
    @location(1) high_0 : vec4<f32>,
};

struct pixelInput_6
{
    @location(0) normal_8 : vec3<f32>,
    @location(1) uv_9 : vec2<f32>,
    @location(2) color_9 : vec4<f32>,
    @interpolate(flat) @location(3) ids_7 : vec3<u32>,
    @location(4) relPosition_7 : vec3<f32>,
    @location(5) tangent_7 : vec4<f32>,
    @location(6) airInscatter_7 : vec3<f32>,
    @location(7) airTransmittance_8 : vec4<f32>,
    @location(8) positionMC_7 : vec3<f32>,
    @location(9) named0_7 : vec4<f32>,
    @location(10) named1_7 : vec4<f32>,
    @location(11) named2_7 : vec4<f32>,
    @location(12) named3_7 : vec4<f32>,
};

fn capParityOf_0( _S180 : u32,  _S181 : vec3<f32>) -> CapParity_0
{
    var o_1 : CapParity_0;
    var _S182 : vec4<f32> = vec4<f32>(0.0f);
    o_1.low_0 = _S182;
    o_1.high_0 = _S182;
    var _S183 : bool;
    if((((records_0[_S180].flags_0) & (u32(8192)))) == u32(0))
    {
        _S183 = true;
    }
    else
    {
        _S183 = clippedOut_0(_S180, _S181);
    }
    if(_S183)
    {
        discard;
    }
    var head_4 : vec4<u32> = (bitcast<vec4<u32>>((clipRow_0(u32(0)))));
    var _S184 : u32 = min(head_4.w, u32(8));
    var k_3 : u32 = u32(0);
    loop
    {
        if((k_3 < u32(8)))
        {
        }
        else
        {
            break;
        }
        if((k_3 >= _S184))
        {
            break;
        }
        var plane_0 : vec4<f32> = clipRow_0(head_4.z + u32(3) * k_3);
        var beyond_0 : f32;
        if(((dot(plane_0.xyz, _S181) + plane_0.w) > 0.0f))
        {
            beyond_0 = 1.0f;
        }
        else
        {
            beyond_0 = 0.0f;
        }
        if((k_3 < u32(4)))
        {
            o_1.low_0[k_3] = beyond_0;
        }
        else
        {
            o_1.high_0[k_3 - u32(4)] = beyond_0;
        }
        k_3 = k_3 + u32(1);
    }
    return o_1;
}

@fragment
fn capParityFs( _S185 : pixelInput_6, @builtin(position) position_8 : vec4<f32>) -> CapParity_0
{
    clipGhosts_0 = false;
    clipGhosted_0 = false;
    clipGhostAlpha_0 = 1.0f;
    clipGhostTint_0 = _S11();
    clipIdOut_0 = u32(4294967295);
    clipDistanceOut_0 = 3.39999995214436425e+38f;
    clipFlagsOut_0 = u32(0);
    clipParamsOut_0 = _S24();
    terrainSeen_0 = true;
    patchLine_0 = _S120();
    surfaceLight_0 = true;
    var _S186 : CapParity_0 = capParityOf_0(_S185.ids_7.x, _S185.relPosition_7);
    return _S186;
}

struct pixelInput_7
{
    @location(0) normal_9 : vec3<f32>,
    @location(1) uv_10 : vec2<f32>,
    @location(2) color_10 : vec4<f32>,
    @interpolate(flat) @location(3) ids_8 : vec3<u32>,
    @location(4) relPosition_8 : vec3<f32>,
    @location(5) tangent_8 : vec4<f32>,
    @location(6) airInscatter_8 : vec3<f32>,
    @location(7) airTransmittance_9 : vec4<f32>,
    @location(8) positionMC_8 : vec3<f32>,
    @location(9) named0_8 : vec4<f32>,
    @location(10) named1_8 : vec4<f32>,
    @location(11) named2_8 : vec4<f32>,
    @location(12) named3_8 : vec4<f32>,
};

@fragment
fn capParityTrimmedFs( _S187 : pixelInput_7, @builtin(position) position_9 : vec4<f32>) -> CapParity_0
{
    var _S188 : SurfaceVaryings_0 = SurfaceVaryings_0( position_9, _S187.normal_9, _S187.uv_10, _S187.color_10, _S187.ids_8, _S187.relPosition_8, _S187.tangent_8, _S187.airInscatter_8, _S187.airTransmittance_9, _S187.positionMC_8, _S187.named0_8, _S187.named1_8, _S187.named2_8, _S187.named3_8 );
    clipGhosts_0 = false;
    clipGhosted_0 = false;
    clipGhostAlpha_0 = 1.0f;
    clipGhostTint_0 = _S11();
    clipIdOut_0 = u32(4294967295);
    clipDistanceOut_0 = 3.39999995214436425e+38f;
    clipFlagsOut_0 = u32(0);
    clipParamsOut_0 = _S24();
    terrainSeen_0 = true;
    patchLine_0 = _S120();
    surfaceLight_0 = true;
    var _S189 : u32 = _S187.ids_8.x;
    var _S190 : bool = offLines_0(_S188, _S189);
    var _S191 : bool;
    if(!trimCovered_0(_S188))
    {
        _S191 = true;
    }
    else
    {
        _S191 = _S190;
    }
    if(_S191)
    {
        discard;
    }
    var _S192 : CapParity_0 = capParityOf_0(_S189, _S187.relPosition_8);
    return _S192;
}

struct pixelInput_8
{
    @location(0) normal_10 : vec3<f32>,
    @location(1) uv_11 : vec2<f32>,
    @location(2) color_11 : vec4<f32>,
    @interpolate(flat) @location(3) ids_9 : vec3<u32>,
    @location(4) relPosition_9 : vec3<f32>,
    @location(5) tangent_9 : vec4<f32>,
    @location(6) airInscatter_9 : vec3<f32>,
    @location(7) airTransmittance_10 : vec4<f32>,
    @location(8) positionMC_9 : vec3<f32>,
    @location(9) named0_9 : vec4<f32>,
    @location(10) named1_9 : vec4<f32>,
    @location(11) named2_9 : vec4<f32>,
    @location(12) named3_9 : vec4<f32>,
};

@fragment
fn capParityPatchFs( _S193 : pixelInput_8, @builtin(position) position_10 : vec4<f32>) -> CapParity_0
{
    var _S194 : SurfaceVaryings_0 = SurfaceVaryings_0( position_10, _S193.normal_10, _S193.uv_11, _S193.color_11, _S193.ids_9, _S193.relPosition_9, _S193.tangent_9, _S193.airInscatter_9, _S193.airTransmittance_10, _S193.positionMC_9, _S193.named0_9, _S193.named1_9, _S193.named2_9, _S193.named3_9 );
    clipGhosts_0 = false;
    clipGhosted_0 = false;
    clipGhostAlpha_0 = 1.0f;
    clipGhostTint_0 = _S11();
    clipIdOut_0 = u32(4294967295);
    clipDistanceOut_0 = 3.39999995214436425e+38f;
    clipFlagsOut_0 = u32(0);
    clipParamsOut_0 = _S24();
    terrainSeen_0 = true;
    patchLine_0 = _S120();
    surfaceLight_0 = true;
    var _S195 : u32 = _S193.ids_9.x;
    if(offLines_0(_S194, _S195))
    {
        discard;
    }
    var _S196 : CapParity_0 = capParityOf_0(_S195, _S193.relPosition_9);
    return _S196;
}

struct pixelOutput_1
{
    @location(0) output_1 : vec4<f32>,
};

struct pixelInput_9
{
    @location(0) normal_11 : vec3<f32>,
    @location(1) uv_12 : vec2<f32>,
    @location(2) color_12 : vec4<f32>,
    @interpolate(flat) @location(3) ids_10 : vec3<u32>,
    @location(4) relPosition_10 : vec3<f32>,
    @location(5) tangent_10 : vec4<f32>,
    @location(6) airInscatter_10 : vec3<f32>,
    @location(7) airTransmittance_11 : vec4<f32>,
    @location(8) positionMC_10 : vec3<f32>,
    @location(9) named0_10 : vec4<f32>,
    @location(10) named1_10 : vec4<f32>,
    @location(11) named2_10 : vec4<f32>,
    @location(12) named3_10 : vec4<f32>,
};

@fragment
fn prepassTrimmedFs( _S197 : pixelInput_9, @builtin(front_facing) frontFacing_1 : bool, @builtin(position) position_11 : vec4<f32>) -> pixelOutput_1
{
    var _S198 : SurfaceVaryings_0 = SurfaceVaryings_0( position_11, _S197.normal_11, _S197.uv_12, _S197.color_12, _S197.ids_10, _S197.relPosition_10, _S197.tangent_10, _S197.airInscatter_10, _S197.airTransmittance_11, _S197.positionMC_10, _S197.named0_10, _S197.named1_10, _S197.named2_10, _S197.named3_10 );
    clipGhosts_0 = false;
    clipGhosted_0 = false;
    clipGhostAlpha_0 = 1.0f;
    clipGhostTint_0 = _S11();
    clipIdOut_0 = u32(4294967295);
    clipDistanceOut_0 = 3.39999995214436425e+38f;
    clipFlagsOut_0 = u32(0);
    clipParamsOut_0 = _S24();
    terrainSeen_0 = true;
    patchLine_0 = _S120();
    surfaceLight_0 = true;
    var covered_0 : bool = trimCovered_0(_S198);
    var _S199 : bool = offLines_0(_S198, _S197.ids_10.x);
    cutOut_0(_S198);
    var _S200 : bool;
    if(!covered_0)
    {
        _S200 = true;
    }
    else
    {
        _S200 = _S199;
    }
    if(_S200)
    {
        discard;
    }
    var n_4 : vec3<f32> = normalize(_S197.normal_11);
    var n_5 : vec3<f32>;
    if(!frontFacing_1)
    {
        n_5 = (vec3<f32>(0) - n_4);
    }
    else
    {
        n_5 = n_4;
    }
    var _S201 : pixelOutput_1 = pixelOutput_1( vec4<f32>(n_5, 1.0f) );
    return _S201;
}

struct pixelOutput_2
{
    @location(0) output_2 : vec4<f32>,
};

struct pixelInput_10
{
    @location(0) normal_12 : vec3<f32>,
    @location(1) uv_13 : vec2<f32>,
    @location(2) color_13 : vec4<f32>,
    @interpolate(flat) @location(3) ids_11 : vec3<u32>,
    @location(4) relPosition_11 : vec3<f32>,
    @location(5) tangent_11 : vec4<f32>,
    @location(6) airInscatter_11 : vec3<f32>,
    @location(7) airTransmittance_12 : vec4<f32>,
    @location(8) positionMC_11 : vec3<f32>,
    @location(9) named0_11 : vec4<f32>,
    @location(10) named1_11 : vec4<f32>,
    @location(11) named2_11 : vec4<f32>,
    @location(12) named3_11 : vec4<f32>,
};

@fragment
fn prepassPatchFs( _S202 : pixelInput_10, @builtin(front_facing) frontFacing_2 : bool, @builtin(position) position_12 : vec4<f32>) -> pixelOutput_2
{
    var _S203 : SurfaceVaryings_0 = SurfaceVaryings_0( position_12, _S202.normal_12, _S202.uv_13, _S202.color_13, _S202.ids_11, _S202.relPosition_11, _S202.tangent_11, _S202.airInscatter_11, _S202.airTransmittance_12, _S202.positionMC_11, _S202.named0_11, _S202.named1_11, _S202.named2_11, _S202.named3_11 );
    clipGhosts_0 = false;
    clipGhosted_0 = false;
    clipGhostAlpha_0 = 1.0f;
    clipGhostTint_0 = _S11();
    clipIdOut_0 = u32(4294967295);
    clipDistanceOut_0 = 3.39999995214436425e+38f;
    clipFlagsOut_0 = u32(0);
    clipParamsOut_0 = _S24();
    terrainSeen_0 = true;
    patchLine_0 = _S120();
    surfaceLight_0 = true;
    var _S204 : bool = offLines_0(_S203, _S202.ids_11.x);
    cutOut_0(_S203);
    if(_S204)
    {
        discard;
    }
    var n_6 : vec3<f32> = normalize(_S202.normal_12);
    var n_7 : vec3<f32>;
    if(!frontFacing_2)
    {
        n_7 = (vec3<f32>(0) - n_6);
    }
    else
    {
        n_7 = n_6;
    }
    var _S205 : pixelOutput_2 = pixelOutput_2( vec4<f32>(n_7, 1.0f) );
    return _S205;
}

struct pixelOutput_3
{
    @location(0) output_3 : vec4<f32>,
};

struct pixelInput_11
{
    @location(0) normal_13 : vec3<f32>,
    @location(1) uv_14 : vec2<f32>,
    @location(2) color_14 : vec4<f32>,
    @interpolate(flat) @location(3) ids_12 : vec3<u32>,
    @location(4) relPosition_12 : vec3<f32>,
    @location(5) tangent_12 : vec4<f32>,
    @location(6) airInscatter_12 : vec3<f32>,
    @location(7) airTransmittance_13 : vec4<f32>,
    @location(8) positionMC_12 : vec3<f32>,
    @location(9) named0_12 : vec4<f32>,
    @location(10) named1_12 : vec4<f32>,
    @location(11) named2_12 : vec4<f32>,
    @location(12) named3_12 : vec4<f32>,
};

@fragment
fn depthCoverageFs( _S206 : pixelInput_11, @builtin(position) position_13 : vec4<f32>) -> pixelOutput_3
{
    var _S207 : SurfaceVaryings_0 = SurfaceVaryings_0( position_13, _S206.normal_13, _S206.uv_14, _S206.color_14, _S206.ids_12, _S206.relPosition_12, _S206.tangent_12, _S206.airInscatter_12, _S206.airTransmittance_13, _S206.positionMC_12, _S206.named0_12, _S206.named1_12, _S206.named2_12, _S206.named3_12 );
    clipGhosts_0 = false;
    clipGhosted_0 = false;
    clipGhostAlpha_0 = 1.0f;
    clipGhostTint_0 = _S11();
    clipIdOut_0 = u32(4294967295);
    clipDistanceOut_0 = 3.39999995214436425e+38f;
    clipFlagsOut_0 = u32(0);
    clipParamsOut_0 = _S24();
    terrainSeen_0 = true;
    patchLine_0 = _S120();
    surfaceLight_0 = true;
    var _S208 : u32 = _S206.ids_12.x;
    var material_1 : Material_std430_0 = materials_0[records_0[_S208].materialIndex_0];
    var alpha_4 : f32 = materialAlpha_0(_S207);
    var _S209 : f32 = max((fwidth((alpha_4))), 9.9999997473787516e-05f);
    var _S210 : bool = clippedAway_0(_S208, _S207);
    if(_S210)
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
    var _S211 : pixelOutput_3 = pixelOutput_3( vec4<f32>(0.0f, 0.0f, 0.0f, clamp((alpha_4 - cutoff_1) / _S209 + 0.5f, 0.0f, 1.0f)) );
    return _S211;
}

fn pickFramePixel_0( pixel_0 : vec2<f32>) -> vec2<f32>
{
    return ((view_0.iblFrame_0[i32(0)].xy + (pixel_0 / vec2<f32>(3.0f) * vec2<f32>(2.0f, -2.0f) + vec2<f32>(-1.0f, 1.0f)) * view_0.iblFrame_0[i32(0)].zw) * vec2<f32>(0.5f, -0.5f) + vec2<f32>(0.5f)) * view_0.viewport_0.xy;
}

fn pickMask_0( low_1 : f32,  high_1 : f32) -> u32
{
    return (u32(low_1) | (((u32(high_1) << (u32(16))))));
}

struct PickOut_0
{
    @interpolate(flat) @location(0) ids_13 : vec4<u32>,
    @location(1) domain_0 : vec4<f32>,
};

fn pickGoesThrough_0( _S212 : u32,  _S213 : vec3<f32>) -> bool
{
    var _S214 : u32 = records_0[_S212].terrainClip_0;
    var through_0 : u32 = ((records_0[_S212].terrainClip_0) & ((pickMask_0(view_0.iblFrame_0[i32(1)].z, view_0.iblFrame_0[i32(1)].w))));
    var _S215 : bool;
    if(through_0 == u32(0))
    {
        _S215 = true;
    }
    else
    {
        _S215 = ((terrainOpacity_0(through_0, _S213, u32(0))) >= 1.0f);
    }
    if(_S215)
    {
        return false;
    }
    return ((terrainOpacity_0((_S214 & ((pickMask_0(view_0.iblFrame_0[i32(1)].x, view_0.iblFrame_0[i32(1)].y)))), _S213, u32(0))) >= 1.0f);
}

fn pickOutput_0( in_6 : SurfaceVaryings_0,  triangle_0 : u32,  trimmed_0 : bool) -> PickOut_0
{
    var s_6 : SurfaceVaryings_0 = in_6;
    var _S216 : vec2<f32> = pickFramePixel_0(s_6.position_1.xy);
    s_6.position_1.x = _S216.x;
    s_6.position_1.y = _S216.y;
    var covered_1 : bool;
    if(trimmed_0)
    {
        covered_1 = trimCovered_0(s_6);
    }
    else
    {
        covered_1 = true;
    }
    cutOut_0(s_6);
    var _S217 : u32 = s_6.ids_0.x;
    if(!covered_1)
    {
        covered_1 = true;
    }
    else
    {
        covered_1 = pickGoesThrough_0(_S217, s_6.relPosition_0);
    }
    if(covered_1)
    {
        discard;
    }
    var patched_0 : bool = (((records_0[_S217].flags_0) & (u32(128)))) != u32(0);
    var o_2 : PickOut_0;
    var _S218 : u32 = s_6.ids_0.x;
    var _S219 : u32 = s_6.ids_0.y;
    var _S220 : u32;
    if(patched_0)
    {
        _S220 = u32(4294967295);
    }
    else
    {
        _S220 = triangle_0;
    }
    var _S221 : u32;
    if(patched_0)
    {
        _S221 = u32(0);
    }
    else
    {
        _S221 = ((s_6.ids_0.z) & (u32(2147483647)));
    }
    o_2.ids_13 = vec4<u32>(_S218, _S219, _S220, _S221);
    var _S222 : vec4<f32>;
    if(patched_0)
    {
        _S222 = vec4<f32>(s_6.uv_1, s_6.airInscatter_0.xy);
    }
    else
    {
        _S222 = vec4<f32>(s_6.airInscatter_0, 0.0f);
    }
    o_2.domain_0 = _S222;
    return o_2;
}

struct pixelInput_12
{
    @location(0) normal_14 : vec3<f32>,
    @location(1) uv_15 : vec2<f32>,
    @location(2) color_15 : vec4<f32>,
    @interpolate(flat) @location(3) ids_14 : vec3<u32>,
    @location(4) relPosition_13 : vec3<f32>,
    @location(5) tangent_13 : vec4<f32>,
    @location(6) airInscatter_13 : vec3<f32>,
    @location(7) airTransmittance_14 : vec4<f32>,
    @location(8) positionMC_13 : vec3<f32>,
    @location(9) named0_13 : vec4<f32>,
    @location(10) named1_13 : vec4<f32>,
    @location(11) named2_13 : vec4<f32>,
    @location(12) named3_13 : vec4<f32>,
    @interpolate(flat) @location(13) triangle_1 : u32,
};

@fragment
fn pickFs( _S223 : pixelInput_12, @builtin(position) position_14 : vec4<f32>) -> PickOut_0
{
    var _S224 : SurfaceVaryings_0 = SurfaceVaryings_0( position_14, _S223.normal_14, _S223.uv_15, _S223.color_15, _S223.ids_14, _S223.relPosition_13, _S223.tangent_13, _S223.airInscatter_13, _S223.airTransmittance_14, _S223.positionMC_13, _S223.named0_13, _S223.named1_13, _S223.named2_13, _S223.named3_13 );
    clipGhosts_0 = false;
    clipGhosted_0 = false;
    clipGhostAlpha_0 = 1.0f;
    clipGhostTint_0 = _S11();
    clipIdOut_0 = u32(4294967295);
    clipDistanceOut_0 = 3.39999995214436425e+38f;
    clipFlagsOut_0 = u32(0);
    clipParamsOut_0 = _S24();
    terrainSeen_0 = true;
    patchLine_0 = _S120();
    surfaceLight_0 = true;
    var _S225 : PickOut_0 = pickOutput_0(_S224, _S223.triangle_1, false);
    return _S225;
}

struct pixelInput_13
{
    @location(0) normal_15 : vec3<f32>,
    @location(1) uv_16 : vec2<f32>,
    @location(2) color_16 : vec4<f32>,
    @interpolate(flat) @location(3) ids_15 : vec3<u32>,
    @location(4) relPosition_14 : vec3<f32>,
    @location(5) tangent_14 : vec4<f32>,
    @location(6) airInscatter_14 : vec3<f32>,
    @location(7) airTransmittance_15 : vec4<f32>,
    @location(8) positionMC_14 : vec3<f32>,
    @location(9) named0_14 : vec4<f32>,
    @location(10) named1_14 : vec4<f32>,
    @location(11) named2_14 : vec4<f32>,
    @location(12) named3_14 : vec4<f32>,
    @interpolate(flat) @location(13) triangle_2 : u32,
};

@fragment
fn pickTrimmedFs( _S226 : pixelInput_13, @builtin(position) position_15 : vec4<f32>) -> PickOut_0
{
    var _S227 : SurfaceVaryings_0 = SurfaceVaryings_0( position_15, _S226.normal_15, _S226.uv_16, _S226.color_16, _S226.ids_15, _S226.relPosition_14, _S226.tangent_14, _S226.airInscatter_14, _S226.airTransmittance_15, _S226.positionMC_14, _S226.named0_14, _S226.named1_14, _S226.named2_14, _S226.named3_14 );
    clipGhosts_0 = false;
    clipGhosted_0 = false;
    clipGhostAlpha_0 = 1.0f;
    clipGhostTint_0 = _S11();
    clipIdOut_0 = u32(4294967295);
    clipDistanceOut_0 = 3.39999995214436425e+38f;
    clipFlagsOut_0 = u32(0);
    clipParamsOut_0 = _S24();
    terrainSeen_0 = true;
    patchLine_0 = _S120();
    surfaceLight_0 = true;
    var _S228 : PickOut_0 = pickOutput_0(_S227, _S226.triangle_2, true);
    return _S228;
}

fn imageryUv_0( packed_1 : u32,  uv_17 : vec2<f32>) -> vec2<f32>
{
    var t_3 : vec2<f32> = (vec2<f32>(f32((((packed_1 >> (u32(16)))) & (u32(255)))), f32((packed_1 >> (u32(24))))) + uv_17) / vec2<f32>(f32((u32(1) << (((((packed_1 >> (u32(12)))) & (u32(15))))))));
    return vec2<f32>(t_3.x, 1.0f - t_3.y);
}

fn srgbToLinear_0( c_3 : vec3<f32>) -> vec3<f32>
{
    return select(pow((c_3 + vec3<f32>(0.054999999701976776f)) / vec3<f32>(1.0549999475479126f), vec3<f32>(2.4000000953674316f)), c_3 / vec3<f32>(12.920000076293945f), (c_3 <= vec3<f32>(0.040449999272823334f)));
}

fn patchLineColor_0( cover_2 : vec2<f32>,  display_1 : u32) -> vec4<f32>
{
    var wire_0 : vec3<f32>;
    if(((display_1 & (u32(2048)))) != u32(0))
    {
        wire_0 = vec3<f32>(0.090000003576278687f, 0.090000003576278687f, 0.10000000149011612f);
    }
    else
    {
        wire_0 = vec3<f32>(0.20000000298023224f, 0.20000000298023224f, 0.2199999988079071f);
    }
    var _S229 : f32 = cover_2.x;
    var _S230 : f32 = cover_2.y;
    var _S231 : f32 = 1.0f - _S230;
    var total_0 : f32 = 1.0f - (1.0f - _S229) * _S231;
    return vec4<f32>((wire_0 * vec3<f32>(_S229) * vec3<f32>(_S231) + vec3<f32>(0.019999999552965164f, 0.11999999731779099f, 0.55000001192092896f) * vec3<f32>(_S230)) / vec3<f32>(max(total_0, 9.9999997473787516e-05f)), total_0);
}

struct Surface_0
{
     color_17 : vec3<f32>,
     alpha_5 : f32,
     unlit_1 : bool,
     sceneShare_0 : f32,
};

fn surface_0( color_18 : vec3<f32>,  alpha_6 : f32,  unlit_2 : bool) -> Surface_0
{
    var s_7 : Surface_0;
    s_7.color_17 = color_18;
    s_7.alpha_5 = alpha_6;
    s_7.unlit_1 = unlit_2;
    s_7.sceneShare_0 = 1.0f;
    return s_7;
}

fn fresnelSchlick_0( f0_0 : vec3<f32>,  f90_0 : vec3<f32>,  cosTheta_0 : f32) -> vec3<f32>
{
    var x_1 : f32 = 1.0f - cosTheta_0;
    var _S232 : vec3<f32> = vec3<f32>((x_1 * x_1));
    return f0_0 + (f90_0 - f0_0) * _S232 * _S232 * vec3<f32>(x_1);
}

fn smithVisibility_0( alpha_7 : f32,  nDotL_0 : f32,  nDotV_0 : f32) -> f32
{
    var a2_0 : f32 = alpha_7 * alpha_7;
    var _S233 : f32 = 1.0f - a2_0;
    var sum_0 : f32 = nDotL_0 * sqrt(nDotV_0 * nDotV_0 * _S233 + a2_0) + nDotV_0 * sqrt(nDotL_0 * nDotL_0 * _S233 + a2_0);
    var _S234 : f32;
    if((sum_0 > 0.0f))
    {
        _S234 = 0.5f / sum_0;
    }
    else
    {
        _S234 = 0.0f;
    }
    return _S234;
}

fn ggx_0( alpha_8 : f32,  nDotH_0 : f32) -> f32
{
    var a2_1 : f32 = alpha_8 * alpha_8;
    var f_2 : f32 = (nDotH_0 * a2_1 - nDotH_0) * nDotH_0 + 1.0f;
    return a2_1 / (3.1415927410125732f * f_2 * f_2);
}

fn directReflectance_0( n_8 : vec3<f32>,  v_1 : vec3<f32>,  l_0 : vec3<f32>,  f0_1 : vec3<f32>,  diffuseColor_0 : vec3<f32>,  alpha_9 : f32,  nDotV_1 : f32) -> vec3<f32>
{
    var h_0 : vec3<f32> = normalize(v_1 + l_0);
    var nDotL_1 : f32 = clamp(dot(n_8, l_0), 0.0010000000474974513f, 1.0f);
    var fresnel_0 : vec3<f32> = fresnelSchlick_0(f0_1, vec3<f32>(clamp(max(f0_1.x, max(f0_1.y, f0_1.z)) * 25.0f, 0.0f, 1.0f)), clamp(dot(v_1, h_0), 0.0f, 1.0f));
    return ((vec3<f32>(1.0f) - fresnel_0) * diffuseColor_0 / vec3<f32>(3.1415927410125732f) + fresnel_0 * vec3<f32>(smithVisibility_0(alpha_9, nDotL_1, nDotV_1)) * vec3<f32>(ggx_0(alpha_9, clamp(dot(n_8, h_0), 0.0f, 1.0f)))) * vec3<f32>(nDotL_1);
}

fn cascadeLight_0( c_4 : u32,  relPosition_15 : vec3<f32>,  n_9 : vec3<f32>) -> f32
{
    var p_5 : vec4<f32> = (((vec4<f32>(relPosition_15 + n_9 * vec3<f32>((shadows_0.texels_0[c_4] * 2.0f)), 1.0f)) * (mat4x4<f32>(shadows_0.matrices_0.data_2[c_4].data_0[i32(0)][i32(0)], shadows_0.matrices_0.data_2[c_4].data_0[i32(1)][i32(0)], shadows_0.matrices_0.data_2[c_4].data_0[i32(2)][i32(0)], shadows_0.matrices_0.data_2[c_4].data_0[i32(3)][i32(0)], shadows_0.matrices_0.data_2[c_4].data_0[i32(0)][i32(1)], shadows_0.matrices_0.data_2[c_4].data_0[i32(1)][i32(1)], shadows_0.matrices_0.data_2[c_4].data_0[i32(2)][i32(1)], shadows_0.matrices_0.data_2[c_4].data_0[i32(3)][i32(1)], shadows_0.matrices_0.data_2[c_4].data_0[i32(0)][i32(2)], shadows_0.matrices_0.data_2[c_4].data_0[i32(1)][i32(2)], shadows_0.matrices_0.data_2[c_4].data_0[i32(2)][i32(2)], shadows_0.matrices_0.data_2[c_4].data_0[i32(3)][i32(2)], shadows_0.matrices_0.data_2[c_4].data_0[i32(0)][i32(3)], shadows_0.matrices_0.data_2[c_4].data_0[i32(1)][i32(3)], shadows_0.matrices_0.data_2[c_4].data_0[i32(2)][i32(3)], shadows_0.matrices_0.data_2[c_4].data_0[i32(3)][i32(3)]))));
    var uv_18 : vec2<f32> = vec2<f32>(p_5.x * 0.5f + 0.5f, 0.5f - p_5.y * 0.5f);
    var _S235 : bool;
    if((any(((uv_18 < vec2<f32>(0.0f))))))
    {
        _S235 = true;
    }
    else
    {
        _S235 = (any(((uv_18 > vec2<f32>(1.0f)))));
    }
    if(_S235)
    {
        _S235 = true;
    }
    else
    {
        _S235 = ((p_5.z) > 1.0f);
    }
    if(_S235)
    {
        return 1.0f;
    }
    var _S236 : vec2<f32> = vec2<f32>(0.5f);
    var _S237 : vec2<f32> = uv_18 * vec2<f32>(2048.0f) + _S236;
    var base_0 : vec2<f32> = floor(_S237);
    var st_0 : vec2<f32> = _S237 - base_0;
    var _S238 : vec2<f32> = vec2<f32>(0.00048828125f);
    var _S239 : vec2<f32> = (base_0 - _S236) * _S238;
    var _S240 : f32 = st_0.x;
    var _S241 : f32 = 3.0f * _S240;
    var _S242 : f32 = 4.0f - _S241;
    var _S243 : f32 = 1.0f + _S241;
    var _S244 : f32 = (3.0f - 2.0f * _S240) / _S242 - 2.0f;
    var _S245 : f32 = (3.0f + _S240) / 7.0f;
    var _S246 : f32 = _S240 / _S243 + 2.0f;
    var _S247 : f32 = st_0.y;
    var _S248 : f32 = 3.0f * _S247;
    var _S249 : f32 = 4.0f - _S248;
    var _S250 : f32 = 1.0f + _S248;
    var _S251 : f32 = (3.0f - 2.0f * _S247) / _S249 - 2.0f;
    var _S252 : f32 = (3.0f + _S247) / 7.0f;
    var _S253 : f32 = _S247 / _S250 + 2.0f;
    var _S254 : f32 = f32(c_4);
    var _S255 : vec3<f32> = vec3<f32>(_S239 + vec2<f32>(_S244, _S251) * _S238, _S254);
    var _S256 : f32 = p_5.z;
    var _S257 : vec3<f32> = vec3<f32>(_S239 + vec2<f32>(_S245, _S251) * _S238, _S254);
    var _S258 : vec3<f32> = vec3<f32>(_S239 + vec2<f32>(_S246, _S251) * _S238, _S254);
    var _S259 : vec3<f32> = vec3<f32>(_S239 + vec2<f32>(_S244, _S252) * _S238, _S254);
    var _S260 : vec3<f32> = vec3<f32>(_S239 + vec2<f32>(_S245, _S252) * _S238, _S254);
    var _S261 : vec3<f32> = vec3<f32>(_S239 + vec2<f32>(_S246, _S252) * _S238, _S254);
    var _S262 : vec3<f32> = vec3<f32>(_S239 + vec2<f32>(_S244, _S253) * _S238, _S254);
    var _S263 : vec3<f32> = vec3<f32>(_S239 + vec2<f32>(_S245, _S253) * _S238, _S254);
    var _S264 : vec3<f32> = vec3<f32>(_S239 + vec2<f32>(_S246, _S253) * _S238, _S254);
    return (_S242 * _S249 * (textureSampleCompareLevel((shadowMap_0), (shadowSampler_0), ((_S255)).xy, i32(((_S255)).z), (_S256))) + 7.0f * _S249 * (textureSampleCompareLevel((shadowMap_0), (shadowSampler_0), ((_S257)).xy, i32(((_S257)).z), (_S256))) + _S243 * _S249 * (textureSampleCompareLevel((shadowMap_0), (shadowSampler_0), ((_S258)).xy, i32(((_S258)).z), (_S256))) + _S242 * 7.0f * (textureSampleCompareLevel((shadowMap_0), (shadowSampler_0), ((_S259)).xy, i32(((_S259)).z), (_S256))) + 49.0f * (textureSampleCompareLevel((shadowMap_0), (shadowSampler_0), ((_S260)).xy, i32(((_S260)).z), (_S256))) + _S243 * 7.0f * (textureSampleCompareLevel((shadowMap_0), (shadowSampler_0), ((_S261)).xy, i32(((_S261)).z), (_S256))) + _S242 * _S250 * (textureSampleCompareLevel((shadowMap_0), (shadowSampler_0), ((_S262)).xy, i32(((_S262)).z), (_S256))) + 7.0f * _S250 * (textureSampleCompareLevel((shadowMap_0), (shadowSampler_0), ((_S263)).xy, i32(((_S263)).z), (_S256))) + _S243 * _S250 * (textureSampleCompareLevel((shadowMap_0), (shadowSampler_0), ((_S264)).xy, i32(((_S264)).z), (_S256)))) / 144.0f;
}

fn sunShadow_0( relPosition_16 : vec3<f32>,  n_10 : vec3<f32>) -> f32
{
    var _S265 : bool;
    if(((shadows_0.forward_0.w) < 0.5f))
    {
        return 1.0f;
    }
    var depth_0 : f32 = dot(relPosition_16, shadows_0.forward_0.xyz);
    if((depth_0 >= (shadows_0.fade_0.y)))
    {
        return 1.0f;
    }
    var c_5 : u32 = u32(0);
    loop
    {
        var _S266 : bool = (c_5 < u32(3));
        _S265 = _S266;
        var _S267 : bool;
        if(_S266)
        {
            _S267 = (depth_0 > (shadows_0.splits_0[c_5]));
        }
        else
        {
            _S267 = false;
        }
        if(_S267)
        {
        }
        else
        {
            break;
        }
        c_5 = c_5 + u32(1);
    }
    var lit_0 : f32 = cascadeLight_0(c_5, relPosition_16, n_10);
    var lit_1 : f32;
    if(_S265)
    {
        var near_1 : f32;
        if((c_5 > u32(0)))
        {
            near_1 = shadows_0.splits_0[max(c_5, u32(1)) - u32(1)];
        }
        else
        {
            near_1 = 0.0f;
        }
        var band_1 : f32 = 0.10000000149011612f * (shadows_0.splits_0[c_5] - near_1);
        var w_3 : f32 = clamp((depth_0 - (shadows_0.splits_0[c_5] - band_1)) / max(band_1, 0.0010000000474974513f), 0.0f, 1.0f);
        if((w_3 > 0.0f))
        {
            lit_1 = mix(lit_0, cascadeLight_0(c_5 + u32(1), relPosition_16, n_10), w_3);
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

fn sunlightThroughAir_0( relPosition_17 : vec3<f32>,  direction_0 : vec3<f32>) -> vec3<f32>
{
    var p_6 : vec3<f32> = relPosition_17 + cameraPosition_0();
    var radii_0 : vec3<f32> = view_0.bodyRadii_0.xyz;
    var distance_0 : f32 = length(p_6);
    return (textureSampleLevel((sunLightTable_0), (environmentSampler_0), (sunLightTableUv_0(dot(normalize(p_6 / (radii_0 * radii_0)), direction_0), (distance_0 - distance_0 / length(p_6 / radii_0)) / 1000.0f / (view_0.sunLight_0.y - view_0.sunLight_0.x))), (0.0f))).xyz * vec3<f32>((1.0e+05f * view_0.sunIlluminance_0));
}

fn sunIlluminance_1( relPosition_18 : vec3<f32>) -> vec3<f32>
{
    if(((view_0.sunLight_0.z) < 0.5f))
    {
        return vec3<f32>(view_0.sunIlluminance_0);
    }
    return sunlightThroughAir_0(relPosition_18, view_0.sunDirection_0.xyz);
}

fn punctualLight_0( pixel_1 : vec2<f32>,  relPosition_19 : vec3<f32>,  n_11 : vec3<f32>,  v_2 : vec3<f32>,  f0_2 : vec3<f32>,  diffuseColor_1 : vec3<f32>,  alpha_10 : f32,  nDotV_2 : f32) -> vec3<f32>
{
    var _S268 : f32 = bitcast<f32>(lightTable_0[(u32(0))/4]);
    var _S269 : f32 = bitcast<f32>(lightTable_0[(u32(4))/4]);
    var _S270 : f32 = bitcast<f32>(lightTable_0[(u32(8))/4]);
    var _S271 : f32 = bitcast<f32>(lightTable_0[(u32(16))/4]);
    var _S272 : f32 = bitcast<f32>(lightTable_0[(u32(20))/4]);
    var _S273 : f32 = bitcast<f32>(lightTable_0[(u32(32))/4]);
    var _S274 : f32 = bitcast<f32>(lightTable_0[(u32(36))/4]);
    var _S275 : f32 = bitcast<f32>(lightTable_0[(u32(40))/4]);
    var _S276 : f32 = bitcast<f32>(lightTable_0[(u32(44))/4]);
    var sum_1 : vec3<f32> = vec3<f32>(0.0f);
    if((bitcast<f32>(lightTable_0[(u32(12))/4]) < 0.5f))
    {
        return sum_1;
    }
    var z_0 : f32 = dot(relPosition_19, vec3<f32>(_S273, _S274, _S275));
    var _S277 : bool;
    if((z_0 < _S271))
    {
        _S277 = true;
    }
    else
    {
        _S277 = (z_0 >= _S276);
    }
    if(_S277)
    {
        return sum_1;
    }
    var _S278 : vec3<u32> = vec3<u32>(vec3<f32>(_S268, _S269, _S270));
    var uv_19 : vec2<f32> = pixel_1 * view_0.viewport_0.zw;
    var _S279 : u32 = _S278.x;
    var _S280 : u32 = _S278.y;
    var base_1 : u32 = ((min(u32(log(z_0 / _S271) * _S272), _S278.z - u32(1)) * _S280 + min(u32(uv_19.y * f32(_S280)), _S280 - u32(1))) * _S279 + min(u32(uv_19.x * f32(_S279)), _S279 - u32(1))) * u32(17);
    var _S281 : u32 = min(lightTable_0[(u32(i32(u32(65616) + base_1 * u32(4))))/4], u32(16));
    var t_4 : u32 = u32(0);
    var sum_2 : vec3<f32> = sum_1;
    loop
    {
        if((t_4 < u32(16)))
        {
        }
        else
        {
            break;
        }
        if((t_4 >= _S281))
        {
            break;
        }
        var _S282 : u32 = u32(80) + min(lightTable_0[(u32(i32(u32(65616) + (base_1 + u32(1) + t_4) * u32(4))))/4], u32(1023)) * u32(64);
        var _S283 : f32 = bitcast<f32>(lightTable_0[(_S282 + u32(12))/4]);
        var _S284 : f32 = bitcast<f32>(lightTable_0[(_S282 + u32(16))/4]);
        var _S285 : f32 = bitcast<f32>(lightTable_0[(_S282 + u32(20))/4]);
        var _S286 : f32 = bitcast<f32>(lightTable_0[(_S282 + u32(24))/4]);
        var _S287 : f32 = bitcast<f32>(lightTable_0[(_S282 + u32(28))/4]);
        var _S288 : f32 = bitcast<f32>(lightTable_0[(_S282 + u32(32))/4]);
        var _S289 : f32 = bitcast<f32>(lightTable_0[(_S282 + u32(36))/4]);
        var _S290 : f32 = bitcast<f32>(lightTable_0[(_S282 + u32(40))/4]);
        var _S291 : f32 = bitcast<f32>(lightTable_0[(_S282 + u32(44))/4]);
        var _S292 : f32 = bitcast<f32>(lightTable_0[(_S282 + u32(48))/4]);
        var toLight_0 : vec3<f32> = vec3<f32>(bitcast<f32>(lightTable_0[(_S282)/4]), bitcast<f32>(lightTable_0[(_S282 + u32(4))/4]), bitcast<f32>(lightTable_0[(_S282 + u32(8))/4])) - relPosition_19;
        var _S293 : f32 = max(dot(toLight_0, toLight_0), 9.9999997473787516e-05f);
        var l_1 : vec3<f32> = toLight_0 * vec3<f32>(inverseSqrt(_S293));
        if(((dot(n_11, l_1)) <= 0.0f))
        {
            t_4 = t_4 + u32(1);
            continue;
        }
        var ratio2_0 : f32 = _S293 / (_S283 * _S283);
        var window_0 : f32 = clamp(1.0f - ratio2_0 * ratio2_0, 0.0f, 1.0f);
        var illuminance_0 : vec3<f32> = vec3<f32>(_S284, _S285, _S286) * vec3<f32>((window_0 * window_0 / _S293));
        var illuminance_1 : vec3<f32>;
        if((_S287 > 0.5f))
        {
            var cone_0 : f32 = clamp(dot(vec3<f32>(_S288, _S289, _S290), (vec3<f32>(0) - l_1)) * _S291 + _S292, 0.0f, 1.0f);
            illuminance_1 = illuminance_0 * vec3<f32>((cone_0 * cone_0));
        }
        else
        {
            illuminance_1 = illuminance_0;
        }
        sum_2 = sum_2 + directReflectance_0(n_11, v_2, l_1, f0_2, diffuseColor_1, alpha_10, nDotV_2) * illuminance_1;
        t_4 = t_4 + u32(1);
    }
    return sum_2;
}

fn toEnvironment_0( d_6 : vec3<f32>) -> vec3<f32>
{
    return vec3<f32>(dot(d_6, view_0.iblFrame_0[i32(0)].xyz), dot(d_6, view_0.iblFrame_0[i32(1)].xyz), dot(d_6, view_0.iblFrame_0[i32(2)].xyz));
}

fn irradiance_0( n_12 : vec3<f32>) -> vec3<f32>
{
    return (textureSampleLevel((irradianceCube_0), (environmentSampler_0), (n_12), (0.0f))).xyz;
}

fn ambientOcclusion_0( pixel_2 : vec2<f32>) -> f32
{
    if(((shadows_0.fade_0.z) < 0.5f))
    {
        return 1.0f;
    }
    var _S294 : vec2<u32> = vec2<u32>(pixel_2);
    var _S295 : u32 = _S294.x;
    return f32((((aoWords_0[_S294.y * ((u32(view_0.viewport_0.x) + u32(3)) / u32(4)) + _S295 / u32(4)] >> ((u32(8) * ((_S295 & (u32(3)))))))) & (u32(255)))) / 255.0f;
}

struct AerialPerspective_0
{
     inscatter_0 : vec3<f32>,
     transmittance_0 : vec3<f32>,
};

fn aerialPerspective_0( fragment_0 : vec2<f32>,  relPosition_20 : vec3<f32>) -> AerialPerspective_0
{
    var w_4 : f32 = sqrt(clamp((length(relPosition_20) / 1000.0f - view_0.aerialStart_0) / max(view_0.aerialEnd_0 - view_0.aerialStart_0, 9.99999997475242708e-07f), 0.0f, 1.0f));
    var uv_20 : vec2<f32> = fragment_0 * view_0.viewport_0.zw;
    var half_0 : f32 = clamp(w_4, 0.00390625f, 0.99609375f) * 0.5f;
    var transmittance_1 : vec3<f32> = (textureSampleLevel((aerialVolume_0), (environmentSampler_0), (vec3<f32>(uv_20, 0.5f + half_0)), (0.0f))).xyz;
    var result_1 : AerialPerspective_0;
    var _S296 : vec3<f32> = vec3<f32>(clamp(w_4 * 256.0f, 0.0f, 1.0f));
    result_1.inscatter_0 = (textureSampleLevel((aerialVolume_0), (environmentSampler_0), (vec3<f32>(uv_20, half_0)), (0.0f))).xyz * _S296;
    result_1.transmittance_0 = mix(vec3<f32>(1.0f), transmittance_1, _S296);
    return result_1;
}

fn shadeSurface_0( in_7 : SurfaceVaryings_0,  frontFacing_3 : bool,  translucent_0 : bool) -> Surface_0
{
    var _S297 : u32 = in_7.ids_0.x;
    var _S298 : Material_std430_0 = materials_0[records_0[_S297].materialIndex_0];
    var _S299 : u32 = _S298.flags_1;
    var clipDrops_1 : bool;
    if(clipsOn_0)
    {
        clipGhosts_0 = translucent_0;
        var effects_0 : bool = ((((bitcast<vec4<u32>>((clipRow_0(u32(0))))).y) & (u32(4)))) != u32(0);
        if(translucent_0)
        {
            clipDrops_1 = true;
        }
        else
        {
            clipDrops_1 = !cutOutInDepth_0;
        }
        if(clipDrops_1)
        {
            clipDrops_1 = true;
        }
        else
        {
            clipDrops_1 = effects_0;
        }
        if(clipDrops_1)
        {
            var _S300 : bool = clipsKeep_0(in_7, _S297);
            if(translucent_0)
            {
                if(!_S300)
                {
                    clipDrops_1 = true;
                }
                else
                {
                    if(((_S299 & (u32(8)))) == u32(0))
                    {
                        clipDrops_1 = !clipGhosted_0;
                    }
                    else
                    {
                        clipDrops_1 = false;
                    }
                }
            }
            else
            {
                if(!_S300)
                {
                    clipDrops_1 = !cutOutInDepth_0;
                }
                else
                {
                    clipDrops_1 = false;
                }
            }
        }
        else
        {
            clipDrops_1 = false;
        }
        if(clipDrops_1)
        {
            clipDrops_1 = true;
        }
        else
        {
            if(clipGhosted_0)
            {
                clipDrops_1 = (((in_7.ids_0.z) & (u32(2147483648)))) != u32(0);
            }
            else
            {
                clipDrops_1 = false;
            }
        }
        clipsReport_0(in_7, _S297);
    }
    else
    {
        clipDrops_1 = false;
    }
    var _S301 : vec4<f32> = materialTexture_0(&(_S298), u32(0), in_7.uv_1);
    var _S302 : vec4<f32> = materialTexture_0(&(_S298), u32(4), in_7.uv_1);
    var emissiveSample_0 : vec3<f32> = _S302.xyz;
    var _S303 : vec4<f32> = materialTexture_0(&(_S298), u32(1), in_7.uv_1);
    var _S304 : vec4<f32> = materialTexture_0(&(_S298), u32(2), in_7.uv_1);
    var normalSample_0 : vec3<f32> = _S304.xyz;
    var _S305 : vec4<f32> = materialTexture_0(&(_S298), u32(3), in_7.uv_1);
    var occlusionSample_0 : f32 = _S305.x;
    var imageryPacked_0 : u32 = records_0[_S297].imagerySlice_0;
    var _S306 : vec3<f32> = vec3<f32>(imageryUv_0(records_0[_S297].imagerySlice_0, in_7.uv_1), f32(max(((records_0[_S297].imagerySlice_0) & (u32(4095))), u32(1)) - u32(1)));
    var imagerySample_0 : vec4<f32> = (textureSample((imagery_0), (imagerySampler_0), ((_S306)).xy, i32(((_S306)).z)));
    var lightsPacked_0 : u32 = records_0[_S297].lightsSlice_0;
    var _S307 : vec3<f32> = vec3<f32>(imageryUv_0(records_0[_S297].lightsSlice_0, in_7.uv_1), f32(max(((records_0[_S297].lightsSlice_0) & (u32(4095))), u32(1)) - u32(1)));
    var lightsSample_0 : vec3<f32> = (textureSample((imagery_0), (imagerySampler_0), ((_S307)).xy, i32(((_S307)).z))).xyz;
    var _S308 : vec3<f32> = drawnPosition_0(in_7, _S297);
    var dPdx_0 : vec3<f32> = dpdx(_S308);
    var dPdy_0 : vec3<f32> = dpdy(_S308);
    var dUVdx_0 : vec2<f32> = dpdx(in_7.uv_1);
    var dUVdy_0 : vec2<f32> = dpdy(in_7.uv_1);
    var _S309 : u32 = patchDisplay_0(_S297);
    var widths_0 : PatchWidths_0 = patchWidths_0(in_7);
    var baseColorSample_0 : vec4<f32>;
    var emissiveSample_1 : vec3<f32>;
    if(((_S299 & (u32(512)))) != u32(0))
    {
        var _S310 : vec3<f32> = vec3<f32>(2.2000000476837158f);
        var _S311 : vec3<f32> = pow(emissiveSample_0, _S310);
        baseColorSample_0 = vec4<f32>(pow(_S301.xyz, _S310), _S301.w);
        emissiveSample_1 = _S311;
    }
    else
    {
        baseColorSample_0 = _S301;
        emissiveSample_1 = emissiveSample_0;
    }
    var _S312 : vec4<f32> = records_0[_S297].color_0;
    var baseColor_2 : vec4<f32> = _S298.baseColor_0 * records_0[_S297].color_0 * in_7.color_1;
    var _S313 : bool = materialHasTexture_0(&(_S298), u32(0));
    if(_S313)
    {
        baseColor_2 = baseColor_2 * baseColorSample_0;
    }
    if(imageryPacked_0 != u32(0))
    {
        baseColor_2 = vec4<f32>(srgbToLinear_0(imagerySample_0.xyz), 1.0f) * _S312;
    }
    if(clipGhosted_0)
    {
        var _S314 : vec3<f32> = mix(baseColor_2.xyz, clipGhostTint_0.xyz, vec3<f32>(clipGhostTint_0.w));
        baseColor_2.x = _S314.x;
        baseColor_2.y = _S314.y;
        baseColor_2.z = _S314.z;
        if(translucent_0)
        {
            baseColor_2[i32(3)] = baseColor_2[i32(3)] * clipGhostAlpha_0;
        }
    }
    if(placeholderOut_0(_S297, in_7.relPosition_0))
    {
        clipDrops_1 = true;
    }
    if(clipDrops_1)
    {
        discard;
    }
    if(translucent_0)
    {
        clipDrops_1 = true;
    }
    else
    {
        clipDrops_1 = !cutOutInDepth_0;
    }
    var terrain_0 : f32;
    if(clipDrops_1)
    {
        var _S315 : f32 = terrainAlpha_0(_S297, in_7);
        if((_S315 <= 0.0f))
        {
            discard;
        }
        terrain_0 = _S315;
    }
    else
    {
        terrain_0 = 1.0f;
    }
    var _S316 : vec3<f32> = _S298.emissive_0;
    var _S317 : bool = materialHasTexture_0(&(_S298), u32(4));
    var emissive_2 : vec3<f32>;
    if(_S317)
    {
        emissive_2 = _S316 * emissiveSample_1;
    }
    else
    {
        emissive_2 = _S316;
    }
    var _S318 : f32 = _S298.metallic_0;
    var _S319 : f32 = _S298.roughness_0;
    var _S320 : bool = materialHasTexture_0(&(_S298), u32(1));
    var metallic_2 : f32;
    var roughness_2 : f32;
    if(_S320)
    {
        var roughness_3 : f32 = _S319 * _S303.y;
        metallic_2 = _S318 * _S303.z;
        roughness_2 = roughness_3;
    }
    else
    {
        metallic_2 = _S318;
        roughness_2 = _S319;
    }
    var metallic_3 : f32 = clamp(metallic_2, 0.0f, 1.0f);
    var roughness_4 : f32 = clamp(roughness_2, 0.0f, 1.0f);
    var n_13 : vec3<f32> = normalize(in_7.normal_1);
    var _S321 : bool = !frontFacing_3;
    var n_14 : vec3<f32>;
    if(_S321)
    {
        n_14 = (vec3<f32>(0) - n_13);
    }
    else
    {
        n_14 = n_13;
    }
    var _S322 : bool = materialHasTexture_0(&(_S298), u32(2));
    var geometric_2 : vec3<f32>;
    var direct_0 : vec3<f32>;
    if(_S322)
    {
        var _S323 : f32 = in_7.tangent_0.w;
        if(_S323 != 0.0f)
        {
            clipDrops_1 = (((records_0[_S297].flags_0) & (u32(128)))) == u32(0);
        }
        else
        {
            clipDrops_1 = false;
        }
        if(clipDrops_1)
        {
            var _S324 : vec3<f32> = in_7.tangent_0.xyz;
            var t_5 : vec3<f32> = normalize(_S324 - n_14 * vec3<f32>(dot(n_14, _S324)));
            var _S325 : vec3<f32> = cross(n_14, t_5) * vec3<f32>(_S323);
            geometric_2 = t_5;
            direct_0 = _S325;
        }
        else
        {
            var dp2perp_0 : vec3<f32> = cross(dPdy_0, n_14);
            var dp1perp_0 : vec3<f32> = cross(n_14, dPdx_0);
            var tt_0 : vec3<f32> = dp2perp_0 * vec3<f32>(dUVdx_0.x) + dp1perp_0 * vec3<f32>(dUVdy_0.x);
            var bb_0 : vec3<f32> = dp2perp_0 * vec3<f32>(dUVdx_0.y) + dp1perp_0 * vec3<f32>(dUVdy_0.y);
            var _S326 : vec3<f32> = vec3<f32>(inverseSqrt(max(dot(tt_0, tt_0), dot(bb_0, bb_0)) + 9.99999968265522539e-21f));
            var _S327 : vec3<f32> = bb_0 * _S326;
            geometric_2 = tt_0 * _S326;
            direct_0 = _S327;
        }
        var tsNormal_0 : vec3<f32> = (normalSample_0 * vec3<f32>(2.0f) - vec3<f32>(1.0f)) * vec3<f32>(_S298.normalScale_0, _S298.normalScale_0, 1.0f);
        n_14 = normalize(geometric_2 * vec3<f32>(tsNormal_0.x) + direct_0 * vec3<f32>(tsNormal_0.y) + n_14 * vec3<f32>(tsNormal_0.z));
    }
    var _S328 : bool = materialHasTexture_0(&(_S298), u32(3));
    var occlusion_1 : f32;
    if(_S328)
    {
        occlusion_1 = 1.0f + _S298.occlusionStrength_0 * (occlusionSample_0 - 1.0f);
    }
    else
    {
        occlusion_1 = 1.0f;
    }
    if(_S321)
    {
        geometric_2 = (vec3<f32>(0) - n_13);
    }
    else
    {
        geometric_2 = n_13;
    }
    if(((_S309 & (u32(1024)))) != u32(0))
    {
        var facet_0 : vec3<f32> = cross(dPdx_0, dPdy_0);
        var length2_0 : f32 = dot(facet_0, facet_0);
        if((length2_0 > 0.0f))
        {
            var facet_1 : vec3<f32> = facet_0 * vec3<f32>(inverseSqrt(length2_0));
            if(((dot(facet_1, geometric_2)) < 0.0f))
            {
                direct_0 = (vec3<f32>(0) - facet_1);
            }
            else
            {
                direct_0 = facet_1;
            }
            geometric_2 = direct_0;
            n_14 = direct_0;
        }
    }
    var fragment_1 : CesiumFragment = fragmentOf_0(in_7, geometric_2, _S308);
    var custom_1 : MaterialOutput;
    var _S329 : vec3<f32> = baseColor_2.xyz;
    var _S330 : f32 = baseColor_2.w;
    if(((_S299 & (u32(1)))) != u32(0))
    {
        clipDrops_1 = true;
    }
    else
    {
        clipDrops_1 = (((records_0[_S297].flags_0) & (u32(2)))) != u32(0);
    }
    custom_1 = materialOutput_0(_S329, _S330, metallic_3, roughness_4, n_14, occlusion_1, emissive_2, clipDrops_1);
    cesiumFragmentStage((fragment_1), &((custom_1)));
    baseColor_2 = vec4<f32>(custom_1.baseColor, custom_1.alpha * terrain_0);
    if(_S309 != u32(0))
    {
        patchLine_0 = patchLineColor_0(patchLines_0(in_7, _S309, widths_0, ((((records_0[_S297].flags_0) >> (u32(16)))) & (u32(255)))), _S309);
        if(((_S309 & (u32(2048)))) != u32(0))
        {
            if(!cutOutInDepth_0)
            {
                clipDrops_1 = ((patchLine_0.w) < 0.5f);
            }
            else
            {
                clipDrops_1 = false;
            }
            if(clipDrops_1)
            {
                discard;
            }
            patchLine_0[i32(3)] = 1.0f;
        }
    }
    if(!cutOutInDepth_0)
    {
        clipDrops_1 = ((_S299 & (u32(4)))) != u32(0);
    }
    else
    {
        clipDrops_1 = false;
    }
    if(clipDrops_1)
    {
        clipDrops_1 = ((baseColor_2.w) < (_S298.alphaCutoff_0));
    }
    else
    {
        clipDrops_1 = false;
    }
    if(clipDrops_1)
    {
        discard;
    }
    if(custom_1.unlit)
    {
        return surface_0(baseColor_2.xyz, baseColor_2.w, true);
    }
    if(!surfaceLight_0)
    {
        return surface_0(vec3<f32>(0.0f), baseColor_2.w, false);
    }
    var metallic_4 : f32 = clamp(custom_1.metallic, 0.0f, 1.0f);
    var roughness_5 : f32 = clamp(custom_1.roughness, 0.0f, 1.0f);
    var n_15 : vec3<f32> = normalize(custom_1.normal);
    var occlusion_2 : f32 = custom_1.occlusion;
    var emissive_3 : vec3<f32> = custom_1.emissive;
    var v_3 : vec3<f32> = (vec3<f32>(0) - normalize(_S308));
    var l_2 : vec3<f32> = normalize(view_0.sunDirection_0.xyz);
    var nDotV_3 : f32 = clamp(dot(n_15, v_3), 0.0f, 1.0f);
    var f0_3 : vec3<f32> = mix(vec3<f32>(0.039999999105930328f), baseColor_2.xyz, vec3<f32>(metallic_4));
    var diffuseColor_2 : vec3<f32> = baseColor_2.xyz * vec3<f32>((1.0f - metallic_4));
    var alpha_11 : f32 = roughness_5 * roughness_5;
    var sunReflected_0 : vec3<f32> = directReflectance_0(n_15, v_3, l_2, f0_3, diffuseColor_2, alpha_11, nDotV_3);
    var moonShadows_0 : bool = ((shadows_0.fade_0.w) > 0.5f);
    var sunVisible_0 : f32;
    if(((dot(n_15, l_2)) > 0.0f))
    {
        sunVisible_0 = 1.0f;
    }
    else
    {
        sunVisible_0 = 0.0f;
    }
    if((sunVisible_0 > 0.0f))
    {
        clipDrops_1 = !moonShadows_0;
    }
    else
    {
        clipDrops_1 = false;
    }
    if(clipDrops_1)
    {
        sunVisible_0 = sunVisible_0 * sunShadow_0(_S308, geometric_2);
    }
    var direct_1 : vec3<f32> = sunReflected_0 * sunIlluminance_1(_S308) * vec3<f32>(sunVisible_0);
    var moonward_0 : vec3<f32> = view_0.moonLight_0.xyz;
    if(((view_0.moonLight_0.w) > 0.0f))
    {
        clipDrops_1 = ((view_0.sunLight_0.z) > 0.5f);
    }
    else
    {
        clipDrops_1 = false;
    }
    if(clipDrops_1)
    {
        clipDrops_1 = ((dot(n_15, moonward_0)) > 0.0f);
    }
    else
    {
        clipDrops_1 = false;
    }
    var ao_0 : f32;
    if(clipDrops_1)
    {
        if(moonShadows_0)
        {
            ao_0 = sunShadow_0(_S308, geometric_2);
        }
        else
        {
            ao_0 = 1.0f;
        }
        direct_0 = direct_1 + directReflectance_0(n_15, v_3, moonward_0, f0_3, diffuseColor_2, alpha_11, nDotV_3) * sunlightThroughAir_0(_S308, moonward_0) * vec3<f32>(view_0.moonLight_0.w) * vec3<f32>(ao_0);
    }
    else
    {
        direct_0 = direct_1;
    }
    var _S331 : vec2<f32> = in_7.position_1.xy;
    var direct_2 : vec3<f32> = direct_0 + punctualLight_0(_S331, _S308, n_15, v_3, f0_3, diffuseColor_2, alpha_11, nDotV_3);
    var lut_0 : vec2<f32> = (textureSampleLevel((brdfLut_0), (environmentSampler_0), (vec2<f32>(nDotV_3, roughness_5)), (0.0f))).xy;
    var _S332 : f32 = lut_0.x;
    var _S333 : f32 = lut_0.y;
    var fssEss_0 : vec3<f32> = fresnelSchlick_0(f0_3, max(vec3<f32>((1.0f - roughness_5)), f0_3), nDotV_3) * vec3<f32>(_S332) + vec3<f32>(_S333);
    var _S334 : vec3<f32> = vec3<f32>(1.0f);
    var averageF_0 : vec3<f32> = f0_3 + (_S334 - f0_3) / vec3<f32>(21.0f);
    var _S335 : vec3<f32> = vec3<f32>((1.0f - _S332 - _S333));
    var fmsEms_0 : vec3<f32> = fssEss_0 * averageF_0 * _S335 / (_S334 - averageF_0 * _S335);
    var diffuseIbl_1 : vec3<f32> = irradiance_0(toEnvironment_0(n_15)) * (fmsEms_0 + (_S334 - fssEss_0 - fmsEms_0) * diffuseColor_2);
    var specularIbl_1 : vec3<f32> = (textureSampleLevel((specularEnvironment_0), (environmentSampler_0), (toEnvironment_0(reflect((vec3<f32>(0) - v_3), n_15))), (roughness_5 * view_0.specularMaxLod_0))).xyz * fssEss_0;
    if(translucent_0)
    {
        ao_0 = 1.0f;
    }
    else
    {
        ao_0 = ambientOcclusion_0(_S331);
    }
    var indirect_0 : vec3<f32> = (diffuseIbl_1 * max(vec3<f32>(ao_0), ((vec3<f32>(ao_0) * (vec3<f32>(2.0404000282287598f) * diffuseColor_2 - vec3<f32>(0.33239999413490295f)) + (vec3<f32>(-4.795100212097168f) * diffuseColor_2 + vec3<f32>(0.64170002937316895f))) * vec3<f32>(ao_0) + (vec3<f32>(2.7551999092102051f) * diffuseColor_2 + vec3<f32>(0.69029998779296875f))) * vec3<f32>(ao_0)) * vec3<f32>(view_0.diffuseIbl_0) + specularIbl_1 * vec3<f32>(clamp(pow(nDotV_3 + ao_0, exp2(-16.0f * roughness_5 - 1.0f)) - 1.0f + ao_0, 0.0f, 1.0f)) * vec3<f32>(view_0.specularIbl_0)) * vec3<f32>(occlusion_2);
    var _S336 : vec3<f32> = vec3<f32>(0.0f);
    if(lightsPacked_0 != u32(0))
    {
        clipDrops_1 = ((view_0.iblFrame_0[i32(0)].w) > 0.5f);
    }
    else
    {
        clipDrops_1 = false;
    }
    var emitted_0 : vec3<f32>;
    if(clipDrops_1)
    {
        emitted_0 = max(srgbToLinear_0(lightsSample_0) - vec3<f32>(0.0040000001899898052f), _S336) / vec3<f32>(0.99599999189376831f) * vec3<f32>(0.30000001192092896f);
    }
    else
    {
        emitted_0 = _S336;
    }
    var lit_2 : vec3<f32> = (direct_2 + indirect_0 + emitted_0) * vec3<f32>(view_0.exposure_0);
    var lit_3 : vec3<f32>;
    var shown_0 : vec3<f32>;
    if(((view_0.sunLight_0.w) > 0.5f))
    {
        var march_0 : f32 = view_0.bodyRadii_0.w;
        var ap_0 : AerialPerspective_0;
        ap_0.inscatter_0 = _S336;
        ap_0.transmittance_0 = vec3<f32>(1.0f);
        if((march_0 < 1.0f))
        {
            ap_0 = aerialPerspective_0(_S331, _S308);
        }
        if((march_0 > 0.0f))
        {
            var a_4 : AerialPerspective_0;
            a_4.inscatter_0 = in_7.airInscatter_0;
            a_4.transmittance_0 = in_7.airTransmittance_1.xyz;
            var screen_0 : f32 = view_0.iblFrame_0[i32(1)].w;
            if((screen_0 > 0.0f))
            {
                var uv_21 : vec2<f32> = _S331 * view_0.viewport_0.zw;
                var _S337 : vec3<f32> = vec3<f32>(uv_21, 0.0f);
                var _S338 : vec3<f32> = vec3<f32>(screen_0);
                a_4.inscatter_0 = mix(a_4.inscatter_0, (textureSampleLevel((aerialScreen_0), (environmentSampler_0), ((_S337)).xy, i32(((_S337)).z), (0.0f))).xyz, _S338);
                var _S339 : vec3<f32> = vec3<f32>(uv_21, 1.0f);
                a_4.transmittance_0 = mix(a_4.transmittance_0, (textureSampleLevel((aerialScreen_0), (environmentSampler_0), ((_S339)).xy, i32(((_S339)).z), (0.0f))).xyz, _S338);
            }
            var _S340 : vec3<f32> = vec3<f32>(march_0);
            ap_0.inscatter_0 = mix(ap_0.inscatter_0, a_4.inscatter_0, _S340);
            ap_0.transmittance_0 = mix(ap_0.transmittance_0, a_4.transmittance_0, _S340);
        }
        var _S341 : vec3<f32> = emissive_3 * ap_0.transmittance_0;
        lit_3 = lit_2 * ap_0.transmittance_0 + ap_0.inscatter_0;
        shown_0 = _S341;
    }
    else
    {
        lit_3 = lit_2;
        shown_0 = emissive_3;
    }
    var s_8 : Surface_0 = surface_0(min(lit_3 + shown_0, vec3<f32>(60000.0f)), baseColor_2.w, false);
    const luminance_0 : vec3<f32> = vec3<f32>(0.2125999927520752f, 0.71520000696182251f, 0.072200000286102295f);
    var shownLuminance_0 : f32 = dot(shown_0, luminance_0);
    if((shownLuminance_0 > 0.0f))
    {
        var _S342 : f32 = dot(lit_3, luminance_0);
        s_8.sceneShare_0 = clamp(_S342 / (_S342 + shownLuminance_0), 0.0f, 1.0f);
    }
    return s_8;
}

struct FsOut_0
{
    @location(0) color_19 : vec4<f32>,
    @interpolate(flat) @location(1) featureId_1 : vec2<u32>,
    @location(2) display_2 : vec4<f32>,
};

fn shadeOpaque_0( in_8 : SurfaceVaryings_0,  frontFacing_4 : bool) -> FsOut_0
{
    var s_9 : Surface_0 = shadeSurface_0(in_8, frontFacing_4, false);
    var _S343 : bool;
    if(!cutOutInDepth_0)
    {
        _S343 = (((materials_0[records_0[in_8.ids_0.x].materialIndex_0].flags_1) & (u32(8)))) != u32(0);
    }
    else
    {
        _S343 = false;
    }
    if(_S343)
    {
        _S343 = ((s_9.alpha_5) < 0.99900001287460327f);
    }
    else
    {
        _S343 = false;
    }
    if(_S343)
    {
        discard;
    }
    var out_0 : FsOut_0;
    var _S344 : u32 = in_8.ids_0.y;
    out_0.featureId_1 = vec2<u32>((_S344 & (u32(65535))), (_S344 >> (u32(16))));
    var lined_0 : f32 = patchLine_0.w;
    if(s_9.unlit_1)
    {
        out_0.color_19 = vec4<f32>(0.0f);
        out_0.display_2 = vec4<f32>(mix(s_9.color_17, patchLine_0.xyz, vec3<f32>(lined_0)), 1.0f);
    }
    else
    {
        var _S345 : f32 = 1.0f - lined_0;
        out_0.color_19 = vec4<f32>(s_9.color_17 * vec3<f32>(_S345), s_9.sceneShare_0 * _S345);
        out_0.display_2 = vec4<f32>(patchLine_0.xyz * vec3<f32>(lined_0), lined_0);
    }
    return out_0;
}

struct pixelInput_14
{
    @location(0) normal_16 : vec3<f32>,
    @location(1) uv_22 : vec2<f32>,
    @location(2) color_20 : vec4<f32>,
    @interpolate(flat) @location(3) ids_16 : vec3<u32>,
    @location(4) relPosition_21 : vec3<f32>,
    @location(5) tangent_15 : vec4<f32>,
    @location(6) airInscatter_15 : vec3<f32>,
    @location(7) airTransmittance_16 : vec4<f32>,
    @location(8) positionMC_15 : vec3<f32>,
    @location(9) named0_15 : vec4<f32>,
    @location(10) named1_15 : vec4<f32>,
    @location(11) named2_15 : vec4<f32>,
    @location(12) named3_15 : vec4<f32>,
};

@fragment
fn fs( _S346 : pixelInput_14, @builtin(front_facing) frontFacing_5 : bool, @builtin(position) position_16 : vec4<f32>) -> FsOut_0
{
    var _S347 : SurfaceVaryings_0 = SurfaceVaryings_0( position_16, _S346.normal_16, _S346.uv_22, _S346.color_20, _S346.ids_16, _S346.relPosition_21, _S346.tangent_15, _S346.airInscatter_15, _S346.airTransmittance_16, _S346.positionMC_15, _S346.named0_15, _S346.named1_15, _S346.named2_15, _S346.named3_15 );
    clipGhosts_0 = false;
    clipGhosted_0 = false;
    clipGhostAlpha_0 = 1.0f;
    clipGhostTint_0 = _S11();
    clipIdOut_0 = u32(4294967295);
    clipDistanceOut_0 = 3.39999995214436425e+38f;
    clipFlagsOut_0 = u32(0);
    clipParamsOut_0 = _S24();
    terrainSeen_0 = true;
    patchLine_0 = _S120();
    surfaceLight_0 = true;
    var _S348 : FsOut_0 = shadeOpaque_0(_S347, frontFacing_5);
    return _S348;
}

struct pixelInput_15
{
    @location(0) normal_17 : vec3<f32>,
    @location(1) uv_23 : vec2<f32>,
    @location(2) color_21 : vec4<f32>,
    @interpolate(flat) @location(3) ids_17 : vec3<u32>,
    @location(4) relPosition_22 : vec3<f32>,
    @location(5) tangent_16 : vec4<f32>,
    @location(6) airInscatter_16 : vec3<f32>,
    @location(7) airTransmittance_17 : vec4<f32>,
    @location(8) positionMC_16 : vec3<f32>,
    @location(9) named0_16 : vec4<f32>,
    @location(10) named1_16 : vec4<f32>,
    @location(11) named2_16 : vec4<f32>,
    @location(12) named3_16 : vec4<f32>,
};

@fragment
fn fsTrimmed( _S349 : pixelInput_15, @builtin(front_facing) frontFacing_6 : bool, @builtin(position) position_17 : vec4<f32>) -> FsOut_0
{
    var _S350 : SurfaceVaryings_0 = SurfaceVaryings_0( position_17, _S349.normal_17, _S349.uv_23, _S349.color_21, _S349.ids_17, _S349.relPosition_22, _S349.tangent_16, _S349.airInscatter_16, _S349.airTransmittance_17, _S349.positionMC_16, _S349.named0_16, _S349.named1_16, _S349.named2_16, _S349.named3_16 );
    clipGhosts_0 = false;
    clipGhosted_0 = false;
    clipGhostAlpha_0 = 1.0f;
    clipGhostTint_0 = _S11();
    clipIdOut_0 = u32(4294967295);
    clipDistanceOut_0 = 3.39999995214436425e+38f;
    clipFlagsOut_0 = u32(0);
    clipParamsOut_0 = _S24();
    terrainSeen_0 = true;
    patchLine_0 = _S120();
    surfaceLight_0 = true;
    var covered_2 : bool;
    if(cutOutInDepth_0)
    {
        covered_2 = true;
    }
    else
    {
        covered_2 = trimCovered_0(_S350);
    }
    var out_1 : FsOut_0 = shadeOpaque_0(_S350, frontFacing_6);
    if(!covered_2)
    {
        discard;
    }
    return out_1;
}

struct FsPointsOut_0
{
    @location(0) color_22 : vec4<f32>,
    @interpolate(flat) @location(1) featureId_2 : vec2<u32>,
    @location(2) display_3 : vec4<f32>,
    @builtin(sample_mask) mask_1 : u32,
};

struct pixelInput_16
{
    @location(0) normal_18 : vec3<f32>,
    @location(1) uv_24 : vec2<f32>,
    @location(2) color_23 : vec4<f32>,
    @interpolate(flat) @location(3) ids_18 : vec3<u32>,
    @location(4) relPosition_23 : vec3<f32>,
    @location(5) tangent_17 : vec4<f32>,
    @location(6) airInscatter_17 : vec3<f32>,
    @location(7) airTransmittance_18 : vec4<f32>,
    @location(8) positionMC_17 : vec3<f32>,
    @location(9) named0_17 : vec4<f32>,
    @location(10) named1_17 : vec4<f32>,
    @location(11) named2_17 : vec4<f32>,
    @location(12) named3_17 : vec4<f32>,
};

@fragment
fn fsPoints( _S351 : pixelInput_16, @builtin(front_facing) frontFacing_7 : bool, @builtin(position) position_18 : vec4<f32>) -> FsPointsOut_0
{
    var _S352 : SurfaceVaryings_0 = SurfaceVaryings_0( position_18, _S351.normal_18, _S351.uv_24, _S351.color_23, _S351.ids_18, _S351.relPosition_23, _S351.tangent_17, _S351.airInscatter_17, _S351.airTransmittance_18, _S351.positionMC_17, _S351.named0_17, _S351.named1_17, _S351.named2_17, _S351.named3_17 );
    clipGhosts_0 = false;
    clipGhosted_0 = false;
    clipGhostAlpha_0 = 1.0f;
    clipGhostTint_0 = _S11();
    clipIdOut_0 = u32(4294967295);
    clipDistanceOut_0 = 3.39999995214436425e+38f;
    clipFlagsOut_0 = u32(0);
    clipParamsOut_0 = _S24();
    terrainSeen_0 = true;
    patchLine_0 = _S120();
    surfaceLight_0 = true;
    var s_10 : Surface_0 = shadeSurface_0(_S352, frontFacing_7, false);
    var samples_0 : u32 = u32(round(clamp(s_10.alpha_5, 0.0f, 1.0f) * 4.0f));
    if(samples_0 == u32(0))
    {
        discard;
    }
    var turn_0 : u32 = (u32(position_18.x) + u32(2) * u32(position_18.y)) % u32(4);
    var covered_3 : u32 = ((u32(1) << (samples_0))) - u32(1);
    var out_2 : FsPointsOut_0;
    out_2.mask_1 = (((((covered_3 << (turn_0))) | (((covered_3 >> ((u32(4) - turn_0))))))) & (u32(15)));
    var _S353 : u32 = _S351.ids_18.y;
    out_2.featureId_2 = vec2<u32>((_S353 & (u32(65535))), (_S353 >> (u32(16))));
    if(s_10.unlit_1)
    {
        out_2.color_22 = vec4<f32>(0.0f);
        out_2.display_3 = vec4<f32>(s_10.color_17, 1.0f);
    }
    else
    {
        out_2.color_22 = vec4<f32>(s_10.color_17, s_10.sceneShare_0);
        out_2.display_3 = vec4<f32>(0.0f);
    }
    return out_2;
}

fn depthSlope_0( position_19 : vec4<f32>) -> vec2<f32>
{
    var _S354 : f32 = position_19.z;
    return vec2<f32>(dpdx(_S354), dpdy(_S354));
}

fn translucentAlpha_0( in_9 : SurfaceVaryings_0,  alpha_12 : f32) -> f32
{
    var _S355 : u32 = in_9.ids_0.x;
    var _S356 : bool;
    if((((records_0[_S355].flags_0) & (u32(128)))) != u32(0))
    {
        _S356 = (((materials_0[records_0[_S355].materialIndex_0].flags_1) & (u32(8)))) != u32(0);
    }
    else
    {
        _S356 = false;
    }
    if(_S356)
    {
        return min(alpha_12, 0.99939996004104614f);
    }
    return alpha_12;
}

fn visibleSamples_0( position_20 : vec4<f32>,  slope_0 : vec2<f32>,  mask_2 : u32) -> u32
{
    var _S357 : vec2<f32> = position_20.xy;
    var _S358 : vec2<i32> = vec2<i32>(vec2<u32>(_S357));
    var width_2 : u32;
    var height_1 : u32;
    var samples_1 : u32;
    {var dim = textureDimensions((opaqueDepth_0));((width_2)) = dim.x;((height_1)) = dim.y;((samples_1)) = textureNumSamples((opaqueDepth_0));};
    var _S359 : vec2<f32> = fract(_S357) - vec2<f32>(0.5f);
    var i_5 : u32 = u32(0);
    var visible_0 : u32 = u32(0);
    loop
    {
        if((i_5 < u32(4)))
        {
        }
        else
        {
            break;
        }
        if((i_5 >= samples_1))
        {
            break;
        }
        var z_1 : f32 = position_20.z;
        var z_2 : f32;
        if(samples_1 == u32(4))
        {
            z_2 = z_1 + dot(slope_0, SAMPLE_OFFSETS_0[i_5] - _S359);
        }
        else
        {
            z_2 = z_1;
        }
        var _S360 : u32 = (u32(1) << (i_5));
        var _S361 : bool;
        if(((mask_2 & (_S360))) != u32(0))
        {
            _S361 = (z_2 >= (textureLoad((opaqueDepth_0), (_S358), (i32(i_5)))));
        }
        else
        {
            _S361 = false;
        }
        if(_S361)
        {
            visible_0 = (visible_0 | (_S360));
        }
        i_5 = i_5 + u32(1);
    }
    return visible_0;
}

fn listNode_0( in_10 : SurfaceVaryings_0,  color_24 : vec3<f32>,  alpha_13 : f32,  visible_1 : u32)
{
    var index_0 : u32 = atomicAdd(&(lists_0[i32(0)]), u32(1));
    if((index_0 >= (translucency_0.capacity_0)))
    {
        return;
    }
    var node_0 : u32 = translucency_0.nodesBase_0 + index_0 * u32(4);
    atomicStore(&(lists_0[node_0]), pack2x16float(color_24.xy));
    atomicStore(&(lists_0[node_0 + u32(1)]), pack2x16float(vec2<f32>(color_24.z, alpha_13)));
    atomicStore(&(lists_0[node_0 + u32(2)]), (bitcast<u32>((in_10.position_1.z))));
    var next_0 : u32 = atomicExchange(&(lists_0[u32(4) + (u32(in_10.position_1.y) * translucency_0.width_0 + u32(in_10.position_1.x))]), index_0 + u32(1));
    atomicStore(&(lists_0[node_0 + u32(3)]), (next_0 | (((visible_1 << (u32(28)))))));
    return;
}

fn appendNode_0( in_11 : SurfaceVaryings_0,  slope_1 : vec2<f32>,  s_11 : Surface_0,  mask_3 : u32)
{
    var shown_1 : f32 = translucentAlpha_0(in_11, s_11.alpha_5);
    if((shown_1 >= 0.99949997663497925f))
    {
        return;
    }
    var alpha_14 : f32 = clamp(shown_1, 0.0f, 1.0f);
    var visible_2 : u32 = visibleSamples_0(in_11.position_1, slope_1, mask_3);
    var _S362 : bool;
    if((alpha_14 <= 0.0f))
    {
        _S362 = true;
    }
    else
    {
        _S362 = visible_2 == u32(0);
    }
    if(_S362)
    {
        return;
    }
    if(s_11.unlit_1)
    {
        listNode_0(in_11, s_11.color_17, - alpha_14, visible_2);
        return;
    }
    listNode_0(in_11, s_11.color_17 * vec3<f32>(s_11.sceneShare_0), alpha_14, visible_2);
    if(((s_11.sceneShare_0) < 1.0f))
    {
        listNode_0(in_11, s_11.color_17 * vec3<f32>((1.0f - s_11.sceneShare_0)) * vec3<f32>(alpha_14), 2.0f, visible_2);
    }
    return;
}

struct pixelInput_17
{
    @location(0) normal_19 : vec3<f32>,
    @location(1) uv_25 : vec2<f32>,
    @location(2) color_25 : vec4<f32>,
    @interpolate(flat) @location(3) ids_19 : vec3<u32>,
    @location(4) relPosition_24 : vec3<f32>,
    @location(5) tangent_18 : vec4<f32>,
    @location(6) airInscatter_18 : vec3<f32>,
    @location(7) airTransmittance_19 : vec4<f32>,
    @location(8) positionMC_18 : vec3<f32>,
    @location(9) named0_18 : vec4<f32>,
    @location(10) named1_18 : vec4<f32>,
    @location(11) named2_18 : vec4<f32>,
    @location(12) named3_18 : vec4<f32>,
};

@fragment
fn fsList( _S363 : pixelInput_17, @builtin(front_facing) frontFacing_8 : bool, @builtin(sample_mask) mask_4 : u32, @builtin(position) position_21 : vec4<f32>)
{
    var _S364 : SurfaceVaryings_0 = SurfaceVaryings_0( position_21, _S363.normal_19, _S363.uv_25, _S363.color_25, _S363.ids_19, _S363.relPosition_24, _S363.tangent_18, _S363.airInscatter_18, _S363.airTransmittance_19, _S363.positionMC_18, _S363.named0_18, _S363.named1_18, _S363.named2_18, _S363.named3_18 );
    clipGhosts_0 = false;
    clipGhosted_0 = false;
    clipGhostAlpha_0 = 1.0f;
    clipGhostTint_0 = _S11();
    clipIdOut_0 = u32(4294967295);
    clipDistanceOut_0 = 3.39999995214436425e+38f;
    clipFlagsOut_0 = u32(0);
    clipParamsOut_0 = _S24();
    terrainSeen_0 = true;
    patchLine_0 = _S120();
    surfaceLight_0 = true;
    var slope_2 : vec2<f32> = depthSlope_0(position_21);
    var s_12 : Surface_0 = shadeSurface_0(_S364, frontFacing_8, true);
    appendNode_0(_S364, slope_2, s_12, mask_4);
    return;
}

struct pixelInput_18
{
    @location(0) normal_20 : vec3<f32>,
    @location(1) uv_26 : vec2<f32>,
    @location(2) color_26 : vec4<f32>,
    @interpolate(flat) @location(3) ids_20 : vec3<u32>,
    @location(4) relPosition_25 : vec3<f32>,
    @location(5) tangent_19 : vec4<f32>,
    @location(6) airInscatter_19 : vec3<f32>,
    @location(7) airTransmittance_20 : vec4<f32>,
    @location(8) positionMC_19 : vec3<f32>,
    @location(9) named0_19 : vec4<f32>,
    @location(10) named1_19 : vec4<f32>,
    @location(11) named2_19 : vec4<f32>,
    @location(12) named3_19 : vec4<f32>,
};

@fragment
fn fsListSamples( _S365 : pixelInput_18, @builtin(front_facing) frontFacing_9 : bool, @builtin(sample_mask) mask_5 : u32, @builtin(sample_index) sample_0 : u32, @builtin(position) position_22 : vec4<f32>)
{
    var _S366 : SurfaceVaryings_0 = SurfaceVaryings_0( position_22, _S365.normal_20, _S365.uv_26, _S365.color_26, _S365.ids_20, _S365.relPosition_25, _S365.tangent_19, _S365.airInscatter_19, _S365.airTransmittance_20, _S365.positionMC_19, _S365.named0_19, _S365.named1_19, _S365.named2_19, _S365.named3_19 );
    clipGhosts_0 = false;
    clipGhosted_0 = false;
    clipGhostAlpha_0 = 1.0f;
    clipGhostTint_0 = _S11();
    clipIdOut_0 = u32(4294967295);
    clipDistanceOut_0 = 3.39999995214436425e+38f;
    clipFlagsOut_0 = u32(0);
    clipParamsOut_0 = _S24();
    terrainSeen_0 = true;
    patchLine_0 = _S120();
    surfaceLight_0 = true;
    var slope_3 : vec2<f32> = depthSlope_0(position_22);
    var writes_0 : bool = sample_0 == (firstbitlow_0(mask_5));
    surfaceLight_0 = writes_0;
    var s_13 : Surface_0 = shadeSurface_0(_S366, frontFacing_9, true);
    if(writes_0)
    {
        appendNode_0(_S366, slope_3, s_13, mask_5);
    }
    return;
}

struct pixelInput_19
{
    @location(0) normal_21 : vec3<f32>,
    @location(1) uv_27 : vec2<f32>,
    @location(2) color_27 : vec4<f32>,
    @interpolate(flat) @location(3) ids_21 : vec3<u32>,
    @location(4) relPosition_26 : vec3<f32>,
    @location(5) tangent_20 : vec4<f32>,
    @location(6) airInscatter_20 : vec3<f32>,
    @location(7) airTransmittance_21 : vec4<f32>,
    @location(8) positionMC_20 : vec3<f32>,
    @location(9) named0_20 : vec4<f32>,
    @location(10) named1_20 : vec4<f32>,
    @location(11) named2_20 : vec4<f32>,
    @location(12) named3_20 : vec4<f32>,
};

@fragment
fn fsPatchList( _S367 : pixelInput_19, @builtin(front_facing) frontFacing_10 : bool, @builtin(sample_mask) mask_6 : u32, @builtin(position) position_23 : vec4<f32>)
{
    var _S368 : SurfaceVaryings_0 = SurfaceVaryings_0( position_23, _S367.normal_21, _S367.uv_27, _S367.color_27, _S367.ids_21, _S367.relPosition_26, _S367.tangent_20, _S367.airInscatter_20, _S367.airTransmittance_21, _S367.positionMC_20, _S367.named0_20, _S367.named1_20, _S367.named2_20, _S367.named3_20 );
    clipGhosts_0 = false;
    clipGhosted_0 = false;
    clipGhostAlpha_0 = 1.0f;
    clipGhostTint_0 = _S11();
    clipIdOut_0 = u32(4294967295);
    clipDistanceOut_0 = 3.39999995214436425e+38f;
    clipFlagsOut_0 = u32(0);
    clipParamsOut_0 = _S24();
    terrainSeen_0 = true;
    patchLine_0 = _S120();
    surfaceLight_0 = true;
    var covered_4 : bool = trimCovered_0(_S368);
    var slope_4 : vec2<f32> = depthSlope_0(position_23);
    var s_14 : Surface_0 = shadeSurface_0(_S368, frontFacing_10, true);
    if(!covered_4)
    {
        discard;
    }
    appendNode_0(_S368, slope_4, s_14, mask_6);
    return;
}

struct pixelInput_20
{
    @location(0) normal_22 : vec3<f32>,
    @location(1) uv_28 : vec2<f32>,
    @location(2) color_28 : vec4<f32>,
    @interpolate(flat) @location(3) ids_22 : vec3<u32>,
    @location(4) relPosition_27 : vec3<f32>,
    @location(5) tangent_21 : vec4<f32>,
    @location(6) airInscatter_21 : vec3<f32>,
    @location(7) airTransmittance_22 : vec4<f32>,
    @location(8) positionMC_21 : vec3<f32>,
    @location(9) named0_21 : vec4<f32>,
    @location(10) named1_21 : vec4<f32>,
    @location(11) named2_21 : vec4<f32>,
    @location(12) named3_21 : vec4<f32>,
};

@fragment
fn fsPatchListSamples( _S369 : pixelInput_20, @builtin(front_facing) frontFacing_11 : bool, @builtin(sample_mask) mask_7 : u32, @builtin(sample_index) sample_1 : u32, @builtin(position) position_24 : vec4<f32>)
{
    var _S370 : SurfaceVaryings_0 = SurfaceVaryings_0( position_24, _S369.normal_22, _S369.uv_28, _S369.color_28, _S369.ids_22, _S369.relPosition_27, _S369.tangent_21, _S369.airInscatter_21, _S369.airTransmittance_22, _S369.positionMC_21, _S369.named0_21, _S369.named1_21, _S369.named2_21, _S369.named3_21 );
    clipGhosts_0 = false;
    clipGhosted_0 = false;
    clipGhostAlpha_0 = 1.0f;
    clipGhostTint_0 = _S11();
    clipIdOut_0 = u32(4294967295);
    clipDistanceOut_0 = 3.39999995214436425e+38f;
    clipFlagsOut_0 = u32(0);
    clipParamsOut_0 = _S24();
    terrainSeen_0 = true;
    patchLine_0 = _S120();
    surfaceLight_0 = true;
    var covered_5 : bool = trimCovered_0(_S370);
    var slope_5 : vec2<f32> = depthSlope_0(position_24);
    var writes_1 : bool = sample_1 == (firstbitlow_0(mask_7));
    surfaceLight_0 = writes_1;
    var s_15 : Surface_0 = shadeSurface_0(_S370, frontFacing_11, true);
    if(!covered_5)
    {
        discard;
    }
    if(writes_1)
    {
        appendNode_0(_S370, slope_5, s_15, mask_7);
    }
    return;
}

fn blendedAlpha_0( in_12 : SurfaceVaryings_0) -> f32
{
    clipGhosts_0 = true;
    var _S371 : u32 = in_12.ids_0.x;
    var alpha_15 : f32 = materialAlpha_0(in_12);
    if(clippedOut_0(_S371, in_12.relPosition_0))
    {
        discard;
    }
    return clamp(translucentAlpha_0(in_12, alpha_15), 0.0f, 1.0f);
}

fn uncovered_0( position_25 : vec4<f32>,  slope_6 : vec2<f32>) -> f32
{
    var width_3 : u32;
    var height_2 : u32;
    var samples_2 : u32;
    {var dim = textureDimensions((opaqueDepth_0));((width_3)) = dim.x;((height_2)) = dim.y;((samples_2)) = textureNumSamples((opaqueDepth_0));};
    return f32(countOneBits(visibleSamples_0(position_25, slope_6, u32(4294967295)))) / f32(samples_2);
}

fn momentDepth_0( relPosition_28 : vec3<f32>) -> f32
{
    return clamp((log(max(length(relPosition_28), 9.99999997475242708e-07f)) - translucency_0.logNear_0) * translucency_0.invLogRange_0, 0.0f, 1.0f) * 2.0f - 1.0f;
}

struct MomentsOut_0
{
    @location(0) zero_0 : f32,
    @location(1) higher_0 : vec4<f32>,
};

fn momentsOf_0( in_13 : SurfaceVaryings_0) -> MomentsOut_0
{
    var slope_7 : vec2<f32> = depthSlope_0(in_13.position_1);
    var blended_0 : f32 = blendedAlpha_0(in_13);
    var alpha_16 : f32 = blended_0 * uncovered_0(in_13.position_1, slope_7);
    var _S372 : bool;
    if((alpha_16 <= 0.0f))
    {
        _S372 = true;
    }
    else
    {
        _S372 = (blended_0 >= 0.99949997663497925f);
    }
    if(_S372)
    {
        discard;
    }
    var absorbance_0 : f32 = - log(1.0f - alpha_16);
    var z_3 : f32 = momentDepth_0(drawnPosition_0(in_13, in_13.ids_0.x));
    var z2_0 : f32 = z_3 * z_3;
    var out_3 : MomentsOut_0;
    out_3.zero_0 = absorbance_0;
    out_3.higher_0 = vec4<f32>(z_3, z2_0, z2_0 * z_3, z2_0 * z2_0) * vec4<f32>(absorbance_0);
    return out_3;
}

struct pixelInput_21
{
    @location(0) normal_23 : vec3<f32>,
    @location(1) uv_29 : vec2<f32>,
    @location(2) color_29 : vec4<f32>,
    @interpolate(flat) @location(3) ids_23 : vec3<u32>,
    @location(4) relPosition_29 : vec3<f32>,
    @location(5) tangent_22 : vec4<f32>,
    @location(6) airInscatter_22 : vec3<f32>,
    @location(7) airTransmittance_23 : vec4<f32>,
    @location(8) positionMC_22 : vec3<f32>,
    @location(9) named0_22 : vec4<f32>,
    @location(10) named1_22 : vec4<f32>,
    @location(11) named2_22 : vec4<f32>,
    @location(12) named3_22 : vec4<f32>,
};

@fragment
fn fsMoments( _S373 : pixelInput_21, @builtin(position) position_26 : vec4<f32>) -> MomentsOut_0
{
    var _S374 : SurfaceVaryings_0 = SurfaceVaryings_0( position_26, _S373.normal_23, _S373.uv_29, _S373.color_29, _S373.ids_23, _S373.relPosition_29, _S373.tangent_22, _S373.airInscatter_22, _S373.airTransmittance_23, _S373.positionMC_22, _S373.named0_22, _S373.named1_22, _S373.named2_22, _S373.named3_22 );
    clipGhosts_0 = false;
    clipGhosted_0 = false;
    clipGhostAlpha_0 = 1.0f;
    clipGhostTint_0 = _S11();
    clipIdOut_0 = u32(4294967295);
    clipDistanceOut_0 = 3.39999995214436425e+38f;
    clipFlagsOut_0 = u32(0);
    clipParamsOut_0 = _S24();
    terrainSeen_0 = true;
    patchLine_0 = _S120();
    surfaceLight_0 = true;
    var _S375 : MomentsOut_0 = momentsOf_0(_S374);
    return _S375;
}

struct pixelInput_22
{
    @location(0) normal_24 : vec3<f32>,
    @location(1) uv_30 : vec2<f32>,
    @location(2) color_30 : vec4<f32>,
    @interpolate(flat) @location(3) ids_24 : vec3<u32>,
    @location(4) relPosition_30 : vec3<f32>,
    @location(5) tangent_23 : vec4<f32>,
    @location(6) airInscatter_23 : vec3<f32>,
    @location(7) airTransmittance_24 : vec4<f32>,
    @location(8) positionMC_23 : vec3<f32>,
    @location(9) named0_23 : vec4<f32>,
    @location(10) named1_23 : vec4<f32>,
    @location(11) named2_23 : vec4<f32>,
    @location(12) named3_23 : vec4<f32>,
};

@fragment
fn fsPatchMoments( _S376 : pixelInput_22, @builtin(position) position_27 : vec4<f32>) -> MomentsOut_0
{
    var _S377 : SurfaceVaryings_0 = SurfaceVaryings_0( position_27, _S376.normal_24, _S376.uv_30, _S376.color_30, _S376.ids_24, _S376.relPosition_30, _S376.tangent_23, _S376.airInscatter_23, _S376.airTransmittance_24, _S376.positionMC_23, _S376.named0_23, _S376.named1_23, _S376.named2_23, _S376.named3_23 );
    clipGhosts_0 = false;
    clipGhosted_0 = false;
    clipGhostAlpha_0 = 1.0f;
    clipGhostTint_0 = _S11();
    clipIdOut_0 = u32(4294967295);
    clipDistanceOut_0 = 3.39999995214436425e+38f;
    clipFlagsOut_0 = u32(0);
    clipParamsOut_0 = _S24();
    terrainSeen_0 = true;
    patchLine_0 = _S120();
    surfaceLight_0 = true;
    var covered_6 : bool = trimCovered_0(_S377);
    var _S378 : bool = offLines_0(_S377, _S376.ids_24.x);
    var out_4 : MomentsOut_0 = momentsOf_0(_S377);
    var _S379 : bool;
    if(!covered_6)
    {
        _S379 = true;
    }
    else
    {
        _S379 = _S378;
    }
    if(_S379)
    {
        discard;
    }
    return out_4;
}

fn transmittanceBefore_0( b0_0 : f32,  sums_0 : vec4<f32>,  z_4 : f32) -> f32
{
    if((b0_0 < 0.0010005002841353416f))
    {
        return 1.0f;
    }
    var b_6 : vec4<f32> = mix(sums_0 / vec4<f32>(b0_0), vec4<f32>(0.0f, 0.375f, 0.0f, 0.375f), vec4<f32>(translucency_0.bias_0));
    var _S380 : f32 = b_6.x;
    var _S381 : f32 = b_6.y;
    var l21d11_0 : f32 = b_6.z - _S380 * _S381;
    var invD11_0 : f32 = 1.0f / (_S381 - _S380 * _S380);
    var l21_0 : f32 = l21d11_0 * invD11_0;
    var d22_0 : f32 = b_6.w - _S381 * _S381 - l21d11_0 * l21_0;
    var c_6 : vec3<f32> = vec3<f32>(1.0f, z_4, z_4 * z_4);
    var _S382 : f32 = c_6[i32(1)] - _S380;
    c_6[i32(1)] = _S382;
    var _S383 : f32 = c_6[i32(2)] - (_S381 + l21_0 * c_6.y);
    var _S384 : f32 = _S382 * invD11_0;
    c_6[i32(1)] = _S384;
    c_6[i32(2)] = _S383 / d22_0;
    c_6[i32(1)] = _S384 - l21_0 * c_6.z;
    var _S385 : vec2<f32> = b_6.xy;
    c_6[i32(0)] = c_6[i32(0)] - dot(c_6.yz, _S385);
    if(!((abs(c_6.z)) > (9.9999997473787516e-06f * max(abs(c_6.x), abs(c_6.y)))))
    {
        return exp(- b0_0 * 0.25f);
    }
    var p_7 : f32 = c_6.y / c_6.z;
    var r_1 : f32 = sqrt(max(p_7 * p_7 * 0.25f - c_6.x / c_6.z, 0.0f));
    var _S386 : f32 = - p_7 * 0.5f;
    var z1_0 : f32 = _S386 - r_1;
    var z2_1 : f32 = _S386 + r_1;
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
    return clamp(exp(- b0_0 * (0.25f - k1_0 * z_4 + dot(_S385, vec2<f32>(k1_0 - f012_0 * z_4, f012_0)))), 0.0f, 1.0f);
}

struct AccumulatedOut_0
{
    @location(0) lit_4 : vec4<f32>,
    @location(1) unlit_3 : vec4<f32>,
};

fn momentColorOf_0( in_14 : SurfaceVaryings_0,  frontFacing_12 : bool) -> AccumulatedOut_0
{
    var slope_8 : vec2<f32> = depthSlope_0(in_14.position_1);
    var s_16 : Surface_0 = shadeSurface_0(in_14, frontFacing_12, true);
    var shown_2 : f32 = translucentAlpha_0(in_14, s_16.alpha_5);
    var alpha_17 : f32 = clamp(shown_2, 0.0f, 1.0f) * uncovered_0(in_14.position_1, slope_8);
    var _S387 : bool;
    if((alpha_17 <= 0.0f))
    {
        _S387 = true;
    }
    else
    {
        _S387 = (shown_2 >= 0.99949997663497925f);
    }
    if(_S387)
    {
        discard;
    }
    var _S388 : vec2<u32> = vec2<u32>(in_14.position_1.xy);
    var _S389 : vec4<f32> = (textureLoad(momentsZero, (_S388)));
    var b0_1 : f32 = _S389.x;
    var sums_1 : vec4<f32> = (textureLoad(momentsHigher, (_S388)));
    var w_5 : f32 = transmittanceBefore_0(b0_1, sums_1, momentDepth_0(drawnPosition_0(in_14, in_14.ids_0.x))) * alpha_17;
    var _S390 : vec3<f32> = min(s_16.color_17 * vec3<f32>(w_5), vec3<f32>(16384.0f));
    var out_5 : AccumulatedOut_0;
    var _S391 : vec3<f32>;
    if(s_16.unlit_1)
    {
        _S391 = vec3<f32>(0.0f);
    }
    else
    {
        _S391 = _S390;
    }
    out_5.lit_4 = vec4<f32>(_S391, w_5);
    var sceneLuminance_0 : f32 = dot(_S390, vec3<f32>(0.2125999927520752f, 0.71520000696182251f, 0.072200000286102295f)) * s_16.sceneShare_0;
    var _S392 : vec4<f32>;
    if(s_16.unlit_1)
    {
        _S392 = vec4<f32>(_S390, 0.0f);
    }
    else
    {
        _S392 = vec4<f32>(vec3<f32>(0.0f), sceneLuminance_0);
    }
    out_5.unlit_3 = _S392;
    return out_5;
}

struct pixelInput_23
{
    @location(0) normal_25 : vec3<f32>,
    @location(1) uv_31 : vec2<f32>,
    @location(2) color_31 : vec4<f32>,
    @interpolate(flat) @location(3) ids_25 : vec3<u32>,
    @location(4) relPosition_31 : vec3<f32>,
    @location(5) tangent_24 : vec4<f32>,
    @location(6) airInscatter_24 : vec3<f32>,
    @location(7) airTransmittance_25 : vec4<f32>,
    @location(8) positionMC_24 : vec3<f32>,
    @location(9) named0_24 : vec4<f32>,
    @location(10) named1_24 : vec4<f32>,
    @location(11) named2_24 : vec4<f32>,
    @location(12) named3_24 : vec4<f32>,
};

@fragment
fn fsMomentColor( _S393 : pixelInput_23, @builtin(front_facing) frontFacing_13 : bool, @builtin(position) position_28 : vec4<f32>) -> AccumulatedOut_0
{
    var _S394 : SurfaceVaryings_0 = SurfaceVaryings_0( position_28, _S393.normal_25, _S393.uv_31, _S393.color_31, _S393.ids_25, _S393.relPosition_31, _S393.tangent_24, _S393.airInscatter_24, _S393.airTransmittance_25, _S393.positionMC_24, _S393.named0_24, _S393.named1_24, _S393.named2_24, _S393.named3_24 );
    clipGhosts_0 = false;
    clipGhosted_0 = false;
    clipGhostAlpha_0 = 1.0f;
    clipGhostTint_0 = _S11();
    clipIdOut_0 = u32(4294967295);
    clipDistanceOut_0 = 3.39999995214436425e+38f;
    clipFlagsOut_0 = u32(0);
    clipParamsOut_0 = _S24();
    terrainSeen_0 = true;
    patchLine_0 = _S120();
    surfaceLight_0 = true;
    var _S395 : AccumulatedOut_0 = momentColorOf_0(_S394, frontFacing_13);
    return _S395;
}

struct pixelInput_24
{
    @location(0) normal_26 : vec3<f32>,
    @location(1) uv_32 : vec2<f32>,
    @location(2) color_32 : vec4<f32>,
    @interpolate(flat) @location(3) ids_26 : vec3<u32>,
    @location(4) relPosition_32 : vec3<f32>,
    @location(5) tangent_25 : vec4<f32>,
    @location(6) airInscatter_25 : vec3<f32>,
    @location(7) airTransmittance_26 : vec4<f32>,
    @location(8) positionMC_25 : vec3<f32>,
    @location(9) named0_25 : vec4<f32>,
    @location(10) named1_25 : vec4<f32>,
    @location(11) named2_25 : vec4<f32>,
    @location(12) named3_25 : vec4<f32>,
};

@fragment
fn fsPatchMomentColor( _S396 : pixelInput_24, @builtin(front_facing) frontFacing_14 : bool, @builtin(position) position_29 : vec4<f32>) -> AccumulatedOut_0
{
    var _S397 : SurfaceVaryings_0 = SurfaceVaryings_0( position_29, _S396.normal_26, _S396.uv_32, _S396.color_32, _S396.ids_26, _S396.relPosition_32, _S396.tangent_25, _S396.airInscatter_25, _S396.airTransmittance_26, _S396.positionMC_25, _S396.named0_25, _S396.named1_25, _S396.named2_25, _S396.named3_25 );
    clipGhosts_0 = false;
    clipGhosted_0 = false;
    clipGhostAlpha_0 = 1.0f;
    clipGhostTint_0 = _S11();
    clipIdOut_0 = u32(4294967295);
    clipDistanceOut_0 = 3.39999995214436425e+38f;
    clipFlagsOut_0 = u32(0);
    clipParamsOut_0 = _S24();
    terrainSeen_0 = true;
    patchLine_0 = _S120();
    surfaceLight_0 = true;
    var covered_7 : bool = trimCovered_0(_S397);
    var out_6 : AccumulatedOut_0 = momentColorOf_0(_S397, frontFacing_14);
    if(!covered_7)
    {
        discard;
    }
    return out_6;
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

fn placementBlockRow_0( row_1 : u32) -> vec4<f32>
{
    return placements_0[row_1];
}

fn routeRow( row_2 : u32) -> vec4<f32>
{
    return placementBlockRow_0(row_2);
}

fn routeEyeHi() -> vec3<f32>
{
    return view_0.anchors_0.data_1[i32(0)].eyeHi_0.xyz;
}

fn routeEyeLo() -> vec3<f32>
{
    return view_0.anchors_0.data_1[i32(0)].eyeLo_0.xyz;
}

fn routeAxisRow( i_6 : u32) -> vec3<f32>
{
    return view_0.anchors_0.data_1[i32(0)].axes_0[i_6].xyz;
}

fn readNamed( directory_0 : u32,  hash_0 : u32,  vertexIndex_0 : u32,  feature_1 : u32) -> vec4<f32>
{
    var value_1 : vec4<f32> = vec4<f32>(0.0f);
    if(directory_0 == u32(4294967295))
    {
        return value_1;
    }
    var _S398 : u32 = (bitcast<u32>((vertices_0[directory_0])));
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
        if((i_7 >= _S398))
        {
            break;
        }
        var entry_3 : u32 = directory_0 + u32(1) + i_7 * u32(3);
        if((bitcast<u32>((vertices_0[entry_3]))) == hash_0)
        {
            var components_0 : u32 = (bitcast<u32>((vertices_0[entry_3 + u32(2)])));
            if((components_0 >= u32(2147483648)))
            {
                break;
            }
            var row_3 : u32;
            var size_2 : u32;
            if((components_0 >= u32(1073741824)))
            {
                if(feature_1 == u32(4294967295))
                {
                    break;
                }
                var _S399 : u32 = (components_0 & (u32(255)));
                row_3 = feature_1;
                size_2 = _S399;
            }
            else
            {
                row_3 = vertexIndex_0;
                size_2 = components_0;
            }
            var _S400 : u32 = (bitcast<u32>((vertices_0[entry_3 + u32(1)]))) + row_3 * size_2;
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
                if((c_7 >= size_2))
                {
                    break;
                }
                value_1[c_7] = vertices_0[_S400 + c_7];
                c_7 = c_7 + u32(1);
            }
            break;
        }
        i_7 = i_7 + u32(1);
    }
    return value_1;
}

fn readInstance( draw_0 : u32,  instance_1 : u32,  hash_1 : u32) -> vec4<u32>
{
    var bits_0 : vec4<u32> = vec4<u32>(u32(0));
    var _S401 : u32 = records_0[draw_0].instanceDirectory_0;
    var _S402 : bool;
    if((records_0[draw_0].instanceDirectory_0) == u32(4294967295))
    {
        _S402 = true;
    }
    else
    {
        _S402 = (records_0[draw_0].instanceStreams_0) == u32(4294967295);
    }
    if(_S402)
    {
        return bits_0;
    }
    var _S403 : u32 = (bitcast<u32>((vertices_0[_S401])));
    var i_8 : u32 = u32(0);
    loop
    {
        if((i_8 < u32(256)))
        {
        }
        else
        {
            break;
        }
        if((i_8 >= _S403))
        {
            break;
        }
        var entry_4 : u32 = _S401 + u32(1) + i_8 * u32(3);
        if((bitcast<u32>((vertices_0[entry_4]))) == hash_1)
        {
            var _S404 : u32 = records_0[draw_0].instanceStreams_0 + instance_1 * records_0[draw_0].instanceStride_0 + (bitcast<u32>((vertices_0[entry_4 + u32(1)])));
            var _S405 : u32 = (bitcast<u32>((vertices_0[entry_4 + u32(2)])));
            var c_8 : u32 = u32(0);
            loop
            {
                if((c_8 < u32(4)))
                {
                }
                else
                {
                    break;
                }
                if((c_8 >= _S405))
                {
                    break;
                }
                bits_0[c_8] = (bitcast<u32>((vertices_0[_S404 + c_8])));
                c_8 = c_8 + u32(1);
            }
            break;
        }
        i_8 = i_8 + u32(1);
    }
    return bits_0;
}

fn propertyTexel_0( slot_3 : u32,  uv_33 : vec2<f32>) -> vec4<u32>
{
    var width_4 : u32;
    var height_3 : u32;
    var texel_0 : vec4<f32>;
    if(slot_3 == u32(0))
    {
        {var dim = textureDimensions((propertyTexture0_0));((width_4)) = dim.x;((height_3)) = dim.y;};
        var size_3 : vec2<u32> = vec2<u32>(width_4, height_3);
        var _S406 : vec3<i32> = vec3<i32>(vec2<i32>(min(vec2<u32>(fract(uv_33) * vec2<f32>(size_3)), size_3 - vec2<u32>(u32(1)))), i32(0));
        texel_0 = (textureLoad((propertyTexture0_0), ((_S406)).xy, ((_S406)).z));
    }
    else
    {
        {var dim = textureDimensions((propertyTexture1_0));((width_4)) = dim.x;((height_3)) = dim.y;};
        var size_4 : vec2<u32> = vec2<u32>(width_4, height_3);
        var _S407 : vec3<i32> = vec3<i32>(vec2<i32>(min(vec2<u32>(fract(uv_33) * vec2<f32>(size_4)), size_4 - vec2<u32>(u32(1)))), i32(0));
        texel_0 = (textureLoad((propertyTexture1_0), ((_S407)).xy, ((_S407)).z));
    }
    return vec4<u32>(round(texel_0 * vec4<f32>(255.0f)));
}

fn readFragmentProperty( directory_1 : u32,  hash_2 : u32,  uv_34 : vec2<f32>,  feature_2 : u32,  fallback_0 : vec4<f32>) -> vec4<f32>
{
    if(directory_1 == u32(4294967295))
    {
        return fallback_0;
    }
    var _S408 : u32 = (bitcast<u32>((vertices_0[directory_1])));
    var i_9 : u32 = u32(0);
    loop
    {
        if((i_9 < u32(256)))
        {
        }
        else
        {
            break;
        }
        if((i_9 >= _S408))
        {
            break;
        }
        var entry_5 : u32 = directory_1 + u32(1) + i_9 * u32(3);
        if((bitcast<u32>((vertices_0[entry_5]))) != hash_2)
        {
            i_9 = i_9 + u32(1);
            continue;
        }
        var info_0 : u32 = (bitcast<u32>((vertices_0[entry_5 + u32(2)])));
        if((info_0 < u32(1073741824)))
        {
            return fallback_0;
        }
        var c_9 : u32;
        if((info_0 < u32(2147483648)))
        {
            var value_2 : vec4<f32> = vec4<f32>(0.0f);
            if(feature_2 != u32(4294967295))
            {
                var size_5 : u32 = (info_0 & (u32(255)));
                var _S409 : u32 = (bitcast<u32>((vertices_0[entry_5 + u32(1)]))) + feature_2 * size_5;
                c_9 = u32(0);
                loop
                {
                    if((c_9 < u32(4)))
                    {
                    }
                    else
                    {
                        break;
                    }
                    if((c_9 >= size_5))
                    {
                        break;
                    }
                    value_2[c_9] = vertices_0[_S409 + c_9];
                    c_9 = c_9 + u32(1);
                }
            }
            return value_2;
        }
        var b_7 : u32 = (bitcast<u32>((vertices_0[entry_5 + u32(1)])));
        var _S410 : vec4<u32> = propertyTexel_0((bitcast<u32>((vertices_0[b_7]))), uv_34);
        var _S411 : u32 = min((bitcast<u32>((vertices_0[b_7 + u32(1)]))), u32(4));
        var _S412 : u32 = (bitcast<u32>((vertices_0[b_7 + u32(2)])));
        var kind_0 : u32 = (bitcast<u32>((vertices_0[b_7 + u32(3)])));
        var _S413 : u32 = min((bitcast<u32>((vertices_0[b_7 + u32(4)]))), u32(4));
        var _S414 : bool = (bitcast<u32>((vertices_0[b_7 + u32(5)]))) != u32(0);
        var bytes_0 : array<u32, i32(4)>;
        bytes_0[i32(0)] = u32(0);
        bytes_0[i32(1)] = u32(0);
        bytes_0[i32(2)] = u32(0);
        bytes_0[i32(3)] = u32(0);
        var k_4 : u32 = u32(0);
        loop
        {
            if((k_4 < u32(4)))
            {
            }
            else
            {
                break;
            }
            if((k_4 >= _S411))
            {
                break;
            }
            bytes_0[k_4] = _S410[(((_S412 >> ((k_4 * u32(8))))) & (u32(3)))];
            k_4 = k_4 + u32(1);
        }
        if((kind_0 <= u32(1)))
        {
            i_9 = u32(1);
        }
        else
        {
            var _S415 : bool;
            if(kind_0 == u32(2))
            {
                _S415 = true;
            }
            else
            {
                _S415 = kind_0 == u32(3);
            }
            if(_S415)
            {
                i_9 = u32(2);
            }
            else
            {
                i_9 = u32(4);
            }
        }
        var value_3 : vec4<f32> = vec4<f32>(0.0f);
        c_9 = u32(0);
        loop
        {
            if((c_9 < u32(4)))
            {
            }
            else
            {
                break;
            }
            if((c_9 >= _S413))
            {
                break;
            }
            k_4 = u32(0);
            var raw_0 : u32 = u32(0);
            loop
            {
                if((k_4 < u32(4)))
                {
                }
                else
                {
                    break;
                }
                if((k_4 >= i_9))
                {
                    break;
                }
                var at_7 : u32 = c_9 * i_9 + k_4;
                if((at_7 < u32(4)))
                {
                    raw_0 = (raw_0 | ((((bytes_0[at_7]) << ((k_4 * u32(8)))))));
                }
                k_4 = k_4 + u32(1);
            }
            var v_4 : f32;
            switch(kind_0)
            {
            case u32(0):
                {
                    if(_S414)
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
                    if(_S414)
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
                    if(_S414)
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
                    if(_S414)
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
                    if(_S414)
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
                    if(_S414)
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
            value_3[c_9] = v_4 * vertices_0[b_7 + u32(10) + c_9] + vertices_0[b_7 + u32(6) + c_9];
            c_9 = c_9 + u32(1);
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
     airTransmittance : vec4<f32>,
     positionMC : vec3<f32>,
     named0 : vec4<f32>,
     named1 : vec4<f32>,
     named2 : vec4<f32>,
     named3 : vec4<f32>,
};

struct RoutedVertex
{
     routed : bool,
     position : vec3<f32>,
     displacement : vec3<f32>,
     jx : vec3<f32>,
     jy : vec3<f32>,
     jz : vec3<f32>,
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
    var b_8 : u32 = offset_0 + index_1 * u32(4);
    return vec4<f32>(vertices_0[b_8], vertices_0[b_8 + u32(1)], vertices_0[b_8 + u32(2)], vertices_0[b_8 + u32(3)]);
}

var<private> patchChunk_0 : vec4<u32>;

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

fn patchParameters_0( sp_0 : PatchSpan_0,  u_1 : f32,  v_8 : f32) -> vec2<f32>
{
    var _S416 : f32 = sp_0.domain_1.x;
    var _S417 : f32 = sp_0.domain_1.y - _S416;
    var _S418 : f32 = sp_0.domain_1.z;
    var _S419 : f32 = sp_0.domain_1.w - _S418;
    var _S420 : f32;
    if((_S417 > 0.0f))
    {
        _S420 = clamp((u_1 - _S416) / _S417, 0.0f, 1.0f);
    }
    else
    {
        _S420 = 0.0f;
    }
    var _S421 : f32;
    if((_S419 > 0.0f))
    {
        _S421 = clamp((v_8 - _S418) / _S419, 0.0f, 1.0f);
    }
    else
    {
        _S421 = 0.0f;
    }
    return vec2<f32>(_S420, _S421);
}

fn casteljauWide_0( p_8 : array<vec4<f32>, i32(8)>,  n_16 : u32,  t_6 : f32,  value_4 : ptr<function, vec4<f32>>,  derivative_0 : ptr<function, vec4<f32>>)
{
    var _S422 : array<vec4<f32>, i32(8)> = p_8;
    var _S423 : f32 = 1.0f - t_6;
    (*derivative_0) = vec4<f32>(0.0f);
    var level_0 : u32 = u32(1);
    loop
    {
        if((level_0 <= u32(7)))
        {
        }
        else
        {
            break;
        }
        if((level_0 > n_16))
        {
            break;
        }
        if(level_0 == n_16)
        {
            (*derivative_0) = vec4<f32>(f32(n_16)) * (_S422[i32(1)] - _S422[i32(0)]);
        }
        var i_10 : u32 = u32(0);
        loop
        {
            if(((i_10 + level_0) <= n_16))
            {
            }
            else
            {
                break;
            }
            var _S424 : u32 = i_10 + u32(1);
            _S422[i_10] = vec4<f32>(_S423) * _S422[i_10] + vec4<f32>(t_6) * _S422[_S424];
            i_10 = _S424;
        }
        level_0 = level_0 + u32(1);
    }
    (*value_4) = _S422[i32(0)];
    return;
}

fn casteljau_0( p_9 : array<vec4<f32>, i32(4)>,  n_17 : u32,  t_7 : f32,  value_5 : ptr<function, vec4<f32>>,  derivative_1 : ptr<function, vec4<f32>>)
{
    var _S425 : array<vec4<f32>, i32(4)> = p_9;
    var _S426 : f32 = 1.0f - t_7;
    (*derivative_1) = vec4<f32>(0.0f);
    var level_1 : u32 = u32(1);
    loop
    {
        if((level_1 <= u32(3)))
        {
        }
        else
        {
            break;
        }
        if((level_1 > n_17))
        {
            break;
        }
        if(level_1 == n_17)
        {
            (*derivative_1) = vec4<f32>(f32(n_17)) * (_S425[i32(1)] - _S425[i32(0)]);
        }
        var i_11 : u32 = u32(0);
        loop
        {
            if(((i_11 + level_1) <= n_17))
            {
            }
            else
            {
                break;
            }
            var _S427 : u32 = i_11 + u32(1);
            _S425[i_11] = vec4<f32>(_S426) * _S425[i_11] + vec4<f32>(t_7) * _S425[_S427];
            i_11 = _S427;
        }
        level_1 = level_1 + u32(1);
    }
    (*value_5) = _S425[i32(0)];
    return;
}

fn bezierPatch_0( sp_1 : PatchSpan_0,  net_0 : array<vec4<f32>, i32(16)>,  s_17 : f32,  t_8 : f32,  position_30 : ptr<function, vec3<f32>>,  ds_0 : ptr<function, vec3<f32>>,  dt_0 : ptr<function, vec3<f32>>)
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
        var _S428 : u32 = j_1;
        var _S429 : vec4<f32> = vec4<f32>(0.0f);
        rowValue_0[_S428] = _S429;
        var _S430 : u32 = j_1;
        rowDerivative_0[_S430] = _S429;
        if((j_1 > (sp_1.degreeV_0)))
        {
            j_1 = j_1 + u32(1);
            continue;
        }
        var p_10 : array<vec4<f32>, i32(4)>;
        var i_12 : u32 = u32(0);
        loop
        {
            if((i_12 <= u32(3)))
            {
            }
            else
            {
                break;
            }
            var _S431 : u32 = i_12;
            var _S432 : vec4<f32>;
            if((i_12 <= (sp_1.degreeU_0)))
            {
                _S432 = net_0[j_1 * (sp_1.degreeU_0 + u32(1)) + i_12];
            }
            else
            {
                _S432 = _S429;
            }
            p_10[_S431] = _S432;
            i_12 = i_12 + u32(1);
        }
        var _S433 : vec4<f32> = rowValue_0[_S428];
        var _S434 : vec4<f32> = rowDerivative_0[_S430];
        casteljau_0(p_10, sp_1.degreeU_0, s_17, &(_S433), &(_S434));
        rowValue_0[_S428] = _S433;
        rowDerivative_0[_S430] = _S434;
        j_1 = j_1 + u32(1);
    }
    var h_1 : vec4<f32>;
    var ht_0 : vec4<f32>;
    casteljau_0(rowValue_0, sp_1.degreeV_0, t_8, &(h_1), &(ht_0));
    var hs_0 : vec4<f32>;
    var unused_0 : vec4<f32>;
    casteljau_0(rowDerivative_0, sp_1.degreeV_0, t_8, &(hs_0), &(unused_0));
    var _S435 : vec3<f32> = vec3<f32>(h_1.w);
    var _S436 : vec3<f32> = h_1.xyz / _S435;
    (*position_30) = _S436;
    (*ds_0) = (hs_0.xyz - vec3<f32>(hs_0.w) * _S436) / _S435;
    (*dt_0) = (ht_0.xyz - vec3<f32>(ht_0.w) * (*position_30)) / _S435;
    return;
}

struct PatchPoint_0
{
     position_31 : vec3<f32>,
     normal_27 : vec3<f32>,
};

fn evaluateBezier_0( sp_2 : PatchSpan_0,  net_1 : array<vec4<f32>, i32(16)>,  u_2 : f32,  v_9 : f32) -> PatchPoint_0
{
    var _S437 : f32 = sp_2.domain_1.x;
    var _S438 : f32 = sp_2.domain_1.y - _S437;
    var _S439 : f32 = sp_2.domain_1.z;
    var _S440 : f32 = sp_2.domain_1.w - _S439;
    var _S441 : bool = (_S438 > 0.0f);
    var s_18 : f32;
    if(_S441)
    {
        s_18 = clamp((u_2 - _S437) / _S438, 0.0f, 1.0f);
    }
    else
    {
        s_18 = 0.0f;
    }
    var _S442 : bool = (_S440 > 0.0f);
    var t_9 : f32;
    if(_S442)
    {
        t_9 = clamp((v_9 - _S439) / _S440, 0.0f, 1.0f);
    }
    else
    {
        t_9 = 0.0f;
    }
    var point_0 : PatchPoint_0;
    var _S443 : vec3<f32> = point_0.position_31;
    var ds_1 : vec3<f32>;
    var dt_1 : vec3<f32>;
    bezierPatch_0(sp_2, net_1, s_18, t_9, &(_S443), &(ds_1), &(dt_1));
    point_0.position_31 = _S443;
    var n_18 : vec3<f32> = cross(ds_1, dt_1);
    var _S444 : f32 = max(dot(ds_1, ds_1), dot(dt_1, dt_1));
    var n_19 : vec3<f32>;
    if(((dot(n_18, n_18)) <= (9.999999960041972e-13f * _S444 * _S444)))
    {
        var _S445 : vec2<f32> = vec2<f32>(u_2, v_9);
        var at_8 : vec2<f32> = _S445 + (vec2<f32>(0.5f * (sp_2.rect_0.x + sp_2.rect_0.y), 0.5f * (sp_2.rect_0.z + sp_2.rect_0.w)) - _S445) * vec2<f32>(0.0010000000474974513f);
        var s2_0 : f32;
        if(_S441)
        {
            s2_0 = clamp((at_8.x - _S437) / _S438, 0.0f, 1.0f);
        }
        else
        {
            s2_0 = 0.0f;
        }
        var t2_1 : f32;
        if(_S442)
        {
            t2_1 = clamp((at_8.y - _S439) / _S440, 0.0f, 1.0f);
        }
        else
        {
            t2_1 = 0.0f;
        }
        var p2_0 : vec3<f32>;
        bezierPatch_0(sp_2, net_1, s2_0, t2_1, &(p2_0), &(ds_1), &(dt_1));
        n_19 = cross(ds_1, dt_1);
    }
    else
    {
        n_19 = n_18;
    }
    var length2_1 : f32 = dot(n_19, n_19);
    if((length2_1 > 0.0f))
    {
        n_19 = n_19 * vec3<f32>(inverseSqrt(length2_1));
    }
    else
    {
        n_19 = vec3<f32>(0.0f, 0.0f, 1.0f);
    }
    point_0.normal_27 = n_19;
    return point_0;
}

fn sign1_0( x_2 : f32) -> f32
{
    var _S446 : f32;
    if((x_2 < 0.0f))
    {
        _S446 = -1.0f;
    }
    else
    {
        _S446 = 1.0f;
    }
    return _S446;
}

fn evaluateAnalytic_0( s_19 : PatchSpan_0,  u_3 : f32,  v_10 : f32) -> PatchPoint_0
{
    var cu_0 : f32 = cos(u_3);
    var su_0 : f32 = sin(u_3);
    var p0_0 : f32 = s_19.params_0.x;
    var p1_0 : f32 = s_19.params_0.y;
    var local_0 : vec3<f32>;
    var n_20 : vec3<f32>;
    switch(s_19.kind_1)
    {
    case u32(0):
        {
            const _S447 : vec3<f32> = vec3<f32>(0.0f, 0.0f, 1.0f);
            local_0 = vec3<f32>(u_3, v_10, 0.0f);
            n_20 = _S447;
        }
    case u32(1):
        {
            var _S448 : vec3<f32> = vec3<f32>(cu_0, su_0, 0.0f) * vec3<f32>(sign1_0(p0_0));
            local_0 = vec3<f32>(p0_0 * cu_0, p0_0 * su_0, v_10);
            n_20 = _S448;
        }
    case u32(2):
        {
            var t_10 : f32 = tan(p1_0);
            var radius_1 : f32 = p0_0 + v_10 * t_10;
            var _S449 : vec3<f32> = vec3<f32>(cu_0, su_0, - t_10) * vec3<f32>(sign1_0(radius_1));
            local_0 = vec3<f32>(radius_1 * cu_0, radius_1 * su_0, v_10);
            n_20 = _S449;
        }
    case u32(3):
        {
            var cv_0 : f32 = cos(v_10);
            var sv_0 : f32 = sin(v_10);
            var _S450 : f32 = p0_0 * cv_0;
            var _S451 : vec3<f32> = vec3<f32>(cv_0 * cu_0, cv_0 * su_0, sv_0) * vec3<f32>((sign1_0(p0_0) * sign1_0(cv_0)));
            local_0 = vec3<f32>(_S450 * cu_0, _S450 * su_0, p0_0 * sv_0);
            n_20 = _S451;
        }
    default :
        {
            var cv_1 : f32 = cos(v_10);
            var sv_1 : f32 = sin(v_10);
            var radius_2 : f32 = p0_0 + p1_0 * cv_1;
            var _S452 : vec3<f32> = vec3<f32>(cv_1 * cu_0, cv_1 * su_0, sv_1) * vec3<f32>((sign1_0(p1_0) * sign1_0(radius_2)));
            local_0 = vec3<f32>(radius_2 * cu_0, radius_2 * su_0, p1_0 * sv_1);
            n_20 = _S452;
        }
    }
    var z_5 : vec3<f32> = cross(s_19.axisX_0, s_19.axisY_0);
    var point_1 : PatchPoint_0;
    point_1.position_31 = s_19.origin_0 + vec3<f32>(local_0.x) * s_19.axisX_0 + vec3<f32>(local_0.y) * s_19.axisY_0 + vec3<f32>(local_0.z) * z_5;
    point_1.normal_27 = normalize(vec3<f32>(n_20.x) * s_19.axisX_0 + vec3<f32>(n_20.y) * s_19.axisY_0 + vec3<f32>(n_20.z) * z_5);
    return point_1;
}

fn read3_0( offset_1 : u32,  index_2 : u32) -> vec3<f32>
{
    var b_9 : u32 = offset_1 + index_2 * u32(3);
    return vec3<f32>(vertices_0[b_9], vertices_0[b_9 + u32(1)], vertices_0[b_9 + u32(2)]);
}

fn placementParameter_0( word_2 : u32) -> f32
{
    return placements_0[(word_2 >> (u32(2)))][(word_2 & (u32(3)))];
}

fn termWeight_0( row_4 : u32,  head_5 : vec4<u32>) -> f32
{
    var _S453 : f32 = (bitcast<f32>((head_5.y)));
    var _S454 : u32 = ((((head_5.x) >> (u32(8)))) & (u32(3)));
    var f_3 : u32 = u32(0);
    var w_6 : f32 = _S453;
    loop
    {
        if((f_3 < _S454))
        {
        }
        else
        {
            break;
        }
        var _S455 : vec4<f32> = placements_0[row_4 + u32(1) + f_3];
        var w_7 : f32 = w_6 * (_S455.y + _S455.z * placementParameter_0((bitcast<u32>((_S455.x)))));
        f_3 = f_3 + u32(1);
        w_6 = w_7;
    }
    return w_6;
}

fn latticeDisplacement_0( body_0 : u32,  cells_0 : u32,  p_11 : vec3<f32>,  jacobian_0 : ptr<function, mat3x3<f32>>,  clip_0 : ptr<function, f32>) -> vec3<f32>
{
    var _S456 : vec4<f32> = placements_0[body_0];
    var _S457 : f32 = _S456.w;
    var v_11 : vec3<f32> = (p_11 - _S456.xyz) * vec3<f32>(_S457);
    var v_12 : vec3<f32>;
    var cell_0 : u32;
    var dvdp_0 : f32;
    if((cells_0 > u32(1)))
    {
        var n_21 : f32 = f32(cells_0);
        var _S458 : vec3<f32> = vec3<f32>(1.0f);
        var s_20 : vec3<f32> = (v_11 + _S458) * vec3<f32>((0.5f * n_21));
        var f_4 : vec3<f32> = clamp(floor(s_20), vec3<f32>(0.0f), vec3<f32>((n_21 - 1.0f)));
        var _S459 : vec3<u32> = vec3<u32>(f_4);
        var _S460 : u32 = (_S459.z * cells_0 + _S459.y) * cells_0 + _S459.x;
        var dvdp_1 : f32 = _S457 * n_21;
        v_12 = vec3<f32>(2.0f) * (s_20 - f_4) - _S458;
        cell_0 = _S460;
        dvdp_0 = dvdp_1;
    }
    else
    {
        v_12 = v_11;
        cell_0 = u32(0);
        dvdp_0 = _S457;
    }
    var _S461 : f32 = v_12.x;
    var _S462 : f32 = _S461 * _S461;
    var _S463 : vec4<f32> = vec4<f32>(1.0f, _S461, _S462, _S462 * _S461);
    var _S464 : f32 = v_12.y;
    var _S465 : f32 = _S464 * _S464;
    var _S466 : vec4<f32> = vec4<f32>(1.0f, _S464, _S465, _S465 * _S464);
    var _S467 : f32 = v_12.z;
    var _S468 : f32 = _S467 * _S467;
    var _S469 : vec4<f32> = vec4<f32>(1.0f, _S467, _S468, _S468 * _S467);
    var _S470 : vec4<f32> = vec4<f32>(0.0f, 1.0f, 2.0f * _S461, 3.0f * _S461 * _S461);
    var _S471 : vec4<f32> = vec4<f32>(0.0f, 1.0f, 2.0f * _S464, 3.0f * _S464 * _S464);
    var _S472 : vec4<f32> = vec4<f32>(0.0f, 1.0f, 2.0f * _S467, 3.0f * _S467 * _S467);
    var _S473 : u32 = body_0 + u32(3) + cell_0 * u32(20);
    var _S474 : vec3<f32> = vec3<f32>(0.0f);
    var k_5 : u32 = u32(0);
    var d_7 : vec3<f32> = _S474;
    var scalar_0 : f32 = 0.0f;
    var gx_0 : vec3<f32> = _S474;
    var gy_0 : vec3<f32> = _S474;
    var gz_0 : vec3<f32> = _S474;
    loop
    {
        if((k_5 < u32(20)))
        {
        }
        else
        {
            break;
        }
        var a_5 : u32 = ((TERM_POWERS_0[k_5]) & (u32(3)));
        var b_10 : u32 = ((((TERM_POWERS_0[k_5]) >> (u32(2)))) & (u32(3)));
        var c_10 : u32 = ((((TERM_POWERS_0[k_5]) >> (u32(4)))) & (u32(3)));
        var _S475 : vec4<f32> = placements_0[_S473 + k_5];
        var coefficient_0 : vec3<f32> = _S475.xyz;
        var _S476 : f32 = _S463[a_5] * _S466[b_10];
        var _S477 : f32 = _S476 * _S469[c_10];
        var d_8 : vec3<f32> = d_7 + coefficient_0 * vec3<f32>(_S477);
        var scalar_1 : f32 = scalar_0 + _S475.w * _S477;
        var gx_1 : vec3<f32> = gx_0 + coefficient_0 * vec3<f32>((_S470[a_5] * (_S466[b_10] * _S469[c_10])));
        var gy_1 : vec3<f32> = gy_0 + coefficient_0 * vec3<f32>((_S471[b_10] * (_S463[a_5] * _S469[c_10])));
        var gz_1 : vec3<f32> = gz_0 + coefficient_0 * vec3<f32>((_S472[c_10] * _S476));
        k_5 = k_5 + u32(1);
        d_7 = d_8;
        scalar_0 = scalar_1;
        gx_0 = gx_1;
        gy_0 = gy_1;
        gz_0 = gz_1;
    }
    (*jacobian_0) = transpose(mat3x3<f32>(gx_0 * vec3<f32>(dvdp_0), gy_0 * vec3<f32>(dvdp_0), gz_0 * vec3<f32>(dvdp_0)));
    (*clip_0) = scalar_0;
    return d_7;
}

fn termDisplacement_0( head_6 : vec4<u32>,  block_0 : u32,  p_12 : vec3<f32>,  vertexIndex_1 : u32,  directory_2 : u32,  feature_3 : u32,  jacobian_1 : ptr<function, mat3x3<f32>>,  clip_1 : ptr<function, f32>) -> vec3<f32>
{
    var _S478 : u32 = ((head_6.x) & (u32(255)));
    if(_S478 == u32(1))
    {
        var _S479 : vec3<f32> = latticeDisplacement_0(block_0 + head_6.z, head_6.w, p_12, &((*jacobian_1)), &((*clip_1)));
        return _S479;
    }
    (*jacobian_1) = mat3x3<f32>(0.0f, 0.0f, 0.0f, 0.0f, 0.0f, 0.0f, 0.0f, 0.0f, 0.0f);
    (*clip_1) = 0.0f;
    if(_S478 == u32(3))
    {
        return vec3<f32>(0.0f);
    }
    var _S480 : vec4<f32> = (readNamed((directory_2), (head_6.z), (vertexIndex_1), (feature_3)));
    var other_0 : vec3<f32> = _S480.xyz;
    var _S481 : vec3<f32>;
    if((head_6.w) != u32(0))
    {
        _S481 = other_0 - p_12;
    }
    else
    {
        _S481 = other_0;
    }
    return _S481;
}

struct Placed_0
{
     position_32 : vec3<f32>,
     jacobian_2 : mat3x3<f32>,
     clip_2 : f32,
};

fn placeVertex_0( placement_1 : u32,  positionMC_26 : vec3<f32>,  vertexIndex_2 : u32,  directory_3 : u32,  feature_4 : u32) -> Placed_0
{
    var placed_0 : Placed_0;
    placed_0.position_32 = positionMC_26;
    placed_0.jacobian_2 = mat3x3<f32>(1.0f, 0.0f, 0.0f, 0.0f, 1.0f, 0.0f, 0.0f, 0.0f, 1.0f);
    placed_0.clip_2 = 0.0f;
    if(placement_1 == u32(4294967295))
    {
        return placed_0;
    }
    var _S482 : u32 = (bitcast<u32>((placements_0[placement_1].x)));
    var _S483 : vec3<f32> = vec3<f32>(0.0f);
    var clipTaken_0 : bool = false;
    var i_13 : u32 = u32(0);
    var d_9 : vec3<f32> = _S483;
    var j_2 : mat3x3<f32> = mat3x3<f32>(0.0f, 0.0f, 0.0f, 0.0f, 0.0f, 0.0f, 0.0f, 0.0f, 0.0f);
    loop
    {
        if((i_13 < _S482))
        {
        }
        else
        {
            break;
        }
        var row_5 : u32 = placement_1 + u32(1) + i_13 * u32(3);
        var head_7 : vec4<u32> = (bitcast<vec4<u32>>((placements_0[row_5])));
        var w_8 : f32 = termWeight_0(row_5, head_7);
        var jd_0 : mat3x3<f32>;
        var clip_3 : f32;
        var _S484 : vec3<f32> = termDisplacement_0(head_7, placement_1, positionMC_26, vertexIndex_2, directory_3, feature_4, &(jd_0), &(clip_3));
        var d_10 : vec3<f32> = d_9 + vec3<f32>(w_8) * _S484;
        var _S485 : mat3x3<f32> = mat3x3<f32>(w_8, w_8, w_8, w_8, w_8, w_8, w_8, w_8, w_8);
        var _S486 : mat3x3<f32> = jd_0;
        var _S487 : mat3x3<f32> = j_2 + mat3x3<f32>(_S485[0] * _S486[0], _S485[1] * _S486[1], _S485[2] * _S486[2]);
        var _S488 : bool;
        if(!clipTaken_0)
        {
            _S488 = (((head_7.x) & (u32(255)))) == u32(1);
        }
        else
        {
            _S488 = false;
        }
        if(_S488)
        {
            placed_0.clip_2 = clip_3;
            clipTaken_0 = true;
        }
        i_13 = i_13 + u32(1);
        d_9 = d_10;
        j_2 = _S487;
    }
    placed_0.position_32 = positionMC_26 + d_9;
    placed_0.jacobian_2 = mat3x3<f32>(1.0f, 0.0f, 0.0f, 0.0f, 1.0f, 0.0f, 0.0f, 0.0f, 1.0f) + j_2;
    return placed_0;
}

fn placePosition_0( placement_2 : u32,  positionMC_27 : vec3<f32>,  vertexIndex_3 : u32,  directory_4 : u32,  feature_5 : u32) -> vec3<f32>
{
    var _S489 : Placed_0 = placeVertex_0(placement_2, positionMC_27, vertexIndex_3, directory_4, feature_5);
    return _S489.position_32;
}

fn read2_0( offset_2 : u32,  index_3 : u32) -> vec2<f32>
{
    var b_11 : u32 = offset_2 + index_3 * u32(2);
    return vec2<f32>(vertices_0[b_11], vertices_0[b_11 + u32(1)]);
}

fn column3_0( m_4 : mat4x4<f32>,  c_11 : i32) -> vec3<f32>
{
    return vec3<f32>(m_4[i32(0)][c_11], m_4[i32(1)][c_11], m_4[i32(2)][c_11]);
}

fn jacobianColumn_0( j_3 : mat3x3<f32>,  c_12 : i32) -> vec3<f32>
{
    return vec3<f32>(j_3[i32(0)][c_12], j_3[i32(1)][c_12], j_3[i32(2)][c_12]);
}

fn turnNormal_0( j_4 : mat3x3<f32>,  n_22 : vec3<f32>) -> vec3<f32>
{
    var c0_0 : vec3<f32> = jacobianColumn_0(j_4, i32(0));
    var c1_0 : vec3<f32> = jacobianColumn_0(j_4, i32(1));
    var c2_0 : vec3<f32> = jacobianColumn_0(j_4, i32(2));
    var a_6 : vec3<f32> = cross(c1_0, c2_0);
    var turned_0 : vec3<f32> = a_6 * vec3<f32>(n_22.x) + cross(c2_0, c0_0) * vec3<f32>(n_22.y) + cross(c0_0, c1_0) * vec3<f32>(n_22.z);
    var _S490 : vec3<f32>;
    if(((dot(c0_0, a_6)) < 0.0f))
    {
        _S490 = (vec3<f32>(0) - turned_0);
    }
    else
    {
        _S490 = turned_0;
    }
    return normalize(_S490);
}

fn airTransmittanceUv_0( r_2 : f32,  mu_1 : f32,  bottom_0 : f32,  top_0 : f32) -> vec2<f32>
{
    var _S491 : f32 = top_0 * top_0;
    var _S492 : f32 = bottom_0 * bottom_0;
    var h_2 : f32 = sqrt(_S491 - _S492);
    var _S493 : f32 = r_2 * r_2;
    var rho_0 : f32 = sqrt(max(0.0f, _S493 - _S492));
    var dMin_0 : f32 = top_0 - r_2;
    return vec2<f32>(0.001953125f + (max(0.0f, - r_2 * mu_1 + sqrt(max(_S493 * (mu_1 * mu_1 - 1.0f) + _S491, 0.0f))) - dMin_0) / (rho_0 + h_2 - dMin_0) * 0.99609375f, 0.0078125f + rho_0 / h_2 * 0.984375f);
}

fn sunAbove_0( r_3 : f32,  mu_2 : f32,  bottom_1 : f32,  soft_0 : f32) -> f32
{
    return clamp(0.5f + (asin(clamp(mu_2, -1.0f, 1.0f)) - asin(- sqrt(max(0.0f, 1.0f - bottom_1 / r_3 * (bottom_1 / r_3))))) / soft_0, 0.0f, 1.0f);
}

fn aerialMarch_0( relPosition_33 : vec3<f32>) -> AerialPerspective_0
{
    var a_7 : AirGroup_std140_0 = air_0.groups_0.data_3[i32(0)];
    var b_12 : AirGroup_std140_0 = air_0.groups_0.data_3[i32(1)];
    var clearAir_0 : AerialPerspective_0;
    clearAir_0.inscatter_0 = vec3<f32>(0.0f);
    clearAir_0.transmittance_0 = vec3<f32>(1.0f);
    var meters_0 : f32 = length(relPosition_33);
    var direction_1 : vec3<f32> = relPosition_33 / vec3<f32>(max(meters_0, 9.99999997475242708e-07f));
    var _S494 : vec3<f32> = vec3<f32>(1000.0f);
    var radii_1 : vec3<f32> = view_0.bodyRadii_0.xyz / _S494;
    var origin_1 : vec3<f32> = cameraPosition_0() / _S494;
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
    var _S495 : f32 = 1.0f + nu_0 * nu_0;
    var _S496 : f32 = 0.059683103114366531f * _S495;
    var _S497 : f32 = a_7.miePhaseG_0 * a_7.miePhaseG_0;
    var _S498 : f32 = 0.11936620622873306f * (1.0f - _S497);
    var _S499 : f32 = 2.0f + _S497;
    var _S500 : f32 = 1.0f + _S497;
    var _S501 : f32 = 2.0f * a_7.miePhaseG_0;
    var _S502 : f32 = _S498 / _S499 * _S495 / pow(_S500 - _S501 * nu_0, 1.5f);
    var moonShare_0 : f32 = view_0.sunDirection_0.w;
    var moon_0 : vec3<f32> = view_0.moonLight_0.xyz;
    var moonNu_0 : f32 = dot(direction_1, moon_0);
    var _S503 : f32 = 1.0f + moonNu_0 * moonNu_0;
    var _S504 : f32 = 0.059683103114366531f * _S503 * moonShare_0;
    var _S505 : f32 = _S498 / _S499 * _S503 / pow(_S500 - _S501 * moonNu_0, 1.5f) * moonShare_0;
    var _S506 : vec4<f32> = vec4<f32>(0.0f);
    var _S507 : vec4<f32> = vec4<f32>(1.0f);
    var t0_0 : f32 = start_0;
    var i_14 : i32 = i32(1);
    var transmittanceA_0 : vec4<f32> = _S507;
    var radianceA_0 : vec4<f32> = _S506;
    var transmittanceB_0 : vec4<f32> = _S507;
    var radianceB_0 : vec4<f32> = _S506;
    loop
    {
        if((i_14 <= i32(24)))
        {
        }
        else
        {
            break;
        }
        var u_4 : f32 = 1.0f - f32(i_14) / 24.0f;
        var t1_1 : f32 = start_0 + (end_0 - start_0) * (1.0f - u_4 * u_4 * u_4);
        var dt_2 : f32 = t1_1 - t0_0;
        var p_13 : vec3<f32> = origin_1 + direction_1 * vec3<f32>((0.5f * (t0_0 + t1_1)));
        var distance_1 : f32 = length(p_13);
        var _S508 : f32 = max(distance_1 - distance_1 / length(p_13 / radii_1), 0.0010000000474974513f);
        var rp_0 : f32 = a_7.bottomRadius_0 + _S508;
        var _S509 : vec3<f32> = radii_1 * radii_1;
        var muSun_0 : f32 = dot(normalize(p_13 / _S509), sun_0);
        var _S510 : f32 = - _S508;
        var rayleighDensity_0 : f32 = exp(_S510 / a_7.rayleighScaleHeight_0);
        var mieDensity_0 : f32 = exp(_S510 / a_7.mieScaleHeight_0);
        var ozoneDensity_0 : f32;
        if((_S508 < 25.0f))
        {
            ozoneDensity_0 = clamp(_S508 / 15.0f - 0.66666668653488159f, 0.0f, 1.0f);
        }
        else
        {
            ozoneDensity_0 = clamp(_S510 / 15.0f + 2.6666667461395264f, 0.0f, 1.0f);
        }
        var _S511 : f32 = max(0.017500000074505806f, dt_2 / rp_0);
        var uv_35 : vec2<f32> = airTransmittanceUv_0(rp_0, muSun_0, a_7.bottomRadius_0, a_7.topRadius_0);
        var _S512 : vec3<f32> = vec3<f32>(uv_35, 0.0f);
        var _S513 : vec4<f32> = vec4<f32>(sunAbove_0(rp_0, muSun_0, a_7.bottomRadius_0, _S511));
        var sunA_0 : vec4<f32> = (textureSampleLevel((airTransmittance_0), (environmentSampler_0), ((_S512)).xy, i32(((_S512)).z), (0.0f))) * _S513;
        var _S514 : vec3<f32> = vec3<f32>(uv_35, 1.0f);
        var sunB_0 : vec4<f32> = (textureSampleLevel((airTransmittance_0), (environmentSampler_0), ((_S514)).xy, i32(((_S514)).z), (0.0f))) * _S513;
        var _S515 : f32 = 0.015625f + clamp(_S508 / (a_7.topRadius_0 - a_7.bottomRadius_0), 0.0f, 1.0f) * 0.96875f;
        var msUv_0 : vec2<f32> = vec2<f32>(0.015625f + (muSun_0 * 0.5f + 0.5f) * 0.96875f, _S515);
        var _S516 : vec3<f32> = vec3<f32>(msUv_0, 0.0f);
        var msA_0 : vec4<f32> = (textureSampleLevel((airMultipleScattering_0), (environmentSampler_0), ((_S516)).xy, i32(((_S516)).z), (0.0f)));
        var _S517 : vec3<f32> = vec3<f32>(msUv_0, 1.0f);
        var msB_0 : vec4<f32> = (textureSampleLevel((airMultipleScattering_0), (environmentSampler_0), ((_S517)).xy, i32(((_S517)).z), (0.0f)));
        var moonA_0 : vec4<f32>;
        var moonMsA_0 : vec4<f32>;
        var moonB_0 : vec4<f32>;
        var moonMsB_0 : vec4<f32>;
        if((moonShare_0 > 0.0f))
        {
            var muMoon_0 : f32 = dot(normalize(p_13 / _S509), moon_0);
            var moonUv_0 : vec2<f32> = airTransmittanceUv_0(rp_0, muMoon_0, a_7.bottomRadius_0, a_7.topRadius_0);
            var _S518 : vec3<f32> = vec3<f32>(moonUv_0, 0.0f);
            var _S519 : vec4<f32> = vec4<f32>(sunAbove_0(rp_0, muMoon_0, a_7.bottomRadius_0, _S511));
            var _S520 : vec3<f32> = vec3<f32>(moonUv_0, 1.0f);
            var _S521 : vec4<f32> = (textureSampleLevel((airTransmittance_0), (environmentSampler_0), ((_S520)).xy, i32(((_S520)).z), (0.0f))) * _S519;
            var moonMsUv_0 : vec2<f32> = vec2<f32>(0.015625f + (muMoon_0 * 0.5f + 0.5f) * 0.96875f, _S515);
            var _S522 : vec3<f32> = vec3<f32>(moonMsUv_0, 0.0f);
            var _S523 : vec4<f32> = vec4<f32>(moonShare_0);
            var _S524 : vec4<f32> = (textureSampleLevel((airMultipleScattering_0), (environmentSampler_0), ((_S522)).xy, i32(((_S522)).z), (0.0f))) * _S523;
            var _S525 : vec3<f32> = vec3<f32>(moonMsUv_0, 1.0f);
            var _S526 : vec4<f32> = (textureSampleLevel((airMultipleScattering_0), (environmentSampler_0), ((_S525)).xy, i32(((_S525)).z), (0.0f))) * _S523;
            moonA_0 = (textureSampleLevel((airTransmittance_0), (environmentSampler_0), ((_S518)).xy, i32(((_S518)).z), (0.0f))) * _S519;
            moonMsA_0 = _S524;
            moonB_0 = _S521;
            moonMsB_0 = _S526;
        }
        else
        {
            moonA_0 = _S506;
            moonMsA_0 = _S506;
            moonB_0 = _S506;
            moonMsB_0 = _S506;
        }
        var _S527 : vec4<f32> = vec4<f32>(rayleighDensity_0);
        var rayleigh_0 : vec4<f32> = a_7.rayleighScattering_0 * _S527;
        var _S528 : vec4<f32> = vec4<f32>(mieDensity_0);
        var mie_0 : vec4<f32> = a_7.mieScattering_0 * _S528;
        var extinction_0 : vec4<f32> = rayleigh_0 + a_7.mieExtinction_0 * _S528 + a_7.ozoneAbsorption_0 * vec4<f32>(ozoneDensity_0);
        var _S529 : vec4<f32> = vec4<f32>(_S496);
        var _S530 : vec4<f32> = vec4<f32>(_S502);
        var _S531 : vec4<f32> = rayleigh_0 + mie_0;
        var _S532 : vec4<f32> = vec4<f32>(_S504);
        var _S533 : vec4<f32> = vec4<f32>(_S505);
        var _S534 : vec4<f32> = vec4<f32>(dt_2);
        var segment_0 : vec4<f32> = exp((vec4<f32>(0) - extinction_0) * _S534);
        var _S535 : vec4<f32> = vec4<f32>(1.0f);
        var _S536 : vec4<f32> = vec4<f32>(9.99999971718068537e-10f);
        var radianceA_1 : vec4<f32> = radianceA_0 + transmittanceA_0 * ((rayleigh_0 * _S529 + mie_0 * _S530) * sunA_0 + _S531 * msA_0 + (rayleigh_0 * _S532 + mie_0 * _S533) * moonA_0 + _S531 * moonMsA_0) * (_S535 - segment_0) / max(extinction_0, _S536);
        var transmittanceA_1 : vec4<f32> = transmittanceA_0 * segment_0;
        var rayleigh_1 : vec4<f32> = b_12.rayleighScattering_0 * _S527;
        var mie_1 : vec4<f32> = b_12.mieScattering_0 * _S528;
        var extinction_1 : vec4<f32> = rayleigh_1 + b_12.mieExtinction_0 * _S528 + b_12.ozoneAbsorption_0 * vec4<f32>(ozoneDensity_0);
        var _S537 : vec4<f32> = rayleigh_1 + mie_1;
        var segment_1 : vec4<f32> = exp((vec4<f32>(0) - extinction_1) * _S534);
        var radianceB_1 : vec4<f32> = radianceB_0 + transmittanceB_0 * ((rayleigh_1 * _S529 + mie_1 * _S530) * sunB_0 + _S537 * msB_0 + (rayleigh_1 * _S532 + mie_1 * _S533) * moonB_0 + _S537 * moonMsB_0) * (_S535 - segment_1) / max(extinction_1, _S536);
        var transmittanceB_1 : vec4<f32> = transmittanceB_0 * segment_1;
        var _S538 : i32 = i_14 + i32(1);
        t0_0 = t1_1;
        i_14 = _S538;
        transmittanceA_0 = transmittanceA_1;
        radianceA_0 = radianceA_1;
        transmittanceB_0 = transmittanceB_1;
        radianceB_0 = radianceB_1;
    }
    var la_0 : vec4<f32> = radianceA_0 * a_7.solarIrradiance_0;
    var lb_0 : vec4<f32> = radianceB_0 * b_12.solarIrradiance_0;
    var transmittance_2 : vec3<f32> = (vec3<f32>(transmittanceA_0.x) * air_0.weights_0[i32(0)].xyz + vec3<f32>(transmittanceA_0.y) * air_0.weights_0[i32(1)].xyz + vec3<f32>(transmittanceA_0.z) * air_0.weights_0[i32(2)].xyz + vec3<f32>(transmittanceA_0.w) * air_0.weights_0[i32(3)].xyz + vec3<f32>(transmittanceB_0.x) * air_0.weights_0[i32(4)].xyz + vec3<f32>(transmittanceB_0.y) * air_0.weights_0[i32(5)].xyz + vec3<f32>(transmittanceB_0.z) * air_0.weights_0[i32(6)].xyz + vec3<f32>(transmittanceB_0.w) * air_0.weights_0[i32(7)].xyz) / (air_0.weights_0[i32(0)].xyz + air_0.weights_0[i32(1)].xyz + air_0.weights_0[i32(2)].xyz + air_0.weights_0[i32(3)].xyz + air_0.weights_0[i32(4)].xyz + air_0.weights_0[i32(5)].xyz + air_0.weights_0[i32(6)].xyz + air_0.weights_0[i32(7)].xyz);
    var result_2 : AerialPerspective_0;
    result_2.inscatter_0 = (vec3<f32>(la_0.x) * air_0.weights_0[i32(0)].xyz + vec3<f32>(la_0.y) * air_0.weights_0[i32(1)].xyz + vec3<f32>(la_0.z) * air_0.weights_0[i32(2)].xyz + vec3<f32>(la_0.w) * air_0.weights_0[i32(3)].xyz + vec3<f32>(lb_0.x) * air_0.weights_0[i32(4)].xyz + vec3<f32>(lb_0.y) * air_0.weights_0[i32(5)].xyz + vec3<f32>(lb_0.z) * air_0.weights_0[i32(6)].xyz + vec3<f32>(lb_0.w) * air_0.weights_0[i32(7)].xyz) * vec3<f32>(view_0.exposure_0);
    result_2.transmittance_0 = transmittance_2;
    return result_2;
}

struct PatchVertex_0
{
     position_33 : vec3<f32>,
     normal_28 : vec3<f32>,
     uv_36 : vec2<f32>,
     face_1 : u32,
     trim_1 : u32,
     grid_2 : vec2<f32>,
     extent_0 : vec2<f32>,
};

fn load4_0( _S539 : u32) -> vec4<f32>
{
    return vec4<f32>(vertices_0[_S539], vertices_0[_S539 + u32(1)], vertices_0[_S539 + u32(2)], vertices_0[_S539 + u32(3)]);
}

fn load3_0( _S540 : u32) -> vec3<f32>
{
    return vec3<f32>(vertices_0[_S540], vertices_0[_S540 + u32(1)], vertices_0[_S540 + u32(2)]);
}

fn loadSpan_0( _S541 : u32) -> PatchSpan_0
{
    var k_6 : u32 = (bitcast<u32>((vertices_0[_S541])));
    var s_21 : PatchSpan_0;
    var _S542 : u32 = (k_6 & (u32(255)));
    s_21.kind_1 = _S542;
    s_21.reversed_0 = ((k_6 & (u32(256)))) != u32(0);
    var d_11 : u32 = (bitcast<u32>((vertices_0[_S541 + u32(1)])));
    s_21.degreeU_0 = (d_11 & (u32(255)));
    s_21.degreeV_0 = (((d_11 >> (u32(8)))) & (u32(255)));
    s_21.face_0 = (bitcast<u32>((vertices_0[_S541 + u32(2)])));
    s_21.controls_0 = (bitcast<u32>((vertices_0[_S541 + u32(3)])));
    s_21.rect_0 = load4_0(_S541 + u32(19));
    var _S543 : u32 = _S541 + u32(23);
    s_21.corner_0 = vec2<f32>(vertices_0[_S543], vertices_0[_S543 + u32(1)]);
    s_21.trim_0 = (bitcast<u32>((vertices_0[_S541 + u32(41)])));
    var _S544 : vec3<f32> = vec3<f32>(0.0f);
    s_21.origin_0 = _S544;
    s_21.axisX_0 = _S544;
    s_21.axisY_0 = _S544;
    var _S545 : vec2<f32> = vec2<f32>(0.0f);
    s_21.params_0 = _S545;
    var _S546 : vec4<f32> = vec4<f32>(0.0f);
    s_21.domain_1 = _S546;
    s_21.sphere_0 = _S546;
    s_21.faceSphere_0 = _S546;
    s_21.density_0 = _S544;
    s_21.speed_0 = _S545;
    if(_S542 == u32(5))
    {
        s_21.domain_1 = load4_0(_S541 + u32(15));
    }
    else
    {
        s_21.origin_0 = load3_0(_S541 + u32(4));
        s_21.axisX_0 = load3_0(_S541 + u32(7));
        s_21.axisY_0 = load3_0(_S541 + u32(10));
        var _S547 : u32 = _S541 + u32(13);
        s_21.params_0 = vec2<f32>(vertices_0[_S547], vertices_0[_S547 + u32(1)]);
    }
    return s_21;
}

fn loadFaceExtent_0( _S548 : u32) -> vec2<f32>
{
    var _S549 : u32 = _S548 + u32(42);
    return vec2<f32>(vertices_0[_S549], vertices_0[_S549 + u32(1)]);
}

fn bezierPatchWide_0( _S550 : u32,  _S551 : u32,  _S552 : u32,  _S553 : f32,  _S554 : f32,  _S555 : ptr<function, vec3<f32>>,  _S556 : ptr<function, vec3<f32>>,  _S557 : ptr<function, vec3<f32>>)
{
    var rowValue_1 : array<vec4<f32>, i32(8)>;
    var rowDerivative_1 : array<vec4<f32>, i32(8)>;
    var j_5 : u32 = u32(0);
    loop
    {
        if((j_5 <= u32(7)))
        {
        }
        else
        {
            break;
        }
        var _S558 : u32 = j_5;
        var _S559 : vec4<f32> = vec4<f32>(0.0f);
        rowValue_1[_S558] = _S559;
        var _S560 : u32 = j_5;
        rowDerivative_1[_S560] = _S559;
        if((j_5 > _S552))
        {
            j_5 = j_5 + u32(1);
            continue;
        }
        var p_14 : array<vec4<f32>, i32(8)>;
        var _S561 : u32 = _S550 + j_5 * (_S551 + u32(1)) * u32(4);
        var i_15 : u32 = u32(0);
        loop
        {
            if((i_15 <= u32(7)))
            {
            }
            else
            {
                break;
            }
            if((i_15 <= _S551))
            {
                p_14[i_15] = load4_0(_S561 + i_15 * u32(4));
            }
            else
            {
                p_14[i_15] = _S559;
            }
            i_15 = i_15 + u32(1);
        }
        var _S562 : vec4<f32> = rowValue_1[_S558];
        var _S563 : vec4<f32> = rowDerivative_1[_S560];
        casteljauWide_0(p_14, _S551, _S553, &(_S562), &(_S563));
        rowValue_1[_S558] = _S562;
        rowDerivative_1[_S560] = _S563;
        j_5 = j_5 + u32(1);
    }
    var h_3 : vec4<f32>;
    var ht_1 : vec4<f32>;
    casteljauWide_0(rowValue_1, _S552, _S554, &(h_3), &(ht_1));
    var hs_1 : vec4<f32>;
    var unused_1 : vec4<f32>;
    casteljauWide_0(rowDerivative_1, _S552, _S554, &(hs_1), &(unused_1));
    var _S564 : vec3<f32> = vec3<f32>(h_3.w);
    var _S565 : vec3<f32> = h_3.xyz / _S564;
    (*_S555) = _S565;
    (*_S556) = (hs_1.xyz - vec3<f32>(hs_1.w) * _S565) / _S564;
    (*_S557) = (ht_1.xyz - vec3<f32>(ht_1.w) * (*_S555)) / _S564;
    return;
}

fn evaluateBezierWide_0( _S566 : PatchSpan_0,  _S567 : u32,  _S568 : f32,  _S569 : f32) -> PatchPoint_0
{
    var st_1 : vec2<f32> = patchParameters_0(_S566, _S568, _S569);
    var _S570 : f32 = st_1.x;
    var _S571 : f32 = st_1.y;
    var point_2 : PatchPoint_0;
    var _S572 : vec3<f32> = point_2.position_31;
    var ds_2 : vec3<f32>;
    var dt_3 : vec3<f32>;
    bezierPatchWide_0(_S567, _S566.degreeU_0, _S566.degreeV_0, _S570, _S571, &(_S572), &(ds_2), &(dt_3));
    point_2.position_31 = _S572;
    var n_23 : vec3<f32> = cross(ds_2, dt_3);
    var _S573 : f32 = max(dot(ds_2, ds_2), dot(dt_3, dt_3));
    var n_24 : vec3<f32>;
    if(((dot(n_23, n_23)) <= (9.999999960041972e-13f * _S573 * _S573)))
    {
        var _S574 : vec2<f32> = vec2<f32>(_S568, _S569);
        var inside_6 : vec2<f32> = _S574 + (vec2<f32>(0.5f * (_S566.rect_0.x + _S566.rect_0.y), 0.5f * (_S566.rect_0.z + _S566.rect_0.w)) - _S574) * vec2<f32>(0.0010000000474974513f);
        var st2_0 : vec2<f32> = patchParameters_0(_S566, inside_6.x, inside_6.y);
        var p2_1 : vec3<f32>;
        bezierPatchWide_0(_S567, _S566.degreeU_0, _S566.degreeV_0, st2_0.x, st2_0.y, &(p2_1), &(ds_2), &(dt_3));
        n_24 = cross(ds_2, dt_3);
    }
    else
    {
        n_24 = n_23;
    }
    var length2_2 : f32 = dot(n_24, n_24);
    if((length2_2 > 0.0f))
    {
        n_24 = n_24 * vec3<f32>(inverseSqrt(length2_2));
    }
    else
    {
        n_24 = vec3<f32>(0.0f, 0.0f, 1.0f);
    }
    point_2.normal_27 = n_24;
    return point_2;
}

fn evaluateBezierSpan_0( _S575 : PatchSpan_0,  _S576 : u32,  _S577 : f32,  _S578 : f32) -> PatchPoint_0
{
    var _S579 : bool;
    if(((_S575.degreeU_0) > u32(3)))
    {
        _S579 = true;
    }
    else
    {
        _S579 = ((_S575.degreeV_0) > u32(3));
    }
    if(_S579)
    {
        return evaluateBezierWide_0(_S575, _S576 + _S575.controls_0, _S577, _S578);
    }
    var net_2 : array<vec4<f32>, i32(16)>;
    var _S580 : u32 = (_S575.degreeU_0 + u32(1)) * (_S575.degreeV_0 + u32(1));
    var n_25 : u32 = u32(0);
    loop
    {
        if((n_25 < u32(16)))
        {
        }
        else
        {
            break;
        }
        if((n_25 < _S580))
        {
            var at_9 : u32 = _S576 + _S575.controls_0 + n_25 * u32(4);
            net_2[n_25] = vec4<f32>(vertices_0[at_9], vertices_0[at_9 + u32(1)], vertices_0[at_9 + u32(2)], vertices_0[at_9 + u32(3)]);
        }
        else
        {
            net_2[n_25] = vec4<f32>(0.0f);
        }
        n_25 = n_25 + u32(1);
    }
    return evaluateBezier_0(_S575, net_2, _S577, _S578);
}

fn patchVertex_0( _S581 : u32,  _S582 : u32) -> PatchVertex_0
{
    var result_3 : PatchVertex_0;
    var _S583 : u32 = records_0[_S581].positionOffset_0;
    var base_2 : u32 = records_0[_S581].positionOffset_0 + patchChunk_0.y * u32(48);
    var _S584 : PatchSpan_0 = loadSpan_0(base_2);
    var packed_2 : u32 = patchChunk_0.z;
    var nu_1 : u32 = (((packed_2 >> (u32(16)))) & (u32(255)));
    var nv_0 : u32 = (((packed_2 >> (u32(24)))) & (u32(255)));
    var _S585 : u32 = min(((packed_2 & (u32(255)))) + _S582 % u32(5), nu_1);
    var _S586 : u32 = min(((((packed_2 >> (u32(8)))) & (u32(255)))) + _S582 / u32(5), nv_0);
    var i_16 : u32;
    if(_S584.reversed_0)
    {
        i_16 = nu_1 - _S585;
    }
    else
    {
        i_16 = _S585;
    }
    result_3.face_1 = _S584.face_0;
    var _S587 : u32;
    if(((_S584.trim_0) >= u32(4294967294)))
    {
        _S587 = u32(0);
    }
    else
    {
        _S587 = _S584.trim_0 + u32(1);
    }
    result_3.trim_1 = _S587;
    var _S588 : f32 = f32(_S586);
    result_3.grid_2 = vec2<f32>(f32(_S585), _S588);
    result_3.extent_0 = vec2<f32>(0.0f);
    if((((records_0[_S581].flags_0) & (u32(512)))) != u32(0))
    {
        result_3.extent_0 = loadFaceExtent_0(base_2);
    }
    var u_5 : f32;
    if(i_16 == nu_1)
    {
        u_5 = _S584.rect_0.y;
    }
    else
    {
        var _S589 : f32 = _S584.rect_0.x;
        u_5 = _S589 + (_S584.rect_0.y - _S589) * f32(i_16) / f32(nu_1);
    }
    var v_13 : f32;
    if(_S586 == nv_0)
    {
        v_13 = _S584.rect_0.w;
    }
    else
    {
        var _S590 : f32 = _S584.rect_0.z;
        v_13 = _S590 + (_S584.rect_0.w - _S590) * _S588 / f32(nv_0);
    }
    var point_3 : PatchPoint_0;
    if((_S584.kind_1) == u32(5))
    {
        point_3 = evaluateBezierSpan_0(_S584, _S583, u_5, v_13);
    }
    else
    {
        point_3 = evaluateAnalytic_0(_S584, u_5, v_13);
    }
    result_3.position_33 = point_3.position_31;
    var _S591 : vec3<f32>;
    if(_S584.reversed_0)
    {
        _S591 = (vec3<f32>(0) - point_3.normal_27);
    }
    else
    {
        _S591 = point_3.normal_27;
    }
    result_3.normal_28 = _S591;
    result_3.uv_36 = vec2<f32>(u_5, v_13) - _S584.corner_0;
    return result_3;
}

fn vertexOut_0( vertexIndex_4 : u32,  item_0 : u32,  withAir_0 : bool) -> SurfaceVertex
{
    var p_15 : DrawItem_std430_0 = items_0[item_0];
    var _S592 : u32 = p_15.record_0;
    var _S593 : mat4x4<f32> = mat4x4<f32>(p_15.relModel_0.data_4[i32(0)][i32(0)], p_15.relModel_0.data_4[i32(1)][i32(0)], p_15.relModel_0.data_4[i32(2)][i32(0)], p_15.relModel_0.data_4[i32(3)][i32(0)], p_15.relModel_0.data_4[i32(0)][i32(1)], p_15.relModel_0.data_4[i32(1)][i32(1)], p_15.relModel_0.data_4[i32(2)][i32(1)], p_15.relModel_0.data_4[i32(3)][i32(1)], p_15.relModel_0.data_4[i32(0)][i32(2)], p_15.relModel_0.data_4[i32(1)][i32(2)], p_15.relModel_0.data_4[i32(2)][i32(2)], p_15.relModel_0.data_4[i32(3)][i32(2)], p_15.relModel_0.data_4[i32(0)][i32(3)], p_15.relModel_0.data_4[i32(1)][i32(3)], p_15.relModel_0.data_4[i32(2)][i32(3)], p_15.relModel_0.data_4[i32(3)][i32(3)]);
    var drawnModel_0 : mat4x4<f32> = _S593;
    var _S594 : u32 = records_0[_S592].placement_0;
    var _S595 : bool = (records_0[_S592].placement_0) != u32(4294967295);
    if(_S595)
    {
        drawnModel_0[i32(0)][i32(3)] = p_15.drawn_0.x;
        drawnModel_0[i32(1)][i32(3)] = p_15.drawn_0.y;
        drawnModel_0[i32(2)][i32(3)] = p_15.drawn_0.z;
    }
    var out_7 : SurfaceVertex;
    var _S596 : vec2<f32> = vec2<f32>(0.0f);
    out_7.uv = _S596;
    var _S597 : u32 = records_0[_S592].flags_0;
    var points_0 : bool = (((records_0[_S592].flags_0) & (u32(64)))) != u32(0);
    var patched_1 : bool = (((records_0[_S592].flags_0) & (u32(128)))) != u32(0);
    var patchData_0 : PatchVertex_0;
    patchData_0.face_1 = u32(0);
    patchData_0.trim_1 = u32(0);
    var _S598 : vec3<f32> = vec3<f32>(0.0f);
    patchData_0.position_33 = _S598;
    const _S599 : vec3<f32> = vec3<f32>(0.0f, 0.0f, 1.0f);
    patchData_0.normal_28 = _S599;
    patchData_0.uv_36 = _S596;
    patchData_0.grid_2 = _S596;
    patchData_0.extent_0 = _S596;
    var _S600 : vec4<f32> = vec4<f32>(0.0f);
    var anchor_0 : vec4<f32> = _S600;
    var position_34 : vec3<f32>;
    var instance_2 : u32;
    if(points_0)
    {
        var _S601 : u32 = vertexIndex_4 % u32(6);
        var instance_3 : u32 = vertexIndex_4 / u32(6);
        anchor_0 = read4_0(records_0[_S592].positionOffset_0, instance_3);
        var _S602 : vec3<f32> = vec3<f32>(POINT_OFFSET_0[POINT_CORNER_0[_S601]], 0.0f);
        out_7.uv = POINT_UV_0[POINT_CORNER_0[_S601]];
        instance_2 = instance_3;
        position_34 = _S602;
    }
    else
    {
        if(patched_1)
        {
            patchData_0 = patchVertex_0(p_15.record_0, vertexIndex_4);
            out_7.uv = patchData_0.uv_36;
            position_34 = patchData_0.position_33;
        }
        else
        {
            position_34 = read3_0(records_0[_S592].positionOffset_0, vertexIndex_4);
        }
        instance_2 = p_15.instance_0;
    }
    var billboard_0 : bool = ((_S597 & (u32(16)))) != u32(0);
    var placedDraw_0 : bool;
    if(billboard_0)
    {
        placedDraw_0 = _S595;
    }
    else
    {
        placedDraw_0 = false;
    }
    if(placedDraw_0)
    {
        var _S603 : vec3<f32> = placePosition_0(_S594, anchor_0.xyz, u32(0), records_0[_S592].attributes_0, u32(0));
        anchor_0.x = _S603.x;
        anchor_0.y = _S603.y;
        anchor_0.z = _S603.z;
    }
    var _S604 : mat4x4<f32>;
    if(billboard_0)
    {
        _S604 = drawnModel_0;
    }
    else
    {
        _S604 = _S593;
    }
    cesiumAnchor_0 = (((vec4<f32>(anchor_0.xyz, 1.0f)) * (_S604))).xyz;
    var normal_29 : vec3<f32>;
    if(patched_1)
    {
        normal_29 = patchData_0.normal_28;
    }
    else
    {
        var _S605 : u32 = records_0[_S592].normalOffset_0;
        if((records_0[_S592].normalOffset_0) != u32(4294967295))
        {
            normal_29 = read3_0(_S605, vertexIndex_4);
        }
        else
        {
            normal_29 = _S599;
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
        placedDraw_0 = (records_0[_S592].uvOffset_0) != u32(4294967295);
    }
    else
    {
        placedDraw_0 = false;
    }
    if(placedDraw_0)
    {
        out_7.uv = read2_0(records_0[_S592].uvOffset_0, vertexIndex_4);
    }
    var _S606 : vec4<f32> = vec4<f32>(1.0f);
    var _S607 : u32 = records_0[_S592].colorOffset_0;
    var vertexColor_0 : vec4<f32>;
    if((records_0[_S592].colorOffset_0) != u32(4294967295))
    {
        vertexColor_0 = read4_0(_S607, vertexIndex_4);
    }
    else
    {
        vertexColor_0 = _S606;
    }
    out_7.color = unpack4x8unorm(p_15.tint_0) * vertexColor_0;
    var _S608 : u32 = records_0[_S592].featureIdOffset_0;
    var _S609 : bool = (records_0[_S592].featureIdOffset_0) != u32(4294967295);
    var localFeature_0 : u32;
    if(_S609)
    {
        localFeature_0 = (bitcast<u32>((vertices_0[_S608 + vertexIndex_4])));
    }
    else
    {
        localFeature_0 = u32(4294967295);
    }
    var tableFeature_0 : u32;
    if(_S608 == u32(4294967295))
    {
        tableFeature_0 = u32(0);
    }
    else
    {
        tableFeature_0 = localFeature_0;
    }
    var _S610 : bool = (p_15.feature_0) != u32(0);
    if(_S610)
    {
        tableFeature_0 = p_15.feature_0 - records_0[_S592].featureId_0;
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
    var placed_1 : Placed_0;
    var _S611 : u32;
    if(billboard_0)
    {
        _S611 = u32(4294967295);
    }
    else
    {
        _S611 = _S594;
    }
    var _S612 : u32 = records_0[_S592].attributes_0;
    var _S613 : Placed_0 = placeVertex_0(_S611, position_34, vertexIndex_4, records_0[_S592].attributes_0, tableFeature_0);
    placed_1 = _S613;
    var _S614 : vec3<f32> = placed_1.position_32;
    if(_S595)
    {
        placedDraw_0 = !billboard_0;
    }
    else
    {
        placedDraw_0 = false;
    }
    var routed_0 : RoutedVertex;
    routed_0.routed = false;
    routed_0.position = _S598;
    routed_0.displacement = _S598;
    routed_0.jx = _S598;
    routed_0.jy = _S598;
    routed_0.jz = _S598;
    var position_35 : vec3<f32>;
    if(placedDraw_0)
    {
        var _S615 : RoutedVertex = (routeVertex((_S594), (position_34), ((((vec4<f32>(position_34, 1.0f)) * (_S593))).xyz), (column3_0(_S593, i32(0))), (column3_0(_S593, i32(1))), (column3_0(_S593, i32(2)))));
        routed_0 = _S615;
        if(routed_0.routed)
        {
            var _S616 : vec3<f32> = position_34 + routed_0.displacement;
            placed_1.jacobian_2 = transpose(mat3x3<f32>(routed_0.jx, routed_0.jy, routed_0.jz));
            position_35 = _S616;
        }
        else
        {
            position_35 = _S614;
        }
    }
    else
    {
        position_35 = _S614;
    }
    if(placedDraw_0)
    {
        normal_29 = turnNormal_0(placed_1.jacobian_2, normal_29);
    }
    out_7.tangent = _S600;
    if(patched_1)
    {
        out_7.tangent = vec4<f32>(patchData_0.grid_2, patchData_0.extent_0);
    }
    else
    {
        var _S617 : u32 = records_0[_S592].tangentOffset_0;
        if((records_0[_S592].tangentOffset_0) != u32(4294967295))
        {
            var t_11 : vec4<f32> = read4_0(_S617, vertexIndex_4);
            var turned_1 : vec3<f32>;
            if(placedDraw_0)
            {
                turned_1 = (((t_11.xyz) * (placed_1.jacobian_2)));
            }
            else
            {
                turned_1 = t_11.xyz;
            }
            out_7.tangent = vec4<f32>(normalize((((vec4<f32>(turned_1, 0.0f)) * (_S593))).xyz), t_11.w);
        }
    }
    var v_14 : CesiumVertex;
    v_14.positionMC = position_35;
    v_14.designPositionMC = position_34;
    v_14.normalMC = normal_29;
    v_14.texCoord0 = out_7.uv;
    v_14.color0 = vertexColor_0;
    v_14.featureId0 = localFeature_0;
    v_14.vertexIndex = vertexIndex_4;
    v_14.instanceIndex = instance_2;
    v_14.time = view_0.time_0.x;
    v_14.draw = p_15.record_0;
    v_14.directory = _S612;
    v_14.tableFeature = tableFeature_0;
    var stage_0 : CesiumVertexResult = (cesiumVertexStage((v_14)));
    if((vertexIndex_4 >= (records_0[_S592].skirtStart_0)))
    {
        tableFeature_0 = u32(2147483648);
    }
    else
    {
        tableFeature_0 = u32(0);
    }
    out_7.ids[i32(2)] = (instance_2 | (tableFeature_0));
    if(patched_1)
    {
        out_7.ids[i32(2)] = patchData_0.trim_1;
    }
    out_7.named0 = stage_0.named0;
    out_7.named1 = stage_0.named1;
    out_7.named2 = stage_0.named2;
    out_7.named3 = stage_0.named3;
    out_7.positionMC = position_34;
    var _S618 : vec4<f32> = (((vec4<f32>(stage_0.positionMC, 1.0f)) * (drawnModel_0)));
    var world_0 : vec4<f32>;
    if(routed_0.routed)
    {
        world_0 = vec4<f32>(routed_0.position + (((vec4<f32>(stage_0.positionMC - position_35, 0.0f)) * (_S593))).xyz, 1.0f);
    }
    else
    {
        world_0 = _S618;
    }
    if(placedDraw_0)
    {
        position_34 = (((vec4<f32>(position_34, 1.0f)) * (_S593))).xyz;
    }
    else
    {
        position_34 = world_0.xyz;
    }
    out_7.relPosition = position_34;
    out_7.position = (((world_0) * (mat4x4<f32>(view_0.viewProj_0.data_0[i32(0)][i32(0)], view_0.viewProj_0.data_0[i32(1)][i32(0)], view_0.viewProj_0.data_0[i32(2)][i32(0)], view_0.viewProj_0.data_0[i32(3)][i32(0)], view_0.viewProj_0.data_0[i32(0)][i32(1)], view_0.viewProj_0.data_0[i32(1)][i32(1)], view_0.viewProj_0.data_0[i32(2)][i32(1)], view_0.viewProj_0.data_0[i32(3)][i32(1)], view_0.viewProj_0.data_0[i32(0)][i32(2)], view_0.viewProj_0.data_0[i32(1)][i32(2)], view_0.viewProj_0.data_0[i32(2)][i32(2)], view_0.viewProj_0.data_0[i32(3)][i32(2)], view_0.viewProj_0.data_0[i32(0)][i32(3)], view_0.viewProj_0.data_0[i32(1)][i32(3)], view_0.viewProj_0.data_0[i32(2)][i32(3)], view_0.viewProj_0.data_0[i32(3)][i32(3)]))));
    if(billboard_0)
    {
        var world_1 : vec4<f32> = (((vec4<f32>(anchor_0.xyz, 1.0f)) * (drawnModel_0)));
        var _S619 : vec3<f32> = world_1.xyz;
        out_7.relPosition = _S619;
        var _S620 : vec4<f32> = (((world_1) * (mat4x4<f32>(view_0.viewProj_0.data_0[i32(0)][i32(0)], view_0.viewProj_0.data_0[i32(1)][i32(0)], view_0.viewProj_0.data_0[i32(2)][i32(0)], view_0.viewProj_0.data_0[i32(3)][i32(0)], view_0.viewProj_0.data_0[i32(0)][i32(1)], view_0.viewProj_0.data_0[i32(1)][i32(1)], view_0.viewProj_0.data_0[i32(2)][i32(1)], view_0.viewProj_0.data_0[i32(3)][i32(1)], view_0.viewProj_0.data_0[i32(0)][i32(2)], view_0.viewProj_0.data_0[i32(1)][i32(2)], view_0.viewProj_0.data_0[i32(2)][i32(2)], view_0.viewProj_0.data_0[i32(3)][i32(2)], view_0.viewProj_0.data_0[i32(0)][i32(3)], view_0.viewProj_0.data_0[i32(1)][i32(3)], view_0.viewProj_0.data_0[i32(2)][i32(3)], view_0.viewProj_0.data_0[i32(3)][i32(3)]))));
        out_7.position = vec4<f32>(_S620.xy + stage_0.positionMC.xy * vec2<f32>(records_0[_S592].billboardSize_0) * vec2<f32>(length(column3_0(_S593, i32(0)))) * vec2<f32>(2.0f) * view_0.viewport_0.zw * vec2<f32>(_S620.w), _S620.zw);
        if(((length(_S619)) < (records_0[_S592].billboardDepthTest_0)))
        {
            out_7.position[i32(2)] = out_7.position.w;
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
            out_7.position = vec4<f32>(0.0f, 0.0f, -1.0f, 1.0f);
        }
        world_0 = world_1;
    }
    out_7.airInscatter = _S598;
    out_7.airTransmittance = vec4<f32>(1.0f, 1.0f, 1.0f, placed_1.clip_2);
    var unlitDraw_0 : bool = ((_S597 & (u32(2)))) != u32(0);
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
        var a_8 : AerialPerspective_0 = aerialMarch_0(world_0.xyz);
        out_7.airInscatter = a_8.inscatter_0;
        out_7.airTransmittance = vec4<f32>(a_8.transmittance_0, placed_1.clip_2);
    }
    if(((_S597 & (u32(8)))) != u32(0))
    {
        out_7.position[i32(2)] = out_7.position[i32(2)] * 5.42101086242752217e-20f;
    }
    var c0_1 : vec3<f32> = column3_0(_S593, i32(0));
    var c1_1 : vec3<f32> = column3_0(_S593, i32(1));
    var c2_1 : vec3<f32> = column3_0(_S593, i32(2));
    var _S621 : vec3<f32> = cross(c1_1, c2_1);
    out_7.normal = normalize(_S621 * vec3<f32>(stage_0.normalMC.x) + cross(c2_1, c0_1) * vec3<f32>(stage_0.normalMC.y) + cross(c0_1, c1_1) * vec3<f32>(stage_0.normalMC.z)) * vec3<f32>(f32((i32(sign((dot(c0_1, _S621)))))));
    if(billboard_0)
    {
        out_7.normal = (vec3<f32>(0) - normalize(world_0.xyz));
    }
    out_7.ids[i32(0)] = p_15.record_0;
    var _S622 : u32 = records_0[_S592].featureId_0;
    out_7.ids[i32(1)] = records_0[_S592].featureId_0;
    if(points_0)
    {
        out_7.ids[i32(1)] = _S622 + instance_2;
    }
    else
    {
        if(patched_1)
        {
            if(_S622 == u32(0))
            {
                instance_2 = u32(0);
            }
            else
            {
                instance_2 = _S622 + patchData_0.face_1;
            }
            out_7.ids[i32(1)] = instance_2;
        }
        else
        {
            if(_S610)
            {
                out_7.ids[i32(1)] = p_15.feature_0;
            }
            else
            {
                if(_S609)
                {
                    if(localFeature_0 == u32(4294967295))
                    {
                        instance_2 = u32(0);
                    }
                    else
                    {
                        instance_2 = _S622 + localFeature_0;
                    }
                    out_7.ids[i32(1)] = instance_2;
                }
            }
        }
    }
    return out_7;
}

fn surfaceVertex( vertexIndex_5 : u32,  item_1 : u32) -> SurfaceVertex
{
    var _S623 : SurfaceVertex = vertexOut_0(vertexIndex_5, item_1, true);
    return _S623;
}

fn surfacePointVertex( vertexIndex_6 : u32,  item_2 : u32) -> SurfaceVertex
{
    var _S624 : SurfaceVertex = vertexOut_0((bitcast<u32>((vertices_0[records_0[items_0[item_2].record_0].uvOffset_0 + vertexIndex_6 / u32(6)]))) * u32(6) + vertexIndex_6 % u32(6), item_2, true);
    return _S624;
}

fn surfaceDepthVertex( vertexIndex_7 : u32,  item_3 : u32) -> SurfaceVertex
{
    var _S625 : SurfaceVertex = vertexOut_0(vertexIndex_7, item_3, false);
    return _S625;
}

fn surfacePatchVertex( vertexIndex_8 : u32,  chunk_0 : vec4<u32>) -> SurfaceVertex
{
    patchChunk_0 = chunk_0;
    var _S626 : SurfaceVertex = vertexOut_0(vertexIndex_8, chunk_0.x, true);
    return _S626;
}

fn surfacePatchDepthVertex( vertexIndex_9 : u32,  chunk_1 : vec4<u32>) -> SurfaceVertex
{
    patchChunk_0 = chunk_1;
    var _S627 : SurfaceVertex = vertexOut_0(vertexIndex_9, chunk_1.x, false);
    return _S627;
}

var<private> pickTriangleNumber_0 : u32;

fn pickWindowed_0( v_15 : SurfaceVertex) -> SurfaceVertex
{
    var _S628 : SurfaceVertex = v_15;
    var _S629 : vec2<f32> = (_S628.position.xy - view_0.iblFrame_0[i32(0)].xy * vec2<f32>(_S628.position.w)) / view_0.iblFrame_0[i32(0)].zw;
    _S628.position.x = _S629.x;
    _S628.position.y = _S629.y;
    return _S628;
}

fn surfacePickVertex( vertexIndex_10 : u32,  item_4 : u32) -> SurfaceVertex
{
    var at_10 : u32 = vertexIndex_10 - records_0[items_0[item_4].record_0].firstIndex_0;
    pickTriangleNumber_0 = at_10 / u32(3);
    var corner_1 : u32 = at_10 % u32(3);
    var _S630 : SurfaceVertex = vertexOut_0(pickIndices_0[vertexIndex_10], item_4, false);
    var out_8 : SurfaceVertex = _S630;
    var _S631 : f32;
    if(corner_1 == u32(0))
    {
        _S631 = 1.0f;
    }
    else
    {
        _S631 = 0.0f;
    }
    var _S632 : f32;
    if(corner_1 == u32(1))
    {
        _S632 = 1.0f;
    }
    else
    {
        _S632 = 0.0f;
    }
    var _S633 : f32;
    if(corner_1 == u32(2))
    {
        _S633 = 1.0f;
    }
    else
    {
        _S633 = 0.0f;
    }
    out_8.airInscatter = vec3<f32>(_S631, _S632, _S633);
    return pickWindowed_0(out_8);
}

fn surfacePatchPickVertex( vertexIndex_11 : u32,  chunk_2 : vec4<u32>) -> SurfaceVertex
{
    patchChunk_0 = chunk_2;
    pickTriangleNumber_0 = u32(0);
    var _S634 : u32 = chunk_2.x;
    var _S635 : SurfaceVertex = vertexOut_0(vertexIndex_11, _S634, false);
    var out_9 : SurfaceVertex = _S635;
    out_9.airInscatter = vec3<f32>(loadSpan_0(records_0[_S634].positionOffset_0 + chunk_2.y * u32(48)).corner_0, 0.0f);
    return pickWindowed_0(out_9);
}

fn surfacePickTriangle() -> u32
{
    return pickTriangleNumber_0;
}

