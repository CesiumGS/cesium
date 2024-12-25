// If the style color is white, it implies the feature has not been styled.
bool isDefaultStyleColor(vec3 color)
{
    return all(greaterThan(color, vec3(1.0 - czm_epsilon3)));
}

vec3 blend(vec3 sourceColor, vec3 styleColor, float styleColorBlend)
{
    vec3 blendColor = mix(sourceColor, styleColor, styleColorBlend);
    vec3 color = isDefaultStyleColor(styleColor.rgb) ? sourceColor : blendColor;
    return color;
}

vec2 computeTextureTransform(vec2 texCoord, mat3 textureTransform)
{
    return vec2(textureTransform * vec3(texCoord, 1.0));
}

#ifdef HAS_NORMAL_TEXTURE
vec2 getNormalTexCoords()
{
    vec2 texCoord = TEXCOORD_NORMAL;
    #ifdef HAS_NORMAL_TEXTURE_TRANSFORM
        texCoord = vec2(u_normalTextureTransform * vec3(texCoord, 1.0));
    #endif
    return texCoord;
}
#endif

#if defined(HAS_NORMAL_TEXTURE) || defined(HAS_CLEARCOAT_NORMAL_TEXTURE)
vec3 computeTangent(in vec3 position, in vec2 normalTexCoords)
{
    vec2 tex_dx = dFdx(normalTexCoords);
    vec2 tex_dy = dFdy(normalTexCoords);
    float determinant = tex_dx.x * tex_dy.y - tex_dy.x * tex_dx.y;
    vec3 tangent = tex_dy.t * dFdx(position) - tex_dx.t * dFdy(position);
    return tangent / determinant;
}
#endif

#ifdef USE_ANISOTROPY
struct NormalInfo {
    vec3 tangent;
    vec3 bitangent;
    vec3 normal;
    vec3 geometryNormal;
};

NormalInfo getNormalInfo(ProcessedAttributes attributes)
{
    vec3 geometryNormal = attributes.normalEC;
    #ifdef HAS_NORMAL_TEXTURE
        vec2 normalTexCoords = getNormalTexCoords();
    #endif

    #ifdef HAS_BITANGENTS
        vec3 tangent = attributes.tangentEC;
        vec3 bitangent = attributes.bitangentEC;
    #else // Assume HAS_NORMAL_TEXTURE
        vec3 tangent = computeTangent(attributes.positionEC, normalTexCoords);
        tangent = normalize(tangent - geometryNormal * dot(geometryNormal, tangent));
        vec3 bitangent = normalize(cross(geometryNormal, tangent));
    #endif

    #ifdef HAS_NORMAL_TEXTURE
        mat3 tbn = mat3(tangent, bitangent, geometryNormal);
        vec3 normalSample = texture(u_normalTexture, normalTexCoords).rgb;
        normalSample = 2.0 * normalSample - 1.0;
        #ifdef HAS_NORMAL_TEXTURE_SCALE
            normalSample.xy *= u_normalTextureScale;
        #endif
        vec3 normal = normalize(tbn * normalSample);
    #else
        vec3 normal = geometryNormal;
    #endif

    #ifdef HAS_DOUBLE_SIDED_MATERIAL
        if (czm_backFacing()) {
            tangent *= -1.0;
            bitangent *= -1.0;
            normal *= -1.0;
            geometryNormal *= -1.0;
        }
    #endif

    NormalInfo normalInfo;
    normalInfo.tangent = tangent;
    normalInfo.bitangent = bitangent;
    normalInfo.normal = normal;
    normalInfo.geometryNormal = geometryNormal;

    return normalInfo;
}
#endif

#if defined(HAS_NORMAL_TEXTURE) && !defined(HAS_WIREFRAME)
vec3 getNormalFromTexture(ProcessedAttributes attributes, vec3 geometryNormal)
{
    vec2 normalTexCoords = getNormalTexCoords();

    // If HAS_BITANGENTS is set, then HAS_TANGENTS is also set
    #ifdef HAS_BITANGENTS
        vec3 t = attributes.tangentEC;
        vec3 b = attributes.bitangentEC;
    #else
        vec3 t = computeTangent(attributes.positionEC, normalTexCoords);
        t = normalize(t - geometryNormal * dot(geometryNormal, t));
        vec3 b = normalize(cross(geometryNormal, t));
    #endif

    mat3 tbn = mat3(t, b, geometryNormal);
    vec3 normalSample = texture(u_normalTexture, normalTexCoords).rgb;
    normalSample = 2.0 * normalSample - 1.0;
    #ifdef HAS_NORMAL_TEXTURE_SCALE
        normalSample.xy *= u_normalTextureScale;
    #endif
    return normalize(tbn * normalSample);
}
#endif

