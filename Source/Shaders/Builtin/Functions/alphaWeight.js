    //This file is automatically rebuilt by the Cesium build process.
    /*global define*/
    define(function() {
    "use strict";
    return "/**\n\
 * @private\n\
 */\n\
float czm_alphaWeight(float a)\n\
{\n\
    float z;\n\
    if (czm_sceneMode != czm_sceneMode2D)\n\
    {\n\
        float x = 2.0 * (gl_FragCoord.x - czm_viewport.x) / czm_viewport.z - 1.0;\n\
	    float y = 2.0 * (gl_FragCoord.y - czm_viewport.y) / czm_viewport.w - 1.0;\n\
	    z = (gl_FragCoord.z - czm_viewportTransformation[3][2]) / czm_viewportTransformation[2][2];\n\
	    vec4 q = vec4(x, y, z, 0.0);\n\
	    q /= gl_FragCoord.w;\n\
	    z = (czm_inverseProjectionOIT * q).z;\n\
    }\n\
    else\n\
    {\n\
        z = gl_FragCoord.z * (czm_currentFrustum.y - czm_currentFrustum.x) + czm_currentFrustum.x;\n\
    }\n\
    \n\
    // See Weighted Blended Order-Independent Transparency for examples of different weighting functions:\n\
    // http://jcgt.org/published/0002/02/09/\n\
    return pow(a + 0.01, 4.0) + max(1e-2, min(3.0 * 1e3, 100.0 / (1e-5 + pow(abs(z) / 10.0, 3.0) + pow(abs(z) / 200.0, 6.0))));\n\
}";
});