import {
  defined,
  defaultValue,
  DeveloperError,
  FeatureDetection,
  PropertyTable,
  MetadataClass,
  MetadataComponentType,
  MetadataEnum,
  MetadataTable,
  MetadataType,
} from "../Source/Cesium.js";

function MetadataTester() {}

MetadataTester.isSupported = function () {
  return (
    FeatureDetection.supportsBigInt64Array() &&
    FeatureDetection.supportsBigUint64Array() &&
    FeatureDetection.supportsBigInt() &&
    typeof TextEncoder !== "undefined"
  );
};

MetadataTester.createProperty = function (options) {
  const properties = {
    propertyId: options.property,
  };
  const propertyValues = {
    propertyId: options.values,
  };

  const table = MetadataTester.createMetadataTable({
    properties: properties,
    propertyValues: propertyValues,
    // offsetType is for legacy EXT_feature_metadata, arrayOffsetType and
    // stringOffsetType are for EXT_structural_metadata
    offsetType: options.offsetType,
    arrayOffsetType: options.arrayOffsetType,
    stringOffsetType: options.stringOffsetType,
    enums: options.enums,
    disableBigIntSupport: options.disableBigIntSupport,
    disableBigInt64ArraySupport: options.disableBigInt64ArraySupport,
    disableBigUint64ArraySupport: options.disableBigUint64ArraySupport,
  });

  return table._properties.propertyId;
};

function createProperties(options) {
  const schema = options.schema;
  const classId = options.classId;
  const propertyValues = options.propertyValues;
  const offsetType = options.offsetType;
  const stringOffsetType = options.stringOffsetType;
  const arrayOffsetType = options.arrayOffsetType;
  const bufferViews = defined(options.bufferViews) ? options.bufferViews : {};

  const enums = defined(schema.enums) ? schema.enums : {};
  const enumDefinitions = {};
  for (const enumId in enums) {
    if (enums.hasOwnProperty(enumId)) {
      enumDefinitions[enumId] = new MetadataEnum({
        id: enumId,
        enum: enums[enumId],
      });
    }
  }

  const classDefinition = new MetadataClass({
    id: classId,
    class: schema.classes[classId],
    enums: enumDefinitions,
  });

  const properties = {};
  let bufferViewIndex = Object.keys(bufferViews).length;
  let count = 0;

  for (const propertyId in propertyValues) {
    if (propertyValues.hasOwnProperty(propertyId)) {
      const classProperty = classDefinition.properties[propertyId];
      const values = propertyValues[propertyId];
      count = values.length;

      const valuesBuffer = addPadding(
        createValuesBuffer(values, classProperty)
      );
      const valuesBufferView = bufferViewIndex++;
      bufferViews[valuesBufferView] = valuesBuffer;

      const property = {
        values: valuesBufferView,
      };

      properties[propertyId] = property;

      // for legacy EXT_feature_metadata
      if (defined(offsetType)) {
        property.offsetType = offsetType;
      }

      if (defined(stringOffsetType)) {
        property.stringOffsetType = stringOffsetType;
      }

      if (defined(arrayOffsetType)) {
        property.arrayOffsetType = arrayOffsetType;
      }

      if (classProperty.isVariableLengthArray) {
        const arrayOffsetBufferType = defaultValue(arrayOffsetType, offsetType);
        const arrayOffsetBuffer = addPadding(
          createArrayOffsetBuffer(
            values,
            classProperty.type,
            arrayOffsetBufferType
          )
        );
        const arrayOffsetBufferView = bufferViewIndex++;
        bufferViews[arrayOffsetBufferView] = arrayOffsetBuffer;
        property.arrayOffsets = arrayOffsetBufferView;
      }

      if (classProperty.type === MetadataType.STRING) {
        const stringOffsetBufferType = defaultValue(
          stringOffsetType,
          offsetType
        );
        const stringOffsetBuffer = addPadding(
          createStringOffsetBuffer(values, stringOffsetBufferType)
        );
        const stringOffsetBufferView = bufferViewIndex++;
        bufferViews[stringOffsetBufferView] = stringOffsetBuffer;
        property.stringOffsets = stringOffsetBufferView;
      }
    }
  }

  return {
    count: count,
    properties: properties,
    class: classDefinition,
    bufferViews: bufferViews,
  };
}

