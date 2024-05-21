vec3 lambertianDiffuse(vec3 diffuseColor)
{
    return diffuseColor / czm_pi;
}

vec3 fresnelSchlick2(vec3 f0, vec3 f90, float VdotH)
{
    float versine = 1.0 - VdotH;
    // pow(versine, 5.0) is slow. See https://stackoverflow.com/a/68793086/10082269
    float versineSquared = versine * versine;
    return f0 + (f90 - f0) * versineSquared * versineSquared * versine;
}

#ifdef USE_ANISOTROPY
/**
 * @param {float} roughness Material roughness (along the anisotropy bitangent)
 * @param {float} tangentialRoughness Anisotropic roughness (along the anisotropy tangent)
 * @param {vec3} lightDirection The direction from the fragment to the light source, transformed to tangent-bitangent-normal coordinates
 * @param {vec3} viewDirection The direction from the fragment to the camera, transformed to tangent-bitangent-normal coordinates
 */
float smithVisibilityGGX_anisotropic(float roughness, float tangentialRoughness, vec3 lightDirection, vec3 viewDirection)
{
    vec3 roughnessScale = vec3(tangentialRoughness, roughness, 1.0);
    float GGXV = lightDirection.z * length(roughnessScale * viewDirection);
    float GGXL = viewDirection.z * length(roughnessScale * lightDirection);
    float v = 0.5 / (GGXV + GGXL);
    return clamp(v, 0.0, 1.0);
}

/**
 * @param {float} roughness Material roughness (along the anisotropy bitangent)
 * @param {float} tangentialRoughness Anisotropic roughness (along the anisotropy tangent)
 * @param {vec3} halfwayDirection The unit vector halfway between light and view directions, transformed to tangent-bitangent-normal coordinates
 */
float GGX_anisotropic(float roughness, float tangentialRoughness, vec3 halfwayDirection)
{
    float roughnessSquared = roughness * tangentialRoughness;
    vec3 f = halfwayDirection * vec3(roughness, tangentialRoughness, roughnessSquared);
    float w2 = roughnessSquared / dot(f, f);
    return roughnessSquared * w2 * w2 / czm_pi;
}
#else
float smithVisibilityG1(float NdotV, float roughness)
{
    // this is the k value for direct lighting.
    // for image based lighting it will be roughness^2 / 2
    float k = (roughness + 1.0) * (roughness + 1.0) / 8.0;
    return NdotV / (NdotV * (1.0 - k) + k);
}

/**
 * geometric shadowing function
 * TODO: explain
 */
float smithVisibilityGGX(float roughness, float NdotL, float NdotV)
{
    return (
        smithVisibilityG1(NdotL, roughness) *
        smithVisibilityG1(NdotV, roughness)
    ) / (4.0 * NdotL * NdotV);
}

/**
 * microfacet distribution function
 * TODO: explain
 */
float GGX(float roughness, float NdotH)
{
    float roughnessSquared = roughness * roughness;
    float f = (NdotH * roughnessSquared - NdotH) * NdotH + 1.0;
    return roughnessSquared / (czm_pi * f * f);
}
#endif

/**
 * Compute the diffuse and specular contributions using physically based
 * rendering. This function only handles direct lighting.
 * <p>
 * This function only handles the lighting calculations. Metallic/roughness
 * and specular/glossy must be handled separately. See {@MaterialStageFS}
 * </p>
 *
 * @name czm_pbrLighting
 * @glslFunction
 *
 * @param {vec3} positionEC The position of the fragment in eye coordinates
 * @param {vec3} normalEC The surface normal in eye coordinates
 * @param {vec3} lightDirectionEC Unit vector pointing to the light source in eye coordinates.
 * @param {vec3} lightColorHdr radiance of the light source. This is a HDR value.
 * @param {czm_modelMaterial} The material properties.
 * @return {vec3} The computed HDR color
 */
vec3 czm_pbrLighting(
    vec3 positionEC,
    vec3 normalEC,
    vec3 lightDirectionEC,
    vec3 lightColorHdr,
    czm_modelMaterial material
)
{
    vec3 v = -normalize(positionEC);
    vec3 l = normalize(lightDirectionEC);
    vec3 h = normalize(v + l);
    vec3 n = normalEC;
    float VdotH = clamp(dot(v, h), 0.0, 1.0);

    vec3 f0 = material.specular;
    float reflectance = max(max(f0.r, f0.g), f0.b);
    // Typical dielectrics will have reflectance 0.04, so f90 will be 1.0.
    // In this case, at grazing angle, all incident energy is reflected.
    vec3 f90 = vec3(clamp(reflectance * 25.0, 0.0, 1.0));
    vec3 F = fresnelSchlick2(f0, f90, VdotH);

    #if defined(USE_SPECULAR)
        F *= material.specularWeight;
    #endif

    float alpha = material.roughness;
    #ifdef USE_ANISOTROPY
        mat3 tbn = mat3(material.anisotropicT, material.anisotropicB, n);
        vec3 lightDirection = l * tbn;
        vec3 viewDirection = v * tbn;
        vec3 halfwayDirection = h * tbn;
        float anisotropyStrength = material.anisotropyStrength;
        float tangentialRoughness = mix(alpha, 1.0, anisotropyStrength * anisotropyStrength);
        float G = smithVisibilityGGX_anisotropic(alpha, tangentialRoughness, lightDirection, viewDirection);
        float D = GGX_anisotropic(alpha, tangentialRoughness, halfwayDirection);
        float NdotL = clamp(lightDirection.z, 0.001, 1.0);
    #else
        float NdotL = clamp(dot(n, l), 0.001, 1.0);
        float NdotV = abs(dot(n, v)) + 0.001;
        float NdotH = clamp(dot(n, h), 0.0, 1.0);
        float G = smithVisibilityGGX(alpha, NdotL, NdotV);
        float D = GGX(alpha, NdotH);
    #endif

    vec3 specularContribution = F * G * D;

    vec3 diffuseColor = material.diffuse;
    // F here represents the specular contribution
    vec3 diffuseContribution = (1.0 - F) * lambertianDiffuse(diffuseColor);

    // Lo = (diffuse + specular) * Li * NdotL
    return (diffuseContribution + specularContribution) * NdotL * lightColorHdr;
}
