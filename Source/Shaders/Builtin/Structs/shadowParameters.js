//This file is automatically rebuilt by the Cesium build process.
export default "struct czm_shadowParameters\n\
{\n\
#ifdef USE_CUBE_MAP_SHADOW\n\
    vec3 texCoords;\n\
#else\n\
    vec2 texCoords;\n\
#endif\n\
\n\
    float depthBias;\n\
    float depth;\n\
    float nDotL;\n\
    vec2 texelStepSize;\n\
    float normalShadingSmooth;\n\
    float darkness;\n\
};\n\
";
