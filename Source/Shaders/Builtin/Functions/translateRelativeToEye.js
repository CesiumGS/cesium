//This file is automatically rebuilt by the Cesium build process.
export default "/**\n\
 * Translates a position (or any <code>vec3</code>) that was encoded with {@link EncodedCartesian3},\n\
 * and then provided to the shader as separate <code>high</code> and <code>low</code> bits to\n\
 * be relative to the eye.  As shown in the example, the position can then be transformed in eye\n\
 * or clip coordinates using {@link czm_modelViewRelativeToEye} or {@link czm_modelViewProjectionRelativeToEye},\n\
 * respectively.\n\
 * <p>\n\
 * This technique, called GPU RTE, eliminates jittering artifacts when using large coordinates as\n\
 * described in {@link http://help.agi.com/AGIComponents/html/BlogPrecisionsPrecisions.htm|Precisions, Precisions}.\n\
 * </p>\n\
 *\n\
 * @name czm_translateRelativeToEye\n\
 * @glslFunction\n\
 *\n\
 * @param {vec3} high The position's high bits.\n\
 * @param {vec3} low The position's low bits.\n\
 * @returns {vec3} The position translated to be relative to the camera's position.\n\
 *\n\
 * @example\n\
 * attribute vec3 positionHigh;\n\
 * attribute vec3 positionLow;\n\
 *\n\
 * void main()\n\
 * {\n\
 *   vec4 p = czm_translateRelativeToEye(positionHigh, positionLow);\n\
 *   gl_Position = czm_modelViewProjectionRelativeToEye * p;\n\
 * }\n\
 *\n\
 * @see czm_modelViewRelativeToEye\n\
 * @see czm_modelViewProjectionRelativeToEye\n\
 * @see czm_computePosition\n\
 * @see EncodedCartesian3\n\
 */\n\
vec4 czm_translateRelativeToEye(vec3 high, vec3 low)\n\
{\n\
    vec3 highDifference = high - czm_encodedCameraPositionMCHigh;\n\
    vec3 lowDifference = low - czm_encodedCameraPositionMCLow;\n\
\n\
    return vec4(highDifference + lowDifference, 1.0);\n\
}\n\
";
