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

#ifdef HAS_NORMALS
vec3 computeNormal(ProcessedAttributes attributes)
{
    // Geometry normal. This is already normalized 
    vec3 ng = attributes.normalEC;

    vec3 normal = ng;
    #if defined(HAS_NORMAL_TEXTURE) && !defined(USE_WIREFRAME)
    vec2 normalTexCoords = TEXCOORD_NORMAL;
        #ifdef HAS_NORMAL_TEXTURE_TRANSFORM
        normalTexCoords = computeTextureTransform(normalTexCoords, u_normalTextureTransform);
        #endif

        // If HAS_BITANGENTS is set, then HAS_TANGENTS is also set
        #ifdef HAS_BITANGENTS
        vec3 t = attributes.tangentEC;
        vec3 b = attributes.bitangentEC;
        mat3 tbn = mat3(t, b, ng);
        vec3 n = texture2D(u_normalTexture, normalTexCoords).rgb;
        normal = normalize(tbn * (2.0 * n - 1.0));
        #elif defined(GL_OES_standard_derivatives)
        // Compute tangents
        vec3 positionEC = attributes.positionEC;
        vec3 pos_dx = dFdx(positionEC);
        vec3 pos_dy = dFdy(positionEC);
        vec3 tex_dx = dFdx(vec3(normalTexCoords,0.0));
        vec3 tex_dy = dFdy(vec3(normalTexCoords,0.0));
        vec3 t = (tex_dy.t * pos_dx - tex_dx.t * pos_dy) / (tex_dx.s * tex_dy.t - tex_dy.s * tex_dx.t);
        t = normalize(t - ng * dot(ng, t));
        vec3 b = normalize(cross(ng, t));
        mat3 tbn = mat3(t, b, ng);
        vec3 n = texture2D(u_normalTexture, normalTexCoords).rgb;
        normal = normalize(tbn * (2.0 * n - 1.0));
        #endif
    #endif

    return normal;
}
#endif

void materialStage(inout czm_modelMaterial material, ProcessedAttributes attributes, SelectedFeature feature)
{

    #ifdef HAS_NORMALS
    material.normalEC = computeNormal(attributes);
    #endif

    vec4 baseColorWithAlpha = vec4(1.0);
    // Regardless of whether we use PBR, set a base color
    #ifdef HAS_BASE_COLOR_TEXTURE
    vec2 baseColorTexCoords = TEXCOORD_BASE_COLOR;

        #ifdef HAS_BASE_COLOR_TEXTURE_TRANSFORM
        baseColorTexCoords = computeTextureTransform(baseColorTexCoords, u_baseColorTextureTransform);
        #endif

    baseColorWithAlpha = czm_srgbToLinear(texture2D(u_baseColorTexture, baseColorTexCoords));

        #ifdef HAS_BASE_COLOR_FACTOR
        baseColorWithAlpha *= u_baseColorFactor;
        #endif
    #elif defined(HAS_BASE_COLOR_FACTOR)
    baseColorWithAlpha = u_baseColorFactor;
    #endif

    #ifdef HAS_COLOR_0
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
    material.occlusion = texture2D(u_occlusionTexture, occlusionTexCoords).r;
    #endif

    #ifdef HAS_EMISSIVE_TEXTURE
    vec2 emissiveTexCoords = TEXCOORD_EMISSIVE;
        #ifdef HAS_EMISSIVE_TEXTURE_TRANSFORM
        emissiveTexCoords = computeTextureTransform(emissiveTexCoords, u_emissiveTextureTransform);
        #endif

    vec3 emissive = czm_srgbToLinear(texture2D(u_emissiveTexture, emissiveTexCoords).rgb);
        #ifdef HAS_EMISSIVE_FACTOR
        emissive *= u_emissiveFactor;
        #endif
    material.emissive = emissive;
    #elif defined(HAS_EMISSIVE_FACTOR)
    material.emissive = u_emissiveFactor;
    #endif

    #if defined(LIGHTING_PBR) && defined(USE_SPECULAR_GLOSSINESS)
        #ifdef HAS_SPECULAR_GLOSSINESS_TEXTURE
        vec2 specularGlossinessTexCoords = TEXCOORD_SPECULAR_GLOSSINESS;
          #ifdef HAS_SPECULAR_GLOSSINESS_TEXTURE_TRANSFORM
          specularGlossinessTexCoords = computeTextureTransform(specularGlossinessTexCoords, u_specularGlossinessTextureTransform);
          #endif

        vec4 specularGlossiness = czm_srgbToLinear(texture2D(u_specularGlossinessTexture, specularGlossinessTexCoords));
        vec3 specular = specularGlossiness.rgb;
        float glossiness = specularGlossiness.a;
            #ifdef HAS_SPECULAR_FACTOR
            specular *= u_specularFactor;
            #endif

            #ifdef HAS_GLOSSINESS_FACTOR
            glossiness *= u_glossinessFactor;
            #endif
        #else
            #ifdef HAS_SPECULAR_FACTOR
            vec3 specular = clamp(u_specularFactor, vec3(0.0), vec3(1.0));
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

        vec4 diffuse = czm_srgbToLinear(texture2D(u_diffuseTexture, diffuseTexCoords));
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
    #elif defined(LIGHTING_PBR)
        #ifdef HAS_METALLIC_ROUGHNESS_TEXTURE
        vec2 metallicRoughnessTexCoords = TEXCOORD_METALLIC_ROUGHNESS;
            #ifdef HAS_METALLIC_ROUGHNESS_TEXTURE_TRANSFORM
            metallicRoughnessTexCoords = computeTextureTransform(metallicRoughnessTexCoords, u_metallicRoughnessTextureTransform);
            #endif

        vec3 metallicRoughness = texture2D(u_metallicRoughnessTexture, metallicRoughnessTexCoords).rgb;
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
    #endif
}
