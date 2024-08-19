precision highp float;

in vec2 v_textureCoordinates;

uniform vec3 u_faceDirection; // Current cubemap face
uniform vec3 u_positionWC;
uniform mat4 u_enuToFixedFrame;
uniform vec4 u_brightnessSaturationGammaIntensity;
uniform vec4 u_groundColor;

const float fExposure = 2.0;

vec4 getCubeMapDirection(vec2 uv, vec3 faceDir) {
    vec2 scaledUV = uv * 2.0 - 1.0;

    if (faceDir.x != 0.0) {
        return vec4(faceDir.x, scaledUV.y, scaledUV.x * faceDir.x, 0.0);
    } else if (faceDir.y != 0.0) {
        return vec4(scaledUV.x, -faceDir.y, -scaledUV.y * faceDir.y, 0.0);
    } else {
        return vec4(scaledUV.x * faceDir.z, scaledUV.y, -faceDir.z, 0.0); 
    }
}

void main() {    
    float height = length(u_positionWC);
    float atmosphereInnerRadius = u_radiiAndDynamicAtmosphereColor.y;
    float ellipsoidHeight = height - atmosphereInnerRadius;
    float atmosphereOuterRadius = u_radiiAndDynamicAtmosphereColor.x;
    float atmosphereHeight = atmosphereOuterRadius - atmosphereInnerRadius;
    float radius = max(atmosphereOuterRadius - height, 2.0 * ellipsoidHeight);

    vec3 direction = (u_enuToFixedFrame * getCubeMapDirection(v_textureCoordinates, u_faceDirection)).xyz * vec3(1.0, 1.0, -1.0); // TODO: Where does this come from?
    vec3 normalizedDirection = normalize(direction);

    czm_ray ray = czm_ray(u_positionWC, normalizedDirection);
    czm_raySegment intersection = czm_raySphereIntersectionInterval(ray, vec3(0.0), atmosphereInnerRadius);
    float d = czm_branchFreeTernary(czm_isEmpty(intersection), radius, clamp(intersection.start, ellipsoidHeight, radius));

    // Compute sky color for each position on a sphere at radius centered around the model's origin
    vec3 skyPositionWC = u_positionWC + normalizedDirection * d;

    float lightEnum = u_radiiAndDynamicAtmosphereColor.z;
    vec3 lightDirectionWC = czm_getDynamicAtmosphereLightDirection(skyPositionWC, lightEnum);

    // Use the computed position for the sky color calculation
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

    // Alter the opacity based on how close the object is to the ground.
    // (0.0 = At edge of atmosphere, 1.0 = On ground)
    opacity = clamp((atmosphereOuterRadius - height) / (atmosphereOuterRadius - atmosphereInnerRadius), 0.0, 1.0);

    vec3 sceneSkyBoxColor = czm_textureCube(czm_environmentMap, normalizedDirection).rgb; // TODO: I'm not sure if this is oriented correctly
    vec3 groundColor = mix(vec3(0.0), u_groundColor.xyz, u_groundColor.a * (1.0 - ellipsoidHeight / atmosphereHeight));
    vec3 backgroundColor = czm_branchFreeTernary(czm_isEmpty(intersection), sceneSkyBoxColor, groundColor);

    float intensity = u_brightnessSaturationGammaIntensity.w;
    vec3 adjustedSkyColor = skyColor.rgb * intensity;

    vec4 color = vec4(mix(backgroundColor, adjustedSkyColor, skyColor.a), 1.0);

    // TODO: HDR?

    #ifdef COLOR_CORRECT
        const bool ignoreBlackPixels = true;
        color.rgb = czm_applyHSBShift(color.rgb, u_hsbShift, ignoreBlackPixels);
    #endif

    float brightness = u_brightnessSaturationGammaIntensity.x;
    float saturation = u_brightnessSaturationGammaIntensity.y;
    float gamma = u_brightnessSaturationGammaIntensity.z;

    color.rgb = mix(vec3(0.0), color.rgb, brightness);
    color.rgb = czm_saturation(color.rgb, saturation);
    color.rgb = pow(color.rgb, vec3(gamma));
    color.rgb = czm_gammaCorrect(color.rgb);

    out_FragColor = color;
}
