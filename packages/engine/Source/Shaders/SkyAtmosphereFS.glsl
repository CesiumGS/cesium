in vec3 v_outerPositionWC;

uniform vec3 u_hsbShift;

#ifndef PER_FRAGMENT_ATMOSPHERE
in vec3 v_mieColor;
in vec3 v_rayleighColor;
in float v_opacity;
in float v_translucent;
#endif

void main (void)
{
    float lightEnum = u_radiiAndDynamicAtmosphereColor.z;
    vec3 lightDirection = czm_getDynamicAtmosphereLightDirection(v_outerPositionWC, lightEnum);

    vec3 mieColor;
    vec3 rayleighColor;
    float opacity;
    float translucent;

    #ifdef PER_FRAGMENT_ATMOSPHERE
        computeAtmosphereScattering(
            v_outerPositionWC,
            lightDirection,
            rayleighColor,
            mieColor,
            opacity,
            translucent
        );
    #else
        mieColor = v_mieColor;
        rayleighColor = v_rayleighColor;
        opacity = v_opacity;
        translucent = v_translucent;
    #endif

    vec4 color = computeAtmosphereColor(v_outerPositionWC, lightDirection, rayleighColor, mieColor, opacity);

    #ifndef HDR
        color.rgb = czm_acesTonemapping(color.rgb);
        color.rgb = czm_inverseGamma(color.rgb);
    #endif

    #ifdef COLOR_CORRECT
        const bool ignoreBlackPixels = true;
        color.rgb = czm_applyHSBShift(color.rgb, u_hsbShift, ignoreBlackPixels);
    #endif

    // For the parts of the sky atmosphere that are not behind a translucent globe,
    // we mix in the default opacity so that the sky atmosphere still appears at distance.
    // This is needed because the opacity in the sky atmosphere is initially adjusted based
    // on the camera height.
    if (translucent == 0.0) {
        color.a = mix(color.b, 1.0, color.a) * smoothstep(0.0, 1.0, czm_morphTime);
    }

    out_FragColor = color;
}
