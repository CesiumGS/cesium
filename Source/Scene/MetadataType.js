import Check from "../Core/Check.js";

/**
 * An enum of metadata types. These metadata types are containers containing
 * one or more components of type {@link MetadataComponentType}
 *
 * @enum MetadataType
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
var MetadataType = {
  /**
   * A single component
   *
   * @type {String}
   * @constant
   * @private
   */
  SINGLE: "SINGLE",
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
   * An array of values. A <code>componentType</code> property is needed to
   * define what type of values are stored in the array.
   *
   * @type {String}
   * @constant
   * @private
   */
  ARRAY: "ARRAY",
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

export default Object.freeze(MetadataType);
