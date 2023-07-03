import { Cesium3DTileContent } from "../../index.js";

describe("Scene/Cesium3DTileContent", function () {
  it("throws", function () {
    const content = new Cesium3DTileContent();
    expect(function () {
      return content.featuresLength;
    }).toThrowDeveloperError();
    expect(function () {
      return content.pointsLength;
    }).toThrowDeveloperError();
    expect(function () {
      return content.trianglesLength;
    }).toThrowDeveloperError();
    expect(function () {
      return content.geometryByteLength;
    }).toThrowDeveloperError();
    expect(function () {
      return content.texturesByteLength;
    }).toThrowDeveloperError();
    expect(function () {
      return content.batchTableByteLength;
    }).toThrowDeveloperError();
    expect(function () {
      return content.innerContents;
    }).toThrowDeveloperError();
    expect(function () {
      return content.tileset;
    }).toThrowDeveloperError();
    expect(function () {
      return content.tile;
    }).toThrowDeveloperError();
    expect(function () {
      return content.url;
    }).toThrowDeveloperError();
    expect(function () {
      return content.batchTable;
    }).toThrowDeveloperError();
    expect(function () {
      return content.group;
    }).toThrowDeveloperError();
    expect(function () {
      content.group = {};
    }).toThrowDeveloperError();
    expect(function () {
      return content.hasProperty(0, "height");
    }).toThrowDeveloperError();
    expect(function () {
      return content.getFeature(0);
    }).toThrowDeveloperError();
    expect(function () {
      content.applyDebugSettings();
    }).toThrowDeveloperError();
    expect(function () {
      content.applyStyle();
    }).toThrowDeveloperError();
    expect(function () {
      content.update();
    }).toThrowDeveloperError();
    expect(function () {
      content.isDestroyed();
    }).toThrowDeveloperError();
    expect(function () {
      content.destroy();
    }).toThrowDeveloperError();
  });
});
