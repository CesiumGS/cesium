import Check from "../Core/Check.js";
import clone from "../Core/clone.js";
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
 * For 3D Tiles Next details, see the {@link https://github.com/CesiumGS/3d-tiles/tree/main/extensions/3DTILES_metadata|3DTILES_metadata Extension}
 * for 3D Tiles, as well as the {@link https://github.com/CesiumGS/glTF/tree/3d-tiles-next/extensions/2.0/Vendor/EXT_structural_metadata|EXT_structural_metadata Extension}
 * for glTF. For the legacy glTF extension, see {@link https://github.com/CesiumGS/glTF/tree/3d-tiles-next/extensions/2.0/Vendor/EXT_feature_metadata|EXT_feature_metadata Extension}
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
  const count = options.count;
  const property = options.property;
  const classProperty = options.classProperty;
  const bufferViews = options.bufferViews;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number.greaterThan("options.count", count, 0);
  Check.typeOf.object("options.property", property);
  Check.typeOf.object("options.classProperty", classProperty);
  Check.typeOf.object("options.bufferViews", bufferViews);
  //>>includeEnd('debug');

  const type = classProperty.type;
  const isArray = classProperty.isArray;
  const isVariableLengthArray = classProperty.isVariableLengthArray;

  let valueType = classProperty.valueType;
  const enumType = classProperty.enumType;

  const hasStrings = type === MetadataType.STRING;
  const hasBooleans = type === MetadataType.BOOLEAN;

  let arrayOffsets;
  if (isVariableLengthArray) {
    // EXT_structural_metadata uses arrayOffsetType.
    // EXT_feature_metadata uses offsetType for both arrays and strings
    let arrayOffsetType = defaultValue(
      property.arrayOffsetType,
      property.offsetType
    );
    arrayOffsetType = defaultValue(
      MetadataComponentType[arrayOffsetType],
      MetadataComponentType.UINT32
    );

    arrayOffsets = new BufferView(
      bufferViews[property.arrayOffsetBufferView],
      arrayOffsetType,
      count + 1
    );
  }

  const vectorComponentCount = MetadataType.getComponentCount(type);

  let arrayComponentCount;
  if (isVariableLengthArray) {
    arrayComponentCount = arrayOffsets.get(count) - arrayOffsets.get(0);
  } else if (isArray) {
    arrayComponentCount = count * classProperty.arrayLength;
  } else {
    arrayComponentCount = count;
  }

  const componentCount = vectorComponentCount * arrayComponentCount;

  let stringOffsets;
  if (hasStrings) {
    // EXT_structural_metadata uses stringOffsetType, EXT_feature_metadata uses offsetType for both arrays and strings
    let stringOffsetType = defaultValue(
      property.stringOffsetType,
      property.offsetType
    );
    stringOffsetType = defaultValue(
      MetadataComponentType[stringOffsetType],
      MetadataComponentType.UINT32
    );

    stringOffsets = new BufferView(
      bufferViews[property.stringOffsetBufferView],
      stringOffsetType,
      componentCount + 1
    );
  }

  if (hasStrings || hasBooleans) {
    // STRING and BOOLEAN types need to be parsed differently than other types
    valueType = MetadataComponentType.UINT8;
  }

  let valueCount;
  if (hasStrings) {
    valueCount = stringOffsets.get(componentCount) - stringOffsets.get(0);
  } else if (hasBooleans) {
    valueCount = Math.ceil(componentCount / 8);
  } else {
    valueCount = componentCount;
  }

  const values = new BufferView(
    bufferViews[property.bufferView],
    valueType,
    valueCount
  );

  const offset = property.offset;
  const scale = property.scale;

  let getValueFunction;
  let setValueFunction;
  const that = this;
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
      const integer = that._values.get(index);
      return enumType.namesByValue[integer];
    };
    setValueFunction = function (index, value) {
      const integer = enumType.valuesByName[value];
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
  this._vectorComponentCount = vectorComponentCount;
  this._min = property.min;
  this._max = property.max;
  this._offset = offset;
  this._scale = scale;
  this._hasRescaling = defined(offset) || defined(scale);
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

  let value = get(this, index);
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
  const classProperty = this._classProperty;

  //>>includeStart('debug', pragmas.debug);
  checkIndex(this, index);
  const errorMessage = classProperty.validate(value);
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
  const count = table._count;
  if (!defined(index) || index < 0 || index >= count) {
    const maximumIndex = count - 1;
    throw new DeveloperError(
      `index is required and between zero and count - 1. Actual value: ${maximumIndex}`
    );
  }
}

function get(property, index) {
  if (requiresUnpackForGet(property)) {
    unpackProperty(property);
  }

  const classProperty = property._classProperty;
  const isArray = classProperty.isArray;
  const type = classProperty.type;
  const componentCount = MetadataType.getComponentCount(type);

  if (defined(property._unpackedValues)) {
    const value = property._unpackedValues[index];
    if (isArray) {
      return clone(value, true);
    }
    return value;
  }

  // handle single values
  if (!isArray && componentCount === 1) {
    return property._getValue(index);
  }

  return getArrayValues(property, classProperty, index);
}

function getArrayValues(property, classProperty, index) {
  let offset;
  let length;
  if (classProperty.isVariableLengthArray) {
    offset = property._arrayOffsets.get(index);
    length = property._arrayOffsets.get(index + 1) - offset;

    // for vectors and matrices, the offset and length need to be multiplied
    // by the component count
    const componentCount = MetadataType.getComponentCount(classProperty.type);
    offset *= componentCount;
    length *= componentCount;
  } else {
    const arrayLength = defaultValue(classProperty.arrayLength, 1);
    const componentCount = arrayLength * property._vectorComponentCount;
    offset = index * componentCount;
    length = componentCount;
  }

  const values = new Array(length);
  for (let i = 0; i < length; i++) {
    values[i] = property._getValue(offset + i);
  }

  return values;
}

function set(property, index, value) {
  if (requiresUnpackForSet(property, index, value)) {
    unpackProperty(property);
  }

  const classProperty = property._classProperty;
  const isArray = classProperty.isArray;
  const type = classProperty.type;
  const componentCount = MetadataType.getComponentCount(type);

  if (defined(property._unpackedValues)) {
    if (classProperty.isArray) {
      value = clone(value, true);
    }
    property._unpackedValues[index] = value;
    return;
  }

  // Values are unpacked if the length of a variable-size array changes or the
  // property has strings. No need to handle these cases below.

  // Handle single values
  if (!isArray && componentCount === 1) {
    property._setValue(index, value);
    return;
  }

  let offset;
  let length;
  if (classProperty.isVariableLengthArray) {
    offset = property._arrayOffsets.get(index);
    length = property._arrayOffsets.get(index + 1) - offset;
  } else {
    const arrayLength = defaultValue(classProperty.arrayLength, 1);
    const componentCount = arrayLength * property._vectorComponentCount;
    offset = index * componentCount;
    length = componentCount;
  }

  for (let i = 0; i < length; ++i) {
    property._setValue(offset + i, value[i]);
  }
}

function getString(index, values, stringOffsets) {
  const stringByteOffset = stringOffsets.get(index);
  const stringByteLength = stringOffsets.get(index + 1) - stringByteOffset;
  return getStringFromTypedArray(
    values.typedArray,
    stringByteOffset,
    stringByteLength
  );
}

function getBoolean(index, values) {
  // byteIndex is floor(index / 8)
  const byteIndex = index >> 3;
  const bitIndex = index % 8;
  return ((values.typedArray[byteIndex] >> bitIndex) & 1) === 1;
}

function setBoolean(index, values, value) {
  // byteIndex is floor(index / 8)
  const byteIndex = index >> 3;
  const bitIndex = index % 8;

  if (value) {
    values.typedArray[byteIndex] |= 1 << bitIndex;
  } else {
    values.typedArray[byteIndex] &= ~(1 << bitIndex);
  }
}

function getInt64NumberFallback(index, values) {
  const dataView = values.dataView;
  const byteOffset = index * 8;
  let value = 0;
  const isNegative = (dataView.getUint8(byteOffset + 7) & 0x80) > 0;
  let carrying = true;
  for (let i = 0; i < 8; ++i) {
    let byte = dataView.getUint8(byteOffset + i);
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
  const dataView = values.dataView;
  const byteOffset = index * 8;
  // eslint-disable-next-line no-undef
  let value = BigInt(0);
  const isNegative = (dataView.getUint8(byteOffset + 7) & 0x80) > 0;
  let carrying = true;
  for (let i = 0; i < 8; ++i) {
    let byte = dataView.getUint8(byteOffset + i);
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
  const dataView = values.dataView;
  const byteOffset = index * 8;

  // Split 64-bit number into two 32-bit (4-byte) parts
  const left = dataView.getUint32(byteOffset, true);
  const right = dataView.getUint32(byteOffset + 4, true);

  // Combine the two 32-bit values
  const value = left + 4294967296 * right;

  return value;
}

function getUint64BigIntFallback(index, values) {
  const dataView = values.dataView;
  const byteOffset = index * 8;

  // Split 64-bit number into two 32-bit (4-byte) parts
  // eslint-disable-next-line no-undef
  const left = BigInt(dataView.getUint32(byteOffset, true));

  // eslint-disable-next-line no-undef
  const right = BigInt(dataView.getUint32(byteOffset + 4, true));

  // Combine the two 32-bit values
  // eslint-disable-next-line no-undef
  const value = left + BigInt(4294967296) * right;

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

  const classProperty = property._classProperty;
  const type = classProperty.type;
  const valueType = classProperty.valueType;

  if (type === MetadataType.STRING) {
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

  const arrayOffsets = property._arrayOffsets;
  if (defined(arrayOffsets)) {
    // Unpacking is required if a variable-size array changes length since it
    // would be expensive to repack the binary data
    const oldLength = arrayOffsets.get(index + 1) - arrayOffsets.get(index);
    const newLength = value.length;
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
  const count = property._count;
  const unpackedValues = new Array(count);

  const classProperty = property._classProperty;
  const isArray = classProperty.isArray;
  const type = classProperty.type;
  const componentCount = MetadataType.getComponentCount(type);

  // Handle single values
  if (!isArray && componentCount === 1) {
    for (let i = 0; i < count; ++i) {
      unpackedValues[i] = property._getValue(i);
    }
    return unpackedValues;
  }

  for (let i = 0; i < count; i++) {
    unpackedValues[i] = getArrayValues(property, classProperty, i);
  }
  return unpackedValues;
}

function BufferView(bufferView, componentType, length) {
  const that = this;

  let typedArray;
  let getFunction;
  let setFunction;

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
    const componentDatatype = getComponentDatatype(componentType);
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

  // for unit testing
  this._componentType = componentType;
}

export default MetadataTableProperty;
