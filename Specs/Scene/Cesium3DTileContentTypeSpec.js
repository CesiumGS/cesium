import { Cesium3DTileContentType } from "../../Source/Cesium.js";

describe("Scene/Cesium3DTileContentType", function () {
  it("isBinaryFormat correctly identifies binary contents", function () {
    var types = ["b3dm", "i3dm", "glb", "vect", "geom", "subt", "cmpt", "pnts"];
    types.map(function (type) {
      expect(Cesium3DTileContentType.isBinaryFormat(type)).toBe(true);
    });
  });

  it("isBinaryFormat returns false for other content types", function () {
    var types = ["glTF", "external", "multipleContent", "notAMagic"];
    types.map(function (type) {
      expect(Cesium3DTileContentType.isBinaryFormat(type)).toBe(false);
    });
  });
});
