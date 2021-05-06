import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartesian4 from "../Core/Cartesian4.js";
import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import MetadataType from "./MetadataType.js";

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

  var type = MetadataType[property.type];
  var componentType = MetadataType[property.componentType];
  var valueType = getValueType(type, componentType, enumType);

  var normalized =
    !defined(enumType) &&
    MetadataType.isIntegerType(valueType) &&
    defaultValue(property.normalized, false);

  this._id = id;
  this._name = property.name;
  this._description = property.description;
  this._type = type;
  this._enumType = enumType;
  this._componentType = componentType;
  this._valueType = valueType;
  this._componentCount = property.componentCount;
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
   * The type of the property.
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
   * The component type of the property. Only defined when type is ARRAY.
   *
   * @memberof MetadataClassProperty.prototype
   * @type {MetadataType}
   * @readonly
   * @private
   */
  componentType: {
    get: function () {
      return this._componentType;
    },
  },

  /**
   * The data type of property values.
   *
   * @memberof MetadataClassProperty.prototype
   * @type {MetadataType}
   * @readonly
   *
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
  return normalize(this, value, MetadataType.normalize);
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
  return normalize(this, value, MetadataType.unnormalize);
};

/**
 * Unpack array values into {@link Cartesian2}, {@link Cartesian3}, or
 * {@link Cartesian4} if this property is an <code>ARRAY</code> of length 2, 3,
 * or 4, respectively. All other values (including arrays of other sizes) are
 * passed through unaltered.
 *
 * @param {*} value the original, normalized values.
 * @returns {*} The appropriate vector type if the value is a vector type. Otherwise, the value is returned unaltered.
 * @private
 */
MetadataClassProperty.prototype.unpackVectorTypes = function (value) {
  var type = this._type;
  var componentCount = this._componentCount;

  if (
    type !== MetadataType.ARRAY ||
    !defined(componentCount) ||
    !MetadataType.isVectorCompatible(this._componentType)
  ) {
    return value;
  }

  if (componentCount === 2) {
    return Cartesian2.unpack(value);
  }

  if (componentCount === 3) {
    return Cartesian3.unpack(value);
  }

  if (componentCount === 4) {
    return Cartesian4.unpack(value);
  }

  return value;
};

/**
 * Pack a {@link Cartesian2}, {@link Cartesian3}, or {@link Cartesian4} into an
 * array if this property is an <code>ARRAY</code> of length 2, 3, or 4, respectively.
 * All other values (including arrays of other sizes) are passed through unaltered.
 *
 * @param {*} value The value of this property
 * @returns {*} An array of the appropriate length if the property is a vector type. Otherwise, the value is returned unaltered.
 * @private
 */
MetadataClassProperty.prototype.packVectorTypes = function (value) {
  var type = this._type;
  var componentCount = this._componentCount;

  if (
    type !== MetadataType.ARRAY ||
    !defined(componentCount) ||
    !MetadataType.isVectorCompatible(this._componentType)
  ) {
    return value;
  }

  if (componentCount === 2) {
    return Cartesian2.pack(value, []);
  }

  if (componentCount === 3) {
    return Cartesian3.pack(value, []);
  }

  if (componentCount === 4) {
    return Cartesian4.pack(value, []);
  }

  return value;
};

/**
 * Validates whether the given value conforms to the property.
 *
 * @param {*} value The value.
 * @returns {String|undefined} An error message if the value does not conform to the property, otherwise undefined.
 * @private
 */
MetadataClassProperty.prototype.validate = function (value) {
  var message;
  var type = this._type;
  if (type === MetadataType.ARRAY) {
    var componentCount = this._componentCount;

    // arrays of length 2, 3, and 4 are implicitly converted to CartesianN
    if (
      defined(componentCount) &&
      componentCount >= 2 &&
      componentCount <= 4 &&
      MetadataType.isVectorCompatible(this._componentType)
    ) {
      return validateVector(value, componentCount);
    }

    if (!Array.isArray(value)) {
      return getTypeErrorMessage(value, type);
    }
    var length = value.length;
    if (defined(componentCount) && componentCount !== length) {
      return "Array length does not match componentCount";
    }
    for (var i = 0; i < length; ++i) {
      message = checkValue(this, value[i]);
      if (defined(message)) {
        return message;
      }
    }
  } else {
    message = checkValue(this, value);
    if (defined(message)) {
      return message;
    }
  }
};

function validateVector(value, componentCount) {
  if (componentCount === 2 && !(value instanceof Cartesian2)) {
    return "vector value " + value + " must be a Cartesian2";
  }

  if (componentCount === 3 && !(value instanceof Cartesian3)) {
    return "vector value " + value + " must be a Cartesian3";
  }

  if (componentCount === 4 && !(value instanceof Cartesian4)) {
    return "vector value " + value + " must be a Cartesian4";
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

function checkInRange(value, type, normalized) {
  if (normalized) {
    var min = MetadataType.isUnsignedIntegerType(type) ? 0.0 : -1.0;
    var max = 1.0;
    if (value < min || value > max) {
      return getOutOfRangeErrorMessage(value, type, normalized);
    }
    return;
  }

  if (
    value < MetadataType.getMinimum(type) ||
    value > MetadataType.getMaximum(type)
  ) {
    return getOutOfRangeErrorMessage(value, type, normalized);
  }
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
    case MetadataType.INT8:
    case MetadataType.UINT8:
    case MetadataType.INT16:
    case MetadataType.UINT16:
    case MetadataType.INT32:
    case MetadataType.UINT32:
      if (javascriptType !== "number") {
        return getTypeErrorMessage(value, valueType);
      }
      return checkInRange(value, valueType, normalized);
    case MetadataType.INT64:
    case MetadataType.UINT64:
      if (javascriptType !== "number" && javascriptType !== "bigint") {
        return getTypeErrorMessage(value, valueType);
      }
      return checkInRange(value, valueType, normalized);
    case MetadataType.FLOAT32:
      if (javascriptType !== "number") {
        return getTypeErrorMessage(value, valueType);
      }
      if (isFinite(value)) {
        return checkInRange(value, valueType, normalized);
      }
      break;
    case MetadataType.FLOAT64:
      if (javascriptType !== "number") {
        return getTypeErrorMessage(value, valueType);
      }
      break;
    case MetadataType.BOOLEAN:
      if (javascriptType !== "boolean") {
        return getTypeErrorMessage(value, valueType);
      }
      break;
    case MetadataType.STRING:
      if (javascriptType !== "string") {
        return getTypeErrorMessage(value, valueType);
      }
      break;
  }
}

function normalize(classProperty, value, normalizeFunction) {
  var type = classProperty._type;
  var valueType = classProperty._valueType;
  var normalized = classProperty._normalized;

  if (normalized) {
    if (type === MetadataType.ARRAY) {
      var length = value.length;
      for (var i = 0; i < length; ++i) {
        value[i] = normalizeFunction(value[i], valueType);
      }
    } else {
      value = normalizeFunction(value, valueType);
    }
  }
  return value;
}

function getValueType(type, componentType, enumType) {
  if (type === MetadataType.ARRAY) {
    type = componentType;
  }
  if (type === MetadataType.ENUM) {
    type = enumType.valueType;
  }

  return type;
}

export default MetadataClassProperty;
