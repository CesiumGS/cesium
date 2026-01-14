import CesiumMath from "../Core/Math.js";
import Check from "../Core/Check.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import DeveloperError from "../Core/DeveloperError.js";
import FeatureDetection from "../Core/FeatureDetection.js";

/**
 * An enum of metadata component types.
 *
 * @enum {string}
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
const MetadataComponentType = {
  /**
   * An 8-bit signed integer
   *
   * @type {string}
   * @constant
   */
  INT8: "INT8",
  /**
   * An 8-bit unsigned integer
   *
   * @type {string}
   * @constant
   */
  UINT8: "UINT8",
  /**
   * A 16-bit signed integer
   *
   * @type {string}
   * @constant
   */
  INT16: "INT16",
  /**
   * A 16-bit unsigned integer
   *
   * @type {string}
   * @constant
   */
  UINT16: "UINT16",
  /**
   * A 32-bit signed integer
   *
   * @type {string}
   * @constant
   */
  INT32: "INT32",
  /**
   * A 32-bit unsigned integer
   *
   * @type {string}
   * @constant
   */
  UINT32: "UINT32",
  /**
   * A 64-bit signed integer. This type requires BigInt support.
   *
   * @see FeatureDetection.supportsBigInt
   *
   * @type {string}
   * @constant
   */
  INT64: "INT64",
  /**
   * A 64-bit signed integer. This type requires BigInt support
   *
   * @see FeatureDetection.supportsBigInt
   *
   * @type {string}
   * @constant
   */
  UINT64: "UINT64",
  /**
   * A 32-bit (single precision) floating point number
   *
   * @type {string}
   * @constant
   */
  FLOAT32: "FLOAT32",
  /**
   * A 64-bit (double precision) floating point number
   *
   * @type {string}
   * @constant
   */
  FLOAT64: "FLOAT64",
};

export const ScalarCategories = {
  INTEGER: "int",
  UNSIGNED_INTEGER: "uint",
  FLOAT: "float",
};

MetadataComponentType.typeInfo = {
  INT8: {
    isInteger: true,
    isUnsigned: false,
    vectorCompatible: true,
    size: 1,
    maximumValue: 127,
    minimumValue: -128,
    category: ScalarCategories.INTEGER,
  },
  UINT8: {
    isInteger: true,
    isUnsigned: true,
    vectorCompatible: true,
    size: 1,
    maximumValue: 255,
    minimumValue: 0,
    category: ScalarCategories.UNSIGNED_INTEGER,
  },
  INT16: {
    isInteger: true,
    isUnsigned: false,
    vectorCompatible: true,
    size: 2,
    maximumValue: 32767,
    minimumValue: -32768,
    category: ScalarCategories.INTEGER,
  },
  UINT16: {
    isInteger: true,
    isUnsigned: true,
    vectorCompatible: true,
    size: 2,
    maximumValue: 65535,
    minimumValue: 0,
    category: ScalarCategories.UNSIGNED_INTEGER,
  },
  INT32: {
    isInteger: true,
    isUnsigned: false,
    vectorCompatible: true,
    size: 4,
    maximumValue: 2147483647,
    minimumValue: -2147483648,
    category: ScalarCategories.INTEGER,
  },
  UINT32: {
    isInteger: true,
    isUnsigned: true,
    vectorCompatible: true,
    size: 4,
    maximumValue: 4294967295,
    minimumValue: 0,
    category: ScalarCategories.UNSIGNED_INTEGER,
  },
  INT64: {
    isInteger: true,
    isUnsigned: false,
    vectorCompatible: false,
    size: 8,
    maximumValue: BigInt("9223372036854775807"),
    minimumValue: BigInt("-9223372036854775808"),
    category: ScalarCategories.INTEGER,
  },
  UINT64: {
    isInteger: true,
    isUnsigned: true,
    vectorCompatible: false,
    size: 8,
    maximumValue: BigInt("18446744073709551615"),
    minimumValue: BigInt(0),
    category: ScalarCategories.UNSIGNED_INTEGER,
  },
  FLOAT32: {
    isInteger: false,
    isUnsigned: false,
    vectorCompatible: true,
    size: 4,
    maximumValue: 340282346638528859811704183484516925440.0,
    minimumValue: -340282346638528859811704183484516925440.0,
    category: ScalarCategories.FLOAT,
  },
  FLOAT64: {
    isInteger: false,
    isUnsigned: false,
    vectorCompatible: true,
    size: 8,
    maximumValue: Number.MAX_VALUE,
    minimumValue: -Number.MAX_VALUE,
    category: ScalarCategories.FLOAT,
  },
};

