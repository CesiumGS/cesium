//This file is automatically rebuilt by the Cesium build process.
export default "varying vec3 v_outerPositionWC;\n\
\n\
#ifndef PER_FRAGMENT_ATMOSPHERE\n\
varying vec3 v_mieColor;\n\
varying vec3 v_rayleighColor;\n\
#endif\n\
\n\
void main (void)\n\
{\n\
    vec3 toCamera = czm_viewerPositionWC - v_outerPositionWC;\n\
    vec3 lightDirection = getLightDirection(czm_viewerPositionWC);\n\
    vec3 mieColor;\n\
    vec3 rayleighColor;\n\
\n\
#ifdef PER_FRAGMENT_ATMOSPHERE\n\
    calculateMieColorAndRayleighColor(v_outerPositionWC, mieColor, rayleighColor);\n\
#else\n\
    mieColor = v_mieColor;\n\
    rayleighColor = v_rayleighColor;\n\
#endif\n\
\n\
    gl_FragColor = calculateFinalColor(czm_viewerPositionWC, toCamera, lightDirection, mieColor, rayleighColor);\n\
}\n\
";
