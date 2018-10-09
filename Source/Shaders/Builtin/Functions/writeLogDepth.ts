//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "#ifdef LOG_DEPTH\n\
varying float v_logZ;\n\
#endif\n\
\n\
/**\n\
 * Writes the fragment depth to the logarithmic depth buffer.\n\
 * <p>\n\
 * Use this when the vertex shader does not calls {@link czm_vertexlogDepth}, for example, when\n\
 * ray-casting geometry using a full screen quad.\n\
 * </p>\n\
 * @name czm_writeLogDepth\n\
 * @glslFunction\n\
 *\n\
 * @param {float} logZ The w coordinate of the vertex in clip coordinates plus 1.0.\n\
 *\n\
 * @example\n\
 * czm_writeLogDepth((czm_projection * v_positionEyeCoordinates).w + 1.0);\n\
 */\n\
void czm_writeLogDepth(float logZ)\n\
{\n\
#if defined(GL_EXT_frag_depth) && defined(LOG_DEPTH) && !defined(DISABLE_LOG_DEPTH_FRAGMENT_WRITE)\n\
    float halfLogFarDistance = czm_log2FarDistance * 0.5;\n\
    float depth = log2(logZ);\n\
    if (depth < czm_log2NearDistance) {\n\
        discard;\n\
    }\n\
    gl_FragDepthEXT = depth * halfLogFarDistance;\n\
#endif\n\
}\n\
\n\
/**\n\
 * Writes the fragment depth to the logarithmic depth buffer.\n\
 * <p>\n\
 * Use this when the vertex shader calls {@link czm_vertexlogDepth}.\n\
 * </p>\n\
 *\n\
 * @name czm_writeLogDepth\n\
 * @glslFunction\n\
 */\n\
void czm_writeLogDepth() {\n\
#ifdef LOG_DEPTH\n\
    czm_writeLogDepth(v_logZ);\n\
#endif\n\
}\n\
";
});