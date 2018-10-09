//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "float czm_reverseLogDepth(float logZ)\n\
{\n\
#ifdef LOG_DEPTH\n\
    float near = czm_currentFrustum.x;\n\
    float far = czm_currentFrustum.y;\n\
    logZ = pow(2.0, logZ * czm_log2FarPlusOne) - 1.0;\n\
    logZ = far * (1.0 - near / logZ) / (far - near);\n\
#endif\n\
    return logZ;\n\
}\n\
";
});