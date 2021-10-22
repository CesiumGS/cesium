import {
  Cesium3DTileFeature,
  ModelFeatureTable,
  ModelFeature,
} from "../../../Source/Cesium.js";
import MetadataTester from "../../MetadataTester.js";

describe("Scene/ModelExperimental/ModelFeatureTable", function () {
  var properties = {
    height: {
      componentType: "FLOAT32",
    },
    name: {
      componentType: "STRING",
    },
  };
  var propertyValues = {
    height: [1.0, 2.0],
    name: ["A", "B"],
  };

  var mockPropertyTable = MetadataTester.createPropertyTable({
    properties: properties,
    propertyValues: propertyValues,
  });

  it("creates ModelFeatures when model does not have content", function () {
    var table = new ModelFeatureTable({
      propertyTable: mockPropertyTable,
      model: {},
    });
    expect(table._featuresLength).toEqual(mockPropertyTable.count);
    var modelFeatures = table._features;
    for (var i = 0; i < modelFeatures.length; i++) {
      var feature = table.getFeature(i);
      expect(feature).toBeInstanceOf(ModelFeature);
    }
  });

  it("creates ModelFeatures when model has content", function () {
    var table = new ModelFeatureTable({
      propertyTable: mockPropertyTable,
      model: {
        content: {
          tileset: {},
        },
      },
    });
    expect(table._featuresLength).toEqual(mockPropertyTable.count);
    var modelFeatures = table._features;
    for (var i = 0; i < modelFeatures.length; i++) {
      var feature = table.getFeature(i);
      expect(feature).toBeInstanceOf(Cesium3DTileFeature);
    }
  });

  it("hasProperty works", function () {
    var table = new ModelFeatureTable({
      model: {},
      propertyTable: mockPropertyTable,
    });
    var modelFeatures = table._features;
    for (var i = 0; i < modelFeatures.length; i++) {
      var feature = modelFeatures[i];
      expect(feature.hasProperty("height")).toEqual(true);
      expect(feature.hasProperty("width")).toEqual(false);
    }
  });

  it("getFeature works", function () {
    var table = new ModelFeatureTable({
      model: {},
      propertyTable: mockPropertyTable,
    });
    expect(table._featuresLength).toEqual(mockPropertyTable.count);
    var modelFeatures = table._features;
    for (var i = 0; i < modelFeatures.length; i++) {
      var feature = table.getFeature(i);
      expect(feature).toEqual(modelFeatures[i]);
      expect(feature).toBeInstanceOf(ModelFeature);
    }
  });

  it("getProperty works", function () {
    var table = new ModelFeatureTable({
      model: {},
      propertyTable: mockPropertyTable,
    });
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

  it("getPropertyNames works", function () {
    var table = new ModelFeatureTable({
      model: {},
      propertyTable: mockPropertyTable,
    });
    var modelFeatures = table._features;
    var results;
    for (var i = 0; i < modelFeatures.length; i++) {
      results = [];
      var feature = modelFeatures[i];
      expect(feature.getPropertyNames(results)).toEqual(["height", "name"]);
    }
  });

  it("setProperty works", function () {
    var table = new ModelFeatureTable({
      model: {},
      propertyTable: mockPropertyTable,
    });
    var feature = table._features[0];
    expect(feature.getProperty("height")).toEqual(1.0);
    expect(feature.setProperty("height", 3.0)).toEqual(true);
    expect(feature.getProperty("height")).toEqual(3.0);
  });

  it("destroy works", function () {
    var table = new ModelFeatureTable({
      model: {},
      propertyTable: mockPropertyTable,
    });
    var batchTexture = table._batchTexture;
    expect(batchTexture.isDestroyed()).toEqual(false);
    expect(table.isDestroyed()).toEqual(false);

    table.destroy();

    expect(batchTexture.isDestroyed()).toEqual(true);
    expect(table.isDestroyed()).toEqual(true);
  });
});
