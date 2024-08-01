/**
 * Compute some metrics for a procedural sky lighting model
 *
 * @param {vec3} positionWC The position of the fragment in world coordinates.
 * @param {vec3} reflectionWC A unit vector in the direction of the reflection, in world coordinates.
 * @return {vec3} The dot products of the horizon and reflection directions with the nadir, and an atmosphere boundary distance.
 */
vec3 getProceduralSkyMetrics(vec3 positionWC, vec3 reflectionWC)
{
    // Figure out if the reflection vector hits the ellipsoid
    float horizonDotNadir = 1.0 - min(1.0, czm_ellipsoidRadii.x / length(positionWC));
    float reflectionDotNadir = dot(reflectionWC, normalize(positionWC));
    float atmosphereHeight = 0.05;
    float smoothstepHeight = smoothstep(0.0, atmosphereHeight, horizonDotNadir);
    return vec3(horizonDotNadir, reflectionDotNadir, smoothstepHeight);
}

/**
 * Compute the diffuse irradiance for a procedural sky lighting model.
 *
 * @param {vec3} skyMetrics The dot products of the horizon and reflection directions with the nadir, and an atmosphere boundary distance.
 * @return {vec3} The computed diffuse irradiance.
 */
vec3 getProceduralDiffuseIrradiance(vec3 skyMetrics)
{
    vec3 blueSkyDiffuseColor = vec3(0.7, 0.85, 0.9); 
    float diffuseIrradianceFromEarth = (1.0 - skyMetrics.x) * (skyMetrics.y * 0.25 + 0.75) * skyMetrics.z;  
    float diffuseIrradianceFromSky = (1.0 - skyMetrics.z) * (1.0 - (skyMetrics.y * 0.25 + 0.25));
    return blueSkyDiffuseColor * clamp(diffuseIrradianceFromEarth + diffuseIrradianceFromSky, 0.0, 1.0);
}

/**
 * Compute the specular irradiance for a procedural sky lighting model.
 *
 * @param {vec3} reflectionWC The reflection vector in world coordinates.
 * @param {vec3} skyMetrics The dot products of the horizon and reflection directions with the nadir, and an atmosphere boundary distance.
 * @param {float} roughness The roughness of the material.
 * @return {vec3} The computed specular irradiance.
 */
vec3 getProceduralSpecularIrradiance(vec3 reflectionWC, vec3 skyMetrics, float roughness)
{
    // Flipping the X vector is a cheap way to get the inverse of czm_temeToPseudoFixed, since that's a rotation about Z.
    reflectionWC.x = -reflectionWC.x;
    reflectionWC = -normalize(czm_temeToPseudoFixed * reflectionWC);
    reflectionWC.x = -reflectionWC.x;

    float inverseRoughness = 1.0 - roughness;
    inverseRoughness *= inverseRoughness;
    vec3 sceneSkyBox = czm_textureCube(czm_environmentMap, reflectionWC).rgb * inverseRoughness;

    // Compute colors at different angles relative to the horizon
    vec3 belowHorizonColor = mix(vec3(0.1, 0.15, 0.25), vec3(0.4, 0.7, 0.9), skyMetrics.z);
    vec3 nadirColor = belowHorizonColor * 0.5;
    vec3 aboveHorizonColor = mix(vec3(0.9, 1.0, 1.2), belowHorizonColor, roughness * 0.5);
    vec3 blueSkyColor = mix(vec3(0.18, 0.26, 0.48), aboveHorizonColor, skyMetrics.y * inverseRoughness * 0.5 + 0.75);
    vec3 zenithColor = mix(blueSkyColor, sceneSkyBox, skyMetrics.z);

    // Compute blend zones
    float blendRegionSize = 0.1 * ((1.0 - inverseRoughness) * 8.0 + 1.1 - skyMetrics.x);
    float blendRegionOffset = roughness * -1.0;
    float farAboveHorizon = clamp(skyMetrics.x - blendRegionSize * 0.5 + blendRegionOffset, 1.0e-10 - blendRegionSize, 0.99999);
    float aroundHorizon = clamp(skyMetrics.x + blendRegionSize * 0.5, 1.0e-10 - blendRegionSize, 0.99999);
    float farBelowHorizon = clamp(skyMetrics.x + blendRegionSize * 1.5, 1.0e-10 - blendRegionSize, 0.99999);

    // Blend colors
    float notDistantRough = (1.0 - skyMetrics.x * roughness * 0.8);
    vec3 specularIrradiance = mix(zenithColor, aboveHorizonColor, smoothstep(farAboveHorizon, aroundHorizon, skyMetrics.y) * notDistantRough);
    specularIrradiance = mix(specularIrradiance, belowHorizonColor, smoothstep(aroundHorizon, farBelowHorizon, skyMetrics.y) * inverseRoughness);
    specularIrradiance = mix(specularIrradiance, nadirColor, smoothstep(farBelowHorizon, 1.0, skyMetrics.y) * inverseRoughness);

    return specularIrradiance;
}

