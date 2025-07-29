import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartesian4 from "../Core/Cartesian4.js";
import Check from "../Core/Check.js";
import clone from "../Core/clone.js";
import Frozen from "../Core/Frozen.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Matrix2 from "../Core/Matrix2.js";
import Matrix3 from "../Core/Matrix3.js";
import Matrix4 from "../Core/Matrix4.js";
import MetadataType from "./MetadataType.js";
import MetadataComponentType from "./MetadataComponentType.js";

/**
 * A metadata property, as part of a {@link MetadataClass}.
 * <p>
 * See the {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification/Metadata|3D Metadata Specification} for 3D Tiles
 * </p>
 *
 * @param {object} options Object with the following properties:
 * @param {string} options.id The ID of the property.
 * @param {MetadataType} options.type The type of the property such as SCALAR, VEC2, VEC3.
 * @param {MetadataComponentType} [options.componentType] The component type of the property. This includes integer (e.g. INT8 or UINT16), and floating point (FLOAT32 and FLOAT64) values.
 * @param {MetadataEnum} [options.enumType] The enum type of the property. Only defined when type is ENUM.
 * @param {boolean} [options.isArray=false] True if a property is an array (either fixed length or variable length), false otherwise.
 * @param {boolean} [options.isVariableLengthArray=false] True if a property is a variable length array, false otherwise.
 * @param {number} [options.arrayLength] The number of array elements. Only defined for fixed length arrays.
 * @param {boolean} [options.normalized=false] Whether the property is normalized.
 * @param {number|number[]|number[][]} [options.min] A number or an array of numbers storing the minimum allowable value of this property. Only defined when type is a numeric type.
 * @param {number|number[]|number[][]} [options.max] A number or an array of numbers storing the maximum allowable value of this property. Only defined when type is a numeric type.
 * @param {number|number[]|number[][]} [options.offset] The offset to be added to property values as part of the value transform.
 * @param {number|number[]|number[][]} [options.scale] The scale to be multiplied to property values as part of the value transform.
 * @param {boolean|number|string|Array} [options.noData] The no-data sentinel value that represents null values.
 * @param {boolean|number|string|Array} [options.default] A default value to use when an entity's property value is not defined.
 * @param {boolean} [options.required=false] Whether the property is required.
 * @param {string} [options.name] The name of the property.
 * @param {string} [options.description] The description of the property.
 * @param {string} [options.semantic] An identifier that describes how this property should be interpreted.
 * @param {*} [options.extras] Extra user-defined properties.
 * @param {object} [options.extensions] An object containing extensions.
 *
 * @alias MetadataClassProperty
 * @constructor
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
function MetadataClassProperty(options) {
  options = options ?? Frozen.EMPTY_OBJECT;
  const id = options.id;
  const type = options.type;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("options.id", id);
  Check.typeOf.string("options.type", type);
  //>>includeEnd('debug');

  const componentType = options.componentType;
  const enumType = options.enumType;

  const normalized =
    defined(componentType) &&
    MetadataComponentType.isIntegerType(componentType) &&
    (options.normalized ?? false);

  // Basic information about this property
  this._id = id;
  this._name = options.name;
  this._description = options.description;
  this._semantic = options.semantic;

  // Only for unit testing purposes, not documented in the API
  this._isLegacyExtension = options.isLegacyExtension;

  // Details about basic types
  this._type = type;
  this._componentType = componentType;
  this._enumType = enumType;
  this._valueType = defined(enumType) ? enumType.valueType : componentType;

  // Details about arrays
  this._isArray = options.isArray ?? false;
  this._isVariableLengthArray = options.isVariableLengthArray ?? false;
  this._arrayLength = options.arrayLength;

  // min and max allowed values
  this._min = clone(options.min, true);
  this._max = clone(options.max, true);

  // properties that adjust the range of metadata values
  this._normalized = normalized;

  let offset = clone(options.offset, true);
  let scale = clone(options.scale, true);
  const hasValueTransform = defined(offset) || defined(scale);

  const enableNestedArrays = true;
  if (!defined(offset)) {
    offset = this.expandConstant(0, enableNestedArrays);
  }

  if (!defined(scale)) {
    scale = this.expandConstant(1, enableNestedArrays);
  }

  this._offset = offset;
  this._scale = scale;
  this._hasValueTransform = hasValueTransform;

  // sentinel value for missing data, and a default value to use
  // in its place if needed.
  this._noData = clone(options.noData, true);
  // For vector and array types, this is stored as an array of values.
  this._default = clone(options.default, true);

  this._required = options.required ?? true;

  // extras and extensions
  this._extras = clone(options.extras, true);
  this._extensions = clone(options.extensions, true);
}

/**
 * Creates a {@link MetadataClassProperty} from either 3D Tiles 1.1, 3DTILES_metadata, EXT_structural_metadata, or EXT_feature_metadata.
 *
 * @param {object} options Object with the following properties:
 * @param {string} options.id The ID of the property.
 * @param {object} options.property The property JSON object.
 * @param {Object<string, MetadataEnum>} [options.enums] A dictionary of enums.
 *
 * @returns {MetadataClassProperty} The newly created metadata class property.
 *
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
MetadataClassProperty.fromJson = function (options) {
  options = options ?? Frozen.EMPTY_OBJECT;
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
    required = defined(property.optional) ? !property.optional : true;
  } else {
    required = property.required ?? false;
  }

  return new MetadataClassProperty({
    id: id,
    type: parsedType.type,
    componentType: parsedType.componentType,
    enumType: parsedType.enumType,
    isArray: parsedType.isArray,
    isVariableLengthArray: parsedType.isVariableLengthArray,
    arrayLength: parsedType.arrayLength,
    normalized: property.normalized,
    min: property.min,
    max: property.max,
    offset: property.offset,
    scale: property.scale,
    noData: property.noData,
    default: property.default,
    required: required,
    name: property.name,
    description: property.description,
    semantic: property.semantic,
    extras: property.extras,
    extensions: property.extensions,
    isLegacyExtension: isLegacyExtension,
  });
};

Object.defineProperties(MetadataClassProperty.prototype, {
  /**
   * The ID of the property.
   *
   * @memberof MetadataClassProperty.prototype
   * @type {string}
   * @readonly
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
   * @type {string}
   * @readonly
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
   * @type {string}
   * @readonly
   */
  description: {
    get: function () {
      return this._description;
    },
  },

  /**
   * The type of the property such as SCALAR, VEC2, VEC3
   *
   * @memberof MetadataClassProperty.prototype
   * @type {MetadataType}
   * @readonly
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
   * True if a property is an array (either fixed length or variable length),
   * false otherwise.
   *
   * @memberof MetadataClassProperty.prototype
   * @type {boolean}
   * @readonly
   */
  isArray: {
    get: function () {
      return this._isArray;
    },
  },

  /**
   * True if a property is a variable length array, false otherwise.
   *
   * @memberof MetadataClassProperty.prototype
   * @type {boolean}
   * @readonly
   */
  isVariableLengthArray: {
    get: function () {
      return this._isVariableLengthArray;
    },
  },

  /**
   * The number of array elements. Only defined for fixed-size
   * arrays.
   *
   * @memberof MetadataClassProperty.prototype
   * @type {number}
   * @readonly
   */
  arrayLength: {
    get: function () {
      return this._arrayLength;
    },
  },

  /**
   * Whether the property is normalized.
   *
   * @memberof MetadataClassProperty.prototype
   * @type {boolean}
   * @readonly
   */
  normalized: {
    get: function () {
      return this._normalized;
    },
  },

  /**
   * A number or an array of numbers storing the maximum allowable value of this property. Only defined when type is a numeric type.
   *
   * @memberof MetadataClassProperty.prototype
   * @type {number|number[]|number[][]}
   * @readonly
   */
  max: {
    get: function () {
      return this._max;
    },
  },

  /**
   * A number or an array of numbers storing the minimum allowable value of this property. Only defined when type is a numeric type.
   *
   * @memberof MetadataClassProperty.prototype
   * @type {number|number[]|number[][]}
   * @readonly
   */
  min: {
    get: function () {
      return this._min;
    },
  },

  /**
   * The no-data sentinel value that represents null values
   *
   * @memberof MetadataClassProperty.prototype
   * @type {boolean|number|string|Array}
   * @readonly
   */
  noData: {
    get: function () {
      return this._noData;
    },
  },

  /**
   * A default value to use when an entity's property value is not defined.
   *
   * @memberof MetadataClassProperty.prototype
   * @type {boolean|number|string|Array}
   * @readonly
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
   * @type {boolean}
   * @readonly
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
   * @type {string}
   * @readonly
   */
  semantic: {
    get: function () {
      return this._semantic;
    },
  },

  /**
   * True if offset/scale should be applied. If both offset/scale were
   * undefined, they default to identity so this property is set false
   *
   * @memberof MetadataClassProperty.prototype
   * @type {boolean}
   * @readonly
   * @private
   */
  hasValueTransform: {
    get: function () {
      return this._hasValueTransform;
    },
  },

  /**
   * The offset to be added to property values as part of the value transform.
   *
   * This is always defined, even when `hasValueTransform` is `false`. If
   * the class property JSON itself did not define it, then it will be
   * initialized to the default value.
   *
   * @memberof MetadataClassProperty.prototype
   * @type {number|number[]|number[][]}
   * @readonly
   */
  offset: {
    get: function () {
      return this._offset;
    },
  },

  /**
   * The scale to be multiplied to property values as part of the value transform.
   *
   * This is always defined, even when `hasValueTransform` is `false`. If
   * the class property JSON itself did not define it, then it will be
   * initialized to the default value.
   *
   * @memberof MetadataClassProperty.prototype
   * @type {number|number[]|number[][]}
   * @readonly
   */
  scale: {
    get: function () {
      return this._scale;
    },
  },

  /**
   * Extra user-defined properties.
   *
   * @memberof MetadataClassProperty.prototype
   * @type {*}
   * @readonly
   */
  extras: {
    get: function () {
      return this._extras;
    },
  },

  /**
   * An object containing extensions.
   *
   * @memberof MetadataClassProperty.prototype
   * @type {object}
   * @readonly
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
  if (defined(MetadataComponentType[type])) {
    return true;
  }

  // New properties in EXT_structural_metadata
  if (
    defined(property.noData) ||
    defined(property.scale) ||
    defined(property.offset) ||
    defined(property.required) ||
    defined(property.count) ||
    defined(property.array)
  ) {
    return false;
  }

  // Properties that only exist in EXT_feature_metadata
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
  // with array + count, so some details need to be transcoded
  const isLegacyArray = type === "ARRAY";
  let isArray;
  let arrayLength;
  let isVariableLengthArray;
  if (isLegacyArray) {
    // definitely EXT_feature_metadata
    isArray = true;
    arrayLength = property.componentCount;
    isVariableLengthArray = !defined(arrayLength);
  } else if (property.array) {
    isArray = true;
    arrayLength = property.count;
    isVariableLengthArray = !defined(property.count);
  } else {
    // Could be either extension. Some cases are impossible to distinguish
    // Default to a single value
    isArray = false;
    arrayLength = undefined;
    isVariableLengthArray = false;
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
      isVariableLengthArray: isVariableLengthArray,
      arrayLength: arrayLength,
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
      isVariableLengthArray: isVariableLengthArray,
      arrayLength: arrayLength,
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
      isVariableLengthArray: isVariableLengthArray,
      arrayLength: arrayLength,
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
      isVariableLengthArray: isVariableLengthArray,
      arrayLength: arrayLength,
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
      isVariableLengthArray: isVariableLengthArray,
      arrayLength: arrayLength,
    };
  }

  // Both EXT_feature_metadata and EXT_structural_metadata allow numeric types like
  // INT32 or FLOAT64 as a componentType.
  if (defined(componentType) && defined(MetadataComponentType[componentType])) {
    return {
      type: MetadataType.SCALAR,
      componentType: componentType,
      enumType: undefined,
      valueType: componentType,
      isArray: isArray,
      isVariableLengthArray: isVariableLengthArray,
      arrayLength: arrayLength,
    };
  }

  // EXT_feature_metadata: integer and float types were allowed as types,
  // but now these are expressed as {type: SCALAR, componentType: type}
  if (defined(MetadataComponentType[type])) {
    return {
      type: MetadataType.SCALAR,
      componentType: type,
      enumType: undefined,
      valueType: type,
      isArray: isArray,
      isVariableLengthArray: isVariableLengthArray,
      arrayLength: arrayLength,
    };
  }

  //>>includeStart('debug', pragmas.debug);
  throw new DeveloperError(
    `unknown metadata type {type: ${type}, componentType: ${componentType})`,
  );
  //>>includeEnd('debug');
}

/**
 * Normalizes integer property values. If the property is not normalized
 * the value is returned unmodified.
 * <p>
 * Given the way normalization is defined in {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification/Metadata#normalized-values|the 3D Metadata Specification},
 * normalize and unnormalize are almost, but not quite inverses. In particular,
 * the smallest signed integer value will be off by one after normalizing and
 * unnormalizing. See
 * {@link https://www.desmos.com/calculator/nledg1evut|this Desmos graph} for
 * an example using INT8.
 * </p>
 * <p>
 * Furthermore, for 64-bit integer types, there may be a loss of precision
 * due to conversion to Number
 * </p>
 *
 * @param {*} value The integer value or array of integer values.
 * @returns {*} The normalized value or array of normalized values.
 *
 * @private
 */
