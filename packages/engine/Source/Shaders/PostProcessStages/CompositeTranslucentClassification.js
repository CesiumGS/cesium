//This file is automatically rebuilt by the Cesium build process.
export default "uniform sampler2D colorTexture;\n\
\n\
#ifdef DEBUG_SHOW_DEPTH\n\
uniform sampler2D u_packedTranslucentDepth;\n\
#endif\n\
\n\
varying vec2 v_textureCoordinates;\n\
\n\
void main()\n\
{\n\
#ifdef DEBUG_SHOW_DEPTH\n\
    if (v_textureCoordinates.x < 0.5)\n\
    {\n\
        gl_FragColor.rgb = vec3(czm_unpackDepth(texture2D(u_packedTranslucentDepth, v_textureCoordinates)));\n\
        gl_FragColor.a = 1.0;\n\
    }\n\
#else\n\
    vec4 color = texture2D(colorTexture, v_textureCoordinates);\n\
\n\
#ifdef PICK\n\
    if (color == vec4(0.0))\n\
    {\n\
        discard;\n\
    }\n\
#else\n\
    // Reverse premultiplication process to get the correct composited result of the classification primitives\n\
    color.rgb /= color.a;\n\
#endif\n\
    gl_FragColor = color;\n\
#endif\n\
}\n\
";
