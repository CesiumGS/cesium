import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartesian4 from "../Core/Cartesian4.js";
import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import Matrix2 from "../Core/Matrix2.js";
import Matrix3 from "../Core/Matrix3.js";
import Matrix4 from "../Core/Matrix4.js";
import MetadataBasicType from "./MetadataBasicType.js";
import MetadataCompoundType from "./MetadataCompoundType.js";

/**
 * A metadata property, as part of a {@link MetadataClass}
 *
 * @param {Object} options Object with the following properties:
 * @param {String} options.id The ID of the property.
 * @param {Object} options.property The property JSON object.
 * @param {Object.<String, MetadataEnum>} [options.enums] A dictionary of enums.
 *
 * @alias MetadataClassProperty
 * @constructor
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
function MetadataClassProperty(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var id = options.id;
  var property = options.property;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("options.id", id);
  Check.typeOf.object("options.property", property);
  //>>includeEnd('debug');

  var result = parsePropertyLegacy(property);
  if (!defined(result)) {
    result = parseProperty(property, options.enums);
  }

  this._id = id;
  this._name = property.name;
  this._description = property.description;
  this._basicType = result.basicType;
  this._compoundType = result.compoundType;
  this._enumType = options.enums[result.enumId];
  this._normalized = result.normalized;
  this._count = result.count;
  this._min = property.min;
  this._max = property.max;
  this._default = property.default;
  this._optional = defaultValue(property.optional, false);
  this._semantic = property.semantic;
  this._extras = property.extras;
  this._extensions = property.extensions;
}

Object.defineProperties(MetadataClassProperty.prototype, {
  /**
   * The ID of the property.
   *
   * @memberof MetadataClassProperty.prototype
   * @type {String}
   * @readonly
   * @private
   */
  id: {
    get: function () {
      return this._id;
    },
  },

  /**
   * The name of the property.
   *
   * @memberof MetadataClassProperty.prototype
   * @type {String}
   * @readonly
   * @private
   */
  name: {
    get: function () {
      return this._name;
    },
  },

  /**
   * The description of the property.
   *
   * @memberof MetadataClassProperty.prototype
   * @type {String}
   * @readonly
   * @private
   */
  description: {
    get: function () {
      return this._description;
    },
  },

  /**
   * The basic type of the property.
   *
   * @memberof MetadataClassProperty.prototype
   * @type {MetadataBasicType}
   * @readonly
   * @private
   */
  basicType: {
    get: function () {
      return this._basicType;
    },
  },

  /**
   * The compound type of the property.
   *
   * @memberof MetadataClassProperty.prototype
   * @type {MetadataCompoundType}
   * @readonly
   * @private
   */
  compoundType: {
    get: function () {
      return this._compoundType;
    },
  },

  /**
   * The enum type of the property.
   *
   * @memberof MetadataClassProperty.prototype
   * @type {MetadataEnum}
   * @readonly
   * @private
   */
  enumType: {
    get: function () {
      return this._enumType;
    },
  },

  /**
   * The number of elements. Undefined if the property is a variable size array.
   *
   * @memberof MetadataClassProperty.prototype
   * @type {Number}
   * @readonly
   * @private
   */
  count: {
    get: function () {
      return this._count;
    },
  },

  /**
   * Whether the property is normalized.
   *
   * @memberof MetadataClassProperty.prototype
   * @type {Boolean}
   * @readonly
   * @private
   */
  normalized: {
    get: function () {
      return this._normalized;
    },
  },

  /**
   * A number or an array of numbers storing the maximum allowable value of this property. Only defined when the basic type is a numeric type.
   *
   * @memberof MetadataClassProperty.prototype
   * @type {Number|Number[]}
   * @readonly
   * @private
   */
  max: {
    get: function () {
      return this._max;
    },
  },

  /**
   * A number or an array of numbers storing the minimum allowable value of this property. Only defined when the basic type is a numeric type.
   *
   * @memberof MetadataClassProperty.prototype
   * @type {Number|Number[]}
   * @readonly
   * @private
   */
  min: {
    get: function () {
      return this._min;
    },
  },

  /**
   * A default value to use when an entity's property value is not defined.
   *
   * @memberof MetadataClassProperty.prototype
   * @type {Boolean|Number|String|Array}
   * @readonly
   * @private
   */
  default: {
    get: function () {
      return this._default;
    },
  },

  /**
   * Whether the property is optional.
   *
   * @memberof MetadataClassProperty.prototype
   * @type {Boolean}
   * @readonly
   * @private
   */
  optional: {
    get: function () {
      return this._optional;
    },
  },

  /**
   * An identifier that describes how this property should be interpreted.
   *
   * @memberof MetadataClassProperty.prototype
   * @type {String}
   * @readonly
   * @private
   */
  semantic: {
    get: function () {
      return this._semantic;
    },
  },

  /**
   * Extras in the JSON object.
   *
   * @memberof MetadataClassProperty.prototype
   * @type {*}
   * @readonly
   * @private
   */
  extras: {
    get: function () {
      return this._extras;
    },
  },

  /**
   * Extensions in the JSON object.
   *
   * @memberof MetadataClassProperty.prototype
   * @type {Object}
   * @readonly
   * @private
   */
  extensions: {
    get: function () {
      return this._extensions;
    },
  },
});

