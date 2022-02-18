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


    
    vec3 posToEye = positionWC.xyz - czm_viewerPositionWC;
    vec3 direction = normalize(posToEye);
    vec3 lightDirection = normalize(czm_sunPositionWC);

    float distance = length(posToEye);



#ifndef PER_FRAGMENT_ATMOSPHERE
    computeScattering(
        czm_viewerPositionWC,
        direction,
        distance,
        lightDirection,
        v_rayleighColor, v_mieColor, v_opacity
    );
#endif
    v_outerPositionWC = positionWC.xyz;
    gl_Position = czm_modelViewProjection * position;
}
