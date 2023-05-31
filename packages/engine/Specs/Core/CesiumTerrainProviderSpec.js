import {
  CesiumTerrainProvider,
  Ellipsoid,
  GeographicTilingScheme,
  getAbsoluteUri,
  HeightmapTerrainData,
  IonResource,
  Math as CesiumMath,
  QuantizedMeshTerrainData,
  Request,
  RequestScheduler,
  Resource,
  RuntimeError,
  TerrainProvider,
} from "../../index.js";

describe("Core/CesiumTerrainProvider", function () {
  beforeEach(function () {
    RequestScheduler.clearForSpecs();
  });

  afterEach(function () {
    Resource._Implementations.loadWithXhr =
      Resource._DefaultImplementations.loadWithXhr;
  });

  function returnTileJson(path) {
    const oldLoad = Resource._Implementations.loadWithXhr;
    Resource._Implementations.loadWithXhr = function (
      url,
      responseType,
      method,
      data,
      headers,
      deferred,
      overrideMimeType
    ) {
      if (url.indexOf("layer.json") >= 0) {
        Resource._DefaultImplementations.loadWithXhr(
          path,
          responseType,
          method,
          data,
          headers,
          deferred
        );
      } else {
        return oldLoad(
          url,
          responseType,
          method,
          data,
          headers,
          deferred,
          overrideMimeType
        );
      }
    };
  }

  function returnHeightmapTileJson() {
    return returnTileJson(
      "Data/CesiumTerrainTileJson/StandardHeightmap.tile.json"
    );
  }

  function returnQuantizedMeshTileJson() {
    return returnTileJson("Data/CesiumTerrainTileJson/QuantizedMesh.tile.json");
  }

  function returnVertexNormalTileJson() {
    return returnTileJson("Data/CesiumTerrainTileJson/VertexNormals.tile.json");
  }

  function returnOctVertexNormalTileJson() {
    return returnTileJson(
      "Data/CesiumTerrainTileJson/OctVertexNormals.tile.json"
    );
  }

  function returnWaterMaskTileJson() {
    return returnTileJson("Data/CesiumTerrainTileJson/WaterMask.tile.json");
  }

  function returnPartialAvailabilityTileJson() {
    return returnTileJson(
      "Data/CesiumTerrainTileJson/PartialAvailability.tile.json"
    );
  }

  function returnParentUrlTileJson() {
    const paths = [
      "Data/CesiumTerrainTileJson/ParentUrl.tile.json",
      "Data/CesiumTerrainTileJson/Parent.tile.json",
    ];
    let i = 0;
    const oldLoad = Resource._Implementations.loadWithXhr;
    Resource._Implementations.loadWithXhr = function (
      url,
      responseType,
      method,
      data,
      headers,
      deferred,
      overrideMimeType
    ) {
      if (url.indexOf("layer.json") >= 0) {
        Resource._DefaultImplementations.loadWithXhr(
          paths[i++],
          responseType,
          method,
          data,
          headers,
          deferred
        );
      } else {
        return oldLoad(
          url,
          responseType,
          method,
          data,
          headers,
          deferred,
          overrideMimeType
        );
      }
    };
  }

  function returnMetadataAvailabilityTileJson() {
    return returnTileJson(
      "Data/CesiumTerrainTileJson/MetadataAvailability.tile.json"
    );
  }

  function returnParentUrlTileJsonWithMetadataAvailability() {
    const paths = [
      "Data/CesiumTerrainTileJson/ParentUrlAvailability.tile.json",
      "Data/CesiumTerrainTileJson/ParentAvailability.tile.json",
    ];
    let i = 0;
    const oldLoad = Resource._Implementations.loadWithXhr;
    Resource._Implementations.loadWithXhr = function (
      url,
      responseType,
      method,
      data,
      headers,
      deferred,
      overrideMimeType
    ) {
      if (url.indexOf("layer.json") >= 0) {
        Resource._DefaultImplementations.loadWithXhr(
          paths[i++],
          responseType,
          method,
          data,
          headers,
          deferred
        );
      } else {
        return oldLoad(
          url,
          responseType,
          method,
          data,
          headers,
          deferred,
          overrideMimeType
        );
      }
    };
  }

  async function waitForTile(level, x, y, requestNormals, requestWaterMask, f) {
    const terrainProvider = await CesiumTerrainProvider.fromUrl("made/up/url", {
      requestVertexNormals: requestNormals,
      requestWaterMask: requestWaterMask,
    });

    return terrainProvider.requestTileGeometry(level, x, y);
  }

  function createRequest() {
    return new Request({
      throttleByServer: true,
    });
  }

  it("conforms to TerrainProvider interface", function () {
    expect(CesiumTerrainProvider).toConformToInterface(TerrainProvider);
  });

  it("fromIonAssetId throws without assetId", async function () {
    await expectAsync(
      CesiumTerrainProvider.fromIonAssetId()
    ).toBeRejectedWithDeveloperError(
      "assetId is required, actual value was undefined"
    );
  });

  it("fromUrl throws without url", async function () {
    await expectAsync(
      CesiumTerrainProvider.fromUrl()
    ).toBeRejectedWithDeveloperError(
      "url is required, actual value was undefined"
    );
  });

  it("fromUrl resolves to created CesiumTerrainProvider", async function () {
    const provider = await CesiumTerrainProvider.fromUrl("made/up/url");
    expect(provider).toBeInstanceOf(CesiumTerrainProvider);
  });

  it("fromUrl resolves with url promise", async function () {
    const provider = await CesiumTerrainProvider.fromUrl(
      Promise.resolve("made/up/url")
    );
    expect(provider).toBeInstanceOf(CesiumTerrainProvider);
  });

  it("fromUrl resolves with Resource", async function () {
    const resource = new Resource({
      url: "made/up/url",
    });

    const provider = await CesiumTerrainProvider.fromUrl(resource);
    expect(provider).toBeInstanceOf(CesiumTerrainProvider);
  });

  it("fromUrl rejects if url rejects", async function () {
    await expectAsync(
      CesiumTerrainProvider.fromUrl(Promise.reject(new Error("my message")))
    ).toBeRejectedWithError("my message");
  });

  it("resolves readyPromise", function () {
    const provider = new CesiumTerrainProvider({
      url: "made/up/url",
    });

    return provider.readyPromise.then(function (result) {
      expect(result).toBe(true);
      expect(provider.ready).toBe(true);
    });
  });

  it("resolves readyPromise when url promise is used", function () {
    const provider = new CesiumTerrainProvider({
      url: Promise.resolve("made/up/url"),
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

    const provider = new CesiumTerrainProvider({
      url: resource,
    });

    return provider.readyPromise.then(function (result) {
      expect(result).toBe(true);
      expect(provider.ready).toBe(true);
    });
  });

  it("rejects readyPromise when url rejects", function () {
    const provider = new CesiumTerrainProvider({
      url: Promise.reject(new Error("my message")),
    });
    return provider.readyPromise
      .then(function () {
        fail("should not resolve");
      })
      .catch(function (result) {
        expect(result.message).toBe("my message");
        expect(provider.ready).toBe(false);
      });
  });

  it("uses geographic tiling scheme by default", async function () {
    returnHeightmapTileJson();

    const provider = await CesiumTerrainProvider.fromUrl("made/up/url");

    expect(provider.tilingScheme).toBeInstanceOf(GeographicTilingScheme);
  });

  it("can use a custom ellipsoid", async function () {
    returnHeightmapTileJson();

    const ellipsoid = new Ellipsoid(1, 2, 3);
    const provider = await CesiumTerrainProvider.fromUrl("made/up/url", {
      ellipsoid: ellipsoid,
    });

    expect(provider.tilingScheme.ellipsoid).toEqual(ellipsoid);
  });

  it("has error event", async function () {
    const provider = await CesiumTerrainProvider.fromUrl("made/up/url");
    expect(provider.errorEvent).toBeDefined();
    expect(provider.errorEvent).toBe(provider.errorEvent);
  });

  it("returns reasonable geometric error for various levels", async function () {
    returnQuantizedMeshTileJson();

    const provider = await CesiumTerrainProvider.fromUrl("made/up/url");

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

  it("credit is undefined if credit option is not provided", async function () {
    returnHeightmapTileJson();

    const provider = await CesiumTerrainProvider.fromUrl("made/up/url");

    expect(provider.credit).toBeUndefined();
  });

  it("credit is defined if credit option is provided", async function () {
    returnHeightmapTileJson();

    const provider = await CesiumTerrainProvider.fromUrl("made/up/url", {
      credit: "thanks to our awesome made up contributors!",
    });

    expect(provider.credit).toBeDefined();
  });

  it("has a water mask", async function () {
    returnHeightmapTileJson();

    const provider = await CesiumTerrainProvider.fromUrl("made/up/url");

    expect(provider.hasWaterMask).toBe(true);
  });

  it("has vertex normals", async function () {
    returnOctVertexNormalTileJson();

    const provider = await CesiumTerrainProvider.fromUrl("made/up/url", {
      requestVertexNormals: true,
    });

    expect(provider.requestVertexNormals).toBe(true);
    expect(provider.hasVertexNormals).toBe(true);
  });

  it("does not request vertex normals", async function () {
    returnOctVertexNormalTileJson();

    const provider = await CesiumTerrainProvider.fromUrl("made/up/url", {
      requestVertexNormals: false,
    });

    expect(provider.requestVertexNormals).toBe(false);
    expect(provider.hasVertexNormals).toBe(false);
  });

  it("requests parent layer.json", async function () {
    returnParentUrlTileJson();

    const provider = await CesiumTerrainProvider.fromUrl("made/up/url", {
      requestVertexNormals: true,
      requestWaterMask: true,
    });

    expect(provider._tileCredits[0].html).toBe(
      "This is a child tileset! This amazing data is courtesy The Amazing Data Source!"
    );
    expect(provider.requestVertexNormals).toBe(true);
    expect(provider.requestWaterMask).toBe(true);
    expect(provider.hasVertexNormals).toBe(false); // Neither tileset has them
    expect(provider.hasWaterMask).toBe(true); // The child tileset has them
    expect(provider.availability.isTileAvailable(1, 2, 1)).toBe(true); // Both have this
    expect(provider.availability.isTileAvailable(1, 3, 1)).toBe(true); // Parent has this, but child doesn't
    expect(provider.availability.isTileAvailable(2, 0, 0)).toBe(false); // Neither has this

    const layers = provider._layers;
    expect(layers.length).toBe(2);
    expect(layers[0].hasVertexNormals).toBe(false);
    expect(layers[0].hasWaterMask).toBe(true);
    expect(layers[0].availability.isTileAvailable(1, 2, 1)).toBe(true);
    expect(layers[0].availability.isTileAvailable(1, 3, 1)).toBe(false);
    expect(layers[0].availability.isTileAvailable(2, 0, 0)).toBe(false);
    expect(layers[1].hasVertexNormals).toBe(false);
    expect(layers[1].hasWaterMask).toBe(false);
    expect(layers[1].availability.isTileAvailable(1, 2, 1)).toBe(true);
    expect(layers[1].availability.isTileAvailable(1, 3, 1)).toBe(true);
    expect(layers[1].availability.isTileAvailable(2, 0, 0)).toBe(false);
  });

  it("fromUrl throws if layer.json specifies an unknown format", async function () {
    returnTileJson("Data/CesiumTerrainTileJson/InvalidFormat.tile.json");

    await expectAsync(
      CesiumTerrainProvider.fromUrl("made/up/url")
    ).toBeRejectedWithError(
      RuntimeError,
      'The tile format "awesometron-9000.0" is invalid or not supported.'
    );
  });

  it("fromUrl throws if layer.json does not specify quantized-mesh 1.x format", async function () {
    returnTileJson("Data/CesiumTerrainTileJson/QuantizedMesh2.0.tile.json");

    await expectAsync(
      CesiumTerrainProvider.fromUrl("made/up/url")
    ).toBeRejectedWithError(
      RuntimeError,
      'The tile format "quantized-mesh-2.0" is invalid or not supported.'
    );
  });

  it("fromUrl supports quantized-mesh1.x minor versions", async function () {
    returnTileJson("Data/CesiumTerrainTileJson/QuantizedMesh1.1.tile.json");

    await expectAsync(
      CesiumTerrainProvider.fromUrl("made/up/url")
    ).toBeResolved();
  });

  it("fromUrl throws if layer.json does not specify a tiles property", async function () {
    returnTileJson("Data/CesiumTerrainTileJson/NoTiles.tile.json");

    await expectAsync(
      CesiumTerrainProvider.fromUrl("made/up/url")
    ).toBeRejectedWithError(
      RuntimeError,
      "The layer.json file does not specify any tile URL templates."
    );
  });

  it("fromUrl throws if layer.json tiles property is an empty array", async function () {
    returnTileJson("Data/CesiumTerrainTileJson/EmptyTilesArray.tile.json");

    await expectAsync(
      CesiumTerrainProvider.fromUrl("made/up/url")
    ).toBeRejectedWithError(
      RuntimeError,
      "The layer.json file does not specify any tile URL templates."
    );
  });

  it("fromUrl uses attribution specified in layer.json", async function () {
    returnTileJson("Data/CesiumTerrainTileJson/WithAttribution.tile.json");

    const provider = await CesiumTerrainProvider.fromUrl("made/up/url");

    expect(provider._tileCredits[0].html).toBe(
      "This amazing data is courtesy The Amazing Data Source!"
    );
  });

  it("formUrl does not add blank attribution if layer.json does not have one", async function () {
    returnTileJson("Data/CesiumTerrainTileJson/WaterMask.tile.json");

    const provider = await CesiumTerrainProvider.fromUrl("made/up/url");

    expect(provider._tileCredit).toBeUndefined();
  });

  it("The undefined availability tile is returned at level 0", function () {
    const layer = {
      availabilityLevels: 10,
    };

    expect(
      CesiumTerrainProvider._getAvailabilityTile(layer, 0, 0, 0)
    ).toBeUndefined();
    expect(
      CesiumTerrainProvider._getAvailabilityTile(layer, 1, 0, 0)
    ).toBeUndefined();
  });

  it("The correct availability tile is computed in first level", function () {
    const layer = {
      availabilityLevels: 10,
    };

    expect(CesiumTerrainProvider._getAvailabilityTile(layer, 1, 1, 1)).toEqual({
      level: 0,
      x: 0,
      y: 0,
    });
    expect(CesiumTerrainProvider._getAvailabilityTile(layer, 4, 2, 2)).toEqual({
      level: 0,
      x: 1,
      y: 0,
    });

    expect(
      CesiumTerrainProvider._getAvailabilityTile(layer, 80, 50, 10)
    ).toEqual({
      level: 0,
      x: 0,
      y: 0,
    });
  });

  it("The correct availability tile is computed in second level", function () {
    const layer = {
      availabilityLevels: 10,
    };

    const expected = {
      level: 10,
      x: 80,
      y: 50,
    };

    const xs = [expected.x, expected.x];
    const ys = [expected.y, expected.y];

    // Compute level 20 tiles by always taking SW or NE child
    for (let i = 0; i < 10; ++i) {
      xs[0] *= 2;
      ys[0] *= 2;
      xs[1] = xs[1] * 2 + 1;
      ys[1] = ys[1] * 2 + 1;
    }

    expect(
      CesiumTerrainProvider._getAvailabilityTile(layer, xs[0], ys[0], 20)
    ).toEqual(expected);
    expect(
      CesiumTerrainProvider._getAvailabilityTile(layer, xs[1], ys[1], 20)
    ).toEqual(expected);
  });

  describe("requestTileGeometry", function () {
    it("uses multiple urls specified in layer.json", async function () {
      returnTileJson("Data/CesiumTerrainTileJson/MultipleUrls.tile.json");
      const provider = await CesiumTerrainProvider.fromUrl("made/up/url");
      spyOn(Resource._Implementations, "loadWithXhr").and.callThrough();

      try {
        await provider.requestTileGeometry(0, 0, 0);
      } catch (e) {
        expect(
          Resource._Implementations.loadWithXhr.calls.mostRecent().args[0]
        ).toContain("foo0.com");
      }

      try {
        await provider.requestTileGeometry(1, 0, 0);
      } catch (e) {
        expect(
          Resource._Implementations.loadWithXhr.calls.mostRecent().args[0]
        ).toContain("foo1.com");
      }

      try {
        await provider.requestTileGeometry(1, -1, 0);
      } catch (e) {
        expect(
          Resource._Implementations.loadWithXhr.calls.mostRecent().args[0]
        ).toContain("foo2.com");
      }

      try {
        await provider.requestTileGeometry(1, 0, 1);
      } catch (e) {
        expect(
          Resource._Implementations.loadWithXhr.calls.mostRecent().args[0]
        ).toContain("foo3.com");
      }
    });

    it("supports scheme-less template URLs in layer.json resolved with absolute URL", async function () {
      returnTileJson("Data/CesiumTerrainTileJson/MultipleUrls.tile.json");
      const url = getAbsoluteUri("Data/CesiumTerrainTileJson");
      const provider = await CesiumTerrainProvider.fromUrl(url);

      spyOn(Resource._Implementations, "loadWithXhr").and.callThrough();

      try {
        await provider.requestTileGeometry(0, 0, 0);
      } catch (e) {
        expect(
          Resource._Implementations.loadWithXhr.calls.mostRecent().args[0]
        ).toContain("foo0.com");
      }
      try {
        await provider.requestTileGeometry(1, 0, 0);
      } catch (e) {
        expect(
          Resource._Implementations.loadWithXhr.calls.mostRecent().args[0]
        ).toContain("foo1.com");
      }

      try {
        await provider.requestTileGeometry(1, -1, 0);
      } catch (e) {
        expect(
          Resource._Implementations.loadWithXhr.calls.mostRecent().args[0]
        ).toContain("foo2.com");
      }
      try {
        await provider.requestTileGeometry(1, 0, 1);
      } catch (e) {
        expect(
          Resource._Implementations.loadWithXhr.calls.mostRecent().args[0]
        ).toContain("foo3.com");
      }
    });

    it("provides HeightmapTerrainData", function () {
      Resource._Implementations.loadWithXhr = function (
        url,
        responseType,
        method,
        data,
        headers,
        deferred,
        overrideMimeType
      ) {
        // Just return any old file, as long as its big enough
        return Resource._DefaultImplementations.loadWithXhr(
          "Data/EarthOrientationParameters/IcrfToFixedStkComponentsRotationData.json",
          responseType,
          method,
          data,
          headers,
          deferred
        );
      };

      returnHeightmapTileJson();

      return waitForTile(0, 0, 0, false, false, function (loadedData) {
        expect(loadedData).toBeInstanceOf(HeightmapTerrainData);
      });
    });

    it("provides QuantizedMeshTerrainData", function () {
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

      returnQuantizedMeshTileJson();

      return waitForTile(0, 0, 0, false, false, function (loadedData) {
        expect(loadedData).toBeInstanceOf(QuantizedMeshTerrainData);
      });
    });

    it("provides QuantizedMeshTerrainData with 32bit indices", function () {
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
          "Data/CesiumTerrainTileJson/tile.32bitIndices.terrain",
          responseType,
          method,
          data,
          headers,
          deferred
        );
      };

      returnQuantizedMeshTileJson();

      return waitForTile(0, 0, 0, false, false, function (loadedData) {
        expect(loadedData).toBeInstanceOf(QuantizedMeshTerrainData);
        expect(loadedData._indices.BYTES_PER_ELEMENT).toBe(4);
      });
    });

    it("provides QuantizedMeshTerrainData with VertexNormals", function () {
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
          "Data/CesiumTerrainTileJson/tile.vertexnormals.terrain",
          responseType,
          method,
          data,
          headers,
          deferred
        );
      };

      returnVertexNormalTileJson();

      return waitForTile(0, 0, 0, true, false, function (loadedData) {
        expect(loadedData).toBeInstanceOf(QuantizedMeshTerrainData);
        expect(loadedData._encodedNormals).toBeDefined();
      });
    });

    it("provides QuantizedMeshTerrainData with WaterMask", function () {
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
          "Data/CesiumTerrainTileJson/tile.watermask.terrain",
          responseType,
          method,
          data,
          headers,
          deferred
        );
      };

      returnWaterMaskTileJson();

      return waitForTile(0, 0, 0, false, true, function (loadedData) {
        expect(loadedData).toBeInstanceOf(QuantizedMeshTerrainData);
        expect(loadedData._waterMask).toBeDefined();
      });
    });

    it("provides QuantizedMeshTerrainData with VertexNormals and WaterMask", function () {
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
          "Data/CesiumTerrainTileJson/tile.octvertexnormals.watermask.terrain",
          responseType,
          method,
          data,
          headers,
          deferred
        );
      };

      returnWaterMaskTileJson();

      return waitForTile(0, 0, 0, true, true, function (loadedData) {
        expect(loadedData).toBeInstanceOf(QuantizedMeshTerrainData);
        expect(loadedData._encodedNormals).toBeDefined();
        expect(loadedData._waterMask).toBeDefined();
      });
    });

    it("provides QuantizedMeshTerrainData with OctVertexNormals", function () {
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
          "Data/CesiumTerrainTileJson/tile.octvertexnormals.terrain",
          responseType,
          method,
          data,
          headers,
          deferred
        );
      };

      returnOctVertexNormalTileJson();

      return waitForTile(0, 0, 0, true, false, function (loadedData) {
        expect(loadedData).toBeInstanceOf(QuantizedMeshTerrainData);
        expect(loadedData._encodedNormals).toBeDefined();
      });
    });

    it("provides QuantizedMeshTerrainData with VertexNormals and unknown extensions", function () {
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
          "Data/CesiumTerrainTileJson/tile.vertexnormals.unknownext.terrain",
          responseType,
          method,
          data,
          headers,
          deferred
        );
      };

      returnVertexNormalTileJson();

      return waitForTile(0, 0, 0, true, false, function (loadedData) {
        expect(loadedData).toBeInstanceOf(QuantizedMeshTerrainData);
        expect(loadedData._encodedNormals).toBeDefined();
      });
    });

    it("provides QuantizedMeshTerrainData with OctVertexNormals and unknown extensions", function () {
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
          "Data/CesiumTerrainTileJson/tile.octvertexnormals.unknownext.terrain",
          responseType,
          method,
          data,
          headers,
          deferred
        );
      };

      returnOctVertexNormalTileJson();

      return waitForTile(0, 0, 0, true, false, function (loadedData) {
        expect(loadedData).toBeInstanceOf(QuantizedMeshTerrainData);
        expect(loadedData._encodedNormals).toBeDefined();
      });
    });

    it("provides QuantizedMeshTerrainData with unknown extension", function () {
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
          "Data/CesiumTerrainTileJson/tile.unknownext.terrain",
          responseType,
          method,
          data,
          headers,
          deferred
        );
      };

      returnOctVertexNormalTileJson();

      return waitForTile(0, 0, 0, false, false, function (loadedData) {
        expect(loadedData).toBeInstanceOf(QuantizedMeshTerrainData);
      });
    });

    it("provides QuantizedMeshTerrainData with Metadata availability", async function () {
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
          "Data/CesiumTerrainTileJson/tile.metadataavailability.terrain",
          responseType,
          method,
          data,
          headers,
          deferred
        );
      };

      returnMetadataAvailabilityTileJson();

      const terrainProvider = await CesiumTerrainProvider.fromUrl(
        "made/up/url"
      );

      expect(terrainProvider.hasMetadata).toBe(true);
      expect(terrainProvider._layers[0].availabilityLevels).toBe(10);
      expect(terrainProvider.availability.isTileAvailable(0, 0, 0)).toBe(true);
      expect(terrainProvider.availability.isTileAvailable(0, 1, 0)).toBe(true);
      expect(terrainProvider.availability.isTileAvailable(1, 0, 0)).toBe(false);

      const loadedData = await terrainProvider.requestTileGeometry(0, 0, 0);
      expect(loadedData).toBeInstanceOf(QuantizedMeshTerrainData);
      expect(terrainProvider.availability.isTileAvailable(1, 0, 0)).toBe(true);
    });

    it("provides QuantizedMeshTerrainData with multiple layers and with Metadata availability ", async function () {
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
          "Data/CesiumTerrainTileJson/tile.metadataavailability.terrain",
          responseType,
          method,
          data,
          headers,
          deferred
        );
      };

      returnParentUrlTileJsonWithMetadataAvailability();

      const terrainProvider = await CesiumTerrainProvider.fromUrl(
        "made/up/url"
      );

      expect(terrainProvider.hasMetadata).toBe(true);
      const layers = terrainProvider._layers;
      expect(layers.length).toBe(2);

      expect(terrainProvider.availability.isTileAvailable(1, 0, 0)).toBe(false);

      const loadedData = await terrainProvider.requestTileGeometry(0, 0, 1);
      expect(loadedData).toBeInstanceOf(QuantizedMeshTerrainData);
      expect(terrainProvider.availability.isTileAvailable(1, 0, 0)).toBe(true);
    });

    it("returns undefined if too many requests are already in progress", async function () {
      const baseUrl = "made/up/url";

      const deferreds = [];

      Resource._Implementations.loadWithXhr = function (
        url,
        responseType,
        method,
        data,
        headers,
        deferred,
        overrideMimeType
      ) {
        // Do nothing, so requests never complete
        deferreds.push(deferred);
      };

      returnHeightmapTileJson();

      const terrainProvider = await CesiumTerrainProvider.fromUrl(baseUrl);
      let promise;
      let i;
      for (i = 0; i < RequestScheduler.maximumRequestsPerServer; ++i) {
        const request = new Request({
          throttle: true,
          throttleByServer: true,
        });
        promise = terrainProvider
          .requestTileGeometry(0, 0, 0, request)
          .then(fail)
          .catch((e) => {
            expect(e.message).toContain("Mesh buffer doesn't exist.");
          });
      }
      RequestScheduler.update();
      expect(promise).toBeDefined();

      promise = terrainProvider.requestTileGeometry(0, 0, 0, createRequest());
      expect(promise).toBeUndefined();

      for (i = 0; i < deferreds.length; ++i) {
        deferreds[i].resolve();
      }
    });

    it("supports getTileDataAvailable()", async function () {
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

      returnQuantizedMeshTileJson();

      const terrainProvider = await CesiumTerrainProvider.fromUrl(baseUrl);

      expect(terrainProvider.getTileDataAvailable(0, 0, 0)).toBe(true);
      expect(terrainProvider.getTileDataAvailable(0, 0, 2)).toBe(false);
    });

    it("getTileDataAvailable() converts xyz to tms", async function () {
      const baseUrl = "made/up/url";

      returnPartialAvailabilityTileJson();

      const terrainProvider = await CesiumTerrainProvider.fromUrl(baseUrl);

      expect(terrainProvider.getTileDataAvailable(1, 3, 2)).toBe(true);
      expect(terrainProvider.getTileDataAvailable(1, 0, 2)).toBe(false);
    });

    it("getTileDataAvailable() with Metadata availability", async function () {
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
          "Data/CesiumTerrainTileJson/tile.metadataavailability.terrain",
          responseType,
          method,
          data,
          headers,
          deferred
        );
      };

      returnMetadataAvailabilityTileJson();

      const terrainProvider = await CesiumTerrainProvider.fromUrl(
        "made/up/url"
      );

      expect(terrainProvider.getTileDataAvailable(0, 0, 0)).toBe(true);
      expect(terrainProvider.getTileDataAvailable(0, 0, 1)).toBeUndefined();

      await terrainProvider.requestTileGeometry(0, 0, 0);
      expect(terrainProvider.getTileDataAvailable(0, 0, 1)).toBe(true);
    });

    it("supports a query string in the base URL", function () {
      Resource._Implementations.loadWithXhr = function (
        url,
        responseType,
        method,
        data,
        headers,
        deferred,
        overrideMimeType
      ) {
        // Just return any old file, as long as its big enough
        Resource._DefaultImplementations.loadWithXhr(
          "Data/EarthOrientationParameters/IcrfToFixedStkComponentsRotationData.json",
          responseType,
          method,
          data,
          headers,
          deferred
        );
      };

      returnHeightmapTileJson();

      return waitForTile(0, 0, 0, false, false, function (loadedData) {
        expect(loadedData).toBeInstanceOf(HeightmapTerrainData);
      });
    });

    it("Uses query parameter extensions for ion resource", async function () {
      const terrainProvider = await CesiumTerrainProvider.fromUrl(
        IonResource.fromAssetId(1),
        {
          requestVertexNormals: true,
          requestWaterMask: true,
        }
      );

      const getDerivedResource = spyOn(
        IonResource.prototype,
        "getDerivedResource"
      ).and.callThrough();
      await terrainProvider.requestTileGeometry(0, 0, 0);
      const options = getDerivedResource.calls.argsFor(0)[0];
      expect(options.queryParameters.extensions).toEqual(
        "octvertexnormals-watermask-metadata"
      );
    });
  });
});
