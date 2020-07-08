varying vec3 v_outerPositionWC;

#ifdef SPLIT_ATMOSPHERE
uniform float u_splitDirection;
#endif

#ifndef PER_FRAGMENT_ATMOSPHERE
varying vec3 v_mieColor;
varying vec3 v_rayleighColor;
#endif

void main (void)
{
#ifdef SPLIT_ATMOSPHERE
    float splitPosition = czm_imagerySplitPosition;
    if (u_splitDirection < 0.0 && gl_FragCoord.x > splitPosition) {
        discard;
    } else if (u_splitDirection > 0.0 && gl_FragCoord.x < splitPosition) {
        discard;
    }
#endif

    vec3 toCamera = czm_viewerPositionWC - v_outerPositionWC;
    vec3 lightDirection = getLightDirection(czm_viewerPositionWC);
    vec3 mieColor;
    vec3 rayleighColor;

#ifdef PER_FRAGMENT_ATMOSPHERE
    calculateMieColorAndRayleighColor(v_outerPositionWC, mieColor, rayleighColor);
#else
    mieColor = v_mieColor;
    rayleighColor = v_rayleighColor;
#endif

    gl_FragColor = calculateFinalColor(czm_viewerPositionWC, toCamera, lightDirection, mieColor, rayleighColor);
}
