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

const float ATMOSPHERE_DYNAMIC_LIGHTING_NONE = 0.0;

void applyFog(inout vec4 color, vec4 groundAtmosphereColor, vec3 lightDirectionWC, float distanceToCamera) {

    vec3 fogColor = groundAtmosphereColor.rgb;

    // If there is dynamic lighting, apply that to the fog.
    if (czm_atmosphereDynamicLighting != ATMOSPHERE_DYNAMIC_LIGHTING_NONE) {
        float darken = clamp(dot(normalize(czm_viewerPositionWC), lightDirectionWC), czm_fogMinimumBrightness, 1.0);
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

float fade(float x, vec2 range, vec2 outputRange) {
    return clamp((x - range.x) / (range.y - range.x), outputRange.x, outputRange.y);
}

float getCameraHeight() {
    if (czm_sceneMode == czm_sceneMode2D) {
        return max(czm_frustumPlanes.x - czm_frustumPlanes.y, czm_frustumPlanes.w - czm_frustumPlanes.z) * 0.5;
    } else if (czm_sceneMode == czm_sceneModeColumbusView) {
        return -czm_view[3].z;
    }

    return length(czm_view[3]);
}

vec2 getLightingFadeRange() {
    vec2 fadeRange = czm_atmosphereLightingFadeRange;
    if (czm_sceneMode != czm_sceneMode3D) {
        vec3 radii = czm_ellipsoidRadii;
        float maxRadius = max(radii.x, max(radii.y, radii.z));
        fadeRange -= maxRadius;
    }
    return fadeRange;
}

void applyGroundAtmosphere(inout vec4 color, vec4 groundAtmosphereColor, vec3 positionWC, vec3 atmosphereLightDirectionWC) {
    float cameraHeight = getCameraHeight();

    // Approximate normal at this point on the globe.
    vec3 normalWC = normalize(positionWC);

    // Blend between constant lighting when the camera is near the earth
    // and Lambert diffuse shading + ground atmosphere when the camera is farther away
    vec2 fadeRange = getLightingFadeRange();
    float lightingFade = fade(cameraHeight, fadeRange, vec2(0.0, 1.0));

    // Apply lambert diffuse shading based on the light
    float lambert = czm_getLambertDiffuse(normalWC, atmosphereLightDirectionWC);
    const float diffuseMultiplier = 5.0;
    const float vertexShadowDarkness = 0.3;
    float diffuseIntensity = clamp(lambert * diffuseMultiplier + vertexShadowDarkness, 0.0, 1.0);
    diffuseIntensity = mix(1.0, diffuseIntensity, lightingFade);
    vec4 diffuseColor = vec4(color.rgb * czm_lightColor * diffuseIntensity, color.a);

    // The transmittance is based on optical depth i.e. the length of segment of the ray inside the atmosphere.
    // This value is larger near the "circumference", as it is further away from the camera. We use it to
    // brighten up that area of the ground atmosphere.
    const float transmittanceModifier = 0.5;
    float transmittance = transmittanceModifier + clamp(1.0 - groundAtmosphereColor.a, 0.0, 1.0);
    vec3 diffuseAndGroundAtmosphere = diffuseColor.rgb + groundAtmosphereColor.rgb * transmittance;

    vec3 finalAtmosphereColor = diffuseAndGroundAtmosphere;

    if (czm_atmosphereDynamicLighting != ATMOSPHERE_DYNAMIC_LIGHTING_NONE) {
        // Use a dot product (similar to Lambert shading) to create a mask that's positive on the
        // daytime side of the globe and 0 on the nighttime side of the globe.
        //
        // Use this to select the diffuse + ground atmosphere on the daytime side of the globe,
        // and just the ground atmosphere (which is much darker) on the nighttime side.
        float dayNightMask = clamp(dot(normalWC, atmosphereLightDirectionWC), 0.0, 1.0);
        vec3 dayNightColor = mix(groundAtmosphereColor.rgb, diffuseAndGroundAtmosphere, dayNightMask);

        // Fade in the day/night color in as the camera height increases towards space.
        float nightFade = fade(cameraHeight, czm_atmosphereNightFadeRange, vec2(0.05, 1.0));
        finalAtmosphereColor = mix(diffuseAndGroundAtmosphere, dayNightColor, nightFade);
    }

    #ifndef HDR
        const float fExposure = 2.0;
        finalAtmosphereColor = vec3(1.0) - exp(-fExposure * finalAtmosphereColor);
    #else
        finalAtmosphereColor = czm_saturation(finalAtmosphereColor, 1.6);
    #endif

    color.rgb = mix(color.rgb, finalAtmosphereColor.rgb, lightingFade);
}

void atmosphereStage(inout vec4 color, in ProcessedAttributes attributes) {
    if (czm_backFacing()) {
        return;
    }
    vec3 rayleighColor;
    vec3 mieColor;
    float opacity;

    vec3 positionWC;
    vec3 lightDirectionWC;

    // When the camera is in space, compute the position per-fragment for
    // more accurate ground atmosphere. All other cases will use
    //
    // The if condition will be added in https://github.com/CesiumGS/cesium/issues/11717
    if (u_perFragmentGroundAtmosphere) {
        positionWC = computeEllipsoidPositionWC(attributes.positionMC);
        lightDirectionWC = czm_getDynamicAtmosphereLightDirection(positionWC, czm_atmosphereDynamicLighting);

        // The fog color is derived from the ground atmosphere color
        czm_computeGroundAtmosphereScattering(
            positionWC,
            lightDirectionWC,
            rayleighColor,
            mieColor,
            opacity
        );
    } else {
        positionWC = attributes.positionWC;
        lightDirectionWC = czm_getDynamicAtmosphereLightDirection(positionWC, czm_atmosphereDynamicLighting);
        rayleighColor = v_atmosphereRayleighColor;
        mieColor = v_atmosphereMieColor;
        opacity = v_atmosphereOpacity;
    }

    if (u_shouldColorCorrect) {
        const bool ignoreBlackPixels = true;
        rayleighColor = czm_applyHSBShift(rayleighColor, czm_atmosphereHsbShift, ignoreBlackPixels);
        mieColor = czm_applyHSBShift(mieColor, czm_atmosphereHsbShift, ignoreBlackPixels);
    }

    vec4 groundAtmosphereColor = czm_computeAtmosphereColor(positionWC, lightDirectionWC, rayleighColor, mieColor, opacity);

    float distanceToCamera = length(attributes.positionEC);
    if (u_isInFog) {
        applyFog(color, groundAtmosphereColor, lightDirectionWC, distanceToCamera);
    } else {
        applyGroundAtmosphere(color, groundAtmosphereColor, positionWC, lightDirectionWC);
    }
}
