import {
  Buffer,
  BufferUsage,
  ResourceCache,
  Resource,
  ModelExperimental,
} from "../../../Source/Cesium.js";
import createScene from "../../createScene.js";
import loadAndZoomToModelExperimental from "./loadModelExperimentalForSpec.js";

describe(
  "Scene/ModelExperimental/ModelExperimental",
  function () {
    var boxTexturedGlbUrl =
      "./Data/Models/GltfLoader/BoxTextured/glTF-Binary/BoxTextured.glb";

    var scene;

    beforeAll(function () {
      scene = createScene();
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    afterEach(function () {
      scene.primitives.removeAll();
      ResourceCache.clearForSpecs();
    });

    it("initializes from Uint8Array", function () {
      var resource = Resource.createIfNeeded(boxTexturedGlbUrl);
      var loadPromise = resource.fetchArrayBuffer();
      return loadPromise.then(function (buffer) {
        return loadAndZoomToModelExperimental(
          { gltf: new Uint8Array(buffer) },
          scene
        ).then(function (model) {
          expect(model.ready).toEqual(true);
          expect(model._sceneGraph).toBeDefined();
          expect(model._resourcesLoaded).toEqual(true);
        });
      });
    });

    it("fromGltf throws with undefined options", function () {
      expect(function () {
        ModelExperimental.fromGltf();
      }).toThrowDeveloperError();
    });

    it("fromGltf throws with undefined url", function () {
      expect(function () {
        ModelExperimental.fromGltf({});
      }).toThrowDeveloperError();
    });

    it("destroy works", function () {
      var resource = Resource.createIfNeeded(boxTexturedGlbUrl);
      var loadPromise = resource.fetchArrayBuffer();
      return loadPromise.then(function (buffer) {
        return loadAndZoomToModelExperimental(
          { gltf: new Uint8Array(buffer) },
          scene
        ).then(function (model) {
          var buffer = Buffer.createVertexBuffer({
            context: scene.frameState.context,
            sizeInBytes: 16,
            usage: BufferUsage.STATIC_DRAW,
          });
          model._resources = [buffer];

          expect(buffer.isDestroyed()).toEqual(false);
          expect(model.isDestroyed()).toEqual(false);
          scene.primitives.remove(model);
          expect(buffer.isDestroyed()).toEqual(true);
          expect(model.isDestroyed()).toEqual(true);
        });
      });
    });
  },
  "WebGL"
);
