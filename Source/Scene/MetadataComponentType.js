import CesiumMath from "../Core/Math.js";
import Check from "../Core/Check.js";
import DeveloperError from "../Core/DeveloperError.js";
import FeatureDetection from "../Core/FeatureDetection.js";

/**
 * An enum of metadata component types.
 *
 * @enum MetadataComponentType
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
const MetadataComponentType = {
  /**
   * An 8-bit signed integer
   *
   * @type {String}
   * @constant
   * @private
   */
  INT8: "INT8",
  /**
   * An 8-bit unsigned integer
   *
   * @type {String}
   * @constant
   * @private
   */
  UINT8: "UINT8",
  /**
   * A 16-bit signed integer
   *
   * @type {String}
   * @constant
   * @private
   */
  INT16: "INT16",
  /**
   * A 16-bit unsigned integer
   *
   * @type {String}
   * @constant
   * @private
   */
  UINT16: "UINT16",
  /**
   * A 32-bit signed integer
   *
   * @type {String}
   * @constant
   * @private
   */
  INT32: "INT32",
  /**
   * A 32-bit unsigned integer
   *
   * @type {String}
   * @constant
   * @private
   */
  UINT32: "UINT32",
  /**
   * A 64-bit signed integer. This type requires BigInt support.
   *
   * @see FeatureDetection.supportsBigInt
   *
   * @type {String}
   * @constant
   * @private
   */
  INT64: "INT64",
  /**
   * A 64-bit signed integer. This type requires BigInt support
   *
   * @see FeatureDetection.supportsBigInt
   *
   * @type {String}
   * @constant
   * @private
   */
  UINT64: "UINT64",
  /**
   * A 32-bit (single precision) floating point number
   *
   * @type {String}
   * @constant
   * @private
   */
  FLOAT32: "FLOAT32",
  /**
   * A 64-bit (double precision) floating point number
   *
   * @type {String}
   * @constant
   * @private
   */
  FLOAT64: "FLOAT64",
};

/**
 * Gets the minimum value for the numeric type.
 * <p>
 * Returns a BigInt for the INT64 and UINT64 types if BigInt is supported on this platform.
 * Otherwise an approximate number is returned.
 * </p>
 *
 * @param {MetadataComponentType} type The type.
 * @returns {Number|BigInt} The minimum value.
 *
 * @exception {DeveloperError} type must be a numeric type
 *
 * @private
 */
MetadataComponentType.getMinimum = function (type) {
  //>>includeStart('debug', pragmas.debug);
  if (!MetadataComponentType.isNumericType(type)) {
    throw new DeveloperError("type must be a numeric type");
  }
  //>>includeEnd('debug');

  switch (type) {
    case MetadataComponentType.INT8:
      return -128;
    case MetadataComponentType.UINT8:
      return 0;
    case MetadataComponentType.INT16:
      return -32768;
    case MetadataComponentType.UINT16:
      return 0;
    case MetadataComponentType.INT32:
      return -2147483648;
    case MetadataComponentType.UINT32:
      return 0;
    case MetadataComponentType.INT64:
      if (FeatureDetection.supportsBigInt()) {
        return BigInt("-9223372036854775808"); // eslint-disable-line
      }
      return -Math.pow(2, 63);
    case MetadataComponentType.UINT64:
      if (FeatureDetection.supportsBigInt()) {
        return BigInt(0); // eslint-disable-line
      }
      return 0;
    case MetadataComponentType.FLOAT32:
      // Maximum 32-bit floating point number. This value will be converted to the nearest 64-bit Number
      return -340282346638528859811704183484516925440.0;
    case MetadataComponentType.FLOAT64:
      return -Number.MAX_VALUE;
  }
};

/**
 * Gets the maximum value for the numeric type.
 * <p>
 * Returns a BigInt for the INT64 and UINT64 types if BigInt is supported on this platform.
 * Otherwise an approximate number is returned.
 * </p>
 *
 * @param {MetadataComponentType} type The type.
 * @returns {Number|BigInt} The maximum value.
 *
 * @exception {DeveloperError} type must be a numeric type
 *
 * @private
 */
MetadataComponentType.getMaximum = function (type) {
  //>>includeStart('debug', pragmas.debug);
  if (!MetadataComponentType.isNumericType(type)) {
    throw new DeveloperError("type must be a numeric type");
  }
  //>>includeEnd('debug');

  switch (type) {
    case MetadataComponentType.INT8:
      return 127;
    case MetadataComponentType.UINT8:
      return 255;
    case MetadataComponentType.INT16:
      return 32767;
    case MetadataComponentType.UINT16:
      return 65535;
    case MetadataComponentType.INT32:
      return 2147483647;
    case MetadataComponentType.UINT32:
      return 4294967295;
    case MetadataComponentType.INT64:
      if (FeatureDetection.supportsBigInt()) {
        // Need to initialize with a string otherwise the value will be 9223372036854775808
        return BigInt("9223372036854775807"); // eslint-disable-line
      }
      return Math.pow(2, 63) - 1;
    case MetadataComponentType.UINT64:
      if (FeatureDetection.supportsBigInt()) {
        // Need to initialize with a string otherwise the value will be 18446744073709551616
        return BigInt("18446744073709551615"); // eslint-disable-line
      }
      return Math.pow(2, 64) - 1;
    case MetadataComponentType.FLOAT32:
      // Maximum 32-bit floating point number
      return 340282346638528859811704183484516925440.0;
    case MetadataComponentType.FLOAT64:
      return Number.MAX_VALUE;
  }
};

