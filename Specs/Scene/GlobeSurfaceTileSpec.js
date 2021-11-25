import MockImageryProvider from "../MockImageryProvider.js";
import MockTerrainProvider from "../MockTerrainProvider.js";
import TerrainTileProcessor from "../TerrainTileProcessor.js";
import { Cartesian3, Cartographic, SceneMode } from "../../Source/Cesium.js";
import { CesiumTerrainProvider } from "../../Source/Cesium.js";
import { Cartesian4 } from "../../Source/Cesium.js";
import { createWorldTerrain } from "../../Source/Cesium.js";
import { Ellipsoid } from "../../Source/Cesium.js";
import { EllipsoidTerrainProvider } from "../../Source/Cesium.js";
import { GeographicTilingScheme } from "../../Source/Cesium.js";
import { Ray } from "../../Source/Cesium.js";
import { GlobeSurfaceTile } from "../../Source/Cesium.js";
import { ImageryLayerCollection } from "../../Source/Cesium.js";
import { QuadtreeTile } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";
import { QuadtreeTileLoadState } from "../../Source/Cesium.js";
import { TerrainState } from "../../Source/Cesium.js";
import { TileProviderError } from "../../Source/Cesium.js";
import createScene from "../createScene.js";
import { when } from "../../Source/Cesium.js";
import {
  patchXHRLoad,
  patchXHRLoadForArcGISTerrainDataSet,
  resetXHRPatch,
} from "../patchXHRLoad.js";
import { ArcGISTiledElevationTerrainProvider } from "../../Source/Cesium.js";

