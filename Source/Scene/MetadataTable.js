import Check from "../Core/Check.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import FeatureDetection from "../Core/FeatureDetection.js";
import getStringFromTypedArray from "../Core/getStringFromTypedArray.js";
import oneTimeWarning from "../Core/oneTimeWarning.js";
import MetadataEntity from "./MetadataEntity.js";
import MetadataType from "./MetadataType.js";

/**
 * A table containing binary metadata for a collection of entities.
 *
 * @param {Object} options Object with the following properties:
 * @param {Number} options.count The number of entities in the table.
 * @param {Object} [options.properties] A dictionary containing properties.
 * @param {MetadataClass} [options.class] The class that properties conform to.
 * @param {Object} [options.bufferViews] An object mapping bufferView IDs to Uint8Array objects.
 *
 * @alias MetadataTable
 * @constructor
 *
 * @private
 */
function MetadataTable(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var count = options.count;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number.greaterThan("options.count", count, 0);
  //>>includeEnd('debug');

  var properties = {};
  if (defined(options.properties)) {
    for (var propertyId in options.properties) {
      if (options.properties.hasOwnProperty(propertyId)) {
        properties[propertyId] = initializeProperty(
          count,
          options.properties[propertyId],
          options.class.properties[propertyId],
          options.bufferViews
        );
      }
    }
  }

  this._count = count;
  this._class = options.class;
  this._properties = properties;
}

Object.defineProperties(MetadataTable.prototype, {
  /**
   * The number of entities in the table.
   *
   * @memberof MetadataTable.prototype
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
   * The class that properties conform to.
   *
   * @memberof MetadataTable.prototype
   * @type {MetadataClass}
   * @readonly
   * @private
   */
  class: {
    get: function () {
      return this._class;
    },
  },

  /**
   * A dictionary containing properties.
   *
   * @memberof MetadataTable.prototype
   * @type {Object}
   * @readonly
   * @private
   */
  properties: {
    get: function () {
      return this._properties;
    },
  },
});

/**
 * Returns whether this property exists.
 *
 * @param {String} propertyId The case-sensitive ID of the property.
 * @returns {Boolean} Whether this property exists.
 */
MetadataTable.prototype.hasProperty = function (propertyId) {
  return MetadataEntity.hasProperty(this, propertyId);
};

/**
 * Returns an array of property IDs.
 *
 * @param {String[]} [results] An array into which to store the results.
 * @returns {String[]} The property IDs.
 */
MetadataTable.prototype.getPropertyIds = function (results) {
  return MetadataEntity.getPropertyIds(this, results);
};

/**
 * Returns a copy of the value of the property with the given ID.
 * <p>
 * If the property is an enum the name of the enum is returned.
 * </p>
 * <p>
 * If the property is normalized the normalized value is returned. The value is
 * in the range [-1.0, 1.0] for signed integer types and [0.0, 1.0] for unsigned
 * integer types.
 * </p>
 * <p>
 * If the property is not normalized and type or componentType is INT64 or
 * UINT64 a BigInt will be returned. On platforms that don't support BigInt a
 * number will be returned instead. Note that numbers only support up to 52 bits
 * of integer precision. Values greater than 2^53 - 1 or less than -(2^53 - 1)
 * may lose precision when read.
 * </p>
 * <p>
 * If type or componentType is FLOAT32 there may also be precision
 * loss as FLOAT32 values are converted to 64-bit JavaScript numbers.
 * </p>
 *
 * @param {Number} index The index of the entity.
 * @param {String} propertyId The case-sensitive ID of the property.
 * @returns {*} The value of the property or <code>undefined</code> if the property does not exist.
 *
 * @exception {DeveloperError} index is required and between zero and count - 1
 */
MetadataTable.prototype.getProperty = function (index, propertyId) {
  //>>includeStart('debug', pragmas.debug);
  checkIndex(this, index);
  Check.typeOf.string("propertyId", propertyId);
  //>>includeEnd('debug');

  var value;

  var property = this._properties[propertyId];
  if (defined(property)) {
    value = property.get(index);
  } else {
    value = getDefault(this._class, propertyId);
  }

  if (!defined(value)) {
    return undefined;
  }

  return MetadataEntity.normalize(this._class, propertyId, value);
};

