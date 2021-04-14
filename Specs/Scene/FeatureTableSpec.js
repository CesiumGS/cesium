import { MetadataClass, FeatureTable } from "../../Source/Cesium.js";
import MetadataTester from "../MetadataTester.js";

describe("Scene/FeatureTable", function () {
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

  var classDefinition = new MetadataClass({
    id: "test",
    class: {
      properties: properties,
    },
  });

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
      featureTable: {
        count: 3,
      },
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

  it("constructor throws without featureTable", function () {
    expect(function () {
      return new FeatureTable({
        class: classDefinition,
        bufferViews: {},
      });
    }).toThrowDeveloperError();
  });

  it("hasProperty returns true if a property exists", function () {
    var featureTable = createFeatureTable();
    expect(featureTable.hasProperty("name")).toBe(true);
  });

  it("hasProperty returns false if a property does not exist", function () {
    var featureTable = createFeatureTable();
    expect(featureTable.hasProperty("numberOfPoints")).toBe(false);
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

  it("setPropertyBySemantic sets property value", function () {
    var featureTable = createFeatureTable();
    expect(featureTable.getPropertyBySemantic(0, "NAME")).toEqual("Building A");
    expect(featureTable.setPropertyBySemantic(0, "NAME", "Building New")).toBe(
      true
    );
  });

  it("setPropertyBySemantic throws if the semantic does not exist", function () {
    var featureTable = createFeatureTable();
    expect(featureTable.setPropertyBySemantic(0, "ID", 10)).toBe(false);
  });

  describe("batch table compatibility", function () {
    it("getProperty uses feature metadata", function () {
      fail();
    });

    it("getProperty uses JSON metadata", function () {
      fail();
    });

    it("getProperty uses batch table hierarchy", function () {
      fail();
    });
  });
});
