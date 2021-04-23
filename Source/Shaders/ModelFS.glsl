#ifdef USE_LIGHTING
varying vec3 v_positionEC;
#endif

#ifdef USE_NORMAL
varying vec3 v_normalEC;
#endif

#ifdef USE_TANGENT
varying vec3 v_tangentEC;
varying vec3 v_bitangentEC;
#endif

#ifdef USE_TEXCOORD_0
varying vec2 v_texcoord_0;
#endif

#ifdef USE_TEXCOORD_1
varying vec2 v_texcoord_1;
#endif

#ifdef USE_COLOR
varying vec4 v_color;
#endif

#if defined(USE_FEATURE_ID_0) && (defined(CPU_STYLING_FRAG_SHADER) || defined(GPU_STYLING_FRAG_SHADER))
varying float v_feature_id_0;
#endif

#if defined(USE_FEATURE_ID_1) && (defined(CPU_STYLING_FRAG_SHADER) || defined(GPU_STYLING_FRAG_SHADER))
varying float v_feature_id_1;
#endif

#ifdef HAS_METALLIC_ROUGHNESS
#ifdef HAS_BASE_COLOR_TEXTURE
uniform sampler2D u_baseColorTexture;
#endif
#ifdef HAS_METALLIC_ROUGHNESS_TEXTURE
uniform sampler2D u_metallicRoughnessTexture;
#endif
uniform vec4 u_baseColorFactor;
uniform float u_metallicFactor;
uniform float u_roughnessFactor;
#endif

#ifdef HAS_SPECULAR_GLOSSINESS
#ifdef HAS_DIFFUSE_TEXTURE
uniform sampler2D u_diffuseTexture;
#endif
#ifdef HAS_SPECULAR_GLOSINESS_TEXTURE
uniform sampler2D u_specularGlossinessTexture;
#endif
uniform vec4 u_diffuseFactor;
uniform vec3 u_specularFactor;
uniform float u_glossinessFactor;
#endif

void main()
{
    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
}