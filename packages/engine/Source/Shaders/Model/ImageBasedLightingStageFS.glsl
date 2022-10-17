vec3 proceduralIBL(
    vec3 positionEC,
    vec3 normalEC,
    vec3 lightDirectionEC,
    vec3 lightColorHdr,
    czm_pbrParameters pbrParameters
) {
    vec3 v = -positionEC;
    vec3 positionWC = vec3(czm_inverseView * vec4(positionEC, 1.0));
    vec3 vWC = -normalize(positionWC);
    vec3 l = normalize(lightDirectionEC);
    vec3 n = normalEC;
    vec3 r = normalize(czm_inverseViewRotation * normalize(reflect(v, n)));

    float NdotL = clamp(dot(n, l), 0.001, 1.0);
    float NdotV = abs(dot(n, v)) + 0.001;

    // Figure out if the reflection vector hits the ellipsoid
    float vertexRadius = length(positionWC);
    float horizonDotNadir = 1.0 - min(1.0, czm_ellipsoidRadii.x / vertexRadius);
    float reflectionDotNadir = dot(r, normalize(positionWC));
    // Flipping the X vector is a cheap way to get the inverse of czm_temeToPseudoFixed, since that's a rotation about Z.
    r.x = -r.x;
    r = -normalize(czm_temeToPseudoFixed * r);
    r.x = -r.x;

    vec3 diffuseColor = pbrParameters.diffuseColor;
    float roughness = pbrParameters.roughness;
    vec3 specularColor = pbrParameters.f0;

    float inverseRoughness = 1.04 - roughness;
    inverseRoughness *= inverseRoughness;
    vec3 sceneSkyBox = textureCube(czm_environmentMap, r).rgb * inverseRoughness;

    float atmosphereHeight = 0.05;
    float blendRegionSize = 0.1 * ((1.0 - inverseRoughness) * 8.0 + 1.1 - horizonDotNadir);
    float blendRegionOffset = roughness * -1.0;
    float farAboveHorizon = clamp(horizonDotNadir - blendRegionSize * 0.5 + blendRegionOffset, 1.0e-10 - blendRegionSize, 0.99999);
    float aroundHorizon = clamp(horizonDotNadir + blendRegionSize * 0.5, 1.0e-10 - blendRegionSize, 0.99999);
    float farBelowHorizon = clamp(horizonDotNadir + blendRegionSize * 1.5, 1.0e-10 - blendRegionSize, 0.99999);
    float smoothstepHeight = smoothstep(0.0, atmosphereHeight, horizonDotNadir);
    vec3 belowHorizonColor = mix(vec3(0.1, 0.15, 0.25), vec3(0.4, 0.7, 0.9), smoothstepHeight);
    vec3 nadirColor = belowHorizonColor * 0.5;
    vec3 aboveHorizonColor = mix(vec3(0.9, 1.0, 1.2), belowHorizonColor, roughness * 0.5);
    vec3 blueSkyColor = mix(vec3(0.18, 0.26, 0.48), aboveHorizonColor, reflectionDotNadir * inverseRoughness * 0.5 + 0.75);
    vec3 zenithColor = mix(blueSkyColor, sceneSkyBox, smoothstepHeight);
    vec3 blueSkyDiffuseColor = vec3(0.7, 0.85, 0.9); 
    float diffuseIrradianceFromEarth = (1.0 - horizonDotNadir) * (reflectionDotNadir * 0.25 + 0.75) * smoothstepHeight;  
    float diffuseIrradianceFromSky = (1.0 - smoothstepHeight) * (1.0 - (reflectionDotNadir * 0.25 + 0.25));
    vec3 diffuseIrradiance = blueSkyDiffuseColor * clamp(diffuseIrradianceFromEarth + diffuseIrradianceFromSky, 0.0, 1.0);
    float notDistantRough = (1.0 - horizonDotNadir * roughness * 0.8);
    vec3 specularIrradiance = mix(zenithColor, aboveHorizonColor, smoothstep(farAboveHorizon, aroundHorizon, reflectionDotNadir) * notDistantRough);
    specularIrradiance = mix(specularIrradiance, belowHorizonColor, smoothstep(aroundHorizon, farBelowHorizon, reflectionDotNadir) * inverseRoughness);
    specularIrradiance = mix(specularIrradiance, nadirColor, smoothstep(farBelowHorizon, 1.0, reflectionDotNadir) * inverseRoughness);

    // Luminance model from page 40 of http://silviojemma.com/public/papers/lighting/spherical-harmonic-lighting.pdf
    #ifdef USE_SUN_LUMINANCE 
    // Angle between sun and zenith
    float LdotZenith = clamp(dot(normalize(czm_inverseViewRotation * l), vWC), 0.001, 1.0);
    float S = acos(LdotZenith);
    // Angle between zenith and current pixel
    float NdotZenith = clamp(dot(normalize(czm_inverseViewRotation * n), vWC), 0.001, 1.0);
    // Angle between sun and current pixel
    float gamma = acos(NdotL);
    float numerator = ((0.91 + 10.0 * exp(-3.0 * gamma) + 0.45 * pow(NdotL, 2.0)) * (1.0 - exp(-0.32 / NdotZenith)));
    float denominator = (0.91 + 10.0 * exp(-3.0 * S) + 0.45 * pow(LdotZenith,2.0)) * (1.0 - exp(-0.32));
    float luminance = model_luminanceAtZenith * (numerator / denominator);
    #endif 

    vec2 brdfLut = texture2D(czm_brdfLut, vec2(NdotV, roughness)).rg;
    vec3 iblColor = (diffuseIrradiance * diffuseColor * model_iblFactor.x) + (specularIrradiance * czm_srgbToLinear(specularColor * brdfLut.x + brdfLut.y) * model_iblFactor.y);
    float maximumComponent = max(max(lightColorHdr.x, lightColorHdr.y), lightColorHdr.z);
    vec3 lightColor = lightColorHdr / max(maximumComponent, 1.0);
    iblColor *= lightColor;

    #ifdef USE_SUN_LUMINANCE 
    iblColor *= luminance;
    #endif

    return iblColor;
}

