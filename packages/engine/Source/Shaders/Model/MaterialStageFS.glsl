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

#if defined(HAS_NORMAL_TEXTURE) && !defined(HAS_WIREFRAME)
vec3 getNormalFromTexture(ProcessedAttributes attributes, vec3 geometryNormal)
{
    vec2 normalTexCoords = TEXCOORD_NORMAL;
    #ifdef HAS_NORMAL_TEXTURE_TRANSFORM
        normalTexCoords = computeTextureTransform(normalTexCoords, u_normalTextureTransform);
    #endif

    // If HAS_BITANGENTS is set, then HAS_TANGENTS is also set
    #ifdef HAS_BITANGENTS
        vec3 t = attributes.tangentEC;
        vec3 b = attributes.bitangentEC;
        mat3 tbn = mat3(t, b, geometryNormal);
        vec3 n = texture(u_normalTexture, normalTexCoords).rgb;
        vec3 textureNormal = normalize(tbn * (2.0 * n - 1.0));
    #elif (__VERSION__ == 300 || defined(GL_OES_standard_derivatives))
        // If derivatives are available (not IE 10), compute tangents
        vec3 positionEC = attributes.positionEC;
        vec3 pos_dx = dFdx(positionEC);
        vec3 pos_dy = dFdy(positionEC);
        vec3 tex_dx = dFdx(vec3(normalTexCoords,0.0));
        vec3 tex_dy = dFdy(vec3(normalTexCoords,0.0));
        vec3 t = (tex_dy.t * pos_dx - tex_dx.t * pos_dy) / (tex_dx.s * tex_dy.t - tex_dy.s * tex_dx.t);
        t = normalize(t - geometryNormal * dot(geometryNormal, t));
        vec3 b = normalize(cross(geometryNormal, t));
        mat3 tbn = mat3(t, b, geometryNormal);
        vec3 n = texture(u_normalTexture, normalTexCoords).rgb;
        vec3 textureNormal = normalize(tbn * (2.0 * n - 1.0));
    #endif

    return textureNormal;
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
    czm_pbrParameters parameters = czm_pbrSpecularGlossinessMaterial(
        diffuse.rgb,
        specular,
        glossiness
    );
    material.diffuse = parameters.diffuseColor;
    // the specular glossiness extension's alpha overrides anything set
    // by the base material.
    material.alpha = diffuse.a;
    material.specular = parameters.f0;
    material.roughness = parameters.roughness;
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
        float roughness = clamp(metallicRoughness.g, 0.04, 1.0);
        #ifdef HAS_METALLIC_FACTOR
            metalness *= u_metallicFactor;
        #endif

        #ifdef HAS_ROUGHNESS_FACTOR
            roughness *= u_roughnessFactor;
        #endif
    #else
        #ifdef HAS_METALLIC_FACTOR
            float metalness = clamp(u_metallicFactor, 0.0, 1.0);
        #else
            float metalness = 1.0;
        #endif

        #ifdef HAS_ROUGHNESS_FACTOR
            float roughness = clamp(u_roughnessFactor, 0.04, 1.0);
        #else
            float roughness = 1.0;
        #endif
    #endif
    czm_pbrParameters parameters = czm_pbrMetallicRoughnessMaterial(
        material.diffuse,
        metalness,
        roughness
    );
    material.diffuse = parameters.diffuseColor;
    material.specular = parameters.f0;
    material.roughness = parameters.roughness;

    return metalness;
}
#if defined(USE_SPECULAR)
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
        vec3 specularColorFactor = texture(u_specularColorTexture, specularColorTexCoords).rgb;
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
    material.specular = mix(dielectricSpecularF0, material.diffuse, metalness);
}
#endif
#endif

void materialStage(inout czm_modelMaterial material, ProcessedAttributes attributes, SelectedFeature feature)
{
    #ifdef HAS_NORMALS
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

    material.diffuse = baseColorWithAlpha.rgb;
    material.alpha = baseColorWithAlpha.a;

    #ifdef USE_CPU_STYLING
        material.diffuse = blend(material.diffuse, feature.color.rgb, model_colorBlend);
    #endif

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
        #if defined(USE_SPECULAR)
            setSpecular(material, metalness);
        #endif
    #endif
}
