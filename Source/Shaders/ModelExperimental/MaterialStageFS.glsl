vec3 SRGBtoLINEAR3(vec3 srgbIn) 
{
    return pow(srgbIn, vec3(2.2));
}

vec4 SRGBtoLINEAR4(vec4 srgbIn) 
{
    vec3 linearOut = pow(srgbIn.rgb, vec3(2.2));
    return vec4(linearOut, srgbIn.a);
}

vec2 computeTextureTransform(vec2 texCoord, mat3 textureTransform)
{
    return vec2(textureTransform * vec3(texCoord, 1.0));
}

#ifdef HAS_NORMALS
vec3 computeNormal()
{
    vec3 ng = normalize(v_normal);

    vec3 normal = ng;
    #ifdef HAS_NORMAL_TEXTURE
    vec2 normalTexCoords = TEXCOORD_NORMAL;
        #ifdef HAS_NORMAL_TEXTURE_TRANSFORM
        normalTexCoords = computeTextureTransform(normalTexCoords, u_normalTextureTransform);
        #endif

        #ifdef HAS_TANGENTS
        // read tangents from varying
        vec3 t = normalize(v_tangent.xyz);
        vec3 b = normalize(cross(ng, t) * v_tangent.w);
        mat3 tbn = mat3(t, b, ng);
        vec3 n = texture2D(u_normalTexture, normalTexCoords).rgb;
        normal = normalize(tbn * (2.0 * n - 1.0));
        #elif defined(GL_OES_standard_derivatives)
        // Compute tangents
        vec3 pos_dx = dFdx(v_positionEC);
        vec3 pos_dy = dFdy(v_positionEC);
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

czm_modelMaterial materialStage(czm_modelMaterial inputMaterial)
{
    czm_modelMaterial material = inputMaterial;

    #ifdef HAS_NORMALS
    material.normal = computeNormal();
    #endif

    vec4 baseColorWithAlpha = vec4(1.0);
    // Regardless of whether we use PBR, set a base color
    #ifdef HAS_BASE_COLOR_TEXTURE
    vec2 baseColorTexCoords = TEXCOORD_BASE_COLOR;

        #ifdef HAS_BASE_COLOR_TEXTURE_TRANSFORM
        baseColorTexCoords = computeTextureTransform(baseColorTexCoords, u_baseColorTextureTransform);
        #endif

    baseColorWithAlpha = SRGBtoLINEAR4(texture2D(u_baseColorTexture, baseColorTexCoords));

        #ifdef HAS_BASE_COLOR_FACTOR
        baseColorWithAlpha *= u_baseColorFactor;
        #endif
    #elif defined(HAS_BASE_COLOR_FACTOR)
    baseColorWithAlpha = u_baseColorFactor;
    #endif

    #ifdef HAS_VERTEX_COLORS
    baseColorWithAlpha *= v_color_0;
    #endif

    material.diffuse = baseColorWithAlpha.rgb;
    material.alpha = baseColorWithAlpha.a;

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

    vec3 emissive = SRGBtoLINEAR3(texture2D(u_emissiveTexture, emissiveTexCoords).rgb);
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

        vec4 specularGlossiness = SRGBtoLINEAR4(texture2D(u_specularGlossinessTexture, specularGlossinessTexCoords));
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

        vec4 diffuse = SRGBtoLINEAR4(texture2D(u_diffuseTexture, diffuseTexCoords));
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

    return material;
}