//This file is automatically rebuilt by the Cesium build process.
export default "attribute vec4 position;\n\
\n\
varying vec3 v_outerPositionWC;\n\
\n\
#ifndef PER_FRAGMENT_ATMOSPHERE\n\
varying vec3 v_mieColor;\n\
varying vec3 v_rayleighColor;\n\
#endif\n\
\n\
void main(void)\n\
{\n\
    vec4 positionWC = czm_model * position;\n\
\n\
#ifndef PER_FRAGMENT_ATMOSPHERE\n\
    calculateMieColorAndRayleighColor(positionWC.xyz, v_mieColor, v_rayleighColor);\n\
#endif\n\
    v_outerPositionWC = positionWC.xyz;\n\
    gl_Position = czm_modelViewProjection * position;\n\
}\n\
";
