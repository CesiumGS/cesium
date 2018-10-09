//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "/**\n\
 * @private\n\
 */\n\
float czm_alphaWeight(float a)\n\
{\n\
    float z = (gl_FragCoord.z - czm_viewportTransformation[3][2]) / czm_viewportTransformation[2][2];\n\
\n\
    // See Weighted Blended Order-Independent Transparency for examples of different weighting functions:\n\
    // http://jcgt.org/published/0002/02/09/\n\
    return pow(a + 0.01, 4.0) + max(1e-2, min(3.0 * 1e3, 0.003 / (1e-5 + pow(abs(z) / 200.0, 4.0))));\n\
}\n\
";
});