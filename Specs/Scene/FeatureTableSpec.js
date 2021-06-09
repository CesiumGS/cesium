import {
  BatchTableHierarchy,
  FeatureTable,
  MetadataSchema,
  MetadataTable,
  JsonMetadataTable,
} from "../../Source/Cesium.js";
import MetadataTester from "../MetadataTester.js";

describe("Scene/FeatureTable", function () {
  if (!MetadataTester.isSupported()) {
    return;
  }

  var properties = {
    name: {
      type: "STRING",
      semantic: "NAME",
    },
    height: {
      type: "FLOAT32",
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

  function createFeatureTable() {
    return MetadataTester.createFeatureTable({
      properties: properties,
      propertyValues: propertyValues,
      extras: extras,
      extensions: extensions,
    });
  }

  it("creates feature table with default values", function () {
    var featureTable = new FeatureTable({
      count: 3,
    });
    expect(featureTable.count).toBe(3);
    expect(featureTable.class).toBeUndefined();
    expect(featureTable.extras).toBeUndefined();
    expect(featureTable.extensions).toBeUndefined();
  });

  it("creates feature table", function () {
    var featureTable = createFeatureTable();
    expect(featureTable.count).toBe(3);
    expect(featureTable.class).toBeDefined();
    expect(featureTable.getPropertyIds().length).toBe(2);
    expect(featureTable.getProperty(0, "name")).toBe("Building A");
    expect(featureTable.getProperty(1, "name")).toBe("Building B");
    expect(featureTable.getProperty(2, "name")).toBe("Building C");
    expect(featureTable.getProperty(0, "height")).toBe(10.0);
    expect(featureTable.getProperty(1, "height")).toBe(20.0);
    expect(featureTable.getProperty(2, "height")).toBe(30.0);
    expect(featureTable.extras).toBe(extras);
    expect(featureTable.extensions).toBe(extensions);
  });

  it("constructor throws without count", function () {
    expect(function () {
      return new FeatureTable({});
    }).toThrowDeveloperError();
  });

  it("hasProperty throws without index", function () {
    var featureTable = createFeatureTable();
    expect(function () {
      featureTable.hasProperty(undefined, "name");
    }).toThrowDeveloperError();
  });

  it("hasProperty throws without propertyId", function () {
    var featureTable = createFeatureTable();
    expect(function () {
      featureTable.hasProperty(0, undefined);
    }).toThrowDeveloperError();
  });

  it("hasProperty returns true if a property exists", function () {
    var featureTable = createFeatureTable();
    expect(featureTable.hasProperty(0, "name")).toBe(true);
  });

  it("hasProperty returns false if a property does not exist", function () {
    var featureTable = createFeatureTable();
    expect(featureTable.hasProperty(0, "numberOfPoints")).toBe(false);
  });

  it("getPropertyIds returns array of property IDs", function () {
    var featureTable = createFeatureTable();
    var propertyIds = featureTable.getPropertyIds([]);
    propertyIds.sort();
    expect(propertyIds).toEqual(["height", "name"]);
  });

  it("getProperty returns undefined if a property does not exist", function () {
    var featureTable = createFeatureTable();
    expect(featureTable.getProperty(0, "numberOfPoints")).not.toBeDefined();
  });

  it("getProperty returns the property value", function () {
    var featureTable = createFeatureTable();
    expect(featureTable.getProperty(0, "name")).toEqual("Building A");
    expect(featureTable.getProperty(0, "height")).toEqual(10.0);
  });

  it("setProperty does not create property if it doesn't exist", function () {
    var featureTable = createFeatureTable();
    expect(featureTable.setProperty(0, "numberOfPoints", 10)).toBe(false);
  });

  it("setProperty sets property value", function () {
    var featureTable = createFeatureTable();
    expect(featureTable.getProperty(0, "name")).toBe("Building A");
    featureTable.setProperty(0, "name", "Building New");
    expect(featureTable.getProperty(0, "name")).toBe("Building New");
  });

  it("getPropertyBySemantic returns undefined when there's no property with the given semantic", function () {
    var featureTable = createFeatureTable();
    expect(featureTable.getPropertyBySemantic(0, "ID")).not.toBeDefined();
  });

  it("getPropertyBySemantic returns the property value", function () {
    var featureTable = createFeatureTable();
    expect(featureTable.getPropertyBySemantic(0, "NAME")).toEqual("Building A");
  });

  it("getPropertyBySemantic returns undefined if there is no metadataTable", function () {
    var featureTable = new FeatureTable({
      count: 3,
    });
    expect(featureTable.getPropertyBySemantic(0, "NAME")).not.toBeDefined();
  });

  it("setPropertyBySemantic sets property value", function () {
    var featureTable = createFeatureTable();
    expect(featureTable.getPropertyBySemantic(0, "NAME")).toEqual("Building A");
    expect(featureTable.setPropertyBySemantic(0, "NAME", "Building New")).toBe(
      true
    );
  });

  it("setPropertyBySemantic returns false if the semantic does not exist", function () {
    var featureTable = createFeatureTable();
    expect(featureTable.setPropertyBySemantic(0, "ID", 10)).toBe(false);
  });

  it("setPropertyBySemantic returns false if there is no metadata table", function () {
    var featureTable = new FeatureTable({
      count: 3,
    });
    expect(featureTable.setPropertyBySemantic(0, "NAME")).toBe(false);
  });

  it("getPropertyTypedArray returns typed array", function () {
    var featureTable = createFeatureTable();
    var expectedTypedArray = new Float32Array([10.0, 20.0, 30.0]);

    expect(featureTable.getPropertyTypedArray("height")).toEqual(
      expectedTypedArray
    );
  });

  it("getPropertyTypedArray returns undefined if property does not exist", function () {
    var featureTable = createFeatureTable();

    expect(featureTable.getPropertyTypedArray("volume")).toBeUndefined();
  });

  it("getPropertyTypedArray throws if propertyId is undefined", function () {
    var featureTable = createFeatureTable();

    expect(function () {
      featureTable.getPropertyTypedArray(undefined);
    }).toThrowDeveloperError();
  });

  describe("batch table compatibility", function () {
    var schemaJson = {
      classes: {
        box: {
          properties: {
            itemId: {
              type: "UINT8",
            },
            itemCount: {
              type: "UINT16",
            },
          },
        },
      },
    };
    var schema = new MetadataSchema(schemaJson);

    var featureTableJson = {
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
        properties: featureTableJson.properties,
        class: schema.classes.box,
        bufferViews: bufferViews,
      });

      batchTable = new FeatureTable({
        count: count,
        metadataTable: metadataTable,
        jsonMetadataTable: jsonTable,
        batchTableHierarchy: hierarchy,
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
  });
});
