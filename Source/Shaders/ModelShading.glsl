const float GAMMA = 2.2;
const float INV_GAMMA = 1.0 / GAMMA;

vec4 linearTosRGB(vec4 linearIn)
{
    #ifdef HDR
        return linearIn;
    #else
        return vec4(pow(linearIn.xyz, vec3(INV_GAMMA), linearIn.a);
    #endif
}

vec3 sRGBToLinear(vec3 srgbIn)
{
    return vec3(pow(srgbIn.xyz, vec3(GAMMA)));
}

vec4 sRGBToLinear(vec4 srgbIn)
{
    return vec4(sRGBToLinear(srgbIn.xyz), srgbIn.w);
}

vec3 applyTonemapping(vec3 linearIn)
{
#ifndef HDR
return czm_acesTonemapping(linearIn);
#else
return linearIn;
#endif
}


#ifdef USE_DIFFUSE_TEXTURE
#ifdef DIFFUSE_TEXCOORD_0
#define DIFFUSE_TEXCOORD texCoord0
#else
#define DIFFUSE_TEXCOORD texCoord1
#endif
#endif

#ifdef USE_SPECULAR_GLOSSINESS_TEXTURE
#ifdef SPECULAR_GLOSSINESS_TEXCOORD_0
#define SPECULAR_GLOSSINESS_TEXCOORD texCoord0
#else
#define SPECULAR_GLOSSINESS_TEXCOORD texCoord1
#endif
#endif

#ifdef USE_BASE_COLOR_TEXTURE
#ifdef BASE_COLOR_TEXCOORD_0
#define BASE_COLOR_TEXCOORD texCoord0
#else
#define BASE_COLOR_TEXCOORD texCoord1
#endif
#endif

#ifdef USE_METALLIC_ROUGHNESS_TEXTURE
#ifdef METALLIC_ROUGHNESS_TEXCOORD_0
#define METALLIC_ROUGHNESS_TEXCOORD texCoord0
#else
#define METALLIC_ROUGHNESS_TEXCOORD texCoord1
#endif
#endif

#ifdef USE_EMISSIVE_TEXTURE
#ifdef EMISSIVE_TEXCOORD_0
#define EMISSIVE_TEXCOORD texCoord0
#else
#define EMISSIVE_TEXCOORD texCoord1
#endif
#endif

#ifdef USE_NORMAL_TEXTURE
#ifdef NORMAL_TEXCOORD_0
#define NORMAL_TEXCOORD texCoord0
#else
#define NORMAL_TEXCOORD texCoord1
#endif
#endif

#ifdef USE_OCCLUSION_TEXTURE
#ifdef OCCLUSION_TEXCOORD_0
#define OCCLUSION_TEXCOORD texCoord0
#else
#define OCCLUSION_TEXCOORD texCoord1
#endif
#endif

#ifdef USE_DIFFUSE_TEXTURE
vec2 getDiffuseTexCoord(vec2 texCoord)
{
    #ifdef USE_DIFFUSE_TEXTURE_TRANSFORM
        return vec2(vec3(texCoord, 1.0) * u_diffuseTextureTransform);
    #else
        return texCoord;
    #endif
}
#endif

#ifdef USE_SPECULAR_GLOSSINESS_TEXTURE
vec2 getSpecularGlossinessTexCoord(vec2 texCoord)
{
    #ifdef USE_SPECULAR_GLOSSINESS_TEXTURE_TRANSFORM
        return vec2(vec3(texCoord, 1.0) * u_specularGlossinessTextureTransform);
    #else
        return texCoord;
    #endif
}
#endif

#ifdef USE_BASE_COLOR_TEXTURE
vec2 getBaseColorTexCoord(vec2 texCoord)
{
    #ifdef USE_BASE_COLOR_TEXTURE_TRANSFORM
        return vec2(vec3(texCoord, 1.0) * u_baseColorTextureTransform);
    #else
        return texCoord;
    #endif
}
#endif

#ifdef USE_METALLIC_ROUGHNESS_TEXTURE
vec2 getMetallicRoughnessTexCoord(vec2 texCoord)
{
    #ifdef USE_METALLIC_ROUGHNESS_TEXTURE_TRANSFORM
        return vec2(vec3(texCoord, 1.0) * u_metallicRoughnessTextureTransform);
    #else
        return texCoord;
    #endif
}
#endif

#ifdef USE_EMISSIVE_TEXTURE
vec2 getEmissiveTexCoord(vec2 texCoord)
{
    #ifdef USE_EMISSIVE_TEXTURE_TRANSFORM
        return vec2(vec3(texCoord, 1.0) * u_emissiveTextureTransform);
    #else
        return texCoord;
    #endif
}
#endif

#ifdef USE_NORMAL_TEXTURE
vec2 getNormalTexCoord(vec2 texCoord)
{
    #ifdef USE_NORMAL_TEXTURE_TRANSFORM
        return vec2(vec3(texCoord, 1.0) * u_normalTextureTransform);
    #else
        return texCoord;
    #endif
}
#endif

#ifdef USE_OCCLUSION_TEXTURE
vec2 getOcclusionTexCoord(vec2 texCoord)
{
    #ifdef USE_OCCLUSION_TEXTURE_TRANSFORM
        return vec2(vec3(texCoord, 1.0) * u_occlusionTextureTransform);
    #else
        return texCoord;
    #endif
}
#endif

vec4 getColor(
    positionEC,
    #ifdef USE_NORMAL
        normalEC,
    #endif
    #ifdef USE_TANGENT
        tangentEC,
        bitangentEC,
    #endif
    #ifdef USE_TEXCOORD_0
        texCoord0,
    #endif
    #ifdef USE_TEXCOORD_1
        texCoord1,
    #endif
    #ifdef USE_VERTEX_COLOR
        vertexColor
    #endif
)
{
    vec4 color(1.0);

    #ifdef USE_BASE_COLOR_TEXTURE
        vec2 baseColorTexCoord = getBaseColorTexCoord(BASE_COLOR_TEXCOORD);
        color *= sRGBToLinear(texture2D(u_baseColorTexture, baseColorTexCoord));
    #elif USE_DIFFUSE_TEXTURE
        vec2 diffuseTexCoord = getDiffuseTexCoord(DIFFUSE_TEXCOORD);
        color *= sRGBToLinear(texture2D(u_diffuseTexture, diffuseTexCoord));
    #endif

    #ifdef USE_BASE_COLOR_FACTOR
        color *= u_baseColorFactor;
    #elif USE_DIFFUSE_FACTOR
        color *= u_diffuseFactor;
    #endif

    #ifdef USE_VERTEX_COLOR
        color *= vertexColor;
    #endif

    #if defined(USE_UNLIT_SHADER)
        return color;
    #endif

    #if defined(USE_NORMAL_TEXTURE)
        vec2 normalTexCoord = getNormalTexCoord(NORMAL_TEXCOORD);
        vec3 normal = texture2D(u_normalTexture, normalTexCoord).rgb;
        normal = normalize(normal * 2.0 - vec3(1.0));
        
        normalEC = mat3(tangentEC, bitangentEC, normalEC) * normal;
    #endif

    vec3 emissive(1.0);
    float occlusion = 1.0;

    #ifdef USE_EMISSIVE_TEXTURE
        vec3 emissiveTexCoord = getEmissiveTexCoord(EMISSIVE_TEXCOORD);
        emissive *= sRGBToLinear(texture2D(u_emissiveTexture, emissiveTexCoord).rgb);
    #endif

    #ifdef USE_EMISSIVE_FACTOR
        emissive *= u_emissiveFactor;
    #endif

    #ifdef USE_OCCLUSION_TEXTURE
        vec2 occlusionTexCoord = getOcclusionTexCoord(OCCLUSION_TEXCOORD);
        occlusion *= texture2D(u_occlusionTexture, occlusionTexCoord).r;
    #endif

    #ifdef USE_PBR_METALLIC_ROUGHNESS
        vec4 baseColor(1.0);
        float metallic = 1.0;
        float roughness = 1.0;

        #ifdef USE_METALLIC_ROUGHNESS_TEXTURE
            vec2 metallicRoughnessTexCoord = getMetallicRoughnessTexCoord(METALLIC_ROUGHNESS_TEXCOORD);
            vec2 metallicRoughness = texture2D(u_metallicRoughnessTexture, metallicRoughnessTexCoord).gb;
            metallic *= metallicRoughness.x;
            roughness *= metallicRoughness.y;
        #endif

        #ifdef USE_METALLIC_FACTOR
            metallic *= u_metallicRoughnessFactor.x;
        #endif

        #ifdef USE_ROUGHNESS_FACTOR
            roughness *= u_metallicRoughnessFactor.y;
        #endif

        return czm_pbrMetallicRoughness(
            normalEC,
            czm_lightDirectionEC,
            czm_lightColorHdr,
            color,
            metallic,
            roughness,
            emissive,
            occlusion
        );
    #endif

    #ifdef USE_PBR_SPECULAR_GLOSSINESS
        vec3 specular(1.0);
        float glossiness = 1.0;

        #ifdef USE_SPECULAR_GLOSSINESS_TEXTURE
            vec2 specularGlossinessTexCoord = getSpecularGlossinessTexCoord(SPECULAR_GLOSSINESS_TEXCOORD);
            vec4 specularGlossiness = sRGBToLinear(texture2D(u_specularGlossinesTexture, specularGlossinessTexCoord));
            specular *= specularGlossiness.rgb;
            glossiness *= specularGlossiness.a;
        #endif

        #ifdef USE_SPECULAR_FACTOR
            specular *= u_specularFactor;
        #endif

        #ifdef USE_GLOSSINESS_FACTOR
            glossiness *= u_glossinessFactor;
        #endif

        return czm_pbrSpecularGlossiness(
            normalEC,
            czm_lightDirectionEC,
            czm_lightColorHdr,
            color,
            specular,
            glossiness,
            emissive,
            occlusion
        );
    #endif
}
