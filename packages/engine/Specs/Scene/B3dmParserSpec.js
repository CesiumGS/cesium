import {
  B3dmParser,
  Cartesian3,
  HeadingPitchRange,
  RuntimeError,
} from "../../Source/Cesium.js";
import Cesium3DTilesTester from "../Cesium3DTilesTester.js";
import createScene from "../createScene.js";

describe(
  "Scene/B3dmParser",
  function () {
    let scene;
    const centerLongitude = -1.31968;
    const centerLatitude = 0.698874;

    const deprecated1Url =
      "./Data/Cesium3DTiles/Batched/BatchedDeprecated1/tileset.json";
    const deprecated2Url =
      "./Data/Cesium3DTiles/Batched/BatchedDeprecated2/tileset.json";

    function setCamera(longitude, latitude) {
      // One feature is located at the center, point the camera there
      const center = Cartesian3.fromRadians(longitude, latitude);
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
      const arrayBuffer = Cesium3DTilesTester.generateBatchedTileBuffer({
        version: 2,
      });
      expect(function () {
        B3dmParser.parse(arrayBuffer);
      }).toThrowError(RuntimeError);
    });

    it("throws with empty gltf", function () {
      // Expect to throw DeveloperError in Model due to invalid gltf magic
      const arrayBuffer = Cesium3DTilesTester.generateBatchedTileBuffer();
      expect(function () {
        B3dmParser.parse(arrayBuffer);
      }).toThrowError(RuntimeError);
    });

    it("throws on undefined arrayBuffer", function () {
      expect(function () {
        B3dmParser.parse(undefined);
      }).toThrowDeveloperError();
    });

    it("recognizes the legacy 20-byte header", function () {
      return Cesium3DTilesTester.loadTileset(scene, deprecated1Url).then(
        function (tileset) {
          expect(B3dmParser._deprecationWarning).toHaveBeenCalled();
          Cesium3DTilesTester.expectRenderTileset(scene, tileset);
          const batchTable = tileset.root.content.batchTable;
          expect(batchTable.featuresLength).toBe(10);
        }
      );
    });

    it("recognizes the legacy 24-byte header", function () {
      return Cesium3DTilesTester.loadTileset(scene, deprecated2Url).then(
        function (tileset) {
          expect(B3dmParser._deprecationWarning).toHaveBeenCalled();
          Cesium3DTilesTester.expectRenderTileset(scene, tileset);
          const batchTable = tileset.root.content.batchTable;
          expect(batchTable.featuresLength).toBe(10);
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
