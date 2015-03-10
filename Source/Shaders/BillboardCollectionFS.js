    //This file is automatically rebuilt by the Cesium build process.
    /*global define*/
    define(function() {
    "use strict";
    return "uniform sampler2D u_atlas;\n\
\n\
varying vec2 v_textureCoordinates;\n\
\n\
#ifdef RENDER_FOR_PICK\n\
varying vec4 v_pickColor;\n\
#else\n\
varying vec4 v_color;\n\
#endif\n\
\n\
void main()\n\
{\n\
#ifdef RENDER_FOR_PICK\n\
    vec4 vertexColor = vec4(1.0, 1.0, 1.0, 1.0);\n\
#else\n\
    vec4 vertexColor = v_color;\n\
#endif\n\
    \n\
    vec4 color = texture2D(u_atlas, v_textureCoordinates) * vertexColor;\n\
    if (color.a == 0.0)\n\
    {\n\
        discard;\n\
    }\n\
    \n\
#ifdef RENDER_FOR_PICK\n\
    gl_FragColor = v_pickColor;\n\
#else\n\
    gl_FragColor = color;\n\
#endif\n\
}";
});