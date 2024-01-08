vec3 computeEllipsoidPositionCurvature(vec3 positionMC) {
    // Compute the distance from the camera to the local center of curvature.
  vec4 vertexPositionENU = czm_modelToEnu * vec4(positionMC, 1.0);
  vec2 vertexAzimuth = normalize(vertexPositionENU.xy);
  // Curvature = 1 / radius of curvature.
  float azimuthalCurvature = dot(vertexAzimuth * vertexAzimuth, czm_eyeEllipsoidCurvature);
  float eyeToCenter = 1.0 / azimuthalCurvature + czm_eyeHeight;

  // Compute the approximate ellipsoid normal at the vertex position.
  // Uses a circular approximation for the Earth curvature along the geodesic.
  vec3 vertexPositionEC = (czm_modelView * vec4(positionMC, 1.0)).xyz;
  vec3 centerToVertex = eyeToCenter * czm_eyeEllipsoidNormalEC + vertexPositionEC;
  vec3 vertexNormal = normalize(centerToVertex);

  // Estimate the (sine of the) angle between the camera direction and the vertex normal
  float verticalDistance = dot(vertexPositionEC, czm_eyeEllipsoidNormalEC);
  float horizontalDistance = length(vertexPositionEC - verticalDistance * czm_eyeEllipsoidNormalEC);
  float sinTheta = horizontalDistance / (eyeToCenter + verticalDistance);
  bool isSmallAngle = clamp(sinTheta, 0.0, 0.05) == sinTheta;

  // Approximate the change in height above the ellipsoid, from camera to vertex position.
  float exactVersine = 1.0 - dot(czm_eyeEllipsoidNormalEC, vertexNormal);
  float smallAngleVersine = 0.5 * sinTheta * sinTheta;
  float versine = isSmallAngle ? smallAngleVersine : exactVersine;
  float dHeight = dot(vertexPositionEC, vertexNormal) - eyeToCenter * versine;
  float vertexHeight = czm_eyeHeight + dHeight;

  vec3 ellipsoidPositionEC = vertexPositionEC - vertexHeight * vertexNormal;
  return (czm_inverseView * vec4(ellipsoidPositionEC, 1.0)).xyz;

}

// robust iterative solution without trig functions
// https://github.com/0xfaded/ellipse_demo/issues/1
// https://stackoverflow.com/questions/22959698/distance-from-given-point-to-given-ellipse
vec2 nearestPointOnEllipse(vec2 pos, vec2 radii) {
    vec2 p = abs(pos);
    vec2 inverseRadii = 1.0 / radii;
    vec2 evoluteScale = (radii.x * radii.x - radii.y * radii.y) * vec2(1.0, -1.0) * inverseRadii;

    // We describe the ellipse parametrically: v = radii * vec2(cos(t), sin(t))
    // but store the cos and sin of t in a vec2 for efficiency.
    // Initial guess: t = cos(pi/4)
    vec2 tTrigs = vec2(0.70710678118);
    vec2 v = radii * tTrigs;

    const int iterations = 3;
    for (int i = 0; i < iterations; ++i) {
        // Find the evolute of the ellipse (center of curvature) at v.
        vec2 evolute = evoluteScale * tTrigs * tTrigs * tTrigs;
        // Find the (approximate) intersection of p - evolute with the ellipsoid.
        vec2 q = normalize(p - evolute) * length(v - evolute);
        // Update the estimate of t.
        tTrigs = (q + evolute) * inverseRadii;
        tTrigs = normalize(clamp(tTrigs, 0.0, 1.0));
        v = radii * tTrigs;
    }

    return v * sign(pos);
}

vec2 nearestPointOnEllipse1Iter(vec2 pos, vec2 radii) {
    vec2 p = abs(pos);
    vec2 inverseRadii = 1.0 / radii;
    vec2 evoluteScale = (radii.x * radii.x - radii.y * radii.y) * vec2(1.0, -1.0) * inverseRadii;

    // We describe the ellipse parametrically: v = radii * vec2(cos(t), sin(t))
    // but store the cos and sin of t in a vec2 for efficiency.
    // Initial guess: t = cos(pi/4)
    vec2 tTrigs = vec2(0.70710678118);
    vec2 v = radii * tTrigs;

    const int iterations = 1;
    for (int i = 0; i < iterations; ++i) {
        // Find the evolute of the ellipse (center of curvature) at v.
        vec2 evolute = evoluteScale * tTrigs * tTrigs * tTrigs;
        // Find the (approximate) intersection of p - evolute with the ellipsoid.
        vec2 q = normalize(p - evolute) * length(v - evolute);
        // Update the estimate of t.
        tTrigs = (q + evolute) * inverseRadii;
        tTrigs = normalize(clamp(tTrigs, 0.0, 1.0));
        v = radii * tTrigs;
    }

    return v * sign(pos);
}

vec3 computeEllipsoidPositionIterative(vec3 positionMC) {
    // Get the world-space position and project onto a meridian plane of
    // the ellipsoid
    vec3 positionWC = (czm_model * vec4(positionMC, 1.0)).xyz;

    vec2 positionEllipse = vec2(length(positionWC.xy), positionWC.z);
    vec2 nearestPoint = nearestPointOnEllipse(positionEllipse, czm_ellipsoidRadii.xz);

    // Reconstruct a 3D point in world space
    return vec3(nearestPoint.x * normalize(positionWC.xy), nearestPoint.y);
}

vec3 computeEllipsoidPositionIterative1Iter(vec3 positionMC) {
    // Get the world-space position and project onto a meridian plane of
    // the ellipsoid
    vec3 positionWC = (czm_model * vec4(positionMC, 1.0)).xyz;

    vec2 positionEllipse = vec2(length(positionWC.xy), positionWC.z);
    vec2 nearestPoint = nearestPointOnEllipse1Iter(positionEllipse, czm_ellipsoidRadii.xz);

    // Reconstruct a 3D point in world space
    return vec3(nearestPoint.x * normalize(positionWC.xy), nearestPoint.y);
}

#define USE_ITERATIVE_METHOD

vec3 computeFogColor(vec3 positionMC) {
    vec3 rayleighColor = vec3(0.0, 0.0, 1.0);
    vec3 mieColor;
    float opacity;

    // Measuring performance is difficult in the shader, so run the code many times
    // so the difference is noticeable in the FPS counter
    const float N = 200.0;
    const float WEIGHT = 1.0 / N;
    vec3 ellipsoidPositionWC = vec3(0.0);
    for (float i = 0.0; i < N; i++) {
        if (czm_atmosphereMethod == 0.0) {
            // Baseline for comparison - just use the vertex position in WC
            ellipsoidPositionWC += WEIGHT * (czm_model * vec4(positionMC, 1.0)).xyz;
        } else if (czm_atmosphereMethod == 1.0) {
            // Use the curvature method
            ellipsoidPositionWC += WEIGHT * computeEllipsoidPositionCurvature(positionMC);
        } else {
            // use the 2D iterative method
            ellipsoidPositionWC += WEIGHT * computeEllipsoidPositionIterative1Iter(positionMC);
        }
    }

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

    // Compare the two methods.
    vec3 curvature = computeEllipsoidPositionCurvature(attributes.positionMC);
    vec3 iterative = computeEllipsoidPositionIterative(attributes.positionMC);
    vec3 iterative1 = computeEllipsoidPositionIterative1Iter(attributes.positionMC);

    //color = vec4(abs(curvature - iterative) / 1e3, 1.0);
    //color = vec4(abs(iterative - iterative1) / 1e2, 1.0);
}
