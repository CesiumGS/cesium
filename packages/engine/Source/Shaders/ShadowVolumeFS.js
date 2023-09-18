//This file is automatically rebuilt by the Cesium build process.
export default "#ifdef VECTOR_TILE\n\
uniform vec4 u_highlightColor;\n\
#endif\n\
\n\
void main(void)\n\
{\n\
#ifdef VECTOR_TILE\n\
    out_FragColor = czm_gammaCorrect(u_highlightColor);\n\
#else\n\
    out_FragColor = vec4(1.0);\n\
#endif\n\
    czm_writeDepthClamp();\n\
}\n\
";