/**
 * Sets the value of the property with the given ID.
 * <p>
 * If the property is an enum the name of the enum must be provided, not the
 * integer value.
 * </p>
 * <p>
 * If the property is normalized a normalized value must be provided to this
 * function. The value must be in the range [-1.0, 1.0] for signed integer
 * types and [0.0, 1.0] for unsigned integer types.
 * </p>
 * <p>
 * If the property is not normalized and type or componentType is INT64 or
 * UINT64 a BigInt may be provided. On platforms that don't support BigInt a
 * number may be provided instead. Note that numbers only support up to 52 bits
 * of integer precision. Values greater than 2^53 - 1 or less than -(2^53 - 1)
 * may lose precision when set."
 * </p>
 *
 * @param {Number} index The index of the entity.
 * @param {String} propertyId The case-sensitive ID of the property.
 * @param {*} value The value of the property that will be copied.
 *
 * @exception {DeveloperError} index is required and between zero and count - 1
 * @exception {DeveloperError} value does not match type
 * @exception {DeveloperError} value is out of range for type
 * @exception {DeveloperError} Array length does not match componentCount
 */
MetadataTable.prototype.setProperty = function (index, propertyId, value) {
  //>>includeStart('debug', pragmas.debug);
  checkIndex(this, index);
  Check.typeOf.string("propertyId", propertyId);
  //>>includeEnd('debug');

  var property = this._properties[propertyId];

  if (!defined(property)) {
    return;
  }

  //>>includeStart('debug', pragmas.debug);
  checkType(value, property.classProperty);
  //>>includeEnd('debug');

  value = MetadataEntity.unnormalize(this._class, propertyId, value);

  property.set(index, value);
};

/**
 * Returns a copy of the value of the property with the given semantic.
 *
 * @param {Number} index The index of the entity.
 * @param {String} semantic The case-sensitive semantic of the property.
 * @returns {*} The value of the property or <code>undefined</code> if the property does not exist.
 *
 * @exception {DeveloperError} index is required and between zero and count - 1
 */
MetadataTable.prototype.getPropertyBySemantic = function (index, semantic) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("semantic", semantic);
  //>>includeEnd('debug');

  if (defined(this._class)) {
    var property = this._class.propertiesBySemantic[semantic];
    if (defined(property)) {
      return this.getProperty(index, property.id);
    }
  }
  return undefined;
};

/**
 * Sets the value of the property with the given semantic.
 *
 * @param {Number} index The index of the entity.
 * @param {String} semantic The case-sensitive semantic of the property.
 * @param {*} value The value of the property that will be copied.
 *
 * @exception {DeveloperError} index is required and between zero and count - 1
 * @exception {DeveloperError} value does not match type
 * @exception {DeveloperError} value is out of range for type
 * @exception {DeveloperError} Array length does not match componentCount
 */
MetadataTable.prototype.setPropertyBySemantic = function (
  index,
  semantic,
  value
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("semantic", semantic);
  //>>includeEnd('debug');

  if (defined(this._class)) {
    var property = this._class.propertiesBySemantic[semantic];
    if (defined(property)) {
      this.setProperty(index, property.id, value);
    }
  }
};

function getDefault(classDefinition, propertyId) {
  if (defined(classDefinition)) {
    var classProperty = classDefinition.properties[propertyId];
    if (defined(classProperty) && defined(classProperty.default)) {
      if (classProperty.type === MetadataType.ARRAY) {
        return classProperty.default.slice(); // clone
      }
      return classProperty.default;
    }
  }
}

function throwTypeError(value, type) {
  throw new DeveloperError("value " + value + " does not match type " + type);
}

function throwOutOfRangeError(value, type, normalized) {
  var errorMessage = "value " + value + " is out of range for type " + type;
  if (normalized) {
    errorMessage += " (normalized)";
  }
  throw new DeveloperError(errorMessage);
}

function checkInRange(value, type, normalized) {
  if (normalized) {
    var min = MetadataType.isUnsignedIntegerType(type) ? 0.0 : -1.0;
    var max = 1.0;
    if (value < min || value > max) {
      throwOutOfRangeError(value, type, normalized);
    }
    return;
  }

  if (
    value < MetadataType.getMinimum(type) ||
    value > MetadataType.getMaximum(type)
  ) {
    throwOutOfRangeError(value, type, normalized);
  }
}