MetadataTester.createMetadataTable = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const disableBigIntSupport = options.disableBigIntSupport;
  const disableBigInt64ArraySupport = options.disableBigInt64ArraySupport;
  const disableBigUint64ArraySupport = options.disableBigUint64ArraySupport;

  const schema = {
    enums: options.enums,
    classes: {
      classId: {
        properties: options.properties,
      },
    },
  };

  const propertyResults = createProperties({
    schema: schema,
    classId: "classId",
    propertyValues: options.propertyValues,
    offsetType: options.offsetType,
  });

  const count = propertyResults.count;
  const properties = propertyResults.properties;
  const classDefinition = propertyResults.class;
  const bufferViews = propertyResults.bufferViews;

  if (disableBigIntSupport) {
    spyOn(FeatureDetection, "supportsBigInt").and.returnValue(false);
  }

  if (disableBigInt64ArraySupport) {
    spyOn(FeatureDetection, "supportsBigInt64Array").and.returnValue(false);
  }

  if (disableBigUint64ArraySupport) {
    spyOn(FeatureDetection, "supportsBigUint64Array").and.returnValue(false);
  }

  return new MetadataTable({
    count: count,
    properties: properties,
    class: classDefinition,
    bufferViews: bufferViews,
  });
};

MetadataTester.createPropertyTable = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const disableBigIntSupport = options.disableBigIntSupport;
  const disableBigInt64ArraySupport = options.disableBigInt64ArraySupport;
  const disableBigUint64ArraySupport = options.disableBigUint64ArraySupport;

  const schema = {
    enums: options.enums,
    classes: {
      classId: {
        properties: options.properties,
      },
    },
  };

  const propertyResults = createProperties({
    schema: schema,
    classId: "classId",
    propertyValues: options.propertyValues,
    offsetType: options.offsetType,
  });

  const count = propertyResults.count;
  const properties = propertyResults.properties;
  const classDefinition = propertyResults.class;
  const bufferViews = propertyResults.bufferViews;

  if (disableBigIntSupport) {
    spyOn(FeatureDetection, "supportsBigInt").and.returnValue(false);
  }

  if (disableBigInt64ArraySupport) {
    spyOn(FeatureDetection, "supportsBigInt64Array").and.returnValue(false);
  }

  if (disableBigUint64ArraySupport) {
    spyOn(FeatureDetection, "supportsBigUint64Array").and.returnValue(false);
  }

  const metadataTable = new MetadataTable({
    count: count,
    class: classDefinition,
    bufferViews: bufferViews,
    properties: properties,
  });

  return new PropertyTable({
    metadataTable: metadataTable,
    count: count,
    extras: options.extras,
    extensions: options.extensions,
  });
};

// for EXT_structural_metadata
MetadataTester.createPropertyTables = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  const propertyTables = [];
  const bufferViews = {};

  for (let i = 0; i < options.propertyTables.length; i++) {
    const propertyTable = options.propertyTables[i];
    const tablePropertyResults = createProperties({
      schema: options.schema,
      classId: propertyTable.class,
      propertyValues: propertyTable.properties,
      bufferViews: bufferViews,
    });

    const count = tablePropertyResults.count;
    const properties = tablePropertyResults.properties;
    propertyTables.push({
      name: propertyTable.name,
      class: propertyTable.class,
      count: count,
      properties: properties,
    });
  }

  return {
    propertyTables: propertyTables,
    bufferViews: bufferViews,
  };
};

// For EXT_feature_metadata
MetadataTester.createFeatureTables = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  const featureTables = {};
  const bufferViews = {};

  for (const featureTableId in options.featureTables) {
    if (options.featureTables.hasOwnProperty(featureTableId)) {
      const featureTable = options.featureTables[featureTableId];
      const propertyResults = createProperties({
        schema: options.schema,
        classId: featureTable.class,
        propertyValues: featureTable.properties,
        bufferViews: bufferViews,
      });

      const count = propertyResults.count;
      const properties = propertyResults.properties;
      featureTables[featureTableId] = {
        class: featureTable.class,
        count: count,
        properties: properties,
      };
    }
  }

  return {
    featureTables: featureTables,
    bufferViews: bufferViews,
  };
};

MetadataTester.createGltf = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  const propertyTableResults = MetadataTester.createPropertyTables(options);

  let bufferByteLength = 0;
  const bufferViewsMap = propertyTableResults.bufferViews;
  const bufferViewsLength = Object.keys(bufferViewsMap).length;

  const byteLengths = new Array(bufferViewsLength);

  let bufferViewId;
  let uint8Array;

  for (bufferViewId in bufferViewsMap) {
    if (bufferViewsMap.hasOwnProperty(bufferViewId)) {
      uint8Array = bufferViewsMap[bufferViewId];

      const remainder = uint8Array.byteLength % 8;
      const padding = remainder === 0 ? 0 : 8 - remainder;
      const byteLength = uint8Array.byteLength + padding;
      bufferByteLength += byteLength;
      byteLengths[bufferViewId] = byteLength;
    }
  }

  const buffer = new Uint8Array(bufferByteLength);
  const bufferViews = new Array(bufferViewsLength);
  let byteOffset = 0;

  for (bufferViewId in bufferViewsMap) {
    if (bufferViewsMap.hasOwnProperty(bufferViewId)) {
      uint8Array = bufferViewsMap[bufferViewId];

      bufferViews[bufferViewId] = {
        buffer: 0,
        byteOffset: byteOffset,
        byteLength: uint8Array.byteLength,
      };

      buffer.set(uint8Array, byteOffset);
      byteOffset += byteLengths[bufferViewId];
    }
  }

  const gltf = {
    buffers: [
      {
        uri: "external.bin",
        byteLength: buffer.byteLength,
      },
    ],
    images: options.images,
    textures: options.textures,
    bufferViews: bufferViews,
    extensionsUsed: ["EXT_structural_metadata"],
    extensions: {
      EXT_structural_metadata: {
        schema: options.schema,
        propertyTables: propertyTableResults.propertyTables,
        propertyTextures: options.propertyTextures,
      },
    },
  };

  return {
    gltf: gltf,
    buffer: buffer,
  };
};

