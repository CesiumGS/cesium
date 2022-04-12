import { Ellipsoid } from "../../Source/Cesium.js";
import { GeographicTilingScheme } from "../../Source/Cesium.js";
import { WebMercatorTilingScheme } from "../../Source/Cesium.js";
import { ImageryProvider } from "../../Source/Cesium.js";
import { TileCoordinatesImageryProvider } from "../../Source/Cesium.js";
import pollToPromise from "../pollToPromise.js";

describe("Scene/TileCoordinatesImageryProvider", function () {
  it("conforms to ImageryProvider interface", function () {
    expect(TileCoordinatesImageryProvider).toConformToInterface(
      ImageryProvider
    );
  });

  it("resolves readyPromise", function () {
    const provider = new TileCoordinatesImageryProvider();

    return provider.readyPromise.then(function (result) {
      expect(result).toBe(true);
      expect(provider.ready).toBe(true);
    });
  });

  it("returns valid value for hasAlphaChannel", function () {
    const provider = new TileCoordinatesImageryProvider();

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      expect(typeof provider.hasAlphaChannel).toBe("boolean");
    });
  });

  it("can use a custom ellipsoid", function () {
    const ellipsoid = new Ellipsoid(1, 2, 3);
    const provider = new TileCoordinatesImageryProvider({
      ellipsoid: ellipsoid,
    });

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      expect(provider.tilingScheme.ellipsoid).toEqual(ellipsoid);
    });
  });

  it("can provide a root tile", function () {
    const provider = new TileCoordinatesImageryProvider();

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      expect(provider.tileWidth).toEqual(256);
      expect(provider.tileHeight).toEqual(256);
      expect(provider.maximumLevel).toBeUndefined();
      expect(provider.tilingScheme).toBeInstanceOf(GeographicTilingScheme);
      expect(provider.tileDiscardPolicy).toBeUndefined();
      expect(provider.rectangle).toEqual(
        new GeographicTilingScheme().rectangle
      );

      return Promise.resolve(provider.requestImage(0, 0, 0)).then(function (
        image
      ) {
        expect(image).toBeDefined();
      });
    });
  });

  it("uses alternate tiling scheme if provided", function () {
    const tilingScheme = new WebMercatorTilingScheme();
    const provider = new TileCoordinatesImageryProvider({
      tilingScheme: tilingScheme,
    });

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      expect(provider.tilingScheme).toBe(tilingScheme);
    });
  });

  it("uses tile width and height if provided", function () {
    const provider = new TileCoordinatesImageryProvider({
      tileWidth: 123,
      tileHeight: 456,
    });

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      expect(provider.tileWidth).toEqual(123);
      expect(provider.tileHeight).toEqual(456);
    });
  });
});
