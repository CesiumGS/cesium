import Check from "../Core/Check.js";
import DeveloperError from "../Core/DeveloperError.js";
import FeatureDetection from "../Core/FeatureDetection.js";

/**
 * An enum of metadata types.
 *
 * @enum MetadataType
 *
 * @private
 */
var MetadataType = {
  INT8: "INT8",
  UINT8: "UINT8",
  INT16: "INT16",
  UINT16: "UINT16",
  INT32: "INT32",
  UINT32: "UINT32",
  INT64: "INT64",
  UINT64: "UINT64",
  FLOAT32: "FLOAT32",
  FLOAT64: "FLOAT64",
  BOOLEAN: "BOOLEAN",
  STRING: "STRING",
  ENUM: "ENUM",
  ARRAY: "ARRAY",
};

/**
 * Gets the minimum value for the numeric type.
 * <p>
 * Returns a BigInt for the INT64 and UINT64 types if BigInt is supported on this platform.
 * Otherwise an approximate number is returned.
 * </p>
 *
 * @param {MetadataType} type The type.
 * @returns {Number|BigInt} The minimum value.
 *
 * @exception {DeveloperError} type must be a numeric type
 */
MetadataType.getMinimum = function (type) {
  //>>includeStart('debug', pragmas.debug);
  if (!MetadataType.isNumericType(type)) {
    throw new DeveloperError("type must be a numeric type");
  }
  //>>includeEnd('debug');

  switch (type) {
    case MetadataType.INT8:
      return -128;
    case MetadataType.UINT8:
      return 0;
    case MetadataType.INT16:
      return -32768;
    case MetadataType.UINT16:
      return 0;
    case MetadataType.INT32:
      return -2147483648;
    case MetadataType.UINT32:
      return 0;
    case MetadataType.INT64:
      if (FeatureDetection.supportsBigInt()) {
        return BigInt("-9223372036854775808"); // eslint-disable-line
      }
      return -Math.pow(2, 63);
    case MetadataType.UINT64:
      if (FeatureDetection.supportsBigInt()) {
        return BigInt(0); // eslint-disable-line
      }
      return 0;
    case MetadataType.FLOAT32:
      // Maximum 32-bit floating point number. This value will be converted to the nearest 64-bit Number
      return -340282346638528859811704183484516925440.0;
    case MetadataType.FLOAT64:
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
 * @param {MetadataType} type The type.
 * @returns {Number|BigInt} The maximum value.
 *
 * @exception {DeveloperError} type must be a numeric type
 */
MetadataType.getMaximum = function (type) {
  //>>includeStart('debug', pragmas.debug);
  if (!MetadataType.isNumericType(type)) {
    throw new DeveloperError("type must be a numeric type");
  }
  //>>includeEnd('debug');

  switch (type) {
    case MetadataType.INT8:
      return 127;
    case MetadataType.UINT8:
      return 255;
    case MetadataType.INT16:
      return 32767;
    case MetadataType.UINT16:
      return 65535;
    case MetadataType.INT32:
      return 2147483647;
    case MetadataType.UINT32:
      return 4294967295;
    case MetadataType.INT64:
      if (FeatureDetection.supportsBigInt()) {
        // Need to initialize with a string otherwise the value will be 9223372036854775808
        return BigInt("9223372036854775807"); // eslint-disable-line
      }
      return Math.pow(2, 63) - 1;
    case MetadataType.UINT64:
      if (FeatureDetection.supportsBigInt()) {
        // Need to initialize with a string otherwise the value will be 18446744073709551616
        return BigInt("18446744073709551615"); // eslint-disable-line
      }
      return Math.pow(2, 64) - 1;
    case MetadataType.FLOAT32:
      // Maximum 32-bit floating point number
      return 340282346638528859811704183484516925440.0;
    case MetadataType.FLOAT64:
      return Number.MAX_VALUE;
  }
};

/**
 * Returns whether the type is a numeric type.
 *
 * @param {MetadataType} type The type.
 * @returns {Boolean} Whether the type is a numeric type.
 */
MetadataType.isNumericType = function (type) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("type", type);
  //>>includeEnd('debug');

  switch (type) {
    case MetadataType.INT8:
    case MetadataType.UINT8:
    case MetadataType.INT16:
    case MetadataType.UINT16:
    case MetadataType.INT32:
    case MetadataType.UINT32:
    case MetadataType.INT64:
    case MetadataType.UINT64:
    case MetadataType.FLOAT32:
    case MetadataType.FLOAT64:
      return true;
    default:
      return false;
  }
};

/**
 * Returns whether the type is an integer type.
 *
 * @param {MetadataType} type The type.
 * @returns {Boolean} Whether the type is an integer type.
 */
MetadataType.isIntegerType = function (type) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("type", type);
  //>>includeEnd('debug');

  switch (type) {
    case MetadataType.INT8:
    case MetadataType.UINT8:
    case MetadataType.INT16:
    case MetadataType.UINT16:
    case MetadataType.INT32:
    case MetadataType.UINT32:
    case MetadataType.INT64:
    case MetadataType.UINT64:
      return true;
    default:
      return false;
  }
};

/**
 * Returns whether the type is an unsigned integer type.
 *
 * @param {MetadataType} type The type.
 * @returns {Boolean} Whether the type is an unsigned integer type.
 */
MetadataType.isUnsignedIntegerType = function (type) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("type", type);
  //>>includeEnd('debug');

  switch (type) {
    case MetadataType.UINT8:
    case MetadataType.UINT16:
    case MetadataType.UINT32:
    case MetadataType.UINT64:
      return true;
    default:
      return false;
  }
};

/**
 * Normalizes signed integers to the range [-1.0, 1.0] and unsigned integers to
 * the range [0.0, 1.0].
 * <p>
 * value may be a BigInt for the INT64 and UINT64 types. The value is converted
 * to a 64-bit floating point number during normalization which may result in
 * small precision differences.
 * </p>
 *
 * @param {Number|BigInt} value The integer value.
 * @param {MetadataType} type The type.
 * @returns {Number} The normalized value.
 *
 * @exception {DeveloperError} value must be a number or a BigInt
 * @exception {DeveloperError} type must be an integer type
 */
MetadataType.normalize = function (value, type) {
  //>>includeStart('debug', pragmas.debug);
  if (typeof value !== "number" && typeof value !== "bigint") {
    throw new DeveloperError("value must be a number or a BigInt");
  }
  if (!MetadataType.isIntegerType(type)) {
    throw new DeveloperError("type must be an integer type");
  }
  //>>includeEnd('debug');

  if (value >= 0) {
    return Math.min(Number(value) / Number(MetadataType.getMaximum(type)), 1.0);
  }

  return -Math.min(Number(value) / Number(MetadataType.getMinimum(type)), 1.0);
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
 * @param {MetadataType} type The type.
 * @returns {Number|BigInt} The integer value.
 *
 * @exception {DeveloperError} type must be an integer type
 */
MetadataType.unnormalize = function (value, type) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("value", value);
  if (!MetadataType.isIntegerType(type)) {
    throw new DeveloperError("type must be an integer type");
  }
  //>>includeEnd('debug');

  var min = MetadataType.getMinimum(type);
  var max = MetadataType.getMaximum(type);

  if (value >= 0.0) {
    value = value * Number(max);
  } else {
    value = -value * Number(min);
  }

  if (
    (type === MetadataType.INT64 || type === MetadataType.UINT64) &&
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

export default Object.freeze(MetadataType);