function checkValue(value, classProperty) {
  var javascriptType = typeof value;

  var enumType = classProperty.enumType;
  if (defined(enumType)) {
    if (javascriptType !== "string" || !defined(enumType.valuesByName[value])) {
      throw new DeveloperError(
        "value " + value + " is not a valid enum name for " + enumType.id
      );
    }
    return;
  }

  var valueType = classProperty.valueType;
  var normalized = classProperty.normalized;

  switch (valueType) {
    case MetadataType.INT8:
    case MetadataType.UINT8:
    case MetadataType.INT16:
    case MetadataType.UINT16:
    case MetadataType.INT32:
    case MetadataType.UINT32:
      if (javascriptType !== "number") {
        throwTypeError(value, valueType);
      }
      checkInRange(value, valueType, normalized);
      break;
    case MetadataType.INT64:
    case MetadataType.UINT64:
      if (javascriptType !== "number" && javascriptType !== "bigint") {
        throwTypeError(value, valueType);
      }
      checkInRange(value, valueType, normalized);
      break;
    case MetadataType.FLOAT32:
      if (javascriptType !== "number") {
        throwTypeError(value, valueType);
      }
      if (isFinite(value)) {
        checkInRange(value, valueType, normalized);
      }
      break;
    case MetadataType.FLOAT64:
      if (javascriptType !== "number") {
        throwTypeError(value, valueType);
      }
      break;
    case MetadataType.BOOLEAN:
      if (javascriptType !== "boolean") {
        throwTypeError(value, valueType);
      }
      break;
    case MetadataType.STRING:
      if (javascriptType !== "string") {
        throwTypeError(value, valueType);
      }
      break;
  }
}

function checkType(value, classProperty) {
  if (classProperty.type === MetadataType.ARRAY) {
    if (!Array.isArray(value)) {
      throwTypeError(value, classProperty.type);
    }
    var length = value.length;
    if (
      defined(classProperty.componentCount) &&
      classProperty.componentCount !== length
    ) {
      throw new DeveloperError("Array length does not match componentCount");
    }
    for (var i = 0; i < length; ++i) {
      checkValue(value[i], classProperty);
    }
  } else {
    checkValue(value, classProperty);
  }
}

function checkIndex(table, index) {
  var count = table._count;
  if (!defined(index) || index < 0 || index >= count) {
    var maximumIndex = count - 1;
    throw new DeveloperError(
      "index is required and between zero and count - 1 (" + maximumIndex + ")."
    );
  }
}

function initializeProperty(count, property, classProperty, bufferViews) {
  var i;

  var isArray = classProperty.type === MetadataType.ARRAY;
  var isVariableSizeArray = isArray && !defined(classProperty.componentCount);

  var valueType = classProperty.valueType;

  var hasStrings = valueType === MetadataType.STRING;
  var hasBooleans = valueType === MetadataType.BOOLEAN;

  var offsetType = defaultValue(
    MetadataType[property.offsetType],
    MetadataType.UINT32
  );

  var arrayOffsets;
  if (isVariableSizeArray) {
    arrayOffsets = new BufferView(
      bufferViews[property.arrayOffsetBufferView],
      offsetType,
      count + 1
    );
  }

  var componentCount;
  if (isVariableSizeArray) {
    componentCount = 0;
    for (i = 0; i < count; ++i) {
      componentCount += arrayOffsets.get(i + 1) - arrayOffsets.get(i);
    }
  } else if (isArray) {
    componentCount = count * classProperty.componentCount;
  } else {
    componentCount = count;
  }

  var stringOffsets;
  if (hasStrings) {
    stringOffsets = new BufferView(
      bufferViews[property.stringOffsetBufferView],
      offsetType,
      componentCount + 1
    );
  }

  if (hasStrings || hasBooleans) {
    // STRING and BOOLEAN types need to be parsed differently than other types
    valueType = MetadataType.UINT8;
  }

  var valueCount;
  if (hasStrings) {
    valueCount = 0;
    for (i = 0; i < componentCount; ++i) {
      valueCount += stringOffsets.get(i + 1) - stringOffsets.get(i);
    }
  } else if (hasBooleans) {
    valueCount = Math.ceil(componentCount / 8);
  } else {
    valueCount = componentCount;
  }

  var values = new BufferView(
    bufferViews[property.bufferView],
    valueType,
    valueCount
  );

  return new MetadataTableProperty(
    arrayOffsets,
    stringOffsets,
    values,
    classProperty,
    count
  );
}

