varying vec3 v_outerPositionWC;

#ifndef PER_FRAGMENT_ATMOSPHERE
varying vec3 v_mieColor;
varying vec3 v_rayleighColor;
varying float v_opacity;
#endif

void main (void)
{
    
    vec3 posToEye = v_outerPositionWC - czm_viewerPositionWC;
    vec3 direction = normalize(posToEye);
    vec3 lightDirection = getLightDirection(czm_viewerPositionWC);
    vec3 mieColor;
    vec3 rayleighColor;
    float opacity;
    float distance = length(posToEye);

#ifdef PER_FRAGMENT_ATMOSPHERE
    computeScattering(
        czm_viewerPositionWC,
        direction,
        distance,
        lightDirection,
        rayleighColor, mieColor, opacity
    );
#else
    mieColor = v_mieColor;
    rayleighColor = v_rayleighColor;
#endif

    gl_FragColor = computeFinalColor(v_outerPositionWC,direction, lightDirection, rayleighColor, mieColor,  opacity);
}
