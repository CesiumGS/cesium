import Check from "../Core/Check.js";
import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartesian4 from "../Core/Cartesian4.js";
import Matrix2 from "../Core/Matrix2.js";
import Matrix3 from "../Core/Matrix3.js";
import Matrix4 from "../Core/Matrix4.js";

/**
 * An enum of metadata types. These metadata types are containers containing
 * one or more components of type {@link MetadataComponentType}
 *
 * @enum MetadataType
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
const MetadataType = {
  /**
   * A single component
   *
   * @type {String}
   * @constant
   * @private
   */
  SCALAR: "SCALAR",
  /**
   * A vector with two components
   *
   * @type {String}
   * @constant
   * @private
   */
  VEC2: "VEC2",
  /**
   * A vector with three components
   *
   * @type {String}
   * @constant
   * @private
   */
  VEC3: "VEC3",
  /**
   * A vector with four components
   *
   * @type {String}
   * @constant
   * @private
   */
  VEC4: "VEC4",
  /**
   * A 2x2 matrix, stored in column-major format.
   *
   * @type {String}
   * @constant
   * @private
   */
  MAT2: "MAT2",
  /**
   * A 2x2 matrix, stored in column-major format.
   *
   * @type {String}
   * @constant
   * @private
   */
  MAT3: "MAT3",
  /**
   * A 2x2 matrix, stored in column-major format.
   *
   * @type {String}
   * @constant
   * @private
   */
  MAT4: "MAT4",
  /**
   * A boolean (true/false) value
   *
   * @type {String}
   * @constant
   * @private
   */
  BOOLEAN: "BOOLEAN",
  /**
   * A UTF-8 encoded string value
   *
   * @type {String}
   * @constant
   * @private
   */
  STRING: "STRING",
  /**
   * An enumerated value. This type is used in conjunction with a {@link MetadataEnum} to describe the valid values.
   *
   * @see MetadataEnum
   *
   * @type {String}
   * @constant
   * @private
   */
  ENUM: "ENUM",
};

/**
 * Check if a type is VEC2, VEC3 or VEC4
 *
 * @param {MetadataType} type The type
 * @return {Boolean} <code>true</code> if the type is a vector, <code>false</code> otherwise
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
 * @return {Boolean} <code>true</code> if the type is a matrix, <code>false</code> otherwise
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
 * Get the number of components for a type. e.g. a VECN returns N.
 * The only exception is the ARRAY type, whose number of components is
 * determined separately by the componentCount property in the metadata
 * extension.
 *
 * @param {MetadataType} type The type to get the component count for
 * @return {Number} The number of components, or <code>undefined</code> for ARRAY
 */
MetadataType.getComponentCount = function (type) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("type", type);
  //>>includeEnd('debug');

  switch (type) {
    case MetadataType.SCALAR:
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
    default:
      return undefined;
  }
};

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
