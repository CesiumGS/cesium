    //This file is automatically rebuilt by the Cesium build process.
    /*global define*/
    define(function() {
    "use strict";
    return "#ifdef MRT\n\
#extension GL_EXT_draw_buffers : enable\n\
#endif\n\
\n\
uniform vec4 u_bgColor;\n\
uniform sampler2D u_depthTexture;\n\
\n\
varying vec2 v_textureCoordinates;\n\
\n\
void main()\n\
{\n\
    if (texture2D(u_depthTexture, v_textureCoordinates).r < 1.0)\n\
    {\n\
#ifdef MRT\n\
        gl_FragData[0] = u_bgColor;\n\
        gl_FragData[1] = vec4(u_bgColor.a);\n\
#else\n\
        gl_FragColor = u_bgColor;\n\
#endif\n\
        return;\n\
    }\n\
    \n\
    discard;\n\
}";
});