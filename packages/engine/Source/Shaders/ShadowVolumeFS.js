//This file is automatically rebuilt by the Cesium build process.
export default "#ifdef GL_EXT_frag_depth\n\
#extension GL_EXT_frag_depth : enable\n\
#endif\n\
\n\
#ifdef VECTOR_TILE\n\
uniform vec4 u_highlightColor;\n\
#endif\n\
\n\
void main(void)\n\
{\n\
#ifdef VECTOR_TILE\n\
    gl_FragColor = czm_gammaCorrect(u_highlightColor);\n\
#else\n\
    gl_FragColor = vec4(1.0);\n\
#endif\n\
    czm_writeDepthClamp();\n\
}\n\
";
