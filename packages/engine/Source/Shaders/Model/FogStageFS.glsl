vec3 computeFogColor() {
    vec3 rayleighColor = vec3(0.0, 0.0, 1.0);
    vec3 mieColor;
    float opacity;

    vec3 positionWC = czm_computeEllipsoidPosition();
    vec3 lightDirection = czm_getDynamicAtmosphereLightDirection(positionWC);

    // The fog color is derived from the ground atmosphere color
    czm_computeGroundAtmosphereScattering(
        positionWC,
        lightDirection,
        rayleighColor,
        mieColor,
        opacity
    );

    //rayleighColor = vec3(1.0, 0.0, 0.0);
    //mieColor = vec3(0.0, 1.0, 0.0);

    vec4 groundAtmosphereColor = czm_computeAtmosphereColor(positionWC, lightDirection, rayleighColor, mieColor, opacity);
    vec3 fogColor = groundAtmosphereColor.rgb;

    // Darken the fog

    // If there is lighting, apply that to the fog.
//#if defined(DYNAMIC_ATMOSPHERE_LIGHTING) && (defined(ENABLE_VERTEX_LIGHTING) || defined(ENABLE_DAYNIGHT_SHADING))
    //const float u_minimumBrightness = 0.03; // TODO: pull this from the light shader
    //float darken = clamp(dot(normalize(czm_viewerPositionWC), atmosphereLightDirection), u_minimumBrightness, 1.0);
    //fogColor *= darken;
//#endif

    // Tonemap if HDR rendering is disabled
#ifndef HDR
    fogColor.rgb = czm_acesTonemapping(fogColor.rgb);
    fogColor.rgb = czm_inverseGamma(fogColor.rgb);
#endif

    // TODO: fogColor.a is only used for ground atmosphere... is that needed?

    //return positionWC / 1e7;
    //return rayleighColor;
    return fogColor.rgb;
    //return mieColor;
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
    //color = mix(color, vec4(fogColor, 1.0), 0.5);
}
