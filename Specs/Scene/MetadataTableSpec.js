import { Cartesian3, MetadataTable } from "../../Source/Cesium.js";
import MetadataTester from "../MetadataTester.js";

describe("Scene/MetadataTable", function () {
  if (!MetadataTester.isSupported()) {
    return;
  }

  const enums = {
    myEnum: {
      values: [
        {
          value: 0,
          name: "ValueA",
        },
        {
          value: 1,
          name: "ValueB",
        },
        {
          value: 999,
          name: "Other",
        },
      ],
    },
  };

  it("creates metadata table with default values", function () {
    const metadataTable = new MetadataTable({
      count: 10,
      class: {},
    });

    expect(metadataTable.count).toBe(10);
  });

  it("creates metadata table", function () {
    const properties = {
      height: {
        type: "SCALAR",
        componentType: "FLOAT32",
      },
      name: {
        type: "STRING",
      },
    };
    const propertyValues = {
      height: [1.0, 2.0],
      name: ["A", "B"],
    };

    const metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    const expectedPropertyNames = ["height", "name"];

    expect(metadataTable.count).toBe(2);
    expect(metadataTable.getPropertyIds().sort()).toEqual(
      expectedPropertyNames
    );
    expect(Object.keys(metadataTable.class.properties).sort()).toEqual(
      expectedPropertyNames
    );
  });

  it("constructor throws without count", function () {
    expect(function () {
      return new MetadataTable({
        class: {},
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws if count is less than 1", function () {
    expect(function () {
      return new MetadataTable({
        count: 0,
        class: {},
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws if class is undefined", function () {
    expect(function () {
      return new MetadataTable({
        count: 1,
        class: undefined,
      });
    }).toThrowDeveloperError();
  });

  it("hasProperty returns false when there's no properties", function () {
    const metadataTable = new MetadataTable({
      count: 10,
      class: {},
    });
    expect(metadataTable.hasProperty("height")).toBe(false);
  });

  it("hasProperty returns false when there's no property with the given property ID", function () {
    const properties = {
      height: {
        type: "SCALAR",
        componentType: "FLOAT32",
      },
    };
    const propertyValues = {
      height: [1.0, 2.0],
    };
    const metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    expect(metadataTable.hasProperty("color")).toBe(false);
  });

  it("hasProperty returns true when there's a property with the given property ID", function () {
    const properties = {
      height: {
        type: "SCALAR",
        componentType: "FLOAT32",
      },
    };
    const propertyValues = {
      height: [1.0, 2.0],
    };
    const metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    expect(metadataTable.hasProperty("height")).toBe(true);
  });

  it("hasProperty returns true when the class has a default value for a missing property", function () {
    const properties = {
      height: {
        type: "SCALAR",
        componentType: "FLOAT32",
        default: 10.0,
        optional: true,
      },
      name: {
        type: "STRING",
      },
    };
    const propertyValues = {
      name: ["A", "B"],
    };

    const metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    expect(metadataTable.hasProperty("height")).toBe(true);
  });

  it("hasProperty throws without propertyId", function () {
    const metadataTable = new MetadataTable({
      count: 10,
      class: {},
    });
    expect(function () {
      metadataTable.hasProperty();
    }).toThrowDeveloperError();
  });

  it("hasPropertyBySemantic returns false when there's no properties", function () {
    const metadataTable = new MetadataTable({
      count: 10,
      class: {},
    });
    expect(metadataTable.hasPropertyBySemantic("HEIGHT")).toBe(false);
  });

  it("hasPropertyBySemantic returns false when there's no property with the given semantic", function () {
    const properties = {
      height: {
        type: "SCALAR",
        componentType: "FLOAT32",
      },
    };
    const propertyValues = {
      height: [1.0, 2.0],
    };
    const metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    expect(metadataTable.hasPropertyBySemantic("HEIGHT")).toBe(false);
  });

  it("hasPropertyBySemantic returns true when there's a property with the given semantic", function () {
    const properties = {
      height: {
        type: "SCALAR",
        componentType: "FLOAT32",
        semantic: "HEIGHT",
      },
    };
    const propertyValues = {
      height: [1.0, 2.0],
    };
    const metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    expect(metadataTable.hasPropertyBySemantic("HEIGHT")).toBe(true);
  });

  it("hasPropertyBySemantic returns true when the class has a default value for a missing property", function () {
    const properties = {
      height: {
        type: "SCALAR",
        componentType: "FLOAT32",
        semantic: "HEIGHT",
        default: 10.0,
        optional: true,
      },
      name: {
        type: "STRING",
      },
    };
    const propertyValues = {
      name: ["A", "B"],
    };

    const metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    expect(metadataTable.hasPropertyBySemantic("HEIGHT")).toBe(true);
  });

  it("hasPropertyBySemantic throws without semantic", function () {
    const metadataTable = new MetadataTable({
      count: 10,
      class: {},
    });
    expect(function () {
      metadataTable.hasPropertyBySemantic(undefined);
    }).toThrowDeveloperError();
  });

  it("getPropertyIds returns empty array when there are no properties", function () {
    const metadataTable = new MetadataTable({
      count: 10,
      class: {},
    });
    expect(metadataTable.getPropertyIds().length).toBe(0);
  });

  it("getPropertyIds returns array of property IDs", function () {
    const properties = {
      height: {
        type: "SCALAR",
        componentType: "FLOAT32",
      },
      name: {
        type: "STRING",
      },
    };
    const propertyValues = {
      height: [1.0, 2.0],
      name: ["A", "B"],
    };

    const metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    expect(metadataTable.getPropertyIds().sort()).toEqual(["height", "name"]);
  });

  it("getPropertyIds includes properties with default values", function () {
    const properties = {
      height: {
        type: "SCALAR",
        componentType: "FLOAT32",
        default: 10.0,
        optional: true,
      },
      name: {
        type: "STRING",
      },
    };
    const propertyValues = {
      name: ["A", "B"],
    };

    const metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    expect(metadataTable.getPropertyIds().sort()).toEqual(["height", "name"]);
  });

  it("getPropertyIds uses results argument", function () {
    const properties = {
      height: {
        type: "SCALAR",
        componentType: "FLOAT32",
      },
      name: {
        type: "STRING",
      },
    };
    const propertyValues = {
      height: [1.0, 2.0],
      name: ["A", "B"],
    };

    const metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    const results = [];
    const returnedResults = metadataTable.getPropertyIds(results);

    expect(results).toBe(returnedResults);
    expect(results.sort()).toEqual(["height", "name"]);
  });

  it("getProperty", function () {
    const properties = {
      propertyInt8: {
        type: "SCALAR",
        componentType: "INT8",
      },
    };

    const propertyValues = [-128, 10];

    const metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: {
        propertyInt8: propertyValues,
      },
    });

    const length = propertyValues.length;
    for (let i = 0; i < length; ++i) {
      const value = metadataTable.getProperty(i, "propertyInt8");
      expect(value).toEqual(propertyValues[i]);
    }
  });

  it("getProperty returns undefined when there's no properties", function () {
    const metadataTable = new MetadataTable({
      count: 10,
      class: {},
    });
    expect(metadataTable.getProperty(0, "height")).toBeUndefined();
  });

  it("getProperty returns undefined when there's no property with the given property ID", function () {
    const properties = {
      height: {
        type: "SCALAR",
        componentType: "FLOAT32",
      },
    };
    const propertyValues = {
      height: [1.0, 2.0],
    };
    const metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    expect(metadataTable.getProperty(0, "name")).toBeUndefined();
  });

  it("getProperty returns the default value when the property is missing", function () {
    const position = [0, 0, 0];
    const defaultBoundingSphere = [0, 0, 0, 1];

    const properties = {
      position: {
        type: "VEC3",
        componentType: "FLOAT32",
        required: false,
        default: position,
      },
      name: {
        type: "STRING",
      },
      type: {
        type: "ENUM",
        enumType: "myEnum",
        required: false,
        default: "Other",
      },
      boundingSphere: {
        type: "SCALAR",
        componentType: "FLOAT64",
        array: true,
        count: 4,
        default: defaultBoundingSphere,
      },
    };
    const propertyValues = {
      name: ["A", "B"],
    };

    const metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
      enums: enums,
    });

    const value = metadataTable.getProperty(0, "position");
    expect(value).toEqual(Cartesian3.unpack(position));

    expect(metadataTable.getProperty(0, "type")).toBe("Other");

    const sphere = metadataTable.getProperty(0, "boundingSphere");
    expect(sphere).toEqual(defaultBoundingSphere);
    expect(sphere).not.toBe(defaultBoundingSphere); // it should clone the value
  });

  it("getProperty throws without index", function () {
    const properties = {
      height: {
        type: "SCALAR",
        componentType: "FLOAT32",
      },
    };
    const propertyValues = {
      height: [1.0, 2.0],
    };
    const metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    expect(function () {
      metadataTable.getProperty();
    }).toThrowDeveloperError();
  });

  it("getProperty throws without propertyId", function () {
    const properties = {
      height: {
        type: "SCALAR",
        componentType: "FLOAT32",
      },
    };
    const propertyValues = {
      height: [1.0, 2.0],
    };
    const metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    expect(function () {
      metadataTable.getProperty(0);
    }).toThrowDeveloperError();
  });

  it("getProperty throws if index is out of bounds", function () {
    const properties = {
      height: {
        type: "SCALAR",
        componentType: "FLOAT32",
      },
    };
    const propertyValues = {
      height: [1.0, 2.0],
    };
    const metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });
    expect(function () {
      metadataTable.getProperty(-1, "height");
    }).toThrowDeveloperError();

    expect(metadataTable.getProperty(0, "height")).toBe(1.0);
    expect(metadataTable.getProperty(1, "height")).toBe(2.0);

    expect(function () {
      metadataTable.getProperty(2, "height");
    }).toThrowDeveloperError();
  });

  it("setProperty sets values", function () {
    const properties = {
      propertyInt8: {
        type: "SCALAR",
        componentType: "INT8",
      },
    };

    const propertyValues = [0, 0];
    const valuesToSet = [-128, 10];

    const metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: {
        propertyInt8: propertyValues,
      },
    });

    const length = valuesToSet.length;
    for (let i = 0; i < length; ++i) {
      expect(metadataTable.setProperty(i, "propertyInt8", valuesToSet[i])).toBe(
        true
      );
      let value = metadataTable.getProperty(i, "propertyInt8");
      expect(value).toEqual(valuesToSet[i]);
      // Test setting / getting again
      expect(metadataTable.setProperty(i, "propertyInt8", valuesToSet[i])).toBe(
        true
      );
      value = metadataTable.getProperty(i, "propertyInt8");
      expect(value).toEqual(valuesToSet[i]);
    }
  });

  it("setProperty returns false if the property ID doesn't exist", function () {
    const properties = {
      height: {
        type: "SCALAR",
        componentType: "FLOAT32",
      },
    };
    const propertyValues = {
      height: [1.0, 2.0],
    };
    const metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    expect(metadataTable.setProperty(0, "name", "A")).toBe(false);
  });

  it("setProperty throws without index", function () {
    const properties = {
      height: {
        type: "SCALAR",
        componentType: "FLOAT32",
      },
    };
    const propertyValues = {
      height: [1.0, 2.0],
    };
    const metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    expect(function () {
      metadataTable.setProperty();
    }).toThrowDeveloperError();
  });

  it("setProperty throws without propertyId", function () {
    const properties = {
      height: {
        type: "SCALAR",
        componentType: "FLOAT32",
      },
    };
    const propertyValues = {
      height: [1.0, 2.0],
    };
    const metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    expect(function () {
      metadataTable.setProperty(0);
    }).toThrowDeveloperError();
  });

  it("setProperty throws without value", function () {
    const properties = {
      height: {
        type: "SCALAR",
        componentType: "FLOAT32",
      },
    };
    const propertyValues = {
      height: [1.0, 2.0],
    };
    const metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    expect(function () {
      metadataTable.setProperty(0, "height");
    }).toThrowDeveloperError();
  });

  it("setProperty throws if index is out of bounds", function () {
    const properties = {
      height: {
        type: "SCALAR",
        componentType: "FLOAT32",
      },
    };
    const propertyValues = {
      height: [1.0, 2.0],
    };
    const metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    expect(function () {
      metadataTable.setProperty(-1, "height", 0.0);
    }).toThrowDeveloperError();

    metadataTable.setProperty(0, "height", 0.0);
    metadataTable.setProperty(1, "height", 0.0);

    expect(function () {
      metadataTable.setProperty(2, "height", 0.0);
    }).toThrowDeveloperError();
  });

  it("getPropertyBySemantic returns undefined when there's no class", function () {
    const metadataTable = new MetadataTable({
      count: 10,
      class: {},
    });
    expect(metadataTable.getPropertyBySemantic(0, "_HEIGHT")).toBeUndefined();
  });

  it("getPropertyBySemantic returns undefined when there's no property with the given semantic", function () {
    const properties = {
      height: {
        type: "SCALAR",
        componentType: "FLOAT32",
      },
    };
    const propertyValues = {
      height: [1.0, 2.0],
    };
    const metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    expect(metadataTable.getPropertyBySemantic(0, "_HEIGHT")).toBeUndefined();
  });

  it("getPropertyBySemantic returns the property value", function () {
    const properties = {
      height: {
        type: "SCALAR",
        componentType: "FLOAT32",
        semantic: "_HEIGHT",
      },
    };
    const propertyValues = {
      height: [1.0, 2.0],
    };
    const metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    expect(metadataTable.getPropertyBySemantic(0, "_HEIGHT")).toBe(1.0);
  });

  it("getPropertyBySemantic throws without index", function () {
    const properties = {
      height: {
        type: "SCALAR",
        componentType: "FLOAT32",
        semantic: "_HEIGHT",
      },
    };
    const propertyValues = {
      height: [1.0, 2.0],
    };
    const metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    expect(function () {
      metadataTable.getPropertyBySemantic();
    }).toThrowDeveloperError();
  });

  it("getPropertyBySemantic throws without semantic", function () {
    const properties = {
      height: {
        type: "SCALAR",
        componentType: "FLOAT32",
        semantic: "_HEIGHT",
      },
    };
    const propertyValues = {
      height: [1.0, 2.0],
    };
    const metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    expect(function () {
      metadataTable.getPropertyBySemantic(0);
    }).toThrowDeveloperError();
  });

  it("getPropertyBySemantic throws if index is out of bounds", function () {
    const properties = {
      height: {
        type: "SCALAR",
        componentType: "FLOAT32",
        semantic: "_HEIGHT",
      },
    };
    const propertyValues = {
      height: [1.0, 2.0],
    };
    const metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    expect(function () {
      metadataTable.getPropertyBySemantic(-1, "_HEIGHT");
    }).toThrowDeveloperError();

    metadataTable.getPropertyBySemantic(0, "_HEIGHT");
    metadataTable.getPropertyBySemantic(1, "_HEIGHT");

    expect(function () {
      metadataTable.getPropertyBySemantic(2, "_HEIGHT");
    }).toThrowDeveloperError();
  });

  it("setPropertyBySemantic doesn't set property value when there's no class", function () {
    const metadataTable = new MetadataTable({
      count: 10,
      class: {},
    });

    metadataTable.setPropertyBySemantic(0, "_HEIGHT", 20.0);
    expect(metadataTable.getPropertyBySemantic(0, "_HEIGHT")).toBeUndefined();
  });

  it("setPropertyBySemantic returns false if the semantic doesn't exist", function () {
    const properties = {
      height: {
        type: "SCALAR",
        componentType: "FLOAT32",
      },
    };
    const propertyValues = {
      height: [1.0, 2.0],
    };
    const metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    expect(metadataTable.setPropertyBySemantic(0, "_HEIGHT", 20.0)).toBe(false);
  });

  it("setPropertyBySemantic sets property value", function () {
    const properties = {
      height: {
        type: "SCALAR",
        componentType: "FLOAT32",
        semantic: "_HEIGHT",
      },
    };
    const propertyValues = {
      height: [1.0, 2.0],
    };
    const metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    expect(metadataTable.setPropertyBySemantic(0, "_HEIGHT", 20.0)).toBe(true);
    expect(metadataTable.getPropertyBySemantic(0, "_HEIGHT")).toBe(20.0);
  });

  it("setPropertyBySemantic throws without index", function () {
    const properties = {
      height: {
        type: "SCALAR",
        componentType: "FLOAT32",
        semantic: "_HEIGHT",
      },
    };
    const propertyValues = {
      height: [1.0, 2.0],
    };
    const metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    expect(function () {
      metadataTable.setPropertyBySemantic();
    }).toThrowDeveloperError();
  });

  it("setPropertyBySemantic throws without semantic", function () {
    const properties = {
      height: {
        type: "SCALAR",
        componentType: "FLOAT32",
        semantic: "_HEIGHT",
      },
    };
    const propertyValues = {
      height: [1.0, 2.0],
    };
    const metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    expect(function () {
      metadataTable.setPropertyBySemantic(0);
    }).toThrowDeveloperError();
  });

  it("setPropertyBySemantic throws without value", function () {
    const properties = {
      height: {
        type: "SCALAR",
        componentType: "FLOAT32",
        semantic: "_HEIGHT",
      },
    };
    const propertyValues = {
      height: [1.0, 2.0],
    };
    const metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    expect(function () {
      metadataTable.setPropertyBySemantic(0, "_HEIGHT");
    }).toThrowDeveloperError();
  });

  it("setPropertyBySemantic throws if index is out of bounds", function () {
    const properties = {
      height: {
        type: "SCALAR",
        componentType: "FLOAT32",
        semantic: "_HEIGHT",
      },
    };
    const propertyValues = {
      height: [1.0, 2.0],
    };
    const metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    expect(function () {
      metadataTable.setPropertyBySemantic(-1, "_HEIGHT", 0.0);
    }).toThrowDeveloperError();

    metadataTable.setPropertyBySemantic(0, "_HEIGHT", 0.0);
    metadataTable.setPropertyBySemantic(1, "_HEIGHT", 0.0);

    expect(function () {
      metadataTable.setPropertyBySemantic(2, "_HEIGHT", 0.0);
    }).toThrowDeveloperError();
  });

  it("getPropertyTypedArray returns typed array", function () {
    const properties = {
      height: {
        type: "SCALAR",
        componentType: "FLOAT32",
      },
    };
    const propertyValues = {
      height: [1.0, 2.0],
    };

    const metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    const expectedTypedArray = new Float32Array([1.0, 2.0]);

    expect(metadataTable.getPropertyTypedArray("height")).toEqual(
      expectedTypedArray
    );
  });

  it("getPropertyTypedArray returns undefined if property does not exist", function () {
    const properties = {
      height: {
        type: "SCALAR",
        componentType: "FLOAT32",
      },
    };
    const propertyValues = {
      height: [1.0, 2.0],
    };

    const metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    expect(metadataTable.getPropertyTypedArray("volume")).toBeUndefined();
  });

  it("getPropertyTypedArray throws if propertyId is undefined", function () {
    const metadataTable = new MetadataTable({
      count: 10,
      class: {},
    });

    expect(function () {
      metadataTable.getPropertyTypedArray(undefined);
    }).toThrowDeveloperError();
  });

  it("getPropertyTypedArrayBySemantic returns typed array", function () {
    const properties = {
      height: {
        type: "SCALAR",
        componentType: "FLOAT32",
        semantic: "HEIGHT",
      },
    };
    const propertyValues = {
      height: [1.0, 2.0],
    };

    const metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    const expectedTypedArray = new Float32Array([1.0, 2.0]);

    expect(metadataTable.getPropertyTypedArrayBySemantic("HEIGHT")).toEqual(
      expectedTypedArray
    );
  });

  it("getPropertyTypedArrayBySemantic returns undefined if semantic does not exist", function () {
    const properties = {
      height: {
        type: "SCALAR",
        componentType: "FLOAT32",
      },
    };
    const propertyValues = {
      height: [1.0, 2.0],
    };

    const metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    expect(
      metadataTable.getPropertyTypedArrayBySemantic("HEIGHT")
    ).toBeUndefined();
  });

  it("getPropertyTypedArrayBySemantic throws if semantic is undefined", function () {
    const metadataTable = new MetadataTable({
      count: 10,
      class: {},
    });

    expect(function () {
      metadataTable.getPropertyTypedArrayBySemantic(undefined);
    }).toThrowDeveloperError();
  });
});