function parsePropertyLegacy(property) {
  var basicType;
  var compoundType;
  var normalized = false;
  var count = 1;
  var enumId;

  if (property.type === "ARRAY") {
    count = property.componentCount;
  }

  if (property.type === "ENUM") {
    enumId = property.enumType;
  }

  if (property.componentType === "ENUM") {
    enumId = property.enumType;
  }

  if (defined(MetadataBasicType[property.type])) {
    basicType = property.type;
  }

  if (defined(MetadataBasicType[property.componentType])) {
    basicType = property.componentType;
  }

  if (defined(property.normalized)) {
    normalized = property.normalized;
  }

  if (defined(MetadataCompoundType[property.type])) {
    compoundType = property.type;
  }

  if (defined(basicType) || defined(enumId)) {
    return {
      basicType: basicType,
      compoundType: compoundType,
      normalized: normalized,
      count: count,
      enumId: enumId,
    };
  }
}

function parseProperty(property, enums) {
  var basicType;
  var compoundType;
  var normalized = false;
  var count = 1;
  var enumId;

  var type = property.type;

  var arrayRegex = /\[([2-9]|[1-9]\d+)?\]$/;
  var match = type.match(arrayRegex);

  if (match !== null) {
    count = defined(match[1]) ? parseInt(match[1]) : undefined;
    type = type.slice(0, match.index);
  }

  if (defined(enums[type])) {
    enumId = type;

    return {
      basicType: basicType,
      compoundType: compoundType,
      normalized: normalized,
      count: count,
      enumId: enumId,
    };
  }

  var tokens = type.split("_");
  var tokenIndex = 0;

  if (defined(MetadataCompoundType[tokens[tokenIndex]])) {
    compoundType = tokens[tokenIndex++];
  }

  if (defined(MetadataBasicType[tokens[tokenIndex]])) {
    basicType = tokens[tokenIndex++];
  }

  if (MetadataBasicType.isIntegerType(basicType)) {
    if (tokenIndex < tokens.length && tokens[tokenIndex] === "NORM") {
      normalized = true;
    }
  }

  return {
    basicType: basicType,
    compoundType: compoundType,
    normalized: normalized,
    count: count,
    enumId: enumId,
  };
}

/**
 * Normalizes integer property values. If the property is not normalized
 * the value is returned unmodified.
 *
 * @param {*} value The integer value or array of integer values.
 * @returns {*} The normalized value or array of normalized values.
 *
 * @private
 */
MetadataClassProperty.prototype.normalize = function (value) {
  return normalize(this, value, MetadataBasicType.normalize);
};

/**
 * Unnormalizes integer property values. If the property is not normalized
 * the value is returned unmodified.
 *
 * @param {*} value The normalized value or array of normalized values.
 * @returns {*} The integer value or array of integer values.
 *
 * @private
 */
MetadataClassProperty.prototype.unnormalize = function (value) {
  return normalize(this, value, MetadataBasicType.unnormalize);
};

/**
 * Unpack VECN values into {@link Cartesian2}, {@link Cartesian3}, or
 * {@link Cartesian4} and MATN values into {@link Matrix2}, {@link Matrix3}, or
 * {@link Matrix4} depending on N. All other values (including arrays of
 * other sizes) are passed through unaltered.
 *
 * @param {*} value the original, normalized values.
 * @returns {*} The appropriate vector or matrix type if the value is a vector or matrix type, respectively. Otherwise, the value is returned unaltered.
 * @private
 */
