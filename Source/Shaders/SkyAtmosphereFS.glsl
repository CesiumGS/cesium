varying vec3 v_outerPositionWC;

uniform vec3 u_hsbShift;

#ifndef PER_FRAGMENT_ATMOSPHERE
varying vec3 v_mieColor;
varying vec3 v_rayleighColor;
varying float v_opacity;
varying float v_translucent;
#endif

void main (void)
{
    vec3 lightDirection = getLightDirection(czm_viewerPositionWC);
   
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
        // Convert rgb color to hsb
        vec3 hsb = czm_RGBToHSB(color.rgb);
        // Perform hsb shift
        hsb.x += u_hsbShift.x; // hue
        hsb.y = clamp(hsb.y + u_hsbShift.y, 0.0, 1.0); // saturation
        hsb.z = hsb.z > czm_epsilon7 ? hsb.z + u_hsbShift.z : 0.0; // brightness
        // Convert shifted hsb back to rgb
        color.rgb = czm_HSBToRGB(hsb);
    #endif

    // For the parts of the sky atmosphere that are not behind a translucent globe,
    // we mix in the default opacity so that the sky atmosphere still appears at distance.
    // This is needed because the opacity in the sky atmosphere is initially adjusted based
    // on the camera height.
    if (translucent == 0.0) {
        color.a = mix(color.b, 1.0, color.a) * smoothstep(0.0, 1.0, czm_morphTime);
    }

    gl_FragColor = color;
}
