//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "// emulated noperspective\n\
#ifndef LOG_DEPTH\n\
varying float v_WindowZ;\n\
#endif\n\
/**\n\
 * Clamps a vertex to the far plane by writing the fragments depth.\n\
 * <p>\n\
 * The shader must enable the GL_EXT_frag_depth extension.\n\
 * </p>\n\
 *\n\
 * @name czm_writeDepthClampedToFarPlane\n\
 * @glslFunction\n\
 *\n\
 * @example\n\
 * gl_FragColor = color;\n\
 * czm_writeDepthClampedToFarPlane();\n\
 *\n\
 * @see czm_depthClampFarPlane\n\
 */\n\
void czm_writeDepthClampedToFarPlane()\n\
{\n\
#if defined(GL_EXT_frag_depth) && !defined(LOG_DEPTH)\n\
    gl_FragDepthEXT = min(v_WindowZ * gl_FragCoord.w, 1.0);\n\
#endif\n\
}\n\
";
});