#ifdef HAS_CLEARCOAT_NORMAL_TEXTURE
vec3 getClearcoatNormalFromTexture(ProcessedAttributes attributes, vec3 geometryNormal)
{
    vec2 normalTexCoords = TEXCOORD_CLEARCOAT_NORMAL;
    #ifdef HAS_CLEARCOAT_NORMAL_TEXTURE_TRANSFORM
        normalTexCoords = vec2(u_clearcoatNormalTextureTransform * vec3(normalTexCoords, 1.0));
    #endif

    // If HAS_BITANGENTS is set, then HAS_TANGENTS is also set
    #ifdef HAS_BITANGENTS
        vec3 t = attributes.tangentEC;
        vec3 b = attributes.bitangentEC;
    #else
        vec3 t = computeTangent(attributes.positionEC, normalTexCoords);
        t = normalize(t - geometryNormal * dot(geometryNormal, t));
        vec3 b = normalize(cross(geometryNormal, t));
    #endif

    mat3 tbn = mat3(t, b, geometryNormal);
    vec3 normalSample = texture(u_clearcoatNormalTexture, normalTexCoords).rgb;
    normalSample = 2.0 * normalSample - 1.0;
    #ifdef HAS_CLEARCOAT_NORMAL_TEXTURE_SCALE
        normalSample.xy *= u_clearcoatNormalTextureScale;
    #endif
    return normalize(tbn * normalSample);
}
#endif

#ifdef HAS_NORMALS
vec3 computeNormal(ProcessedAttributes attributes)
{
    // Geometry normal. This is already normalized 
    vec3 normal = attributes.normalEC;

    #if defined(HAS_NORMAL_TEXTURE) && !defined(HAS_WIREFRAME)
        normal = getNormalFromTexture(attributes, normal);
    #endif

    #ifdef HAS_DOUBLE_SIDED_MATERIAL
        if (czm_backFacing()) {
            normal = -normal;
        }
    #endif

    return normal;
}
#endif

#ifdef HAS_BASE_COLOR_TEXTURE
vec4 getBaseColorFromTexture()
{
    vec2 baseColorTexCoords = TEXCOORD_BASE_COLOR;
    #ifdef HAS_BASE_COLOR_TEXTURE_TRANSFORM
        baseColorTexCoords = computeTextureTransform(baseColorTexCoords, u_baseColorTextureTransform);
    #endif

    vec4 baseColorWithAlpha = czm_srgbToLinear(texture(u_baseColorTexture, baseColorTexCoords));

    #ifdef HAS_BASE_COLOR_FACTOR
        baseColorWithAlpha *= u_baseColorFactor;
    #endif

    return baseColorWithAlpha;
}
#endif

#ifdef HAS_EMISSIVE_TEXTURE
vec3 getEmissiveFromTexture()
{
    vec2 emissiveTexCoords = TEXCOORD_EMISSIVE;
    #ifdef HAS_EMISSIVE_TEXTURE_TRANSFORM
        emissiveTexCoords = computeTextureTransform(emissiveTexCoords, u_emissiveTextureTransform);
    #endif

    vec3 emissive = czm_srgbToLinear(texture(u_emissiveTexture, emissiveTexCoords).rgb);
    #ifdef HAS_EMISSIVE_FACTOR
        emissive *= u_emissiveFactor;
    #endif

    return emissive;
}
#endif