MetadataClassProperty.prototype.unpackVectorAndMatrixTypes = function (value) {
  switch (this._compoundType) {
    case MetadataCompoundType.VEC2:
      return Cartesian2.unpack(value);
    case MetadataCompoundType.VEC3:
      return Cartesian3.unpack(value);
    case MetadataCompoundType.VEC4:
      return Cartesian4.unpack(value);
    case MetadataCompoundType.MAT2:
      return Matrix2.unpack(value);
    case MetadataCompoundType.MAT3:
      return Matrix3.unpack(value);
    case MetadataCompoundType.MAT4:
      return Matrix4.unpack(value);
    default:
      return value;
  }
};

/**
 * Pack a {@link Cartesian2}, {@link Cartesian3}, or {@link Cartesian4} into an
 * array if this property is an <code>VECN</code>.
 * Pack a {@link Matrix2}, {@link Matrix3}, or {@link Matrix4} into an
 * array if this property is an <code>MATN</code>.
 * All other values (including arrays of other sizes) are passed through unaltered.
 *
 * @param {*} value The value of this property
 * @returns {*} An array of the appropriate length if the property is a vector or matrix type. Otherwise, the value is returned unaltered.
 * @private
 */
MetadataClassProperty.prototype.packVectorAndMatrixTypes = function (value) {
  switch (this._compoundType) {
    case MetadataCompoundType.VEC2:
      return Cartesian2.pack(value, []);
    case MetadataCompoundType.VEC3:
      return Cartesian3.pack(value, []);
    case MetadataCompoundType.VEC4:
      return Cartesian4.pack(value, []);
    case MetadataCompoundType.MAT2:
      return Matrix2.pack(value, []);
    case MetadataCompoundType.MAT3:
      return Matrix3.pack(value, []);
    case MetadataCompoundType.MAT4:
      return Matrix4.pack(value, []);
    default:
      return value;
  }
};

/**
 * Validates whether the given value conforms to the property.
 *
 * @param {*} value The value.
 * @returns {String|undefined} An error message if the value does not conform to the property, otherwise undefined.
 * @private
 */
MetadataClassProperty.prototype.validate = function (value) {
  var compoundType = this._compoundType;
  var basicType = this._basicType;
  var count = this._count;

  if (
    MetadataCompoundType.isVectorType(compoundType) ||
    MetadataCompoundType.isMatrixType(compoundType)
  ) {
    return validateVectorOrMatrix(value, compoundType, basicType);
  } else if (count > 0) {
    return validateArray(this, value, count);
  }

  return checkValue(this, value);
};

function validateArray(classProperty, value, count) {
  if (!Array.isArray(value)) {
    return "value " + value + " is not an array";
  }
  var length = value.length;
  if (defined(count) && count !== length) {
    return "Array length does not match count";
  }
  for (var i = 0; i < length; ++i) {
    var message = checkValue(classProperty, value[i]);
    if (defined(message)) {
      return message;
    }
  }
}

function validateVectorOrMatrix(value, compoundType, basicType) {
  if (!MetadataBasicType.isVectorCompatible(basicType)) {
    var message = "basic type " + basicType + " is incompatible with ";
    if (MetadataCompoundType.isVectorType(compoundType)) {
      return message + "vector type " + compoundType;
    }

    return message + "matrix type " + compoundType;
  }

  if (
    compoundType === MetadataCompoundType.VEC2 &&
    !(value instanceof Cartesian2)
  ) {
    return "vector value " + value + " must be a Cartesian2";
  }

  if (
    compoundType === MetadataCompoundType.VEC3 &&
    !(value instanceof Cartesian3)
  ) {
    return "vector value " + value + " must be a Cartesian3";
  }

  if (
    compoundType === MetadataCompoundType.VEC4 &&
    !(value instanceof Cartesian4)
  ) {
    return "vector value " + value + " must be a Cartesian4";
  }

  if (
    compoundType === MetadataCompoundType.MAT2 &&
    !(value instanceof Matrix2)
  ) {
    return "matrix value " + value + " must be a Matrix2";
  }

  if (
    compoundType === MetadataCompoundType.MAT3 &&
    !(value instanceof Matrix3)
  ) {
    return "matrix value " + value + " must be a Matrix3";
  }

  if (
    compoundType === MetadataCompoundType.MAT4 &&
    !(value instanceof Matrix4)
  ) {
    return "matrix value " + value + " must be a Matrix4";
  }
}