MetadataClassProperty.prototype.normalize = function (value) {
  if (!this._normalized) {
    return value;
  }

  return normalizeInPlace(
    value,
    this._valueType,
    MetadataComponentType.normalize,
  );
};

/**
 * Unnormalizes integer property values. If the property is not normalized
 * the value is returned unmodified.
 * <p>
 * Given the way normalization is defined in {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification/Metadata#normalized-values|the 3D Metadata Specification},
 * normalize and unnormalize are almost, but not quite inverses. In particular,
 * the smallest signed integer value will be off by one after normalizing and
 * unnormalizing. See
 * {@link https://www.desmos.com/calculator/nledg1evut|this Desmos graph} for
 * an example using INT8.
 * </p>
 * <p>
 * Furthermore, for 64-bit integer types, there may be a loss of precision
 * due to conversion to Number
 * </p>
 *
 * @param {*} value The normalized value or array of normalized values.
 * @returns {*} The integer value or array of integer values.
 *
 * @private
 */
MetadataClassProperty.prototype.unnormalize = function (value) {
  if (!this._normalized) {
    return value;
  }

  return normalizeInPlace(
    value,
    this._valueType,
    MetadataComponentType.unnormalize,
  );
};

/**
 * @private
 */
MetadataClassProperty.prototype.applyValueTransform = function (value) {
  // variable length arrays do not have a well-defined offset/scale so this
  // is forbidden by the spec
  if (!this._hasValueTransform || this._isVariableLengthArray) {
    return value;
  }

  return MetadataClassProperty.valueTransformInPlace(
    value,
    this._offset,
    this._scale,
    MetadataComponentType.applyValueTransform,
  );
};

