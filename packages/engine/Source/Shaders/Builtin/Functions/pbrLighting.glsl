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
 * @param {float} bitangentRoughness Material roughness (along the anisotropy bitangent)
 * @param {float} tangentialRoughness Anisotropic roughness (along the anisotropy tangent)
 * @param {vec3} lightDirection The direction from the fragment to the light source, transformed to tangent-bitangent-normal coordinates
 * @param {vec3} viewDirection The direction from the fragment to the camera, transformed to tangent-bitangent-normal coordinates
 */
float smithVisibilityGGX_anisotropic(float bitangentRoughness, float tangentialRoughness, vec3 lightDirection, vec3 viewDirection)
{
    vec3 roughnessScale = vec3(tangentialRoughness, bitangentRoughness, 1.0);
    float GGXV = lightDirection.z * length(roughnessScale * viewDirection);
    float GGXL = viewDirection.z * length(roughnessScale * lightDirection);
    float v = 0.5 / (GGXV + GGXL);
    return clamp(v, 0.0, 1.0);
}

/**
 * @param {float} bitangentRoughness Material roughness (along the anisotropy bitangent)
 * @param {float} tangentialRoughness Anisotropic roughness (along the anisotropy tangent)
 * @param {vec3} halfwayDirection The unit vector halfway between light and view directions, transformed to tangent-bitangent-normal coordinates
 */
float GGX_anisotropic(float bitangentRoughness, float tangentialRoughness, vec3 halfwayDirection)
{
    float roughnessSquared = bitangentRoughness * tangentialRoughness;
    vec3 f = halfwayDirection * vec3(bitangentRoughness, tangentialRoughness, roughnessSquared);
    float w2 = roughnessSquared / dot(f, f);
    return roughnessSquared * w2 * w2 / czm_pi;
}
#endif

/**
 * Estimate the geometric self-shadowing of the microfacets in a surface,
 * using the Smith Joint GGX visibility function.
 * Note: Vis = G / (4 * NdotL * NdotV)
 * see Eric Heitz. 2014. Understanding the Masking-Shadowing Function in Microfacet-Based BRDFs. Journal of Computer Graphics Techniques, 3
 * see Real-Time Rendering. Page 331 to 336.
 * see https://google.github.io/filament/Filament.md.html#materialsystem/specularbrdf/geometricshadowing(specularg)
 *
 * @param {float} alphaRoughness The roughness of the material, expressed as the square of perceptual roughness.
 * @param {float} NdotL The cosine of the angle between the surface normal and the direction to the light source.
 * @param {float} NdotV The cosine of the angle between the surface normal and the direction to the camera.
 */
float smithVisibilityGGX(float alphaRoughness, float NdotL, float NdotV)
{
    float alphaRoughnessSq = alphaRoughness * alphaRoughness;

    float GGXV = NdotL * sqrt(NdotV * NdotV * (1.0 - alphaRoughnessSq) + alphaRoughnessSq);
    float GGXL = NdotV * sqrt(NdotL * NdotL * (1.0 - alphaRoughnessSq) + alphaRoughnessSq);

    float GGX = GGXV + GGXL;
    if (GGX > 0.0)
    {
        return 0.5 / GGX;
    }
    return 0.0;
}

/**
 * Estimate the fraction of the microfacets in a surface that are aligned with 
 * the halfway vector, which is aligned halfway between the directions from
 * the fragment to the camera and from the fragment to the light source.
 *
 * @param {float} alphaRoughness The roughness of the material, expressed as the square of perceptual roughness.
 * @param {float} NdotH The cosine of the angle between the surface normal and the halfway vector.
 * @return {float} The fraction of microfacets aligned to the halfway vector.
 */
float GGX(float alphaRoughness, float NdotH)
{
    float alphaRoughnessSquared = alphaRoughness * alphaRoughness;
    float f = (NdotH * alphaRoughnessSquared - NdotH) * NdotH + 1.0;
    return alphaRoughnessSquared / (czm_pi * f * f);
}

