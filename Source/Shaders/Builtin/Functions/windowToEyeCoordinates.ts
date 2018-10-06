//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "vec4 czm_windowToEyeCoordinates(vec4 fragmentCoordinate)\n\
{\n\
float x = 2.0 * (fragmentCoordinate.x - czm_viewport.x) / czm_viewport.z - 1.0;\n\
float y = 2.0 * (fragmentCoordinate.y - czm_viewport.y) / czm_viewport.w - 1.0;\n\
float z = (fragmentCoordinate.z - czm_viewportTransformation[3][2]) / czm_viewportTransformation[2][2];\n\
vec4 q = vec4(x, y, z, 1.0);\n\
q /= fragmentCoordinate.w;\n\
if (!(czm_inverseProjection == mat4(0.0)))\n\
{\n\
q = czm_inverseProjection * q;\n\
}\n\
else\n\
{\n\
float top = czm_frustumPlanes.x;\n\
float bottom = czm_frustumPlanes.y;\n\
float left = czm_frustumPlanes.z;\n\
float right = czm_frustumPlanes.w;\n\
float near = czm_currentFrustum.x;\n\
float far = czm_currentFrustum.y;\n\
q.x = (q.x * (right - left) + left + right) * 0.5;\n\
q.y = (q.y * (top - bottom) + bottom + top) * 0.5;\n\
q.z = (q.z * (near - far) - near - far) * 0.5;\n\
q.w = 1.0;\n\
}\n\
return q;\n\
}\n\
vec4 czm_windowToEyeCoordinates(vec2 fragmentCoordinateXY, float depthOrLogDepth)\n\
{\n\
#ifdef LOG_DEPTH\n\
float near = czm_currentFrustum.x;\n\
float far = czm_currentFrustum.y;\n\
float unscaledDepth = pow(2.0, depthOrLogDepth * czm_log2FarPlusOne) - 1.0;\n\
vec4 windowCoord = vec4(fragmentCoordinateXY, far * (1.0 - near / unscaledDepth) / (far - near), 1.0);\n\
vec4 eyeCoordinate = czm_windowToEyeCoordinates(windowCoord);\n\
eyeCoordinate.w = 1.0 / unscaledDepth;\n\
#else\n\
vec4 windowCoord = vec4(fragmentCoordinateXY, depthOrLogDepth, 1.0);\n\
vec4 eyeCoordinate = czm_windowToEyeCoordinates(windowCoord);\n\
#endif\n\
return eyeCoordinate;\n\
}\n\
";
});