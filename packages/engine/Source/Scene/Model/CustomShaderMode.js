/**
 * An enum describing how the {@link CustomShader} will be added to the
 * fragment shader. This determines how the shader interacts with the material.
 *
 * @enum {String}
 *
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
const CustomShaderMode = {
  /**
   * The custom shader will be used to modify the results of the material stage
   * before lighting is applied.
   *
   * @type {String}
   * @constant
   */
  MODIFY_MATERIAL: "MODIFY_MATERIAL",
  /**
   * The custom shader will be used instead of the material stage. This is a hint
   * to optimize out the material processing code.
   *
   * @type {String}
   * @constant
   */
  REPLACE_MATERIAL: "REPLACE_MATERIAL",
};

/**
 * Convert the shader mode to an uppercase identifier for use in GLSL define
 * directives. For example:  <code>#define CUSTOM_SHADER_MODIFY_MATERIAL</code>
 * @param {CustomShaderMode} customShaderMode The shader mode
 * @return {String} The name of the GLSL macro to use
 *
 * @private
 */
CustomShaderMode.getDefineName = function (customShaderMode) {
  return `CUSTOM_SHADER_${customShaderMode}`;
};

export default Object.freeze(CustomShaderMode);
