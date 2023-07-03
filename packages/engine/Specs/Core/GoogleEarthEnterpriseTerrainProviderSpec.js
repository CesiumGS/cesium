import {
  defaultValue,
  Ellipsoid,
  GeographicTilingScheme,
  GoogleEarthEnterpriseMetadata,
  GoogleEarthEnterpriseTerrainData,
  GoogleEarthEnterpriseTerrainProvider,
  GoogleEarthEnterpriseTileInformation,
  Math as CesiumMath,
  Request,
  RequestScheduler,
  Resource,
  RuntimeError,
  TerrainProvider,
} from "../../index.js";

import pollToPromise from "../../../../Specs/pollToPromise.js";

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

  async function waitForTile(level, x, y, f) {
    const metadata = await GoogleEarthEnterpriseMetadata.fromUrl("made/up/url");
    terrainProvider = GoogleEarthEnterpriseTerrainProvider.fromMetadata(
      metadata
    );
    return pollToPromise(function () {
      return terrainProvider.getTileDataAvailable(x, y, level);
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

  it("fromMetadata throws without metadata", function () {
    installMockGetQuadTreePacket();
    expect(() =>
      GoogleEarthEnterpriseTerrainProvider.fromMetadata()
    ).toThrowDeveloperError("metadata is required, actual value was undefined");
  });

  it("fromMetadata throws if there isn't terrain", async function () {
    installMockGetQuadTreePacket();

    const metadata = await GoogleEarthEnterpriseMetadata.fromUrl("made/up/url");
    metadata.terrainPresent = false;

    expect(() =>
      GoogleEarthEnterpriseTerrainProvider.fromMetadata(metadata)
    ).toThrowError(
      RuntimeError,
      "The server made/up/url/ doesn't have terrain"
    );
  });

  it("uses geographic tiling scheme by default", async function () {
    installMockGetQuadTreePacket();

    const metadata = await GoogleEarthEnterpriseMetadata.fromUrl("made/up/url");
    terrainProvider = GoogleEarthEnterpriseTerrainProvider.fromMetadata(
      metadata
    );

    expect(terrainProvider.tilingScheme).toBeInstanceOf(GeographicTilingScheme);
  });

  it("can use a custom ellipsoid", async function () {
    installMockGetQuadTreePacket();

    const ellipsoid = new Ellipsoid(1, 2, 3);
    const metadata = await GoogleEarthEnterpriseMetadata.fromUrl("made/up/url");
    terrainProvider = GoogleEarthEnterpriseTerrainProvider.fromMetadata(
      metadata,
      {
        ellipsoid: ellipsoid,
      }
    );

    expect(terrainProvider.tilingScheme.ellipsoid).toEqual(ellipsoid);
  });

  it("has error event", async function () {
    installMockGetQuadTreePacket();

    const metadata = await GoogleEarthEnterpriseMetadata.fromUrl("made/up/url");
    terrainProvider = GoogleEarthEnterpriseTerrainProvider.fromMetadata(
      metadata
    );
    expect(terrainProvider.errorEvent).toBeDefined();
    expect(terrainProvider.errorEvent).toBe(terrainProvider.errorEvent);
  });

  it("returns reasonable geometric error for various levels", async function () {
    installMockGetQuadTreePacket();

    const metadata = await GoogleEarthEnterpriseMetadata.fromUrl("made/up/url");
    terrainProvider = GoogleEarthEnterpriseTerrainProvider.fromMetadata(
      metadata
    );

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
  });

  it("credit is undefined if credit is not provided", async function () {
    installMockGetQuadTreePacket();

    const metadata = await GoogleEarthEnterpriseMetadata.fromUrl("made/up/url");
    terrainProvider = GoogleEarthEnterpriseTerrainProvider.fromMetadata(
      metadata
    );

    expect(terrainProvider.credit).toBeUndefined();
  });

  it("logo is defined if credit is provided", async function () {
    installMockGetQuadTreePacket();

    const metadata = await GoogleEarthEnterpriseMetadata.fromUrl("made/up/url");
    terrainProvider = GoogleEarthEnterpriseTerrainProvider.fromMetadata(
      metadata,
      {
        credit: "thanks to our awesome made up contributors!",
      }
    );

    expect(terrainProvider.credit).toBeDefined();
  });

  it("has a water mask is false", async function () {
    installMockGetQuadTreePacket();

    const metadata = await GoogleEarthEnterpriseMetadata.fromUrl("made/up/url");
    terrainProvider = GoogleEarthEnterpriseTerrainProvider.fromMetadata(
      metadata
    );

    expect(terrainProvider.hasWaterMask).toBe(false);
  });

  it("has vertex normals is false", async function () {
    installMockGetQuadTreePacket();

    const metadata = await GoogleEarthEnterpriseMetadata.fromUrl("made/up/url");
    terrainProvider = GoogleEarthEnterpriseTerrainProvider.fromMetadata(
      metadata
    );

    expect(terrainProvider.hasVertexNormals).toBe(false);
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

    it("provides GoogleEarthEnterpriseTerrainData with fromMetadata", async function () {
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

      const metadata = await GoogleEarthEnterpriseMetadata.fromUrl(
        "made/up/url"
      );
      terrainProvider = GoogleEarthEnterpriseTerrainProvider.fromMetadata(
        metadata
      );

      await pollToPromise(function () {
        return terrainProvider.getTileDataAvailable(0, 0, 0);
      });

      const loadedData = await terrainProvider.requestTileGeometry(0, 0, 0);

      expect(loadedData).toBeInstanceOf(GoogleEarthEnterpriseTerrainData);
    });

    it("returns undefined if too many requests are already in progress", async function () {
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

      const metadata = await GoogleEarthEnterpriseMetadata.fromUrl(baseUrl);
      terrainProvider = GoogleEarthEnterpriseTerrainProvider.fromMetadata(
        metadata
      );

      const promises = [];
      return pollToPromise(function () {
        let b = true;
        for (let i = 0; i < 10; ++i) {
          b = b && terrainProvider.getTileDataAvailable(i, i, i);
        }
        return b && terrainProvider.getTileDataAvailable(1, 2, 3);
      })
        .then(function () {
          let promise;
          for (let i = 0; i < RequestScheduler.maximumRequestsPerServer; ++i) {
            const request = new Request({
              throttle: true,
              throttleByServer: true,
            });
            promise = terrainProvider.requestTileGeometry(i, i, i, request);
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

    it("supports getTileDataAvailable()", async function () {
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

      const metadata = await GoogleEarthEnterpriseMetadata.fromUrl(baseUrl);
      terrainProvider = GoogleEarthEnterpriseTerrainProvider.fromMetadata(
        metadata
      );

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
