import { Cartographic } from "../../Source/Cesium.js";
import { CesiumTerrainProvider } from "../../Source/Cesium.js";
import { sampleTerrainMostDetailed } from "../../Source/Cesium.js";

describe("Core/sampleTerrainMostDetailed", function () {
  let worldTerrain;
  beforeAll(function () {
    worldTerrain = new CesiumTerrainProvider({
      url: "Data/CesiumTerrainTileJson/9_759_335",
      requestVertexNormals: false,
      requestWaterMask: false,
    });
    return worldTerrain.readyPromise;
  });

  it("queries heights", function () {
    const positions = [
      Cartographic.fromDegrees(86.925145, 27.988257),
      Cartographic.fromDegrees(87.0, 28.0),
    ];

    return sampleTerrainMostDetailed(worldTerrain, positions).then(function (
      passedPositions
    ) {
      expect(passedPositions).toBe(positions);
      expect(positions[0].height).toBeGreaterThan(5000);
      expect(positions[0].height).toBeLessThan(10000);
      expect(positions[1].height).toBeGreaterThan(5000);
      expect(positions[1].height).toBeLessThan(10000);
    });
  });

  it("should throw querying heights from Small Terrain", function () {
    const terrainProvider = new CesiumTerrainProvider({
      url: "https://s3.amazonaws.com/cesiumjs/smallTerrain",
    });

    const positions = [
      Cartographic.fromDegrees(86.925145, 27.988257),
      Cartographic.fromDegrees(87.0, 28.0),
    ];

    return sampleTerrainMostDetailed(terrainProvider, positions)
      .then(function () {
        fail("the promise should not resolve");
      })
      .catch(function () {});
  });

  it("uses a suitable common tile height for a range of locations", function () {
    const positions = [
      Cartographic.fromDegrees(86.925145, 27.988257),
      Cartographic.fromDegrees(87.0, 28.0),
    ];

    return sampleTerrainMostDetailed(worldTerrain, positions).then(function () {
      expect(positions[0].height).toBeGreaterThan(5000);
      expect(positions[0].height).toBeLessThan(10000);
      expect(positions[1].height).toBeGreaterThan(5000);
      expect(positions[1].height).toBeLessThan(10000);
    });
  });

  it("requires terrainProvider and positions", function () {
    const positions = [
      Cartographic.fromDegrees(86.925145, 27.988257),
      Cartographic.fromDegrees(87.0, 28.0),
    ];

    expect(function () {
      sampleTerrainMostDetailed(undefined, positions);
    }).toThrowDeveloperError();

    expect(function () {
      sampleTerrainMostDetailed(worldTerrain, undefined);
    }).toThrowDeveloperError();
  });

  it("works for a dodgy point right near the edge of a tile", function () {
    const positions = [
      new Cartographic(0.33179290856829535, 0.7363107781851078),
    ];

    return sampleTerrainMostDetailed(worldTerrain, positions).then(function () {
      expect(positions[0].height).toBeDefined();
    });
  });
});
