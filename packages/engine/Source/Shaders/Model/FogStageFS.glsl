vec3 computeFogColor() {

//#if defined(DYNAMIC_ATMOSPHERE_LIGHTING_FROM_SUN)
    vec3 atmosphereLightDirection = czm_sunDirectionWC;
//#else
//    vec3 atmosphereLightDirection = czm_lightDirectionWC;
//#endif

    vec3 rayleighColor;
    vec3 mieColor;
    float opacity;

    vec3 positionWC;
    vec3 lightDirection;

    // This is true when dynamic lighting is enabled in the scene.
    bool dynamicLighting = false;

    positionWC = czm_computeEllipsoidPosition();
    lightDirection = czm_branchFreeTernary(dynamicLighting, atmosphereLightDirection, normalize(positionWC));

    // The fog color is derived from the ground atmosphere color
    czm_computeGroundAtmosphereScattering(
        positionWC,
        lightDirection,
        rayleighColor,
        mieColor,
        opacity
    );

    vec4 groundAtmosphereColor = czm_computeAtmosphereColor(positionWC, lightDirection, rayleighColor, mieColor, opacity);
    vec3 fogColor = groundAtmosphereColor.rgb;

    // Darken the fog

    // Tonemap if HDR rendering is disabled
#ifndef HDR
    fogColor.rgb = czm_acesTonemapping(fogColor.rgb);
    fogColor.rgb = czm_inverseGamma(fogColor.rgb);
#endif

    return fogColor.rgb;
}

void fogStage(inout vec4 color, in ProcessedAttributes attributes) {
    vec3 fogColor = computeFogColor();

    // Note: camera is far away (distance > nightFadeOutDistance), scattering is computed in the fragment shader.
    // otherwise in the vertex shader. but for prototyping, I'll do everything in the FS for simplicity

    // Matches the constant in GlobeFS.glsl. This makes the fog falloff
    // more gradual.
    const float fogModifier = 0.15;
    float distanceToCamera = attributes.positionEC.z;
    // where to get distance?
    vec3 withFog = czm_fog(distanceToCamera, color.rgb, fogColor, fogModifier);

    color = vec4(withFog, color.a);
}
