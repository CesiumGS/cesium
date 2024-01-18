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

void applyFog(inout vec4 color, vec4 groundAtmosphereColor, vec3 lightDirection, float distanceToCamera) {

    vec3 fogColor = groundAtmosphereColor.rgb;

    // If there is dynamic lighting, apply that to the fog.
    const float NONE = 0.0;
    if (czm_atmosphereDynamicLighting != NONE) {
        float darken = clamp(dot(normalize(czm_viewerPositionWC), lightDirection), czm_fogMinimumBrightness, 1.0);
        fogColor *= darken;
    }

    // Tonemap if HDR rendering is disabled
    #ifndef HDR
        fogColor.rgb = czm_acesTonemapping(fogColor.rgb);
        fogColor.rgb = czm_inverseGamma(fogColor.rgb);
    #endif

    // Matches the constant in GlobeFS.glsl. This makes the fog falloff
    // more gradual.
    const float fogModifier = 0.15;
    vec3 withFog = czm_fog(distanceToCamera, color.rgb, fogColor, fogModifier);
    color = vec4(withFog, color.a);
}

void atmosphereStage(inout vec4 color, in ProcessedAttributes attributes) {
    vec3 rayleighColor;
    vec3 mieColor;
    float opacity;

    vec3 positionWC;
    vec3 lightDirection;

    // When the camera is in space, compute the position per-fragment for
    // more accurate ground atmosphere. All other cases will use
    //
    // The if condition will be added in https://github.com/CesiumGS/cesium/issues/11717
    if (false) {
        positionWC = computeEllipsoidPositionWC(attributes.positionMC);
        lightDirection = czm_getDynamicAtmosphereLightDirection(positionWC, czm_atmosphereDynamicLighting);

        // The fog color is derived from the ground atmosphere color
        czm_computeGroundAtmosphereScattering(
            positionWC,
            lightDirection,
            rayleighColor,
            mieColor,
            opacity
        );
    } else {
        positionWC = attributes.positionWC;
        lightDirection = czm_getDynamicAtmosphereLightDirection(positionWC, czm_atmosphereDynamicLighting);
        rayleighColor = v_atmosphereRayleighColor;
        mieColor = v_atmosphereMieColor;
        opacity = v_atmosphereOpacity;
    }

    //color correct rayleigh and mie colors
    const bool ignoreBlackPixels = true;
    rayleighColor = czm_applyHSBShift(rayleighColor, czm_atmosphereHsbShift, ignoreBlackPixels);
    mieColor = czm_applyHSBShift(mieColor, czm_atmosphereHsbShift, ignoreBlackPixels);

    vec4 groundAtmosphereColor = czm_computeAtmosphereColor(positionWC, lightDirection, rayleighColor, mieColor, opacity);

    if (u_isInFog) {
        float distanceToCamera = length(attributes.positionEC);
        applyFog(color, groundAtmosphereColor, lightDirection, distanceToCamera);
    } else {
        // Ground atmosphere
    }
}
