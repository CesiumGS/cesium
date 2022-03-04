varying vec3 v_outerPositionWC;

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

    gl_FragColor = computeAtmosphereColor(v_outerPositionWC, lightDirection, rayleighColor, mieColor, opacity);
}
