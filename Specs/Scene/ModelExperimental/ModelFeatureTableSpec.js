import { ModelFeatureTable } from "../../../Source/Cesium.js";
import MetadataTester from "../../MetadataTester.js";

describe("Scene/ModelExperimental/ModelFeatureTable", function () {
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

  var mockMetadataTable = MetadataTester.createMetadataTable({
    properties: properties,
    propertyValues: propertyValues,
  });

  var mockFeatureTable = {
    count: mockMetadataTable.count,
    _metadataTable: mockMetadataTable,
  };

  it("getFeature works", function () {
    var table = new ModelFeatureTable({
      featureTable: mockFeatureTable,
    });
    expect(table._featuresLength).toEqual(mockMetadataTable.count);
    var modelFeatures = table._features;
    for (var i = 0; i < modelFeatures.length; i++) {
      expect(table.getFeature(i)).toEqual(modelFeatures[i]);
    }
  });

  it("getProperty works", function () {
    var table = new ModelFeatureTable({
      featureTable: mockFeatureTable,
    });
    expect(table._featuresLength).toEqual(mockMetadataTable.count);
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

  it("destroy works", function () {
    var table = new ModelFeatureTable({
      featureTable: mockFeatureTable,
    });
    var batchTexture = table._batchTexture;
    expect(batchTexture.isDestroyed()).toEqual(false);
    expect(table.isDestroyed()).toEqual(false);

    table.destroy();

    expect(batchTexture.isDestroyed()).toEqual(true);
    expect(table.isDestroyed()).toEqual(true);
  });
});
