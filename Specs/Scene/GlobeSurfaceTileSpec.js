import MockImageryProvider from "../MockImageryProvider.js";
import MockTerrainProvider from "../MockTerrainProvider.js";
import TerrainTileProcessor from "../TerrainTileProcessor.js";
import { Cartesian3 } from "../../Source/Cesium.js";
import { Cartesian4 } from "../../Source/Cesium.js";
import { createWorldTerrain } from "../../Source/Cesium.js";
import { Ellipsoid } from "../../Source/Cesium.js";
import { EllipsoidTerrainProvider } from "../../Source/Cesium.js";
import { GeographicTilingScheme } from "../../Source/Cesium.js";
import { Ray } from "../../Source/Cesium.js";
import { GlobeSurfaceTile } from "../../Source/Cesium.js";
import { ImageryLayerCollection } from "../../Source/Cesium.js";
import { QuadtreeTile } from "../../Source/Cesium.js";
import { QuadtreeTileLoadState } from "../../Source/Cesium.js";
import { TerrainState } from "../../Source/Cesium.js";
import { TileProviderError } from "../../Source/Cesium.js";
import createScene from "../createScene.js";
import { when } from "../../Source/Cesium.js";

describe("Scene/GlobeSurfaceTile", function () {
  let frameState;
  let tilingScheme;
  let rootTiles;
  let rootTile;
  let imageryLayerCollection;
  let mockTerrain;
  let processor;

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
    for (let i = 0; i < rootTiles.length; ++i) {
      rootTiles[i].freeResources();
    }
  });

  describe("processStateMachine", function () {
    beforeEach(function () {
      processor.mockWebGL();
    });

    it("starts in the START state", function () {
      for (let i = 0; i < rootTiles.length; ++i) {
        const tile = rootTiles[i];
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

      const mockImagery = new MockImageryProvider();
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

      const mockImagery = new MockImageryProvider();
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

      const mockImagery = new MockImageryProvider();
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
      let scene;

      beforeAll(function () {
        scene = createScene();
      });

      afterAll(function () {
        scene.destroyForSpecs();
      });

      it("gets correct results even when the mesh includes normals", function () {
        const terrainProvider = createWorldTerrain({
          requestVertexNormals: true,
          requestWaterMask: false,
        });

        // const terrainProvider = new CesiumTerrainProvider({
        //   url: "/Specs/Mocks/CesiumTerrainProvider", // Mock payload from Ion
        //   requestVertexNormals: true,
        //   requestWaterMask: true,
        //   ready: true,
        // });

        // const terrainProvider = mockTerrain.createMeshWillSucceed(rootTile);

        const tile = new QuadtreeTile({
          tilingScheme: new GeographicTilingScheme(),
          level: 11,
          x: 3788,
          y: 1336,
        });

        processor.frameState = scene.frameState;
        processor.terrainProvider = terrainProvider;

        return processor.process([tile]).then(function () {
          const origin = new Cartesian3(
            -5052039.459789615,
            2561172.040315167,
            -2936276.999965875
          );
          const direction = new new Cartesian3(
            0.5036332963145244,
            0.6648033332898124,
            0.5517155343926082
          )();

          const ray = new Ray(origin, direction);

          const pickResult = tile.data.pick(ray, undefined, undefined, true);
          const cartographic = Ellipsoid.WGS84.cartesianToCartographic(
            pickResult
          );
          expect(cartographic.height).toBeGreaterThan(-500.0);
        });
      });

      it("gets correct result when a closer triangle is processed after a farther triangle", function () {
        // Pick root tile (level=0, x=0, y=0) from the east side towards the west.
        // Based on heightmap triangle processing order the west triangle will be tested first, followed
        // by the east triangle. But since the east triangle is closer we expect it to be the pick result.
        const terrainProvider = new EllipsoidTerrainProvider();

        const tile = new QuadtreeTile({
          tilingScheme: new GeographicTilingScheme(),
          level: 0,
          x: 0,
          y: 0,
        });

        processor.frameState = scene.frameState;
        processor.terrainProvider = terrainProvider;

        return processor.process([tile]).then(function () {
          const origin = new Cartesian3(50000000.0, -1.0, 0.0);
          const direction = new Cartesian3(-1.0, 0.0, 0.0);
          const ray = new Ray(origin, direction);
          const cullBackFaces = false;
          const pickResult = tile.data.pick(
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
        const terrainProvider = new EllipsoidTerrainProvider();

        const tile = new QuadtreeTile({
          tilingScheme: new GeographicTilingScheme(),
          level: 0,
          x: 0,
          y: 0,
        });

        processor.frameState = scene.frameState;
        processor.terrainProvider = terrainProvider;

        return processor.process([tile]).then(function () {
          const origin = new Cartesian3(0.0, -1.0, 0.0);
          const direction = new Cartesian3(1.0, 0.0, 0.0);
          const ray = new Ray(origin, direction);
          const cullBackFaces = false;
          const pickResult = tile.data.pick(
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
      const deferred = when.defer();

      mockTerrain
        .requestTileGeometryWillSucceed(rootTile)
        .requestTileGeometryWillWaitOn(deferred.promise, rootTile);

      return processor.process([rootTile], 5).then(function () {
        expect(rootTile.data.eligibleForUnloading).toBe(false);
        deferred.resolve();
      });
    });

    it("returns false when TRANSFORMING", function () {
      const deferred = when.defer();

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
      const deferred = when.defer();

      const mockImagery = new MockImageryProvider();
      imageryLayerCollection.addImageryProvider(mockImagery);

      mockImagery.requestImageWillWaitOn(deferred.promise, rootTile);

      mockTerrain.requestTileGeometryWillSucceed(rootTile);

      return processor.process([rootTile], 5).then(function () {
        expect(rootTile.data.eligibleForUnloading).toBe(false);
        deferred.resolve();
      });
    });
  });
});
