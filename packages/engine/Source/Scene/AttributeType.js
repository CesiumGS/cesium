import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartesian4 from "../Core/Cartesian4.js";
import Check from "../Core/Check.js";
import DeveloperError from "../Core/DeveloperError.js";
import Matrix2 from "../Core/Matrix2.js";
import Matrix3 from "../Core/Matrix3.js";
import Matrix4 from "../Core/Matrix4.js";

/**
 * The attribute data types used for rendering glTF and 3D Tiles.
 * @type {Record<string,string>}
 * @private
 */
const AttributeType = {
  /**
   * The attribute is a ingle-precision floating-point number.
   * @type {string}
   * @constant
   */
  SCALAR: "SCALAR",

  /**
   * The attribute is a two-component vector of single-precision floating-point numbers.
   * @type {string}
   * @constant
   */
  VEC2: "VEC2",

  /**
   * The attribute is a three-component vector of single-precision floating-point numbers.
   * @type {string}
   * @constant
   */
  VEC3: "VEC3",

  /**
   * The attribute is a four-component vector of single-precision floating-point numbers.
   * @type {string}
   * @constant
   */
  VEC4: "VEC4",

  /**
   * The attribute is a 32-bit signed integer.
   * @type {string}
   * @constant
   */
  INT: "INT",

  /**
   * The attribute is a two-component vector of a signed integers.
   *
   * @type {string}
   * @constant
   */
  IVEC2: "IVEC2",

  /**
   * The attribute is a three-component vector of a signed integers.
   * @type {string}
   * @constant
   */
  IVEC3: "IVEC3",

  /**
   * The attribute is a four-component vector of a signed integers.
   * @type {string}
   * @constant
   */
  IVEC4: "IVEC4",

  /**
   * The attribute is a 2x2 matrix.
   * @type {string}
   * @constant
   */
  MAT2: "MAT2",

  /**
   * The attribute is a 3x3 matrix.
   * @type {string}
   * @constant
   */
  MAT3: "MAT3",

  /**
   * The attribute is a 4x4 matrix.
   * @type {string}
   * @constant
   */
  MAT4: "MAT4",
};

/**
 * Gets the scalar, vector, or matrix type for the attribute type.
 *
 * @param {AttributeType} attributeType The attribute type.
 * @returns {*} The math type.
 *
 * @private
 */
AttributeType.getMathType = function (attributeType) {
  switch (attributeType) {
    case AttributeType.SCALAR:
    case AttributeType.INT:
      return Number;
    case AttributeType.VEC2:
    case AttributeType.IVEC2:
      return Cartesian2;
    case AttributeType.VEC3:
    case AttributeType.IVEC3:
      return Cartesian3;
    case AttributeType.VEC4:
    case AttributeType.IVEC4:
      return Cartesian4;
    case AttributeType.MAT2:
      return Matrix2;
    case AttributeType.MAT3:
      return Matrix3;
    case AttributeType.MAT4:
      return Matrix4;
    //>>includeStart('debug', pragmas.debug);
    default:
      throw new DeveloperError("attributeType is not a valid value.");
    //>>includeEnd('debug');
  }
};

/**
 * Gets the number of components per attribute.
 *
 * @param {AttributeType} attributeType The attribute type.
 * @returns {number} The number of components.
 *
 * @private
 */
AttributeType.getNumberOfComponents = function (attributeType) {
  switch (attributeType) {
    case AttributeType.SCALAR:
    case AttributeType.INT:
      return 1;
    case AttributeType.VEC2:
    case AttributeType.IVEC2:
      return 2;
    case AttributeType.VEC3:
    case AttributeType.IVEC3:
      return 3;
    case AttributeType.VEC4:
    case AttributeType.IVEC4:
    case AttributeType.MAT2:
      return 4;
    case AttributeType.MAT3:
      return 9;
    case AttributeType.MAT4:
      return 16;
    //>>includeStart('debug', pragmas.debug);
    default:
      throw new DeveloperError("attributeType is not a valid value.");
    //>>includeEnd('debug');
  }
};

/**
 * Get the number of attribute locations needed to fit this attribute. Most
 * types require one, but matrices require multiple attribute locations.
 *
 * @param {AttributeType} attributeType The attribute type.
 * @returns {number} The number of attribute locations needed in the shader
 *
 * @private
 */
AttributeType.getAttributeLocationCount = function (attributeType) {
  switch (attributeType) {
    case AttributeType.SCALAR:
    case AttributeType.VEC2:
    case AttributeType.VEC3:
    case AttributeType.VEC4:
    case AttributeType.INT:
    case AttributeType.IVEC2:
    case AttributeType.IVEC3:
    case AttributeType.IVEC4:
      return 1;
    case AttributeType.MAT2:
      return 2;
    case AttributeType.MAT3:
      return 3;
    case AttributeType.MAT4:
      return 4;
    //>>includeStart('debug', pragmas.debug);
    default:
      throw new DeveloperError("attributeType is not a valid value.");
    //>>includeEnd('debug');
  }
};

/**
 * Gets the GLSL type for the attribute type.
 *
 * @param {AttributeType} attributeType The attribute type.
 * @returns {string} The GLSL type for the attribute type.
 *
 * @private
 */
AttributeType.getGlslType = function (attributeType) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("attributeType", attributeType);
  //>>includeEnd('debug');

  switch (attributeType) {
    case AttributeType.SCALAR:
      return "float";
    case AttributeType.VEC2:
      return "vec2";
    case AttributeType.VEC3:
      return "vec3";
    case AttributeType.VEC4:
      return "vec4";
    case AttributeType.INT:
      return "int";
    case AttributeType.IVEC2:
      return "ivec2";
    case AttributeType.IVEC3:
      return "ivec3";
    case AttributeType.IVEC4:
      return "ivec4";
    case AttributeType.MAT2:
      return "mat2";
    case AttributeType.MAT3:
      return "mat3";
    case AttributeType.MAT4:
      return "mat4";
    //>>includeStart('debug', pragmas.debug);
    default:
      throw new DeveloperError("attributeType is not a valid value.");
    //>>includeEnd('debug');
  }
};

export default Object.freeze(AttributeType);
