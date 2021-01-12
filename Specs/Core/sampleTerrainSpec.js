import {
  Cartographic,
  RequestScheduler,
  Resource,
} from "../../Source/Cesium.js";
import {
  CesiumTerrainProvider,
  ArcGISTiledElevationTerrainProvider,
} from "../../Source/Cesium.js";
import { createWorldTerrain } from "../../Source/Cesium.js";
import { sampleTerrain } from "../../Source/Cesium.js";

describe("Core/sampleTerrain", function () {
  var worldTerrain;
  beforeAll(function () {
    worldTerrain = createWorldTerrain();
    return worldTerrain.readyPromise;
  });

  it("queries heights", function () {
    var positions = [
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
    var terrainProvider = new CesiumTerrainProvider({
      url: "https://s3.amazonaws.com/cesiumjs/smallTerrain",
    });

    var positions = [
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
    var positions = [Cartographic.fromDegrees(0.0, 0.0, 0.0)];

    return sampleTerrain(worldTerrain, 18, positions).then(function () {
      expect(positions[0].height).toBeUndefined();
    });
  });

  it("fills in what it can when given a mix of positions with and without valid tiles", function () {
    var positions = [
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
    var positions = [
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
    var positions = [new Cartographic(0.33179290856829535, 0.7363107781851078)];

    return sampleTerrain(worldTerrain, 12, positions).then(function () {
      expect(positions[0].height).toBeDefined();
    });
  });

  describe("with terrain providers", () => {
    beforeEach(function () {
      RequestScheduler.clearForSpecs();
    });

    afterEach(function () {
      Resource._Implementations.loadWithXhr =
        Resource._DefaultImplementations.loadWithXhr;
    });

    function spyOnTerrainDataCreateMesh(terrainProvider) {
      // do some sneaky spying so we can check out many times createMesh is called
      var originalRequestTileGeometry = terrainProvider.requestTileGeometry;
      spyOn(terrainProvider, "requestTileGeometry").and.callFake(function (
        x,
        y,
        level,
        request
      ) {
        // all the original functioN!
        return originalRequestTileGeometry
          .call(terrainProvider, x, y, level, request)
          .then(function (tile) {
            spyOn(tile, "createMesh").and.callThrough();
            // return the original tile - after we've spied on the create mesh method
            return tile;
          });
      });
    }

    function expectTileAndMeshCounts(
      terrainProvider,
      numberOfTilesRequested,
      wasFirstTileMeshCreated
    ) {
      // all came from a single tile
      expect(terrainProvider.requestTileGeometry.calls.count()).toEqual(
        numberOfTilesRequested
      );

      // get the return terrain data for our spies
      return (
        terrainProvider.requestTileGeometry.calls
          .first()
          // return value was the promise of the TerrainData
          .returnValue.then(function (terrainData) {
            // make sure the mesh was only created once!
            expect(terrainData.createMesh.calls.count()).toEqual(
              wasFirstTileMeshCreated ? 1 : 0
            );
          })
      );
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
        var sourceUrl = new URL(url, "https://google.com");
        var sourceUrlPath =
          sourceUrl.pathname + sourceUrl.search + sourceUrl.hash;

        if (!Object.keys(proxySpec).includes(sourceUrlPath)) {
          var msg =
            "Unexpected XHR load to url: " +
            sourceUrlPath +
            " (from url: " +
            url +
            "); spec includes: " +
            Object.keys(proxySpec).join(", ");
          console.error(msg);
          throw new Error(msg);
        }
        var targetUrl = proxySpec[sourceUrlPath];
        return Resource._DefaultImplementations.loadWithXhr(
          targetUrl,
          responseType,
          method,
          data,
          headers,
          deferred
        );
      };
    }

    it("should work for Cesium World Terrain", () => {
      patchXHRLoad({
        "/fake/url/layer.json": "Data/Terrain/assets_cesium_com/layer.json",
        "/fake/url/9/759/335.terrain?v=1.2.0":
          "Data/Terrain/assets_cesium_com/9_759_335.terrain",
      });
      var terrainProvider = new CesiumTerrainProvider({
        url: "/fake/url",
        requestVertexNormals: false,
        requestWaterMask: false,
      });

      spyOnTerrainDataCreateMesh(terrainProvider);

      var positionA = Cartographic.fromDegrees(
        86.93666235421982,
        27.97989963555095
      );
      var positionB = Cartographic.fromDegrees(
        86.9366623542198,
        27.9798996355509
      );
      var positionC = Cartographic.fromDegrees(
        86.936662354213,
        27.979899635557
      );

      var level = 9;

      return sampleTerrain(terrainProvider, level, [
        positionA,
        positionB,
        positionC,
      ]).then(() => {
        expect(positionA.height).toBeCloseTo(7780, 0);
        expect(positionB.height).toBeCloseTo(7780, 0);
        expect(positionC.height).toBeCloseTo(7780, 0);
        // 1 tile was requested (all positions were close enough on the same tile)
        //  and the mesh was not created because we're using CWT - which doesn't need the mesh for interpolation
        return expectTileAndMeshCounts(terrainProvider, 1, false);
      });
    });

    it("should work for ArcGIS terrain", () => {
      patchXHRLoad({
        "/fake/url/?f=pjson": "Data/Terrain/elevation3d_arcgis_com/root.json",
        "/fake/url/tilemap/10/384/640/128/128":
          "Data/Terrain/elevation3d_arcgis_com/tilemap_10_384_640_128_128.json",
        "/fake/url/tile/9/214/379":
          "Data/Terrain/elevation3d_arcgis_com/tile_9_214_379.tile",
      });

      var terrainProvider = new ArcGISTiledElevationTerrainProvider({
        url: "/fake/url",
      });

      spyOnTerrainDataCreateMesh(terrainProvider);

      var positionA = Cartographic.fromDegrees(
        86.93666235421982,
        27.97989963555095
      );
      var positionB = Cartographic.fromDegrees(
        86.9366623542198,
        27.9798996355509
      );
      var positionC = Cartographic.fromDegrees(
        86.936662354213,
        27.979899635557
      );

      var level = 9;
      return sampleTerrain(terrainProvider, level, [
        positionA,
        positionB,
        positionC,
      ]).then(() => {
        // 3 very similar positions
        expect(positionA.height).toBeCloseTo(7681, 0);
        expect(positionB.height).toBeCloseTo(7681, 0);
        expect(positionC.height).toBeCloseTo(7681, 0);
        // 1 tile was requested (all positions were close enough on the same tile)
        //  and the mesh was created once because we're using an ArcGIS tile
        return expectTileAndMeshCounts(terrainProvider, 1, true);
      });
    });
  });
});
