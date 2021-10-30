import { TileBoundingVolume } from "../../Source/Cesium.js";

describe("Scene/TileBoundingVolume", function () {
  it("throws", function () {
    var boundingVolume = new TileBoundingVolume();
    expect(function () {
      boundingVolume.createDebugVolume();
    }).toThrowDeveloperError();
    expect(function () {
      boundingVolume.distanceToCamera();
    }).toThrowDeveloperError();
    expect(function () {
      boundingVolume.intersectPlane();
    }).toThrowDeveloperError();
  });
});