/**
 * Gets the minimum value for the numeric type.
 * <p>
 * Returns a BigInt for the INT64 and UINT64 types.
 * </p>
 *
 * @param {MetadataComponentType} type The type.
 * @returns {number|bigint} The minimum value.
 *
 * @private
 */
MetadataComponentType.getMinimum = function (type) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("type", type);
  //>>includeEnd('debug');

  return MetadataComponentType.typeInfo[type].minimumValue;
};

/**
 * Gets the maximum value for the numeric type.
 * <p>
 * Returns a BigInt for the INT64 and UINT64 types if BigInt is supported on this platform.
 * Otherwise an approximate number is returned.
 * </p>
 *
 * @param {MetadataComponentType} type The type.
 * @returns {number|bigint} The maximum value.
 *
 * @private
 */
MetadataComponentType.getMaximum = function (type) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("type", type);
  //>>includeEnd('debug');

  return MetadataComponentType.typeInfo[type].maximumValue;
};

/**
 * Returns whether the type is an integer type.
 *
 * @param {MetadataComponentType} type The type.
 * @returns {boolean} Whether the type is an integer type.
 *
 * @private
 */
MetadataComponentType.isIntegerType = function (type) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("type", type);
  //>>includeEnd('debug');

  return MetadataComponentType.typeInfo[type].isInteger;
};

/**
 * Returns whether the type is an unsigned integer type.
 *
 * @param {MetadataComponentType} type The type.
 * @returns {boolean} Whether the type is an unsigned integer type.
 *
 * @private
 */
MetadataComponentType.isUnsignedIntegerType = function (type) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("type", type);
  //>>includeEnd('debug');

  return MetadataComponentType.typeInfo[type].isUnsigned;
};

/**
 * Returns whether a type can be used in a vector, i.e. the {@link Cartesian2},
 * {@link Cartesian3}, or {@link Cartesian4} classes. This includes all numeric
 * types except for types requiring 64-bit integers
 * @param {MetadataComponentType} type The type to check
 * @return {boolean} <code>true</code> if the type can be encoded as a vector type, or <code>false</code> otherwise
 * @private
 */
MetadataComponentType.isVectorCompatible = function (type) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("type", type);
  //>>includeEnd('debug');

  return MetadataComponentType.typeInfo[type].vectorCompatible;
};

/**
 * Gets the category of the numeric type (signed integer, unsigned integer, or float).
 * @param {MetadataComponentType} type The type.
 * @returns {ScalarCategories} The category.
 */
MetadataComponentType.category = function (type) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("type", type);
  //>>includeEnd('debug');

  return MetadataComponentType.typeInfo[type].category;
};

/**
 * Normalizes signed integers to the range [-1.0, 1.0] and unsigned integers to
 * the range [0.0, 1.0].
 * <p>
 * The value may be a BigInt for the INT64 and UINT64 types. The value is converted
 * to a 64-bit floating point number during normalization which may result in
 * small precision differences.
 * </p>
 *
 * @param {number|bigint} value The integer value.
 * @param {MetadataComponentType} type The type.
 * @returns {number} The normalized value.
 *
 * @exception {DeveloperError} value must be a number or a BigInt
 * @exception {DeveloperError} type must be an integer type
 *
 * @private
 */
MetadataComponentType.normalize = function (value, type) {
  //>>includeStart('debug', pragmas.debug);
  if (typeof value !== "number" && typeof value !== "bigint") {
    throw new DeveloperError("value must be a number or a BigInt");
  }
  if (!MetadataComponentType.isIntegerType(type)) {
    throw new DeveloperError("type must be an integer type");
  }
  //>>includeEnd('debug');

  return Math.max(
    Number(value) / Number(MetadataComponentType.getMaximum(type)),
    -1.0,
  );
};