#if defined(LIGHTING_PBR) && defined(USE_SPECULAR_GLOSSINESS)
void setSpecularGlossiness(inout czm_modelMaterial material)
{
    #ifdef HAS_SPECULAR_GLOSSINESS_TEXTURE
        vec2 specularGlossinessTexCoords = TEXCOORD_SPECULAR_GLOSSINESS;
        #ifdef HAS_SPECULAR_GLOSSINESS_TEXTURE_TRANSFORM
            specularGlossinessTexCoords = computeTextureTransform(specularGlossinessTexCoords, u_specularGlossinessTextureTransform);
        #endif

        vec4 specularGlossiness = czm_srgbToLinear(texture(u_specularGlossinessTexture, specularGlossinessTexCoords));
        vec3 specular = specularGlossiness.rgb;
        float glossiness = specularGlossiness.a;
        #ifdef HAS_LEGACY_SPECULAR_FACTOR
            specular *= u_legacySpecularFactor;
        #endif

        #ifdef HAS_GLOSSINESS_FACTOR
            glossiness *= u_glossinessFactor;
        #endif
    #else
        #ifdef HAS_LEGACY_SPECULAR_FACTOR
            vec3 specular = clamp(u_legacySpecularFactor, vec3(0.0), vec3(1.0));
        #else
            vec3 specular = vec3(1.0);
        #endif

        #ifdef HAS_GLOSSINESS_FACTOR
            float glossiness = clamp(u_glossinessFactor, 0.0, 1.0);
        #else
            float glossiness = 1.0;
        #endif
    #endif

    #ifdef HAS_DIFFUSE_TEXTURE
        vec2 diffuseTexCoords = TEXCOORD_DIFFUSE;
        #ifdef HAS_DIFFUSE_TEXTURE_TRANSFORM
            diffuseTexCoords = computeTextureTransform(diffuseTexCoords, u_diffuseTextureTransform);
        #endif

        vec4 diffuse = czm_srgbToLinear(texture(u_diffuseTexture, diffuseTexCoords));
        #ifdef HAS_DIFFUSE_FACTOR
            diffuse *= u_diffuseFactor;
        #endif
    #elif defined(HAS_DIFFUSE_FACTOR)
        vec4 diffuse = clamp(u_diffuseFactor, vec4(0.0), vec4(1.0));
    #else
        vec4 diffuse = vec4(1.0);
    #endif

    material.diffuse = diffuse.rgb * (1.0 - czm_maximumComponent(specular));
    // the specular glossiness extension's alpha overrides anything set
    // by the base material.
    material.alpha = diffuse.a;

    material.specular = specular;

    // glossiness is the opposite of roughness, but easier for artists to use.
    material.roughness = 1.0 - glossiness;
}
#elif defined(LIGHTING_PBR)
float setMetallicRoughness(inout czm_modelMaterial material)
{
    #ifdef HAS_METALLIC_ROUGHNESS_TEXTURE
        vec2 metallicRoughnessTexCoords = TEXCOORD_METALLIC_ROUGHNESS;
        #ifdef HAS_METALLIC_ROUGHNESS_TEXTURE_TRANSFORM
            metallicRoughnessTexCoords = computeTextureTransform(metallicRoughnessTexCoords, u_metallicRoughnessTextureTransform);
        #endif

        vec3 metallicRoughness = texture(u_metallicRoughnessTexture, metallicRoughnessTexCoords).rgb;
        float metalness = clamp(metallicRoughness.b, 0.0, 1.0);
        float roughness = clamp(metallicRoughness.g, 0.0, 1.0);
        #ifdef HAS_METALLIC_FACTOR
            metalness = clamp(metalness * u_metallicFactor, 0.0, 1.0);
        #endif

        #ifdef HAS_ROUGHNESS_FACTOR
            roughness = clamp(roughness * u_roughnessFactor, 0.0, 1.0);
        #endif
    #else
        #ifdef HAS_METALLIC_FACTOR
            float metalness = clamp(u_metallicFactor, 0.0, 1.0);
        #else
            float metalness = 1.0;
        #endif

        #ifdef HAS_ROUGHNESS_FACTOR
            float roughness = clamp(u_roughnessFactor, 0.0, 1.0);
        #else
            float roughness = 1.0;
        #endif
    #endif

    // dielectrics use f0 = 0.04, metals use albedo as f0
    const vec3 REFLECTANCE_DIELECTRIC = vec3(0.04);
    vec3 f0 = mix(REFLECTANCE_DIELECTRIC, material.baseColor.rgb, metalness);

    material.specular = f0;

    // diffuse only applies to dielectrics.
    material.diffuse = mix(material.baseColor.rgb, vec3(0.0), metalness);

    // This is perceptual roughness. The square of this value is used for direct lighting
    material.roughness = roughness;

    return metalness;
}
#ifdef USE_SPECULAR
void setSpecular(inout czm_modelMaterial material, in float metalness)
{
    #ifdef HAS_SPECULAR_TEXTURE
        vec2 specularTexCoords = TEXCOORD_SPECULAR;
        #ifdef HAS_SPECULAR_TEXTURE_TRANSFORM
            specularTexCoords = computeTextureTransform(specularTexCoords, u_specularTextureTransform);
        #endif
        float specularWeight = texture(u_specularTexture, specularTexCoords).a;
        #ifdef HAS_SPECULAR_FACTOR
            specularWeight *= u_specularFactor;
        #endif
    #else
        #ifdef HAS_SPECULAR_FACTOR
            float specularWeight = u_specularFactor;
        #else
            float specularWeight = 1.0;
        #endif
    #endif

    #ifdef HAS_SPECULAR_COLOR_TEXTURE
        vec2 specularColorTexCoords = TEXCOORD_SPECULAR_COLOR;
        #ifdef HAS_SPECULAR_COLOR_TEXTURE_TRANSFORM
            specularColorTexCoords = computeTextureTransform(specularColorTexCoords, u_specularColorTextureTransform);
        #endif
        vec3 specularColorSample = texture(u_specularColorTexture, specularColorTexCoords).rgb;
        vec3 specularColorFactor = czm_srgbToLinear(specularColorSample);
        #ifdef HAS_SPECULAR_COLOR_FACTOR
            specularColorFactor *= u_specularColorFactor;
        #endif
    #else
        #ifdef HAS_SPECULAR_COLOR_FACTOR
            vec3 specularColorFactor = u_specularColorFactor;
        #else
            vec3 specularColorFactor = vec3(1.0);
        #endif
    #endif
    material.specularWeight = specularWeight;
    vec3 f0 = material.specular;
    vec3 dielectricSpecularF0 = min(f0 * specularColorFactor, vec3(1.0));
    material.specular = mix(dielectricSpecularF0, material.baseColor.rgb, metalness);
}
#endif
#ifdef USE_ANISOTROPY
void setAnisotropy(inout czm_modelMaterial material, in NormalInfo normalInfo)
{
    mat2 rotation = mat2(u_anisotropy.xy, -u_anisotropy.y, u_anisotropy.x);
    float anisotropyStrength = u_anisotropy.z;

    vec2 direction = vec2(1.0, 0.0);
    #ifdef HAS_ANISOTROPY_TEXTURE
        vec2 anisotropyTexCoords = TEXCOORD_ANISOTROPY;
        #ifdef HAS_ANISOTROPY_TEXTURE_TRANSFORM
            anisotropyTexCoords = computeTextureTransform(anisotropyTexCoords, u_anisotropyTextureTransform);
        #endif
        vec3 anisotropySample = texture(u_anisotropyTexture, anisotropyTexCoords).rgb;
        direction = anisotropySample.rg * 2.0 - vec2(1.0);
        anisotropyStrength *= anisotropySample.b;
    #endif

    direction = rotation * direction;
    mat3 tbn = mat3(normalInfo.tangent, normalInfo.bitangent, normalInfo.normal);
    vec3 anisotropicT = tbn * normalize(vec3(direction, 0.0));
    vec3 anisotropicB = cross(normalInfo.geometryNormal, anisotropicT);

    material.anisotropicT = anisotropicT;
    material.anisotropicB = anisotropicB;
    material.anisotropyStrength = anisotropyStrength;
}
#endif
#ifdef USE_CLEARCOAT
void setClearcoat(inout czm_modelMaterial material, in ProcessedAttributes attributes)
{
    #ifdef HAS_CLEARCOAT_TEXTURE
        vec2 clearcoatTexCoords = TEXCOORD_CLEARCOAT;
        #ifdef HAS_CLEARCOAT_TEXTURE_TRANSFORM
            clearcoatTexCoords = computeTextureTransform(clearcoatTexCoords, u_clearcoatTextureTransform);
        #endif
        float clearcoatFactor = texture(u_clearcoatTexture, clearcoatTexCoords).r;
        #ifdef HAS_CLEARCOAT_FACTOR
            clearcoatFactor *= u_clearcoatFactor;
        #endif
    #else
        #ifdef HAS_CLEARCOAT_FACTOR
            float clearcoatFactor = u_clearcoatFactor;
        #else
            // PERFORMANCE_IDEA: this case should turn the whole extension off
            float clearcoatFactor = 0.0;
        #endif
    #endif

    #ifdef HAS_CLEARCOAT_ROUGHNESS_TEXTURE
        vec2 clearcoatRoughnessTexCoords = TEXCOORD_CLEARCOAT_ROUGHNESS;
        #ifdef HAS_CLEARCOAT_ROUGHNESS_TEXTURE_TRANSFORM
            clearcoatRoughnessTexCoords = computeTextureTransform(clearcoatRoughnessTexCoords, u_clearcoatRoughnessTextureTransform);
        #endif
        float clearcoatRoughness = texture(u_clearcoatRoughnessTexture, clearcoatRoughnessTexCoords).g;
        #ifdef HAS_CLEARCOAT_ROUGHNESS_FACTOR
            clearcoatRoughness *= u_clearcoatRoughnessFactor;
        #endif
    #else
        #ifdef HAS_CLEARCOAT_ROUGHNESS_FACTOR
            float clearcoatRoughness = u_clearcoatRoughnessFactor;
        #else
            float clearcoatRoughness = 0.0;
        #endif
    #endif

    material.clearcoatFactor = clearcoatFactor;
    // This is perceptual roughness. The square of this value is used for direct lighting
    material.clearcoatRoughness = clearcoatRoughness;
    #ifdef HAS_CLEARCOAT_NORMAL_TEXTURE
        material.clearcoatNormal = getClearcoatNormalFromTexture(attributes, attributes.normalEC);
    #else
        material.clearcoatNormal = attributes.normalEC;
    #endif
}
#endif
#endif

