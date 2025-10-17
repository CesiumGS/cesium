import {
  Cesium3DTilesTerrainProvider,
  Resource,
  TerrainProvider,
} from "../../index.js";

describe("Core/Cesium3DTilesTerrainProvider", function () {
  it("conforms to TerrainProvider interface", function () {
    expect(Cesium3DTilesTerrainProvider).toConformToInterface(TerrainProvider);
  });

  it("fromUrl throws if url is not provided", async function () {
    await expectAsync(
      Cesium3DTilesTerrainProvider.fromUrl(),
    ).toBeRejectedWithDeveloperError(
      "url is required, actual value was undefined",
    );
  });

  it("fromUrl rejects when url rejects", async function () {
    const error = new Error();
    await expectAsync(
      Cesium3DTilesTerrainProvider.fromUrl(Promise.reject(error)),
    ).toBeRejectedWithError();
  });

  it("fromUrl rejects when url is invalid", async function () {
    const path = "made/up/url";
    await expectAsync(
      Cesium3DTilesTerrainProvider.fromUrl(path),
    ).toBeRejectedWithError();
  });

  it("fromUrl works with path", async function () {
    const path = "Data/Cesium3DTiles/Terrain/Test/tileset.json";

    const provider = await Cesium3DTilesTerrainProvider.fromUrl(path);

    expect(provider).toBeInstanceOf(Cesium3DTilesTerrainProvider);
  });

  it("fromUrl when url promise is used", async function () {
    const path = "Data/Cesium3DTiles/Terrain/Test/tileset.json";

    const provider = await Cesium3DTilesTerrainProvider.fromUrl(
      Promise.resolve(path),
    );

    expect(provider).toBeInstanceOf(Cesium3DTilesTerrainProvider);
  });

  it("fromUrl works with Resource", async function () {
    const path = "Data/Cesium3DTiles/Terrain/Test/tileset.json";

    const resource = new Resource(path);

    const provider = await Cesium3DTilesTerrainProvider.fromUrl(resource);

    expect(provider).toBeInstanceOf(Cesium3DTilesTerrainProvider);
  });

  it("logo is undefined if credit is not provided", async function () {
    const path = "Data/Cesium3DTiles/Terrain/Test/tileset.json";

    const provider = await Cesium3DTilesTerrainProvider.fromUrl(path);

    expect(provider.credit).toBeUndefined();
  });

  it("logo is defined if credit is provided", async function () {
    const path = "Data/Cesium3DTiles/Terrain/Test/tileset.json";
    const credit = "test";

    const provider = await Cesium3DTilesTerrainProvider.fromUrl(path, {
      credit: credit,
    });

    expect(provider.credit).toBeDefined();
    expect(provider.credit.html).toEqual("test");
  });

  it("has a water mask when requested", async function () {
    const path = "Data/Cesium3DTiles/Terrain/Test/tileset.json";

    const provider = await Cesium3DTilesTerrainProvider.fromUrl(path, {
      requestWaterMask: true,
    });

    expect(provider.hasWaterMask).toBe(true);
  });
});

// TODO: test with dataUri