/**
 * @private
 */
MetadataClassProperty.prototype.unapplyValueTransform = function (value) {
  // variable length arrays do not have a well-defined offset/scale so this
  // is forbidden by the spec
  if (!this._hasValueTransform || this._isVariableLengthArray) {
    return value;
  }

  return MetadataClassProperty.valueTransformInPlace(
    value,
    this._offset,
    this._scale,
    MetadataComponentType.unapplyValueTransform,
  );
};

/**
 * @private
 */
MetadataClassProperty.prototype.expandConstant = function (
  constant,
  enableNestedArrays,
) {
  enableNestedArrays = enableNestedArrays ?? false;
  const isArray = this._isArray;
  const arrayLength = this._arrayLength;
  const componentCount = MetadataType.getComponentCount(this._type);
  const isNested = isArray && componentCount > 1;

  // scalar values can be returned directly
  if (!isArray && componentCount === 1) {
    return constant;
  }

  // vector and matrix values
  if (!isArray) {
    return new Array(componentCount).fill(constant);
  }

  // arrays of scalars
  if (!isNested) {
    return new Array(arrayLength).fill(constant);
  }

  // arrays of vectors/matrices: flattened
  if (!enableNestedArrays) {
    return new Array(this._arrayLength * componentCount).fill(constant);
  }

  // array of vectors/matrices: nested
  const innerConstant = new Array(componentCount).fill(constant);
  // This array fill duplicates the pointer to the inner arrays. Since this is
  // intended for use with constants, no need to clone the array.
  return new Array(this._arrayLength).fill(innerConstant);
};

