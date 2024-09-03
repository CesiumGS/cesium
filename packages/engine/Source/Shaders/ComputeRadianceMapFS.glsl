precision highp float;

in vec2 v_textureCoordinates;

uniform vec3 u_faceDirection; // Current cubemap face
uniform vec3 u_positionWC;
uniform mat4 u_enuToFixedFrame;
uniform vec4 u_brightnessSaturationGammaIntensity;
uniform vec4 u_groundColor;

vec4 getCubeMapDirection(vec2 uv, vec3 faceDir) {
    vec2 scaledUV = uv * 2.0 - 1.0;

    if (faceDir.x != 0.0) {
        return vec4(faceDir.x,  scaledUV.x * faceDir.x, -scaledUV.y, 0.0);
    } else if (faceDir.y != 0.0) {
        return vec4(scaledUV.x, -scaledUV.y * faceDir.y, faceDir.y, 0.0);
    } else {
        return vec4(scaledUV.x * faceDir.z, -faceDir.z, -scaledUV.y, 0.0); 
    }
}

void main() {    
    float height = length(u_positionWC);
    float atmosphereInnerRadius = u_radiiAndDynamicAtmosphereColor.y;
    float ellipsoidHeight = height - atmosphereInnerRadius;
    float atmosphereOuterRadius = u_radiiAndDynamicAtmosphereColor.x;
    float atmosphereHeight = atmosphereOuterRadius - atmosphereInnerRadius;
    float radius = max(atmosphereOuterRadius - height, 2.0 * ellipsoidHeight);

    vec3 direction = (u_enuToFixedFrame * getCubeMapDirection(v_textureCoordinates, u_faceDirection)).xyz;
    vec3 normalizedDirection = normalize(direction);

    czm_ray ray = czm_ray(u_positionWC, normalizedDirection);
    czm_raySegment intersection = czm_raySphereIntersectionInterval(ray, vec3(0.0), atmosphereInnerRadius);
    float d = czm_branchFreeTernary(czm_isEmpty(intersection), radius, clamp(intersection.start, ellipsoidHeight, radius));

    // Compute sky color for each position on a sphere at radius centered around the provided position's origin
    vec3 skyPositionWC = u_positionWC + normalizedDirection * d;

    float lightEnum = u_radiiAndDynamicAtmosphereColor.z;
    vec3 lightDirectionWC = czm_getDynamicAtmosphereLightDirection(skyPositionWC, lightEnum);
    vec3 mieColor;
    vec3 rayleighColor;
    float opacity;
    czm_computeScattering(
        ray,
        d,
        lightDirectionWC,
        atmosphereInnerRadius, 
        rayleighColor,
        mieColor,
        opacity
    );

    vec4 skyColor = czm_computeAtmosphereColor(ray, lightDirectionWC, rayleighColor, mieColor, opacity);

#ifdef ATMOSPHERE_COLOR_CORRECT
    const bool ignoreBlackPixels = true;
    skyColor.rgb = czm_applyHSBShift(skyColor.rgb, czm_atmosphereHsbShift, ignoreBlackPixels);
#endif

    vec3 lookupDirection = -normalizedDirection;
     // Flipping the X vector is a cheap way to get the inverse of czm_temeToPseudoFixed, since that's a rotation about Z.
    lookupDirection.x = -lookupDirection.x;
    lookupDirection = -normalize(czm_temeToPseudoFixed * lookupDirection);
    lookupDirection.x = -lookupDirection.x;

    vec4 sceneSkyBoxColor = czm_textureCube(czm_environmentMap, lookupDirection);
    vec3 skyBackgroundColor = mix(czm_backgroundColor.rgb, sceneSkyBoxColor.rgb, sceneSkyBoxColor.a);

    // Interpolate the ground color based on distance and sun exposure
    vec3 up = normalize(u_positionWC);
    float occlusion = max(dot(lightDirectionWC, up), 0.15); // Ensure a low-level of ambiant light
    vec3 groundColor = mix(vec3(0.0), u_groundColor.rgb, occlusion * u_groundColor.a * (1.0 - d / radius));

    // Only show the stars when not obscured by the ellipsoid
    vec3 backgroundColor = czm_branchFreeTernary(czm_isEmpty(intersection), skyBackgroundColor, groundColor);

    // Apply intensity to sky only
    float intensity = u_brightnessSaturationGammaIntensity.w;
    vec4 adjustedSkyColor = skyColor;
    adjustedSkyColor.rgb = skyColor.rgb * intensity;

    vec4 color = vec4(mix(backgroundColor, adjustedSkyColor.rgb, adjustedSkyColor.a), 1.0);

    float brightness = u_brightnessSaturationGammaIntensity.x;
    float saturation = u_brightnessSaturationGammaIntensity.y;
    float gamma = u_brightnessSaturationGammaIntensity.z;

#ifdef ENVIRONMENT_COLOR_CORRECT
    color.rgb = mix(vec3(0.0), color.rgb, brightness);
    color.rgb = czm_saturation(color.rgb, saturation);
#endif
    color.rgb = pow(color.rgb, vec3(gamma)); // Normally this would be in the ifdef above, but there is a precision issue with the atmmopshere scattering transmittance (alpha) which this loine works around, even when gamma is 1.0.
    color.rgb = czm_gammaCorrect(color.rgb);

    out_FragColor = color;
}
