import {
  Color,
  ModelType,
  ModelFeature,
  ModelFeatureTable,
} from "../../../Source/Cesium.js";
import MetadataTester from "../../MetadataTester.js";

describe("Scene/Model/ModelFeature", function () {
  const mockModel = {
    type: ModelType.GLTF,
  };

  let feature;
  let featureTable;
  beforeEach(function () {
    const properties = {
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

    const propertyValues = {
      height: [1.0],
      name: ["A"],
      HEIGHT_SEMANTIC: [3.0],
    };

    const mockPropertyTable = MetadataTester.createPropertyTable({
      properties: properties,
      propertyValues: propertyValues,
    });
    featureTable = new ModelFeatureTable({
      propertyTable: mockPropertyTable,
      model: mockModel,
    });

    feature = featureTable.getFeature(0);
  });

  it("constructs", function () {
    const mockFeatureTable = {};
    const feature = new ModelFeature({
      model: mockModel,
      featureTable: mockFeatureTable,
      featureId: 3,
    });

    expect(feature.primitive).toBe(mockModel);
    expect(feature.featureTable).toBe(mockFeatureTable);
    expect(feature.featureId).toBe(3);
  });

  it("gets and sets show", function () {
    expect(feature.show).toBe(true);

    feature.show = false;
    expect(feature.show).toBe(false);
  });

  it("gets and sets color", function () {
    expect(feature.color).toEqual(new Color());
    feature.color = Color.RED;
    expect(feature.color).toEqual(Color.RED);
  });

  it("gets primitive", function () {
    expect(feature.primitive).toBe(mockModel);
  });

  it("gets featureTable", function () {
    expect(feature.featureTable).toBe(featureTable);
  });

  it("gets featureId", function () {
    expect(feature.featureId).toBe(0);
  });

  it("hasProperty works", function () {
    expect(feature.hasProperty("height")).toBe(true);
    expect(feature.hasProperty("width")).toBe(false);
  });

  it("getProperty works", function () {
    expect(feature.getProperty("height")).toBe(1.0);
    expect(feature.getProperty("name")).toBe("A");
    expect(feature.getProperty("HEIGHT_SEMANTIC")).toBe(3.0);
  });

  it("getPropertyInherited works", function () {
    expect(feature.getPropertyInherited("height")).toEqual(1.0);
    expect(feature.getPropertyInherited("_height")).toBeUndefined();
  });

  it("getPropertyIds works", function () {
    const results = [];
    expect(feature.getPropertyIds(results)).toEqual([
      "height",
      "name",
      "HEIGHT_SEMANTIC",
    ]);
  });

  it("setProperty works", function () {
    expect(feature.getProperty("height")).toEqual(1.0);
    feature.setProperty("height", 3.0);
    expect(feature.getProperty("height")).toEqual(3.0);
  });
});