/**
 * If the value is the noData sentinel, return undefined. Otherwise, return
 * the value.
 * @param {*} value The raw value
 * @returns {*} Either the value or undefined if the value was a no data value.
 *
 * @private
 */
MetadataClassProperty.prototype.handleNoData = function (value) {
  const sentinel = this._noData;
  if (!defined(sentinel)) {
    return value;
  }

  if (arrayEquals(value, sentinel)) {
    return undefined;
  }

  return value;
};

function arrayEquals(left, right) {
  if (!Array.isArray(left)) {
    return left === right;
  }

  if (!Array.isArray(right)) {
    return false;
  }

  if (left.length !== right.length) {
    return false;
  }

  for (let i = 0; i < left.length; i++) {
    if (!arrayEquals(left[i], right[i])) {
      return false;
    }
  }

  return true;
}

/**
 * Unpack VECN values into {@link Cartesian2}, {@link Cartesian3}, or
 * {@link Cartesian4} and MATN values into {@link Matrix2}, {@link Matrix3}, or
 * {@link Matrix4} depending on N. All other values (including arrays of
 * other sizes) are passed through unaltered.
 *
 * @param {*} value the original, normalized values.
 * @param {boolean} [enableNestedArrays=false] If true, arrays of vectors are represented as nested arrays. This is used for JSON encoding but not binary encoding
 * @returns {*} The appropriate vector or matrix type if the value is a vector or matrix type, respectively. If the property is an array of vectors or matrices, an array of the appropriate vector or matrix type is returned. Otherwise, the value is returned unaltered.
 * @private
 */