describe("Scene/GlobeSurfaceTile", function () {
  var frameState;
  var tilingScheme;
  var rootTiles;
  var rootTile;
  var imageryLayerCollection;
  var mockTerrain;
  var processor;

  beforeEach(function () {
    frameState = {
      context: {
        cache: {},
      },
    };

    tilingScheme = new GeographicTilingScheme();
    rootTiles = QuadtreeTile.createLevelZeroTiles(tilingScheme);
    rootTile = rootTiles[0];
    imageryLayerCollection = new ImageryLayerCollection();

    mockTerrain = new MockTerrainProvider();

    processor = new TerrainTileProcessor(
      frameState,
      mockTerrain,
      imageryLayerCollection
    );
  });

  afterEach(function () {
    for (var i = 0; i < rootTiles.length; ++i) {
      rootTiles[i].freeResources();
    }
  });

  describe("processStateMachine", function () {
    beforeEach(function () {
      processor.mockWebGL();
    });

    it("starts in the START state", function () {
      for (var i = 0; i < rootTiles.length; ++i) {
        var tile = rootTiles[i];
        expect(tile.state).toBe(QuadtreeTileLoadState.START);
      }
    });

    it("transitions to the LOADING state immediately if this tile is available", function () {
      mockTerrain.willBeAvailable(rootTile.southwestChild);

      return processor.process([rootTile.southwestChild]).then(function () {
        expect(rootTile.southwestChild.state).toBe(
          QuadtreeTileLoadState.LOADING
        );
        expect(rootTile.southwestChild.data.terrainState).toBe(
          TerrainState.UNLOADED
        );
      });
    });

    it("transitions to the LOADING tile state and FAILED terrain state immediately if this tile is NOT available", function () {
      mockTerrain.willBeUnavailable(rootTile.southwestChild);

      return processor.process([rootTile.southwestChild]).then(function () {
        expect(rootTile.southwestChild.state).toBe(
          QuadtreeTileLoadState.LOADING
        );
        expect(rootTile.southwestChild.data.terrainState).toBe(
          TerrainState.FAILED
        );
      });
    });

    it("pushes parent along if waiting on it to be able to upsample", function () {
      mockTerrain
        .willBeAvailable(rootTile)
        .requestTileGeometryWillSucceed(rootTile)
        .willBeUnavailable(rootTile.southwestChild);

      spyOn(mockTerrain, "requestTileGeometry").and.callThrough();

      return processor.process([rootTile.southwestChild]).then(function () {
        expect(mockTerrain.requestTileGeometry.calls.count()).toBe(1);
        expect(mockTerrain.requestTileGeometry.calls.argsFor(0)[0]).toBe(0);
        expect(mockTerrain.requestTileGeometry.calls.argsFor(0)[1]).toBe(0);
        expect(mockTerrain.requestTileGeometry.calls.argsFor(0)[2]).toBe(0);
      });
    });

    it("does nothing when a root tile is unavailable", function () {
      mockTerrain.willBeUnavailable(rootTile);

      return processor.process([rootTile]).then(function () {
        expect(rootTile.state).toBe(QuadtreeTileLoadState.FAILED);
        expect(rootTile.data.terrainState).toBe(TerrainState.FAILED);
      });
    });

    it("does nothing when a root tile fails to load", function () {
      mockTerrain.requestTileGeometryWillFail(rootTile);

      return processor.process([rootTile]).then(function () {
        expect(rootTile.state).toBe(QuadtreeTileLoadState.FAILED);
        expect(rootTile.data.terrainState).toBe(TerrainState.FAILED);
      });
    });

    it("prints error message when a root tile fails to load", function () {
      spyOn(TileProviderError, "handleError").and.callThrough();
      mockTerrain.requestTileGeometryWillFail(rootTile);

      return processor.process([rootTile]).then(function () {
        expect(TileProviderError.handleError.calls.count()).toBe(1);
        // Test that message argument is defined.
        expect(TileProviderError.handleError.calls.argsFor(0)[3]).toContain(
          "RuntimeError: requestTileGeometry failed as requested."
        );
      });
    });

    it("upsamples failed tiles from parent TerrainData", function () {
      mockTerrain
        .requestTileGeometryWillSucceed(rootTile)
        .createMeshWillSucceed(rootTile)
        .willBeUnavailable(rootTile.southwestChild)
        .upsampleWillSucceed(rootTile.southwestChild);

      return processor
        .process([rootTile, rootTile.southwestChild])
        .then(function () {
          expect(rootTile.data.terrainData.wasCreatedByUpsampling()).toBe(
            false
          );
          expect(
            rootTile.southwestChild.data.terrainData.wasCreatedByUpsampling()
          ).toBe(true);
        });
    });

    it("loads available tiles", function () {
      mockTerrain
        .willBeAvailable(rootTile.southwestChild)
        .requestTileGeometryWillSucceed(rootTile.southwestChild);

      spyOn(mockTerrain, "requestTileGeometry").and.callThrough();

      return processor.process([rootTile.southwestChild]).then(function () {
        expect(mockTerrain.requestTileGeometry.calls.count()).toBe(1);
        expect(mockTerrain.requestTileGeometry.calls.argsFor(0)[0]).toBe(0);
        expect(mockTerrain.requestTileGeometry.calls.argsFor(0)[1]).toBe(1);
        expect(mockTerrain.requestTileGeometry.calls.argsFor(0)[2]).toBe(1);
      });
    });

    it("marks an upsampled tile as such", function () {
      mockTerrain
        .willBeAvailable(rootTile)
        .requestTileGeometryWillSucceed(rootTile)
        .createMeshWillSucceed(rootTile)
        .willBeUnavailable(rootTile.southwestChild)
        .upsampleWillSucceed(rootTile.southwestChild)
        .createMeshWillSucceed(rootTile.southwestChild);

      var mockImagery = new MockImageryProvider();
      imageryLayerCollection.addImageryProvider(mockImagery);

      mockImagery
        .requestImageWillSucceed(rootTile)
        .requestImageWillFail(rootTile.southwestChild);

      return processor
        .process([rootTile, rootTile.southwestChild])
        .then(function () {
          expect(rootTile.state).toBe(QuadtreeTileLoadState.DONE);
          expect(rootTile.upsampledFromParent).toBe(false);
          expect(rootTile.southwestChild.state).toBe(
            QuadtreeTileLoadState.DONE
          );
          expect(rootTile.southwestChild.upsampledFromParent).toBe(true);
        });
    });

    it("does not mark a tile as upsampled if it has fresh imagery", function () {
      mockTerrain
        .willBeAvailable(rootTile)
        .requestTileGeometryWillSucceed(rootTile)
        .createMeshWillSucceed(rootTile)
        .willBeUnavailable(rootTile.southwestChild)
        .upsampleWillSucceed(rootTile.southwestChild)
        .createMeshWillSucceed(rootTile.southwestChild);

      var mockImagery = new MockImageryProvider();
      imageryLayerCollection.addImageryProvider(mockImagery);

      mockImagery
        .requestImageWillSucceed(rootTile)
        .requestImageWillSucceed(rootTile.southwestChild);

      return processor
        .process([rootTile, rootTile.southwestChild])
        .then(function () {
          expect(rootTile.state).toBe(QuadtreeTileLoadState.DONE);
          expect(rootTile.upsampledFromParent).toBe(false);
          expect(rootTile.southwestChild.state).toBe(
            QuadtreeTileLoadState.DONE
          );
          expect(rootTile.southwestChild.upsampledFromParent).toBe(false);
        });
    });

    it("does not mark a tile as upsampled if it has fresh terrain", function () {
      mockTerrain
        .willBeAvailable(rootTile)
        .requestTileGeometryWillSucceed(rootTile)
        .createMeshWillSucceed(rootTile)
        .willBeAvailable(rootTile.southwestChild)
        .requestTileGeometryWillSucceed(rootTile.southwestChild)
        .createMeshWillSucceed(rootTile.southwestChild);

      var mockImagery = new MockImageryProvider();
      imageryLayerCollection.addImageryProvider(mockImagery);

      mockImagery
        .requestImageWillSucceed(rootTile)
        .requestImageWillFail(rootTile.southwestChild);

      return processor
        .process([rootTile, rootTile.southwestChild])
        .then(function () {
          expect(rootTile.state).toBe(QuadtreeTileLoadState.DONE);
          expect(rootTile.upsampledFromParent).toBe(false);
          expect(rootTile.southwestChild.state).toBe(
            QuadtreeTileLoadState.DONE
          );
          expect(rootTile.southwestChild.upsampledFromParent).toBe(false);
        });
    });

    it("creates water mask texture from one-byte water mask data, if it exists", function () {
      mockTerrain
        .willBeAvailable(rootTile)
        .requestTileGeometryWillSucceed(rootTile)
        .willHaveWaterMask(false, true, rootTile);

      return processor.process([rootTile]).then(function () {
        expect(rootTile.data.waterMaskTexture).toBeDefined();
      });
    });

    it("uses undefined water mask texture for tiles that are entirely land", function () {
      mockTerrain
        .requestTileGeometryWillSucceed(rootTile)
        .willHaveWaterMask(true, false, rootTile);

      return processor.process([rootTile]).then(function () {
        expect(rootTile.data.waterMaskTexture).toBeUndefined();
      });
    });

    it("uses shared water mask texture for tiles that are entirely water", function () {
      mockTerrain
        .requestTileGeometryWillSucceed(rootTile)
        .willHaveWaterMask(false, true, rootTile)
        .requestTileGeometryWillSucceed(rootTile.southwestChild)
        .willHaveWaterMask(false, true, rootTile.southwestChild);

      return processor
        .process([rootTile, rootTile.southwestChild])
        .then(function () {
          expect(rootTile.data.waterMaskTexture).toBe(
            rootTile.southwestChild.data.waterMaskTexture
          );
        });
    });

    it("creates water mask texture from multi-byte water mask data, if it exists", function () {
      mockTerrain
        .requestTileGeometryWillSucceed(rootTile)
        .willHaveWaterMask(true, true, rootTile);

      return processor.process([rootTile]).then(function () {
        expect(rootTile.data.waterMaskTexture).toBeDefined();
      });
    });

    it("upsamples water mask if data is not available", function () {
      mockTerrain
        .requestTileGeometryWillSucceed(rootTile)
        .willHaveWaterMask(false, true, rootTile)
        .requestTileGeometryWillSucceed(rootTile.southwestChild);

      return processor
        .process([rootTile, rootTile.southwestChild])
        .then(function () {
          expect(rootTile.southwestChild.data.waterMaskTexture).toBeDefined();
          expect(
            rootTile.southwestChild.data.waterMaskTranslationAndScale
          ).toEqual(new Cartesian4(0.0, 0.0, 0.5, 0.5));
        });
    });
  });

  describe(
    "pick",
    function () {
      var scene;

      beforeAll(function () {
        scene = createScene();
      });

      afterAll(function () {
        scene.destroyForSpecs();
      });

      it("gets correct results even when the mesh includes normals", function () {
        var terrainProvider = createWorldTerrain({
          requestVertexNormals: true,
          requestWaterMask: false,
        });

        var tile = new QuadtreeTile({
          tilingScheme: new GeographicTilingScheme(),
          level: 11,
          x: 3788,
          y: 1336,
        });

        processor.frameState = scene.frameState;
        processor.terrainProvider = terrainProvider;

        return processor.process([tile]).then(function () {
          var ray = new Ray(
            new Cartesian3(
              -5052039.459789615,
              2561172.040315167,
              -2936276.999965875
            ),
            new Cartesian3(
              0.5036332963145244,
              0.6648033332898124,
              0.5517155343926082
            )
          );
          var pickResult = tile.data.pick(ray, undefined, undefined, true);
          var cartographic = Ellipsoid.WGS84.cartesianToCartographic(
            pickResult
          );
          expect(cartographic.height).toBeGreaterThan(-500.0);
        });
      });

      it("gets correct result when a closer triangle is processed after a farther triangle", function () {
        // Pick root tile (level=0, x=0, y=0) from the east side towards the west.
        // Based on heightmap triangle processing order the west triangle will be tested first, followed
        // by the east triangle. But since the east triangle is closer we expect it to be the pick result.
        var terrainProvider = new EllipsoidTerrainProvider();

        var tile = new QuadtreeTile({
          tilingScheme: new GeographicTilingScheme(),
          level: 0,
          x: 0,
          y: 0,
        });

        processor.frameState = scene.frameState;
        processor.terrainProvider = terrainProvider;

        return processor.process([tile]).then(function () {
          var origin = new Cartesian3(50000000.0, -1.0, 0.0);
          var direction = new Cartesian3(-1.0, 0.0, 0.0);
          var ray = new Ray(origin, direction);
          var cullBackFaces = false;
          var pickResult = tile.data.pick(
            ray,
            undefined,
            undefined,
            cullBackFaces
          );
          expect(pickResult.x).toBeGreaterThan(0.0);
        });
      });

      it("ignores triangles that are behind the ray", function () {
        // Pick root tile (level=0, x=0, y=0) from the center towards the east side (+X).
        var terrainProvider = new EllipsoidTerrainProvider();

        var tile = new QuadtreeTile({
          tilingScheme: new GeographicTilingScheme(),
          level: 0,
          x: 0,
          y: 0,
        });

        processor.frameState = scene.frameState;
        processor.terrainProvider = terrainProvider;

        return processor.process([tile]).then(function () {
          var origin = new Cartesian3(0.0, -1.0, 0.0);
          var direction = new Cartesian3(1.0, 0.0, 0.0);
          var ray = new Ray(origin, direction);
          var cullBackFaces = false;
          var pickResult = tile.data.pick(
            ray,
            undefined,
            undefined,
            cullBackFaces
          );
          expect(pickResult.x).toBeGreaterThan(0.0);
        });
      });
    },
    "WebGL"
  );

  describe("eligibleForUnloading", function () {
    beforeEach(function () {
      processor.mockWebGL();
    });

    it("returns true when no loading has been done", function () {
      rootTile.data = new GlobeSurfaceTile();
      expect(rootTile.data.eligibleForUnloading).toBe(true);
    });

    it("returns true when some loading has been done", function () {
      mockTerrain.requestTileGeometryWillSucceed(rootTile);

      return processor
        .process([rootTile])
        .then(function () {
          expect(rootTile.data.eligibleForUnloading).toBe(true);
          mockTerrain.createMeshWillSucceed(rootTile);
          return processor.process([rootTile]);
        })
        .then(function () {
          expect(rootTile.data.eligibleForUnloading).toBe(true);
        });
    });

    it("returns false when RECEIVING", function () {
      var deferred = when.defer();

      mockTerrain
        .requestTileGeometryWillSucceed(rootTile)
        .requestTileGeometryWillWaitOn(deferred.promise, rootTile);

      return processor.process([rootTile], 5).then(function () {
        expect(rootTile.data.eligibleForUnloading).toBe(false);
        deferred.resolve();
      });
    });

    it("returns false when TRANSFORMING", function () {
      var deferred = when.defer();

      mockTerrain
        .requestTileGeometryWillSucceed(rootTile)
        .createMeshWillSucceed(rootTile)
        .createMeshWillWaitOn(deferred.promise, rootTile);

      return processor.process([rootTile], 5).then(function () {
        expect(rootTile.data.eligibleForUnloading).toBe(false);
        deferred.resolve();
      });
    });

    it("returns false when imagery is TRANSITIONING", function () {
      var deferred = when.defer();

      var mockImagery = new MockImageryProvider();
      imageryLayerCollection.addImageryProvider(mockImagery);

      mockImagery.requestImageWillWaitOn(deferred.promise, rootTile);

      mockTerrain.requestTileGeometryWillSucceed(rootTile);

      return processor.process([rootTile], 5).then(function () {
        expect(rootTile.data.eligibleForUnloading).toBe(false);
        deferred.resolve();
      });
    });
  });

  describe(
    "new picking",
    function () {
      /**
       * @param {Cartesian3} pickResult
       */
      function pickResultToLocation(pickResult) {
        if (!pickResult) {
          return {
            longitude: null,
            latitude: null,
            height: null,
          };
        }
        var cartographic = Cartographic.fromCartesian(pickResult);
        var latitude = CesiumMath.toDegrees(cartographic.latitude);
        var longitude = CesiumMath.toDegrees(cartographic.longitude);
        return {
          longitude: longitude,
          latitude: latitude,
          height: cartographic.height,
        };
      }

      var frameState;
      var imageryLayerCollection;
      var processor;

      var scene;

      beforeAll(function () {
        scene = createScene();
      });

      afterAll(function () {
        scene.destroyForSpecs();
      });

      beforeEach(function () {
        frameState = {
          context: {
            cache: {},
          },
        };

        imageryLayerCollection = new ImageryLayerCollection();
      });

      afterEach(function () {
        resetXHRPatch();
      });

      it("should pick a few points on a CWT tile", function () {
        patchXHRLoad({
          "/layer.json": "Data/CesiumTerrainTileJson/9_759_335/layer.json",
          "/9/759/335.terrain?v=1.2.0":
            "Data/CesiumTerrainTileJson/9_759_335/9_759_335.terrain",
        });

        var terrainProvider = new CesiumTerrainProvider({
          url: "made/up/url",
        });

        processor = new TerrainTileProcessor(
          frameState,
          terrainProvider,
          imageryLayerCollection
        );
        processor.mockWebGL();
        processor.frameState = scene.frameState;

        var tile = new QuadtreeTile({
          tilingScheme: new GeographicTilingScheme({
            numberOfLevelZeroTilesX: 2,
            numberOfLevelZeroTilesY: 1,
            ellipsoid: Ellipsoid.WGS84,
          }),
          level: 9,
          x: 759,
          y: 176,
        });

        return processor.process([tile]).then(function () {
          var direction = new Cartesian3(
            0.04604903643932318,
            0.8821324224085892,
            0.46874500059047475
          );
          var origin = new Cartesian3(0, 0, -20029.056425910585);
          var ray = new Ray(origin, direction);
          var cullBackFaces = false;
          var pickResult = tile.data.pick(
            ray,
            SceneMode.SCENE3D,
            undefined,
            cullBackFaces
          );
          expect(pickResult).toBeDefined();
          expect(pickResult.x).toBeCloseTo(294215.31248307973, 10);
          expect(pickResult.y).toBeCloseTo(5636097.655428245, 10);
          expect(pickResult.z).toBeCloseTo(2974864.3764763945, 10);
        });
      });

      it("should pick a few points on a ArcGIS tile", function () {
        patchXHRLoadForArcGISTerrainDataSet();
        var terrainProvider = new ArcGISTiledElevationTerrainProvider({
          url: "made/up/url",
        });

        processor = new TerrainTileProcessor(
          frameState,
          terrainProvider,
          imageryLayerCollection
        );
        processor.mockWebGL();
        processor.frameState = scene.frameState;

        return terrainProvider.readyPromise.then(function () {
          var tile = new QuadtreeTile({
            tilingScheme: terrainProvider.tilingScheme,
            level: 9,
            x: 379,
            y: 214,
          });
          return processor.process([tile]).then(function () {
            var direction = new Cartesian3(
              0.04604903643932318,
              0.8821324224085892,
              0.46874500059047475
            );
            var origin = new Cartesian3(0, 0, -20029.056425910585);
            var ray = new Ray(origin, direction);
            var cullBackFaces = false;
            var pickResult = tile.data.pick(
              ray,
              SceneMode.SCENE3D,
              undefined,
              cullBackFaces
            );
            var location = pickResultToLocation(pickResult);
            expect(location.latitude).toBeCloseTo(27.952862605533163, 10);
            expect(location.longitude).toBeCloseTo(87.01176072534257, 10);
            expect(location.height).toBeCloseTo(6372, 0);
          });
        });
      });

      it("should do a lot more points", function () {
        // pick a point 10km above sea level (~4k above the terrain at this location)
        var position = {
          longitude: 87.01176072534257,
          latitude: 27.952862605533163,
        };

        var ray = new Ray();
        var cartesian = Cartesian3.fromDegrees(
          position.longitude,
          position.latitude,
          // calculating the normal requires ground level
          0.0,
          Ellipsoid.WGS84
        );
        Ellipsoid.WGS84.geodeticSurfaceNormal(cartesian, ray.direction);
        // Try to find the intersection point between the surface normal and z-axis.
        // minimum height (-11500.0) for the terrain set, need to get this information from the terrain provider
        Ellipsoid.WGS84.getSurfaceNormalIntersectionWithZAxis(
          cartesian,
          11500.0,
          ray.origin
        );

        patchXHRLoadForArcGISTerrainDataSet();
        var terrainProvider = new ArcGISTiledElevationTerrainProvider({
          url: "made/up/url",
        });

        processor = new TerrainTileProcessor(
          frameState,
          terrainProvider,
          imageryLayerCollection
        );
        processor.mockWebGL();
        processor.frameState = scene.frameState;

        return terrainProvider.readyPromise.then(function () {
          var tile = new QuadtreeTile({
            tilingScheme: terrainProvider.tilingScheme,
            level: 9,
            x: 379,
            y: 214,
          });
          return processor.process([tile]).then(function () {
            var cullBackFaces = false;
            var pickResult = tile.data.pick(
              ray,
              SceneMode.SCENE3D,
              undefined,
              cullBackFaces
            );
            var location = pickResultToLocation(pickResult);
            expect(location.latitude).toBeCloseTo(27.952862605533163, 10);
            expect(location.longitude).toBeCloseTo(87.01176072534257, 10);
            expect(location.height).toBeCloseTo(6372, 0);
          });
        });
      });

      it("special point that returned null", function () {
        patchXHRLoadForArcGISTerrainDataSet();

        var ray = new Ray(
          new Cartesian3(0, 0, -20055.701538655045),
          new Cartesian3(
            0.046566275697934596,
            0.8817741083711048,
            0.4693676637498234
          )
        );
        var terrainProvider = new ArcGISTiledElevationTerrainProvider({
          url: "made/up/url",
        });

        processor = new TerrainTileProcessor(
          frameState,
          terrainProvider,
          imageryLayerCollection
        );
        processor.mockWebGL();
        processor.frameState = scene.frameState;

        return terrainProvider.readyPromise.then(function () {
          var tile = new QuadtreeTile({
            tilingScheme: terrainProvider.tilingScheme,
            level: 9,
            x: 379,
            y: 214,
          });
          return processor.process([tile]).then(function () {
            var cullBackFaces = false;
            var pickResult = tile.data.pick(
              ray,
              SceneMode.SCENE3D,
              undefined,
              cullBackFaces
            );
            var location = pickResultToLocation(pickResult);
            expect(location.latitude).toBeCloseTo(27.993258048265453, 10);
            expect(location.longitude).toBeCloseTo(86.97703198692928, 10);
            expect(location.height).toBeCloseTo(5587.6, 0);
          });
        });
      });
    },
    "WebGL"
  );
});
