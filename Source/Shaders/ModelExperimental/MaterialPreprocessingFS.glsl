struct ModelMaterial {
  // base color / diffuse color. This includes alpha
  vec4 baseColor;
  vec3 specularColor;
  float roughness;
  vec3 normal;
  float occlusion;
  vec3 emssive;
};

ModelMaterial defaultModelMaterial() {
  ModelMaterial material;
  material.baseColor = vec4(1.0);
  material.specularColor = vec4(0.04); // dielectric (non-metal)
  material.roughness = 0.0;
  material.occlusion = 0.0;
  material.emissive = vec3(0.0);
}

// either v_texCoord_0, v_texCoord 1, or one computed from a texture transform?
#define TEXCOORD_SPECULAR_GLOSSINESS v_texCoord_0
#define TEXCOORD_METALLIC_ROUGHNESS v_texCoord_0
#define TEXCOORD_DIFFUSE v_texCoord_0

uniform sampler2D u_specularGlossinessTexture

vec3 SRGBtoLINEAR3(vec3 srgbIn) 
{
    return pow(srgbIn, vec3(2.2));
}

vec4 SRGBtoLINEAR4(vec4 srgbIn) 
{
    vec3 linearOut = pow(srgbIn.rgb, vec3(2.2));
    return vec4(linearOut, srgbIn.a);
}

ModelMaterial makeModelMaterial() {
  ModelMaterial material = defaultModelMaterial();

  // Regardless of whether we use PBR, set a base color
  #if defined(HAS_BASE_COLOR_TEXTURE)
  // Add base color to fragment shader
  vec4 baseColorWithAlpha = SRGBtoLINEAR4(texture2D(u_baseColorTexture, TEXCOORD_BASE_COLOR));
    #ifdef HAS_BASE_COLOR_FACTOR
    baseColorWithAlpha *= u_baseColorFactor;
    #endif
  material.baseColor = baseColorWithAlpha;
  #elif defined(HAS_BASE_COLOR_FACTOR)
  material.baseColor = u_baseColorFactor;
  #endif

  #ifdef HAS_VERTEX_COLORS
  material.baseColor *= v_vertexColor;
  #endif

  #ifdef HAS_OCCLUSION_TEXTURE
  material.occlusion = texture2D(u_occlusionTexture, OCCLUSION_TEXCOORD).r;
  #endif

  #if defined(HAS_EMISSIVE_TEXTURE)
  vec3 emissive = SRGBtoLINEAR3(texture2D(u_emissiveTexture, EMISSIVE_TEXCOORD).rgb);
    #ifdef HAS_EMISSIVE_FACTOR
    emissive *= u_emissiveFactor;
    #endif
  material.emissive = emissive;
  #elif defined(HAS_EMISSIVE_FACTOR)
  material.emissive = u_emissiveFactor;
  #endif

  #ifdef USE_SPECULAR_GLOSSINESS
    #if defined(HAS_SPECULAR_GLOSSINESS_TEXTURE)
    vec4 specularGlossiness = SRGBtoLINEAR4(texture2D(u_specularGlossinessTexture, TEXCOORD_SPECULAR_GLOSSINESS));
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

    #if defined(HAS_DIFFUSE_TEXTURE)
    vec4 diffuse = SRGBtoLINEAR4(texture2D(u_diffuseTexture, TEXCOORD_DIFFUSE));
      #ifdef HAS_DIFFUSE_FACTOR
      diffuse *= u_diffuseFactor;
      #endif
    #elif defined(HAS_DIFFUSE_FACTOR)
    vec4 diffuse = clamp(u_diffuseFactor, vec4(0.0), vec4(1.0));
    #else
    vec4 diffuse = vec4(1.0);
    #endif

  // TODO: Do we need this struct anymore?
  czm_pbrParameters parameters = czm_pbrSpecularGlossinessMaterial(
    diffuse.rgb,
    specular,
    glossiness
  );
  material.baseColor = parameters.diffuseColor;
  material.specular = parameters.f0;
  material.roughness = parameters.roughness;
  #else
    #if defined(HAS_METALLIC_ROUGHNESS_TEXTURE)
    vec3 metallicRoughness = texture2D(u_metallicRoughnessTexture, TEXCOORD_METALLIC_ROUGHNESS).rgb;
    float metalness = clamp(metallicRoughness.b, 0.0, 1.0);
    float roughness = clamp(metallicRoughness.g, 0.04, 1.0);
      #ifdef HAS_METALLIC_FACTOR
      metalness *= u_metallicFactor;
      #endif

      #ifdef HAS_ROUGHNESS_FACTOR
      roughness *= u_roughnessFactor;
      #endif
    #else 
      #if defined(HAS_METALLIC_FACTOR)
      float metalness = clamp(u_metallicFactor, 0.0, 1.0);
      #else
      float metalness = 1.0;
      #endif

      #if defined(USE_ROUGHNESS_FACTOR)
      float roughness = clamp(u_roughnessFactor, 0.04, 1.0);
      #else
      float roughness = 1.0;
      #endif
    #endif

  // TODO: Do we need this struct anymore?
  czm_pbrParameters parameters = czm_pbrSpecularGlossinessMaterial(
    baseColor.rgb,
    metallic,
    roughness
  );
  material.baseColor = parameters.diffuseColor;
  material.specular = parameters.f0;
  material.roughness = parameters.roughness;
  #endif

  return material;
}