MetadataClassProperty.prototype.unpackVectorAndMatrixTypes = function (
  value,
  enableNestedArrays,
) {
  enableNestedArrays = enableNestedArrays ?? false;
  const MathType = MetadataType.getMathType(this._type);
  const isArray = this._isArray;
  const componentCount = MetadataType.getComponentCount(this._type);
  const isNested = isArray && componentCount > 1;

  if (!defined(MathType)) {
    return value;
  }

  if (enableNestedArrays && isNested) {
    return value.map(function (x) {
      return MathType.unpack(x);
    });
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
 * @param {boolean} [enableNestedArrays=false] If true, arrays of vectors are represented as nested arrays. This is used for JSON encoding but not binary encoding
 * @returns {*} An array of the appropriate length if the property is a vector or matrix type. Otherwise, the value is returned unaltered.
 * @private
 */
MetadataClassProperty.prototype.packVectorAndMatrixTypes = function (
  value,
  enableNestedArrays,
) {
  enableNestedArrays = enableNestedArrays ?? false;
  const MathType = MetadataType.getMathType(this._type);
  const isArray = this._isArray;
  const componentCount = MetadataType.getComponentCount(this._type);
  const isNested = isArray && componentCount > 1;

  if (!defined(MathType)) {
    return value;
  }

  if (enableNestedArrays && isNested) {
    return value.map(function (x) {
      return MathType.pack(x, []);
    });
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
 * @returns {string|undefined} An error message if the value does not conform to the property, otherwise undefined.
 * @private
 */
MetadataClassProperty.prototype.validate = function (value) {
  if (!defined(value) && defined(this._default)) {
    // no value, but we have a default to use.
    return undefined;
  }

  if (this._required && !defined(value)) {
    return `required property must have a value`;
  }

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
  if (
    !classProperty._isVariableLengthArray &&
    length !== classProperty._arrayLength
  ) {
    return "Array length does not match property.arrayLength";
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
  const componentType = classProperty._componentType;
  const enumType = classProperty._enumType;
  const normalized = classProperty._normalized;

  if (MetadataType.isVectorType(type)) {
    return validateVector(value, type, componentType);
  } else if (MetadataType.isMatrixType(type)) {
    return validateMatrix(value, type, componentType);
  } else if (type === MetadataType.STRING) {
    return validateString(value);
  } else if (type === MetadataType.BOOLEAN) {
    return validateBoolean(value);
  } else if (type === MetadataType.ENUM) {
    return validateEnum(value, enumType);
  }

  return validateScalar(value, componentType, normalized);
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

function validateScalar(value, componentType, normalized) {
  const javascriptType = typeof value;

  switch (componentType) {
    case MetadataComponentType.INT8:
    case MetadataComponentType.UINT8:
    case MetadataComponentType.INT16:
    case MetadataComponentType.UINT16:
    case MetadataComponentType.INT32:
    case MetadataComponentType.UINT32:
    case MetadataComponentType.FLOAT32:
    case MetadataComponentType.FLOAT64:
      if (javascriptType !== "number") {
        return getTypeErrorMessage(value, componentType);
      }
      if (!isFinite(value)) {
        return getNonFiniteErrorMessage(value, componentType);
      }
      return checkInRange(value, componentType, normalized);
    case MetadataComponentType.INT64:
    case MetadataComponentType.UINT64:
      if (javascriptType !== "number" && javascriptType !== "bigint") {
        return getTypeErrorMessage(value, componentType);
      }
      if (javascriptType === "number" && !isFinite(value)) {
        return getNonFiniteErrorMessage(value, componentType);
      }
      return checkInRange(value, componentType, normalized);
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

function normalizeInPlace(values, valueType, normalizeFunction) {
  if (!Array.isArray(values)) {
    return normalizeFunction(values, valueType);
  }

  for (let i = 0; i < values.length; i++) {
    values[i] = normalizeInPlace(values[i], valueType, normalizeFunction);
  }

  return values;
}

/**
 * Applies the value transform that is defined with the given offsets
 * and scales to the given values.
 *
 * If the given values are not an array, then the given transformation
 * function will be applied directly.
 *
 * If the values are an array, then this function will be called recursively
 * with the array elements, boiling down to a component-wise application
 * of the transformation function to the innermost array elements.
 *
 * @param {number|number[]|number[][]} values The input values
 * @param {number|number[]|number[][]} offsets The offsets
 * @param {number|number[]|number[][]} scales The scales
 * @param {Function} transformationFunction The function with the signature
 * `(value:number, offset:number, scale:number) : number` that will be
 * applied to the innermost elements
 * @returns The input values (or the result of applying the transformation
 * function to a single value if the values have not been an array).
 * @private
 */
MetadataClassProperty.valueTransformInPlace = function (
  values,
  offsets,
  scales,
  transformationFunction,
) {
  if (!Array.isArray(values)) {
    // transform a single value
    return transformationFunction(values, offsets, scales);
  }

  for (let i = 0; i < values.length; i++) {
    // offsets and scales must be the same array shape as values.
    values[i] = MetadataClassProperty.valueTransformInPlace(
      values[i],
      offsets[i],
      scales[i],
      transformationFunction,
    );
  }

  return values;
};

export default MetadataClassProperty;
