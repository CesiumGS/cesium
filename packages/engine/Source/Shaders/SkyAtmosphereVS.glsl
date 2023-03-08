in vec4 position;

out vec3 v_outerPositionWC;

#ifndef PER_FRAGMENT_ATMOSPHERE
out vec3 v_mieColor;
out vec3 v_rayleighColor;
out float v_opacity;
out float v_translucent;
#endif

void main(void)
{
    vec4 positionWC = czm_model * position;
    vec3 lightDirection = getLightDirection(positionWC.xyz);

    #ifndef PER_FRAGMENT_ATMOSPHERE
        computeAtmosphereScattering(
            positionWC.xyz,
            lightDirection,
            v_rayleighColor,
            v_mieColor,
            v_opacity,
            v_translucent
        );
    #endif
    
    v_outerPositionWC = positionWC.xyz;
    gl_Position = czm_modelViewProjection * position;
}
