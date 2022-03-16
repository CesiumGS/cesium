varying vec3 v_outerPositionWC;

uniform vec3 u_hsbShift;

#ifndef PER_FRAGMENT_ATMOSPHERE
varying vec3 v_mieColor;
varying vec3 v_rayleighColor;
varying float v_opacity;
#endif

void main (void)
{
    vec3 lightDirection = getLightDirection(czm_viewerPositionWC);
   
    vec3 mieColor;
    vec3 rayleighColor;
    float opacity;


#ifdef PER_FRAGMENT_ATMOSPHERE
    computeAtmosphericScattering(
        czm_viewerPositionWC,
        lightDirection,
        rayleighColor,
        mieColor,
        opacity
    );
#else
    mieColor = v_mieColor;
    rayleighColor = v_rayleighColor;
    opacity = v_opacity;
#endif

    vec4 color = computeAtmosphereColor(v_outerPositionWC, lightDirection, rayleighColor, mieColor, opacity);

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

    // Apply tonemapping
    float exposure = 1.0;
    color = vec4(1.0 - exp(-exposure * color));
    float gamma = 0.8;
    color = pow(color, vec4(1.0 / gamma));

    gl_FragColor= color;
}
