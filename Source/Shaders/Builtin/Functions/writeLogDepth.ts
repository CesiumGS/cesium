//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "#ifdef LOG_DEPTH\n\
varying float v_logZ;\n\
#endif\n\
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
void czm_writeLogDepth() {\n\
#ifdef LOG_DEPTH\n\
czm_writeLogDepth(v_logZ);\n\
#endif\n\
}\n\
";
});