precision highp float;

in vec2 v_textureCoordinates;

uniform vec3 u_faceDirection; // Current cubemap face
uniform vec3 u_positionWC;
uniform mat4 u_enuToFixedFrame;

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

float computeHorizonAngle(vec3 positionWC, float ellipsoidRadius) {
    // Approximate a sphere
    float height = length(positionWC);
   return asin(ellipsoidRadius/height);
}

float computeOcclusion(vec3 positionWC, vec3 normalWC, float ellipsoidRadius, float maxRadius) {
   // From https://ceur-ws.org/Vol-3027/paper5.pdf
   float alpha = computeHorizonAngle(positionWC, ellipsoidRadius);
    return 1.0 / (2.0 * czm_pi) * abs(sin(czm_pi - alpha));
}

void main() {    
    float height = length(u_positionWC);
    float ellipsoidHeight = height - u_radiiAndDynamicAtmosphereColor.y;
    float radius = max(u_radiiAndDynamicAtmosphereColor.x - height, 2.0 * ellipsoidHeight);

    vec3 direction = (u_enuToFixedFrame * getCubeMapDirection(v_textureCoordinates, u_faceDirection)).xyz * vec3(1.0, 1.0, -1.0); // TODO: Where does this come from?
    vec3 normalizedDirection = normalize(direction);

    czm_ray ray = czm_ray(u_positionWC, normalizedDirection);
    czm_raySegment intersection = czm_rayEllipsoidIntersectionInterval(ray, vec3(0.0), czm_ellipsoidInverseRadii);
    float d = czm_branchFreeTernary(czm_isEmpty(intersection), radius, clamp(intersection.start, ellipsoidHeight, radius));

    // Compute sky color for each position on a sphere at radius centered around the model's origin
    vec3 skyPositionWC = u_positionWC + normalizedDirection * d;

    float lightEnum = u_radiiAndDynamicAtmosphereColor.z;
    vec3 lightDirectionWC = czm_getDynamicAtmosphereLightDirection(skyPositionWC, lightEnum);

    // Use the computed position for the sky color calculation
    vec3 mieColor;
    vec3 rayleighColor;
    float opacity;
    float translucent;
    computeScattering(
        ray,
        d,
        lightDirectionWC,
        u_radiiAndDynamicAtmosphereColor.y,
        rayleighColor,
        mieColor,
        opacity
    );
    vec4 skyColor = computeAtmosphereColor(skyPositionWC, lightDirectionWC, rayleighColor, mieColor, opacity);

    vec3 sceneSkyBox = vec3(0.0);//czm_textureCube(czm_environmentMap, vec3(v_textureCoordinates, 1.0)).rgb; // TODO

    float transmittanceModifier = 0.5;
    float transmittance = transmittanceModifier + clamp(1.0 - skyColor.a, 0.0, 1.0);
    
    // Scale the sky radiance based on the overall amount of un-occluded light
    float scalar = 1.61;//computeOcclusion(u_positionWC, normalizedDirection, u_radiiAndDynamicAtmosphereColor.y, radius);
    vec3 adjustedSkyColor = skyColor.rgb * scalar;// * transmittance;

    vec4 color = vec4(mix(sceneSkyBox, adjustedSkyColor, skyColor.a), 1.0);

    // #ifndef HDR
    //     color.rgb = czm_acesTonemapping(color.rgb);
    //     color.rgb = czm_inverseGamma(color.rgb);
    // #endif

    #ifdef COLOR_CORRECT
        const bool ignoreBlackPixels = true;
        color.rgb = czm_applyHSBShift(color.rgb, u_hsbShift, ignoreBlackPixels);
    #endif

    // #ifndef HDR
    //     color.rgb = vec3(1.0) - exp(-fExposure * color.rgb);
    // #else
        color.rgb = czm_saturation(color.rgb, 0.8);
    // #endif

    color.rgb = czm_gammaCorrect(color.rgb);

    out_FragColor = color;
}
