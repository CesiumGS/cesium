void fogStage(inout vec4 color, in ProcessedAttributes attributes) {
    const vec4 FOG_COLOR = vec4(0.5, 0.0, 1.0, 1.0);

    // Note: camera is far away (distance > nightFadeOutDistance), scattering is computed in the fragment shader.
    // otherwise in the vertex shader. but for prototyping, I'll do everything in the FS for simplicity



    // Matches the constant in GlobeFS.glsl. This makes the fog falloff
    // more gradual.
    const float fogModifier = 0.15;
    float distanceToCamera = attributes.positionEC.z;
    // where to get distance?
    vec3 withFog = czm_fog(distanceToCamera, color.rgb, FOG_COLOR.rgb, fogModifier);

    color = vec4(withFog, color.a);
}
