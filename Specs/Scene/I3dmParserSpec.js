import { I3dmParser } from "../../Source/Cesium.js";
import Cesium3DTilesTester from "../Cesium3DTilesTester.js";
import createScene from "../createScene.js";

describe(
  "Scene/I3dmParser",
  function () {
    var scene;

    beforeAll(function () {
      scene = createScene();

      // Keep the error from logging to the console when running tests
      spyOn(I3dmParser, "_deprecationWarning");
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    afterEach(function () {
      scene.primitives.removeAll();
    });

    it("throws with undefined arrayBuffer", function () {
      expect(function () {
        I3dmParser.parse(undefined);
      }).toThrowDeveloperError();
    });

    it("throws with empty gltf", function () {
      // Expect to throw error due to invalid glTF magic.
      var arrayBuffer = Cesium3DTilesTester.generateInstancedTileBuffer();
      Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, "i3dm");
    });

    it("throws with unsupported I3DM version", function () {
      var arrayBuffer = Cesium3DTilesTester.generateInstancedTileBuffer({
        version: 2,
      });
      Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, "i3dm");
    });
  },
  "WebGL"
);
