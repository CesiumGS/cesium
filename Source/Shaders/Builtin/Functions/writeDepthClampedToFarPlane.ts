//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "#ifndef LOG_DEPTH\n\
varying float v_WindowZ;\n\
#endif\n\
void czm_writeDepthClampedToFarPlane()\n\
{\n\
#if defined(GL_EXT_frag_depth) && !defined(LOG_DEPTH)\n\
gl_FragDepthEXT = min(v_WindowZ * gl_FragCoord.w, 1.0);\n\
#endif\n\
}\n\
";
});