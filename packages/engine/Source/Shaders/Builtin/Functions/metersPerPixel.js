//This file is automatically rebuilt by the Cesium build process.
export default "/**\n\
 * Computes the size of a pixel in meters at a distance from the eye.\n\
 * <p>\n\
 * Use this version when passing in a custom pixel ratio. For example, passing in 1.0 will return meters per native device pixel.\n\
 * </p>\n\
 * @name czm_metersPerPixel\n\
 * @glslFunction\n\
 *\n\
 * @param {vec3} positionEC The position to get the meters per pixel in eye coordinates.\n\
 * @param {float} pixelRatio The scaling factor from pixel space to coordinate space\n\
 *\n\
 * @returns {float} The meters per pixel at positionEC.\n\
 */\n\
float czm_metersPerPixel(vec4 positionEC, float pixelRatio)\n\
{\n\
    float width = czm_viewport.z;\n\
    float height = czm_viewport.w;\n\
    float pixelWidth;\n\
    float pixelHeight;\n\
\n\
    float top = czm_frustumPlanes.x;\n\
    float bottom = czm_frustumPlanes.y;\n\
    float left = czm_frustumPlanes.z;\n\
    float right = czm_frustumPlanes.w;\n\
\n\
    if (czm_sceneMode == czm_sceneMode2D || czm_orthographicIn3D == 1.0)\n\
    {\n\
        float frustumWidth = right - left;\n\
        float frustumHeight = top - bottom;\n\
        pixelWidth = frustumWidth / width;\n\
        pixelHeight = frustumHeight / height;\n\
    }\n\
    else\n\
    {\n\
        float distanceToPixel = -positionEC.z;\n\
        float inverseNear = 1.0 / czm_currentFrustum.x;\n\
        float tanTheta = top * inverseNear;\n\
        pixelHeight = 2.0 * distanceToPixel * tanTheta / height;\n\
        tanTheta = right * inverseNear;\n\
        pixelWidth = 2.0 * distanceToPixel * tanTheta / width;\n\
    }\n\
\n\
    return max(pixelWidth, pixelHeight) * pixelRatio;\n\
}\n\
\n\
/**\n\
 * Computes the size of a pixel in meters at a distance from the eye.\n\
 * <p>\n\
 * Use this version when scaling by pixel ratio.\n\
 * </p>\n\
 * @name czm_metersPerPixel\n\
 * @glslFunction\n\
 *\n\
 * @param {vec3} positionEC The position to get the meters per pixel in eye coordinates.\n\
 *\n\
 * @returns {float} The meters per pixel at positionEC.\n\
 */\n\
float czm_metersPerPixel(vec4 positionEC)\n\
{\n\
    return czm_metersPerPixel(positionEC, czm_pixelRatio);\n\
}\n\
";
