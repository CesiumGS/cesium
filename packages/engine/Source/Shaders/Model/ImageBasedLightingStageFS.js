//This file is automatically rebuilt by the Cesium build process.
export default "vec3 proceduralIBL(\n\
    vec3 positionEC,\n\
    vec3 normalEC,\n\
    vec3 lightDirectionEC,\n\
    vec3 lightColorHdr,\n\
    czm_pbrParameters pbrParameters\n\
) {\n\
    vec3 v = -positionEC;\n\
    vec3 positionWC = vec3(czm_inverseView * vec4(positionEC, 1.0));\n\
    vec3 vWC = -normalize(positionWC);\n\
    vec3 l = normalize(lightDirectionEC);\n\
    vec3 n = normalEC;\n\
    vec3 r = normalize(czm_inverseViewRotation * normalize(reflect(v, n)));\n\
\n\
    float NdotL = clamp(dot(n, l), 0.001, 1.0);\n\
    float NdotV = abs(dot(n, v)) + 0.001;\n\
\n\
    // Figure out if the reflection vector hits the ellipsoid\n\
    float vertexRadius = length(positionWC);\n\
    float horizonDotNadir = 1.0 - min(1.0, czm_ellipsoidRadii.x / vertexRadius);\n\
    float reflectionDotNadir = dot(r, normalize(positionWC));\n\
    // Flipping the X vector is a cheap way to get the inverse of czm_temeToPseudoFixed, since that's a rotation about Z.\n\
    r.x = -r.x;\n\
    r = -normalize(czm_temeToPseudoFixed * r);\n\
    r.x = -r.x;\n\
\n\
    vec3 diffuseColor = pbrParameters.diffuseColor;\n\
    float roughness = pbrParameters.roughness;\n\
    vec3 specularColor = pbrParameters.f0;\n\
\n\
    float inverseRoughness = 1.04 - roughness;\n\
    inverseRoughness *= inverseRoughness;\n\
    vec3 sceneSkyBox = textureCube(czm_environmentMap, r).rgb * inverseRoughness;\n\
\n\
    float atmosphereHeight = 0.05;\n\
    float blendRegionSize = 0.1 * ((1.0 - inverseRoughness) * 8.0 + 1.1 - horizonDotNadir);\n\
    float blendRegionOffset = roughness * -1.0;\n\
    float farAboveHorizon = clamp(horizonDotNadir - blendRegionSize * 0.5 + blendRegionOffset, 1.0e-10 - blendRegionSize, 0.99999);\n\
    float aroundHorizon = clamp(horizonDotNadir + blendRegionSize * 0.5, 1.0e-10 - blendRegionSize, 0.99999);\n\
    float farBelowHorizon = clamp(horizonDotNadir + blendRegionSize * 1.5, 1.0e-10 - blendRegionSize, 0.99999);\n\
    float smoothstepHeight = smoothstep(0.0, atmosphereHeight, horizonDotNadir);\n\
    vec3 belowHorizonColor = mix(vec3(0.1, 0.15, 0.25), vec3(0.4, 0.7, 0.9), smoothstepHeight);\n\
    vec3 nadirColor = belowHorizonColor * 0.5;\n\
    vec3 aboveHorizonColor = mix(vec3(0.9, 1.0, 1.2), belowHorizonColor, roughness * 0.5);\n\
    vec3 blueSkyColor = mix(vec3(0.18, 0.26, 0.48), aboveHorizonColor, reflectionDotNadir * inverseRoughness * 0.5 + 0.75);\n\
    vec3 zenithColor = mix(blueSkyColor, sceneSkyBox, smoothstepHeight);\n\
    vec3 blueSkyDiffuseColor = vec3(0.7, 0.85, 0.9); \n\
    float diffuseIrradianceFromEarth = (1.0 - horizonDotNadir) * (reflectionDotNadir * 0.25 + 0.75) * smoothstepHeight;  \n\
    float diffuseIrradianceFromSky = (1.0 - smoothstepHeight) * (1.0 - (reflectionDotNadir * 0.25 + 0.25));\n\
    vec3 diffuseIrradiance = blueSkyDiffuseColor * clamp(diffuseIrradianceFromEarth + diffuseIrradianceFromSky, 0.0, 1.0);\n\
    float notDistantRough = (1.0 - horizonDotNadir * roughness * 0.8);\n\
    vec3 specularIrradiance = mix(zenithColor, aboveHorizonColor, smoothstep(farAboveHorizon, aroundHorizon, reflectionDotNadir) * notDistantRough);\n\
    specularIrradiance = mix(specularIrradiance, belowHorizonColor, smoothstep(aroundHorizon, farBelowHorizon, reflectionDotNadir) * inverseRoughness);\n\
    specularIrradiance = mix(specularIrradiance, nadirColor, smoothstep(farBelowHorizon, 1.0, reflectionDotNadir) * inverseRoughness);\n\
\n\
    // Luminance model from page 40 of http://silviojemma.com/public/papers/lighting/spherical-harmonic-lighting.pdf\n\
    #ifdef USE_SUN_LUMINANCE \n\
    // Angle between sun and zenith\n\
    float LdotZenith = clamp(dot(normalize(czm_inverseViewRotation * l), vWC), 0.001, 1.0);\n\
    float S = acos(LdotZenith);\n\
    // Angle between zenith and current pixel\n\
    float NdotZenith = clamp(dot(normalize(czm_inverseViewRotation * n), vWC), 0.001, 1.0);\n\
    // Angle between sun and current pixel\n\
    float gamma = acos(NdotL);\n\
    float numerator = ((0.91 + 10.0 * exp(-3.0 * gamma) + 0.45 * pow(NdotL, 2.0)) * (1.0 - exp(-0.32 / NdotZenith)));\n\
    float denominator = (0.91 + 10.0 * exp(-3.0 * S) + 0.45 * pow(LdotZenith,2.0)) * (1.0 - exp(-0.32));\n\
    float luminance = model_luminanceAtZenith * (numerator / denominator);\n\
    #endif \n\
\n\
    vec2 brdfLut = texture2D(czm_brdfLut, vec2(NdotV, roughness)).rg;\n\
    vec3 iblColor = (diffuseIrradiance * diffuseColor * model_iblFactor.x) + (specularIrradiance * czm_srgbToLinear(specularColor * brdfLut.x + brdfLut.y) * model_iblFactor.y);\n\
    float maximumComponent = max(max(lightColorHdr.x, lightColorHdr.y), lightColorHdr.z);\n\
    vec3 lightColor = lightColorHdr / max(maximumComponent, 1.0);\n\
    iblColor *= lightColor;\n\
\n\
    #ifdef USE_SUN_LUMINANCE \n\
    iblColor *= luminance;\n\
    #endif\n\
\n\
    return iblColor;\n\
}\n\
\n\
#if defined(DIFFUSE_IBL) || defined(SPECULAR_IBL)\n\
vec3 textureIBL(\n\
    vec3 positionEC,\n\
    vec3 normalEC,\n\
    vec3 lightDirectionEC,\n\
    czm_pbrParameters pbrParameters\n\
) {\n\
    vec3 diffuseColor = pbrParameters.diffuseColor;\n\
    float roughness = pbrParameters.roughness;\n\
    vec3 specularColor = pbrParameters.f0;\n\
\n\
    vec3 v = -positionEC;\n\
    vec3 n = normalEC;\n\
    vec3 l = normalize(lightDirectionEC);\n\
    vec3 h = normalize(v + l);\n\
\n\
    float NdotV = abs(dot(n, v)) + 0.001;\n\
    float VdotH = clamp(dot(v, h), 0.0, 1.0);\n\
\n\
    const mat3 yUpToZUp = mat3(\n\
        -1.0, 0.0, 0.0,\n\
        0.0, 0.0, -1.0, \n\
        0.0, 1.0, 0.0\n\
    ); \n\
    vec3 cubeDir = normalize(yUpToZUp * model_iblReferenceFrameMatrix * normalize(reflect(-v, n))); \n\
\n\
    #ifdef DIFFUSE_IBL \n\
        #ifdef CUSTOM_SPHERICAL_HARMONICS\n\
        vec3 diffuseIrradiance = czm_sphericalHarmonics(cubeDir, model_sphericalHarmonicCoefficients); \n\
        #else\n\
        vec3 diffuseIrradiance = czm_sphericalHarmonics(cubeDir, czm_sphericalHarmonicCoefficients); \n\
        #endif \n\
    #else \n\
    vec3 diffuseIrradiance = vec3(0.0); \n\
    #endif \n\
\n\
    #ifdef SPECULAR_IBL\n\
    vec3 r0 = specularColor.rgb;\n\
    float reflectance = max(max(r0.r, r0.g), r0.b);\n\
    vec3 r90 = vec3(clamp(reflectance * 25.0, 0.0, 1.0));\n\
    vec3 F = fresnelSchlick2(r0, r90, VdotH);\n\
    \n\
    vec2 brdfLut = texture2D(czm_brdfLut, vec2(NdotV, roughness)).rg;\n\
      #ifdef CUSTOM_SPECULAR_IBL \n\
      vec3 specularIBL = czm_sampleOctahedralProjection(model_specularEnvironmentMaps, model_specularEnvironmentMapsSize, cubeDir, roughness * model_specularEnvironmentMapsMaximumLOD, model_specularEnvironmentMapsMaximumLOD);\n\
      #else \n\
      vec3 specularIBL = czm_sampleOctahedralProjection(czm_specularEnvironmentMaps, czm_specularEnvironmentMapSize, cubeDir,  roughness * czm_specularEnvironmentMapsMaximumLOD, czm_specularEnvironmentMapsMaximumLOD);\n\
      #endif \n\
    specularIBL *= F * brdfLut.x + brdfLut.y;\n\
    #else \n\
    vec3 specularIBL = vec3(0.0); \n\
    #endif\n\
\n\
    return diffuseColor * diffuseIrradiance + specularColor * specularIBL;\n\
}\n\
#endif\n\
\n\
vec3 imageBasedLightingStage(\n\
    vec3 positionEC,\n\
    vec3 normalEC,\n\
    vec3 lightDirectionEC,\n\
    vec3 lightColorHdr,\n\
    czm_pbrParameters pbrParameters\n\
) {\n\
  #if defined(DIFFUSE_IBL) || defined(SPECULAR_IBL)\n\
  // Environment maps were provided, use them for IBL\n\
  return textureIBL(\n\
      positionEC,\n\
      normalEC,\n\
      lightDirectionEC,\n\
      pbrParameters\n\
  );\n\
  #else\n\
  // Use the procedural IBL if there are no environment maps\n\
  return proceduralIBL(\n\
      positionEC,\n\
      normalEC,\n\
      lightDirectionEC,\n\
      lightColorHdr,\n\
      pbrParameters\n\
  );\n\
  #endif\n\
}";
