import Check from "../Core/Check.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import FeatureDetection from "../Core/FeatureDetection.js";
import getStringFromTypedArray from "../Core/getStringFromTypedArray.js";
import oneTimeWarning from "../Core/oneTimeWarning.js";
import MetadataComponentType from "./MetadataComponentType.js";
import MetadataType from "./MetadataType.js";

/**
 * A binary property in a {@MetadataTable}
 * <p>
 * For 3D Tiles Next details, see the {@link https://github.com/CesiumGS/3d-tiles/tree/3d-tiles-next/extensions/3DTILES_metadata|3DTILES_metadata Extension} for 3D Tiles, as well as the {@link https://github.com/CesiumGS/glTF/tree/3d-tiles-next/extensions/2.0/Vendor/EXT_feature_metadata|EXT_feature_metadata Extension} for glTF.
 * </p>
 *
 * @param {Object} options Object with the following properties:
 * @param {Number} options.count The number of elements in each property array.
 * @param {Object} options.property The property JSON object.
 * @param {MetadataClassProperty} options.classProperty The class property.
 * @param {Object.<String, Uint8Array>} options.bufferViews An object mapping bufferView IDs to Uint8Array objects.
 *
 * @alias MetadataTableProperty
 * @constructor
 *
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
function MetadataTableProperty(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var count = options.count;
  var property = options.property;
  var classProperty = options.classProperty;
  var bufferViews = options.bufferViews;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number.greaterThan("options.count", count, 0);
  Check.typeOf.object("options.property", property);
  Check.typeOf.object("options.classProperty", classProperty);
  Check.typeOf.object("options.bufferViews", bufferViews);
  //>>includeEnd('debug');

  var type = classProperty.type;
  var isArray = type === MetadataType.ARRAY;
  var isVariableSizeArray = isArray && !defined(classProperty.componentCount);
  var isVectorOrMatrix =
    MetadataType.isVectorType(type) || MetadataType.isMatrixType(type);

  var valueType = classProperty.valueType;
  var enumType = classProperty.enumType;

  var hasStrings = valueType === MetadataComponentType.STRING;
  var hasBooleans = valueType === MetadataComponentType.BOOLEAN;

  var offsetType = defaultValue(
    MetadataComponentType[property.offsetType],
    MetadataComponentType.UINT32
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
    componentCount = arrayOffsets.get(count) - arrayOffsets.get(0);
  } else if (isArray || isVectorOrMatrix) {
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
    valueType = MetadataComponentType.UINT8;
  }

  var valueCount;
  if (hasStrings) {
    valueCount = stringOffsets.get(componentCount) - stringOffsets.get(0);
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

  var that = this;

  var getValueFunction;
  var setValueFunction;

  if (hasStrings) {
    getValueFunction = function (index) {
      return getString(index, that._values, that._stringOffsets);
    };
  } else if (hasBooleans) {
    getValueFunction = function (index) {
      return getBoolean(index, that._values);
    };
    setValueFunction = function (index, value) {
      setBoolean(index, that._values, value);
    };
  } else if (defined(enumType)) {
    getValueFunction = function (index) {
      var integer = that._values.get(index);
      return enumType.namesByValue[integer];
    };
    setValueFunction = function (index, value) {
      var integer = enumType.valuesByName[value];
      that._values.set(index, integer);
    };
  } else {
    getValueFunction = function (index) {
      return that._values.get(index);
    };
    setValueFunction = function (index, value) {
      that._values.set(index, value);
    };
  }

  this._arrayOffsets = arrayOffsets;
  this._stringOffsets = stringOffsets;
  this._values = values;
  this._classProperty = classProperty;
  this._count = count;
  this._getValue = getValueFunction;
  this._setValue = setValueFunction;
  this._unpackedValues = undefined;
  this._extras = property.extras;
  this._extensions = property.extensions;
}

Object.defineProperties(MetadataTableProperty.prototype, {
  /**
   * Extras in the JSON object.
   *
   * @memberof MetadataTableProperty.prototype
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
   * @memberof MetadataTableProperty.prototype
   * @type {*}
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
 * Returns a copy of the value at the given index.
 *
 * @param {Number} index The index.
 * @returns {*} The value of the property.
 *
 * @private
 */
MetadataTableProperty.prototype.get = function (index) {
  //>>includeStart('debug', pragmas.debug);
  checkIndex(this, index);
  //>>includeEnd('debug');

  var value = get(this, index);
  value = this._classProperty.normalize(value);
  return this._classProperty.unpackVectorAndMatrixTypes(value);
};

/**
 * Sets the value at the given index.
 *
 * @param {Number} index The index.
 * @param {*} value The value of the property.
 *
 * @private
 */
MetadataTableProperty.prototype.set = function (index, value) {
  var classProperty = this._classProperty;

  //>>includeStart('debug', pragmas.debug);
  checkIndex(this, index);
  var errorMessage = classProperty.validate(value);
  if (defined(errorMessage)) {
    throw new DeveloperError(errorMessage);
  }
  //>>includeEnd('debug');

  value = classProperty.packVectorAndMatrixTypes(value);
  value = classProperty.unnormalize(value);

  set(this, index, value);
};

/**
 * Returns a typed array containing the property values.
 *
 * @returns {*} The typed array containing the property values or <code>undefined</code> if the property values are not stored in a typed array.
 *
 * @private
 */
