import { Cartesian3, MetadataTable } from "../../Source/Cesium.js";
import MetadataTester from "../MetadataTester.js";

describe("Scene/MetadataTable", function () {
  if (!MetadataTester.isSupported()) {
    return;
  }

  var enums = {
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
    var metadataTable = new MetadataTable({
      count: 10,
    });

    expect(metadataTable.count).toBe(10);
    expect(metadataTable.class).toBeUndefined();
  });

  it("creates metadata table", function () {
    var properties = {
      height: {
        type: "FLOAT32",
      },
      name: {
        type: "STRING",
      },
    };
    var propertyValues = {
      height: [1.0, 2.0],
      name: ["A", "B"],
    };

    var metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    var expectedPropertyNames = ["height", "name"];

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
      return new MetadataTable({});
    }).toThrowDeveloperError();
  });

  it("constructor throws if count is less than 1", function () {
    expect(function () {
      return new MetadataTable({
        count: 0,
      });
    }).toThrowDeveloperError();
  });

  it("hasProperty returns false when there's no properties", function () {
    var metadataTable = new MetadataTable({
      count: 10,
    });
    expect(metadataTable.hasProperty("height")).toBe(false);
  });

  it("hasProperty returns false when there's no property with the given property ID", function () {
    var properties = {
      height: {
        type: "FLOAT32",
      },
    };
    var propertyValues = {
      height: [1.0, 2.0],
    };
    var metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    expect(metadataTable.hasProperty("color")).toBe(false);
  });

  it("hasProperty returns true when there's a property with the given property ID", function () {
    var properties = {
      height: {
        type: "FLOAT32",
      },
    };
    var propertyValues = {
      height: [1.0, 2.0],
    };
    var metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    expect(metadataTable.hasProperty("height")).toBe(true);
  });

  it("hasProperty returns true when the class has a default value for a missing property", function () {
    var properties = {
      height: {
        type: "FLOAT32",
        default: 10.0,
        optional: true,
      },
      name: {
        type: "STRING",
      },
    };
    var propertyValues = {
      name: ["A", "B"],
    };

    var metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    expect(metadataTable.hasProperty("height")).toBe(true);
  });

  it("hasProperty throws without propertyId", function () {
    var metadataTable = new MetadataTable({
      count: 10,
    });
    expect(function () {
      metadataTable.hasProperty();
    }).toThrowDeveloperError();
  });

  it("hasPropertyBySemantic returns false when there's no properties", function () {
    var metadataTable = new MetadataTable({
      count: 10,
    });
    expect(metadataTable.hasPropertyBySemantic("HEIGHT")).toBe(false);
  });

  it("hasPropertyBySemantic returns false when there's no property with the given semantic", function () {
    var properties = {
      height: {
        type: "FLOAT32",
      },
    };
    var propertyValues = {
      height: [1.0, 2.0],
    };
    var metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    expect(metadataTable.hasPropertyBySemantic("HEIGHT")).toBe(false);
  });

  it("hasPropertyBySemantic returns true when there's a property with the given semantic", function () {
    var properties = {
      height: {
        type: "FLOAT32",
        semantic: "HEIGHT",
      },
    };
    var propertyValues = {
      height: [1.0, 2.0],
    };
    var metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    expect(metadataTable.hasPropertyBySemantic("HEIGHT")).toBe(true);
  });

  it("hasPropertyBySemantic returns true when the class has a default value for a missing property", function () {
    var properties = {
      height: {
        type: "FLOAT32",
        semantic: "HEIGHT",
        default: 10.0,
        optional: true,
      },
      name: {
        type: "STRING",
      },
    };
    var propertyValues = {
      name: ["A", "B"],
    };

    var metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    expect(metadataTable.hasPropertyBySemantic("HEIGHT")).toBe(true);
  });

  it("hasPropertyBySemantic throws without semantic", function () {
    var metadataTable = new MetadataTable({
      count: 10,
    });
    expect(function () {
      metadataTable.hasPropertyBySemantic(undefined);
    }).toThrowDeveloperError();
  });

  it("getPropertyIds returns empty array when there are no properties", function () {
    var metadataTable = new MetadataTable({
      count: 10,
    });
    expect(metadataTable.getPropertyIds().length).toBe(0);
  });

  it("getPropertyIds returns array of property IDs", function () {
    var properties = {
      height: {
        type: "FLOAT32",
      },
      name: {
        type: "STRING",
      },
    };
    var propertyValues = {
      height: [1.0, 2.0],
      name: ["A", "B"],
    };

    var metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    expect(metadataTable.getPropertyIds().sort()).toEqual(["height", "name"]);
  });

  it("getPropertyIds includes properties with default values", function () {
    var properties = {
      height: {
        type: "FLOAT32",
        default: 10.0,
        optional: true,
      },
      name: {
        type: "STRING",
      },
    };
    var propertyValues = {
      name: ["A", "B"],
    };

    var metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    expect(metadataTable.getPropertyIds().sort()).toEqual(["height", "name"]);
  });

  it("getPropertyIds uses results argument", function () {
    var properties = {
      height: {
        type: "FLOAT32",
      },
      name: {
        type: "STRING",
      },
    };
    var propertyValues = {
      height: [1.0, 2.0],
      name: ["A", "B"],
    };

    var metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    var results = [];
    var returnedResults = metadataTable.getPropertyIds(results);

    expect(results).toBe(returnedResults);
    expect(results.sort()).toEqual(["height", "name"]);
  });

  it("getProperty", function () {
    var properties = {
      propertyInt8: {
        type: "INT8",
      },
    };

    var propertyValues = [-128, 10];

    var metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: {
        propertyInt8: propertyValues,
      },
    });

    var length = propertyValues.length;
    for (var i = 0; i < length; ++i) {
      var value = metadataTable.getProperty(i, "propertyInt8");
      expect(value).toEqual(propertyValues[i]);
    }
  });

  it("getProperty returns undefined when there's no properties", function () {
    var metadataTable = new MetadataTable({
      count: 10,
    });
    expect(metadataTable.getProperty(0, "height")).toBeUndefined();
  });

  it("getProperty returns undefined when there's no property with the given property ID", function () {
    var properties = {
      height: {
        type: "FLOAT32",
      },
    };
    var propertyValues = {
      height: [1.0, 2.0],
    };
    var metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    expect(metadataTable.getProperty(0, "name")).toBeUndefined();
  });

  it("getProperty returns the default value when the property is missing", function () {
    var position = [0.0, 0.0, 0.0];

    var properties = {
      position: {
        type: "VEC3",
        componentType: "FLOAT32",
        optional: true,
        default: position,
      },
      name: {
        type: "STRING",
      },
      type: {
        type: "ENUM",
        enumType: "myEnum",
        optional: true,
        default: "Other",
      },
    };
    var propertyValues = {
      name: ["A", "B"],
    };

    var metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
      enums: enums,
    });

    var value = metadataTable.getProperty(0, "position");
    expect(value).toEqual(Cartesian3.unpack(position));

    expect(metadataTable.getProperty(0, "type")).toBe("Other");
  });

  it("getProperty throws without index", function () {
    var properties = {
      height: {
        type: "FLOAT32",
      },
    };
    var propertyValues = {
      height: [1.0, 2.0],
    };
    var metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    expect(function () {
      metadataTable.getProperty();
    }).toThrowDeveloperError();
  });

  it("getProperty throws without propertyId", function () {
    var properties = {
      height: {
        type: "FLOAT32",
      },
    };
    var propertyValues = {
      height: [1.0, 2.0],
    };
    var metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    expect(function () {
      metadataTable.getProperty(0);
    }).toThrowDeveloperError();
  });

  it("getProperty throws if index is out of bounds", function () {
    var properties = {
      height: {
        type: "FLOAT32",
      },
    };
    var propertyValues = {
      height: [1.0, 2.0],
    };
    var metadataTable = MetadataTester.createMetadataTable({
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
    var properties = {
      propertyInt8: {
        type: "INT8",
      },
    };

    var propertyValues = [0, 0];
    var valuesToSet = [-128, 10];

    var metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: {
        propertyInt8: propertyValues,
      },
    });

    var length = valuesToSet.length;
    for (var i = 0; i < length; ++i) {
      expect(metadataTable.setProperty(i, "propertyInt8", valuesToSet[i])).toBe(
        true
      );
      var value = metadataTable.getProperty(i, "propertyInt8");
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
    var properties = {
      height: {
        type: "FLOAT32",
      },
    };
    var propertyValues = {
      height: [1.0, 2.0],
    };
    var metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    expect(metadataTable.setProperty(0, "name", "A")).toBe(false);
  });

  it("setProperty throws without index", function () {
    var properties = {
      height: {
        type: "FLOAT32",
      },
    };
    var propertyValues = {
      height: [1.0, 2.0],
    };
    var metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    expect(function () {
      metadataTable.setProperty();
    }).toThrowDeveloperError();
  });

  it("setProperty throws without propertyId", function () {
    var properties = {
      height: {
        type: "FLOAT32",
      },
    };
    var propertyValues = {
      height: [1.0, 2.0],
    };
    var metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    expect(function () {
      metadataTable.setProperty(0);
    }).toThrowDeveloperError();
  });

  it("setProperty throws without value", function () {
    var properties = {
      height: {
        type: "FLOAT32",
      },
    };
    var propertyValues = {
      height: [1.0, 2.0],
    };
    var metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    expect(function () {
      metadataTable.setProperty(0, "height");
    }).toThrowDeveloperError();
  });

  it("setProperty throws if index is out of bounds", function () {
    var properties = {
      height: {
        type: "FLOAT32",
      },
    };
    var propertyValues = {
      height: [1.0, 2.0],
    };
    var metadataTable = MetadataTester.createMetadataTable({
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
    var metadataTable = new MetadataTable({
      count: 10,
    });
    expect(metadataTable.getPropertyBySemantic(0, "_HEIGHT")).toBeUndefined();
  });

  it("getPropertyBySemantic returns undefined when there's no property with the given semantic", function () {
    var properties = {
      height: {
        type: "FLOAT32",
      },
    };
    var propertyValues = {
      height: [1.0, 2.0],
    };
    var metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    expect(metadataTable.getPropertyBySemantic(0, "_HEIGHT")).toBeUndefined();
  });

  it("getPropertyBySemantic returns the property value", function () {
    var properties = {
      height: {
        type: "FLOAT32",
        semantic: "_HEIGHT",
      },
    };
    var propertyValues = {
      height: [1.0, 2.0],
    };
    var metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    expect(metadataTable.getPropertyBySemantic(0, "_HEIGHT")).toBe(1.0);
  });

  it("getPropertyBySemantic throws without index", function () {
    var properties = {
      height: {
        type: "FLOAT32",
        semantic: "_HEIGHT",
      },
    };
    var propertyValues = {
      height: [1.0, 2.0],
    };
    var metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    expect(function () {
      metadataTable.getPropertyBySemantic();
    }).toThrowDeveloperError();
  });

  it("getPropertyBySemantic throws without semantic", function () {
    var properties = {
      height: {
        type: "FLOAT32",
        semantic: "_HEIGHT",
      },
    };
    var propertyValues = {
      height: [1.0, 2.0],
    };
    var metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    expect(function () {
      metadataTable.getPropertyBySemantic(0);
    }).toThrowDeveloperError();
  });

  it("getPropertyBySemantic throws if index is out of bounds", function () {
    var properties = {
      height: {
        type: "FLOAT32",
        semantic: "_HEIGHT",
      },
    };
    var propertyValues = {
      height: [1.0, 2.0],
    };
    var metadataTable = MetadataTester.createMetadataTable({
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
    var metadataTable = new MetadataTable({
      count: 10,
    });

    metadataTable.setPropertyBySemantic(0, "_HEIGHT", 20.0);
    expect(metadataTable.getPropertyBySemantic(0, "_HEIGHT")).toBeUndefined();
  });

  it("setPropertyBySemantic returns false if the semantic doesn't exist", function () {
    var properties = {
      height: {
        type: "FLOAT32",
      },
    };
    var propertyValues = {
      height: [1.0, 2.0],
    };
    var metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    expect(metadataTable.setPropertyBySemantic(0, "_HEIGHT", 20.0)).toBe(false);
  });

  it("setPropertyBySemantic sets property value", function () {
    var properties = {
      height: {
        type: "FLOAT32",
        semantic: "_HEIGHT",
      },
    };
    var propertyValues = {
      height: [1.0, 2.0],
    };
    var metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    expect(metadataTable.setPropertyBySemantic(0, "_HEIGHT", 20.0)).toBe(true);
    expect(metadataTable.getPropertyBySemantic(0, "_HEIGHT")).toBe(20.0);
  });

  it("setPropertyBySemantic throws without index", function () {
    var properties = {
      height: {
        type: "FLOAT32",
        semantic: "_HEIGHT",
      },
    };
    var propertyValues = {
      height: [1.0, 2.0],
    };
    var metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    expect(function () {
      metadataTable.setPropertyBySemantic();
    }).toThrowDeveloperError();
  });

  it("setPropertyBySemantic throws without semantic", function () {
    var properties = {
      height: {
        type: "FLOAT32",
        semantic: "_HEIGHT",
      },
    };
    var propertyValues = {
      height: [1.0, 2.0],
    };
    var metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    expect(function () {
      metadataTable.setPropertyBySemantic(0);
    }).toThrowDeveloperError();
  });

  it("setPropertyBySemantic throws without value", function () {
    var properties = {
      height: {
        type: "FLOAT32",
        semantic: "_HEIGHT",
      },
    };
    var propertyValues = {
      height: [1.0, 2.0],
    };
    var metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    expect(function () {
      metadataTable.setPropertyBySemantic(0, "_HEIGHT");
    }).toThrowDeveloperError();
  });

  it("setPropertyBySemantic throws if index is out of bounds", function () {
    var properties = {
      height: {
        type: "FLOAT32",
        semantic: "_HEIGHT",
      },
    };
    var propertyValues = {
      height: [1.0, 2.0],
    };
    var metadataTable = MetadataTester.createMetadataTable({
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
    var properties = {
      height: {
        type: "FLOAT32",
      },
    };
    var propertyValues = {
      height: [1.0, 2.0],
    };

    var metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    var expectedTypedArray = new Float32Array([1.0, 2.0]);

    expect(metadataTable.getPropertyTypedArray("height")).toEqual(
      expectedTypedArray
    );
  });

  it("getPropertyTypedArray returns undefined if property does not exist", function () {
    var properties = {
      height: {
        type: "FLOAT32",
      },
    };
    var propertyValues = {
      height: [1.0, 2.0],
    };

    var metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    expect(metadataTable.getPropertyTypedArray("volume")).toBeUndefined();
  });

  it("getPropertyTypedArray throws if propertyId is undefined", function () {
    var metadataTable = new MetadataTable({
      count: 10,
    });

    expect(function () {
      metadataTable.getPropertyTypedArray(undefined);
    }).toThrowDeveloperError();
  });

  it("getPropertyTypedArrayBySemantic returns typed array", function () {
    var properties = {
      height: {
        type: "FLOAT32",
        semantic: "HEIGHT",
      },
    };
    var propertyValues = {
      height: [1.0, 2.0],
    };

    var metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    var expectedTypedArray = new Float32Array([1.0, 2.0]);

    expect(metadataTable.getPropertyTypedArrayBySemantic("HEIGHT")).toEqual(
      expectedTypedArray
    );
  });

  it("getPropertyTypedArrayBySemantic returns undefined if semantic does not exist", function () {
    var properties = {
      height: {
        type: "FLOAT32",
      },
    };
    var propertyValues = {
      height: [1.0, 2.0],
    };

    var metadataTable = MetadataTester.createMetadataTable({
      properties: properties,
      propertyValues: propertyValues,
    });

    expect(
      metadataTable.getPropertyTypedArrayBySemantic("HEIGHT")
    ).toBeUndefined();
  });

  it("getPropertyTypedArrayBySemantic throws if semantic is undefined", function () {
    var metadataTable = new MetadataTable({
      count: 10,
    });

    expect(function () {
      metadataTable.getPropertyTypedArrayBySemantic(undefined);
    }).toThrowDeveloperError();
  });
});
