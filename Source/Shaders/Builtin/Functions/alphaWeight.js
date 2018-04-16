//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "/**\n\
 * @private\n\
 */\n\
float czm_alphaWeight(float a)\n\
{\n\
    float x = 2.0 * (gl_FragCoord.x - czm_viewport.x) / czm_viewport.z - 1.0;\n\
    float y = 2.0 * (gl_FragCoord.y - czm_viewport.y) / czm_viewport.w - 1.0;\n\
    float z = (gl_FragCoord.z - czm_viewportTransformation[3][2]) / czm_viewportTransformation[2][2];\n\
    vec4 q = vec4(x, y, z, 0.0);\n\
    q /= gl_FragCoord.w;\n\
\n\
    if (czm_inverseProjection != mat4(0.0)) {\n\
        q = czm_inverseProjection * q;\n\
    } else {\n\
        float top = czm_frustumPlanes.x;\n\
        float bottom = czm_frustumPlanes.y;\n\
        float left = czm_frustumPlanes.z;\n\
        float right = czm_frustumPlanes.w;\n\
\n\
        float near = czm_currentFrustum.x;\n\
        float far = czm_currentFrustum.y;\n\
\n\
        q.x = (q.x * (right - left) + left + right) * 0.5;\n\
        q.y = (q.y * (top - bottom) + bottom + top) * 0.5;\n\
        q.z = (q.z * (near - far) - near - far) * 0.5;\n\
        q.w = 1.0;\n\
    }\n\
\n\
    // See Weighted Blended Order-Independent Transparency for examples of different weighting functions:\n\
    // http://jcgt.org/published/0002/02/09/    \n\
    return pow(a + 0.01, 4.0) + max(1e-2, min(3.0 * 1e3, 0.003 / (1e-5 + pow(abs(z) / 200.0, 4.0))));\n\
}\n\
";
});