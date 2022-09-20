import {
  Cartesian2,
  Cartesian3,
  Cartesian4,
  ComponentDatatype,
  parseBatchTable,
  MetadataClass,
  MetadataComponentType,
  MetadataType,
  RuntimeError,
} from "../../index.js";

describe("Scene/parseBatchTable", function () {
  const batchTableJson = {};
  const count = 3;
  const className = MetadataClass.BATCH_TABLE_CLASS_NAME;

  function sortByName(a, b) {
    if (a.name < b.name) {
      return -1;
    }

    if (a.name > b.name) {
      return 1;
    }

    return 0;
  }

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
    const metadata = parseBatchTable({
      count: count,
      batchTable: {},
    });

    expect(metadata).toBeDefined();
  });

  it("parses batch table with binary properties", function () {
    const binaryBatchTable = {
      height: {
        byteOffset: 0,
        componentType: "FLOAT",
        type: "SCALAR",
      },
    };

    const heightValues = new Float32Array([10.0, 15.0, 25.0]);
    const binaryBody = new Uint8Array(heightValues.buffer);

    const metadata = parseBatchTable({
      count: 3,
      batchTable: binaryBatchTable,
      binaryBody: binaryBody,
    });
    const propertyTable = metadata.getPropertyTable(0);
    expect(propertyTable.id).toBe(0);
    expect(propertyTable.name).toBe("Batch Table");

    expect(propertyTable.getProperty(0, "height")).toBe(10.0);
    expect(propertyTable.getProperty(1, "height")).toBe(15.0);
    expect(propertyTable.getProperty(2, "height")).toBe(25.0);
  });

  it("transcodes scalars to correct types", function () {
    // making use of the fact that 0 is represented as NUL bytes
    // in all of the above types
    const binaryBatchTable = {
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
    const binaryBody = new Uint8Array(8);

    const metadata = parseBatchTable({
      count: 1,
      batchTable: binaryBatchTable,
      binaryBody: binaryBody,
    });
    const properties = metadata.schema.classes[className].properties;

    expect(properties.uint8Property.componentType).toBe(
      MetadataComponentType.UINT8
    );
    expect(properties.uint16Property.componentType).toBe(
      MetadataComponentType.UINT16
    );
    expect(properties.uint32Property.componentType).toBe(
      MetadataComponentType.UINT32
    );
    expect(properties.int8Property.componentType).toBe(
      MetadataComponentType.INT8
    );
    expect(properties.int16Property.componentType).toBe(
      MetadataComponentType.INT16
    );
    expect(properties.int32Property.componentType).toBe(
      MetadataComponentType.INT32
    );
    expect(properties.floatProperty.componentType).toBe(
      MetadataComponentType.FLOAT32
    );
    expect(properties.doubleProperty.componentType).toBe(
      MetadataComponentType.FLOAT64
    );

    const propertyTable = metadata.getPropertyTable(0);
    expect(propertyTable.getProperty(0, "uint8Property")).toBe(0);
    expect(propertyTable.getProperty(0, "uint16Property")).toBe(0);
    expect(propertyTable.getProperty(0, "uint32Property")).toBe(0);
    expect(propertyTable.getProperty(0, "int8Property")).toBe(0);
    expect(propertyTable.getProperty(0, "int16Property")).toBe(0);
    expect(propertyTable.getProperty(0, "int32Property")).toBe(0);
    expect(propertyTable.getProperty(0, "floatProperty")).toBe(0.0);
    expect(propertyTable.getProperty(0, "doubleProperty")).toBe(0.0);
  });

  it("transcodes binary vectors to vector types", function () {
    const vectorBatchTable = {
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
    const binaryBody = new Uint8Array(8 * 4);

    const metadata = parseBatchTable({
      count: 1,
      batchTable: vectorBatchTable,
      binaryBody: binaryBody,
    });
    const properties = metadata.schema.classes[className].properties;

    expect(properties.vec2Property.type).toBe(MetadataType.VEC2);
    expect(properties.uvec3Property.type).toBe(MetadataType.VEC3);
    expect(properties.dvec4Property.type).toBe(MetadataType.VEC4);
    expect(properties.vec2Property.componentType).toBe(
      MetadataComponentType.FLOAT32
    );
    expect(properties.uvec3Property.componentType).toBe(
      MetadataComponentType.UINT32
    );
    expect(properties.dvec4Property.componentType).toBe(
      MetadataComponentType.FLOAT64
    );

    const propertyTable = metadata.getPropertyTable(0);
    expect(propertyTable.getProperty(0, "vec2Property")).toEqual(
      new Cartesian2(0.0, 0.0)
    );
    expect(propertyTable.getProperty(0, "uvec3Property")).toEqual(
      new Cartesian3(0, 0, 0)
    );
    expect(propertyTable.getProperty(0, "dvec4Property")).toEqual(
      new Cartesian4(0.0, 0.0, 0.0, 0.0)
    );
  });

  it("parses batch table with JSON properties", function () {
    const jsonBatchTable = {
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

    const metadata = parseBatchTable({
      count: 2,
      batchTable: jsonBatchTable,
    });

    const properties = metadata.schema.classes[className].properties;
    expect(properties).toEqual({});

    const propertyTable = metadata.getPropertyTable(0);
    expect(propertyTable.getProperty(0, "location")).toEqual(
      jsonBatchTable.location[0]
    );
    expect(propertyTable.getProperty(1, "location")).toEqual(
      jsonBatchTable.location[1]
    );
    expect(propertyTable.getProperty(0, "payload")).toEqual(
      jsonBatchTable.payload[0]
    );
    expect(propertyTable.getProperty(1, "payload")).toEqual(
      jsonBatchTable.payload[1]
    );
  });

  const hierarchy = {
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
    const warn = spyOn(parseBatchTable, "_deprecationWarning");
    const oldHierarchyBatchTable = {
      HIERARCHY: hierarchy,
    };

    const metadata = parseBatchTable({
      count: 10,
      batchTable: oldHierarchyBatchTable,
    });

    expect(warn).toHaveBeenCalled();

    const properties = metadata.schema.classes[className].properties;
    expect(properties).toEqual({});

    const propertyTable = metadata.getPropertyTable(0);
    expect(propertyTable.getProperty(0, "tire_location")).toBe("front_left");
    expect(propertyTable.getProperty(0, "color")).toBe("blue");
    expect(propertyTable.getProperty(0, "type")).toBe("sedan");
    expect(propertyTable.getProperty(0, "year")).toBe("2020");

    expect(propertyTable.getProperty(4, "tire_location")).not.toBeDefined();
    expect(propertyTable.getProperty(4, "color")).toBe("blue");
    expect(propertyTable.getProperty(4, "type")).toBe("sedan");
    expect(propertyTable.getProperty(4, "year")).toBe("2020");

    expect(propertyTable.getProperty(6, "tire_location")).toBe("front_right");
    expect(propertyTable.getProperty(6, "color")).toBe("red");
    expect(propertyTable.getProperty(6, "type")).toBe("truck");
    expect(propertyTable.getProperty(6, "year")).toBe("2018");

    expect(propertyTable.getProperty(9, "tire_location")).not.toBeDefined();
    expect(propertyTable.getProperty(9, "color")).toBe("red");
    expect(propertyTable.getProperty(9, "type")).toBe("truck");
    expect(propertyTable.getProperty(9, "year")).toBe("2018");
  });

  it("parses batch table with hierarchy", function () {
    const oldHierarchyBatchTable = {
      extensions: {
        "3DTILES_batch_table_hierarchy": hierarchy,
      },
    };

    const metadata = parseBatchTable({
      count: 10,
      batchTable: oldHierarchyBatchTable,
    });

    const properties = metadata.schema.classes[className].properties;
    expect(properties).toEqual({});

    const propertyTable = metadata.getPropertyTable(0);
    expect(propertyTable.getProperty(0, "tire_location")).toBe("front_left");
    expect(propertyTable.getProperty(0, "color")).toBe("blue");
    expect(propertyTable.getProperty(0, "type")).toBe("sedan");
    expect(propertyTable.getProperty(0, "year")).toBe("2020");

    expect(propertyTable.getProperty(4, "tire_location")).not.toBeDefined();
    expect(propertyTable.getProperty(4, "color")).toBe("blue");
    expect(propertyTable.getProperty(4, "type")).toBe("sedan");
    expect(propertyTable.getProperty(4, "year")).toBe("2020");

    expect(propertyTable.getProperty(6, "tire_location")).toBe("front_right");
    expect(propertyTable.getProperty(6, "color")).toBe("red");
    expect(propertyTable.getProperty(6, "type")).toBe("truck");
    expect(propertyTable.getProperty(6, "year")).toBe("2018");

    expect(propertyTable.getProperty(9, "tire_location")).not.toBeDefined();
    expect(propertyTable.getProperty(9, "color")).toBe("red");
    expect(propertyTable.getProperty(9, "type")).toBe("truck");
    expect(propertyTable.getProperty(9, "year")).toBe("2018");
  });

  it("stores extras and extensions in the transcoded StructuralMetadata", function () {
    const batchTable = {
      extras: {
        author: "Cesium",
        date: "2021-04-15",
      },
      extensions: {
        "3DTILES_extension": {},
      },
    };

    const metadata = parseBatchTable({
      count: 1,
      batchTable: batchTable,
    });

    expect(metadata.extras).toBe(batchTable.extras);
    expect(metadata.extensions).toBe(batchTable.extensions);
  });

  it("throws if binaryBody is needed and not provided", function () {
    const binaryBatchTable = {
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
    }).toThrowError(RuntimeError);
  });

  it("throws if parseAsPropertyAttributes is true and customAttributeOutput is not provided", function () {
    const binaryBatchTable = {
      height: {
        byteOffset: 0,
        componentType: "FLOAT",
        type: "SCALAR",
      },
    };

    const heightValues = new Float32Array([10.0, 15.0, 25.0]);
    const binaryBody = new Uint8Array(heightValues.buffer);

    expect(function () {
      return parseBatchTable({
        count: 3,
        batchTable: binaryBatchTable,
        binaryBody: binaryBody,
        parseAsPropertyAttributes: true,
        customAttributeOutput: undefined,
      });
    }).toThrowDeveloperError();
  });

  it("parses batch table as property attributes", function () {
    const binaryBatchTable = {
      height: {
        byteOffset: 0,
        componentType: "FLOAT",
        type: "SCALAR",
      },
      windDirection: {
        byteOffset: 12,
        componentType: "FLOAT",
        type: "VEC2",
      },
    };

    // prettier-ignore
    const values = new Float32Array([
      // height values (float)
      10.0, 15.0, 25.0,
      // wind direction values (vec2)
      1.0, 0.0,
      1.1, 0.4,
      0.3, 0.2,
    ]);
    const binaryBody = new Uint8Array(values.buffer);

    const customAttributes = [];
    const metadata = parseBatchTable({
      count: 3,
      batchTable: binaryBatchTable,
      binaryBody: binaryBody,
      parseAsPropertyAttributes: true,
      customAttributeOutput: customAttributes,
    });

    expect(customAttributes.length).toBe(2);

    // Since the original properties is an unordered collection, sort
    // to be sure of the order
    const [heightAttribute, windDirectionAttribute] = customAttributes.sort(
      sortByName
    );
    expect(heightAttribute.name).toBe("_HEIGHT");
    expect(heightAttribute.count).toBe(3);
    expect(heightAttribute.type).toBe("SCALAR");
    expect(heightAttribute.componentDatatype).toBe(ComponentDatatype.FLOAT);
    expect(heightAttribute.typedArray).toEqual(values.slice(0, 3));

    expect(windDirectionAttribute.name).toBe("_WINDDIRECTION");
    expect(windDirectionAttribute.count).toBe(3);
    expect(windDirectionAttribute.type).toBe("VEC2");
    expect(windDirectionAttribute.componentDatatype).toBe(
      ComponentDatatype.FLOAT
    );
    expect(windDirectionAttribute.typedArray).toEqual(values.slice(3));

    // The property table will not be created
    const propertyTable = metadata.getPropertyTable(0);
    expect(propertyTable).not.toBeDefined();

    expect(metadata.propertyAttributes.length).toBe(1);
    const [propertyAttribute] = metadata.propertyAttributes;
    const metadataClass = propertyAttribute.class;
    expect(metadataClass.id).toBe(MetadataClass.BATCH_TABLE_CLASS_NAME);
    const heightClassProperty = metadataClass.properties.height;
    expect(heightClassProperty.name).toBe("height");
    expect(heightClassProperty.type).toBe(MetadataType.SCALAR);
    expect(heightClassProperty.componentType).toBe(
      MetadataComponentType.FLOAT32
    );
    const windClassProperty = metadataClass.properties["windDirection"];
    expect(windClassProperty.name).toBe("windDirection");
    expect(windClassProperty.type).toBe(MetadataType.VEC2);
    expect(windClassProperty.componentType).toBe(MetadataComponentType.FLOAT32);

    const properties = propertyAttribute.properties;
    const heightProperty = properties.height;
    expect(heightProperty.attribute).toBe("_HEIGHT");
    const windProperty = properties.windDirection;
    expect(windProperty.attribute).toBe("_WINDDIRECTION");
  });

  it("sanitizes property attribute property IDs for use in GLSL", function () {
    const binaryBatchTable = {
      // will be converted to Height
      "Height ⛰️": {
        byteOffset: 0,
        componentType: "FLOAT",
        type: "SCALAR",
      },
      // gl_ prefix is reserved in GLSL and will be removed.
      // this leaves 1234, which starts with a number, so a _ prefix will be
      // added. Result: _1234
      gl_1234: {
        byteOffset: 12,
        componentType: "FLOAT",
        type: "VEC2",
      },
    };

    // prettier-ignore
    const values = new Float32Array([
      10.0, 15.0, 25.0,
      1.0, 0.0,
      1.1, 0.4,
      0.3, 0.2,
    ]);
    const binaryBody = new Uint8Array(values.buffer);

    const customAttributes = [];
    const metadata = parseBatchTable({
      count: 3,
      batchTable: binaryBatchTable,
      binaryBody: binaryBody,
      parseAsPropertyAttributes: true,
      customAttributeOutput: customAttributes,
    });

    expect(customAttributes.length).toBe(2);

    // Since the original properties is an unordered collection, sort
    // to be sure of the order.
    const [numericAttribute, unicodeAttribute] = customAttributes.sort(
      sortByName
    );

    // Attributes are converted to upper-case like glTF attributes.
    expect(numericAttribute.name).toBe("_1234");
    expect(unicodeAttribute.name).toBe("_HEIGHT_");

    // In the schema, the IDs are valid GLSL identifiers, while the name
    // is the original property ID which may contain unicode.
    const [propertyAttribute] = metadata.propertyAttributes;
    const metadataClass = propertyAttribute.class;
    const numericClassProperty = metadataClass.properties["_1234"];
    expect(numericClassProperty.name).toBe("gl_1234");
    const unicodeClassProperty = metadataClass.properties["Height_"];
    expect(unicodeClassProperty.name).toBe("Height ⛰️");

    const properties = propertyAttribute.properties;
    const numericProperty = properties["_1234"];
    expect(numericProperty.attribute).toBe("_1234");
    const unicodeProperty = properties["Height_"];
    expect(unicodeProperty.attribute).toBe("_HEIGHT_");
  });

  it("creates placeholder IDs for invalid GLSL identifiers", function () {
    const binaryBatchTable = {
      "✖️✖️✖️": {
        byteOffset: 0,
        componentType: "FLOAT",
        type: "SCALAR",
      },
      temperature: {
        byteOffset: 12,
        componentType: "FLOAT",
        type: "SCALAR",
      },
      // gl_ prefix will be removed, leading to a name collision with
      // "temperature
      gl_temperature: {
        byteOffset: 24,
        componentType: "FLOAT",
        type: "SCALAR",
      },
    };

    // prettier-ignore
    const values = new Float32Array([
      10.0, 15.0, 25.0,
      20.0, 30.0, 15.0,
      25.0, 20.0, 20.0,
    ]);
    const binaryBody = new Uint8Array(values.buffer);

    const customAttributes = [];
    const metadata = parseBatchTable({
      count: 3,
      batchTable: binaryBatchTable,
      binaryBody: binaryBody,
      parseAsPropertyAttributes: true,
      customAttributeOutput: customAttributes,
    });

    expect(customAttributes.length).toBe(3);

    // Attributes are processed in a non-deterministic order (due to looping
    // over a dictionary), but the set of results is constant.
    const attributeNames = customAttributes.map(function (attribute) {
      return attribute.name;
    });
    expect(attributeNames.sort()).toEqual(["_", "_PROPERTY_0", "_TEMPERATURE"]);

    const [propertyAttribute] = metadata.propertyAttributes;
    const metadataClass = propertyAttribute.class;
    const classProperties = [
      metadataClass.properties._,
      metadataClass.properties.property_0,
      metadataClass.properties.temperature,
    ];

    // Again, the order is non-deterministic, but the attribute names will
    // always be the original names
    const classPropertyNames = classProperties.map(function (classProperty) {
      return classProperty.name;
    });
    expect(classPropertyNames.sort()).toEqual(
      Object.keys(binaryBatchTable).sort()
    );

    const properties = propertyAttribute.properties;
    expect(Object.keys(properties).sort()).toEqual([
      "_",
      "property_0",
      "temperature",
    ]);

    const semantics = Object.values(properties).map(function (property) {
      return property.attribute;
    });
    expect(semantics.sort()).toEqual(["_", "_PROPERTY_0", "_TEMPERATURE"]);
  });

  it("handles typed arrays decoded from Draco pnts", function () {
    const binaryBatchTable = {
      height: {
        byteOffset: 0,
        componentType: "FLOAT",
        type: "SCALAR",
        // when decoding Draco, each property is stored in a separate typed
        // array.
        typedArray: new Float32Array([10.0, 15.0, 25.0]),
      },
      windDirection: {
        byteOffset: 12,
        componentType: "FLOAT",
        type: "VEC2",
        // prettier-ignore
        typedArray: new Float32Array([
          1.0, 0.0,
          1.1, 0.4,
          0.3, 0.2,
        ]),
      },
    };
    // simulate the common case where everything is Draco-compressed.
    const binaryBody = undefined;

    const customAttributes = [];
    const metadata = parseBatchTable({
      count: 3,
      batchTable: binaryBatchTable,
      binaryBody: binaryBody,
      parseAsPropertyAttributes: true,
      customAttributeOutput: customAttributes,
    });

    expect(customAttributes.length).toBe(2);

    // Since the original properties is an unordered collection, sort
    // to be sure of the order
    const [heightAttribute, windDirectionAttribute] = customAttributes.sort(
      sortByName
    );
    expect(heightAttribute.name).toBe("_HEIGHT");
    expect(heightAttribute.count).toBe(3);
    expect(heightAttribute.type).toBe("SCALAR");
    expect(heightAttribute.componentDatatype).toBe(ComponentDatatype.FLOAT);
    expect(heightAttribute.typedArray).toEqual(
      binaryBatchTable.height.typedArray
    );

    expect(windDirectionAttribute.name).toBe("_WINDDIRECTION");
    expect(windDirectionAttribute.count).toBe(3);
    expect(windDirectionAttribute.type).toBe("VEC2");
    expect(windDirectionAttribute.componentDatatype).toBe(
      ComponentDatatype.FLOAT
    );
    expect(windDirectionAttribute.typedArray).toEqual(
      binaryBatchTable.windDirection.typedArray
    );

    // No property table will be created.
    const propertyTable = metadata.getPropertyTable(0);
    expect(propertyTable).not.toBeDefined();

    expect(metadata.propertyAttributes.length).toBe(1);
    const [propertyAttribute] = metadata.propertyAttributes;
    const metadataClass = propertyAttribute.class;
    expect(metadataClass.id).toBe(MetadataClass.BATCH_TABLE_CLASS_NAME);
    const heightClassProperty = metadataClass.properties.height;
    expect(heightClassProperty.name).toBe("height");
    expect(heightClassProperty.type).toBe(MetadataType.SCALAR);
    expect(heightClassProperty.componentType).toBe(
      MetadataComponentType.FLOAT32
    );
    const windClassProperty = metadataClass.properties["windDirection"];
    expect(windClassProperty.name).toBe("windDirection");
    expect(windClassProperty.type).toBe(MetadataType.VEC2);
    expect(windClassProperty.componentType).toBe(MetadataComponentType.FLOAT32);

    const properties = propertyAttribute.properties;
    const heightProperty = properties.height;
    expect(heightProperty.attribute).toBe("_HEIGHT");
    const windProperty = properties.windDirection;
    expect(windProperty.attribute).toBe("_WINDDIRECTION");
  });
});
