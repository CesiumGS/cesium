import {
  Cartographic,
  CesiumTerrainProvider,
  createWorldTerrainAsync,
  IonResource,
  sampleTerrainMostDetailed,
} from "../../index.js";

describe("Core/sampleTerrainMostDetailed", function () {
  let worldTerrain;
  beforeAll(async function () {
    worldTerrain = await createWorldTerrainAsync();
  });

  it("queries heights from deprecated world terrain", async function () {
    const positions = [
      Cartographic.fromDegrees(86.925145, 27.988257),
      Cartographic.fromDegrees(87.0, 28.0),
    ];

    const terrain = new CesiumTerrainProvider({
      url: IonResource.fromAssetId(1),
    });

    return sampleTerrainMostDetailed(terrain, positions).then(function (
      passedPositions
    ) {
      expect(passedPositions).toBe(positions);
      expect(positions[0].height).toBeGreaterThan(5000);
      expect(positions[0].height).toBeLessThan(10000);
      expect(positions[1].height).toBeGreaterThan(5000);
      expect(positions[1].height).toBeLessThan(10000);
    });
  });

  it("queries heights", async function () {
    const positions = [
      Cartographic.fromDegrees(86.925145, 27.988257),
      Cartographic.fromDegrees(87.0, 28.0),
    ];

    const passedPositions = await sampleTerrainMostDetailed(
      worldTerrain,
      positions
    );
    expect(passedPositions).toBe(positions);
    expect(positions[0].height).toBeGreaterThan(5000);
    expect(positions[0].height).toBeLessThan(10000);
    expect(positions[1].height).toBeGreaterThan(5000);
    expect(positions[1].height).toBeLessThan(10000);
  });

  it("should throw querying heights from Small Terrain", async function () {
    const terrainProvider = await CesiumTerrainProvider.fromUrl(
      "https://s3.amazonaws.com/cesiumjs/smallTerrain"
    );

    const positions = [
      Cartographic.fromDegrees(86.925145, 27.988257),
      Cartographic.fromDegrees(87.0, 28.0),
    ];

    await expectAsync(
      sampleTerrainMostDetailed(terrainProvider, positions)
    ).toBeRejectedWithDeveloperError(
      "sampleTerrainMostDetailed requires a terrain provider that has tile availability."
    );
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

  it("throws without terrainProvider", async function () {
    const positions = [
      Cartographic.fromDegrees(86.925145, 27.988257),
      Cartographic.fromDegrees(87.0, 28.0),
    ];

    await expectAsync(
      sampleTerrainMostDetailed(undefined, positions)
    ).toBeRejectedWithDeveloperError("terrainProvider is required.");
  });

  it("throws without positions", async function () {
    await expectAsync(
      sampleTerrainMostDetailed(worldTerrain, undefined)
    ).toBeRejectedWithDeveloperError("positions is required.");
  });

  it("works for a dodgy point right near the edge of a tile", async function () {
    const positions = [
      new Cartographic(0.33179290856829535, 0.7363107781851078),
    ];

    await sampleTerrainMostDetailed(worldTerrain, positions);
    expect(positions[0].height).toBeDefined();
  });
});