void materialStage(inout czm_modelMaterial material, ProcessedAttributes attributes, SelectedFeature feature)
{
    #ifdef USE_ANISOTROPY
        NormalInfo normalInfo = getNormalInfo(attributes);
        material.normalEC = normalInfo.normal;
    #elif defined(HAS_NORMALS)
        material.normalEC = computeNormal(attributes);
    #endif

    vec4 baseColorWithAlpha = vec4(1.0);
    // Regardless of whether we use PBR, set a base color
    #ifdef HAS_BASE_COLOR_TEXTURE
        baseColorWithAlpha = getBaseColorFromTexture();
    #elif defined(HAS_BASE_COLOR_FACTOR)
        baseColorWithAlpha = u_baseColorFactor;
    #endif

    #ifdef HAS_POINT_CLOUD_COLOR_STYLE
        baseColorWithAlpha = v_pointCloudColor;
    #elif defined(HAS_COLOR_0)
        vec4 color = attributes.color_0;
        // .pnts files store colors in the sRGB color space
        #ifdef HAS_SRGB_COLOR
            color = czm_srgbToLinear(color);
        #endif
        baseColorWithAlpha *= color;
    #endif

    #ifdef USE_CPU_STYLING
        baseColorWithAlpha.rgb = blend(baseColorWithAlpha.rgb, feature.color.rgb, model_colorBlend);
    #endif
    material.baseColor = baseColorWithAlpha;
    material.diffuse = baseColorWithAlpha.rgb;
    material.alpha = baseColorWithAlpha.a;

    #ifdef HAS_OCCLUSION_TEXTURE
        vec2 occlusionTexCoords = TEXCOORD_OCCLUSION;
        #ifdef HAS_OCCLUSION_TEXTURE_TRANSFORM
            occlusionTexCoords = computeTextureTransform(occlusionTexCoords, u_occlusionTextureTransform);
        #endif
        material.occlusion = texture(u_occlusionTexture, occlusionTexCoords).r;
    #endif

    #ifdef HAS_EMISSIVE_TEXTURE
        material.emissive = getEmissiveFromTexture();
    #elif defined(HAS_EMISSIVE_FACTOR)
        material.emissive = u_emissiveFactor;
    #endif

    #if defined(LIGHTING_PBR) && defined(USE_SPECULAR_GLOSSINESS)
        setSpecularGlossiness(material);
    #elif defined(LIGHTING_PBR)
        float metalness = setMetallicRoughness(material);
        #ifdef USE_SPECULAR
            setSpecular(material, metalness);
        #endif
        #ifdef USE_ANISOTROPY
            setAnisotropy(material, normalInfo);
        #endif
        #ifdef USE_CLEARCOAT
            setClearcoat(material, attributes);
        #endif
    #endif
}
