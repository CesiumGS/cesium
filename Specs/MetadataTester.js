import {
  defined,
  defaultValue,
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
  var properties = {
    propertyId: options.property,
  };
  var propertyValues = {
    propertyId: options.values,
  };

  var table = MetadataTester.createMetadataTable({
    properties: properties,
    propertyValues: propertyValues,
    offsetType: options.offsetType,
    enums: options.enums,
    disableBigIntSupport: options.disableBigIntSupport,
    disableBigInt64ArraySupport: options.disableBigInt64ArraySupport,
    disableBigUint64ArraySupport: options.disableBigUint64ArraySupport,
  });

  return table._properties.propertyId;
};

function createProperties(options) {
  var schema = options.schema;
  var classId = options.classId;
  var propertyValues = options.propertyValues;
  var offsetType = options.offsetType;
  var bufferViews = defined(options.bufferViews) ? options.bufferViews : {};

  var enums = defined(schema.enums) ? schema.enums : {};
  var enumDefinitions = {};
  for (var enumId in enums) {
    if (enums.hasOwnProperty(enumId)) {
      enumDefinitions[enumId] = new MetadataEnum({
        id: enumId,
        enum: enums[enumId],
      });
    }
  }

  var classDefinition = new MetadataClass({
    id: classId,
    class: schema.classes[classId],
    enums: enumDefinitions,
  });

  var properties = {};
  var bufferViewIndex = Object.keys(bufferViews).length;
  var count = 0;

  for (var propertyId in propertyValues) {
    if (propertyValues.hasOwnProperty(propertyId)) {
      var classProperty = classDefinition.properties[propertyId];
      var values = propertyValues[propertyId];
      count = values.length;

      var valuesBuffer = addPadding(createValuesBuffer(values, classProperty));
      var valuesBufferView = bufferViewIndex++;
      bufferViews[valuesBufferView] = valuesBuffer;

      var property = {
        bufferView: valuesBufferView,
      };

      properties[propertyId] = property;

      if (defined(offsetType)) {
        property.offsetType = offsetType;
      }

      if (
        classProperty.type === MetadataType.ARRAY &&
        !defined(classProperty.componentCount)
      ) {
        var arrayOffsetBuffer = addPadding(
          createArrayOffsetBuffer(values, offsetType)
        );
        var arrayOffsetBufferView = bufferViewIndex++;
        bufferViews[arrayOffsetBufferView] = arrayOffsetBuffer;
        property.arrayOffsetBufferView = arrayOffsetBufferView;
      }

      if (classProperty.componentType === MetadataComponentType.STRING) {
        var stringOffsetBuffer = addPadding(
          createStringOffsetBuffer(values, offsetType)
        );
        var stringOffsetBufferView = bufferViewIndex++;
        bufferViews[stringOffsetBufferView] = stringOffsetBuffer;
        property.stringOffsetBufferView = stringOffsetBufferView;
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
  var disableBigIntSupport = options.disableBigIntSupport;
  var disableBigInt64ArraySupport = options.disableBigInt64ArraySupport;
  var disableBigUint64ArraySupport = options.disableBigUint64ArraySupport;

  var schema = {
    enums: options.enums,
    classes: {
      classId: {
        properties: options.properties,
      },
    },
  };

  var propertyResults = createProperties({
    schema: schema,
    classId: "classId",
    propertyValues: options.propertyValues,
    offsetType: options.offsetType,
  });

  var count = propertyResults.count;
  var properties = propertyResults.properties;
  var classDefinition = propertyResults.class;
  var bufferViews = propertyResults.bufferViews;

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
  var disableBigIntSupport = options.disableBigIntSupport;
  var disableBigInt64ArraySupport = options.disableBigInt64ArraySupport;
  var disableBigUint64ArraySupport = options.disableBigUint64ArraySupport;

  var schema = {
    enums: options.enums,
    classes: {
      classId: {
        properties: options.properties,
      },
    },
  };

  var propertyResults = createProperties({
    schema: schema,
    classId: "classId",
    propertyValues: options.propertyValues,
    offsetType: options.offsetType,
  });

  var count = propertyResults.count;
  var properties = propertyResults.properties;
  var classDefinition = propertyResults.class;
  var bufferViews = propertyResults.bufferViews;

  if (disableBigIntSupport) {
    spyOn(FeatureDetection, "supportsBigInt").and.returnValue(false);
  }

  if (disableBigInt64ArraySupport) {
    spyOn(FeatureDetection, "supportsBigInt64Array").and.returnValue(false);
  }

  if (disableBigUint64ArraySupport) {
    spyOn(FeatureDetection, "supportsBigUint64Array").and.returnValue(false);
  }

  var metadataTable = new MetadataTable({
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

// for EXT_mesh_features
MetadataTester.createPropertyTables = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  var propertyTables = [];
  var bufferViews = {};

  for (var i = 0; i < options.propertyTables.length; i++) {
    var propertyTable = options.propertyTables[i];
    var tablePropertyResults = createProperties({
      schema: options.schema,
      classId: propertyTable.class,
      propertyValues: propertyTable.properties,
      bufferViews: bufferViews,
    });

    var count = tablePropertyResults.count;
    var properties = tablePropertyResults.properties;
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

  var featureTables = {};
  var bufferViews = {};

  for (var featureTableId in options.featureTables) {
    if (options.featureTables.hasOwnProperty(featureTableId)) {
      var featureTable = options.featureTables[featureTableId];
      var propertyResults = createProperties({
        schema: options.schema,
        classId: featureTable.class,
        propertyValues: featureTable.properties,
        bufferViews: bufferViews,
      });

      var count = propertyResults.count;
      var properties = propertyResults.properties;
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

  var propertyTableResults = MetadataTester.createPropertyTables(options);

  var bufferByteLength = 0;
  var bufferViewsMap = propertyTableResults.bufferViews;
  var bufferViewsLength = Object.keys(bufferViewsMap).length;

  var byteLengths = new Array(bufferViewsLength);

  var bufferViewId;
  var uint8Array;

  for (bufferViewId in bufferViewsMap) {
    if (bufferViewsMap.hasOwnProperty(bufferViewId)) {
      uint8Array = bufferViewsMap[bufferViewId];

      var remainder = uint8Array.byteLength % 8;
      var padding = remainder === 0 ? 0 : 8 - remainder;
      var byteLength = uint8Array.byteLength + padding;
      bufferByteLength += byteLength;
      byteLengths[bufferViewId] = byteLength;
    }
  }

  var buffer = new Uint8Array(bufferByteLength);
  var bufferViews = new Array(bufferViewsLength);
  var byteOffset = 0;

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

  var gltf = {
    buffers: [
      {
        uri: "external.bin",
        byteLength: buffer.byteLength,
      },
    ],
    images: options.images,
    textures: options.textures,
    bufferViews: bufferViews,
    extensionsUsed: ["EXT_mesh_features"],
    extensions: {
      EXT_mesh_features: {
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
  var typedArray;
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
      typedArray = new BigInt64Array(values); // eslint-disable-line
      break;
    case MetadataComponentType.UINT64:
      typedArray = new BigUint64Array(values); // eslint-disable-line
      break;
    case MetadataComponentType.FLOAT32:
      typedArray = new Float32Array(values);
      break;
    case MetadataComponentType.FLOAT64:
      typedArray = new Float64Array(values);
      break;
    case MetadataComponentType.STRING:
      var encoder = new TextEncoder();
      typedArray = encoder.encode(values.join(""));
      break;
    case MetadataComponentType.BOOLEAN:
      var length = Math.ceil(values.length / 8);
      typedArray = new Uint8Array(length); // Initialized as 0's
      for (var i = 0; i < values.length; ++i) {
        var byteIndex = i >> 3;
        var bitIndex = i % 8;
        if (values[i]) {
          typedArray[byteIndex] |= 1 << bitIndex;
        }
      }
      break;
  }

  return new Uint8Array(typedArray.buffer);
}

function flatten(values) {
  return [].concat.apply([], values);
}

function createValuesBuffer(values, classProperty) {
  var valueType = classProperty.valueType;
  var enumType = classProperty.enumType;
  var flattenedValues = flatten(values);

  if (defined(enumType)) {
    var length = flattenedValues.length;
    for (var i = 0; i < length; ++i) {
      flattenedValues[i] = enumType.valuesByName[flattenedValues[i]];
    }
  }

  return createBuffer(flattenedValues, valueType);
}

function createStringOffsetBuffer(values, offsetType) {
  var encoder = new TextEncoder();
  var strings = flatten(values);
  var length = strings.length;
  var offsets = new Array(length + 1);
  var offset = 0;
  for (var i = 0; i < length; ++i) {
    offsets[i] = offset;
    offset += encoder.encode(strings[i]).length;
  }
  offsets[length] = offset;
  offsetType = defaultValue(offsetType, MetadataComponentType.UINT32);
  return createBuffer(offsets, offsetType);
}

function createArrayOffsetBuffer(values, offsetType) {
  var length = values.length;
  var offsets = new Array(length + 1);
  var offset = 0;
  for (var i = 0; i < length; ++i) {
    offsets[i] = offset;
    offset += values[i].length;
  }
  offsets[length] = offset;
  offsetType = defaultValue(offsetType, MetadataComponentType.UINT32);
  return createBuffer(offsets, offsetType);
}

function addPadding(uint8Array) {
  // This tests that MetadataTable uses the Uint8Array's byteOffset properly
  var paddingBytes = 8;
  var padded = new Uint8Array(paddingBytes + uint8Array.length);
  padded.set(uint8Array, paddingBytes);
  return new Uint8Array(padded.buffer, paddingBytes, uint8Array.length);
}

export default MetadataTester;
