import { ModelType } from "../../../Source/Cesium.js";

describe("Scene/Model/ModelType", function () {
  it("is3DTiles works", function () {
    expect(ModelType.is3DTiles(ModelType.GLTF)).toBe(false);
    expect(ModelType.is3DTiles(ModelType.TILE_GLTF)).toBe(true);
    expect(ModelType.is3DTiles(ModelType.TILE_B3DM)).toBe(true);
    expect(ModelType.is3DTiles(ModelType.TILE_I3DM)).toBe(true);
    expect(ModelType.is3DTiles(ModelType.TILE_PNTS)).toBe(true);
    expect(ModelType.is3DTiles(ModelType.TILE_GEOJSON)).toBe(true);
  });

  it("is3DTiles throws for invalid value", function () {
    expect(function () {
      return ModelType.is3DTiles("4DTiles");
    }).toThrowDeveloperError();
  });

  it("is3DTiles throws without modelType", function () {
    expect(function () {
      return ModelType.is3DTiles();
    }).toThrowDeveloperError();
  });

  it("is3DTiles throws with invalid modelType", function () {
    expect(function () {
      return ModelType.is3DTiles(10);
    }).toThrowDeveloperError();
  });
});
