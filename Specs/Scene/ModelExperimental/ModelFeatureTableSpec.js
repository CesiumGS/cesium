import {
  Cesium3DTileFeature,
  ModelExperimentalType,
  ModelFeatureTable,
  ModelFeature,
} from "../../../Source/Cesium.js";
import MetadataTester from "../../MetadataTester.js";

describe("Scene/ModelExperimental/ModelFeatureTable", function () {
  let mockPropertyTable;
  let properties;
  let propertyValues;
  beforeAll(function () {
    properties = {
      height: {
        semantic: "HEIGHT_SEMANTIC",
        type: "SCALAR",
        componentType: "FLOAT32",
      },
      name: {
        type: "STRING",
      },
      HEIGHT_SEMANTIC: {
        type: "SCALAR",
        componentType: "FLOAT32",
      },
    };

    propertyValues = {
      height: [1.0, 2.0],
      name: ["A", "B"],
      HEIGHT_SEMANTIC: [3.0, 4.0],
    };

    mockPropertyTable = MetadataTester.createPropertyTable({
      properties: properties,
      propertyValues: propertyValues,
    });
  });

  it("creates ModelFeatures when model does not have content", function () {
    const table = new ModelFeatureTable({
      propertyTable: mockPropertyTable,
      model: {
        type: ModelExperimentalType.GLTF,
      },
    });
    expect(table._featuresLength).toEqual(mockPropertyTable.count);
    const modelFeatures = table._features;
    for (let i = 0; i < modelFeatures.length; i++) {
      const feature = table.getFeature(i);
      expect(feature).toBeInstanceOf(ModelFeature);
    }
  });

  it("creates ModelFeatures when model has content", function () {
    const table = new ModelFeatureTable({
      propertyTable: mockPropertyTable,
      model: {
        content: {
          tileset: {},
        },
        type: ModelExperimentalType.TILE_GLTF,
      },
    });
    expect(table._featuresLength).toEqual(mockPropertyTable.count);
    const modelFeatures = table._features;
    for (let i = 0; i < modelFeatures.length; i++) {
      const feature = table.getFeature(i);
      expect(feature).toBeInstanceOf(Cesium3DTileFeature);
    }
  });

  it("hasProperty works", function () {
    const table = new ModelFeatureTable({
      model: {
        type: ModelExperimentalType.GLTF,
      },
      propertyTable: mockPropertyTable,
    });
    const modelFeatures = table._features;
    for (let i = 0; i < modelFeatures.length; i++) {
      const feature = modelFeatures[i];
      expect(feature.hasProperty("height")).toEqual(true);
      expect(feature.hasProperty("width")).toEqual(false);
    }
  });

  it("hasPropertyBySemantic works", function () {
    const table = new ModelFeatureTable({
      model: {
        type: ModelExperimentalType.GLTF,
      },
      propertyTable: mockPropertyTable,
    });
    const modelFeatures = table._features;
    for (let i = 0; i < modelFeatures.length; i++) {
      const feature = modelFeatures[i];
      expect(feature.hasPropertyBySemantic("HEIGHT_SEMANTIC")).toEqual(true);
      expect(feature.hasPropertyBySemantic("WIDTH_SEMANTIC")).toEqual(false);
    }
  });

  it("getFeature works", function () {
    const table = new ModelFeatureTable({
      model: {
        type: ModelExperimentalType.GLTF,
      },
      propertyTable: mockPropertyTable,
    });
    expect(table._featuresLength).toEqual(mockPropertyTable.count);
    const modelFeatures = table._features;
    for (let i = 0; i < modelFeatures.length; i++) {
      const feature = table.getFeature(i);
      expect(feature).toEqual(modelFeatures[i]);
      expect(feature).toBeInstanceOf(ModelFeature);
    }
  });

  it("getProperty works", function () {
    const table = new ModelFeatureTable({
      model: {
        type: ModelExperimentalType.GLTF,
      },
      propertyTable: mockPropertyTable,
    });
    expect(table._featuresLength).toEqual(mockPropertyTable.count);
    const modelFeatures = table._features;

    for (const propertyName in properties) {
      if (properties.hasOwnProperty(propertyName)) {
        for (let i = 0; i < modelFeatures.length; i++) {
          const feature = modelFeatures[i];
          expect(feature.getProperty(propertyName)).toEqual(
            propertyValues[propertyName][i]
          );
        }
      }
    }
  });

  it("getPropertyInherited works", function () {
    const table = new ModelFeatureTable({
      model: {
        type: ModelExperimentalType.GLTF,
      },
      propertyTable: mockPropertyTable,
    });
    expect(table._featuresLength).toEqual(mockPropertyTable.count);
    const modelFeatures = table._features;

    let i;
    let feature;

    for (i = 0; i < modelFeatures.length; i++) {
      feature = modelFeatures[i];
      expect(feature.getPropertyInherited("height")).toEqual(
        propertyValues["height"][i]
      );
      expect(feature.getPropertyInherited("_height")).toBeUndefined();
    }

    // Check if the semantic is prioritized over the property name.
    for (i = 0; i < modelFeatures.length; i++) {
      feature = modelFeatures[i];
      expect(feature.getPropertyInherited("HEIGHT_SEMANTIC")).toEqual(
        propertyValues["height"][i]
      );
      expect(feature.getPropertyInherited("_HEIGHT_")).toBeUndefined();
    }
  });

  it("getPropertyNames works", function () {
    const table = new ModelFeatureTable({
      model: {
        type: ModelExperimentalType.GLTF,
      },
      propertyTable: mockPropertyTable,
    });
    const modelFeatures = table._features;
    let results;
    for (let i = 0; i < modelFeatures.length; i++) {
      results = [];
      const feature = modelFeatures[i];
      expect(feature.getPropertyNames(results)).toEqual([
        "height",
        "name",
        "HEIGHT_SEMANTIC",
      ]);
    }
  });

  it("setProperty works", function () {
    const table = new ModelFeatureTable({
      model: {
        type: ModelExperimentalType.GLTF,
      },
      propertyTable: mockPropertyTable,
    });
    const feature = table._features[0];
    expect(feature.getProperty("height")).toEqual(1.0);
    expect(feature.setProperty("height", 3.0)).toEqual(true);
    expect(feature.getProperty("height")).toEqual(3.0);
  });

  it("destroy works", function () {
    const table = new ModelFeatureTable({
      model: {
        type: ModelExperimentalType.GLTF,
      },
      propertyTable: mockPropertyTable,
    });
    const batchTexture = table._batchTexture;
    expect(batchTexture.isDestroyed()).toEqual(false);
    expect(table.isDestroyed()).toEqual(false);

    table.destroy();

    expect(batchTexture.isDestroyed()).toEqual(true);
    expect(table.isDestroyed()).toEqual(true);
  });
});
