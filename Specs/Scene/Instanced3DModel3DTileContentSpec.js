import {
  Cartesian3,
  Color,
  HeadingPitchRange,
  HeadingPitchRoll,
  Transforms,
  Cesium3DTilePass,
  ClippingPlane,
  ClippingPlaneCollection,
  MetadataClass,
  GroupMetadata,
  Model,
} from "../../Source/Cesium.js";
import Cesium3DTilesTester from "../Cesium3DTilesTester.js";
import createScene from "../createScene.js";

describe(
  "Scene/Instanced3DModel3DTileContent",
  function () {
    var scene;
    var centerLongitude = -1.31968;
    var centerLatitude = 0.698874;

    var gltfExternalUrl =
      "./Data/Cesium3DTiles/Instanced/InstancedGltfExternal/tileset.json";
    var withBatchTableUrl =
      "./Data/Cesium3DTiles/Instanced/InstancedWithBatchTable/tileset.json";
    var withBatchTableBinaryUrl =
      "./Data/Cesium3DTiles/Instanced/InstancedWithBatchTableBinary/tileset.json";
    var withoutBatchTableUrl =
      "./Data/Cesium3DTiles/Instanced/InstancedWithoutBatchTable/tileset.json";
    var orientationUrl =
      "./Data/Cesium3DTiles/Instanced/InstancedOrientation/tileset.json";
    var oct16POrientationUrl =
      "./Data/Cesium3DTiles/Instanced/InstancedOct32POrientation/tileset.json";
    var scaleUrl = "./Data/Cesium3DTiles/Instanced/InstancedScale/tileset.json";
    var scaleNonUniformUrl =
      "./Data/Cesium3DTiles/Instanced/InstancedScaleNonUniform/tileset.json";
    var rtcUrl = "./Data/Cesium3DTiles/Instanced/InstancedRTC/tileset.json";
    var quantizedUrl =
      "./Data/Cesium3DTiles/Instanced/InstancedQuantized/tileset.json";
    var quantizedOct32POrientationUrl =
      "./Data/Cesium3DTiles/Instanced/InstancedQuantizedOct32POrientation/tileset.json";
    var withTransformUrl =
      "./Data/Cesium3DTiles/Instanced/InstancedWithTransform/tileset.json";
    var withBatchIdsUrl =
      "./Data/Cesium3DTiles/Instanced/InstancedWithBatchIds/tileset.json";
    var texturedUrl =
      "./Data/Cesium3DTiles/Instanced/InstancedTextured/tileset.json";

    function setCamera(longitude, latitude) {
      // One instance is located at the center, point the camera there
      var center = Cartesian3.fromRadians(longitude, latitude);
      scene.camera.lookAt(center, new HeadingPitchRange(0.0, -1.57, 27.0));
    }

    beforeAll(function () {
      scene = createScene();
    });

    beforeEach(function () {
      scene.morphTo3D(0.0);
      setCamera(centerLongitude, centerLatitude);
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    afterEach(function () {
      scene.primitives.removeAll();
    });

    it("throws with invalid format", function () {
      var arrayBuffer = Cesium3DTilesTester.generateInstancedTileBuffer({
        gltfFormat: 2,
      });
      Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, "i3dm");
    });

    it("throws with invalid version", function () {
      var arrayBuffer = Cesium3DTilesTester.generateInstancedTileBuffer({
        version: 2,
      });
      Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, "i3dm");
    });

    it("resolves readyPromise", function () {
      return Cesium3DTilesTester.resolvesReadyPromise(
        scene,
        withoutBatchTableUrl
      );
    });

    it("rejects readyPromise on error", function () {
      // Try loading a tile with an invalid url.
      // Expect promise to be rejected in Model, then in ModelInstanceCollection, and
      // finally in Instanced3DModel3DTileContent.
      var arrayBuffer = Cesium3DTilesTester.generateInstancedTileBuffer({
        gltfFormat: 0,
        gltfUri: "not-a-real-path",
      });
      return Cesium3DTilesTester.rejectsReadyPromiseOnError(
        scene,
        arrayBuffer,
        "i3dm"
      );
    });

    it("renders with external gltf", function () {
      return Cesium3DTilesTester.loadTileset(scene, gltfExternalUrl).then(
        function (tileset) {
          Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        }
      );
    });

    it("renders with batch table", function () {
      return Cesium3DTilesTester.loadTileset(scene, withBatchTableUrl).then(
        function (tileset) {
          Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        }
      );
    });

    it("renders with batch table binary", function () {
      return Cesium3DTilesTester.loadTileset(
        scene,
        withBatchTableBinaryUrl
      ).then(function (tileset) {
        Cesium3DTilesTester.expectRenderTileset(scene, tileset);
      });
    });

    it("renders without batch table", function () {
      return Cesium3DTilesTester.loadTileset(scene, withoutBatchTableUrl).then(
        function (tileset) {
          Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        }
      );
    });

    it("renders with feature defined orientation", function () {
      return Cesium3DTilesTester.loadTileset(scene, orientationUrl).then(
        function (tileset) {
          Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        }
      );
    });

    it("renders with feature defined Oct32P encoded orientation", function () {
      return Cesium3DTilesTester.loadTileset(scene, oct16POrientationUrl).then(
        function (tileset) {
          Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        }
      );
    });

    it("renders with feature defined scale", function () {
      return Cesium3DTilesTester.loadTileset(scene, scaleUrl).then(function (
        tileset
      ) {
        Cesium3DTilesTester.expectRenderTileset(scene, tileset);
      });
    });

    it("renders with feature defined non-uniform scale", function () {
      return Cesium3DTilesTester.loadTileset(scene, scaleNonUniformUrl).then(
        function (tileset) {
          Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        }
      );
    });

    it("renders with RTC_CENTER semantic", function () {
      return Cesium3DTilesTester.loadTileset(scene, rtcUrl).then(function (
        tileset
      ) {
        Cesium3DTilesTester.expectRenderTileset(scene, tileset);
      });
    });

    it("renders with feature defined quantized position", function () {
      return Cesium3DTilesTester.loadTileset(scene, quantizedUrl).then(
        function (tileset) {
          Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        }
      );
    });

    it("renders with feature defined quantized position and Oct32P encoded orientation", function () {
      return Cesium3DTilesTester.loadTileset(
        scene,
        quantizedOct32POrientationUrl
      ).then(function (tileset) {
        Cesium3DTilesTester.expectRenderTileset(scene, tileset);
      });
    });

    it("renders with batch ids", function () {
      return Cesium3DTilesTester.loadTileset(scene, withBatchIdsUrl).then(
        function (tileset) {
          Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        }
      );
    });

    it("renders with tile transform", function () {
      return Cesium3DTilesTester.loadTileset(scene, withTransformUrl).then(
        function (tileset) {
          Cesium3DTilesTester.expectRenderTileset(scene, tileset);

          var newLongitude = -1.31962;
          var newLatitude = 0.698874;
          var newCenter = Cartesian3.fromRadians(
            newLongitude,
            newLatitude,
            10.0
          );
          var newTransform = Transforms.headingPitchRollToFixedFrame(
            newCenter,
            new HeadingPitchRoll()
          );

          // Update tile transform
          tileset.root.transform = newTransform;

          // Move the camera to the new location
          setCamera(newLongitude, newLatitude);
          Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        }
      );
    });

    it("renders with textures", function () {
      return Cesium3DTilesTester.loadTileset(scene, texturedUrl).then(function (
        tileset
      ) {
        Cesium3DTilesTester.expectRenderTileset(scene, tileset);
      });
    });

    it("renders in 2D", function () {
      return Cesium3DTilesTester.loadTileset(scene, gltfExternalUrl).then(
        function (tileset) {
          Cesium3DTilesTester.expectRenderTileset(scene, tileset);
          tileset.maximumScreenSpaceError = 2.0;
          scene.morphTo2D(0.0);
          Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        }
      );
    });

    it("renders in 2D with tile transform", function () {
      return Cesium3DTilesTester.loadTileset(scene, withTransformUrl).then(
        function (tileset) {
          Cesium3DTilesTester.expectRenderTileset(scene, tileset);
          tileset.maximumScreenSpaceError = 2.0;
          scene.morphTo2D(0.0);
          Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        }
      );
    });

    it("renders in CV", function () {
      return Cesium3DTilesTester.loadTileset(scene, gltfExternalUrl).then(
        function (tileset) {
          Cesium3DTilesTester.expectRenderTileset(scene, tileset);
          scene.morphToColumbusView(0.0);
          Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        }
      );
    });

    it("renders in CV with tile transform", function () {
      return Cesium3DTilesTester.loadTileset(scene, withTransformUrl).then(
        function (tileset) {
          Cesium3DTilesTester.expectRenderTileset(scene, tileset);
          scene.morphToColumbusView(0.0);
          Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        }
      );
    });

    it("renders when instancing is disabled", function () {
      // Disable extension
      var instancedArrays = scene.context._instancedArrays;
      scene.context._instancedArrays = undefined;

      return Cesium3DTilesTester.loadTileset(scene, withoutBatchTableUrl).then(
        function (tileset) {
          Cesium3DTilesTester.expectRenderTileset(scene, tileset);
          // Re-enable extension
          scene.context._instancedArrays = instancedArrays;
        }
      );
    });

    it("throws when calling getFeature with invalid index", function () {
      return Cesium3DTilesTester.loadTileset(scene, withoutBatchTableUrl).then(
        function (tileset) {
          var content = tileset.root.content;
          expect(function () {
            content.getFeature(-1);
          }).toThrowDeveloperError();
          expect(function () {
            content.getFeature(10000);
          }).toThrowDeveloperError();
          expect(function () {
            content.getFeature();
          }).toThrowDeveloperError();
        }
      );
    });

    it("gets memory usage", function () {
      return Cesium3DTilesTester.loadTileset(scene, texturedUrl).then(function (
        tileset
      ) {
        var content = tileset.root.content;

        // Box model - 36 ushort indices and 24 vertices per building, 8 float components (position, normal, uv) per vertex.
        // (24 * 8 * 4) + (36 * 2) = 840
        var geometryByteLength = 840;

        // Texture is 128x128 RGBA bytes, not mipmapped
        var texturesByteLength = 65536;

        // One RGBA byte pixel per feature
        var batchTexturesByteLength = content.featuresLength * 4;
        var pickTexturesByteLength = content.featuresLength * 4;

        // Features have not been picked or colored yet, so the batch table contribution is 0.
        expect(content.geometryByteLength).toEqual(geometryByteLength);
        expect(content.texturesByteLength).toEqual(texturesByteLength);
        expect(content.batchTableByteLength).toEqual(0);

        // Color a feature and expect the texture memory to increase
        content.getFeature(0).color = Color.RED;
        scene.renderForSpecs();
        expect(content.geometryByteLength).toEqual(geometryByteLength);
        expect(content.texturesByteLength).toEqual(texturesByteLength);
        expect(content.batchTableByteLength).toEqual(batchTexturesByteLength);

        // Pick the tile and expect the texture memory to increase
        scene.pickForSpecs();
        expect(content.geometryByteLength).toEqual(geometryByteLength);
        expect(content.texturesByteLength).toEqual(texturesByteLength);
        expect(content.batchTableByteLength).toEqual(
          batchTexturesByteLength + pickTexturesByteLength
        );
      });
    });

    it("Links model to tileset clipping planes based on bounding volume clipping", function () {
      return Cesium3DTilesTester.loadTileset(scene, withBatchTableUrl).then(
        function (tileset) {
          var tile = tileset.root;
          var content = tile.content;
          var model = content._modelInstanceCollection._model;
          var passOptions = Cesium3DTilePass.getPassOptions(
            Cesium3DTilePass.RENDER
          );

          expect(model.clippingPlanes).toBeUndefined();

          var clippingPlaneCollection = new ClippingPlaneCollection({
            planes: [new ClippingPlane(Cartesian3.UNIT_X, 0.0)],
          });
          tileset.clippingPlanes = clippingPlaneCollection;
          clippingPlaneCollection.update(scene.frameState);
          tile.update(tileset, scene.frameState, passOptions);

          expect(model.clippingPlanes).toBeDefined();
          expect(model.clippingPlanes).toBe(tileset.clippingPlanes);

          tile._isClipped = false;
          tile.update(tileset, scene.frameState, passOptions);

          expect(model.clippingPlanes).toBeUndefined();
        }
      );
    });

    it("Links model to tileset clipping planes if tileset clipping planes are reassigned", function () {
      return Cesium3DTilesTester.loadTileset(scene, withBatchTableUrl).then(
        function (tileset) {
          var tile = tileset.root;
          var model = tile.content._modelInstanceCollection._model;
          var passOptions = Cesium3DTilePass.getPassOptions(
            Cesium3DTilePass.RENDER
          );

          expect(model.clippingPlanes).toBeUndefined();

          var clippingPlaneCollection = new ClippingPlaneCollection({
            planes: [new ClippingPlane(Cartesian3.UNIT_X, 0.0)],
          });
          tileset.clippingPlanes = clippingPlaneCollection;
          clippingPlaneCollection.update(scene.frameState);
          tile.update(tileset, scene.frameState, passOptions);

          expect(model.clippingPlanes).toBeDefined();
          expect(model.clippingPlanes).toBe(tileset.clippingPlanes);

          var newClippingPlaneCollection = new ClippingPlaneCollection({
            planes: [new ClippingPlane(Cartesian3.UNIT_X, 0.0)],
          });
          tileset.clippingPlanes = newClippingPlaneCollection;
          newClippingPlaneCollection.update(scene.frameState);
          expect(model.clippingPlanes).not.toBe(tileset.clippingPlanes);

          tile.update(tileset, scene.frameState, passOptions);
          expect(model.clippingPlanes).toBe(tileset.clippingPlanes);
        }
      );
    });

    it("rebuilds Model shaders when clipping planes change", function () {
      spyOn(Model, "_getClippingFunction").and.callThrough();

      return Cesium3DTilesTester.loadTileset(scene, withBatchTableUrl).then(
        function (tileset) {
          var tile = tileset.root;
          var content = tile.content;
          var clippingPlaneCollection = new ClippingPlaneCollection({
            planes: [new ClippingPlane(Cartesian3.UNIT_X, 0.0)],
          });
          var passOptions = Cesium3DTilePass.getPassOptions(
            Cesium3DTilePass.RENDER
          );
          tileset.clippingPlanes = clippingPlaneCollection;
          clippingPlaneCollection.update(scene.frameState);
          content.clippingPlanesDirty = true;
          tile.update(tileset, scene.frameState, passOptions);

          expect(Model._getClippingFunction.calls.count()).toEqual(1);
        }
      );
    });

    it("destroys", function () {
      return Cesium3DTilesTester.tileDestroys(scene, withoutBatchTableUrl);
    });

    describe("3DTILES_metadata", function () {
      var metadataClass = new MetadataClass({
        id: "test",
        class: {
          properties: {
            name: {
              componentType: "STRING",
            },
            height: {
              componentType: "FLOAT32",
            },
          },
        },
      });
      var groupMetadata = new GroupMetadata({
        id: "testGroup",
        group: {
          properties: {
            name: "Test Group",
            height: 35.6,
          },
        },
        class: metadataClass,
      });

      it("assigns groupMetadata", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          withoutBatchTableUrl
        ).then(function (tileset) {
          var content = tileset.root.content;
          content.groupMetadata = groupMetadata;
          expect(content.groupMetadata).toBe(groupMetadata);
        });
      });
    });
  },
  "WebGL"
);
