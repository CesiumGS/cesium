// robust iterative solution without trig functions
// https://github.com/0xfaded/ellipse_demo/issues/1
// https://stackoverflow.com/questions/22959698/distance-from-given-point-to-given-ellipse
//
// This version uses only a single iteration for best performance. For fog
// rendering, the difference is negligible.
vec2 nearestPointOnEllipseFast(vec2 pos, vec2 radii) {
    vec2 p = abs(pos);
    vec2 inverseRadii = 1.0 / radii;
    vec2 evoluteScale = (radii.x * radii.x - radii.y * radii.y) * vec2(1.0, -1.0) * inverseRadii;

    // We describe the ellipse parametrically: v = radii * vec2(cos(t), sin(t))
    // but store the cos and sin of t in a vec2 for efficiency.
    // Initial guess: t = cos(pi/4)
    vec2 tTrigs = vec2(0.70710678118);
    vec2 v = radii * tTrigs;

    // Find the evolute of the ellipse (center of curvature) at v.
    vec2 evolute = evoluteScale * tTrigs * tTrigs * tTrigs;
    // Find the (approximate) intersection of p - evolute with the ellipsoid.
    vec2 q = normalize(p - evolute) * length(v - evolute);
    // Update the estimate of t.
    tTrigs = (q + evolute) * inverseRadii;
    tTrigs = normalize(clamp(tTrigs, 0.0, 1.0));
    v = radii * tTrigs;

    return v * sign(pos);
}

vec3 computeEllipsoidPositionWC(vec3 positionMC) {
    // Get the world-space position and project onto a meridian plane of
    // the ellipsoid
    vec3 positionWC = (czm_model * vec4(positionMC, 1.0)).xyz;

    vec2 positionEllipse = vec2(length(positionWC.xy), positionWC.z);
    vec2 nearestPoint = nearestPointOnEllipseFast(positionEllipse, czm_ellipsoidRadii.xz);

    // Reconstruct a 3D point in world space
    return vec3(nearestPoint.x * normalize(positionWC.xy), nearestPoint.y);
}

vec3 computeFogColor(vec3 positionMC) {
    vec3 rayleighColor = vec3(0.0, 0.0, 1.0);
    vec3 mieColor;
    float opacity;

    vec3 ellipsoidPositionWC = computeEllipsoidPositionWC(positionMC);
    vec3 lightDirection = czm_getDynamicAtmosphereLightDirection(ellipsoidPositionWC);

    // The fog color is derived from the ground atmosphere color
    czm_computeGroundAtmosphereScattering(
        ellipsoidPositionWC,
        lightDirection,
        rayleighColor,
        mieColor,
        opacity
    );

    //rayleighColor = vec3(1.0, 0.0, 0.0);
    //mieColor = vec3(0.0, 1.0, 0.0);

    vec4 groundAtmosphereColor = czm_computeAtmosphereColor(ellipsoidPositionWC, lightDirection, rayleighColor, mieColor, opacity);
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
    vec3 fogColor = computeFogColor(attributes.positionMC);

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
