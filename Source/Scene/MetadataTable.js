import Check from "../Core/Check.js";
import clone from "../Core/clone.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import getStringFromTypedArray from "../Core/getStringFromTypedArray.js";
import RuntimeError from "../Core/RuntimeError.js";
import MetadataComponentType from "./MetadataComponentType.js";
import MetadataEntity from "./MetadataEntity.js";
import MetadataEnumType from "./MetadataEnumType.js";
import MetadataOffsetType from "./MetadataOffsetType.js";
import MetadataType from "./MetadataType.js";

function MetadataTableProperty(
  arrayOffsets,
  stringOffsets,
  values,
  classProperty
) {
  this.arrayOffsets = arrayOffsets;
  this.stringOffsets = stringOffsets;
  this.values = values;
  this.classProperty = classProperty;
  this.unpackedValues = undefined;
}

/**
 * A table containing binary metadata about a collection of entities.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.count The number of entities in the table.
 * @param {Object} options.properties A dictionary containing properties.
 * @param {MetadataClass} options.class The class that properties conforms to.
 * @param {Object} options.bufferViews An object mapping bufferView IDs to Uint8Array objects
 *
 * @alias MetadataTable
 * @constructor
 *
 * @private
 */
function MetadataTable(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("options.count", options.count);
  Check.typeOf.string("options.properties", options.properties);
  Check.typeOf.string("options.class", options.class);
  Check.typeOf.string("options.bufferViews", options.bufferViews);
  //>>includeEnd('debug');

  var properties = {};
  if (defined(options.properties)) {
    for (var propertyId in options.properties) {
      if (options.properties.hasOwnProperty(propertyId)) {
        properties[propertyId] = initializeProperty(
          options.count,
          options.properties[propertyId],
          options.class.properties[propertyId],
          options.bufferViews
        );
      }
    }
  }

  this._count = options.count;
  this._class = options.class;
  this._properties = properties;
}

