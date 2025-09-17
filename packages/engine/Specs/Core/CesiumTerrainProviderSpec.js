import {
  CesiumTerrainProvider,
  defined,
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
import pollToPromise from "../../../../Specs/pollToPromise.js";

describe("Core/CesiumTerrainProvider", function () {
  beforeEach(function () {
    RequestScheduler.clearForSpecs();
  });

  it("conforms to TerrainProvider interface", function () {
    expect(CesiumTerrainProvider).toConformToInterface(TerrainProvider);
  });

  it("fromIonAssetId throws without assetId", async function () {
    await expectAsync(
      CesiumTerrainProvider.fromIonAssetId(),
    ).toBeRejectedWithDeveloperError(
      "assetId is required, actual value was undefined",
    );
  });

  it("fromUrl throws without url", async function () {
    await expectAsync(
      CesiumTerrainProvider.fromUrl(),
    ).toBeRejectedWithDeveloperError(
      "url is required, actual value was undefined",
    );
  });

  it("fromUrl resolves to created CesiumTerrainProvider", async function () {
    const provider = await CesiumTerrainProvider.fromUrl("made/up/url");
    expect(provider).toBeInstanceOf(CesiumTerrainProvider);
  });

  it("fromUrl resolves with url promise", async function () {
    const provider = await CesiumTerrainProvider.fromUrl(
      Promise.resolve("made/up/url"),
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
      CesiumTerrainProvider.fromUrl(Promise.reject(new Error("my message"))),
    ).toBeRejectedWithError("my message");
  });

  it("uses geographic tiling scheme by default", async function () {
    const provider = await CesiumTerrainProvider.fromUrl(
      "Data/CesiumTerrainTileJson/Heightmap",
    );
    expect(provider.tilingScheme).toBeInstanceOf(GeographicTilingScheme);
  });

  it("can use a custom ellipsoid", async function () {
    const ellipsoid = new Ellipsoid(1, 2, 3);
    const provider = await CesiumTerrainProvider.fromUrl(
      "Data/CesiumTerrainTileJson/Heightmap",
      {
        ellipsoid: ellipsoid,
      },
    );

    expect(provider.tilingScheme.ellipsoid).toEqual(ellipsoid);
  });

  it("has error event", async function () {
    const provider = await CesiumTerrainProvider.fromUrl("made/up/url");
    expect(provider.errorEvent).toBeDefined();
    expect(provider.errorEvent).toBe(provider.errorEvent);
  });

  it("returns reasonable geometric error for various levels", async function () {
    const provider = await CesiumTerrainProvider.fromUrl(
      "Data/CesiumTerrainTileJson/QuantizedMesh",
    );

    expect(provider.getLevelMaximumGeometricError(0)).toBeGreaterThan(0.0);
    expect(provider.getLevelMaximumGeometricError(0)).toEqualEpsilon(
      provider.getLevelMaximumGeometricError(1) * 2.0,
      CesiumMath.EPSILON10,
    );
    expect(provider.getLevelMaximumGeometricError(1)).toEqualEpsilon(
      provider.getLevelMaximumGeometricError(2) * 2.0,
      CesiumMath.EPSILON10,
    );
  });

  it("credit is undefined if credit option is not provided", async function () {
    const provider = await CesiumTerrainProvider.fromUrl(
      "Data/CesiumTerrainTileJson/Heightmap",
    );
    expect(provider.credit).toBeUndefined();
  });

  it("credit is defined if credit option is provided", async function () {
    const provider = await CesiumTerrainProvider.fromUrl(
      "Data/CesiumTerrainTileJson/Heightmap",
      {
        credit: "thanks to our awesome made up contributors!",
      },
    );
    expect(provider.credit).toBeDefined();
  });

  it("has a water mask", async function () {
    const provider = await CesiumTerrainProvider.fromUrl(
      "Data/CesiumTerrainTileJson/Heightmap",
    );
    expect(provider.hasWaterMask).toBe(true);
  });

  it("has vertex normals", async function () {
    const provider = await CesiumTerrainProvider.fromUrl(
      "Data/CesiumTerrainTileJson/QuantizedMeshWithOctVertexNormals",
      {
        requestVertexNormals: true,
      },
    );

    expect(provider.requestVertexNormals).toBe(true);
    expect(provider.hasVertexNormals).toBe(true);
  });

  it("does not request vertex normals", async function () {
    const provider = await CesiumTerrainProvider.fromUrl(
      "Data/CesiumTerrainTileJson/QuantizedMeshWithOctVertexNormals",
      {
        requestVertexNormals: false,
      },
    );

    expect(provider.requestVertexNormals).toBe(false);
    expect(provider.hasVertexNormals).toBe(false);
  });

  it("requests parent layer.json", async function () {
    const provider = await CesiumTerrainProvider.fromUrl(
      "Data/CesiumTerrainTileJson/QuantizedMeshWithParentUrl/ChildTileset",
      {
        requestVertexNormals: true,
        requestWaterMask: true,
      },
    );

    expect(provider._tileCredits[0].html).toBe(
      "This is a child tileset! This amazing data is courtesy The Amazing Data Source!",
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

  it("fromUrl throws if layer.json does not specify a format", async function () {
    await expectAsync(
      CesiumTerrainProvider.fromUrl("Data/CesiumTerrainTileJson/NoFormat"),
    ).toBeRejectedWithError(
      RuntimeError,
      "The tile format is not specified in the layer.json file.",
    );
  });

  it("fromUrl throws if layer.json specifies an unknown format", async function () {
    await expectAsync(
      CesiumTerrainProvider.fromUrl("Data/CesiumTerrainTileJson/InvalidFormat"),
    ).toBeRejectedWithError(
      RuntimeError,
      'The tile format "awesometron-9000.0" is invalid or not supported.',
    );
  });

  it("fromUrl throws if layer.json does not specify quantized-mesh 1.x format", async function () {
    await expectAsync(
      CesiumTerrainProvider.fromUrl(
        "Data/CesiumTerrainTileJson/QuantizedMesh2.0",
      ),
    ).toBeRejectedWithError(
      RuntimeError,
      'The tile format "quantized-mesh-2.0" is invalid or not supported.',
    );
  });

  it("fromUrl supports quantized-mesh1.x minor versions", async function () {
    await expectAsync(
      CesiumTerrainProvider.fromUrl(
        "Data/CesiumTerrainTileJson/QuantizedMesh1.1",
      ),
    ).toBeResolved();
  });

  it("fromUrl throws if layer.json does not specify a tiles property", async function () {
    await expectAsync(
      CesiumTerrainProvider.fromUrl("Data/CesiumTerrainTileJson/NoTiles"),
    ).toBeRejectedWithError(
      RuntimeError,
      "The layer.json file does not specify any tile URL templates.",
    );
  });

  it("fromUrl throws if layer.json tiles property is an empty array", async function () {
    await expectAsync(
      CesiumTerrainProvider.fromUrl(
        "Data/CesiumTerrainTileJson/EmptyTilesArray",
      ),
    ).toBeRejectedWithError(
      RuntimeError,
      "The layer.json file does not specify any tile URL templates.",
    );
  });

  it("fromUrl uses attribution specified in layer.json", async function () {
    const provider = await CesiumTerrainProvider.fromUrl(
      "Data/CesiumTerrainTileJson/HeightmapWithAttribution",
    );
    expect(provider._tileCredits[0].html).toBe(
      "This amazing data is courtesy The Amazing Data Source!",
    );
  });

  it("formUrl does not add blank attribution if layer.json does not have one", async function () {
    const provider = await CesiumTerrainProvider.fromUrl(
      "Data/CesiumTerrainTileJson/QuantizedMeshWithWaterMask",
      {
        requestWaterMask: true,
      },
    );
    expect(provider._tileCredit).toBeUndefined();
  });

  it("The undefined availability tile is returned at level 0", function () {
    const layer = {
      availabilityLevels: 10,
    };

    expect(
      CesiumTerrainProvider._getAvailabilityTile(layer, 0, 0, 0),
    ).toBeUndefined();
    expect(
      CesiumTerrainProvider._getAvailabilityTile(layer, 1, 0, 0),
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
      CesiumTerrainProvider._getAvailabilityTile(layer, 80, 50, 10),
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
      CesiumTerrainProvider._getAvailabilityTile(layer, xs[0], ys[0], 20),
    ).toEqual(expected);
    expect(
      CesiumTerrainProvider._getAvailabilityTile(layer, xs[1], ys[1], 20),
    ).toEqual(expected);
  });

  describe("requestTileGeometry", function () {
    async function requestTileGeometry(provider, ...requestTileArgs) {
      let promise;
      try {
        await pollToPromise(async () => {
          RequestScheduler.update();
          promise = provider.requestTileGeometry(...requestTileArgs);

          if (!defined(promise)) {
            return false;
          }

          return true;
        });

        return promise;
      } catch (e) {
        return Promise.reject(e);
      }
    }

    it("uses multiple urls specified in layer.json", async function () {
      const layerJsonResource = new Resource({
        url: "Data/CesiumTerrainTileJson/MultipleUrls",
      });
      const request = layerJsonResource.request.clone();
      const provider = await CesiumTerrainProvider.fromUrl(layerJsonResource);

      await requestTileGeometry(provider, 0, 0, 0, request);
      expect(request.url).toContain("foo=0");

      await requestTileGeometry(provider, 1, 0, 0, request);
      expect(request.url).toContain("foo=1");

      await requestTileGeometry(provider, 1, -1, 0, request);
      expect(request.url).toContain("foo=2");

      await requestTileGeometry(provider, 1, 0, 1, request);
      expect(request.url).toContain("foo=3");
    });

    it("supports scheme-less template URLs in layer.json resolved with absolute URL", async function () {
      const layerJsonResource = new Resource({
        url: getAbsoluteUri("Data/CesiumTerrainTileJson/MultipleUrls"),
      });
      const request = layerJsonResource.request.clone();
      const provider = await CesiumTerrainProvider.fromUrl(layerJsonResource);

      await requestTileGeometry(provider, 0, 0, 0, request);
      expect(request.url).toContain("foo=0");

      await requestTileGeometry(provider, 1, 0, 0, request);
      expect(request.url).toContain("foo=1");

      await requestTileGeometry(provider, 1, -1, 0, request);
      expect(request.url).toContain("foo=2");

      await requestTileGeometry(provider, 1, 0, 1, request);
      expect(request.url).toContain("foo=3");
    });

    it("provides HeightmapTerrainData", async function () {
      const provider = await CesiumTerrainProvider.fromUrl(
        "Data/CesiumTerrainTileJson/Heightmap",
      );
      const data = await requestTileGeometry(provider, 0, 0, 0);
      expect(data).toBeInstanceOf(HeightmapTerrainData);
    });

    it("provides QuantizedMeshTerrainData", async function () {
      const provider = await CesiumTerrainProvider.fromUrl(
        "Data/CesiumTerrainTileJson/QuantizedMesh",
      );
      const data = await requestTileGeometry(provider, 0, 0, 0);
      expect(data).toBeInstanceOf(QuantizedMeshTerrainData);
    });

    it("provides QuantizedMeshTerrainData with 32bit indices", async function () {
      const provider = await CesiumTerrainProvider.fromUrl(
        "Data/CesiumTerrainTileJson/QuantizedMeshWith32BitIndices",
      );
      const data = await requestTileGeometry(provider, 0, 0, 0);
      expect(data).toBeInstanceOf(QuantizedMeshTerrainData);
      expect(data._indices.BYTES_PER_ELEMENT).toBe(4);
    });

    it("provides QuantizedMeshTerrainData with VertexNormals", async function () {
      const provider = await CesiumTerrainProvider.fromUrl(
        "Data/CesiumTerrainTileJson/QuantizedMeshWithVertexNormals",
        {
          requestVertexNormals: true,
        },
      );
      const data = await requestTileGeometry(provider, 0, 0, 0);
      expect(data).toBeInstanceOf(QuantizedMeshTerrainData);
      expect(data._encodedNormals).toBeDefined();
    });

    it("provides QuantizedMeshTerrainData with WaterMask", async function () {
      const provider = await CesiumTerrainProvider.fromUrl(
        "Data/CesiumTerrainTileJson/QuantizedMeshWithWaterMask",
        {
          requestWaterMask: true,
        },
      );
      const data = await requestTileGeometry(provider, 0, 0, 0);
      expect(data).toBeInstanceOf(QuantizedMeshTerrainData);
      expect(data._waterMask).toBeDefined();
    });

    it("provides QuantizedMeshTerrainData with VertexNormals and WaterMask", async function () {
      const provider = await CesiumTerrainProvider.fromUrl(
        "Data/CesiumTerrainTileJson/QuantizedMeshWithOctVertexNormalsAndWaterMask",
        {
          requestVertexNormals: true,
          requestWaterMask: true,
        },
      );
      const data = await requestTileGeometry(provider, 0, 0, 0);
      expect(data).toBeInstanceOf(QuantizedMeshTerrainData);
      expect(data._encodedNormals).toBeDefined();
      expect(data._waterMask).toBeDefined();
    });

    it("provides QuantizedMeshTerrainData with OctVertexNormals", async function () {
      const provider = await CesiumTerrainProvider.fromUrl(
        "Data/CesiumTerrainTileJson/QuantizedMeshWithOctVertexNormals",
        {
          requestVertexNormals: true,
        },
      );
      const data = await requestTileGeometry(provider, 0, 0, 0);
      expect(data).toBeInstanceOf(QuantizedMeshTerrainData);
      expect(data._encodedNormals).toBeDefined();
    });

    it("provides QuantizedMeshTerrainData with VertexNormals and unknown extensions", async function () {
      const provider = await CesiumTerrainProvider.fromUrl(
        "Data/CesiumTerrainTileJson/QuantizedMeshWithVertexNormalsAndUnknownExt",
        {
          requestVertexNormals: true,
        },
      );
      const data = await requestTileGeometry(provider, 0, 0, 0);
      expect(data).toBeInstanceOf(QuantizedMeshTerrainData);
      expect(data._encodedNormals).toBeDefined();
    });

    it("provides QuantizedMeshTerrainData with OctVertexNormals and unknown extensions", async function () {
      const provider = await CesiumTerrainProvider.fromUrl(
        "Data/CesiumTerrainTileJson/QuantizedMeshWithOctVertexNormalsAndUnknownExt",
        {
          requestVertexNormals: true,
        },
      );
      const data = await requestTileGeometry(provider, 0, 0, 0);
      expect(data).toBeInstanceOf(QuantizedMeshTerrainData);
      expect(data._encodedNormals).toBeDefined();
    });

    it("provides QuantizedMeshTerrainData with unknown extension", async function () {
      const provider = await CesiumTerrainProvider.fromUrl(
        "Data/CesiumTerrainTileJson/QuantizedMeshWithUnknownExt",
      );
      const data = await requestTileGeometry(provider, 0, 0, 0);
      expect(data).toBeInstanceOf(QuantizedMeshTerrainData);
    });

    it("provides QuantizedMeshTerrainData with Metadata availability", async function () {
      const provider = await CesiumTerrainProvider.fromUrl(
        "Data/CesiumTerrainTileJson/QuantizedMeshWithMetadataAvailability",
      );

      expect(provider.hasMetadata).toBe(true);
      expect(provider._layers[0].availabilityLevels).toBe(10);
      expect(provider.availability.isTileAvailable(0, 0, 0)).toBe(true);
      expect(provider.availability.isTileAvailable(0, 1, 0)).toBe(true);
      expect(provider.availability.isTileAvailable(1, 0, 0)).toBe(false);

      const data = await requestTileGeometry(provider, 0, 0, 0);
      expect(data).toBeInstanceOf(QuantizedMeshTerrainData);
      expect(provider.availability.isTileAvailable(1, 0, 0)).toBe(true);
    });

    it("provides QuantizedMeshTerrainData with multiple layers and with Metadata availability ", async function () {
      const provider = await CesiumTerrainProvider.fromUrl(
        "Data/CesiumTerrainTileJson/QuantizedMeshWithParentUrlMetadataAvailability/ChildTileset",
      );

      expect(provider.hasMetadata).toBe(true);
      const layers = provider._layers;
      expect(layers.length).toBe(2);

      expect(provider.availability.isTileAvailable(1, 0, 0)).toBe(false);

      const data = await requestTileGeometry(provider, 0, 0, 1);
      expect(data).toBeInstanceOf(QuantizedMeshTerrainData);
      expect(provider.availability.isTileAvailable(1, 0, 0)).toBe(true);
    });

    it("supports getTileDataAvailable()", async function () {
      const provider = await CesiumTerrainProvider.fromUrl(
        "Data/CesiumTerrainTileJson/QuantizedMesh",
      );
      expect(provider.getTileDataAvailable(0, 0, 0)).toBe(true);
      expect(provider.getTileDataAvailable(0, 0, 2)).toBe(false);
    });

    it("getTileDataAvailable() converts xyz to tms", async function () {
      const provider = await CesiumTerrainProvider.fromUrl(
        "Data/CesiumTerrainTileJson/HeightmapWithPartialAvailability",
      );
      expect(provider.getTileDataAvailable(1, 3, 2)).toBe(true);
      expect(provider.getTileDataAvailable(1, 0, 2)).toBe(false);
    });

    it("getTileDataAvailable() with Metadata availability", async function () {
      const provider = await CesiumTerrainProvider.fromUrl(
        "Data/CesiumTerrainTileJson/QuantizedMeshWithMetadataAvailability",
      );

      expect(provider.getTileDataAvailable(0, 0, 0)).toBe(true);
      expect(provider.getTileDataAvailable(0, 0, 1)).toBeUndefined();

      await requestTileGeometry(provider, 0, 0, 0);
      expect(provider.getTileDataAvailable(0, 0, 1)).toBe(true);
    });

    it("supports a query string in the base URL", async function () {
      const layerJsonResource = new Resource({
        url: "Data/CesiumTerrainTileJson/Heightmap?foo=bar",
      });
      const request = layerJsonResource.request.clone();
      const provider = await CesiumTerrainProvider.fromUrl(layerJsonResource);

      const data = await requestTileGeometry(provider, 0, 0, 0, request);
      expect(request.url).toContain("foo=bar");
      expect(data).toBeInstanceOf(HeightmapTerrainData);
    });

    it("Uses query parameter extensions for ion resource", async function () {
      const endpoint = {
        type: "TERRAIN",
        url: "Data/CesiumTerrainTileJson/QuantizedMeshWithOctVertexNormalsAndWaterMask",
        accessToken: "not_really_a_refresh_token",
        attributions: [],
      };
      const ionResource = new IonResource(endpoint, new Resource(endpoint));
      const provider = await CesiumTerrainProvider.fromUrl(ionResource, {
        requestVertexNormals: true,
        requestWaterMask: true,
      });

      const request = ionResource.request.clone();
      const data = await requestTileGeometry(provider, 0, 0, 0, request);
      expect(request.url).toContain("extensions=octvertexnormals-watermask");
      expect(data).toBeInstanceOf(QuantizedMeshTerrainData);
      expect(data._encodedNormals).toBeDefined();
    });

    it("returns undefined if too many requests are already in progress", async function () {
      const provider = await CesiumTerrainProvider.fromUrl(
        "Data/CesiumTerrainTileJson/Heightmap",
      );
      const deferreds = [];

      let promise;
      for (let i = 0; i < RequestScheduler.maximumRequestsPerServer; ++i) {
        const request = new Request({
          throttle: true,
          throttleByServer: true,
        });
        promise = provider.requestTileGeometry(0, 0, 0, request);
      }

      expect(promise).toBeDefined();

      RequestScheduler.update();

      const request = new Request({
        throttle: true,
        throttleByServer: true,
      });
      promise = provider.requestTileGeometry(0, 0, 0, request);
      expect(promise).toBeUndefined();

      await Promise.all(deferreds);
      RequestScheduler.update();
    });
  });
});
