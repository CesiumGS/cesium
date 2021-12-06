void proceduralIBL(
  vec3 viewDirectionEC,
  vec3 normalEC,
  vec3 lightDirectionEC,
  vec3 lightColorHdr,
  czm_pbrParameters pbrParameters
) {
    vec3 positionWC = vec3(czm_inverseView * vec4(v_positionEC, 1.0));
    vec3 r = normalize(czm_inverseViewRotation * normalize(reflect(viewDirectionEC, normalEC)));
    
    // Figure out if the reflection vector hits the ellipsoid
    float vertexRadius = length(positionWC);
    float horizonDotNadir = 1.0 - min(1.0, czm_ellipsoidRadii.x / vertexRadius);
    float reflectionDotNadir = dot(r, normalize(positionWC));
    // Flipping the X vector is a cheap way to get the inverse of czm_temeToPseudoFixed, since that's a rotation about Z.
    r.x = -r.x;
    r = -normalize(czm_temeToPseudoFixed * r);
    r.x = -r.x;

    float diffuseColor = pbrParameters.diffuseColor;
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
    float LdotZenith = clamp(dot(normalize(czm_inverseViewRotation * lightDirectionEC), normalize(-positionWC)), 0.001, 1.0);
    float S = acos(LdotZenith);
    // Angle between zenith and current pixel
    float NdotZenith = clamp(dot(normalize(czm_inverseViewRotation * normalEC), normalize(-positionWC)), 0.001, 1.0);
    // Angle between sun and current pixel
    float gamma = acos(NdotL);
    float numerator = ((0.91 + 10.0 * exp(-3.0 * gamma) + 0.45 * pow(NdotL, 2.0)) * (1.0 - exp(-0.32 / NdotZenith)));
    float denominator = (0.91 + 10.0 * exp(-3.0 * S) + 0.45 * pow(LdotZenith,2.0)) * (1.0 - exp(-0.32));
    float luminance = gltf_luminanceAtZenith * (numerator / denominator);
    #endif 
    
    vec2 brdfLut = texture2D(czm_brdfLut, vec2(NdotV, roughness)).rg;
    vec3 iblColor = (diffuseIrradiance * diffuseColor * gltf_iblFactor.x) + (specularIrradiance * SRGBtoLINEAR3(specularColor * brdfLut.x + brdfLut.y) * gltf_iblFactor.y);
    float maximumComponent = max(max(lightColorHdr.x, lightColorHdr.y), lightColorHdr.z);
    vec3 lightColor = lightColorHdr / max(maximumComponent, 1.0);
    iblColor *= lightColor;

    #ifdef USE_SUN_LUMINANCE 
    iblColor *= luminance;
    #endif

    return iblColor;
}

void textureIBL(
  czm_pbrParameters pbrParameters
) {
    float diffuseColor = pbrParameters.diffuseColor;
    float roughness = pbrParameters.roughness;
    vec3 specularColor = pbrParameters.f0;

    const mat3 yUpToZUp = mat3(
        -1.0, 0.0, 0.0,
        0.0, 0.0, -1.0, 
        0.0, 1.0, 0.0
    ); 
    vec3 cubeDir = normalize(yUpToZUp * gltf_iblReferenceFrameMatrix * normalize(reflect(-view, n))); 

    #ifdef DIFFUSE_IBL 
        #ifdef CUSTOM_SPHERICAL_HARMONICS 
        vec3 diffuseIrradiance = czm_sphericalHarmonics(cubeDir, gltf_sphericalHarmonicCoefficients); 
        #else
        vec3 diffuseIrradiance = czm_sphericalHarmonics(cubeDir, czm_sphericalHarmonicCoefficients); 
        #endif 
    #else 
    vec3 diffuseIrradiance = vec3(0.0); 
    #endif 

    float roughness = pbrParameters.roughness;
    #ifdef SPECULAR_IBL 
    vec2 brdfLut = texture2D(czm_brdfLut, vec2(NdotV, roughness)).rg;
      #ifdef CUSTOM_SPECULAR_IBL 
      vec3 specularIBL = czm_sampleOctahedralProjection(gltf_specularMap, gltf_specularMapSize, cubeDir, roughness * gltf_maxSpecularLOD, gltf_maxSpecularLOD);
      #else 
      vec3 specularIBL = czm_sampleOctahedralProjection(czm_specularEnvironmentMaps, czm_specularEnvironmentMapSize, cubeDir,  roughness * czm_specularEnvironmentMapsMaximumLOD, czm_specularEnvironmentMapsMaximumLOD);
      #endif 
    specularIBL *= F * brdfLut.x + brdfLut.y;
    #else 
    vec3 specularIBL = vec3(0.0); 
    #endif

    return diffuseIrradiance * diffuseColor + specularColor * specularIBL;
}

void czm_imageBasedLighting(
  czm_pbrParameters pbrParameters
) {
  #if defined(DIFFUSE_IBL) || defined(SPECULAR_IBL)
  // Environment maps were provided, use them for IBL
  return textureIBL(pbrParameters);
  #else
  // Use the procedural IBL if there are no environment maps
  return proceduralIBL(pbrParameters);
  #endif
}
