import Check from "../Core/Check.js";
import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartesian4 from "../Core/Cartesian4.js";
import DeveloperError from "../Core/DeveloperError.js";
import Matrix2 from "../Core/Matrix2.js";
import Matrix3 from "../Core/Matrix3.js";
import Matrix4 from "../Core/Matrix4.js";

/**
 * An instance of a metadata value.<br>
 * <br>
 * This can be one of the following types:
 * <ul>
 *   <li><code>number</code> for type <code>SCALAR</code> and numeric component types except for <code>INT64</code> or <code>UINT64</code></li>
 *   <li><code>bigint</code> for type <code>SCALAR</code> and component type <code>INT64</code> or <code>UINT64</code></li>
 *   <li><code>string</code> for type <code>STRING</code> or <code>ENUM</code></li>
 *   <li><code>boolean</code> for type <code>BOOLEAN</code></li>
 *   <li><code>Cartesian2</code> for type <code>VEC2</code></li>
 *   <li><code>Cartesian3</code> for type <code>VEC3</code></li>
 *   <li><code>Cartesian4</code> for type <code>VEC4</code></li>
 *   <li><code>Matrix2</code> for type <code>MAT2</code></li>
 *   <li><code>Matrix3</code> for type <code>MAT3</code></li>
 *   <li><code>Matrix4</code> for type <code>MAT4</code></li>
 *   <li>Arrays of these types when the metadata value is an array</li>
 * </ul>
 * @typedef {(number|bigint|string|boolean|Cartesian2|Cartesian3|Cartesian4|Matrix2|Matrix3|Matrix4|number[]|bigint[]|string[]|boolean[]|Cartesian2[]|Cartesian3[]|Cartesian4[]|Matrix2[]|Matrix3[]|Matrix4[])} MetadataValue
 */

/**
 * An enum of metadata types. These metadata types are containers containing
 * one or more components of type {@link MetadataComponentType}
 *
 * @enum {string}
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
const MetadataType = {
  /**
   * A single component
   *
   * @type {string}
   * @constant
   */
  SCALAR: "SCALAR",
  /**
   * A vector with two components
   *
   * @type {string}
   * @constant
   */
  VEC2: "VEC2",
  /**
   * A vector with three components
   *
   * @type {string}
   * @constant
   */
  VEC3: "VEC3",
  /**
   * A vector with four components
   *
   * @type {string}
   * @constant
   */
  VEC4: "VEC4",
  /**
   * A 2x2 matrix, stored in column-major format.
   *
   * @type {string}
   * @constant
   */
  MAT2: "MAT2",
  /**
   * A 3x3 matrix, stored in column-major format.
   *
   * @type {string}
   * @constant
   */
  MAT3: "MAT3",
  /**
   * A 4x4 matrix, stored in column-major format.
   *
   * @type {string}
   * @constant
   */
  MAT4: "MAT4",
  /**
   * A boolean (true/false) value
   *
   * @type {string}
   * @constant
   */
  BOOLEAN: "BOOLEAN",
  /**
   * A UTF-8 encoded string value
   *
   * @type {string}
   * @constant
   */
  STRING: "STRING",
  /**
   * An enumerated value. This type is used in conjunction with a {@link MetadataEnum} to describe the valid values.
   *
   * @see MetadataEnum
   *
   * @type {string}
   * @constant
   */
  ENUM: "ENUM",
};

/**
 * Check if a type is VEC2, VEC3 or VEC4
 *
 * @param {MetadataType} type The type
 * @return {boolean} <code>true</code> if the type is a vector, <code>false</code> otherwise
 * @private
 */
MetadataType.isVectorType = function (type) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("type", type);
  //>>includeEnd('debug');

  switch (type) {
    case MetadataType.VEC2:
    case MetadataType.VEC3:
    case MetadataType.VEC4:
      return true;
    default:
      return false;
  }
};

/**
 * Check if a type is MAT2, MAT3 or MAT4
 *
 * @param {MetadataType} type The type
 * @return {boolean} <code>true</code> if the type is a matrix, <code>false</code> otherwise
 * @private
 */
MetadataType.isMatrixType = function (type) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("type", type);
  //>>includeEnd('debug');

  switch (type) {
    case MetadataType.MAT2:
    case MetadataType.MAT3:
    case MetadataType.MAT4:
      return true;
    default:
      return false;
  }
};

/**
 * Get the number of components for a vector or matrix type. e.g.
 * a VECN returns N, and a MATN returns N*N. All other types return 1.
 *
 * @param {MetadataType} type The type to get the component count for
 * @return {number} The number of components
 * @private
 */
MetadataType.getComponentCount = function (type) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("type", type);
  //>>includeEnd('debug');

  switch (type) {
    case MetadataType.SCALAR:
    case MetadataType.STRING:
    case MetadataType.ENUM:
    case MetadataType.BOOLEAN:
      return 1;
    case MetadataType.VEC2:
      return 2;
    case MetadataType.VEC3:
      return 3;
    case MetadataType.VEC4:
      return 4;
    case MetadataType.MAT2:
      return 4;
    case MetadataType.MAT3:
      return 9;
    case MetadataType.MAT4:
      return 16;
    //>>includeStart('debug', pragmas.debug);
    default:
      throw new DeveloperError(`Invalid metadata type ${type}`);
    //>>includeEnd('debug');
  }
};

/**
 * Get the corresponding vector or matrix class. This is used to simplify
 * packing and unpacking code.
 * @param {MetadataType} type The metadata type
 * @return {object} The appropriate CartesianN class for vector types, MatrixN class for matrix types, or undefined otherwise.
 * @private
 */
MetadataType.getMathType = function (type) {
  switch (type) {
    case MetadataType.VEC2:
      return Cartesian2;
    case MetadataType.VEC3:
      return Cartesian3;
    case MetadataType.VEC4:
      return Cartesian4;
    case MetadataType.MAT2:
      return Matrix2;
    case MetadataType.MAT3:
      return Matrix3;
    case MetadataType.MAT4:
      return Matrix4;
    default:
      return undefined;
  }
};

export default Object.freeze(MetadataType);