MetadataTableProperty.prototype.getTypedArray = function () {
  // Note: depending on the class definition some properties are unpacked to
  // JS arrays when first accessed and values will be undefined. Generally not
  // a concern for fixed-length arrays of numbers.
  if (defined(this._values)) {
    return this._values.typedArray;
  }

  return undefined;
};

function checkIndex(table, index) {
  var count = table._count;
  if (!defined(index) || index < 0 || index >= count) {
    var maximumIndex = count - 1;
    throw new DeveloperError(
      "index is required and between zero and count - 1. Actual value: " +
        maximumIndex
    );
  }
}

function get(property, index) {
  if (requiresUnpackForGet(property)) {
    unpackProperty(property);
  }

  var classProperty = property._classProperty;

  if (defined(property._unpackedValues)) {
    var value = property._unpackedValues[index];
    if (classProperty.type === MetadataType.ARRAY) {
      return value.slice(); // clone
    }
    return value;
  }

  var type = classProperty.type;
  var isArray = classProperty.type === MetadataType.ARRAY;
  var isVectorOrMatrix =
    MetadataType.isVectorType(type) || MetadataType.isMatrixType(type);
  if (!isArray && !isVectorOrMatrix) {
    return property._getValue(index);
  }

  var offset;
  var length;

  var componentCount = classProperty.componentCount;
  if (defined(componentCount)) {
    offset = index * componentCount;
    length = componentCount;
  } else {
    offset = property._arrayOffsets.get(index);
    length = property._arrayOffsets.get(index + 1) - offset;
  }

  var values = new Array(length);
  for (var i = 0; i < length; ++i) {
    values[i] = property._getValue(offset + i);
  }

  return values;
}

function set(property, index, value) {
  if (requiresUnpackForSet(property, index, value)) {
    unpackProperty(property);
  }

  var classProperty = property._classProperty;

  if (defined(property._unpackedValues)) {
    if (classProperty.type === MetadataType.ARRAY) {
      value = value.slice(); // clone
    }
    property._unpackedValues[index] = value;
    return;
  }

  // Values are unpacked if the length of a variable-size array changes or the
  // property has strings. No need to handle these cases below.

  var type = classProperty.type;
  var isArray = classProperty.type === MetadataType.ARRAY;
  var isVectorOrMatrix =
    MetadataType.isVectorType(type) || MetadataType.isMatrixType(type);
  if (!isArray && !isVectorOrMatrix) {
    property._setValue(index, value);
    return;
  }

  var offset;
  var length;

  var componentCount = classProperty.componentCount;
  if (defined(componentCount)) {
    offset = index * componentCount;
    length = componentCount;
  } else {
    offset = property._arrayOffsets.get(index);
    length = property._arrayOffsets.get(index + 1) - offset;
  }

  for (var i = 0; i < length; ++i) {
    property._setValue(offset + i, value[i]);
  }
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

function getComponentDatatype(componentType) {
  switch (componentType) {
    case MetadataComponentType.INT8:
      return ComponentDatatype.BYTE;
    case MetadataComponentType.UINT8:
      return ComponentDatatype.UNSIGNED_BYTE;
    case MetadataComponentType.INT16:
      return ComponentDatatype.SHORT;
    case MetadataComponentType.UINT16:
      return ComponentDatatype.UNSIGNED_SHORT;
    case MetadataComponentType.INT32:
      return ComponentDatatype.INT;
    case MetadataComponentType.UINT32:
      return ComponentDatatype.UNSIGNED_INT;
    case MetadataComponentType.FLOAT32:
      return ComponentDatatype.FLOAT;
    case MetadataComponentType.FLOAT64:
      return ComponentDatatype.DOUBLE;
  }
}

function requiresUnpackForGet(property) {
  if (defined(property._unpackedValues)) {
    return false;
  }

  var valueType = property._classProperty.valueType;

  if (valueType === MetadataComponentType.STRING) {
    // Unpack since UTF-8 decoding is expensive
    return true;
  }

  if (
    valueType === MetadataComponentType.INT64 &&
    !FeatureDetection.supportsBigInt64Array()
  ) {
    // Unpack since the fallback INT64 getters are expensive
    return true;
  }

  if (
    valueType === MetadataComponentType.UINT64 &&
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

  var arrayOffsets = property._arrayOffsets;
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
  property._unpackedValues = unpackValues(property);

  // Free memory
  property._arrayOffsets = undefined;
  property._stringOffsets = undefined;
  property._values = undefined;
}

function unpackValues(property) {
  var i;
  var count = property._count;
  var unpackedValues = new Array(count);

  var classProperty = property._classProperty;
  if (classProperty.type !== MetadataType.ARRAY) {
    for (i = 0; i < count; ++i) {
      unpackedValues[i] = property._getValue(i);
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
        arrayValues[j] = property._getValue(offset + j);
      }
    }
    return unpackedValues;
  }

  for (i = 0; i < count; ++i) {
    offset = property._arrayOffsets.get(i);
    var length = property._arrayOffsets.get(i + 1) - offset;
    arrayValues = new Array(length);
    unpackedValues[i] = arrayValues;
    for (j = 0; j < length; ++j) {
      arrayValues[j] = property._getValue(offset + j);
    }
  }

  return unpackedValues;
}

function BufferView(bufferView, componentType, length) {
  var that = this;

  var typedArray;
  var getFunction;
  var setFunction;

  if (componentType === MetadataComponentType.INT64) {
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
  } else if (componentType === MetadataComponentType.UINT64) {
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
    var componentDatatype = getComponentDatatype(componentType);
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

export default MetadataTableProperty;
