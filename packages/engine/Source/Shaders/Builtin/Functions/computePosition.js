//This file is automatically rebuilt by the Cesium build process.
export default "/**\n\
 * Returns a position in model coordinates relative to eye taking into\n\
 * account the current scene mode: 3D, 2D, or Columbus view.\n\
 * <p>\n\
 * This uses standard position attributes, <code>position3DHigh</code>, \n\
 * <code>position3DLow</code>, <code>position2DHigh</code>, and <code>position2DLow</code>, \n\
 * and should be used when writing a vertex shader for an {@link Appearance}.\n\
 * </p>\n\
 *\n\
 * @name czm_computePosition\n\
 * @glslFunction\n\
 *\n\
 * @returns {vec4} The position relative to eye.\n\
 *\n\
 * @example\n\
 * vec4 p = czm_computePosition();\n\
 * v_positionEC = (czm_modelViewRelativeToEye * p).xyz;\n\
 * gl_Position = czm_modelViewProjectionRelativeToEye * p;\n\
 *\n\
 * @see czm_translateRelativeToEye\n\
 */\n\
vec4 czm_computePosition();\n\
";
