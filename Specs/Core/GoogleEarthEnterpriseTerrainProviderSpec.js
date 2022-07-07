import { defaultValue } from "../../Source/Cesium.js";
import { Ellipsoid } from "../../Source/Cesium.js";
import { GeographicTilingScheme } from "../../Source/Cesium.js";
import { GoogleEarthEnterpriseMetadata } from "../../Source/Cesium.js";
import { GoogleEarthEnterpriseTerrainData } from "../../Source/Cesium.js";
import { GoogleEarthEnterpriseTerrainProvider } from "../../Source/Cesium.js";
import { GoogleEarthEnterpriseTileInformation } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";
import { Request } from "../../Source/Cesium.js";
import { RequestScheduler } from "../../Source/Cesium.js";
import { Resource } from "../../Source/Cesium.js";
import { TerrainProvider } from "../../Source/Cesium.js";
import pollToPromise from "../pollToPromise.js";

describe("Core/GoogleEarthEnterpriseTerrainProvider", function () {
  function installMockGetQuadTreePacket() {
    spyOn(
      GoogleEarthEnterpriseMetadata.prototype,
      "getQuadTreePacket"
    ).and.callFake(function (quadKey, version) {
      quadKey = defaultValue(quadKey, "");
      let t = new GoogleEarthEnterpriseTileInformation(0xff, 1, 1, 1);
      t.ancestorHasTerrain = true;
      this._tileInfo[`${quadKey}0`] = t;

      t = new GoogleEarthEnterpriseTileInformation(0xff, 1, 1, 1);
      t.ancestorHasTerrain = true;
      this._tileInfo[`${quadKey}1`] = t;

      t = new GoogleEarthEnterpriseTileInformation(0xff, 1, 1, 1);
      t.ancestorHasTerrain = true;
      this._tileInfo[`${quadKey}2`] = t;

      t = new GoogleEarthEnterpriseTileInformation(0xff, 1, 1, 1);
      t.ancestorHasTerrain = true;
      this._tileInfo[`${quadKey}3`] = t;

      return Promise.resolve();
    });
  }

  let terrainProvider;

  function waitForTile(level, x, y, f) {
    terrainProvider = new GoogleEarthEnterpriseTerrainProvider({
      url: "made/up/url",
    });

    return pollToPromise(function () {
      return (
        terrainProvider.ready &&
        terrainProvider.getTileDataAvailable(x, y, level)
      );
    }).then(function () {
      const promise = terrainProvider.requestTileGeometry(level, x, y);

      return Promise.resolve(promise, f, function (error) {
        expect("requestTileGeometry").toBe("returning a tile."); // test failure
      });
    });
  }

  function createRequest() {
    return new Request({
      throttleByServer: true,
    });
  }

  beforeEach(function () {
    RequestScheduler.clearForSpecs();
  });

  afterEach(function () {
    Resource._Implementations.loadWithXhr =
      Resource._DefaultImplementations.loadWithXhr;
  });

  it("conforms to TerrainProvider interface", function () {
    expect(GoogleEarthEnterpriseTerrainProvider).toConformToInterface(
      TerrainProvider
    );
  });

  it("constructor throws if url is not provided", function () {
    expect(function () {
      return new GoogleEarthEnterpriseTerrainProvider();
    }).toThrowDeveloperError();

    expect(function () {
      return new GoogleEarthEnterpriseTerrainProvider({});
    }).toThrowDeveloperError();
  });

  it("resolves readyPromise", function () {
    installMockGetQuadTreePacket();

    terrainProvider = new GoogleEarthEnterpriseTerrainProvider({
      url: "made/up/url",
    });

    return terrainProvider.readyPromise.then(function (result) {
      expect(result).toBe(true);
      expect(terrainProvider.ready).toBe(true);
    });
  });

  it("resolves readyPromise with Resource", function () {
    const resource = new Resource({
      url: "made/up/url",
    });

    installMockGetQuadTreePacket();

    terrainProvider = new GoogleEarthEnterpriseTerrainProvider({
      url: resource,
    });

    return terrainProvider.readyPromise.then(function (result) {
      expect(result).toBe(true);
      expect(terrainProvider.ready).toBe(true);
    });
  });

  it("uses geographic tiling scheme by default", function () {
    installMockGetQuadTreePacket();

    terrainProvider = new GoogleEarthEnterpriseTerrainProvider({
      url: "made/up/url",
    });

    return pollToPromise(function () {
      return terrainProvider.ready;
    }).then(function () {
      expect(terrainProvider.tilingScheme).toBeInstanceOf(
        GeographicTilingScheme
      );
    });
  });

  it("can use a custom ellipsoid", function () {
    installMockGetQuadTreePacket();

    const ellipsoid = new Ellipsoid(1, 2, 3);
    terrainProvider = new GoogleEarthEnterpriseTerrainProvider({
      url: "made/up/url",
      ellipsoid: ellipsoid,
    });

    return pollToPromise(function () {
      return terrainProvider.ready;
    }).then(function () {
      expect(terrainProvider.tilingScheme.ellipsoid).toEqual(ellipsoid);
    });
  });

  it("has error event", function () {
    terrainProvider = new GoogleEarthEnterpriseTerrainProvider({
      url: "made/up/url",
    });
    expect(terrainProvider.errorEvent).toBeDefined();
    expect(terrainProvider.errorEvent).toBe(terrainProvider.errorEvent);

    return terrainProvider.readyPromise.catch(function (e) {
      expect(terrainProvider.ready).toBe(false);
    });
  });

  it("returns reasonable geometric error for various levels", function () {
    installMockGetQuadTreePacket();

    terrainProvider = new GoogleEarthEnterpriseTerrainProvider({
      url: "made/up/url",
    });

    expect(terrainProvider.getLevelMaximumGeometricError(0)).toBeGreaterThan(
      0.0
    );
    expect(terrainProvider.getLevelMaximumGeometricError(0)).toEqualEpsilon(
      terrainProvider.getLevelMaximumGeometricError(1) * 2.0,
      CesiumMath.EPSILON10
    );
    expect(terrainProvider.getLevelMaximumGeometricError(1)).toEqualEpsilon(
      terrainProvider.getLevelMaximumGeometricError(2) * 2.0,
      CesiumMath.EPSILON10
    );

    return terrainProvider.readyPromise;
  });

  it("readyPromise rejects if there isn't terrain", function () {
    installMockGetQuadTreePacket();

    const metadata = new GoogleEarthEnterpriseMetadata({
      url: "made/up/url",
    });

    metadata.terrainPresent = false;

    terrainProvider = new GoogleEarthEnterpriseTerrainProvider({
      metadata: metadata,
    });

    return terrainProvider.readyPromise
      .then(function () {
        fail("Server does not have terrain, so we shouldn't resolve.");
      })
      .catch(function (e) {
        expect(terrainProvider.ready).toBe(false);
      });
  });

  it("logo is undefined if credit is not provided", function () {
    installMockGetQuadTreePacket();

    terrainProvider = new GoogleEarthEnterpriseTerrainProvider({
      url: "made/up/url",
    });

    return pollToPromise(function () {
      return terrainProvider.ready;
    }).then(function () {
      expect(terrainProvider.credit).toBeUndefined();
    });
  });

  it("logo is defined if credit is provided", function () {
    installMockGetQuadTreePacket();

    terrainProvider = new GoogleEarthEnterpriseTerrainProvider({
      url: "made/up/url",
      credit: "thanks to our awesome made up contributors!",
    });

    return pollToPromise(function () {
      return terrainProvider.ready;
    }).then(function () {
      expect(terrainProvider.credit).toBeDefined();
    });
  });

  it("has a water mask is false", function () {
    installMockGetQuadTreePacket();

    terrainProvider = new GoogleEarthEnterpriseTerrainProvider({
      url: "made/up/url",
    });

    return pollToPromise(function () {
      return terrainProvider.ready;
    }).then(function () {
      expect(terrainProvider.hasWaterMask).toBe(false);
    });
  });

  it("has vertex normals is false", function () {
    installMockGetQuadTreePacket();

    terrainProvider = new GoogleEarthEnterpriseTerrainProvider({
      url: "made/up/url",
    });

    return pollToPromise(function () {
      return terrainProvider.ready;
    }).then(function () {
      expect(terrainProvider.hasVertexNormals).toBe(false);
    });
  });

  describe("requestTileGeometry", function () {
    it("provides GoogleEarthEnterpriseTerrainData", function () {
      installMockGetQuadTreePacket();
      Resource._Implementations.loadWithXhr = function (
        url,
        responseType,
        method,
        data,
        headers,
        deferred,
        overrideMimeType
      ) {
        Resource._DefaultImplementations.loadWithXhr(
          "Data/GoogleEarthEnterprise/gee.terrain",
          responseType,
          method,
          data,
          headers,
          deferred
        );
      };

      return waitForTile(0, 0, 0, function (loadedData) {
        expect(loadedData).toBeInstanceOf(GoogleEarthEnterpriseTerrainData);
      });
    });

    it("returns undefined if too many requests are already in progress", function () {
      installMockGetQuadTreePacket();
      const baseUrl = "made/up/url";

      const deferreds = [];
      let loadRealTile = true;
      Resource._Implementations.loadWithXhr = function (
        url,
        responseType,
        method,
        data,
        headers,
        deferred,
        overrideMimeType
      ) {
        if (url.indexOf("dbRoot.v5") !== -1) {
          return deferred.reject(); // Just reject dbRoot file and use defaults.
        }

        if (loadRealTile) {
          loadRealTile = false;
          return Resource._DefaultImplementations.loadWithXhr(
            "Data/GoogleEarthEnterprise/gee.terrain",
            responseType,
            method,
            data,
            headers,
            deferred
          );
        }
        // Do nothing, so requests never complete
        deferreds.push(deferred);
      };

      terrainProvider = new GoogleEarthEnterpriseTerrainProvider({
        url: baseUrl,
      });

      const promises = [];
      return pollToPromise(function () {
        return terrainProvider.ready;
      })
        .then(function () {
          return pollToPromise(function () {
            let b = true;
            for (let i = 0; i < 10; ++i) {
              b = b && terrainProvider.getTileDataAvailable(i, i, i);
            }
            return b && terrainProvider.getTileDataAvailable(1, 2, 3);
          });
        })
        .then(function () {
          let promise;
          for (let i = 0; i < RequestScheduler.maximumRequestsPerServer; ++i) {
            promise = terrainProvider.requestTileGeometry(
              i,
              i,
              i,
              createRequest()
            );
            promises.push(promise);
          }
          RequestScheduler.update();
          expect(promise).toBeDefined();

          return terrainProvider.requestTileGeometry(1, 2, 3, createRequest());
        })
        .then(function (terrainData) {
          expect(terrainData).toBeUndefined();
          for (let i = 0; i < deferreds.length; ++i) {
            deferreds[i].resolve();
          }

          // Parsing terrain will fail, so just eat the errors and request the tile again
          return Promise.all(promises).catch(function () {
            loadRealTile = true;
            return terrainProvider.requestTileGeometry(1, 2, 3);
          });
        })
        .then(function (terrainData) {
          expect(terrainData).toBeDefined();
        });
    });

    it("supports getTileDataAvailable()", function () {
      installMockGetQuadTreePacket();
      const baseUrl = "made/up/url";

      Resource._Implementations.loadWithXhr = function (
        url,
        responseType,
        method,
        data,
        headers,
        deferred,
        overrideMimeType
      ) {
        Resource._DefaultImplementations.loadWithXhr(
          "Data/CesiumTerrainTileJson/tile.terrain",
          responseType,
          method,
          data,
          headers,
          deferred
        );
      };

      terrainProvider = new GoogleEarthEnterpriseTerrainProvider({
        url: baseUrl,
      });

      return pollToPromise(function () {
        return terrainProvider.ready;
      }).then(function () {
        const tileInfo = terrainProvider._metadata._tileInfo;
        const info =
          tileInfo[GoogleEarthEnterpriseMetadata.tileXYToQuadKey(0, 1, 0)];
        info._bits = 0x7f; // Remove terrain bit from 0,1,0 tile
        info.terrainState = 1; // NONE
        info.ancestorHasTerrain = true;

        expect(terrainProvider.getTileDataAvailable(0, 0, 0)).toBe(true);
        expect(terrainProvider.getTileDataAvailable(0, 1, 0)).toBe(false);
        expect(terrainProvider.getTileDataAvailable(1, 0, 0)).toBe(true);
        expect(terrainProvider.getTileDataAvailable(1, 1, 0)).toBe(true);
        expect(terrainProvider.getTileDataAvailable(0, 0, 2)).toBe(false);
      });
    });
  });
});
