//This file is automatically rebuilt by the Cesium build process.
export default "#ifdef LOG_DEPTH\n\
in float v_depthFromNearPlusOne;\n\
\n\
#ifdef POLYGON_OFFSET\n\
uniform vec2 u_polygonOffset;\n\
#endif\n\
\n\
#endif\n\
\n\
/**\n\
 * Writes the fragment depth to the logarithmic depth buffer.\n\
 * <p>\n\
 * Use this when the vertex shader does not call {@link czm_vertexlogDepth}, for example, when\n\
 * ray-casting geometry using a full screen quad.\n\
 * </p>\n\
 * @name czm_writeLogDepth\n\
 * @glslFunction\n\
 *\n\
 * @param {float} depth The depth coordinate, where 1.0 is on the near plane and\n\
 *                      depth increases in eye-space units from there\n\
 *\n\
 * @example\n\
 * czm_writeLogDepth((czm_projection * v_positionEyeCoordinates).w + 1.0);\n\
 */\n\
void czm_writeLogDepth(float depth)\n\
{\n\
#if (defined(LOG_DEPTH) && (__VERSION__ == 300 || defined(GL_EXT_frag_depth)))\n\
    // Discard the vertex if it's not between the near and far planes.\n\
    // We allow a bit of epsilon on the near plane comparison because a 1.0\n\
    // from the vertex shader (indicating the vertex should be _on_ the near\n\
    // plane) will not necessarily come here as exactly 1.0.\n\
    if (depth <= 0.9999999 || depth > czm_farDepthFromNearPlusOne) {\n\
        discard;\n\
    }\n\
\n\
#ifdef POLYGON_OFFSET\n\
    // Polygon offset: m * factor + r * units\n\
    float factor = u_polygonOffset[0];\n\
    float units = u_polygonOffset[1];\n\
\n\
#if (__VERSION__ == 300 || defined(GL_OES_standard_derivatives))\n\
    // This factor doesn't work in IE 10\n\
    if (factor != 0.0) {\n\
        // m = sqrt(dZdX^2 + dZdY^2);\n\
        float x = dFdx(depth);\n\
        float y = dFdy(depth);\n\
        float m = sqrt(x * x + y * y);\n\
\n\
        // Apply the factor before computing the log depth.\n\
        depth += m * factor;\n\
    }\n\
#endif\n\
\n\
#endif\n\
\n\
    gl_FragDepth = log2(depth) * czm_oneOverLog2FarDepthFromNearPlusOne;\n\
\n\
#ifdef POLYGON_OFFSET\n\
    // Apply the units after the log depth.\n\
    gl_FragDepth += czm_epsilon7 * units;\n\
#endif\n\
\n\
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
    czm_writeLogDepth(v_depthFromNearPlusOne);\n\
#endif\n\
}\n\
";
