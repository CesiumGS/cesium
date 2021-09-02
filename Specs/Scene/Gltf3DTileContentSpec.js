import {
  Cartesian3,
  Cesium3DTilePass,
  ClippingPlane,
  ClippingPlaneCollection,
  HeadingPitchRange,
  MetadataClass,
  GroupMetadata,
  Model,
} from "../../Source/Cesium.js";
import ExperimentalFeatures from "../../Source/Core/ExperimentalFeatures.js";
import Gltf3DTileContent from "../../Source/Scene/Gltf3DTileContent.js";
import Cesium3DTilesTester from "../Cesium3DTilesTester.js";
import createScene from "../createScene.js";

describe(
  "Scene/Gltf3DTileContent",
  function () {
    var scene;
    var centerLongitude = -1.31968;
    var centerLatitude = 0.698874;

    var gltfContentUrl = "./Data/Cesium3DTiles/GltfContent/glTF/tileset.json";
    var glbContentUrl = "./Data/Cesium3DTiles/GltfContent/glb/tileset.json";
    var buildingsMetadataUrl =
      "./Data/Cesium3DTiles/Metadata/FeatureMetadata/tileset.json";

    function setCamera(longitude, latitude) {
      // One feature is located at the center, point the camera there
      var center = Cartesian3.fromRadians(longitude, latitude);
      scene.camera.lookAt(center, new HeadingPitchRange(0.0, -1.57, 100.0));
    }

    beforeAll(function () {
      scene = createScene();
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

    it("resolves readyPromise", function () {
      return Cesium3DTilesTester.resolvesReadyPromise(scene, gltfContentUrl);
    });

    it("renders glTF content", function () {
      return Cesium3DTilesTester.loadTileset(scene, gltfContentUrl).then(
        function (tileset) {
          Cesium3DTilesTester.expectRender(scene, tileset);
        }
      );
    });

    it("Does not use a batch table", function () {
      return Cesium3DTilesTester.loadTileset(scene, gltfContentUrl).then(
        function (tileset) {
          var content = tileset.root.content;
          expect(content.batchTableByteLength).toBe(0);
          expect(content.batchTable).not.toBeDefined();
          expect(content.hasProperty(0, "height")).toBe(false);
          expect(content.getFeature(0)).not.toBeDefined();
        }
      );
    });

    it("renders glb content", function () {
      return Cesium3DTilesTester.loadTileset(scene, glbContentUrl).then(
        function (tileset) {
          Cesium3DTilesTester.expectRender(scene, tileset);
        }
      );
    });

    it("picks", function () {
      return Cesium3DTilesTester.loadTileset(scene, gltfContentUrl).then(
        function (tileset) {
          var content = tileset.root.content;
          tileset.show = false;
          expect(scene).toPickPrimitive(undefined);
          tileset.show = true;
          expect(scene).toPickAndCall(function (result) {
            expect(result).toBeDefined();
            expect(result.primitive).toBe(tileset);
            expect(result.content).toBe(content);
          });
        }
      );
    });

    it("gets memory usage", function () {
      return Cesium3DTilesTester.loadTileset(scene, gltfContentUrl).then(
        function (tileset) {
          var content = tileset.root.content;

          // 10 buildings, 36 ushort indices and 24 vertices per building, 6 float components (position, normal) per vertex.
          // 10 * (24 * (6 * 4) + (36 * 2)) = 6480
          var geometryByteLength = 6480;

          expect(content.geometryByteLength).toEqual(geometryByteLength);
          expect(content.texturesByteLength).toEqual(0);
        }
      );
    });

    it("links model to tileset clipping planes based on bounding volume clipping", function () {
      return Cesium3DTilesTester.loadTileset(scene, gltfContentUrl).then(
        function (tileset) {
          var tile = tileset.root;
          var content = tile.content;
          var model = content._model;
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

    it("links model to tileset clipping planes if tileset clipping planes are reassigned", function () {
      return Cesium3DTilesTester.loadTileset(scene, gltfContentUrl).then(
        function (tileset) {
          var tile = tileset.root;
          var model = tile.content._model;
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

      return Cesium3DTilesTester.loadTileset(scene, gltfContentUrl).then(
        function (tileset) {
          var tile = tileset.root;
          var passOptions = Cesium3DTilePass.getPassOptions(
            Cesium3DTilePass.RENDER
          );

          var clippingPlaneCollection = new ClippingPlaneCollection({
            planes: [new ClippingPlane(Cartesian3.UNIT_X, 0.0)],
          });
          tileset.clippingPlanes = clippingPlaneCollection;
          clippingPlaneCollection.update(scene.frameState);
          tile.update(tileset, scene.frameState, passOptions);

          expect(Model._getClippingFunction.calls.count()).toEqual(1);
        }
      );
    });

    it("destroys", function () {
      return Cesium3DTilesTester.tileDestroys(scene, gltfContentUrl);
    });

    describe("ModelExperimental", function () {
      beforeEach(function () {
        ExperimentalFeatures.enableModelExperimental = true;
      });

      afterEach(function () {
        ExperimentalFeatures.enableModelExperimental = false;
      });

      it("assigns model feature table", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          buildingsMetadataUrl
        ).then(function (tileset) {
          var content = tileset.root.content;
          expect(content._model.featureTable).toBeDefined();
        });
      });

      it("hasProperty works", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          buildingsMetadataUrl
        ).then(function (tileset) {
          var content = tileset.root.content;
          var featureTable = content._model.featureTable;
          expect(featureTable).toBeDefined();
          var modelFeatures = featureTable._features;
          for (var i = 0; i < modelFeatures.length; i++) {
            var feature = modelFeatures[i];
            expect(feature.hasProperty("height")).toEqual(true);
            expect(feature.hasProperty("width")).toEqual(false);
          }
        });
      });

      it("getFeature works", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          buildingsMetadataUrl
        ).then(function (tileset) {
          var content = tileset.root.content;
          var featureTable = content._model.featureTable;
          expect(featureTable).toBeDefined();
          var modelFeatures = featureTable._features;
          for (var i = 0; i < modelFeatures.length; i++) {
            var feature = content.getFeature(i);
            expect(feature).toEqual(modelFeatures[i]);
            expect(feature.content).toBeInstanceOf(Gltf3DTileContent);
          }
        });
      });

      it("getProperty works", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          buildingsMetadataUrl
        ).then(function (tileset) {
          var content = tileset.root.content;
          var featureTable = content._model.featureTable;
          expect(featureTable).toBeDefined();
          var modelFeatures = featureTable._features;
          for (var i = 0; i < modelFeatures.length; i++) {
            var feature = modelFeatures[i];
            expect(feature.getProperty("id")).toEqual(feature._featureId);
          }
        });
      });

      it("getPropertyInherited works", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          buildingsMetadataUrl
        ).then(function (tileset) {
          var content = tileset.root.content;
          var featureTable = content._model.featureTable;
          expect(featureTable).toBeDefined();
          var modelFeatures = featureTable._features;
          for (var i = 0; i < modelFeatures.length; i++) {
            var feature = modelFeatures[i];
            expect(feature.getProperty("id")).toEqual(feature._featureId);
          }
        });
      });

      it("getPropertyNames works", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          buildingsMetadataUrl
        ).then(function (tileset) {
          var content = tileset.root.content;
          var featureTable = content._model.featureTable;
          expect(featureTable).toBeDefined();
          var modelFeatures = featureTable._features;
          for (var i = 0; i < modelFeatures.length; i++) {
            var feature = modelFeatures[i];
            var results = [];
            expect(feature.getPropertyNames(results)).toEqual(["height", "id"]);
          }
        });
      });
    });

    describe("3DTILES_metadata", function () {
      var metadataClass = new MetadataClass({
        id: "test",
        class: {
          properties: {
            name: {
              type: "STRING",
            },
            height: {
              type: "FLOAT32",
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
        return Cesium3DTilesTester.loadTileset(scene, gltfContentUrl).then(
          function (tileset) {
            var content = tileset.root.content;
            content.groupMetadata = groupMetadata;
            expect(content.groupMetadata).toBe(groupMetadata);
          }
        );
      });
    });
  },
  "WebGL"
);
