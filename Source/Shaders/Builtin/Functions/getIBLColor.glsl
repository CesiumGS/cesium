vec3 czm_getIBLColor(vec3 toEye, vec3 positionWC, czm_material material)
{
    vec3 normal = material.normal;
    vec3 diffuseColor = material.diffuse;
    vec3 specularColor = material.specularColor;
    float roughness = material.roughness;

    vec3 r = normalize(reflect(toEye, normal));
    float NdotV = abs(dot(normal, toEye)) + 0.001;
    float vertexRadius = length(positionWC);

    float horizonDotNadir = 1.0 - min(1.0, 6378137.0 / vertexRadius);
    float reflectionDotNadir = dot(r, normalize(toEye));

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

    //vec3 skyColor = vec3(0.18, 0.26, 0.48);
    vec3 skyColor = vec3(0.18, 0.26, 0.48);

    vec3 belowHorizonColor = mix(vec3(0.1, 0.15, 0.25), vec3(0.4, 0.7, 0.9), smoothstepHeight);
    vec3 nadirColor = belowHorizonColor * 0.5;
    vec3 aboveHorizonColor = mix(vec3(0.4, 0.7, 0.9), belowHorizonColor, roughness * 0.5);
    vec3 blueSkyColor = mix(skyColor, aboveHorizonColor, reflectionDotNadir * inverseRoughness * 0.7 + 0.25);
    vec3 zenithColor = mix(blueSkyColor, sceneSkyBox, smoothstepHeight);

    vec3 blueSkyDiffuseColor = vec3(0.7, 0.85, 0.9); // TODO: Where to grab this value from?
    float diffuseIrradianceFromEarth = (1.0 - horizonDotNadir) * (reflectionDotNadir * 0.25 + 0.75) * smoothstepHeight;
    float diffuseIrradianceFromSky = (1.0 - smoothstepHeight) * (1.0 - (reflectionDotNadir * 0.25 + 0.25));
    vec3 diffuseIrradiance = blueSkyDiffuseColor * (diffuseIrradianceFromEarth + diffuseIrradianceFromSky);

    float notDistantRough = (1.0 - horizonDotNadir * roughness * 0.8);
    vec3 specularIrradiance = mix(zenithColor, aboveHorizonColor, smoothstep(farAboveHorizon, aroundHorizon, reflectionDotNadir) * notDistantRough);
    specularIrradiance = mix(specularIrradiance, belowHorizonColor, smoothstep(aroundHorizon, farBelowHorizon, reflectionDotNadir) * inverseRoughness);
    specularIrradiance = mix(specularIrradiance, nadirColor, smoothstep(farBelowHorizon, 1.0, reflectionDotNadir) * inverseRoughness);

    vec2 brdfLut = texture2D(czm_brdfLut, vec2(NdotV, 1.0 - roughness)).rg;
    //return ambiantColor + diffuseIrradiance + (specularIrradiance * (specularColor * brdfLut.x + brdfLut.y));//(specularIrradiance * SRGBtoLINEAR3(specularColor * brdfLut.x + brdfLut.y));
    return diffuseIrradiance + specularIrradiance * czm_gammaCorrect(specularColor * brdfLut.x + brdfLut.y);
}

vec3 czm_getGlobeIBLColor(vec3 positionEC, vec3 positionWC, vec3 normal, vec3 diffuseColor)
{
    vec3 toEye = normalize(-positionEC);
    return diffuseColor;
}
