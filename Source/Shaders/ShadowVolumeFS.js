//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "#ifdef GL_EXT_frag_depth\n\
#extension GL_EXT_frag_depth : enable\n\
#endif\n\
\n\
#ifdef VECTOR_TILE\n\
uniform vec4 u_highlightColor;\n\
#else\n\
varying vec4 v_color;\n\
#endif\n\
\n\
void main(void)\n\
{\n\
#ifdef VECTOR_TILE\n\
    gl_FragColor = u_highlightColor;\n\
#else\n\
    gl_FragColor = v_color;\n\
#endif\n\
    czm_writeDepthClampedToFarPlane();\n\
}\n\
";
});