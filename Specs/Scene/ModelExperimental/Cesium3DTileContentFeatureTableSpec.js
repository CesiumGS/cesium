import {
  Cesium3DTileContentFeatureTable,
  Cesium3DTileFeature,
} from "../../../Source/Cesium.js";
import MetadataTester from "../../MetadataTester.js";

describe("Scene/ModelExperimental/Cesium3DTileContentFeatureTable", function () {
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

  var mockContent = {
    tileset: {
      statistics: {},
    },
  };
  var mockPropertyTable = MetadataTester.createPropertyTable({
    properties: properties,
    propertyValues: propertyValues,
  });

  it("hasProperty works", function () {
    var table = new Cesium3DTileContentFeatureTable({
      content: mockContent,
      propertyTable: mockPropertyTable,
    });
    mockContent.batchTable = table;
    var modelFeatures = table._features;
    for (var i = 0; i < modelFeatures.length; i++) {
      var feature = modelFeatures[i];
      expect(feature.hasProperty("height")).toEqual(true);
      expect(feature.hasProperty("width")).toEqual(false);
    }
  });

  it("getFeature works", function () {
    var table = new Cesium3DTileContentFeatureTable({
      content: mockContent,
      propertyTable: mockPropertyTable,
    });
    mockContent.batchTable = table;
    expect(table._featuresLength).toEqual(mockPropertyTable.count);
    var modelFeatures = table._features;
    for (var i = 0; i < modelFeatures.length; i++) {
      var feature = table.getFeature(i);
      expect(feature).toEqual(modelFeatures[i]);
      expect(feature).toBeInstanceOf(Cesium3DTileFeature);
    }
  });

  it("getProperty works", function () {
    var table = new Cesium3DTileContentFeatureTable({
      content: mockContent,
      propertyTable: mockPropertyTable,
    });
    mockContent.batchTable = table;
    expect(table._featuresLength).toEqual(mockPropertyTable.count);
    var modelFeatures = table._features;

    for (var propertyName in properties) {
      if (properties.hasOwnProperty(propertyName)) {
        for (var i = 0; i < modelFeatures.length; i++) {
          var feature = modelFeatures[i];
          expect(feature.getProperty(propertyName)).toEqual(
            propertyValues[propertyName][i]
          );
        }
      }
    }
  });

  it("getPropertyInherited works", function () {
    var table = new Cesium3DTileContentFeatureTable({
      content: mockContent,
      propertyTable: mockPropertyTable,
    });
    mockContent.batchTable = table;
    expect(table._featuresLength).toEqual(mockPropertyTable.count);
    var modelFeatures = table._features;

    for (var propertyName in properties) {
      if (properties.hasOwnProperty(propertyName)) {
        for (var i = 0; i < modelFeatures.length; i++) {
          var feature = modelFeatures[i];
          expect(feature.getPropertyInherited(propertyName)).toEqual(
            propertyValues[propertyName][i]
          );
        }
      }
    }
  });

  it("getPropertyNames works", function () {
    var table = new Cesium3DTileContentFeatureTable({
      content: mockContent,
      propertyTable: mockPropertyTable,
    });
    mockContent.batchTable = table;
    var modelFeatures = table._features;
    var results;
    for (var i = 0; i < modelFeatures.length; i++) {
      results = [];
      var feature = modelFeatures[i];
      expect(feature.getPropertyNames(results)).toEqual(["height", "name"]);
    }
  });

  it("setProperty works", function () {
    var table = new Cesium3DTileContentFeatureTable({
      content: mockContent,
      propertyTable: mockPropertyTable,
    });
    mockContent.batchTable = table;
    var feature = table._features[0];
    expect(feature.getProperty("height")).toEqual(1.0);
    feature.setProperty("height", 3.0);
    expect(feature.getProperty("height")).toEqual(3.0);
  });

  it("destroy works", function () {
    var table = new Cesium3DTileContentFeatureTable({
      content: mockContent,
      propertyTable: mockPropertyTable,
    });
    mockContent.batchTable = table;
    var batchTexture = table._batchTexture;
    expect(batchTexture.isDestroyed()).toEqual(false);
    expect(table.isDestroyed()).toEqual(false);

    table.destroy();

    expect(batchTexture.isDestroyed()).toEqual(true);
    expect(table.isDestroyed()).toEqual(true);
  });
});
