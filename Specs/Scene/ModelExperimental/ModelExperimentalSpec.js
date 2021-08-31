import {
  FeatureDetection,
  Math as CesiumMath,
  ResourceCache,
  Resource,
  ModelExperimental,
  Cartesian3,
  defined,
  HeadingPitchRange,
  when,
  ShaderProgram,
} from "../../../Source/Cesium.js";
import createScene from "../../createScene.js";
import loadAndZoomToModelExperimental from "./loadAndZoomToModelExperimental.js";

describe(
  "Scene/ModelExperimental/ModelExperimental",
  function () {
    var webglStub = !!window.webglStub;

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

    it("debugShowBoundingVolume works", function () {
      var resource = Resource.createIfNeeded(boxTexturedGlbUrl);
      var loadPromise = resource.fetchArrayBuffer();
      return loadPromise.then(function (buffer) {
        return loadAndZoomToModelExperimental(
          { gltf: new Uint8Array(buffer), debugShowBoundingVolume: true },
          scene
        ).then(function (model) {
          var i;
          scene.renderForSpecs();
          var commandList = scene.frameState;
          for (i = 0; i < commandList.length; i++) {
            expect(commandList[i].debugShowBoundingVolume).toBe(true);
          }
          model.debugShowBoundingVolume = false;
          expect(model._debugShowBoundingVolumeDirty).toBe(true);
          scene.renderForSpecs();
          for (i = 0; i < commandList.length; i++) {
            expect(commandList[i].debugShowBoundingVolume).toBe(false);
          }
        });
      });
    });

    it("boundingSphere works", function () {
      var resource = Resource.createIfNeeded(boxTexturedGlbUrl);
      var loadPromise = resource.fetchArrayBuffer();
      return loadPromise.then(function (buffer) {
        return loadAndZoomToModelExperimental(
          { gltf: new Uint8Array(buffer), debugShowBoundingVolume: true },
          scene
        ).then(function (model) {
          var boundingSphere = model.boundingSphere;
          expect(boundingSphere).toBeDefined();
          expect(boundingSphere.center).toEqual(new Cartesian3());
          expect(boundingSphere.radius).toEqualEpsilon(
            0.8660254037844386,
            CesiumMath.EPSILON8
          );
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

    it("picks box textured", function () {
      if (FeatureDetection.isInternetExplorer()) {
        // Workaround IE 11.0.9.  This test fails when all tests are ran without a breakpoint here.
        return;
      }

      // This model gets clipped in cesium-analytics due to disabled
      // log depth, so zoom out just a little bit
      var offset = new HeadingPitchRange(0, -CesiumMath.PI_OVER_FOUR, 2);

      return loadAndZoomToModelExperimental(
        {
          gltf: boxTexturedGlbUrl,
          offset: offset,
        },
        scene
      ).then(function (model) {
        expect(scene).toPickAndCall(function (result) {
          expect(result.model).toEqual(model);
        });
      });
    });

    it("doesn't pick when allowPicking is false", function () {
      if (FeatureDetection.isInternetExplorer()) {
        // Workaround IE 11.0.9.  This test fails when all tests are ran without a breakpoint here.
        return;
      }

      return loadAndZoomToModelExperimental(
        {
          gltf: boxTexturedGlbUrl,
          allowPicking: false,
        },
        scene
      ).then(function () {
        expect(scene).toPickAndCall(function (result) {
          expect(result).toBeUndefined();
        });
      });
    });

    it("destroy works", function () {
      spyOn(ShaderProgram.prototype, "destroy").and.callThrough();
      return loadAndZoomToModelExperimental(
        { gltf: boxTexturedGlbUrl },
        scene
      ).then(function (model) {
        var resources = model._resources;
        var loader = model._loader;
        var resource;

        var i;
        for (i = 0; i < resources.length; i++) {
          resource = resources[i];
          if (defined(resource.isDestroyed)) {
            expect(resource.isDestroyed()).toEqual(false);
          }
        }
        expect(loader.isDestroyed()).toEqual(false);
        expect(model.isDestroyed()).toEqual(false);
        scene.primitives.remove(model);
        if (!webglStub) {
          expect(ShaderProgram.prototype.destroy).toHaveBeenCalled();
        }
        for (i = 0; i < resources.length - 1; i++) {
          resource = resources[i];
          if (defined(resource.isDestroyed)) {
            expect(resource.isDestroyed()).toEqual(true);
          }
        }
        expect(loader.isDestroyed()).toEqual(true);
        expect(model.isDestroyed()).toEqual(true);
      });
    });

    it("destroy doesn't destroy resources when they're in use", function () {
      return when
        .all([
          loadAndZoomToModelExperimental({ gltf: boxTexturedGlbUrl }, scene),
          loadAndZoomToModelExperimental({ gltf: boxTexturedGlbUrl }, scene),
        ])
        .then(function (models) {
          var cacheEntries = ResourceCache.cacheEntries;
          var cacheKey;
          var cacheEntry;

          scene.primitives.remove(models[0]);

          for (cacheKey in cacheEntries) {
            if (cacheEntries.hasOwnProperty(cacheKey)) {
              cacheEntry = cacheEntries[cacheKey];
              expect(cacheEntry.referenceCount).toBeGreaterThan(0);
            }
          }

          scene.primitives.remove(models[1]);

          for (cacheKey in cacheEntries) {
            if (cacheEntries.hasOwnProperty(cacheKey)) {
              cacheEntry = cacheEntries[cacheKey];
              expect(cacheEntry.referenceCount).toBe(0);
            }
          }
        });
    });
  },
  "WebGL"
);