/**
 * Returns whether the type is a numeric type.
 *
 * @param {MetadataComponentType} type The type.
 * @returns {Boolean} Whether the type is a numeric type.
 *
 * @private
 */
MetadataComponentType.isNumericType = function (type) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("type", type);
  //>>includeEnd('debug');

  switch (type) {
    case MetadataComponentType.INT8:
    case MetadataComponentType.UINT8:
    case MetadataComponentType.INT16:
    case MetadataComponentType.UINT16:
    case MetadataComponentType.INT32:
    case MetadataComponentType.UINT32:
    case MetadataComponentType.INT64:
    case MetadataComponentType.UINT64:
    case MetadataComponentType.FLOAT32:
    case MetadataComponentType.FLOAT64:
      return true;
    default:
      return false;
  }
};

/**
 * Returns whether the type is an integer type.
 *
 * @param {MetadataComponentType} type The type.
 * @returns {Boolean} Whether the type is an integer type.
 *
 * @private
 */
MetadataComponentType.isIntegerType = function (type) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("type", type);
  //>>includeEnd('debug');

  switch (type) {
    case MetadataComponentType.INT8:
    case MetadataComponentType.UINT8:
    case MetadataComponentType.INT16:
    case MetadataComponentType.UINT16:
    case MetadataComponentType.INT32:
    case MetadataComponentType.UINT32:
    case MetadataComponentType.INT64:
    case MetadataComponentType.UINT64:
      return true;
    default:
      return false;
  }
};

/**
 * Returns whether the type is an unsigned integer type.
 *
 * @param {MetadataComponentType} type The type.
 * @returns {Boolean} Whether the type is an unsigned integer type.
 *
 * @private
 */
MetadataComponentType.isUnsignedIntegerType = function (type) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("type", type);
  //>>includeEnd('debug');

  switch (type) {
    case MetadataComponentType.UINT8:
    case MetadataComponentType.UINT16:
    case MetadataComponentType.UINT32:
    case MetadataComponentType.UINT64:
      return true;
    default:
      return false;
  }
};

/**
 * Returns whether a type can be used in a vector, i.e. the {@link Cartesian2},
 * {@link Cartesian3}, or {@link Cartesian4} classes. This includes all numeric
 * types except for types requiring 64-bit integers
 * @param {MetadataComponentType} type The type to check
 * @return {Boolean} <code>true</code> if the type can be encoded as a vector type, or <code>false</code> otherwise
 * @private
 */
MetadataComponentType.isVectorCompatible = function (type) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("type", type);
  //>>includeEnd('debug');

  switch (type) {
    case MetadataComponentType.INT8:
    case MetadataComponentType.UINT8:
    case MetadataComponentType.INT16:
    case MetadataComponentType.UINT16:
    case MetadataComponentType.INT32:
    case MetadataComponentType.UINT32:
    case MetadataComponentType.FLOAT32:
    case MetadataComponentType.FLOAT64:
      return true;
    default:
      return false;
  }
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
 * @param {Number|BigInt} value The integer value.
 * @param {MetadataComponentType} type The type.
 * @returns {Number} The normalized value.
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
    -1.0
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
 * @param {Number} value The normalized value.
 * @param {MetadataComponentType} type The type.
 * @returns {Number|BigInt} The integer value.
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
    value = BigInt(value); // eslint-disable-line
  }

  if (value > max) {
    return max;
  }

  if (value < min) {
    return min;
  }

  return value;
};

MetadataComponentType.applyValueTransform = function (value, offset, scale) {
  return scale * value + offset;
};

MetadataComponentType.unapplyValueTransform = function (value, offset, scale) {
  return (value - offset) / scale;
};

/**
 * Gets the size in bytes for the numeric type.
 *
 * @param {MetadataComponentType} type The type.
 * @returns {Number} The size in bytes.
 *
 * @exception {DeveloperError} type must be a numeric type
 *
 * @private
 */
MetadataComponentType.getSizeInBytes = function (type) {
  //>>includeStart('debug', pragmas.debug);
  if (!MetadataComponentType.isNumericType(type)) {
    throw new DeveloperError("type must be a numeric type");
  }
  //>>includeEnd('debug');
  switch (type) {
    case MetadataComponentType.INT8:
    case MetadataComponentType.UINT8:
      return 1;
    case MetadataComponentType.INT16:
    case MetadataComponentType.UINT16:
      return 2;
    case MetadataComponentType.INT32:
    case MetadataComponentType.UINT32:
      return 4;
    case MetadataComponentType.INT64:
    case MetadataComponentType.UINT64:
      return 8;
    case MetadataComponentType.FLOAT32:
      return 4;
    case MetadataComponentType.FLOAT64:
      return 8;
  }
};

export default Object.freeze(MetadataComponentType);
