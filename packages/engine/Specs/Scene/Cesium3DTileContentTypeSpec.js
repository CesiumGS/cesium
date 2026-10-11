import { Cesium3DTileContentType } from "../../index.js";

describe("Scene/Cesium3DTileContentType", function () {
  it("isBinaryFormat correctly identifies binary contents", function () {
    const types = [
      "b3dm",
      "i3dm",
      "glb",
      "vctr",
      "geom",
      "subt",
      "cmpt",
      "pnts",
      "subtreeGlb",
    ];
    types.map(function (type) {
      expect(Cesium3DTileContentType.isBinaryFormat(type)).toBe(true);
    });
  });

  it("isBinaryFormat returns false for other content types", function () {
    const types = [
      "gltf",
      "subtreeJson",
      "subtreeGltf",
      "externalTileset",
      "multipleContent",
      "geoJson",
      "notAMagic",
    ];
    types.map(function (type) {
      expect(Cesium3DTileContentType.isBinaryFormat(type)).toBe(false);
    });
  });

  it("isSubtree correctly identifies subtree contents", function () {
    const types = ["subt", "subtreeJson", "subtreeGltf", "subtreeGlb"];
    types.map(function (type) {
      expect(Cesium3DTileContentType.isSubtree(type)).toBe(true);
    });
  });

  it("isSubtree returns false for other content types", function () {
    const types = [
      "b3dm",
      "glb",
      "gltf",
      "externalTileset",
      "multipleContent",
      "geoJson",
      "notAMagic",
    ];
    types.map(function (type) {
      expect(Cesium3DTileContentType.isSubtree(type)).toBe(false);
    });
  });
});
