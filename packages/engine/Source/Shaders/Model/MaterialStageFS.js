//This file is automatically rebuilt by the Cesium build process.
export default "// If the style color is white, it implies the feature has not been styled.\n\
bool isDefaultStyleColor(vec3 color)\n\
{\n\
    return all(greaterThan(color, vec3(1.0 - czm_epsilon3)));\n\
}\n\
\n\
vec3 blend(vec3 sourceColor, vec3 styleColor, float styleColorBlend)\n\
{\n\
    vec3 blendColor = mix(sourceColor, styleColor, styleColorBlend);\n\
    vec3 color = isDefaultStyleColor(styleColor.rgb) ? sourceColor : blendColor;\n\
    return color;\n\
}\n\
\n\
vec2 computeTextureTransform(vec2 texCoord, mat3 textureTransform)\n\
{\n\
    return vec2(textureTransform * vec3(texCoord, 1.0));\n\
}\n\
\n\
#ifdef HAS_NORMALS\n\
vec3 computeNormal(ProcessedAttributes attributes)\n\
{\n\
    // Geometry normal. This is already normalized \n\
    vec3 ng = attributes.normalEC;\n\
\n\
    vec3 normal = ng;\n\
    #if defined(HAS_NORMAL_TEXTURE) && !defined(HAS_WIREFRAME)\n\
    vec2 normalTexCoords = TEXCOORD_NORMAL;\n\
        #ifdef HAS_NORMAL_TEXTURE_TRANSFORM\n\
        normalTexCoords = computeTextureTransform(normalTexCoords, u_normalTextureTransform);\n\
        #endif\n\
\n\
        // If HAS_BITANGENTS is set, then HAS_TANGENTS is also set\n\
        #ifdef HAS_BITANGENTS\n\
        vec3 t = attributes.tangentEC;\n\
        vec3 b = attributes.bitangentEC;\n\
        mat3 tbn = mat3(t, b, ng);\n\
        vec3 n = texture(u_normalTexture, normalTexCoords).rgb;\n\
        normal = normalize(tbn * (2.0 * n - 1.0));\n\
        #elif (__VERSION__ == 300 || defined(GL_OES_standard_derivatives))\n\
        // If derivatives are available (not IE 10), compute tangents\n\
        vec3 positionEC = attributes.positionEC;\n\
        vec3 pos_dx = dFdx(positionEC);\n\
        vec3 pos_dy = dFdy(positionEC);\n\
        vec3 tex_dx = dFdx(vec3(normalTexCoords,0.0));\n\
        vec3 tex_dy = dFdy(vec3(normalTexCoords,0.0));\n\
        vec3 t = (tex_dy.t * pos_dx - tex_dx.t * pos_dy) / (tex_dx.s * tex_dy.t - tex_dy.s * tex_dx.t);\n\
        t = normalize(t - ng * dot(ng, t));\n\
        vec3 b = normalize(cross(ng, t));\n\
        mat3 tbn = mat3(t, b, ng);\n\
        vec3 n = texture(u_normalTexture, normalTexCoords).rgb;\n\
        normal = normalize(tbn * (2.0 * n - 1.0));\n\
        #endif\n\
    #endif\n\
\n\
    #ifdef HAS_DOUBLE_SIDED_MATERIAL\n\
    if (czm_backFacing()) {\n\
        normal = -normal;\n\
    }\n\
    #endif\n\
\n\
    return normal;\n\
}\n\
#endif\n\
\n\
void materialStage(inout czm_modelMaterial material, ProcessedAttributes attributes, SelectedFeature feature)\n\
{\n\
    #ifdef HAS_NORMALS\n\
    material.normalEC = computeNormal(attributes);\n\
    #endif\n\
\n\
    vec4 baseColorWithAlpha = vec4(1.0);\n\
    // Regardless of whether we use PBR, set a base color\n\
    #ifdef HAS_BASE_COLOR_TEXTURE\n\
    vec2 baseColorTexCoords = TEXCOORD_BASE_COLOR;\n\
\n\
        #ifdef HAS_BASE_COLOR_TEXTURE_TRANSFORM\n\
        baseColorTexCoords = computeTextureTransform(baseColorTexCoords, u_baseColorTextureTransform);\n\
        #endif\n\
\n\
    baseColorWithAlpha = czm_srgbToLinear(texture(u_baseColorTexture, baseColorTexCoords));\n\
\n\
        #ifdef HAS_BASE_COLOR_FACTOR\n\
        baseColorWithAlpha *= u_baseColorFactor;\n\
        #endif\n\
    #elif defined(HAS_BASE_COLOR_FACTOR)\n\
    baseColorWithAlpha = u_baseColorFactor;\n\
    #endif\n\
\n\
    #ifdef HAS_POINT_CLOUD_COLOR_STYLE\n\
    baseColorWithAlpha = v_pointCloudColor;\n\
    #elif defined(HAS_COLOR_0)\n\
    vec4 color = attributes.color_0;\n\
        // .pnts files store colors in the sRGB color space\n\
        #ifdef HAS_SRGB_COLOR\n\
        color = czm_srgbToLinear(color);\n\
        #endif\n\
    baseColorWithAlpha *= color;\n\
    #endif\n\
\n\
    material.diffuse = baseColorWithAlpha.rgb;\n\
    material.alpha = baseColorWithAlpha.a;\n\
\n\
    #ifdef USE_CPU_STYLING\n\
    material.diffuse = blend(material.diffuse, feature.color.rgb, model_colorBlend);\n\
    #endif\n\
\n\
    #ifdef HAS_OCCLUSION_TEXTURE\n\
    vec2 occlusionTexCoords = TEXCOORD_OCCLUSION;\n\
        #ifdef HAS_OCCLUSION_TEXTURE_TRANSFORM\n\
        occlusionTexCoords = computeTextureTransform(occlusionTexCoords, u_occlusionTextureTransform);\n\
        #endif\n\
    material.occlusion = texture(u_occlusionTexture, occlusionTexCoords).r;\n\
    #endif\n\
\n\
    #ifdef HAS_EMISSIVE_TEXTURE\n\
    vec2 emissiveTexCoords = TEXCOORD_EMISSIVE;\n\
        #ifdef HAS_EMISSIVE_TEXTURE_TRANSFORM\n\
        emissiveTexCoords = computeTextureTransform(emissiveTexCoords, u_emissiveTextureTransform);\n\
        #endif\n\
\n\
    vec3 emissive = czm_srgbToLinear(texture(u_emissiveTexture, emissiveTexCoords).rgb);\n\
        #ifdef HAS_EMISSIVE_FACTOR\n\
        emissive *= u_emissiveFactor;\n\
        #endif\n\
    material.emissive = emissive;\n\
    #elif defined(HAS_EMISSIVE_FACTOR)\n\
    material.emissive = u_emissiveFactor;\n\
    #endif\n\
\n\
    #if defined(LIGHTING_PBR) && defined(USE_SPECULAR_GLOSSINESS)\n\
        #ifdef HAS_SPECULAR_GLOSSINESS_TEXTURE\n\
        vec2 specularGlossinessTexCoords = TEXCOORD_SPECULAR_GLOSSINESS;\n\
          #ifdef HAS_SPECULAR_GLOSSINESS_TEXTURE_TRANSFORM\n\
          specularGlossinessTexCoords = computeTextureTransform(specularGlossinessTexCoords, u_specularGlossinessTextureTransform);\n\
          #endif\n\
\n\
        vec4 specularGlossiness = czm_srgbToLinear(texture(u_specularGlossinessTexture, specularGlossinessTexCoords));\n\
        vec3 specular = specularGlossiness.rgb;\n\
        float glossiness = specularGlossiness.a;\n\
            #ifdef HAS_SPECULAR_FACTOR\n\
            specular *= u_specularFactor;\n\
            #endif\n\
\n\
            #ifdef HAS_GLOSSINESS_FACTOR\n\
            glossiness *= u_glossinessFactor;\n\
            #endif\n\
        #else\n\
            #ifdef HAS_SPECULAR_FACTOR\n\
            vec3 specular = clamp(u_specularFactor, vec3(0.0), vec3(1.0));\n\
            #else\n\
            vec3 specular = vec3(1.0);\n\
            #endif\n\
\n\
            #ifdef HAS_GLOSSINESS_FACTOR\n\
            float glossiness = clamp(u_glossinessFactor, 0.0, 1.0);\n\
            #else\n\
            float glossiness = 1.0;\n\
            #endif\n\
        #endif\n\
\n\
        #ifdef HAS_DIFFUSE_TEXTURE\n\
        vec2 diffuseTexCoords = TEXCOORD_DIFFUSE;\n\
            #ifdef HAS_DIFFUSE_TEXTURE_TRANSFORM\n\
            diffuseTexCoords = computeTextureTransform(diffuseTexCoords, u_diffuseTextureTransform);\n\
            #endif\n\
\n\
        vec4 diffuse = czm_srgbToLinear(texture(u_diffuseTexture, diffuseTexCoords));\n\
            #ifdef HAS_DIFFUSE_FACTOR\n\
            diffuse *= u_diffuseFactor;\n\
            #endif\n\
        #elif defined(HAS_DIFFUSE_FACTOR)\n\
        vec4 diffuse = clamp(u_diffuseFactor, vec4(0.0), vec4(1.0));\n\
        #else\n\
        vec4 diffuse = vec4(1.0);\n\
        #endif\n\
    czm_pbrParameters parameters = czm_pbrSpecularGlossinessMaterial(\n\
      diffuse.rgb,\n\
      specular,\n\
      glossiness\n\
    );\n\
    material.diffuse = parameters.diffuseColor;\n\
    // the specular glossiness extension's alpha overrides anything set\n\
    // by the base material.\n\
    material.alpha = diffuse.a;\n\
    material.specular = parameters.f0;\n\
    material.roughness = parameters.roughness;\n\
    #elif defined(LIGHTING_PBR)\n\
        #ifdef HAS_METALLIC_ROUGHNESS_TEXTURE\n\
        vec2 metallicRoughnessTexCoords = TEXCOORD_METALLIC_ROUGHNESS;\n\
            #ifdef HAS_METALLIC_ROUGHNESS_TEXTURE_TRANSFORM\n\
            metallicRoughnessTexCoords = computeTextureTransform(metallicRoughnessTexCoords, u_metallicRoughnessTextureTransform);\n\
            #endif\n\
\n\
        vec3 metallicRoughness = texture(u_metallicRoughnessTexture, metallicRoughnessTexCoords).rgb;\n\
        float metalness = clamp(metallicRoughness.b, 0.0, 1.0);\n\
        float roughness = clamp(metallicRoughness.g, 0.04, 1.0);\n\
            #ifdef HAS_METALLIC_FACTOR\n\
            metalness *= u_metallicFactor;\n\
            #endif\n\
\n\
            #ifdef HAS_ROUGHNESS_FACTOR\n\
            roughness *= u_roughnessFactor;\n\
            #endif\n\
        #else\n\
            #ifdef HAS_METALLIC_FACTOR\n\
            float metalness = clamp(u_metallicFactor, 0.0, 1.0);\n\
            #else\n\
            float metalness = 1.0;\n\
            #endif\n\
\n\
            #ifdef HAS_ROUGHNESS_FACTOR\n\
            float roughness = clamp(u_roughnessFactor, 0.04, 1.0);\n\
            #else\n\
            float roughness = 1.0;\n\
            #endif\n\
        #endif\n\
    czm_pbrParameters parameters = czm_pbrMetallicRoughnessMaterial(\n\
      material.diffuse,\n\
      metalness,\n\
      roughness\n\
    );\n\
    material.diffuse = parameters.diffuseColor;\n\
    material.specular = parameters.f0;\n\
    material.roughness = parameters.roughness;\n\
    #endif\n\
}\n\
";
