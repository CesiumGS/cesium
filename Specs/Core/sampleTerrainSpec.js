import { ArcGISTiledElevationTerrainProvider } from "../../Source/Cesium.js";
import { Cartographic } from "../../Source/Cesium.js";
import { CesiumTerrainProvider } from "../../Source/Cesium.js";
import { createWorldTerrain } from "../../Source/Cesium.js";
import { defined } from "../../Source/Cesium.js";
import { RequestScheduler } from "../../Source/Cesium.js";
import { Resource } from "../../Source/Cesium.js";
import { sampleTerrain } from "../../Source/Cesium.js";

describe("Core/sampleTerrain", function () {
  let worldTerrain;
  beforeAll(function () {
    worldTerrain = createWorldTerrain();
    return worldTerrain.readyPromise;
  });

  it("queries heights", function () {
    const positions = [
      Cartographic.fromDegrees(86.925145, 27.988257),
      Cartographic.fromDegrees(87.0, 28.0),
    ];

    return sampleTerrain(worldTerrain, 11, positions).then(function (
      passedPositions
    ) {
      expect(passedPositions).toBe(positions);
      expect(positions[0].height).toBeGreaterThan(5000);
      expect(positions[0].height).toBeLessThan(10000);
      expect(positions[1].height).toBeGreaterThan(5000);
      expect(positions[1].height).toBeLessThan(10000);
    });
  });

  it("queries heights from Small Terrain", function () {
    const terrainProvider = new CesiumTerrainProvider({
      url: "https://s3.amazonaws.com/cesiumjs/smallTerrain",
    });

    const positions = [
      Cartographic.fromDegrees(86.925145, 27.988257),
      Cartographic.fromDegrees(87.0, 28.0),
    ];

    return sampleTerrain(terrainProvider, 11, positions).then(function (
      passedPositions
    ) {
      expect(passedPositions).toBe(positions);
      expect(positions[0].height).toBeGreaterThan(5000);
      expect(positions[0].height).toBeLessThan(10000);
      expect(positions[1].height).toBeGreaterThan(5000);
      expect(positions[1].height).toBeLessThan(10000);
    });
  });

  it("sets height to undefined if terrain data is not available at the position and specified level", function () {
    const positions = [Cartographic.fromDegrees(0.0, 0.0, 0.0)];

    return sampleTerrain(worldTerrain, 18, positions).then(function () {
      expect(positions[0].height).toBeUndefined();
    });
  });

  it("fills in what it can when given a mix of positions with and without valid tiles", function () {
    const positions = [
      Cartographic.fromDegrees(86.925145, 27.988257),
      Cartographic.fromDegrees(0.0, 89.0, 0.0),
      Cartographic.fromDegrees(87.0, 28.0),
    ];

    return sampleTerrain(worldTerrain, 12, positions).then(function () {
      expect(positions[0].height).toBeGreaterThan(5000);
      expect(positions[0].height).toBeLessThan(10000);
      expect(positions[1].height).toBeUndefined();
      expect(positions[2].height).toBeGreaterThan(5000);
      expect(positions[2].height).toBeLessThan(10000);
    });
  });

  it("requires terrainProvider, level, and positions", function () {
    const positions = [
      Cartographic.fromDegrees(86.925145, 27.988257),
      Cartographic.fromDegrees(0.0, 0.0, 0.0),
      Cartographic.fromDegrees(87.0, 28.0),
    ];

    expect(function () {
      sampleTerrain(undefined, 11, positions);
    }).toThrowDeveloperError();

    expect(function () {
      sampleTerrain(worldTerrain, undefined, positions);
    }).toThrowDeveloperError();

    expect(function () {
      sampleTerrain(worldTerrain, 11, undefined);
    }).toThrowDeveloperError();
  });

  it("works for a dodgy point right near the edge of a tile", function () {
    const positions = [
      new Cartographic(0.33179290856829535, 0.7363107781851078),
    ];

    return sampleTerrain(worldTerrain, 12, positions).then(function () {
      expect(positions[0].height).toBeDefined();
    });
  });

  describe("with terrain providers", function () {
    beforeEach(function () {
      RequestScheduler.clearForSpecs();
    });

    afterEach(function () {
      Resource._Implementations.loadWithXhr =
        Resource._DefaultImplementations.loadWithXhr;
    });

    function spyOnTerrainDataCreateMesh(terrainProvider) {
      // do some sneaky spying, so we can check how many times createMesh is called
      const originalRequestTileGeometry = terrainProvider.requestTileGeometry;
      spyOn(terrainProvider, "requestTileGeometry").and.callFake(function (
        x,
        y,
        level,
        request
      ) {
        // Call the original function!
        return originalRequestTileGeometry
          .call(terrainProvider, x, y, level, request)
          .then(function (tile) {
            spyOn(tile, "createMesh").and.callThrough();
            // return the original tile - after we've spied on the createMesh method
            return tile;
          });
      });
    }

    function expectTileAndMeshCounts(
      terrainProvider,
      numberOfTilesRequested,
      wasFirstTileMeshCreated
    ) {
      // assert how many tiles were requested
      expect(terrainProvider.requestTileGeometry.calls.count()).toEqual(
        numberOfTilesRequested
      );

      // get the first tile that was requested
      return (
        terrainProvider.requestTileGeometry.calls
          .first()
          // the return value was the promise of the tile, so wait for that
          .returnValue.then(function (terrainData) {
            // assert if the mesh was created or not for this tile
            expect(terrainData.createMesh.calls.count()).toEqual(
              wasFirstTileMeshCreated ? 1 : 0
            );
          })
      );
    }

    function endsWith(value, suffix) {
      return value.indexOf(suffix, value.length - suffix.length) >= 0;
    }

    function patchXHRLoad(proxySpec) {
      Resource._Implementations.loadWithXhr = function (
        url,
        responseType,
        method,
        data,
        headers,
        deferred,
        overrideMimeType
      ) {
        // find a key (source path) path in the spec which matches (ends with) the requested url
        const availablePaths = Object.keys(proxySpec);
        let proxiedUrl;

        for (let i = 0; i < availablePaths.length; i++) {
          const srcPath = availablePaths[i];
          if (endsWith(url, srcPath)) {
            proxiedUrl = proxySpec[availablePaths[i]];
            break;
          }
        }

        // it's a whitelist - meaning you have to proxy every request explicitly
        if (!defined(proxiedUrl)) {
          throw new Error(
            `Unexpected XHR load to url: ${url}; spec includes: ${availablePaths.join(
              ", "
            )}`
          );
        }

        // make a real request to the proxied path for the matching source path
        return Resource._DefaultImplementations.loadWithXhr(
          proxiedUrl,
          responseType,
          method,
          data,
          headers,
          deferred,
          overrideMimeType
        );
      };
    }

    it("should work for Cesium World Terrain", function () {
      patchXHRLoad({
        "/layer.json": "Data/CesiumTerrainTileJson/9_759_335/layer.json",
        "/9/759/335.terrain?v=1.2.0":
          "Data/CesiumTerrainTileJson/9_759_335/9_759_335.terrain",
      });
      const terrainProvider = new CesiumTerrainProvider({
        url: "made/up/url",
      });

      spyOnTerrainDataCreateMesh(terrainProvider);

      const positionA = Cartographic.fromDegrees(
        86.93666235421982,
        27.97989963555095
      );
      const positionB = Cartographic.fromDegrees(
        86.9366623542198,
        27.9798996355509
      );
      const positionC = Cartographic.fromDegrees(
        86.936662354213,
        27.979899635557
      );

      const level = 9;

      return sampleTerrain(terrainProvider, level, [
        positionA,
        positionB,
        positionC,
      ]).then(function () {
        expect(positionA.height).toBeCloseTo(7780, 0);
        expect(positionB.height).toBeCloseTo(7780, 0);
        expect(positionC.height).toBeCloseTo(7780, 0);
        // 1 tile was requested (all positions were close enough on the same tile)
        //  and the mesh was not created because we're using CWT - which doesn't need the mesh for interpolation
        return expectTileAndMeshCounts(terrainProvider, 1, false);
      });
    });

    it("should work for ArcGIS terrain", function () {
      patchXHRLoad({
        "/?f=pjson": "Data/ArcGIS/9_214_379/root.json",
        "/tilemap/10/384/640/128/128":
          "Data/ArcGIS/9_214_379/tilemap_10_384_640_128_128.json",
        "/tile/9/214/379": "Data/ArcGIS/9_214_379/tile_9_214_379.tile",
      });

      const terrainProvider = new ArcGISTiledElevationTerrainProvider({
        url: "made/up/url",
      });

      spyOnTerrainDataCreateMesh(terrainProvider);

      const positionA = Cartographic.fromDegrees(
        86.93666235421982,
        27.97989963555095
      );
      const positionB = Cartographic.fromDegrees(
        86.9366623542198,
        27.9798996355509
      );
      const positionC = Cartographic.fromDegrees(
        86.936662354213,
        27.979899635557
      );

      const level = 9;
      return sampleTerrain(terrainProvider, level, [
        positionA,
        positionB,
        positionC,
      ]).then(function () {
        // 3 very similar positions
        expect(positionA.height).toBeCloseTo(7681, 0);
        expect(positionB.height).toBeCloseTo(7681, 0);
        expect(positionC.height).toBeCloseTo(7681, 0);
        // 1 tile was requested (all positions were close enough on the same tile)
        //  and the mesh was created once because we're using an ArcGIS tile
        return expectTileAndMeshCounts(terrainProvider, 1, true);
      });
    });

    it("should handle the RequestScheduler throttling the requestTileGeometry requests with a retry", function () {
      patchXHRLoad({
        "/?f=pjson": "Data/ArcGIS/9_214_379/root.json",
        "/tilemap/10/384/640/128/128":
          "Data/ArcGIS/9_214_379/tilemap_10_384_640_128_128.json",
        // we need multiple tiles to be requested, the actual value is not so important for this test
        "/tile/9/214/379": "Data/ArcGIS/9_214_379/tile_9_214_379.tile",
        "/tile/9/214/378": "Data/ArcGIS/9_214_379/tile_9_214_379.tile",
        "/tile/9/214/376": "Data/ArcGIS/9_214_379/tile_9_214_379.tile",
      });

      const terrainProvider = new ArcGISTiledElevationTerrainProvider({
        url: "made/up/url",
      });

      let i = 0;
      const originalRequestTileGeometry = terrainProvider.requestTileGeometry;
      spyOn(terrainProvider, "requestTileGeometry").and.callFake(function (
        x,
        y,
        level,
        request
      ) {
        i++;
        if (i === 2 || i === 3) {
          // on the 2nd and 3rd requestTileGeometry call, return undefined
          //  to simulate RequestScheduler throttling the request
          return undefined;
        }
        // otherwise, call the original method
        return originalRequestTileGeometry.call(
          terrainProvider,
          x,
          y,
          level,
          request
        );
      });

      // 3 positions, quite far apart (requires multiple tile requests)
      const positionA = Cartographic.fromDegrees(85, 28);
      const positionB = Cartographic.fromDegrees(86, 28);
      const positionC = Cartographic.fromDegrees(87, 28);

      const level = 9;
      return sampleTerrain(terrainProvider, level, [
        positionA,
        positionB,
        positionC,
      ]).then(function () {
        // the order of requests is an implementation detail and not important,
        //  but it is deterministic, and we can assert that there were some retries in there
        const calls = terrainProvider.requestTileGeometry.calls;
        expect(calls.count()).toEqual(5);
        expect(calls.argsFor(0)).toEqual([376, 214, 9]);
        expect(calls.argsFor(1)).toEqual([378, 214, 9]);
        // this tile was retried twice, because the 2nd and 3rd call to requestTileGeometry returned undefined as expected
        expect(calls.argsFor(2)).toEqual([378, 214, 9]);
        expect(calls.argsFor(3)).toEqual([378, 214, 9]);
        expect(calls.argsFor(4)).toEqual([379, 214, 9]);
      });
    });
  });
});