#if defined(DIFFUSE_IBL) || defined(SPECULAR_IBL)
vec3 textureIBL(
    vec3 positionEC,
    vec3 normalEC,
    vec3 lightDirectionEC,
    czm_pbrParameters pbrParameters
) {
    vec3 diffuseColor = pbrParameters.diffuseColor;
    float roughness = pbrParameters.roughness;
    vec3 specularColor = pbrParameters.f0;

    vec3 v = -positionEC;
    vec3 n = normalEC;
    vec3 l = normalize(lightDirectionEC);
    vec3 h = normalize(v + l);

    float NdotV = abs(dot(n, v)) + 0.001;
    float VdotH = clamp(dot(v, h), 0.0, 1.0);

    const mat3 yUpToZUp = mat3(
        -1.0, 0.0, 0.0,
        0.0, 0.0, -1.0, 
        0.0, 1.0, 0.0
    ); 
    vec3 cubeDir = normalize(yUpToZUp * model_iblReferenceFrameMatrix * normalize(reflect(-v, n))); 

    #ifdef DIFFUSE_IBL 
        #ifdef CUSTOM_SPHERICAL_HARMONICS
        vec3 diffuseIrradiance = czm_sphericalHarmonics(cubeDir, model_sphericalHarmonicCoefficients); 
        #else
        vec3 diffuseIrradiance = czm_sphericalHarmonics(cubeDir, czm_sphericalHarmonicCoefficients); 
        #endif 
    #else 
    vec3 diffuseIrradiance = vec3(0.0); 
    #endif 

    #ifdef SPECULAR_IBL
    vec3 r0 = specularColor.rgb;
    float reflectance = max(max(r0.r, r0.g), r0.b);
    vec3 r90 = vec3(clamp(reflectance * 25.0, 0.0, 1.0));
    vec3 F = fresnelSchlick2(r0, r90, VdotH);
    
    vec2 brdfLut = texture2D(czm_brdfLut, vec2(NdotV, roughness)).rg;
      #ifdef CUSTOM_SPECULAR_IBL 
      vec3 specularIBL = czm_sampleOctahedralProjection(model_specularEnvironmentMaps, model_specularEnvironmentMapsSize, cubeDir, roughness * model_specularEnvironmentMapsMaximumLOD, model_specularEnvironmentMapsMaximumLOD);
      #else 
      vec3 specularIBL = czm_sampleOctahedralProjection(czm_specularEnvironmentMaps, czm_specularEnvironmentMapSize, cubeDir,  roughness * czm_specularEnvironmentMapsMaximumLOD, czm_specularEnvironmentMapsMaximumLOD);
      #endif 
    specularIBL *= F * brdfLut.x + brdfLut.y;
    #else 
    vec3 specularIBL = vec3(0.0); 
    #endif

    return diffuseColor * diffuseIrradiance + specularColor * specularIBL;
}
#endif

vec3 imageBasedLightingStage(
    vec3 positionEC,
    vec3 normalEC,
    vec3 lightDirectionEC,
    vec3 lightColorHdr,
    czm_pbrParameters pbrParameters
) {
  #if defined(DIFFUSE_IBL) || defined(SPECULAR_IBL)
  // Environment maps were provided, use them for IBL
  return textureIBL(
      positionEC,
      normalEC,
      lightDirectionEC,
      pbrParameters
  );
  #else
  // Use the procedural IBL if there are no environment maps
  return proceduralIBL(
      positionEC,
      normalEC,
      lightDirectionEC,
      lightColorHdr,
      pbrParameters
  );
  #endif
}