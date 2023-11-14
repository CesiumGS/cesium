import { ModelExperimentalType } from "../../../Source/Cesium.js";

describe("Scene/ModelExperimental/ModelExperimentalType", function () {
  it("is3DTiles works", function () {
    expect(ModelExperimentalType.is3DTiles(ModelExperimentalType.GLTF)).toBe(
      false
    );
    expect(
      ModelExperimentalType.is3DTiles(ModelExperimentalType.TILE_GLTF)
    ).toBe(true);
    expect(
      ModelExperimentalType.is3DTiles(ModelExperimentalType.TILE_B3DM)
    ).toBe(true);
    expect(
      ModelExperimentalType.is3DTiles(ModelExperimentalType.TILE_I3DM)
    ).toBe(true);
    expect(
      ModelExperimentalType.is3DTiles(ModelExperimentalType.TILE_PNTS)
    ).toBe(true);
  });

  it("is3DTiles throws for invalid value", function () {
    expect(function () {
      return ModelExperimentalType.is3DTiles("4DTiles");
    }).toThrowDeveloperError();
  });

  it("is3DTiles throws without modelType", function () {
    expect(function () {
      return ModelExperimentalType.is3DTiles();
    }).toThrowDeveloperError();
  });

  it("is3DTiles throws with invalid modelType", function () {
    expect(function () {
      return ModelExperimentalType.is3DTiles(10);
    }).toThrowDeveloperError();
  });
});
