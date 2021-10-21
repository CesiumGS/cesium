import {
  BatchTableHierarchy,
  PropertyTable,
  MetadataSchema,
  MetadataTable,
  JsonMetadataTable,
} from "../../Source/Cesium.js";
import MetadataTester from "../MetadataTester.js";

describe("Scene/PropertyTable", function () {
  if (!MetadataTester.isSupported()) {
    return;
  }

  var properties = {
    name: {
      componentType: "STRING",
      semantic: "NAME",
    },
    height: {
      componentType: "FLOAT32",
      semantic: "HEIGHT",
    },
  };

  var propertyValues = {
    name: ["Building A", "Building B", "Building C"],
    height: [10.0, 20.0, 30.0],
  };

  var extras = {
    description: "Extra",
  };
  var extensions = {
    EXT_other_extension: {},
  };

  function createPropertyTable() {
    return MetadataTester.createPropertyTable({
      properties: properties,
      propertyValues: propertyValues,
      extras: extras,
      extensions: extensions,
    });
  }

  it("creates feature table with default values", function () {
    var propertyTable = new PropertyTable({
      count: 3,
    });
    expect(propertyTable.count).toBe(3);
    expect(propertyTable.class).toBeUndefined();
    expect(propertyTable.extras).toBeUndefined();
    expect(propertyTable.extensions).toBeUndefined();
  });

  it("creates feature table", function () {
    var propertyTable = createPropertyTable();
    expect(propertyTable.count).toBe(3);
    expect(propertyTable.class).toBeDefined();
    expect(propertyTable.getPropertyIds().length).toBe(2);
    expect(propertyTable.getProperty(0, "name")).toBe("Building A");
    expect(propertyTable.getProperty(1, "name")).toBe("Building B");
    expect(propertyTable.getProperty(2, "name")).toBe("Building C");
    expect(propertyTable.getProperty(0, "height")).toBe(10.0);
    expect(propertyTable.getProperty(1, "height")).toBe(20.0);
    expect(propertyTable.getProperty(2, "height")).toBe(30.0);
    expect(propertyTable.extras).toBe(extras);
    expect(propertyTable.extensions).toBe(extensions);
  });

  it("constructor throws without count", function () {
    expect(function () {
      return new PropertyTable({});
    }).toThrowDeveloperError();
  });

  it("hasProperty throws without index", function () {
    var propertyTable = createPropertyTable();
    expect(function () {
      propertyTable.hasProperty(undefined, "name");
    }).toThrowDeveloperError();
  });

  it("hasProperty throws without propertyId", function () {
    var propertyTable = createPropertyTable();
    expect(function () {
      propertyTable.hasProperty(0, undefined);
    }).toThrowDeveloperError();
  });

  it("hasProperty returns true if the feature has this property", function () {
    var propertyTable = createPropertyTable();
    expect(propertyTable.hasProperty(0, "name")).toBe(true);
  });

  it("hasProperty returns false if the feature does not have this property", function () {
    var propertyTable = createPropertyTable();
    expect(propertyTable.hasProperty(0, "numberOfPoints")).toBe(false);
  });

  it("hasPropertyBySemantic throws without index", function () {
    var propertyTable = createPropertyTable();
    expect(function () {
      propertyTable.hasPropertyBySemantic(undefined, "NAME");
    }).toThrowDeveloperError();
  });

  it("hasPropertyBySemantic throws without semantic", function () {
    var propertyTable = createPropertyTable();
    expect(function () {
      propertyTable.hasPropertyBySemantic(0, undefined);
    }).toThrowDeveloperError();
  });

  it("hasPropertyBySemantic returns true if the feature has a property with the given semantic", function () {
    var propertyTable = createPropertyTable();
    expect(propertyTable.hasPropertyBySemantic(0, "NAME")).toBe(true);
  });

  it("hasPropertyBySemantic returns false if the feature does not a property with the given semantic", function () {
    var propertyTable = createPropertyTable();
    expect(propertyTable.hasPropertyBySemantic(0, "ID")).toBe(false);
  });

  it("propertyExists throws without propertyId", function () {
    var propertyTable = createPropertyTable();
    expect(function () {
      propertyTable.propertyExists(undefined);
    }).toThrowDeveloperError();
  });

  it("propertyExists returns true if the property exists", function () {
    var propertyTable = createPropertyTable();
    expect(propertyTable.propertyExists("name")).toBe(true);
  });

  it("propertyExists returns false if the property does not exist", function () {
    var propertyTable = createPropertyTable();
    expect(propertyTable.propertyExists("numberOfPoints")).toBe(false);
  });

  it("propertyExistsBySemantic throws without semantic", function () {
    var propertyTable = createPropertyTable();
    expect(function () {
      propertyTable.propertyExistsBySemantic(undefined);
    }).toThrowDeveloperError();
  });

  it("propertyExistsBySemantic returns true if the property exists", function () {
    var propertyTable = createPropertyTable();
    expect(propertyTable.propertyExistsBySemantic("NAME")).toBe(true);
  });

  it("propertyExistsBySemantic returns false if the property does not exist", function () {
    var propertyTable = createPropertyTable();
    expect(propertyTable.propertyExistsBySemantic("ID")).toBe(false);
  });

  it("getPropertyIds returns array of property IDs", function () {
    var propertyTable = createPropertyTable();
    var propertyIds = propertyTable.getPropertyIds([]);
    propertyIds.sort();
    expect(propertyIds).toEqual(["height", "name"]);
  });

  it("getProperty returns undefined if a property does not exist", function () {
    var propertyTable = createPropertyTable();
    expect(propertyTable.getProperty(0, "numberOfPoints")).not.toBeDefined();
  });

  it("getProperty returns the property value", function () {
    var propertyTable = createPropertyTable();
    expect(propertyTable.getProperty(0, "name")).toEqual("Building A");
    expect(propertyTable.getProperty(0, "height")).toEqual(10.0);
  });

  it("setProperty does not create property if it doesn't exist", function () {
    var propertyTable = createPropertyTable();
    expect(propertyTable.setProperty(0, "numberOfPoints", 10)).toBe(false);
  });

  it("setProperty sets property value", function () {
    var propertyTable = createPropertyTable();
    expect(propertyTable.getProperty(0, "name")).toBe("Building A");
    propertyTable.setProperty(0, "name", "Building New");
    expect(propertyTable.getProperty(0, "name")).toBe("Building New");
  });

  it("getPropertyBySemantic returns undefined when there's no property with the given semantic", function () {
    var propertyTable = createPropertyTable();
    expect(propertyTable.getPropertyBySemantic(0, "ID")).not.toBeDefined();
  });

  it("getPropertyBySemantic returns the property value", function () {
    var propertyTable = createPropertyTable();
    expect(propertyTable.getPropertyBySemantic(0, "NAME")).toEqual(
      "Building A"
    );
  });

  it("getPropertyBySemantic returns undefined if there is no metadataTable", function () {
    var propertyTable = new PropertyTable({
      count: 3,
    });
    expect(propertyTable.getPropertyBySemantic(0, "NAME")).not.toBeDefined();
  });

  it("setPropertyBySemantic sets property value", function () {
    var propertyTable = createPropertyTable();
    expect(propertyTable.getPropertyBySemantic(0, "NAME")).toEqual(
      "Building A"
    );
    expect(propertyTable.setPropertyBySemantic(0, "NAME", "Building New")).toBe(
      true
    );
  });

  it("setPropertyBySemantic returns false if the semantic does not exist", function () {
    var propertyTable = createPropertyTable();
    expect(propertyTable.setPropertyBySemantic(0, "ID", 10)).toBe(false);
  });

  it("setPropertyBySemantic returns false if there is no metadata table", function () {
    var propertyTable = new PropertyTable({
      count: 3,
    });
    expect(propertyTable.setPropertyBySemantic(0, "NAME")).toBe(false);
  });

  it("getPropertyTypedArray returns typed array", function () {
    var propertyTable = createPropertyTable();
    var expectedTypedArray = new Float32Array([10.0, 20.0, 30.0]);

    expect(propertyTable.getPropertyTypedArray("height")).toEqual(
      expectedTypedArray
    );
  });

  it("getPropertyTypedArray returns undefined if property does not exist", function () {
    var propertyTable = createPropertyTable();

    expect(propertyTable.getPropertyTypedArray("volume")).toBeUndefined();
  });

  it("getPropertyTypedArray throws if propertyId is undefined", function () {
    var propertyTable = createPropertyTable();

    expect(function () {
      propertyTable.getPropertyTypedArray(undefined);
    }).toThrowDeveloperError();
  });

  it("getPropertyTypedArrayBySemantic returns typed array", function () {
    var propertyTable = createPropertyTable();
    var expectedTypedArray = new Float32Array([10.0, 20.0, 30.0]);

    expect(propertyTable.getPropertyTypedArrayBySemantic("HEIGHT")).toEqual(
      expectedTypedArray
    );
  });

  it("getPropertyTypedArrayBySemantic returns undefined if semantic does not exist", function () {
    var propertyTable = createPropertyTable();

    expect(propertyTable.getPropertyTypedArrayBySemantic("ID")).toBeUndefined();
  });

  it("getPropertyTypedArrayBySemantic throws if semantic is undefined", function () {
    var propertyTable = createPropertyTable();

    expect(function () {
      propertyTable.getPropertyTypedArrayBySemantic(undefined);
    }).toThrowDeveloperError();
  });

  describe("batch table compatibility", function () {
    var schemaJson = {
      classes: {
        box: {
          properties: {
            itemId: {
              componentType: "UINT8",
            },
            itemCount: {
              componentType: "UINT16",
            },
          },
        },
      },
    };
    var schema = new MetadataSchema(schemaJson);

    var propertyTableJson = {
      count: 3,
      class: "box",
      properties: {
        itemId: {
          bufferView: 0,
        },
        itemCount: {
          bufferView: 1,
        },
      },
    };

    var bufferViews = {
      0: new Uint8Array([25, 32, 57]),
      1: new Uint8Array([25, 0, 5, 1, 50, 0]),
    };

    var jsonProperties = {
      priority: [2, 1, 0],
      uri: ["tree.las", "building.gltf", "map.tif"],
    };
    var count = 3;

    var hierarchyExtension = {
      classes: [
        {
          name: "Wheels",
          length: 2,
          instances: {
            tireLocation: ["front", "back"],
          },
        },
        {
          name: "Car",
          length: 1,
          instances: {
            color: ["blue"],
            type: ["sedan"],
            year: ["2020"],
          },
        },
      ],
      instancesLength: 3,
      classIds: [0, 0, 1],
      parentIds: [2, 2, 2],
      parentCounts: [1, 1, 0],
    };

    var batchTable;
    var batchTableJsonOnly;

    beforeEach(function () {
      var jsonTable = new JsonMetadataTable({
        count: count,
        properties: jsonProperties,
      });

      var hierarchy = new BatchTableHierarchy({
        extension: hierarchyExtension,
      });

      var metadataTable = new MetadataTable({
        count: count,
        properties: propertyTableJson.properties,
        class: schema.classes.box,
        bufferViews: bufferViews,
      });

      batchTable = new PropertyTable({
        count: count,
        metadataTable: metadataTable,
        jsonMetadataTable: jsonTable,
        batchTableHierarchy: hierarchy,
      });

      batchTableJsonOnly = new PropertyTable({
        count: count,
        jsonMetadataTable: jsonTable,
      });
    });

    it("getPropertyIds combines binary, json and hierarchy IDs", function () {
      var results = batchTable.getPropertyIds(0);
      expect(results.sort()).toEqual([
        "color",
        "itemCount",
        "itemId",
        "priority",
        "tireLocation",
        "type",
        "uri",
        "year",
      ]);
    });

    it("hasProperty uses feature metadata", function () {
      expect(batchTable.hasProperty(0, "itemId")).toBe(true);
      expect(batchTable.hasProperty(0, "itemCount")).toBe(true);
    });

    it("hasProperty uses JSON metadata", function () {
      expect(batchTable.hasProperty(0, "priority")).toBe(true);
      expect(batchTable.hasProperty(0, "uri")).toBe(true);
    });

    it("hasProperty uses batch table hierarchy", function () {
      expect(batchTable.hasProperty(0, "tireLocation")).toBe(true);
      expect(batchTable.hasProperty(0, "color")).toBe(true);
      expect(batchTable.hasProperty(0, "type")).toBe(true);
      expect(batchTable.hasProperty(0, "year")).toBe(true);

      expect(batchTable.hasProperty(1, "tireLocation")).toBe(true);
      expect(batchTable.hasProperty(1, "color")).toBe(true);
      expect(batchTable.hasProperty(1, "type")).toBe(true);
      expect(batchTable.hasProperty(1, "year")).toBe(true);

      expect(batchTable.hasProperty(2, "tireLocation")).toBe(false);
      expect(batchTable.hasProperty(2, "color")).toBe(true);
      expect(batchTable.hasProperty(2, "type")).toBe(true);
      expect(batchTable.hasProperty(2, "year")).toBe(true);
    });

    it("hasProperty returns false for unknown property", function () {
      expect(batchTable.hasProperty(0, "widgets")).toBe(false);
    });

    it("hasPropertyBySemantic returns false when there is no metadata table", function () {
      expect(batchTableJsonOnly.hasPropertyBySemantic(0, "NAME")).toBe(false);
    });

    it("propertyExists uses feature metadata", function () {
      expect(batchTable.propertyExists("itemId")).toBe(true);
      expect(batchTable.propertyExists("itemCount")).toBe(true);
    });

    it("propertyExists uses JSON metadata", function () {
      expect(batchTable.propertyExists("priority")).toBe(true);
      expect(batchTable.propertyExists("uri")).toBe(true);
    });

    it("propertyExists uses batch table hierarchy", function () {
      expect(batchTable.propertyExists("tireLocation")).toBe(true);
      expect(batchTable.propertyExists("color")).toBe(true);
      expect(batchTable.propertyExists("type")).toBe(true);
      expect(batchTable.propertyExists("year")).toBe(true);
    });

    it("propertyExists returns false for unknown property", function () {
      expect(batchTable.propertyExists("widgets")).toBe(false);
    });

    it("propertyExistsBySemantic returns false when there is no metadata table", function () {
      expect(batchTableJsonOnly.propertyExistsBySemantic("NAME")).toBe(false);
    });

    it("getProperty uses feature metadata", function () {
      expect(batchTable.getProperty(0, "itemId")).toBe(25);
      expect(batchTable.getProperty(0, "itemCount")).toBe(25);

      expect(batchTable.getProperty(1, "itemId")).toBe(32);
      expect(batchTable.getProperty(1, "itemCount")).toBe(261);

      expect(batchTable.getProperty(2, "itemId")).toBe(57);
      expect(batchTable.getProperty(2, "itemCount")).toBe(50);
    });

    it("getProperty uses JSON metadata", function () {
      expect(batchTable.getProperty(0, "priority")).toBe(2);
      expect(batchTable.getProperty(1, "priority")).toBe(1);
      expect(batchTable.getProperty(2, "priority")).toBe(0);

      expect(batchTable.getProperty(0, "uri")).toBe("tree.las");
      expect(batchTable.getProperty(1, "uri")).toBe("building.gltf");
      expect(batchTable.getProperty(2, "uri")).toBe("map.tif");
    });

    it("getProperty uses batch table hierarchy", function () {
      expect(batchTable.getProperty(0, "tireLocation")).toBe("front");
      expect(batchTable.getProperty(0, "color")).toBe("blue");
      expect(batchTable.getProperty(0, "type")).toBe("sedan");
      expect(batchTable.getProperty(0, "year")).toBe("2020");

      expect(batchTable.getProperty(1, "tireLocation")).toBe("back");
      expect(batchTable.getProperty(1, "color")).toBe("blue");
      expect(batchTable.getProperty(1, "type")).toBe("sedan");
      expect(batchTable.getProperty(1, "year")).toBe("2020");

      expect(batchTable.getProperty(2, "tireLocation")).not.toBeDefined();
      expect(batchTable.getProperty(2, "color")).toBe("blue");
      expect(batchTable.getProperty(2, "type")).toBe("sedan");
      expect(batchTable.getProperty(2, "year")).toBe("2020");
    });

    it("getProperty returns undefined for unknown propertyId", function () {
      expect(batchTable.getProperty(0, "widgets")).not.toBeDefined();
    });

    it("setProperty uses feature metadata", function () {
      expect(batchTable.getProperty(0, "itemCount")).toBe(25);
      expect(batchTable.setProperty(0, "itemCount", 24)).toBe(true);
      expect(batchTable.getProperty(0, "itemCount")).toBe(24);
    });

    it("setProperty uses JSON metadata", function () {
      expect(batchTable.getProperty(0, "uri")).toBe("tree.las");
      expect(batchTable.setProperty(0, "uri", "tree_final.las")).toBe(true);
      expect(batchTable.getProperty(0, "uri")).toBe("tree_final.las");
    });

    it("setProperty uses batch table hierarchy", function () {
      expect(batchTable.getProperty(0, "tireLocation")).toBe("front");
      expect(batchTable.getProperty(0, "color")).toBe("blue");

      expect(batchTable.getProperty(2, "tireLocation")).not.toBeDefined();
      expect(batchTable.getProperty(2, "color")).toBe("blue");

      expect(batchTable.setProperty(0, "tireLocation", "back")).toBe(true);
      expect(batchTable.setProperty(2, "color", "navy")).toBe(true);

      expect(batchTable.getProperty(0, "tireLocation")).toBe("back");
      expect(batchTable.getProperty(0, "color")).toBe("navy");

      expect(batchTable.getProperty(2, "tireLocation")).not.toBeDefined();
      expect(batchTable.getProperty(2, "color")).toBe("navy");
    });

    it("setProperty returns false for unknown propertyId", function () {
      expect(batchTable.setProperty(0, "widgets", 5)).toBe(false);
    });

    it("getPropertyTypedArray returns undefined for JSON and hierarchy properties", function () {
      expect(batchTable.getPropertyTypedArray("itemId")).toBeDefined();
      expect(batchTable.getPropertyTypedArray("priority")).not.toBeDefined();
      expect(
        batchTable.getPropertyTypedArray("tireLocation")
      ).not.toBeDefined();
    });

    it("getPropertyTypedArray returns undefined when there is no metadata table", function () {
      expect(
        batchTableJsonOnly.getPropertyTypedArray("priority")
      ).not.toBeDefined();
    });

    it("getPropertyTypedArrayBySemantic returns undefined when there is no metadata table", function () {
      expect(
        batchTableJsonOnly.getPropertyTypedArrayBySemantic("PRIORITY")
      ).not.toBeDefined();
    });
  });
});