function getTypeErrorMessage(value, basicType) {
  // TODO
  return "value " + value + " does not match type " + basicType;
}

function getOutOfRangeErrorMessage(value, basicType, normalized) {
  var errorMessage =
    "value " + value + " is out of range for type " + basicType;
  if (normalized) {
    errorMessage += " (normalized)";
  }
  return errorMessage;
}

function checkInRange(value, basicType, normalized) {
  if (normalized) {
    var min = MetadataBasicType.isUnsignedIntegerType(basicType) ? 0.0 : -1.0;
    var max = 1.0;
    if (value < min || value > max) {
      return getOutOfRangeErrorMessage(value, basicType, normalized);
    }
    return;
  }

  if (
    value < MetadataBasicType.getMinimum(basicType) ||
    value > MetadataBasicType.getMaximum(basicType)
  ) {
    return getOutOfRangeErrorMessage(value, basicType, normalized);
  }
}

function getNonFiniteErrorMessage(value, basicType) {
  return "value " + value + " of type " + basicType + " must be finite";
}

function checkValue(classProperty, value) {
  var javascriptType = typeof value;

  var enumType = classProperty._enumType;
  if (defined(enumType)) {
    if (javascriptType !== "string" || !defined(enumType.valuesByName[value])) {
      return "value " + value + " is not a valid enum name for " + enumType.id;
    }
    return;
  }

  var basicType = classProperty._basicType;
  var normalized = classProperty._normalized;

  switch (basicType) {
    case MetadataBasicType.INT8:
    case MetadataBasicType.UINT8:
    case MetadataBasicType.INT16:
    case MetadataBasicType.UINT16:
    case MetadataBasicType.INT32:
    case MetadataBasicType.UINT32:
      if (javascriptType !== "number") {
        return getTypeErrorMessage(value, basicType);
      }
      return checkInRange(value, basicType, normalized);
    case MetadataBasicType.INT64:
    case MetadataBasicType.UINT64:
      if (javascriptType !== "number" && javascriptType !== "bigint") {
        return getTypeErrorMessage(value, basicType);
      }
      return checkInRange(value, basicType, normalized);
    case MetadataBasicType.FLOAT32:
      if (javascriptType !== "number") {
        return getTypeErrorMessage(value, basicType);
      }
      if (isFinite(value)) {
        return checkInRange(value, basicType, normalized);
      }
      return getNonFiniteErrorMessage(value, basicType);
    case MetadataBasicType.FLOAT64:
      if (javascriptType !== "number") {
        return getTypeErrorMessage(value, basicType);
      }
      if (isFinite(value)) {
        return checkInRange(value, basicType, normalized);
      }
      return getNonFiniteErrorMessage(value, basicType);
    case MetadataBasicType.BOOLEAN:
      if (javascriptType !== "boolean") {
        return getTypeErrorMessage(value, basicType);
      }
      break;
    case MetadataBasicType.STRING:
      if (javascriptType !== "string") {
        return getTypeErrorMessage(value, basicType);
      }
      break;
  }
}

function normalize(classProperty, value, normalizeFunction) {
  var normalized = classProperty._normalized;
  if (!normalized) {
    return value;
  }

  var compoundType = classProperty._compoundType;
  var basicType = classProperty._basicType;
  var count = classProperty._count;

  var i;
  var length;

  if (count !== 1) {
    length = value.length;
    for (i = 0; i < length; ++i) {
      value[i] = normalizeFunction(value[i], basicType);
    }
  } else if (
    MetadataCompoundType.isVectorType(compoundType) ||
    MetadataCompoundType.isMatrixType(compoundType)
  ) {
    length = MetadataCompoundType.getComponentCount(compoundType);
    for (i = 0; i < length; ++i) {
      value[i] = normalizeFunction(value[i], basicType);
    }
  } else {
    value = normalizeFunction(value, basicType);
  }

  return value;
}

export default MetadataClassProperty;