/**
 * Compute the strength of the specular reflection due to direct lighting.
 *
 * @param {vec3} normal The surface normal.
 * @param {vec3} lightDirection The unit vector pointing from the fragment to the light source.
 * @param {vec3} viewDirection The unit vector pointing from the fragment to the camera.
 * @param {vec3} halfwayDirection The unit vector pointing from the fragment to halfway between the light source and the camera.
 * @param {float} alphaRoughness The roughness of the material, expressed as the square of perceptual roughness.
 * @return {float} The strength of the specular reflection.
 */
float computeDirectSpecularStrength(vec3 normal, vec3 lightDirection, vec3 viewDirection, vec3 halfwayDirection, float alphaRoughness)
{
    float NdotL = clamp(dot(normal, lightDirection), 0.0, 1.0);
    float NdotV = clamp(dot(normal, viewDirection), 0.0, 1.0);
    float G = smithVisibilityGGX(alphaRoughness, NdotL, NdotV);
    float NdotH = clamp(dot(normal, halfwayDirection), 0.0, 1.0);
    float D = GGX(alphaRoughness, NdotH);
    return G * D;
}

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
 * @param {vec3} viewDirectionEC Unit vector pointing from the fragment to the eye position
 * @param {vec3} normalEC The surface normal in eye coordinates
 * @param {vec3} lightDirectionEC Unit vector pointing to the light source in eye coordinates.
 * @param {czm_modelMaterial} The material properties.
 * @return {vec3} The computed HDR color
 */
vec3 czm_pbrLighting(vec3 viewDirectionEC, vec3 normalEC, vec3 lightDirectionEC, czm_modelMaterial material)
{
    vec3 halfwayDirectionEC = normalize(viewDirectionEC + lightDirectionEC);
    float VdotH = clamp(dot(viewDirectionEC, halfwayDirectionEC), 0.0, 1.0);
    float NdotL = clamp(dot(normalEC, lightDirectionEC), 0.001, 1.0);

    vec3 f0 = material.specular;
    float reflectance = czm_maximumComponent(f0);
    // Typical dielectrics will have reflectance 0.04, so f90 will be 1.0.
    // In this case, at grazing angle, all incident energy is reflected.
    vec3 f90 = vec3(clamp(reflectance * 25.0, 0.0, 1.0));
    vec3 F = fresnelSchlick2(f0, f90, VdotH);

    #if defined(USE_SPECULAR)
        F *= material.specularWeight;
    #endif

    float alphaRoughness = material.roughness * material.roughness;
    #ifdef USE_ANISOTROPY
        mat3 tbn = mat3(material.anisotropicT, material.anisotropicB, normalEC);
        vec3 lightDirection = lightDirectionEC * tbn;
        vec3 viewDirection = viewDirectionEC * tbn;
        vec3 halfwayDirection = halfwayDirectionEC * tbn;
        float anisotropyStrength = material.anisotropyStrength;
        float tangentialRoughness = mix(alphaRoughness, 1.0, anisotropyStrength * anisotropyStrength);
        float bitangentRoughness = clamp(alphaRoughness, 0.001, 1.0);
        float G = smithVisibilityGGX_anisotropic(bitangentRoughness, tangentialRoughness, lightDirection, viewDirection);
        float D = GGX_anisotropic(bitangentRoughness, tangentialRoughness, halfwayDirection);
        vec3 specularContribution = F * G * D;
    #else
        float specularStrength = computeDirectSpecularStrength(normalEC, lightDirectionEC, viewDirectionEC, halfwayDirectionEC, alphaRoughness);
        vec3 specularContribution = F * specularStrength;
    #endif

    vec3 diffuseColor = material.diffuse;
    // F here represents the specular contribution
    vec3 diffuseContribution = (1.0 - F) * lambertianDiffuse(diffuseColor);

    // Lo = (diffuse + specular) * Li * NdotL
    return (diffuseContribution + specularContribution) * NdotL;
}
