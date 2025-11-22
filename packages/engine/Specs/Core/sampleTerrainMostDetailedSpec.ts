import {
  Cartographic,
  CesiumTerrainProvider,
  createWorldTerrainAsync,
  sampleTerrainMostDetailed,
} from "../../index.js";

describe("Core/sampleTerrainMostDetailed", function () {
  it("should throw querying heights from terrain without availability", async function () {
    const terrainProvider = await CesiumTerrainProvider.fromUrl(
      "Data/CesiumTerrainTileJson/Heightmap",
    );

    const positions = [
      Cartographic.fromDegrees(86.925145, 27.988257),
      Cartographic.fromDegrees(87.0, 28.0),
    ];

    await expectAsync(
      sampleTerrainMostDetailed(terrainProvider, positions),
    ).toBeRejectedWithDeveloperError(
      "sampleTerrainMostDetailed requires a terrain provider that has tile availability.",
    );
  });

  it("throws without terrainProvider", async function () {
    const positions = [
      Cartographic.fromDegrees(86.925145, 27.988257),
      Cartographic.fromDegrees(87.0, 28.0),
    ];

    await expectAsync(
      sampleTerrainMostDetailed(undefined, positions),
    ).toBeRejectedWithDeveloperError("terrainProvider is required.");
  });

  it("throws without positions", async function () {
    const terrainProvider = await CesiumTerrainProvider.fromUrl(
      "Data/CesiumTerrainTileJson/QuantizedMesh",
    );
    await expectAsync(
      sampleTerrainMostDetailed(terrainProvider, undefined),
    ).toBeRejectedWithDeveloperError("positions is required.");
  });

  it("rejects on tile error when rejectOnTileFail is set", async function () {
    // No terrain tiles in this sample dataset
    const terrainProvider = await CesiumTerrainProvider.fromUrl(
      "Data/CesiumTerrainTileJson/QuantizedMesh1.1",
    );

    const positions = [Cartographic.fromDegrees(0.0, 0.0, 0.0)];

    return expectAsync(
      sampleTerrainMostDetailed(terrainProvider, positions, true),
    ).toBeRejected();
  });

  describe("with CesiumWorldTerrain", function () {
    let worldTerrain;
    beforeAll(async function () {
      worldTerrain = await createWorldTerrainAsync();
    });

    it("queries heights", async function () {
      const positions = [
        Cartographic.fromDegrees(86.925145, 27.988257),
        Cartographic.fromDegrees(87.0, 28.0),
      ];

      const passedPositions = await sampleTerrainMostDetailed(
        worldTerrain,
        positions,
      );
      expect(passedPositions).toBe(positions);
      expect(positions[0].height).toBeGreaterThan(5000);
      expect(positions[0].height).toBeLessThan(10000);
      expect(positions[1].height).toBeGreaterThan(5000);
      expect(positions[1].height).toBeLessThan(10000);
    });

    it("uses a suitable common tile height for a range of locations", async function () {
      const positions = [
        Cartographic.fromDegrees(86.925145, 27.988257),
        Cartographic.fromDegrees(87.0, 28.0),
      ];

      await sampleTerrainMostDetailed(worldTerrain, positions);
      expect(positions[0].height).toBeGreaterThan(5000);
      expect(positions[0].height).toBeLessThan(10000);
      expect(positions[1].height).toBeGreaterThan(5000);
      expect(positions[1].height).toBeLessThan(10000);
    });

    it("works for a dodgy point right near the edge of a tile", async function () {
      const positions = [
        new Cartographic(0.33179290856829535, 0.7363107781851078),
      ];

      await sampleTerrainMostDetailed(worldTerrain, positions);
      expect(positions[0].height).toBeDefined();
    });
  });
});
