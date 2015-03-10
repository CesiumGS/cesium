    //This file is automatically rebuilt by the Cesium build process.
    /*global define*/
    define(function() {
    "use strict";
    return "/**\n\
 * Transforms a position from window to eye coordinates.\n\
 * The transform from window to normalized device coordinates is done using components\n\
 * of (@link czm_viewport} and {@link czm_viewportTransformation} instead of calculating\n\
 * the inverse of <code>czm_viewportTransformation</code>. The transformation from \n\
 * normalized device coordinates to clip coordinates is done using <code>positionWC.w</code>,\n\
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
    float x = 2.0 * (fragmentCoordinate.x - czm_viewport.x) / czm_viewport.z - 1.0;\n\
    float y = 2.0 * (fragmentCoordinate.y - czm_viewport.y) / czm_viewport.w - 1.0;\n\
    float z = (fragmentCoordinate.z - czm_viewportTransformation[3][2]) / czm_viewportTransformation[2][2];\n\
    vec4 q = vec4(x, y, z, 1.0);\n\
    q /= fragmentCoordinate.w;\n\
    q = czm_inverseProjection * q;\n\
    return q;\n\
}\n\
";
});