function createBuffer(values, componentType) {
  let typedArray;
  switch (componentType) {
    case MetadataComponentType.INT8:
      typedArray = new Int8Array(values);
      break;
    case MetadataComponentType.UINT8:
      typedArray = new Uint8Array(values);
      break;
    case MetadataComponentType.INT16:
      typedArray = new Int16Array(values);
      break;
    case MetadataComponentType.UINT16:
      typedArray = new Uint16Array(values);
      break;
    case MetadataComponentType.INT32:
      typedArray = new Int32Array(values);
      break;
    case MetadataComponentType.UINT32:
      typedArray = new Uint32Array(values);
      break;
    case MetadataComponentType.INT64:
      typedArray = new BigInt64Array(values);
      break;
    case MetadataComponentType.UINT64:
      typedArray = new BigUint64Array(values);
      break;
    case MetadataComponentType.FLOAT32:
      typedArray = new Float32Array(values);
      break;
    case MetadataComponentType.FLOAT64:
      typedArray = new Float64Array(values);
      break;
    //>>includeStart('debug', pragmas.debug);
    default:
      throw new DeveloperError(
        `${componentType} is not a valid component type`
      );
    //>>includeEnd('debug');
  }

  return new Uint8Array(typedArray.buffer);
}

function createStringBuffer(values) {
  const encoder = new TextEncoder();
  return encoder.encode(values.join(""));
}

function createBooleanBuffer(values) {
  const length = Math.ceil(values.length / 8);
  const typedArray = new Uint8Array(length); // Initialized as 0's
  for (let i = 0; i < values.length; ++i) {
    const byteIndex = i >> 3;
    const bitIndex = i % 8;
    if (values[i]) {
      typedArray[byteIndex] |= 1 << bitIndex;
    }
  }
  return typedArray;
}

function flatten(values) {
  return [].concat.apply([], values);
}

function createValuesBuffer(values, classProperty) {
  const type = classProperty.type;
  const valueType = classProperty.valueType;
  const enumType = classProperty.enumType;
  const flattenedValues = flatten(values);

  if (type === MetadataType.STRING) {
    return createStringBuffer(flattenedValues);
  }

  if (type === MetadataType.BOOLEAN) {
    return createBooleanBuffer(flattenedValues);
  }

  if (defined(enumType)) {
    const length = flattenedValues.length;
    for (let i = 0; i < length; ++i) {
      flattenedValues[i] = enumType.valuesByName[flattenedValues[i]];
    }
  }

  return createBuffer(flattenedValues, valueType);
}

function createStringOffsetBuffer(values, offsetType) {
  const encoder = new TextEncoder();
  const strings = flatten(values);
  const length = strings.length;
  const offsets = new Array(length + 1);
  let offset = 0;
  for (let i = 0; i < length; ++i) {
    offsets[i] = offset;
    offset += encoder.encode(strings[i]).length;
  }
  offsets[length] = offset;
  offsetType = defaultValue(offsetType, MetadataComponentType.UINT32);
  return createBuffer(offsets, offsetType);
}

function createArrayOffsetBuffer(values, type, offsetType) {
  const componentCount = MetadataType.getComponentCount(type);
  const length = values.length;
  const offsets = new Array(length + 1);
  let offset = 0;
  for (let i = 0; i < length; ++i) {
    offsets[i] = offset;
    offset += values[i].length / componentCount;
  }
  offsets[length] = offset;
  offsetType = defaultValue(offsetType, MetadataComponentType.UINT32);
  return createBuffer(offsets, offsetType);
}

function addPadding(uint8Array) {
  // This tests that MetadataTable uses the Uint8Array's byteOffset properly
  const paddingBytes = 8;
  const padded = new Uint8Array(paddingBytes + uint8Array.length);
  padded.set(uint8Array, paddingBytes);
  return new Uint8Array(padded.buffer, paddingBytes, uint8Array.length);
}

export default MetadataTester;