function getString(index, values, stringOffsets) {
  var stringByteOffset = stringOffsets.get(index);
  var stringByteLength = stringOffsets.get(index + 1) - stringByteOffset;
  return getStringFromTypedArray(
    values.typedArray,
    stringByteOffset,
    stringByteLength
  );
}

function getBoolean(index, values) {
  // byteIndex is floor(index / 8)
  var byteIndex = index >> 3;
  var bitIndex = index % 8;
  return ((values.typedArray[byteIndex] >> bitIndex) & 1) === 1;
}

function setBoolean(index, values, value) {
  // byteIndex is floor(index / 8)
  var byteIndex = index >> 3;
  var bitIndex = index % 8;

  if (value) {
    values.typedArray[byteIndex] |= 1 << bitIndex;
  } else {
    values.typedArray[byteIndex] &= ~(1 << bitIndex);
  }
}

function getInt64NumberFallback(index, values) {
  var dataView = values.dataView;
  var byteOffset = index * 8;
  var value = 0;
  var isNegative = (dataView.getUint8(byteOffset + 7) & 0x80) > 0;
  var carrying = true;
  for (var i = 0; i < 8; ++i) {
    var byte = dataView.getUint8(byteOffset + i);
    if (isNegative) {
      if (carrying) {
        if (byte !== 0x00) {
          byte = ~(byte - 1) & 0xff;
          carrying = false;
        }
      } else {
        byte = ~byte & 0xff;
      }
    }
    value += byte * Math.pow(256, i);
  }
  if (isNegative) {
    value = -value;
  }
  return value;
}

function getInt64BigIntFallback(index, values) {
  var dataView = values.dataView;
  var byteOffset = index * 8;
  var value = BigInt(0); // eslint-disable-line
  var isNegative = (dataView.getUint8(byteOffset + 7) & 0x80) > 0;
  var carrying = true;
  for (var i = 0; i < 8; ++i) {
    var byte = dataView.getUint8(byteOffset + i);
    if (isNegative) {
      if (carrying) {
        if (byte !== 0x00) {
          byte = ~(byte - 1) & 0xff;
          carrying = false;
        }
      } else {
        byte = ~byte & 0xff;
      }
    }
    value += BigInt(byte) * (BigInt(1) << BigInt(i * 8)); // eslint-disable-line
  }
  if (isNegative) {
    value = -value;
  }
  return value;
}

function getUint64NumberFallback(index, values) {
  var dataView = values.dataView;
  var byteOffset = index * 8;

  // Split 64-bit number into two 32-bit (4-byte) parts
  var left = dataView.getUint32(byteOffset, true);
  var right = dataView.getUint32(byteOffset + 4, true);

  // Combine the two 32-bit values
  var value = left + 4294967296 * right;

  return value;
}

function getUint64BigIntFallback(index, values) {
  var dataView = values.dataView;
  var byteOffset = index * 8;

  // Split 64-bit number into two 32-bit (4-byte) parts
  var left = BigInt(dataView.getUint32(byteOffset, true)); // eslint-disable-line
  var right = BigInt(dataView.getUint32(byteOffset + 4, true)); // eslint-disable-line

  // Combine the two 32-bit values
  var value = left + BigInt(4294967296) * right; // eslint-disable-line

  return value;
}

function getComponentDatatype(type) {
  switch (type) {
    case MetadataType.INT8:
      return ComponentDatatype.BYTE;
    case MetadataType.UINT8:
      return ComponentDatatype.UNSIGNED_BYTE;
    case MetadataType.INT16:
      return ComponentDatatype.SHORT;
    case MetadataType.UINT16:
      return ComponentDatatype.UNSIGNED_SHORT;
    case MetadataType.INT32:
      return ComponentDatatype.INT;
    case MetadataType.UINT32:
      return ComponentDatatype.UNSIGNED_INT;
    case MetadataType.FLOAT32:
      return ComponentDatatype.FLOAT;
    case MetadataType.FLOAT64:
      return ComponentDatatype.DOUBLE;
  }
}

