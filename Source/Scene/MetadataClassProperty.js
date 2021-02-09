import Check from "../Core/Check.js";
import clone from "../Core/clone.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import MetadataType from "./MetadataType.js";

/**
 * A metadata property.
 *
 * @param {Object} options Object with the following properties:
 * @param {String} options.id The ID of the property.
 * @param {Object} options.property The property JSON object.
 * @param {Object.<String, MetadataEnum>} [options.enums] A dictionary of enums.
 *
 * @alias MetadataClassProperty
 * @constructor
 *
 * @private
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

  var propertyDefault = property.default;
  if (Array.isArray(propertyDefault)) {
    propertyDefault = propertyDefault.slice(); // Clone so that this object doesn't hold on to a reference to the JSON
  }

  var min = defined(property.min) ? property.min.slice() : undefined; // Clone so that this object doesn't hold on to a reference to the JSON
  var max = defined(property.max) ? property.max.slice() : undefined; // Clone so that this object doesn't hold on to a reference to the JSON

  this._id = id;
  this._name = property.name;
  this._description = property.description;
  this._type = type;
  this._enumType = enumType;
  this._componentType = componentType;
  this._valueType = valueType;
  this._componentCount = property.componentCount;
  this._normalized = normalized;
  this._min = min;
  this._max = max;
  this._default = propertyDefault;
  this._optional = defaultValue(property.optional, false);
  this._semantic = property.semantic;
  this._extras = clone(property.extras, true); // Clone so that this object doesn't hold on to a reference to the JSON
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
   * An array storing the maximum value of each component. Only defined when type or componentType is a numeric type.
   *
   * @memberof MetadataClassProperty.prototype
   * @type {Number[]}
   * @readonly
   * @private
   */
  max: {
    get: function () {
      return this._max;
    },
  },

  /**
   * An array storing the minimum value of each component. Only defined when type or componentType is a numeric type.
   *
   * @memberof MetadataClassProperty.prototype
   * @type {Number[]}
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
});

/**
 * Validates whether the given value conforms to the property.
 *
 * @param {*} value The value.
 * @returns {String|undefined} An error message if the value does not conform to the property, otherwise undefined.
 */
MetadataClassProperty.prototype.validate = function (value) {
  var message;
  var type = this._type;
  if (type === MetadataType.ARRAY) {
    if (!Array.isArray(value)) {
      return getTypeErrorMessage(value, type);
    }
    var length = value.length;
    if (defined(this._componentCount) && this._componentCount !== length) {
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
