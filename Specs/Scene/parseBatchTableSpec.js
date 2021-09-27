import {
  Cartesian2,
  Cartesian3,
  Cartesian4,
  parseBatchTable,
  MetadataClass,
  MetadataType,
} from "../../Source/Cesium.js";

describe("Scene/parseBatchTable", function () {
  var batchTableJson = {};
  var count = 3;
  var className = MetadataClass._batchTableClassName;

  it("throws without count", function () {
    expect(function () {
      return parseBatchTable({
        count: undefined,
        batchTable: batchTableJson,
      });
    }).toThrowDeveloperError();
  });

  it("throws without batchTable", function () {
    expect(function () {
      return parseBatchTable({
        count: count,
        batchTable: undefined,
      });
    }).toThrowDeveloperError();
  });

  it("parses batch table with no properties", function () {
    var metadata = parseBatchTable({
      count: count,
      batchTable: {},
    });

    expect(metadata).toBeDefined();
  });

  it("parses batch table with binary properties", function () {
    var binaryBatchTable = {
      height: {
        byteOffset: 0,
        componentType: "FLOAT",
        type: "SCALAR",
      },
    };

    var heightValues = new Float32Array([10.0, 15.0, 25.0]);
    var binaryBody = new Uint8Array(heightValues.buffer);

    var metadata = parseBatchTable({
      count: 3,
      batchTable: binaryBatchTable,
      binaryBody: binaryBody,
    });
    var featureTable = metadata.getFeatureTable(className);

    expect(featureTable.getProperty(0, "height")).toBe(10.0);
    expect(featureTable.getProperty(1, "height")).toBe(15.0);
    expect(featureTable.getProperty(2, "height")).toBe(25.0);
  });

  it("transcodes scalars to correct types", function () {
    // making use of the fact that 0 is represented as NUL bytes
    // in all of the above types
    var binaryBatchTable = {
      uint8Property: {
        byteOffset: 0,
        componentType: "UNSIGNED_BYTE",
        type: "SCALAR",
      },
      uint16Property: {
        byteOffset: 0,
        componentType: "UNSIGNED_SHORT",
        type: "SCALAR",
      },
      uint32Property: {
        byteOffset: 0,
        componentType: "UNSIGNED_INT",
        type: "SCALAR",
      },
      int8Property: {
        byteOffset: 0,
        componentType: "BYTE",
        type: "SCALAR",
      },
      int16Property: {
        byteOffset: 0,
        componentType: "SHORT",
        type: "SCALAR",
      },
      int32Property: {
        byteOffset: 0,
        componentType: "INT",
        type: "SCALAR",
      },
      floatProperty: {
        byteOffset: 0,
        componentType: "FLOAT",
        type: "SCALAR",
      },
      doubleProperty: {
        byteOffset: 0,
        componentType: "DOUBLE",
        type: "SCALAR",
      },
    };

    // largest type is a double
    var binaryBody = new Uint8Array(8);

    var metadata = parseBatchTable({
      count: 1,
      batchTable: binaryBatchTable,
      binaryBody: binaryBody,
    });
    var properties = metadata.schema.classes[className].properties;

    expect(properties.uint8Property.type).toBe(MetadataType.UINT8);
    expect(properties.uint16Property.type).toBe(MetadataType.UINT16);
    expect(properties.uint32Property.type).toBe(MetadataType.UINT32);
    expect(properties.int8Property.type).toBe(MetadataType.INT8);
    expect(properties.int16Property.type).toBe(MetadataType.INT16);
    expect(properties.int32Property.type).toBe(MetadataType.INT32);
    expect(properties.floatProperty.type).toBe(MetadataType.FLOAT32);
    expect(properties.doubleProperty.type).toBe(MetadataType.FLOAT64);

    var featureTable = metadata.getFeatureTable(className);
    expect(featureTable.getProperty(0, "uint8Property")).toBe(0);
    expect(featureTable.getProperty(0, "uint16Property")).toBe(0);
    expect(featureTable.getProperty(0, "uint32Property")).toBe(0);
    expect(featureTable.getProperty(0, "int8Property")).toBe(0);
    expect(featureTable.getProperty(0, "int16Property")).toBe(0);
    expect(featureTable.getProperty(0, "int32Property")).toBe(0);
    expect(featureTable.getProperty(0, "floatProperty")).toBe(0.0);
    expect(featureTable.getProperty(0, "doubleProperty")).toBe(0.0);
  });

  it("transcodes binary vectors to array types", function () {
    var vectorBatchTable = {
      vec2Property: {
        byteOffset: 0,
        componentType: "FLOAT",
        type: "VEC2",
      },
      uvec3Property: {
        byteOffset: 0,
        componentType: "UNSIGNED_INT",
        type: "VEC3",
      },
      dvec4Property: {
        byteOffset: 0,
        componentType: "DOUBLE",
        type: "VEC4",
      },
    };
    // largest type is a vec4 of doubles
    var binaryBody = new Uint8Array(8 * 4);

    var metadata = parseBatchTable({
      count: 1,
      batchTable: vectorBatchTable,
      binaryBody: binaryBody,
    });
    var properties = metadata.schema.classes[className].properties;

    expect(properties.vec2Property.type).toBe(MetadataType.ARRAY);
    expect(properties.uvec3Property.type).toBe(MetadataType.ARRAY);
    expect(properties.dvec4Property.type).toBe(MetadataType.ARRAY);
    expect(properties.vec2Property.componentType).toBe(MetadataType.FLOAT32);
    expect(properties.uvec3Property.componentType).toBe(MetadataType.UINT32);
    expect(properties.dvec4Property.componentType).toBe(MetadataType.FLOAT64);
    expect(properties.vec2Property.componentCount).toBe(2);
    expect(properties.uvec3Property.componentCount).toBe(3);
    expect(properties.dvec4Property.componentCount).toBe(4);

    var featureTable = metadata.getFeatureTable(className);
    expect(featureTable.getProperty(0, "vec2Property")).toEqual(
      new Cartesian2(0.0, 0.0)
    );
    expect(featureTable.getProperty(0, "uvec3Property")).toEqual(
      new Cartesian3(0, 0, 0)
    );
    expect(featureTable.getProperty(0, "dvec4Property")).toEqual(
      new Cartesian4(0.0, 0.0, 0.0, 0.0)
    );
  });

  it("parses batch table with JSON properties", function () {
    var jsonBatchTable = {
      location: [
        [0, 0],
        [1, 0],
      ],
      payload: [
        {
          name: "Shopping Center",
          color: [0.3, 0.3, 0.3],
          stores: 15,
        },
        {
          name: "School",
          color: [0.6, 0.3, 0.3],
          students: 1621,
        },
      ],
    };

    var metadata = parseBatchTable({
      count: 2,
      batchTable: jsonBatchTable,
    });

    var properties = metadata.schema.classes[className].properties;
    expect(properties).toEqual({});

    var featureTable = metadata.getFeatureTable(className);
    expect(featureTable.getProperty(0, "location")).toEqual(
      jsonBatchTable.location[0]
    );
    expect(featureTable.getProperty(1, "location")).toEqual(
      jsonBatchTable.location[1]
    );
    expect(featureTable.getProperty(0, "payload")).toEqual(
      jsonBatchTable.payload[0]
    );
    expect(featureTable.getProperty(1, "payload")).toEqual(
      jsonBatchTable.payload[1]
    );
  });

  var hierarchy = {
    classes: [
      {
        name: "Wheels",
        length: 8,
        instances: {
          tire_location: [
            "front_left",
            "front_right",
            "back_left",
            "back_right",
            "front_left",
            "front_right",
            "back_left",
            "back_right",
          ],
        },
      },
      {
        name: "Car",
        length: 2,
        instances: {
          color: ["blue", "red"],
          type: ["sedan", "truck"],
          year: ["2020", "2018"],
        },
      },
    ],
    instancesLength: 10,
    classIds: [0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    parentIds: [4, 4, 4, 4, 4, 9, 9, 9, 9, 9],
    parentCounts: [1, 1, 1, 1, 0, 1, 1, 1, 1, 0],
  };

  it("warns for deprecated HIERARCHY extension", function () {
    var warn = spyOn(parseBatchTable, "_deprecationWarning");
    var oldHierarchyBatchTable = {
      HIERARCHY: hierarchy,
    };

    var metadata = parseBatchTable({
      count: 10,
      batchTable: oldHierarchyBatchTable,
    });

    expect(warn).toHaveBeenCalled();

    var properties = metadata.schema.classes[className].properties;
    expect(properties).toEqual({});

    var featureTable = metadata.getFeatureTable(className);
    expect(featureTable.getProperty(0, "tire_location")).toBe("front_left");
    expect(featureTable.getProperty(0, "color")).toBe("blue");
    expect(featureTable.getProperty(0, "type")).toBe("sedan");
    expect(featureTable.getProperty(0, "year")).toBe("2020");

    expect(featureTable.getProperty(4, "tire_location")).not.toBeDefined();
    expect(featureTable.getProperty(4, "color")).toBe("blue");
    expect(featureTable.getProperty(4, "type")).toBe("sedan");
    expect(featureTable.getProperty(4, "year")).toBe("2020");

    expect(featureTable.getProperty(6, "tire_location")).toBe("front_right");
    expect(featureTable.getProperty(6, "color")).toBe("red");
    expect(featureTable.getProperty(6, "type")).toBe("truck");
    expect(featureTable.getProperty(6, "year")).toBe("2018");

    expect(featureTable.getProperty(9, "tire_location")).not.toBeDefined();
    expect(featureTable.getProperty(9, "color")).toBe("red");
    expect(featureTable.getProperty(9, "type")).toBe("truck");
    expect(featureTable.getProperty(9, "year")).toBe("2018");
  });

  it("parses batch table with hierarchy", function () {
    var oldHierarchyBatchTable = {
      extensions: {
        "3DTILES_batch_table_hierarchy": hierarchy,
      },
    };

    var metadata = parseBatchTable({
      count: 10,
      batchTable: oldHierarchyBatchTable,
    });

    var properties = metadata.schema.classes[className].properties;
    expect(properties).toEqual({});

    var featureTable = metadata.getFeatureTable(className);
    expect(featureTable.getProperty(0, "tire_location")).toBe("front_left");
    expect(featureTable.getProperty(0, "color")).toBe("blue");
    expect(featureTable.getProperty(0, "type")).toBe("sedan");
    expect(featureTable.getProperty(0, "year")).toBe("2020");

    expect(featureTable.getProperty(4, "tire_location")).not.toBeDefined();
    expect(featureTable.getProperty(4, "color")).toBe("blue");
    expect(featureTable.getProperty(4, "type")).toBe("sedan");
    expect(featureTable.getProperty(4, "year")).toBe("2020");

    expect(featureTable.getProperty(6, "tire_location")).toBe("front_right");
    expect(featureTable.getProperty(6, "color")).toBe("red");
    expect(featureTable.getProperty(6, "type")).toBe("truck");
    expect(featureTable.getProperty(6, "year")).toBe("2018");

    expect(featureTable.getProperty(9, "tire_location")).not.toBeDefined();
    expect(featureTable.getProperty(9, "color")).toBe("red");
    expect(featureTable.getProperty(9, "type")).toBe("truck");
    expect(featureTable.getProperty(9, "year")).toBe("2018");
  });

  it("stores extras and extensions in the transcoded FeatureMetadata", function () {
    var batchTable = {
      extras: {
        author: "Cesium",
        date: "2021-04-15",
      },
      extensions: {
        "3DTILES_extension": {},
      },
    };

    var metadata = parseBatchTable({
      count: 1,
      batchTable: batchTable,
    });

    expect(metadata.extras).toBe(batchTable.extras);
    expect(metadata.extensions).toBe(batchTable.extensions);
  });

  it("throws if binaryBody is needed and not provided", function () {
    var binaryBatchTable = {
      height: {
        byteOffset: 0,
        componentType: "FLOAT",
        type: "SCALAR",
      },
    };

    expect(function () {
      return parseBatchTable({
        count: 1,
        batchTable: binaryBatchTable,
        binaryBody: undefined,
      });
    }).toThrowRuntimeError();
  });
});
