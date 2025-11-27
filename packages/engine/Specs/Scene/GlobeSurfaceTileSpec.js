import {
  Cartesian4,
  GeographicTilingScheme,
  GlobeSurfaceTile,
  ImageryLayerCollection,
  QuadtreeTile,
  QuadtreeTileLoadState,
  TerrainState,
  TileProviderError,
} from "../../index.js";
import MockImageryProvider from "../../../../Specs/MockImageryProvider.js";
import MockTerrainProvider from "../../../../Specs/MockTerrainProvider.js";
import TerrainTileProcessor from "../../../../Specs/TerrainTileProcessor.js";

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
      imageryLayerCollection,
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
          QuadtreeTileLoadState.LOADING,
        );
        expect(rootTile.southwestChild.data.terrainState).toBe(
          TerrainState.UNLOADED,
        );
      });
    });

    it("transitions to the LOADING tile state and FAILED terrain state immediately if this tile is NOT available", function () {
      mockTerrain.willBeUnavailable(rootTile.southwestChild);

      return processor.process([rootTile.southwestChild]).then(function () {
        expect(rootTile.southwestChild.state).toBe(
          QuadtreeTileLoadState.LOADING,
        );
        expect(rootTile.southwestChild.data.terrainState).toBe(
          TerrainState.FAILED,
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
      spyOn(TileProviderError, "reportError").and.callThrough();
      mockTerrain.requestTileGeometryWillFail(rootTile);

      return processor.process([rootTile]).then(function () {
        expect(TileProviderError.reportError.calls.count()).toBe(1);
        // Test that message argument is defined.
        expect(TileProviderError.reportError.calls.argsFor(0)[3]).toContain(
          "RuntimeError: requestTileGeometry failed as requested.",
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
            false,
          );
          expect(
            rootTile.southwestChild.data.terrainData.wasCreatedByUpsampling(),
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
            QuadtreeTileLoadState.DONE,
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
            QuadtreeTileLoadState.DONE,
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
            QuadtreeTileLoadState.DONE,
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
            rootTile.southwestChild.data.waterMaskTexture,
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
            rootTile.southwestChild.data.waterMaskTranslationAndScale,
          ).toEqual(new Cartesian4(0.0, 0.0, 0.5, 0.5));
        });
    });
  });

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
      const promise = new Promise((resolve) => {
        processor.process([rootTile], 5).then(function () {
          expect(rootTile.data.eligibleForUnloading).toBe(false);
          resolve();
        });
      });

      mockTerrain
        .requestTileGeometryWillSucceed(rootTile)
        .requestTileGeometryWillWaitOn(promise, rootTile);

      return promise;
    });

    it("returns false when TRANSFORMING", function () {
      const promise = new Promise((resolve) => {
        processor.process([rootTile], 5).then(function () {
          expect(rootTile.data.eligibleForUnloading).toBe(false);
          resolve();
        });
      });

      mockTerrain
        .requestTileGeometryWillSucceed(rootTile)
        .createMeshWillSucceed(rootTile)
        .createMeshWillWaitOn(promise, rootTile);

      return promise;
    });

    it("returns false when imagery is TRANSITIONING", function () {
      let resolveFunc;
      const promise = new Promise((resolve) => {
        resolveFunc = resolve;
      });
      const mockImagery = new MockImageryProvider();
      imageryLayerCollection.addImageryProvider(mockImagery);

      mockImagery.requestImageWillWaitOn(promise, rootTile);

      mockTerrain.requestTileGeometryWillSucceed(rootTile);

      return processor.process([rootTile], 5).then(function () {
        expect(rootTile.data.eligibleForUnloading).toBe(false);
        resolveFunc();
      });
    });
  });
});
