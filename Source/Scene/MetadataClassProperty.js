import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartesian4 from "../Core/Cartesian4.js";
import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import Matrix2 from "../Core/Matrix2.js";
import Matrix3 from "../Core/Matrix3.js";
import Matrix4 from "../Core/Matrix4.js";
import MetadataType from "./MetadataType.js";
import MetadataComponentType from "./MetadataComponentType.js";

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

  var enumType;
  if (defined(property.enumType)) {
    enumType = options.enums[property.enumType];
  }

  var type = property.type;
  var componentType;
  if (MetadataComponentType.hasOwnProperty(type)) {
    // For EXT_feature_metadata, single values were part of type, not
    // componentType. Transcode to the newer format.
    componentType = MetadataComponentType[type];
    type = MetadataType.SINGLE;
  } else {
    type = defaultValue(MetadataType[type], MetadataType.SINGLE);
    componentType = MetadataComponentType[property.componentType];
  }
  var valueType = getValueType(componentType, enumType);

  var normalized =
    MetadataComponentType.isIntegerType(componentType) &&
    defaultValue(property.normalized, false);

  var componentCount =
    type === MetadataType.ARRAY
      ? property.componentCount
      : MetadataType.getComponentCount(type);

  this._id = id;
  this._name = property.name;
  this._description = property.description;
  this._type = type;
  this._enumType = enumType;
  this._valueType = valueType;
  this._componentType = componentType;
  this._componentCount = componentCount;
  this._normalized = normalized;
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
   * The type of the property. Each type holds one (SINGLE) or more components
   * (ARRAY, VECN, MATN).
   *
   *
   * @memberof MetadataClassProperty.prototype
   * @type {MetadataType}
   * @readonly
   * @private
   */
  type: {
    get: function () {
      return this._type;
    },
  },

  /**
   * The enum type of the property. Only defined when type or componentType is ENUM.
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
   * The component type of the property. These are
   *
   * @memberof MetadataClassProperty.prototype
   * @type {MetadataComponentType}
   * @readonly
   * @private
   */
  componentType: {
    get: function () {
      return this._componentType;
    },
  },

  /**
   * The datatype used for storing each component of the property. This
   * is usually the same as componentType except for ENUM, where this
   * returns an integer type
   *
   * @memberof MetadataClassProperty.prototype
   * @type {MetadataComponentType}
   * @readonly
   * @private
   */
  valueType: {
    get: function () {
      return this._valueType;
    },
  },

  /**
   * The number of components per element. Only defined when type is a fixed size ARRAY.
   *
   * @memberof MetadataClassProperty.prototype
   * @type {Number}
   * @readonly
   * @private
   */
  componentCount: {
    get: function () {
      return this._componentCount;
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
   * A number or an array of numbers storing the maximum allowable value of this property. Only defined when type or componentType is a numeric type.
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
   * A number or an array of numbers storing the minimum allowable value of this property. Only defined when type or componentType is a numeric type.
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
  return normalize(this, value, MetadataComponentType.normalize);
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
  return normalize(this, value, MetadataComponentType.unnormalize);
};

/**
 * Unpack VECN values into {@link Cartesian2}, {@link Cartesian3}, or
 * {@link Cartesian4} depending on N. All other values (including arrays of
 * other sizes) are passed through unaltered.
 *
 * @param {*} value the original, normalized values.
 * @returns {*} The appropriate vector type if the value is a vector type. Otherwise, the value is returned unaltered.
 * @private
 */
MetadataClassProperty.prototype.unpackVectorAndMatrixTypes = function (value) {
  switch (this._type) {
    case MetadataType.VEC2:
      return Cartesian2.unpack(value);
    case MetadataType.VEC3:
      return Cartesian3.unpack(value);
    case MetadataType.VEC4:
      return Cartesian4.unpack(value);
    case MetadataType.MAT2:
      return Matrix2.unpack(value);
    case MetadataType.MAT3:
      return Matrix3.unpack(value);
    case MetadataType.MAT4:
      return Matrix4.unpack(value);
    default:
      return value;
  }
};

/**
 * Pack a {@link Cartesian2}, {@link Cartesian3}, or {@link Cartesian4} into an
 * array if this property is an <code>VECN</code>
 * All other values (including arrays of other sizes) are passed through unaltered.
 *
 * @param {*} value The value of this property
 * @returns {*} An array of the appropriate length if the property is a vector type. Otherwise, the value is returned unaltered.
 * @private
 */
MetadataClassProperty.prototype.packVectorAndMatrixTypes = function (value) {
  switch (this._type) {
    case MetadataType.VEC2:
      return Cartesian2.pack(value, []);
    case MetadataType.VEC3:
      return Cartesian3.pack(value, []);
    case MetadataType.VEC4:
      return Cartesian4.pack(value, []);
    case MetadataType.MAT2:
      return Matrix2.pack(value, []);
    case MetadataType.MAT3:
      return Matrix3.pack(value, []);
    case MetadataType.MAT4:
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
  var type = this._type;
  var componentType = this._componentType;

  if (MetadataType.isVectorType(type) || MetadataType.isMatrixType(type)) {
    return validateVectorOrMatrix(value, type, componentType);
  } else if (type === MetadataType.ARRAY) {
    return validateArray(this, value, this._componentCount);
  }

  return checkValue(this, value);
};

function validateArray(classProperty, value, componentCount) {
  if (!Array.isArray(value)) {
    return getTypeErrorMessage(value, MetadataType.ARRAY);
  }
  var length = value.length;
  if (defined(componentCount) && componentCount !== length) {
    return "Array length does not match componentCount";
  }
  for (var i = 0; i < length; ++i) {
    var message = checkValue(classProperty, value[i]);
    if (defined(message)) {
      return message;
    }
  }
}

function validateVectorOrMatrix(value, type, componentType) {
  if (!MetadataComponentType.isVectorCompatible(componentType)) {
    var message = type + " has an incompatible componentType " + componentType;
    if (MetadataType.isVectorType(type)) {
      return "vector value " + message;
    }

    return "matrix value " + message;
  }

  if (type === MetadataType.VEC2 && !(value instanceof Cartesian2)) {
    return "vector value " + value + " must be a Cartesian2";
  }

  if (type === MetadataType.VEC3 && !(value instanceof Cartesian3)) {
    return "vector value " + value + " must be a Cartesian3";
  }

  if (type === MetadataType.VEC4 && !(value instanceof Cartesian4)) {
    return "vector value " + value + " must be a Cartesian4";
  }

  if (type === MetadataType.MAT2 && !(value instanceof Matrix2)) {
    return "matrix value " + value + " must be a Matrix2";
  }

  if (type === MetadataType.MAT3 && !(value instanceof Matrix3)) {
    return "matrix value " + value + " must be a Matrix3";
  }

  if (type === MetadataType.MAT4 && !(value instanceof Matrix4)) {
    return "matrix value " + value + " must be a Matrix4";
  }
}

function getTypeErrorMessage(value, type) {
  return "value " + value + " does not match type " + type;
}

function getOutOfRangeErrorMessage(value, type, normalized) {
  var errorMessage = "value " + value + " is out of range for type " + type;
  if (normalized) {
    errorMessage += " (normalized)";
  }
  return errorMessage;
}

function checkInRange(value, componentType, normalized) {
  if (normalized) {
    var min = MetadataComponentType.isUnsignedIntegerType(componentType)
      ? 0.0
      : -1.0;
    var max = 1.0;
    if (value < min || value > max) {
      return getOutOfRangeErrorMessage(value, componentType, normalized);
    }
    return;
  }

  if (
    value < MetadataComponentType.getMinimum(componentType) ||
    value > MetadataComponentType.getMaximum(componentType)
  ) {
    return getOutOfRangeErrorMessage(value, componentType, normalized);
  }
}

function getNonFiniteErrorMessage(value, type) {
  return "value " + value + " of type " + type + " must be finite";
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

  var valueType = classProperty._valueType;
  var normalized = classProperty._normalized;

  switch (valueType) {
    case MetadataComponentType.INT8:
    case MetadataComponentType.UINT8:
    case MetadataComponentType.INT16:
    case MetadataComponentType.UINT16:
    case MetadataComponentType.INT32:
    case MetadataComponentType.UINT32:
      if (javascriptType !== "number") {
        return getTypeErrorMessage(value, valueType);
      }
      return checkInRange(value, valueType, normalized);
    case MetadataComponentType.INT64:
    case MetadataComponentType.UINT64:
      if (javascriptType !== "number" && javascriptType !== "bigint") {
        return getTypeErrorMessage(value, valueType);
      }
      return checkInRange(value, valueType, normalized);
    case MetadataComponentType.FLOAT32:
      if (javascriptType !== "number") {
        return getTypeErrorMessage(value, valueType);
      }
      if (isFinite(value)) {
        return checkInRange(value, valueType, normalized);
      }
      return getNonFiniteErrorMessage(value, valueType);
    case MetadataComponentType.FLOAT64:
      if (javascriptType !== "number") {
        return getTypeErrorMessage(value, valueType);
      }
      if (isFinite(value)) {
        return checkInRange(value, valueType, normalized);
      }
      return getNonFiniteErrorMessage(value, valueType);
    case MetadataComponentType.BOOLEAN:
      if (javascriptType !== "boolean") {
        return getTypeErrorMessage(value, valueType);
      }
      break;
    case MetadataComponentType.STRING:
      if (javascriptType !== "string") {
        return getTypeErrorMessage(value, valueType);
      }
      break;
  }
}

function normalize(classProperty, value, normalizeFunction) {
  var normalized = classProperty._normalized;
  if (!normalized) {
    return value;
  }

  var type = classProperty._type;
  var valueType = classProperty._valueType;

  if (type === MetadataType.ARRAY) {
    var length = value.length;
    for (var i = 0; i < length; ++i) {
      value[i] = normalizeFunction(value[i], valueType);
    }
  } else if (MetadataType.isVectorType(type)) {
    throw "TODO: Normalize vector types";
  } else if (MetadataType.isMatrixType(type)) {
    throw "TODO: Normalize matrix types";
  } else {
    value = normalizeFunction(value, valueType);
  }

  return value;
}

function getValueType(componentType, enumType) {
  if (componentType === MetadataComponentType.ENUM) {
    return enumType.valueType;
  }

  return componentType;
}

export default MetadataClassProperty;
