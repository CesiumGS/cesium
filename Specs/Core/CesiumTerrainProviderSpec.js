import { CesiumTerrainProvider } from "../../Source/Cesium.js";
import { Ellipsoid } from "../../Source/Cesium.js";
import { GeographicTilingScheme } from "../../Source/Cesium.js";
import { getAbsoluteUri } from "../../Source/Cesium.js";
import { HeightmapTerrainData } from "../../Source/Cesium.js";
import { IonResource } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";
import { QuantizedMeshTerrainData } from "../../Source/Cesium.js";
import { Request } from "../../Source/Cesium.js";
import { RequestScheduler } from "../../Source/Cesium.js";
import { Resource } from "../../Source/Cesium.js";
import { TerrainProvider } from "../../Source/Cesium.js";
import pollToPromise from "../pollToPromise.js";

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

  function waitForTile(level, x, y, requestNormals, requestWaterMask, f) {
    const terrainProvider = new CesiumTerrainProvider({
      url: "made/up/url",
      requestVertexNormals: requestNormals,
      requestWaterMask: requestWaterMask,
    });

    return terrainProvider.readyPromise
      .then(function () {
        return terrainProvider.requestTileGeometry(level, x, y);
      })
      .then(f)
      .catch(function (error) {
        expect("requestTileGeometry").toBe("returning a tile."); // test failure
      });
  }

  function createRequest() {
    return new Request({
      throttleByServer: true,
    });
  }

  it("conforms to TerrainProvider interface", function () {
    expect(CesiumTerrainProvider).toConformToInterface(TerrainProvider);
  });

  it("constructor throws if url is not provided", function () {
    expect(function () {
      return new CesiumTerrainProvider();
    }).toThrowDeveloperError();

    expect(function () {
      return new CesiumTerrainProvider({});
    }).toThrowDeveloperError();
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

  it("uses geographic tiling scheme by default", function () {
    returnHeightmapTileJson();

    const provider = new CesiumTerrainProvider({
      url: "made/up/url",
    });

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      expect(provider.tilingScheme).toBeInstanceOf(GeographicTilingScheme);
    });
  });

  it("can use a custom ellipsoid", function () {
    returnHeightmapTileJson();

    const ellipsoid = new Ellipsoid(1, 2, 3);
    const provider = new CesiumTerrainProvider({
      url: "made/up/url",
      ellipsoid: ellipsoid,
    });

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      expect(provider.tilingScheme.ellipsoid).toEqual(ellipsoid);
    });
  });

  it("has error event", function () {
    const provider = new CesiumTerrainProvider({
      url: "made/up/url",
    });
    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      expect(provider.errorEvent).toBeDefined();
      expect(provider.errorEvent).toBe(provider.errorEvent);
    });
  });

  it("returns reasonable geometric error for various levels", function () {
    returnQuantizedMeshTileJson();

    const provider = new CesiumTerrainProvider({
      url: "made/up/url",
    });

    return provider.readyPromise.then(function () {
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

  it("logo is undefined if credit is not provided", function () {
    returnHeightmapTileJson();

    const provider = new CesiumTerrainProvider({
      url: "made/up/url",
    });

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      expect(provider.credit).toBeUndefined();
    });
  });

  it("logo is defined if credit is provided", function () {
    returnHeightmapTileJson();

    const provider = new CesiumTerrainProvider({
      url: "made/up/url",
      credit: "thanks to our awesome made up contributors!",
    });

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      expect(provider.credit).toBeDefined();
    });
  });

  it("has a water mask", function () {
    returnHeightmapTileJson();

    const provider = new CesiumTerrainProvider({
      url: "made/up/url",
    });

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      expect(provider.hasWaterMask).toBe(true);
    });
  });

  it("has vertex normals", function () {
    returnOctVertexNormalTileJson();

    const provider = new CesiumTerrainProvider({
      url: "made/up/url",
      requestVertexNormals: true,
    });

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      expect(provider.requestVertexNormals).toBe(true);
      expect(provider.hasVertexNormals).toBe(true);
    });
  });

  it("does not request vertex normals", function () {
    returnOctVertexNormalTileJson();

    const provider = new CesiumTerrainProvider({
      url: "made/up/url",
      requestVertexNormals: false,
    });

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      expect(provider.requestVertexNormals).toBe(false);
      expect(provider.hasVertexNormals).toBe(false);
    });
  });

  it("requests parent layer.json", function () {
    returnParentUrlTileJson();

    const provider = new CesiumTerrainProvider({
      url: "made/up/url",
      requestVertexNormals: true,
      requestWaterMask: true,
    });

    return provider.readyPromise.then(function () {
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
  });

  it("raises an error if layer.json does not specify a format", function () {
    returnTileJson("Data/CesiumTerrainTileJson/NoFormat.tile.json");

    const provider = new CesiumTerrainProvider({
      url: "made/up/url",
    });

    const errorMatcher = function (event) {
      expect(event.message).toContain("format is not specified");
      provider.errorEvent.removeEventListener(errorMatcher);
    };

    return provider.readyPromise.then(fail).catch((e) => {
      provider.errorEvent.addEventListener(errorMatcher);
      expect(e.message).toContain("An error occurred while accessing");
    });
  });

  it("raises an error if layer.json specifies an unknown format", function () {
    returnTileJson("Data/CesiumTerrainTileJson/InvalidFormat.tile.json");

    const provider = new CesiumTerrainProvider({
      url: "made/up/url",
    });

    const errorMatcher = function (event) {
      expect(event.message).toContain("invalid or not supported");
      provider.errorEvent.removeEventListener(errorMatcher);
    };

    return provider.readyPromise.then(fail).catch((e) => {
      provider.errorEvent.addEventListener(errorMatcher);
      expect(e.message).toContain("An error occurred while accessing");
    });
  });

  it("raises an error if layer.json does not specify quantized-mesh 1.x format", function () {
    returnTileJson("Data/CesiumTerrainTileJson/QuantizedMesh2.0.tile.json");

    const provider = new CesiumTerrainProvider({
      url: "made/up/url",
    });

    const errorMatcher = function (event) {
      expect(event.message).toContain("invalid or not supported");
      provider.errorEvent.removeEventListener(errorMatcher);
    };

    return provider.readyPromise.then(fail).catch((e) => {
      provider.errorEvent.addEventListener(errorMatcher);
      expect(e.message).toContain("An error occurred while accessing");
    });
  });

  it("supports quantized-mesh1.x minor versions", function () {
    returnTileJson("Data/CesiumTerrainTileJson/QuantizedMesh1.1.tile.json");

    const provider = new CesiumTerrainProvider({
      url: "made/up/url",
    });

    const errorListener = jasmine.createSpy("error");
    provider.errorEvent.addEventListener(errorListener);

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      expect(errorListener).not.toHaveBeenCalled();
    });
  });

  it("raises an error if layer.json does not specify a tiles property", function () {
    returnTileJson("Data/CesiumTerrainTileJson/NoTiles.tile.json");

    const provider = new CesiumTerrainProvider({
      url: "made/up/url",
    });

    const errorMatcher = function (event) {
      expect(event.message).toContain(
        "does not specify any tile URL templates"
      );
      provider.errorEvent.removeEventListener(errorMatcher);
    };

    return provider.readyPromise.then(fail).catch((e) => {
      provider.errorEvent.addEventListener(errorMatcher);
      expect(e.message).toContain("An error occurred while accessing");
    });
  });

  it("raises an error if layer.json tiles property is an empty array", function () {
    returnTileJson("Data/CesiumTerrainTileJson/EmptyTilesArray.tile.json");

    const provider = new CesiumTerrainProvider({
      url: "made/up/url",
    });

    const errorMatcher = function (event) {
      expect(event.message).toContain(
        "does not specify any tile URL templates"
      );
      provider.errorEvent.removeEventListener(errorMatcher);
    };

    return provider.readyPromise.then(fail).catch((e) => {
      provider.errorEvent.addEventListener(errorMatcher);
      expect(e.message).toContain("An error occurred while accessing");
    });
  });

  it("uses attribution specified in layer.json", function () {
    returnTileJson("Data/CesiumTerrainTileJson/WithAttribution.tile.json");

    const provider = new CesiumTerrainProvider({
      url: "made/up/url",
    });

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      expect(provider._tileCredits[0].html).toBe(
        "This amazing data is courtesy The Amazing Data Source!"
      );
    });
  });

  it("do not add blank attribution if layer.json does not have one", function () {
    returnTileJson("Data/CesiumTerrainTileJson/WaterMask.tile.json");

    const provider = new CesiumTerrainProvider({
      url: "made/up/url",
    });

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      expect(provider._tileCredit).toBeUndefined();
    });
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
    it("uses multiple urls specified in layer.json", function () {
      returnTileJson("Data/CesiumTerrainTileJson/MultipleUrls.tile.json");

      const provider = new CesiumTerrainProvider({
        url: "made/up/url",
      });

      spyOn(Resource._Implementations, "loadWithXhr").and.callThrough();

      return provider.readyPromise
        .then(function () {
          return provider.requestTileGeometry(0, 0, 0);
        })
        .catch(function () {
          expect(
            Resource._Implementations.loadWithXhr.calls.mostRecent().args[0]
          ).toContain("foo0.com");
          return provider.requestTileGeometry(1, 0, 0);
        })
        .catch(function () {
          expect(
            Resource._Implementations.loadWithXhr.calls.mostRecent().args[0]
          ).toContain("foo1.com");
          return provider.requestTileGeometry(1, -1, 0);
        })
        .catch(function () {
          expect(
            Resource._Implementations.loadWithXhr.calls.mostRecent().args[0]
          ).toContain("foo2.com");
          return provider.requestTileGeometry(1, 0, 1);
        })
        .catch(function () {
          expect(
            Resource._Implementations.loadWithXhr.calls.mostRecent().args[0]
          ).toContain("foo3.com");
        });
    });

    it("supports scheme-less template URLs in layer.json resolved with absolute URL", function () {
      returnTileJson("Data/CesiumTerrainTileJson/MultipleUrls.tile.json");

      const url = getAbsoluteUri("Data/CesiumTerrainTileJson");

      const provider = new CesiumTerrainProvider({
        url: url,
      });

      spyOn(Resource._Implementations, "loadWithXhr").and.callThrough();

      return provider.readyPromise
        .then(function () {
          return provider.requestTileGeometry(0, 0, 0);
        })
        .catch(function () {
          expect(
            Resource._Implementations.loadWithXhr.calls.mostRecent().args[0]
          ).toContain("foo0.com");
          return provider.requestTileGeometry(1, 0, 0);
        })
        .catch(function () {
          expect(
            Resource._Implementations.loadWithXhr.calls.mostRecent().args[0]
          ).toContain("foo1.com");
          return provider.requestTileGeometry(1, -1, 0);
        })
        .catch(function () {
          expect(
            Resource._Implementations.loadWithXhr.calls.mostRecent().args[0]
          ).toContain("foo2.com");
          return provider.requestTileGeometry(1, 0, 1);
        })
        .catch(function () {
          expect(
            Resource._Implementations.loadWithXhr.calls.mostRecent().args[0]
          ).toContain("foo3.com");
        });
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

    it("provides QuantizedMeshTerrainData with Metadata availability", function () {
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

      const terrainProvider = new CesiumTerrainProvider({
        url: "made/up/url",
      });

      return pollToPromise(function () {
        return terrainProvider.ready;
      })
        .then(function () {
          expect(terrainProvider.hasMetadata).toBe(true);
          expect(terrainProvider._layers[0].availabilityLevels).toBe(10);
          expect(terrainProvider.availability.isTileAvailable(0, 0, 0)).toBe(
            true
          );
          expect(terrainProvider.availability.isTileAvailable(0, 1, 0)).toBe(
            true
          );
          expect(terrainProvider.availability.isTileAvailable(1, 0, 0)).toBe(
            false
          );

          return terrainProvider.requestTileGeometry(0, 0, 0);
        })
        .then(function (loadedData) {
          expect(loadedData).toBeInstanceOf(QuantizedMeshTerrainData);
          expect(terrainProvider.availability.isTileAvailable(1, 0, 0)).toBe(
            true
          );
        });
    });

    it("returns undefined if too many requests are already in progress", function () {
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

      const terrainProvider = new CesiumTerrainProvider({
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
    });

    it("supports getTileDataAvailable()", function () {
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

      const terrainProvider = new CesiumTerrainProvider({
        url: baseUrl,
      });

      return pollToPromise(function () {
        return terrainProvider.ready;
      }).then(function () {
        expect(terrainProvider.getTileDataAvailable(0, 0, 0)).toBe(true);
        expect(terrainProvider.getTileDataAvailable(0, 0, 2)).toBe(false);
      });
    });

    it("getTileDataAvailable() converts xyz to tms", function () {
      const baseUrl = "made/up/url";

      returnPartialAvailabilityTileJson();

      const terrainProvider = new CesiumTerrainProvider({
        url: baseUrl,
      });

      return pollToPromise(function () {
        return terrainProvider.ready;
      }).then(function () {
        expect(terrainProvider.getTileDataAvailable(1, 3, 2)).toBe(true);
        expect(terrainProvider.getTileDataAvailable(1, 0, 2)).toBe(false);
      });
    });

    it("getTileDataAvailable() with Metadata availability", function () {
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

      const terrainProvider = new CesiumTerrainProvider({
        url: "made/up/url",
      });

      return pollToPromise(function () {
        return terrainProvider.ready;
      })
        .then(function () {
          expect(terrainProvider.getTileDataAvailable(0, 0, 0)).toBe(true);
          expect(terrainProvider.getTileDataAvailable(0, 0, 1)).toBeUndefined();

          return terrainProvider.requestTileGeometry(0, 0, 0);
        })
        .then(function () {
          expect(terrainProvider.getTileDataAvailable(0, 0, 1)).toBe(true);
        });
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

    it("Uses query parameter extensions for ion resource", function () {
      const terrainProvider = new CesiumTerrainProvider({
        url: IonResource.fromAssetId(1),
        requestVertexNormals: true,
        requestWaterMask: true,
      });

      return pollToPromise(function () {
        return terrainProvider.ready;
      }).then(function () {
        const getDerivedResource = spyOn(
          IonResource.prototype,
          "getDerivedResource"
        ).and.callThrough();
        terrainProvider.requestTileGeometry(0, 0, 0);
        const options = getDerivedResource.calls.argsFor(0)[0];
        expect(options.queryParameters.extensions).toEqual(
          "octvertexnormals-watermask-metadata"
        );
      });
    });
  });
});
