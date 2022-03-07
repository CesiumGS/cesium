attribute vec4 position;

varying vec3 v_outerPositionWC;

#ifndef PER_FRAGMENT_ATMOSPHERE
varying vec3 v_mieColor;
varying vec3 v_rayleighColor;
varying float v_opacity;
#endif

void main(void)
{
    vec4 positionWC = czm_model * position;
    vec3 lightDirection = getLightDirection(positionWC.xyz);

#ifndef PER_FRAGMENT_ATMOSPHERE
    computeAtmosphericScattering(
        positionWC.xyz,
        lightDirection,
        v_rayleighColor,
        v_mieColor,
        v_opacity
    );
#endif
    v_outerPositionWC = positionWC.xyz;
    gl_Position = czm_modelViewProjection * position;
}
