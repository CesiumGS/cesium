import {
  B3dmParser,
  Cartesian3,
  HeadingPitchRange,
} from "../../Source/Cesium.js";
import Cesium3DTilesTester from "../Cesium3DTilesTester.js";
import createScene from "../createScene.js";

describe(
  "Scene/B3dmParser",
  function () {
    var scene;
    var centerLongitude = -1.31968;
    var centerLatitude = 0.698874;

    var deprecated1Url =
      "./Data/Cesium3DTiles/Batched/BatchedDeprecated1/tileset.json";
    var deprecated2Url =
      "./Data/Cesium3DTiles/Batched/BatchedDeprecated2/tileset.json";

    function setCamera(longitude, latitude) {
      // One feature is located at the center, point the camera there
      var center = Cartesian3.fromRadians(longitude, latitude);
      scene.camera.lookAt(center, new HeadingPitchRange(0.0, -1.57, 15.0));
    }

    beforeAll(function () {
      scene = createScene();

      // Keep the error from logging to the console when running tests
      spyOn(B3dmParser, "_deprecationWarning");
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    beforeEach(function () {
      setCamera(centerLongitude, centerLatitude);
    });

    afterEach(function () {
      scene.primitives.removeAll();
    });

    it("throws with invalid version", function () {
      var arrayBuffer = Cesium3DTilesTester.generateBatchedTileBuffer({
        version: 2,
      });
      Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, "b3dm");
    });

    it("throws with empty gltf", function () {
      // Expect to throw DeveloperError in Model due to invalid gltf magic
      var arrayBuffer = Cesium3DTilesTester.generateBatchedTileBuffer();
      Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, "b3dm");
    });

    it("throws on undefined arrayBuffer", function () {
      expect(function () {
        B3dmParser.parse(undefined);
      }).toThrowDeveloperError();
    });

    it("throws on invalid type in byteOffset", function () {
      expect(function () {
        B3dmParser.parse(new ArrayBuffer(1), "a");
      }).toThrowDeveloperError();
    });

    it("throws on invalid byteOffset", function () {
      expect(function () {
        B3dmParser.parse(new ArrayBuffer(1), -1);
      }).toThrowRuntimeError();
    });

    it("recognizes the legacy 20-byte header", function () {
      return Cesium3DTilesTester.loadTileset(scene, deprecated1Url).then(
        function (tileset) {
          expect(B3dmParser._deprecationWarning).toHaveBeenCalled();
          Cesium3DTilesTester.expectRenderTileset(scene, tileset);
          var batchTable = tileset.root.content.batchTable;
          expect(batchTable._properties).toBeDefined();
        }
      );
    });

    it("recognizes the legacy 24-byte header", function () {
      return Cesium3DTilesTester.loadTileset(scene, deprecated2Url).then(
        function (tileset) {
          expect(B3dmParser._deprecationWarning).toHaveBeenCalled();
          Cesium3DTilesTester.expectRenderTileset(scene, tileset);
          var batchTable = tileset.root.content.batchTable;
          expect(batchTable._properties).toBeDefined();
        }
      );
    });

    it("logs deprecation warning for use of BATCHID without prefixed underscore", function () {
      return Cesium3DTilesTester.loadTileset(scene, deprecated1Url).then(
        function (tileset) {
          expect(B3dmParser._deprecationWarning).toHaveBeenCalled();
          Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        }
      );
    });
  },
  "WebGL"
);
