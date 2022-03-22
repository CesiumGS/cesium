import { ArcGISTiledElevationTerrainProvider } from "../../Source/Cesium.js";
import { DefaultProxy } from "../../Source/Cesium.js";
import { GeographicTilingScheme } from "../../Source/Cesium.js";
import { HeightmapTerrainData } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";
import { Request } from "../../Source/Cesium.js";
import { RequestScheduler } from "../../Source/Cesium.js";
import { Resource } from "../../Source/Cesium.js";
import { RuntimeError } from "../../Source/Cesium.js";
import { TerrainProvider } from "../../Source/Cesium.js";
import { WebMercatorTilingScheme } from "../../Source/Cesium.js";
import pollToPromise from "../pollToPromise.js";

describe("Core/ArcGISTiledElevationTerrainProvider", function () {
  const lercTileUrl = "Data/Images/Red16x16.png";
  let availability;
  let metadata;

  beforeEach(function () {
    availability = {
      data: [],
    };
    availability.data.length = 128 * 128;
    availability.data.fill(1);

    metadata = {
      currentVersion: 10.3,
      serviceDescription: "Test",
      name: "Test",
      description: "Test",
      extent: {
        xmin: -2.0037507842788246e7,
        ymin: -2.0037508659999996e7,
        xmax: 2.0037509157211754e7,
        ymax: 2.0037508340000004e7,
        spatialReference: {
          wkid: 102100,
          latestWkid: 3857,
        },
      },
      bandCount: 1,
      copyrightText:
        "Source: USGS, NGA, NASA, CGIAR, GEBCO,N Robinson,NCEAS,NLS,OS,NMA,Geodatastyrelsen and the GIS User Community",
      minValues: [-450],
      maxValues: [8700],
      capabilities: "Image,Tilemap,Mensuration",
      tileInfo: {
        rows: 256,
        cols: 256,
        format: "LERC",
        lods: [
          {
            level: 0,
            resolution: 156543.03392800014,
            scale: 5.91657527591555e8,
          },
          {
            level: 1,
            resolution: 78271.51696399994,
            scale: 2.95828763795777e8,
          },
          {
            level: 2,
            resolution: 39135.75848200009,
            scale: 1.47914381897889e8,
          },
          {
            level: 3,
            resolution: 19567.87924099992,
            scale: 7.3957190948944e7,
          },
          {
            level: 4,
            resolution: 9783.93962049996,
            scale: 3.6978595474472e7,
          },
          {
            level: 5,
            resolution: 4891.96981024998,
            scale: 1.8489297737236e7,
          },
          {
            level: 6,
            resolution: 2445.98490512499,
            scale: 9244648.868618,
          },
          {
            level: 7,
            resolution: 1222.992452562495,
            scale: 4622324.434309,
          },
          {
            level: 8,
            resolution: 611.4962262813797,
            scale: 2311162.217155,
          },
          {
            level: 9,
            resolution: 305.74811314055756,
            scale: 1155581.108577,
          },
          {
            level: 10,
            resolution: 152.87405657041106,
            scale: 577790.554289,
          },
          {
            level: 11,
            resolution: 76.43702828507324,
            scale: 288895.277144,
          },
          {
            level: 12,
            resolution: 38.21851414253662,
            scale: 144447.638572,
          },
          {
            level: 13,
            resolution: 19.10925707126831,
            scale: 72223.819286,
          },
          {
            level: 14,
            resolution: 9.554628535634155,
            scale: 36111.909643,
          },
          {
            level: 15,
            resolution: 4.77731426794937,
            scale: 18055.954822,
          },
          {
            level: 16,
            resolution: 2.388657133974685,
            scale: 9027.977411,
          },
        ],
      },
      spatialReference: {
        wkid: 3857,
        latestWkid: 3857,
      },
    };

    RequestScheduler.clearForSpecs();
    Resource._Implementations.loadWithXhr = function (
      url,
      responseType,
      method,
      data,
      headers,
      deferred,
      overrideMimeType
    ) {
      // Tile request
      if (url.indexOf("/tile/") !== -1) {
        Resource._DefaultImplementations.loadWithXhr(
          lercTileUrl,
          responseType,
          method,
          data,
          headers,
          deferred,
          overrideMimeType
        );
        return;
      }

      // Availability request
      if (url.indexOf("/tilemap/") !== -1) {
        setTimeout(function () {
          deferred.resolve(JSON.stringify(availability));
        }, 1);
        return;
      }

      // Metadata
      setTimeout(function () {
        deferred.resolve(JSON.stringify(metadata));
      }, 1);
    };
  });

  afterEach(function () {
    Resource._Implementations.createImage =
      Resource._DefaultImplementations.createImage;
    Resource._Implementations.loadWithXhr =
      Resource._DefaultImplementations.loadWithXhr;
  });

  function createRequest() {
    return new Request({
      throttleByServer: true,
    });
  }

  it("conforms to TerrainProvider interface", function () {
    expect(ArcGISTiledElevationTerrainProvider).toConformToInterface(
      TerrainProvider
    );
  });

  it("constructor throws if url is not provided", function () {
    expect(function () {
      return new ArcGISTiledElevationTerrainProvider();
    }).toThrowDeveloperError();

    expect(function () {
      return new ArcGISTiledElevationTerrainProvider({});
    }).toThrowDeveloperError();
  });

  it("resolves readyPromise", function () {
    const provider = new ArcGISTiledElevationTerrainProvider({
      url: "made/up/url",
    });

    return provider.readyPromise.then(function (result) {
      expect(result).toBe(true);
      expect(provider.ready).toBe(true);
    });
  });

  it("resolves readyPromise with Resource", function () {
    const resource = new Resource({
      url: "made/up/url",
    });

    const provider = new ArcGISTiledElevationTerrainProvider({
      url: resource,
    });

    return provider.readyPromise.then(function (result) {
      expect(result).toBe(true);
      expect(provider.ready).toBe(true);
    });
  });

  it("has error event", function () {
    const provider = new ArcGISTiledElevationTerrainProvider({
      url: "made/up/url",
    });
    expect(provider.errorEvent).toBeDefined();
    expect(provider.errorEvent).toBe(provider.errorEvent);

    return provider.readyPromise;
  });

  it("returns reasonable geometric error for various levels", function () {
    const provider = new ArcGISTiledElevationTerrainProvider({
      url: "made/up/url",
    });

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      expect(provider.getLevelMaximumGeometricError(0)).toBeGreaterThan(0.0);
      expect(provider.getLevelMaximumGeometricError(0)).toEqualEpsilon(
        provider.getLevelMaximumGeometricError(1) * 2.0,
        CesiumMath.EPSILON10
      );
      expect(provider.getLevelMaximumGeometricError(1)).toEqualEpsilon(
        provider.getLevelMaximumGeometricError(2) * 2.0,
        CesiumMath.EPSILON10
      );
    });
  });

  it("getLevelMaximumGeometricError must not be called before isReady returns true", function () {
    const provider = new ArcGISTiledElevationTerrainProvider({
      url: "made/up/url",
    });

    expect(function () {
      provider.getLevelMaximumGeometricError(0);
    }).toThrowDeveloperError();

    return provider.readyPromise;
  });

  it("getTilingScheme must not be called before isReady returns true", function () {
    const provider = new ArcGISTiledElevationTerrainProvider({
      url: "made/up/url",
    });

    expect(function () {
      return provider.tilingScheme;
    }).toThrowDeveloperError();

    return provider.readyPromise;
  });

  it("logo is undefined if credit is not provided", function () {
    delete metadata.copyrightText;
    const provider = new ArcGISTiledElevationTerrainProvider({
      url: "made/up/url",
    });
    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      expect(provider.credit).toBeUndefined();
    });
  });

  it("logo is defined if credit is provided", function () {
    const provider = new ArcGISTiledElevationTerrainProvider({
      url: "made/up/url",
      credit: "thanks to our awesome made up contributors!",
    });
    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      expect(provider.credit).toBeDefined();
    });
  });

  it("does not have a water mask", function () {
    const provider = new ArcGISTiledElevationTerrainProvider({
      url: "made/up/url",
    });
    expect(provider.hasWaterMask).toBe(false);
    return provider.readyPromise.catch(function (error) {
      expect(error).toBeInstanceOf(RuntimeError);
    });
  });

  it("is not ready immediately", function () {
    const provider = new ArcGISTiledElevationTerrainProvider({
      url: "made/up/url",
    });
    expect(provider.ready).toBe(false);
    return provider.readyPromise.catch(function (error) {
      expect(error).toBeInstanceOf(RuntimeError);
    });
  });

  it("detects WebMercator tiling scheme", function () {
    const baseUrl = "made/up/url";

    const terrainProvider = new ArcGISTiledElevationTerrainProvider({
      url: baseUrl,
    });

    return pollToPromise(function () {
      return terrainProvider.ready;
    }).then(function () {
      expect(terrainProvider.tilingScheme).toBeInstanceOf(
        WebMercatorTilingScheme
      );
    });
  });

  it("detects Geographic tiling scheme", function () {
    const baseUrl = "made/up/url";

    metadata.spatialReference.latestWkid = 4326;

    const terrainProvider = new ArcGISTiledElevationTerrainProvider({
      url: baseUrl,
    });

    return pollToPromise(function () {
      return terrainProvider.ready;
    }).then(function () {
      expect(terrainProvider.tilingScheme).toBeInstanceOf(
        GeographicTilingScheme
      );
    });
  });

  it("raises an error if the SRS is not supported", function () {
    const baseUrl = "made/up/url";

    metadata.spatialReference.latestWkid = 1234;

    const terrainProvider = new ArcGISTiledElevationTerrainProvider({
      url: baseUrl,
    });

    return terrainProvider.readyPromise.then(fail).catch(function (error) {
      expect(error).toBeInstanceOf(RuntimeError);
    });
  });

  it("raises an error if tileInfo missing", function () {
    const baseUrl = "made/up/url";

    delete metadata.tileInfo;

    const terrainProvider = new ArcGISTiledElevationTerrainProvider({
      url: baseUrl,
    });

    return terrainProvider.readyPromise.then(fail).catch(function (error) {
      expect(error).toBeInstanceOf(RuntimeError);
    });
  });

  it("checks availability if TileMap capability exists", function () {
    const baseUrl = "made/up/url";

    const terrainProvider = new ArcGISTiledElevationTerrainProvider({
      url: baseUrl,
    });

    return pollToPromise(function () {
      return terrainProvider.ready;
    }).then(function () {
      expect(terrainProvider._hasAvailability).toBe(true);
      expect(terrainProvider._tilesAvailable).toBeDefined();
      expect(terrainProvider._tilesAvailablityLoaded).toBeDefined();
    });
  });

  it("does not check availability if TileMap capability is missing", function () {
    const baseUrl = "made/up/url";

    metadata.capabilities = "Image,Mensuration";

    const terrainProvider = new ArcGISTiledElevationTerrainProvider({
      url: baseUrl,
    });

    return pollToPromise(function () {
      return terrainProvider.ready;
    }).then(function () {
      expect(terrainProvider._hasAvailability).toBe(false);
      expect(terrainProvider._tilesAvailable).toBeUndefined();
      expect(terrainProvider._tilesAvailablityLoaded).toBeUndefined();
    });
  });

  describe("requestTileGeometry", function () {
    it("must not be called before isReady returns true", function () {
      const terrainProvider = new ArcGISTiledElevationTerrainProvider({
        url: "made/up/url",
        proxy: new DefaultProxy("/proxy/"),
      });

      expect(function () {
        terrainProvider.requestTileGeometry(0, 0, 0);
      }).toThrowDeveloperError();

      return terrainProvider.readyPromise;
    });

    it("provides HeightmapTerrainData", function () {
      const baseUrl = "made/up/url";

      const terrainProvider = new ArcGISTiledElevationTerrainProvider({
        url: baseUrl,
      });

      return pollToPromise(function () {
        return terrainProvider.ready;
      })
        .then(function () {
          const promise = terrainProvider.requestTileGeometry(0, 0, 0);
          RequestScheduler.update();
          return promise;
        })
        .then(function (loadedData) {
          expect(loadedData).toBeInstanceOf(HeightmapTerrainData);
        });
    });

    it("returns undefined if too many requests are already in progress", function () {
      const baseUrl = "made/up/url";

      const deferreds = [];

      Resource._Implementations.createImage = function (
        request,
        crossOrigin,
        deferred
      ) {
        // Do nothing, so requests never complete
        deferreds.push(deferred);
      };

      const terrainProvider = new ArcGISTiledElevationTerrainProvider({
        url: baseUrl,
      });

      return pollToPromise(function () {
        return terrainProvider.ready;
      }).then(function () {
        let promise;
        let i;
        for (i = 0; i < RequestScheduler.maximumRequestsPerServer; ++i) {
          const request = new Request({
            throttle: true,
            throttleByServer: true,
          });
          promise = terrainProvider.requestTileGeometry(0, 0, 0, request);
        }
        RequestScheduler.update();
        expect(promise).toBeDefined();

        promise = terrainProvider.requestTileGeometry(0, 0, 0, createRequest());
        expect(promise).toBeUndefined();

        for (i = 0; i < deferreds.length; ++i) {
          deferreds[i].resolve();
        }

        return Promise.all(
          deferreds.map(function (deferred) {
            return deferred.promise;
          })
        );
      });
    });
  });
});
