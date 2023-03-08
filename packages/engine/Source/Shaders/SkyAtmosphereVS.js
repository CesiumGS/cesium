//This file is automatically rebuilt by the Cesium build process.
export default "attribute vec4 position;\n\
\n\
varying vec3 v_outerPositionWC;\n\
\n\
#ifndef PER_FRAGMENT_ATMOSPHERE\n\
varying vec3 v_mieColor;\n\
varying vec3 v_rayleighColor;\n\
varying float v_opacity;\n\
varying float v_translucent;\n\
#endif\n\
\n\
void main(void)\n\
{\n\
    vec4 positionWC = czm_model * position;\n\
    vec3 lightDirection = getLightDirection(positionWC.xyz);\n\
\n\
    #ifndef PER_FRAGMENT_ATMOSPHERE\n\
        computeAtmosphereScattering(\n\
            positionWC.xyz,\n\
            lightDirection,\n\
            v_rayleighColor,\n\
            v_mieColor,\n\
            v_opacity,\n\
            v_translucent\n\
        );\n\
    #endif\n\
    \n\
    v_outerPositionWC = positionWC.xyz;\n\
    gl_Position = czm_modelViewProjection * position;\n\
}\n\
";
