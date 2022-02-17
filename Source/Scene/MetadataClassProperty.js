import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartesian4 from "../Core/Cartesian4.js";
import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
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
  const id = options.id;
  const property = options.property;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("options.id", id);
  Check.typeOf.object("options.property", property);
  Check.typeOf.string("options.property.type", property.type);
  //>>includeEnd('debug');

  // Try to determine if this is the legacy extension. This is not
  // always possible, as there are some types that are valid in both
  // extensions.
  const isLegacyExtension = isLegacy(property);
  const parsedType = parseType(property, options.enums);
  const componentType = parsedType.componentType;

  const normalized =
    defined(componentType) &&
    MetadataComponentType.isIntegerType(componentType) &&
    defaultValue(property.normalized, false);

  // Basic information about this property
  this._id = id;
  this._name = property.name;
  this._description = property.description;
  this._semantic = property.semantic;
  this._isLegacyExtension = isLegacyExtension;

  // Details about basic types
  this._type = parsedType.type;
  this._componentType = componentType;
  this._enumType = parsedType.enumType;
  this._valueType = parsedType.valueType;

  // Details about arrays
  this._isArray = parsedType.isArray;
  this._count = parsedType.count;
  this._hasFixedCount = parsedType.hasFixedCount;

  // min and max allowed values
  this._min = property.min;
  this._max = property.max;

  // properties that adjust the range of metadata values
  this._normalized = normalized;

  const offset = property.offset;
  const scale = property.scale;
  this._offset = offset;
  this._scale = scale;
  this._hasRescaling = defined(offset) || defined(scale);

  // sentinel value for missing data, and a default value to use
  // in its place if needed.
  this._noData = property.noData;
  this._default = property.default;

  // EXT_feature_metadata had an optional flag, while EXT_structural_metadata
  // has a required flag. The defaults are not the same, and there's some cases
  // like {type: BOOLEAN} that are ambiguous. Coalesce this into a single
  // required flag
  let required;
  if (!defined(isLegacyExtension)) {
    // Impossible to tell which extension was used, so don't require
    // the property
    required = false;
  } else if (isLegacyExtension) {
    required = defaultValue(!property.optional, true);
  } else {
    required = defaultValue(property.required, false);
  }
  this._required = required;

  // extras and extensions
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
   * The type of the property such as SCALAR, VEC2, VEC3
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
   * The enum type of the property. Only defined when type is ENUM.
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
   * The component type of the property. This includes integer
   * (e.g. INT8 or UINT16), and floating point (FLOAT32 and FLOAT64) values
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
   * True if a property is an array, false otherwise.
   *
   * @memberof MetadataClassProperty.prototype
   * @type {Boolean}
   * @readonly
   * @private
   */
  isArray: {
    get: function () {
      return this._isArray;
    },
  },

  /**
   * True if a property is an array with a fixed count
   *
   * @memberof MetadataClassProperty.prototype
   * @type {Boolean}
   * @readonly
   * @private
   */
  hasFixedCount: {
    get: function () {
      return this._hasFixedCount;
    },
  },

  /**
   * The number of components per element. Only defined for fixed-size
   * arrays
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
   * Whether the property is required.
   *
   * @memberof MetadataClassProperty.prototype
   * @type {Boolean}
   * @readonly
   * @private
   */
  required: {
    get: function () {
      return this._required;
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

function isLegacy(property) {
  if (property.type === "ARRAY") {
    return true;
  }

  // New property types in EXT_structural_metadata
  const type = property.type;
  if (
    type === MetadataType.SCALAR ||
    MetadataType.isMatrixType(type) ||
    MetadataType.isVectorType(type)
  ) {
    return false;
  }

  // EXT_feature_metadata allowed numeric types as a type. Now they are
  // represented as {type: SINGLE, componentType: type}
  if (MetadataComponentType.isNumericType(type)) {
    return true;
  }

  // New properties in EXT_structural_metadata
  if (
    defined(property.noData) ||
    defined(property.scale) ||
    defined(property.offset) ||
    defined(property.required) ||
    defined(property.count) ||
    defined(property.hasFixedCount)
  ) {
    return false;
  }

  // Properties that only exist in EXT_structural_metadata
  if (defined(property.optional)) {
    return false;
  }

  // impossible to tell, give up.
  return undefined;
}

function parseType(property, enums) {
  const type = property.type;
  const componentType = property.componentType;

  // EXT_feature_metadata had an ARRAY type. This is now handled
  // with count + hasFixedCount, so some details need to be transcoded
  const isLegacyArray = type === "ARRAY";
  let isArray;
  let count;
  let hasFixedCount;
  if (isLegacyArray) {
    // definitely EXT_feature_metadata
    isArray = true;
    count = property.componentCount;
    hasFixedCount = defined(count);
  } else if (defined(property.count) || defined(property.hasFixedCount)) {
    // definitely EXT_structural metadata
    if (property.hasFixedCount) {
      // fixed-sized array
      count = defaultValue(property.count, 1);
      isArray = count > 1;
      hasFixedCount = true;
    } else {
      // variable sized array
      isArray = true;
      count = undefined;
      hasFixedCount = false;
    }
  } else {
    // Could be either extension. Some cases are impossible to distinguished
    // Default to a single value
    isArray = false;
    count = 1;
    hasFixedCount = true;
  }

  let enumType;
  if (defined(property.enumType)) {
    enumType = enums[property.enumType];
  }

  // In both EXT_feature_metadata and EXT_structural_metadata, ENUM appears
  // as a type.
  if (type === MetadataType.ENUM) {
    return {
      type: type,
      componentType: undefined,
      enumType: enumType,
      valueType: enumType.valueType,
      isArray: isArray,
      hasFixedCount: hasFixedCount,
      count: count,
    };
  }

  // In EXT_feature_metadata, ENUM also appears as an ARRAY componentType
  if (isLegacyArray && componentType === MetadataType.ENUM) {
    return {
      type: componentType,
      componentType: undefined,
      enumType: enumType,
      valueType: enumType.valueType,
      isArray: isArray,
      hasFixedCount: hasFixedCount,
      count: count,
    };
  }

  // EXT_structural_metadata only: SCALAR, VECN and MATN
  if (
    type === MetadataType.SCALAR ||
    MetadataType.isMatrixType(type) ||
    MetadataType.isVectorType(type)
  ) {
    return {
      type: type,
      componentType: componentType,
      enumType: undefined,
      valueType: componentType,
      isArray: isArray,
      hasFixedCount: hasFixedCount,
      count: count,
    };
  }

  // In both EXT_structural_metadata and EXT_feature_metadata,
  // BOOLEAN and STRING appear as types
  if (type === MetadataType.BOOLEAN || type === MetadataType.STRING) {
    return {
      type: type,
      componentType: undefined,
      enumType: undefined,
      valueType: undefined,
      isArray: isArray,
      hasFixedCount: hasFixedCount,
      count: count,
    };
  }

  // EXT_feature_metadata also allows BOOLEAN and STRING as an ARRAY
  // componentType
  if (
    isLegacyArray &&
    (componentType === MetadataType.BOOLEAN ||
      componentType === MetadataType.STRING)
  ) {
    return {
      type: componentType,
      componentType: undefined,
      enumType: undefined,
      valueType: undefined,
      isArray: isArray,
      hasFixedCount: hasFixedCount,
      count: count,
    };
  }

  // Both EXT_feature_metadata and EXT_mesh_features allow numeric types like
  // INT32 or FLOAT64 as a componentType.
  if (
    defined(componentType) &&
    MetadataComponentType.isNumericType(componentType)
  ) {
    return {
      type: MetadataType.SCALAR,
      componentType: componentType,
      enumType: undefined,
      valueType: componentType,
      isArray: isArray,
      hasFixedCount: hasFixedCount,
      count: count,
    };
  }

  // EXT_feature_metadata: integer and float types were allowed as types,
  // but now these are expressed as {type: SCALAR, componentType: type}
  if (MetadataComponentType.isNumericType(type)) {
    return {
      type: MetadataType.SCALAR,
      componentType: type,
      enumType: undefined,
      valueType: type,
      isArray: isArray,
      hasFixedCount: hasFixedCount,
      count: count,
    };
  }

  //>>includeStart('debug', pragmas.debug);
  throw new DeveloperError(
    `unknown metadata type {type: ${type}, componentType: ${componentType})`
  );
  //>>includeEnd('debug');
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

MetadataClassProperty.prototype.scaleRange = function (value) {
  // TODO
  return value;
};

MetadataClassProperty.prototype.unscaleRange = function (value) {
  // TODO
  return value;
};

/**
 * Unpack VECN values into {@link Cartesian2}, {@link Cartesian3}, or
 * {@link Cartesian4} and MATN values into {@link Matrix2}, {@link Matrix3}, or
 * {@link Matrix4} depending on N. All other values (including arrays of
 * other sizes) are passed through unaltered.
 *
 * @param {*} value the original, normalized values.
 * @returns {*} The appropriate vector or matrix type if the value is a vector or matrix type, respectively. If the property is an array of vectors or matrices, an array of the appropriate vector or matrix type is returned. Otherwise, the value is returned unaltered.
 * @private
 */
MetadataClassProperty.prototype.unpackVectorAndMatrixTypes = function (value) {
  const MathType = MetadataType.getMathType(this._type);
  const isArray = this._isArray;

  if (!defined(MathType)) {
    return value;
  }

  if (isArray) {
    return MathType.unpackArray(value);
  }

  return MathType.unpack(value);
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
  const MathType = MetadataType.getMathType(this._type);
  const isArray = this._isArray;

  if (!defined(MathType)) {
    return value;
  }

  if (isArray) {
    return MathType.packArray(value, []);
  }

  return MathType.pack(value, []);
};

/**
 * Validates whether the given value conforms to the property.
 *
 * @param {*} value The value.
 * @returns {String|undefined} An error message if the value does not conform to the property, otherwise undefined.
 * @private
 */
MetadataClassProperty.prototype.validate = function (value) {
  if (this._isArray) {
    return validateArray(this, value);
  }

  return validateSingleValue(this, value);
};

function validateArray(classProperty, value) {
  if (!Array.isArray(value)) {
    return `value ${value} must be an array`;
  }

  const length = value.length;
  if (classProperty._hasFixedCount && length !== classProperty._count) {
    return "Array length does not match count";
  }

  for (let i = 0; i < length; i++) {
    const message = validateSingleValue(classProperty, value[i]);
    if (defined(message)) {
      return message;
    }
  }
}

function validateSingleValue(classProperty, value) {
  const type = classProperty._type;
  const valueType = classProperty._valueType;
  const enumType = classProperty._enumType;
  const normalized = classProperty._normalized;

  if (MetadataType.isVectorType(type)) {
    return validateVector(value, type, valueType);
  } else if (MetadataType.isMatrixType(type)) {
    return validateMatrix(value, type, valueType);
  } else if (type === MetadataType.STRING) {
    return validateString(value);
  } else if (type === MetadataType.BOOLEAN) {
    return validateBoolean(value);
  } else if (type === MetadataType.ENUM) {
    return validateEnum(value, enumType);
  }

  return validateScalar(value, valueType, normalized);
}

function validateVector(value, type, componentType) {
  if (!MetadataComponentType.isVectorCompatible(componentType)) {
    return `componentType ${componentType} is incompatible with vector type ${type}`;
  }

  if (type === MetadataType.VEC2 && !(value instanceof Cartesian2)) {
    return `vector value ${value} must be a Cartesian2`;
  }

  if (type === MetadataType.VEC3 && !(value instanceof Cartesian3)) {
    return `vector value ${value} must be a Cartesian3`;
  }

  if (type === MetadataType.VEC4 && !(value instanceof Cartesian4)) {
    return `vector value ${value} must be a Cartesian4`;
  }
}

function validateMatrix(value, type, componentType) {
  if (!MetadataComponentType.isVectorCompatible(componentType)) {
    return `componentType ${componentType} is incompatible with matrix type ${type}`;
  }

  if (type === MetadataType.MAT2 && !(value instanceof Matrix2)) {
    return `matrix value ${value} must be a Matrix2`;
  }

  if (type === MetadataType.MAT3 && !(value instanceof Matrix3)) {
    return `matrix value ${value} must be a Matrix3`;
  }

  if (type === MetadataType.MAT4 && !(value instanceof Matrix4)) {
    return `matrix value ${value} must be a Matrix4`;
  }
}

function validateString(value) {
  if (typeof value !== "string") {
    return getTypeErrorMessage(value, MetadataType.STRING);
  }
}

function validateBoolean(value) {
  if (typeof value !== "boolean") {
    return getTypeErrorMessage(value, MetadataType.BOOLEAN);
  }
}

function validateEnum(value, enumType) {
  const javascriptType = typeof value;
  if (defined(enumType)) {
    if (javascriptType !== "string" || !defined(enumType.valuesByName[value])) {
      return `value ${value} is not a valid enum name for ${enumType.id}`;
    }
    return;
  }
}

function validateScalar(value, valueType, normalized) {
  const javascriptType = typeof value;

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
  }
}

function getTypeErrorMessage(value, type) {
  return `value ${value} does not match type ${type}`;
}

function getOutOfRangeErrorMessage(value, type, normalized) {
  let errorMessage = `value ${value} is out of range for type ${type}`;
  if (normalized) {
    errorMessage += " (normalized)";
  }
  return errorMessage;
}

function checkInRange(value, componentType, normalized) {
  if (normalized) {
    const min = MetadataComponentType.isUnsignedIntegerType(componentType)
      ? 0.0
      : -1.0;
    const max = 1.0;
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
  return `value ${value} of type ${type} must be finite`;
}

function normalize(classProperty, value, normalizeFunction) {
  if (!classProperty._normalized) {
    return value;
  }

  const type = classProperty._type;
  const valueType = classProperty._valueType;
  const isArray = classProperty._isArray;

  if (
    isArray ||
    MetadataType.isVectorType(type) ||
    MetadataType.isMatrixType(type)
  ) {
    const length = value.length;
    for (let i = 0; i < length; ++i) {
      value[i] = normalizeFunction(value[i], valueType);
    }
  } else {
    value = normalizeFunction(value, valueType);
  }

  return value;
}

export default MetadataClassProperty;
