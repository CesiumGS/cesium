//This file is automatically rebuilt by the Cesium build process.
export default "vec4 czm_screenToEyeCoordinates(vec4 screenCoordinate)\n\
{\n\
    // Reconstruct NDC coordinates\n\
    float x = 2.0 * screenCoordinate.x - 1.0;\n\
    float y = 2.0 * screenCoordinate.y - 1.0;\n\
    float z = (screenCoordinate.z - czm_viewportTransformation[3][2]) / czm_viewportTransformation[2][2];\n\
    vec4 q = vec4(x, y, z, 1.0);\n\
\n\
    // Reverse the perspective division to obtain clip coordinates.\n\
    q /= screenCoordinate.w;\n\
\n\
    // Reverse the projection transformation to obtain eye coordinates.\n\
    if (!(czm_inverseProjection == mat4(0.0))) // IE and Edge sometimes do something weird with != between mat4s\n\
    {\n\
        q = czm_inverseProjection * q;\n\
    }\n\
    else\n\
    {\n\
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
    return q;\n\
}\n\
\n\
/**\n\
 * Transforms a position from window to eye coordinates.\n\
 * The transform from window to normalized device coordinates is done using components\n\
 * of (@link czm_viewport} and {@link czm_viewportTransformation} instead of calculating\n\
 * the inverse of <code>czm_viewportTransformation</code>. The transformation from\n\
 * normalized device coordinates to clip coordinates is done using <code>fragmentCoordinate.w</code>,\n\
 * which is expected to be the scalar used in the perspective divide. The transformation\n\
 * from clip to eye coordinates is done using {@link czm_inverseProjection}.\n\
 *\n\
 * @name czm_windowToEyeCoordinates\n\
 * @glslFunction\n\
 *\n\
 * @param {vec4} fragmentCoordinate The position in window coordinates to transform.\n\
 *\n\
 * @returns {vec4} The transformed position in eye coordinates.\n\
 *\n\
 * @see czm_modelToWindowCoordinates\n\
 * @see czm_eyeToWindowCoordinates\n\
 * @see czm_inverseProjection\n\
 * @see czm_viewport\n\
 * @see czm_viewportTransformation\n\
 *\n\
 * @example\n\
 * vec4 positionEC = czm_windowToEyeCoordinates(gl_FragCoord);\n\
 */\n\
vec4 czm_windowToEyeCoordinates(vec4 fragmentCoordinate)\n\
{\n\
    vec2 screenCoordXY = (fragmentCoordinate.xy - czm_viewport.xy) / czm_viewport.zw;\n\
    return czm_screenToEyeCoordinates(vec4(screenCoordXY, fragmentCoordinate.zw));\n\
}\n\
\n\
vec4 czm_screenToEyeCoordinates(vec2 screenCoordinateXY, float depthOrLogDepth)\n\
{\n\
    // See reverseLogDepth.glsl. This is separate to re-use the pow.\n\
#if defined(LOG_DEPTH) || defined(LOG_DEPTH_READ_ONLY)\n\
    float near = czm_currentFrustum.x;\n\
    float far = czm_currentFrustum.y;\n\
    float log2Depth = depthOrLogDepth * czm_log2FarDepthFromNearPlusOne;\n\
    float depthFromNear = pow(2.0, log2Depth) - 1.0;\n\
    float depthFromCamera = depthFromNear + near;\n\
    vec4 screenCoord = vec4(screenCoordinateXY, far * (1.0 - near / depthFromCamera) / (far - near), 1.0);\n\
    vec4 eyeCoordinate = czm_screenToEyeCoordinates(screenCoord);\n\
    eyeCoordinate.w = 1.0 / depthFromCamera; // Better precision\n\
    return eyeCoordinate;\n\
#else\n\
    vec4 screenCoord = vec4(screenCoordinateXY, depthOrLogDepth, 1.0);\n\
    vec4 eyeCoordinate = czm_screenToEyeCoordinates(screenCoord);\n\
#endif\n\
    return eyeCoordinate;\n\
}\n\
\n\
/**\n\
 * Transforms a position given as window x/y and a depth or a log depth from window to eye coordinates.\n\
 * This function produces more accurate results for window positions with log depth than\n\
 * conventionally unpacking the log depth using czm_reverseLogDepth and using the standard version\n\
 * of czm_windowToEyeCoordinates.\n\
 *\n\
 * @name czm_windowToEyeCoordinates\n\
 * @glslFunction\n\
 *\n\
 * @param {vec2} fragmentCoordinateXY The XY position in window coordinates to transform.\n\
 * @param {float} depthOrLogDepth A depth or log depth for the fragment.\n\
 *\n\
 * @see czm_modelToWindowCoordinates\n\
 * @see czm_eyeToWindowCoordinates\n\
 * @see czm_inverseProjection\n\
 * @see czm_viewport\n\
 * @see czm_viewportTransformation\n\
 *\n\
 * @returns {vec4} The transformed position in eye coordinates.\n\
 */\n\
vec4 czm_windowToEyeCoordinates(vec2 fragmentCoordinateXY, float depthOrLogDepth)\n\
{\n\
    vec2 screenCoordXY = (fragmentCoordinateXY.xy - czm_viewport.xy) / czm_viewport.zw;\n\
    return czm_screenToEyeCoordinates(screenCoordXY, depthOrLogDepth);\n\
}\n\
";