#ifdef USE_SUN_LUMINANCE
float clampedDot(vec3 x, vec3 y)
{
    return clamp(dot(x, y), 0.001, 1.0);
}
/**
 * Sun luminance following the "CIE Clear Sky Model"
 * See page 40 of https://3dvar.com/Green2003Spherical.pdf
 *
 * @param {vec3} positionWC The position of the fragment in world coordinates.
 * @param {vec3} normalEC The surface normal in eye coordinates.
 * @param {vec3} lightDirectionEC Unit vector pointing to the light source in eye coordinates.
 * @return {float} The computed sun luminance.
 */
float getSunLuminance(vec3 positionWC, vec3 normalEC, vec3 lightDirectionEC)
{
    vec3 normalWC = normalize(czm_inverseViewRotation * normalEC);
    vec3 lightDirectionWC = normalize(czm_inverseViewRotation * lightDirectionEC);
    vec3 vWC = -normalize(positionWC);

    // Angle between sun and zenith.
    float LdotZenith = clampedDot(lightDirectionWC, vWC);
    float S = acos(LdotZenith);
    // Angle between zenith and current pixel
    float NdotZenith = clampedDot(normalWC, vWC);
    // Angle between sun and current pixel
    float NdotL = clampedDot(normalEC, lightDirectionEC);
    float gamma = acos(NdotL);

    float numerator = ((0.91 + 10.0 * exp(-3.0 * gamma) + 0.45 * NdotL * NdotL) * (1.0 - exp(-0.32 / NdotZenith)));
    float denominator = (0.91 + 10.0 * exp(-3.0 * S) + 0.45 * LdotZenith * LdotZenith) * (1.0 - exp(-0.32));
    return model_luminanceAtZenith * (numerator / denominator);
}
#endif

/**
 * Compute the light contribution from a procedural sky model
 *
 * @param {vec3} positionEC The position of the fragment in eye coordinates.
 * @param {vec3} normalEC The surface normal in eye coordinates.
 * @param {vec3} lightDirectionEC Unit vector pointing to the light source in eye coordinates.
 * @param {czm_modelMaterial} The material properties.
 * @return {vec3} The computed HDR color
 */
 vec3 proceduralIBL(
    vec3 positionEC,
    vec3 normalEC,
    vec3 lightDirectionEC,
    czm_modelMaterial material
) {
    vec3 viewDirectionEC = -normalize(positionEC);
    vec3 positionWC = vec3(czm_inverseView * vec4(positionEC, 1.0));
    vec3 reflectionWC = normalize(czm_inverseViewRotation * reflect(viewDirectionEC, normalEC));
    vec3 skyMetrics = getProceduralSkyMetrics(positionWC, reflectionWC);

    float roughness = material.roughness;
    vec3 f0 = material.specular;

    vec3 specularIrradiance = getProceduralSpecularIrradiance(reflectionWC, skyMetrics, roughness);
    float NdotV = abs(dot(normalEC, viewDirectionEC)) + 0.001;
    vec2 brdfLut = texture(czm_brdfLut, vec2(NdotV, roughness)).rg;
    vec3 specularColor = czm_srgbToLinear(f0 * brdfLut.x + brdfLut.y);
    vec3 specularContribution = specularIrradiance * specularColor * model_iblFactor.y;
    #ifdef USE_SPECULAR
        specularContribution *= material.specularWeight;
    #endif

    vec3 diffuseIrradiance = getProceduralDiffuseIrradiance(skyMetrics);
    vec3 diffuseColor = material.diffuse;
    vec3 diffuseContribution = diffuseIrradiance * diffuseColor * model_iblFactor.x;

    vec3 iblColor = specularContribution + diffuseContribution;

    #ifdef USE_SUN_LUMINANCE
        iblColor *= getSunLuminance(positionWC, normalEC, lightDirectionEC);
    #endif

    return iblColor;
}

