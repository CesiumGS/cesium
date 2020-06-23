attribute vec4 position;

varying vec3 v_outerPositionWC;

#ifndef PER_FRAGMENT_ATMOSPHERE
varying vec3 v_mieColor;
varying vec3 v_rayleighColor;
#endif

void main(void)
{
    vec4 positionWC = czm_model * position;

#ifndef PER_FRAGMENT_ATMOSPHERE
    calculateMieColorAndRayleighColor(positionWC.xyz, v_mieColor, v_rayleighColor);
#endif
    v_outerPositionWC = positionWC.xyz;
    gl_Position = czm_modelViewProjection * position;
}
