/**
 * An enum for the GLSL varying types. These can be used for declaring varyings
 * in {@link CustomShader}
 *
 * @enum {String}
 *
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
const VaryingType = {
  /**
   * A single floating point value.
   *
   * @type {String}
   * @constant
   */
  FLOAT: "float",
  /**
   * A vector of 2 floating point values.
   *
   * @type {String}
   * @constant
   */
  VEC2: "vec2",
  /**
   * A vector of 3 floating point values.
   *
   * @type {String}
   * @constant
   */
  VEC3: "vec3",
  /**
   * A vector of 4 floating point values.
   *
   * @type {String}
   * @constant
   */
  VEC4: "vec4",
  /**
   * A 2x2 matrix of floating point values.
   *
   * @type {String}
   * @constant
   */
  MAT2: "mat2",
  /**
   * A 3x3 matrix of floating point values.
   *
   * @type {String}
   * @constant
   */
  MAT3: "mat2",
  /**
   * A 3x3 matrix of floating point values.
   *
   * @type {String}
   * @constant
   */
  MAT4: "mat4",
};

export default Object.freeze(VaryingType);