Object.defineProperties(MetadataTable.prototype, {
  /**
   * The class that properties conforms to.
   *
   * @memberof MetadataTileset.prototype
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
   * @memberof MetadataTileset.prototype
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
 *
 * @param {Number} index The index of the entity.
 * @param {String} propertyId The case-sensitive ID of the property.
 * @returns {*} The value of the property or <code>undefined</code> if the property does not exist.
 */
MetadataTable.prototype.getProperty = function (index, propertyId) {
  var property = this._properties[propertyId];

  if (defined(property)) {
    if (requiresUnpackForGetter(property)) {
      unpackProperty(this, property);
    }

    if (defined(property.unpackedValues)) {
      return clone(property.unpackedValues[index], true);
    }

    var reader = getReader(property);

    var classProperty = property.classProperty;
    if (classProperty.type !== MetadataType.ARRAY) {
      return reader(index, property);
    }

    var i;
    var offset;
    var length;

    var componentCount = classProperty.componentCount;
    if (defined(componentCount)) {
      offset = index * componentCount;
      length = componentCount;
    } else {
      offset = property.arrayOffsets[index];
      length = property.arrayOffsets[index + 1] - offset;
    }

    var values = new Array(length);
    for (i = 0; i < length; ++i) {
      values[i] = reader(offset + i, property);
    }

    return values;
  }

  if (
    defined(this._class) &&
    defined(this._class.properties[propertyId]) &&
    defined(this._class.properties[propertyId].default)
  ) {
    return clone(this._class.properties[propertyId].default, true);
  }

  return undefined;
};

/**
 * Sets the value of the property with the given ID.
 *
 * @param {Number} index The index of the entity.
 * @param {String} propertyId The case-sensitive ID of the property.
 * @param {*} value The value of the property that will be copied.
 */
MetadataTable.prototype.setProperty = function (index, propertyId, value) {
  // TODO: out of bounds checking, type checking
  // TODO: Cesium3DTileBatchTable let you create new properties if propertyId doesn't exist, this does not
  var property = this._properties[propertyId];

  if (!defined(property)) {
    return;
  }

  if (requiresUnpackForSetter(index, property, value)) {
    unpackProperty(this, property);
  }

  if (defined(property.unpackedValues)) {
    property.unpackedValues[index] = clone(value, true);
    return;
  }

  // Unpacked values exist for strings and variable-size arrays where the length has changed
  // No need to handle these cases below

  var writer = getWriter(property);

  var classProperty = property.classProperty;
  if (classProperty.type !== MetadataType.ARRAY) {
    writer(index, property);
    return;
  }

  var i;
  var offset;
  var length;

  var componentCount = classProperty.componentCount;
  if (defined(componentCount)) {
    offset = index * componentCount;
    length = componentCount;
  } else {
    offset = property.arrayOffsets[index];
    length = property.arrayOffsets[index + 1] - offset;
  }

  for (i = 0; i < length; ++i) {
    writer(offset + i, value);
  }
};

/**
 * Returns a copy of the value of the property with the given semantic.
 *
 * @param {Number} index The index of the entity.
 * @param {String} semantic The case-sensitive semantic of the property.
 * @returns {*} The value of the property or <code>undefined</code> if the property does not exist.
 */
MetadataTable.prototype.getPropertyBySemantic = function (index, semantic) {
  var property = this._class.propertiesBySemantic[semantic];
  if (defined(property)) {
    return this.getProperty(index, property.id);
  }
  return undefined;
};

/**
 * Sets the value of the property with the given semantic.
 *
 * @param {Number} index The index of the entity.
 * @param {String} semantic The case-sensitive semantic of the property.
 * @param {*} value The value of the property that will be copied.
 */
MetadataTable.prototype.setPropertyBySemantic = function (
  index,
  semantic,
  value
) {
  var property = this._class.propertiesBySemantic[semantic];
  if (defined(property)) {
    this.setProperty(index, property.id, value);
  }
};

function getReader(property) {
  var classProperty = property.classProperty;
  if (
    classProperty.type === MetadataType.STRING ||
    classProperty.componentType === MetadataComponentType.STRING
  ) {
    return readString;
  } else if (
    classProperty.type === MetadataType.BOOLEAN ||
    classProperty.componentType === MetadataComponentType.BOOLEAN
  ) {
    return readBoolean;
  }
  return readValue;
}

function getWriter(property) {
  var classProperty = property.classProperty;
  if (
    classProperty.type === MetadataType.BOOLEAN ||
    classProperty.componentType === MetadataComponentType.BOOLEAN
  ) {
    return writeBoolean;
  }
  return writeValue;
}

function readString(index, property) {
  var stringByteOffset = property.stringOffsets[index];
  var stringByteLength = property.stringOffsets[index + 1] - stringByteOffset;
  return getStringFromTypedArray(
    property.values,
    stringByteOffset,
    stringByteLength
  );
}

function readBoolean(index, property) {
  // byteIndex is floor(index / 8)
  var byteIndex = index >> 3;
  var bitIndex = index % 8;
  return ((property.values[byteIndex] >> bitIndex) & 1) === 1;
}

function writeBoolean(index, property, value) {
  // byteIndex is floor(index / 8)
  var byteIndex = index >> 3;
  var bitIndex = index % 8;

  if (value) {
    property.values[byteIndex] |= 1 << bitIndex;
  } else {
    property.values[byteIndex] &= ~(1 << bitIndex);
  }
}

function readValue(index, property) {
  return property.values[index];
}

function writeValue(index, property, value) {
  property.values[index] = value;
}

function requiresUnpackForGetter(property) {
  if (defined(property.unpackedValues)) {
    return false;
  }

  var classProperty = property.classProperty;

  if (
    classProperty.type === MetadataType.STRING ||
    classProperty.componentType === MetadataComponentType.STRING
  ) {
    // Unpacking is required for strings since UTF-8 decoding is expensive
    return true;
  }

  return false;
}

function requiresUnpackForSetter(index, property, value) {
  if (defined(property.unpackedValues)) {
    return false;
  }

  var classProperty = property.classProperty;

  if (
    classProperty.type === MetadataType.STRING ||
    classProperty.componentType === MetadataComponentType.STRING
  ) {
    // Unpacking is required for strings since UTF-8 encoding is expensive
    // Also, if the new string has a greater length than the existing string
    // it would be expensive to repack the binary data
    return true;
  }

  if (
    classProperty.type === MetadataType.ARRAY &&
    !defined(classProperty.componentCount)
  ) {
    // Unpacking is required if a variable-size array changes length since it
    // would be expensive to repack the binary data
    var arrayOffsets = property.arrayOffsets;
    var oldLength = arrayOffsets[index + 1] - property.arrayOffsets[index];
    var newLength = value.length;
    if (oldLength !== newLength) {
      return true;
    }
  }

  return false;
}

function unpackValues(table, property) {
  var i;
  var count = table._count;
  var unpackedValues = new Array(count);

  var reader = getReader(property);

  var classProperty = property.classProperty;
  if (classProperty.type !== MetadataType.ARRAY) {
    for (i = 0; i < count; ++i) {
      unpackedValues[i] = reader(i, property);
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
        arrayValues[j] = reader(offset + j, property);
      }
    }
    return unpackedValues;
  }

  for (i = 0; i < count; ++i) {
    offset = property.arrayOffsets[i];
    var length = property.arrayOffsets[i + 1] - offset;
    arrayValues = new Array(length);
    for (j = 0; j < length; ++j) {
      arrayValues[j] = reader(offset + j, property);
    }
  }

  return unpackedValues;
}

function unpackProperty(table, property) {
  table.unpackedValues = unpackValues(table, property);
  table.arrayOffsets = undefined;
  table.stringOffsets = undefined;
  table.values = undefined;
}

function initializeProperty(count, property, classProperty, bufferViews) {
  // TODO: use BigUint64Array on platforms where it's supported
  if (property.offsetType === MetadataOffsetType.UINT64) {
    throw new RuntimeError("offsetType of UINT64 is not supported");
  }
  if (classProperty.enumType === MetadataEnumType.UINT64) {
    throw new RuntimeError("enumType of UINT64 is not supported");
  }
  if (classProperty.componentType === MetadataComponentType.UINT64) {
    throw new RuntimeError("componentType of UINT64 is not supported");
  }
  if (classProperty.type === MetadataType.UINT64) {
    throw new RuntimeError("type of UINT64 is not supported");
  }

  var i;

  var isArray = classProperty.type === MetadataType.ARRAY;
  var isVariableSizeArray = isArray && !defined(classProperty.componentCount);
  var hasStrings =
    classProperty.type === MetadataType.STRING ||
    classProperty.componentType === MetadataComponentType.STRING;
  var hasBooleans =
    classProperty.type === MetadataType.BOOLEAN ||
    classProperty.componentType === MetadataComponentType.BOOLEAN;

  var offsetType = defaultValue(
    MetadataOffsetType[property.offsetType],
    MetadataOffsetType.UINT32
  );
  var offsetComponentDatatype = MetadataOffsetType.getComponentDatatype(
    offsetType
  );

  var arrayOffsets;
  if (isVariableSizeArray) {
    arrayOffsets = ComponentDatatype.createArrayBufferView(
      offsetComponentDatatype,
      bufferViews[property.arrayOffsetBufferView].buffer,
      bufferViews[property.arrayOffsetBufferView].byteOffset,
      count + 1
    );
  }

  var componentCount;
  if (isVariableSizeArray) {
    componentCount = 0;
    for (i = 0; i < count; ++i) {
      componentCount += arrayOffsets[i + 1] - arrayOffsets[i];
    }
  } else if (isArray) {
    componentCount = count * classProperty.componentCount;
  } else {
    componentCount = count;
  }

  var stringOffsets;
  if (hasStrings) {
    stringOffsets = ComponentDatatype.createArrayBufferView(
      offsetComponentDatatype,
      bufferViews[property.stringOffsetBufferView].buffer,
      bufferViews[property.stringOffsetBufferView].byteOffset,
      componentCount + 1
    );
  }

  var componentDatatype;
  if (hasStrings || hasBooleans) {
    // STRING and BOOLEAN types need to be parsed differently than other types
    componentDatatype = ComponentDatatype.UNSIGNED_BYTE;
  } else {
    componentDatatype = MetadataType.getComponentDatatype(
      classProperty.type,
      classProperty.componentType,
      classProperty.enumType
    );
  }

  var typedArrayCount;
  if (hasStrings) {
    typedArrayCount = 0;
    for (i = 0; i < componentCount; ++i) {
      typedArrayCount += stringOffsets[i + 1] - stringOffsets[i];
    }
  } else if (hasBooleans) {
    typedArrayCount = Math.ceil(componentCount / 8);
  } else {
    typedArrayCount = componentCount;
  }

  var values = ComponentDatatype.createArrayBufferView(
    componentDatatype,
    bufferViews[property.bufferView].buffer,
    bufferViews[property.bufferView].byteOffset,
    typedArrayCount
  );

  return new MetadataTableProperty(
    arrayOffsets,
    stringOffsets,
    values,
    classProperty
  );
}

export default MetadataTable;
