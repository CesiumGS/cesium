import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartesian4 from "../Core/Cartesian4.js";
import Check from "../Core/Check.js";
import DeveloperError from "../Core/DeveloperError.js";
import Matrix2 from "../Core/Matrix2.js";
import Matrix3 from "../Core/Matrix3.js";
import Matrix4 from "../Core/Matrix4.js";

/**
 * An enum describing the attribute type for glTF and 3D Tiles.
 *
 * @enum {String}
 *
 * @private
 */
var AttributeType = {
  /**
   * The attribute is a single component.
   *
   * @type {String}
   * @constant
   */
  SCALAR: "SCALAR",

  /**
   * The attribute is a two-component vector.
   *
   * @type {String}
   * @constant
   */
  VEC2: "VEC2",

  /**
   * The attribute is a three-component vector.
   *
   * @type {String}
   * @constant
   */
  VEC3: "VEC3",

  /**
   * The attribute is a four-component vector.
   *
   * @type {String}
   * @constant
   */
  VEC4: "VEC4",

  /**
   * The attribute is a 2x2 matrix.
   *
   * @type {String}
   * @constant
   */
  MAT2: "MAT2",

  /**
   * The attribute is a 3x3 matrix.
   *
   * @type {String}
   * @constant
   */
  MAT3: "MAT3",

  /**
   * The attribute is a 4x4 matrix.
   *
   * @type {String}
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
      return Number;
    case AttributeType.VEC2:
      return Cartesian2;
    case AttributeType.VEC3:
      return Cartesian3;
    case AttributeType.VEC4:
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
 * Gets number of components in the attribute type.
 *
 * @param {AttributeType} attributeType The attribute type.
 * @returns {Number} Number of components in the attribute type.
 *
 * @private
 */
AttributeType.getComponentsPerAttribute = function (attributeType) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("attributeType", attributeType);
  //>>includeEnd('debug');

  switch (attributeType) {
    case AttributeType.SCALAR:
      return 1;
    case AttributeType.VEC2:
      return 2;
    case AttributeType.VEC3:
      return 3;
    case AttributeType.VEC4:
      return 4;
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

export default Object.freeze(AttributeType);
