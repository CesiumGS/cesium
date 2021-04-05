import {
  defined,
  defaultValue,
  FeatureDetection,
  FeatureTable,
  MetadataClass,
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

      if (
        classProperty.type === MetadataType.STRING ||
        classProperty.componentType === MetadataType.STRING
      ) {
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

MetadataTester.createFeatureTable = function (options) {
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

  return new FeatureTable({
    featureTable: {
      class: "classId",
      count: count,
      properties: properties,
      extras: options.extras,
      extensions: options.extensions,
    },
    class: classDefinition,
    bufferViews: bufferViews,
  });
};

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

function createBuffer(values, type) {
  var typedArray;
  switch (type) {
    case MetadataType.INT8:
      typedArray = new Int8Array(values);
      break;
    case MetadataType.UINT8:
      typedArray = new Uint8Array(values);
      break;
    case MetadataType.INT16:
      typedArray = new Int16Array(values);
      break;
    case MetadataType.UINT16:
      typedArray = new Uint16Array(values);
      break;
    case MetadataType.INT32:
      typedArray = new Int32Array(values);
      break;
    case MetadataType.UINT32:
      typedArray = new Uint32Array(values);
      break;
    case MetadataType.INT64:
      typedArray = new BigInt64Array(values); // eslint-disable-line
      break;
    case MetadataType.UINT64:
      typedArray = new BigUint64Array(values); // eslint-disable-line
      break;
    case MetadataType.FLOAT32:
      typedArray = new Float32Array(values);
      break;
    case MetadataType.FLOAT64:
      typedArray = new Float64Array(values);
      break;
    case MetadataType.STRING:
      var encoder = new TextEncoder();
      typedArray = encoder.encode(values.join(""));
      break;
    case MetadataType.BOOLEAN:
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
  offsetType = defaultValue(offsetType, MetadataType.UINT32);
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
  offsetType = defaultValue(offsetType, MetadataType.UINT32);
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
