import { CustomHeightmapTerrainProvider } from "../../Source/Cesium.js";
import { TerrainProvider } from "../../Source/Cesium.js";
import { WebMercatorTilingScheme } from "../../Source/Cesium.js";

describe("Core/CustomHeightmapTerrainProvider", function () {
  it("conforms to TerrainProvider interface", function () {
    expect(CustomHeightmapTerrainProvider).toConformToInterface(
      TerrainProvider
    );
  });

  it("constructor throws if callback is not provided", function () {
    var width = 2;
    var height = 2;

    expect(function () {
      return new CustomHeightmapTerrainProvider({
        width: width,
        height: height,
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws if width is not provided", function () {
    var width = 2;
    var height = 2;
    var callback = function (x, y, level) {
      return new Float32Array(width * height);
    };

    expect(function () {
      return new CustomHeightmapTerrainProvider({
        callback: callback,
        height: height,
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws if height is not provided", function () {
    var width = 2;
    var height = 2;
    var callback = function (x, y, level) {
      return new Float32Array(width * height);
    };

    expect(function () {
      return new CustomHeightmapTerrainProvider({
        callback: callback,
        width: width,
      });
    }).toThrowDeveloperError();
  });

  it("constructs with a credit", function () {
    var width = 2;
    var height = 2;
    var callback = function (x, y, level) {
      return new Float32Array(width * height);
    };

    var provider = new CustomHeightmapTerrainProvider({
      callback: callback,
      width: width,
      height: height,
      credit: "Credit",
    });

    expect(provider.credit).toBeDefined();
  });

  it("constructs with a tiling scheme", function () {
    var width = 2;
    var height = 2;
    var callback = function (x, y, level) {
      return new Float32Array(width * height);
    };

    var provider = new CustomHeightmapTerrainProvider({
      callback: callback,
      width: width,
      height: height,
      tilingScheme: new WebMercatorTilingScheme(),
    });

    expect(provider.tilingScheme).toBeInstanceOf(WebMercatorTilingScheme);
  });

  it("resolves readyPromise", function () {
    var width = 2;
    var height = 2;
    var callback = function (x, y, level) {
      return new Float32Array(width * height);
    };

    var provider = new CustomHeightmapTerrainProvider({
      callback: callback,
      width: width,
      height: height,
    });

    return provider.readyPromise.then(function (result) {
      expect(result).toBe(true);
      expect(provider.ready).toBe(true);
    });
  });

  it("has error event", function () {
    var width = 2;
    var height = 2;
    var callback = function (x, y, level) {
      return new Float32Array(width * height);
    };

    var provider = new CustomHeightmapTerrainProvider({
      callback: callback,
      width: width,
      height: height,
    });

    expect(provider.errorEvent).toBeDefined();
    expect(provider.errorEvent).toBe(provider.errorEvent);
  });

  it("gets geometric error", function () {
    var width = 2;
    var height = 2;
    var callback = function (x, y, level) {
      return new Float32Array(width * height);
    };

    var provider = new CustomHeightmapTerrainProvider({
      callback: callback,
      width: width,
      height: height,
    });

    var geometricError = TerrainProvider.getEstimatedLevelZeroGeometricErrorForAHeightmap(
      provider.tilingScheme.ellipsoid,
      Math.max(provider.width, provider.height),
      provider.tilingScheme.getNumberOfXTilesAtLevel(0)
    );
    expect(provider.getLevelMaximumGeometricError(0)).toBe(geometricError);
  });

  it("water mask is disabled", function () {
    var width = 2;
    var height = 2;
    var callback = function (x, y, level) {
      return new Float32Array(width * height);
    };

    var provider = new CustomHeightmapTerrainProvider({
      callback: callback,
      width: width,
      height: height,
    });

    expect(provider.hasWaterMask).toBe(false);
  });

  it("vertex normals are disabled", function () {
    var width = 2;
    var height = 2;
    var callback = function (x, y, level) {
      return new Float32Array(width * height);
    };

    var provider = new CustomHeightmapTerrainProvider({
      callback: callback,
      width: width,
      height: height,
    });

    expect(provider.hasVertexNormals).toBe(false);
  });

  it("requestTileGeometry receives heightmap data as Int8Array", function () {
    var width = 2;
    var height = 2;
    var callback = function (x, y, level) {
      return new Int8Array(width * height);
    };

    var provider = new CustomHeightmapTerrainProvider({
      callback: callback,
      width: width,
      height: height,
    });

    var terrainData = provider.requestTileGeometry(0, 0, 0);
    expect(terrainData).toBeDefined();
  });

  it("requestTileGeometry receives heightmap data as Uint8Array", function () {
    var width = 2;
    var height = 2;
    var callback = function (x, y, level) {
      return new Uint8Array(width * height);
    };

    var provider = new CustomHeightmapTerrainProvider({
      callback: callback,
      width: width,
      height: height,
    });

    var terrainData = provider.requestTileGeometry(0, 0, 0);
    expect(terrainData).toBeDefined();
  });

  it("requestTileGeometry receives heightmap data as Int16Array", function () {
    var width = 2;
    var height = 2;
    var callback = function (x, y, level) {
      return new Int16Array(width * height);
    };

    var provider = new CustomHeightmapTerrainProvider({
      callback: callback,
      width: width,
      height: height,
    });

    var terrainData = provider.requestTileGeometry(0, 0, 0);
    expect(terrainData).toBeDefined();
  });

  it("requestTileGeometry receives heightmap data as Uint16Array", function () {
    var width = 2;
    var height = 2;
    var callback = function (x, y, level) {
      return new Uint16Array(width * height);
    };

    var provider = new CustomHeightmapTerrainProvider({
      callback: callback,
      width: width,
      height: height,
    });

    var terrainData = provider.requestTileGeometry(0, 0, 0);
    expect(terrainData).toBeDefined();
  });

  it("requestTileGeometry receives heightmap data as Int32Array", function () {
    var width = 2;
    var height = 2;
    var callback = function (x, y, level) {
      return new Int32Array(width * height);
    };

    var provider = new CustomHeightmapTerrainProvider({
      callback: callback,
      width: width,
      height: height,
    });

    var terrainData = provider.requestTileGeometry(0, 0, 0);
    expect(terrainData).toBeDefined();
  });

  it("requestTileGeometry receives heightmap data as Uint32Array", function () {
    var width = 2;
    var height = 2;
    var callback = function (x, y, level) {
      return new Uint32Array(width * height);
    };

    var provider = new CustomHeightmapTerrainProvider({
      callback: callback,
      width: width,
      height: height,
    });

    var terrainData = provider.requestTileGeometry(0, 0, 0);
    expect(terrainData).toBeDefined();
  });

  it("requestTileGeometry receives heightmap data as Float32Array", function () {
    var width = 2;
    var height = 2;
    var callback = function (x, y, level) {
      return new Float32Array(width * height);
    };

    var provider = new CustomHeightmapTerrainProvider({
      callback: callback,
      width: width,
      height: height,
    });

    var terrainData = provider.requestTileGeometry(0, 0, 0);
    expect(terrainData).toBeDefined();
  });

  it("requestTileGeometry receives heightmap data as Float64Array", function () {
    var width = 2;
    var height = 2;
    var callback = function (x, y, level) {
      return new Float64Array(width * height);
    };

    var provider = new CustomHeightmapTerrainProvider({
      callback: callback,
      width: width,
      height: height,
    });

    var terrainData = provider.requestTileGeometry(0, 0, 0);
    expect(terrainData).toBeDefined();
  });

  it("requestTileGeometry receives heightmap data as Number array", function () {
    var width = 2;
    var height = 2;
    var callback = function (x, y, level) {
      var buffer = new Array(4);
      buffer[0] = 0.0;
      buffer[1] = 0.0;
      buffer[2] = 0.0;
      buffer[3] = 0.0;
      return buffer;
    };

    var provider = new CustomHeightmapTerrainProvider({
      callback: callback,
      width: width,
      height: height,
    });

    var terrainData = provider.requestTileGeometry(0, 0, 0);
    expect(terrainData).toBeDefined();
  });

  it("requestTileGeometry returns undefined when callback function returns undefined", function () {
    var width = 2;
    var height = 2;
    var callback = function (x, y, level) {
      return undefined;
    };

    var provider = new CustomHeightmapTerrainProvider({
      callback: callback,
      width: width,
      height: height,
    });

    expect(provider.requestTileGeometry()).toBeUndefined();
  });

  it("gets width and height", function () {
    var width = 2;
    var height = 3;
    var callback = function (x, y, level) {
      return new Float32Array(width * height);
    };

    var provider = new CustomHeightmapTerrainProvider({
      callback: callback,
      width: width,
      height: height,
    });

    expect(provider.width).toEqual(width);
    expect(provider.height).toEqual(height);
  });

  it("returns undefined for getTileDataAvailable", function () {
    var width = 2;
    var height = 2;
    var callback = function (x, y, level) {
      return new Int16Array(width * height);
    };

    var provider = new CustomHeightmapTerrainProvider({
      callback: callback,
      width: width,
      height: height,
    });

    expect(provider.getTileDataAvailable()).toBeUndefined();
  });

  it("returns undefined for loadTileDataAvailability", function () {
    var width = 2;
    var height = 2;
    var callback = function (x, y, level) {
      return new Int16Array(width * height);
    };

    var provider = new CustomHeightmapTerrainProvider({
      callback: callback,
      width: width,
      height: height,
    });

    expect(provider.loadTileDataAvailability()).toBeUndefined();
  });
});
