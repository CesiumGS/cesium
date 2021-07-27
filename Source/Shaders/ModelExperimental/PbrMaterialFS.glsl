struct ModelMaterial {
  vec3 diffuseColor;
  vec3 specularColor;
  float roughness;
};

// either v_texCoord_0, v_texCoord 1, or one computed from a texture transform?
#define TEXCOORD_SPECULAR_GLOSSINESS v_texCoord_0
#define TEXCOORD_METALLIC_ROUGHNESS v_texCoord_0
#define TEXCOORD_DIFFUSE v_texCoord_0

uniform sampler2D u_specularGlossinessTexture

ModelMaterial makeModelMaterial() {
  ModelMaterial material;
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
  #endif
}