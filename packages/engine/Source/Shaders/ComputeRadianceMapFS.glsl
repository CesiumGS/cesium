precision highp float;

in vec2 v_textureCoordinates;

uniform vec3 u_faceDirection; // Current cubemap face
uniform vec3 u_positionWC;
uniform mat4 u_enuToFixedFrame;
uniform vec4 u_brightnessSaturationGammaIntensity;
uniform vec4 u_groundColor; // alpha component represent albedo

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
    float ellipsoidHeight = max(height - atmosphereInnerRadius, 0.0);

    // Scale the position to ensure the sky color is present, even when underground.
    vec3 positionWC = u_positionWC / height * (ellipsoidHeight + atmosphereInnerRadius);

    float atmosphereOuterRadius = u_radiiAndDynamicAtmosphereColor.x;
    float atmosphereHeight = atmosphereOuterRadius - atmosphereInnerRadius;

    vec3 direction = (u_enuToFixedFrame * getCubeMapDirection(v_textureCoordinates, u_faceDirection)).xyz;
    vec3 normalizedDirection = normalize(direction);

    czm_ray ray = czm_ray(positionWC, normalizedDirection);
    czm_raySegment intersection = czm_raySphereIntersectionInterval(ray, vec3(0.0), atmosphereInnerRadius);
    if (!czm_isEmpty(intersection)) {
        intersection = czm_rayEllipsoidIntersectionInterval(ray, vec3(0.0), czm_ellipsoidInverseRadii);
    }

    bool onEllipsoid = intersection.start >= 0.0;
    float rayLength = czm_branchFreeTernary(onEllipsoid, intersection.start, atmosphereOuterRadius);

    // Compute sky color for each position on a sphere at radius centered around the provided position's origin
    vec3 skyPositionWC = positionWC + normalizedDirection * rayLength;

    float lightEnum = u_radiiAndDynamicAtmosphereColor.z;
    vec3 lightDirectionWC = normalize(czm_getDynamicAtmosphereLightDirection(skyPositionWC, lightEnum));
    vec3 mieColor;
    vec3 rayleighColor;
    float opacity;
    czm_computeScattering(
        ray,
        rayLength,
        lightDirectionWC,
        atmosphereInnerRadius, 
        rayleighColor,
        mieColor,
        opacity
    );

    vec4 atmopshereColor = czm_computeAtmosphereColor(ray, lightDirectionWC, rayleighColor, mieColor, opacity);

#ifdef ATMOSPHERE_COLOR_CORRECT
    const bool ignoreBlackPixels = true;
    atmopshereColor.rgb = czm_applyHSBShift(atmopshereColor.rgb, czm_atmosphereHsbShift, ignoreBlackPixels);
#endif

    vec3 lookupDirection = -normalizedDirection;
     // Flipping the X vector is a cheap way to get the inverse of czm_temeToPseudoFixed, since that's a rotation about Z.
    lookupDirection.x = -lookupDirection.x;
    lookupDirection = -normalize(czm_temeToPseudoFixed * lookupDirection);
    lookupDirection.x = -lookupDirection.x;

    // Values outside the atmopshere are rendered as black, when they should be treated as transparent
    float skyAlpha = clamp((1.0 - ellipsoidHeight / atmosphereHeight) * atmopshereColor.a, 0.0, 1.0);
    skyAlpha = czm_branchFreeTernary(length(atmopshereColor.rgb) <= czm_epsilon7, 0.0, skyAlpha); // Treat black as transparent

    // Blend starmap with atmopshere scattering
    float intensity = u_brightnessSaturationGammaIntensity.w;
    vec4 sceneSkyBoxColor = czm_textureCube(czm_environmentMap, lookupDirection);
    vec3 skyBackgroundColor = mix(czm_backgroundColor.rgb, sceneSkyBoxColor.rgb, sceneSkyBoxColor.a);
    vec4 combinedSkyColor = vec4(mix(skyBackgroundColor, atmopshereColor.rgb * intensity, skyAlpha), 1.0);

    // Compute ground color based on amount of reflected light, then blend it with ground atmosphere based on height
    vec3 up = normalize(positionWC);
    float occlusion = max(dot(lightDirectionWC, up), 0.05);
    vec4 groundColor = vec4(u_groundColor.rgb * u_groundColor.a * (vec3(intensity * occlusion) + atmopshereColor.rgb), 1.0);
    vec4 blendedGroundColor = mix(groundColor, atmopshereColor, clamp(ellipsoidHeight / atmosphereHeight, 0.0, 1.0));

    vec4 color = czm_branchFreeTernary(onEllipsoid, blendedGroundColor, combinedSkyColor);

    float brightness = u_brightnessSaturationGammaIntensity.x;
    float saturation = u_brightnessSaturationGammaIntensity.y;
    float gamma = u_brightnessSaturationGammaIntensity.z;

#ifdef ENVIRONMENT_COLOR_CORRECT
    color.rgb = mix(vec3(0.0), color.rgb, brightness);
    color.rgb = czm_saturation(color.rgb, saturation);
#endif
    color.rgb = pow(color.rgb, vec3(gamma)); // Normally this would be in the ifdef above, but there is a precision issue with the atmopshere scattering transmittance (alpha). Having this line is a workaround for that issue, even when gamma is 1.0.
    color.rgb = czm_gammaCorrect(color.rgb);

    out_FragColor = color;
}
