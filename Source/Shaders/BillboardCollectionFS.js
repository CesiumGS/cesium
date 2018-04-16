//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "uniform sampler2D u_atlas;\n\
\n\
#ifdef VECTOR_TILE\n\
uniform vec4 u_highlightColor;\n\
#endif\n\
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
\n\
// Fully transparent parts of the billboard are not pickable.\n\
#if defined(RENDER_FOR_PICK) || (!defined(OPAQUE) && !defined(TRANSLUCENT))\n\
    if (color.a < 0.005)   // matches 0/255 and 1/255\n\
    {\n\
        discard;\n\
    }\n\
#else\n\
// The billboard is rendered twice. The opaque pass discards translucent fragments\n\
// and the translucent pass discards opaque fragments.\n\
#ifdef OPAQUE\n\
    if (color.a < 0.995)   // matches < 254/255\n\
    {\n\
        discard;\n\
    }\n\
#else\n\
    if (color.a >= 0.995)  // matches 254/255 and 255/255\n\
    {\n\
        discard;\n\
    }\n\
#endif\n\
#endif\n\
\n\
#ifdef VECTOR_TILE\n\
    color *= u_highlightColor;\n\
#endif\n\
\n\
#ifdef RENDER_FOR_PICK\n\
    gl_FragColor = v_pickColor;\n\
#else\n\
    gl_FragColor = color;\n\
#endif\n\
\n\
    czm_writeLogDepth();\n\
}\n\
";
});