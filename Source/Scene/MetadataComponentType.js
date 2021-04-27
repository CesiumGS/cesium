import Check from "../Core/Check.js";
import DeveloperError from "../Core/DeveloperError.js";
import FeatureDetection from "../Core/FeatureDetection.js";

/**
 * An enum of metadata component types.
 *
 * @enum MetadataComponentType
 */
var MetadataComponentType = {
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
};

/**
 * Gets the minimum value for the numeric type.
 * <p>
 * Returns a BigInt for the INT64 and UINT64 component types if BigInt is supported on this platform.
 * Otherwise an approximate number is returned.
 * </p>
 *
 * @param {MetadataComponentType} componentType The component type.
 * @returns {Number|BigInt} The minimum value.
 *
 * @exception {DeveloperError} componentType must be a numeric type
 *
 * @private
 */
MetadataComponentType.getMinimum = function (componentType) {
  //>>includeStart('debug', pragmas.debug);
  if (!MetadataComponentType.isNumericType(componentType)) {
    throw new DeveloperError("componentType must be a numeric type");
  }
  //>>includeEnd('debug');

  switch (componentType) {
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
 * Returns a BigInt for the INT64 and UINT64 component types if BigInt is supported on this platform.
 * Otherwise an approximate number is returned.
 * </p>
 *
 * @param {MetadataComponentType} componentType The component type.
 * @returns {Number|BigInt} The maximum value.
 *
 * @exception {DeveloperError} componentType must be a numeric type
 *
 * @private
 */
MetadataComponentType.getMaximum = function (componentType) {
  //>>includeStart('debug', pragmas.debug);
  if (!MetadataComponentType.isNumericType(componentType)) {
    throw new DeveloperError("componentType must be a numeric type");
  }
  //>>includeEnd('debug');

  switch (componentType) {
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
 * Returns whether the component type is a numeric type.
 *
 * @param {MetadataComponentType} componentType The component type.
 * @returns {Boolean} Whether the component type is a numeric type.
 *
 * @private
 */
MetadataComponentType.isNumericType = function (componentType) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("componentType", componentType);
  //>>includeEnd('debug');

  switch (componentType) {
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
 * Returns whether the component type is an integer type.
 *
 * @param {MetadataComponentType} componentType The component type.
 * @returns {Boolean} Whether the component type is an integer type.
 *
 * @private
 */
MetadataComponentType.isIntegerType = function (componentType) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("componentType", componentType);
  //>>includeEnd('debug');

  switch (componentType) {
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
 * Returns whether the component type is an unsigned integer type.
 *
 * @param {MetadataComponentType} componentType The component type.
 * @returns {Boolean} Whether the component type is an unsigned integer type.
 *
 * @private
 */
MetadataComponentType.isUnsignedIntegerType = function (componentType) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("componentType", componentType);
  //>>includeEnd('debug');

  switch (componentType) {
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
 * Returns whether a component type can be used in a vector, i.e. the {@link Cartesian2},
 * {@link Cartesian3}, or {@link Cartesian4} classes. This includes all numeric
 * types except for types requiring 64-bits
 */
MetadataComponentType.isVectorCompatible = function (componentType) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("componentType", componentType);
  //>>includeEnd('debug');

  switch (componentType) {
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
 * value may be a BigInt for the INT64 and UINT64 component types. The value is
 * converted to a 64-bit floating point number during normalization which may
 * result in small precision differences.
 * </p>
 *
 * @param {Number|BigInt} value The integer value.
 * @param {MetadataComponentType} componentType The component type.
 * @returns {Number} The normalized value.
 *
 * @exception {DeveloperError} value must be a number or a BigInt
 * @exception {DeveloperError} componentType must be an integer type
 *
 * @private
 */
MetadataComponentType.normalize = function (value, componentType) {
  //>>includeStart('debug', pragmas.debug);
  if (typeof value !== "number" && typeof value !== "bigint") {
    throw new DeveloperError("value must be a number or a BigInt");
  }
  if (!MetadataComponentType.isIntegerType(componentType)) {
    throw new DeveloperError("componentType must be an integer type");
  }
  //>>includeEnd('debug');

  if (value >= 0) {
    return Math.min(
      Number(value) / Number(MetadataComponentType.getMaximum(componentType)),
      1.0
    );
  }

  return -Math.min(
    Number(value) / Number(MetadataComponentType.getMinimum(componentType)),
    1.0
  );
};

/**
 * Unnormalizes signed numbers in the range [-1.0, 1.0] to signed integers and
 * unsigned numbers in the range [0.0, 1.0] to unsigned integers. Values outside
 * the range are clamped to the range.
 * <p>
 * Returns a BigInt for the INT64 and UINT64 component types if BigInt is supported on this platform.
 * </p>
 *
 * @param {Number} value The normalized value.
 * @param {MetadataComponentType} componentType The component type.
 * @returns {Number|BigInt} The integer value.
 *
 * @exception {DeveloperError} componentType must be an integer type
 *
 * @private
 */
MetadataComponentType.unnormalize = function (value, componentType) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("value", value);
  if (!MetadataComponentType.isIntegerType(componentType)) {
    throw new DeveloperError("componentType must be an integer type");
  }
  //>>includeEnd('debug');

  var min = MetadataComponentType.getMinimum(componentType);
  var max = MetadataComponentType.getMaximum(componentType);

  if (value >= 0.0) {
    value = value * Number(max);
  } else {
    value = -value * Number(min);
  }

  if (
    (componentType === MetadataComponentType.INT64 ||
      componentType === MetadataComponentType.UINT64) &&
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

export default Object.freeze(MetadataComponentType);