#ifdef DIFFUSE_IBL
vec3 computeDiffuseIBL(vec3 cubeDir)
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
        float maxLod = model_specularEnvironmentMapsMaximumLOD;
        float lod = roughness * maxLod;
        return czm_sampleOctahedralProjection(model_specularEnvironmentMaps, model_specularEnvironmentMapsSize, cubeDir, lod, maxLod);
    #else
        float maxLod = czm_specularEnvironmentMapsMaximumLOD;
        float lod = roughness * maxLod;
        return czm_sampleOctahedralProjection(czm_specularEnvironmentMaps, czm_specularEnvironmentMapSize, cubeDir, lod, maxLod);
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
 * Compute the light contributions from environment maps and spherical harmonic coefficients
 *
 * @param {vec3} viewDirectionEC Unit vector pointing from the fragment to the eye position
 * @param {vec3} normalEC The surface normal in eye coordinates
 * @param {vec3} lightDirectionEC Unit vector pointing to the light source in eye coordinates.
 * @param {czm_modelMaterial} The material properties.
 * @return {vec3} The computed HDR color
 */
vec3 textureIBL(
    vec3 viewDirectionEC,
    vec3 normalEC,
    vec3 lightDirectionEC,
    czm_modelMaterial material
) {
    #ifdef DIFFUSE_IBL
        vec3 normalMC = normalize(model_iblReferenceFrameMatrix * normalEC);
        vec3 diffuseContribution = computeDiffuseIBL(normalMC) * material.diffuse;
    #else
        vec3 diffuseContribution = vec3(0.0); 
    #endif

    #ifdef USE_ANISOTROPY
        // Bend normal to account for anisotropic distortion of specular reflection
        vec3 anisotropyDirection = material.anisotropicB;
        vec3 anisotropicTangent = cross(anisotropyDirection, viewDirectionEC);
        vec3 anisotropicNormal = cross(anisotropicTangent, anisotropyDirection);
        float bendFactor = 1.0 - material.anisotropyStrength * (1.0 - material.roughness);
        float bendFactorPow4 = bendFactor * bendFactor * bendFactor * bendFactor;
        vec3 bentNormal = normalize(mix(anisotropicNormal, normalEC, bendFactorPow4));
        vec3 reflectEC = reflect(-viewDirectionEC, bentNormal);
    #else
        vec3 reflectEC = reflect(-viewDirectionEC, normalEC);
    #endif

    #ifdef SPECULAR_IBL
        vec3 reflectMC = normalize(model_iblReferenceFrameMatrix * reflectEC);
        float NdotV = clamp(dot(normalEC, viewDirectionEC), 0.0, 1.0);
        vec3 f0 = material.specular;
        vec3 specularContribution = computeSpecularIBL(reflectMC, NdotV, f0, material.roughness);
    #else
        vec3 specularContribution = vec3(0.0); 
    #endif

    #ifdef USE_SPECULAR
        specularContribution *= material.specularWeight;
    #endif

    return diffuseContribution + specularContribution;
}
#endif
