/**
 * An enum of the basic GLSL uniform types. These can be used with
 * {@link CustomShader} to declare user-defined uniforms.
 *
 * @enum {string}
 *
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
const UniformType = {
  /**
   * A single floating point value.
   *
   * @type {string}
   * @constant
   */
  FLOAT: "float",
  /**
   * A vector of 2 floating point values.
   *
   * @type {string}
   * @constant
   */
  VEC2: "vec2",
  /**
   * A vector of 3 floating point values.
   *
   * @type {string}
   * @constant
   */
  VEC3: "vec3",
  /**
   * A vector of 4 floating point values.
   *
   * @type {string}
   * @constant
   */
  VEC4: "vec4",
  /**
   * A single integer value
   *
   * @type {string}
   * @constant
   */
  INT: "int",
  /**
   * A vector of 2 integer values.
   *
   * @type {string}
   * @constant
   */
  INT_VEC2: "ivec2",
  /**
   * A vector of 3 integer values.
   *
   * @type {string}
   * @constant
   */
  INT_VEC3: "ivec3",
  /**
   * A vector of 4 integer values.
   *
   * @type {string}
   * @constant
   */
  INT_VEC4: "ivec4",
  /**
   * A single boolean value.
   *
   * @type {string}
   * @constant
   */
  BOOL: "bool",
  /**
   * A vector of 2 boolean values.
   *
   * @type {string}
   * @constant
   */
  BOOL_VEC2: "bvec2",
  /**
   * A vector of 3 boolean values.
   *
   * @type {string}
   * @constant
   */
  BOOL_VEC3: "bvec3",
  /**
   * A vector of 4 boolean values.
   *
   * @type {string}
   * @constant
   */
  BOOL_VEC4: "bvec4",
  /**
   * A 2x2 matrix of floating point values.
   *
   * @type {string}
   * @constant
   */
  MAT2: "mat2",
  /**
   * A 3x3 matrix of floating point values.
   *
   * @type {string}
   * @constant
   */
  MAT3: "mat3",
  /**
   * A 4x4 matrix of floating point values.
   *
   * @type {string}
   * @constant
   */
  MAT4: "mat4",
  /**
   * A 2D sampled texture.
   * @type {string}
   * @constant
   */
  SAMPLER_2D: "sampler2D",
  SAMPLER_CUBE: "samplerCube",
};

export default Object.freeze(UniformType);
