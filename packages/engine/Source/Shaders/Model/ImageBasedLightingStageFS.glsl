#ifdef DIFFUSE_IBL
vec3 sampleDiffuseEnvironment(vec3 cubeDir)
{
    #ifdef CUSTOM_SPHERICAL_HARMONICS
        return czm_sphericalHarmonics(cubeDir, model_sphericalHarmonicCoefficients); 
    #else
        return czm_sphericalHarmonics(cubeDir, czm_sphericalHarmonicCoefficients); 
    #endif
}
#endif

#ifdef SPECULAR_IBL
vec3 sampleSpecularEnvironment(vec3 cubeDir, float roughness)
{
    #ifdef CUSTOM_SPECULAR_IBL
        float lod = roughness * model_specularEnvironmentMapsMaximumLOD;
        return czm_textureCube(model_specularEnvironmentMaps, cubeDir, lod).rgb;
    #else
        float lod = roughness * czm_specularEnvironmentMapsMaximumLOD;
        return czm_textureCube(czm_specularEnvironmentMaps, cubeDir, lod).rgb;
    #endif
}
vec3 computeSpecularIBL(vec3 cubeDir, float NdotV, vec3 f0, float roughness)
{
    // see https://bruop.github.io/ibl/ at Single Scattering Results
    // Roughness dependent fresnel, from Fdez-Aguera
    vec3 f90 = max(vec3(1.0 - roughness), f0);
    vec3 F = fresnelSchlick2(f0, f90, NdotV);

    vec2 brdfLut = texture(czm_brdfLut, vec2(NdotV, roughness)).rg;
    vec3 specularSample = sampleSpecularEnvironment(cubeDir, roughness);

    return specularSample * (F * brdfLut.x + brdfLut.y);
}
#endif

#if defined(DIFFUSE_IBL) || defined(SPECULAR_IBL)
/**
 * Compute the light contributions from environment maps and spherical harmonic coefficients.
 * See Fdez-Aguera, https://www.jcgt.org/published/0008/01/03/paper.pdf, for explanation
 * of the single- and multi-scattering terms.
 *
 * @param {vec3} viewDirectionEC Unit vector pointing from the fragment to the eye position.
 * @param {vec3} normalEC The surface normal in eye coordinates.
 * @param {czm_modelMaterial} The material properties.
 * @return {vec3} The computed HDR color.
 */
vec3 textureIBL(vec3 viewDirectionEC, vec3 normalEC, czm_modelMaterial material) {
    vec3 f0 = material.specular;
    float roughness = material.roughness;
    float specularWeight = 1.0;
    #ifdef USE_SPECULAR
        specularWeight = material.specularWeight;
    #endif
    float NdotV = clamp(dot(normalEC, viewDirectionEC), 0.0, 1.0);

    // see https://bruop.github.io/ibl/ at Single Scattering Results
    // Roughness dependent fresnel, from Fdez-Aguera
    vec3 f90 = max(vec3(1.0 - roughness), f0);
    vec3 singleScatterFresnel = fresnelSchlick2(f0, f90, NdotV);

    vec2 brdfLut = texture(czm_brdfLut, vec2(NdotV, roughness)).rg;
    vec3 FssEss = specularWeight * (singleScatterFresnel * brdfLut.x + brdfLut.y);

    #ifdef DIFFUSE_IBL
        vec3 normalMC = normalize(model_iblReferenceFrameMatrix * normalEC);
        vec3 irradiance = sampleDiffuseEnvironment(normalMC);

        vec3 averageFresnel = f0 + (1.0 - f0) / 21.0;
        float Ems = specularWeight * (1.0 - brdfLut.x - brdfLut.y);
        vec3 FmsEms = FssEss * averageFresnel * Ems / (1.0 - averageFresnel * Ems);
        vec3 dielectricScattering = (1.0 - FssEss - FmsEms) * material.diffuse;
        vec3 diffuseContribution = irradiance * (FmsEms + dielectricScattering) * model_iblFactor.x;
    #else
        vec3 diffuseContribution = vec3(0.0);
    #endif

    #ifdef USE_ANISOTROPY
        // Bend normal to account for anisotropic distortion of specular reflection
        vec3 anisotropyDirection = material.anisotropicB;
        vec3 anisotropicTangent = cross(anisotropyDirection, viewDirectionEC);
        vec3 anisotropicNormal = cross(anisotropicTangent, anisotropyDirection);
        float bendFactor = 1.0 - material.anisotropyStrength * (1.0 - roughness);
        float bendFactorPow4 = bendFactor * bendFactor * bendFactor * bendFactor;
        vec3 bentNormal = normalize(mix(anisotropicNormal, normalEC, bendFactorPow4));
        vec3 reflectEC = reflect(-viewDirectionEC, bentNormal);
    #else
        vec3 reflectEC = reflect(-viewDirectionEC, normalEC);
    #endif

    #ifdef SPECULAR_IBL
        vec3 reflectMC = normalize(model_iblReferenceFrameMatrix * reflectEC);
        vec3 radiance = sampleSpecularEnvironment(reflectMC, roughness);
        vec3 specularContribution = radiance * FssEss * model_iblFactor.y;
    #else
        vec3 specularContribution = vec3(0.0);
    #endif

    return diffuseContribution + specularContribution;
}
#endif
