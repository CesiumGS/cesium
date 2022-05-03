import { Cartesian3 } from "../../Source/Cesium.js";
import { defer } from "../../Source/Cesium.js";
import { Ellipsoid } from "../../Source/Cesium.js";
import { Event } from "../../Source/Cesium.js";
import { GeographicTilingScheme } from "../../Source/Cesium.js";
import { Matrix4 } from "../../Source/Cesium.js";
import { Ray } from "../../Source/Cesium.js";
import { Rectangle } from "../../Source/Cesium.js";
import { WebMercatorProjection } from "../../Source/Cesium.js";
import { WebMercatorTilingScheme } from "../../Source/Cesium.js";
import { Globe } from "../../Source/Cesium.js";
import { ImageryLayer } from "../../Source/Cesium.js";
import { ImageryLayerCollection } from "../../Source/Cesium.js";
import { ImageryLayerFeatureInfo } from "../../Source/Cesium.js";
import { ImageryProvider } from "../../Source/Cesium.js";
import createScene from "../createScene.js";
import pollToPromise from "../pollToPromise.js";

describe(
  "Scene/ImageryLayerCollection",
  function () {
    const fakeProvider = {
      isReady: function () {
        return false;
      },
    };

    it("tracks the base layer on add", function () {
      const layer1 = new ImageryLayer(fakeProvider);
      const layer2 = new ImageryLayer(fakeProvider);
      const layer3 = new ImageryLayer(fakeProvider);
      const collection = new ImageryLayerCollection();

      expect(layer1.isBaseLayer()).toEqual(false);

      collection.add(layer1);
      expect(layer1.isBaseLayer()).toEqual(true);

      collection.add(layer2);
      expect(layer1.isBaseLayer()).toEqual(true);
      expect(layer2.isBaseLayer()).toEqual(false);

      collection.add(layer3, 0);
      expect(layer1.isBaseLayer()).toEqual(false);
      expect(layer2.isBaseLayer()).toEqual(false);
      expect(layer3.isBaseLayer()).toEqual(true);
    });

    it("tracks the base layer on remove", function () {
      const layer1 = new ImageryLayer(fakeProvider);
      const layer2 = new ImageryLayer(fakeProvider);
      const layer3 = new ImageryLayer(fakeProvider);
      const collection = new ImageryLayerCollection();

      collection.add(layer1);
      collection.add(layer2);
      collection.add(layer3);

      expect(layer1.isBaseLayer()).toEqual(true);
      expect(layer2.isBaseLayer()).toEqual(false);
      expect(layer3.isBaseLayer()).toEqual(false);

      collection.remove(layer1);
      expect(layer2.isBaseLayer()).toEqual(true);
      expect(layer3.isBaseLayer()).toEqual(false);

      collection.remove(layer3);
      expect(layer2.isBaseLayer()).toEqual(true);
    });

    it("updates isBaseLayer on re-add", function () {
      const layer1 = new ImageryLayer(fakeProvider);
      const layer2 = new ImageryLayer(fakeProvider);
      const collection = new ImageryLayerCollection();

      layer1._isBaseLayer = true;
      layer2._isBaseLayer = true;

      collection.add(layer1);
      collection.add(layer2);

      expect(layer1.isBaseLayer()).toEqual(true);
      expect(layer2.isBaseLayer()).toEqual(false);
    });

    it("does not crash when raising and lowering a single layer.", function () {
      const layer1 = new ImageryLayer(fakeProvider);
      const collection = new ImageryLayerCollection();
      collection.add(layer1);

      collection.raise(layer1);
      collection.lower(layer1);

      collection.raiseToTop(layer1);
      collection.lowerToBottom(layer1);
    });

    it("tracks the base layer on raise and lower", function () {
      const layer1 = new ImageryLayer(fakeProvider);
      const layer2 = new ImageryLayer(fakeProvider);
      const layer3 = new ImageryLayer(fakeProvider);
      const collection = new ImageryLayerCollection();

      collection.add(layer1);
      collection.add(layer2);
      collection.add(layer3);

      expect(layer1.isBaseLayer()).toEqual(true);
      expect(layer2.isBaseLayer()).toEqual(false);
      expect(layer3.isBaseLayer()).toEqual(false);

      collection.lower(layer1);
      expect(layer1.isBaseLayer()).toEqual(true);
      expect(layer2.isBaseLayer()).toEqual(false);
      expect(layer3.isBaseLayer()).toEqual(false);

      collection.raise(layer1);
      expect(layer1.isBaseLayer()).toEqual(false);
      expect(layer2.isBaseLayer()).toEqual(true);
      expect(layer3.isBaseLayer()).toEqual(false);

      collection.lower(layer1);
      expect(layer1.isBaseLayer()).toEqual(true);
      expect(layer2.isBaseLayer()).toEqual(false);
      expect(layer3.isBaseLayer()).toEqual(false);
    });

    it("tracks the base layer on raiseToTop to lowerToBottom", function () {
      const layer1 = new ImageryLayer(fakeProvider);
      const layer2 = new ImageryLayer(fakeProvider);
      const layer3 = new ImageryLayer(fakeProvider);
      const collection = new ImageryLayerCollection();

      collection.add(layer1);
      collection.add(layer2);
      collection.add(layer3);

      expect(layer1.isBaseLayer()).toEqual(true);
      expect(layer2.isBaseLayer()).toEqual(false);
      expect(layer3.isBaseLayer()).toEqual(false);

      collection.raiseToTop(layer1);
      expect(layer1.isBaseLayer()).toEqual(false);
      expect(layer2.isBaseLayer()).toEqual(true);
      expect(layer3.isBaseLayer()).toEqual(false);

      collection.lowerToBottom(layer1);
      expect(layer1.isBaseLayer()).toEqual(true);
      expect(layer2.isBaseLayer()).toEqual(false);
      expect(layer3.isBaseLayer()).toEqual(false);
    });

    it("add throws when layer is undefined", function () {
      const collection = new ImageryLayerCollection();

      expect(function () {
        collection.add(undefined);
      }).toThrowDeveloperError();
    });

    it("addImageryProvider throws when imageryProvider is undefined", function () {
      const collection = new ImageryLayerCollection();

      expect(function () {
        collection.addImageryProvider(undefined);
      }).toThrowDeveloperError();
    });

    it("add throws when index is outside valid range", function () {
      const collection = new ImageryLayerCollection();
      const layer1 = new ImageryLayer(fakeProvider);
      const layer2 = new ImageryLayer(fakeProvider);

      expect(function () {
        collection.add(layer1, 1);
      }).toThrowDeveloperError();

      expect(function () {
        collection.add(layer1, -1);
      }).toThrowDeveloperError();

      collection.add(layer1, 0);

      expect(function () {
        collection.add(layer2, -1);
      }).toThrowDeveloperError();

      expect(function () {
        collection.add(layer2, 2);
      }).toThrowDeveloperError();

      collection.add(layer2, 0);
    });

    it("remove ignores request to remove a layer that does not exist in the collection", function () {
      const collection = new ImageryLayerCollection();
      const layer1 = new ImageryLayer(fakeProvider);
      expect(collection.remove(layer1)).toBe(false);
    });

    it("contains works as expected", function () {
      const collection = new ImageryLayerCollection();
      const layer1 = new ImageryLayer(fakeProvider);
      const layer2 = new ImageryLayer(fakeProvider);

      expect(collection.contains(layer1)).toEqual(false);
      expect(collection.contains(layer2)).toEqual(false);

      collection.add(layer1);

      expect(collection.contains(layer1)).toEqual(true);
      expect(collection.contains(layer2)).toEqual(false);

      collection.add(layer2);

      expect(collection.contains(layer1)).toEqual(true);
      expect(collection.contains(layer2)).toEqual(true);

      collection.remove(layer1);

      expect(collection.contains(layer1)).toEqual(false);
      expect(collection.contains(layer2)).toEqual(true);

      collection.remove(layer2);

      expect(collection.contains(layer1)).toEqual(false);
      expect(collection.contains(layer2)).toEqual(false);
    });

    it("get throws if index is not provided", function () {
      const collection = new ImageryLayerCollection();
      expect(function () {
        collection.get();
      }).toThrowDeveloperError();
    });

    it("throws when raising an undefined layer", function () {
      const collection = new ImageryLayerCollection();

      expect(function () {
        collection.raise(undefined);
      }).toThrowDeveloperError();
    });

    it("throws when raising a layer not in the collection", function () {
      const collection = new ImageryLayerCollection();
      const layer1 = new ImageryLayer(fakeProvider);

      expect(function () {
        collection.raise(layer1);
      }).toThrowDeveloperError();
    });

    it("reports whether or not it is destroyed", function () {
      const collection = new ImageryLayerCollection();
      expect(collection.isDestroyed()).toEqual(false);
      collection.destroy();
      expect(collection.isDestroyed()).toEqual(true);
    });

    /**
     * Repeatedly calls update until the load queue is empty.  Returns a promise that resolves
     * once the load queue is empty.
     *
     * @param {Ray} ray The ray to test for intersection.
     * @param {Scene} scene The scene.
     * @return {Promise.<Boolean>}
     *
     * @private
     *
     */
    function updateUntilDone(globe, scene) {
      // update until the load queue is empty.
      return pollToPromise(function () {
        globe._surface._debug.enableDebugOutput = true;
        scene.render();
        return (
          globe._surface.tileProvider.ready &&
          globe._surface._tileLoadQueueHigh.length === 0 &&
          globe._surface._tileLoadQueueMedium.length === 0 &&
          globe._surface._tileLoadQueueLow.length === 0 &&
          globe._surface._debug.tilesWaitingForChildren === 0
        );
      });
    }

    describe("pickImageryLayers", function () {
      let scene;
      let globe;
      let camera;

      beforeAll(function () {
        scene = createScene();
        globe = scene.globe = new Globe();
        camera = scene.camera;

        scene.frameState.passes.render = true;
      });

      afterAll(function () {
        scene.destroyForSpecs();
      });

      beforeEach(function () {
        globe.imageryLayers.removeAll();
      });

      it("returns undefined when pick ray does not intersect surface", function () {
        const ellipsoid = Ellipsoid.WGS84;
        camera.lookAt(
          new Cartesian3(ellipsoid.maximumRadius, 0.0, 0.0),
          new Cartesian3(0.0, 0.0, 100.0)
        );

        const ray = new Ray(
          camera.position,
          Cartesian3.negate(camera.direction, new Cartesian3())
        );
        const imagery = scene.imageryLayers.pickImageryLayers(ray, scene);
        expect(imagery).toBeUndefined();
      });

      it("returns undefined when globe has no pickable layers", function () {
        const ellipsoid = Ellipsoid.WGS84;
        camera.lookAt(
          new Cartesian3(ellipsoid.maximumRadius, 0.0, 0.0),
          new Cartesian3(0.0, 0.0, 100.0)
        );

        const ray = new Ray(camera.position, camera.direction);
        const imagery = scene.imageryLayers.pickImageryLayers(ray, scene);
        expect(imagery).toBeUndefined();
      });

      it("returns undefined if there are zero imagery layers", function () {
        const ellipsoid = Ellipsoid.WGS84;
        camera.lookAt(
          new Cartesian3(ellipsoid.maximumRadius, 0.0, 0.0),
          new Cartesian3(0.0, 0.0, 100.0)
        );
        camera.lookAtTransform(Matrix4.IDENTITY);
        return updateUntilDone(globe, scene).then(function () {
          const ray = new Ray(camera.position, camera.direction);
          const imagery = scene.imageryLayers.pickImageryLayers(ray, scene);

          expect(imagery).toBeUndefined();
        });
      });

      it("returns imagery from one layer", function () {
        const provider = {
          ready: true,
          rectangle: Rectangle.MAX_VALUE,
          tileWidth: 256,
          tileHeight: 256,
          maximumLevel: 0,
          minimumLevel: 0,
          tilingScheme: new GeographicTilingScheme(),
          errorEvent: new Event(),
          hasAlphaChannel: true,
          requestImage: function (x, y, level) {
            return ImageryProvider.loadImage(this, "Data/Images/Blue.png");
          },
        };

        const currentLayer = globe.imageryLayers.addImageryProvider(provider);

        const ellipsoid = Ellipsoid.WGS84;
        camera.lookAt(
          new Cartesian3(ellipsoid.maximumRadius, 0.0, 0.0),
          new Cartesian3(0.0, 0.0, 100.0)
        );
        camera.lookAtTransform(Matrix4.IDENTITY);
        return updateUntilDone(globe, scene).then(function () {
          const ray = new Ray(camera.position, camera.direction);
          const imagery = scene.imageryLayers.pickImageryLayers(ray, scene);

          expect(imagery).toBeDefined();
          expect(imagery.length).toBe(1);
          expect(imagery[0]).toBe(currentLayer);
        });
      });

      it("returns imagery from two layers", function () {
        const provider1 = {
          ready: true,
          rectangle: Rectangle.MAX_VALUE,
          tileWidth: 256,
          tileHeight: 256,
          maximumLevel: 0,
          minimumLevel: 0,
          tilingScheme: new GeographicTilingScheme(),
          errorEvent: new Event(),
          hasAlphaChannel: true,
          requestImage: function (x, y, level) {
            return ImageryProvider.loadImage(this, "Data/Images/Blue.png");
          },
        };

        const currentLayer1 = globe.imageryLayers.addImageryProvider(provider1);

        const provider2 = {
          ready: true,
          rectangle: Rectangle.MAX_VALUE,
          tileWidth: 256,
          tileHeight: 256,
          maximumLevel: 0,
          minimumLevel: 0,
          tilingScheme: new GeographicTilingScheme(),
          errorEvent: new Event(),
          hasAlphaChannel: true,
          requestImage: function (x, y, level) {
            return ImageryProvider.loadImage(this, "Data/Images/Green.png");
          },
        };

        const currentLayer2 = globe.imageryLayers.addImageryProvider(provider2);
        const ellipsoid = Ellipsoid.WGS84;
        camera.lookAt(
          new Cartesian3(ellipsoid.maximumRadius, 0.0, 0.0),
          new Cartesian3(0.0, 0.0, 100.0)
        );
        camera.lookAtTransform(Matrix4.IDENTITY);
        return updateUntilDone(globe, scene).then(function () {
          const ray = new Ray(camera.position, camera.direction);
          const imagery = scene.imageryLayers.pickImageryLayers(ray, scene);

          expect(imagery).toBeDefined();
          expect(imagery.length).toBe(2);
          expect(imagery[0]).toBe(currentLayer2);
          expect(imagery[1]).toBe(currentLayer1);
        });
      });
    });

    describe("pickImageryLayerFeatures", function () {
      let scene;
      let globe;
      let camera;

      beforeAll(function () {
        scene = createScene();
        globe = scene.globe = new Globe();
        camera = scene.camera;

        scene.frameState.passes.render = true;
      });

      afterAll(function () {
        scene.destroyForSpecs();
      });

      beforeEach(function () {
        globe.imageryLayers.removeAll();
      });

      it("returns undefined when pick ray does not intersect surface", function () {
        const ellipsoid = Ellipsoid.WGS84;
        camera.lookAt(
          new Cartesian3(ellipsoid.maximumRadius, 0.0, 0.0),
          new Cartesian3(0.0, 0.0, 100.0)
        );

        const ray = new Ray(
          camera.position,
          Cartesian3.negate(camera.direction, new Cartesian3())
        );
        const featuresPromise = scene.imageryLayers.pickImageryLayerFeatures(
          ray,
          scene
        );
        expect(featuresPromise).toBeUndefined();
      });

      it("returns undefined when globe has no pickable layers", function () {
        const ellipsoid = Ellipsoid.WGS84;
        camera.lookAt(
          new Cartesian3(ellipsoid.maximumRadius, 0.0, 0.0),
          new Cartesian3(0.0, 0.0, 100.0)
        );

        const ray = new Ray(camera.position, camera.direction);
        const featuresPromise = scene.imageryLayers.pickImageryLayerFeatures(
          ray,
          scene
        );
        expect(featuresPromise).toBeUndefined();
      });

      it("returns undefined when ImageryProvider does not implement pickFeatures", function () {
        const provider = {
          ready: true,
          rectangle: Rectangle.MAX_VALUE,
          tileWidth: 256,
          tileHeight: 256,
          maximumLevel: 0,
          minimumLevel: 0,
          tilingScheme: new GeographicTilingScheme(),
          errorEvent: new Event(),
          hasAlphaChannel: true,

          requestImage: function (x, y, level) {
            return ImageryProvider.loadImage(this, "Data/Images/Blue.png");
          },
        };

        globe.imageryLayers.addImageryProvider(provider);

        return updateUntilDone(globe, scene).then(function () {
          const ellipsoid = Ellipsoid.WGS84;
          camera.lookAt(
            new Cartesian3(ellipsoid.maximumRadius, 0.0, 0.0),
            new Cartesian3(0.0, 0.0, 100.0)
          );

          const ray = new Ray(camera.position, camera.direction);
          const featuresPromise = scene.imageryLayers.pickImageryLayerFeatures(
            ray,
            scene
          );
          expect(featuresPromise).toBeUndefined();
        });
      });

      it("returns undefined when ImageryProvider.pickFeatures returns undefined", function () {
        const provider = {
          ready: true,
          rectangle: Rectangle.MAX_VALUE,
          tileWidth: 256,
          tileHeight: 256,
          maximumLevel: 0,
          minimumLevel: 0,
          tilingScheme: new GeographicTilingScheme(),
          errorEvent: new Event(),
          hasAlphaChannel: true,

          pickFeatures: function (x, y, level, longitude, latitude) {
            return undefined;
          },

          requestImage: function (x, y, level) {
            return ImageryProvider.loadImage(this, "Data/Images/Blue.png");
          },
        };

        globe.imageryLayers.addImageryProvider(provider);

        return updateUntilDone(globe, scene).then(function () {
          const ellipsoid = Ellipsoid.WGS84;
          camera.lookAt(
            new Cartesian3(ellipsoid.maximumRadius, 0.0, 0.0),
            new Cartesian3(0.0, 0.0, 100.0)
          );

          const ray = new Ray(camera.position, camera.direction);
          const featuresPromise = scene.imageryLayers.pickImageryLayerFeatures(
            ray,
            scene
          );
          expect(featuresPromise).toBeUndefined();
        });
      });

      it("returns features from one layer", function () {
        const provider = {
          ready: true,
          rectangle: Rectangle.MAX_VALUE,
          tileWidth: 256,
          tileHeight: 256,
          maximumLevel: 0,
          minimumLevel: 0,
          tilingScheme: new GeographicTilingScheme(),
          errorEvent: new Event(),
          hasAlphaChannel: true,

          pickFeatures: function (x, y, level, longitude, latitude) {
            const deferred = defer();
            setTimeout(function () {
              const featureInfo = new ImageryLayerFeatureInfo();
              featureInfo.name = "Foo";
              featureInfo.description = "<strong>Foo!</strong>";
              deferred.resolve([featureInfo]);
            }, 1);
            return deferred.promise;
          },

          requestImage: function (x, y, level) {
            return ImageryProvider.loadImage(this, "Data/Images/Blue.png");
          },
        };

        const currentLayer = globe.imageryLayers.addImageryProvider(provider);

        return updateUntilDone(globe, scene).then(function () {
          const ellipsoid = Ellipsoid.WGS84;
          camera.lookAt(
            new Cartesian3(ellipsoid.maximumRadius, 0.0, 0.0),
            new Cartesian3(0.0, 0.0, 100.0)
          );
          camera.lookAtTransform(Matrix4.IDENTITY);

          const ray = new Ray(camera.position, camera.direction);
          const featuresPromise = scene.imageryLayers.pickImageryLayerFeatures(
            ray,
            scene
          );

          expect(featuresPromise).toBeDefined();

          return featuresPromise.then(function (features) {
            expect(features.length).toBe(1);
            expect(features[0].name).toEqual("Foo");
            expect(features[0].description).toContain("Foo!");
            expect(features[0].imageryLayer).toBe(currentLayer);
          });
        });
      });

      it("returns features from two layers", function () {
        const provider1 = {
          ready: true,
          rectangle: Rectangle.MAX_VALUE,
          tileWidth: 256,
          tileHeight: 256,
          maximumLevel: 0,
          minimumLevel: 0,
          tilingScheme: new GeographicTilingScheme(),
          errorEvent: new Event(),
          hasAlphaChannel: true,

          pickFeatures: function (x, y, level, longitude, latitude) {
            const deferred = defer();
            setTimeout(function () {
              const featureInfo = new ImageryLayerFeatureInfo();
              featureInfo.name = "Foo";
              featureInfo.description = "<strong>Foo!</strong>";
              deferred.resolve([featureInfo]);
            }, 1);
            return deferred.promise;
          },

          requestImage: function (x, y, level) {
            return ImageryProvider.loadImage(this, "Data/Images/Blue.png");
          },
        };

        const currentLayer1 = globe.imageryLayers.addImageryProvider(provider1);

        const provider2 = {
          ready: true,
          rectangle: Rectangle.MAX_VALUE,
          tileWidth: 256,
          tileHeight: 256,
          maximumLevel: 0,
          minimumLevel: 0,
          tilingScheme: new GeographicTilingScheme(),
          errorEvent: new Event(),
          hasAlphaChannel: true,

          pickFeatures: function (x, y, level, longitude, latitude) {
            const deferred = defer();
            setTimeout(function () {
              const featureInfo = new ImageryLayerFeatureInfo();
              featureInfo.name = "Bar";
              featureInfo.description = "<strong>Bar!</strong>";
              deferred.resolve([featureInfo]);
            }, 1);
            return deferred.promise;
          },

          requestImage: function (x, y, level) {
            return ImageryProvider.loadImage(this, "Data/Images/Green.png");
          },
        };

        const currentLayer2 = globe.imageryLayers.addImageryProvider(provider2);

        return updateUntilDone(globe, scene).then(function () {
          const ellipsoid = Ellipsoid.WGS84;
          camera.lookAt(
            new Cartesian3(ellipsoid.maximumRadius, 0.0, 0.0),
            new Cartesian3(0.0, 0.0, 100.0)
          );
          camera.lookAtTransform(Matrix4.IDENTITY);

          const ray = new Ray(camera.position, camera.direction);
          const featuresPromise = scene.imageryLayers.pickImageryLayerFeatures(
            ray,
            scene
          );

          expect(featuresPromise).toBeDefined();

          return featuresPromise.then(function (features) {
            expect(features.length).toBe(2);
            expect(features[0].name).toEqual("Bar");
            expect(features[0].description).toContain("Bar!");
            expect(features[0].imageryLayer).toBe(currentLayer2);
            expect(features[1].name).toEqual("Foo");
            expect(features[1].description).toContain("Foo!");
            expect(features[1].imageryLayer).toBe(currentLayer1);
          });
        });
      });

      it("correctly picks from a terrain tile that is partially covered by correct-level imagery and partially covered by imagery from an ancestor level", function () {
        const provider = {
          ready: true,
          rectangle: new Rectangle(
            -Math.PI,
            -WebMercatorProjection.MaximumLatitude,
            Math.PI,
            WebMercatorProjection.MaximumLatitude
          ),
          tileWidth: 256,
          tileHeight: 256,
          maximumLevel: 1,
          minimumLevel: 1,
          tilingScheme: new WebMercatorTilingScheme(),
          errorEvent: new Event(),
          hasAlphaChannel: true,

          pickFeatures: function (x, y, level, longitude, latitude) {
            const deferred = defer();
            setTimeout(function () {
              const featureInfo = new ImageryLayerFeatureInfo();
              featureInfo.name = `L${level}X${x}Y${y}`;
              deferred.resolve([featureInfo]);
            }, 1);
            return deferred.promise;
          },

          requestImage: function (x, y, level) {
            // At level 1, only the northwest quadrant has a valid tile.
            if (level !== 1 || (x === 0 && y === 0)) {
              return ImageryProvider.loadImage(this, "Data/Images/Blue.png");
            }
            return Promise.reject();
          },
        };

        globe.imageryLayers.addImageryProvider(provider);

        camera.setView({
          destination: Rectangle.fromDegrees(-180.0, 0, 0, 90),
        });

        return updateUntilDone(globe, scene).then(function () {
          const ray = new Ray(camera.position, camera.direction);
          const featuresPromise = scene.imageryLayers.pickImageryLayerFeatures(
            ray,
            scene
          );

          expect(featuresPromise).toBeDefined();

          return featuresPromise.then(function (features) {
            // Verify that we don't end up picking from imagery level 0.
            expect(features.length).toBe(1);
            expect(features[0].name).toEqual("L1X0Y0");
          });
        });
      });
    });
  },
  "WebGL"
);
