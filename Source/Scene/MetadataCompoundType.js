import Check from "../Core/Check.js";

/**
 * An enum of metadata compound types. These types are containers containing
 * one or more components of type {@link MetadataBasicType}
 *
 * @enum MetadataCompoundType
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
var MetadataCompoundType = {
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
   * A 3x3 matrix, stored in column-major format.
   *
   * @type {String}
   * @constant
   * @private
   */
  MAT3: "MAT3",
  /**
   * A 4x4 matrix, stored in column-major format.
   *
   * @type {String}
   * @constant
   * @private
   */
  MAT4: "MAT4",
};

/**
 * Check if a type is VEC2, VEC3 or VEC4
 *
 * @param {MetadataCompoundType} type The type
 * @return {Boolean} <code>true</code> if the type is a vector, <code>false</code> otherwise
 */
MetadataCompoundType.isVectorType = function (type) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("type", type);
  //>>includeEnd('debug');

  switch (type) {
    case MetadataCompoundType.VEC2:
    case MetadataCompoundType.VEC3:
    case MetadataCompoundType.VEC4:
      return true;
    default:
      return false;
  }
};

/**
 * Check if a type is MAT2, MAT3 or MAT4
 *
 * @param {MetadataCompoundType} type The type
 * @return {Boolean} <code>true</code> if the type is a matrix, <code>false</code> otherwise
 */
MetadataCompoundType.isMatrixType = function (type) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("type", type);
  //>>includeEnd('debug');

  switch (type) {
    case MetadataCompoundType.MAT2:
    case MetadataCompoundType.MAT3:
    case MetadataCompoundType.MAT4:
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
 * @param {MetadataCompoundType} type The type to get the component count for
 * @return {Number} The number of components, or <code>undefined</code> for ARRAY
 */
MetadataCompoundType.getComponentCount = function (type) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("type", type);
  //>>includeEnd('debug');

  switch (type) {
    case MetadataCompoundType.VEC2:
      return 2;
    case MetadataCompoundType.VEC3:
      return 3;
    case MetadataCompoundType.VEC4:
      return 4;
    case MetadataCompoundType.MAT2:
      return 4;
    case MetadataCompoundType.MAT3:
      return 9;
    case MetadataCompoundType.MAT4:
      return 16;
    default:
      return undefined;
  }
};

export default Object.freeze(MetadataCompoundType);
