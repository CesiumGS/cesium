//This file is automatically rebuilt by the Cesium build process.
export default "float czm_reverseLogDepth(float logZ)\n\
{\n\
#ifdef LOG_DEPTH\n\
    float near = czm_currentFrustum.x;\n\
    float far = czm_currentFrustum.y;\n\
    float log2Depth = logZ * czm_log2FarDepthFromNearPlusOne;\n\
    float depthFromNear = pow(2.0, log2Depth) - 1.0;\n\
    return far * (1.0 - near / (depthFromNear + near)) / (far - near);\n\
#endif\n\
    return logZ;\n\
}\n\
";