function BufferView(bufferView, type, length) {
  var that = this;

  var typedArray;
  var getFunction;
  var setFunction;

  if (type === MetadataType.INT64) {
    if (!FeatureDetection.supportsBigInt()) {
      oneTimeWarning(
        "INT64 type is not fully supported on this platform. Values greater than 2^53 - 1 or less than -(2^53 - 1) may lose precision when read."
      );
      typedArray = new Uint8Array(
        bufferView.buffer,
        bufferView.byteOffset,
        length * 8
      );
      getFunction = function (index) {
        return getInt64NumberFallback(index, that);
      };
    } else if (!FeatureDetection.supportsBigInt64Array()) {
      typedArray = new Uint8Array(
        bufferView.buffer,
        bufferView.byteOffset,
        length * 8
      );
      getFunction = function (index) {
        return getInt64BigIntFallback(index, that);
      };
    } else {
      // eslint-disable-next-line
      typedArray = new BigInt64Array(
        bufferView.buffer,
        bufferView.byteOffset,
        length
      );
      setFunction = function (index, value) {
        // Convert the number to a BigInt before setting the value in the typed array
        that.typedArray[index] = BigInt(value); // eslint-disable-line
      };
    }
  } else if (type === MetadataType.UINT64) {
    if (!FeatureDetection.supportsBigInt()) {
      oneTimeWarning(
        "UINT64 type is not fully supported on this platform. Values greater than 2^53 - 1 may lose precision when read."
      );
      typedArray = new Uint8Array(
        bufferView.buffer,
        bufferView.byteOffset,
        length * 8
      );
      getFunction = function (index) {
        return getUint64NumberFallback(index, that);
      };
    } else if (!FeatureDetection.supportsBigUint64Array()) {
      typedArray = new Uint8Array(
        bufferView.buffer,
        bufferView.byteOffset,
        length * 8
      );
      getFunction = function (index) {
        return getUint64BigIntFallback(index, that);
      };
    } else {
      // eslint-disable-next-line
      typedArray = new BigUint64Array(
        bufferView.buffer,
        bufferView.byteOffset,
        length
      );
      setFunction = function (index, value) {
        // Convert the number to a BigInt before setting the value in the typed array
        that.typedArray[index] = BigInt(value); // eslint-disable-line
      };
    }
  } else {
    var componentDatatype = getComponentDatatype(type);
    typedArray = ComponentDatatype.createArrayBufferView(
      componentDatatype,
      bufferView.buffer,
      bufferView.byteOffset,
      length
    );
    setFunction = function (index, value) {
      that.typedArray[index] = value;
    };
  }

  if (!defined(getFunction)) {
    getFunction = function (index) {
      return that.typedArray[index];
    };
  }

  this.typedArray = typedArray;
  this.dataView = new DataView(typedArray.buffer, typedArray.byteOffset);
  this.get = getFunction;
  this.set = setFunction;
}

function MetadataTableProperty(
  arrayOffsets,
  stringOffsets,
  values,
  classProperty,
  count
) {
  var that = this;

  var getValueFunction;
  var setValueFunction;

  var valueType = classProperty.valueType;
  var enumType = classProperty.enumType;

  if (valueType === MetadataType.STRING) {
    getValueFunction = function (index) {
      return getString(index, that.values, that.stringOffsets);
    };
  } else if (valueType === MetadataType.BOOLEAN) {
    getValueFunction = function (index) {
      return getBoolean(index, that.values);
    };
    setValueFunction = function (index, value) {
      setBoolean(index, that.values, value);
    };
  } else if (defined(enumType)) {
    getValueFunction = function (index) {
      var integer = that.values.get(index);
      return enumType.namesByValue[integer];
    };
    setValueFunction = function (index, value) {
      var integer = enumType.valuesByName[value];
      that.values.set(index, integer);
    };
  } else {
    getValueFunction = function (index) {
      return that.values.get(index);
    };
    setValueFunction = function (index, value) {
      that.values.set(index, value);
    };
  }

  this.arrayOffsets = arrayOffsets;
  this.stringOffsets = stringOffsets;
  this.values = values;
  this.classProperty = classProperty;
  this.count = count;
  this.getValue = getValueFunction;
  this.setValue = setValueFunction;
  this.unpackedValues = undefined;
}

