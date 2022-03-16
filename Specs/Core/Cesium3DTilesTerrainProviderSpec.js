import { Cesium3DTilesTerrainProvider } from "../../Source/Cesium.js";
import { Resource } from "../../Source/Cesium.js";
import { TerrainProvider } from "../../Source/Cesium.js";

describe("Core/Cesium3DTilesTerrainProvider", function () {
  it("conforms to TerrainProvider interface", function () {
    expect(Cesium3DTilesTerrainProvider).toConformToInterface(TerrainProvider);
  });

  it("constructor throws if url is not provided", function () {
    expect(function () {
      return new Cesium3DTilesTerrainProvider();
    }).toThrowDeveloperError();

    expect(function () {
      return new Cesium3DTilesTerrainProvider({});
    }).toThrowDeveloperError();
  });

  it("rejects readyPromise when url rejects", function () {
    const error = new Error();
    const provider = new Cesium3DTilesTerrainProvider({
      url: Promise.reject(error),
    });
    return provider.readyPromise
      .then(function (result) {
        fail("should not resolve");
      })
      .catch(function (result) {
        expect(result).toBe(error);
        expect(provider.ready).toBe(false);
      });
  });

  it("rejects readyPromise when url is invalid", function () {
    const path = "made/up/url";
    const provider = new Cesium3DTilesTerrainProvider({
      url: path,
    });
    return provider.readyPromise
      .then(function (result) {
        fail("should not resolve");
      })
      .catch(function (error) {
        expect(error.statusCode).toBe(404);
        expect(provider.ready).toBe(false);
      });
  });

  it("resolves readyPromise", function () {
    const path = "Data/Cesium3DTiles/Terrain/Test/tileset.json";

    const provider = new Cesium3DTilesTerrainProvider({
      url: path,
    });

    return provider.readyPromise.then(function (result) {
      expect(result).toBe(true);
      expect(provider.ready).toBe(true);
    });
  });

  it("resolves readyPromise when url promise is used", function () {
    const path = "Data/Cesium3DTiles/Terrain/Test/tileset.json";

    const provider = new Cesium3DTilesTerrainProvider({
      url: Promise.resolve(path),
    });

    return provider.readyPromise.then(function (result) {
      expect(result).toBe(true);
      expect(provider.ready).toBe(true);
    });
  });

  it("resolves readyPromise with Resource", function () {
    const path = "Data/Cesium3DTiles/Terrain/Test/tileset.json";

    const resource = new Resource({
      url: path,
    });

    const provider = new Cesium3DTilesTerrainProvider({
      url: resource,
    });

    return provider.readyPromise.then(function (result) {
      expect(result).toBe(true);
      expect(provider.ready).toBe(true);
    });
  });

  it("logo is undefined if credit is not provided", function () {
    const path = "Data/Cesium3DTiles/Terrain/Test/tileset.json";

    const provider = new Cesium3DTilesTerrainProvider({
      url: path,
    });

    return provider.readyPromise.then(function (result) {
      expect(provider.credit).toBeUndefined();
    });
  });

  it("logo is defined if credit is provided", function () {
    const path = "Data/Cesium3DTiles/Terrain/Test/tileset.json";
    const credit = "test";

    const provider = new Cesium3DTilesTerrainProvider({
      url: path,
      credit: credit,
    });

    return provider.readyPromise.then(function (result) {
      expect(provider.credit).toBeDefined();
    });
  });
});

// TODO: test with dataUri