/**
 * Unnormalizes signed numbers in the range [-1.0, 1.0] to signed integers and
 * unsigned numbers in the range [0.0, 1.0] to unsigned integers. Values outside
 * the range are clamped to the range.
 * <p>
 * Returns a BigInt for the INT64 and UINT64 types if BigInt is supported on this platform.
 * </p>
 *
 * @param {number} value The normalized value.
 * @param {MetadataComponentType} type The type.
 * @returns {number|bigint} The integer value.
 *
 * @exception {DeveloperError} type must be an integer type
 *
 * @private
 */
MetadataComponentType.unnormalize = function (value, type) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("value", value);
  if (!MetadataComponentType.isIntegerType(type)) {
    throw new DeveloperError("type must be an integer type");
  }
  //>>includeEnd('debug');

  const max = MetadataComponentType.getMaximum(type);
  const min = MetadataComponentType.isUnsignedIntegerType(type) ? 0 : -max;

  value = CesiumMath.sign(value) * Math.round(Math.abs(value) * Number(max));

  if (
    (type === MetadataComponentType.INT64 ||
      type === MetadataComponentType.UINT64) &&
    FeatureDetection.supportsBigInt()
  ) {
    value = BigInt(value);
  }

  if (value > max) {
    return max;
  }

  if (value < min) {
    return min;
  }

  return value;
};

/**
 * @private
 */
MetadataComponentType.applyValueTransform = function (value, offset, scale) {
  return scale * value + offset;
};

/**
 * @private
 */
MetadataComponentType.unapplyValueTransform = function (value, offset, scale) {
  // if the scale is 0, avoid a divide by zero error. The result can be any
  // finite number, so 0.0 will do nicely.
  if (scale === 0) {
    return 0.0;
  }

  return (value - offset) / scale;
};

/**
 * Gets the size in bytes for the numeric type.
 *
 * @param {MetadataComponentType} type The type.
 * @returns {number} The size in bytes.
 *
 * @private
 */
MetadataComponentType.getSizeInBytes = function (type) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("type", type);
  //>>includeEnd('debug');

  return MetadataComponentType.typeInfo[type].size;
};

/**
 * Gets the {@link MetadataComponentType} from a {@link ComponentDatatype}.
 *
 * @param {ComponentDatatype} componentDatatype The component datatype.
 * @returns {MetadataComponentType} The type.
 *
 * @private
 */
MetadataComponentType.fromComponentDatatype = function (componentDatatype) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("componentDatatype", componentDatatype);
  //>>includeEnd('debug');

  switch (componentDatatype) {
    case ComponentDatatype.BYTE:
      return MetadataComponentType.INT8;
    case ComponentDatatype.UNSIGNED_BYTE:
      return MetadataComponentType.UINT8;
    case ComponentDatatype.SHORT:
      return MetadataComponentType.INT16;
    case ComponentDatatype.UNSIGNED_SHORT:
      return MetadataComponentType.UINT16;
    case ComponentDatatype.INT:
      return MetadataComponentType.INT32;
    case ComponentDatatype.UNSIGNED_INT:
      return MetadataComponentType.UINT32;
    case ComponentDatatype.FLOAT:
      return MetadataComponentType.FLOAT32;
    case ComponentDatatype.DOUBLE:
      return MetadataComponentType.FLOAT64;
  }
};

/**
 * Gets the {@link ComponentDatatype} from a {@link MetadataComponentType}.
 *
 * @param {MetadataComponentType} type The type.
 * @returns {ComponentDatatype} The component datatype.
 *
 * @private
 */
MetadataComponentType.toComponentDatatype = function (type) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("type", type);
  //>>includeEnd('debug');

  switch (type) {
    case MetadataComponentType.INT8:
      return ComponentDatatype.BYTE;
    case MetadataComponentType.UINT8:
      return ComponentDatatype.UNSIGNED_BYTE;
    case MetadataComponentType.INT16:
      return ComponentDatatype.SHORT;
    case MetadataComponentType.UINT16:
      return ComponentDatatype.UNSIGNED_SHORT;
    case MetadataComponentType.INT32:
      return ComponentDatatype.INT;
    case MetadataComponentType.UINT32:
      return ComponentDatatype.UNSIGNED_INT;
    case MetadataComponentType.FLOAT32:
      return ComponentDatatype.FLOAT;
    case MetadataComponentType.FLOAT64:
      return ComponentDatatype.DOUBLE;
  }
};

export default Object.freeze(MetadataComponentType);