MetadataTableProperty.prototype.get = function (index) {
  if (requiresUnpackForGet(this)) {
    unpackProperty(this);
  }

  var classProperty = this.classProperty;

  if (defined(this.unpackedValues)) {
    var value = this.unpackedValues[index];
    if (classProperty.type === MetadataType.ARRAY) {
      return value.slice(); // clone
    }
    return value;
  }

  if (classProperty.type !== MetadataType.ARRAY) {
    return this.getValue(index);
  }

  var offset;
  var length;

  var componentCount = classProperty.componentCount;
  if (defined(componentCount)) {
    offset = index * componentCount;
    length = componentCount;
  } else {
    offset = this.arrayOffsets.get(index);
    length = this.arrayOffsets.get(index + 1) - offset;
  }

  var values = new Array(length);
  for (var i = 0; i < length; ++i) {
    values[i] = this.getValue(offset + i);
  }

  return values;
};

MetadataTableProperty.prototype.set = function (index, value) {
  if (requiresUnpackForSet(this, index, value)) {
    unpackProperty(this);
  }

  var classProperty = this.classProperty;

  if (defined(this.unpackedValues)) {
    if (classProperty.type === MetadataType.ARRAY) {
      value = value.slice(); // clone
    }
    this.unpackedValues[index] = value;
    return;
  }

  // Values are unpacked if the length of a variable-size array changes or the
  // property has strings. No need to handle these cases below.

  if (classProperty.type !== MetadataType.ARRAY) {
    this.setValue(index, value);
    return;
  }

  var offset;
  var length;

  var componentCount = classProperty.componentCount;
  if (defined(componentCount)) {
    offset = index * componentCount;
    length = componentCount;
  } else {
    offset = this.arrayOffsets.get(index);
    length = this.arrayOffsets.get(index + 1) - offset;
  }

  for (var i = 0; i < length; ++i) {
    this.setValue(offset + i, value[i]);
  }
};

function requiresUnpackForGet(property) {
  if (defined(property.unpackedValues)) {
    return false;
  }

  var valueType = property.classProperty.valueType;

  if (valueType === MetadataType.STRING) {
    // Unpack since UTF-8 decoding is expensive
    return true;
  }

  if (
    valueType === MetadataType.INT64 &&
    !FeatureDetection.supportsBigInt64Array()
  ) {
    // Unpack since the fallback INT64 getters are expensive
    return true;
  }

  if (
    valueType === MetadataType.UINT64 &&
    !FeatureDetection.supportsBigUint64Array()
  ) {
    // Unpack since the fallback UINT64 getters are expensive
    return true;
  }

  return false;
}

function requiresUnpackForSet(property, index, value) {
  if (requiresUnpackForGet(property)) {
    return true;
  }

  var arrayOffsets = property.arrayOffsets;
  if (defined(arrayOffsets)) {
    // Unpacking is required if a variable-size array changes length since it
    // would be expensive to repack the binary data
    var oldLength = arrayOffsets.get(index + 1) - arrayOffsets.get(index);
    var newLength = value.length;
    if (oldLength !== newLength) {
      return true;
    }
  }

  return false;
}

function unpackProperty(property) {
  property.unpackedValues = unpackValues(property);

  // Free memory
  property.arrayOffsets = undefined;
  property.stringOffsets = undefined;
  property.values = undefined;
}

function unpackValues(property) {
  var i;
  var count = property.count;
  var unpackedValues = new Array(count);

  var classProperty = property.classProperty;
  if (classProperty.type !== MetadataType.ARRAY) {
    for (i = 0; i < count; ++i) {
      unpackedValues[i] = property.getValue(i);
    }
    return unpackedValues;
  }

  var j;
  var offset;
  var arrayValues;

  var componentCount = classProperty.componentCount;
  if (defined(componentCount)) {
    for (i = 0; i < count; ++i) {
      arrayValues = new Array(componentCount);
      unpackedValues[i] = arrayValues;
      offset = i * componentCount;
      for (j = 0; j < componentCount; ++j) {
        arrayValues[j] = property.getValue(offset + j);
      }
    }
    return unpackedValues;
  }

  for (i = 0; i < count; ++i) {
    offset = property.arrayOffsets.get(i);
    var length = property.arrayOffsets.get(i + 1) - offset;
    arrayValues = new Array(length);
    unpackedValues[i] = arrayValues;
    for (j = 0; j < length; ++j) {
      arrayValues[j] = property.getValue(offset + j);
    }
  }

  return unpackedValues;
}

export default MetadataTable;
