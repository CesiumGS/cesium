import { Cartesian3 } from "../../Source/Cesium.js";
import { HeadingPitchRange } from "../../Source/Cesium.js";
import { Cesium3DTilePass } from "../../Source/Cesium.js";
import { ClippingPlane } from "../../Source/Cesium.js";
import { ClippingPlaneCollection } from "../../Source/Cesium.js";
import { Model } from "../../Source/Cesium.js";
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

    it("does not have batch table or features", function () {
      return Cesium3DTilesTester.loadTileset(scene, gltfContentUrl).then(
        function (tileset) {
          var content = tileset.root.content;
          expect(content.batchTableByteLength).toBe(0);
          expect(content.batchTable).toBeUndefined();
          expect(content.featuresLength).toBe(0);
          expect(content.hasProperty(0, "property")).toBe(false);
          expect(content.getFeature(0)).toBeUndefined();
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
  },
  "WebGL"
);
